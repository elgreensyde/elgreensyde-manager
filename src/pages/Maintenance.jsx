import { useState, useEffect } from 'react';
import { ShieldAlert, Beaker, Search, Calendar, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import db from '../services/db';
import supabase from '../lib/supabase';

import { confirmAction } from '../services/dialogService';
function Maintenance() {
  const [logs, setLogs] = useState([]);
  const [plots, setPlots] = useState([]);
  const [batches, setBatches] = useState([]);
  const [consumables, setConsumables] = useState([]);
  const [crops, setCrops] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  
  // Modal
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const defaultForm = {
    event_date: new Date().toISOString().split('T')[0],
    action_category: 'Fertilize', 
    action_reason: 'Routine', // FEAT-017
    target_type: 'plot', // 'plot' or 'batch'
    target_ids: [],
    method_product: '',
    dosage_amount: '',
    dosage_unit: 'ml/L',
    input_id: '', 
    amount_used: '',
    notes: ''
  };
  const [form, setForm] = useState(defaultForm);

  const load = async () => {
    const [m, p, b, c, cr] = await Promise.all([
      db.getAll('maintenance_logs') || [],
      db.getAll('plots') || [],
      db.getAll('batches') || [],
      db.getAll('inputs_inventory') || [],
      db.getAll('crops') || []
    ]);
    
    setLogs(m || []);
    setPlots(p || []);
    setBatches(b || []);
    setConsumables(c || []);
    setCrops(cr || []);
    setLoading(false);
  };

  
  useEffect(() => { load(); }, []);

  const getTargetName = (log) => {
    if (log.target_ids && Array.isArray(log.target_ids) && log.target_ids.length > 0) {
      if (log.plot_id || (log.target_type === 'plot')) {
        const names = log.target_ids.map(id => {
          const p = plots.find(x => x.plot_id === id || x.id === id);
          if (!p) return null;
          const crop = crops.find(c => c.id === p.crop_id || c.common_name === p.crop_name);
          return `${p.plot_code}${crop ? ` (${crop.common_name})` : ''}`;
        }).filter(Boolean);
        return names.length > 0 ? names.join(', ') : 'Multiple Plots';
      }
      const names = log.target_ids.map(id => {
        const b = batches.find(x => x.batch_id === id || x.id === id);
        if (!b) return null;
        const crop = crops.find(c => c.id === b.crop_id || c.common_name === b.crop_name);
        return `${b.batch_code}${crop ? ` (${crop.common_name})` : ''}`;
      }).filter(Boolean);
      return names.length > 0 ? names.join(', ') : 'Multiple Batches';
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
      const selectedInput = consumables.find(c => c.input_id === form.input_id);
      
      const dbPayload = {
        event_date: form.event_date,
        action_category: form.action_category,
        action_reason: form.action_reason,
        method_product: form.method_product,
        dosage_rate: `${form.dosage_amount} ${form.dosage_unit}`,
        notes: form.notes,
        target_ids: form.target_ids,
        input_id: form.input_id || null, 
        volume_applied: parseFloat(form.amount_used) || 0,
        withholding_period_days: selectedInput ? selectedInput.withholding_days : 0,
        plot_id: null, 
        batch_id: null
      };

      await db.insert('maintenance_logs', dbPayload);

      // V3.2: Automated Inventory Deduction via RPC
      if (form.input_id && form.amount_used > 0) {
        const { error: rpcError } = await supabase.rpc('decrement_inventory', {
          target_sku: form.input_id,
          amount_to_deduct: parseFloat(form.amount_used)
        });
        if (rpcError) console.error("Inventory deduction failed:", rpcError);
        else toast.success(`Deducted ${form.amount_used} from ${selectedInput?.product_name}`);
      }


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

  const getCategoryStyles = (cat) => {
    const styles = {
      'Fertilize': { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
      'Pest Treatment': { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
      'Scouting': { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
      'Pruning': { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' }
    };
    return styles[cat] || styles['Fertilize'];
  };

  const getIcon = (cat) => {
    if (cat === 'Pest Treatment' || cat === 'Scouting') return <ShieldAlert size={14} />;
    return <Beaker size={14} />;
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
             {filteredLogs.map(log => {
                const styles = getCategoryStyles(log.action_category);
                return (
                  <div key={log.log_id || log.id} className="glass-card p-4 flex flex-col gap-3 group">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-wrap gap-2">
                        <div className={`px-2 py-0.5 rounded-full ${styles.bg} ${styles.color} ${styles.border} border text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5`}>
                          {getIcon(log.action_category)} {log.action_category}
                        </div>
                        {log.action_reason && (
                          <div className="px-2 py-0.5 rounded-full bg-white/5 text-themed-muted border border-white/5 text-[9px] font-bold uppercase tracking-wider">
                            {log.action_reason}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-themed-muted flex items-center gap-1 opacity-60"><Calendar size={12}/> {log.event_date}</span>
                        <button onClick={(e) => { e.stopPropagation(); deleteLog(log.log_id || log.id); }} className="text-red-500/20 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><X size={16}/></button>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-bold text-themed-heading text-lg leading-tight">{log.method_product}</h3>
                      <p className="text-[10px] text-themed-muted mt-1 uppercase tracking-tighter">
                         Applied to <span className="text-themed-primary font-bold">{getTargetName(log)}</span>
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-themed-muted uppercase opacity-40">Dosage</span>
                          <span className="text-xs font-bold text-themed-primary">{log.dosage_rate}</span>
                        </div>
                        <div className="w-px h-6 bg-white/5" />
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-themed-muted uppercase opacity-40">Volume</span>
                          <span className="text-xs font-bold text-themed-primary">{log.volume_applied || log.amount_used || 0}</span>
                        </div>
                      </div>
                    </div>
                    
                    {log.notes && (
                      <div className="bg-white/5 p-2 rounded-xl text-xs text-themed-muted italic border border-white/5 leading-relaxed">
                        "{log.notes}"
                      </div>
                    )}
                  </div>
                );
             })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-3xl p-5 sm:p-6 border max-h-[90vh] overflow-y-auto mt-[5vh] sm:mt-0" style={{ background: 'var(--color-bg-modal)', borderColor: 'var(--color-border)' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-themed-heading flex items-center gap-2"><Beaker size={18}/> Log Operation</h2>
              <button onClick={() => setShowModal(false)} className="text-themed-muted hover:text-themed-heading"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Date *</label>
                  <input type="date" required value={form.event_date} onChange={e => setForm({...form, event_date: e.target.value})} className="input-field w-full" />
                </div>
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Category *</label>
                  <select required value={form.action_category} onChange={e => setForm({...form, action_category: e.target.value})} className="input-field w-full">
                    {['Fertilize', 'Pest Treatment', 'Scouting', 'Pruning'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-themed-muted block mb-1">Reason for Action *</label>
                <select required value={form.action_reason} onChange={e => setForm({...form, action_reason: e.target.value})} className="input-field w-full">
                  {['Routine/Schedule', 'Preventative', 'Reactive/Issue Resolution', 'Experiment'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Select Consumable *</label>
                  <select required value={form.input_id} 
                    onChange={e => {
                      const input = consumables.find(c => c.input_id === e.target.value);
                      setForm({...form, input_id: e.target.value, method_product: input ? input.product_name : '' });
                    }} 
                    className="input-field w-full">
                    <option value="">Select Item...</option>
                    {consumables.map(c => <option key={c.input_id} value={c.input_id}>{c.product_name} ({c.current_stock} {c.stock_unit})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Amount Used (ml/g) *</label>
                  <input type="number" required step="0.1" value={form.amount_used} onChange={e => setForm({...form, amount_used: e.target.value})} className="input-field w-full" placeholder="e.g. 50" />
                </div>
              </div>

              <div>
                <label className="text-xs text-themed-muted block mb-1">Product Identity (Auto-filled)</label>
                <input type="text" disabled value={form.method_product} className="input-field w-full opacity-50 cursor-not-allowed" placeholder="Select consumable above..." />
              </div>
              
              <div className="flex gap-2 sm:grid sm:grid-cols-2 sm:gap-4">
                <div className="flex-[3]">
                  <label className="text-xs text-themed-muted block mb-1">Dosage Amount *</label>
                  <input type="number" step="0.01" required value={form.dosage_amount} onChange={e => setForm({...form, dosage_amount: e.target.value})} className="input-field w-full" placeholder="e.g. 2.4" />
                </div>
                <div className="flex-[2]">
                  <label className="text-xs text-themed-muted block mb-1">Unit *</label>
                  <select required value={form.dosage_unit} onChange={e => setForm({...form, dosage_unit: e.target.value})} className="input-field w-full">
                    {['ml/L', 'g/L', 'EC', 'pH', 'mS/cm', 'ppm', 'g/Gal'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
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
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <p className="text-[10px] text-amber-500 font-bold uppercase tracking-tight mb-1">No Active Targets Found</p>
                        <p className="text-[9px] text-themed-muted leading-tight">Ensure you have active plots in the <strong>Cultivation Operations</strong> tab before logging a targeted action.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-themed-muted block mb-1">Notes</label>
                <input type="text" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="input-field w-full" placeholder="Observations..." />
              </div>

              <button 
                type="submit" 
                disabled={form.target_ids.length === 0 || !form.input_id || !form.amount_used || !form.dosage_amount} 
                className="btn-primary w-full py-4 mt-2 justify-center disabled:opacity-30 disabled:grayscale transition-all"
              >
                Record {form.target_ids.length > 0 ? form.target_ids.length : ''} Operations
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Maintenance;
