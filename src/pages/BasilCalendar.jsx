import { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, CalendarDays, Sprout, Scissors,
  Droplets, AlertTriangle, CheckCircle2, Clock, Leaf, RotateCcw,
  Info, FlaskConical
} from 'lucide-react';
import db from '../services/db';

// ─── HELPERS ───────────────────────────────────────────────────────────────

/** Returns the nearest Saturday strictly AFTER `date` if `date` is not itself a Saturday,
 *  or the same day if it IS already a Saturday. Used for snapping milestone dates.
 */
function nextSaturday(date) {
  const d = new Date(date);
  // Zero out time to avoid DST issues
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = (6 - day + 7) % 7; // 0 if already Saturday
  d.setDate(d.getDate() + diff);
  return d;
}

/** Returns the upcoming Saturday (at least tomorrow if today is Saturday) */
function upcomingSaturday(referenceDate) {
  const d = new Date(referenceDate);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  // If today is Saturday, look for next Saturday (7 days away)
  const diff = day === 6 ? 7 : (6 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Format a Date object to YYYY-MM-DD using LOCAL timezone (avoids UTC offset shifting) */
function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse a YYYY-MM-DD string to a local midnight Date (no UTC shift) */
function parseLocal(dateStr) {
  if (!dateStr) return null;
  const [y, mo, d] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, d, 0, 0, 0, 0);
}

/** Format a Date to readable string like "Apr 19" */
function fmtShort(dateStr) {
  if (!dateStr) return '—';
  const d = parseLocal(dateStr);
  if (!d) return '—';
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

/** Days between two date strings */
function daysBetween(a, b) {
  const ms = parseLocal(b) - parseLocal(a);
  return Math.round(ms / 86400000);
}

/** Clamp to [0,100] */
function pct(v, max) { return Math.min(100, Math.max(0, Math.round((v / max) * 100))); }

/**
 * Compute all Saturday-snapped milestones for a basil entity
 * (tray or plot) given its true sowing_date.
 */
function computeMilestones(sowingDateStr, lastHarvestDateStr = null) {
  if (!sowingDateStr) return null;
  const sow = parseLocal(sowingDateStr);
  if (!sow) return null;

  // Target dates (add days first, then snap to Saturday)
  const transplantRaw = new Date(sow); transplantRaw.setDate(sow.getDate() + 35);
  const harvest1Raw   = new Date(sow); harvest1Raw.setDate(sow.getDate() + 70);

  const transplant = nextSaturday(transplantRaw);
  const harvest1   = nextSaturday(harvest1Raw);

  // Re-harvest cycles anchored from last actual harvest (or projected)
  const baseForCycle = lastHarvestDateStr
    ? parseLocal(lastHarvestDateStr)
    : harvest1;

  const reharvest1Raw = new Date(baseForCycle); reharvest1Raw.setDate(baseForCycle.getDate() + 14);
  const reharvest2Raw = new Date(baseForCycle); reharvest2Raw.setDate(baseForCycle.getDate() + 21);
  const reharvest1 = nextSaturday(reharvest1Raw);
  const reharvest2 = nextSaturday(reharvest2Raw);

  // Fertilizer — every 2-3 Saturdays after 1st harvest
  const fert1Raw = new Date(harvest1); fert1Raw.setDate(harvest1.getDate() + 14);
  const fert2Raw = new Date(harvest1); fert2Raw.setDate(harvest1.getDate() + 28);
  const fert1 = nextSaturday(fert1Raw);
  const fert2 = nextSaturday(fert2Raw);

  return {
    sow:       toISO(sow),
    transplant: toISO(transplant),
    harvest1:   toISO(harvest1),
    reharvest1: toISO(reharvest1),
    reharvest2: toISO(reharvest2),
    fert1:      toISO(fert1),
    fert2:      toISO(fert2),
  };
}

/** Earliest safe re-sow Saturday (8-week rest from last sowing) */
function sowAgainDate(lastSowingDateStr) {
  if (!lastSowingDateStr) return null;
  const base = parseLocal(lastSowingDateStr);
  if (!base) return null;
  base.setDate(base.getDate() + 56); // 8 weeks
  return nextSaturday(base);
}

// Event type metadata
const EVENT_META = {
  sow:        { label: 'Sowing',       color: '#22c55e', bg: 'bg-green-500',   text: 'text-green-400',   icon: Sprout    },
  transplant: { label: 'Transplant',   color: '#3b82f6', bg: 'bg-blue-500',    text: 'text-blue-400',    icon: Leaf      },
  harvest:    { label: 'Harvest',      color: '#f97316', bg: 'bg-orange-500',  text: 'text-orange-400',  icon: Scissors  },
  fert:       { label: 'Fertilize',    color: '#a855f7', bg: 'bg-purple-500',  text: 'text-purple-400',  icon: FlaskConical },
  sowAgain:   { label: 'Sow Again ✓',  color: '#10b981', bg: 'bg-emerald-500', text: 'text-emerald-400', icon: RotateCcw },
  overdue:    { label: 'Overdue!',     color: '#ef4444', bg: 'bg-red-500',     text: 'text-red-400',     icon: AlertTriangle },
};

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function BasilCalendar() {
  const [plots, setPlots]               = useState([]);
  const [trays, setTrays]               = useState([]);
  const [crops, setCrops]               = useState([]);
  const [harvestLogs, setHarvestLogs]   = useState([]);
  const [maintLogs, setMaintLogs]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [popoverEvents, setPopoverEvents] = useState([]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    (async () => {
      const [p, t, c, h, m] = await Promise.all([
        db.getAll('plots')          || [],
        db.getAll('trays')          || [],
        db.getAll('crops')          || [],
        db.getAll('harvest_logs')   || [],
        db.getAll('maintenance_logs') || [],
      ]);
      setPlots(p || []);
      setTrays(t || []);
      setCrops(c || []);
      setHarvestLogs(h || []);
      setMaintLogs(m || []);
      setLoading(false);
    })();
  }, []);

  const getCrop = (id) => crops.find(c => c.id === id || c.crop_id === id);
  const isBasil = (cropId) => {
    const crop = getCrop(cropId);
    return crop?.common_name?.toLowerCase().includes('basil');
  };

  // ── Build all calendar events ────────────────────────────────────────────
  const allEvents = useMemo(() => {
    const events = []; // { date: 'YYYY-MM-DD', type, label, source }

    // --- Plots ---
    plots.filter(p => p.crop_id && isBasil(p.crop_id)).forEach(plot => {
      const crop = getCrop(plot.crop_id);
      const plotHarvests = harvestLogs
        .filter(h => h.plot_id === (plot.plot_id || plot.id))
        .sort((a, b) => new Date(a.harvest_date) - new Date(b.harvest_date));
      const lastHarvest = plotHarvests.at(-1);

      const m = computeMilestones(plot.sowing_date, lastHarvest?.harvest_date);
      if (!m) return;

      const name = `${crop?.common_name || 'Basil'} [${plot.plot_code}]`;

      events.push({ date: m.sow,       type: 'sow',       source: name });
      events.push({ date: m.transplant, type: 'transplant', source: name });
      events.push({ date: m.harvest1,  type: 'harvest',   source: name });
      events.push({ date: m.reharvest1, type: 'harvest',  source: `${name} (2nd Cut)` });
      events.push({ date: m.reharvest2, type: 'harvest',  source: `${name} (3rd Cut)` });
      events.push({ date: m.fert1,     type: 'fert',      source: `${name} — Sidedress #1` });
      events.push({ date: m.fert2,     type: 'fert',      source: `${name} — Sidedress #2` });

      // Actual harvest logs
      plotHarvests.forEach(h => {
        if (h.harvest_date !== m.harvest1) {
          events.push({ date: h.harvest_date, type: 'harvest', source: `${name} (Actual: ${h.yield_weight_g}g)` });
        }
      });

      // Sow again
      if (plot.status === 'Cleared' || plot.status === 'Resting') {
        const sa = sowAgainDate(plot.sowing_date);
        if (sa) events.push({ date: toISO(sa), type: 'sowAgain', source: `${name} — Bed Ready` });
      }
    });

    // --- Trays ---
    trays.filter(t => t.crop_id && isBasil(t.crop_id) && t.status !== 'Transplanted' && t.status !== 'Completed').forEach(tray => {
      const crop = getCrop(tray.crop_id);
      const m = computeMilestones(tray.sowing_date);
      if (!m) return;
      const name = `${crop?.common_name || 'Basil'} Tray [${tray.tray_code}]`;
      events.push({ date: m.sow,       type: 'sow',       source: name });
      events.push({ date: m.transplant, type: 'transplant', source: name });
    });

    // --- Actual maintenance fertilizer logs ---
    maintLogs
      .filter(l => l.action_type?.toLowerCase().includes('fertil') || l.action_type?.toLowerCase().includes('sidedress'))
      .forEach(l => {
        events.push({ date: l.event_date, type: 'fert', source: `Actual Fertilizer — ${l.action_type}` });
      });

    return events;
  }, [plots, trays, harvestLogs, maintLogs, crops]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = {};
    allEvents.forEach(ev => {
      if (!ev.date) return;
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    });
    return map;
  }, [allEvents]);

  // ── Calendar grid ────────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null); // padding
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [viewYear, viewMonth]);

  const monthLabel = useMemo(() =>
    new Date(viewYear, viewMonth, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }),
    [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(iso);
    setPopoverEvents(eventsByDate[iso] || []);
  };

  // ── "This Saturday" summary ──────────────────────────────────────────────
  const thisSaturday = toISO(upcomingSaturday(today));
  const thisSaturdayEvents = eventsByDate[thisSaturday] || [];

  // ── Active basil entities for timeline zone ──────────────────────────────
  const activeBasilPlots = plots.filter(p =>
    p.crop_id && isBasil(p.crop_id) && (p.status === 'Active' || p.status === 'Ready to Clear')
  );
  const activeBasilTrays = trays.filter(t =>
    t.crop_id && isBasil(t.crop_id) && t.status !== 'Transplanted' && t.status !== 'Completed'
  );

  // ── Zone 3: Sow Again planner ────────────────────────────────────────────
  const sowAgainRows = useMemo(() => {
    return plots
      .filter(p => p.crop_id && isBasil(p.crop_id))
      .map(plot => {
        const crop = getCrop(plot.crop_id);
        const sa = sowAgainDate(plot.sowing_date);
        const saISO = sa ? toISO(sa) : null;
        const todayISO = toISO(today);
        const isReady = saISO && saISO <= todayISO;
        const isOccupied = plot.status === 'Active';

        let restWeeks = null;
        if (plot.sowing_date) {
          const daysSince = daysBetween(plot.sowing_date, todayISO);
          restWeeks = Math.floor(daysSince / 7);
        }

        return { plot, crop, saISO, isReady, isOccupied, restWeeks };
      });
  }, [plots, crops, today]);

  // ── Helpers for timeline ─────────────────────────────────────────────────
  const getLastHarvestForPlot = (plotId) => {
    return harvestLogs
      .filter(h => h.plot_id === plotId)
      .sort((a, b) => new Date(b.harvest_date) - new Date(a.harvest_date))[0];
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="loading-spinner mx-auto" />
    </div>
  );

  const todayISO = toISO(today);

  return (
    <div className="page-enter flex flex-col min-h-screen pb-24 px-4 pt-6 max-w-5xl mx-auto">

      {/* ── HEADER ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 rounded-xl bg-green-500/20">
            <CalendarDays size={22} className="text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>
              Basil Calendar
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              All operations every <span className="text-green-400 font-bold">Saturday</span> · Sow → Transplant → Harvest → Re-Sow
            </p>
          </div>
        </div>
      </div>

      {/* ── THIS SATURDAY SUMMARY CARD ── */}
      <div className="glass-card p-5 mb-6 border border-green-500/20 bg-green-500/5 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-green-400" />
            <h2 className="font-bold text-sm" style={{ color: 'var(--color-text-heading)' }}>
              This Saturday — {fmtShort(thisSaturday)}
            </h2>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-green-500/20 text-green-400">
            {thisSaturdayEvents.length} Action{thisSaturdayEvents.length !== 1 ? 's' : ''}
          </span>
        </div>

        {thisSaturdayEvents.length === 0 ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <CheckCircle2 size={16} className="text-green-500" />
            No operations scheduled this Saturday — rest day!
          </div>
        ) : (
          <div className="space-y-2">
            {thisSaturdayEvents.map((ev, i) => {
              const meta = EVENT_META[ev.type] || EVENT_META.sow;
              const Icon = meta.icon;
              return (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'var(--color-bg-overlay)' }}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bg}/20`}>
                    <Icon size={14} style={{ color: meta.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</p>
                    <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>{ev.source}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── CALENDAR GRID ── */}
      <div className="glass-card p-5 mb-6 rounded-2xl">
        {/* Nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <ChevronLeft size={18} style={{ color: 'var(--color-text-muted)' }} />
          </button>
          <h2 className="font-display font-bold text-base" style={{ color: 'var(--color-text-heading)' }}>
            {monthLabel}
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <ChevronRight size={18} style={{ color: 'var(--color-text-muted)' }} />
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
            <div
              key={d}
              className={`text-center text-[10px] font-bold uppercase tracking-wider pb-2 ${i === 6 ? 'text-green-400' : ''}`}
              style={{ color: i === 6 ? undefined : 'var(--color-text-muted)' }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map((day, idx) => {
            if (!day) return <div key={`pad-${idx}`} />;

            const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSaturday = idx % 7 === 6;
            const isToday = iso === todayISO;
            const isSelected = iso === selectedDate;
            const dayEvents = eventsByDate[iso] || [];
            const uniqueTypes = [...new Set(dayEvents.map(e => e.type))];

            return (
              <button
                key={iso}
                onClick={() => handleDayClick(day)}
                className={`
                  relative flex flex-col items-center pt-1.5 pb-2 rounded-xl transition-all min-h-[52px]
                  ${isSelected ? 'ring-2 ring-green-400 bg-green-500/10' : ''}
                  ${isToday && !isSelected ? 'bg-white/10' : ''}
                  ${isSaturday && !isToday && !isSelected ? 'bg-green-500/5' : ''}
                  hover:bg-white/10
                `}
              >
                <span className={`
                  text-xs font-semibold leading-none mb-1.5
                  ${isToday ? 'bg-green-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black' : ''}
                  ${isSaturday && !isToday ? 'text-green-400 font-bold' : ''}
                `} style={{ color: !isToday && !isSaturday ? 'var(--color-text-primary)' : undefined }}>
                  {day}
                </span>

                {/* Event dots */}
                <div className="flex flex-wrap justify-center gap-[2px] max-w-[32px]">
                  {uniqueTypes.slice(0, 4).map(type => {
                    const meta = EVENT_META[type] || EVENT_META.sow;
                    return (
                      <span
                        key={type}
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: meta.color }}
                        title={meta.label}
                      />
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t flex flex-wrap gap-3" style={{ borderColor: 'var(--color-border)' }}>
          {Object.entries(EVENT_META).map(([key, meta]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.color }} />
              <span className="text-[10px] font-semibold" style={{ color: 'var(--color-text-muted)' }}>{meta.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500/30 border border-green-500/50 flex-shrink-0" />
            <span className="text-[10px] font-semibold text-green-400">Saturday</span>
          </div>
        </div>
      </div>

      {/* ── DATE POPOVER PANEL ── */}
      {selectedDate && (
        <div className="glass-card p-5 mb-6 rounded-2xl border border-white/10 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-heading)' }}>
              📅 {fmtShort(selectedDate)} — Events
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Close
            </button>
          </div>

          {popoverEvents.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No operations on this date.</p>
          ) : (
            <div className="space-y-2">
              {popoverEvents.map((ev, i) => {
                const meta = EVENT_META[ev.type] || EVENT_META.sow;
                const Icon = meta.icon;
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--color-bg-overlay)' }}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg}/20`}>
                      <Icon size={16} style={{ color: meta.color }} />
                    </div>
                    <div>
                      <p className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{ev.source}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ZONE 2: LIFECYCLE TIMELINE STRIPS ── */}
      <div className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-heading)' }}>
          <Sprout size={15} className="text-green-400" />
          Active Basil Lifecycle Timelines
        </h2>

        {activeBasilPlots.length === 0 && activeBasilTrays.length === 0 ? (
          <div className="glass-card-static p-6 text-center border border-dashed rounded-2xl" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No active basil plots or trays found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Plots */}
            {activeBasilPlots.map(plot => {
              const crop = getCrop(plot.crop_id);
              const lastH = getLastHarvestForPlot(plot.plot_id || plot.id);
              const m = computeMilestones(plot.sowing_date, lastH?.harvest_date);
              if (!m) return null;

              const daysSinceSow = plot.sowing_date
                ? Math.max(0, Math.floor((today - parseLocal(plot.sowing_date)) / 86400000))
                : 0;

              // Determine next action
              const upcoming = [
                { date: m.transplant, type: 'transplant' },
                { date: m.harvest1,   type: 'harvest'    },
                { date: m.reharvest1, type: 'harvest'    },
                { date: m.reharvest2, type: 'harvest'    },
                { date: m.fert1,      type: 'fert'       },
                { date: m.fert2,      type: 'fert'       },
              ].filter(x => x.date >= todayISO).sort((a, b) => a.date.localeCompare(b.date));

              const next = upcoming[0];
              const nextMeta = next ? (EVENT_META[next.type] || EVENT_META.harvest) : null;

              // Progress: 0 = sow, 100 = re-harvest2 (approx 3rd cut at Day 112)
              const progressPct = pct(daysSinceSow, 112);

              // Milestone dots for timeline bar
              const milestones = [
                { label: 'Sow',         day: 0,   type: 'sow'       },
                { label: 'Transplant',  day: 35,  type: 'transplant' },
                { label: '1st Harvest', day: 70,  type: 'harvest'   },
                { label: '2nd Cut',     day: 84,  type: 'harvest'   },
                { label: '3rd Cut',     day: 98,  type: 'harvest'   },
              ];

              return (
                <div key={plot.plot_id || plot.id} className="glass-card p-4 rounded-2xl">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{plot.plot_code}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-500/20 text-green-400">Plot</span>
                      </div>
                      <h3 className="font-bold text-sm mt-0.5" style={{ color: 'var(--color-text-heading)' }}>
                        {crop?.common_name || 'Basil'}
                      </h3>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        Sown {fmtShort(m.sow)} — Day <span className="font-bold text-green-400">{daysSinceSow}</span> of lifecycle
                      </p>
                    </div>

                    {next && nextMeta && (
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Next</p>
                        <p className="text-xs font-bold" style={{ color: nextMeta.color }}>{nextMeta.label}</p>
                        <p className="text-[11px] font-bold text-green-400">{fmtShort(next.date)}</p>
                      </div>
                    )}
                  </div>

                  {/* Timeline bar */}
                  <div className="relative mt-3">
                    {/* Track */}
                    <div className="w-full h-2 rounded-full overflow-visible relative" style={{ background: 'var(--color-bg-overlay)' }}>
                      <div
                        className="h-full bg-gradient-to-r from-green-600 to-emerald-400 rounded-full transition-all duration-700"
                        style={{ width: `${progressPct}%` }}
                      />
                      {/* Milestone dots on track */}
                      {milestones.map(ms => {
                        const dotPct = pct(ms.day, 112);
                        const meta = EVENT_META[ms.type] || EVENT_META.sow;
                        const passed = daysSinceSow >= ms.day;
                        return (
                          <div
                            key={ms.label}
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-[var(--color-bg-card)] transition-all"
                            style={{
                              left: `${dotPct}%`,
                              transform: 'translate(-50%, -50%)',
                              background: passed ? meta.color : 'var(--color-bg-overlay)',
                              borderColor: meta.color,
                            }}
                            title={`${ms.label} (Day ${ms.day})`}
                          />
                        );
                      })}
                    </div>

                    {/* Milestone labels below */}
                    <div className="relative mt-3">
                      {milestones.map(ms => {
                        const dotPct = pct(ms.day, 112);
                        const meta = EVENT_META[ms.type] || EVENT_META.sow;
                        return (
                          <div
                            key={ms.label}
                            className="absolute text-[9px] font-bold text-center leading-tight"
                            style={{
                              left: `${dotPct}%`,
                              transform: 'translateX(-50%)',
                              color: meta.color,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {ms.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Milestone date pills */}
                  <div className="mt-8 flex flex-wrap gap-2">
                    {[
                      { label: 'Transplant',  date: m.transplant, type: 'transplant' },
                      { label: '1st Harvest', date: m.harvest1,   type: 'harvest'   },
                      { label: '2nd Cut',     date: m.reharvest1, type: 'harvest'   },
                      { label: 'Fertilize',   date: m.fert1,      type: 'fert'      },
                    ].map(pill => {
                      const meta = EVENT_META[pill.type] || EVENT_META.sow;
                      const isPast = pill.date < todayISO;
                      return (
                        <div key={pill.label} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${isPast ? 'opacity-40' : ''}`}
                          style={{ background: `${meta.color}20`, color: meta.color }}>
                          {isPast ? '✓' : ''} {pill.label}: {fmtShort(pill.date)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Trays */}
            {activeBasilTrays.map(tray => {
              const crop = getCrop(tray.crop_id);
              const m = computeMilestones(tray.sowing_date);
              if (!m) return null;

              const daysSinceSow = tray.sowing_date
                ? Math.max(0, Math.floor((today - parseLocal(tray.sowing_date)) / 86400000))
                : 0;
              const progressPct = pct(daysSinceSow, 35);

              return (
                <div key={tray.tray_id || tray.id} className="glass-card p-4 rounded-2xl border border-indigo-500/20">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{tray.tray_code}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-400">Tray · Propagation</span>
                      </div>
                      <h3 className="font-bold text-sm mt-0.5" style={{ color: 'var(--color-text-heading)' }}>{crop?.common_name || 'Basil'}</h3>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        Sown {fmtShort(m.sow)} — Day <span className="font-bold text-indigo-400">{daysSinceSow}</span> / target transplant {fmtShort(m.transplant)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Ready</p>
                      <p className="text-xs font-bold text-blue-400">{fmtShort(m.transplant)}</p>
                    </div>
                  </div>

                  {/* Nursery progress */}
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] font-bold mb-1 text-indigo-400">
                      <span>Nursery Progress</span>
                      <span>Day {daysSinceSow} / 35 ({progressPct}%)</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-overlay)' }}>
                      <div
                        className="h-full bg-indigo-500 transition-all duration-700"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── ZONE 3: SOW AGAIN PLANNER ── */}
      <div className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--color-text-heading)' }}>
          <RotateCcw size={15} className="text-emerald-400" />
          When to Sow Again — Plot Planner
        </h2>

        {sowAgainRows.length === 0 ? (
          <div className="glass-card-static p-6 text-center border border-dashed rounded-2xl" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No basil plots tracked yet.</p>
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-5 gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--color-bg-overlay)', color: 'var(--color-text-muted)' }}>
              <span>Plot</span>
              <span>Last Sown</span>
              <span>Rest</span>
              <span>Earliest Sat.</span>
              <span>Status</span>
            </div>

            {sowAgainRows.map(({ plot, crop, saISO, isReady, isOccupied, restWeeks }) => {
              let statusBadge, statusColor;
              if (isOccupied) {
                statusBadge = '⏳ Occupied';
                statusColor = 'text-amber-400 bg-amber-400/10';
              } else if (!saISO) {
                statusBadge = '✅ Never Used';
                statusColor = 'text-emerald-400 bg-emerald-400/10';
              } else if (isReady) {
                statusBadge = '✅ Ready';
                statusColor = 'text-emerald-400 bg-emerald-400/10';
              } else {
                statusBadge = '🕐 Resting';
                statusColor = 'text-gray-400 bg-gray-400/10';
              }

              return (
                <div
                  key={plot.plot_id || plot.id}
                  className="grid grid-cols-5 gap-2 px-4 py-3 items-center border-t text-xs"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <div>
                    <p className="font-bold" style={{ color: 'var(--color-text-heading)' }}>{plot.plot_code}</p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{crop?.common_name || '—'}</p>
                  </div>
                  <span style={{ color: 'var(--color-text-muted)' }}>{fmtShort(plot.sowing_date)}</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    {restWeeks != null ? `${restWeeks}w` : '—'}
                    {!isOccupied && restWeeks != null && restWeeks < 8 && (
                      <span className="ml-1 text-red-400 font-bold" title="Minimum 8-week rest for Fusarium prevention">⚠</span>
                    )}
                  </span>
                  <span className="font-bold" style={{ color: isReady ? '#10b981' : 'var(--color-text-muted)' }}>
                    {isOccupied ? '—' : (saISO ? fmtShort(saISO) : '—')}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold w-fit ${statusColor}`}>
                    {statusBadge}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Fusarium info note */}
        <div className="mt-3 flex items-start gap-2 px-1">
          <Info size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            <span className="text-amber-400 font-bold">Fusarium Guard: </span>
            Minimum 8-week rest enforced before re-sowing Basil in the same bed.
            Earliest safe date always snapped to a <span className="text-green-400 font-bold">Saturday</span>.
          </p>
        </div>
      </div>

    </div>
  );
}
