// Seed Crop Library — All 22 Elgreensyde crops
// Structure updated for ARCH-001 (Relational Treatments) and ARCH-002 (Computable Stages)
import db from './db';

const CROPS = [
  {
    common_name: 'Parsley', scientific_name: 'Petroselinum crispum', family: 'Apiaceae', category: 'Herb',
    default_prop_method: 'Seed', growth_type: 'Cut and come again', format: 'Both',
    varieties: ['Curly Parsley', 'Italian Flat-Leaf'],
    stages: [
      { name: 'Seedling', start_day: 0, end_day: 21, risk: 'Edema from fog on leaf undersides' },
      { name: 'Vegetative Expansion', start_day: 22, end_day: 60, risk: 'High humidity fungal pressure' },
      { name: 'Harvest Stage', start_day: 61, end_day: 365, risk: 'Nitrogen leaching in heavy rain' }
    ],
    days_to_maturity: 75, rooting_or_germ_days: 21, avg_nursery_days: 21,
    days_to_first_harvest: 60, harvest_interval_days: 14, plot_lifespan_days: 365, resting_days: 14,
    harvest_window_days: 14,
    weather_thresholds: { rain_trigger: 10, spray_interval: 7, target_remedy: 'Potassium Bicarbonate' },
    pot_diameter_cm: 25, pot_depth_cm: 20, pot_material: 'Terracotta or UV-treated HDPE',
    soil_mix: { type: 'Mix A', components: '40-50% clay, 30% CRH, 15% cow manure, 15-20% vermicast' },
    cow_manure_excluded: false,
    fertilizer_schedule: [
      { stage: 'Establishment', product: 'Complete Fertilizer (14-14-14)', rate_value: 5, rate_unit: 'g/pot', trigger_day: 0, frequency: 'Once' },
      { stage: 'Vegetative', product: 'Urea (46-0-0)', rate_value: 5, rate_unit: 'g/L', trigger_day: 45, frequency: 'Every 14 days' }
    ],
    pest_records: [
      { pest: 'Aphids', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L', notes: 'Green pear-shaped clusters' } },
      { pest: 'Spider Mites', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L', notes: 'Yellow stippling, webbing' } },
      { pest: 'Leafminers', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L', notes: 'White serpentine tunnels' } }
    ],
    disease_records: [
      { disease: 'Botrytis Blight', recommended_action: { target_product_name: 'Potassium Bicarbonate', dosage_value: 5, dosage_unit: 'g/L', frequency_days: 7, notes: 'Water-soaked brown lesions' } },
      { disease: 'Septoria Leaf Spot', recommended_action: { target_product_name: 'Potassium Bicarbonate', dosage_value: 5, dosage_unit: 'g/L', notes: 'Small sunken tan spots' } }
    ],
    harvest_indicators: 'Outer petioles reach full expansion',
    harvest_method: 'Cut-and-come-again — sever outer stems 3cm above crown',
    yield_per_pot: '30-50 grams per cycle', postharvest_notes: 'Hydro-cool in 4°C water immediately.',
    high_risk_flag: null, pesticide_free_required: false
  },
  {
    common_name: 'Peppermint', scientific_name: 'Mentha x piperita', family: 'Lamiaceae', category: 'Herb',
    default_prop_method: 'Cutting', growth_type: 'Cut and come again', format: 'Both',
    varieties: ['Peppermint'],
    stages: [
      { name: 'Establishment', start_day: 0, end_day: 25, risk: 'Roots must not dry — cellular collapse' },
      { name: 'Vegetative', start_day: 26, end_day: 70, risk: 'Dense canopy traps moisture — fungal rot' },
      { name: 'Reproductive - Prevent', start_day: 71, end_day: 365, risk: 'Continuous harvesting prevents flowering' }
    ],
    days_to_maturity: 60, rooting_or_germ_days: 10, avg_nursery_days: 25,
    days_to_first_harvest: 45, harvest_interval_days: 15, plot_lifespan_days: 365, resting_days: 0,
    harvest_window_days: 15,
    pot_diameter_cm: 30, pot_depth_cm: 15, pot_material: 'Plastic or terracotta',
    soil_mix: { type: 'Mix A variant', components: '40% clay, 20% CRH, 20% vermicast, 20% cow manure' },
    cow_manure_excluded: false,
    fertilizer_schedule: [
      { stage: 'Establishment', product: 'Complete Fertilizer (14-14-14)', rate_value: 10, rate_unit: 'g/pot', frequency: '14 days after transplant' },
      { stage: 'Active Growth', product: 'Urea (46-0-0)', rate_value: 5, rate_unit: 'g/L', frequency: 'Every 10 days', notes: '200ml per pot' }
    ],
    pest_records: [
      { pest: 'Flea Beetles', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L', notes: 'Tiny metallic black beetles' } },
      { pest: 'Spider Mites', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L', notes: 'Webbing and stippling' } }
    ],
    disease_records: [
      { disease: 'Mint Rust', recommended_action: { target_product_name: 'Manual Removal', dosage_value: 0, dosage_unit: 'N/A', notes: 'Remove and destroy — K-Bicarb ineffective' } },
      { disease: 'Powdery Mildew', recommended_action: { target_product_name: 'Potassium Bicarbonate', dosage_value: 10, dosage_unit: 'g/L', notes: 'White powder on upper leaf' } }
    ],
    harvest_indicators: 'Stems reach 15-20cm, aromatic when touched',
    harvest_method: 'Shear stems leaving 5cm basal growth',
    yield_per_pot: '100-150g per 30cm pot per cycle', postharvest_notes: 'Handle gently — mints oxidize black if bruised. Chill to 5°C.',
    high_risk_flag: 'Containment mandatory — invasive rhizomes. Never plant in open ground.', pesticide_free_required: false
  },
  {
    common_name: 'Spearmint', scientific_name: 'Mentha spicata', family: 'Lamiaceae', category: 'Herb',
    default_prop_method: 'Cutting', growth_type: 'Cut and come again', format: 'Both',
    varieties: ['Spearmint'],
    stages: [
      { name: 'Establishment', start_day: 0, end_day: 25, risk: 'Same as Peppermint' },
      { name: 'Vegetative', start_day: 26, end_day: 70, risk: 'Dense canopy moisture trap' },
      { name: 'Reproductive - Prevent', start_day: 71, end_day: 365, risk: 'Harvest to prevent flowering' }
    ],
    days_to_maturity: 60, rooting_or_germ_days: 10, avg_nursery_days: 25,
    days_to_first_harvest: 45, harvest_interval_days: 15, plot_lifespan_days: 365, resting_days: 0,
    harvest_window_days: 15,
    pot_diameter_cm: 30, pot_depth_cm: 15, pot_material: 'Plastic or terracotta',
    soil_mix: { type: 'Mix A variant', components: '40% clay, 20% CRH, 20% vermicast, 20% cow manure' },
    cow_manure_excluded: false,
    fertilizer_schedule: [
      { stage: 'Establishment', product: 'Complete Fertilizer (14-14-14)', rate_value: 10, rate_unit: 'g/pot', frequency: '14 days after transplant' },
      { stage: 'Active Growth', product: 'Urea (46-0-0)', rate_value: 5, rate_unit: 'g/L', frequency: 'Every 10 days' }
    ],
    pest_records: [
      { pest: 'Flea Beetles', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L' } },
      { pest: 'Spider Mites', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L' } }
    ],
    disease_records: [
      { disease: 'Mint Rust', recommended_action: { target_product_name: 'Manual Removal', dosage_value: 0, dosage_unit: 'N/A' } },
      { disease: 'Powdery Mildew', recommended_action: { target_product_name: 'Potassium Bicarbonate', dosage_value: 10, dosage_unit: 'g/L' } }
    ],
    harvest_indicators: 'Stems 15-20cm, aromatic', harvest_method: 'Shear stems leaving 5cm',
    yield_per_pot: '100-150g per cycle', postharvest_notes: 'Same as Peppermint — handle gently.',
    high_risk_flag: 'Containment mandatory — invasive.', pesticide_free_required: false
  },
  {
    common_name: 'Rosemary', scientific_name: 'Salvia rosmarinus', family: 'Lamiaceae', category: 'Herb',
    default_prop_method: 'Cutting', growth_type: 'Perennial', format: 'Both',
    varieties: ['Common Rosemary'],
    stages: [
      { name: 'Root Establishment', start_day: 0, end_day: 40, risk: 'HIGHEST RISK — one overwatering event can be fatal' },
      { name: 'Vegetative Development', start_day: 41, end_day: 120, risk: 'Drainage vigilance required' },
      { name: 'Maturity', start_day: 121, end_day: 1095, risk: 'Long-lived if drainage maintained' }
    ],
    days_to_maturity: 120, rooting_or_germ_days: 15, avg_nursery_days: 40,
    days_to_first_harvest: 90, harvest_interval_days: 30, plot_lifespan_days: 1095, resting_days: 0,
    harvest_window_days: 30,
    pot_diameter_cm: 25, pot_depth_cm: 30, pot_material: 'Unsealed terracotta mandatory',
    soil_mix: { type: 'Mix B', components: '30% clay, 40% CRH, 20% coarse river sand, 10% vermicast. Cow manure 0%.' },
    cow_manure_excluded: true,
    fertilizer_schedule: [
      { stage: 'Establishment', product: 'Complete Fertilizer (14-14-14)', rate_value: 5, rate_unit: 'g/pot', frequency: 'Once at planting' },
      { stage: 'Vegetative', product: 'Urea (46-0-0)', rate_value: 2.5, rate_unit: 'g/L', frequency: 'Every 30 days — stop in rainy season' }
    ],
    pest_records: [
      { pest: 'Spittlebugs', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L', notes: 'Frothy spit-like masses' } },
      { pest: 'Thrips', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L', notes: 'Silvery stippling' } }
    ],
    disease_records: [
      { disease: 'Phytophthora Root Rot', recommended_action: { target_product_name: 'Manual Disposal', dosage_value: 0, dosage_unit: 'N/A', notes: 'NO CURE — destroy plant and substrate' } }
    ],
    harvest_indicators: 'Green non-woody stems 10-15cm long', harvest_method: 'Prune green stems only — never cut old leafless wood',
    yield_per_pot: '15-30g per month', postharvest_notes: 'Dry rapidly below 35°C.',
    high_risk_flag: 'Potted culture MANDATORY. Open-ground = 100% mortality. Rain protection REQUIRED June-Nov.', pesticide_free_required: false
  },
  {
    common_name: 'Thyme', scientific_name: 'Thymus vulgaris', family: 'Lamiaceae', category: 'Herb',
    default_prop_method: 'Cutting', growth_type: 'Perennial', format: 'Both',
    varieties: ['Common Thyme'],
    stages: [
      { name: 'Establishment', start_day: 0, end_day: 30, risk: 'Overwatering — drainage must be immediate' },
      { name: 'Vegetative', start_day: 31, end_day: 90, risk: 'Dense foliage + fog = fungal die-off from center' },
      { name: 'Maturity', start_day: 91, end_day: 1095, risk: 'Cutting into woody base kills plant' }
    ],
    days_to_maturity: 90, rooting_or_germ_days: 14, avg_nursery_days: 30,
    days_to_first_harvest: 60, harvest_interval_days: 21, plot_lifespan_days: 1095, resting_days: 0,
    harvest_window_days: 21,
    pot_diameter_cm: 20, pot_depth_cm: 20, pot_material: 'Unsealed terracotta',
    soil_mix: { type: 'Mix B', components: '30% clay, 40% CRH, 20% coarse river sand, 10% vermicast. Cow manure 0%.' },
    cow_manure_excluded: true,
    fertilizer_schedule: [
      { stage: 'Establishment', product: 'Complete Fertilizer (14-14-14)', rate_value: 3, rate_unit: 'g/pot', frequency: 'Once at planting' }
    ],
    pest_records: [
      { pest: 'Spider Mites', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L' } },
      { pest: 'Aphids', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L' } }
    ],
    disease_records: [
      { disease: 'Phytophthora Root Rot', recommended_action: { target_product_name: 'Manual Disposal', dosage_value: 0, dosage_unit: 'N/A' } },
      { disease: 'Botrytis Blight', recommended_action: { target_product_name: 'Potassium Bicarbonate', dosage_value: 5, dosage_unit: 'g/L', notes: 'Gray fuzzy growth' } }
    ],
    harvest_indicators: 'Stems 15cm long with dense foliage', harvest_method: 'Cut-and-come-again — leave 5cm woody stem',
    yield_per_pot: '20-30g per cycle', postharvest_notes: 'Refrigerate 4°C or dry by hanging.',
    high_risk_flag: 'Rain protection REQUIRED June-Nov. Same risk as Rosemary.', pesticide_free_required: false
  },
  {
    common_name: 'French Tarragon', scientific_name: 'Artemisia dracunculus', family: 'Asteraceae', category: 'Herb',
    default_prop_method: 'Cutting', growth_type: 'Perennial', format: 'Units',
    varieties: ['French Tarragon'],
    stages: [
      { name: 'Root Establishment', start_day: 0, end_day: 40, risk: 'CRITICAL — single overwatering = death' },
      { name: 'Vegetative', start_day: 41, end_day: 120, risk: 'Any moisture accumulation is fatal' },
      { name: 'Harvest Stage', start_day: 121, end_day: 730, risk: 'Monsoon requires complete overhead protection' }
    ],
    days_to_maturity: 120, rooting_or_germ_days: 15, avg_nursery_days: 40,
    days_to_first_harvest: 120, harvest_interval_days: 30, plot_lifespan_days: 730, resting_days: 0,
    harvest_window_days: 30,
    pot_diameter_cm: 25, pot_depth_cm: 30, pot_material: 'Unsealed terracotta mandatory',
    soil_mix: { type: 'Mix B', components: 'Same as Rosemary. Cow manure 0%.' },
    cow_manure_excluded: true,
    fertilizer_schedule: [
      { stage: 'Establishment', product: 'Complete Fertilizer (14-14-14)', rate_value: 5, rate_unit: 'g/pot', frequency: 'Once at planting' },
      { stage: 'Vegetative - Dry Only', product: 'Urea (46-0-0)', rate_value: 2.5, rate_unit: 'g/L', frequency: 'Every 30 days — stop in rainy season' }
    ],
    pest_records: [], disease_records: [
      { disease: 'Phytophthora Root Rot', recommended_action: { target_product_name: 'Manual Disposal', dosage_value: 0, dosage_unit: 'N/A' } }
    ],
    harvest_indicators: 'Upper 2/3 of stem dense with aromatic leaves', harvest_method: 'Strip leaves from upper 2/3 — do not cut woody base',
    yield_per_pot: '15-30g per month', postharvest_notes: 'Dry rapidly below 35°C.',
    high_risk_flag: 'HIGHEST RISK CROP. 100% mortality in rainy season without cover. Consider Mexican Tarragon as alternative.', pesticide_free_required: false
  },
  {
    common_name: 'Stevia', scientific_name: 'Stevia rebaudiana', family: 'Asteraceae', category: 'Herb',
    default_prop_method: 'Cutting', growth_type: 'Cut and come again', format: 'Units',
    varieties: ['Stevia'],
    stages: [
      { name: 'Seedling/Cuttings', start_day: 0, end_day: 30, risk: 'Damping off if waterlogged' },
      { name: 'Vegetative', start_day: 31, end_day: 80, risk: 'Prevent flowering — harvest before buds open' },
      { name: 'Reproductive - Prevent', start_day: 81, end_day: 365, risk: 'Flowering = sweetness decline' }
    ],
    days_to_maturity: 80, rooting_or_germ_days: 14, avg_nursery_days: 30,
    days_to_first_harvest: 30, harvest_interval_days: 30, plot_lifespan_days: 365, resting_days: 14,
    harvest_window_days: 30,
    pot_diameter_cm: 20, pot_depth_cm: 20, pot_material: 'Plastic or terracotta',
    soil_mix: { type: 'Mix A variant', components: '40% clay, 30% CRH, 20% vermicast, 10% cow manure' },
    cow_manure_excluded: false,
    fertilizer_schedule: [
      { stage: 'Establishment', product: 'Complete Fertilizer (14-14-14)', rate_value: 5, rate_unit: 'g/pot', frequency: 'Once' }
    ],
    pest_records: [
      { pest: 'Whiteflies', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L' } },
      { pest: 'Cutworms', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L', notes: 'Apply at night' } }
    ],
    disease_records: [
      { disease: 'Septoria Leaf Spot', recommended_action: { target_product_name: 'Potassium Bicarbonate', dosage_value: 5, dosage_unit: 'g/L' } },
      { disease: 'White Mold', recommended_action: { target_product_name: 'Manual Disposal', dosage_value: 0, dosage_unit: 'N/A' } }
    ],
    harvest_indicators: 'Plant 30-40cm height. Harvest BEFORE flower buds open.',
    harvest_method: 'Cut-and-come-again — clip stems. 30-day interval.',
    yield_per_pot: '30-60g fresh leaves', postharvest_notes: 'Dry rapidly — crush into powder or steep fresh.',
    high_risk_flag: null, pesticide_free_required: false
  },
  {
    common_name: 'Sweet Basil', scientific_name: 'Ocimum basilicum', family: 'Lamiaceae', category: 'Herb',
    default_prop_method: 'Seed', growth_type: 'Cut and come again', format: 'Both',
    varieties: ['Sweet Basil'],
    stages: [
      { name: 'Seedling', start_day: 0, end_day: 28, risk: 'Damping-off in cold wet soils' },
      { name: 'Vegetative', start_day: 29, end_day: 69, risk: 'Aphids, leafminers, downy mildew' },
      { name: 'Mature Vegetative (Wholesale)', start_day: 70, end_day: 365, risk: 'Pinch flowers immediately' }
    ],
    days_to_maturity: 70, rooting_or_germ_days: 14, avg_nursery_days: 35,
    days_to_first_harvest: 70, harvest_interval_days: 14, plot_lifespan_days: 365, resting_days: 14,
    harvest_window_days: 10, spacing_cm: '25x30cm', plants_per_sqm: 13, min_bed_depth_cm: 25, mound_height_cm: 30,
    pot_diameter_cm: 20, pot_depth_cm: null, pot_material: null,
    soil_mix: { type: 'Mix E (bed) / Mix A (pot)', components: 'Bed: 50% clay, 20% CRH, 15% cow manure, 15% vermicast. Pot: Mix A.' },
    cow_manure_excluded: false, rotation_family: 'Lamiaceae',
    avoid_after: ['Lamiaceae'], recommended_after: ['Legumes', 'Alliums'],
    fertilizer_schedule: [
      { stage: 'Basal', product: 'Complete Fertilizer (14-14-14)', rate_value: 50, rate_unit: 'g/sqm', frequency: '7 days before transplant' },
      { stage: 'Vegetative', product: 'Urea (46-0-0)', rate_value: 5, rate_unit: 'g/L', frequency: 'Every 14 days' },
      { stage: 'Rainy Season', product: 'Urea (46-0-0)', rate_value: 2.5, rate_unit: 'g/L', frequency: 'Every 7 days — split applications' }
    ],
    pest_records: [
      { pest: 'Leafminers', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L', notes: 'White serpentine tunnels' } },
      { pest: 'Flea Beetles', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L', notes: 'Shot-holes' } },
      { pest: 'Aphids', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L', notes: 'Honeydew, sooty mold' } },
      { pest: 'Whiteflies', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L', notes: 'Tiny white moths' } },
      { pest: 'Root-Knot Nematodes', recommended_action: { target_product_name: 'Manual Disposal', dosage_value: 0, dosage_unit: 'N/A', notes: 'Marigold intercropping mandatory' } }
    ],
    disease_records: [
      { disease: 'Basil Downy Mildew', recommended_action: { target_product_name: 'Potassium Bicarbonate', dosage_value: 5, dosage_unit: 'g/L', frequency_days: 7, notes: 'Gray-purple fuzzy underside' } },
      { disease: 'Fusarium Wilt', recommended_action: { target_product_name: 'Manual Disposal', dosage_value: 0, dosage_unit: 'N/A', notes: 'Sudden one-sided wilting' } }
    ],
    harvest_indicators: 'Plant reaches 15cm — pinch apical meristem', harvest_method: 'Cut-and-come-again lateral branches every 7-10 days',
    yield_per_sqm: '1.5-2.0 kg over 60-80 day lifespan', yield_per_pot: '100-200g over lifespan',
    postharvest_notes: 'Do NOT refrigerate — blackens below 10°C. Store ambient high-humidity 3-5 day shelf life.',
    high_risk_flag: 'Rainy season: Downy Mildew = near 100% loss risk in open beds.', pesticide_free_required: false
  },
  {
    common_name: 'Lemon Basil', scientific_name: 'Ocimum × citriodorum', family: 'Lamiaceae', category: 'Herb',
    default_prop_method: 'Seed', growth_type: 'Cut and come again', format: 'Both',
    varieties: ['Lemon Basil'],
    stages: [
      { name: 'Seedling', start_day: 0, end_day: 14, risk: 'Same as Sweet Basil' },
      { name: 'Vegetative', start_day: 15, end_day: 40, risk: 'Highest sensitivity — burns fastest' },
      { name: 'Reproductive', start_day: 41, end_day: 80, risk: 'Bolts earliest of all basils' }
    ],
    days_to_maturity: 50, rooting_or_germ_days: 7, avg_nursery_days: 14,
    days_to_first_harvest: 35, harvest_interval_days: 7, plot_lifespan_days: 80, resting_days: 14,
    harvest_window_days: 10, spacing_cm: '25x30cm', plants_per_sqm: 13, min_bed_depth_cm: 25, mound_height_cm: 30,
    pot_diameter_cm: 20, soil_mix: { type: 'Mix E/A', components: 'Same as Sweet Basil' },
    cow_manure_excluded: false, rotation_family: 'Lamiaceae',
    avoid_after: ['Lamiaceae'], recommended_after: ['Legumes', 'Alliums'],
    fertilizer_schedule: [
      { stage: 'All stages', product: 'Urea (46-0-0)', rate_value: 3, rate_unit: 'g/L', frequency: 'Every 10-14 days', notes: 'MAXIMUM rate for Lemon Basil' }
    ],
    pest_records: [
      { pest: 'Leafminers', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L' } },
      { pest: 'Aphids', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L' } }
    ],
    disease_records: [
      { disease: 'Basil Downy Mildew', recommended_action: { target_product_name: 'Potassium Bicarbonate', dosage_value: 5, dosage_unit: 'g/L' } }
    ],
    harvest_indicators: 'Same as Sweet Basil', harvest_method: 'Same',
    yield_per_sqm: '1.5-2.0 kg', yield_per_pot: '100-200g',
    postharvest_notes: 'Same as Sweet Basil.',
    high_risk_flag: 'Thinnest leaves — reduce ALL fertilizer rates 30-40%. Monitor most frequently.', pesticide_free_required: false
  },
  {
    common_name: 'Thai Basil', scientific_name: 'Ocimum basilicum var. thyrsiflora', family: 'Lamiaceae', category: 'Herb',
    default_prop_method: 'Seed', growth_type: 'Cut and come again', format: 'Both',
    varieties: ['Thai Basil'],
    stages: [
      { name: 'Seedling', start_day: 0, end_day: 14, risk: 'Same as Sweet Basil' },
      { name: 'Vegetative', start_day: 15, end_day: 40, risk: 'Most heat tolerant — lowest sensitivity' },
      { name: 'Reproductive', start_day: 41, end_day: 80, risk: 'Pinch flowers' }
    ],
    days_to_maturity: 50, rooting_or_germ_days: 7, avg_nursery_days: 14,
    days_to_first_harvest: 35, harvest_interval_days: 7, plot_lifespan_days: 80, resting_days: 14,
    harvest_window_days: 10, spacing_cm: '25x30cm', plants_per_sqm: 13, min_bed_depth_cm: 25, mound_height_cm: 30,
    pot_diameter_cm: 20, soil_mix: { type: 'Mix E/A', components: 'Same as Sweet Basil' },
    cow_manure_excluded: false, rotation_family: 'Lamiaceae',
    avoid_after: ['Lamiaceae'], recommended_after: ['Legumes', 'Alliums'],
    fertilizer_schedule: [
      { stage: 'All', product: 'Complete Fertilizer (14-14-14)', rate_value: 5, rate_unit: 'g/pot', frequency: 'Every 14 days' }
    ],
    pest_records: [{ pest: 'Same as Sweet Basil', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L' } }],
    disease_records: [
      { disease: 'Basil Downy Mildew', recommended_action: { target_product_name: 'Potassium Bicarbonate', dosage_value: 5, dosage_unit: 'g/L' } }
    ],
    harvest_indicators: 'Same as Sweet Basil', harvest_method: 'Same',
    yield_per_sqm: '1.5-2.0 kg', yield_per_pot: '100-200g', postharvest_notes: 'Same as Sweet Basil.',
    high_risk_flag: 'Natural purple pigmentation — use growth rate not color for phosphorus diagnosis.', pesticide_free_required: false
  },
  {
    common_name: 'Pechay', scientific_name: 'Brassica rapa subsp. chinensis', family: 'Brassicaceae', category: 'Vegetable',
    default_prop_method: 'Seed', growth_type: 'Single harvest', format: 'Bulk grams',
    varieties: ['Pechay'],
    stages: [
      { name: 'Seedling', start_day: 0, end_day: 14, risk: 'Flea beetle damage devastating to young' },
      { name: 'Vegetative', start_day: 15, end_day: 35, risk: 'Cabbage webworm boring into bud' },
      { name: 'Harvest Maturity', start_day: 36, end_day: 45, risk: 'Do not over-mature — fibrous petioles' }
    ],
    days_to_maturity: 45, rooting_or_germ_days: 5, avg_nursery_days: 14,
    days_to_first_harvest: 30, harvest_interval_days: 0, plot_lifespan_days: 45, resting_days: 21,
    harvest_window_days: 15, spacing_cm: '15x20cm', plants_per_sqm: 30, min_bed_depth_cm: 20, mound_height_cm: 25,
    soil_mix: { type: 'Mix E', components: '50% clay, 20% CRH + 20% vermicast, 15% cow manure' },
    cow_manure_excluded: false, rotation_family: 'Brassicaceae',
    avoid_after: ['Brassicaceae'], recommended_after: ['Solanaceae', 'Alliums'],
    fertilizer_schedule: [
      { stage: 'Basal', product: 'Complete Fertilizer (14-14-14)', rate_value: 50, rate_unit: 'g/sqm', frequency: '3 days before transplant' },
      { stage: 'Sidedress', product: 'Urea (46-0-0)', rate_value: 5, rate_unit: 'g/L', frequency: '14 & 21 DAT' }
    ],
    pest_records: [
      { pest: 'Cabbage Webworm', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L', notes: 'Spray into whorl' } },
      { pest: 'Flea Beetles', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L' } }
    ],
    disease_records: [
      { disease: 'Bacterial Soft Rot', recommended_action: { target_product_name: 'Drainage Improvement', dosage_value: 0, dosage_unit: 'N/A' } },
      { disease: 'Clubroot', recommended_action: { target_product_name: 'Manual Disposal', dosage_value: 0, dosage_unit: 'N/A', notes: 'QUARANTINE BED' } }
    ],
    harvest_indicators: '30-45 days — before floral initiation', harvest_method: 'Sever at taproot base — single harvest',
    yield_per_sqm: '2.5-3.5 kg', postharvest_notes: 'Wash, refrigerate 4°C immediately. 2-3 day shelf life.',
    high_risk_flag: 'Clubroot is incurable and persists 10+ years. Quarantine bed if detected.', pesticide_free_required: false
  },
  {
    common_name: 'Pakchoi', scientific_name: 'Brassica rapa subsp. chinensis', family: 'Brassicaceae', category: 'Vegetable',
    default_prop_method: 'Seed', growth_type: 'Single harvest', format: 'Bulk grams',
    varieties: ['Pakchoi'], 
    stages: [{ name: 'Growth', start_day: 0, end_day: 45, risk: 'Same as Pechay' }],
    days_to_maturity: 45, rooting_or_germ_days: 5, avg_nursery_days: 14,
    days_to_first_harvest: 30, harvest_interval_days: 0, plot_lifespan_days: 45, resting_days: 21,
    harvest_window_days: 15, spacing_cm: '15x20cm', plants_per_sqm: 30, min_bed_depth_cm: 20, mound_height_cm: 25,
    soil_mix: { type: 'Mix E', components: 'Same as Pechay' }, cow_manure_excluded: false,
    rotation_family: 'Brassicaceae',
    fertilizer_schedule: [{ stage: 'Active', product: 'Complete Fertilizer (14-14-14)', rate_value: 50, rate_unit: 'g/sqm', frequency: 'Weekly' }],
    pest_records: [{ pest: 'Same as Pechay', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L' } }],
    disease_records: [],
    harvest_indicators: 'Same as Pechay', harvest_method: 'Same', yield_per_sqm: '2.5-3.5 kg',
    pesticide_free_required: false
  },
  {
    common_name: 'Mustasa', scientific_name: 'Brassica juncea', family: 'Brassicaceae', category: 'Vegetable',
    default_prop_method: 'Seed', growth_type: 'Single harvest', format: 'Bulk grams',
    varieties: ['Mustasa'], 
    stages: [{ name: 'Growth', start_day: 0, end_day: 45, risk: 'Same as Pechay' }],
    days_to_maturity: 45, rooting_or_germ_days: 5, avg_nursery_days: 14,
    days_to_first_harvest: 30, harvest_interval_days: 0, plot_lifespan_days: 45, resting_days: 21,
    harvest_window_days: 15, spacing_cm: '15x20cm', plants_per_sqm: 30, min_bed_depth_cm: 20, mound_height_cm: 25,
    soil_mix: { type: 'Mix E', components: 'Same as Pechay' }, cow_manure_excluded: false,
    rotation_family: 'Brassicaceae',
    fertilizer_schedule: [{ stage: 'Active', product: 'Complete Fertilizer (14-14-14)', rate_value: 50, rate_unit: 'g/sqm', frequency: 'Weekly' }],
    pest_records: [{ pest: 'Same as Pechay', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L' } }],
    disease_records: [],
    harvest_indicators: 'Same', harvest_method: 'Same', yield_per_sqm: '2.5-3.5 kg',
    pesticide_free_required: false
  },
  {
    common_name: 'Strawberry', scientific_name: 'Fragaria × ananassa', family: 'Rosaceae', category: 'Vegetable',
    default_prop_method: 'Division', growth_type: 'Perennial', format: 'Units',
    varieties: ['Sweet Charlie', 'Festival', 'Honeoye', 'San Andreas'],
    stages: [
      { name: 'Establishment', start_day: 0, end_day: 30, risk: 'Root sensitivity to heavy clay' },
      { name: 'Vegetative', start_day: 31, end_day: 60, risk: 'Day-night temp differential maximizes storage' },
      { name: 'Flowering & Fruiting', start_day: 61, end_day: 120, risk: 'Botrytis from humidity is primary loss risk' }
    ],
    days_to_maturity: 60, rooting_or_germ_days: 14, avg_nursery_days: 30,
    days_to_first_harvest: 60, harvest_interval_days: 3, plot_lifespan_days: 120, resting_days: 30,
    harvest_window_days: 120,
    pot_diameter_cm: 20, pot_depth_cm: 20, pot_material: 'Individual pots or substrate troughs',
    soil_mix: { type: 'Mix D', components: '30% clay, 40% CRH, 10% raw rice hull, 20% vermicast' },
    cow_manure_excluded: false,
    fertilizer_schedule: [
      { stage: 'Vegetative', product: 'Complete Fertilizer (14-14-14)', rate_value: 5, rate_unit: 'g/pot', frequency: 'Once at planting' }
    ],
    pest_records: [
      { pest: 'Spider Mites', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L', notes: 'STOP 10 days before red color' } },
      { pest: 'Thrips', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L' } }
    ],
    disease_records: [
      { disease: 'Anthracnose', recommended_action: { target_product_name: 'Potassium Bicarbonate', dosage_value: 5, dosage_unit: 'g/L' } },
      { disease: 'Botrytis Fruit Rot', recommended_action: { target_product_name: 'Potassium Bicarbonate', dosage_value: 5, dosage_unit: 'g/L' } }
    ],
    harvest_indicators: '75-100% red coloration', harvest_method: 'Pinch and snap stem 1cm above calyx',
    yield_per_pot: '200-400g per season', postharvest_notes: 'Cool to 2°C MANDATORY.',
    high_risk_flag: 'Rainy season: Botrytis = near-total fruit loss. Covered production required.', pesticide_free_required: false
  },
  {
    common_name: 'Sweet William', scientific_name: 'Dianthus barbatus', family: 'Caryophyllaceae', category: 'Edible Flower',
    default_prop_method: 'Seed', growth_type: 'Annual', format: 'Units',
    varieties: ['Sweet William'],
    stages: [
      { name: 'Vegetative', start_day: 0, end_day: 40, risk: 'Botrytis from humidity' },
      { name: 'Floral Initiation', start_day: 41, end_day: 60, risk: 'N excess = no flowers' },
      { name: 'Continuous Blooming', start_day: 61, end_day: 180, risk: 'Rain bruises petals' }
    ],
    days_to_maturity: 70, rooting_or_germ_days: 10, avg_nursery_days: 30,
    days_to_first_harvest: 70, harvest_interval_days: 14, plot_lifespan_days: 180, resting_days: 0,
    harvest_window_days: 21,
    pot_diameter_cm: 20, soil_mix: { type: 'Mix C', components: '40% clay, 30% CRH, 30% vermicast' },
    cow_manure_excluded: false,
    fertilizer_schedule: [
      { stage: 'Establishment', product: 'Complete Fertilizer (14-14-14)', rate_value: 10, rate_unit: 'g/pot', frequency: 'Once' }
    ],
    pest_records: [{ pest: 'Thrips', recommended_action: { target_product_name: 'Manual removal', dosage_value: 0, dosage_unit: 'N/A' } }],
    disease_records: [{ disease: 'Botrytis Blight', recommended_action: { target_product_name: 'Potassium Bicarbonate', dosage_value: 5, dosage_unit: 'g/L', notes: 'Foliage only' } }],
    harvest_indicators: 'Outer 15-20% florets open',
    harvest_method: 'Cut stem deep into foliage', edible_parts: 'Petals only',
    yield_per_pot: '5-8 stems per cycle', postharvest_notes: 'Rigid clamshells at 4°C.',
    high_risk_flag: 'Covered production REQUIRED for edible-grade during monsoon.', pesticide_free_required: true
  },
  {
    common_name: 'French Marigold', scientific_name: 'Tagetes patula', family: 'Asteraceae', category: 'Edible Flower',
    default_prop_method: 'Seed', growth_type: 'Annual', format: 'Units',
    varieties: ['French Marigold'],
    stages: [
      { name: 'Vegetative', start_day: 0, end_day: 40, risk: 'Standard' },
      { name: 'Floral', start_day: 41, end_day: 60, risk: 'N excess = blind growth' },
      { name: 'Blooming', start_day: 61, end_day: 150, risk: 'Deadhead to prolong' }
    ],
    days_to_maturity: 60, rooting_or_germ_days: 7, avg_nursery_days: 21,
    days_to_first_harvest: 60, harvest_interval_days: 7, plot_lifespan_days: 150, resting_days: 0,
    harvest_window_days: 30,
    pot_diameter_cm: 20, soil_mix: { type: 'Mix C variant', components: 'Tolerates poorer soil' },
    cow_manure_excluded: false,
    fertilizer_schedule: [
      { stage: 'Establishment', product: 'Complete Fertilizer (14-14-14)', rate_value: 10, rate_unit: 'g/pot', frequency: 'Once' }
    ],
    pest_records: [{ pest: 'Thrips', recommended_action: { target_product_name: 'Manual removal', dosage_value: 0, dosage_unit: 'N/A' } }],
    disease_records: [{ disease: 'Botrytis Blight', recommended_action: { target_product_name: 'Potassium Bicarbonate', dosage_value: 5, dosage_unit: 'g/L' } }],
    harvest_indicators: 'Pluck individual petals only',
    harvest_method: 'Regular deadheading', edible_parts: 'Petals only', yield_per_pot: 'Continuous',
    postharvest_notes: 'Rigid clamshells at 4°C.',
    high_risk_flag: 'Strong pest-repellent properties.', pesticide_free_required: true
  },
  {
    common_name: 'Torenia', scientific_name: 'Torenia fournieri', family: 'Linderniaceae', category: 'Edible Flower',
    default_prop_method: 'Seed', growth_type: 'Annual', format: 'Units',
    varieties: ['Torenia'],
    stages: [
      { name: 'Growth', start_day: 0, end_day: 60, risk: 'Keep consistently moist' },
      { name: 'Blooming', start_day: 61, end_day: 150, risk: 'Needs partial shade' }
    ],
    days_to_maturity: 60, rooting_or_germ_days: 10, avg_nursery_days: 30,
    days_to_first_harvest: 60, harvest_interval_days: 7, plot_lifespan_days: 150, resting_days: 0,
    harvest_window_days: 30,
    pesticide_free_required: true,
    soil_mix: { type: 'Mix C variant', components: 'High moisture retention' },
    fertilizer_schedule: [{ stage: 'Active', product: 'Complete Fertilizer (14-14-14)', rate_value: 10, rate_unit: 'g/pot', frequency: 'Once' }],
    disease_records: [{ disease: 'Botrytis Blight', recommended_action: { target_product_name: 'Potassium Bicarbonate', dosage_value: 5, dosage_unit: 'g/L' } }]
  },
  {
    common_name: 'Blue Ternate', scientific_name: 'Clitoria ternatea', family: 'Fabaceae', category: 'Edible Flower',
    default_prop_method: 'Seed', growth_type: 'Perennial', format: 'Units',
    varieties: ['Blue Ternate / Butterfly Pea'],
    stages: [
      { name: 'Establishment', start_day: 0, end_day: 40, risk: 'Needs immediate trellising' },
      { name: 'Blooming', start_day: 41, end_day: 730, risk: 'N excess = all foliage no flowers' }
    ],
    days_to_maturity: 60, rooting_or_germ_days: 7, avg_nursery_days: 21,
    days_to_first_harvest: 60, harvest_interval_days: 1, plot_lifespan_days: 730, resting_days: 0,
    harvest_window_days: 365,
    pesticide_free_required: true,
    fertilizer_schedule: [{ stage: 'Life', product: 'Complete Fertilizer (14-14-14)', rate_value: 10, rate_unit: 'g/pot', frequency: 'Once' }],
    pest_records: [{ pest: 'Scale Insects', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L', notes: 'Stems only' } }]
  },
  {
    common_name: 'Globe Amaranth', scientific_name: 'Gomphrena globosa', family: 'Amaranthaceae', category: 'Edible Flower',
    default_prop_method: 'Seed', growth_type: 'Annual', format: 'Units',
    varieties: ['Globe Amaranth'],
    stages: [
      { name: 'Growth', start_day: 0, end_day: 60, risk: 'Standard' },
      { name: 'Blooming', start_day: 61, end_day: 150, risk: 'Drought tolerant' }
    ],
    days_to_maturity: 60, rooting_or_germ_days: 10, avg_nursery_days: 21,
    days_to_first_harvest: 60, harvest_interval_days: 7, plot_lifespan_days: 150, resting_days: 0,
    harvest_window_days: 30,
    pesticide_free_required: true,
    disease_records: [{ disease: 'White Mold', recommended_action: { target_product_name: 'Manual Disposal', dosage_value: 0, dosage_unit: 'N/A' } }]
  },
  {
    common_name: 'Cilantro / Coriander', scientific_name: 'Coriandrum sativum', family: 'Apiaceae', category: 'Herb',
    default_prop_method: 'Seed', growth_type: 'Single harvest', format: 'Bulk grams',
    varieties: ['Santo', 'Slow Bolt'],
    stages: [
      { name: 'Seedling', start_day: 0, end_day: 14, risk: 'Damping off' },
      { name: 'Vegetative', start_day: 15, end_day: 45, risk: 'Root sensitivity' },
      { name: 'Harvest Maturity', start_day: 46, end_day: 60, risk: 'Bolts rapidly in heat' }
    ],
    days_to_maturity: 60, rooting_or_germ_days: 10, avg_nursery_days: 14,
    days_to_first_harvest: 45, harvest_interval_days: 0, plot_lifespan_days: 60, resting_days: 21,
    harvest_window_days: 10,
    pesticide_free_required: false,
    fertilizer_schedule: [{ stage: 'Vegetative', product: 'Urea (46-0-0)', rate_value: 2.5, rate_unit: 'g/L', frequency: 'Every 14 days' }],
    pest_records: [{ pest: 'Aphids', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L' } }],
    disease_records: [{ disease: 'Bacterial Blight', recommended_action: { target_product_name: 'Potassium Bicarbonate', dosage_value: 5, dosage_unit: 'g/L' } }]
  },
  {
    common_name: 'Nasturtiums', scientific_name: 'Tropaeolum majus', family: 'Tropaeolaceae', category: 'Edible Flower',
    default_prop_method: 'Seed', growth_type: 'Annual', format: 'Units',
    varieties: ['Jewel Mix', 'Trailing'],
    stages: [
      { name: 'Establishment', start_day: 0, end_day: 21, risk: 'Aphid attraction' },
      { name: 'Maturity', start_day: 22, end_day: 120, risk: 'Heavy moisture required' }
    ],
    days_to_maturity: 60, rooting_or_germ_days: 10, avg_nursery_days: 21,
    days_to_first_harvest: 45, harvest_interval_days: 7, plot_lifespan_days: 120, resting_days: 0,
    harvest_window_days: 30,
    pesticide_free_required: true,
    fertilizer_schedule: [{ stage: 'Active', product: 'Vermicast Tea', rate_value: 100, rate_unit: 'ml/L', frequency: 'Every 14 days' }],
    pest_records: [{ pest: 'Aphids', recommended_action: { target_product_name: 'Manual Disposal', dosage_value: 0, dosage_unit: 'N/A', notes: 'PRIMARY TRAP CROP' } }]
  },
  {
    common_name: 'Chives', scientific_name: 'Allium schoenoprasum', family: 'Amaryllidaceae', category: 'Herb',
    default_prop_method: 'Seed', growth_type: 'Cut and come again', format: 'Units',
    varieties: ['Common Chives'],
    stages: [
      { name: 'Establishment', start_day: 0, end_day: 30, risk: 'Slow growth' },
      { name: 'Vegetative', start_day: 31, end_day: 730, risk: 'Thrips attraction' }
    ],
    days_to_maturity: 90, rooting_or_germ_days: 14, avg_nursery_days: 30,
    days_to_first_harvest: 60, harvest_interval_days: 15, plot_lifespan_days: 730, resting_days: 0,
    harvest_window_days: 365,
    pesticide_free_required: false,
    fertilizer_schedule: [{ stage: 'Vegetative', product: 'Urea (46-0-0)', rate_value: 2.5, rate_unit: 'g/L', frequency: 'Every 21 days' }],
    pest_records: [{ pest: 'Thrips', recommended_action: { target_product_name: 'Neem Oil', dosage_value: 5, dosage_unit: 'ml/L' } }],
    high_risk_flag: 'AROMATIC DETERRENT. Efficient companion for masking Basil scent.'
  }
];

const SEED_INPUTS = [
  { product_name: 'Neem Oil', type: 'Organic Pesticide', active_ingredient: 'Azadirachtin', mix_rate: '5ml / 1 L', current_stock: 5.0, stock_unit: 'liters', low_stock_threshold: 0.5, withholding_days: 0, notes: 'Target: Aphids, Thrips, Mites' },
  { product_name: 'Potassium Bicarbonate', type: 'Fungicide', active_ingredient: 'KHCO3', mix_rate: '5g / 1 L', current_stock: 2.5, stock_unit: 'kg', low_stock_threshold: 0.5, withholding_days: 0, notes: 'Target: Downy Mildew, Powdery Mildew' },
  { product_name: 'Urea (46-0-0)', type: 'Fertilizer', active_ingredient: 'Nitrogen', mix_rate: '2.5-5g / 1 L', current_stock: 25.0, stock_unit: 'kg', low_stock_threshold: 5.0, withholding_days: 7, notes: 'Nitrogen boost' },
  { product_name: 'Complete Fertilizer (14-14-14)', type: 'Fertilizer', active_ingredient: 'NPK', mix_rate: '10g per pot', current_stock: 50.0, stock_unit: 'kg', low_stock_threshold: 5.0, withholding_days: 14, notes: 'Basal/Maintenance' },
  { product_name: 'Vermicast', type: 'Soil Amendment', active_ingredient: 'Organic Matter', mix_rate: '100g per pot', current_stock: 100.0, stock_unit: 'kg', low_stock_threshold: 20.0, withholding_days: 0, notes: 'Soil conditioning' },
  { product_name: 'Insecticidal Soap', type: 'Organic Pesticide', active_ingredient: 'Potassium Salts', mix_rate: '10ml / 1 L', current_stock: 5.0, stock_unit: 'liters', low_stock_threshold: 1.0, withholding_days: 0, notes: 'Target: Soft-bodied insects' }
];

export const seedCropLibrary = async () => {
  try {
    const existing = await db.getAll('crops');
    
    // CLEANUP: Use a more aggressive cleanup if count is wrong or duplicates found
    const names = existing?.map(c => c.common_name) || [];
    const hasDuplicates = new Set(names).size !== names.length;
    const countMismatch = (existing?.length || 0) !== CROPS.length;

    if (hasDuplicates || countMismatch) {
        console.log('🔄 Syncing Crop Library: Re-verifying uniqueness...');
    }

    console.log(`🔄 Synchronizing ${CROPS.length} blueprint records with database...`);
    let updatedCount = 0;
    let insertedCount = 0;

    for (const cropData of CROPS) {
      const existingRecords = existing?.filter(c => c.common_name === cropData.common_name) || [];
      
      if (existingRecords.length > 0) {
        // UPDATE the first one
        await db.update('crops', existingRecords[0].id, cropData);
        updatedCount++;
        // DELETE others (duplicates) if possible
        if (existingRecords.length > 1) {
            for (let i = 1; i < existingRecords.length; i++) {
                try { await db.delete('crops', existingRecords[i].id); } catch(e) { /* might be in use */ }
            }
        }
      } else {
        await db.insert('crops', cropData);
        insertedCount++;
      }
    }

    console.log(`✅ Success: ${updatedCount} updated, ${insertedCount} new. Total: 22.`);
  } catch (err) {
    console.error('Crop Library seed error:', err);
  }
};

export const seedInputsInventory = async () => {
  try {
    const existing = await db.getAll('inputs_inventory');
    
    console.log(`🔄 Aggressive Sync: Cleaning ${existing?.length} input records...`);
    let syncCount = 0;

    for (const seedItem of SEED_INPUTS) {
      // Find all possible matches (new key 'product_name' or legacy key 'name')
      const matches = existing?.filter(i => (i.product_name === seedItem.product_name) || (i.name === seedItem.product_name)) || [];
      
      if (matches.length > 0) {
        // UPDATE the first match
        await db.update('inputs_inventory', matches[0].input_id, seedItem);
        
        // DELETE all other duplicates
        for (let i = 1; i < matches.length; i++) {
          try { await db.delete('inputs_inventory', matches[i].input_id); } catch(e) { console.warn('Could not delete redundant input:', matches[i].input_id); }
        }
        syncCount++;
      } else {
        // INSERT if completely missing
        await db.insert('inputs_inventory', seedItem);
        syncCount++;
      }
    }

    // Cleanup phase: Find anything that looks like a legacy seed item but wasn't caught
    const freshData = await db.getAll('inputs_inventory');
    for (const item of freshData) {
        if (item.name && !item.product_name) {
            // It has the old key. If we already have a 'product_name' version, delete this one.
            const hasCorrectedVersion = freshData.find(f => f.product_name === item.name);
            if (hasCorrectedVersion) {
                try { await db.delete('inputs_inventory', item.input_id); } catch(e) {}
            }
        }
    }

    console.log(`✅ Inputs Inventory synchronized and deduplicated (${syncCount} unique records active).`);
  } catch (err) {
    console.error('Inputs Inventory seed error:', err);
  }
};

export { CROPS, SEED_INPUTS };
