// Preventive Alert Engine v3.3 — Alert Overhaul
// Replaces the delete-and-reinsert anti-pattern with:
// 1. UPSERT deduplication (unique index prevents 345-alert explosion)
// 2. Auto-resolve weather alerts when conditions normalize
// 3. Escalation: alerts unacknowledged for 24h+ become 'Escalated'
import db from './db';
import supabase from '../lib/supabase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve existing open alerts whose conditions are no longer true.
 * Called BEFORE generating new alerts so stale ones are closed first.
 */
async function autoResolveStaleAlerts(currentAlertKeys) {
  // Fetch all currently open/new/escalated alerts
  const { data: openAlerts, error } = await supabase
    .from('preventive_alerts')
    .select('alert_id, alert_type, target_type, target_id')
    .in('alert_status', ['New', 'Acknowledged', 'Escalated'])
    .eq('auto_generated', true);

  if (error || !openAlerts) return;

  // Any alert in DB that is NOT in the freshly-evaluated set gets resolved
  const toResolve = openAlerts.filter((existing) => {
    const key = buildKey(existing.alert_type, existing.target_type, existing.target_id);
    return !currentAlertKeys.has(key);
  });

  if (toResolve.length === 0) return;

  const ids = toResolve.map((a) => a.alert_id);
  await supabase
    .from('preventive_alerts')
    .update({
      alert_status: 'Resolved',
      resolved_at: new Date().toISOString(),
      resolution_note: 'Condition normalized — auto-resolved'
    })
    .in('alert_id', ids);

  console.log(`✅ Auto-resolved ${ids.length} stale alerts`);
}

/**
 * Escalate alerts that have been 'New' for more than 24 hours without acknowledgment.
 */
async function escalateAgedAlerts() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from('preventive_alerts')
    .update({ alert_status: 'Escalated' })
    .eq('alert_status', 'New')
    .lt('created_at', cutoff);
}

