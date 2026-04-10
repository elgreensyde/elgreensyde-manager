import { useState, useEffect } from 'react';
import { Users, Plus, X, Phone, MapPin, Edit3, Trash2, Search, Building2, Calendar, ShoppingBag, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import db from '../services/db';
import supabase from '../lib/supabase';
import { confirmAction } from '../services/dialogService';

const TYPES = ['Walk-in', 'Wholesale', 'Online'];
const TABS = ['All', 'Wholesale', 'Walk-in', 'Online'];

const DELIVERY_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Flexible'];

function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [orderStats, setOrderStats] = useState({}); // { customer_id: { count, total, active } }
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const defaultForm = {
    name: '',
    business_name: '',
    contact_number: '',
    address: '',
    type: 'Walk-in',
    delivery_day: 'Flexible',
    notes: ''
  };
  const [form, setForm] = useState(defaultForm);

  const load = async () => {
    const [custData, ordersData] = await Promise.all([
      db.getAll('customers') || [],
      supabase.from('orders').select('order_id, customer_id, status, total_amount')
    ]);

    setCustomers(custData || []);

    // Build order stats per customer
    const stats = {};
    if (ordersData.data) {
      for (const order of ordersData.data) {
        const cid = order.customer_id;
        if (!stats[cid]) stats[cid] = { count: 0, total: 0, active: 0 };
        stats[cid].count++;
        stats[cid].total += parseFloat(order.total_amount || 0);
        if (['Pending', 'Confirmed', 'Packed'].includes(order.status)) {
          stats[cid].active++;
        }
      }
    }
    setOrderStats(stats);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openEdit = (c) => {
    setEditingId(c.customer_id || c.id);
    setForm({
      name: c.name || '',
      business_name: c.business_name || '',
      contact_number: c.contact_number || '',
      address: c.address || '',
      type: c.type || 'Walk-in',
      delivery_day: c.delivery_day || 'Flexible',
      notes: c.notes || ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await db.update('customers', editingId, form);
    } else {
      await db.insert('customers', form);
    }
    setShowForm(false);
    setEditingId(null);
    setForm(defaultForm);
    load();
  };

  const handleDelete = async (id) => {
    if (await confirmAction('Delete this customer? Their order history will be preserved.')) {
      await db.delete('customers', id);
      load();
    }
  };

  const filtered = customers.filter(c => {
    const matchesTab = activeTab === 'All' || c.type === activeTab;
    const matchesSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.contact_number?.includes(search);
    return matchesTab && matchesSearch;
  });

  const typeBadge = {
    'Wholesale': 'bg-blue-500/15 text-blue-500',
    'Walk-in': 'bg-green-500/15 text-green-600',
    'Online': 'bg-purple-500/15 text-purple-500'
  };

  const fmt = (a) => `₱${parseFloat(a || 0).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Customers</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {customers.filter(c => c.type === 'Wholesale').length} wholesale · {customers.length} total
            </p>
          </div>
          <button onClick={() => { setEditingId(null); setForm(defaultForm); setShowForm(true); }} className="btn-primary">
            <Plus size={18} /><span className="hidden sm:inline">Add Customer</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input type="text" placeholder="Search by name or business..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
        </div>

        {/* Tab Filters */}
        <div className="flex gap-2">
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${activeTab === t ? 'bg-green-600 text-white' : ''}`}
              style={activeTab !== t ? { background: 'var(--color-bg-card)', color: 'var(--color-text-muted)' } : {}}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-3 pb-24">
        {filtered.length === 0 ? (
          <div className="glass-card-static p-8 text-center border border-dashed border-gray-600/30">
            <Users size={36} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No customers in this category.</p>
          </div>
        ) : filtered.map(c => {
          const id = c.customer_id || c.id;
          const stats = orderStats[id] || { count: 0, total: 0, active: 0 };
          return (
            <div key={id} className="glass-card p-4">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <h3 className="font-bold text-base leading-tight" style={{ color: 'var(--color-text-heading)' }}>{c.name}</h3>
                    <span className={`badge text-[10px] ${typeBadge[c.type] || 'badge-herb'}`}>{c.type}</span>
                    {stats.active > 0 && (
                      <span className="badge bg-amber-500/20 text-amber-600 text-[10px]">
                        {stats.active} active order{stats.active > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Business Name */}
                  {c.business_name && (
                    <p className="text-xs font-medium flex items-center gap-1 mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                      <Building2 size={11} /> {c.business_name}
                    </p>
                  )}

                  {/* Contact & Address */}
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                    {c.contact_number && <p className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}><Phone size={11} /> {c.contact_number}</p>}
                    {c.address && <p className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}><MapPin size={11} /> {c.address}</p>}
                    {c.delivery_day && c.type === 'Wholesale' && <p className="text-xs flex items-center gap-1 text-blue-500"><Calendar size={11} /> Every {c.delivery_day}</p>}
                  </div>

                  {/* Stats Row */}
                  {stats.count > 0 && (
                    <div className="flex gap-4 mt-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="flex items-center gap-1">
                        <ShoppingBag size={12} className="text-green-500" />
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{stats.count} orders</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp size={12} className="text-green-500" />
                        <span className="text-xs font-semibold text-green-600">{fmt(stats.total)} lifetime</span>
                      </div>
                    </div>
                  )}

                  {c.notes && <p className="text-xs mt-2 italic" style={{ color: 'var(--color-text-muted)' }}>"{c.notes}"</p>}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 shrink-0">
                  {c.type === 'Wholesale' && (
                    <button
                      onClick={() => navigate('/orders/new', { state: { customerId: id, customerName: c.name } })}
                      className="btn-primary !py-1.5 !px-3 !text-xs flex items-center gap-1"
                      title="New wholesale order"
                    >
                      New Order <ArrowRight size={12} />
                    </button>
                  )}
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:opacity-70"><Edit3 size={14} style={{ color: 'var(--color-text-muted)' }} /></button>
                    <button onClick={() => handleDelete(id)} className="p-3 -m-3 rounded-lg hover:bg-red-500/10 transition-colors"><Trash2 size={16} className="text-red-500/50 hover:text-red-500" /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD/EDIT MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-3xl p-6 border max-h-[90vh] overflow-y-auto mt-[5vh] sm:mt-0" style={{ background: 'var(--color-bg-modal)', borderColor: 'var(--color-border)' }}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-themed-heading">{editingId ? 'Edit Customer' : 'New Customer'}</h2>
              <button onClick={() => setShowForm(false)} className="text-themed-muted hover:text-themed-heading"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-themed-muted block mb-1">Full Name *</label>
                  <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field w-full" placeholder="Maria Santos" />
                </div>
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Buyer Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field w-full">
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Contact Number</label>
                  <input type="text" value={form.contact_number} onChange={e => setForm({ ...form, contact_number: e.target.value })} className="input-field w-full" placeholder="09XX" />
                </div>
              </div>

              {form.type === 'Wholesale' && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-blue-500/20 bg-blue-500/5">
                  <div className="col-span-2">
                    <label className="text-xs text-blue-500 block mb-1">Business Name</label>
                    <input type="text" value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} className="input-field w-full" placeholder="Café Uno" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-blue-500 block mb-1">Preferred Delivery Day</label>
                    <select value={form.delivery_day} onChange={e => setForm({ ...form, delivery_day: e.target.value })} className="input-field w-full">
                      {DELIVERY_DAYS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-themed-muted block mb-1">Delivery Address</label>
                <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="input-field w-full" placeholder="Divisoria, CDO" />
              </div>
              <div>
                <label className="text-xs text-themed-muted block mb-1">Notes / Preferences</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="input-field w-full" placeholder="Orders every Friday — 500g basil" />
              </div>
              <button type="submit" className="btn-primary w-full py-3 justify-center">{editingId ? 'Update Customer' : 'Add Customer'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Customers;
