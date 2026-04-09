import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, X, FileText, ChevronUp } from 'lucide-react';
import blueprint from '../data/basilBlueprint.json';

function SmartAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const path = location.pathname;

  // Contextual mapping
  let activeSection = null;
  if (path.includes('/batches') || path.includes('/plots')) {
    activeSection = blueprint.batches;
  } else if (path.includes('/monitoring') || path.includes('/tasks')) {
    activeSection = blueprint.monitoring;
  } else if (path.includes('/pos') || path.includes('/finance') || path.includes('/orders')) {
    activeSection = blueprint.pos;
  }

  // If we are on a page with no specific blueprint, we can show a default
  const displayData = activeSection || {
    title: "Elgreensyde Farm Intelligence",
    protocols: [
      "Navigate to Batches, Tasks, or fulfillment to see contextual agronomic intelligence."
    ]
  };

  return (
    <>
      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-5 z-40 bg-emerald-600 text-white p-4 rounded-full shadow-2xl hover:bg-emerald-500 transition-transform active:scale-95"
        style={{ boxShadow: '0 8px 30px rgba(16, 185, 129, 0.4)' }}
      >
        <Bot size={24} />
      </button>

      {/* Bottom Sheet Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 sm:rounded-3xl rounded-t-3xl sm:h-auto h-[75vh] flex flex-col animate-slide-up overflow-hidden shadow-2xl border-t border-emerald-500/30">
            {/* Header */}
            <div className="p-5 flex justify-between items-center bg-emerald-600/10 border-b border-emerald-500/20 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500 rounded-xl">
                  <Bot size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-themed-heading">AI Agronomist</h3>
                  <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Context-Aware Advisory</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-themed-muted hover:text-emerald-500 bg-black/5 p-2 rounded-full transition-colors"><ChevronUp size={20} className="rotate-180" /></button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-4 flex items-center gap-2">
                <FileText size={16} className="text-themed-primary" />
                <h4 className="font-bold text-themed-heading">{displayData.title}</h4>
              </div>
              
              <div className="space-y-3">
                {displayData.protocols.map((protocol, idx) => (
                  <div key={idx} className="p-3 bg-black/5 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-800 text-sm leading-relaxed text-themed-primary">
                    {/* Highlight the bold section if it exists like "Soil Prep:" */}
                    {protocol.includes(':') ? (
                      <>
                        <strong className="text-emerald-600 dark:text-emerald-400">{protocol.split(':')[0]}:</strong>
                        {protocol.split(':')[1]}
                      </>
                    ) : (
                      protocol
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-8 text-center">
                 <p className="text-[10px] text-themed-muted font-mono tracking-widest uppercase opacity-50">Elgreensyde Core v3.2</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SmartAssistant;
