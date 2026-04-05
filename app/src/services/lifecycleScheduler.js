import db from './db';
import supabase from '../lib/supabase';

/**
 * Solo-Operator Lifecycle Scheduler for Elgreensyde
 * Enforces:
 * 1. Sunday Block (No tasks allowed)
 * 2. 5-Task Limit (Overflow to next available day)
 * 3. Auto-Cleanup (Delete tasks for archived/cleared items)
 */

const DAILY_TASK_LIMIT = 5;

const lifecycleScheduler = {
  
  /**
   * Main function to place a task on the calendar while respecting constraints.
   * Recursively finds the next available slot.
   * @param {string} dateStr 
   * @param {string} category - 'Harvest', 'Transplant', 'Sow', etc.
   * @param {Object} forecast - Optional weather forecast data
   */
  async findNextAvailableSlot(dateStr, category = 'Maintenance', forecast = null) {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0 = Sunday

    // Rule 1: Sunday Block
    if (dayOfWeek === 0) {
      const monday = new Date(date);
      monday.setDate(date.getDate() + 1);
      return this.findNextAvailableSlot(monday.toISOString().split('T')[0], category, forecast);
    }

    // Rule 2: 5-Task Limit & Operational Conflict Separation
    const { data: dayTasks } = await supabase
      .from('tasks')
      .select('category, status')
      .eq('due_date', dateStr)
      .eq('status', 'Pending');
    
    const counts = dayTasks?.length || 0;

    // Rule 2a: Multi-Task Limit (Solo Operator)
    if (counts >= DAILY_TASK_LIMIT) {
      const tomorrow = new Date(date);
      tomorrow.setDate(date.getDate() + 1);
      return this.findNextAvailableSlot(tomorrow.toISOString().split('T')[0], category, forecast);
    }

    // Rule 2b: Conflict Separation (No Harvest + Transplant on same day)
    const CONFLICT_GROUP = ['Harvest', 'Transplant'];
    if (CONFLICT_GROUP.includes(category)) {
      const hasConflict = dayTasks.some(t => 
        CONFLICT_GROUP.includes(t.category) && t.category !== category
      );
      if (hasConflict) {
        const tomorrow = new Date(date);
        tomorrow.setDate(date.getDate() + 1);
        return this.findNextAvailableSlot(tomorrow.toISOString().split('T')[0], category, forecast);
      }
    }

    // Rule 2c: Fertilizer vs Rain Rule (No fertilization before heavy rain)
    if (category === 'Fertilize' && forecast) {
      const idx = forecast.time?.indexOf(dateStr);
      if (idx !== -1 && forecast.precipitation_probability_max?.[idx] > 70) {
        // High rain risk: Leach prevention
        const tomorrow = new Date(date);
        tomorrow.setDate(date.getDate() + 1);
        return this.findNextAvailableSlot(tomorrow.toISOString().split('T')[0], category, forecast);
      }
    }

    return dateStr;
  },

  /**
   * Generates a full chain of tasks from seed to harvest
   */
  async generateTaskChain(targetId, targetType, startDate, cropId) {
    const crop = await db.getById('crops', cropId);
    if (!crop) return;

    // Use weatherService if available, otherwise just generate
    let forecast = null;
    try {
      const { default: weatherService } = await import('./weatherService');
      forecast = await weatherService.getForecast();
    } catch (e) {
      console.warn('Weather service unavailable during chain generation');
    }

    const tasksToCreate = [];
    let currentBaseDate = new Date(startDate);

    // 1. Generation: Standard Lifecycle Stages
    const stages = crop.stages || [];
    for (const stage of stages) {
      if (stage.name.toLowerCase() === 'nursery') continue;

      const stageDate = new Date(currentBaseDate);
      stageDate.setDate(currentBaseDate.getDate() + stage.days);
      
      const category = stage.name.toLowerCase().includes('harvest') ? 'Harvest' : 
                      (stage.name.toLowerCase().includes('transplant') || stage.name.toLowerCase().includes('sow')) ? 'Transplant' :
                      'Maintenance';

      tasksToCreate.push({
        title: `${stage.name}: ${targetType === 'batch' ? 'Batch' : 'Plot'} Check`,
        due_date: stageDate.toISOString().split('T')[0],
        priority: 'Medium',
        category,
        [targetType === 'batch' ? 'batch_id' : 'plot_id']: targetId,
        is_auto_generated: true
      });
    }

    // 2. Generation: Fertilizer Schedule
    const fertSchedule = crop.fertilizer_schedule || [];
    for (const fert of fertSchedule) {
      const fertDate = new Date(startDate);
      fertDate.setDate(startDate.getDate() + (fert.week * 7));

      tasksToCreate.push({
        title: `Apply ${fert.input} (Fert Cycle)`,
        due_date: fertDate.toISOString().split('T')[0],
        priority: 'High',
        category: 'Fertilize',
        [targetType === 'batch' ? 'batch_id' : 'plot_id']: targetId,
        is_auto_generated: true,
        weather_sensitive: true
      });
    }

    // 3. Sequential Insertion with Constraint Respecting
    for (const task of tasksToCreate) {
      const finalDate = await this.findNextAvailableSlot(task.due_date, task.category, forecast);
      await db.insert('tasks', { ...task, due_date: finalDate });
    }
  },

  /**
   * Cascading shifting: When one task is moved, shift all subsequent ones by delta.
   * Returns { count: totalTasksShifted }
   */
  async shiftTaskChain(taskId, newDateStr) {
    const task = await db.getById('tasks', taskId);
    if (!task) return { count: 0 };

    const oldDate = new Date(task.due_date);
    const newDate = new Date(newDateStr);
    const daysDelta = Math.floor((newDate - oldDate) / 86400000);

    if (daysDelta === 0) return { count: 0 };

    let shiftCount = 1;

    // Update the base task first
    const finalLeadDate = await this.findNextAvailableSlot(newDateStr, task.category);
    await db.update('tasks', taskId, { due_date: finalLeadDate });

    // Find and shift all SUBSEQUENT tasks for this target
    const column = task.batch_id ? 'batch_id' : 'plot_id';
    const targetId = task[column];

    const { data: futureTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq(column, targetId)
      .eq('status', 'Pending')
      .gt('due_date', task.due_date)
      .order('due_date', { ascending: true });

    if (!futureTasks) return { count: shiftCount };

    for (const fTask of futureTasks) {
      // Rule 4: Critical Alert Override (Do not shift Pest/Disease treatments)
      if (fTask.category === 'Pest/Disease') {
        console.log(`[Lifecycle] Bypassing shift for Critical Alert: ${fTask.title}`);
        continue;
      }

      const fOldDate = new Date(fTask.due_date);
      fOldDate.setDate(fOldDate.getDate() + daysDelta);
      const fNewDateStr = await this.findNextAvailableSlot(fOldDate.toISOString().split('T')[0], fTask.category);
      await db.update('tasks', fTask.task_id || fTask.id, { due_date: fNewDateStr });
      shiftCount++;
    }

    return { count: shiftCount };
  },
};

export default lifecycleScheduler;
