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
  console.log('Retrieving Basil record...');
  const { data: existing, error: loadErr } = await supabase.from('crops').select('*').eq('common_name', 'Sweet Basil').single();

  if (loadErr && loadErr.code !== 'PGRST116') {
      console.error('Error loading basil:', loadErr);
      return;
  }

  const basilData = {
    common_name: 'Sweet Basil',
    family: 'Lamiaceae',
    category: 'Herb',
    days_to_maturity: 70, 
    rooting_or_germ_days: 14, // Critical: Forces 14-day automation
    harvest_method: 'Mechanized straddle-harvesting jig, rigidly set to 4-6 inches above soil (leave 2-4 true leaves).',
    postharvest_notes: 'Highly susceptible to chilling injury. Cool immediately to 12-15°C (53-59°F). DO NOT refrigerate below 10°C. Store in micro-perforated bags with >95% humidity.',
    spacing_cm: '6-inch intra-row (12 inches between 3 rows).',
    pot_diameter_cm: 10,
    stages: [
      { name: 'Germination', days: 14, description: 'Radicle emergence (temp 24-29°C).' },
      { name: 'Seedling', days: 28, description: 'Cotyledon expansion (4 weeks post-germ).' },
      { name: 'Early Vegetative', days: 21, description: 'Internode elongation (Weeks 7-9).' },
      { name: 'Mature Vegetative', days: 7, description: 'Canopy closure (Week 10). First major cut.' },
      { name: 'Regeneration', days: 21, description: 'Cycles of 14-21 days post-harvest.' }
    ],
    fertilizer_schedule: [
      { stage: 'Pre-Plant', product: '10-10-10 Dry NPK', rate: '120-120-120 lbs/acre', frequency: 'Once' },
      { stage: 'Sidedressing', product: 'Liquid Nitrogen / Organics', rate: '15-30 lbs N/acre', frequency: 'Every 14-21 days (Post-harvest)' }
    ],
    pest_records: [
      { pest: 'Aphids', damage: 'Honeydew, foliar distortion, sooty mold.', neem_rate: 'Cull trap crop', season: 'Warm/Humid' },
      { pest: 'Whiteflies', damage: 'Viral vector, sap-sucking.', neem_rate: 'Edible Nasturtiums trap crop border', season: 'Warm/Humid' },
      { pest: 'Root-Knot Nematodes', damage: 'Root galling, stunting.', neem_rate: 'French Marigolds border', season: 'All' }
    ],
    disease_records: [
      { disease: 'Downy Mildew', pathogen: 'Peronospora belbahrii', symptoms: 'Grey fuzz, yellowing.', trigger: '>85% RH and 15-25°C', treatment: 'Copper Fungicide, wide spacing.' },
      { disease: 'Bacterial Leaf Spot', pathogen: 'Pseudomonas cichorii', symptoms: 'Water-soaked spots.', trigger: 'Monsoon rains', treatment: 'Avoid overhead watering.' },
      { disease: 'Fusarium Wilt', pathogen: 'Fusarium oxysporum', symptoms: 'Sudden wilting, brown streaking.', trigger: 'Waterlogged warm soil', treatment: 'Strict crop rotation, resistant cultivars.' }
    ],
    soil_mix: { 
        type: 'Loam/Compost Mix', 
        components: 'Standardized 30-36" beds. 12" row spacing. 6" intra-row plant spacing. 1-2" compost base.' 
    }
  };

  if (existing) {
    console.log('Updating existing Basil record...');
    const { error: upErr } = await supabase.from('crops').update(basilData).eq('id', existing.id);
    if (upErr) console.error('Error updating:', upErr);
    else console.log('Successfully updated Basil with full Blueprint stages and spacing.');
  } else {
    console.log('Inserting new Basil record...');
    basilData.is_active = true;
    const { error: inErr } = await supabase.from('crops').insert(basilData);
    if (inErr) console.error('Error inserting:', inErr);
    else console.log('Successfully inserted Basil.');
  }
}

run();
