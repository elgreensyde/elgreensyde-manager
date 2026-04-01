import { useState, useEffect } from 'react';
import { Plus, Search, Edit3, Trash2, X, Leaf, Flower2, Sprout as SproutIcon, Carrot } from 'lucide-react';
import db from '../services/db';

const CATEGORIES = ['Microgreen', 'Herb', 'Edible Flower', 'Vegetable'];
const PROP_METHODS = ['Seed', 'Cutting', 'Division'];
const categoryIcons = { 'Herb': Leaf, 'Edible Flower': Flower2, 'Microgreen': SproutIcon, 'Vegetable': Carrot };
const categoryBadge = { 'Herb': 'badge-herb', 'Edible Flower': 'badge-flower', 'Microgreen': 'badge-microgreen', 'Vegetable': 'badge-vegetable' };

function CropLibrary() {
  const [crops, setCrops] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCrop, setEditingCrop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ common_name: '', category: 'Herb', default_prop_method: 'Seed', days_to_maturity: '', rooting_or_germ_days: '', harvest_window_days: '', ec_min: '', ec_max: '', ph_min: '', ph_max: '', yield_estimate: '', notes: '' });

  const loadCrops = async () => { setCrops(await db.getAll('crops')); setLoading(false); };
  useEffect(() => { loadCrops(); }, []);

  const resetForm = () => { setForm({ common_name: '', category: 'Herb', default_prop_method: 'Seed', days_to_maturity: '', rooting_or_germ_days: '', harvest_window_days: '', ec_min: '', ec_max: '', ph_min: '', ph_max: '', yield_estimate: '', notes: '' }); setEditingCrop(null); };

  const openEdit = (crop) => {
    setEditingCrop(crop.id);
    setForm({ common_name: crop.common_name || '', category: crop.category || 'Herb', default_prop_method: crop.default_prop_method || 'Seed', days_to_maturity: crop.days_to_maturity?.toString() || '', rooting_or_germ_days: crop.rooting_or_germ_days?.toString() || '', harvest_window_days: crop.harvest_window_days?.toString() || '', ec_min: crop.ec_min?.toString() || '', ec_max: crop.ec_max?.toString() || '', ph_min: crop.ph_min?.toString() || '', ph_max: crop.ph_max?.toString() || '', yield_estimate: crop.yield_estimate || '', notes: crop.notes || '' });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, days_to_maturity: parseInt(form.days_to_maturity) || 0, rooting_or_germ_days: parseInt(form.rooting_or_germ_days) || 0, harvest_window_days: parseInt(form.harvest_window_days) || 0, ec_min: parseFloat(form.ec_min) || null, ec_max: parseFloat(form.ec_max) || null, ph_min: parseFloat(form.ph_min) || null, ph_max: parseFloat(form.ph_max) || null };
    if (editingCrop) await db.update('crops', editingCrop, data);
    else await db.insert('crops', data);
    setShowForm(false); resetForm(); loadCrops();
  };

  const handleDelete = async (id) => { if (confirm('Delete this crop?')) { await db.delete('crops', id); loadCrops(); } };

  const filtered = crops.filter(c => c.common_name.toLowerCase().includes(search.toLowerCase()) && (!filterCategory || c.category === filterCategory));

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Crop Library</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{crops.length} crops defined</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary" id="add-crop-btn"><Plus size={18} /><span className="hidden sm:inline">Add Crop</span></button>
        </div>
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input type="text" placeholder="Search crops..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" id="crop-search" />
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input-field w-auto" id="crop-category-filter">
            <option value="">All</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="px-5 space-y-3 pb-6">
        {filtered.length === 0 ? (
          <div className="glass-card-static p-8 text-center">
            <SproutIcon className="mx-auto mb-3" size={40} style={{ color: 'var(--color-text-muted)' }} />
            <p style={{ color: 'var(--color-text-muted)' }}>No crops found.</p>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary mt-4 mx-auto"><Plus size={16} /> Add Your First Crop</button>
          </div>
        ) : filtered.map(crop => {
          const Icon = categoryIcons[crop.category] || Leaf;
          return (
            <div key={crop.id} className="glass-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-bg-card-hover)' }}>
                    <Icon size={20} style={{ color: 'var(--color-badge-herb-text)' }} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{crop.common_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={categoryBadge[crop.category] || 'badge-herb'}>{crop.category}</span>
                      <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{crop.default_prop_method === 'Seed' ? '🌱' : '✂️'} {crop.default_prop_method}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(crop)} className="p-2 rounded-lg hover:opacity-70 transition-opacity"><Edit3 size={14} style={{ color: 'var(--color-text-muted)' }} /></button>
                  <button onClick={() => handleDelete(crop.id)} className="p-2 rounded-lg hover:opacity-70 transition-opacity"><Trash2 size={14} className="text-red-500/50" /></button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                <div><span className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>DTM</span><p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{crop.days_to_maturity}d</p></div>
                <div><span className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>{crop.default_prop_method === 'Seed' ? 'Germ' : 'Root'}</span><p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{crop.rooting_or_germ_days}d</p></div>
                <div><span className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>Harvest</span><p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{crop.harvest_window_days}d</p></div>
              </div>
              {(crop.ec_min || crop.ph_min) && <div className="flex gap-4 mt-2 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{crop.ec_min && <span>EC: {crop.ec_min}–{crop.ec_max} mS/cm</span>}{crop.ph_min && <span>pH: {crop.ph_min}–{crop.ph_max}</span>}</div>}
              {crop.yield_estimate && <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Yield: {crop.yield_estimate}</p>}
            </div>
          );
        })}
      </div>

      {/* FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--color-bg-overlay)' }} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up rounded-t-3xl sm:rounded-3xl" style={{ background: 'var(--color-bg-modal)', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 px-6 pt-6 pb-4 flex items-center justify-between" style={{ background: 'var(--color-bg-modal)' }}>
              <h2 className="text-lg font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>{editingCrop ? 'Edit Crop' : 'Add New Crop'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:opacity-70"><X size={20} style={{ color: 'var(--color-text-muted)' }} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Common Name *</label><input type="text" required value={form.common_name} onChange={e => setForm({...form, common_name: e.target.value})} className="input-field" placeholder="e.g. Sweet Basil" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Category *</label><select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input-field">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Propagation *</label><select value={form.default_prop_method} onChange={e => setForm({...form, default_prop_method: e.target.value})} className="input-field">{PROP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>DTM (days) *</label><input type="number" required value={form.days_to_maturity} onChange={e => setForm({...form, days_to_maturity: e.target.value})} className="input-field" placeholder="30" /></div>
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>{form.default_prop_method === 'Seed' ? 'Germ Days' : 'Root Days'} *</label><input type="number" required value={form.rooting_or_germ_days} onChange={e => setForm({...form, rooting_or_germ_days: e.target.value})} className="input-field" placeholder="7" /></div>
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Harvest Win. *</label><input type="number" required value={form.harvest_window_days} onChange={e => setForm({...form, harvest_window_days: e.target.value})} className="input-field" placeholder="14" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>EC Min</label><input type="number" step="0.1" value={form.ec_min} onChange={e => setForm({...form, ec_min: e.target.value})} className="input-field" placeholder="1.0" /></div>
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>EC Max</label><input type="number" step="0.1" value={form.ec_max} onChange={e => setForm({...form, ec_max: e.target.value})} className="input-field" placeholder="2.2" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>pH Min</label><input type="number" step="0.1" value={form.ph_min} onChange={e => setForm({...form, ph_min: e.target.value})} className="input-field" placeholder="5.5" /></div>
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>pH Max</label><input type="number" step="0.1" value={form.ph_max} onChange={e => setForm({...form, ph_max: e.target.value})} className="input-field" placeholder="6.5" /></div>
              </div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Yield Estimate</label><input type="text" value={form.yield_estimate} onChange={e => setForm({...form, yield_estimate: e.target.value})} className="input-field" placeholder='e.g. 15g per 4" pot' /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="input-field" rows={3} placeholder="Special care instructions..." /></div>
              <button type="submit" className="btn-primary w-full justify-center !py-3">{editingCrop ? 'Update Crop' : 'Add Crop'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CropLibrary;
