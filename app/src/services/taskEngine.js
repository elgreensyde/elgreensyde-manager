// Task Auto-Generation Logic
// Generates context-aware tasks based on crop rules and propagation method

export function generateBatchTasks(batch, crop) {
  const plant = new Date(batch.planting_date);
  const addDays = (d, n) => {
    const result = new Date(d);
    result.setDate(result.getDate() + n);
    return result.toISOString().split('T')[0];
  };

  // Dynamic naming based on propagation method
  const propMethod = batch.propagation_method || crop.default_prop_method || 'Seed';
  const isSeed = propMethod === 'Seed';
  
  const startTaskName = isSeed ? 'Sow seeds' : 
    propMethod === 'Cutting' ? 'Take and plant cuttings' : 'Divide and plant divisions';
  const checkTaskName = isSeed ? 'Check germination' : 'Check root establishment';

  const plantDate = plant.toISOString().split('T')[0];

  const tasks = [
    {
      batch_id: batch.id,
      title: `${startTaskName} — ${batch.batch_code}`,
      due_date: plantDate,
      priority: 'High',
      status: 'Pending',
      is_auto_generated: true
    },
    {
      batch_id: batch.id,
      title: `${checkTaskName} — ${batch.batch_code} (${crop.common_name})`,
      due_date: addDays(plant, crop.rooting_or_germ_days),
      priority: 'Normal',
      status: 'Pending',
      is_auto_generated: true
    },
    {
      batch_id: batch.id,
      title: `Pre-harvest check — ${batch.batch_code}`,
      due_date: addDays(plant, Math.round(crop.days_to_maturity * 0.85)),
      priority: 'High',
      status: 'Pending',
      is_auto_generated: true
    },
    {
      batch_id: batch.id,
      title: `🌿 HARVEST READY — ${batch.batch_code} (${crop.common_name})`,
      due_date: addDays(plant, crop.days_to_maturity),
      priority: 'Critical',
      status: 'Pending',
      is_auto_generated: true
    }
  ];

  // Add overdue warning task
  if (crop.harvest_window_days) {
    tasks.push({
      batch_id: batch.id,
      title: `⚠️ OVERDUE — Harvest or discard ${batch.batch_code} — past harvest window`,
      due_date: addDays(plant, crop.days_to_maturity + crop.harvest_window_days),
      priority: 'Critical',
      status: 'Pending',
      is_auto_generated: true
    });
  }

  return tasks;
}

// Calculate batch stage dynamically
export function getBatchStage(batch, crop) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const planted = new Date(batch.planting_date);
  planted.setHours(0, 0, 0, 0);
  const daysElapsed = Math.floor((today - planted) / 86400000);

  if (batch.status === 'Harvested') return { stage: 'Harvested', color: 'gray', percent: 100, daysElapsed };
  if (batch.status === 'Sold') return { stage: 'Sold', color: 'gray', percent: 100, daysElapsed };
  if (batch.status === 'Discarded') return { stage: 'Discarded', color: 'red', percent: 100, daysElapsed };

  if (daysElapsed < 0) return { stage: 'Scheduled', color: 'blue', percent: 0, daysElapsed };
  if (daysElapsed < crop.rooting_or_germ_days) {
    const propMethod = batch.propagation_method || crop.default_prop_method || 'Seed';
    const label = propMethod === 'Seed' ? 'Germinating' : 'Rooting';
    return { stage: label, color: 'gray', percent: Math.round((daysElapsed / crop.rooting_or_germ_days) * 100), daysElapsed };
  }
  if (daysElapsed < crop.days_to_maturity * 0.3) return { stage: 'Seedling', color: 'yellow', percent: Math.round((daysElapsed / crop.days_to_maturity) * 100), daysElapsed };
  if (daysElapsed < crop.days_to_maturity * 0.8) return { stage: 'Vegetative', color: 'green', percent: Math.round((daysElapsed / crop.days_to_maturity) * 100), daysElapsed };
  if (daysElapsed < crop.days_to_maturity) return { stage: 'Pre-Harvest', color: 'blue', percent: Math.round((daysElapsed / crop.days_to_maturity) * 100), daysElapsed };
  if (daysElapsed <= crop.days_to_maturity + crop.harvest_window_days) return { stage: 'Ready to Harvest', color: 'emerald', percent: 100, daysElapsed };
  return { stage: 'OVERDUE', color: 'red', percent: 100, daysElapsed };
}

// Update overdue tasks
export function updateOverdueTasks(tasks) {
  const today = new Date().toISOString().split('T')[0];
  let updated = false;
  tasks.forEach(task => {
    if (task.status === 'Pending' && task.due_date < today) {
      task.status = 'Overdue';
      updated = true;
    }
  });
  return updated;
}

// Check and unlock expired IPM withholdings
export function checkWithholdingExpirations(batches) {
  const today = new Date().toISOString().split('T')[0];
  let updated = false;
  batches.forEach(batch => {
    if (batch.ipm_locked && batch.ipm_unlock_date && batch.ipm_unlock_date <= today) {
      batch.ipm_locked = false;
      batch.ipm_unlock_date = null;
      updated = true;
    }
  });
  return updated;
}
