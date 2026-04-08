import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, ChevronRight, Truck, Package, Check, ClipboardList, FileDown, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import html2canvas from 'html2canvas';
import supabase from '../lib/supabase';
import db from '../services/db';
import { confirmAction } from '../services/dialogService';

const STATUS_FLOW = ['Pending', 'Confirmed', 'Packed', 'Fulfilled'];

const STATUS_CONFIG = {
  Pending:   { color: 'bg-gray-500/15 text-gray-400',   ring: 'border-gray-500/30',   label: 'Pending',    next: 'Confirmed', nextLabel: 'Confirm Order',    icon: ClipboardList },
  Confirmed: { color: 'bg-amber-500/15 text-amber-500', ring: 'border-amber-500/30',  label: 'Confirmed',  next: 'Packed',    nextLabel: 'Mark as Packed',   icon: Package },
  Packed:    { color: 'bg-blue-500/15 text-blue-400',   ring: 'border-blue-500/30',   label: 'Packed',     next: 'Fulfilled', nextLabel: 'Mark as Fulfilled', icon: Truck },
  Fulfilled: { color: 'bg-green-500/15 text-green-500', ring: 'border-green-500/30',  label: 'Fulfilled',  next: null,        nextLabel: null,                icon: Check },
};

function FulfillmentBoard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [lineItems, setLineItems] = useState({}); // { order_id: [items] }
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active'); // 'active' | 'fulfilled'
  const [expandedId, setExpandedId] = useState(null);
  const [invoiceOrder, setInvoiceOrder] = useState(null); // for PDF export
  const invoiceRef = useRef(null);

  const load = async () => {
    const [ordersResp, invResp] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      db.getAll('inventory')
    ]);
    setOrders(ordersResp.data || []);
    setInventory(invResp || []);

    // Load line items for all orders
    const { data: items } = await supabase
      .from('order_line_items')
      .select('*, inventory(product_name, sku_code)');

    const grouped = {};
    for (const item of (items || [])) {
      if (!grouped[item.order_id]) grouped[item.order_id] = [];
      grouped[item.order_id].push(item);
    }
    setLineItems(grouped);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const fmt = (a) => `₱${parseFloat(a || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  const advanceStatus = async (order) => {
    const cfg = STATUS_CONFIG[order.status];
    if (!cfg.next) return;

    const isFulfilling = cfg.next === 'Fulfilled';

    // Confirm before Fulfilling (irreversible)
    if (isFulfilling && !(await confirmAction(`Fulfill order ${order.order_number}? This will deduct stock and write to the Ledger.`))) return;

    try {
      // 1. Update order status
      await supabase
        .from('orders')
        .update({ status: cfg.next, updated_at: new Date().toISOString() })
        .eq('order_id', order.order_id);

      // 2. If fulfilling: deduct inventory + write ledger
      if (isFulfilling) {
        const items = lineItems[order.order_id] || [];

        for (const item of items) {
          const sku = inventory.find(s => (s.sku_id || s.id) === item.sku_id);
          if (sku) {
            const newStock = Math.max(0, parseFloat(sku.current_stock) - parseFloat(item.quantity));
            await db.update('inventory', sku.sku_id || sku.id, { current_stock: newStock });
          }
        }

        // Write ledger entry
        await db.insert('financial_ledger', {
          order_id: order.order_id,
          entry_type: 'Revenue',
          amount: order.total_amount,
          description: `Wholesale — ${order.customer_name_cache} · ${order.order_number}`,
          entry_date: new Date().toISOString().split('T')[0]
        });

        toast.success(`${order.order_number} fulfilled! Ledger updated.`);
      } else {
        toast.success(`${order.order_number} → ${cfg.next}`);
      }

      load();
    } catch (err) {
      toast.error('Failed to update order.');
      console.error(err);
    }
  };

  const exportInvoice = async () => {
    if (invoiceRef.current) {
      const canvas = await html2canvas(invoiceRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `Invoice-${invoiceOrder.order_number}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const filteredOrders = orders.filter(o =>
    filter === 'fulfilled' ? o.status === 'Fulfilled' : o.status !== 'Fulfilled'
  );

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Fulfillment Board</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {orders.filter(o => o.status !== 'Fulfilled').length} active orders
            </p>
          </div>
          <button onClick={() => navigate('/orders/new')} className="btn-primary">
            <Plus size={18} /><span className="hidden sm:inline">New Order</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {[['active', 'Active Orders'], ['fulfilled', 'Fulfilled']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${filter === val ? 'bg-green-600 text-white' : ''}`}
              style={filter !== val ? { background: 'var(--color-bg-card)', color: 'var(--color-text-muted)' } : {}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="px-5 pb-24 space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="glass-card-static p-10 text-center border border-dashed border-gray-600/30">
            <ClipboardList size={36} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {filter === 'active' ? 'No active orders.' : 'No fulfilled orders yet.'}
            </p>
            {filter === 'active' && (
              <button onClick={() => navigate('/orders/new')} className="btn-primary mt-4 mx-auto">Create First Order</button>
            )}
          </div>
        ) : filteredOrders.map(order => {
          const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG['Pending'];
          const Icon = cfg.icon;
          const items = lineItems[order.order_id] || [];
          const isExpanded = expandedId === order.order_id;

          return (
            <div key={order.order_id} className={`glass-card border-l-4 overflow-hidden transition-all ${cfg.ring}`}>
              {/* Card Header */}
              <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : order.order_id)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>{order.order_number}</span>
                      <span className={`badge text-[10px] ${cfg.color}`}>
                        <Icon size={10} className="inline mr-1" />{cfg.label}
                      </span>
                    </div>
                    <h3 className="font-bold" style={{ color: 'var(--color-text-heading)' }}>{order.customer_name_cache}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        📦 {items.length} SKU{items.length !== 1 ? 's' : ''}
                      </span>
                      {order.delivery_date && (
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          🗓 {order.delivery_date}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-green-600">{fmt(order.total_amount)}</p>
                    <ChevronRight size={16} className={`ml-auto transition-transform ${isExpanded ? 'rotate-90' : ''}`} style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t px-4 pb-4" style={{ borderColor: 'var(--color-border)' }}>
                  {/* Line Items */}
                  <div className="mt-3 space-y-1.5">
                    {items.map(item => (
                      <div key={item.line_item_id} className="flex justify-between items-center text-sm py-1">
                        <div>
                          <span style={{ color: 'var(--color-text-primary)' }}>{item.inventory?.product_name || '—'}</span>
                          <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>× {item.quantity}</span>
                        </div>
                        <span className="font-mono font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{fmt(item.total)}</span>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <p className="text-xs italic mt-2 px-2 py-1 rounded-lg" style={{ color: 'var(--color-text-muted)', background: 'var(--color-bg-card)' }}>
                      Note: {order.notes}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    {cfg.next && (
                      <button
                        onClick={() => advanceStatus(order)}
                        className={`btn-primary flex-1 justify-center !py-2 text-sm ${cfg.next === 'Fulfilled' ? '!bg-green-600 hover:!bg-green-500' : ''}`}
                      >
                        <ChevronRight size={14} /> {cfg.nextLabel}
                      </button>
                    )}
                    <button
                      onClick={() => setInvoiceOrder(order)}
                      className="btn-secondary !py-2 !px-3 text-xs"
                      title="Export Invoice"
                    >
                      <FileDown size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* INVOICE MODAL */}
      {invoiceOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setInvoiceOrder(null)} />
          <div className="relative w-full max-w-sm animate-slide-up bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 flex justify-between items-center border-b border-gray-100 bg-gray-50 shrink-0">
              <h3 className="font-bold text-gray-700">Wholesale Invoice</h3>
              <button onClick={() => setInvoiceOrder(null)} className="text-gray-400 hover:text-gray-800"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto flex-1 bg-white">
              <div ref={invoiceRef} className="p-8 text-black" style={{ minWidth: '350px' }}>
                <div className="text-center mb-6 border-b-2 border-black pb-4">
                  <h2 className="text-2xl font-mono font-bold tracking-tight">ELGREENSYDE</h2>
                  <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">Farm-to-Table · Valencia City</p>
                  <p className="text-[10px] text-gray-400 mt-1">0991 417 2982</p>
                </div>

                <div className="text-xs font-mono space-y-1 mb-4">
                  <div className="flex justify-between"><span className="font-bold">Invoice #:</span><span>{invoiceOrder.order_number}</span></div>
                  <div className="flex justify-between"><span className="font-bold">Date:</span><span>{new Date().toLocaleDateString('en-PH')}</span></div>
                  <div className="flex justify-between"><span className="font-bold">Delivery:</span><span>{invoiceOrder.delivery_date}</span></div>
                  <div className="flex justify-between"><span className="font-bold">Bill to:</span><span>{invoiceOrder.customer_name_cache}</span></div>
                </div>

                <div className="border-t-2 border-b-2 border-dashed border-gray-400 py-3 mb-4">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-gray-400 mb-2">
                    <span>Product</span><span>Qty</span><span>Unit</span><span>Total</span>
                  </div>
                  {(lineItems[invoiceOrder.order_id] || []).map(item => (
                    <div key={item.line_item_id} className="flex justify-between text-xs font-mono mb-1">
                      <span className="flex-1 mr-2">{item.inventory?.product_name}</span>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <span className="w-16 text-right">{fmt(item.unit_price)}</span>
                      <span className="w-16 text-right font-bold">{fmt(item.total)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between text-base font-mono font-bold border-b-2 border-black pb-2 mb-4">
                  <span>TOTAL DUE</span>
                  <span>{fmt(invoiceOrder.total_amount)}</span>
                </div>

                {invoiceOrder.notes && (
                  <p className="text-[10px] text-gray-500 italic mb-4">Note: {invoiceOrder.notes}</p>
                )}

                <div className="text-center text-[10px] font-mono text-gray-400 mt-6 border-t border-dashed border-gray-300 pt-4">
                  <p>Thank you for your business.</p>
                  <p className="font-bold text-gray-600 mt-1">Elgreensyde Solo Cockpit v3.0</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
              <button onClick={exportInvoice} className="btn-primary w-full justify-center !bg-green-600 hover:!bg-green-500 text-white">
                <FileDown size={16} /> Download Invoice (PNG)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FulfillmentBoard;
