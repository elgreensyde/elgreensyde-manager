import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Printer, AlertTriangle, Clock, CheckCircle2,
  Sprout, ShoppingCart, DollarSign, Lock, Package,
  ChevronRight, Leaf, Sun, Moon, Calendar, ScanEye
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';
import db from '../services/db';
import { getBatchStage } from '../services/taskEngine';
import { runDailyTaskGeneration } from '../services/taskAutomation';
import { generatePreventiveAlerts } from '../services/preventiveAlerts';

function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [batches, setBatches] = useState([]);
  const [crops, setCrops] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();

  const [weatherBriefing, setWeatherBriefing] = useState(null);
  const [awayPeriods, setAwayPeriods] = useState([]);
  const [showAwayModal, setShowAwayModal] = useState(false);
  const [lastScouted, setLastScouted] = useState(null);

  const loadData = useCallback(async () => {
    try {
      await db.markOverdueTasks();
      await generatePreventiveAlerts();
      const { default: weatherService } = await import('../services/weatherService');
      
      const [t, b, c, i, p, h, w, away, sessions] = await Promise.all([
        db.getAll('tasks'), db.getAll('batches'), db.getAll('crops'), 
        db.getAll('inventory'), db.getAll('plots'), db.getAll('harvest_logs'),
        weatherService.getForecast(),
        db.getAll('away_periods'),
        db.getAll('monitoring_sessions')
      ]);
      
      const todayStr = new Date().toISOString().split('T')[0];
      const newTasks = runDailyTaskGeneration(t || [], p || [], b || [], h || [], i || [], c || []);
      const trulyNew = newTasks.filter(nt =>
        !(t || []).some(existing =>
          existing.title === nt.title &&
          existing.due_date === todayStr &&
          (existing.status === 'Pending' || existing.status === 'Overdue')
        )
      );
      if (trulyNew.length > 0) {
        await db.insertMany('tasks', trulyNew);
        const latestTasks = await db.getAll('tasks');
        setTasks(latestTasks || []);
      } else {
        setTasks(t || []);
      }

      setBatches(b || []); setCrops(c || []); setInventory(i || []);
      setAwayPeriods(away || []);
      
      if (sessions && sessions.length > 0) {
        const latest = sessions.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0];
        setLastScouted(latest.created_at || latest.started_at);
      }
      
      if (w) {
         // Aggregate 48h briefing
         const risks = [];
         if (w.precipitation_probability_max[0] > 70 || w.precipitation_probability_max[1] > 70) risks.push('Heavy Rain (Leach Risk)');
         if (w.windspeed_10m_max[0] > 30 || w.windspeed_10m_max[1] > 30) risks.push('High Wind (Foliar Warning)');
         if (w.temperature_2m_max[0] > 32 || w.temperature_2m_max[1] > 32) risks.push('Excessive Heat (Transplant Stress)');
         setWeatherBriefing({ risks, temp: w.temperature_2m_max[0] });
      }
    } catch (err) { console.error('Dashboard load error:', err); }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const today = new Date().toISOString().split('T')[0];
  const activeAway = useMemo(() => awayPeriods.find(p => p.start_date <= today && p.end_date >= today && p.is_active), [awayPeriods, today]);
  
  const overdueTasks = useMemo(() => tasks.filter(t => t.status === 'Overdue'), [tasks]);
  const todayTasks = useMemo(() => tasks.filter(t => t.due_date === today && t.status === 'Pending'), [tasks, today]);
  const upcomingTasks = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return tasks.filter(t => t.due_date > today && t.due_date <= d.toISOString().split('T')[0] && t.status === 'Pending');
  }, [tasks, today]);
  const lowStockItems = useMemo(() => inventory.filter(i => i.current_stock <= i.restock_alert_level && i.restock_alert_level > 0), [inventory]);
  const activeBatches = useMemo(() => batches.filter(b => b.status === 'Nursery'), [batches]); 

  const completeTask = async (taskId) => {
    await db.update('tasks', taskId, { status: 'Completed', completed_at: new Date().toISOString() });
    loadData();
  };

  const handleCreateAway = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const start = formData.get('start');
    const end = formData.get('end');
    
    await db.insert('away_periods', {
      start_date: start,
      end_date: end,
      is_active: true,
      is_acknowledged: false
    });
    
    setShowAwayModal(false);
    loadData();
    toast.success('Away Period Scheduled');
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
      <div className="text-center"><div className="loading-spinner mx-auto mb-3" /><p className="text-themed-muted text-sm">Loading cockpit...</p></div>
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
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-badge-herb-text)' }}>Solo Cockpit</span>
            </div>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>{greeting()} 🌿</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{formatDate()}</p>
              {lastScouted && (
                <>
                  <span style={{ color: 'var(--color-text-muted)' }}>·</span>
                  <div className="flex items-center gap-1.5">
                    <ScanEye size={14} className="text-themed-muted" />
                    {(() => {
                      const days = Math.floor((new Date() - new Date(lastScouted)) / (1000 * 60 * 60 * 24));
                      if (days === 0) return <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded">Scouted Today ✅</span>;
                      if (days <= 3) return <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Scouted {days}d ago ⚠️</span>;
                      return <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded animate-pulse">Scouted {days}d ago 🔴</span>;
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAwayModal(true)} className={`away-mode-btn p-2.5 rounded-xl border flex items-center gap-2 transition-all no-print ${activeAway ? 'border-indigo-500/40 text-indigo-400' : 'border-themed text-themed-muted hover:opacity-80'}`} style={{ background: 'var(--color-bg-card)' }}>
               <Calendar size={18} />
               <span className="text-xs font-bold">{activeAway ? 'Away Mode ON' : 'Away Mode'}</span>
            </button>
            <button onClick={toggleTheme} className="p-2.5 rounded-xl glass-card-static no-print" id="theme-toggle" title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-500" />}
            </button>
          </div>
        </div>

        {/* 48h Weather Briefing */}
        {weatherBriefing && (
          <div className="mt-5 p-4 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-xl flex items-center gap-5 overflow-hidden relative group">
             <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sun size={64} />
             </div>
             <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-xl font-bold">
                {Math.round(weatherBriefing.temp)}°
             </div>
             <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">48h Operational Briefing</p>
                <div className="flex flex-wrap gap-2">
                   {weatherBriefing.risks.length === 0 ? (
                     <span className="text-xs font-medium text-emerald-400">Environment Stable — Full Ops Cleared</span>
                   ) : weatherBriefing.risks.map(r => (
                     <span key={r} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                        <AlertTriangle size={8}/> {r}
                     </span>
                   ))}
                </div>
             </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="glass-card-static p-3 text-center">
            <div className="text-2xl font-bold font-display" style={{ color: 'var(--color-text-heading)' }}>{activeBatches.length}</div>
            <div className="text-[10px] font-medium uppercase tracking-wider mt-1" style={{ color: 'var(--color-text-muted)' }}>Nursery</div>
          </div>
          <div className="glass-card-static p-3 text-center relative overflow-hidden">
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
                <div key={task.id} className="glass-card p-4 border-l-4 border-l-red-500/70 flex items-center gap-3 select-none">
                  <button onClick={(e) => { e.stopPropagation(); completeTask(task.task_id || task.id); }} className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-red-500/50 hover:bg-red-500/20 active:scale-90 transition-all" />
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
                <div key={task.id} className="glass-card p-4 border-l-4 border-l-amber-500/70 flex items-center gap-3 select-none">
                  <button onClick={(e) => { e.stopPropagation(); completeTask(task.task_id || task.id); }} className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-amber-500/50 hover:bg-amber-500/20 active:scale-90 transition-all" />
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
                <div key={item.sku_id || item.id} className="glass-card p-4 border-l-4 border-l-red-500/50 flex items-center justify-between">
                  <div><p className="text-sm font-medium text-red-500">{item.product_name}</p><p className="text-xs text-red-500/60 mt-0.5">{item.current_stock} {item.sales_format} remaining (min: {item.restock_alert_level})</p></div>
                  <Package size={16} className="text-red-500/50" />
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
                const daysIn = batch.start_date ? Math.floor((new Date() - new Date(batch.start_date)) / 86400000) : 0;
                return (
                  <div key={batch.batch_id || batch.id} className="glass-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{batch.batch_code}</span>
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{crop?.common_name || 'Unknown'}</p>
                      </div>
                      <span className="badge bg-amber-500/15 text-amber-600 text-[10px]">{batch.status}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{batch.propagation_method}</span>
                      <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Day {daysIn} · {batch.initial_quantity} pots started</span>
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
            {lowStockItems.map(i => <div key={i.sku_id || i.id} style={{ marginBottom: '6px', fontSize: '10pt' }}>• {i.product_name} — {i.current_stock} {i.sales_format} remaining</div>)}
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

      {/* AWAY MODE MODAL */}
      {showAwayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-scale-in">
            <div className="bg-indigo-600 p-6 text-white text-center">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                <Calendar size={32} />
              </div>
              <h2 className="text-xl font-display font-bold">Schedule Absence</h2>
              <p className="text-xs text-indigo-100 mt-1">reschedule non-critical operations</p>
            </div>
            
            <form onSubmit={handleCreateAway} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Departure Date</label>
                <input required type="date" name="start" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all text-sm font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Return Date</label>
                <input required type="date" name="end" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 outline-none transition-all text-sm font-medium" />
              </div>
              
              <div className="pt-2 flex flex-col gap-2">
                <button type="submit" className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
                  Confirm Dates & Protect
                </button>
                <button type="button" onClick={() => setShowAwayModal(false)} className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FLOATING ACTION: PRINT — sits 84px above bottom to clear nav bar + safe area */}
      <button 
        onClick={generatePDF} 
        disabled={generatingPDF} 
        style={{ bottom: 'calc(68px + env(safe-area-inset-bottom, 0px))' }}
        className="print-fab fixed right-5 w-12 h-12 rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-40 no-print"
        title="Export Daily Run Sheet PDF"
      >
        <span className="absolute inset-0 rounded-full" style={{ background: 'var(--color-bg-nav)', border: '1px solid var(--color-border)' }} />
        <span className="relative">{generatingPDF ? <div className="loading-spinner w-5 h-5 border-2" /> : <Printer size={20} style={{ color: 'var(--color-text-muted)' }} />}</span>
      </button>


    </div>
  );
}

export default Dashboard;