function buildKey(alertType, targetType, targetId) {
  return `${alertType}::${targetType || 'general'}::${targetId || 'none'}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function acknowledgeAlert(alertId) {
  await supabase
    .from('preventive_alerts')
    .update({ alert_status: 'Acknowledged', acknowledged_at: new Date().toISOString() })
    .eq('alert_id', alertId);
}

export async function dismissAllByType(alertType) {
  await supabase
    .from('preventive_alerts')
    .update({
      alert_status: 'Resolved',
      resolved_at: new Date().toISOString(),
      resolution_note: 'Manually dismissed (batch)'
    })
    .eq('alert_type', alertType)
    .in('alert_status', ['New', 'Acknowledged', 'Escalated']);
}

export async function getActiveAlerts() {
  const { data } = await supabase
    .from('preventive_alerts')
    .select('*')
    .in('alert_status', ['New', 'Acknowledged', 'Escalated'])
    .order('created_at', { ascending: false });
  return data || [];
}

// ─── Core Generator ──────────────────────────────────────────────────────────

export async function generatePreventiveAlerts() {
  const today = new Date().toISOString().split('T')[0];
  const alerts = []; // Each: { alert_type, target_type, target_id?, message, priority }

  try {
    const [crops, weatherCache] = await Promise.all([
      db.getAll('crops'),
      supabase.from('weather_cache').select('data').limit(1).maybeSingle()
    ]);

    const weatherData = weatherCache?.data?.data;
    const recentRain = weatherData?.precipitation_sum?.[0] || 0;
    const hourlyData = weatherCache?.data?.hourly;

    const lastMaintenanceByRemedy = new Map();

    // ── Rule 1: Crop weather threshold triggers ──────────────────────────────
    for (const crop of crops) {
      const thresholds = crop.weather_thresholds || {};
      if (!thresholds.spray_interval) continue;

      let triggerMet = false;
      let triggerReason = '';

      if (thresholds.rain_trigger && recentRain >= thresholds.rain_trigger) {
        triggerMet = true;
        triggerReason = `Rain (${recentRain}mm)`;
      }

      if (thresholds.humidity_trigger && thresholds.night_soak_hours && hourlyData) {
        const rhArray = hourlyData.relative_humidity_2m || [];
        let maxConsecutive = 0, currentConsecutive = 0;
        for (const rh of rhArray.slice(-24)) {
          if (rh >= thresholds.humidity_trigger) {
            currentConsecutive++;
            maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
          } else {
            currentConsecutive = 0;
          }
        }
        if (maxConsecutive >= thresholds.night_soak_hours) {
          triggerMet = true;
          triggerReason = `High Humidity Soak (${maxConsecutive}hrs @ ${thresholds.humidity_trigger}%+)`;
        }
      }

      if (triggerMet) {
        const remedy = thresholds.target_remedy || 'Treatment';
        let lastLog = lastMaintenanceByRemedy.get(remedy);
        if (lastLog === undefined) {
          const { data, error } = await supabase
            .from('maintenance_logs')
            .select('event_date')
            .ilike('method_product', `%${remedy}%`)
            .order('event_date', { ascending: false })
            .limit(1);
          if (error) throw error;
          lastLog = data || [];
          lastMaintenanceByRemedy.set(remedy, lastLog);
        }

        const daysSinceLast = lastLog[0]
          ? Math.floor((new Date(today) - new Date(lastLog[0].event_date)) / 86400000)
          : null;

        if (daysSinceLast === null || daysSinceLast >= thresholds.spray_interval) {
          alerts.push({
            alert_type: 'preventive_condition_met',
            target_type: 'general',
            target_id: null,
            message: `${crop.common_name}: Condition met for ${remedy} — ${triggerReason} & ${daysSinceLast === null ? 'Awaiting first application' : `${daysSinceLast}d since last treatment`}`,
            priority: 'Medium'
          });
        }
      }
    }

    // ── Rule 2: Weekly fertilizer due ────────────────────────────────────────
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
          message: `Weekly fertilizer due on ${plot.plot_code} — ${daysSinceUrea === null ? 'Initial feeding required' : `${daysSinceUrea}d since last urea`}`,
          priority: 'Medium'
        });
      }
    }

    // ── Rule 3: Plot not harvested 14+ days (bolting risk) ──────────────────
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
        alerts.push({
          alert_type: 'bolting_check',
          target_type: 'plot',
          target_id: plot.plot_id,
          message: `${plot.plot_code}: ${daysSinceHarvest}d without harvest — check for bolting`,
          priority: 'High'
        });
      }
    }

    // ── Rule 4: Tray day 14+ with no rooting confirmed ──────────────────────
    const { data: oldTrays } = await supabase
      .from('trays')
      .select('tray_id, tray_code, sowing_date')
      .eq('status', 'Sown');
    for (const tray of (oldTrays || [])) {
      const daysSinceSow = Math.floor((new Date(today) - new Date(tray.sowing_date)) / 86400000);
      if (daysSinceSow >= 14) {
        alerts.push({
          alert_type: 'tug_test_due',
          target_type: 'tray',
          target_id: tray.tray_id,
          message: `${tray.tray_code}: Day ${daysSinceSow} — tug test due, confirm rooting`,
          priority: 'High'
        });
      }
    }

    // ── Rule 5: SKU below restock level ─────────────────────────────────────
    const inventory = await db.getAll('inventory');
    for (const sku of inventory) {
      if (sku.current_stock <= sku.restock_alert_level) {
        alerts.push({
          alert_type: 'low_stock',
          target_type: 'sku',
          target_id: sku.sku_id,
          message: `${sku.product_name}: stock at ${sku.current_stock} (restock level: ${sku.restock_alert_level})`,
          priority: 'Low'
        });
      }
    }

    // ── Rule 6: Input supplies below threshold ───────────────────────────────
    const inputs = await db.getAll('inputs_inventory');
    for (const input of inputs) {
      if (input.current_stock <= input.low_stock_threshold) {
        alerts.push({
          alert_type: 'low_input_stock',
          target_type: 'general',
          target_id: null,
          message: `Farm Input "${input.product_name}": ${input.current_stock} ${input.stock_unit} remaining (threshold: ${input.low_stock_threshold})`,
          priority: 'Medium'
        });
      }
    }

    // ── Rule 7: Plot ready to clear ─────────────────────────────────────────
    const { data: clearPlots } = await supabase
      .from('plots')
      .select('plot_id, plot_code')
      .eq('status', 'Ready to Clear');
    for (const plot of (clearPlots || [])) {
      alerts.push({
        alert_type: 'clear_spent_crop',
        target_type: 'plot',
        target_id: plot.plot_id,
        message: `${plot.plot_code}: Ready to Clear — remove spent crop`,
        priority: 'Low'
      });
    }

    // ── Dedup + Upsert ───────────────────────────────────────────────────────
    // Build the set of currently-active alert keys for auto-resolve check
    const currentAlertKeys = new Set(
      alerts.map((a) => buildKey(a.alert_type, a.target_type, a.target_id))
    );

    // 1. Auto-resolve stale open alerts whose condition is no longer true
    await autoResolveStaleAlerts(currentAlertKeys);

    // 2. Escalate aged unacknowledged alerts
    await escalateAgedAlerts();

    // 3. Upsert fresh alerts — the unique index on (alert_type, target_type, target_id)
    //    WHERE resolved_at IS NULL prevents duplicates at the DB level.
    //    We use ON CONFLICT DO NOTHING via individual inserts with error handling.
    for (const alert of alerts) {
      const { error } = await supabase
        .from('preventive_alerts')
        .insert({
          ...alert,
          auto_generated: true,
          dismissed: false,
          alert_status: 'New'
        });

      // Unique constraint violation (23505) = alert already exists — safe to ignore
      if (error && error.code !== '23505') {
        console.warn('Alert insert skipped:', error.message);
      }
    }

    console.log(`✅ Preventive alerts evaluated: ${alerts.length} conditions active`);
    return alerts;
  } catch (err) {
    console.error('Preventive alert generation error:', err);
    return [];
  }
}
