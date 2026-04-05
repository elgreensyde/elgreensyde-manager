import { useState, useEffect, useRef } from 'react';
import { Plus, Search, X, Leaf, Flower2, Sprout as SproutIcon, Carrot, ChevronDown, ChevronRight, Upload, Download, AlertTriangle, Bug, Droplets, Scissors, RotateCcw, Beaker, Sun } from 'lucide-react';
import toast from 'react-hot-toast';
import db from '../services/db';

const CATEGORIES = ['Herb', 'Edible Flower', 'Vegetable'];
const categoryIcons = { 'Herb': Leaf, 'Edible Flower': Flower2, 'Microgreen': SproutIcon, 'Vegetable': Carrot };
const categoryColors = {
  'Herb': { bg: '#e8f8f0', color: '#27ae60' },
  'Edible Flower': { bg: '#fce4ec', color: '#e91e63' },
  'Vegetable': { bg: '#e3f2fd', color: '#1976d2' },
  'Microgreen': { bg: '#f1f8e9', color: '#689f38' }
};

function CropLibrary() {
  const [crops, setCrops] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [expandedCrop, setExpandedCrop] = useState(null);
  const [expandedSection, setExpandedSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [csvData, setCsvData] = useState(null);
  const fileRef = useRef(null);

  const loadCrops = async () => { setCrops(await db.getAll('crops')); setLoading(false); };
  useEffect(() => { loadCrops(); }, []);

  const filtered = crops.filter(c =>
    (c.common_name || '').toLowerCase().includes(search.toLowerCase()) &&
    (!filterCategory || c.category === filterCategory)
  );

  const toggleCrop = (id) => { setExpandedCrop(expandedCrop === id ? null : id); setExpandedSection(null); };
  const toggleSection = (s) => setExpandedSection(expandedSection === s ? null : s);

  // CSV Import
  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const records = lines.slice(1).map(line => {
          const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const obj = {};
          headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
          return obj;
        });
        setCsvData(records);
        setShowImport(true);
        toast.success(`${records.length} crops parsed from CSV`);
      } catch (err) {
        toast.error('Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = async () => {
    if (!csvData?.length) return;
    const mapped = csvData.map(r => ({
      common_name: r.crop_name || r.common_name || 'Unknown',
      scientific_name: r.scientific_name || '',
      family: r.family || '',
      category: r.category || 'Herb',
      default_prop_method: r.default_prop_method || 'Seed',
      growth_type: r.growth_type || null,
      format: r.format || null,
      days_to_maturity: parseInt(r.days_to_maturity) || 0,
      rooting_or_germ_days: parseInt(r.rooting_or_germ_days) || 0,
      harvest_window_days: parseInt(r.harvest_window_days) || 0,
      avg_nursery_days: parseInt(r.avg_nursery_days) || null,
      days_to_first_harvest: parseInt(r.days_to_first_harvest) || null,
      harvest_interval_days: parseInt(r.harvest_interval_days) || null,
      plot_lifespan_days: parseInt(r.plot_lifespan_days) || null,
      resting_days: parseInt(r.resting_days) || null,
      pot_diameter_cm: parseInt(r.pot_diameter_cm) || null,
      pot_depth_cm: parseInt(r.pot_depth_cm) || null,
      pot_material: r.pot_material || null,
      harvest_indicators: r.harvest_indicators || null,
      harvest_method: r.harvest_method || null,
      yield_per_sqm: r.yield_per_sqm || null,
      yield_per_pot: r.yield_per_pot || null,
      postharvest_notes: r.postharvest_notes || null,
      high_risk_flag: r.high_risk_flag || null,
      is_active: false // Draft until confirmed
    }));
    await db.insertMany('crops', mapped);
    toast.success(`${mapped.length} crops imported as drafts!`);
    setShowImport(false); setCsvData(null); loadCrops();
  };

  const downloadTemplate = () => {
    const headers = 'crop_name,scientific_name,family,category,default_prop_method,growth_type,format,days_to_maturity,rooting_or_germ_days,harvest_window_days,avg_nursery_days,days_to_first_harvest,harvest_interval_days,plot_lifespan_days,resting_days,pot_diameter_cm,pot_depth_cm,pot_material,harvest_indicators,harvest_method,yield_per_sqm,yield_per_pot,postharvest_notes,high_risk_flag';
    const blob = new Blob([headers + '\n'], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'crop_library_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // Section renderers
  const SectionHeader = ({ icon: Icon, title, sectionKey, color }) => (
    <button onClick={() => toggleSection(sectionKey)} className="w-full flex items-center gap-2 py-2.5 px-3 rounded-lg text-left transition-all hover:opacity-80" style={{ background: expandedSection === sectionKey ? color + '15' : 'transparent' }}>
      <Icon size={15} style={{ color }} />
      <span className="text-sm font-semibold flex-1" style={{ color: 'var(--color-text-primary)' }}>{title}</span>
      {expandedSection === sectionKey ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
    </button>
  );

  const renderStages = (crop) => {
    const stages = crop.stages || [];
    if (!stages.length) return <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>No stage data</p>;
    return (
      <div className="space-y-2 p-3">
        {stages.map((s, i) => (
          <div key={i} className="flex gap-3 items-start text-xs">
            <div className="w-20 flex-shrink-0 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{s.days}</div>
            <div className="flex-1">
              <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{s.name}</div>
              {s.risk && <div className="mt-0.5" style={{ color: '#d97706' }}>⚠ {s.risk}</div>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderFertilizer = (crop) => {
    const sched = crop.fertilizer_schedule || [];
    if (!sched.length) return <p className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>No schedule</p>;
    return (
      <div className="overflow-x-auto p-3">
        <table className="w-full text-xs">
          <thead><tr style={{ color: 'var(--color-text-muted)' }}>
            <th className="text-left pb-2 font-medium">Stage</th>
            <th className="text-left pb-2 font-medium">Product</th>
            <th className="text-left pb-2 font-medium">Rate</th>
            <th className="text-left pb-2 font-medium">Frequency</th>
          </tr></thead>
          <tbody>{sched.map((f, i) => (
            <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
              <td className="py-1.5 font-medium" style={{ color: 'var(--color-text-primary)' }}>{f.stage}</td>
              <td className="py-1.5" style={{ color: 'var(--color-text-secondary)' }}>{f.product}</td>
              <td className="py-1.5" style={{ color: '#27ae60' }}>{f.rate}</td>
              <td className="py-1.5" style={{ color: 'var(--color-text-muted)' }}>{f.frequency}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    );
  };

  const renderPests = (crop) => {
    const pests = crop.pest_records || [];
    if (!pests.length) return <p className="text-xs italic p-3" style={{ color: 'var(--color-text-muted)' }}>No pest records</p>;
    return (
      <div className="space-y-2 p-3">
        {pests.map((p, i) => (
          <div key={i} className="text-xs p-2 rounded-lg" style={{ background: 'var(--color-bg-card-hover)' }}>
            <div className="font-semibold" style={{ color: '#e74c3c' }}>🐛 {p.pest}</div>
            {p.appearance && <div style={{ color: 'var(--color-text-muted)' }}>{p.appearance}</div>}
            <div style={{ color: 'var(--color-text-secondary)' }}>Damage: {p.damage}</div>
            <div className="mt-1 font-medium" style={{ color: '#27ae60' }}>Neem: {p.neem_rate} | Season: {p.season}</div>
          </div>
        ))}
      </div>
    );
  };

  const renderDiseases = (crop) => {
    const diseases = crop.disease_records || [];
    if (!diseases.length) return <p className="text-xs italic p-3" style={{ color: 'var(--color-text-muted)' }}>No disease records</p>;
    return (
      <div className="space-y-2 p-3">
        {diseases.map((d, i) => (
          <div key={i} className="text-xs p-2 rounded-lg" style={{ background: 'var(--color-bg-card-hover)' }}>
            <div className="font-semibold" style={{ color: '#9b59b6' }}>🦠 {d.disease}</div>
            {d.pathogen && <div className="italic" style={{ color: 'var(--color-text-muted)' }}>{d.pathogen}</div>}
            <div style={{ color: 'var(--color-text-secondary)' }}>Symptoms: {d.symptoms}</div>
            <div style={{ color: '#d97706' }}>Trigger: {d.trigger}</div>
            <div className="mt-1 font-medium" style={{ color: '#27ae60' }}>Treatment: {d.treatment}</div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter h-full overflow-y-auto">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Crop Library</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{crops.length} crops • Intelligence Database</p>
          </div>
          <div className="flex gap-2">
            <button onClick={downloadTemplate} className="p-2 rounded-lg" style={{ background: 'var(--color-bg-card-hover)' }} title="Download CSV Template">
              <Download size={18} style={{ color: 'var(--color-text-muted)' }} />
            </button>
            <label className="p-2 rounded-lg cursor-pointer" style={{ background: 'var(--color-bg-card-hover)' }} title="Import CSV">
              <Upload size={18} style={{ color: 'var(--color-text-muted)' }} />
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
            </label>
          </div>
        </div>
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input type="text" placeholder="Search crops..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input-field w-auto">
            <option value="">All</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="px-5 space-y-3 pb-24">
        {filtered.length === 0 ? (
          <div className="glass-card-static p-8 text-center">
            <SproutIcon className="mx-auto mb-3" size={40} style={{ color: 'var(--color-text-muted)' }} />
            <p style={{ color: 'var(--color-text-muted)' }}>No crops found.</p>
          </div>
        ) : filtered.map(crop => {
          const Icon = categoryIcons[crop.category] || Leaf;
          const colors = categoryColors[crop.category] || categoryColors['Herb'];
          const isExpanded = expandedCrop === crop.id;

          return (
            <div key={crop.id} className="glass-card overflow-hidden">
              {/* Card Header */}
              <button onClick={() => toggleCrop(crop.id)} className="w-full p-4 flex items-start gap-3 text-left">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: colors.bg }}>
                  <Icon size={20} style={{ color: colors.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{crop.common_name}</h3>
                    {crop.is_active === false && <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 font-medium">DRAFT</span>}
                  </div>
                  {crop.scientific_name && <p className="text-[11px] italic" style={{ color: 'var(--color-text-muted)' }}>{crop.scientific_name}</p>}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: colors.bg, color: colors.color }}>{crop.category}</span>
                    {crop.family && <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{crop.family}</span>}
                    {crop.growth_type && <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>• {crop.growth_type}</span>}
                    {crop.pesticide_free_required && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-100 text-green-800">🌿 Pesticide-Free</span>}
                  </div>
                </div>
                <div className="flex-shrink-0 pt-2">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              </button>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-2 px-4 pb-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                <div className="pt-2"><span className="text-[9px] uppercase" style={{ color: 'var(--color-text-muted)' }}>DTM</span><p className="text-sm font-bold" style={{ color: 'var(--color-text-secondary)' }}>{crop.days_to_maturity || '—'}d</p></div>
                <div className="pt-2"><span className="text-[9px] uppercase" style={{ color: 'var(--color-text-muted)' }}>1st Harvest</span><p className="text-sm font-bold" style={{ color: 'var(--color-text-secondary)' }}>{crop.days_to_first_harvest || '—'}d</p></div>
                <div className="pt-2"><span className="text-[9px] uppercase" style={{ color: 'var(--color-text-muted)' }}>Interval</span><p className="text-sm font-bold" style={{ color: 'var(--color-text-secondary)' }}>{crop.harvest_interval_days || '—'}d</p></div>
                <div className="pt-2"><span className="text-[9px] uppercase" style={{ color: 'var(--color-text-muted)' }}>Lifespan</span><p className="text-sm font-bold" style={{ color: 'var(--color-text-secondary)' }}>{crop.plot_lifespan_days || '—'}d</p></div>
              </div>

              {/* Risk Flag */}
              {crop.high_risk_flag && (
                <div className="mx-4 mb-3 p-2 rounded-lg text-[11px] flex items-start gap-1.5" style={{ background: '#fef3c7', color: '#92400e' }}>
                  <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                  <span>{crop.high_risk_flag}</span>
                </div>
              )}

              {/* Expanded Detail View */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-1" style={{ borderTop: '1px solid var(--color-border)' }}>
                  {/* Growth Stages */}
                  <SectionHeader icon={Sun} title="Growth Stages" sectionKey="stages" color="#f39c12" />
                  {expandedSection === 'stages' && renderStages(crop)}

                  {/* Pot / Bed Requirements */}
                  <SectionHeader icon={SproutIcon} title="Pot / Bed Requirements" sectionKey="requirements" color="#27ae60" />
                  {expandedSection === 'requirements' && (
                    <div className="p-3 grid grid-cols-2 gap-2 text-xs">
                      {crop.pot_diameter_cm && <div><span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Pot Ø:</span> <span style={{ color: 'var(--color-text-primary)' }}>{crop.pot_diameter_cm}cm</span></div>}
                      {crop.pot_depth_cm && <div><span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Depth:</span> <span>{crop.pot_depth_cm}cm</span></div>}
                      {crop.pot_material && <div><span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Material:</span> <span>{crop.pot_material}</span></div>}
                      {crop.spacing_cm && <div><span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Spacing:</span> <span>{crop.spacing_cm}</span></div>}
                      {crop.plants_per_sqm && <div><span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Plants/sqm:</span> <span>{crop.plants_per_sqm}</span></div>}
                      {crop.mound_height_cm && <div><span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Mound:</span> <span>{crop.mound_height_cm}cm</span></div>}
                      {crop.soil_mix && <div className="col-span-2 mt-1 p-2 rounded" style={{ background: 'var(--color-bg-card-hover)' }}>
                        <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Soil: {crop.soil_mix.type}</span>
                        <div style={{ color: 'var(--color-text-muted)' }}>{crop.soil_mix.components}</div>
                        {crop.cow_manure_excluded && <div className="mt-1 font-medium" style={{ color: '#e74c3c' }}>🚫 Cow manure EXCLUDED</div>}
                      </div>}
                    </div>
                  )}

                  {/* Fertilizer Schedule */}
                  <SectionHeader icon={Beaker} title="Fertilizer Schedule" sectionKey="fertilizer" color="#3498db" />
                  {expandedSection === 'fertilizer' && renderFertilizer(crop)}

                  {/* Pest Atlas */}
                  <SectionHeader icon={Bug} title="Pest Atlas" sectionKey="pests" color="#e74c3c" />
                  {expandedSection === 'pests' && renderPests(crop)}

                  {/* Disease Atlas */}
                  <SectionHeader icon={Droplets} title="Disease Atlas" sectionKey="diseases" color="#9b59b6" />
                  {expandedSection === 'diseases' && renderDiseases(crop)}

                  {/* Harvest Info */}
                  <SectionHeader icon={Scissors} title="Harvest Info" sectionKey="harvest" color="#27ae60" />
                  {expandedSection === 'harvest' && (
                    <div className="p-3 space-y-2 text-xs">
                      {crop.harvest_indicators && <div><span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Readiness:</span> <span style={{ color: 'var(--color-text-primary)' }}>{crop.harvest_indicators}</span></div>}
                      {crop.harvest_method && <div><span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Method:</span> <span>{crop.harvest_method}</span></div>}
                      {crop.yield_per_sqm && <div><span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Yield/sqm:</span> <span style={{ color: '#27ae60' }}>{crop.yield_per_sqm}</span></div>}
                      {crop.yield_per_pot && <div><span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Yield/pot:</span> <span style={{ color: '#27ae60' }}>{crop.yield_per_pot}</span></div>}
                      {crop.postharvest_notes && <div className="p-2 rounded" style={{ background: 'var(--color-bg-card-hover)' }}><span className="font-medium">Post-Harvest:</span> {crop.postharvest_notes}</div>}
                      {crop.edible_parts && <div><span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Edible Parts:</span> <span>{crop.edible_parts}</span></div>}
                    </div>
                  )}

                  {/* Crop Rotation */}
                  {(crop.rotation_family || crop.resting_days) && (
                    <>
                      <SectionHeader icon={RotateCcw} title="Crop Rotation" sectionKey="rotation" color="#e67e22" />
                      {expandedSection === 'rotation' && (
                        <div className="p-3 space-y-2 text-xs">
                          {crop.rotation_family && <div><span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Family:</span> {crop.rotation_family}</div>}
                          {crop.avoid_after?.length > 0 && <div><span className="font-medium" style={{ color: '#e74c3c' }}>🚫 Avoid after:</span> {crop.avoid_after.join(', ')}</div>}
                          {crop.recommended_after?.length > 0 && <div><span className="font-medium" style={{ color: '#27ae60' }}>✅ Recommended after:</span> {crop.recommended_after.join(', ')}</div>}
                          {crop.resting_days && <div><span className="font-medium" style={{ color: 'var(--color-text-muted)' }}>Rest period:</span> {crop.resting_days} days</div>}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CSV Import Preview Modal */}
      {showImport && csvData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--color-bg-overlay)' }}>
          <div className="glass-card-static w-full max-w-lg max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Import Preview</h2>
              <button onClick={() => { setShowImport(false); setCsvData(null); }} className="p-2"><X size={18} /></button>
            </div>
            <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>{csvData.length} crops will be imported as <strong>DRAFT</strong> status</p>
            <div className="space-y-2 mb-4">
              {csvData.map((r, i) => (
                <div key={i} className="text-sm p-2 rounded-lg" style={{ background: 'var(--color-bg-card-hover)' }}>
                  <span className="font-medium">{r.crop_name || r.common_name}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>{r.family || ''}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowImport(false); setCsvData(null); }} className="flex-1 py-2 rounded-xl text-sm font-medium" style={{ background: 'var(--color-bg-card-hover)' }}>Cancel</button>
              <button onClick={confirmImport} className="btn-primary flex-1">Import {csvData.length} Crops</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CropLibrary;
