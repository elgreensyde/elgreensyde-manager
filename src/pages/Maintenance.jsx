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
  const [trays, setTrays] = useState([]); // FEAT-025
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All'); // FEAT-026
  const [loading, setLoading] = useState(true);

  
  // Modal
  const [showModal, setShowModal] = useState(false);
  
  // Form State
  const defaultForm = {
    event_date: new Date().toISOString().split('T')[0],
    action_category: 'Fertilizer', // Standardized
    action_reason: 'Routine', 
    target_type: 'plot', // 'plot' | 'batch' | 'tray'
    target_ids: [],
    method_product: '',
    dosage_amount: '',
    dosage_unit: 'ml/L',
    input_id: '', 
    amount_used: '',
    labor_minutes: 0, // FEAT-027
    water_volume_l: 0, // FEAT-027
    notes: ''
  };
  const [form, setForm] = useState(defaultForm);

  const load = async () => {
    const [m, p, b, c, cr, t] = await Promise.all([
      db.getAll('maintenance_logs') || [],
      db.getAll('plots') || [],
      db.getAll('batches') || [],
      db.getAll('inputs_inventory') || [],
      db.getAll('crops') || [],
      db.getAll('trays') || [] // FEAT-025
    ]);
    
    setLogs(m || []);
    setPlots(p || []);
    setBatches(b || []);
    setConsumables(c || []);
    setCrops(cr || []);
    setTrays(t || []);
    setLoading(false);
  };

  
  useEffect(() => { load(); }, []);

  const getTargetName = (log) => {
    if (log.target_ids && Array.isArray(log.target_ids) && log.target_ids.length > 0) {
      const type = log.target_type;
      const names = log.target_ids.map(id => {
        let entity;
        if (type === 'plot') entity = plots.find(x => x.plot_id === id || x.id === id);
        else if (type === 'batch') entity = batches.find(x => x.batch_id === id || x.id === id);
        else if (type === 'tray') entity = trays.find(x => x.tray_id === id || x.id === id);
        
        if (!entity) return null;
        const crop = crops.find(c => c.id === entity.crop_id || c.common_name === entity.crop_name);
        const code = entity.plot_code || entity.batch_code || entity.tray_code || 'Unit';
        return `${code}${crop ? ` (${crop.common_name})` : ''}`;
      }).filter(Boolean);
      
      if (names.length === 0) return 'Multiple Units';
      return names.join(', ');
    }
    return 'Farm General';
  };

  const filteredLogs = logs.filter(l => {
    const targetMatch = getTargetName(l).toLowerCase().includes(search.toLowerCase());
    const textMatch = !search || l.method_product?.toLowerCase().includes(search.toLowerCase()) || 
                     l.action_category?.toLowerCase().includes(search.toLowerCase());
    
    // FEAT-026: Category Chip Filtering
    const categoryMatch = activeCategory === 'All' || l.action_category === activeCategory;
    
    return categoryMatch && (textMatch || targetMatch);
  }).sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (form.target_ids.length === 0) {
      toast.error('Please select at least one target.');
      return;
    }

    try {
      const selectedInput = consumables.find(c => c.input_id === form.input_id);
      const isChemical = ['Fertilizer', 'Fungicide', 'Pesticide'].includes(form.action_category);
      
      const dbPayload = {
        event_date: form.event_date,
        action_category: form.action_category,
        action_reason: form.action_reason,
        method_product: isChemical ? form.method_product : (form.action_category === 'Irrigation' ? 'Watering' : 'Physical Maintenance'),
        dosage_rate: isChemical ? `${form.dosage_amount} ${form.dosage_unit}` : '',
        notes: form.notes,
        target_type: form.target_type,
        target_ids: form.target_ids,
        input_id: isChemical ? (form.input_id || null) : null, 
        volume_applied: isChemical ? (parseFloat(form.amount_used) || 0) : 0,
        labor_minutes: parseInt(form.labor_minutes) || 0,
        water_volume_l: parseFloat(form.water_volume_l) || 0,
        withholding_period_days: (isChemical && selectedInput) ? selectedInput.withholding_days : 0,
      };

      await db.insert('maintenance_logs', dbPayload);

      // V3.2: Automated Inventory Deduction via RPC
      if (isChemical && form.input_id && form.amount_used > 0) {
        const { error: rpcError } = await supabase.rpc('decrement_inventory', {
          target_sku: form.input_id,
          amount_to_deduct: parseFloat(form.amount_used)
        });
        if (rpcError) console.error("Inventory deduction failed:", rpcError);
        else toast.success(`Deducted ${form.amount_used} from ${selectedInput?.product_name}`);
      }


      // Auto-generate follow-up tasks
      if (form.action_category === 'Pesticide' || form.action_category === 'Fungicide') {
        const futureDate = new Date(form.event_date);
        futureDate.setDate(futureDate.getDate() + 4);
        
        await db.insert('tasks', {
          title: `Monitor results: ${form.method_product} on ${form.target_ids.length} units`,
          due_date: futureDate.toISOString().split('T')[0],
          priority: 'High',
          is_auto_generated: true
        });
      }
      
      toast.success(`Successfully logged action for ${form.target_ids.length} targets!`);
      setShowModal(false);
      setForm(defaultForm);
      load();
    } catch (err) {
      alert(err.message);
      console.error("Batch log error:", err);
      toast.error("Failed to log all actions.");
      return;
    }
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
      'Fertilizer': { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
      'Fungicide': { color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
      'Pesticide': { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
      'Physical': { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
      'Irrigation': { color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
      'Scouting': { color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
      'System Flag': { color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    };
    return styles[cat] || styles['Fertilizer'];
  };

  const getIcon = (cat) => {
    if (cat === 'Pesticide' || cat === 'Fungicide') return <ShieldAlert size={14} />;
    if (cat === 'Irrigation') return <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />;
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
          <input type="text" placeholder="Search treatments, units..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
        </div>

        {/* FEAT-026: Filter Chips */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
           {['All', 'Fertilizer', 'Fungicide', 'Pesticide', 'Physical', 'Irrigation'].map(cat => {
             const active = activeCategory === cat;
             const styles = getCategoryStyles(cat);
             return (
               <button 
                 key={cat} 
                 onClick={() => setActiveCategory(cat)}
                 className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${active ? `${styles.bg} ${styles.color} ${styles.border}` : 'bg-transparent text-themed-muted border-themed-border opacity-60'}`}
               >
                 {cat}
               </button>
             );
           })}
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
                        {log.dosage_rate && (
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-themed-muted uppercase opacity-40">Dosage</span>
                            <span className="text-xs font-bold text-themed-primary">{log.dosage_rate}</span>
                          </div>
                        )}
                        {(log.volume_applied > 0 || log.amount_used > 0) && (
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-themed-muted uppercase opacity-40">Product Vol</span>
                            <span className="text-xs font-bold text-themed-primary">{log.volume_applied || log.amount_used}</span>
                          </div>
                        )}
                        {log.water_volume_l > 0 && (
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-themed-muted uppercase opacity-40">Water Vol</span>
                            <span className="text-xs font-bold text-blue-400 font-mono">{log.water_volume_l}L</span>
                          </div>
                        )}
                        {log.labor_minutes > 0 && (
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-themed-muted uppercase opacity-40">Labor</span>
                            <span className="text-xs font-bold text-amber-500">{log.labor_minutes}m</span>
                          </div>
                        )}
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
                    {['Fertilizer', 'Fungicide', 'Pesticide', 'Physical', 'Irrigation', 'Scouting'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* REASON */}
              <div>
                <label className="text-xs text-themed-muted block mb-1">Reason for Action *</label>
                <select required value={form.action_reason} onChange={e => setForm({...form, action_reason: e.target.value})} className="input-field w-full">
                  {['Routine/Schedule', 'Preventative', 'Reactive/Issue Resolution', 'Experiment'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* DYNAMIC FIELDS BASED ON CATEGORY (FEAT-027) */}
              {['Fertilizer', 'Fungicide', 'Pesticide'].includes(form.action_category) ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
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
                </div>
              ) : form.action_category === 'Irrigation' ? (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                   <div>
                    <label className="text-xs text-themed-muted block mb-1">Water Vol (Liters) *</label>
                    <input type="number" required step="0.5" value={form.water_volume_l} onChange={e => setForm({...form, water_volume_l: e.target.value})} className="input-field w-full" placeholder="e.g. 20" />
                  </div>
                  <div>
                    <label className="text-xs text-themed-muted block mb-1">Labor (Minutes)</label>
                    <input type="number" value={form.labor_minutes} onChange={e => setForm({...form, labor_minutes: e.target.value})} className="input-field w-full" placeholder="e.g. 15" />
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-xs text-themed-muted block mb-1">Labor Duration (Minutes) *</label>
                  <input type="number" required value={form.labor_minutes} onChange={e => setForm({...form, labor_minutes: e.target.value})} className="input-field w-full" placeholder="e.g. 45" />
                </div>
              )}


              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-black/5 border border-white/5 rounded-xl mt-2">
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Target Group</label>
                  <select value={form.target_type} onChange={e => setForm({...form, target_type: e.target.value, target_ids: []})} className="input-field w-full !bg-white/5">
                    <option value="plot">Plot Database</option>
                    <option value="batch">Batch Database</option>
                    <option value="tray">Propagation Trays</option>
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
                    ) : form.target_type === 'batch' ? (
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
                    ) : (
                      trays.filter(t => t.status !== 'Completed').map(t => (
                        <label key={t.tray_id || t.id} className="flex items-center gap-2 p-1.5 hover:bg-white/5 rounded cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-600 bg-black/20 text-amber-500 focus:ring-amber-500/30"
                            checked={form.target_ids.includes(t.tray_id || t.id)}
                            onChange={(e) => {
                              const id = t.tray_id || t.id;
                              if (e.target.checked) setForm({...form, target_ids: [...form.target_ids, id]});
                              else setForm({...form, target_ids: form.target_ids.filter(x => x !== id)});
                            }}
                          />
                          <span className="text-xs text-gray-200">{t.tray_code} <span className="text-gray-500">({t.status})</span></span>
                        </label>
                      ))
                    )}
                    {(form.target_type === 'plot' ? plots.filter(p=>p.status !== 'Cleared') : form.target_type === 'batch' ? batches.filter(b=>b.status==='Nursery') : trays.filter(t=>t.status!=='Completed')).length === 0 && (
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
                disabled={form.target_ids.length === 0 || (['Fertilizer', 'Fungicide', 'Pesticide'].includes(form.action_category) && (!form.input_id || !form.amount_used || !form.dosage_amount)) || (form.action_category === 'Irrigation' && !form.water_volume_l) || (form.action_category === 'Physical' && !form.labor_minutes)} 
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
