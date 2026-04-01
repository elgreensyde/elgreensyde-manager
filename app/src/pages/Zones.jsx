import { useState, useEffect } from 'react';
import { Plus, X, Trash2, Map } from 'lucide-react';
import db from '../services/db';

const ZONE_TYPES = ['Plot', 'Potted', 'Hydroponic'];

function Zones() {
  const [zones, setZones] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', type: 'Plot' });

  const load = async () => {
    setZones(await db.getAll('zones'));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (zones.find(z => z.name.toLowerCase() === form.name.toLowerCase())) {
      alert('Zone with this name already exists.');
      return;
    }
    await db.insert('zones', form);
    setShowForm(false);
    setForm({ name: '', type: 'Plot' });
    load();
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this zone?')) {
      await db.delete('zones', id);
      load();
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Zones</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Manage your garden layout</p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={18} /><span className="hidden sm:inline">Add Zone</span></button>
        </div>
      </div>

      <div className="px-5 space-y-3 pb-6">
        {zones.length === 0 ? (
          <div className="glass-card-static p-8 text-center">
            <Map className="mx-auto mb-3" size={40} style={{ color: 'var(--color-text-muted)' }} />
            <p style={{ color: 'var(--color-text-muted)' }}>No zones created.</p>
          </div>
        ) : zones.map(zone => (
          <div key={zone.id} className="glass-card p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{zone.name}</h3>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{zone.type}</p>
            </div>
            <button onClick={() => handleDelete(zone.id)} className="p-2 rounded-lg hover:opacity-70 transition-opacity">
              <Trash2 size={16} className="text-red-500/50" />
            </button>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--color-bg-overlay)' }} />
          <div className="relative w-full max-w-lg animate-slide-up rounded-t-3xl sm:rounded-3xl" style={{ background: 'var(--color-bg-modal)', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 flex items-center justify-between">
              <h2 className="text-lg font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Add Zone</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:opacity-70"><X size={20} style={{ color: 'var(--color-text-muted)' }} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Zone Name *</label>
                <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" placeholder="e.g. Raised Bed 4" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Type *</label>
                <select required value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="input-field">
                  {ZONE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-primary w-full justify-center !py-3">Add Zone</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Zones;
