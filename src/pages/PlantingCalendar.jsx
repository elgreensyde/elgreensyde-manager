import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, CheckCircle2, Clock, AlertTriangle, X, 
  ChevronLeft, ChevronRight, CloudRain, Wind, Play, 
  RefreshCcw, CalendarPlus, Info
} from 'lucide-react';
import db from '../services/db';
import weatherService from '../services/weatherService';
import lifecycleScheduler from '../services/lifecycleScheduler';
import toast from 'react-hot-toast';

const DAYS_TO_SHOW = 7;
const TASK_LIMIT = 5;

function PlantingCalendar() {
  const [tasks, setTasks] = useState([]);
  const [weather, setWeather] = useState(null);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [conflictTask, setConflictTask] = useState(null); 
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  
  const getDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < DAYS_TO_SHOW; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  };
  const weekDates = useMemo(() => getDates(), []);

  const load = async () => {
    const [t, w, c] = await Promise.all([
      db.getAll('tasks'),
      weatherService.getForecast(),
      db.getAll('crops')
    ]);
    setTasks(t || []);
    setWeather(w);
    setCrops(c || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const dayTasks = useMemo(() => 
    tasks.filter(t => t.due_date === selectedDate && t.status !== 'Completed'),
    [tasks, selectedDate]
  );

  const completedToday = useMemo(() => 
    tasks.filter(t => t.due_date === selectedDate && t.status === 'Completed'),
    [tasks, selectedDate]
  );

  const getDayWeather = (dateStr) => {
    if (!weather) return null;
    const idx = weekDates.indexOf(dateStr);
    if (idx === -1) return null;
    return {
      code: weather.weathercode[idx],
      tempMax: weather.temperature_2m_max[idx],
      tempMin: weather.temperature_2m_min[idx],
      rainProb: weather.precipitation_probability_max[idx],
      windSpeed: weather.windspeed_10m_max[idx],
      humMax: weather.relative_humidity_2m_max[idx],
      ...weatherService.getWeatherInfo(weather.weathercode[idx])
    };
  };

  const dayWeather = useMemo(() => getDayWeather(selectedDate), [weather, selectedDate, weekDates]);

  const handleComplete = async (task) => {
    const safety = weatherService.evaluateSafety(task.category, dayWeather);
    if (!safety.safe) {
      setConflictTask({ ...task, ...safety, mode: 'complete' });
      return;
    }

    await db.update('tasks', task.task_id || task.id, { status: 'Completed', completed_at: new Date().toISOString() });
    toast.success('Task completed!');
    load();
  };

  const executeReschedule = async (taskId, newDateStr, isOverride = false) => {
    try {
      setLoading(true);
      const { count } = await lifecycleScheduler.shiftTaskChain(taskId, newDateStr);
      
      if (isOverride) {
        await db.update('tasks', taskId, { notes: (tasks.find(t => (t.task_id || t.id) === taskId)?.notes || '') + '\n[System] User override: Proceeded despite weather warning.' });
      }

      toast.success(count > 1 ? `Chain adjusted. ${count} tasks moved.` : 'Task shifted.');
      await load();
    } catch (err) {
      toast.error('Failed to reschedule.');
    } finally {
      setLoading(false);
      setConflictTask(null);
    }
  };

  const applyAlternativeAction = async (task) => {
    const workaround = task.category === 'Pest/Disease' ? 'Apply at soil level only' : 
                       task.category === 'Fertilize' ? 'Manual soil incorporation' :
                       'Controlled environment application';
    
    const newNotes = (task.notes || '') + `\n⚠️ Alternative Action Applied: ${workaround} due to ${task.risk} forecast.`;
    await db.update('tasks', task.task_id || task.id, { notes: newNotes });
    
    toast.success('Workaround logged. Proceed with caution.');
    setConflictTask(null);
    load();
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (e, taskId) => {
    setDraggingTaskId(taskId);
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetDate) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId || !targetDate) return;

    const isSunday = new Date(targetDate).getDay() === 0;
    if (isSunday) {
      toast.error('Sundays are blocked for all field work.');
      return;
    }

    const task = tasks.find(t => (t.task_id || t.id) === taskId);
    const targetWeather = getDayWeather(targetDate);
    const safety = weatherService.evaluateSafety(task.category, targetWeather);

    if (!safety.safe) {
      setConflictTask({ ...task, ...safety, targetDate, mode: 'move' });
      return;
    }

    await executeReschedule(taskId, targetDate);
    setDraggingTaskId(null);
  };

  const categoryConfigs = {
    Harvest: { color: '#10b981', bg: '#d1fae5', text: '#065f46', icon: CheckCircle2 },
    Transplant: { color: '#3b82f6', bg: '#dbeafe', text: '#1e40af', icon: Play },
    Sow: { color: '#3b82f6', bg: '#dbeafe', text: '#1e40af', icon: Play },
    Fertilize: { color: '#f59e0b', bg: '#fef3c7', text: '#92400e', icon: Play },
    'Pest/Disease': { color: '#f97316', bg: '#ffedd5', text: '#9a3412', icon: AlertTriangle },
    Maintenance: { color: '#64748b', bg: '#f1f5f9', text: '#334155', icon: Clock }
  };

  const getDayName = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short' });
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter h-full flex flex-col overflow-hidden">
      {/* Header & Day Strip */}
      <div className="px-5 pt-6 pb-4 shrink-0 bg-white border-b">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-display font-bold text-slate-800">Farm Schedule</h1>
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Valencia City</span>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {weekDates.map(dateStr => {
            const isSunday = new Date(dateStr).getDay() === 0;
            const isSelected = selectedDate === dateStr;
            const dayTs = tasks.filter(t => t.due_date === dateStr && t.status === 'Pending');
            const dayCount = dayTs.length;

            return (
              <button 
                key={dateStr}
                disabled={isSunday}
                onClick={() => setSelectedDate(dateStr)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, dateStr)}
                className={`flex-shrink-0 w-16 py-3 rounded-2xl flex flex-col items-center gap-1 transition-all border-2 
                  ${isSunday ? 'bg-slate-50 border-transparent opacity-40 grayscale' : 
                    isSelected ? 'bg-emerald-50 border-emerald-500 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}
              >
                <span className={`text-[10px] font-bold uppercase ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {getDayName(dateStr)}
                </span>
                <span className={`text-lg font-display font-bold ${isSelected ? 'text-emerald-700' : 'text-slate-700'}`}>
                  {new Date(dateStr).getDate()}
                </span>
                {dayCount > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${dayCount >= TASK_LIMIT ? 'bg-red-500 text-white animate-bounce' : 'bg-slate-200 text-slate-600'}`}>
                    {dayCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-24 bg-slate-50">
        {/* Weather Briefing */}
        {dayWeather && (
          <div className="glass-card-static p-4 mb-4 flex items-center gap-4 bg-gradient-to-br from-white to-slate-50 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-2">
               <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Valencia Climate</span>
             </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={{ background: dayWeather.color }}>
               <CloudRain size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-800">{dayWeather.label}</h3>
              <div className="flex gap-3 mt-0.5">
                <span className="text-xs text-slate-500 flex items-center gap-1"><CloudRain size={10}/> {dayWeather.rainProb}%</span>
                <span className="text-xs text-slate-500 flex items-center gap-1"><Wind size={10}/> {dayWeather.windSpeed} km/h</span>
                <span className="text-xs text-slate-600 font-bold">{dayWeather.tempMax}° / {dayWeather.tempMin}°</span>
              </div>
            </div>
            {dayWeather.rainProb > 70 && (
              <div className="bg-amber-100 p-2 rounded-xl text-amber-700 animate-pulse">
                <AlertTriangle size={18} />
              </div>
            )}
          </div>
        )}

        {/* Task List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 italic">Workload — {selectedDate}</h2>
            {dayTasks.length >= TASK_LIMIT && (
              <span className="text-[10px] font-bold text-red-500 flex items-center gap-1 border border-red-200 px-2 py-0.5 rounded-full bg-red-50">
                <AlertTriangle size={10}/> Solo Limit Reached
              </span>
            )}
          </div>

          {dayTasks.length === 0 && completedToday.length === 0 && (
            <div className="py-12 text-center opacity-50">
              <CalendarPlus size={32} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-500">Take a break! No tasks scheduled.</p>
            </div>
          )}

          {dayTasks.map(task => {
            const taskCategory = task.category || 'Maintenance';
            const config = categoryConfigs[taskCategory] || categoryConfigs.Maintenance;
            const CategoryIcon = config.icon;
            const hasAlt = task.notes?.includes('Alternative Action');
            const displayTitle = task.title || 'Untitled Operation';

            return (
              <div 
                key={task.task_id || task.id} 
                draggable={task.status !== 'Completed'}
                onDragStart={(e) => handleDragStart(e, task.task_id || task.id)}
                className={`glass-card p-4 flex items-start gap-4 transition-all ${draggingTaskId === (task.task_id || task.id) ? 'opacity-20 scale-95' : 'hover:-translate-y-0.5 cursor-grab active:cursor-grabbing'}`}
              >
                <button 
                  onClick={() => handleComplete(task)}
                  className="w-8 h-8 rounded-full border-2 border-slate-200 hover:border-slate-400 flex items-center justify-center transition-colors shrink-0"
                  style={{ borderColor: config.color + '40' }}
                >
                  <CategoryIcon size={16} style={{ color: config.color }} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-800 leading-tight truncate">{displayTitle}</h4>
                    <div className="flex gap-1 shrink-0">
                      {hasAlt && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 font-bold">ALT *</span>
                      )}
                      {task.weather_sensitive && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center gap-0.5">
                          <CloudRain size={8}/> Sensitive
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 overflow-x-auto no-scrollbar">
                     <div className="px-2 py-0.5 rounded font-bold text-[9px] uppercase tracking-wider" style={{ background: config.bg, color: config.text }}>
                       {taskCategory}
                     </div>
                     <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${task.priority === 'High' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                       {task.priority}
                     </div>
                     {task.is_auto_generated && <span className="text-[10px] text-slate-300 font-mono">🤖 id:{task.task_id?.slice(0,4)}</span>}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Completed Subset */}
          {completedToday.length > 0 && (
            <>
              <div className="pt-6 pb-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Successful Operations</h2>
              </div>
              {completedToday.map(task => (
                <div key={task.task_id || task.id} className="glass-card p-3 opacity-40 bg-slate-50 border-none flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-slate-400" />
                  <span className="text-sm text-slate-400 line-through truncate">{task.title}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Weather Conflict Modal */}
      {conflictTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-scale-in">
            <div className="p-8 pb-6 text-center">
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4 border-4 border-red-50">
                <AlertTriangle size={40} className="text-red-500" />
              </div>
              <h2 className="text-xl font-display font-bold text-slate-800 mb-2">Unsuitable Condition</h2>
              <div className="bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-100 text-left">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 leading-none">{conflictTask.risk} Risk Detected</p>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  {conflictTask.reason}
                </p>
              </div>
              <p className="text-xs text-slate-400 px-4">
                Decision required for <span className="font-bold">{conflictTask.title}</span> on {conflictTask.targetDate || selectedDate}.
              </p>
            </div>
            
            <div className="px-6 pb-6 space-y-2">
              <button 
                onClick={() => {
                  if (conflictTask.mode === 'move') {
                    executeReschedule(conflictTask.task_id || conflictTask.id, conflictTask.targetDate, true);
                  } else {
                    db.update('tasks', conflictTask.task_id || conflictTask.id, { 
                      status: 'Completed', 
                      completed_at: new Date().toISOString(), 
                      notes: (conflictTask.notes || '') + `\n[System] User override: Proceeded despite ${conflictTask.risk} warning.` 
                    }).then(() => { setConflictTask(null); load(); toast.success('Proceeded with warning.'); });
                  }
                }}
                className="w-full py-4 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <Play size={16}/> Proceed Anyway
              </button>
              <button 
                onClick={() => applyAlternativeAction(conflictTask)}
                className="w-full py-4 rounded-2xl bg-blue-50 text-blue-700 font-bold text-sm hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCcw size={16}/> Alternative Action
              </button>
              <button 
                onClick={() => {
                  const nextIdx = weekDates.indexOf(conflictTask.targetDate || selectedDate) + 1;
                  const nextDate = weekDates[nextIdx] || conflictTask.targetDate || selectedDate;
                  executeReschedule(conflictTask.task_id || conflictTask.id, nextDate);
                }}
                className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
              >
                <Calendar size={16}/> Reschedule (Auto-Cascade)
              </button>
              <button onClick={() => setConflictTask(null)} className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600">
                Cancel Operation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlantingCalendar;
