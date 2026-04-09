import React, { useState } from 'react';
import { Droplets, Sprout, AlertTriangle, Leaf } from 'lucide-react';

function DosingCalculator() {
  const [lengthParam, setLengthParam] = useState(5); // Default 5 meters

  const width = 0.9;
  const area = parseFloat((lengthParam * width).toFixed(2));

  // Protocol Math
  const completeFertilizer = area * 10; // 10g per sqm
  const ureaFertilizer = area * 4;      // 4g per sqm

  return (
    <div className="glass-card border border-gray-200 dark:border-gray-800 p-5 rounded-2xl w-full">
      <div className="flex items-center gap-2 mb-4">
        <Droplets className="text-blue-500" />
        <h2 className="text-lg font-display font-bold text-themed-heading">Micro-Dosing Calculator</h2>
      </div>

      <div className="p-4 bg-black/5 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-gray-700 mb-5">
        <div className="flex justify-between text-xs font-bold text-themed-primary mb-2">
          <span>Bed Length: <span className="text-blue-500 text-sm">{lengthParam} m</span></span>
          <span className="text-themed-muted">Area: {area} sqm</span>
        </div>
        <input 
          type="range" 
          min="2" max="15" step="1" 
          value={lengthParam} 
          onChange={(e) => setLengthParam(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
      </div>

      <div className="space-y-3">
        {/* Card 1: Complete */}
        <div className="p-4 border border-emerald-500/30 bg-emerald-500/5 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-500 shrink-0">
               <Sprout size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Land Prep (Base)</h3>
              <p className="text-xl font-display font-bold text-themed-heading mb-1">{completeFertilizer.toFixed(1)} <span className="text-sm font-normal text-themed-muted">grams</span></p>
              <p className="text-xs text-themed-primary">Incorporate precisely <strong>{completeFertilizer.toFixed(1)}g</strong> of Complete (14-14-14) into the top 6 inches of soil prior to seeding.</p>
            </div>
          </div>
        </div>

        {/* Card 2: Urea */}
        <div className="p-4 border border-blue-500/30 bg-blue-500/5 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-500 shrink-0">
               <Droplets size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">Regeneration Feed (Side-Drench)</h3>
              <p className="text-xl font-display font-bold text-themed-heading mb-1">{ureaFertilizer.toFixed(1)} <span className="text-sm font-normal text-themed-muted">grams</span></p>
              <p className="text-xs text-themed-primary">Dissolve <strong>{ureaFertilizer.toFixed(1)}g</strong> of Urea (46-0-0) in water. </p>
              <div className="mt-2 flex items-center gap-1.5 text-[10px] uppercase font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-md inline-flex">
                 <AlertTriangle size={12} /> Apply strictly as a soil drench. Do not wet foliage.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DosingCalculator;
