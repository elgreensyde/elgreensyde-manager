import { useState, useEffect } from 'react';
import { Plus, Shield, Bug, Lock, Unlock, X, AlertTriangle, Eye } from 'lucide-react';
import db from '../services/db';

const SEVERITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];
const severityColors = { Low: 'bg-green-500/15 text-green-600', Medium: 'bg-yellow-500/15 text-yellow-600', High: 'bg-orange-500/15 text-orange-500', Critical: 'bg-red-500/15 text-red-500' };

function IPM() {
  const [tab, setTab] = useState('scouting');
  const [scoutings, setScoutings] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [crops, setCrops] = useState([]);
  const [showScoutForm, setShowScoutForm] = useState(false);
  const [showTreatmentForm, setShowTreatmentForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [scoutForm, setScoutForm] = useState({ scout_date: new Date().toISOString().split('T')[0], batch_id: '', zone: '', pest_disease: '', severity: 'Low', action_taken: '', notes: '' });
  const [treatmentForm, setTreatmentForm] = useState({ treatment_date: new Date().toISOString().split('T')[0], batch_id: '', zone: '', treatment_used: '', volume_applied: '', method: 'Foliar spray', withholding_days: '7', notes: '' });

  const load = async () => { const [s, t, b, c] = await Promise.all([db.getAll('ipm_scouting'), db.getAll('ipm_treatments'), db.getAll('batches'), db.getAll('crops')]); setScoutings(s); setTreatments(t); setBatches(b); setCrops(c); setLoading(false); };
  useEffect(() => { load(); }, []);

  const getCropName = (batchId) => { const batch = batches.find(b => b.id === batchId); return batch ? (crops.find(c => c.id === batch.crop_id)?.common_name || '') : ''; };
  const getBatchCode = (batchId) => batches.find(b => b.id === batchId)?.batch_code || '';
  const lockedBatches = batches.filter(b => b.ipm_locked);

  const handleScoutSubmit = async (e) => { e.preventDefault(); await db.insert('ipm_scouting', {...scoutForm}); setShowScoutForm(false); setScoutForm({ scout_date: new Date().toISOString().split('T')[0], batch_id: '', zone: '', pest_disease: '', severity: 'Low', action_taken: '', notes: '' }); load(); };

  const handleTreatmentSubmit = async (e) => {
    e.preventDefault();
    const days = parseInt(treatmentForm.withholding_days)||7;
    const d = new Date(treatmentForm.treatment_date); d.setDate(d.getDate()+days);
    const safeDateStr = d.toISOString().split('T')[0];
    await db.insert('ipm_treatments', { ...treatmentForm, withholding_days: days, safe_harvest_date: safeDateStr });
    if (treatmentForm.batch_id) await db.update('batches', treatmentForm.batch_id, { ipm_locked: true, ipm_unlock_date: safeDateStr, status: 'Active' });
    setShowTreatmentForm(false); setTreatmentForm({ treatment_date: new Date().toISOString().split('T')[0], batch_id: '', zone: '', treatment_used: '', volume_applied: '', method: 'Foliar spray', withholding_days: '7', notes: '' }); load();
    alert(`✅ Treatment logged. Batch locked until ${safeDateStr}.`);
  };

  const daysUntilUnlock = (d) => { if (!d) return 0; const today = new Date(); today.setHours(0,0,0,0); return Math.max(0, Math.ceil((new Date(d)-today)/86400000)); };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-display font-bold mb-1" style={{ color: 'var(--color-text-heading)' }}>IPM — Plant Protection</h1>
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>Integrated Pest Management{lockedBatches.length > 0 && <span className="text-red-500 ml-2">· {lockedBatches.length} locked</span>}</p>

        {lockedBatches.length > 0 && (
          <div className="glass-card-static p-4 border-l-4 border-l-red-500/70 mb-4">
            <div className="flex items-center gap-2 mb-2"><Lock size={16} className="text-red-500" /><h3 className="text-sm font-bold text-red-500">Locked Batches</h3></div>
            <div className="space-y-2">{lockedBatches.map(batch => (
              <div key={batch.id} className="flex items-center justify-between rounded-lg p-2" style={{ background: 'rgba(239,68,68,0.05)' }}>
                <div><span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>{batch.batch_code}</span><span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>{getCropName(batch.crop_id)}</span></div>
                <span className="text-xs text-red-500 font-semibold">🔒 {daysUntilUnlock(batch.ipm_unlock_date)}d left</span>
              </div>
            ))}</div>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={() => setTab('scouting')} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2" style={tab==='scouting' ? { background: 'var(--color-bg-card-hover)', color: 'var(--color-text-primary)' } : { color: 'var(--color-text-muted)' }}><Eye size={16} /> Scouting</button>
          <button onClick={() => setTab('treatments')} className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2" style={tab==='treatments' ? { background: 'var(--color-bg-card-hover)', color: 'var(--color-text-primary)' } : { color: 'var(--color-text-muted)' }}><Shield size={16} /> Treatments</button>
        </div>
      </div>

      <div className="px-5 pb-6">
        {tab === 'scouting' ? (
          <>
            <div className="flex justify-end mb-4"><button onClick={() => setShowScoutForm(true)} className="btn-primary"><Plus size={16} /> Log Scouting</button></div>
            {scoutings.length === 0 ? <div className="glass-card-static p-8 text-center"><Bug className="mx-auto mb-3" size={40} style={{ color: 'var(--color-text-muted)' }} /><p style={{ color: 'var(--color-text-muted)' }}>No scouting records yet.</p></div> :
            <div className="space-y-3">{scoutings.map(scout => (
              <div key={scout.id} className="glass-card p-4"><div className="flex items-start justify-between"><div><h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{scout.pest_disease}</h3><p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{scout.scout_date} · {scout.zone||getBatchCode(scout.batch_id)}</p></div><span className={`badge text-[10px] ${severityColors[scout.severity]||''}`}>{scout.severity}</span></div>{scout.action_taken && <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>Action: {scout.action_taken}</p>}{scout.notes && <p className="text-xs italic mt-1" style={{ color: 'var(--color-text-muted)' }}>{scout.notes}</p>}</div>
            ))}</div>}
          </>
        ) : (
          <>
            <div className="flex justify-end mb-4"><button onClick={() => setShowTreatmentForm(true)} className="btn-danger"><Plus size={16} /> Log Treatment</button></div>
            {treatments.length === 0 ? <div className="glass-card-static p-8 text-center"><Shield className="mx-auto mb-3" size={40} style={{ color: 'var(--color-text-muted)' }} /><p style={{ color: 'var(--color-text-muted)' }}>No treatment records yet.</p></div> :
            <div className="space-y-3">{treatments.map(t => {
              const isActive = t.safe_harvest_date > new Date().toISOString().split('T')[0];
              return (
                <div key={t.id} className={`glass-card p-4 border-l-4 ${isActive ? 'border-l-red-500/70' : 'border-l-green-500/30'}`}>
                  <div className="flex items-start justify-between"><div><h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{t.treatment_used}</h3><p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.treatment_date} · {t.zone||getBatchCode(t.batch_id)} · {t.method}</p></div>{isActive ? <span className="badge text-[10px] bg-red-500/15 text-red-500"><Lock size={10} className="mr-1" /> {daysUntilUnlock(t.safe_harvest_date)}d</span> : <span className="badge text-[10px] bg-green-500/15 text-green-600"><Unlock size={10} className="mr-1" /> Safe</span>}</div>
                  <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{t.volume_applied && <span>Volume: {t.volume_applied}</span>}<span>Withholding: {t.withholding_days}d</span><span>Safe: {t.safe_harvest_date}</span></div>
                  {t.notes && <p className="text-xs italic mt-2" style={{ color: 'var(--color-text-muted)' }}>{t.notes}</p>}
                </div>
              );
            })}</div>}
          </>
        )}
      </div>

      {/* SCOUT FORM */}
      {showScoutForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowScoutForm(false)}>
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--color-bg-overlay)' }} />
          <div className="relative w-full max-w-lg animate-slide-up rounded-t-3xl sm:rounded-3xl" style={{ background: 'var(--color-bg-modal)', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 flex items-center justify-between"><h2 className="text-lg font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Log Pest Scouting</h2><button onClick={() => setShowScoutForm(false)} className="p-2 rounded-lg hover:opacity-70"><X size={20} style={{ color: 'var(--color-text-muted)' }} /></button></div>
            <form onSubmit={handleScoutSubmit} className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Date *</label><input type="date" required value={scoutForm.scout_date} onChange={e => setScoutForm({...scoutForm, scout_date: e.target.value})} className="input-field" /></div><div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Severity *</label><select required value={scoutForm.severity} onChange={e => setScoutForm({...scoutForm, severity: e.target.value})} className="input-field">{SEVERITY_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}</select></div></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Batch</label><select value={scoutForm.batch_id} onChange={e => setScoutForm({...scoutForm, batch_id: e.target.value})} className="input-field"><option value="">No batch</option>{batches.filter(b => b.status==='Active'||b.status==='Ready').map(b => { const crop = crops.find(c => c.id === b.crop_id); return <option key={b.id} value={b.id}>{b.batch_code} — {crop?.common_name||''}</option>; })}</select></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Zone</label><input type="text" value={scoutForm.zone} onChange={e => setScoutForm({...scoutForm, zone: e.target.value})} className="input-field" placeholder="Pot Bench 2" /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Pest/Disease *</label><input type="text" required value={scoutForm.pest_disease} onChange={e => setScoutForm({...scoutForm, pest_disease: e.target.value})} className="input-field" placeholder="Aphids, mildew..." /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Action Taken</label><input type="text" value={scoutForm.action_taken} onChange={e => setScoutForm({...scoutForm, action_taken: e.target.value})} className="input-field" placeholder="Manual removal" /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Notes</label><textarea value={scoutForm.notes} onChange={e => setScoutForm({...scoutForm, notes: e.target.value})} className="input-field" rows={2} /></div>
              <button type="submit" className="btn-primary w-full justify-center !py-3">Log Scouting</button>
            </form>
          </div>
        </div>
      )}

      {/* TREATMENT FORM */}
      {showTreatmentForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowTreatmentForm(false)}>
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--color-bg-overlay)' }} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up rounded-t-3xl sm:rounded-3xl" style={{ background: 'var(--color-bg-modal)', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 px-6 pt-6 pb-4 flex items-center justify-between" style={{ background: 'var(--color-bg-modal)' }}><h2 className="text-lg font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Log Treatment</h2><button onClick={() => setShowTreatmentForm(false)} className="p-2 rounded-lg hover:opacity-70"><X size={20} style={{ color: 'var(--color-text-muted)' }} /></button></div>
            <div className="mx-6 mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3"><div className="flex items-center gap-2 mb-1"><AlertTriangle size={14} className="text-red-500" /><span className="text-xs font-bold text-red-500">⚠️ WARNING</span></div><p className="text-xs text-red-500/70">This will LOCK the batch until withholding expires.</p></div>
            <form onSubmit={handleTreatmentSubmit} className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Date *</label><input type="date" required value={treatmentForm.treatment_date} onChange={e => setTreatmentForm({...treatmentForm, treatment_date: e.target.value})} className="input-field" /></div><div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Withholding (days) *</label><input type="number" required min="1" value={treatmentForm.withholding_days} onChange={e => setTreatmentForm({...treatmentForm, withholding_days: e.target.value})} className="input-field" /></div></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Batch *</label><select required value={treatmentForm.batch_id} onChange={e => setTreatmentForm({...treatmentForm, batch_id: e.target.value})} className="input-field"><option value="">Select batch...</option>{batches.filter(b => b.status==='Active'||b.status==='Ready').map(b => { const crop = crops.find(c => c.id === b.crop_id); return <option key={b.id} value={b.id}>{b.batch_code} — {crop?.common_name||''}</option>; })}</select></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Treatment *</label><input type="text" required value={treatmentForm.treatment_used} onChange={e => setTreatmentForm({...treatmentForm, treatment_used: e.target.value})} className="input-field" placeholder="Neem oil 2%" /></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Volume</label><input type="text" value={treatmentForm.volume_applied} onChange={e => setTreatmentForm({...treatmentForm, volume_applied: e.target.value})} className="input-field" placeholder="1.5L" /></div><div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Method</label><select value={treatmentForm.method} onChange={e => setTreatmentForm({...treatmentForm, method: e.target.value})} className="input-field"><option value="Foliar spray">Foliar spray</option><option value="Soil drench">Soil drench</option><option value="Manual removal">Manual removal</option><option value="Biological control">Biological</option><option value="Other">Other</option></select></div></div>
              {treatmentForm.treatment_date && treatmentForm.withholding_days && <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20"><p className="text-xs text-red-500">🔒 Batch locked until: <strong>{(() => { const d = new Date(treatmentForm.treatment_date); d.setDate(d.getDate()+parseInt(treatmentForm.withholding_days||7)); return d.toISOString().split('T')[0]; })()}</strong></p></div>}
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Notes</label><textarea value={treatmentForm.notes} onChange={e => setTreatmentForm({...treatmentForm, notes: e.target.value})} className="input-field" rows={2} /></div>
              <button type="submit" className="btn-danger w-full justify-center !py-3"><Lock size={16} /> Log Treatment & Lock Batch</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default IPM;
