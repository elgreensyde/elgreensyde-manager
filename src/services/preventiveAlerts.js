// Preventive Alert Engine — Auto-generated alerts (NO checklist required)
// Runs on Dashboard load, checks elapsed time + conditions
import db from './db';
import supabase from '../lib/supabase';

export async function generatePreventiveAlerts() {
  const today = new Date().toISOString().split('T')[0];
  const alerts = [];

  try {
    const [crops, weatherCache] = await Promise.all([
      db.getAll('crops'),
      supabase.from('weather_cache').select('data').limit(1).maybeSingle()
    ]);

    const weatherData = weatherCache?.data?.data;
    const recentRain = weatherData?.precipitation_sum?.[0] || 0; // Rain today/yesterday sum if available

    // 1. ABSTRACT: Process each crop for autonomous preventive alerts
    for (const crop of crops) {
      const thresholds = crop.weather_thresholds || {};
      if (thresholds.rain_trigger && thresholds.spray_interval) {
        
        // Find last maintenance of the recommended type (e.g. K-Bicarb for Downy Mildew)
        const remedy = thresholds.target_remedy || 'Treatment';
        const { data: lastLog } = await supabase
          .from('maintenance_logs')
          .select('event_date')
          .ilike('method_product', `%${remedy}%`)
          .order('event_date', { ascending: false })
          .limit(1);

        const daysSinceLast = lastLog?.[0]
          ? Math.floor((new Date(today) - new Date(lastLog[0].event_date)) / 86400000)
          : null;

        // Condition: Rain > Threshold AND (Days > Interval OR First Time)
        if (recentRain >= thresholds.rain_trigger && (daysSinceLast === null || daysSinceLast >= thresholds.spray_interval)) {
          alerts.push({
            alert_type: 'preventive_condition_met',
            target_type: 'general',
            message: `${crop.common_name}: Condition met for ${remedy} on All Beds — Rain (${recentRain}mm) & ${daysSinceLast === null ? 'Awaiting first application' : daysSinceLast + ' days since last treatment'}`,
            priority: 'Medium'
          });
        }
      }
    }

    // 2. Weekly fertilizer due (active plots with last urea >= 7 days)
    const activePlots = await db.query('plots', 'status', 'eq', 'Active');
    for (const plot of activePlots) {
      const { data: lastUrea } = await supabase
        .from('maintenance_logs')
        .select('event_date')
        .eq('plot_id', plot.plot_id)
        .ilike('method_product', '%urea%')
        .order('event_date', { ascending: false })
        .limit(1);
      const daysSinceUrea = lastUrea?.[0]
        ? Math.floor((new Date(today) - new Date(lastUrea[0].event_date)) / 86400000)
        : null;
      if (daysSinceUrea === null || daysSinceUrea >= 7) {
        alerts.push({ 
          alert_type: 'fertilizer_due', 
          target_type: 'plot', 
          target_id: plot.plot_id, 
          message: `Weekly fertilizer due on ${plot.plot_code} — ${daysSinceUrea === null ? 'Initial feeding required' : daysSinceUrea + ' days since last urea'}`, 
          priority: 'Medium' 
        });
      }
    }

    // 3. Plot not harvested 14+ days (check for bolting)
    const { data: plotsNoHarvest } = await supabase
      .from('plots')
      .select('plot_id, plot_code, sowing_date')
      .eq('status', 'Active');
    for (const plot of (plotsNoHarvest || [])) {
      const { data: lastHarvest } = await supabase
        .from('harvest_logs')
        .select('harvest_date')
        .eq('plot_id', plot.plot_id)
        .order('harvest_date', { ascending: false })
        .limit(1);
      const daysSinceHarvest = lastHarvest?.[0]
        ? Math.floor((new Date(today) - new Date(lastHarvest[0].harvest_date)) / 86400000)
        : Math.floor((new Date(today) - new Date(plot.sowing_date)) / 86400000);
      if (daysSinceHarvest >= 14) {
        alerts.push({ alert_type: 'bolting_check', target_type: 'plot', target_id: plot.plot_id, message: `${plot.plot_code}: ${daysSinceHarvest} days without harvest — check for bolting`, priority: 'High' });
      }
    }

    // 4. Tray seedling day 14+ with no rooting confirmed
    const { data: oldTrays } = await supabase
      .from('trays')
      .select('tray_id, tray_code, sowing_date')
      .eq('status', 'Sown');
    for (const tray of (oldTrays || [])) {
      const daysSinceSow = Math.floor((new Date(today) - new Date(tray.sowing_date)) / 86400000);
      if (daysSinceSow >= 14) {
        alerts.push({ alert_type: 'tug_test_due', target_type: 'tray', target_id: tray.tray_id, message: `${tray.tray_code}: Day ${daysSinceSow} — tug test due, confirm rooting`, priority: 'High' });
      }
    }

    // 5. SKU below restock alert level
    const inventory = await db.getAll('inventory');
    for (const sku of inventory) {
      if (sku.current_stock <= sku.restock_alert_level) {
        alerts.push({ alert_type: 'low_stock', target_type: 'sku', target_id: sku.sku_id, message: `${sku.product_name}: stock at ${sku.current_stock} (restock level: ${sku.restock_alert_level})`, priority: 'Low' });
      }
    }

    // 6. Input supplies below threshold
    const inputs = await db.getAll('inputs_inventory');
    for (const input of inputs) {
      if (input.current_stock <= input.low_stock_threshold) {
        alerts.push({ alert_type: 'low_input_stock', target_type: 'general', message: `Farm Input "${input.product_name}": ${input.current_stock} ${input.stock_unit} remaining (threshold: ${input.low_stock_threshold})`, priority: 'Medium' });
      }
    }

    // 7. Plot = Ready to Clear for 3+ days
    const { data: clearPlots } = await supabase
      .from('plots')
      .select('plot_id, plot_code, created_at')
      .eq('status', 'Ready to Clear');
    for (const plot of (clearPlots || [])) {
      alerts.push({ alert_type: 'clear_spent_crop', target_type: 'plot', target_id: plot.plot_id, message: `${plot.plot_code}: Ready to Clear — remove spent crop`, priority: 'Low' });
    }

    // Clear old auto-generated alerts and insert fresh ones
    await supabase.from('preventive_alerts').delete().eq('auto_generated', true);
    if (alerts.length > 0) {
      await db.insertMany('preventive_alerts', alerts);
    }

    console.log(`✅ Preventive alerts generated: ${alerts.length}`);
    return alerts;
  } catch (err) {
    console.error('Preventive alert generation error:', err);
    return [];
  }
}
