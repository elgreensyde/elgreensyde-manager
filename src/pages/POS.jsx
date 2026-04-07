import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Check, Plus, Minus, Trash2, Receipt, FileDown, Store, Tag, X, Lock, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import db from '../services/db';
import supabase from '../lib/supabase';
import html2canvas from 'html2canvas';

function POS() {
  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  
  const [transactionState, setTransactionState] = useState('Pending');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  // Advanced POS States
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('All');
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [amountTendered, setAmountTendered] = useState('');

  // Modals
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [salesHistory, setSalesHistory] = useState([]);

  // Per-SKU price override modal
  const [editPriceSku, setEditPriceSku] = useState(null);
  const [editPriceValue, setEditPriceValue] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [reservedQtys, setReservedQtys] = useState({}); // { sku_id: reserved_qty }
  const receiptRef = useRef(null);

  const load = async () => {
    const [invResp, custResp, reservedResp] = await Promise.all([
      db.getAll('inventory') || [],
      db.getAll('customers') || [],
      supabase
        .from('order_line_items')
        .select('sku_id, quantity, orders!inner(status)')
        .in('orders.status', ['Pending', 'Confirmed', 'Packed'])
    ]);
    setInventory(invResp || []);
    setCustomers(custResp || []);

    // Build reserved qty map for soft allocation
    const reserved = {};
    for (const item of (reservedResp.data || [])) {
      reserved[item.sku_id] = (reserved[item.sku_id] || 0) + parseFloat(item.quantity || 0);
    }
    setReservedQtys(reserved);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Use retail_price stored directly on inventory SKU (set by user).
  // Users can click the price tag icon on a card to set/update it.
  const getPrice = (sku) => parseFloat(sku.retail_price) || 0;

  // Soft Allocation: available = current_stock - reserved by active wholesale orders
  const getAvailable = (sku) => {
    const skuId = sku.sku_id || sku.id;
    const reserved = reservedQtys[skuId] || 0;
    return Math.max(0, parseFloat(sku.current_stock || 0) - reserved);
  };

  const getReserved = (sku) => reservedQtys[sku.sku_id || sku.id] || 0;

  const setSkuPrice = async () => {
    const price = parseFloat(editPriceValue);
    if (isNaN(price) || price < 0) return toast.error('Invalid price.');
    await db.update('inventory', editPriceSku.sku_id || editPriceSku.id, { retail_price: price });
    toast.success(`Price set to ₱${price.toFixed(2)} for ${editPriceSku.product_name}`);
    setEditPriceSku(null);
    load();
  };

  const addToCart = (sku) => {
    const unitPrice = getPrice(sku);
    if (unitPrice === 0) {
      toast.error('Set a retail price first by clicking the ₱ icon.');
      return;
    }
    if (sku.current_stock <= 0) {
      toast.error('Out of stock!');
      return;
    }
    
    if (sku.sales_format === 'Grams') {
      const weight = prompt(`Enter grams for ${sku.product_name}:`, '100');
      if (!weight || isNaN(weight) || Number(weight) <= 0) return;
      const qty = Number(weight);
      setCart(prev => [...prev, { id: Date.now().toString(), sku_id: sku.sku_id || sku.id, name: sku.product_name, qty, format: 'g', unitPrice, total: qty * unitPrice }]);
    } else {
      const existing = cart.find(c => c.sku_id === (sku.sku_id || sku.id));
      if (existing) {
        setCart(prev => prev.map(c => c.sku_id === existing.sku_id ? { ...c, qty: c.qty + 1, total: (c.qty + 1) * c.unitPrice } : c));
      } else {
        setCart(prev => [...prev, { id: Date.now().toString(), sku_id: sku.sku_id || sku.id, name: sku.product_name, qty: 1, format: 'pc', unitPrice, total: unitPrice }]);
      }
    }
  };

  const adjustQty = (itemId, delta) => {
    setCart(prev => prev.map(c => {
      if (c.id !== itemId) return c;
      const newQty = c.qty + delta;
      if (newQty <= 0) return null;
      return { ...c, qty: newQty, total: newQty * c.unitPrice };
    }).filter(Boolean));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.total, 0);
  
  const getCalculatedTotal = () => {
    let sub = cartSubtotal;
    let disc = 0;
    const v = parseFloat(discountValue) || 0;
    if (discountType === 'pct' && v > 0) disc = sub * (v / 100);
    if (discountType === 'fixed' && v > 0) disc = v;
    const ship = parseFloat(shippingCost) || 0;
    return Math.max(0, sub - disc) + ship;
  };
  
  const cartTotal = getCalculatedTotal();

  const handleConfirm = () => {
    if (cart.length === 0) return toast.error('Cart is empty.');
    setTransactionState('Confirmed');
  };

  const handleFulfill = async () => {
    try {
      // 1. Deduct from inventory
      for (const item of cart) {
        const sku = inventory.find(s => (s.sku_id || s.id) === item.sku_id);
        if (sku) {
          const newStock = Math.max(0, parseFloat(sku.current_stock) - item.qty);
          await db.update('inventory', sku.sku_id || sku.id, { current_stock: newStock });
        }
      }

      // 2. Write to financial_ledger as Revenue entry
      const CUST_WALKIN_ID = '00000000-0000-0000-0000-000000000001';
      const customer = customers.find(c => (c.customer_id || c.id) === selectedCustomerId);
      const customerId = selectedCustomerId || CUST_WALKIN_ID;
      const description = `POS Sale — ${customer ? customer.name : 'Walk-in'} (${paymentMethod})`;

      await db.insert('financial_ledger', {
        entry_type: 'Revenue',
        amount: cartTotal,
        description,
        order_id: null, // Placeholder for Ghost Table link
        entry_date: new Date().toISOString().split('T')[0]
      });

      toast.success(`₱${cartTotal.toFixed(2)} sale recorded!`);
      setTransactionState('Fulfilled');
      setShowReceiptModal(true);
      load(); // Refresh inventory stock levels
    } catch (err) {
      toast.error('Fulfillment failed. Check console.');
      console.error(err);
    }
  };

  const exportReceipt = async () => {
    if (receiptRef.current) {
      const canvas = await html2canvas(receiptRef.current, { scale: 2 });
      const link = document.createElement('a');
      link.download = `Receipt-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const resetPOS = () => {
    setCart([]);
    setTransactionState('Pending');
    setPaymentMethod('Cash');
    setSelectedCustomerId('');
    setAmountTendered('');
    setShowReceiptModal(false);
  };

  // ⚡ QUICK SELL (1x): One-tap sale — no cart, no modal, instant deduct + ledger write
  const handleQuickSell = async (sku) => {
    const price = getPrice(sku);
    const available = getAvailable(sku);

    if (price === 0) return toast.error('Set a retail price first (₱ icon).');
    if (available <= 0) return toast.error('No available stock for this item.');

    try {
      // 1. Deduct 1 unit from inventory
      const newStock = Math.max(0, parseFloat(sku.current_stock) - 1);
      await db.update('inventory', sku.sku_id || sku.id, { current_stock: newStock });

      // 2. Write Revenue to financial_ledger — same as handleFulfill
      await db.insert('financial_ledger', {
        entry_type: 'Revenue',
        amount: price,
        description: `⚡ Quick Sell — ${sku.product_name} (Walk-in / Cash)`,
        order_id: null,
        entry_date: new Date().toISOString().split('T')[0]
      });

      toast.success(`⚡ ${sku.product_name} sold for ${fmt(price)}!`);
      load(); // Refresh stock
    } catch (err) {
      toast.error('Quick Sell failed. Check console.');
      console.error(err);
    }
  };

  const openHistory = async () => {
    const logs = await db.getAll('financial_ledger');
    if (logs) {
      setSalesHistory(
        logs.filter(l => l.description && (
          l.description.includes('POS Sale') ||
          l.description.includes('Quick Sell')
        )).reverse()
      );
    }
    setShowHistoryModal(true);
  };

  const fmt = (a) => `₱${parseFloat(a || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  const filteredInventory = inventory.filter(sku => {
    const matchesSearch = sku.product_name.toLowerCase().includes(searchQuery.toLowerCase()) || sku.sku_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = formatFilter === 'All' || sku.sales_format === formatFilter;
    return matchesSearch && matchesFilter;
  });

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter flex h-[calc(100vh-80px)] mt-2">
      <div className="w-full sm:grid sm:grid-cols-12 gap-0 overflow-hidden">
        
        {/* LEFT COLUMN: CATALOG */}
        <div className="hidden sm:col-span-7 lg:col-span-8 p-6 overflow-y-auto sm:flex sm:flex-col" style={{ borderRight: '1px solid var(--color-border)' }}>
          <div className="mb-6 space-y-4 shrink-0">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-display font-bold flex items-center gap-2" style={{ color: 'var(--color-text-heading)' }}>
                <Store size={22} className="text-amber-500" /> Products Catalog
              </h2>
              <div className="flex items-center gap-3">
                <button 
                  onClick={openHistory}
                  className="btn-secondary !py-2 text-xs text-themed-muted hover:text-black font-bold"
                >
                  <Receipt size={14} /> Sales History
                </button>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search products..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="input-field pl-4 text-sm w-48"
                    style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              {['All', 'Units', 'Grams'].map(f => (
                <button 
                  key={f}
                  onClick={() => setFormatFilter(f)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors ${formatFilter === f ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-black/5 text-gray-500 hover:bg-black/10'}`}
                  style={formatFilter !== f ? { background: 'var(--color-bg-card)', color: 'var(--color-text-muted)' } : {}}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          
          {filteredInventory.length === 0 ? (
            <div className="text-center py-16 opacity-50 flex-1 flex flex-col justify-center">
              <ShoppingCart size={40} className="mx-auto mb-3"/>
              <p className="text-sm">No items found matching your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12 content-start">
              {filteredInventory.map(sku => {
                const price = getPrice(sku);
                const available = getAvailable(sku);
                const reserved = getReserved(sku);
                const isLow = available <= (sku.restock_alert_level || 0) && sku.restock_alert_level > 0;
                const isOutOfStock = available <= 0;
                return (
                  <div key={sku.sku_id || sku.id} className="relative group">
                    <button 
                      onClick={() => addToCart(sku)} 
                      className={`glass-card hover:-translate-y-1 hover:shadow-lg transition-all p-4 text-left flex flex-col justify-between w-full min-h-[120px] ${isOutOfStock ? 'opacity-40 cursor-not-allowed' : ''}`}
                      disabled={isOutOfStock}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-mono tracking-wider opacity-60" style={{ color: 'var(--color-text-muted)' }}>
                            {sku.sales_format}
                          </span>
                          {/* Soft Allocation Reserved Badge */}
                          {reserved > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-500 bg-amber-500/15 px-1.5 py-0.5 rounded-full">
                              <Lock size={8} /> {reserved} rsvd
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold leading-tight group-hover:text-amber-500 transition-colors" style={{ color: 'var(--color-text-primary)' }}>
                          {sku.product_name}
                        </h3>
                      </div>
                      <div className="mt-3 flex items-end justify-between">
                        <p className="text-lg font-bold" style={{ color: price > 0 ? 'var(--color-accent-gold)' : 'var(--color-text-muted)' }}>
                          {price > 0 ? fmt(price) : 'No price'}
                        </p>
                        <p className={`text-xs ${isLow ? 'text-red-400' : isOutOfStock ? 'text-red-500 font-bold' : ''}`} style={!isLow && !isOutOfStock ? { color: 'var(--color-text-muted)' } : {}}>
                          {isOutOfStock ? 'None avail.' : `${available} avail.`}
                        </p>
                      </div>
                    </button>
                    {/* Set price button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditPriceSku(sku); setEditPriceValue(sku.retail_price?.toString() || ''); }}
                      className="absolute top-2 right-2 p-1 rounded-lg bg-amber-500/20 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Set retail price"
                    >
                      <Tag size={12}/>
                    </button>
                    {/* ⚡ Quick Sell (1x) — Units only, bypasses cart */}
                    {sku.sales_format === 'Units' && !isOutOfStock && price > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleQuickSell(sku); }}
                        className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-500/40 active:scale-90"
                        title={`Quick Sell 1x for ${fmt(price)}`}
                      >
                        <Zap size={13} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: CART & CHECKOUT */}
        <div className="w-full sm:col-span-5 lg:col-span-4 flex flex-col h-full bg-black/5">
          <div className="p-5 border-b shrink-0 flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
            <h2 className="text-lg font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Current Order</h2>
            {transactionState !== 'Pending' && <span className={`badge ${transactionState === 'Fulfilled' ? 'bg-green-500/20 text-green-500' : 'bg-amber-500/20 text-amber-500'}`}>{transactionState}</span>}
          </div>

          {/* Cart Items Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
             {cart.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center opacity-50">
                 <ShoppingCart size={40} className="mb-4" />
                 <p className="text-sm">Cart is empty</p>
               </div>
             ) : transactionState === 'Fulfilled' ? (
               <div className="flex flex-col items-center animate-fade-in py-10">
                 <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                   <Check size={32} className="text-green-500" />
                 </div>
                 <h3 className="text-xl font-bold mb-1">Payment Received</h3>
                 <p className="text-sm text-gray-400 mb-8">{fmt(cartTotal)} via {paymentMethod}</p>
                 
                 {/* Receipt for html2canvas */}
                 <div className="absolute left-[-9999px]">
                   <div ref={receiptRef} className="bg-white p-8 w-[350px] text-black">
                     <div className="text-center mb-6">
                       <h2 className="text-3xl font-display font-bold mb-1 tracking-tight">ELGREENSYDE</h2>
                       <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Valencia City • 0991 417 2982</p>
                     </div>
                     <div className="text-xs font-mono text-gray-500 mb-4 flex justify-between">
                       <span>Date: {new Date().toLocaleDateString()}</span>
                       <span>Time: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                     </div>
                     <div className="border-t border-b border-dashed border-gray-300 py-3 mb-4 text-sm font-mono">
                       <div className="flex justify-between text-xs font-bold text-gray-400 mb-2 uppercase"><span>Item</span><span>Amount</span></div>
                       {cart.map(item => (
                         <div key={item.id} className="flex justify-between mb-1">
                           <span>{item.qty}x {item.name}</span>
                           <span>{fmt(item.total)}</span>
                         </div>
                       ))}
                     </div>
                     <div className="space-y-1 text-sm font-mono text-gray-600 mb-2">
                        {parseFloat(discountValue) > 0 && <div className="flex justify-between"><span>Discount</span><span>-{fmt(discountType === 'fixed' ? discountValue : cartSubtotal*(discountValue/100))}</span></div>}
                        {parseFloat(shippingCost) > 0 && <div className="flex justify-between"><span>Shipping</span><span>{fmt(shippingCost)}</span></div>}
                     </div>
                     <div className="flex justify-between items-center text-xl font-bold border-t border-gray-800 pt-2 mt-2">
                       <span>TOTAL</span>
                       <span>{fmt(cartTotal)}</span>
                     </div>
                     <p className="text-center text-xs mt-6 uppercase tracking-widest text-gray-400 font-bold">Paid via {paymentMethod}</p>
                     <p className="text-center text-sm font-display mt-8 pb-4 font-bold text-gray-800">Thank you for your purchase!</p>
                   </div>
                 </div>

                 <button onClick={exportReceipt} className="btn-secondary w-full justify-center mb-3"><FileDown size={18} /> Export Receipt (PNG)</button>
                 <button onClick={resetPOS} className="btn-primary w-full justify-center">Start New Order</button>
               </div>
             ) : (
               cart.map(item => (
                 <div key={item.id} className="glass-card-static p-3 flex justify-between items-center bg-white/5 border border-white/10 rounded-xl">
                   <div className="flex-1 min-w-0">
                     <h4 className="text-sm font-semibold truncate">{item.name}</h4>
                     <p className="text-xs text-gray-400">{fmt(item.unitPrice)} × {item.qty} {item.format}</p>
                   </div>
                   <div className="flex items-center gap-2 ml-2">
                     <span className="font-bold text-sm">{fmt(item.total)}</span>
                     {transactionState === 'Pending' && (
                       <div className="flex items-center gap-1">
                         <button onClick={() => adjustQty(item.id, -1)} className="w-6 h-6 rounded bg-white/10 flex items-center justify-center hover:bg-white/20"><Minus size={10}/></button>
                         <button onClick={() => adjustQty(item.id, 1)} className="w-6 h-6 rounded bg-white/10 flex items-center justify-center hover:bg-white/20"><Plus size={10}/></button>
                         <button onClick={() => setCart(prev => prev.filter(c => c.id !== item.id))} className="text-red-400 p-1 hover:bg-red-400/20 rounded"><Trash2 size={14} /></button>
                       </div>
                     )}
                   </div>
                 </div>
               ))
             )}
          </div>

          {/* Checkout Footer */}
          {cart.length > 0 && transactionState !== 'Fulfilled' && (
            <div className="shrink-0 pt-4 pb-6 px-5 border-t overflow-y-auto" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-panel)', maxHeight: '60vh' }}>
              
              <div className="bg-black/5 p-4 rounded-2xl mb-4 border shadow-inner" style={{ borderColor: 'var(--color-border)' }}>
                 <div className="space-y-2 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    <div className="flex justify-between items-center">
                       <span>Subtotal</span>
                       <span className="font-mono">{fmt(cartSubtotal)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                       <span className="text-amber-500">Discount</span>
                       <div className="flex items-center gap-2 w-32">
                          <select 
                            className="w-16 p-1 border rounded text-xs outline-none"
                            style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                            value={discountType} onChange={e => setDiscountType(e.target.value)}
                          >
                            <option value="none">None</option>
                            <option value="pct">% Off</option>
                            <option value="fixed">₱ Off</option>
                          </select>
                          <input 
                            type="number" className="w-full p-1 border rounded text-xs text-right outline-none" 
                            style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                            placeholder="0" value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                            disabled={discountType === 'none'}
                          />
                       </div>
                    </div>

                    <div className="flex justify-between items-center">
                       <span>Shipping</span>
                       <input 
                          type="number" className="w-20 p-1 border rounded text-xs text-right outline-none" 
                          style={{ background: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                          placeholder="₱0.00" value={shippingCost} onChange={e => setShippingCost(e.target.value)}
                       />
                    </div>
                 </div>
                 
                 <div className="border-t mt-3 pt-3 flex justify-between items-end" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Total</span>
                    <span className="text-3xl font-display font-bold text-amber-500">{fmt(cartTotal)}</span>
                 </div>
              </div>


              {transactionState === 'Pending' && (
                <div className="mb-4">
                  <select 
                    value={selectedCustomerId} 
                    onChange={e => setSelectedCustomerId(e.target.value)} 
                    className="input-field w-full mb-3 text-xs"
                  >
                    <option value="">Walk-in customer</option>
                    {customers.map(c => <option key={c.customer_id || c.id} value={c.customer_id || c.id}>{c.name}</option>)}
                  </select>
                  <button onClick={handleConfirm} className="btn-gold w-full justify-center !py-4 text-base font-bold">
                    Checkout Order
                  </button>
                </div>
              )}

              {transactionState === 'Confirmed' && (
                <div className="animate-slide-up">
                  <p className="text-xs text-amber-500 font-semibold mb-2 uppercase tracking-wider">Select Payment Method</p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {['Cash', 'GCash', 'Bank Transfer', 'Credit'].map(m => (
                      <button key={m} onClick={() => setPaymentMethod(m)} 
                              className={`py-2 text-sm rounded transition-all ${paymentMethod === m ? 'bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/20' : 'bg-black/10 hover:bg-black/20'} `}>
                        {m}
                      </button>
                    ))}
                  </div>

                  <div className="mb-4">
                    <label className="text-xs text-gray-500 font-bold block mb-1">Amount Tendered</label>
                    <input 
                       type="number" 
                       className="input-field w-full text-lg font-bold" 
                       placeholder="₱0.00" 
                       value={amountTendered} 
                       onChange={e => setAmountTendered(e.target.value)} 
                     />
                     {parseFloat(amountTendered) >= cartTotal && (
                       <p className="text-xs text-green-500 font-bold mt-1">Change: {fmt(parseFloat(amountTendered) - cartTotal)}</p>
                     )}
                  </div>

                  <button onClick={handleFulfill} className="btn-gold w-full justify-center !py-4 text-base font-bold bg-green-600 hover:bg-green-500 text-white border-none shadow-lg shadow-green-500/20">
                    <Check size={20} className="mr-2" /> Complete Sale ({paymentMethod})
                  </button>
                  <button onClick={() => setTransactionState('Pending')} className="w-full mt-3 text-xs opacity-50 hover:opacity-100 transition-opacity">
                    Back to Edit Order
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* FULFILLED EMPTY STATE */}
          {cart.length > 0 && transactionState === 'Fulfilled' && (
            <div className="p-8 flex flex-col items-center justify-center flex-1 text-center bg-green-50/50">
               <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                 <Check size={32} className="text-green-600" />
               </div>
               <h3 className="text-xl font-bold text-green-800 mb-2">Sale Completed!</h3>
               <p className="text-sm text-green-600/70 mb-8">Transaction has been recorded.</p>
               <button onClick={() => setShowReceiptModal(true)} className="btn-secondary w-full justify-center mb-3">View Receipt</button>
               <button onClick={resetPOS} className="btn-primary w-full justify-center bg-green-600 hover:bg-green-700">Start New Transaction</button>
            </div>
          )}
        </div>
      </div>

      {/* SET PRICE MODAL */}
      {editPriceSku && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditPriceSku(null)} />
          <div className="relative w-full max-w-xs animate-slide-up rounded-2xl p-6 border" style={{ background: 'var(--color-bg-modal)', borderColor: 'var(--color-border)' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-themed-heading">Set Retail Price</h3>
              <button onClick={() => setEditPriceSku(null)}><X size={18} className="text-themed-muted"/></button>
            </div>
            <p className="text-sm text-themed-muted mb-3">{editPriceSku.product_name}</p>
            <input 
              type="number" step="0.50" min="0" 
              value={editPriceValue} 
              onChange={e => setEditPriceValue(e.target.value)} 
              className="input-field w-full mb-4" 
              placeholder="e.g. 150.00"
              autoFocus
            />
            <button onClick={setSkuPrice} className="btn-primary w-full justify-center">Save Price</button>
          </div>
        </div>
      )}

      {/* RECEIPT PREVIEW MODAL */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReceiptModal(false)} />
          <div className="relative w-full max-w-sm animate-slide-up bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-full">
            <div className="p-4 flex justify-between items-center border-b border-gray-100 bg-gray-50 shrink-0">
               <h3 className="font-bold text-gray-700">Receipt</h3>
               <button onClick={() => setShowReceiptModal(false)} className="text-gray-400 hover:text-gray-900"><X size={20}/></button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white">
               {/* Explicit padding added to receiptRef so html2canvas captures everything */}
               <div ref={receiptRef} className="bg-white text-black w-full p-6 pb-12" style={{ maxWidth: '350px', margin: '0 auto' }}>
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-mono font-bold mb-1 tracking-tight">ELGREENSYDE</h2>
                    <p className="text-xs font-mono uppercase tracking-widest font-semibold">Valencia City<br/>0991 417 2982</p>
                  </div>
                  
                  <div className="text-xs font-mono mb-4 text-gray-800 border-t-2 border-dashed border-black pt-3 mt-3">
                    <div className="flex justify-between"><span>OR #: <strong>#{Date.now().toString().slice(-4)}</strong></span><span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}</span></div>
                    <div className="mt-1">Cust: <strong>{customers.find(c => (c.customer_id || c.id) === selectedCustomerId)?.name || 'Guest'}</strong></div>
                  </div>

                  <div className="border-t-2 border-b-2 border-dashed border-black py-3 mb-4 text-sm font-mono text-gray-900">
                    <div className="flex justify-between text-xs font-bold mb-2 uppercase"><span>Item</span><span className="text-center w-12">Qty</span><span className="text-right">Amt</span></div>
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between mb-1 text-xs">
                        <span className="flex-1 font-bold">{item.name}<br/><span className="font-normal text-[10px] text-gray-600">@ {fmt(item.unitPrice)}</span></span>
                        <span className="w-12 text-center">{item.qty}</span>
                        <span className="text-right">{fmt(item.total)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 text-sm font-mono text-gray-800 mb-2 border-b-2 border-black pb-3">
                     <div className="flex justify-between"><span>Subtotal</span><span>{fmt(cartSubtotal)}</span></div>
                     {parseFloat(discountValue) > 0 && <div className="flex justify-between text-red-600 font-bold"><span>Discount</span><span>-{fmt(discountType === 'fixed' ? discountValue : cartSubtotal*(discountValue/100))}</span></div>}
                     {parseFloat(shippingCost) > 0 && <div className="flex justify-between"><span>Shipping</span><span>{fmt(shippingCost)}</span></div>}
                  </div>

                  <div className="flex justify-between items-center text-xl font-mono font-bold border-b-2 border-black pb-3 mb-3">
                    <span>TOTAL</span>
                    <span>{fmt(cartTotal)}</span>
                  </div>

                  <div className="text-xs font-mono text-gray-800 space-y-1 pb-6 border-b-2 border-dashed border-black">
                     <div className="flex justify-between"><span>Payment:</span><span>{paymentMethod}</span></div>
                     {amountTendered && <div className="flex justify-between"><span>Tendered:</span><span>{fmt(amountTendered)}</span></div>}
                     {amountTendered && <div className="flex justify-between font-bold"><span>Change:</span><span>{fmt(Math.max(0, parseFloat(amountTendered) - cartTotal))}</span></div>}
                  </div>

                  <div className="text-center text-xs font-mono mt-6 italic">
                     <p>"Happy Planting! 🌿"</p>
                     <p>Thank you for growing with us.</p>
                     <p className="text-[10px] mt-4 text-gray-500 not-italic">Elgreensyde Manager</p>
                  </div>
               </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
               <button onClick={exportReceipt} className="btn-primary w-full justify-center !py-3 bg-[#10b981] hover:bg-[#059669] text-white">
                 <FileDown size={18} /> Print Receipt
               </button>
            </div>
          </div>
        </div>
      )}

      {/* SALES HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)} />
          <div className="relative w-full max-w-2xl animate-slide-up rounded-3xl overflow-hidden flex flex-col border shadow-2xl" style={{ background: 'var(--color-bg-panel)', borderColor: 'var(--color-border)', maxHeight: '80vh' }}>
            <div className="p-5 border-b flex justify-between items-center" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}>
              <h2 className="text-xl font-display font-bold">POS Sales History</h2>
              <button onClick={() => setShowHistoryModal(false)} className="p-2 rounded-full hover:bg-black/5 transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {salesHistory.length === 0 ? (
                <div className="text-center py-12 opacity-50">
                  <Receipt size={40} className="mx-auto mb-3" />
                  <p>No POS sales recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {salesHistory.map((log) => (
                    <div key={log.ledger_id || log.id} className="glass-card-static p-4 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                           <span className="font-bold">{fmt(log.amount)}</span>
                           <span className="badge bg-green-100 text-green-700 text-[10px] uppercase">Paid</span>
                        </div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>{log.description}</p>
                        <p className="text-xs opacity-60 mt-1">{new Date(log.entry_date).toLocaleDateString()}</p>
                      </div>
                      <button 
                        onClick={() => toast('Edit feature coming soon. Please edit via Finance Ledger.', { icon: 'ℹ️' })}
                        className="btn-secondary px-3 py-1.5 text-xs"
                      >
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default POS;
