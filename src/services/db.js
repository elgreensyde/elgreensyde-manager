// Supabase Data Service
// Async CRUD operations backed by Supabase PostgreSQL

import supabase from '../lib/supabase';

const getPK = (table) => {
  const pkMap = {
    plots: 'plot_id',
    batches: 'batch_id',
    trays: 'tray_id',
    tasks: 'task_id',
    maintenance_logs: 'log_id',
    harvest_logs: 'harvest_id',
    inventory: 'sku_id',
    customers: 'customer_id',
    financial_ledger: 'ledger_id',
    inputs_inventory: 'input_id',
    pot_watch_list: 'watch_id',
    pricing: 'pricing_id',
    orders: 'order_id',
    order_line_items: 'line_item_id',
    planting_targets: 'target_id',
    monitoring_sessions: 'session_id',
    checklist_responses: 'response_id',
    recommendation_records: 'record_id',
    flagged_issues: 'flag_id',
    preventive_alerts: 'alert_id',
    zones: 'zone_id',
    away_periods: 'period_id',
    notifications: 'notification_id'
  };
  return pkMap[table] || 'id';
};

export const db = {
  // GET ALL records from a table
  async getAll(table) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error(`db.getAll(${table}):`, error.message);
      return [];
    }
    return data || [];
  },

  // GET BY ID
  async getById(table, id) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(getPK(table), id)
      .single();
    if (error) {
      console.error(`db.getById(${table}, ${id}):`, error.message);
      return null;
    }
    return data;
  },

  // INSERT a record
  async insert(table, record) {
    const { data, error } = await supabase
      .from(table)
      .insert(record)
      .select()
      .single();
    if (error) {
      console.error(`db.insert(${table}):`, error.message);
      throw new Error(error.message);
    }
    return data;
  },

  // INSERT MANY records
  async insertMany(table, records) {
    const { data, error } = await supabase
      .from(table)
      .insert(records)
      .select();
    if (error) {
      console.error(`db.insertMany(${table}):`, error.message);
      throw new Error(error.message);
    }
    return data || [];
  },

  // UPDATE a record
  async update(table, id, updates) {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq(getPK(table), id)
      .select()
      .single();
    if (error) {
      console.error(`db.update(${table}, ${id}):`, error.message);
      throw new Error(error.message);
    }
    return data;
  },

  // DELETE a record
  async delete(table, id) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq(getPK(table), id);
    if (error) {
      console.error(`db.delete(${table}, ${id}):`, error.message);
      throw new Error(error.message);
    }
    return true;
  },

  // QUERY with filter
  async query(table, column, operator, value) {
    let query = supabase.from(table).select('*');
    if (operator === 'eq') query = query.eq(column, value);
    else if (operator === 'lte') query = query.lte(column, value);
    else if (operator === 'gte') query = query.gte(column, value);
    else if (operator === 'lt') query = query.lt(column, value);
    else if (operator === 'gt') query = query.gt(column, value);
    else if (operator === 'neq') query = query.neq(column, value);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error(`db.query(${table}):`, error.message);
      return [];
    }
    return data || [];
  },

  // Generate batch code
  async generateBatchCode() {
    const year = new Date().getFullYear();
    const { data } = await supabase
      .from('batches')
      .select('batch_code')
      .like('batch_code', `B-${year}-%`);
    const num = ((data?.length || 0) + 1).toString().padStart(3, '0');
    return `B-${year}-${num}`;
  },

  // QUERY JSONB contains (for target_ids array)
  async queryContains(table, column, id) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .contains(column, JSON.stringify([id]))
      .order('created_at', { ascending: false });
    if (error) {
      console.error(`db.queryContains(${table}, ${column}, ${id}):`, error.message);
      return [];
    }
    return data || [];
  },

  // Batch update for overdue tasks
  async markOverdueTasks() {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'Overdue' })
      .eq('status', 'Pending')
      .lt('due_date', today);
    if (error) console.error('markOverdueTasks:', error.message);
  },

  // EXECUTE a Supabase RPC function (PostgreSQL Function)
  async rpc(fn, params) {
    const { data, error } = await supabase.rpc(fn, params);
    if (error) {
      console.error(`db.rpc(${fn}):`, error.message);
      throw new Error(error.message);
    }
    return data;
  },
};

export default db;
