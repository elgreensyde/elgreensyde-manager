import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hfnrciypacfuapdznnza.supabase.co';
const supabaseKey = 'sb_publishable_nY3yfXYCHfGcnqBe0doYrA_BYAGyL2Z';
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearData() {
  // Ordered by dependency flow to avoid foreign key violations
  const tablesToClear = [
    'financial_ledger',
    'planting_targets',
    'order_line_items',
    'orders',
    'tasks',
    'maintenance_logs',
    'trays',
    'harvest_logs',
    'batches',
    'plots',
    'pricing',
    'inventory',
    'customers',
    'sales',
    'expenses',
    'feeding_log',
    'ipm_treatments',
    'ipm_scouting',
    'nutrient_mixes',
    'inventory_log',
    'inventory_items',
    'crops',
    'zones'
  ];

  console.log('Initiating total data reset across all tables...');

  for (const table of tablesToClear) {
    // Attempting delete where a standard column exists or just indiscriminately
    // Since Supabase requires a filter to bulk delete, we trigger an always-true filter (id is not null)
    // Some tables use different primary keys in V2 (e.g. sku_id) 
    // We'll just delete ALL records by filtering for created_at > 1970
    
    // Determine the likely primary key or known column
    let filterCol = 'id';
    if (table === 'inventory' || table === 'pricing' || table === 'planting_targets') filterCol = 'created_at';
    if (table === 'customers') filterCol = 'created_at';
    if (table === 'plots' || table === 'batches' || table === 'trays' || table === 'harvest_logs' || table === 'maintenance_logs') filterCol = 'created_at';
    if (table === 'orders' || table === 'order_line_items' || table === 'financial_ledger') filterCol = 'created_at';

    console.log(`Clearing ${table}...`);
    const { error } = await supabase
      .from(table)
      .delete()
      .gte('created_at', '2000-01-01'); // Safe assumption, everything was created after 2000

    if (error) {
      if (!error.message.includes("relation") && !error.message.includes("does not exist")) {
         console.error(`Error clearing ${table}:`, error.message);
      } else {
         console.log(`Skipped ${table} (Does not exist yet)`);
      }
    } else {
      console.log(`Successfully cleared ${table}`);
    }
  }
  
  console.log('Reset complete!');
}

clearData();
