import { useState, useEffect } from 'react';
import { ShoppingCart, X, Check, Plus, Trash2 } from 'lucide-react';
import db from '../services/db';

const SELL_TYPES = [
  { value: 'Per Gram', label: 'Per Gram', unit: 'g', icon: '⚖️', defaultPrice: 15 },
  { value: 'Potted Plant', label: 'Potted Plant', unit: 'pot', icon: '🪴', defaultPrice: 85 },
  { value: 'Seedling', label: 'Seedling', unit: 'seedling', icon: '🌱', defaultPrice: 25 },
  { value: 'Runner', label: 'Runner', unit: 'runner', icon: '🌿', defaultPrice: 30 },
];

function POS() {
  const [batches, setBatches] = useState([]);
  const [crops, setCrops] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedSellType, setSelectedSellType] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [salesHistory, setSalesHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [b, c, s] = await Promise.all([db.getAll('batches'), db.getAll('crops'), db.getAll('sales')]);
    setBatches(b.filter(x => (x.status === 'Active' || x.status === 'Ready') && !x.ipm_locked));
    setCrops(c); setSalesHistory(s); setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const getCrop = (id) => crops.find(c => c.id === id);

  const addToCart = () => {
    if (!selectedBatch || !selectedSellType || !quantity || !unitPrice) return;
    const batch = batches.find(b => b.id === selectedBatch);
    const crop = getCrop(batch?.crop_id);
    if (!batch || !crop) return;
    setCart([...cart, { id: Date.now().toString(), batch_id: batch.id, batch_code: batch.batch_code, crop_name: crop.common_name, sell_type: selectedSellType.value, quantity: parseFloat(quantity), unit: selectedSellType.unit, unit_price: parseFloat(unitPrice), total_amount: parseFloat(quantity) * parseFloat(unitPrice) }]);
    setSelectedBatch(''); setQuantity('');
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.total_amount, 0);

  const handleCheckout = async () => {
    for (const item of cart) {
      await db.insert('sales', { sale_date: new Date().toISOString(), batch_id: item.batch_id, sell_type: item.sell_type, quantity: item.quantity, unit_price: item.unit_price, total_amount: item.total_amount, payment_method: paymentMethod });
    }
    setCart([]); setShowCheckout(false); setPaymentMethod('Cash');
    load();
  };

  const fmt = (a) => `₱${parseFloat(a).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div><h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Point of Sale</h1><p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Quick sale entry</p></div>
          <button onClick={() => setShowHistory(!showHistory)} className="btn-secondary !text-xs">{showHistory ? 'New Sale' : 'History'}</button>
        </div>
      </div>

      {showHistory ? (
        <div className="px-5 space-y-3 pb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Recent Sales</h2>
          {salesHistory.length === 0 ? <div className="glass-card-static p-6 text-center"><ShoppingCart className="mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} size={32} /><p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No sales recorded yet.</p></div> :
          salesHistory.slice(0, 20).map(sale => { const batch = batches.find(b => b.id === sale.batch_id) || {}; const crop = getCrop(batch.crop_id); return (
            <div key={sale.id} className="glass-card p-4"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{crop?.common_name || 'Unknown'} — {sale.sell_type}</p><p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{sale.quantity} × {fmt(sale.unit_price||0)} · {batch.batch_code||''} · {sale.payment_method}</p><p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{new Date(sale.sale_date).toLocaleString('en-PH')}</p></div><span className="text-base font-bold" style={{ color: 'var(--color-accent-gold)' }}>{fmt(sale.total_amount)}</span></div></div>
          ); })}
        </div>
      ) : (
        <div className="px-5 pb-6">
          <div className="grid grid-cols-2 gap-3 mb-5">
            {SELL_TYPES.map(type => (
              <button key={type.value} onClick={() => { setSelectedSellType(type); setUnitPrice(type.defaultPrice.toString()); }} className={`glass-card p-4 text-center transition-all duration-200 ${selectedSellType?.value === type.value ? '!border-amber-500/50' : ''}`} style={selectedSellType?.value === type.value ? { background: 'var(--color-bg-card-hover)' } : {}}>
                <span className="text-2xl block mb-1">{type.icon}</span>
                <span className="text-sm font-semibold block" style={{ color: 'var(--color-text-primary)' }}>{type.label}</span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>₱{type.defaultPrice}/{type.unit}</span>
              </button>
            ))}
          </div>
          {selectedSellType && (
            <div className="space-y-4 animate-fade-in">
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Select Batch *</label><select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)} className="input-field"><option value="">Choose a batch...</option>{batches.map(b => { const crop = getCrop(b.crop_id); return <option key={b.id} value={b.id}>{b.batch_code} — {crop?.common_name||'Unknown'} ({b.status})</option>; })}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Quantity ({selectedSellType.unit})</label><input type="number" min="0.1" step="0.1" value={quantity} onChange={e => setQuantity(e.target.value)} className="input-field" placeholder="0" /></div>
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Unit Price (₱)</label><input type="number" min="0" step="0.5" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} className="input-field" /></div>
              </div>
              {quantity && unitPrice && <div className="flex items-center justify-between rounded-xl p-3" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}><span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Subtotal:</span><span className="text-lg font-bold" style={{ color: 'var(--color-accent-gold)' }}>{fmt(parseFloat(quantity||0)*parseFloat(unitPrice||0))}</span></div>}
              <button onClick={addToCart} disabled={!selectedBatch || !quantity || !unitPrice} className="btn-primary w-full justify-center !py-3 disabled:opacity-40 disabled:cursor-not-allowed"><Plus size={18} /> Add to Cart</button>
            </div>
          )}
          {cart.length > 0 && (
            <div className="mt-6 animate-fade-in">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>Cart ({cart.length})</h3>
              <div className="space-y-2 mb-4">{cart.map(item => (
                <div key={item.id} className="glass-card-static p-3 flex items-center justify-between"><div><p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.crop_name}</p><p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{item.quantity} {item.unit} × {fmt(item.unit_price)} · {item.batch_code}</p></div><div className="flex items-center gap-3"><span className="text-sm font-bold" style={{ color: 'var(--color-accent-gold)' }}>{fmt(item.total_amount)}</span><button onClick={() => setCart(cart.filter(c => c.id !== item.id))} className="p-1.5 rounded-lg hover:opacity-70"><Trash2 size={14} className="text-red-500/50" /></button></div></div>
              ))}</div>
              <div className="glass-card-static p-4 border-2" style={{ borderColor: 'rgba(212,168,67,0.3)' }}>
                <div className="flex items-center justify-between mb-4"><span className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>Total</span><span className="text-2xl font-bold font-display" style={{ color: 'var(--color-accent-gold)' }}>{fmt(cartTotal)}</span></div>
                <button onClick={() => setShowCheckout(true)} className="btn-gold w-full justify-center !py-3 text-base"><ShoppingCart size={20} /> Charge {fmt(cartTotal)}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowCheckout(false)}>
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--color-bg-overlay)' }} />
          <div className="relative w-full max-w-md animate-slide-up rounded-t-3xl sm:rounded-3xl p-6" style={{ background: 'var(--color-bg-modal)', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-display font-bold mb-4" style={{ color: 'var(--color-text-heading)' }}>Payment</h2>
            <div className="text-center mb-6"><span className="text-3xl font-bold font-display" style={{ color: 'var(--color-accent-gold)' }}>{fmt(cartTotal)}</span></div>
            <div className="grid grid-cols-2 gap-3 mb-6">{['Cash', 'GCash', 'Bank Transfer', 'Other'].map(m => (
              <button key={m} onClick={() => setPaymentMethod(m)} className="py-3 rounded-xl text-sm font-medium transition-all border" style={paymentMethod === m ? { background: 'var(--color-bg-card-hover)', borderColor: 'var(--color-border-hover)', color: 'var(--color-text-primary)' } : { borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>{m}</button>
            ))}</div>
            <button onClick={handleCheckout} className="btn-gold w-full justify-center !py-3 text-base"><Check size={20} /> Confirm Sale</button>
          </div>
        </div>
      )}
    </div>
  );
}
export default POS;
