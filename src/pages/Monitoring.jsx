import { useState, useEffect } from 'react';
import { ClipboardCheck, Eye, Calendar, AlertTriangle, ChevronRight, ChevronDown, Check, X, Plus, Leaf, Bug, Droplets, Beaker, ThermometerSun, History } from 'lucide-react';
import toast from 'react-hot-toast';
import db from '../services/db';
import supabase from '../lib/supabase';

const SESSION_TYPES = ['Daily Scan', 'Weekly Full Check', 'Triggered Check'];

// Universal Daily Scan — 5 questions asked EVERY session
const DAILY_SCAN_QUESTIONS = [
  { id: 'watering', section: 'General', question: 'Have all areas been watered appropriately?', icon: Droplets },
  { id: 'wilting', section: 'General', question: 'Any wilting or drooping observed?', icon: Leaf },
  { id: 'pests_visible', section: 'General', question: 'Any visible pests (aphids, beetles, mites)?', icon: Bug },
  { id: 'discoloration', section: 'General', question: 'Any unusual discoloration or spots?', icon: AlertTriangle },
  { id: 'growth_rate', section: 'General', question: 'Is growth on track for the season?', icon: ThermometerSun },
];

// Nursery environment — asked ONCE per session
const NURSERY_ENV_QUESTIONS = [
  { id: 'nursery_humidity', label: 'Humidity Level', options: ['Normal', 'High', 'Very High'] },
  { id: 'nursery_temp', label: 'Temperature', options: ['Cool', 'Normal', 'Warm', 'Hot'] },
  { id: 'nursery_airflow', label: 'Airflow', options: ['Good', 'Poor', 'Stagnant'] },
  { id: 'nursery_rain', label: 'Rain Status', options: ['Dry', 'Light Rain', 'Heavy Rain'] },
  { id: 'nursery_light', label: 'Light Level', options: ['Full Sun', 'Partial', 'Overcast', 'Dark'] },
];

