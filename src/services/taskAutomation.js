// Translates business logic rules into auto-generated tasks passively.
import weatherService from './weatherService';

export function runDailyTaskGeneration(existingTasks, plots, batches, harvest_logs, inventory, crops, trays = [], monitoring_sessions = [], weatherHourly = null) {
  const newTasks = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Helper to check if a specifically generated task is already in the queue (pending or overdue)
  const taskExists = (titleFragment) => {
    const searchTitle = titleFragment.toLowerCase().trim();
    return existingTasks.some(t => 
      (t.status === 'Pending' || t.status === 'Overdue') && 
      t.title.toLowerCase().trim().includes(searchTitle)
    );
  };

  // Rule 1: Plot not harvested in 14+ days (Active plots only)
  plots.filter(p => p.status === 'Active').forEach(plot => {
    const plotHarvests = harvest_logs.filter(h => h.plot_id === (plot.plot_id || plot.id));
    let lastDateStr = plot.sowing_date;
    
    if (plotHarvests.length > 0) {
      // Find latest harvest
      const latest = plotHarvests.reduce((latest, h) => {
        return new Date(h.harvest_date) > new Date(latest.harvest_date) ? h : latest;
      }, plotHarvests[0]);
      lastDateStr = latest.harvest_date;
    }

    if (lastDateStr) {
      const lastDate = new Date(lastDateStr);
      lastDate.setHours(0,0,0,0);
      const daysElapsed = Math.floor((today - lastDate) / 86400000);

      if (daysElapsed >= 14) {
        const titleStr = `${plot.plot_code} — Check for bolting or overgrowth`;
        if (!taskExists(titleStr)) {
          newTasks.push({
            title: titleStr,
            due_date: new Date().toISOString().split('T')[0],
            priority: 'High',
            status: 'Pending',
            plot_id: plot.plot_id || plot.id,
            is_auto_generated: true
          });
        }
      }
    }
  });

  // Rule 2: Batch in nursery exceeded expected time
  batches.filter(b => b.status === 'Nursery' && b.start_date).forEach(batch => {
    const crop = crops.find(c => c.id === batch.crop_id);
    if (crop && crop.days_to_maturity) {
      const startDate = new Date(batch.start_date);
      startDate.setHours(0,0,0,0);
      const daysElapsed = Math.floor((today - startDate) / 86400000);
      
      if (daysElapsed >= crop.days_to_maturity) {
        const titleStr = `${batch.batch_code} — Check market readiness`;
        if (!taskExists(titleStr)) {
          newTasks.push({
            title: titleStr,
            due_date: new Date().toISOString().split('T')[0],
            priority: 'High',
            status: 'Pending',
            batch_id: batch.batch_id || batch.id,
            is_auto_generated: true
          });
        }
      }
    }
  });

  // Rule 4: Inventory SKU below restock alert level
  inventory.forEach(inv => {
    if (inv.restock_alert_level > 0 && parseFloat(inv.current_stock) <= parseFloat(inv.restock_alert_level)) {
      const titleStr = `${inv.sku_code} — Restock alert: ${inv.current_stock} remaining`;
      if (!taskExists(titleStr)) {
        newTasks.push({
          title: titleStr,
          due_date: new Date().toISOString().split('T')[0],
          priority: 'Low',
          status: 'Pending',
          is_auto_generated: true
        });
      }
    }
  });

  // Rule 5: Plot status is Ready to Clear 
  plots.filter(p => p.status === 'Ready to Clear').forEach(plot => {
    const titleStr = `${plot.plot_code} — Clear spent crop and update status`;
    if (!taskExists(titleStr)) {
      newTasks.push({
        title: titleStr,
        due_date: new Date().toISOString().split('T')[0],
        priority: 'Low',
        status: 'Pending',
        plot_id: plot.plot_id || plot.id,
        is_auto_generated: true
      });
    }
  });

  // Rule 6: Scouting Persistence (48h Gap)
  let latestScoutDate = null;
  if (monitoring_sessions && monitoring_sessions.length > 0) {
    const latest = monitoring_sessions.sort((a,b) => new Date(b.created_at || b.started_at) - new Date(a.created_at || a.started_at))[0];
    latestScoutDate = new Date(latest.created_at || latest.started_at);
  }

  const daysSinceScout = latestScoutDate ? Math.floor((today - latestScoutDate) / 86400000) : 999;
  if (daysSinceScout >= 2) {
    const titleStr = `High Priority: Greenhouse Scouting Needed (Last checked: ${daysSinceScout} days ago)`;
    if (!taskExists(titleStr)) {
      newTasks.push({
        title: titleStr,
        due_date: new Date().toISOString().split('T')[0],
        priority: 'High',
        status: 'Pending',
        is_auto_generated: true
      });
    }
  }

  // Rule 7: Transplant Window (48h Warning)
  trays.filter(t => t.status !== 'Completed' && t.status !== 'Transplanted' && t.target_transplant_date).forEach(tray => {
    const targetDate = new Date(tray.target_transplant_date);
    const diff = Math.floor((targetDate - today) / 86400000);
    
    // Warn 2 days before the transplant date
    if (diff <= 2 && diff >= 0) {
      const titleStr = `Upcoming: Prep Growing Zone for ${tray.tray_code}`;
      if (!taskExists(titleStr)) {
        newTasks.push({
          title: titleStr,
          due_date: new Date().toISOString().split('T')[0],
          priority: 'High',
          status: 'Pending',
          tray_id: tray.tray_id || tray.id,
          is_auto_generated: true
        });
      }
    }
  });

  // Note on Rule 8: Priority Escalation is handled passively 
  // We can't return "new" tasks for escalation, we must return a separate list of updates
  // Or better, we can modify the task table here if we had db access, 
  // but this function is pure. Dashboard will handle priority bumping via existingTasks check.
  
  // Rule 9: Weather Defense Rule (Agronomic Upgrade)
  if (weatherHourly) {
    const risk = weatherService.analyzeDiseaseRisk(weatherHourly);
    if (risk.riskLevel === 'CRITICAL') {
      const titleStr = 'URGENT: Scout beds for Downy Mildew';
      if (!taskExists(titleStr)) {
        newTasks.push({
          title: titleStr,
          due_date: new Date().toISOString().split('T')[0],
          priority: 'High',
          status: 'Pending',
          is_auto_generated: true
        });
      }
    }
  }

  // Rule 10: Land Prep Nutrient Incorporation
  plots.filter(p => p.status === 'Prepped').forEach(plot => {
    const titleStr = `Prep Bed Nutrition: Incorporate 10g/sqm of Complete (14-14-14) into top 6 inches for ${plot.plot_code || 'plot'}`;
    if (!taskExists('Prep Bed Nutrition: Incorporate 10g/sqm of Complete')) {
      newTasks.push({
        title: titleStr,
        due_date: new Date().toISOString().split('T')[0],
        priority: 'Medium',
        status: 'Pending',
        plot_id: plot.plot_id || plot.id,
        is_auto_generated: true
      });
    }
  });

  // Rule 11: Regeneration Feeding Rule
  // Find completed wholesale harvest tasks
  existingTasks.filter(t => t.status === 'Completed' && t.title.toLowerCase().includes('harvest') && t.completed_at).forEach(task => {
    const completedDate = new Date(task.completed_at);
    completedDate.setHours(0,0,0,0);
    const daysElapsed = Math.floor((today - completedDate) / 86400000);
    
    if (daysElapsed === 21) {
      const titleStr = `Regeneration Feeding: Dissolve 4g/sqm of Urea (46-0-0) in water and apply as a soil drench. DO NOT let liquid touch foliage.`;
      if (!taskExists('Regeneration Feeding: Dissolve 4g/sqm')) {
        newTasks.push({
          title: titleStr,
          due_date: new Date().toISOString().split('T')[0],
          priority: 'High',
          status: 'Pending',
          is_auto_generated: true
        });
      }
    }
  });

  return newTasks;
}
