import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Check, Plus, Minus, Trash2, Receipt, FileDown, Store, Tag, X, Lock, Zap, UserPlus, Scale, ShoppingBag, Smartphone, CheckCircle2 } from 'lucide-react';
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
  
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('All');
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [amountTendered, setAmountTendered] = useState('');

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [salesHistory, setSalesHistory] = useState([]);
  
  const [weightItem, setWeightItem] = useState(null);
  const [customWeight, setCustomWeight] = useState('');

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: '', contact_number: '', type: 'Walk-in' });

  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const [editPriceSku, setEditPriceSku] = useState(null);
  const [editPriceValue, setEditPriceValue] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [busySkus, setBusySkus] = useState(new Set()); 
  const [reservedQtys, setReservedQtys] = useState({}); 
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

    const reserved = {};
    for (const item of (reservedResp.data || [])) {
      reserved[item.sku_id] = (reserved[item.sku_id] || 0) + parseFloat(item.quantity || 0);
    }
    setReservedQtys(reserved);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getPrice = (sku) => parseFloat(sku.retail_price) || 0;

  const getAvailable = (sku) => {
    const skuId = sku.sku_id || sku.id;
    const reserved = reservedQtys[skuId] || 0;
    return Math.max(0, parseFloat(sku.current_stock || 0) - reserved);
  };

  const getReserved = (sku) => reservedQtys[sku.sku_id || sku.id] || 0;

  const isRlsPolicyError = (err) =>
    (err?.message || '').toLowerCase().includes('row-level security policy');

  const recordRevenueEntry = async (amount, description) => {
    try {
      await db.insert('financial_ledger', {
        entry_type: 'Revenue',
        amount,
        description,
        order_id: null,
        entry_date: new Date().toISOString().split('T')[0]
      });
      return true;
    } catch (err) {
      if (isRlsPolicyError(err)) return false;
      throw err;
    }
  };

  const setSkuPrice = async () => {
    const price = parseFloat(editPriceValue);
    if (isNaN(price) || price < 0) return toast.error('Invalid price.');
    await db.update('inventory', editPriceSku.sku_id || editPriceSku.id, { retail_price: price });
    toast.success(`Price set to PHP ${price.toFixed(2)} for ${editPriceSku.product_name}`);
    setEditPriceSku(null);
    load();
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.from('customers').insert([customerForm]).select().single();
      if (error) throw error;
      toast.success('Customer added!');
      setCustomers(prev => [...prev, data]);
      setSelectedCustomerId(data.customer_id || data.id);
      setShowCustomerModal(false);
      setCustomerForm({ name: '', contact_number: '', type: 'Walk-in' });
    } catch (err) {
      toast.error('Failed to add customer. Ensure you are online.');
      console.error(err);
    }
  };

  const addToCart = (sku) => {
    const unitPrice = getPrice(sku);
    if (unitPrice === 0) {
      toast.error('Set a retail price first by clicking the price icon.');
      return;
    }
    if (sku.current_stock <= 0) {
      toast.error('Out of stock!');
      return;
    }
    
    if (sku.sales_format === 'Grams') {
      setWeightItem(sku); 
    } else {
      const existing = cart.find(c => c.sku_id === (sku.sku_id || sku.id));
      if (existing) {
        setCart(prev => prev.map(c => c.sku_id === existing.sku_id ? { ...c, qty: c.qty + 1, total: (c.qty + 1) * c.unitPrice } : c));
      } else {
        setCart(prev => [...prev, { id: Date.now().toString(), sku_id: sku.sku_id || sku.id, name: sku.product_name, qty: 1, format: 'pc', unitPrice, total: unitPrice }]);
      }
    }
  };

  const confirmWeightAdd = (grams) => {
    const qty = parseInt(grams, 10);
    if (isNaN(qty) || qty <= 0) return toast.error('Invalid weight.');
    if (qty > getAvailable(weightItem)) return toast.error(`Only ${getAvailable(weightItem)}g available.`);
    
    const unitPricePerKg = getPrice(weightItem); 
    const totalPrice = (qty / 1000) * unitPricePerKg;

    setCart(prev => [...prev, { 
      id: Date.now().toString(), 
      sku_id: weightItem.sku_id || weightItem.id, 
      name: weightItem.product_name, 
      qty: qty, 
      format: 'g', 
      unitPrice: unitPricePerKg, 
      total: totalPrice 
    }]);
    
    setWeightItem(null);
    setCustomWeight('');
  };

  const adjustQty = (itemId, delta) => {
    setCart(prev => prev.map(c => {
      if (c.id !== itemId) return c;
      if (c.format === 'g') return c; 
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
      for (const item of cart) {
        const sku = inventory.find(s => (s.sku_id || s.id) === item.sku_id);
        if (sku) {
          const newStock = Math.max(0, parseFloat(sku.current_stock) - item.qty);
          await db.update('inventory', sku.sku_id || sku.id, { current_stock: newStock });
        }
      }

      const customer = customers.find(c => (c.customer_id || c.id) === selectedCustomerId);
      const description = `POS Sale — ${customer ? customer.name : 'Walk-in'} (${paymentMethod})`;
      const ledgerSaved = await recordRevenueEntry(cartTotal, description);
      if (ledgerSaved) toast.success(`PHP ${cartTotal.toFixed(2)} sale recorded!`);
      else toast.error('Sale completed, but ledger write is blocked by RLS.');
      setTransactionState('Fulfilled');
      setShowReceiptModal(true);
      load(); 
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

  const handleQuickSell = async (sku) => {
    const skuId = sku.sku_id || sku.id;
    if (busySkus.has(skuId)) return;

    const price = getPrice(sku);
    const available = getAvailable(sku);

    if (price === 0) return toast.error('Set a retail price first (price icon).');
    if (available <= 0) return toast.error('No available stock for this item.');

    setBusySkus(prev => new Set(prev).add(skuId));
    try {
      const newStock = Math.max(0, parseFloat(sku.current_stock) - 1);
      await db.update('inventory', skuId, { current_stock: newStock });

      const ledgerSaved = await recordRevenueEntry(price, `Quick Sell — ${sku.product_name} (Walk-in / Cash)`);
      if (ledgerSaved) toast.success(`${sku.product_name} sold for ${fmt(price)}!`);
      else toast.error('Sale done, but ledger write is blocked by RLS.');
      await load(); 
    } catch (err) {
      toast.error('Quick Sell failed. Check console.');
      console.error(err);
    } finally {
      setBusySkus(prev => {
        const next = new Set(prev);
        next.delete(skuId);
        return next;
      });
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

  const fmt = (a) => `PHP ${parseFloat(a || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  const filteredInventory = inventory.filter(sku => {
    const matchesSearch = sku.product_name.toLowerCase().includes(searchQuery.toLowerCase()) || sku.sku_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = formatFilter === 'All' || sku.sales_format === formatFilter;
    return matchesSearch && matchesFilter;
  });

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter flex h-[calc(100vh-80px)] mt-2 pb-16 sm:pb-0">
      <div className="w-full sm:grid sm:grid-cols-12 gap-0 overflow-hidden relative">
        
        {/* LEFT COLUMN: CATALOG */}
        <div className="flex-1 sm:col-span-7 lg:col-span-8 p-4 sm:p-6 pb-24 sm:pb-6 overflow-y-auto flex flex-col bg-white sm:bg-transparent" style={{ borderRight: '1px solid var(--color-border)' }}>
          <div className="mb-6 space-y-4 shrink-0">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-display font-bold flex items-center gap-2" style={{ color: 'var(--color-text-heading)' }}>
                <Store size={22} className="text-emerald-500" /> Products Catalog
              </h2>
              <div className="flex items-center gap-3">
                <button 
                  onClick={openHistory}
                  className="btn-secondary !py-2 text-xs text-themed-muted hover:text-black font-bold hidden sm:flex items-center gap-1"
                >
                  <Receipt size={14} /> Sales History
                </button>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="input-field pl-4 text-sm w-32 sm:w-48"
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
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors ${formatFilter === f ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-black/5 text-gray-500 hover:bg-black/10'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          
          {filteredInventory.length === 0 ? (
            <div className="text-center py-16 opacity-50 flex-1 flex flex-col justify-center">
              <ShoppingCart size={40} className="mx-auto mb-3"/>
              <p className="text-sm">No items found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
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
                      className={`glass-card transition-all p-4 text-left flex flex-col justify-between w-full min-h-[120px] ${isOutOfStock || busySkus.has(sku.sku_id || sku.id) ? 'opacity-40 cursor-not-allowed' : 'bg-gradient-to-br from-white to-gray-50 group-hover:-translate-y-1 group-hover:shadow-lg'}`}
                      disabled={isOutOfStock || busySkus.has(sku.sku_id || sku.id)}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            {sku.sales_format}
                          </span>
                          {/* Soft Allocation Reserved Badge */}
                          {reserved > 0 && (
                            <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-500 bg-amber-500/15 px-1.5 py-0.5 rounded-full">
                              <Lock size={8} /> {reserved} rsvd
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-semibold leading-tight text-gray-800 mt-2">
                          {sku.product_name}
                        </h3>
                      </div>
                      <div className="mt-3 flex items-end justify-between">
                        <p className="text-lg font-bold text-emerald-600">
                          {price > 0 ? `${fmt(price)}${sku.sales_format === 'Grams' ? '/kg' : ''}` : 'No price'}
                        </p>
                        <p className={`text-xs ${isLow ? 'text-amber-500 font-bold' : isOutOfStock ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                          {isOutOfStock ? 'None left' : `${available} avail.`}
                        </p>
                      </div>
                      {busySkus.has(sku.sku_id || sku.id) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/40 rounded-2xl backdrop-blur-[1px]">
                          <div className="loading-spinner w-5 h-5" />
                        </div>
                      )}
                    </button>
                    {/* Set price button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditPriceSku(sku); setEditPriceValue(sku.retail_price?.toString() || ''); }}
                      className="absolute top-2 right-2 p-1.5 bg-emerald-500 text-white rounded-lg opacity-0 sm:opacity-0 group-hover:opacity-100 shadow-lg shadow-emerald-500/30 transition-all hover:scale-110"
                      title="Set retail price"
                    >
                      <Tag size={12}/>
                    </button>
                    {/* Quick Sell */}
                    {sku.sales_format === 'Units' && !isOutOfStock && price > 0 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleQuickSell(sku); }}
                        className={`absolute bottom-2 right-2 p-1.5 rounded-lg bg-indigo-500 text-white opacity-0 sm:opacity-0 group-hover:opacity-100 shadow-lg shadow-indigo-500/30 transition-all hover:scale-110 active:scale-95 ${busySkus.has(sku.sku_id || sku.id) ? 'pointer-events-none' : ''}`}
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
        <div className={`w-full sm:col-span-5 lg:col-span-4 flex-col h-full bg-white sm:bg-gray-50 border-l border-gray-100 sm:flex ${mobileCartOpen ? 'fixed inset-0 z-[100] flex animate-slide-up bg-white' : 'hidden'}`}>
          <div className="p-4 sm:p-5 border-b shrink-0 flex items-center justify-between bg-white sm:bg-transparent">
            <h2 className="text-lg font-display font-bold flex items-center gap-2">
              {mobileCartOpen && <button onClick={() => setMobileCartOpen(false)} className="sm:hidden p-1.5 mr-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><X size={18}/></button>}
              Current Order
            </h2>
            {transactionState !== 'Pending' && <span className={`badge ${transactionState === 'Fulfilled' ? 'bg-green-500/20 text-green-700' : 'bg-amber-500/20 text-amber-700'}`}>{transactionState}</span>}
          </div>

          {/* Cart Items Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
             {cart.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center opacity-40">
                 <ShoppingBag size={48} className="mb-4 text-emerald-500" />
                 <p className="text-sm font-semibold">Cart is empty</p>
               </div>
             ) : transactionState === 'Fulfilled' ? (
               <div className="flex flex-col items-center animate-fade-in py-10">
                 <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                   <Check size={32} className="text-green-600" />
                 </div>
                 <h3 className="text-xl font-bold mb-1">Payment Received!</h3>
                 <p className="text-sm text-gray-500 mb-8">{fmt(cartTotal)} via {paymentMethod}</p>
                 
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
                           <span>{item.qty}{item.format === 'g' ? 'g' : 'x'} {item.name}</span>
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

                 <button onClick={exportReceipt} className="btn-secondary w-full justify-center mb-3 text-indigo-600"><FileDown size={18} /> Export Receipt (PNG)</button>
                 <button onClick={resetPOS} className="btn-primary w-full justify-center bg-indigo-600 hover:bg-indigo-700">Start New Order</button>
               </div>
             ) : (
               cart.map(item => (
                 <div key={item.id} className="p-3 flex justify-between items-center bg-white border border-gray-100 rounded-xl shadow-sm">
                   <div className="flex-1 min-w-0">
                     <h4 className="text-sm font-semibold truncate text-gray-800">{item.name}</h4>
                     <p className="text-xs text-gray-500">{fmt(item.unitPrice)}/kg × {item.qty}{item.format}</p>
                   </div>
                   <div className="flex items-center gap-2 ml-2">
                     <span className="font-bold text-emerald-600 text-sm">{fmt(item.total)}</span>
                     {transactionState === 'Pending' && (
                       <div className="flex items-center gap-1">
                         {item.format !== 'g' && <button onClick={() => adjustQty(item.id, -1)} className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-gray-600"><Minus size={10}/></button>}
                         {item.format !== 'g' && <button onClick={() => adjustQty(item.id, 1)} className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center hover:bg-gray-200 text-gray-600"><Plus size={10}/></button>}
                         <button onClick={() => setCart(prev => prev.filter(c => c.id !== item.id))} className="text-red-500 p-1.5 hover:bg-red-50 rounded"><Trash2 size={13} /></button>
                       </div>
                     )}
                   </div>
                 </div>
               ))
             )}
          </div>

          {/* Checkout Footer */}
          {cart.length > 0 && transactionState !== 'Fulfilled' && (
            <div className="shrink-0 pt-4 pb-24 sm:pb-6 px-4 sm:px-5 border-t border-gray-200 bg-white shadow-[0_-4px_15px_rgba(0,0,0,0.03)] z-10">
              
              <div className="bg-gray-50 p-4 rounded-2xl mb-4 border border-gray-100">
                 <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between items-center font-medium">
                       <span>Subtotal</span>
                       <span className="font-mono">{fmt(cartSubtotal)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                       <span className="text-amber-600 font-medium tracking-tight">Discount</span>
                       <div className="flex items-center gap-1 w-[130px]">
                          <select 
                            className="flex-1 p-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white font-semibold"
                            value={discountType} onChange={e => setDiscountType(e.target.value)}
                          >
                            <option value="none">None</option>
                            <option value="pct">% Off</option>
                            <option value="fixed">Fixed</option>
                          </select>
                          <input 
                            type="number" className="w-[60px] p-1.5 border border-gray-200 rounded-lg text-xs text-center outline-none bg-white font-mono font-bold" 
                            placeholder="0" value={discountValue} onChange={e => setDiscountValue(e.target.value)}
                            disabled={discountType === 'none'}
                          />
                       </div>
                    </div>

                    <div className="flex justify-between items-center">
                       <span className="font-medium">Shipping</span>
                       <input 
                          type="number" className="w-20 p-1.5 border border-gray-200 rounded-lg text-xs text-right outline-none bg-white font-mono font-bold" 
                          placeholder="0.00" value={shippingCost} onChange={e => setShippingCost(e.target.value)}
                       />
                    </div>
                 </div>
                 
                 <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between items-end">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total</span>
                    <span className="text-3xl font-display font-bold text-emerald-600 tracking-tight">{fmt(cartTotal)}</span>
                 </div>
              </div>

              {transactionState === 'Pending' && (
                <div className="mb-2">
                  <div className="flex items-center gap-2 mb-3">
                    <select 
                      value={selectedCustomerId} 
                      onChange={e => setSelectedCustomerId(e.target.value)} 
                      className="input-field w-full text-sm font-semibold text-gray-700 bg-white"
                    >
                      <option value="">Walk-in Customer</option>
                      {customers.map(c => <option key={c.customer_id || c.id} value={c.customer_id || c.id}>{c.name}</option>)}
                    </select>
                    <button onClick={() => setShowCustomerModal(true)} title="Add Customer" className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 shrink-0 border border-indigo-100 transition-colors">
                      <UserPlus size={18} />
                    </button>
                  </div>
                  <button onClick={handleConfirm} className="btn-primary w-full justify-center !py-4 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 border-none transition-all">
                    Checkout Order
                  </button>
                </div>
              )}

              {transactionState === 'Confirmed' && (
                <div className="animate-slide-up">
                  <p className="text-xs text-amber-600 font-bold mb-2 uppercase tracking-wider">Select Payment Method</p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {['Cash', 'GCash', 'Bank Transfer', 'Credit'].map(m => (
                      <button key={m} onClick={() => setPaymentMethod(m)} 
                              className={`py-2 text-sm rounded-lg border transition-all font-semibold ${paymentMethod === m ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'} `}>
                        {m}
                      </button>
                    ))}
                  </div>

                  <div className="mb-4">
                    <label className="text-xs text-gray-500 font-bold block mb-1 uppercase tracking-wider">Amount Tendered</label>
                    <input 
                       type="number" 
                       className="input-field w-full text-xl font-mono font-bold bg-white text-center py-3" 
                       placeholder="0.00" 
                       value={amountTendered} 
                       onChange={e => setAmountTendered(e.target.value)} 
                     />
                     {parseFloat(amountTendered) >= cartTotal && (
                       <p className="text-sm text-green-600 font-bold mt-2 text-center bg-green-50 py-2 rounded-lg border border-green-100">Change: {fmt(parseFloat(amountTendered) - cartTotal)}</p>
                     )}
                  </div>

                  <button onClick={handleFulfill} className="btn-primary w-full justify-center !py-4 text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-lg shadow-indigo-600/20">
                    <CheckCircle2 size={20} className="mr-2" /> Complete Sale ({paymentMethod})
                  </button>
                  <button onClick={() => setTransactionState('Pending')} className="w-full mt-4 text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors">
                    Back to Edit Order
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MOBILE STICKY FLOATING CART BAR */}
        {cart.length > 0 && !mobileCartOpen && transactionState === 'Pending' && (
          <div 
             className="sm:hidden fixed bottom-24 left-4 right-4 p-4 bg-emerald-600 text-white flex justify-between items-center shadow-[0_10px_40px_rgba(16,185,129,0.4)] z-[90] rounded-2xl cursor-pointer hover:bg-emerald-700 transition-all active:scale-95 animate-slide-up" 
             onClick={() => setMobileCartOpen(true)}
          >
             <div className="flex items-center gap-4">
                <div className="relative bg-white/20 p-2.5 rounded-xl">
                  <ShoppingBag size={22}/>
                  <span className="absolute -top-2 -right-2 bg-amber-500 text-black text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold border-2 border-emerald-600 shadow-sm">{cart.length}</span>
                </div>
                <div className="flex flex-col text-left">
                   <span className="font-bold text-sm tracking-wide">VIEW ORDER</span>
                   <span className="text-emerald-100 text-[10px] font-semibold uppercase opacity-80">Ready to Checkout</span>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <span className="text-xl font-display font-bold">{fmt(cartTotal)}</span>
                <div className="bg-white/20 p-1 rounded-full"><Plus size={16} /></div>
             </div>
          </div>
        )}
      </div>

      {/* CUSTOMER CREATION MODAL */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowCustomerModal(false)} />
          <form onSubmit={handleAddCustomer} className="relative w-full max-w-sm animate-slide-up bg-white rounded-3xl shadow-2xl p-6 border border-gray-100 max-h-[90vh] overflow-y-auto mt-[5vh] sm:mt-0">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-display font-bold text-gray-800 flex items-center gap-2"><UserPlus size={22} className="text-indigo-500" /> New Customer</h3>
              <button type="button" onClick={() => setShowCustomerModal(false)} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"><X size={18}/></button>
            </div>
            
            <div className="space-y-4 mb-6">
               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Full Name / Business Name *</label>
                 <input 
                   required
                   autoFocus
                   type="text" 
                   value={customerForm.name} 
                   onChange={e => setCustomerForm({...customerForm, name: e.target.value})} 
                   className="input-field w-full font-semibold" 
                   placeholder="e.g. John Doe"
                 />
               </div>
               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Contact Number</label>
                 <input 
                   type="text" 
                   value={customerForm.contact_number} 
                   onChange={e => setCustomerForm({...customerForm, contact_number: e.target.value})} 
                   className="input-field w-full" 
                   placeholder="e.g. 0912 345 6789"
                 />
               </div>
               <div>
                 <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 block">Buyer Category</label>
                 <div className="grid grid-cols-2 gap-2">
                    {['Walk-in', 'Wholesale'].map(type => (
                       <button
                         key={type}
                         type="button"
                         onClick={() => setCustomerForm({...customerForm, type})}
                         className={`py-2 px-3 text-sm font-semibold border rounded-xl transition-all ${customerForm.type === type ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                       >
                          {type}
                       </button>
                    ))}
                 </div>
               </div>
            </div>

            <button type="submit" className="btn-primary w-full justify-center !py-3.5 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 text-white font-bold">
               Save Customer
            </button>
          </form>
        </div>
      )}

      {/* WEIGHT SELECTION MODAL */}
      {weightItem && (
        <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setWeightItem(null)} />
          <div className="relative w-full max-w-sm animate-slide-up bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto mt-[5vh] sm:mt-0">
            <div className="bg-emerald-50 p-6 border-b border-emerald-100 flex justify-between items-start pattern-dots pattern-emerald-500 pattern-opacity-10 pattern-size-4">
               <div>
                 <div className="flex items-center gap-2 mb-1">
                   <div className="bg-emerald-500 text-white p-1.5 rounded-lg shadow-sm"><Scale size={16}/></div>
                   <h3 className="font-display font-bold text-emerald-900 text-lg">Select Weight</h3>
                 </div>
                 <p className="text-sm text-emerald-700 font-medium">{weightItem.product_name}</p>
               </div>
               <button onClick={() => setWeightItem(null)} className="p-1.5 bg-emerald-100/50 rounded-full text-emerald-600 hover:bg-emerald-200 transition-colors"><X size={18}/></button>
            </div>
            
            <div className="p-6">
               <div className="grid grid-cols-2 gap-3 mb-6">
                  {[50, 100, 250, 500, 1000].map(grams => (
                     <button
                       key={grams}
                       onClick={() => confirmWeightAdd(grams)}
                       className="py-3 px-4 bg-gray-50 border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 rounded-xl transition-all shadow-sm flex flex-col items-center justify-center group active:scale-95"
                     >
                        <span className="font-bold text-gray-800 tracking-tight text-lg group-hover:text-emerald-700">{grams >= 1000 ? `${grams/1000}kg` : `${grams}g`}</span>
                        <span className="text-[10px] text-gray-400 font-semibold mt-1">Preset</span>
                     </button>
                  ))}
               </div>

               <div className="border-t border-gray-100 pt-5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Custom Weight (Grams)</label>
                  <div className="flex gap-2">
                     <input 
                       type="number" 
                       value={customWeight}
                       onChange={(e) => setCustomWeight(e.target.value)}
                       className="input-field flex-1 text-lg font-mono font-bold text-center bg-gray-50" 
                       placeholder="e.g. 150"
                       autoFocus
                     />
                     <button 
                       onClick={() => confirmWeightAdd(customWeight)}
                       className="btn-primary !px-6 bg-emerald-600 hover:bg-emerald-700"
                     >
                        Add
                     </button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* SET PRICE MODAL */}
      {editPriceSku && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setEditPriceSku(null)} />
          <div className="relative w-full max-w-xs animate-slide-up rounded-3xl p-6 bg-white border border-gray-200 shadow-2xl max-h-[90vh] overflow-y-auto mt-[5vh] sm:mt-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-bold text-gray-800">Set Retail Price</h3>
              <button onClick={() => setEditPriceSku(null)} className="p-1.5 bg-gray-100 rounded-full text-gray-500"><X size={16}/></button>
            </div>
            <p className="text-sm text-gray-500 mb-3">{editPriceSku.product_name}</p>
            <input 
              type="number" step="0.50" min="0" 
              value={editPriceValue} 
              onChange={e => setEditPriceValue(e.target.value)} 
              className="input-field w-full mb-4 text-center text-lg font-bold" 
              placeholder="e.g. 150.00"
              autoFocus
            />
            <button onClick={setSkuPrice} className="btn-primary w-full justify-center bg-emerald-600 hover:bg-emerald-700">Save Price</button>
          </div>
        </div>
      )}

      {/* RECEIPT PREVIEW MODAL */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowReceiptModal(false)} />
          <div className="relative w-full max-w-sm animate-slide-up bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] mt-[5vh] sm:mt-0">
            <div className="p-4 flex justify-between items-center border-b border-gray-100 bg-gray-50 shrink-0">
               <h3 className="font-bold text-gray-700">Receipt Viewer</h3>
               <button onClick={() => setShowReceiptModal(false)} className="text-gray-400 hover:text-gray-900"><X size={20}/></button>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-gray-100/50">
               <div ref={receiptRef} className="bg-white text-black w-full p-6 pb-12 shadow-md border border-gray-200" style={{ maxWidth: '350px', margin: '0 auto' }}>
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-mono font-bold mb-1 tracking-tight">ELGREENSYDE</h2>
                    <p className="text-xs font-mono uppercase tracking-widest font-semibold text-gray-600">Valencia City<br/>0991 417 2982</p>
                  </div>
                  
                  <div className="text-xs font-mono mb-4 text-gray-800 border-t-2 border-dashed border-gray-400 pt-3 mt-3">
                    <div className="flex justify-between"><span>OR #: <strong>#{Date.now().toString().slice(-4)}</strong></span><span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}</span></div>
                    <div className="mt-1">Cust: <strong>{customers.find(c => (c.customer_id || c.id) === selectedCustomerId)?.name || 'Walk-in'}</strong></div>
                  </div>

                  <div className="border-t-2 border-b-2 border-dashed border-gray-400 py-3 mb-4 text-xs font-mono text-gray-900">
                    <div className="flex justify-between font-bold mb-2 uppercase"><span>Item</span><span className="text-center w-12">Qty</span><span className="text-right">Amt</span></div>
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between mb-2 pb-2 border-b border-gray-100 last:border-0 last:pb-0">
                        <span className="flex-1 pr-2 leading-tight">
                           <strong>{item.name}</strong><br/>
                           <span className="text-[10px] text-gray-500">@ {fmt(item.unitPrice)}</span>
                        </span>
                        <span className="w-12 text-center text-gray-700">{item.qty}{item.format}</span>
                        <span className="text-right font-semibold">{fmt(item.total)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 text-sm font-mono text-gray-800 mb-2 border-b-2 border-gray-400 pb-3">
                     <div className="flex justify-between"><span>Subtotal</span><span>{fmt(cartSubtotal)}</span></div>
                     {parseFloat(discountValue) > 0 && <div className="flex justify-between text-black font-bold"><span>Discount</span><span>-{fmt(discountType === 'fixed' ? discountValue : cartSubtotal*(discountValue/100))}</span></div>}
                     {parseFloat(shippingCost) > 0 && <div className="flex justify-between"><span>Shipping</span><span>{fmt(shippingCost)}</span></div>}
                  </div>

                  <div className="flex justify-between items-center text-xl font-mono font-bold border-b-2 border-gray-400 pb-3 mb-3">
                    <span>TOTAL</span>
                    <span>{fmt(cartTotal)}</span>
                  </div>

                  <div className="text-xs font-mono text-gray-800 space-y-1 pb-6 border-b-2 border-dashed border-gray-400">
                     <div className="flex justify-between"><span>Payment:</span><span>{paymentMethod}</span></div>
                     {amountTendered && <div className="flex justify-between"><span>Tendered:</span><span>{fmt(amountTendered)}</span></div>}
                     {amountTendered && <div className="flex justify-between font-bold"><span>Change:</span><span>{fmt(Math.max(0, parseFloat(amountTendered) - cartTotal))}</span></div>}
                  </div>

                  <div className="text-center text-xs font-mono mt-6 italic text-gray-800">
                     <p>"Happy Planting!"</p>
                     <p>Thank you for growing with us.</p>
                     <p className="text-[10px] mt-4 text-gray-500 not-italic uppercase tracking-widest font-semibold">Elgreensyde Systems</p>
                  </div>
               </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-white shrink-0">
               <button onClick={exportReceipt} className="btn-primary w-full justify-center !py-3 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20">
                 <FileDown size={18} /> Download Receipt Image
               </button>
            </div>
          </div>
        </div>
      )}

      {/* SALES HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)} />
          <div className="relative w-full max-w-2xl animate-slide-up rounded-3xl overflow-hidden flex flex-col bg-white shadow-2xl max-h-[90vh] mt-[5vh] sm:mt-0">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-display font-bold text-gray-800">POS Sales History</h2>
              <button onClick={() => setShowHistoryModal(false)} className="p-2 bg-white rounded-full text-gray-500 hover:bg-gray-100 transition-colors shadow-sm"><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              {salesHistory.length === 0 ? (
                <div className="text-center py-12 opacity-50">
                  <Receipt size={40} className="mx-auto mb-3" />
                  <p>No POS sales recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {salesHistory.map((log) => (
                    <div key={log.ledger_id || log.id} className="p-4 flex justify-between items-center border border-gray-100 rounded-2xl hover:border-indigo-200 transition-colors hover:shadow-sm">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                           <span className="font-bold text-gray-800 text-lg">{fmt(log.amount)}</span>
                           <span className="badge bg-emerald-50 text-emerald-600 text-[10px] uppercase border border-emerald-100">Paid</span>
                        </div>
                        <p className="text-sm font-medium text-gray-600">{log.description}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(log.entry_date).toLocaleDateString()}</p>
                      </div>
                      <button 
                        onClick={() => toast('Edit feature coming soon. Please edit via Finance Ledger.', { icon: 'i' })}
                        className="btn-secondary px-3 py-1.5 text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100"
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
