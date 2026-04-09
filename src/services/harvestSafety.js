// Harvest Safety Assessment Engine (Phase 2)
import db from './db';

/**
 * Runs 5-point safety check before harvest
 * @param {string} targetId - ID of the plot or batch
 * @param {string} targetType - 'plot' or 'batch'
 * @param {object} crop - full crop object from library
 */
export async function checkHarvestSafety(targetId, targetType, crop = {}) {
  const today = new Date();
  const reasons = [];
  let status = 'Safe';
  const details = {
    withholding: null,
    pests: [],
    diseases: [],
    weather: { humidity: 50 } // Phase 3 integration: Mocked 50% for now
  };

  try {
    // 1. Withholding Check (Pesticides/Fertilizers)
    // Find all maintenance logs for this target
    const logs = await db.queryContains('maintenance_logs', 'target_ids', targetId);
    
    for (const log of logs) {
      if (log.input_id) {
        const input = await db.getById('inputs_inventory', log.input_id);
        if (input && input.withholding_days > 0) {
          const applicationDate = new Date(log.event_date);
          const safeDate = new Date(applicationDate);
          safeDate.setDate(safeDate.getDate() + input.withholding_days);

          if (today < safeDate) {
            const daysLeft = Math.ceil((safeDate - today) / (1000 * 60 * 60 * 24));
            const msg = `Within withholding period for ${input.product_name} (${daysLeft} days remaining)`;
            
            // Stricter for edible flowers
            if (crop.pesticide_free_required) {
              reasons.push(`[BLOCKED] Edible Flower Safety: ${msg}`);
              status = 'Blocked';
            } else {
              reasons.push(`[CAUTION] ${msg}`);
              if (status !== 'Blocked') status = 'Caution';
            }
            details.withholding = { product: input.product_name, daysLeft };
          }
        }
      }
    }

    // 2. Disease Status Check
    const openDisease = await db.query('flagged_issues', 'status', 'neq', 'Resolved');
    const targetIssues = openDisease.filter(i => i.target_id === targetId && i.issue_type === 'Disease');
    
    for (const issue of targetIssues) {
      if (crop.pesticide_free_required && issue.description.toLowerCase().includes('botrytis')) {
        reasons.push(`[BLOCKED] Botrytis detected on Edible Flowers - Immediate destroy required.`);
        status = 'Blocked';
      } else {
        reasons.push(`[CAUTION] Open disease flag: ${issue.description} (${issue.severity} severity)`);
        if (status !== 'Blocked') status = 'Caution';
      }
      details.diseases.push(issue);
    }

    // 3. Pest Status Check
    const targetPests = openDisease.filter(i => i.target_id === targetId && i.issue_type === 'Pest');
    for (const issue of targetPests) {
      if (issue.severity === 'Critical' || issue.severity === 'High') {
        reasons.push(`[CAUTION] High pest pressure: ${issue.description}`);
        if (status !== 'Blocked') status = 'Caution';
      } else {
        reasons.push(`[NOTE] Mild pest presence: ${issue.description}`);
      }
      details.pests.push(issue);
    }

    // 4. Weather Thresholds (Phase 3 Integration)
    if (details.weather.humidity > 85) {
      reasons.push(`[CAUTION] High humidity detected (50% mocked) - Risk of post-harvest rot.`);
      if (status !== 'Blocked') status = 'Caution';
    }

    return {
      status,
      reasons,
      details,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('checkHarvestSafety error:', err);
    return { status: 'Error', reasons: ['Failed to run safety check'], details: {} };
  }
}
