// Translates business logic rules into auto-generated tasks passively.

export function runDailyTaskGeneration(existingTasks, plots, batches, harvest_logs, inventory, crops) {
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

  // Rule 2: Batch in nursery exceeded expected time (We'll use Crop germ days + 14 as arbitrary proxy if not defined, or check market readiness)
  // Since Prompt mentioned: "Batch nursery days exceeded target transplant date... Check market readiness"
  batches.filter(b => b.status === 'Nursery' && b.start_date).forEach(batch => {
    const crop = crops.find(c => c.id === batch.crop_id);
    if (crop && crop.days_to_maturity) {
      const startDate = new Date(batch.start_date);
      startDate.setHours(0,0,0,0);
      const daysElapsed = Math.floor((today - startDate) / 86400000);
      
      // If it's near/past days to maturity in the pot
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

  // Rule 3 (Fertilizer/Pest is handled instantly upon logging in Maintenance.jsx)

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

  return newTasks;
}
