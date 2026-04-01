// Seed Data — Elgreensyde actual available plants
import db from './db';

const SEED_CROPS = [
  {
    common_name: 'Basil',
    category: 'Herb',
    default_prop_method: 'Seed',
    days_to_maturity: 30,
    rooting_or_germ_days: 7,
    harvest_window_days: 14,
    ec_min: 1.0, ec_max: 1.6,
    ph_min: 5.5, ph_max: 6.5,
    yield_estimate: '15g per 4" pot',
    notes: 'Pinch flowers to extend harvest. Very popular for pesto and garnish.'
  },
  {
    common_name: 'Mint',
    category: 'Herb',
    default_prop_method: 'Cutting',
    days_to_maturity: 40,
    rooting_or_germ_days: 10,
    harvest_window_days: 21,
    ec_min: 2.0, ec_max: 2.4,
    ph_min: 5.5, ph_max: 6.5,
    yield_estimate: '20g per 4" pot',
    notes: 'Vigorous grower, keep trimmed. Propagates easily from cuttings. Includes spearmint & peppermint varieties.'
  },
  {
    common_name: 'Rosemary',
    category: 'Herb',
    default_prop_method: 'Cutting',
    days_to_maturity: 60,
    rooting_or_germ_days: 15,
    harvest_window_days: 30,
    ec_min: 1.0, ec_max: 1.6,
    ph_min: 5.5, ph_max: 6.5,
    yield_estimate: '8g per 4" pot',
    notes: 'Slow to start but very hardy. Does not like wet roots. Drought tolerant.'
  },
  {
    common_name: 'Parsley',
    category: 'Herb',
    default_prop_method: 'Seed',
    days_to_maturity: 45,
    rooting_or_germ_days: 14,
    harvest_window_days: 21,
    ec_min: 1.8, ec_max: 2.2,
    ph_min: 5.5, ph_max: 6.5,
    yield_estimate: '12g per 4" pot',
    notes: 'Slow to germinate. Soak seeds 24hrs before sowing. Cut-and-come-again harvest.'
  },
  {
    common_name: 'Thyme',
    category: 'Herb',
    default_prop_method: 'Cutting',
    days_to_maturity: 45,
    rooting_or_germ_days: 14,
    harvest_window_days: 20,
    ec_min: 0.8, ec_max: 1.6,
    ph_min: 5.5, ph_max: 7.0,
    yield_estimate: '10g per 4" pot',
    notes: 'Drought tolerant, prefers well-drained soil. Lovely aroma. Low-growing habit.'
  },
  {
    common_name: 'Torrenia',
    category: 'Edible Flower',
    default_prop_method: 'Seed',
    days_to_maturity: 50,
    rooting_or_germ_days: 10,
    harvest_window_days: 28,
    ec_min: 1.0, ec_max: 1.8,
    ph_min: 5.5, ph_max: 6.5,
    yield_estimate: '30 flowers per plant',
    notes: 'Wishbone flower. Beautiful purple/blue blooms. Thrives in partial shade — ideal for Bukidnon climate.'
  },
  {
    common_name: 'Blue Ternate',
    category: 'Edible Flower',
    default_prop_method: 'Seed',
    days_to_maturity: 60,
    rooting_or_germ_days: 7,
    harvest_window_days: 60,
    ec_min: 1.0, ec_max: 1.6,
    ph_min: 6.0, ph_max: 7.0,
    yield_estimate: 'Continuous blooming',
    notes: 'Butterfly Pea flower. Used for blue tea and natural food coloring. Vigorous vine, continuous bloomer once established.'
  },
  {
    common_name: 'Marigold',
    category: 'Edible Flower',
    default_prop_method: 'Seed',
    days_to_maturity: 50,
    rooting_or_germ_days: 7,
    harvest_window_days: 30,
    ec_min: 1.2, ec_max: 1.8,
    ph_min: 6.0, ph_max: 7.0,
    yield_estimate: '25 flowers per plant',
    notes: 'Edible petals for salads and garnish. Natural pest deterrent. Full sun preferred.'
  },
  {
    common_name: 'Potted Strawberry',
    category: 'Vegetable',
    default_prop_method: 'Division',
    days_to_maturity: 60,
    rooting_or_germ_days: 14,
    harvest_window_days: 30,
    ec_min: 1.0, ec_max: 1.6,
    ph_min: 5.5, ph_max: 6.5,
    yield_estimate: '150-300g per plant per season',
    notes: 'Propagate via runners. Keep well-watered. Remove first flowers for stronger root establishment.'
  },
];

const SEED_ZONES = [
  { name: 'Hydro Bay A', type: 'Hydroponic' },
  { name: 'Hydro Bay B', type: 'Hydroponic' },
  { name: 'Raised Bed 1', type: 'Plot' },
  { name: 'Raised Bed 2', type: 'Plot' },
  { name: 'Raised Bed 3', type: 'Plot' },
  { name: 'Pot Bench 1', type: 'Potted' },
  { name: 'Pot Bench 2', type: 'Potted' },
  { name: 'Greenhouse', type: 'Plot' },
  { name: 'Outdoor', type: 'Plot' },
];

export async function initializeSeedData() {
  try {
    const existingCrops = await db.getAll('crops');
    if (!existingCrops || existingCrops.length === 0) {
      await db.insertMany('crops', SEED_CROPS);
      console.log('✅ Seed data initialized: 9 crops added to library');
    }
    const existingZones = await db.getAll('zones');
    if (!existingZones || existingZones.length === 0) {
      await db.insertMany('zones', SEED_ZONES);
      console.log('✅ Seed data initialized: Default zones added');
    }
    return true;
  } catch (err) {
    console.error('Seed data initialization error:', err);
    return false;
  }
}

export default SEED_CROPS;
