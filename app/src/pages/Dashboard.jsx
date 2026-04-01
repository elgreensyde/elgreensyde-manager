import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Printer, AlertTriangle, Clock, CheckCircle2,
  Sprout, ShoppingCart, DollarSign, Lock, Package,
  ChevronRight, Leaf, Sun, Moon
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import db from '../services/db';
import { getBatchStage } from '../services/taskEngine';

function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [batches, setBatches] = useState([]);
  const [crops, setCrops] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();

  const loadData = useCallback(async () => {
    try {
      await db.markOverdueTasks();
      await db.unlockExpiredIPM();
      const [t, b, c, i] = await Promise.all([
        db.getAll('tasks'), db.getAll('batches'),
        db.getAll('crops'), db.getAll('inventory_items')
      ]);
      setTasks(t); setBatches(b); setCrops(c); setInventory(i);
    } catch (err) { console.error('Dashboard load error:', err); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const today = new Date().toISOString().split('T')[0];
  const overdueTasks = useMemo(() => tasks.filter(t => t.status === 'Overdue'), [tasks]);
  const todayTasks = useMemo(() => tasks.filter(t => t.due_date === today && t.status === 'Pending'), [tasks, today]);
  const upcomingTasks = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return tasks.filter(t => t.due_date > today && t.due_date <= d.toISOString().split('T')[0] && t.status === 'Pending');
  }, [tasks, today]);
  const lowStockItems = useMemo(() => inventory.filter(i => i.current_qty <= i.min_threshold && i.min_threshold > 0), [inventory]);
  const activeBatches = useMemo(() => batches.filter(b => b.status === 'Active' || b.status === 'Ready'), [batches]);
  const expiringToday = useMemo(() => batches.filter(b => b.ipm_locked && b.ipm_unlock_date === today), [batches, today]);

  const completeTask = async (taskId) => {
    await db.update('tasks', taskId, { status: 'Completed', completed_at: new Date().toISOString() });
    loadData();
  };

  const [generatingPDF, setGeneratingPDF] = useState(false);
  const generatePDF = async () => {
    setGeneratingPDF(true);
    const element = document.getElementById('run-sheet-pdf');
    if (!element) return;
    element.style.display = 'block';
    
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Elgreensyde_Run_Sheet_${today}.pdf`);
    } catch (err) {
      console.error('PDF Generation Error:', err);
    } finally {
      element.style.display = 'none';
      setGeneratingPDF(false);
    }
  };

  const getTasksByZone = () => {
    const allPending = [...overdueTasks, ...todayTasks];
    const grouped = {};
    allPending.forEach(t => {
      const batch = batches.find(b => b.id === t.batch_id);
      const zone = batch?.growing_zone || 'Unassigned / Prep Area';
      if (!grouped[zone]) grouped[zone] = [];
      grouped[zone].push(t);
    });
    return Object.entries(grouped);
  };


  const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
  const formatDate = () => new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const getCropName = (cropId) => crops.find(c => c.id === cropId)?.common_name || 'Unknown';

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center"><div className="loading-spinner mx-auto mb-3" /><p className="text-themed-muted text-sm">Loading dashboard...</p></div>
    </div>
  );

  return (
    <div className="page-enter">
      {/* HEADER */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Leaf size={20} style={{ color: 'var(--color-badge-herb-text)' }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-badge-herb-text)' }}>Elgreensyde</span>
            </div>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>{greeting()} 🌿</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>{formatDate()}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 rounded-xl glass-card-static no-print" id="theme-toggle" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-500" />}
            </button>
            <button onClick={generatePDF} disabled={generatingPDF} className="btn-gold !px-3 !py-2 text-xs no-print" id="print-run-sheet-btn">
              {generatingPDF ? <div className="loading-spinner w-4 h-4 border-2" /> : <Printer size={16} />}
              <span className="hidden sm:inline">{generatingPDF ? 'Exporting...' : 'Export to PDF'}</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="glass-card-static p-3 text-center">
            <div className="text-2xl font-bold font-display" style={{ color: 'var(--color-text-heading)' }}>{activeBatches.length}</div>
            <div className="text-[10px] font-medium uppercase tracking-wider mt-1" style={{ color: 'var(--color-text-muted)' }}>Active Batches</div>
          </div>
          <div className="glass-card-static p-3 text-center">
            <div className="text-2xl font-bold font-display text-amber-500">{overdueTasks.length + todayTasks.length}</div>
            <div className="text-[10px] font-medium uppercase tracking-wider mt-1" style={{ color: 'var(--color-text-muted)' }}>Tasks Due</div>
          </div>
          <div className="glass-card-static p-3 text-center">
            <div className={`text-2xl font-bold font-display ${lowStockItems.length > 0 ? 'text-red-500' : ''}`} style={lowStockItems.length === 0 ? { color: 'var(--color-badge-herb-text)' } : {}}>
              {lowStockItems.length}
            </div>
            <div className="text-[10px] font-medium uppercase tracking-wider mt-1" style={{ color: 'var(--color-text-muted)' }}>Low Stock</div>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-4 pb-6">
        {/* OVERDUE */}
        {overdueTasks.length > 0 && (
          <section className="animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse-soft" />
              <h2 className="text-sm font-bold text-red-500 uppercase tracking-wider">Overdue ({overdueTasks.length})</h2>
            </div>
            <div className="space-y-2">
              {overdueTasks.map(task => (
                <div key={task.id} className="glass-card p-4 border-l-4 border-l-red-500/70 flex items-center gap-3">
                  <button onClick={() => completeTask(task.id)} className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-red-500/50 hover:bg-red-500/20 transition-colors" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-500 truncate">{task.title}</p>
                    <p className="text-xs text-red-500/60 mt-0.5">Due: {task.due_date}</p>
                  </div>
                  <AlertTriangle size={16} className="text-red-500 flex-shrink-0 animate-bounce-gentle" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TODAY */}
        <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <h2 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Due Today ({todayTasks.length})</h2>
          </div>
          {todayTasks.length === 0 ? (
            <div className="glass-card-static p-6 text-center">
              <CheckCircle2 className="mx-auto mb-2" size={28} style={{ color: 'var(--color-text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>All caught up for today! 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTasks.map(task => (
                <div key={task.id} className="glass-card p-4 border-l-4 border-l-amber-500/70 flex items-center gap-3">
                  <button onClick={() => completeTask(task.id)} className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-amber-500/50 hover:bg-amber-500/20 transition-colors" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{task.title}</p>
                    {task.priority === 'Critical' && <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded mt-1 inline-block">CRITICAL</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* LOW STOCK */}
        {lowStockItems.length > 0 && (
          <section className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <h2 className="text-sm font-bold text-red-500 uppercase tracking-wider">Low Stock ({lowStockItems.length})</h2>
            </div>
            <div className="space-y-2">
              {lowStockItems.map(item => (
                <div key={item.id} className="glass-card p-4 border-l-4 border-l-red-500/50 flex items-center justify-between">
                  <div><p className="text-sm font-medium text-red-500">{item.name}</p><p className="text-xs text-red-500/60 mt-0.5">{item.current_qty} {item.unit} remaining (min: {item.min_threshold})</p></div>
                  <Package size={16} className="text-red-500/50" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* IPM EXPIRING TODAY */}
        {expiringToday.length > 0 && (
          <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <h2 className="text-sm font-bold text-orange-500 uppercase tracking-wider">IPM Locks Expiring ({expiringToday.length})</h2>
            </div>
            <div className="space-y-2">
              {expiringToday.map(batch => (
                <div key={batch.id} className="glass-card p-4 border-l-4 border-l-orange-500/50 flex items-center justify-between">
                  <div><p className="text-sm font-medium text-orange-500">🔓 {batch.batch_code} — {getCropName(batch.crop_id)}</p><p className="text-xs text-orange-500/60 mt-0.5">Withholding period ends today</p></div>
                  <Lock size={16} className="text-orange-500/50" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* UPCOMING */}
        {upcomingTasks.length > 0 && (
          <section className="animate-fade-in" style={{ animationDelay: '0.25s' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /><h2 className="text-sm font-bold text-blue-500 uppercase tracking-wider">Upcoming ({upcomingTasks.length})</h2></div>
              <Link to="/tasks" className="text-xs flex items-center gap-1 transition-colors" style={{ color: 'var(--color-text-muted)' }}>View All <ChevronRight size={12} /></Link>
            </div>
            <div className="space-y-2">
              {upcomingTasks.slice(0, 5).map(task => (
                <div key={task.id} className="glass-card p-4 border-l-4 border-l-blue-500/30 flex items-center gap-3">
                  <Clock size={14} className="text-blue-500/50 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: 'var(--color-text-secondary)' }}>{task.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{task.due_date}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* QUICK ACTIONS */}
        <section className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h2 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-muted)' }}>Quick Actions</h2>
          <div className="grid grid-cols-3 gap-3">
            <Link to="/batches" className="glass-card p-4 text-center group">
              <Sprout size={24} className="mx-auto mb-2 transition-colors" style={{ color: 'var(--color-badge-herb-text)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>New Batch</span>
            </Link>
            <Link to="/pos" className="glass-card p-4 text-center group">
              <ShoppingCart size={24} className="mx-auto mb-2 transition-colors" style={{ color: 'var(--color-badge-flower-text)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Record Sale</span>
            </Link>
            <Link to="/finance" className="glass-card p-4 text-center group">
              <DollarSign size={24} className="mx-auto mb-2 text-blue-500 transition-colors" />
              <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Log Expense</span>
            </Link>
          </div>
        </section>

        {/* ACTIVE BATCHES PREVIEW */}
        {activeBatches.length > 0 && (
          <section className="animate-fade-in" style={{ animationDelay: '0.35s' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Active Batches</h2>
              <Link to="/batches" className="text-xs flex items-center gap-1 transition-colors" style={{ color: 'var(--color-text-muted)' }}>View All <ChevronRight size={12} /></Link>
            </div>
            <div className="space-y-2">
              {activeBatches.slice(0, 4).map(batch => {
                const crop = crops.find(c => c.id === batch.crop_id);
                if (!crop) return null;
                const stage = getBatchStage(batch, crop);
                const stageColors = { gray: 'bg-gray-500', yellow: 'bg-yellow-500', green: 'bg-green-500', blue: 'bg-blue-500', emerald: 'bg-emerald-500', red: 'bg-red-500' };
                const stageBadge = { gray: 'bg-gray-500/15 text-gray-500', yellow: 'bg-yellow-500/15 text-yellow-600', green: 'bg-green-500/15 text-green-600', blue: 'bg-blue-500/15 text-blue-500', emerald: 'bg-emerald-500/15 text-emerald-600', red: 'bg-red-500/15 text-red-500' };
                return (
                  <div key={batch.id} className="glass-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{batch.batch_code}</span>
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{crop.common_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {batch.ipm_locked && <Lock size={14} className="text-red-500" />}
                        <span className={`badge text-[10px] ${stageBadge[stage.color] || stageBadge.gray}`}>{stage.stage}</span>
                      </div>
                    </div>
                    <div className="w-full rounded-full h-1.5" style={{ background: 'var(--color-border)' }}>
                      <div className={`h-1.5 rounded-full transition-all duration-500 ${stageColors[stage.color] || 'bg-gray-500'}`} style={{ width: `${Math.min(stage.percent, 100)}%` }} />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{batch.growing_zone || 'No zone'}</span>
                      <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                        {crop.days_to_maturity - stage.daysElapsed > 0 ? `${crop.days_to_maturity - stage.daysElapsed}d to harvest` : stage.stage === 'Ready to Harvest' ? 'Ready!' : 'Past window'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* PDF RUN SHEET CONTAINER (Hidden from screen) */}
      <div id="run-sheet-pdf" style={{ display: 'none', width: '210mm', minHeight: '297mm', padding: '15mm', backgroundColor: 'white', color: 'black', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: '20pt', fontWeight: 'bold', margin: '0 0 8px 0', color: '#111' }}>🌿 Elgreensyde — Daily Run Sheet</h1>
        <p style={{ fontSize: '12pt', marginBottom: '24px', color: '#666' }}>{formatDate()}</p>
        
        {overdueTasks.length + todayTasks.length === 0 ? (
          <p style={{ fontStyle: 'italic', color: '#666', marginTop: '20px' }}>No tasks due for today. The farm is caught up!</p>
        ) : (
          getTasksByZone().map(([zone, zoneTasks]) => (
            <div key={zone} style={{ marginBottom: '24px' }}>
              <div style={{ backgroundColor: '#f0fdf4', padding: '6px 12px', borderLeft: '4px solid #16a34a', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '14pt', fontWeight: 'bold', margin: '0', color: '#166534', textTransform: 'uppercase' }}>📍 {zone}</h2>
              </div>
              <div style={{ paddingLeft: '8px' }}>
                {zoneTasks.map(t => {
                  const isOverdue = t.status === 'Overdue';
                  return (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '10px', fontSize: '11pt' }}>
                      <div style={{ border: `2px solid ${isOverdue ? '#ef4444' : '#6b7280'}`, width: '16px', height: '16px', borderRadius: '4px', marginRight: '12px', flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: isOverdue ? 'bold' : 'normal', color: isOverdue ? '#ef4444' : '#111' }}>
                          {isOverdue && '⚠️ '}{t.title}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {lowStockItems.length > 0 && (
          <div style={{ marginTop: '30px' }}>
            <h2 style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '10px', color: '#ef4444', borderBottom: '1px solid #ef4444', paddingBottom: '4px' }}>🔴 LOW STOCK ALERTS</h2>
            {lowStockItems.map(i => <div key={i.id} style={{ marginBottom: '6px', fontSize: '10pt' }}>• {i.name} — {i.current_qty} {i.unit} remaining</div>)}
          </div>
        )}

        <div style={{ marginTop: '30px' }}>
          <h2 style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '10px', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>📋 EC / pH SPOT CHECKS</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginTop: '10px' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left', width: '30%' }}>Zone / Batch</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center', width: '20%' }}>EC (mS/cm)</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'center', width: '20%' }}>pH</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left', width: '30%' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {[1,2,3,4,5].map(i => (
                <tr key={i}>
                  <td style={{ border: '1px solid #ccc', padding: '8px', height: '32px' }}></td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}></td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}></td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '30px' }}>
          <h2 style={{ fontSize: '12pt', fontWeight: 'bold', marginBottom: '16px', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>📝 DAILY FIELD NOTES / SCOUTING</h2>
          <div style={{ borderBottom: '1px dashed #ccc', height: '28px', width: '100%' }}></div>
          <div style={{ borderBottom: '1px dashed #ccc', height: '28px', width: '100%' }}></div>
          <div style={{ borderBottom: '1px dashed #ccc', height: '28px', width: '100%' }}></div>
          <div style={{ borderBottom: '1px dashed #ccc', height: '28px', width: '100%' }}></div>
        </div>

        <p style={{ marginTop: '40px', fontSize: '8pt', color: '#999', textAlign: 'center' }}>Elgreensyde — Purok 17 Hindangon Poblacion, Valencia City, Bukidnon</p>
      </div>
    </div>
  );
}

export default Dashboard;
