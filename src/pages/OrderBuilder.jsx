import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, Trash2, X, AlertTriangle, ChevronDown, Search, ArrowLeft, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import supabase from '../lib/supabase';
import db from '../services/db';
import { confirmAction } from '../services/dialogService';

function OrderBuilder() {
  const location = useLocation();
  const navigate = useNavigate();

  // Pre-fill from Customers page "New Order" shortcut
  const prefill = location.state || {};

  const [customers, setCustomers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]); // For soft allocation

  const [selectedCustomerId, setSelectedCustomerId] = useState(prefill.customerId || '');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [cartItems, setCartItems] = useState([]); // { sku_id, product_name, qty, unitPrice, total, minOrder, available }
  const [skuSearch, setSkuSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [custResp, invResp, pricingResp, ordersResp] = await Promise.all([
      db.getAll('customers'),
      db.getAll('inventory'),
      supabase.from('pricing').select('*'),
      supabase.from('order_line_items')
        .select('sku_id, quantity, orders!inner(status)')
        .in('orders.status', ['Pending', 'Confirmed', 'Packed'])
    ]);

    setCustomers((custResp || []).filter(c => c.type === 'Wholesale'));
    setInventory(invResp || []);
    setPricing(pricingResp.data || []);
    setActiveOrders(ordersResp.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Soft allocation: compute reserved qty per SKU across active orders
  const getReserved = (skuId) => {
    return activeOrders
      .filter(o => o.sku_id === skuId)
      .reduce((sum, o) => sum + parseFloat(o.quantity || 0), 0);
  };

  const getAvailable = (sku) => {
    const skuId = sku.sku_id || sku.id;
    const reserved = getReserved(skuId);
    // Also subtract what's already in the current cart
    const inCart = cartItems.find(c => c.sku_id === skuId)?.qty || 0;
    return Math.max(0, parseFloat(sku.current_stock || 0) - reserved - inCart);
  };

  const getPricing = (skuId) => {
    return pricing.find(p => p.sku_id === skuId);
  };

  const addSku = (sku) => {
    const skuId = sku.sku_id || sku.id;
    if (cartItems.find(c => c.sku_id === skuId)) {
      toast('Already in order. Adjust quantity below.', { icon: 'ℹ️' });
      return;
    }
    const pricingRow = getPricing(skuId);
    const unitPrice = pricingRow?.wholesale_price || parseFloat(sku.retail_price) || 0;
    const minOrder = pricingRow?.min_order || 1;
    const available = getAvailable(sku);

    if (available <= 0) {
      toast.error(`${sku.product_name} is fully reserved or out of stock.`);
      return;
    }

    setCartItems(prev => [...prev, {
      sku_id: skuId,
      product_name: sku.product_name,
      qty: Math.max(1, minOrder),
      unitPrice,
      total: unitPrice * Math.max(1, minOrder),
      minOrder,
      available: available + Math.max(1, minOrder), // restore for re-calc
      hasPricing: !!pricingRow
    }]);
    setSkuSearch('');
  };

  const updateQty = (skuId, newQty) => {
    const sku = inventory.find(s => (s.sku_id || s.id) === skuId);
    const available = sku ? getAvailable(sku) + (cartItems.find(c => c.sku_id === skuId)?.qty || 0) : 0;
    if (newQty > available) {
      toast.error(`Only ${available} available (others may be reserved).`);
      return;
    }
    setCartItems(prev => prev.map(c =>
      c.sku_id === skuId
        ? { ...c, qty: newQty, total: newQty * c.unitPrice, available }
        : c
    ).filter(c => c.qty > 0));
  };

  const removeItem = (skuId) => setCartItems(prev => prev.filter(c => c.sku_id !== skuId));

  const orderTotal = cartItems.reduce((s, c) => s + c.total, 0);
  const fmt = (a) => `₱${parseFloat(a || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  const handleSubmit = async () => {
    if (!selectedCustomerId) return toast.error('Select a wholesale customer.');
    if (!deliveryDate) return toast.error('Set a delivery date.');
    if (cartItems.length === 0) return toast.error('Add at least one product.');

    // Check for min order violations
    const violations = cartItems.filter(c => c.qty < c.minOrder);
    if (violations.length > 0) {
      const names = violations.map(v => `${v.product_name} (min: ${v.minOrder})`).join(', ');
      if (!(await confirmAction(`Warning: ${names} are below minimum order qty. Submit anyway?`))) return;
    }

    setSaving(true);
    try {
      const customer = customers.find(c => (c.customer_id || c.id) === selectedCustomerId);
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

      // 1. Create order
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: selectedCustomerId,
          customer_name_cache: customer?.name || '',
          status: 'Pending',
          delivery_date: deliveryDate,
          total_amount: orderTotal,
          payment_method: 'Unpaid',
          notes
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      // 2. Insert line items
      const lineItems = cartItems.map(c => ({
        order_id: orderData.order_id,
        sku_id: c.sku_id,
        quantity: c.qty,
        unit_price: c.unitPrice,
        total: c.total
      }));

      const { error: lineErr } = await supabase.from('order_line_items').insert(lineItems);
      if (lineErr) throw lineErr;

      toast.success(`Order ${orderNumber} created!`);
      navigate('/orders');
    } catch (err) {
      toast.error('Failed to create order.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filteredInventory = inventory.filter(s =>
    s.product_name?.toLowerCase().includes(skuSearch.toLowerCase()) ||
    s.sku_code?.toLowerCase().includes(skuSearch.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 shrink-0 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/orders')} className="p-2 rounded-xl hover:opacity-70" style={{ background: 'var(--color-bg-card)' }}>
            <ArrowLeft size={18} style={{ color: 'var(--color-text-muted)' }} />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>New Wholesale Order</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Draft a B2B order with wholesale pricing</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-themed-muted block mb-1">Wholesale Customer *</label>
            <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="input-field w-full">
              <option value="">Select customer...</option>
              {customers.map(c => (
                <option key={c.customer_id || c.id} value={c.customer_id || c.id}>
                  {c.name}{c.business_name ? ` — ${c.business_name}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-themed-muted block mb-1">Delivery Date *</label>
            <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="input-field w-full" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Product Selector */}
        <div className="w-1/2 flex flex-col border-r overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
          <div className="p-4 shrink-0">
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Add Products</p>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
              <input type="text" value={skuSearch} onChange={e => setSkuSearch(e.target.value)} placeholder="Search inventory..." className="input-field pl-9 text-sm w-full" />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 px-3 pb-4 space-y-2">
            {filteredInventory.map(sku => {
              const skuId = sku.sku_id || sku.id;
              const pricingRow = getPricing(skuId);
              const available = getAvailable(sku);
              const reserved = getReserved(skuId);
              const inCart = cartItems.some(c => c.sku_id === skuId);
              return (
                <button key={skuId} onClick={() => addSku(sku)} disabled={inCart || available <= 0}
                  className={`w-full text-left glass-card-static p-3 rounded-xl transition-all border ${inCart ? 'opacity-40 cursor-default' : available > 0 ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : 'opacity-30 cursor-default'}`}
                  style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{sku.product_name}</p>
                      <p className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>{sku.sku_code}</p>
                    </div>
                    {inCart
                      ? <span className="badge bg-green-500/20 text-green-600 text-[10px]"><Check size={10} /> Added</span>
                      : <Plus size={14} className="text-green-600 mt-0.5 shrink-0" />
                    }
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    {pricingRow
                      ? <span className="text-xs font-bold text-blue-500">{fmt(pricingRow.wholesale_price)} <span className="font-normal opacity-60">wholesale</span></span>
                      : <span className="text-[10px] text-amber-500">⚠ No wholesale price</span>
                    }
                    <span className="text-[10px] ml-auto" style={{ color: 'var(--color-text-muted)' }}>
                      {reserved > 0
                        ? <span className="text-amber-500">🔒 {reserved} reserved · {available} free</span>
                        : `${available} available`
                      }
                    </span>
                  </div>
                  {pricingRow?.min_order > 1 && <p className="text-[10px] mt-0.5 text-purple-400">Min order: {pricingRow.min_order}</p>}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Order Summary */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="p-4 shrink-0 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Order Line Items</p>
          </div>
          <div className="overflow-y-auto flex-1 px-3 py-3 space-y-2">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-40 text-center py-10">
                <ShoppingBag size={32} className="mb-2" />
                <p className="text-sm">No items yet</p>
                <p className="text-xs mt-1">Select products from the left</p>
              </div>
            ) : cartItems.map(item => {
              const belowMin = item.qty < item.minOrder;
              return (
                <div key={item.sku_id} className={`glass-card-static p-3 rounded-xl border ${belowMin ? 'border-amber-500/40' : ''}`} style={{ borderColor: belowMin ? '' : 'var(--color-border)' }}>
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{item.product_name}</p>
                    <button onClick={() => removeItem(item.sku_id)} className="p-3 -m-3 text-red-500/40 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                  {belowMin && (
                    <div className="flex items-center gap-1 mb-2 text-[10px] text-amber-500">
                      <AlertTriangle size={11} /> Below min order ({item.minOrder} required)
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.sku_id, item.qty - 1)} className="w-7 h-7 rounded-lg text-sm font-bold flex items-center justify-center" style={{ background: 'var(--color-bg-card)' }}>−</button>
                      <span className="text-sm font-bold w-8 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.sku_id, item.qty + 1)} className="w-7 h-7 rounded-lg text-sm font-bold flex items-center justify-center" style={{ background: 'var(--color-bg-card)' }}>+</button>
                    </div>
                    <span className="text-sm font-bold text-green-600">{fmt(item.total)}</span>
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>{fmt(item.unitPrice)} × {item.qty} units</p>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-4 border-t shrink-0" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-panel)' }}>
            <div>
              <label className="text-xs text-themed-muted block mb-1">Order Notes</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input-field w-full text-sm mb-3" placeholder="Special handling, partial batches..." />
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Order Total</span>
              <span className="text-2xl font-bold text-green-600">{fmt(orderTotal)}</span>
            </div>
            <button onClick={handleSubmit} disabled={saving || cartItems.length === 0 || !selectedCustomerId || !deliveryDate}
              className="btn-primary w-full justify-center !py-3 disabled:opacity-40 disabled:cursor-not-allowed">
              {saving ? 'Creating Order...' : 'Confirm Order →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderBuilder;
