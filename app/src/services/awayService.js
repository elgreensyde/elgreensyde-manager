import db from './db';
import supabase from '../lib/supabase';
import lifecycleScheduler from './lifecycleScheduler';

const awayService = {
  
  /**
   * Checks if the operator is currently away or requires a Return Summary.
   */
  async checkAbsenceStatus() {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Check for CURRENT absence
    const { data: current } = await supabase
      .from('away_periods')
      .select('*')
      .lte('start_date', today)
      .gte('end_date', today)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    // 2. Check for RETURN interception (ended but not yet acknowledged)
    const { data: pendingAcknowledge } = await supabase
      .from('away_periods')
      .select('*')
      .lt('end_date', today)
      .eq('is_acknowledged', false)
      .eq('is_active', true)
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      isAway: !!current,
      awayPeriod: current,
      requiresAcknowledgment: !!pendingAcknowledge,
      returnedPeriod: pendingAcknowledge
    };
  },

  /**
   * Calculates the rescheduling plan for all tasks accumulated during absence.
   * Strictly enforces the 5-task limit and flags potential crop loss.
   */
  async generateReturnPlan(period) {
    if (!period) return { tasks: [], lossRisks: [] };
    
    const { data: accumulatedTasks } = await supabase
      .from('tasks')
      .select('*')
      .gte('due_date', period.start_date)
      .lte('due_date', period.end_date)
      .eq('status', 'Pending')
      .not('category', 'eq', 'Pest/Disease') // Bypass criticals already handled
      .order('due_date', { ascending: true });

    if (!accumulatedTasks || accumulatedTasks.length === 0) return { tasks: [], lossRisks: [] };

    const returnDate = new Date();
    returnDate.setHours(0,0,0,0);
    
    const rescheduledQueue = [];
    const lossRisks = [];
    const dayUsageMap = {}; // Track virtual task counts per day
    
    let currentDate = new Date(returnDate);
    
    for (const task of accumulatedTasks) {
      let targetDateStr = currentDate.toISOString().split('T')[0];
      let ok = false;
      let finalDateStr = targetDateStr;

      // Virtual scheduling loop: Find a day that has < 5 tasks (including virtual ones)
      while (!ok) {
        // Enforce Sunday skip first
        const d = new Date(finalDateStr);
        if (d.getDay() === 0) {
          d.setDate(d.getDate() + 1);
          finalDateStr = d.toISOString().split('T')[0];
          continue;
        }

        // Check real DB count + virtual count
        const { count: dbCount } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('due_date', finalDateStr)
          .eq('status', 'Pending');
        
        const virtualCount = dayUsageMap[finalDateStr] || 0;
        if ((dbCount + virtualCount) < 5) {
          dayUsageMap[finalDateStr] = virtualCount + 1;
          ok = true;
        } else {
          // Day full, move to next
          d.setDate(d.getDate() + 1);
          finalDateStr = d.toISOString().split('T')[0];
        }
      }
      
      // If the delta between original due date and new due date is > 7 days, flag as risk
      const originalDate = new Date(task.due_date);
      const finalDate = new Date(finalDateStr);
      const delayDays = Math.floor((finalDate - originalDate) / 86400000);
      
      if (delayDays > 7 && (task.category === 'Harvest' || task.category === 'Transplant')) {
        lossRisks.push({
          task_id: task.task_id || task.id,
          title: task.title,
          delay: delayDays,
          reason: task.category === 'Harvest' ? 'Maturity Overrun' : 'Stunted Growth'
        });
      }

      rescheduledQueue.push({
        ...task,
        new_due_date: finalDateStr,
        delay: delayDays
      });
    }

    return { 
      tasks: rescheduledQueue, 
      lossRisks,
      daysAway: Math.floor((new Date(period.end_date) - new Date(period.start_date)) / 86400000) + 1
    };
  },

  /**
   * Executes the Reschedule Spread and acknowledges the return.
   */
  async executeAcknowledge(periodId, taskPlan) {
    for (const task of taskPlan) {
      await db.update('tasks', task.task_id || task.id, { 
        due_date: task.new_due_date,
        notes: (task.notes || '') + `\n[Away Mode] Rescheduled from ${task.due_date} with ${task.delay} day delay.`
      });
    }

    await db.update('away_periods', periodId, { is_acknowledged: true });
    return { success: true };
  }
};

export default awayService;
