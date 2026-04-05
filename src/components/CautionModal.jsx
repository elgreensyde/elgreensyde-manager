import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';

/**
 * CautionModal: The 3-option UI for sub-optimal operations.
 * Used when a harvest/safety check fails or a conflict is detected.
 */
function CautionModal({ isOpen, onClose, onAction, title, message, details }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-scale-in">
        {/* Header: High Contrast Warning */}
        <div className="bg-amber-500 p-6 text-white text-center">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-display font-bold">{title || 'Safety Warning'}</h2>
          <p className="text-xs text-amber-50 mt-1 uppercase tracking-widest font-semibold">Conflict Detected</p>
        </div>

        <div className="p-6">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6">
            <p className="text-sm text-amber-800 font-medium leading-relaxed">{message}</p>
            {details && <p className="text-xs text-amber-600/70 mt-2 font-mono">{details}</p>}
          </div>

          <div className="space-y-3">
            {/* OPTION 1: PROCEED ANYWAY */}
            <button 
              onClick={() => onAction('proceed')}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-amber-200 bg-white hover:bg-amber-50 transition-all group text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Harvest Anyway</p>
                <p className="text-[10px] text-slate-500">I will log a warning about current conditions.</p>
              </div>
            </button>

            {/* OPTION 2: PARTIAL/CULL */}
            <button 
              onClick={() => onAction('partial')}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-slate-200 transition-all group text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:scale-110 transition-transform">
                <XCircle size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Partial / Cull Only</p>
                <p className="text-[10px] text-slate-500">Log significant crop loss or cull weight.</p>
              </div>
            </button>

            {/* OPTION 3: POSTPONE */}
            <button 
              onClick={() => onAction('postpone')}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all group text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">Postpone & Reschedule</p>
                <p className="text-[10px] opacity-80">Wait for better conditions later this week.</p>
              </div>
            </button>
          </div>

          <button 
            onClick={onClose}
            className="w-full mt-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600"
          >
            Cancel Assessment
          </button>
        </div>
      </div>
    </div>
  );
}

export default CautionModal;
