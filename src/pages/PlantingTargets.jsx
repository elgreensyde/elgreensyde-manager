import { useState, useEffect } from 'react';
import { Target, Plus, X, AlertTriangle, CheckCircle, TrendingDown, Sprout, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import supabase from '../lib/supabase';
import db from '../services/db';

function PlantingTargets() {
  const [targets, setTargets] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [crops, setCrops] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]); // Pending/Packed line items for soft allocation
  const [batches, setBatches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const defaultForm = { sku_id: '', weekly_target_qty: '', avg_nursery_days: '' };
  const [form, setForm] = useState(defaultForm);

  const load = async () => {
    const [targetsResp, invResp, cropsResp, batchesResp, ordersResp] = await Promise.all([
      supabase.from('planting_targets').select('*'),
      db.getAll('inventory'),
      supabase.from('crops').select('id, common_name, days_to_maturity'),
      supabase.from('batches').select('crop_id, market_ready_quantity, status').neq('status', 'Discarded'),
      supabase.from('order_line_items')
        .select('sku_id, quantity, orders!inner(status)')
        .in('orders.status', ['Pending', 'Confirmed', 'Packed'])
    ]);

    setTargets(targetsResp.data || []);
    setInventory(invResp || []);
    setCrops(cropsResp.data || []);
    setBatches(batchesResp.data || []);
    setActiveOrders(ordersResp.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Compute available stock after soft allocation
  const getAvailableStock = (skuId) => {
    const sku = inventory.find(s => (s.sku_id || s.id) === skuId);
    const liveStock = parseFloat(sku?.current_stock || 0);
    const reserved = activeOrders
      .filter(o => o.sku_id === skuId)
      .reduce((sum, o) => sum + parseFloat(o.quantity || 0), 0);
    return Math.max(0, liveStock - reserved);
  };

  // Compute pending harvest quantity from active batches
  const getPendingHarvest = (skuId) => {
    // Match batches to inventory SKUs by product name (best effort without FK)
    const sku = inventory.find(s => (s.sku_id || s.id) === skuId);
    if (!sku) return 0;
    return batches
      .filter(b => b.status !== 'Completed' && b.market_ready_quantity > 0)
      .reduce((sum, b) => sum + parseFloat(b.market_ready_quantity || 0), 0);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const sku = inventory.find(s => (s.sku_id || s.id) === form.sku_id);
    if (!sku) return toast.error('Select a valid SKU.');

    const weekly = parseFloat(form.weekly_target_qty);
    const nurseryDays = parseInt(form.avg_nursery_days) || 0;

    // Calculate dates
    const nextTargetDate = new Date();
    nextTargetDate.setDate(nextTargetDate.getDate() + 7); // Next week

    const requiredSowDate = new Date(nextTargetDate);
    requiredSowDate.setDate(requiredSowDate.getDate() - nurseryDays);

    const alertDate = new Date(requiredSowDate);
    alertDate.setDate(alertDate.getDate() - 2); // Alert 2 days before sow date

    const { error } = await supabase.from('planting_targets').insert({
      sku_id: form.sku_id,
      weekly_target_qty: weekly,
      avg_nursery_days: nurseryDays,
      next_target_date: nextTargetDate.toISOString().split('T')[0],
      required_sow_date: requiredSowDate.toISOString().split('T')[0],
      alert_date: alertDate.toISOString().split('T')[0]
    });

    if (error) {
      toast.error('Failed to save target.');
      console.error(error);
    } else {
      toast.success('Planting target set!');
      setShowForm(false);
      setForm(defaultForm);
      load();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this planting target?')) return;
    await supabase.from('planting_targets').delete().eq('target_id', id);
    load();
  };

  const fmt = (n) => parseFloat(n || 0).toFixed(0);
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—';

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Planting Targets</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Demand forecasting · Sow date calculator</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={18} /><span className="hidden sm:inline">Add Target</span>
          </button>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span className="flex items-center gap-1"><CheckCircle size={12} className="text-green-500" /> Covered</span>
          <span className="flex items-center gap-1"><AlertTriangle size={12} className="text-amber-500" /> Borderline</span>
          <span className="flex items-center gap-1"><TrendingDown size={12} className="text-red-500" /> Shortfall</span>
        </div>
      </div>

      <div className="px-5 pb-24 space-y-3">
        {targets.length === 0 ? (
          <div className="glass-card-static p-10 text-center border border-dashed border-gray-600/30">
            <Target size={36} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No planting targets set.</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Set a weekly target for each SKU you supply to wholesale clients. The system will calculate your required sow date.
            </p>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-4 mx-auto">Set First Target</button>
          </div>
        ) : targets.map(target => {
          const available = getAvailableStock(target.sku_id);
          const pending = getPendingHarvest(target.sku_id);
          const projected = available + pending;
          const gap = projected - parseFloat(target.weekly_target_qty);
          const coveragePct = Math.min(100, (projected / parseFloat(target.weekly_target_qty)) * 100);

          const sku = inventory.find(s => (s.sku_id || s.id) === target.sku_id);

          let statusConfig;
          if (gap >= 0) {
            statusConfig = { label: 'Covered', color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/30', icon: CheckCircle, bar: 'bg-green-500' };
          } else if (gap >= -(parseFloat(target.weekly_target_qty) * 0.25)) {
            statusConfig = { label: 'Borderline', color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30', icon: AlertTriangle, bar: 'bg-amber-500' };
          } else {
            statusConfig = { label: 'Shortfall', color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/30', icon: TrendingDown, bar: 'bg-red-500' };
          }

          const StatusIcon = statusConfig.icon;

          const today = new Date();
          const sowDate = new Date(target.required_sow_date);
          const daysToSow = Math.ceil((sowDate - today) / (1000 * 60 * 60 * 24));
          const sowUrgent = daysToSow <= 2;

          return (
            <div key={target.target_id} className={`glass-card border overflow-hidden ${statusConfig.bg}`}>
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold" style={{ color: 'var(--color-text-heading)' }}>{sku?.product_name || target.sku_id}</h3>
                      <span className={`badge text-[10px] ${statusConfig.color} ${statusConfig.bg}`}>
                        <StatusIcon size={10} className="inline mr-1" />{statusConfig.label}
                      </span>
                    </div>
                    <p className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{sku?.sku_code}</p>
                  </div>
                  <button onClick={() => handleDelete(target.target_id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400/60 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Gap Analysis */}
                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  <div className="rounded-xl py-2" style={{ background: 'var(--color-bg-card)' }}>
                    <p className="text-lg font-bold" style={{ color: 'var(--color-text-heading)' }}>{fmt(target.weekly_target_qty)}</p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Weekly Target</p>
                  </div>
                  <div className="rounded-xl py-2" style={{ background: 'var(--color-bg-card)' }}>
                    <p className="text-lg font-bold text-blue-500">{fmt(projected)}</p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Projected Supply</p>
                  </div>
                  <div className="rounded-xl py-2" style={{ background: 'var(--color-bg-card)' }}>
                    <p className={`text-lg font-bold ${gap >= 0 ? 'text-green-500' : 'text-red-500'}`}>{gap >= 0 ? '+' : ''}{fmt(gap)}</p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Gap</p>
                  </div>
                </div>

                {/* Coverage Bar */}
                <div className="h-2 rounded-full mb-3 overflow-hidden" style={{ background: 'var(--color-bg-card)' }}>
                  <div className={`h-full rounded-full transition-all ${statusConfig.bar}`} style={{ width: `${coveragePct}%` }} />
                </div>

                {/* Sow Date */}
                <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${sowUrgent ? 'bg-red-500/10 border border-red-500/30' : ''}`} style={!sowUrgent ? { background: 'var(--color-bg-card)' } : {}}>
                  <div className="flex items-center gap-2">
                    <Sprout size={14} className={sowUrgent ? 'text-red-500' : 'text-green-500'} />
                    <div>
                      <p className={`text-xs font-bold ${sowUrgent ? 'text-red-500' : ''}`} style={!sowUrgent ? { color: 'var(--color-text-primary)' } : {}}>
                        Sow by {fmtDate(target.required_sow_date)}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                        for delivery on {fmtDate(target.next_target_date)} · {target.avg_nursery_days}d growth
                      </p>
                    </div>
                  </div>
                  {sowUrgent && (
                    <span className="badge bg-red-500/20 text-red-500 text-[10px]">
                      {daysToSow <= 0 ? 'OVERDUE' : `${daysToSow}d left!`}
                    </span>
                  )}
                </div>

                {/* Stock breakdown */}
                <div className="flex gap-3 mt-2 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  <span>Available: <strong className="text-green-500">{fmt(available)}</strong></span>
                  <span>In Batches: <strong className="text-blue-400">{fmt(pending)}</strong></span>
                  <span>Reserved: <strong className="text-amber-500">{fmt(available - parseFloat(sku?.current_stock || 0) + available)}</strong></span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-3xl p-6 border" style={{ background: 'var(--color-bg-modal)', borderColor: 'var(--color-border)' }}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-themed-heading">New Planting Target</h2>
              <button onClick={() => setShowForm(false)}><X size={20} className="text-themed-muted" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs text-themed-muted block mb-1">Inventory SKU *</label>
                <select required value={form.sku_id} onChange={e => setForm({ ...form, sku_id: e.target.value })} className="input-field w-full">
                  <option value="">Select SKU...</option>
                  {inventory.map(s => (
                    <option key={s.sku_id || s.id} value={s.sku_id || s.id}>{s.product_name} ({s.sku_code})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Weekly Target (units) *</label>
                  <input type="number" min="1" required value={form.weekly_target_qty} onChange={e => setForm({ ...form, weekly_target_qty: e.target.value })} className="input-field w-full" placeholder="e.g. 50" />
                </div>
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Days to Maturity *</label>
                  <input type="number" min="1" required value={form.avg_nursery_days} onChange={e => setForm({ ...form, avg_nursery_days: e.target.value })} className="input-field w-full" placeholder="e.g. 21" />
                </div>
              </div>
              <p className="text-xs p-3 rounded-xl" style={{ background: 'var(--color-bg-card)', color: 'var(--color-text-muted)' }}>
                💡 The system will calculate when you need to sow seeds to have stock ready for your next delivery.
              </p>
              <button type="submit" className="btn-primary w-full justify-center py-3">Set Target</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlantingTargets;
