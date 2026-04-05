import { useState, useEffect, useMemo } from 'react';
import { DollarSign, Plus, X, ArrowUpRight, ArrowDownRight, TrendingDown, AlertTriangle, Info, Trash2 } from 'lucide-react';
import db from '../services/db';
import toast from 'react-hot-toast';

const EXPENSE_CATEGORIES = ['Seeds', 'Fertilizers', 'Packaging', 'Equipment', 'Utilities', 'Labor', 'Transport', 'Miscellaneous'];

function Finance() {
  // Data State
  const [ledger, setLedger] = useState([]);
  const [batches, setBatches] = useState([]);
  const [harvestLogs, setHarvestLogs] = useState([]);
  const [crops, setCrops] = useState([]);
  const [pricing, setPricing] = useState([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState('cash'); // 'cash' or 'efficiency'
  const [period, setPeriod] = useState('month');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [form, setForm] = useState({ entry_date: new Date().toISOString().split('T')[0], category: 'Miscellaneous', description: '', amount: '' });

  const load = async () => {
    // In actual implementation, these fetch from the V2 schema.
    const [l, b, h, c, p] = await Promise.all([
      db.getAll('financial_ledger') || [],
      db.getAll('batches') || [],
      db.getAll('harvest_logs') || [],
      db.getAll('crops') || [],
      db.getAll('pricing') || []
    ]);
    
    setLedger(l || []);
    setBatches(b || []);
    setHarvestLogs(h || []);
    setCrops(c || []);
    setPricing(p || []);
    setLoading(false);
  };
  
  useEffect(() => { load(); }, []);

  // Filter ranges
  const getDateRange = () => { 
    const now = new Date(); let start; 
    if (period === 'week') { start = new Date(now); start.setDate(start.getDate()-7); } 
    else if (period === 'month') { start = new Date(now.getFullYear(),now.getMonth(),1); } 
    else { start = new Date(now.getFullYear(),0,1); } 
    return start.toISOString(); 
  };

  const filteredLedger = useMemo(() => { 
    const since = getDateRange().split('T')[0]; 
    return ledger.filter(entry => (entry.entry_date?.split('T')[0] || entry.created_at?.split('T')[0]) >= since); 
  }, [ledger, period]);

  // PANEL A: Cash P&L Calcs
  const totalRevenue = filteredLedger.filter(l => l.entry_type === 'Revenue').reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const totalExpenses = filteredLedger.filter(l => l.entry_type === 'Direct Expense').reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const netCash = totalRevenue - totalExpenses;

  // PANEL B: Efficiency & Losses (Non-cash)
  const calculateEfficiency = () => {
    let lostPotsValue = 0;
    let culledWeightValue = 0;
    
    // Mock retail price for dead pots calculation (roughly 150/pot)
    batches.forEach(b => {
      const mortality = b.mortality || (b.initial_quantity - b.market_ready_quantity);
      if (mortality > 0) lostPotsValue += (mortality * 150);
    });

    // Mock cull weight value (roughly 2.00/gram)
    harvestLogs.forEach(h => {
      if (h.cull_weight_g > 0) {
        culledWeightValue += (parseFloat(h.cull_weight_g) * 2.0);
      }
    });

    return {
      deadPots: batches.reduce((acc, b) => acc + (b.mortality || 0), 0),
      lostPotsValue,
      culledWeightTotal: harvestLogs.reduce((acc, h) => acc + parseFloat(h.cull_weight_g || 0), 0),
      culledWeightValue,
      totalLostPotential: lostPotsValue + culledWeightValue
    };
  };
  const efficiency = calculateEfficiency();

  const handleSubmit = async (e) => { 
    e.preventDefault(); 
    await db.insert('financial_ledger', { 
      entry_type: 'Direct Expense', 
      amount: parseFloat(form.amount) || 0, 
      description: `${form.category} - ${form.description}`,
      entry_date: form.entry_date
    }); 
    toast.success('Expense recorded!');
    setShowExpenseForm(false); 
    setForm({ entry_date: new Date().toISOString().split('T')[0], category: 'Miscellaneous', description: '', amount: '' }); 
    load(); 
  };

  const deleteEntry = async (id) => {
    if (confirm('Delete this ledger entry?')) {
      await db.delete('financial_ledger', id);
      toast.success('Entry deleted.');
      load();
    }
  };

  const fmt = (a) => `₱${parseFloat(a).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter flex flex-col h-[calc(100vh-60px)]">
      <div className="px-5 pt-6 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Finance & Loss</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Real cash flow vs Operations logic</p>
          </div>
          {activeTab === 'cash' && (
            <button onClick={() => setShowExpenseForm(true)} className="btn-secondary !py-1.5"><Plus size={16} /><span className="hidden sm:inline">Expense</span></button>
          )}
        </div>
        
        {/* Toggle Panel A vs Panel B */}
        <div className="flex bg-black/10 rounded-xl p-1 border" style={{ borderColor: 'var(--color-border)' }}>
          <button onClick={() => setActiveTab('cash')} className={`flex-1 py-2 text-sm font-semibold text-center rounded-lg transition-all ${activeTab === 'cash' ? 'bg-amber-500/20 text-amber-500 shadow-sm' : 'text-gray-500 hover:text-white'}`}>
            <DollarSign size={16} className="inline mr-1"/> Cash P&L
          </button>
          <button onClick={() => setActiveTab('efficiency')} className={`flex-1 py-2 text-sm font-semibold text-center rounded-lg transition-all ${activeTab === 'efficiency' ? 'bg-red-500/20 text-red-500 shadow-sm' : 'text-gray-500 hover:text-white'}`}>
            <TrendingDown size={16} className="inline mr-1"/> Lost Potential
          </button>
        </div>

        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {[{key:'week',label:'This Week'},{key:'month',label:'This Month'},{key:'year',label:'This Year'}].map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)} className="px-3 py-1 text-xs font-medium rounded-lg transition-colors border" style={period === p.key ? { background: 'var(--color-bg-card-hover)', borderColor: 'var(--color-border-hover)', color: 'var(--color-text-primary)' } : { borderColor: 'transparent', color: 'var(--color-text-muted)' }}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-20 mt-2">
        
        {/* PANEL A: CASH P&L */}
        <div className={activeTab === 'cash' ? 'block' : 'hidden'}>
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs">
            <Info size={16} className="shrink-0"/> Shows verified cash flows affecting your bank balance. Estimated values are excluded.
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="glass-card p-4">
              <span className="text-[10px] uppercase font-bold text-gray-400 flex justify-between">Revenue <ArrowUpRight size={12} className="text-green-500"/></span>
              <p className="text-xl font-display font-bold text-green-500 mt-2">{fmt(totalRevenue)}</p>
            </div>
            <div className="glass-card p-4">
              <span className="text-[10px] uppercase font-bold text-gray-400 flex justify-between">Expenses <ArrowDownRight size={12} className="text-red-500"/></span>
              <p className="text-xl font-display font-bold text-red-500 mt-2">{fmt(totalExpenses)}</p>
            </div>
          </div>

          <div className="glass-card-static p-5 mb-6 text-center border-2" style={{ borderColor: netCash >= 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)' }}>
            <span className="text-xs uppercase font-bold text-gray-400">Net Cash Position</span>
            <p className={`text-4xl font-display font-bold mt-2 ${netCash >= 0 ? 'text-green-500' : 'text-red-500'}`}>{fmt(netCash)}</p>
          </div>

          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">Ledger Entries</h3>
          <div className="space-y-2">
            {filteredLedger.length === 0 ? <p className="text-sm text-gray-500 text-center py-4">No entries found.</p> : 
             filteredLedger.map(tx => (
              <div key={tx.ledger_id || tx.id || Math.random()} className={`glass-card p-3 flex justify-between items-center border-l-4 ${tx.entry_type === 'Revenue' ? 'border-l-green-500' : 'border-l-red-500'}`}>
                <div>
                  <p className="text-sm font-semibold">{tx.description || tx.entry_type}</p>
                  <p className="text-[10px] text-gray-400">{tx.entry_date?.split('T')[0]}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-bold ${tx.entry_type === 'Revenue' ? 'text-green-500' : 'text-red-500'}`}>
                    {tx.entry_type === 'Revenue' ? '+' : '-'}{fmt(tx.amount)}
                  </span>
                  <button onClick={() => deleteEntry(tx.ledger_id || tx.id)} className="text-red-400/40 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        </div>


        {/* PANEL B: EFFICIENCY / LOST POTENTIAL */}
        <div className={activeTab === 'efficiency' ? 'block animate-fade-in' : 'hidden'}>
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs">
            <AlertTriangle size={16} className="shrink-0"/> Metrics here reflect wasted stock value. They do not deduct from your cash balance, but highlight process inefficiencies.
          </div>

          <div className="glass-card-static p-5 mb-4 text-center border-2 border-red-500/20 bg-red-500/5">
            <span className="text-xs uppercase font-bold text-red-400">Total Unrealized Revenue (Waste)</span>
            <p className="text-3xl font-display font-bold text-red-500 mt-2">{fmt(efficiency.totalLostPotential)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="glass-card p-4">
              <span className="text-[10px] uppercase font-bold text-gray-400">Potted Mortality</span>
              <p className="text-lg font-bold text-white mt-1">{efficiency.deadPots} dead pots</p>
              <p className="text-xs text-red-400 mt-1">Costing {fmt(efficiency.lostPotsValue)}</p>
            </div>
            <div className="glass-card p-4">
              <span className="text-[10px] uppercase font-bold text-gray-400">Plot Cull Weight</span>
              <p className="text-lg font-bold text-white mt-1">{efficiency.culledWeightTotal}g culled</p>
              <p className="text-xs text-red-400 mt-1">Costing {fmt(efficiency.culledWeightValue)}</p>
            </div>
          </div>

          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">Batch Profitability</h3>
          <div className="space-y-3">
            {batches.map(b => {
               const revenue = b.market_ready_quantity * 150; // Mock calculation
               const margin = b.input_cost && b.input_cost > 0 ? ((revenue - b.input_cost) / revenue * 100).toFixed(0) : 100;
               return (
                 <div key={b.id} className="glass-card-static p-4 border border-white/5">
                   <div className="flex justify-between items-center mb-2">
                     <span className="font-mono text-xs text-gray-400">{b.batch_code}</span>
                     <span className="text-xs font-bold text-green-400">{margin}% Margin</span>
                   </div>
                   <div className="flex justify-between text-sm">
                     <span>Input: <span className="text-red-400">{fmt(b.input_cost || 0)}</span></span>
                     <span>Value: <span className="text-green-500">{fmt(revenue)}</span></span>
                   </div>
                 </div>
               )
            })}
          </div>
        </div>

      </div>

      {/* Expense Modal (Panel A only) */}
      {showExpenseForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowExpenseForm(false)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-3xl p-6" style={{ background: 'var(--color-bg-modal)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-display font-bold text-white">Log Direct Expense</h2>
              <button onClick={() => setShowExpenseForm(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-400 block mb-1">Date *</label><input type="date" required value={form.entry_date} onChange={e => setForm({...form, entry_date: e.target.value})} className="input-field w-full" /></div>
                <div><label className="text-xs text-gray-400 block mb-1">Category *</label><select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input-field w-full">{EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
              </div>
              <div><label className="text-xs text-gray-400 block mb-1">Vendor / Description *</label><input type="text" required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-field w-full" placeholder="What was purchased?" /></div>
              <div><label className="text-xs text-gray-400 block mb-1">Total Amount (₱) *</label><input type="number" required min="0" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="input-field w-full" placeholder="0.00" /></div>
              <button type="submit" className="btn-primary w-full py-3 mt-2">Add to Ledger</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Finance;
