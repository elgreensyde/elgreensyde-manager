import { useState, useEffect } from 'react';
import { Plus, Package, Search, X, RotateCcw, Edit3, Trash2 } from 'lucide-react';
import db from '../services/db';

const FORMATS = ['Units', 'Grams'];

function Inventory() {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showRestock, setShowRestock] = useState(null);
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  
  // Restock form states
  const [restockQty, setRestockQty] = useState('');

  const [loading, setLoading] = useState(true);
  
  const defaultForm = { sku_code: '', product_name: '', sales_format: 'Units', current_stock: '', restock_alert_level: '' };
  const [form, setForm] = useState(defaultForm);

  const load = async () => { 
    setItems((await db.getAll('inventory')) || []); 
    setLoading(false); 
  };
  
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm(defaultForm); setEditingItem(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { 
      ...form, 
      current_stock: parseFloat(form.current_stock) || 0, 
      restock_alert_level: parseFloat(form.restock_alert_level) || 0 
    };
    
    if (editingItem) {
      await db.update('inventory', editingItem, data);
    } else {
      await db.insert('inventory', data);
    }
    
    setShowForm(false); 
    resetForm(); 
    load();
  };

  const handleRestock = async (itemId) => {
    const qty = parseFloat(restockQty); 
    if (!qty || qty === 0) return;
    
    const item = items.find(i => i.sku_id === itemId || i.id === itemId); 
    if (!item) return;
    
    // Simple update to inventory bypassing old log table for V2
    await db.update('inventory', item.sku_id || item.id, { 
      current_stock: (parseFloat(item.current_stock) || 0) + qty 
    });
    
    setShowRestock(null); 
    setRestockQty(''); 
    load();
  };

  const openEdit = (item) => { 
    setEditingItem(item.sku_id || item.id); 
    setForm({ 
      sku_code: item.sku_code || '', 
      product_name: item.product_name || '', 
      sales_format: item.sales_format || 'Units', 
      current_stock: item.current_stock?.toString() || '0', 
      restock_alert_level: item.restock_alert_level?.toString() || '0' 
    }); 
    setShowForm(true); 
  };

  const deleteItem = async (id) => { 
    if(confirm('Delete this inventory item? Warning: Could affect linked transactions.')) { 
      await db.delete('inventory', id); 
      load(); 
    } 
  };

  const filtered = items.filter(i => 
    i.product_name?.toLowerCase().includes(search.toLowerCase()) || 
    i.sku_code?.toLowerCase().includes(search.toLowerCase())
  ).sort((a,b) => { 
    const aL = a.current_stock <= a.restock_alert_level && a.restock_alert_level > 0; 
    const bL = b.current_stock <= b.restock_alert_level && b.restock_alert_level > 0; 
    if(aL && !bL) return -1; 
    if(!aL && bL) return 1; 
    return (a.product_name||'').localeCompare(b.product_name||''); 
  });
  
  const lowCount = items.filter(i => i.current_stock <= i.restock_alert_level && i.restock_alert_level > 0).length;

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Live Inventory</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {items.length} SKUs defined 
              {lowCount > 0 && <span className="text-red-500 ml-2 font-bold">· {lowCount} low stock</span>}
            </p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
             <Plus size={18} /><span className="hidden sm:inline">Add SKU</span>
          </button>
        </div>
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input type="text" placeholder="Search SKUs or products..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
      </div>

      <div className="px-5 space-y-3 pb-24">
        {filtered.length === 0 ? (
          <div className="glass-card-static p-8 text-center border border-dashed border-gray-600/30">
            <Package className="mx-auto mb-3 opacity-40" size={40} />
            <p className="mb-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>No inventory items registered in the V2 database.</p>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary mx-auto"><Plus size={16} /> Create First SKU</button>
          </div>
        ) : filtered.map(item => {
          const isLow = item.current_stock <= item.restock_alert_level && item.restock_alert_level > 0;
          return (
            <div key={item.sku_id || item.id} className={`glass-card p-4 ${isLow ? 'border-l-4 border-l-red-500/70' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{item.product_name}</h3>
                    {isLow && <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded animate-pulse-soft">LOW STOCK</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{item.sku_code}</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-lg font-bold font-mono ${isLow ? 'text-red-500' : ''}`} style={!isLow ? { color: 'var(--color-text-primary)' } : {}}>
                    {item.current_stock}
                  </div>
                  <div className="text-[10px] uppercase font-bold" style={{ color: 'var(--color-text-muted)' }}>
                    {item.sales_format} (min: {item.restock_alert_level})
                  </div>
                </div>
              </div>
              
              {item.restock_alert_level > 0 && (
                <div className="mt-3">
                  <div className="w-full rounded-full h-1.5" style={{ background: 'var(--color-border)' }}>
                    <div className={`h-1.5 rounded-full transition-all duration-500 ${isLow ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min((item.current_stock/(item.restock_alert_level*3))*100,100)}%` }} />
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 mt-4 pt-4" style={{borderTop: '1px dashed var(--color-border)'}}>
                <button onClick={() => setShowRestock(showRestock === (item.sku_id || item.id) ? null : (item.sku_id || item.id))} className="btn-secondary !text-xs !px-3 !py-1.5 flex-1 justify-center bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-transparent">
                  <RotateCcw size={12} /> Adjust Stock
                </button>
                <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-black/10 transition-colors" title="Edit"><Edit3 size={14} className="text-gray-400"/></button>
                <button onClick={() => deleteItem(item.sku_id || item.id)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors" title="Delete"><Trash2 size={14} className="text-red-500/70"/></button>
              </div>
              
              {showRestock === (item.sku_id || item.id) && (
                <div className="mt-3 p-3 bg-black/5 rounded-xl border border-white/5 animate-fade-in flex gap-2">
                  <input type="number" step="0.1" value={restockQty} onChange={e => setRestockQty(e.target.value)} className="input-field flex-1 !py-2" placeholder={`Use -10 to deduct or 10 to add...`} />
                  <button onClick={() => handleRestock(item.sku_id || item.id)} className="btn-primary !py-2 !px-4">Save</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-3xl p-6 border" style={{ background: 'var(--color-bg-modal)', borderColor: 'var(--color-border)' }}>
            <div className="sticky top-0 z-10 pb-4 flex items-center justify-between" style={{ background: 'var(--color-bg-modal)' }}>
              <h2 className="text-lg font-bold text-themed-heading">{editingItem ? 'Edit SKU' : 'Add New SKU'}</h2>
              <button onClick={() => setShowForm(false)} className="text-themed-muted hover:text-themed-heading"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-themed-muted block mb-1">SKU Code *</label>
                <input type="text" required value={form.sku_code} onChange={e => setForm({...form, sku_code: e.target.value})} className="input-field w-full" placeholder='e.g. SKU-BSL-POT' />
              </div>
              <div>
                <label className="text-xs text-themed-muted block mb-1">Product Name *</label>
                <input type="text" required value={form.product_name} onChange={e => setForm({...form, product_name: e.target.value})} className="input-field w-full" placeholder='Sweet Basil (Potted)' />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-themed-muted block mb-1">Sales Format *</label>
                  <select value={form.sales_format} onChange={e => setForm({...form, sales_format: e.target.value})} className="input-field w-full">
                    {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Current Stock *</label>
                  <input type="number" required step="0.1" value={form.current_stock} onChange={e => setForm({...form, current_stock: e.target.value})} className="input-field w-full" placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Restock Alert Level</label>
                  <input type="number" required step="0.1" value={form.restock_alert_level} onChange={e => setForm({...form, restock_alert_level: e.target.value})} className="input-field w-full" placeholder="10" />
                </div>
              </div>
              
              <button type="submit" className="btn-primary w-full py-3 mt-2 justify-center">{editingItem ? 'Update Database' : 'Save to Live Inventory'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;
