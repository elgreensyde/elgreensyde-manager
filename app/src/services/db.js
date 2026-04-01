// Supabase Data Service
// Async CRUD operations backed by Supabase PostgreSQL

import supabase from '../lib/supabase';

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
      .eq('id', id)
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
      return null;
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
      return [];
    }
    return data || [];
  },

  // UPDATE a record
  async update(table, id, updates) {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error(`db.update(${table}, ${id}):`, error.message);
      return null;
    }
    return data;
  },

  // DELETE a record
  async delete(table, id) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    if (error) {
      console.error(`db.delete(${table}, ${id}):`, error.message);
      return false;
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

  // Auto-unlock expired IPM withholdings
  async unlockExpiredIPM() {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('batches')
      .update({ ipm_locked: false, ipm_unlock_date: null })
      .eq('ipm_locked', true)
      .lte('ipm_unlock_date', today);
    if (error) console.error('unlockExpiredIPM:', error.message);
  },
};

export default db;
