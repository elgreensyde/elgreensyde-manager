import { useState, useEffect, useMemo } from 'react';
import { DollarSign, Plus, X, ArrowUpRight, ArrowDownRight, TrendingDown, AlertTriangle, Info, Trash2, Zap, LayoutGrid, BarChart3, Target } from 'lucide-react';
import db from '../services/db';
import supabase from '../lib/supabase';
import toast from 'react-hot-toast';
import { confirmAction } from '../services/dialogService';

const EXPENSE_CATEGORIES = ['Seeds', 'Fertilizers', 'Packaging', 'Equipment', 'Utilities', 'Labor', 'Transport', 'Miscellaneous'];

function Finance() {
  // Data State
  const [ledger, setLedger] = useState([]);
  const [batches, setBatches] = useState([]);
  const [harvestLogs, setHarvestLogs] = useState([]);
  const [crops, setCrops] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [orders, setOrders] = useState([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState('cash'); // 'cash' | 'efficiency' | 'intelligence'
  const [period, setPeriod] = useState('month');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [form, setForm] = useState({ entry_date: new Date().toISOString().split('T')[0], category: 'Miscellaneous', description: '', amount: '' });

  const load = async () => {
    try {
      const [l, b, h, c, p, o] = await Promise.all([
        db.getAll('financial_ledger'),
        db.getAll('batches'),
        db.getAll('harvest_logs'),
        db.getAll('crops'),
        supabase.from('pricing').select('*'),
        supabase.from('orders').select('*')
      ]);
      
      setLedger(l || []);
      setBatches(b || []);
      setHarvestLogs(h || []);
      setCrops(c || []);
      setPricing(p.data || []);
      setOrders(o.data || []);
    } catch (err) {
      console.error('Failed to load finance data:', err);
      toast.error('Partial data load. Check Supabase connection.');
    }
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

  // --- ANALYTICS LOGIC ---

  // 1. Forecasted Revenue (Active, non-draft, non-fulfilled orders)
  const forecastedRevenue = useMemo(() => {
    return orders
      .filter(o => ['Pending', 'Confirmed', 'Packed'].includes(o.status))
      .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
  }, [orders]);

  // 2. Real Batch Intelligence (Using pricing table)
  const intelligence = useMemo(() => {
    const list = batches.map(b => {
      const crop = crops.find(c => c.id === b.crop_id);
      const priceRow = pricing.find(p => p.sku_id === b.sku_id) || pricing.find(p => p.product_name === crop?.common_name);
      const unitPrice = priceRow?.wholesale_price || 150; // fallback to 150
      
      const potentialRevenue = (b.initial_quantity || 0) * unitPrice;
      const actualRevenue = (b.market_ready_quantity || 0) * unitPrice;
      const mortality = (b.initial_quantity || 0) - (b.market_ready_quantity || 0);
      const wasteValue = mortality * unitPrice;
      
      const inputCost = parseFloat(b.input_cost || 0);
      const margin = actualRevenue > 0 ? ((actualRevenue - inputCost) / actualRevenue * 100).toFixed(0) : 0;

      return {
        ...b,
        cropName: crop?.common_name || 'Unknown',
        unitPrice,
        potentialRevenue,
        actualRevenue,
        wasteValue,
        mortality,
        margin: parseInt(margin)
      };
    });

    return {
      all: list,
      moneyMakers: [...list].sort((a, b) => b.margin - a.margin).slice(0, 5),
      spaceTakers: [...list].sort((a, b) => b.wasteValue - a.wasteValue).slice(0, 5),
      totalWaste: list.reduce((sum, b) => sum + b.wasteValue, 0)
    };
  }, [batches, crops, pricing]);

  // PANEL A: Cash P&L Calcs
  const totalRevenue = filteredLedger.filter(l => l.entry_type === 'Revenue').reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const totalExpenses = filteredLedger.filter(l => l.entry_type === 'Direct Expense').reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const netCash = totalRevenue - totalExpenses;

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
    if (await confirmAction('Delete this ledger entry?')) {
      await db.delete('financial_ledger', id);
      toast.success('Entry deleted.');
      load();
    }
  };

  const fmt = (a) => `₱${parseFloat(a).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter flex flex-col h-full overflow-hidden">
      <div className="px-5 pt-6 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Financial Intelligence</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Real cash flow vs Strategic metrics</p>
          </div>
          {activeTab === 'cash' && (
            <button onClick={() => setShowExpenseForm(true)} className="btn-secondary !py-1.5"><Plus size={16} /><span className="hidden sm:inline">Expense</span></button>
          )}
        </div>
        
        {/* Toggle Grid: Cash | Intelligence | Efficiency */}
        <div className="flex bg-black/10 rounded-2xl p-1 border gap-1" style={{ borderColor: 'var(--color-border)' }}>
          <button onClick={() => setActiveTab('cash')} className={`flex-1 py-2 text-xs font-bold text-center rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'cash' ? 'bg-[#10b981] text-white shadow-lg' : 'text-themed-muted hover:text-white'}`}>
            <DollarSign size={14}/> Cash
          </button>
          <button onClick={() => setActiveTab('intelligence')} className={`flex-1 py-2 text-xs font-bold text-center rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'intelligence' ? 'bg-[#10b981] text-white shadow-lg' : 'text-themed-muted hover:text-white'}`}>
            <Zap size={14}/> Intelligence
          </button>
          <button onClick={() => setActiveTab('efficiency')} className={`flex-1 py-2 text-xs font-bold text-center rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'efficiency' ? 'bg-[#f59e0b] text-white shadow-lg' : 'text-themed-muted hover:text-white'}`}>
            <TrendingDown size={14}/> Waste
          </button>
        </div>

        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
          {[{key:'week',label:'This Week'},{key:'month',label:'This Month'},{key:'year',label:'This Year'}].map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors border" style={period === p.key ? { background: 'var(--color-bg-card-hover)', borderColor: 'var(--color-border-hover)', color: 'var(--color-text-primary)' } : { borderColor: 'transparent', color: 'var(--color-text-muted)' }}>{p.label}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 mt-2">
        
        {/* PANEL A: CASH P&L */}
        {activeTab === 'cash' && (
          <div className="animate-fade-in space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-medium leading-tight">
              <Info size={14} className="shrink-0"/> Verified cash flows only. Includes POS sales and fulfilled wholesale orders.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card p-4">
                <span className="text-[10px] uppercase font-bold text-themed-muted flex justify-between">Revenue <ArrowUpRight size={12} className="text-green-500"/></span>
                <p className="text-xl font-display font-bold text-green-500 mt-2">{fmt(totalRevenue)}</p>
              </div>
              <div className="glass-card p-4">
                <span className="text-[10px] uppercase font-bold text-themed-muted flex justify-between">Expenses <ArrowDownRight size={12} className="text-red-500"/></span>
                <p className="text-xl font-display font-bold text-red-500 mt-2">{fmt(totalExpenses)}</p>
              </div>
            </div>

            <div className="glass-card-static p-6 text-center border-2" style={{ borderColor: netCash >= 0 ? '#10b98140' : '#ef444440' }}>
              <span className="text-[10px] uppercase font-bold text-themed-muted tracking-widest">Net Cash Position</span>
              <p className={`text-4xl font-display font-bold mt-2 ${netCash >= 0 ? 'text-green-500' : 'text-red-500'}`}>{fmt(netCash)}</p>
            </div>

            <h3 className="text-[10px] font-bold uppercase tracking-widest text-themed-muted mt-6">Ledger Entries</h3>
            <div className="space-y-2">
              {filteredLedger.length === 0 ? <p className="text-sm text-themed-muted text-center py-8">No ledger active for this period.</p> : 
               filteredLedger.map(tx => (
                <div key={tx.ledger_id || tx.id} className="glass-card p-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{tx.description || tx.entry_type}</p>
                    <p className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{tx.entry_date?.split('T')[0]}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${tx.entry_type === 'Revenue' ? 'text-green-500' : 'text-red-500'}`}>
                      {tx.entry_type === 'Revenue' ? '+' : '-'}{fmt(tx.amount)}
                    </span>
                    <button onClick={() => deleteEntry(tx.ledger_id || tx.id)} className="p-1 hover:text-red-500" style={{ color: 'var(--color-text-muted)' }}><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PANEL INTELLIGENCE: Strategic Forecast */}
        {activeTab === 'intelligence' && (
          <div className="animate-fade-in space-y-5">
            <div className="glass-card-static p-5 border-2 border-emerald-500/20 bg-emerald-500/5">
              <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-widest">30-Day Revenue Forecast</span>
              <p className="text-3xl font-display font-bold text-white mt-2">{fmt(totalRevenue + forecastedRevenue)}</p>
              <div className="flex items-center gap-2 mt-3 p-2 bg-emerald-500/10 rounded-lg">
                <BarChart3 size={14} className="text-emerald-500"/>
                <span className="text-[10px] font-bold text-emerald-400">Includes {fmt(forecastedRevenue)} from active wholesale orders</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-themed-muted">🏆 Money Makers (High Margin)</h3>
                <LayoutGrid size={14} className="text-themed-muted"/>
              </div>
              <div className="space-y-2">
                {intelligence.moneyMakers.map(b => (
                  <div key={b.id} className="glass-card p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{b.cropName}</p>
                      <p className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>Batch: {b.batch_code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-500">{b.margin}% Margin</p>
                      <p className="text-[10px] font-medium text-themed-muted">Net: {fmt(b.actualRevenue - (b.input_cost || 0))}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl border bg-black/5" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-3 mb-2">
                <Target size={16} className="text-[#10b981]"/>
                <span className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>Efficiency Score</span>
              </div>
              <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                <div className="h-full bg-[#10b981]" style={{ width: `${(totalRevenue / (totalRevenue + intelligence.totalWaste) * 100) || 0}%` }} />
              </div>
              <p className="text-[10px] mt-2 text-themed-muted">Ratio of harvested value vs total potential seed-to-scale revenue.</p>
            </div>
          </div>
        )}

        {/* PANEL WASTE: Lost Potential */}
        {activeTab === 'efficiency' && (
          <div className="animate-fade-in space-y-4">
            <div className="glass-card-static p-6 text-center border-2 border-red-500/20 bg-red-500/5">
              <span className="text-[10px] uppercase font-bold text-red-400 tracking-widest">Total Unrealized Revenue (Waste)</span>
              <p className="text-4xl font-display font-bold text-red-500 mt-2">{fmt(intelligence.totalWaste)}</p>
            </div>

            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-themed-muted">⚠️ Space Takers (High Waste Value)</h3>
            </div>
            
            <div className="space-y-2">
              {intelligence.spaceTakers.map(b => (
                <div key={b.id} className="glass-card p-4 flex items-center justify-between border-l-4 border-l-red-500">
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{b.cropName}</p>
                    <p className="text-[10px] font-medium text-red-400/60">Mortality: {b.mortality} units</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-500">{fmt(b.wasteValue)}</p>
                    <p className="text-[10px] font-medium text-themed-muted">Lost revenue potential</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-card p-4 bg-orange-500/5 border-orange-500/20">
              <div className="flex gap-3">
                <AlertTriangle className="text-orange-500 shrink-0" size={18}/>
                <div>
                  <p className="text-xs font-bold text-orange-400">Strategic Pivot Alert</p>
                  <p className="text-[10px] text-orange-400/80 leading-relaxed mt-1">
                    Crops listed above are consuming space and labor but not converting into revenue. Consider adjusting irrigation depth or pivoting space to high-margin crops like Basil.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Expense Modal (Panel A only) */}
      {showExpenseForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowExpenseForm(false)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-3xl p-6" style={{ background: 'var(--color-bg-modal)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-display font-bold text-themed-primary">Log Direct Expense</h2>
              <button onClick={() => setShowExpenseForm(false)} className="text-themed-muted hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-bold uppercase tracking-wider text-themed-muted block mb-1">Date *</label><input type="date" required value={form.entry_date} onChange={e => setForm({...form, entry_date: e.target.value})} className="input-field w-full" /></div>
                <div><label className="text-[10px] font-bold uppercase tracking-wider text-themed-muted block mb-1">Category *</label><select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input-field w-full">{EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
              </div>
              <div><label className="text-[10px] font-bold uppercase tracking-wider text-themed-muted block mb-1">Vendor / Description *</label><input type="text" required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-field w-full" placeholder="What was purchased?" /></div>
              <div><label className="text-[10px] font-bold uppercase tracking-wider text-themed-muted block mb-1">Total Amount (₱) *</label><input type="number" required min="0" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="input-field w-full" placeholder="0.00" /></div>
              <button type="submit" className="btn-primary w-full py-3.5 rounded-2xl text-base font-bold mt-2">Add to Ledger</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Finance;
