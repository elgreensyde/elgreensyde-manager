// Seed Data — Elgreensyde v3.0
// Seeds crop library (20 crops), inputs inventory (5 products), and zones
import db from './db';
import { seedCropLibrary, seedInputsInventory } from './seedCropLibrary';
import { seedRecommendations } from './seedRecommendations';

const SEED_ZONES = [
  { name: 'Raised Bed 1', type: 'Plot' },
  { name: 'Raised Bed 2', type: 'Plot' },
  { name: 'Raised Bed 3', type: 'Plot' },
  { name: 'Pot Bench 1', type: 'Potted' },
  { name: 'Pot Bench 2', type: 'Potted' },
  { name: 'Greenhouse', type: 'Plot' },
  { name: 'Outdoor', type: 'Plot' },
];

const CUST_WALKIN = {
  customer_id: '00000000-0000-0000-0000-000000000001',
  name: 'WALK-IN CUSTOMER',
  type: 'Walk-in',
  notes: 'System default for anonymous sales'
};

export async function initializeSeedData() {
  try {
    // Seed crop library (22 crops now)
    try { await seedCropLibrary(); } catch(e) { console.warn('Crop library seed skipped:', e.message); }

    // Seed inputs inventory (6 products)
    try { await seedInputsInventory(); } catch(e) { console.warn('Inputs inventory seed skipped:', e.message); }

    // Seed recommendation records (Doc2)
    try { await seedRecommendations(); } catch(e) { console.warn('Recommendations seed skipped (RLS?):', e.message); }

    // Seed Walk-in Customer Profile
    try {
      const customers = await db.query('customers', 'customer_id', 'eq', CUST_WALKIN.customer_id);
      if (!customers || customers.length === 0) {
        await db.insert('customers', CUST_WALKIN);
        console.log('✅ Seed data: CUST-WALKIN profile created');
      }
    } catch (err) {
      console.warn('Customers table not ready for seeding:', err.message);
    }

    // Seed zones
    try {
      const existingZones = await db.getAll('zones');
      if (!existingZones || existingZones.length === 0) {
        await db.insertMany('zones', SEED_ZONES);
        console.log('✅ Seed data initialized: Default zones added');
      }
    } catch (zoneErr) {
      console.warn('Zones table not yet available for seeding:', zoneErr.message);
    }

    return true;
  } catch (err) {
    console.error('Seed data initialization error:', err);
    return false;
  }
}
