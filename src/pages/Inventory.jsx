import { useState, useEffect } from 'react';
import { Plus, Package, Search, X, RotateCcw, Edit3, Trash2, ShieldAlert, Droplets, Leaf, AlertTriangle, FlaskConical } from 'lucide-react';
import toast from 'react-hot-toast';
import db from '../services/db';

const FORMATS = ['Units', 'Grams'];
const INPUT_TYPES = ['Organic Pesticide', 'Fungicide', 'Fertilizer', 'Soil Amendment'];
const STOCK_UNITS = ['ml', 'grams', 'liters', 'kg'];

const inputTypeConfig = {
  'Organic Pesticide': { icon: ShieldAlert, color: '#e74c3c', bg: 'rgba(231,76,60,0.12)' },
  'Fungicide': { icon: Droplets, color: '#9b59b6', bg: 'rgba(155,89,182,0.12)' },
  'Fertilizer': { icon: Leaf, color: '#27ae60', bg: 'rgba(39,174,96,0.12)' },
  'Soil Amendment': { icon: Package, color: '#e67e22', bg: 'rgba(230,126,34,0.12)' }
};

function Inventory() {
  const [activeTab, setActiveTab] = useState('products');

  // --- PRODUCTS state ---
  const [items, setItems] = useState([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showRestock, setShowRestock] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const defaultProductForm = { sku_code: '', product_name: '', sales_format: 'Units', current_stock: '', restock_alert_level: '' };
  const [productForm, setProductForm] = useState(defaultProductForm);

  // --- CONSUMABLES state ---
  const [inputs, setInputs] = useState([]);
  const [showInputForm, setShowInputForm] = useState(false);
  const [editingInputId, setEditingInputId] = useState(null);
  const defaultInputForm = {
    product_name: '', type: 'Fertilizer', active_ingredient: '', mix_rate: '',
    current_stock: '', stock_unit: 'grams', low_stock_threshold: '', withholding_days: '0', notes: ''
  };
  const [inputForm, setInputForm] = useState(defaultInputForm);

  const [search, setSearch] = useState('');
  const [inputTypeFilter, setInputTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [invData, inputData] = await Promise.all([
      db.getAll('inventory'),
      db.getAll('inputs_inventory')
    ]);
    setItems(invData || []);
    setInputs(inputData || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // --- Product handlers ---
  const resetProductForm = () => { setProductForm(defaultProductForm); setEditingProduct(null); };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    const data = {
      ...productForm,
      current_stock: parseFloat(productForm.current_stock) || 0,
      restock_alert_level: parseFloat(productForm.restock_alert_level) || 0
    };
    if (editingProduct) {
      await db.update('inventory', editingProduct, data);
    } else {
      await db.insert('inventory', data);
    }
    setShowProductForm(false);
    resetProductForm();
    load();
  };

  const handleRestock = async (itemId) => {
    const qty = parseFloat(restockQty);
    if (!qty || qty === 0) return;
    const item = items.find(i => i.sku_id === itemId || i.id === itemId);
    if (!item) return;
    await db.update('inventory', item.sku_id || item.id, {
      current_stock: (parseFloat(item.current_stock) || 0) + qty
    });
    setShowRestock(null);
    setRestockQty('');
    load();
  };

  const openEditProduct = (item) => {
    setEditingProduct(item.sku_id || item.id);
    setProductForm({
      sku_code: item.sku_code || '',
      product_name: item.product_name || '',
      sales_format: item.sales_format || 'Units',
      current_stock: item.current_stock?.toString() || '0',
      restock_alert_level: item.restock_alert_level?.toString() || '0'
    });
    setShowProductForm(true);
  };

  const deleteProduct = async (id) => {
    if (confirm('Delete this product? Warning: Could affect linked transactions.')) {
      await db.delete('inventory', id);
      load();
    }
  };

  // --- Consumable handlers ---
  const resetInputForm = () => { setInputForm(defaultInputForm); setEditingInputId(null); };

  const openEditInput = (input) => {
    setEditingInputId(input.input_id);
    setInputForm({
      product_name: input.product_name || '', type: input.type || 'Fertilizer',
      active_ingredient: input.active_ingredient || '', mix_rate: input.mix_rate || '',
      current_stock: input.current_stock?.toString() || '', stock_unit: input.stock_unit || 'grams',
      low_stock_threshold: input.low_stock_threshold?.toString() || '',
      withholding_days: input.withholding_days?.toString() || '0', notes: input.notes || ''
    });
    setShowInputForm(true);
  };

  const handleInputSubmit = async (e) => {
    e.preventDefault();
    if (!inputForm.product_name.trim()) { toast.error('Product name required'); return; }
    const data = {
      ...inputForm,
      current_stock: parseFloat(inputForm.current_stock) || 0,
      low_stock_threshold: parseFloat(inputForm.low_stock_threshold) || 0,
      withholding_days: parseInt(inputForm.withholding_days) || 0
    };
    if (editingInputId) {
      await db.update('inputs_inventory', editingInputId, data);
      toast.success('Consumable updated');
    } else {
      await db.insert('inputs_inventory', data);
      toast.success('Consumable added');
    }
    setShowInputForm(false);
    resetInputForm();
    load();
  };

  const deleteInput = async (id) => {
    if (confirm('Delete this consumable?')) {
      await db.delete('inputs_inventory', id);
      toast.success('Deleted');
      load();
    }
  };

  const adjustInputStock = async (input, amount) => {
    const newStock = Math.max(0, (input.current_stock || 0) + amount);
    await db.update('inputs_inventory', input.input_id, { current_stock: newStock });
    toast.success(`Stock ${amount > 0 ? 'added' : 'deducted'}: ${Math.abs(amount)} ${input.stock_unit}`);
    load();
  };

  // --- Filtered lists ---
  const filteredProducts = items.filter(i =>
    i.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.sku_code?.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    const aL = a.current_stock <= a.restock_alert_level && a.restock_alert_level > 0;
    const bL = b.current_stock <= b.restock_alert_level && b.restock_alert_level > 0;
    if (aL && !bL) return -1;
    if (!aL && bL) return 1;
    return (a.product_name || '').localeCompare(b.product_name || '');
  });

  const filteredInputs = inputs.filter(i =>
    i.product_name?.toLowerCase().includes(search.toLowerCase()) &&
    (!inputTypeFilter || i.type === inputTypeFilter)
  );

  const productLowCount = items.filter(i => i.current_stock <= i.restock_alert_level && i.restock_alert_level > 0).length;
  const inputLowCount = inputs.filter(i => i.current_stock <= i.low_stock_threshold && i.low_stock_threshold > 0).length;

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter flex flex-col h-screen overflow-hidden">
      {/* HEADER */}
      <div className="px-5 pt-6 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>
              Master Inventory
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {activeTab === 'products'
                ? `${items.length} SKUs${productLowCount > 0 ? ` · ` : ''}`
                : `${inputs.length} consumables${inputLowCount > 0 ? ` · ` : ''}`
              }
              {activeTab === 'products' && productLowCount > 0 && <span className="text-red-500 font-bold">{productLowCount} low stock</span>}
              {activeTab === 'consumables' && inputLowCount > 0 && <span className="text-amber-500 font-bold">{inputLowCount} low stock</span>}
            </p>
          </div>
          <button
            onClick={() => activeTab === 'products' ? (resetProductForm(), setShowProductForm(true)) : (resetInputForm(), setShowInputForm(true))}
            className="btn-primary"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">{activeTab === 'products' ? 'Add SKU' : 'Add Consumable'}</span>
          </button>
        </div>

        {/* TAB TOGGLE */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-all ${activeTab === 'products' ? 'bg-forest-600/15 text-green-500 border-green-500/30' : 'border-transparent text-themed-muted'}`}
          >
            <Package size={13} className="inline mr-1.5" />Sellable Products
          </button>
          <button
            onClick={() => setActiveTab('consumables')}
            className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-all ${activeTab === 'consumables' ? 'bg-amber-500/15 text-amber-500 border-amber-500/30' : 'border-transparent text-themed-muted'}`}
          >
            <FlaskConical size={13} className="inline mr-1.5" />Farm Consumables
          </button>
        </div>

        {/* SEARCH */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input type="text" placeholder={activeTab === 'products' ? 'Search SKUs...' : 'Search consumables...'} value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
          </div>
          {activeTab === 'consumables' && (
            <select value={inputTypeFilter} onChange={e => setInputTypeFilter(e.target.value)} className="input-field w-auto">
              <option value="">All Types</option>
              {INPUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-5 pb-24 space-y-3">

        {/* ---- PRODUCTS TAB ---- */}
        {activeTab === 'products' && (
          filteredProducts.length === 0 ? (
            <div className="glass-card-static p-8 text-center border border-dashed border-gray-600/30">
              <Package className="mx-auto mb-3 opacity-40" size={40} />
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>No inventory items yet.</p>
              <button onClick={() => { resetProductForm(); setShowProductForm(true); }} className="btn-primary mx-auto"><Plus size={16} /> Create First SKU</button>
            </div>
          ) : filteredProducts.map(item => {
            const isLow = item.current_stock <= item.restock_alert_level && item.restock_alert_level > 0;
            return (
              <div key={item.sku_id || item.id} className={`glass-card p-4 ${isLow ? 'border-l-4 border-l-red-500/70' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{item.product_name}</h3>
                      {isLow && <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded animate-pulse-soft">LOW STOCK</span>}
                    </div>
                    <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{item.sku_code}</span>
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
                      <div className={`h-1.5 rounded-full transition-all duration-500 ${isLow ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min((item.current_stock / (item.restock_alert_level * 3)) * 100, 100)}%` }} />
                    </div>
                  </div>
                )}
                <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: '1px dashed var(--color-border)' }}>
                  <button onClick={() => setShowRestock(showRestock === (item.sku_id || item.id) ? null : (item.sku_id || item.id))} className="btn-secondary !text-xs !px-3 !py-1.5 flex-1 justify-center bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-transparent">
                    <RotateCcw size={12} /> Adjust Stock
                  </button>
                  <button onClick={() => openEditProduct(item)} className="p-2 rounded-lg hover:bg-black/10 transition-colors"><Edit3 size={14} className="text-gray-400" /></button>
                  <button onClick={() => deleteProduct(item.sku_id || item.id)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"><Trash2 size={14} className="text-red-500/70" /></button>
                </div>
                {showRestock === (item.sku_id || item.id) && (
                  <div className="mt-3 p-3 bg-black/5 rounded-xl border border-white/5 animate-fade-in flex gap-2">
                    <input type="number" step="0.1" value={restockQty} onChange={e => setRestockQty(e.target.value)} className="input-field flex-1 !py-2" placeholder="Use -10 to deduct or 10 to add..." />
                    <button onClick={() => handleRestock(item.sku_id || item.id)} className="btn-primary !py-2 !px-4">Save</button>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* ---- CONSUMABLES TAB ---- */}
        {activeTab === 'consumables' && (
          filteredInputs.length === 0 ? (
            <div className="glass-card-static p-8 text-center border border-dashed border-gray-600/30">
              <FlaskConical className="mx-auto mb-3 opacity-40" size={40} />
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>No farm consumables tracked yet.</p>
              <button onClick={() => { resetInputForm(); setShowInputForm(true); }} className="btn-primary mx-auto"><Plus size={16} /> Add First Consumable</button>
            </div>
          ) : filteredInputs.map(input => {
            const cfg = inputTypeConfig[input.type] || inputTypeConfig['Fertilizer'];
            const Icon = cfg.icon;
            const isLow = input.current_stock <= input.low_stock_threshold && input.low_stock_threshold > 0;
            const stockPct = input.low_stock_threshold > 0 ? Math.min(100, (input.current_stock / input.low_stock_threshold) * 100) : 100;
            return (
              <div key={input.input_id} className="glass-card p-4" style={isLow ? { borderLeft: '4px solid #f59e0b' } : {}}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                      <Icon size={18} style={{ color: cfg.color }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{input.product_name}</h3>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.color }}>{input.type}</span>
                        {input.withholding_days > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-500/15 text-amber-500">⏱ {input.withholding_days}d withholding</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditInput(input)} className="p-1.5 rounded-lg hover:opacity-70"><Edit3 size={13} style={{ color: 'var(--color-text-muted)' }} /></button>
                    <button onClick={() => deleteInput(input.input_id)} className="p-1.5 rounded-lg hover:opacity-70"><Trash2 size={13} className="text-red-500/50" /></button>
                  </div>
                </div>

                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs" style={{ color: isLow ? '#d97706' : 'var(--color-text-muted)' }}>{isLow ? '⚠️ Low Stock' : 'Stock Level'}</span>
                    <span className="text-sm font-bold" style={{ color: isLow ? '#d97706' : 'var(--color-text-primary)' }}>{input.current_stock} {input.stock_unit}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, stockPct)}%`, background: isLow ? '#f59e0b' : stockPct > 60 ? '#27ae60' : '#e67e22' }} />
                  </div>
                  {input.mix_rate && <div className="text-[10px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>Mix: {input.mix_rate}</div>}
                </div>

                <div className="flex gap-2 mt-3">
                  <button onClick={() => { const amt = prompt(`Add stock (${input.stock_unit}):`); if (amt && parseFloat(amt) > 0) adjustInputStock(input, parseFloat(amt)); }} className="flex-1 text-xs py-1.5 rounded-lg font-medium text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20">+ Add</button>
                  <button onClick={() => { const amt = prompt(`Deduct stock (${input.stock_unit}):`); if (amt && parseFloat(amt) > 0) adjustInputStock(input, -parseFloat(amt)); }} className="flex-1 text-xs py-1.5 rounded-lg font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20">− Deduct</button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ======= PRODUCT FORM MODAL ======= */}
      {showProductForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowProductForm(false)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-3xl p-6 border" style={{ background: 'var(--color-bg-modal)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-themed-heading">{editingProduct ? 'Edit SKU' : 'Add Sellable Product'}</h2>
              <button onClick={() => setShowProductForm(false)} className="text-themed-muted hover:text-themed-heading"><X size={20} /></button>
            </div>
            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-themed-muted block mb-1">SKU Code *</label>
                <input type="text" required value={productForm.sku_code} onChange={e => setProductForm({...productForm, sku_code: e.target.value})} className="input-field w-full" placeholder="SKU-BSL-POT" />
              </div>
              <div>
                <label className="text-xs text-themed-muted block mb-1">Product Name *</label>
                <input type="text" required value={productForm.product_name} onChange={e => setProductForm({...productForm, product_name: e.target.value})} className="input-field w-full" placeholder="Sweet Basil (Potted)" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Sales Format *</label>
                  <select value={productForm.sales_format} onChange={e => setProductForm({...productForm, sales_format: e.target.value})} className="input-field w-full">
                    {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Current Stock *</label>
                  <input type="number" required step="0.1" value={productForm.current_stock} onChange={e => setProductForm({...productForm, current_stock: e.target.value})} className="input-field w-full" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="text-xs text-themed-muted block mb-1">Restock Alert Level</label>
                <input type="number" step="0.1" value={productForm.restock_alert_level} onChange={e => setProductForm({...productForm, restock_alert_level: e.target.value})} className="input-field w-full" placeholder="10" />
              </div>
              <button type="submit" className="btn-primary w-full py-3 justify-center">{editingProduct ? 'Update Product' : 'Save to Inventory'}</button>
            </form>
          </div>
        </div>
      )}

      {/* ======= CONSUMABLE FORM MODAL ======= */}
      {showInputForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInputForm(false)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-3xl p-6 border max-h-[85vh] overflow-y-auto" style={{ background: 'var(--color-bg-modal)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-themed-heading">{editingInputId ? 'Edit Consumable' : 'Add Farm Consumable'}</h2>
              <button onClick={() => { setShowInputForm(false); resetInputForm(); }} className="text-themed-muted hover:text-themed-heading"><X size={20} /></button>
            </div>
            <form onSubmit={handleInputSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-themed-muted block mb-1">Product Name *</label>
                <input type="text" required value={inputForm.product_name} onChange={e => setInputForm({...inputForm, product_name: e.target.value})} className="input-field w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Type</label>
                  <select value={inputForm.type} onChange={e => setInputForm({...inputForm, type: e.target.value})} className="input-field w-full">
                    {INPUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Active Ingredient</label>
                  <input type="text" value={inputForm.active_ingredient} onChange={e => setInputForm({...inputForm, active_ingredient: e.target.value})} className="input-field w-full" />
                </div>
              </div>
              <div>
                <label className="text-xs text-themed-muted block mb-1">Standard Mix Rate</label>
                <input type="text" value={inputForm.mix_rate} onChange={e => setInputForm({...inputForm, mix_rate: e.target.value})} className="input-field w-full" placeholder="e.g. 5ml per 1 liter" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Current Stock</label>
                  <input type="number" value={inputForm.current_stock} onChange={e => setInputForm({...inputForm, current_stock: e.target.value})} className="input-field w-full" />
                </div>
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Unit</label>
                  <select value={inputForm.stock_unit} onChange={e => setInputForm({...inputForm, stock_unit: e.target.value})} className="input-field w-full">
                    {STOCK_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Restock Level</label>
                  <input type="number" value={inputForm.low_stock_threshold} onChange={e => setInputForm({...inputForm, low_stock_threshold: e.target.value})} className="input-field w-full" />
                </div>
              </div>
              <div>
                <label className="text-xs text-themed-muted block mb-1">Withholding Period (days)</label>
                <input type="number" value={inputForm.withholding_days} onChange={e => setInputForm({...inputForm, withholding_days: e.target.value})} className="input-field w-full" min="0" />
              </div>
              <div>
                <label className="text-xs text-themed-muted block mb-1">Notes</label>
                <textarea value={inputForm.notes} onChange={e => setInputForm({...inputForm, notes: e.target.value})} className="input-field w-full" rows={2} />
              </div>
              <button type="submit" className="btn-primary w-full py-3 justify-center">{editingInputId ? 'Update' : 'Add'} Consumable</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;
