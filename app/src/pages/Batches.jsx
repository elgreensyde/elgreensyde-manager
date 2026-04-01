import { useState, useEffect } from 'react';
import { Plus, Search, Lock, X, Sprout as SproutIcon, MapPin, Calendar } from 'lucide-react';
import db from '../services/db';
import { generateBatchTasks, getBatchStage } from '../services/taskEngine';


const STATUSES = ['Active', 'Ready', 'Harvested', 'Sold', 'Discarded'];

function Batches() {
  const [batches, setBatches] = useState([]);
  const [crops, setCrops] = useState([]);
  const [zones, setZones] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ crop_id: '', propagation_method: '', planting_date: new Date().toISOString().split('T')[0], quantity: '', unit: 'pots', growing_zone: 'Pot Bench 1', notes: '' });

  const load = async () => { const [b, c, z] = await Promise.all([db.getAll('batches'), db.getAll('crops'), db.getAll('zones')]); setBatches(b); setCrops(c); setZones(z); setLoading(false); };
  useEffect(() => { load(); }, []);

  const getCrop = (id) => crops.find(c => c.id === id);

  const handleCropChange = (cropId) => { const crop = crops.find(c => c.id === cropId); setForm({ ...form, crop_id: cropId, propagation_method: crop?.default_prop_method || 'Seed' }); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const crop = getCrop(form.crop_id);
    if (!crop) return alert('Please select a crop');
    const batchCode = await db.generateBatchCode();
    const batchData = { batch_code: batchCode, crop_id: form.crop_id, propagation_method: form.propagation_method, planting_date: form.planting_date, quantity: parseInt(form.quantity) || 1, unit: form.unit, growing_zone: form.growing_zone, status: 'Active', ipm_locked: false, ipm_unlock_date: null, notes: form.notes };
    const newBatch = await db.insert('batches', batchData);
    if (newBatch) {
      const tasks = generateBatchTasks(newBatch, crop);
      await db.insertMany('tasks', tasks);
    }
    setShowForm(false);
    setForm({ crop_id: '', propagation_method: '', planting_date: new Date().toISOString().split('T')[0], quantity: '', unit: 'pots', growing_zone: 'Pot Bench 1', notes: '' });
    load();
  };

  const updateStatus = async (batchId, newStatus) => {
    const batch = batches.find(b => b.id === batchId);
    if (batch?.ipm_locked && (newStatus === 'Ready' || newStatus === 'Sold')) return alert('⚠️ This batch is IPM locked.');
    await db.update('batches', batchId, { status: newStatus });
    load();
  };

  const filtered = batches.filter(b => {
    const crop = getCrop(b.crop_id);
    const matchSearch = !search || b.batch_code.toLowerCase().includes(search.toLowerCase()) || (crop?.common_name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || b.status === filterStatus;
    return matchSearch && matchStatus;
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const stageColors = { gray: 'bg-gray-500', yellow: 'bg-yellow-500', green: 'bg-green-500', blue: 'bg-blue-500', emerald: 'bg-emerald-500', red: 'bg-red-500' };
  const stageBadge = { gray: 'bg-gray-500/15 text-gray-500', yellow: 'bg-yellow-500/15 text-yellow-600', green: 'bg-green-500/15 text-green-600', blue: 'bg-blue-500/15 text-blue-500', emerald: 'bg-emerald-500/15 text-emerald-600', red: 'bg-red-500/15 text-red-500' };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Batches</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{batches.filter(b => b.status === 'Active').length} active</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary" id="new-batch-btn"><Plus size={18} /><span className="hidden sm:inline">New Batch</span></button>
        </div>
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input type="text" placeholder="Search batches..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <button onClick={() => setFilterStatus('')} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors`} style={!filterStatus ? { background: 'var(--color-bg-card-hover)', color: 'var(--color-text-primary)' } : { color: 'var(--color-text-muted)' }}>All</button>
          {STATUSES.map(s => <button key={s} onClick={() => setFilterStatus(filterStatus === s ? '' : s)} className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors" style={filterStatus === s ? { background: 'var(--color-bg-card-hover)', color: 'var(--color-text-primary)' } : { color: 'var(--color-text-muted)' }}>{s}</button>)}
        </div>
      </div>

      <div className="px-5 space-y-3 pb-6">
        {filtered.length === 0 ? (
          <div className="glass-card-static p-8 text-center">
            <SproutIcon className="mx-auto mb-3" size={40} style={{ color: 'var(--color-text-muted)' }} />
            <p style={{ color: 'var(--color-text-muted)' }} className="mb-4">No batches yet.</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mx-auto"><Plus size={16} /> Create First Batch</button>
          </div>
        ) : filtered.map(batch => {
          const crop = getCrop(batch.crop_id);
          if (!crop) return null;
          const stage = getBatchStage(batch, crop);
          const daysToHarvest = crop.days_to_maturity - stage.daysElapsed;
          return (
            <div key={batch.id} className="glass-card p-4 cursor-pointer" onClick={() => setSelectedBatch(selectedBatch === batch.id ? null : batch.id)}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{batch.batch_code}</span>
                    {batch.ipm_locked && <Lock size={12} className="text-red-500" />}
                  </div>
                  <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{crop.common_name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <span className="flex items-center gap-1"><MapPin size={12} />{batch.growing_zone}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} />{batch.planting_date}</span>
                  </div>
                </div>
                <span className={`badge text-[10px] ${stageBadge[stage.color] || stageBadge.gray}`}>{stage.stage}</span>
              </div>
              <div className="mt-3">
                <div className="w-full rounded-full h-2" style={{ background: 'var(--color-border)' }}>
                  <div className={`h-2 rounded-full transition-all duration-500 ${stageColors[stage.color] || 'bg-gray-500'}`} style={{ width: `${Math.min(stage.percent, 100)}%` }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{batch.quantity} {batch.unit}</span>
                  <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{daysToHarvest > 0 ? `${daysToHarvest}d to harvest` : stage.stage === 'Ready to Harvest' ? '🌿 Ready!' : stage.stage === 'OVERDUE' ? '⚠️ Overdue' : batch.status}</span>
                </div>
              </div>
              {selectedBatch === batch.id && (
                <div className="mt-4 pt-4 animate-fade-in" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div><span className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>Propagation</span><p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{batch.propagation_method || crop.default_prop_method}</p></div>
                    <div><span className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>Day</span><p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{stage.daysElapsed} / {crop.days_to_maturity}</p></div>
                  </div>
                  {batch.ipm_locked && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-3"><p className="text-xs text-red-500 font-semibold">🔒 IPM Locked — Unlocks: {batch.ipm_unlock_date}</p></div>}
                  {batch.notes && <p className="text-xs italic mb-3" style={{ color: 'var(--color-text-muted)' }}>{batch.notes}</p>}
                  <div className="flex gap-2 flex-wrap">
                    {batch.status === 'Active' && <button onClick={e => { e.stopPropagation(); updateStatus(batch.id, 'Ready'); }} className="btn-primary !text-xs !px-3 !py-1.5">Mark Ready</button>}
                    {batch.status === 'Ready' && <button onClick={e => { e.stopPropagation(); updateStatus(batch.id, 'Harvested'); }} className="btn-primary !text-xs !px-3 !py-1.5">Mark Harvested</button>}
                    {(batch.status === 'Active' || batch.status === 'Ready') && <button onClick={e => { e.stopPropagation(); updateStatus(batch.id, 'Discarded'); }} className="btn-danger !text-xs !px-3 !py-1.5">Discard</button>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* NEW BATCH FORM */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--color-bg-overlay)' }} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up rounded-t-3xl sm:rounded-3xl" style={{ background: 'var(--color-bg-modal)', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 px-6 pt-6 pb-4 flex items-center justify-between" style={{ background: 'var(--color-bg-modal)' }}>
              <h2 className="text-lg font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>New Batch</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:opacity-70"><X size={20} style={{ color: 'var(--color-text-muted)' }} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Crop *</label><select required value={form.crop_id} onChange={e => handleCropChange(e.target.value)} className="input-field"><option value="">Select a crop...</option>{crops.map(c => <option key={c.id} value={c.id}>{c.common_name} ({c.category})</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Propagation</label><select value={form.propagation_method} onChange={e => setForm({...form, propagation_method: e.target.value})} className="input-field"><option value="Seed">Seed</option><option value="Cutting">Cutting</option><option value="Division">Division</option></select></div>
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Planting Date *</label><input type="date" required value={form.planting_date} onChange={e => setForm({...form, planting_date: e.target.value})} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Quantity *</label><input type="number" required min="1" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="input-field" placeholder="20" /></div>
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Unit</label><select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="input-field"><option value="pots">Pots</option><option value="trays">Trays</option><option value="plants">Plants</option></select></div>
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Zone</label><select value={form.growing_zone} onChange={e => setForm({...form, growing_zone: e.target.value})} className="input-field">{zones.map(z => <option key={z.id} value={z.name}>{z.name} ({z.type})</option>)}</select></div>
              </div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Notes</label><textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="input-field" rows={2} /></div>
              {form.crop_id && (
                <div className="rounded-xl p-3" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-badge-herb-text)' }}>📋 Auto-generated tasks:</p>
                  <ul className="text-[11px] space-y-0.5" style={{ color: 'var(--color-text-muted)' }}>
                    <li>✓ {form.propagation_method === 'Seed' ? 'Sow seeds' : form.propagation_method === 'Cutting' ? 'Plant cuttings' : 'Plant divisions'} (Day 0)</li>
                    <li>✓ {form.propagation_method === 'Seed' ? 'Check germination' : 'Check roots'} (Day {getCrop(form.crop_id)?.rooting_or_germ_days})</li>
                    <li>✓ Pre-harvest check (Day {Math.round((getCrop(form.crop_id)?.days_to_maturity || 0) * 0.85)})</li>
                    <li>✓ Harvest ready (Day {getCrop(form.crop_id)?.days_to_maturity})</li>
                  </ul>
                </div>
              )}
              <button type="submit" className="btn-primary w-full justify-center !py-3">Create Batch</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Batches;
