import { useState, useEffect } from 'react';
import { Plus, Package, Search, X, RotateCcw } from 'lucide-react';
import db from '../services/db';

const CATEGORIES = ['Hard Goods', 'Consumable', 'Seeds', 'Fertilizer', 'Packaging', 'Propagation', 'Other'];

function Inventory() {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showRestock, setShowRestock] = useState(null);
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockReason, setRestockReason] = useState('Purchase');
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', category: 'Consumable', current_qty: '', unit: 'pcs', min_threshold: '', cost_per_unit: '', notes: '' });

  const load = async () => { setItems(await db.getAll('inventory_items')); setLoading(false); };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ name: '', category: 'Consumable', current_qty: '', unit: 'pcs', min_threshold: '', cost_per_unit: '', notes: '' }); setEditingItem(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, current_qty: parseFloat(form.current_qty)||0, min_threshold: parseFloat(form.min_threshold)||0, cost_per_unit: parseFloat(form.cost_per_unit)||0 };
    if (editingItem) await db.update('inventory_items', editingItem, data);
    else await db.insert('inventory_items', data);
    setShowForm(false); resetForm(); load();
  };

  const handleRestock = async (itemId) => {
    const qty = parseFloat(restockQty); if (!qty || qty <= 0) return;
    const item = items.find(i => i.id === itemId); if (!item) return;
    await db.update('inventory_items', itemId, { current_qty: (parseFloat(item.current_qty)||0)+qty });
    await db.insert('inventory_log', { item_id: itemId, change_qty: qty, reason: restockReason });
    setShowRestock(null); setRestockQty(''); setRestockReason('Purchase'); load();
  };

  const openEdit = (item) => { setEditingItem(item.id); setForm({ name: item.name||'', category: item.category||'Consumable', current_qty: item.current_qty?.toString()||'0', unit: item.unit||'pcs', min_threshold: item.min_threshold?.toString()||'0', cost_per_unit: item.cost_per_unit?.toString()||'0', notes: item.notes||'' }); setShowForm(true); };
  const deleteItem = async (id) => { if(confirm('Delete this item?')) { await db.delete('inventory_items', id); load(); } };

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).sort((a,b) => { const aL = a.current_qty <= a.min_threshold && a.min_threshold > 0; const bL = b.current_qty <= b.min_threshold && b.min_threshold > 0; if(aL&&!bL) return -1; if(!aL&&bL) return 1; return a.name.localeCompare(b.name); });
  const lowCount = items.filter(i => i.current_qty <= i.min_threshold && i.min_threshold > 0).length;

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div><h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Inventory</h1><p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{items.length} items{lowCount > 0 && <span className="text-red-500 ml-2">· {lowCount} low stock</span>}</p></div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary"><Plus size={18} /><span className="hidden sm:inline">Add Item</span></button>
        </div>
        <div className="relative mb-4"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} /><input type="text" placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" /></div>
      </div>

      <div className="px-5 space-y-3 pb-6">
        {filtered.length === 0 ? (
          <div className="glass-card-static p-8 text-center"><Package className="mx-auto mb-3" size={40} style={{ color: 'var(--color-text-muted)' }} /><p style={{ color: 'var(--color-text-muted)' }} className="mb-4">No inventory items yet.</p><button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary mx-auto"><Plus size={16} /> Add First Item</button></div>
        ) : filtered.map(item => {
          const isLow = item.current_qty <= item.min_threshold && item.min_threshold > 0;
          return (
            <div key={item.id} className={`glass-card p-4 ${isLow ? 'border-l-4 border-l-red-500/70' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1"><div className="flex items-center gap-2"><h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{item.name}</h3>{isLow && <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded animate-pulse-soft">LOW STOCK</span>}</div><div className="flex items-center gap-3 mt-1"><span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.category}</span>{item.cost_per_unit > 0 && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>₱{item.cost_per_unit}/{item.unit}</span>}</div></div>
                <div className="text-right"><div className={`text-lg font-bold ${isLow ? 'text-red-500' : ''}`} style={!isLow ? { color: 'var(--color-text-primary)' } : {}}>{item.current_qty}</div><div className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{item.unit} (min: {item.min_threshold})</div></div>
              </div>
              {item.min_threshold > 0 && <div className="mt-3"><div className="w-full rounded-full h-1.5" style={{ background: 'var(--color-border)' }}><div className={`h-1.5 rounded-full transition-all duration-500 ${isLow ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min((item.current_qty/(item.min_threshold*3))*100,100)}%` }} /></div></div>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => setShowRestock(showRestock === item.id ? null : item.id)} className="btn-primary !text-xs !px-3 !py-1.5"><RotateCcw size={12} /> Restock</button>
                <button onClick={() => openEdit(item)} className="btn-secondary !text-xs !px-3 !py-1.5">Edit</button>
                <button onClick={() => deleteItem(item.id)} className="btn-secondary !text-xs !px-3 !py-1.5 !text-red-500">Delete</button>
              </div>
              {showRestock === item.id && (
                <div className="mt-3 pt-3 flex gap-2 animate-fade-in" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <input type="number" min="0.1" step="0.1" value={restockQty} onChange={e => setRestockQty(e.target.value)} className="input-field flex-1 !py-2" placeholder={`Add ${item.unit}...`} />
                  <select value={restockReason} onChange={e => setRestockReason(e.target.value)} className="input-field w-auto !py-2"><option value="Purchase">Purchase</option><option value="Donation">Donation</option><option value="Return">Return</option><option value="Adjustment">Adjustment</option></select>
                  <button onClick={() => handleRestock(item.id)} className="btn-primary !py-2 !px-3"><Plus size={14} /></button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--color-bg-overlay)' }} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up rounded-t-3xl sm:rounded-3xl" style={{ background: 'var(--color-bg-modal)', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 px-6 pt-6 pb-4 flex items-center justify-between" style={{ background: 'var(--color-bg-modal)' }}>
              <h2 className="text-lg font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>{editingItem ? 'Edit Item' : 'Add Inventory Item'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:opacity-70"><X size={20} style={{ color: 'var(--color-text-muted)' }} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Item Name *</label><input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" placeholder='e.g. 4" Pots' /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Category</label><select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input-field">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Unit</label><select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="input-field">{['pcs','g','kg','liters','ml','bags','packs'].map(u => <option key={u} value={u}>{u}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Current Qty *</label><input type="number" required min="0" step="0.1" value={form.current_qty} onChange={e => setForm({...form, current_qty: e.target.value})} className="input-field" /></div>
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Min Threshold</label><input type="number" min="0" step="0.1" value={form.min_threshold} onChange={e => setForm({...form, min_threshold: e.target.value})} className="input-field" /></div>
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Cost/Unit (₱)</label><input type="number" min="0" step="0.01" value={form.cost_per_unit} onChange={e => setForm({...form, cost_per_unit: e.target.value})} className="input-field" /></div>
              </div>
              <button type="submit" className="btn-primary w-full justify-center !py-3">{editingItem ? 'Update Item' : 'Add Item'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default Inventory;
