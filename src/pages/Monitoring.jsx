import { useState, useEffect } from 'react';
import {
  Eye, ClipboardCheck, AlertTriangle, Check, X, Leaf, Bug, Droplets,
  Beaker, History, ChevronRight, Sprout, Zap, FlaskConical, Plus, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import db from '../services/db';
import supabase from '../lib/supabase';

// --- CONSTANTS ---
const SESSION_TYPES = [
  { type: 'Daily Scan', icon: Eye, desc: '5 quick questions · ~3 min', color: '#10b981' },
  { type: 'Weekly Full Check', icon: ClipboardCheck, desc: 'Full crop-by-crop inspection', color: '#3b82f6' },
  { type: 'Triggered Check', icon: AlertTriangle, desc: 'Respond to a flagged issue', color: '#f59e0b' },
];

const NURSERY_ENV_QUESTIONS = [
  { id: 'nursery_humidity', label: 'Humidity', options: ['Normal', 'High', 'Very High'] },
  { id: 'nursery_temp', label: 'Temperature', options: ['Cool', 'Normal', 'Warm', 'Hot'] },
  { id: 'nursery_airflow', label: 'Airflow', options: ['Good', 'Poor', 'Stagnant'] },
  { id: 'nursery_rain', label: 'Rain', options: ['Dry', 'Light Rain', 'Heavy Rain'] },
  { id: 'nursery_light', label: 'Light', options: ['Full Sun', 'Partial', 'Overcast', 'Dark'] },
];

const DAILY_SCAN_QUESTIONS = [
  { id: 'watering', question: 'All areas watered?', icon: Droplets, flag: false },
  { id: 'wilting', question: 'Any wilting or drooping?', icon: Leaf, flag: true },
  { id: 'pests_visible', question: 'Visible pests (aphids, mites)?', icon: Bug, flag: true },
  { id: 'discoloration', question: 'Unusual spots or discoloration?', icon: AlertTriangle, flag: true },
  { id: 'growth_rate', question: 'Growth on track for season?', icon: Sprout, flag: false },
];

const CROP_CHECK_QUESTIONS = [
  { key: 'leaf_color_normal', q: 'Leaf color normal?', severity: false },
  { key: 'new_growth_present', q: 'New growth visible?', severity: false },
  { key: 'pest_damage', q: 'Pest damage visible?', severity: true },
  { key: 'disease_signs', q: 'Disease symptoms (spots, mold)?', severity: true },
  { key: 'soil_moisture', q: 'Soil moisture adequate?', severity: false },
];

const QUICK_LOG_TYPES = [
  { id: 'spray', label: 'Spray Applied', icon: FlaskConical, color: '#3b82f6', category: 'Pest Treatment' },
  { id: 'feed', label: 'Fed Today', icon: Droplets, color: '#10b981', category: 'Fertilize' },
  { id: 'issue', label: 'Issue Spotted', icon: AlertTriangle, color: '#f59e0b', category: null },
];

function Monitoring() {
  const [plots, setPlots] = useState([]);
  const [batches, setBatches] = useState([]);
  const [crops, setCrops] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [openIssues, setOpenIssues] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Session flow state
  const [step, setStep] = useState('home'); // home | nursery | scan | targets | summary
  const [sessionType, setSessionType] = useState('');
  const [nurseryAnswers, setNurseryAnswers] = useState({});
  const [scanAnswers, setScanAnswers] = useState({});
  const [targetChecks, setTargetChecks] = useState([]); // [{type, id, name, crop_id, answers, flagged}]
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [targetAnswers, setTargetAnswers] = useState({});

  // Quick Log state
  const [quickLogType, setQuickLogType] = useState(null); // spray | feed | issue
  const [quickLogForm, setQuickLogForm] = useState({ target_ids: [], method_product: '', dosage_rate: '', notes: '' });

  // Session history
  const [showHistory, setShowHistory] = useState(false);

  // Summary data for post-session
  const [sessionSummary, setSessionSummary] = useState(null);

  const load = async () => {
    try {
      const [plotsData, batchesData, cropsData, invData] = await Promise.all([
        db.getAll('plots'),
        db.getAll('batches'),
        db.getAll('crops'),
        db.getAll('inventory'),
      ]);

      setPlots(plotsData || []);
      setBatches((batchesData || []).filter(b => b.status === 'Nursery'));
      setCrops(cropsData || []);
      setInventory(invData || []);

      // Graceful fallback for optional monitoring tables
      try {
        const [sessData, issuesData, alertsData] = await Promise.all([
          supabase.from('monitoring_sessions').select('*').order('created_at', { ascending: false }).limit(20),
          supabase.from('flagged_issues').select('*').eq('status', 'Open'),
          supabase.from('preventive_alerts').select('*').eq('dismissed', false)
        ]);
        setSessions(sessData.data || []);
        setOpenIssues(issuesData.data || []);
        setActiveAlerts(alertsData.data || []);
      } catch {
        setSessions([]); setOpenIssues([]); setActiveAlerts([]);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getCropName = (id) => crops.find(c => c.id === id)?.common_name || '—';

  /* ---- QUICK LOG ---- */
  const getAllTargets = () => {
    const plotTargets = plots
      .filter(p => p.status === 'Active')
      .map(p => ({ id: p.plot_id, label: `${p.plot_code} (${getCropName(p.crop_id)})`, type: 'plot' }));
    const batchTargets = batches
      .map(b => ({ id: b.batch_id, label: `${b.batch_code} (${getCropName(b.crop_id)})`, type: 'batch' }));
    return [...plotTargets, ...batchTargets];
  };

  const toggleQuickTarget = (id) => {
    setQuickLogForm(prev => ({
      ...prev,
      target_ids: prev.target_ids.includes(id)
        ? prev.target_ids.filter(t => t !== id)
        : [...prev.target_ids, id]
    }));
  };

  const submitQuickLog = async () => {
    if (quickLogType.id === 'issue') {
      if (!quickLogForm.notes) return toast.error('Describe the issue briefly.');
      await supabase.from('flagged_issues').insert({
        issue_type: 'General',
        severity: 'Medium',
        description: quickLogForm.notes,
        status: 'Open'
      });
      toast.success('Issue flagged!');
    } else {
      if (!quickLogForm.method_product) return toast.error('Enter the product used.');
      if (quickLogForm.target_ids.length === 0) return toast.error('Select at least one target.');
      await db.insert('maintenance_logs', {
        event_date: new Date().toISOString().split('T')[0],
        action_category: quickLogType.category,
        target_ids: quickLogForm.target_ids,
        method_product: quickLogForm.method_product,
        dosage_rate: quickLogForm.dosage_rate,
        notes: quickLogForm.notes,
      });
      toast.success(`${quickLogType.label} logged!`);
    }
    setQuickLogType(null);
    setQuickLogForm({ target_ids: [], method_product: '', dosage_rate: '', notes: '' });
    load();
  };

  /* ---- SESSION FLOW ---- */
  const startSession = (type) => {
    setSessionType(type);
    setNurseryAnswers({});
    setScanAnswers({});
    setTargetChecks([]);
    setTargetAnswers({});
    setSelectedTarget(null);
    setSessionSummary(null);
    setStep('nursery');
  };

  const saveSession = async () => {
    try {
      // Build session row
      const sessionRow = {
        session_type: sessionType,
        session_date: new Date().toISOString().split('T')[0],
        ...Object.fromEntries(Object.entries(nurseryAnswers)),
        completed: true
      };

      const { data: session, error } = await supabase.from('monitoring_sessions').insert(sessionRow).select().single();
      if (error) throw error;

      const responses = [];

      // Flat scan answers
      for (const [qId, answer] of Object.entries(scanAnswers)) {
        const q = DAILY_SCAN_QUESTIONS.find(dq => dq.id === qId);
        if (q) {
          responses.push({
            session_id: session.session_id,
            target_type: 'general',
            target_id: '00000000-0000-0000-0000-000000000000',
            section: 'Daily Scan',
            question: q.question,
            answer,
            flagged: answer === 'Yes' && q.flag
          });
        }
      }

      // Per-target checks
      const createdIssues = [];
      for (const tc of targetChecks) {
        for (const [qKey, answer] of Object.entries(tc.answers || {})) {
          const isFlagged = answer === 'Yes' || answer === 'Moderate' || answer === 'Severe';
          responses.push({
            session_id: session.session_id,
            target_type: tc.type,
            target_id: tc.id,
            crop_id: tc.crop_id,
            section: 'Crop Check',
            question: qKey,
            answer,
            flagged: isFlagged
          });
        }
        const isTargetFlagged = Object.values(tc.answers || {}).some(a => ['Yes', 'Moderate', 'Severe'].includes(a));
        if (isTargetFlagged) {
          const severity = Object.values(tc.answers || {}).includes('Severe') ? 'High'
            : Object.values(tc.answers || {}).includes('Moderate') ? 'Medium' : 'Low';
          const issueRow = {
            session_id: session.session_id,
            target_type: tc.type,
            target_id: tc.id,
            crop_id: tc.crop_id,
            issue_type: 'Crop Issue',
            severity,
            description: `${tc.name}: ${Object.entries(tc.answers || {}).filter(([, v]) => ['Yes', 'Moderate', 'Severe'].includes(v)).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
            status: 'Open'
          };
          await supabase.from('flagged_issues').insert(issueRow);
          createdIssues.push(issueRow);
        }
      }

      if (responses.length > 0) {
        await supabase.from('checklist_responses').insert(responses);
      }

      // Cross-tray pattern check
      const flaggedBatches = targetChecks.filter(tc =>
        tc.type === 'batch' && Object.values(tc.answers || {}).some(a => ['Yes', 'Severe'].includes(a))
      );
      if (flaggedBatches.length >= 3) {
        toast('⚠️ Cross-batch pattern — check nursery-wide conditions!', { icon: '🔍', duration: 6000 });
        await supabase.from('flagged_issues').insert({
          session_id: session.session_id,
          issue_type: 'Environmental',
          severity: 'High',
          description: `${flaggedBatches.length} batches flagged with similar symptoms. Possible nursery-wide issue.`,
          status: 'Open'
        });
      }

      setSessionSummary({ session, createdIssues, responseCount: responses.length });
      setStep('summary');
      load();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save session. Check Supabase tables are created.');
    }
  };

  const createTasksFromFlags = async () => {
    if (!sessionSummary?.createdIssues?.length) return;
    
    const existingTasks = await db.getAll('tasks');
    let createdCount = 0;

    for (const issue of sessionSummary.createdIssues) {
      const titleStr = `Resolve: ${issue.description.substring(0, 80)}`;
      const normalizedTitle = titleStr.toLowerCase().trim();
      
      const exists = existingTasks.some(t => 
        (t.status === 'Pending' || t.status === 'Overdue') && 
        t.title.toLowerCase().trim().includes(normalizedTitle)
      );

      if (!exists) {
        await db.insert('tasks', {
          title: titleStr,
          due_date: new Date().toISOString().split('T')[0],
          priority: issue.severity === 'High' ? 'High' : 'Medium',
          status: 'Pending',
          is_auto_generated: true,
          [issue.target_type === 'plot' ? 'plot_id' : 'batch_id']: issue.target_id,
        });
        createdCount++;
      }
    }
    
    if (createdCount > 0) {
      toast.success(`${createdCount} tasks created!`);
    } else {
      toast.error('Tasks already exist for these issues.');
    }
  };

  const dismissAlert = async (alertId) => {
    await db.update('preventive_alerts', alertId, { dismissed: true });
    load();
  };

  const resolveIssue = async (flagId) => {
    await supabase.from('flagged_issues').update({ status: 'Resolved', resolved_date: new Date().toISOString().split('T')[0] }).eq('flag_id', flagId);
    toast.success('Issue resolved!');
    load();
  };

  // --- Step progress indicator ---
  const STEPS = sessionType === 'Daily Scan'
    ? ['Environment', 'Daily Scan']
    : ['Environment', 'Daily Scan', 'Crop Checks'];

  const stepIdx = { nursery: 0, scan: 1, targets: 2 };

  const allTargets = getAllTargets();

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="loading-spinner mx-auto" />
    </div>
  );

  /* =========================================
     HOME SCREEN
  ========================================= */
  if (step === 'home') return (
    <div className="page-enter h-full overflow-y-auto">
      {/* Header */}
      <div className="px-5 pt-6 pb-3">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Farm Walk</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {openIssues.length} open issues · {activeAlerts.length} auto-alerts
            </p>
          </div>
          <button onClick={() => setShowHistory(v => !v)} className="p-2.5 rounded-xl" style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
            <History size={18} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>
      </div>

      <div className="px-5 space-y-5 pb-28">

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>⚡ Auto-Alerts</p>
            {activeAlerts.slice(0, 3).map(alert => (
              <div key={alert.alert_id} className="glass-card p-3 flex items-start gap-3" style={{
                borderLeft: `3px solid ${alert.priority === 'Critical' ? '#ef4444' : alert.priority === 'High' ? '#f59e0b' : '#3b82f6'}`
              }}>
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: alert.priority === 'Critical' ? '#ef4444' : '#f59e0b' }} />
                <p className="flex-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>{alert.message}</p>
                <button onClick={() => dismissAlert(alert.alert_id)} className="p-1 hover:opacity-70 flex-shrink-0">
                  <X size={14} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* QUICK LOG */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>⚡ Quick Log</p>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_LOG_TYPES.map(ql => {
              const Icon = ql.icon;
              return (
                <button key={ql.id} onClick={() => { setQuickLogType(ql); setQuickLogForm({ target_ids: [], method_product: '', dosage_rate: '', notes: '' }); }}
                  className="glass-card p-3 flex flex-col items-center gap-1.5 text-center active:scale-95 transition-transform">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${ql.color}20` }}>
                    <Icon size={20} style={{ color: ql.color }} />
                  </div>
                  <span className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{ql.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* START FARM WALK */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>🚶 Start Farm Walk</p>
          <div className="space-y-2">
            {SESSION_TYPES.map(s => {
              const Icon = s.icon;
              return (
                <button key={s.type} onClick={() => startSession(s.type)}
                  className="glass-card w-full p-4 text-left flex items-center gap-4 active:scale-[0.99] transition-transform">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${s.color}20` }}>
                    <Icon size={22} style={{ color: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-heading)' }}>{s.type}</h3>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.desc}</p>
                  </div>
                  <ChevronRight size={18} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Open Issues */}
        {openIssues.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>🔴 Open Issues</p>
            <div className="space-y-2">
              {openIssues.map(issue => (
                <div key={issue.flag_id} className="glass-card p-3 flex items-start gap-3"
                  style={{ borderLeft: `3px solid ${issue.severity === 'High' ? '#ef4444' : issue.severity === 'Medium' ? '#f59e0b' : '#64748b'}` }}>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold" style={{ color: issue.severity === 'High' ? '#ef4444' : '#f59e0b' }}>
                      {issue.severity} · {issue.issue_type}
                    </span>
                    <p className="text-sm mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-primary)' }}>{issue.description}</p>
                  </div>
                  <button onClick={() => resolveIssue(issue.flag_id)}
                    className="text-[10px] px-2.5 py-1 rounded-lg font-bold shrink-0" style={{ background: '#10b981', color: 'white' }}>
                    Resolve
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Session History */}
        {showHistory && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>📋 Session History</p>
            {sessions.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>No sessions yet.</p>
            ) : sessions.map(s => (
              <div key={s.session_id} className="glass-card-static p-3 flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#10b98120' }}>
                  <Clock size={16} style={{ color: '#10b981' }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{s.session_type}</p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{new Date(s.session_date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                </div>
                {s.completed && <Check size={16} style={{ color: '#10b981' }} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QUICK LOG MODAL */}
      {quickLogType && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setQuickLogType(null)} />
          <div className="relative w-full max-w-lg animate-slide-up rounded-t-3xl p-6 border-t" style={{ background: 'var(--color-bg-modal)', borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${quickLogType.color}20` }}>
                <quickLogType.icon size={20} style={{ color: quickLogType.color }} />
              </div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-heading)' }}>Quick: {quickLogType.label}</h2>
              <button onClick={() => setQuickLogType(null)} className="ml-auto"><X size={20} style={{ color: 'var(--color-text-muted)' }} /></button>
            </div>

            <div className="space-y-4 max-h-[65vh] overflow-y-auto">
              {quickLogType.id !== 'issue' && (
                <>
                  <div>
                    <label className="text-xs text-themed-muted block mb-2">Product / Chemical Used *</label>
                    <input type="text" value={quickLogForm.method_product}
                      onChange={e => setQuickLogForm(p => ({ ...p, method_product: e.target.value }))}
                      className="input-field w-full" placeholder="e.g. K-Bicarb spray, Urea 1g/L..." />
                  </div>
                  <div>
                    <label className="text-xs text-themed-muted block mb-2">Dosage / Rate</label>
                    <input type="text" value={quickLogForm.dosage_rate}
                      onChange={e => setQuickLogForm(p => ({ ...p, dosage_rate: e.target.value }))}
                      className="input-field w-full" placeholder="e.g. 2mL/L" />
                  </div>
                  <div>
                    <label className="text-xs text-themed-muted block mb-2">Select Targets (Plots & Batches)</label>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {allTargets.map(t => {
                        const selected = quickLogForm.target_ids.includes(t.id);
                        return (
                          <button key={t.id} onClick={() => toggleQuickTarget(t.id)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors"
                            style={{ background: selected ? '#10b98120' : 'var(--color-bg-card)', border: `1px solid ${selected ? '#10b981' : 'var(--color-border)'}` }}>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'bg-emerald-500 border-emerald-500' : ''}`} style={{ borderColor: selected ? '#10b981' : 'var(--color-border)' }}>
                              {selected && <Check size={11} className="text-white" />}
                            </div>
                            <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{t.label}</span>
                            <span className="text-[10px] ml-auto px-1.5 py-0.5 rounded" style={{ background: t.type === 'batch' ? '#3b82f620' : '#10b98120', color: t.type === 'batch' ? '#60a5fa' : '#10b981' }}>
                              {t.type === 'batch' ? 'Batch' : 'Plot'}
                            </span>
                          </button>
                        );
                      })}
                      {allTargets.length === 0 && (
                        <p className="text-sm text-center py-3" style={{ color: 'var(--color-text-muted)' }}>No active plots or batches found.</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs text-themed-muted block mb-2">
                  {quickLogType.id === 'issue' ? 'Describe the Issue *' : 'Notes (optional)'}
                </label>
                <textarea value={quickLogForm.notes} rows={2}
                  onChange={e => setQuickLogForm(p => ({ ...p, notes: e.target.value }))}
                  className="input-field w-full" placeholder={quickLogType.id === 'issue' ? 'e.g. Yellowing on PLT-BSL-02 near the drain...' : 'e.g. Applied to foliar only...'} />
              </div>
            </div>

            <button onClick={submitQuickLog} className="btn-primary w-full justify-center !py-4 mt-4 text-base">
              Log Now ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );

  /* =========================================
     SESSION STEP SCREENS (nursery | scan | targets)
  ========================================= */
  const isInSession = ['nursery', 'scan', 'targets'].includes(step);

  if (isInSession) return (
    <div className="flex flex-col h-full page-enter" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Progress Bar Header */}
      <div className="px-5 pt-5 pb-3 shrink-0" style={{ background: 'var(--color-bg-nav)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-heading)' }}>{sessionType}</h2>
          <button onClick={() => setStep('home')} className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
            <X size={14} /> Cancel
          </button>
        </div>
        {/* Step dots */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const current = stepIdx[step] ?? -1;
            const done = i < current;
            const active = i === current;
            return (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-1.5">
                  <div className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${active ? 'bg-emerald-500 text-white scale-110' : done ? 'bg-emerald-500/20 text-emerald-500' : 'text-themed-muted'}`}
                    style={!active && !done ? { background: 'var(--color-bg-card)' } : {}}>
                    {done ? <Check size={12} /> : i + 1}
                  </div>
                  <span className={`text-[10px] font-medium ${active ? 'text-emerald-500' : ''}`} style={{ color: active ? '' : 'var(--color-text-muted)' }}>{s}</span>
                </div>
                {i < STEPS.length - 1 && <div className="flex-1 h-0.5 rounded-full mx-1" style={{ background: done ? '#10b981' : 'var(--color-border)' }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">

        {/* Step: Nursery Environment */}
        {step === 'nursery' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-display font-bold mb-0.5" style={{ color: 'var(--color-text-heading)' }}>Nursery Environment</h3>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Current conditions — one quick pass</p>
            </div>
            {NURSERY_ENV_QUESTIONS.map(q => (
              <div key={q.id}>
                <label className="text-xs font-bold block mb-2" style={{ color: 'var(--color-text-secondary)' }}>{q.label}</label>
                <div className="flex flex-wrap gap-2">
                  {q.options.map(opt => (
                    <button key={opt} onClick={() => setNurseryAnswers(p => ({ ...p, [q.id]: opt }))}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                      style={{
                        background: nurseryAnswers[q.id] === opt ? '#10b981' : 'var(--color-bg-card)',
                        color: nurseryAnswers[q.id] === opt ? 'white' : 'var(--color-text-secondary)',
                        border: `1px solid ${nurseryAnswers[q.id] === opt ? '#10b981' : 'var(--color-border)'}`
                      }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step: Daily Scan */}
        {step === 'scan' && (
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-display font-bold mb-0.5" style={{ color: 'var(--color-text-heading)' }}>Daily Scan</h3>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>5 universal checks — tap Yes or No</p>
            </div>
            {DAILY_SCAN_QUESTIONS.map(q => {
              const Icon = q.icon;
              const answered = scanAnswers[q.id];
              const isRed = answered === 'Yes' && q.flag;
              return (
                <div key={q.id} className="glass-card-static p-4 rounded-2xl"
                  style={{ borderLeft: `3px solid ${isRed ? '#ef4444' : answered ? '#10b981' : 'var(--color-border)'}` }}>
                  <div className="flex items-center gap-3 mb-3">
                    <Icon size={18} style={{ color: isRed ? '#ef4444' : 'var(--color-text-muted)' }} />
                    <p className="text-sm font-medium flex-1" style={{ color: 'var(--color-text-primary)' }}>{q.question}</p>
                  </div>
                  <div className="flex gap-3">
                    {['Yes', 'No'].map(ans => (
                      <button key={ans} onClick={() => setScanAnswers(p => ({ ...p, [q.id]: ans }))}
                        className="flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                        style={{
                          background: answered === ans
                            ? (ans === 'Yes' && q.flag ? '#ef4444' : '#10b981')
                            : 'var(--color-bg-card)',
                          color: answered === ans ? 'white' : 'var(--color-text-secondary)',
                          border: `1px solid ${answered === ans ? 'transparent' : 'var(--color-border)'}`
                        }}>
                        {ans}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Step: Crop Target Checks */}
        {step === 'targets' && (
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-display font-bold mb-0.5" style={{ color: 'var(--color-text-heading)' }}>Crop Checks</h3>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Tap each to inspect · {targetChecks.length} checked</p>
            </div>

            {(plots.filter(p => p.status === 'Active').length === 0 && batches.length === 0) ? (
              <div className="glass-card-static p-8 text-center">
                <Leaf size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No active plots or nursery batches.</p>
              </div>
            ) : (
              <>
                {plots.filter(p => p.status === 'Active').length > 0 && (
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Plots</p>
                )}
                {plots.filter(p => p.status === 'Active').map(plot => {
                  const checked = targetChecks.find(tc => tc.id === plot.plot_id);
                  const hasFlagged = checked && Object.values(checked.answers || {}).some(a => ['Yes', 'Moderate', 'Severe'].includes(a));
                  return (
                    <button key={plot.plot_id} onClick={() => {
                      if (!checked) { setSelectedTarget({ type: 'plot', id: plot.plot_id, name: plot.plot_code, crop_id: plot.crop_id }); setTargetAnswers({}); }
                    }} className="glass-card w-full p-4 text-left flex items-center gap-4 active:scale-[0.99] transition-transform"
                      style={{ opacity: checked ? 0.85 : 1 }}>
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${checked ? (hasFlagged ? 'bg-red-500/20' : 'bg-emerald-500/20') : ''}`}
                        style={{ background: !checked ? 'var(--color-bg-card)' : '' }}>
                        {checked ? (hasFlagged ? <AlertTriangle size={20} style={{ color: '#ef4444' }} /> : <Check size={20} style={{ color: '#10b981' }} />) : <Leaf size={20} style={{ color: 'var(--color-text-muted)' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{plot.plot_code}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{getCropName(plot.crop_id)}</p>
                      </div>
                      {checked
                        ? <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: hasFlagged ? '#ef444420' : '#10b98120', color: hasFlagged ? '#ef4444' : '#10b981' }}>
                            {hasFlagged ? 'Flagged' : 'Done ✓'}
                          </span>
                        : <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
                      }
                    </button>
                  );
                })}

                {batches.length > 0 && (
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-4" style={{ color: 'var(--color-text-muted)' }}>Nursery Batches</p>
                )}
                {batches.map(batch => {
                  const checked = targetChecks.find(tc => tc.id === batch.batch_id);
                  const hasFlagged = checked && Object.values(checked.answers || {}).some(a => ['Yes', 'Moderate', 'Severe'].includes(a));
                  return (
                    <button key={batch.batch_id} onClick={() => {
                      if (!checked) { setSelectedTarget({ type: 'batch', id: batch.batch_id, name: batch.batch_code, crop_id: batch.crop_id }); setTargetAnswers({}); }
                    }} className="glass-card w-full p-4 text-left flex items-center gap-4 active:scale-[0.99] transition-transform">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0`}
                        style={{ background: checked ? (hasFlagged ? '#ef444420' : '#10b98120') : 'var(--color-bg-card)' }}>
                        {checked ? (hasFlagged ? <AlertTriangle size={20} style={{ color: '#ef4444' }} /> : <Check size={20} style={{ color: '#10b981' }} />) : <Sprout size={20} style={{ color: 'var(--color-text-muted)' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{batch.batch_code}</p>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#3b82f620', color: '#60a5fa' }}>Batch</span>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{getCropName(batch.crop_id)} · {batch.initial_quantity} pots</p>
                      </div>
                      {checked
                        ? <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: hasFlagged ? '#ef444420' : '#10b98120', color: hasFlagged ? '#ef4444' : '#10b981' }}>
                            {hasFlagged ? 'Flagged' : 'Done ✓'}
                          </span>
                        : <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
                      }
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Sticky Footer Navigation */}
      <div className="shrink-0 px-5 py-4 border-t" style={{ background: 'var(--color-bg-nav)', borderColor: 'var(--color-border)' }}>
        <div className="flex gap-3">
          <button
            onClick={() => { const prev = { scan: 'nursery', targets: 'scan', nursery: 'home' }; setStep(prev[step] || 'home'); }}
            className="flex-1 py-3.5 rounded-2xl text-sm font-bold" style={{ background: 'var(--color-bg-card)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
            ← Back
          </button>
          {step === 'nursery' && (
            <button onClick={() => setStep('scan')} className="btn-primary flex-[2] !py-3.5 !rounded-2xl text-sm">
              Next: Daily Scan →
            </button>
          )}
          {step === 'scan' && (
            sessionType === 'Daily Scan'
              ? <button onClick={saveSession} className="btn-primary flex-[2] !py-3.5 !rounded-2xl text-sm">Complete Scan ✓</button>
              : <button onClick={() => setStep('targets')} className="btn-primary flex-[2] !py-3.5 !rounded-2xl text-sm">Next: Crop Checks →</button>
          )}
          {step === 'targets' && (
            <button onClick={saveSession} className="flex-[2] py-3.5 rounded-2xl text-sm font-bold text-white" style={{ background: '#10b981' }}>
              Complete Session ✓
            </button>
          )}
        </div>
      </div>

      {/* Target Inspection Modal */}
      {selectedTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedTarget(null)} />
          <div className="relative w-full max-w-lg animate-slide-up rounded-t-3xl p-6 border-t" style={{ background: 'var(--color-bg-modal)', borderColor: 'var(--color-border)', maxHeight: '80vh', overflowY: 'auto' }}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-heading)' }}>{selectedTarget.name}</h2>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {getCropName(selectedTarget.crop_id)} · {selectedTarget.type === 'batch' ? 'Nursery Batch' : 'Growing Plot'}
                </p>
              </div>
              <button onClick={() => setSelectedTarget(null)} className="p-1"><X size={20} style={{ color: 'var(--color-text-muted)' }} /></button>
            </div>

            <div className="space-y-3">
              {CROP_CHECK_QUESTIONS.map(item => {
                const opts = item.severity ? ['No', 'Mild', 'Moderate', 'Severe'] : ['Yes', 'No'];
                return (
                  <div key={item.key} className="glass-card-static p-4 rounded-2xl">
                    <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>{item.q}</p>
                    <div className="flex gap-2">
                      {opts.map(ans => (
                        <button key={ans} onClick={() => setTargetAnswers(p => ({ ...p, [item.key]: ans }))}
                          className="flex-1 py-3 rounded-xl text-xs font-bold transition-all active:scale-95"
                          style={{
                            background: targetAnswers[item.key] === ans
                              ? (['Moderate', 'Severe'].includes(ans) ? '#ef4444' : ans === 'Mild' ? '#f59e0b' : '#10b981')
                              : 'var(--color-bg-card)',
                            color: targetAnswers[item.key] === ans ? 'white' : 'var(--color-text-secondary)',
                            border: `1px solid ${targetAnswers[item.key] === ans ? 'transparent' : 'var(--color-border)'}`
                          }}>
                          {ans}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <button onClick={() => {
              setTargetChecks(prev => [...prev, { ...selectedTarget, answers: { ...targetAnswers } }]);
              setSelectedTarget(null); setTargetAnswers({});
            }} className="btn-primary w-full !py-4 !rounded-2xl mt-5 text-base">
              Save Check ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );

  /* =========================================
     SUMMARY SCREEN
  ========================================= */
  if (step === 'summary' && sessionSummary) {
    const flagCount = sessionSummary.createdIssues?.length || 0;
    return (
      <div className="page-enter flex flex-col h-full" style={{ background: 'var(--color-bg-primary)' }}>
        <div className="flex-1 overflow-y-auto px-5 py-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: flagCount > 0 ? '#f59e0b20' : '#10b98120' }}>
              {flagCount > 0
                ? <AlertTriangle size={36} style={{ color: '#f59e0b' }} />
                : <Check size={36} style={{ color: '#10b981' }} />
              }
            </div>
            <h2 className="text-2xl font-display font-bold mb-1" style={{ color: 'var(--color-text-heading)' }}>
              {flagCount > 0 ? `${flagCount} Issue${flagCount > 1 ? 's' : ''} Flagged` : 'All Clear!'}
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {sessionType} · {sessionSummary.responseCount} responses recorded
            </p>
          </div>

          {flagCount > 0 && (
            <div className="space-y-2 mb-6">
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Flagged Issues</p>
              {sessionSummary.createdIssues.map((issue, i) => (
                <div key={i} className="glass-card-static p-3 rounded-xl" style={{ borderLeft: `3px solid ${issue.severity === 'High' ? '#ef4444' : '#f59e0b'}` }}>
                  <span className="text-[10px] font-bold" style={{ color: issue.severity === 'High' ? '#ef4444' : '#f59e0b' }}>{issue.severity} Severity</span>
                  <p className="text-sm mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-primary)' }}>{issue.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 py-5 space-y-3 border-t" style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-nav)' }}>
          {flagCount > 0 && (
            <button onClick={createTasksFromFlags} className="btn-primary w-full !py-4 !rounded-2xl justify-center text-base">
              <Zap size={18} /> Create Tasks from {flagCount} Flag{flagCount > 1 ? 's' : ''}
            </button>
          )}
          <button onClick={() => { setStep('home'); setSessionSummary(null); }} className="w-full py-4 rounded-2xl text-sm font-bold" style={{ background: 'var(--color-bg-card)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
            Back to Farm Walk
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default Monitoring;
