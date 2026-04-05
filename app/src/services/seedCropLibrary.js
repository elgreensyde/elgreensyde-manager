// Seed Crop Library — All 20 Elgreensyde crops from Doc2
// Auto-seeds on first load if crop_library is empty
import db from './db';

const CROPS = [
  {
    common_name: 'Parsley', scientific_name: 'Petroselinum crispum', family: 'Apiaceae', category: 'Herb',
    default_prop_method: 'Seed', growth_type: 'Cut and come again', format: 'Both',
    varieties: ['Curly Parsley', 'Italian Flat-Leaf'],
    stages: [
      { name: 'Seedling', days: '0-21', risk: 'Edema from fog on leaf undersides' },
      { name: 'Vegetative Expansion', days: '22-60', risk: 'High humidity fungal pressure' },
      { name: 'Harvest Stage', days: '60+', risk: 'Nitrogen leaching in heavy rain' }
    ],
    days_to_maturity: 75, rooting_or_germ_days: 21, avg_nursery_days: 21,
    days_to_first_harvest: 60, harvest_interval_days: 14, plot_lifespan_days: 365, resting_days: 14,
    harvest_window_days: 14,
    pot_diameter_cm: 25, pot_depth_cm: 20, pot_material: 'Terracotta or UV-treated HDPE',
    soil_mix: { type: 'Mix A', components: '40-50% clay, 30% CRH, 15% cow manure, 15-20% vermicast' },
    cow_manure_excluded: false,
    fertilizer_schedule: [
      { stage: 'Establishment', product: 'Complete 14-14-14', rate: '5g per pot', frequency: 'Once at transplant' },
      { stage: 'Vegetative - Dry', product: 'Urea 46-0-0', rate: '5g/L, 150ml per pot', frequency: 'Every 14 days' },
      { stage: 'Vegetative - Rainy', product: 'Urea 46-0-0', rate: '2.5g/L', frequency: 'Every 7 days' }
    ],
    pest_records: [
      { pest: 'Aphids', appearance: 'Green pear-shaped clusters', damage: 'Leaf curling, honeydew', neem_rate: '5ml/L', season: 'Rainy season' },
      { pest: 'Spider Mites', appearance: 'Microscopic red/brown', damage: 'Yellow stippling, webbing', neem_rate: '5ml/L', season: 'Dec-May dry' },
      { pest: 'Leafminers', appearance: 'Small yellow-black flies', damage: 'White serpentine tunnels', neem_rate: '5ml/L', season: 'Both' }
    ],
    disease_records: [
      { disease: 'Botrytis Blight', pathogen: 'Botrytis cinerea', symptoms: 'Water-soaked brown lesions', trigger: 'Humidity >90%, 18-22°C', treatment: 'K-Bicarb 5g/L preventive every 7 days' },
      { disease: 'Septoria Leaf Spot', pathogen: 'Septoria petroselini', symptoms: 'Small sunken tan spots', trigger: 'Rain splash', treatment: 'K-Bicarb 5g/L preventive' }
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
      { name: 'Establishment', days: '0-25', risk: 'Roots must not dry — cellular collapse' },
      { name: 'Vegetative', days: '25-70', risk: 'Dense canopy traps moisture — fungal rot' },
      { name: 'Reproductive - Prevent', days: 'Ongoing', risk: 'Continuous harvesting prevents flowering' }
    ],
    days_to_maturity: 60, rooting_or_germ_days: 10, avg_nursery_days: 25,
    days_to_first_harvest: 45, harvest_interval_days: 15, plot_lifespan_days: 365, resting_days: 0,
    harvest_window_days: 15,
    pot_diameter_cm: 30, pot_depth_cm: 15, pot_material: 'Plastic or terracotta',
    soil_mix: { type: 'Mix A variant', components: '40% clay, 20% CRH, 20% vermicast, 20% cow manure' },
    cow_manure_excluded: false,
    fertilizer_schedule: [
      { stage: 'Establishment', product: 'Complete 14-14-14', rate: '10g per pot', frequency: '14 days after transplant' },
      { stage: 'Active Growth', product: 'Urea 46-0-0', rate: '5g/L, 200ml per pot', frequency: 'Every 10 days' },
      { stage: 'Post-Harvest', product: 'Vermicast Tea', rate: '100ml/L', frequency: 'After aggressive cutting' }
    ],
    pest_records: [
      { pest: 'Flea Beetles', appearance: 'Tiny metallic black beetles', damage: 'Shot-holes', neem_rate: '5ml/L', season: 'Both' },
      { pest: 'Spider Mites', appearance: 'Microscopic red/brown', damage: 'Webbing and stippling', neem_rate: '5ml/L', season: 'Dec-May' }
    ],
    disease_records: [
      { disease: 'Mint Rust', pathogen: 'Puccinia menthae', symptoms: 'Orange/rust pustules on undersides', trigger: '18-20°C + moisture', treatment: 'Remove and destroy — K-Bicarb ineffective against rust' },
      { disease: 'Powdery Mildew', pathogen: 'Erysiphe cichoracearum', symptoms: 'White powder on upper leaf', trigger: 'High humidity, low rainfall', treatment: 'K-Bicarb 10g/L contact eradicant' }
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
      { name: 'Establishment', days: '0-25', risk: 'Same as Peppermint' },
      { name: 'Vegetative', days: '25-70', risk: 'Dense canopy moisture trap' },
      { name: 'Reproductive - Prevent', days: 'Ongoing', risk: 'Harvest to prevent flowering' }
    ],
    days_to_maturity: 60, rooting_or_germ_days: 10, avg_nursery_days: 25,
    days_to_first_harvest: 45, harvest_interval_days: 15, plot_lifespan_days: 365, resting_days: 0,
    harvest_window_days: 15,
    pot_diameter_cm: 30, pot_depth_cm: 15, pot_material: 'Plastic or terracotta',
    soil_mix: { type: 'Mix A variant', components: '40% clay, 20% CRH, 20% vermicast, 20% cow manure' },
    cow_manure_excluded: false,
    fertilizer_schedule: [
      { stage: 'Establishment', product: 'Complete 14-14-14', rate: '10g per pot', frequency: '14 days after transplant' },
      { stage: 'Active Growth', product: 'Urea 46-0-0', rate: '5g/L, 200ml per pot', frequency: 'Every 10 days' }
    ],
    pest_records: [
      { pest: 'Flea Beetles', appearance: 'Tiny metallic black', damage: 'Shot-holes', neem_rate: '5ml/L', season: 'Both' },
      { pest: 'Spider Mites', appearance: 'Microscopic', damage: 'Stippling, webbing', neem_rate: '5ml/L', season: 'Dec-May' }
    ],
    disease_records: [
      { disease: 'Mint Rust', pathogen: 'Puccinia menthae', symptoms: 'Orange pustules on undersides', trigger: '18-20°C nights + moisture', treatment: 'Remove and destroy' },
      { disease: 'Powdery Mildew', pathogen: 'Erysiphe cichoracearum', symptoms: 'White powder spots', trigger: 'High humidity', treatment: 'K-Bicarb 10g/L' }
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
      { name: 'Root Establishment', days: '0-40', risk: 'HIGHEST RISK — one overwatering event can be fatal' },
      { name: 'Vegetative Development', days: '40-120', risk: 'Drainage vigilance required' },
      { name: 'Maturity', days: '120+', risk: 'Long-lived if drainage maintained' }
    ],
    days_to_maturity: 120, rooting_or_germ_days: 15, avg_nursery_days: 40,
    days_to_first_harvest: 90, harvest_interval_days: 30, plot_lifespan_days: 1095, resting_days: 0,
    harvest_window_days: 30,
    pot_diameter_cm: 25, pot_depth_cm: 30, pot_material: 'Unsealed terracotta mandatory',
    soil_mix: { type: 'Mix B', components: '30% clay, 40% CRH, 20% coarse river sand, 10% vermicast. Cow manure 0%.' },
    cow_manure_excluded: true,
    fertilizer_schedule: [
      { stage: 'Establishment', product: 'Complete 14-14-14', rate: '5g per pot', frequency: 'Once at planting' },
      { stage: 'Vegetative', product: 'Urea 46-0-0', rate: '2.5g/L', frequency: 'Every 30 days — stop in rainy season' }
    ],
    pest_records: [
      { pest: 'Spittlebugs', appearance: 'Frothy spit-like masses', damage: 'Sap extraction, stunting', neem_rate: '5ml/L', season: 'Both' },
      { pest: 'Thrips', appearance: 'Tiny slender insects', damage: 'Silvery stippling', neem_rate: '5ml/L', season: 'Both' }
    ],
    disease_records: [
      { disease: 'Phytophthora Root Rot', pathogen: 'Phytophthora spp.', symptoms: 'Sudden wilt despite wet soil, dark mushy roots', trigger: 'Poor drainage + June-Nov rains', treatment: 'NO CURE — destroy plant and substrate immediately' }
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
      { name: 'Establishment', days: '0-30', risk: 'Overwatering — drainage must be immediate' },
      { name: 'Vegetative', days: '30-90', risk: 'Dense foliage + fog = fungal die-off from center' },
      { name: 'Maturity', days: '90+', risk: 'Cutting into woody base kills plant' }
    ],
    days_to_maturity: 90, rooting_or_germ_days: 14, avg_nursery_days: 30,
    days_to_first_harvest: 60, harvest_interval_days: 21, plot_lifespan_days: 1095, resting_days: 0,
    harvest_window_days: 21,
    pot_diameter_cm: 20, pot_depth_cm: 20, pot_material: 'Unsealed terracotta',
    soil_mix: { type: 'Mix B', components: '30% clay, 40% CRH, 20% coarse river sand, 10% vermicast. Cow manure 0%.' },
    cow_manure_excluded: true,
    fertilizer_schedule: [
      { stage: 'Establishment', product: 'Complete 14-14-14', rate: '2-3g per pot', frequency: 'Once at planting' },
      { stage: 'Maintenance', product: 'Vermicast top-dressing', rate: '1 handful', frequency: 'Every 45 days' }
    ],
    pest_records: [
      { pest: 'Spider Mites', appearance: 'Microscopic', damage: 'Stippling, webbing', neem_rate: '5ml/L', season: 'Dec-May' },
      { pest: 'Aphids', appearance: 'Small green/black clusters', damage: 'Curled leaves, sticky residue', neem_rate: '5ml/L', season: 'Rainy' }
    ],
    disease_records: [
      { disease: 'Phytophthora Root Rot', pathogen: 'Phytophthora spp.', symptoms: 'Sudden wilt, black roots', trigger: 'Poor drainage', treatment: 'NO CURE — destroy' },
      { disease: 'Botrytis Blight', pathogen: 'Botrytis cinerea', symptoms: 'Gray fuzzy growth on inner stems', trigger: 'Cool nights, fog', treatment: 'K-Bicarb 5g/L every 7-10 days' }
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
      { name: 'Root Establishment', days: '0-40', risk: 'CRITICAL — single overwatering = death' },
      { name: 'Vegetative', days: '40-120', risk: 'Any moisture accumulation is fatal' },
      { name: 'Harvest Stage', days: '120+', risk: 'Monsoon requires complete overhead protection' }
    ],
    days_to_maturity: 120, rooting_or_germ_days: 15, avg_nursery_days: 40,
    days_to_first_harvest: 120, harvest_interval_days: 30, plot_lifespan_days: 730, resting_days: 0,
    harvest_window_days: 30,
    pot_diameter_cm: 25, pot_depth_cm: 30, pot_material: 'Unsealed terracotta mandatory',
    soil_mix: { type: 'Mix B', components: 'Same as Rosemary. Cow manure 0%.' },
    cow_manure_excluded: true,
    fertilizer_schedule: [
      { stage: 'Establishment', product: 'Complete 14-14-14', rate: '5g per pot', frequency: 'Once at planting' },
      { stage: 'Vegetative - Dry Only', product: 'Urea 46-0-0', rate: '2.5g/L', frequency: 'Every 30 days — stop in rainy season' }
    ],
    pest_records: [], disease_records: [
      { disease: 'Phytophthora Root Rot', pathogen: 'Phytophthora spp.', symptoms: 'Same as Rosemary', trigger: 'Any overwatering', treatment: 'NO CURE' }
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
      { name: 'Seedling/Cuttings', days: '0-30', risk: 'Damping off if waterlogged' },
      { name: 'Vegetative', days: '30-80', risk: 'Prevent flowering — harvest before buds open' },
      { name: 'Reproductive - Prevent', days: 'Ongoing', risk: 'Flowering = sweetness decline' }
    ],
    days_to_maturity: 80, rooting_or_germ_days: 14, avg_nursery_days: 30,
    days_to_first_harvest: 30, harvest_interval_days: 30, plot_lifespan_days: 365, resting_days: 14,
    harvest_window_days: 30,
    pot_diameter_cm: 20, pot_depth_cm: 20, pot_material: 'Plastic or terracotta',
    soil_mix: { type: 'Mix A variant', components: '40% clay, 30% CRH, 20% vermicast, 10% cow manure' },
    cow_manure_excluded: false,
    fertilizer_schedule: [
      { stage: 'Establishment', product: 'Complete 14-14-14', rate: '5g per pot', frequency: 'Once' },
      { stage: 'Maintenance', product: 'Vermicast Tea', rate: '100ml/L', frequency: 'Every 14 days' }
    ],
    pest_records: [
      { pest: 'Whiteflies', appearance: 'Tiny white moths', damage: 'Yellowing from sap extraction', neem_rate: '5ml/L', season: 'Both' },
      { pest: 'Cutworms', appearance: 'Fleshy caterpillars', damage: 'Sever stems at night', neem_rate: '5ml/L preventive', season: 'Both' }
    ],
    disease_records: [
      { disease: 'Septoria Leaf Spot', pathogen: 'Septoria steviae', symptoms: 'Dark angular lesions on lower foliage', trigger: 'High humidity', treatment: 'K-Bicarb 5g/L every 10 days' },
      { disease: 'White Mold', pathogen: 'Sclerotinia sclerotiorum', symptoms: 'White cottony growth at stem base', trigger: 'High humidity', treatment: 'Remove and destroy' }
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
      { name: 'Seedling', days: '0-14', risk: 'Damping-off in cold wet soils' },
      { name: 'Vegetative', days: '15-40', risk: 'Aphids, leafminers, downy mildew' },
      { name: 'Reproductive - Prevent', days: '40+', risk: 'Pinch flowers immediately' }
    ],
    days_to_maturity: 50, rooting_or_germ_days: 7, avg_nursery_days: 14,
    days_to_first_harvest: 35, harvest_interval_days: 7, plot_lifespan_days: 80, resting_days: 14,
    harvest_window_days: 10, spacing_cm: '25x30cm', plants_per_sqm: 13, min_bed_depth_cm: 25, mound_height_cm: 30,
    pot_diameter_cm: 20, pot_depth_cm: null, pot_material: null,
    soil_mix: { type: 'Mix E (bed) / Mix A (pot)', components: 'Bed: 50% clay, 20% CRH, 15% cow manure, 15% vermicast. Pot: Mix A.' },
    cow_manure_excluded: false, rotation_family: 'Lamiaceae',
    avoid_after: ['Lamiaceae'], recommended_after: ['Legumes', 'Alliums'],
    fertilizer_schedule: [
      { stage: 'Basal', product: 'Complete 14-14-14', rate: '50g/sqm (bed) or 5g/pot', frequency: '7 days before transplant' },
      { stage: 'Vegetative', product: 'Urea 46-0-0', rate: '5g/L', frequency: 'Every 10-14 days' },
      { stage: 'Rainy Season', product: 'Urea 46-0-0', rate: '2.5g/L', frequency: 'Every 7 days — split applications' }
    ],
    pest_records: [
      { pest: 'Leafminers', appearance: 'Small yellow-black flies', damage: 'White serpentine tunnels', neem_rate: '5ml/L every 7 days', season: 'Both' },
      { pest: 'Flea Beetles', appearance: 'Tiny black jumping beetles', damage: 'Shot-holes', neem_rate: '5ml/L', season: 'Both' },
      { pest: 'Aphids', appearance: 'Green clusters on tips', damage: 'Honeydew, sooty mold', neem_rate: '5ml/L at dusk every 5 days', season: 'Rainy' }
    ],
    disease_records: [
      { disease: 'Basil Downy Mildew', pathogen: 'Peronospora belbahrii', symptoms: 'Diffuse yellowing upper, gray-purple fuzzy underside', trigger: 'High humidity + cool nights — near 100% loss in open beds', treatment: 'K-Bicarb 5g/L preventive every 5-7 days. Stage 2: systemic fungicide + K-Bicarb.' },
      { disease: 'Fusarium Wilt', pathogen: 'Fusarium oxysporum', symptoms: 'Sudden one-sided wilting, brown vascular', trigger: 'Soil-borne', treatment: 'NO CURE — remove plant. 3-year rotation away from Lamiaceae.' }
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
      { name: 'Seedling', days: '0-14', risk: 'Same as Sweet Basil' },
      { name: 'Vegetative', days: '15-40', risk: 'Highest sensitivity — burns fastest' },
      { name: 'Reproductive', days: '40+', risk: 'Bolts earliest of all basils' }
    ],
    days_to_maturity: 50, rooting_or_germ_days: 7, avg_nursery_days: 14,
    days_to_first_harvest: 35, harvest_interval_days: 7, plot_lifespan_days: 80, resting_days: 14,
    harvest_window_days: 10, spacing_cm: '25x30cm', plants_per_sqm: 13, min_bed_depth_cm: 25, mound_height_cm: 30,
    pot_diameter_cm: 20, soil_mix: { type: 'Mix E/A', components: 'Same as Sweet Basil' },
    cow_manure_excluded: false, rotation_family: 'Lamiaceae',
    avoid_after: ['Lamiaceae'], recommended_after: ['Legumes', 'Alliums'],
    fertilizer_schedule: [
      { stage: 'All stages', product: 'Urea 46-0-0', rate: '3g/L MAXIMUM — reduce all rates 30-40%', frequency: 'Same intervals as Sweet Basil' }
    ],
    pest_records: [
      { pest: 'Leafminers', appearance: 'Same as Sweet Basil', damage: 'Same', neem_rate: '5ml/L', season: 'Both' },
      { pest: 'Aphids', appearance: 'Same', damage: 'Same', neem_rate: '5ml/L', season: 'Rainy' }
    ],
    disease_records: [
      { disease: 'Basil Downy Mildew', pathogen: 'Peronospora belbahrii', symptoms: 'Same but progresses faster — 2-day window vs 4-day for Sweet', trigger: 'Same', treatment: 'Escalate faster' }
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
      { name: 'Seedling', days: '0-14', risk: 'Same as Sweet Basil' },
      { name: 'Vegetative', days: '15-40', risk: 'Most heat tolerant — lowest sensitivity' },
      { name: 'Reproductive', days: '40+', risk: 'Pinch flowers' }
    ],
    days_to_maturity: 50, rooting_or_germ_days: 7, avg_nursery_days: 14,
    days_to_first_harvest: 35, harvest_interval_days: 7, plot_lifespan_days: 80, resting_days: 14,
    harvest_window_days: 10, spacing_cm: '25x30cm', plants_per_sqm: 13, min_bed_depth_cm: 25, mound_height_cm: 30,
    pot_diameter_cm: 20, soil_mix: { type: 'Mix E/A', components: 'Same as Sweet Basil' },
    cow_manure_excluded: false, rotation_family: 'Lamiaceae',
    avoid_after: ['Lamiaceae'], recommended_after: ['Legumes', 'Alliums'],
    fertilizer_schedule: [
      { stage: 'All', product: 'Standard basil rates', rate: 'Standard rates apply', frequency: 'Same as Sweet Basil' }
    ],
    pest_records: [{ pest: 'Same as Sweet Basil', appearance: '', damage: '', neem_rate: '5ml/L', season: 'Both' }],
    disease_records: [
      { disease: 'Basil Downy Mildew', pathogen: 'Peronospora belbahrii', symptoms: 'Marginally higher resistance', trigger: 'Same', treatment: 'Standard rates apply' }
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
      { name: 'Seedling', days: '0-14', risk: 'Flea beetle damage devastating to young' },
      { name: 'Vegetative', days: '15-35', risk: 'Cabbage webworm boring into bud' },
      { name: 'Harvest Maturity', days: '30-45', risk: 'Do not over-mature — fibrous petioles' }
    ],
    days_to_maturity: 45, rooting_or_germ_days: 5, avg_nursery_days: 14,
    days_to_first_harvest: 30, harvest_interval_days: 0, plot_lifespan_days: 45, resting_days: 21,
    harvest_window_days: 15, spacing_cm: '15x20cm', plants_per_sqm: 30, min_bed_depth_cm: 20, mound_height_cm: 25,
    soil_mix: { type: 'Mix E', components: '50% clay, 20% CRH + 20% vermicast, 15% cow manure' },
    cow_manure_excluded: false, rotation_family: 'Brassicaceae',
    avoid_after: ['Brassicaceae'], recommended_after: ['Solanaceae', 'Alliums'],
    fertilizer_schedule: [
      { stage: 'Basal', product: 'Complete 14-14-14', rate: '50g/sqm', frequency: '3 days before transplant' },
      { stage: '1st Side-dress', product: 'Urea 46-0-0', rate: '5g/L', frequency: '14 DAT' },
      { stage: '2nd Side-dress', product: 'Urea 46-0-0', rate: '5g/L', frequency: '21 DAT' }
    ],
    pest_records: [
      { pest: 'Cabbage Webworm', appearance: 'Larvae under silken web', damage: 'Bores into apical bud', neem_rate: '5ml/L from 7 DAT into whorl', season: 'Both' },
      { pest: 'Flea Beetles', appearance: 'Tiny black jumping', damage: 'Shot-holes on seedlings', neem_rate: '5ml/L', season: 'Both' }
    ],
    disease_records: [
      { disease: 'Bacterial Soft Rot', pathogen: 'Erwinia carotovora', symptoms: 'Water-soaked lesions, collapse, foul odor', trigger: 'Waterlogged clay', treatment: 'NO CURE — maintain 25cm mounds' },
      { disease: 'Clubroot', pathogen: 'Plasmodiophora brassicae', symptoms: 'Swollen galled roots, daytime wilt', trigger: 'Soil-borne 10+ years', treatment: 'QUARANTINE BED. 100g lime/sqm.' }
    ],
    harvest_indicators: '30-45 days — before floral initiation', harvest_method: 'Sever at taproot base — single harvest',
    yield_per_sqm: '2.5-3.5 kg', postharvest_notes: 'Wash, refrigerate 4°C immediately. 2-3 day shelf life.',
    high_risk_flag: 'Clubroot is incurable and persists 10+ years. Quarantine bed if detected.', pesticide_free_required: false
  },
  {
    common_name: 'Pakchoi', scientific_name: 'Brassica rapa subsp. chinensis', family: 'Brassicaceae', category: 'Vegetable',
    default_prop_method: 'Seed', growth_type: 'Single harvest', format: 'Bulk grams',
    varieties: ['Pakchoi'], stages: [{ name: 'Same lifecycle as Pechay', days: '30-45', risk: 'Same risks' }],
    days_to_maturity: 45, rooting_or_germ_days: 5, avg_nursery_days: 14,
    days_to_first_harvest: 30, harvest_interval_days: 0, plot_lifespan_days: 45, resting_days: 21,
    harvest_window_days: 15, spacing_cm: '15x20cm', plants_per_sqm: 30, min_bed_depth_cm: 20, mound_height_cm: 25,
    soil_mix: { type: 'Mix E', components: 'Same as Pechay' }, cow_manure_excluded: false,
    rotation_family: 'Brassicaceae', avoid_after: ['Brassicaceae'], recommended_after: ['Solanaceae', 'Alliums'],
    fertilizer_schedule: [{ stage: 'Same as Pechay', product: 'Same', rate: 'Same', frequency: 'Same' }],
    pest_records: [{ pest: 'Same as Pechay', appearance: '', damage: '', neem_rate: '5ml/L', season: 'Both' }],
    disease_records: [{ disease: 'Same as Pechay', pathogen: '', symptoms: '', trigger: '', treatment: '' }],
    harvest_indicators: 'Same as Pechay', harvest_method: 'Same', yield_per_sqm: '2.5-3.5 kg',
    postharvest_notes: 'Same as Pechay.', high_risk_flag: 'Same Clubroot risk.', pesticide_free_required: false
  },
  {
    common_name: 'Mustasa', scientific_name: 'Brassica juncea', family: 'Brassicaceae', category: 'Vegetable',
    default_prop_method: 'Seed', growth_type: 'Single harvest', format: 'Bulk grams',
    varieties: ['Mustasa'], stages: [{ name: 'Same lifecycle as Pechay', days: '30-45', risk: 'Same risks' }],
    days_to_maturity: 45, rooting_or_germ_days: 5, avg_nursery_days: 14,
    days_to_first_harvest: 30, harvest_interval_days: 0, plot_lifespan_days: 45, resting_days: 21,
    harvest_window_days: 15, spacing_cm: '15x20cm', plants_per_sqm: 30, min_bed_depth_cm: 20, mound_height_cm: 25,
    soil_mix: { type: 'Mix E', components: 'Same as Pechay' }, cow_manure_excluded: false,
    rotation_family: 'Brassicaceae', avoid_after: ['Brassicaceae'], recommended_after: ['Solanaceae', 'Alliums'],
    fertilizer_schedule: [{ stage: 'Same as Pechay', product: 'Same', rate: 'Same', frequency: 'Same' }],
    pest_records: [{ pest: 'Same as Pechay', appearance: '', damage: '', neem_rate: '5ml/L', season: 'Both' }],
    disease_records: [{ disease: 'Same as Pechay', pathogen: '', symptoms: '', trigger: '', treatment: '' }],
    harvest_indicators: 'Same', harvest_method: 'Same', yield_per_sqm: '2.5-3.5 kg',
    postharvest_notes: 'Same.', pesticide_free_required: false
  },
  {
    common_name: 'Strawberry', scientific_name: 'Fragaria × ananassa', family: 'Rosaceae', category: 'Vegetable',
    default_prop_method: 'Division', growth_type: 'Perennial', format: 'Units',
    varieties: ['Sweet Charlie', 'Festival', 'Honeoye', 'San Andreas'],
    stages: [
      { name: 'Establishment', days: '0-30', risk: 'Root sensitivity to heavy clay' },
      { name: 'Vegetative', days: '30-60', risk: 'Day-night temp differential maximizes storage' },
      { name: 'Flowering & Fruiting', days: '60+', risk: 'Botrytis from humidity is primary loss risk' }
    ],
    days_to_maturity: 60, rooting_or_germ_days: 14, avg_nursery_days: 30,
    days_to_first_harvest: 60, harvest_interval_days: 3, plot_lifespan_days: 120, resting_days: 30,
    harvest_window_days: 120,
    pot_diameter_cm: 20, pot_depth_cm: 20, pot_material: 'Individual pots or substrate troughs',
    soil_mix: { type: 'Mix D', components: '30% clay, 40% CRH, 10% raw rice hull, 20% vermicast' },
    cow_manure_excluded: false,
    fertilizer_schedule: [
      { stage: 'Vegetative', product: 'Complete 14-14-14', rate: '5g per pot', frequency: 'Once at planting' },
      { stage: 'Fruiting', product: 'Vermicast Tea', rate: '100ml/L', frequency: 'Every 10 days — potassium drives fruit' },
      { stage: 'During Flowering', product: 'Urea 46-0-0', rate: 'AVOID', frequency: 'High N = soft watery berries' }
    ],
    pest_records: [
      { pest: 'Two-Spotted Spider Mites', appearance: 'Microscopic + webbing', damage: 'Bronzing, stippling', neem_rate: '5ml/L — STOP 7-10 days before fruit color', season: 'Dec-May' },
      { pest: 'Thrips', appearance: 'Microscopic slender', damage: 'Bronze cracked fruit', neem_rate: '5ml/L — STOP before color', season: 'Both' }
    ],
    disease_records: [
      { disease: 'Anthracnose', pathogen: 'Colletotrichum spp.', symptoms: 'Sunken dark lesions on fruit', trigger: 'Humid rainy season', treatment: 'K-Bicarb 5g/L preventive only — remove infected berries' },
      { disease: 'Botrytis Fruit Rot', pathogen: 'Botrytis cinerea', symptoms: 'Gray fuzz on berries', trigger: 'Rainy season humidity — catastrophic risk', treatment: 'K-Bicarb 5g/L preventive. Elevate pots. No overhead water.' }
    ],
    harvest_indicators: '75-100% red coloration', harvest_method: 'Pinch and snap stem 1cm above calyx — never pull directly',
    yield_per_pot: '200-400g per plant per season', postharvest_notes: 'Cool to 2°C MANDATORY.',
    high_risk_flag: 'Rainy season: Botrytis = near-total fruit loss. Covered production required. Neem alters flavor on fruit.', pesticide_free_required: false
  },
  {
    common_name: 'Sweet William', scientific_name: 'Dianthus barbatus', family: 'Caryophyllaceae', category: 'Edible Flower',
    default_prop_method: 'Seed', growth_type: 'Annual', format: 'Units',
    varieties: ['Sweet William'],
    stages: [
      { name: 'Vegetative', days: '0-40', risk: 'Botrytis from humidity' },
      { name: 'Floral Initiation', days: '40-60', risk: 'N excess = no flowers' },
      { name: 'Continuous Blooming', days: '60+', risk: 'Rain bruises petals' }
    ],
    days_to_maturity: 70, rooting_or_germ_days: 10, avg_nursery_days: 30,
    days_to_first_harvest: 70, harvest_interval_days: 14, plot_lifespan_days: 180, resting_days: 0,
    harvest_window_days: 21,
    pot_diameter_cm: 20, soil_mix: { type: 'Mix C', components: '40% clay, 30% CRH, 30% vermicast' },
    cow_manure_excluded: false,
    fertilizer_schedule: [
      { stage: 'Establishment', product: 'Complete 14-14-14', rate: '10g per pot', frequency: 'Once' },
      { stage: 'Vegetative Only', product: 'Urea 46-0-0', rate: '2.5g/L first 40 days ONLY', frequency: 'STOP when buds appear' }
    ],
    pest_records: [{ pest: 'Thrips', appearance: 'In flower heads', damage: 'Brown streaks on petals', neem_rate: 'Veg structure ONLY — NEVER blooms', season: 'Both' }],
    disease_records: [{ disease: 'Botrytis Blight', pathogen: 'Botrytis cinerea', symptoms: 'Water-soaked spots → gray mold', trigger: 'Persistent rain, fog', treatment: 'K-Bicarb foliage ONLY. Any bloom with Botrytis = UNSAFE for consumption.' }],
    harvest_indicators: 'Outer 15-20% florets open. 5-8 stems per pot per cycle.',
    harvest_method: 'Cut stem deep into foliage for second flush', edible_parts: 'Petals only — calyx and white base are bitter',
    yield_per_pot: '5-8 stems per cycle', postharvest_notes: 'Ethylene-sensitive. Keep away from ripening fruit. Rigid clamshells at 4°C. 4-10 day shelf life.',
    high_risk_flag: 'Covered production REQUIRED for edible-grade during monsoon.', pesticide_free_required: true
  },
  {
    common_name: 'French Marigold', scientific_name: 'Tagetes patula', family: 'Asteraceae', category: 'Edible Flower',
    default_prop_method: 'Seed', growth_type: 'Annual', format: 'Units',
    varieties: ['French Marigold'],
    stages: [
      { name: 'Vegetative', days: '0-40', risk: 'Standard' },
      { name: 'Floral', days: '40-60', risk: 'N excess = blind growth' },
      { name: 'Blooming', days: '60+', risk: 'Deadhead to prolong' }
    ],
    days_to_maturity: 60, rooting_or_germ_days: 7, avg_nursery_days: 21,
    days_to_first_harvest: 60, harvest_interval_days: 7, plot_lifespan_days: 150, resting_days: 0,
    harvest_window_days: 30,
    pot_diameter_cm: 20, soil_mix: { type: 'Mix C variant', components: 'Tolerates poorer soil — reduce vermicast to 20%, add 10% sand' },
    cow_manure_excluded: false,
    fertilizer_schedule: [
      { stage: 'Establishment', product: 'Complete 14-14-14', rate: '10g per pot', frequency: 'Once' },
      { stage: 'Maintenance', product: 'Vermicast top-dressing', rate: '1 handful', frequency: 'Every 30 days' }
    ],
    pest_records: [{ pest: 'Thrips', appearance: 'In flower heads', damage: 'Petal scarring', neem_rate: 'Veg ONLY — never blooms', season: 'Both' }],
    disease_records: [{ disease: 'Botrytis Blight', pathogen: 'Botrytis cinerea', symptoms: 'Gray mold on petals', trigger: 'Rain, fog', treatment: 'K-Bicarb foliage only. Infected blooms UNSAFE.' }],
    harvest_indicators: 'Pluck individual petals only — calyx is bitter',
    harvest_method: 'Regular deadheading prolongs bloom', edible_parts: 'Petals only', yield_per_pot: 'Continuous',
    postharvest_notes: 'Rigid clamshells with damp paper towels at 4°C. 2-4 day shelf life.',
    high_risk_flag: 'Strong pest-repellent properties.', pesticide_free_required: true
  },
  {
    common_name: 'Torenia', scientific_name: 'Torenia fournieri', family: 'Linderniaceae', category: 'Edible Flower',
    default_prop_method: 'Seed', growth_type: 'Annual', format: 'Units',
    varieties: ['Torenia'],
    stages: [
      { name: 'Vegetative', days: '0-40', risk: 'Keep consistently moist' },
      { name: 'Floral', days: '40-60', risk: 'Needs partial shade' },
      { name: 'Blooming', days: '60+', risk: 'Performs through overcast rainy season' }
    ],
    days_to_maturity: 60, rooting_or_germ_days: 10, avg_nursery_days: 30,
    days_to_first_harvest: 60, harvest_interval_days: 7, plot_lifespan_days: 150, resting_days: 0,
    harvest_window_days: 30,
    pot_diameter_cm: 20, soil_mix: { type: 'Mix C variant', components: 'Increase vermicast to 35% for moisture retention' },
    cow_manure_excluded: false,
    fertilizer_schedule: [
      { stage: 'Establishment', product: 'Complete 14-14-14', rate: '10g per pot', frequency: 'Once' },
      { stage: 'Maintenance', product: 'Vermicast top-dressing', rate: '1 handful', frequency: 'Every 30 days' }
    ],
    pest_records: [], disease_records: [{ disease: 'Botrytis Blight', pathogen: 'Botrytis cinerea', symptoms: 'Gray mold', trigger: 'Humidity', treatment: 'K-Bicarb foliage only' }],
    harvest_indicators: 'Harvest in morning', harvest_method: 'Whole flower edible — harvest as they open',
    edible_parts: 'Whole flower', yield_per_pot: 'Continuous',
    postharvest_notes: 'Shade-tolerant — produces through overcast season.', high_risk_flag: null, pesticide_free_required: true
  },
  {
    common_name: 'Blue Ternate', scientific_name: 'Clitoria ternatea', family: 'Fabaceae', category: 'Edible Flower',
    default_prop_method: 'Seed', growth_type: 'Perennial', format: 'Units',
    varieties: ['Blue Ternate / Butterfly Pea'],
    stages: [
      { name: 'Vegetative', days: '0-40', risk: 'Needs immediate trellising' },
      { name: 'Floral', days: '40-60', risk: 'N excess = all foliage no flowers' },
      { name: 'Blooming', days: '60+', risk: 'Perennial continuous production' }
    ],
    days_to_maturity: 60, rooting_or_germ_days: 7, avg_nursery_days: 21,
    days_to_first_harvest: 60, harvest_interval_days: 1, plot_lifespan_days: 730, resting_days: 0,
    harvest_window_days: 365,
    pot_diameter_cm: 20, soil_mix: { type: 'Mix A', components: 'Standard — fixes own nitrogen' },
    cow_manure_excluded: false,
    fertilizer_schedule: [
      { stage: 'Establishment', product: 'Complete 14-14-14', rate: '10g per pot', frequency: 'Once' },
      { stage: 'All stages', product: 'Urea 46-0-0', rate: 'AVOID entirely — fixes own nitrogen', frequency: 'Never' }
    ],
    pest_records: [{ pest: 'Scale Insects', appearance: 'Armored bumps on stems', damage: 'Sap loss, stunting', neem_rate: '5ml/L on stems only', season: 'Both' }],
    disease_records: [],
    harvest_indicators: 'Harvest individual flowers as they open', harvest_method: 'Whole flower edible',
    edible_parts: 'Whole flower', yield_per_pot: 'Continuous — perennial',
    postharvest_notes: 'High CDO cafe market demand for color-changing teas.',
    high_risk_flag: 'Fixes own atmospheric nitrogen — urea causes all-foliage no-flower.', pesticide_free_required: true
  },
  {
    common_name: 'Globe Amaranth', scientific_name: 'Gomphrena globosa', family: 'Amaranthaceae', category: 'Edible Flower',
    default_prop_method: 'Seed', growth_type: 'Annual', format: 'Units',
    varieties: ['Globe Amaranth'],
    stages: [
      { name: 'Vegetative', days: '0-40', risk: 'Standard' },
      { name: 'Floral', days: '40-60', risk: 'Standard' },
      { name: 'Blooming', days: '60+', risk: 'Drought tolerant — performs through dry season' }
    ],
    days_to_maturity: 60, rooting_or_germ_days: 10, avg_nursery_days: 21,
    days_to_first_harvest: 60, harvest_interval_days: 7, plot_lifespan_days: 150, resting_days: 0,
    harvest_window_days: 60,
    pot_diameter_cm: 20, soil_mix: { type: 'Mix C variant', components: 'Tolerates poorer soil — reduce vermicast to 20%, add 10% sand' },
    cow_manure_excluded: false,
    fertilizer_schedule: [
      { stage: 'Establishment', product: 'Complete 14-14-14', rate: '10g per pot', frequency: 'Once' },
      { stage: 'Maintenance', product: 'Vermicast top-dressing', rate: '1 handful', frequency: 'Every 30 days' }
    ],
    pest_records: [{ pest: 'Scale Insects', appearance: 'Armored bumps', damage: 'Sap loss', neem_rate: '5ml/L stems only', season: 'Both' }],
    disease_records: [{ disease: 'White Mold', pathogen: 'Sclerotinia sclerotiorum', symptoms: 'White cottony growth', trigger: 'High humidity', treatment: 'Remove and destroy' }],
    harvest_indicators: 'Whole clover-like bract edible', harvest_method: 'Harvest whole globes',
    edible_parts: 'Whole bract', yield_per_pot: 'Continuous',
    postharvest_notes: 'Drought tolerant. Performs through dry season when others need more water.',
    high_risk_flag: null, pesticide_free_required: true
  }
];

