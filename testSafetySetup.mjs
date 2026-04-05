import db from './app/src/services/db.js';

async function testSetup() {
  try {
    // 1. Get a crop
    const crops = await db.getAll('crops');
    const basil = crops.find(c => c.common_name.includes('Basil')) || crops[0];
    
    // 2. Clear then Create a test plot
    // We'll just use an existing active plot if available
    const plots = await db.getAll('plots');
    const activePlot = plots.find(p => p.status === 'Active' && p.crop_id === basil.id);
    
    if (!activePlot) {
      console.log('No active basil plot found for test setup.');
      return;
    }

    // 3. Ensure "Neem Oil" exists in inputs with withholding_days = 7
    const inputs = await db.getAll('inputs_inventory');
    let neem = inputs.find(i => i.product_name.includes('Neem'));
    if (!neem) {
        neem = await db.insert('inputs_inventory', {
            product_name: 'Test Neem Oil',
            type: 'Organic Pesticide',
            withholding_days: 7,
            current_stock: 1000,
            stock_unit: 'ml'
        });
    } else {
        await db.update('inputs_inventory', neem.input_id, { withholding_days: 7 });
    }

    // 4. Create a maintenance log on this plot from 2 days ago
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    await db.insert('maintenance_logs', {
        event_date: twoDaysAgo.toISOString().split('T')[0],
        action_category: 'Pest Treatment',
        input_id: neem.input_id,
        target_ids: [activePlot.plot_id || activePlot.id],
        method_product: 'Test application for withholding check'
    });

    console.log(`Test setup complete for Plot: ${activePlot.plot_code}. Harvest should be BLOCKED (2 days passed of 7 day withholding).`);
  } catch (err) {
    console.error('Test setup failed:', err);
  }
}

testSetup();
