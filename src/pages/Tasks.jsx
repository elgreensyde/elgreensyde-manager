import { useState, useEffect, useMemo } from 'react';
import { Plus, CheckCircle2, Clock, AlertTriangle, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import db from '../services/db';
import { runDailyTaskGeneration } from '../services/taskAutomation';
import { confirmAction } from '../services/dialogService';
import supabase from '../lib/supabase';

function Tasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [batches, setBatches] = useState([]);
  const [crops, setCrops] = useState([]);
  const [plots, setPlots] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', due_date: new Date().toISOString().split('T')[0], priority: 'Medium', batch_id: '', plot_id: '' });

  const loadData = async () => {
    await db.markOverdueTasks();
    const [t, b, c, p, h, i, s, tr] = await Promise.all([
      db.getAll('tasks'), db.getAll('batches'), db.getAll('crops'), 
      db.getAll('plots') || [], db.getAll('harvest_logs') || [], db.getAll('inventory') || [],
      db.getAll('monitoring_sessions') || [], db.getAll('trays') || []
    ]);
    
    const todayStr = new Date().toISOString().split('T')[0];

    // Rule 8: Overdue Escalation (Passive)
    const overdueToEscalate = (t || []).filter(task => {
      if (task.status !== 'Overdue' || task.priority === 'Critical') return false;
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0,0,0,0);
      const daysOverdue = Math.floor((new Date() - dueDate) / 86400000);
      return daysOverdue >= 2;
    });

    if (overdueToEscalate.length > 0) {
      await Promise.all(overdueToEscalate.map(task => 
        db.update('tasks', task.task_id || task.id, { priority: 'Critical' })
      ));
    }

    // Auto-generate passive tasks
    const newTasks = runDailyTaskGeneration(t || [], p || [], b || [], h || [], i || [], c || [], tr || [], s || []);
    const trulyNew = newTasks.filter(nt =>
      !(t || []).some(existing =>
        existing.title === nt.title &&
        existing.due_date === todayStr &&
        (existing.status === 'Pending' || existing.status === 'Overdue')
      )
    );

    if (trulyNew.length > 0 || overdueToEscalate.length > 0) {
      if (trulyNew.length > 0) await db.insertMany('tasks', trulyNew);
      const latestTasks = await db.getAll('tasks');
      setTasks(latestTasks || []);
    } else {
      setTasks(t || []);
    }

    setBatches(b || []); setCrops(c || []); setPlots(p || []); setLoading(false);
  };
  useEffect(() => { loadData(); }, []);

  const today = new Date().toISOString().split('T')[0];
  const overdue = useMemo(() => tasks.filter(t => t.status === 'Overdue').sort((a,b) => a.due_date.localeCompare(b.due_date)), [tasks]);
  const dueToday = useMemo(() => tasks.filter(t => t.due_date === today && t.status === 'Pending'), [tasks, today]);
  const upcoming = useMemo(() => tasks.filter(t => t.due_date > today && t.status === 'Pending').sort((a,b) => a.due_date.localeCompare(b.due_date)), [tasks, today]);
  const completed = useMemo(() => tasks.filter(t => t.status === 'Completed').sort((a,b) => (b.completed_at||'').localeCompare(a.completed_at||'')), [tasks]);

  const displayTasks = filterStatus === 'Overdue' ? overdue : filterStatus === 'Today' ? dueToday : filterStatus === 'Upcoming' ? upcoming : filterStatus === 'Completed' ? completed : [...overdue, ...dueToday, ...upcoming];

  const completeTask = async (taskId) => { 
    try {
      const taskToComplete = tasks.find(t => t.id === taskId || t.task_id === taskId);
      
      // Auto-deduct inventory Phase 5 Logic
      if (taskToComplete && taskToComplete.title) {
         if (taskToComplete.title.includes('Prep Bed Nutrition')) {
            await supabase.rpc('decrement_inventory', { target_sku: 'FERT-14-14-14', amount_to_deduct: 0.045 });
         } else if (taskToComplete.title.includes('Regeneration Feeding')) {
            await supabase.rpc('decrement_inventory', { target_sku: 'FERT-46-0-0', amount_to_deduct: 0.018 });
         }
      }

      await db.update('tasks', taskId, { status: 'Completed', completed_at: new Date().toISOString() }); 
      loadData(); 
    } catch (err) {
      alert(err.message);
      console.error('Error completing task:', err);
    }
  };

  const handleSubmit = async (e) => { e.preventDefault(); await db.insert('tasks', { title: form.title, due_date: form.due_date, priority: form.priority, batch_id: form.batch_id || null, plot_id: form.plot_id || null, status: 'Pending', is_auto_generated: false }); setShowForm(false); setForm({ title: '', due_date: new Date().toISOString().split('T')[0], priority: 'Medium', batch_id: '', plot_id: '' }); loadData(); };

  const deleteTask = async (taskId) => { 
    if (await confirmAction('Delete this task?')) { 
      try {
        await db.delete('tasks', taskId); 
        loadData(); 
      } catch (err) {
        alert(err.message);
        console.error(err);
      }
    } 
  };
  const getBatchLabel = (batchId) => { if (!batchId) return null; const batch = batches.find(b => b.id === batchId || b.batch_id === batchId); const crop = batch ? crops.find(c => c.id === batch.crop_id) : null; return batch ? `${batch.batch_code} ${crop?.common_name||''}` : null; };
  const getPlotLabel = (plotId) => { if (!plotId) return null; const plot = plots.find(p => p.id === plotId || p.plot_id === plotId); return plot ? plot.plot_code : null; };

  const priorityColors = { Critical: 'text-red-500 bg-red-500/10', High: 'text-amber-500 bg-amber-500/10', Medium: 'bg-blue-500/10 text-blue-500', Normal: 'bg-green-500/10 text-green-600', Low: 'bg-gray-500/10 text-gray-500' };
  const statusConfigs = { Overdue: { icon: AlertTriangle, color: 'text-red-500', border: 'border-l-red-500/70' }, Pending: { icon: Clock, color: 'text-amber-500', border: 'border-l-amber-500/50' }, Completed: { icon: CheckCircle2, color: 'text-green-500', border: 'border-l-green-500/30' } };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Tasks</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {overdue.length > 0 && <span className="text-red-500 font-semibold">{overdue.length} overdue</span>}
              {overdue.length > 0 && dueToday.length > 0 && ' · '}
              {dueToday.length > 0 && <span className="text-amber-500">{dueToday.length} today</span>}
            </p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-secondary"><Plus size={18} /><span className="hidden sm:inline">Manual Task</span></button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[{ key: '', label: 'All', count: overdue.length+dueToday.length+upcoming.length }, { key: 'Overdue', label: '🔴 Overdue', count: overdue.length }, { key: 'Today', label: '🟡 Today', count: dueToday.length }, { key: 'Upcoming', label: '🔵 Upcoming', count: upcoming.length }, { key: 'Completed', label: '✅ Done', count: completed.length }].map(tab => (
            <button key={tab.key} onClick={() => setFilterStatus(tab.key)} className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors" style={filterStatus === tab.key ? { background: 'var(--color-bg-card-hover)', color: 'var(--color-text-primary)' } : { color: 'var(--color-text-muted)' }}>
              {tab.label}{tab.count > 0 && <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'var(--color-bg-card)' }}>{tab.count}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 space-y-2 pb-6">
        {displayTasks.length === 0 ? (
          <div className="glass-card-static p-8 text-center"><CheckCircle2 className="mx-auto mb-3" size={40} style={{ color: 'var(--color-text-muted)' }} /><p style={{ color: 'var(--color-text-muted)' }}>{filterStatus === 'Completed' ? 'No completed tasks yet.' : 'All clear! 🎉'}</p></div>
        ) : displayTasks.map(task => {
          const config = statusConfigs[task.status] || statusConfigs.Pending;
          const StatusIcon = config.icon;
          const batchLabel = getBatchLabel(task.batch_id);
          const taskCategory = task.category || 'Maintenance';
          const displayTitle = task.title || 'Untitled Operation';

          return (
            <div key={task.task_id || task.id} className={`glass-card p-4 border-l-4 select-none ${config.border} ${task.status === 'Completed' ? 'opacity-60' : ''} flex items-start gap-3`}>
              {task.status !== 'Completed' ? (
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); completeTask(task.task_id || task.id); }} 
                  className={`flex-shrink-0 w-8 h-8 rounded-full border-2 mt-0.5 p-3 -m-3 active:scale-95 transition-all flex items-center justify-center ${task.status === 'Overdue' ? 'border-red-500/50 bg-red-500/5' : 'border-amber-500/50 bg-amber-500/5'}`}
                  title="Mark as completed"
                />
              ) : <CheckCircle2 size={24} className="text-green-500/50 flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.status === 'Completed' ? 'line-through' : ''}`} style={{ color: task.status === 'Completed' ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>{displayTitle}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{task.due_date}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${priorityColors[task.priority]||''}`}>{task.priority}</span>
                  <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--color-text-muted)' }}>{taskCategory}</span>
                  {getBatchLabel(task.batch_id) && <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>{getBatchLabel(task.batch_id)}</span>}
                  {getPlotLabel(task.plot_id) && <span className="text-[10px] font-mono" style={{ color: 'var(--color-text-muted)' }}>{getPlotLabel(task.plot_id)}</span>}
                  {task.is_auto_generated && <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>⚙ auto</span>}
                </div>
              </div>
              {task.status !== 'Completed' && (
                <div className="flex items-center gap-2">
                  {task.title.toLowerCase().includes('scouting') && (
                    <button onClick={() => navigate('/monitoring')} className="btn-secondary !text-[10px] !px-2 !py-1 flex items-center gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                      Go <ArrowRight size={10} />
                    </button>
                  )}
                  {(task.title.toLowerCase().includes('prep') || task.title.toLowerCase().includes('batch')) && (
                    <button onClick={() => navigate('/batches')} className="btn-secondary !text-[10px] !px-2 !py-1 flex items-center gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20">
                      Go <ArrowRight size={10} />
                    </button>
                  )}
                  <StatusIcon size={16} className={`${config.color} flex-shrink-0`} />
                </div>
              )}
              <button onClick={(e) => { e.stopPropagation(); deleteTask(task.task_id || task.id); }} className="text-red-400/40 hover:text-red-500 p-3 -m-3 rounded-lg transition-colors flex-shrink-0 active:scale-90" title="Delete task"><X size={16} /></button>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--color-bg-overlay)' }} />
          <div className="relative w-full max-w-lg animate-slide-up rounded-t-3xl sm:rounded-3xl" style={{ background: 'var(--color-bg-modal)', border: '1px solid var(--color-border)' }} onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 flex items-center justify-between">
              <h2 className="text-lg font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Add Manual Task</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:opacity-70"><X size={20} style={{ color: 'var(--color-text-muted)' }} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Task Title *</label><input type="text" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input-field" placeholder="What needs to be done?" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Due Date *</label><input type="date" required value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} className="input-field" /></div>
                <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Priority</label><select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="input-field"><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select></div>
              </div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Link to Batch</label><select value={form.batch_id} onChange={e => setForm({...form, batch_id: e.target.value})} className="input-field"><option value="">No batch</option>{batches.filter(b => b.status === 'Nursery').map(b => { const crop = crops.find(c => c.id === b.crop_id); return <option key={b.id || b.batch_id} value={b.id || b.batch_id}>{b.batch_code} — {crop?.common_name||'Unknown'}</option>; })}</select></div>
              <div><label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-muted)' }}>Link to Plot</label><select value={form.plot_id} onChange={e => setForm({...form, plot_id: e.target.value})} className="input-field"><option value="">No plot</option>{plots.map(p => <option key={p.id || p.plot_id} value={p.id || p.plot_id}>{p.plot_code}</option>)}</select></div>
              <button type="submit" className="btn-primary w-full justify-center !py-3">Add Task</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tasks;