const SEED_INPUTS = [
  { product_name: 'Neem Oil', type: 'Organic Pesticide', active_ingredient: 'Azadirachtin', mix_rate: '5ml per 1 liter water', current_stock: 500, stock_unit: 'ml', low_stock_threshold: 100, withholding_days: 3, notes: 'Always combine with insecticidal soap. Apply at dusk. Never spray on edible flower blooms.' },
  { product_name: 'Insecticidal Soap', type: 'Organic Pesticide', active_ingredient: 'Potassium salts of fatty acids', mix_rate: '5ml per 1 liter water', current_stock: 500, stock_unit: 'ml', low_stock_threshold: 100, withholding_days: 3, notes: 'Combine with neem oil. Surfactant on waxy leaves (Rosemary, Thyme).' },
  { product_name: 'Potassium Bicarbonate', type: 'Fungicide', active_ingredient: 'KHCO3', mix_rate: '4g (1 tsp) per 1 liter water', current_stock: 500, stock_unit: 'grams', low_stock_threshold: 100, withholding_days: 0, notes: 'Contact eradicant for powdery/white molds. Preventive for downy mildew. Never on edible flower blooms — white residue.' },
  { product_name: 'Urea (46-0-0)', type: 'Fertilizer', active_ingredient: 'Urea', mix_rate: '5g per 1 liter water (2.5g rainy season)', current_stock: 2000, stock_unit: 'grams', low_stock_threshold: 500, withholding_days: 0, notes: 'Pure nitrogen. Reduce to 3g/L for Lemon Basil. Stop 1 week before harvest. Avoid on Thyme/Rosemary/Tarragon.' },
  { product_name: 'Complete Fertilizer (14-14-14)', type: 'Fertilizer', active_ingredient: 'NPK 14-14-14', mix_rate: '1 cup per 16 liters (≈60g/16L)', current_stock: 5000, stock_unit: 'grams', low_stock_threshold: 1000, withholding_days: 0, notes: 'Balanced NPK. Sub-surface banding more effective in clay soil.' }
];

export async function seedCropLibrary() {
  try {
    const existing = await db.getAll('crops');
    // Check if the Doc2 crops are already seeded by looking for a distinctive crop name
    const hasDoc2Crops = existing?.some(c => c.common_name === 'Sweet Basil' && c.scientific_name);
    if (hasDoc2Crops) {
      console.log('✅ Crop Library already seeded with Doc2 data');
      return;
    }
    // Delete old simplified seed crops (v2 data without scientific names)
    if (existing && existing.length > 0) {
      for (const c of existing) {
        await db.delete('crops', c.id);
      }
    }
    await db.insertMany('crops', CROPS);
    console.log('✅ Crop Library seeded: 20 crops from Doc2');
  } catch (err) {
    console.error('Crop Library seed error:', err);
  }
}

export async function seedInputsInventory() {
  try {
    const existing = await db.getAll('inputs_inventory');
    if (!existing || existing.length === 0) {
      await db.insertMany('inputs_inventory', SEED_INPUTS);
      console.log('✅ Inputs Inventory seeded: 5 confirmed products');
    }
  } catch (err) {
    console.error('Inputs Inventory seed error:', err);
  }
}

export { CROPS, SEED_INPUTS };
