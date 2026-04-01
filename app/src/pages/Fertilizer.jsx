import { useState, useEffect } from 'react';
import { Plus, Droplets, X, FlaskConical } from 'lucide-react';
import db from '../services/db';

function Fertilizer() {
  const [tab, setTab] = useState('mixing');
  const [mixes, setMixes] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [batches, setBatches] = useState([]);
  const [crops, setCrops] = useState([]);
  const [showMixForm, setShowMixForm] = useState(false);
  const [showFeedForm, setShowFeedForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [mixForm, setMixForm] = useState({ mix_date: new Date().toISOString().split('T')[0], recipe_name: 'Masterblend Standard (Veg)', volume_liters: '', masterblend_g: '', calcium_nitrate_g: '', mgso4_g: '', target_ec: '', target_ph: '', actual_ec: '', actual_ph: '', applied_to: '', notes: '' });
  const [feedForm, setFeedForm] = useState({ feed_date: new Date().toISOString().split('T')[0], batch_id: '', zone: '', product_applied: '', dosage: '', ec_after: '', ph_after: '', notes: '' });

  const load = async () => { const [m, f, b, c] = await Promise.all([db.getAll('nutrient_mixes'), db.getAll('feeding_log'), db.getAll('batches'), db.getAll('crops')]); setMixes(m); setFeeds(f); setBatches(b); setCrops(c); setLoading(false); };
  useEffect(() => { load(); }, []);

  const getCropName = (batchId) => { const batch = batches.find(b => b.id === batchId); const crop = batch ? crops.find(c => c.id === batch.crop_id) : null; return crop?.common_name || ''; };

  const handleMixSubmit = async (e) => { 
    e.preventDefault(); 
    const { masterblend_g, calcium_nitrate_g, mgso4_g, ...rest } = mixForm;
    await db.insert('nutrient_mixes', { 
      ...rest, 
      volume_liters: parseFloat(rest.volume_liters)||0, 
      components: { 
        masterblend_g: parseFloat(masterblend_g)||0, 
        calcium_nitrate_g: parseFloat(calcium_nitrate_g)||0, 
        mgso4_g: parseFloat(mgso4_g)||0 
      }, 
      target_ec: parseFloat(rest.target_ec)||null, 
      target_ph: parseFloat(rest.target_ph)||null, 
      actual_ec: parseFloat(rest.actual_ec)||null, 
      actual_ph: parseFloat(rest.actual_ph)||null 
    }); 
    setShowMixForm(false); 
    setMixForm({ mix_date: new Date().toISOString().split('T')[0], recipe_name: 'Masterblend Standard (Veg)', volume_liters: '', masterblend_g: '', calcium_nitrate_g: '', mgso4_g: '', target_ec: '', target_ph: '', actual_ec: '', actual_ph: '', applied_to: '', notes: '' }); 
    load(); 
  };

  const handleFeedSubmit = async (e) => { e.preventDefault(); await db.insert('feeding_log', { ...feedForm, ec_after: parseFloat(feedForm.ec_after)||null, ph_after: parseFloat(feedForm.ph_after)||null }); setShowFeedForm(false); setFeedForm({ feed_date: new Date().toISOString().split('T')[0], batch_id: '', zone: '', product_applied: '', dosage: '', ec_after: '', ph_after: '', notes: '' }); load(); };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-display font-bold mb-4" style={{ color: 'var(--color-text-heading)' }}>Fertilizer & Nutrients</h1>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('mixing')} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2" style={tab==='mixing' ? { background: 'var(--color-bg-card-hover)', color: 'var(--color-text-primary)' } : { color: 'var(--color-text-muted)' }}><FlaskConical size={16} /> Mixing Log</button>
          <button onClick={() => setTab('feeding')} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2" style={tab==='feeding' ? { background: 'var(--color-bg-card-hover)', color: 'var(--color-text-primary)' } : { color: 'var(--color-text-muted)' }}><Droplets size={16} /> Feeding Log</button>
        </div>
      </div>

      <div className="px-5 pb-6">
        {tab === 'mixing' ? (
          <>
            <div className="flex justify-end mb-4"><button onClick={() => setShowMixForm(true)} className="btn-primary"><Plus size={16} /> Log Mix</button></div>
            {mixes.length === 0 ? <div className="glass-card-static p-8 text-center"><FlaskConical className="mx-auto mb-3" size={40} style={{ color: 'var(--color-text-muted)' }} /><p style={{ color: 'var(--color-text-muted)' }}>No mixing records yet.</p></div> :
            <div className="space-y-3">{mixes.map(mix => (
              <div key={mix.id} className="glass-card p-4">
                <div className="flex items-start justify-between mb-2"><div><h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{mix.recipe_name}</h3><p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{mix.mix_date} · {mix.volume_liters}L</p></div></div>
                {mix.components && <div className="grid grid-cols-3 gap-2 mt-2 text-center">{[['Masterblend', mix.components.masterblend_g], ['CalNit', mix.components.calcium_nitrate_g], ['MgSO4', mix.components.mgso4_g]].map(([label, val]) => (
                  <div key={label} className="rounded-lg p-2" style={{ background: 'var(--color-bg-card)' }}><p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{label}</p><p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{val}g</p></div>
                ))}</div>}
                <div className="grid grid-cols-4 gap-2 mt-2 text-center text-[10px]">{[['Target EC', mix.target_ec], ['Actual EC', mix.actual_ec], ['Target pH', mix.target_ph], ['Actual pH', mix.actual_ph]].map(([label, val]) => <div key={label}><span style={{ color: 'var(--color-text-muted)' }}>{label}</span><p className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{val || '—'}</p></div>)}</div>
                {mix.applied_to && <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>Applied to: {mix.applied_to}</p>}
                {mix.notes && <p className="text-xs italic mt-1" style={{ color: 'var(--color-text-muted)' }}>{mix.notes}</p>}
              </div>
            ))}</div>}
          </>
        ) : (
          <>
            <div className="flex justify-end mb-4"><button onClick={() => setShowFeedForm(true)} className="btn-primary"><Plus size={16} /> Log Feed</button></div>
            {feeds.length === 0 ? <div className="glass-card-static p-8 text-center"><Droplets className="mx-auto mb-3" size={40} style={{ color: 'var(--color-text-muted)' }} /><p style={{ color: 'var(--color-text-muted)' }}>No feeding records yet.</p></div> :
            <div className="space-y-3">{feeds.map(feed => (
              <div key={feed.id} className="glass-card p-4">
                <div className="flex items-start justify-between"><div><h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{feed.product_applied}</h3><p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{feed.feed_date} · {feed.zone||getCropName(feed.batch_id)} · {feed.dosage}</p></div><div className="text-right text-[10px]">{feed.ec_after && <p style={{ color: 'var(--color-text-secondary)' }}>EC: {feed.ec_after}</p>}{feed.ph_after && <p style={{ color: 'var(--color-text-secondary)' }}>pH: {feed.ph_after}</p>}</div></div>
                {feed.notes && <p className="text-xs italic mt-2" style={{ color: 'var(--color-text-muted)' }}>{feed.notes}</p>}
              </div>
            ))}</div>}
          </>
        )}
      </div>

      {/* MIX FORM */}
      {showMixForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowMixForm(false)}>
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--color-bg-overlay)' }} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up rounded-t-3xl sm:rounded-3xl" style={{ background: 'var(--color-bg-modal)', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 px-6 pt-6 pb-4 flex items-center justify-between" style={{ background: 'var(--color-bg-modal)' }}><h2 className="text-lg font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Log Nutrient Mix</h2><button onClick={() => setShowMixForm(false)} className="p-2 rounded-lg hover:opacity-70"><X size={20} style={{ color: 'var(--color-text-muted)' }} /></button></div>
            <form onSubmit={handleMixSubmit} className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Date *</label><input type="date" required value={mixForm.mix_date} onChange={e => setMixForm({...mixForm, mix_date: e.target.value})} className="input-field" /></div><div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Volume (L) *</label><input type="number" required min="0" step="0.5" value={mixForm.volume_liters} onChange={e => setMixForm({...mixForm, volume_liters: e.target.value})} className="input-field" placeholder="20" /></div></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Recipe Name</label><input type="text" value={mixForm.recipe_name} onChange={e => setMixForm({...mixForm, recipe_name: e.target.value})} className="input-field" /></div>
              <div className="grid grid-cols-3 gap-3">{[['Masterblend (g)', 'masterblend_g', '12'], ['CalNit (g)', 'calcium_nitrate_g', '11'], ['MgSO4 (g)', 'mgso4_g', '6']].map(([label, key, ph]) => <div key={key}><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>{label}</label><input type="number" min="0" step="0.1" value={mixForm[key]} onChange={e => setMixForm({...mixForm, [key]: e.target.value})} className="input-field" placeholder={ph} /></div>)}</div>
              <div className="grid grid-cols-2 gap-3">{[['Target EC', 'target_ec', '1.8'], ['Target pH', 'target_ph', '6.0']].map(([label, key, ph]) => <div key={key}><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>{label}</label><input type="number" step="0.1" value={mixForm[key]} onChange={e => setMixForm({...mixForm, [key]: e.target.value})} className="input-field" placeholder={ph} /></div>)}</div>
              <div className="grid grid-cols-2 gap-3">{[['Actual EC', 'actual_ec'], ['Actual pH', 'actual_ph']].map(([label, key]) => <div key={key}><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>{label}</label><input type="number" step="0.1" value={mixForm[key]} onChange={e => setMixForm({...mixForm, [key]: e.target.value})} className="input-field" /></div>)}</div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Applied To</label><input type="text" value={mixForm.applied_to} onChange={e => setMixForm({...mixForm, applied_to: e.target.value})} className="input-field" placeholder="Hydro Bay A — Basil, Mint" /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Notes</label><textarea value={mixForm.notes} onChange={e => setMixForm({...mixForm, notes: e.target.value})} className="input-field" rows={2} /></div>
              <button type="submit" className="btn-primary w-full justify-center !py-3">Log Mix</button>
            </form>
          </div>
        </div>
      )}

      {/* FEED FORM */}
      {showFeedForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowFeedForm(false)}>
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--color-bg-overlay)' }} />
          <div className="relative w-full max-w-lg animate-slide-up rounded-t-3xl sm:rounded-3xl" style={{ background: 'var(--color-bg-modal)', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 flex items-center justify-between"><h2 className="text-lg font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Log Feeding</h2><button onClick={() => setShowFeedForm(false)} className="p-2 rounded-lg hover:opacity-70"><X size={20} style={{ color: 'var(--color-text-muted)' }} /></button></div>
            <form onSubmit={handleFeedSubmit} className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Date *</label><input type="date" required value={feedForm.feed_date} onChange={e => setFeedForm({...feedForm, feed_date: e.target.value})} className="input-field" /></div><div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Zone</label><input type="text" value={feedForm.zone} onChange={e => setFeedForm({...feedForm, zone: e.target.value})} className="input-field" placeholder="Hydro Bay A" /></div></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Batch (optional)</label><select value={feedForm.batch_id} onChange={e => setFeedForm({...feedForm, batch_id: e.target.value})} className="input-field"><option value="">No batch</option>{batches.filter(b => b.status==='Active').map(b => { const crop = crops.find(c => c.id === b.crop_id); return <option key={b.id} value={b.id}>{b.batch_code} — {crop?.common_name||'Unknown'}</option>; })}</select></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Product *</label><input type="text" required value={feedForm.product_applied} onChange={e => setFeedForm({...feedForm, product_applied: e.target.value})} className="input-field" placeholder="Compost tea" /></div><div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Dosage *</label><input type="text" required value={feedForm.dosage} onChange={e => setFeedForm({...feedForm, dosage: e.target.value})} className="input-field" placeholder="2L/pot" /></div></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>EC After</label><input type="number" step="0.1" value={feedForm.ec_after} onChange={e => setFeedForm({...feedForm, ec_after: e.target.value})} className="input-field" /></div><div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>pH After</label><input type="number" step="0.1" value={feedForm.ph_after} onChange={e => setFeedForm({...feedForm, ph_after: e.target.value})} className="input-field" /></div></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Notes</label><textarea value={feedForm.notes} onChange={e => setFeedForm({...feedForm, notes: e.target.value})} className="input-field" rows={2} /></div>
              <button type="submit" className="btn-primary w-full justify-center !py-3">Log Feeding</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default Fertilizer;
