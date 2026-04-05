import { useState, useEffect } from 'react';
import { Users, Plus, X, Phone, MapPin, Edit3, Trash2, Search } from 'lucide-react';
import db from '../services/db';

const TYPES = ['Walk-in', 'Wholesale', 'Online'];

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const defaultForm = { name: '', contact_number: '', address: '', type: 'Walk-in', notes: '' };
  const [form, setForm] = useState(defaultForm);

  const load = async () => {
    const data = await db.getAll('customers') || [];
    setCustomers(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openEdit = (c) => {
    setEditingId(c.customer_id || c.id);
    setForm({ name: c.name || '', contact_number: c.contact_number || '', address: c.address || '', type: c.type || 'Walk-in', notes: c.notes || '' });
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
    if (confirm('Delete this customer?')) {
      await db.delete('customers', id);
      load();
    }
  };

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_number?.includes(search) ||
    c.type?.toLowerCase().includes(search.toLowerCase())
  );

  const typeBadge = {
    'Wholesale': 'bg-blue-500/15 text-blue-500',
    'Walk-in': 'bg-green-500/15 text-green-600',
    'Online': 'bg-purple-500/15 text-purple-500'
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Customers</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{customers.length} buyer profiles</p>
          </div>
          <button onClick={() => { setEditingId(null); setForm(defaultForm); setShowForm(true); }} className="btn-primary">
            <Plus size={18} /><span className="hidden sm:inline">Add Customer</span>
          </button>
        </div>
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input type="text" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
        </div>
      </div>

      <div className="px-5 space-y-3 pb-24">
        {filtered.length === 0 ? (
          <div className="glass-card-static p-8 text-center border border-dashed border-gray-600/30">
            <Users size={36} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No customers yet.</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Walk-in buyers don't need profiles, but regular clients and wholesale accounts benefit from one.</p>
          </div>
        ) : filtered.map(c => (
          <div key={c.customer_id || c.id} className="glass-card p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-heading)' }}>{c.name}</h3>
                  <span className={`badge text-[10px] ${typeBadge[c.type] || 'badge-herb'}`}>{c.type}</span>
                </div>
                {c.contact_number && <p className="text-sm flex items-center gap-1 mt-1" style={{ color: 'var(--color-text-muted)' }}><Phone size={12}/> {c.contact_number}</p>}
                {c.address && <p className="text-sm flex items-center gap-1 mt-1" style={{ color: 'var(--color-text-muted)' }}><MapPin size={12}/> {c.address}</p>}
                {c.notes && <p className="text-xs mt-2 italic" style={{ color: 'var(--color-text-muted)' }}>"{c.notes}"</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(c)} className="p-2 rounded-lg hover:opacity-70"><Edit3 size={14} style={{ color: 'var(--color-text-muted)' }}/></button>
                <button onClick={() => handleDelete(c.customer_id || c.id)} className="p-2 rounded-lg hover:opacity-70"><Trash2 size={14} className="text-red-500/50"/></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-3xl p-6 border" style={{ background: 'var(--color-bg-modal)', borderColor: 'var(--color-border)' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-themed-heading">{editingId ? 'Edit Customer' : 'New Customer'}</h2>
              <button onClick={() => setShowForm(false)} className="text-themed-muted hover:text-themed-heading"><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-themed-muted block mb-1">Name *</label>
                <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field w-full" placeholder="Café Uno / Maria Santos" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Contact Number</label>
                  <input type="text" value={form.contact_number} onChange={e => setForm({...form, contact_number: e.target.value})} className="input-field w-full" placeholder="09XX-XXX-XXXX" />
                </div>
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Buyer Type</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="input-field w-full">
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-themed-muted block mb-1">Delivery Address</label>
                <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="input-field w-full" placeholder="Divisoria, CDO" />
              </div>
              <div>
                <label className="text-xs text-themed-muted block mb-1">Notes / Preferences</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} className="input-field w-full" placeholder="Orders every Friday — 500g basil" />
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