function Monitoring() {
  const [sessions, setSessions] = useState([]);
  const [plots, setPlots] = useState([]);
  const [trays, setTrays] = useState([]);
  const [crops, setCrops] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [flaggedIssues, setFlaggedIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Session flow
  const [activeSession, setActiveSession] = useState(null);
  const [sessionStep, setSessionStep] = useState('type'); // type → nursery → scan → targets → review
  const [sessionType, setSessionType] = useState('');
  const [nurseryAnswers, setNurseryAnswers] = useState({});
  const [scanAnswers, setScanAnswers] = useState({});
  const [targetChecks, setTargetChecks] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [targetAnswers, setTargetAnswers] = useState({});

  // History
  const [showHistory, setShowHistory] = useState(false);

  const load = async () => {
    const [s, p, t, c, a, f] = await Promise.all([
      db.getAll('monitoring_sessions'),
      db.getAll('plots'),
      db.getAll('trays'),
      db.getAll('crops'),
      db.getAll('preventive_alerts'),
      db.getAll('flagged_issues'),
    ]);
    setSessions(s || []); setPlots(p || []); setTrays(t || []);
    setCrops(c || []); setAlerts(a || []); setFlaggedIssues(f || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getCropName = (id) => crops.find(c => c.id === id)?.common_name || 'Unknown';

  // Start new session
  const startSession = (type) => {
    setSessionType(type);
    setNurseryAnswers({});
    setScanAnswers({});
    setTargetChecks([]);
    setTargetAnswers({});
    setSelectedTarget(null);
    setSessionStep('nursery');
  };

  // Save session
  const saveSession = async () => {
    try {
      const session = await db.insert('monitoring_sessions', {
        session_type: sessionType,
        session_date: new Date().toISOString().split('T')[0],
        nursery_humidity: nurseryAnswers.nursery_humidity || null,
        nursery_temp: nurseryAnswers.nursery_temp || null,
        nursery_airflow: nurseryAnswers.nursery_airflow || null,
        nursery_rain: nurseryAnswers.nursery_rain || null,
        nursery_light: nurseryAnswers.nursery_light || null,
        completed: true
      });

      if (!session) { toast.error('Failed to save session'); return; }

      // Save scan answers as checklist responses
      const responses = [];
      for (const [qId, answer] of Object.entries(scanAnswers)) {
        const q = DAILY_SCAN_QUESTIONS.find(dq => dq.id === qId);
        if (q) {
          responses.push({
            session_id: session.session_id,
            target_type: 'plot', // Use 'plot' to satisfy constraint, with a dummy ID
            section: q.section,
            question: q.question,
            answer: answer,
            target_id: '00000000-0000-0000-0000-000000000000', 
            flagged: answer === 'Yes' && ['pests_visible', 'discoloration', 'wilting'].includes(qId)
          });
        }
      }

      // Save per-target checklist responses and create issues if flagged
      for (const tc of targetChecks) {
        let targetFlagged = false;
        let highestSeverity = 'Low';
        let issueDesc = '';

        for (const [qKey, answer] of Object.entries(tc.answers || {})) {
          const isFlagged = answer === 'Yes' || answer === 'Moderate' || answer === 'Severe';
          if (isFlagged) {
            targetFlagged = true;
            if (answer === 'Severe') highestSeverity = 'High';
            else if (answer === 'Moderate' && highestSeverity !== 'High') highestSeverity = 'Medium';
            issueDesc += `${qKey}: ${answer}. `;
          }

          responses.push({
            session_id: session.session_id,
            target_type: tc.type,
            target_id: tc.id,
            crop_id: tc.crop_id,
            section: 'Crop Check',
            question: qKey,
            answer: answer,
            flagged: isFlagged
          });
        }

        if (targetFlagged) {
          await db.insert('flagged_issues', {
            session_id: session.session_id,
            target_type: tc.type,
            target_id: tc.id,
            issue_type: issueDesc.toLowerCase().includes('pest') ? 'Pest' : 'Disease',
            severity: highestSeverity,
            description: `Flagged during ${sessionType}: ${issueDesc}`,
            status: 'Open'
          });
        }
      }

      if (responses.length > 0) {
        await db.insertMany('checklist_responses', responses);
      }

      // Check for cross-tray pattern detection
      const flaggedTrays = targetChecks.filter(tc => tc.type === 'tray' && Object.values(tc.answers || {}).some(a => a === 'Yes' || a === 'Severe'));
      if (flaggedTrays.length >= 3) {
        await db.insert('flagged_issues', {
          session_id: session.session_id,
          target_type: 'nursery',
          issue_type: 'Environmental',
          severity: 'High',
          description: `Cross-tray pattern detected: ${flaggedTrays.length} trays flagged with same symptoms. Check nursery-wide conditions.`,
          status: 'Open'
        });
        toast('⚠️ Cross-tray pattern detected! Check nursery environment.', { icon: '🔍', duration: 5000 });
      }

      toast.success(`${sessionType} session saved!`);
      setActiveSession(null);
      setSessionStep('type');
      load();
    } catch (err) {
      console.error('Save session error:', err);
      toast.error('Failed to save session');
    }
  };

  // Dismiss alert
  const dismissAlert = async (alertId) => {
    await db.update('preventive_alerts', alertId, { dismissed: true });
    toast.success('Alert dismissed');
    load();
  };

  const activeAlerts = alerts.filter(a => !a.dismissed);
  const openIssues = flaggedIssues.filter(f => f.status !== 'Resolved');

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter h-full overflow-y-auto">
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Farm Monitoring</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {openIssues.length} open issues • {activeAlerts.length} active alerts
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowHistory(!showHistory)} className="p-2 rounded-lg" style={{ background: 'var(--color-bg-card-hover)' }}>
              <History size={18} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 space-y-4 pb-24">

        {/* Preventive Alerts Banner */}
        {activeAlerts.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>⚡ Auto Alerts</h2>
            {activeAlerts.slice(0, 5).map(alert => (
              <div key={alert.alert_id} className="glass-card p-3 flex items-start gap-3" style={{
                borderLeft: `3px solid ${alert.priority === 'Critical' ? '#e74c3c' : alert.priority === 'High' ? '#f39c12' : alert.priority === 'Medium' ? '#3498db' : '#95a5a6'}`
              }}>
                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{
                  color: alert.priority === 'Critical' ? '#e74c3c' : alert.priority === 'High' ? '#f39c12' : '#3498db'
                }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{alert.message}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded mt-1 inline-block" style={{
                    background: alert.priority === 'Critical' ? '#fdecea' : alert.priority === 'High' ? '#fef3c7' : '#e3f2fd',
                    color: alert.priority === 'Critical' ? '#e74c3c' : alert.priority === 'High' ? '#d97706' : '#1976d2'
                  }}>{alert.priority}</span>
                </div>
                <button onClick={() => dismissAlert(alert.alert_id)} className="p-1 rounded hover:opacity-70 flex-shrink-0">
                  <X size={14} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Start New Session */}
        {sessionStep === 'type' && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>🚶 Start Farm Walk</h2>
            {SESSION_TYPES.map(type => {
              const icons = { 'Daily Scan': Eye, 'Weekly Full Check': ClipboardCheck, 'Triggered Check': AlertTriangle };
              const descs = { 'Daily Scan': '5-minute quick visual check', 'Weekly Full Check': 'Full crop-by-crop inspection', 'Triggered Check': 'Respond to a flagged issue' };
              const Icon = icons[type];
              return (
                <button key={type} onClick={() => startSession(type)} className="glass-card p-4 w-full text-left flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#e8f8f0' }}>
                    <Icon size={22} style={{ color: '#27ae60' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>{type}</h3>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{descs[type]}</p>
                  </div>
                  <ChevronRight size={18} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              );
            })}
          </div>
        )}

        {/* Step 1: Nursery Environment */}
        {sessionStep === 'nursery' && (
          <div className="glass-card-static p-5">
            <h2 className="text-lg font-display font-bold mb-1" style={{ color: 'var(--color-text-heading)' }}>Nursery Environment</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Conditions right now — asked once per session</p>
            <div className="space-y-3">
              {NURSERY_ENV_QUESTIONS.map(q => (
                <div key={q.id}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-text-secondary)' }}>{q.label}</label>
                  <div className="flex flex-wrap gap-2">
                    {q.options.map(opt => (
                      <button key={opt} onClick={() => setNurseryAnswers({ ...nurseryAnswers, [q.id]: opt })}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: nurseryAnswers[q.id] === opt ? '#27ae60' : 'var(--color-bg-card-hover)',
                          color: nurseryAnswers[q.id] === opt ? 'white' : 'var(--color-text-secondary)'
                        }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setSessionStep('type')} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--color-bg-card-hover)' }}>Cancel</button>
              <button onClick={() => setSessionStep('scan')} className="btn-primary flex-1">Next: Daily Scan →</button>
            </div>
          </div>
        )}

        {/* Step 2: Daily Scan (5 questions) */}
        {sessionStep === 'scan' && (
          <div className="glass-card-static p-5">
            <h2 className="text-lg font-display font-bold mb-1" style={{ color: 'var(--color-text-heading)' }}>Daily Scan</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>5 universal questions — quick pass</p>
            <div className="space-y-3">
              {DAILY_SCAN_QUESTIONS.map(q => {
                const Icon = q.icon;
                return (
                  <div key={q.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-bg-card-hover)' }}>
                    <Icon size={16} style={{ color: scanAnswers[q.id] === 'Yes' && ['pests_visible', 'discoloration', 'wilting'].includes(q.id) ? '#e74c3c' : 'var(--color-text-muted)' }} />
                    <span className="flex-1 text-sm" style={{ color: 'var(--color-text-primary)' }}>{q.question}</span>
                    <div className="flex gap-1">
                      {['Yes', 'No'].map(ans => (
                        <button key={ans} onClick={() => setScanAnswers({ ...scanAnswers, [q.id]: ans })}
                          className="px-3 py-1 rounded-lg text-xs font-medium"
                          style={{
                            background: scanAnswers[q.id] === ans
                              ? (ans === 'Yes' && ['pests_visible', 'discoloration', 'wilting'].includes(q.id) ? '#e74c3c' : '#27ae60')
                              : 'var(--color-bg-card)',
                            color: scanAnswers[q.id] === ans ? 'white' : 'var(--color-text-secondary)'
                          }}>
                          {ans}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setSessionStep('nursery')} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--color-bg-card-hover)' }}>← Back</button>
              {sessionType === 'Daily Scan' ? (
                <button onClick={saveSession} className="btn-primary flex-1">Complete Scan ✓</button>
              ) : (
                <button onClick={() => setSessionStep('targets')} className="btn-primary flex-1">Next: Crop Check →</button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Per-target crop checks (Weekly/Triggered) */}
        {sessionStep === 'targets' && (
          <div className="glass-card-static p-5">
            <h2 className="text-lg font-display font-bold mb-1" style={{ color: 'var(--color-text-heading)' }}>Crop-Specific Checks</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>Select plots and trays to inspect</p>

            {/* Active targets list */}
            <div className="space-y-2 mb-4">
              {plots.filter(p => p.status === 'Active').map(plot => {
                const checked = targetChecks.find(tc => tc.id === plot.plot_id);
                return (
                  <button key={plot.plot_id} onClick={() => {
                    if (!checked) {
                      const crop = crops.find(c => c.id === plot.crop_id);
                      setSelectedTarget({ type: 'plot', id: plot.plot_id, name: plot.plot_code, crop_id: plot.crop_id, crop });
                      setTargetAnswers({});
                    }
                  }} className="w-full p-3 rounded-xl text-left flex items-center gap-3" style={{ background: checked ? '#e8f8f0' : 'var(--color-bg-card-hover)' }}>
                    {checked ? <Check size={16} style={{ color: '#27ae60' }} /> : <Leaf size={16} style={{ color: 'var(--color-text-muted)' }} />}
                    <div className="flex-1">
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{plot.plot_code}</span>
                      <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>{getCropName(plot.crop_id)}</span>
                    </div>
                    {checked && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">Done</span>}
                  </button>
                );
              })}
              {trays.filter(t => ['Sown', 'Germinated'].includes(t.status)).map(tray => {
                const checked = targetChecks.find(tc => tc.id === tray.tray_id);
                return (
                  <button key={tray.tray_id} onClick={() => {
                    if (!checked) {
                      const crop = crops.find(c => c.id === tray.crop_id);
                      setSelectedTarget({ type: 'tray', id: tray.tray_id, name: tray.tray_code, crop_id: tray.crop_id, crop });
                      setTargetAnswers({});
                    }
                  }} className="w-full p-3 rounded-xl text-left flex items-center gap-3" style={{ background: checked ? '#e8f8f0' : 'var(--color-bg-card-hover)' }}>
                    {checked ? <Check size={16} style={{ color: '#27ae60' }} /> : <Beaker size={16} style={{ color: 'var(--color-text-muted)' }} />}
                    <div className="flex-1">
                      <span className="text-sm font-medium">{tray.tray_code}</span>
                      <span className="text-xs ml-2" style={{ color: 'var(--color-text-muted)' }}>{getCropName(tray.crop_id)}</span>
                    </div>
                    {checked && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">Done</span>}
                  </button>
                );
              })}
              {plots.filter(p => p.status === 'Active').length === 0 && trays.filter(t => ['Sown', 'Germinated'].includes(t.status)).length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: 'var(--color-text-muted)' }}>No active plots or trays to check</p>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setSessionStep('scan')} className="flex-1 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'var(--color-bg-card-hover)' }}>← Back</button>
              <button onClick={saveSession} className="btn-primary flex-1">Complete Session ✓</button>
            </div>
          </div>
        )}

        {/* Target Checklist Modal */}
        {selectedTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'var(--color-bg-overlay)' }}>
            <div className="glass-card-static w-full max-w-md max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>{selectedTarget.name}</h2>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{selectedTarget.crop?.common_name || 'Unknown crop'}</p>
                </div>
                <button onClick={() => setSelectedTarget(null)} className="p-2"><X size={18} /></button>
              </div>

              {/* Crop-specific checklist from crop_library.checklist_questions or generic */}
              <div className="space-y-3">
                {[
                  { key: 'leaf_color_normal', q: 'Is leaf color normal and healthy?', severity: false },
                  { key: 'new_growth_present', q: 'Is new growth visible?', severity: false },
                  { key: 'pest_damage', q: 'Any pest damage visible?', severity: true },
                  { key: 'disease_signs', q: 'Any disease symptoms (spots, mold, wilting)?', severity: true },
                  { key: 'soil_moisture', q: 'Is soil moisture adequate?', severity: false },
                ].map(item => (
                  <div key={item.key} className="p-3 rounded-xl" style={{ background: 'var(--color-bg-card-hover)' }}>
                    <p className="text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>{item.q}</p>
                    <div className="flex gap-1">
                      {(item.severity ? ['No', 'Mild', 'Moderate', 'Severe'] : ['Yes', 'No']).map(ans => (
                        <button key={ans} onClick={() => setTargetAnswers({ ...targetAnswers, [item.key]: ans })}
                          className="px-3 py-1 rounded-lg text-xs font-medium flex-1"
                          style={{
                            background: targetAnswers[item.key] === ans
                              ? (['Moderate', 'Severe'].includes(ans) ? '#e74c3c' : ans === 'Mild' ? '#f39c12' : '#27ae60')
                              : 'var(--color-bg-card)',
                            color: targetAnswers[item.key] === ans ? 'white' : 'var(--color-text-secondary)'
                          }}>
                          {ans}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={() => {
                setTargetChecks([...targetChecks, { ...selectedTarget, answers: { ...targetAnswers } }]);
                setSelectedTarget(null);
                setTargetAnswers({});
              }} className="btn-primary w-full mt-4">Save Check ✓</button>
            </div>
          </div>
        )}

        {/* Open Issues */}
        {openIssues.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>🔴 Open Issues</h2>
            {openIssues.map(issue => (
              <div key={issue.flag_id} className="glass-card p-3" style={{
                borderLeft: `3px solid ${issue.severity === 'Critical' ? '#e74c3c' : issue.severity === 'High' ? '#f39c12' : '#3498db'}`
              }}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{
                      background: issue.severity === 'Critical' ? '#fdecea' : '#fef3c7',
                      color: issue.severity === 'Critical' ? '#e74c3c' : '#d97706'
                    }}>{issue.severity} — {issue.issue_type}</span>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-primary)' }}>{issue.description}</p>
                  </div>
                  <button onClick={async () => {
                    await db.update('flagged_issues', issue.flag_id, { status: 'Resolved', resolved_date: new Date().toISOString().split('T')[0] });
                    toast.success('Issue resolved'); load();
                  }} className="text-[10px] px-2 py-1 rounded-lg" style={{ background: '#e8f8f0', color: '#27ae60' }}>Resolve</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Session History */}
        {showHistory && (
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>📋 Session History</h2>
            {sessions.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text-muted)' }}>No sessions recorded yet</p>
            ) : sessions.slice(0, 10).map(s => (
              <div key={s.session_id} className="glass-card p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#e8f8f0' }}>
                  <ClipboardCheck size={14} style={{ color: '#27ae60' }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{s.session_type}</p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{new Date(s.session_date).toLocaleDateString()}</p>
                </div>
                {s.completed && <Check size={14} style={{ color: '#27ae60' }} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Monitoring;
