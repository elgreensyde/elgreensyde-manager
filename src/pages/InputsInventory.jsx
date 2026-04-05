import { useState, useEffect } from 'react';
import { Plus, Search, Edit3, Trash2, X, Package, AlertTriangle, Droplets, Leaf, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import db from '../services/db';

const INPUT_TYPES = ['Organic Pesticide', 'Fungicide', 'Fertilizer', 'Soil Amendment'];
const STOCK_UNITS = ['ml', 'grams', 'liters', 'kg'];

const typeConfig = {
  'Organic Pesticide': { icon: ShieldAlert, color: '#e74c3c', bg: '#fdecea' },
  'Fungicide': { icon: Droplets, color: '#9b59b6', bg: '#f4ecf7' },
  'Fertilizer': { icon: Leaf, color: '#27ae60', bg: '#e8f8f0' },
  'Soil Amendment': { icon: Package, color: '#e67e22', bg: '#fef5e7' }
};

function InputsInventory() {
  const [inputs, setInputs] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const defaultForm = {
    product_name: '', type: 'Fertilizer', active_ingredient: '', mix_rate: '',
    current_stock: '', stock_unit: 'grams', low_stock_threshold: '', withholding_days: '0', notes: ''
  };
  const [form, setForm] = useState(defaultForm);

  const load = async () => { setInputs(await db.getAll('inputs_inventory')); setLoading(false); };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm(defaultForm); setEditingId(null); };

  const openEdit = (input) => {
    setEditingId(input.input_id);
    setForm({
      product_name: input.product_name || '', type: input.type || 'Fertilizer',
      active_ingredient: input.active_ingredient || '', mix_rate: input.mix_rate || '',
      current_stock: input.current_stock?.toString() || '', stock_unit: input.stock_unit || 'grams',
      low_stock_threshold: input.low_stock_threshold?.toString() || '', withholding_days: input.withholding_days?.toString() || '0',
      notes: input.notes || ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.product_name.trim()) { toast.error('Product name required'); return; }
    const data = {
      ...form,
      current_stock: parseFloat(form.current_stock) || 0,
      low_stock_threshold: parseFloat(form.low_stock_threshold) || 0,
      withholding_days: parseInt(form.withholding_days) || 0
    };
    if (editingId) {
      await db.update('inputs_inventory', editingId, data);
      toast.success('Input updated');
    } else {
      await db.insert('inputs_inventory', data);
      toast.success('Input added');
    }
    setShowForm(false); resetForm(); load();
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this input?')) {
      await db.delete('inputs_inventory', id);
      toast.success('Input deleted');
      load();
    }
  };

  const adjustStock = async (input, amount) => {
    const newStock = Math.max(0, (input.current_stock || 0) + amount);
    await db.update('inputs_inventory', input.input_id, { current_stock: newStock });
    toast.success(`Stock ${amount > 0 ? 'added' : 'deducted'}: ${Math.abs(amount)} ${input.stock_unit}`);
    load();
  };

  const filtered = inputs.filter(i =>
    i.product_name.toLowerCase().includes(search.toLowerCase()) &&
    (!filterType || i.type === filterType)
  );

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter h-full overflow-y-auto">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Inputs Inventory</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{inputs.length} products tracked</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary" id="add-input-btn">
            <Plus size={18} /><span className="hidden sm:inline">Add Input</span>
          </button>
        </div>

        {/* Low stock alerts */}
        {inputs.filter(i => i.current_stock <= i.low_stock_threshold).length > 0 && (
          <div className="mb-4 p-3 rounded-xl flex items-center gap-2" style={{ background: '#fef3c7', border: '1px solid #f59e0b' }}>
            <AlertTriangle size={16} style={{ color: '#d97706' }} />
            <span className="text-sm font-medium" style={{ color: '#92400e' }}>
              {inputs.filter(i => i.current_stock <= i.low_stock_threshold).length} input(s) below restock threshold
            </span>
          </div>
        )}

        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input type="text" placeholder="Search inputs..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" id="input-search" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field w-auto" id="input-type-filter">
            <option value="">All Types</option>
            {INPUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="px-5 space-y-3 pb-24">
        {filtered.length === 0 ? (
          <div className="glass-card-static p-8 text-center">
            <Package className="mx-auto mb-3" size={40} style={{ color: 'var(--color-text-muted)' }} />
            <p style={{ color: 'var(--color-text-muted)' }}>No inputs found.</p>
          </div>
        ) : filtered.map(input => {
          const cfg = typeConfig[input.type] || typeConfig['Fertilizer'];
          const Icon = cfg.icon;
          const isLow = input.current_stock <= input.low_stock_threshold;
          const stockPct = input.low_stock_threshold > 0 ? Math.min(100, (input.current_stock / input.low_stock_threshold) * 100) : 100;

          return (
            <div key={input.input_id} className="glass-card p-4" style={isLow ? { borderColor: '#f59e0b', borderWidth: '2px' } : {}}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.bg }}>
                    <Icon size={20} style={{ color: cfg.color }} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{input.product_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.color }}>{input.type}</span>
                      {input.withholding_days > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: '#fef3c7', color: '#92400e' }}>
                          ⏱ {input.withholding_days}d withholding
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(input)} className="p-2 rounded-lg hover:opacity-70"><Edit3 size={14} style={{ color: 'var(--color-text-muted)' }} /></button>
                  <button onClick={() => handleDelete(input.input_id)} className="p-2 rounded-lg hover:opacity-70"><Trash2 size={14} className="text-red-500/50" /></button>
                </div>
              </div>

              {/* Stock bar */}
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium" style={{ color: isLow ? '#d97706' : 'var(--color-text-secondary)' }}>
                    {isLow ? '⚠️ Low Stock' : 'Stock Level'}
                  </span>
                  <span className="text-sm font-bold" style={{ color: isLow ? '#d97706' : 'var(--color-text-primary)' }}>
                    {input.current_stock} {input.stock_unit}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-card-hover)' }}>
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${Math.min(100, stockPct)}%`,
                    background: isLow ? '#f59e0b' : stockPct > 60 ? '#27ae60' : '#e67e22'
                  }} />
                </div>
                <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Restock at: {input.low_stock_threshold} {input.stock_unit}
                </div>
              </div>

              {/* Quick info */}
              <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                {input.mix_rate && <div><span className="font-semibold">Mix:</span> {input.mix_rate}</div>}
                {input.active_ingredient && <div><span className="font-semibold">Active:</span> {input.active_ingredient}</div>}
              </div>

              {/* Quick adjust buttons */}
              <div className="flex gap-2 mt-3">
                <button onClick={() => {
                  const amt = prompt(`Add stock (${input.stock_unit}):`);
                  if (amt && parseFloat(amt) > 0) adjustStock(input, parseFloat(amt));
                }} className="flex-1 text-xs py-1.5 rounded-lg font-medium" style={{ background: '#e8f8f0', color: '#27ae60' }}>
                  + Add Stock
                </button>
                <button onClick={() => {
                  const amt = prompt(`Deduct stock (${input.stock_unit}):`);
                  if (amt && parseFloat(amt) > 0) adjustStock(input, -parseFloat(amt));
                }} className="flex-1 text-xs py-1.5 rounded-lg font-medium" style={{ background: '#fdecea', color: '#e74c3c' }}>
                  − Deduct
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--color-bg-overlay)' }}>
          <div className="glass-card-static w-full max-w-md max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>
                {editingId ? 'Edit Input' : 'Add Input'}
              </h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="p-2 rounded-lg hover:opacity-70"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Product Name *</label>
                <input type="text" value={form.product_name} onChange={e => setForm({...form, product_name: e.target.value})} className="input-field" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Type</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="input-field">
                    {INPUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Active Ingredient</label>
                  <input type="text" value={form.active_ingredient} onChange={e => setForm({...form, active_ingredient: e.target.value})} className="input-field" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Standard Mix Rate</label>
                <input type="text" value={form.mix_rate} onChange={e => setForm({...form, mix_rate: e.target.value})} className="input-field" placeholder="e.g. 5ml per 1 liter" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Current Stock</label>
                  <input type="number" value={form.current_stock} onChange={e => setForm({...form, current_stock: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Unit</label>
                  <select value={form.stock_unit} onChange={e => setForm({...form, stock_unit: e.target.value})} className="input-field">
                    {STOCK_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Restock Level</label>
                  <input type="number" value={form.low_stock_threshold} onChange={e => setForm({...form, low_stock_threshold: e.target.value})} className="input-field" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Withholding Period (days before harvest)</label>
                <input type="number" value={form.withholding_days} onChange={e => setForm({...form, withholding_days: e.target.value})} className="input-field" min="0" />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="input-field" rows={2} />
              </div>
              <button type="submit" className="btn-primary w-full">{editingId ? 'Update' : 'Add'} Input</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InputsInventory;
