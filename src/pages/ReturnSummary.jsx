import { useState, useEffect } from 'react';
import { AlertCircle, Calendar, CheckCircle2, Clock, Map, PlaneLanding, Smartphone, Trash2, X } from 'lucide-react';
import awayService from '../services/awayService';
import toast from 'react-hot-toast';

function ReturnSummary({ period, onComplete }) {
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const p = await awayService.generateReturnPlan(period);
      setPlan(p);
      setLoading(false);
    };
    load();
  }, [period]);

  const handleAccept = async () => {
    setExecuting(true);
    try {
      await awayService.executeAcknowledge(period.period_id || period.id, plan.tasks);
      toast.success('Schedule synchronized. Welcome back!');
      onComplete();
    } catch (err) {
      toast.error('Failed to sync schedule.');
    } finally {
      setExecuting(false);
    }
  };

  if (loading) return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col items-center justify-center p-8 text-center">
      <PlaneLanding size={48} className="text-emerald-500 animate-bounce mb-4" />
      <h2 className="text-xl font-display font-bold text-slate-800">Calculating Return Scenarios...</h2>
      <p className="text-sm text-slate-500 max-w-xs mt-2 italic">Analyzing tasks accumulated during your absence against the 5-task solo operator limit.</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
        <div className="bg-emerald-600 p-8 text-white shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">Return Context</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-100 italic">Operator 01 (Solo)</span>
              <PlaneLanding size={18} />
            </div>
          </div>
          <h1 className="text-3xl font-display font-bold">Welcome Back, Planter.</h1>
          <p className="opacity-80 text-sm mt-1">You were away for <span className="font-bold underlineDecoration-emerald-400">{plan.daysAway} days</span>. Here is the operational impact.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Critical Risk Section */}
          {plan.lossRisks.length > 0 && (
            <div className="bg-red-50 border-2 border-red-100 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-4 text-red-600">
                <AlertCircle size={24} />
                <h3 className="font-bold uppercase tracking-wider text-xs">Critical Crop Loss Risks</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {plan.lossRisks.map(risk => (
                  <div key={risk.task_id} className="bg-white p-3 rounded-2xl shadow-sm border border-red-50 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <Trash2 size={14} className="text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-tight">{risk.title}</p>
                      <p className="text-[10px] text-red-500 font-bold mt-0.5">{risk.delay} Day Delay - {risk.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reschedule Logic */}
          <div>
            <div className="flex items-center gap-3 mb-4 text-slate-500">
               <Calendar size={20} />
               <h3 className="font-bold uppercase tracking-wider text-xs italic">Rescheduled 5-Task Spread</h3>
            </div>
            <div className="space-y-2">
               {plan.tasks.slice(0, 8).map(task => (
                 <div key={task.task_id || task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:border-emerald-200">
                          <Clock size={14} />
                       </div>
                       <div>
                          <p className="text-xs font-bold text-slate-700">{task.title}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                             <span className="text-[9px] text-slate-400 line-through">{task.due_date}</span>
                             <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">New: {task.new_due_date}</span>
                          </div>
                       </div>
                    </div>
                    <div className="px-2 py-0.5 rounded-full bg-slate-200 text-[8px] font-bold uppercase tracking-tighter text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700">
                       +{task.delay}d Shift
                    </div>
                 </div>
               ))}
               {plan.tasks.length > 8 && <p className="text-[10px] text-center text-slate-400 mt-4 italic">+ {plan.tasks.length - 8} additional operational tasks spread over the coming week.</p>}
            </div>
          </div>
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-200 shrink-0">
          <button 
            disabled={executing}
            onClick={handleAccept}
            className="w-full py-5 rounded-[24px] bg-emerald-600 text-white font-bold text-lg shadow-xl shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {executing ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 size={24} />
                <span>Accept Rescheduled Reality</span>
              </>
            )}
          </button>
          <p className="text-[10px] text-slate-400 text-center mt-4">
            By clicking "Accept", you acknowledge the operational impact and approve the automatic 5-task-limit spread for all pending work.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ReturnSummary;
