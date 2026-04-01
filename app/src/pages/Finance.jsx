import { useState, useEffect, useMemo } from 'react';
import { DollarSign, Plus, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import db from '../services/db';

const EXPENSE_CATEGORIES = ['Seeds', 'Fertilizers', 'Packaging', 'Equipment', 'Utilities', 'Labor', 'Transport', 'Miscellaneous'];

function Finance() {
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [crops, setCrops] = useState([]);
  const [batches, setBatches] = useState([]);
  const [period, setPeriod] = useState('month');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ expense_date: new Date().toISOString().split('T')[0], category: 'Miscellaneous', description: '', amount: '', batch_id: '', notes: '' });

  const load = async () => { const [s, e, c, b] = await Promise.all([db.getAll('sales'), db.getAll('expenses'), db.getAll('crops'), db.getAll('batches')]); setSales(s); setExpenses(e); setCrops(c); setBatches(b); setLoading(false); };
  useEffect(() => { load(); }, []);

  const getDateRange = () => { const now = new Date(); let start; if (period==='week') { start=new Date(now); start.setDate(start.getDate()-7); } else if (period==='month') { start=new Date(now.getFullYear(),now.getMonth(),1); } else { start=new Date(now.getFullYear(),0,1); } return start.toISOString(); };

  const filteredSales = useMemo(() => { const since = getDateRange(); return sales.filter(s => (s.sale_date||s.created_at) >= since); }, [sales, period]);
  const filteredExpenses = useMemo(() => { const since = getDateRange().split('T')[0]; return expenses.filter(e => e.expense_date >= since); }, [expenses, period]);

  const totalRevenue = filteredSales.reduce((sum,s) => sum+(parseFloat(s.total_amount)||0), 0);
  const totalExpenses = filteredExpenses.reduce((sum,e) => sum+(parseFloat(e.amount)||0), 0);
  const grossProfit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : 0;

  const cropRevenue = useMemo(() => { const map = {}; filteredSales.forEach(sale => { const batch = batches.find(b => b.id === sale.batch_id); const crop = batch ? crops.find(c => c.id === batch.crop_id) : null; const name = crop?.common_name||'Unknown'; map[name]=(map[name]||0)+(parseFloat(sale.total_amount)||0); }); return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0,5); }, [filteredSales, batches, crops]);

  const expenseByCategory = useMemo(() => { const map = {}; filteredExpenses.forEach(e => { map[e.category]=(map[e.category]||0)+(parseFloat(e.amount)||0); }); return Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0,5); }, [filteredExpenses]);

  const recentTransactions = useMemo(() => { return [...filteredSales.map(s => ({...s, type:'sale', date: s.sale_date||s.created_at})), ...filteredExpenses.map(e => ({...e, type:'expense', date: e.expense_date||e.created_at}))].sort((a,b) => (b.date||'').localeCompare(a.date||'')).slice(0,15); }, [filteredSales, filteredExpenses]);

  const handleSubmit = async (e) => { e.preventDefault(); await db.insert('expenses', { ...form, amount: parseFloat(form.amount)||0, batch_id: form.batch_id||null }); setShowExpenseForm(false); setForm({ expense_date: new Date().toISOString().split('T')[0], category: 'Miscellaneous', description: '', amount: '', batch_id: '', notes: '' }); load(); };

  const fmt = (a) => `₱${parseFloat(a).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div><h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Finance</h1><p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Profit & Loss Overview</p></div>
          <button onClick={() => setShowExpenseForm(true)} className="btn-secondary"><Plus size={18} /> Expense</button>
        </div>
        <div className="flex gap-2 mb-5">{[{key:'week',label:'This Week'},{key:'month',label:'This Month'},{key:'year',label:'This Year'}].map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)} className="px-4 py-2 rounded-xl text-xs font-medium transition-colors" style={period === p.key ? { background: 'var(--color-bg-card-hover)', color: 'var(--color-text-primary)' } : { color: 'var(--color-text-muted)' }}>{p.label}</button>
        ))}</div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="glass-card-static p-4"><div className="flex items-center gap-2 mb-1"><ArrowUpRight size={16} className="text-green-500" /><span className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Revenue</span></div><p className="text-xl font-bold font-display text-green-500">{fmt(totalRevenue)}</p><p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{filteredSales.length} sales</p></div>
          <div className="glass-card-static p-4"><div className="flex items-center gap-2 mb-1"><ArrowDownRight size={16} className="text-red-500" /><span className="text-[10px] uppercase font-semibold tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Expenses</span></div><p className="text-xl font-bold font-display text-red-500">{fmt(totalExpenses)}</p><p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{filteredExpenses.length} entries</p></div>
        </div>

        <div className={`glass-card-static p-5 mb-5 border-2 ${grossProfit >= 0 ? 'border-green-500/20' : 'border-red-500/20'}`}>
          <div className="flex items-center justify-between">
            <div><span className="text-xs uppercase font-semibold tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Gross Profit</span><p className={`text-3xl font-bold font-display ${grossProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{fmt(grossProfit)}</p></div>
            <div className={`text-right px-4 py-2 rounded-xl ${grossProfit >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}><span className={`text-2xl font-bold ${grossProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{margin}%</span><p className="text-[10px] uppercase" style={{ color: 'var(--color-text-muted)' }}>Margin</p></div>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-5 pb-6">
        {cropRevenue.length > 0 && (
          <section><h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>Top Earning Crops</h2><div className="space-y-2">{cropRevenue.map(([name,rev],i) => (
            <div key={name} className="flex items-center gap-3"><span className="text-xs w-5" style={{ color: 'var(--color-text-muted)' }}>{i+1}.</span><div className="flex-1"><div className="flex items-center justify-between mb-1"><span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{name}</span><span className="text-sm font-semibold" style={{ color: 'var(--color-accent-gold)' }}>{fmt(rev)}</span></div><div className="w-full rounded-full h-1.5" style={{ background: 'var(--color-border)' }}><div className="h-1.5 rounded-full transition-all" style={{ width: `${(rev/cropRevenue[0][1])*100}%`, background: 'var(--color-accent-gold)' }} /></div></div></div>
          ))}</div></section>
        )}

        {expenseByCategory.length > 0 && (
          <section><h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>Top Expense Categories</h2><div className="space-y-2">{expenseByCategory.map(([cat,amt]) => (
            <div key={cat} className="glass-card-static p-3 flex items-center justify-between"><span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{cat}</span><span className="text-sm font-semibold text-red-500">{fmt(amt)}</span></div>
          ))}</div></section>
        )}

        <section><h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>Recent Transactions</h2>
          {recentTransactions.length === 0 ? <div className="glass-card-static p-6 text-center"><DollarSign className="mx-auto mb-2" size={28} style={{ color: 'var(--color-text-muted)' }} /><p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No transactions in this period.</p></div> :
          <div className="space-y-2">{recentTransactions.map(tx => (
            <div key={tx.id} className={`glass-card-static p-3 flex items-center justify-between border-l-4 ${tx.type==='sale'?'border-l-green-500/50':'border-l-red-500/50'}`}>
              <div><p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{tx.type==='sale'?`Sale — ${tx.sell_type||''}`:`${tx.category} — ${tx.description}`}</p><p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{tx.date?.split('T')[0]}</p></div>
              <span className={`text-sm font-bold ${tx.type==='sale'?'text-green-500':'text-red-500'}`}>{tx.type==='sale'?'+':'-'}{fmt(tx.total_amount||tx.amount)}</span>
            </div>
          ))}</div>}
        </section>
      </div>

      {showExpenseForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowExpenseForm(false)}>
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--color-bg-overlay)' }} />
          <div className="relative w-full max-w-lg animate-slide-up rounded-t-3xl sm:rounded-3xl" style={{ background: 'var(--color-bg-modal)', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 flex items-center justify-between"><h2 className="text-lg font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Log Expense</h2><button onClick={() => setShowExpenseForm(false)} className="p-2 rounded-lg hover:opacity-70"><X size={20} style={{ color: 'var(--color-text-muted)' }} /></button></div>
            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
              <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Date *</label><input type="date" required value={form.expense_date} onChange={e => setForm({...form, expense_date: e.target.value})} className="input-field" /></div><div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Category *</label><select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input-field">{EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Description *</label><input type="text" required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-field" placeholder="What was purchased?" /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Amount (₱) *</label><input type="number" required min="0" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="input-field" placeholder="0.00" /></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Link to Batch</label><select value={form.batch_id} onChange={e => setForm({...form, batch_id: e.target.value})} className="input-field"><option value="">No batch</option>{batches.map(b => { const crop = crops.find(c => c.id === b.crop_id); return <option key={b.id} value={b.id}>{b.batch_code} — {crop?.common_name||'Unknown'}</option>; })}</select></div>
              <button type="submit" className="btn-primary w-full justify-center !py-3">Log Expense</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default Finance;
