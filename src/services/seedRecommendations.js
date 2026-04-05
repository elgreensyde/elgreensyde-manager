// Seed Recommendation Records from Doc2 Section 7 & 8
import db from './db';

const RECOMMENDATION_RECORDS = [
  // DISEASE - Downy Mildew (DM)
  { record_id: 'DM-001', category: 'Disease', crop_name: 'Sweet Basil', growth_stage: 'Vegetative', severity_level: 'High',
    trigger_conditions: [{ question: 'yellowing_upper_leaves', answer: 'Yes' }, { question: 'gray_purple_underside', answer: 'Yes' }],
    recommendation_title: 'Basil Downy Mildew — Early Detection',
    recommendation_body: 'Stage 1 Response: Apply Potassium Bicarbonate 5g/L as contact spray. Cover ALL leaf undersides. Repeat every 5-7 days. Remove and destroy severely infected leaves immediately. Do NOT compost.',
    product_name: 'Potassium Bicarbonate', application_rate: '5g/L', application_method: 'Foliar spray — undersides priority',
    follow_up_days: 5, follow_up_action: 'Re-inspect all basil beds. If spreading, escalate to DM-002.' },
  { record_id: 'DM-002', category: 'Disease', crop_name: 'Sweet Basil', growth_stage: 'Vegetative', severity_level: 'Critical',
    trigger_conditions: [{ question: 'yellowing_spreading', answer: 'Yes' }, { question: 'multiple_plants_affected', answer: 'Yes' }],
    recommendation_title: 'Basil Downy Mildew — Escalation Protocol',
    recommendation_body: 'Stage 2: K-Bicarb 5g/L + systemic fungicide if available. Remove all plants with >50% infection. Widen plant spacing for airflow. Consider covering bed with rain shelter. CRITICAL: If >70% of bed affected, harvest all usable material immediately and terminate crop.',
    product_name: 'Potassium Bicarbonate', application_rate: '5g/L + systemic', application_method: 'Foliar + drench',
    follow_up_days: 3, follow_up_action: 'Assess if crop is salvageable. If not, clear bed and apply lime before replanting.' },
  { record_id: 'DM-003', category: 'Disease', crop_name: 'Lemon Basil', growth_stage: 'Vegetative', severity_level: 'Critical',
    trigger_conditions: [{ question: 'yellowing_upper_leaves', answer: 'Yes' }],
    recommendation_title: 'Lemon Basil Downy Mildew — FAST Escalation',
    recommendation_body: 'Lemon Basil progresses 2x faster than Sweet Basil. You have a 2-day window vs 4-day. Apply K-Bicarb 5g/L IMMEDIATELY. If any spreading after 48 hours, harvest all usable material and terminate crop. Do not wait for Stage 2.',
    product_name: 'Potassium Bicarbonate', application_rate: '5g/L', application_method: 'Immediate foliar spray',
    follow_up_days: 2, follow_up_action: 'Harvest or destroy within 48 hours if spreading.' },

  // NUTRIENT DEFICIENCY (N)
  { record_id: 'N-001', category: 'Nutrient', crop_name: null, growth_stage: 'Vegetative', severity_level: 'Medium',
    trigger_conditions: [{ question: 'uniform_yellowing_lower', answer: 'Yes' }, { question: 'upward_progression', answer: 'Yes' }],
    recommendation_title: 'Nitrogen Deficiency — General',
    recommendation_body: 'Classic N deficiency: uniform yellowing starting from oldest (lowest) leaves progressing upward. Apply Urea 46-0-0 at 5g/L (dry season) or 2.5g/L (rainy season). For Lemon Basil, reduce to 3g/L maximum.',
    product_name: 'Urea (46-0-0)', application_rate: '5g/L dry, 2.5g/L rainy', application_method: 'Soil drench at base',
    follow_up_days: 7, follow_up_action: 'Check if new growth shows green color return. If not, repeat application.' },
  { record_id: 'N-002', category: 'Nutrient', crop_name: null, growth_stage: 'Vegetative', severity_level: 'Low',
    trigger_conditions: [{ question: 'pale_green_overall', answer: 'Yes' }, { question: 'slow_growth', answer: 'Yes' }],
    recommendation_title: 'Nitrogen Deficiency — Mild / Preventive',
    recommendation_body: 'Pale green foliage with slow growth indicates mild N deficiency. Apply Urea at half rate (2.5g/L) as preventive. Check last fertilization date — may simply be overdue for scheduled feed.',
    product_name: 'Urea (46-0-0)', application_rate: '2.5g/L', application_method: 'Soil drench',
    follow_up_days: 14, follow_up_action: 'Monitor color improvement over 14 days.' },
  { record_id: 'N-003', category: 'Nutrient', crop_name: 'Blue Ternate', growth_stage: 'All', severity_level: 'Low',
    trigger_conditions: [{ question: 'pale_green_overall', answer: 'Yes' }],
    recommendation_title: 'Blue Ternate — Do NOT Apply Nitrogen',
    recommendation_body: 'Blue Ternate (Butterfly Pea) is a legume that fixes its own atmospheric nitrogen. Yellowing is likely NOT nitrogen deficiency. Check for: waterlogging, root damage, or iron deficiency. NEVER apply urea — it causes all-foliage, no-flower growth.',
    product_name: null, application_rate: 'N/A', application_method: 'N/A',
    follow_up_days: 7, follow_up_action: 'Investigate root zone. Check drainage.' },
  { record_id: 'N-004', category: 'Nutrient', crop_name: null, growth_stage: 'Flowering', severity_level: 'Medium',
    trigger_conditions: [{ question: 'excessive_foliage', answer: 'Yes' }, { question: 'no_flower_buds', answer: 'Yes' }],
    recommendation_title: 'Excess Nitrogen — Flower Crops',
    recommendation_body: 'Excessive green growth with no flowers = too much nitrogen. STOP all urea applications immediately. For edible flowers, N should only be applied during vegetative phase (first 40 days). Apply vermicast top-dressing for balanced nutrition.',
    product_name: null, application_rate: 'Stop urea', application_method: 'Vermicast top-dress only',
    follow_up_days: 14, follow_up_action: 'Flower buds should appear within 14-21 days after nitrogen cutoff.' },
  { record_id: 'N-005', category: 'Nutrient', crop_name: null, growth_stage: 'Vegetative', severity_level: 'Medium',
    trigger_conditions: [{ question: 'interveinal_yellowing', answer: 'Yes' }, { question: 'green_veins_yellow_between', answer: 'Yes' }],
    recommendation_title: 'Iron / Magnesium Deficiency (Not Nitrogen)',
    recommendation_body: 'Interveinal yellowing (yellow between veins, veins stay green) is NOT nitrogen deficiency. This indicates iron or magnesium deficiency. Check soil pH — high pH locks out iron. Apply chelated iron foliar spray or Epsom salt (magnesium sulfate) at 10g/L.',
    product_name: null, application_rate: 'Chelated iron or Epsom salt 10g/L', application_method: 'Foliar spray',
    follow_up_days: 7, follow_up_action: 'Monitor for green-up in new growth (iron) or older leaves (magnesium).' },

  // PEST placeholders from Doc2 Section 8
  { record_id: 'P-001', category: 'Pest', crop_name: null, severity_level: 'Medium', is_placeholder: true,
    recommendation_title: 'Aphids — Standard Response', recommendation_body: 'Apply Neem Oil 5ml/L + Insecticidal Soap 5ml/L at dusk. Repeat every 5-7 days until population controlled. Target leaf undersides and growing tips.',
    product_name: 'Neem Oil', application_rate: '5ml/L + soap', application_method: 'Foliar spray at dusk',
    trigger_conditions: [{ question: 'aphid_clusters', answer: 'Yes' }], follow_up_days: 5 },
  { record_id: 'P-002', category: 'Pest', crop_name: null, severity_level: 'Medium', is_placeholder: true,
    recommendation_title: 'Spider Mites — Standard Response', recommendation_body: 'Apply Neem Oil 5ml/L + Insecticidal Soap. Focus on leaf undersides. Increase humidity around plants. Most active Dec-May dry season.',
    product_name: 'Neem Oil', application_rate: '5ml/L', application_method: 'Undersides focus',
    trigger_conditions: [{ question: 'webbing_stippling', answer: 'Yes' }], follow_up_days: 5 },
  { record_id: 'P-003', category: 'Pest', crop_name: null, severity_level: 'Medium', is_placeholder: true,
    recommendation_title: 'Leafminers — Standard Response', recommendation_body: 'Apply Neem Oil 5ml/L every 7 days as preventive during active season. Remove and destroy mined leaves. Neem is systemic — larvae ingest it.',
    product_name: 'Neem Oil', application_rate: '5ml/L', application_method: 'Foliar spray every 7 days',
    trigger_conditions: [{ question: 'serpentine_tunnels', answer: 'Yes' }], follow_up_days: 7 },
  { record_id: 'P-004', category: 'Pest', crop_name: null, severity_level: 'Medium', is_placeholder: true,
    recommendation_title: 'Flea Beetles — Standard Response', recommendation_body: 'Apply Neem Oil 5ml/L. Critical on Brassica seedlings. Shot-holes on young leaves = flea beetles.',
    product_name: 'Neem Oil', application_rate: '5ml/L', application_method: 'Foliar spray',
    trigger_conditions: [{ question: 'shot_holes', answer: 'Yes' }], follow_up_days: 5 },
  { record_id: 'P-005', category: 'Pest', crop_name: 'Pechay', severity_level: 'High', is_placeholder: true,
    recommendation_title: 'Cabbage Webworm — Brassica Response', recommendation_body: 'Apply Neem Oil 5ml/L directly into leaf whorl from 7 DAT. Check apical bud for larvae under silken web. Hand-pick visible larvae.',
    product_name: 'Neem Oil', application_rate: '5ml/L into whorl', application_method: 'Direct into whorl',
    trigger_conditions: [{ question: 'webworm_damage', answer: 'Yes' }], follow_up_days: 3 },
  { record_id: 'P-006', category: 'Pest', crop_name: null, severity_level: 'Low', is_placeholder: true,
    recommendation_title: 'Thrips — Standard Response', recommendation_body: 'Neem Oil 5ml/L on vegetative structure ONLY. NEVER spray on edible flower blooms. For flowers: hand-remove affected blooms.',
    product_name: 'Neem Oil', application_rate: '5ml/L veg only', application_method: 'Veg structure only — never blooms',
    trigger_conditions: [{ question: 'thrips_damage', answer: 'Yes' }], follow_up_days: 7 },

  // DISEASE placeholders
  { record_id: 'D-001', category: 'Disease', crop_name: null, severity_level: 'High', is_placeholder: true,
    recommendation_title: 'Botrytis Blight — General', recommendation_body: 'K-Bicarb 5g/L preventive spray every 7-10 days on foliage. Remove and destroy infected material. Improve airflow. For edible flowers: NEVER spray blooms. Any bloom with Botrytis = UNSAFE.',
    product_name: 'Potassium Bicarbonate', application_rate: '5g/L', application_method: 'Foliage only — never blooms',
    trigger_conditions: [{ question: 'gray_mold', answer: 'Yes' }], follow_up_days: 7 },
  { record_id: 'D-002', category: 'Disease', crop_name: null, severity_level: 'Critical', is_placeholder: true,
    recommendation_title: 'Phytophthora Root Rot', recommendation_body: 'NO CURE. Destroy plant AND substrate immediately. Do NOT replant in same container without sterilization. Affects Rosemary, Thyme, French Tarragon. Improve drainage — add more CRH and coarse sand.',
    product_name: null, application_rate: 'N/A', application_method: 'Destroy and sterilize',
    trigger_conditions: [{ question: 'sudden_wilt_wet_soil', answer: 'Yes' }], follow_up_days: 0 },
  { record_id: 'D-003', category: 'Disease', crop_name: null, severity_level: 'Medium', is_placeholder: true,
    recommendation_title: 'Powdery Mildew — General', recommendation_body: 'K-Bicarb 10g/L as contact eradicant. Applied directly to white powder patches. Improve air circulation.',
    product_name: 'Potassium Bicarbonate', application_rate: '10g/L', application_method: 'Direct contact on patches',
    trigger_conditions: [{ question: 'white_powder', answer: 'Yes' }], follow_up_days: 7 },
  { record_id: 'D-004', category: 'Disease', crop_name: 'Pechay', severity_level: 'Critical', is_placeholder: true,
    recommendation_title: 'Clubroot — Brassica', recommendation_body: 'QUARANTINE BED. Incurable — persists 10+ years in soil. Apply 100g lime/sqm. NEVER plant Brassicaceae in this bed again. Remove all plant material.',
    product_name: null, application_rate: 'Lime 100g/sqm', application_method: 'Soil amendment',
    trigger_conditions: [{ question: 'swollen_roots', answer: 'Yes' }], follow_up_days: 0 },
  { record_id: 'D-005', category: 'Disease', crop_name: null, severity_level: 'Critical', is_placeholder: true,
    recommendation_title: 'Fusarium Wilt', recommendation_body: 'NO CURE — remove plant immediately. 3-year rotation away from same plant family. Soil-borne pathogen. One-sided wilting with brown vascular = Fusarium.',
    product_name: null, application_rate: 'N/A', application_method: 'Remove and rotate',
    trigger_conditions: [{ question: 'one_sided_wilt', answer: 'Yes' }], follow_up_days: 0 },
  { record_id: 'D-006', category: 'Disease', crop_name: 'Peppermint', severity_level: 'High', is_placeholder: true,
    recommendation_title: 'Mint Rust', recommendation_body: 'K-Bicarb is INEFFECTIVE against rust. Remove and destroy all affected stems. Improve airflow. If >30% of plant affected, destroy entire plant.',
    product_name: null, application_rate: 'N/A', application_method: 'Remove and destroy',
    trigger_conditions: [{ question: 'orange_pustules', answer: 'Yes' }], follow_up_days: 3 },
];

export async function seedRecommendations() {
  try {
    const existing = await db.getAll('recommendation_records');
    if (existing && existing.length > 0) {
      console.log('✅ Recommendation records already seeded');
      return;
    }
    await db.insertMany('recommendation_records', RECOMMENDATION_RECORDS);
    console.log('✅ Recommendation records seeded:', RECOMMENDATION_RECORDS.length, 'records');
  } catch (err) {
    console.error('Recommendation seed error:', err);
  }
}

export { RECOMMENDATION_RECORDS };
