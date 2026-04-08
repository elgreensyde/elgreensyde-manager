import { useState, useEffect } from 'react';
import { ShieldAlert, Beaker, Search, Calendar, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import db from '../services/db';
import { confirmAction } from '../services/dialogService';
function Maintenance() {
  const [logs, setLogs] = useState([]);
  const [plots, setPlots] = useState([]);
  const [batches, setBatches] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const defaultForm = {
    event_date: new Date().toISOString().split('T')[0],
    action_category: 'Fertilize', 
    target_type: 'plot', // 'plot' or 'batch'
    target_ids: [],
    method_product: '',
    dosage_rate: '',
    notes: ''
  };
  const [form, setForm] = useState(defaultForm);

  const load = async () => {
    const [m, p, b] = await Promise.all([
      db.getAll('maintenance_logs') || [],
      db.getAll('plots') || [],
      db.getAll('batches') || []
    ]);
    
    setLogs(m || []);
    setPlots(p || []);
    setBatches(b || []);
    setLoading(false);
  };
  
  useEffect(() => { load(); }, []);

  const getTargetName = (log) => {
    if (log.target_ids && Array.isArray(log.target_ids) && log.target_ids.length > 0) {
      if (log.plot_id || (log.target_type === 'plot')) {
        const names = log.target_ids.map(id => plots.find(p => p.plot_id === id || p.id === id)?.plot_code).filter(Boolean);
        return names.length > 0 ? `Plots: ${names.join(', ')}` : 'Multiple Plots';
      }
      const names = log.target_ids.map(id => batches.find(b => b.batch_id === id || b.id === id)?.batch_code).filter(Boolean);
      return names.length > 0 ? `Batches: ${names.join(', ')}` : 'Multiple Batches';
    }
    if (log.plot_id) {
       const p = plots.find(x => x.plot_id === log.plot_id || x.id === log.plot_id);
       return p ? `Plot: ${p.plot_code}` : 'Unknown Plot';
    }
    if (log.batch_id) {
       const b = batches.find(x => x.batch_id === log.batch_id || x.id === log.batch_id);
       return b ? `Batch: ${b.batch_code}` : 'Unknown Batch';
    }
    return 'Farm General';
  };

  const filteredLogs = logs.filter(l => {
    const target = getTargetName(l).toLowerCase();
    return !search || l.method_product?.toLowerCase().includes(search.toLowerCase()) || 
           l.action_category?.toLowerCase().includes(search.toLowerCase()) || 
           target.includes(search.toLowerCase());
  }).sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (form.target_ids.length === 0) {
      toast.error('Please select at least one target.');
      return;
    }

    try {
      const dbPayload = {
        event_date: form.event_date,
        action_category: form.action_category,
        method_product: form.method_product,
        dosage_rate: form.dosage_rate,
        notes: form.notes,
        target_ids: form.target_ids,
        plot_id: null, // Legacy fields silenced
        batch_id: null
      };

      await db.insert('maintenance_logs', dbPayload);

      // Auto-generate follow-up tasks
      if (form.action_category === 'Fertilize' || form.action_category === 'Pest Treatment') {
        const followUpDays = form.action_category === 'Fertilize' ? 7 : 3;
        const futureDate = new Date(form.event_date);
        futureDate.setDate(futureDate.getDate() + followUpDays);
        
        const taskTitle = form.action_category === 'Fertilize' 
          ? `Check ${form.target_ids.length} targets for response to ${form.method_product}`
          : `Monitor ${form.target_ids.length} targets for pest recovery`;

        await db.insert('tasks', {
          title: taskTitle,
          due_date: futureDate.toISOString().split('T')[0],
          priority: form.action_category === 'Pest Treatment' ? 'High' : 'Medium',
          is_auto_generated: true
        });
      }
      
      toast.success(`Successfully logged action for ${form.target_ids.length} targets!`);
    } catch (err) {
      alert(err.message);
      console.error("Batch log error:", err);
      toast.error("Failed to log all actions.");
    }

    setShowModal(false);
    setForm(defaultForm);
    load();
  };

  const deleteLog = async (logId) => { 
    if (await confirmAction('Delete this log?')) { 
      try {
        await db.delete('maintenance_logs', logId); 
        load(); 
      } catch (err) {
        alert(err.message);
        toast.error('Failed to delete log.');
      }
    } 
  };

  const getIcon = (cat) => {
    if (cat === 'Pest Treatment' || cat === 'Scouting') return <ShieldAlert size={16} className="text-red-500" />;
    return <Beaker size={16} className="text-blue-500" />;
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter flex flex-col h-screen overflow-hidden">
      <div className="px-5 pt-6 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Maintenance & Actions</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Unified Application Log</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={18} /><span className="hidden sm:inline">Log Action</span>
          </button>
        </div>
        
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input type="text" placeholder="Search treatments, plots, batches..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {filteredLogs.length === 0 ? (
          <div className="glass-card-static p-8 text-center border border-dashed border-gray-600/30">
            <Beaker size={32} className="mx-auto mb-3 opacity-50 text-gray-500" />
            <p className="text-sm text-gray-500">No maintenance records found.</p>
            <p className="text-xs mt-1 text-gray-600">Start logging your fertilizing and pest control actions here.</p>
          </div>
        ) : (
          <div className="space-y-3">
             {filteredLogs.map(log => (
                <div key={log.log_id || log.id} className="glass-card p-4 border-l-4 select-none" style={{borderLeftColor: log.action_category === 'Fertilize' ? '#3b82f6' : '#ef4444'}}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs uppercase font-bold tracking-wider text-themed-muted flex items-center gap-1">
                      {getIcon(log.action_category)} {log.action_category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-themed-muted flex items-center gap-1"><Calendar size={12}/> {log.event_date}</span>
                      <button onClick={(e) => { e.stopPropagation(); deleteLog(log.log_id || log.id); }} className="text-red-500/40 hover:text-red-500 p-3 -m-3 rounded-lg flex items-center justify-center transition-colors"><X size={18}/></button>
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-themed-heading text-lg">{log.method_product}</h3>
                  
                  <div className="flex justify-between items-end mt-3">
                    <div>
                      <p className="text-sm text-themed-muted">Target: <span className="font-bold text-themed-primary">{getTargetName(log)}</span></p>
                      {log.dosage_rate && <p className="text-xs text-themed-muted mt-1 font-medium">Dosage: {log.dosage_rate}</p>}
                    </div>
                  </div>
                  
                  {log.notes && (
                    <div className="mt-3 bg-themed-secondary/10 p-2 rounded-xl text-xs text-themed-secondary italic border border-themed/20">
                      "{log.notes}"
                    </div>
                  )}
                </div>
             ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-3xl p-6 border" style={{ background: 'var(--color-bg-modal)', borderColor: 'var(--color-border)' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-themed-heading flex items-center gap-2"><Beaker size={18}/> Log Operation</h2>
              <button onClick={() => setShowModal(false)} className="text-themed-muted hover:text-themed-heading"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Date *</label>
                  <input type="date" required value={form.event_date} onChange={e => setForm({...form, event_date: e.target.value})} className="input-field w-full" />
                </div>
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Category *</label>
                  <select required value={form.action_category} onChange={e => setForm({...form, action_category: e.target.value})} className="input-field w-full">
                    {['Fertilize', 'Pest Treatment', 'Scouting'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-themed-muted block mb-1">Product / Recipe Name *</label>
                <input type="text" required value={form.method_product} onChange={e => setForm({...form, method_product: e.target.value})} className="input-field w-full" placeholder="e.g. Masterblend Tomato Formula" />
              </div>
              
              <div>
                <label className="text-xs text-themed-muted block mb-1">Dosage / Rate Applied</label>
                <input type="text" value={form.dosage_rate} onChange={e => setForm({...form, dosage_rate: e.target.value})} className="input-field w-full" placeholder="e.g. 2.4 ECU or 5ml/L" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-black/5 border border-white/5 rounded-xl mt-2">
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Target Group</label>
                  <select value={form.target_type} onChange={e => setForm({...form, target_type: e.target.value, target_ids: []})} className="input-field w-full !bg-white/5">
                    <option value="plot">Plot Database</option>
                    <option value="batch">Batch Database</option>
                  </select>
                  <div className="mt-2 text-[10px] text-gray-500">Pick the group you are spraying and then check off all individual beds/pots below.</div>
                </div>
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Select Targets *</label>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2 max-h-32 overflow-y-auto space-y-1">
                    {form.target_type === 'plot' ? (
                      plots.filter(p => p.status !== 'Cleared').map(p => (
                        <label key={p.plot_id || p.id} className="flex items-center gap-2 p-1.5 hover:bg-white/5 rounded cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-600 bg-black/20 text-blue-500 focus:ring-blue-500/30"
                            checked={form.target_ids.includes(p.plot_id || p.id)}
                            onChange={(e) => {
                              const id = p.plot_id || p.id;
                              if (e.target.checked) setForm({...form, target_ids: [...form.target_ids, id]});
                              else setForm({...form, target_ids: form.target_ids.filter(x => x !== id)});
                            }}
                          />
                          <span className="text-xs text-gray-200">{p.plot_code} <span className="text-gray-500">({p.status})</span></span>
                        </label>
                      ))
                    ) : (
                      batches.filter(b => b.status === 'Nursery').map(b => (
                        <label key={b.batch_id || b.id} className="flex items-center gap-2 p-1.5 hover:bg-white/5 rounded cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-600 bg-black/20 text-blue-500 focus:ring-blue-500/30"
                            checked={form.target_ids.includes(b.batch_id || b.id)}
                            onChange={(e) => {
                              const id = b.batch_id || b.id;
                              if (e.target.checked) setForm({...form, target_ids: [...form.target_ids, id]});
                              else setForm({...form, target_ids: form.target_ids.filter(x => x !== id)});
                            }}
                          />
                          <span className="text-xs text-gray-200">{b.batch_code} <span className="text-gray-500">({b.status})</span></span>
                        </label>
                      ))
                    )}
                    {(form.target_type === 'plot' ? plots.filter(p=>p.status !== 'Cleared') : batches.filter(b=>b.status==='Nursery')).length === 0 && (
                      <div className="text-xs text-gray-500 p-2 italic">No active targets found.</div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-themed-muted block mb-1">Notes</label>
                <input type="text" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="input-field w-full" placeholder="Observations..." />
              </div>

              <button type="submit" disabled={form.target_ids.length === 0} className="btn-primary w-full py-3 mt-2 justify-center disabled:opacity-50">Record {form.target_ids.length > 0 ? form.target_ids.length : ''} Logs</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Maintenance;
