import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'] || env['VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: existing, error: loadErr } = await supabase.from('crops').select('*').eq('common_name', 'Sweet Basil').single();

  const basilData = {
    common_name: 'Sweet Basil',
    family: 'Lamiaceae',
    category: 'Herb',
    days_to_maturity: 21, 
    harvest_method: 'Mechanized straddle-harvesting jig, rigidly set to 4-6 inches above soil (leave 2-4 true leaves).',
    postharvest_notes: 'Highly susceptible to chilling injury. Cool immediately to 12-15°C (53-59°F). DO NOT refrigerate below 10°C (causes irreversible blackening). Store in micro-perforated bags with >95% humidity.',
    spacing_cm: '6-inch grid inside rows (12 inches between rows).',
    pot_diameter_cm: 10,
    fertilizer_schedule: [
      { stage: 'Pre-Plant', product: '10-10-10 Dry NPK', rate: '120-120-120 lbs/acre', frequency: 'Once' },
      { stage: 'Sidedressing', product: 'Liquid Nitrogen / Organics', rate: '15-30 lbs N/acre', frequency: 'Every 14-21 days (Post-harvest)' }
    ],
    pest_records: [
      { pest: 'Aphids', damage: 'Honeydew, foliar distortion, sooty mold.', neem_rate: 'Cull trap crop', season: 'Warm/Humid' },
      { pest: 'Whiteflies', damage: 'Viral vector, sap-sucking.', neem_rate: 'Edible Nasturtiums trap crop border', season: 'Warm/Humid' },
      { pest: 'Root-Knot Nematodes', damage: 'Root galling, severe stunting and wilting.', neem_rate: 'French Marigolds (alpha-terthienyl root exudate)', season: 'All' }
    ],
    disease_records: [
      { disease: 'Basil Downy Mildew (BDM)', pathogen: 'Peronospora belbahrii', symptoms: 'Grey fuzz on leaf undersides, yellowing.', trigger: '>85% RH and 15-25°C', treatment: 'Copper Fungicide Drench, wide spacing, no overhead irrigation.' },
      { disease: 'Bacterial Leaf Spot', pathogen: 'Pseudomonas cichorii', symptoms: 'Water-soaked spots turning black/brown.', trigger: 'Monsoon rains, prolonged leaf wetness', treatment: 'Avoid overhead watering, air circulation.' },
      { disease: 'Fusarium Wilt', pathogen: 'Fusarium oxysporum', symptoms: 'Sudden wilting, brown stem streaking, plant death.', trigger: 'Waterlogged warm soil', treatment: 'Strict crop rotation, elevated beds (10-12 inch), resistant cultivars.' }
    ]
  };

  // Add bed_width to soil_mix notes since there's no native column for it if not available, wait let's just put it in soil_mix.
  basilData.soil_mix = { type: 'Loam/Compost Mix', components: 'Standardized 30-36 inch wide raised beds for wholesale straddle harvesting. 1-2 inches of compost in top 6-8 inches of soil.' };

  if (existing) {
    const { error: upErr } = await supabase.from('crops').update(basilData).eq('id', existing.id);
    if (upErr) console.error('Error updating:', upErr);
    else console.log('Successfully updated Basil.');
  } else {
    // Need an active flag
    basilData.is_active = true;
    const { error: inErr } = await supabase.from('crops').insert(basilData);
    if (inErr) console.error('Error inserting:', inErr);
    else console.log('Successfully inserted Basil.');
  }
}
run();
