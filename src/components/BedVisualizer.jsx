import React, { useState } from 'react';
import { LayoutGrid, Sprout, ShieldAlert, Target } from 'lucide-react';

function BedVisualizer() {
  const [lengthParam, setLengthParam] = useState(5); // 2m to 15m
  const [showNasturtiums, setShowNasturtiums] = useState(true);
  const [showMarigolds, setShowMarigolds] = useState(true);
  const [showChives, setShowChives] = useState(true);

  // Constants
  const bedWidth = 0.9;
  const basilSpacing = 0.15; // 15cm
  const basilRows = 3;

  // Math
  const plantsPerRow = Math.floor(lengthParam / basilSpacing);
  const totalBasil = plantsPerRow * basilRows;
  
  const chivesPerRow = Math.floor(lengthParam / 0.3); // Every 30cm
  const totalChives = showChives ? chivesPerRow * 2 : 0; // 2 centerlines
  
  const nasturtiumPerRow = Math.floor(lengthParam / 0.5); // Every 50cm
  const totalNasturtiums = showNasturtiums ? nasturtiumPerRow * 2 : 0; // 2 outer edges
  
  const totalMarigolds = showMarigolds ? 6 : 0; // 3 on each short end (one per basil row)

  return (
    <div className="glass-card border border-gray-200 dark:border-gray-800 p-5 rounded-2xl w-full">
      <div className="flex items-center gap-2 mb-4">
        <LayoutGrid className="text-emerald-500" />
        <h2 className="text-lg font-display font-bold text-themed-heading">Bed Matrix Visualizer</h2>
      </div>

      <div className="space-y-4">
        {/* Controls */}
        <div className="p-4 bg-black/5 dark:bg-white/5 rounded-xl space-y-4 border border-gray-200 dark:border-gray-700">
          <div>
            <div className="flex justify-between text-xs font-bold text-themed-primary mb-2">
              <span>Bed Length: <span className="text-emerald-500 text-sm">{lengthParam} m</span></span>
              <span>Width: Locked at {bedWidth}m</span>
            </div>
            <input 
              type="range" 
              min="2" max="15" step="1" 
              value={lengthParam} 
              onChange={(e) => setLengthParam(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <button 
              onClick={() => setShowNasturtiums(!showNasturtiums)}
              className={`px-3 py-1.5 rounded-full transition-all ${showNasturtiums ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}
            >
              Nasturtiums (Pull)
            </button>
            <button 
              onClick={() => setShowChives(!showChives)}
              className={`px-3 py-1.5 rounded-full transition-all ${showChives ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}
            >
              Chives (Push)
            </button>
            <button 
              onClick={() => setShowMarigolds(!showMarigolds)}
              className={`px-3 py-1.5 rounded-full transition-all ${showMarigolds ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-gray-200 dark:bg-gray-800 text-gray-500'}`}
            >
              Marigolds (Anchor)
            </button>
          </div>
        </div>

        {/* Ledger */}
        <div className="grid grid-cols-4 gap-2 text-center">
           <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
              <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Basil</span>
              <span className="block text-xl font-display font-bold text-emerald-500">{totalBasil}</span>
           </div>
           {showNasturtiums && (
             <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 animate-fade-in">
                <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase">Nasturt.</span>
                <span className="block text-xl font-display font-bold text-amber-500">{totalNasturtiums}</span>
             </div>
           )}
           {showChives && (
             <div className="bg-purple-500/10 p-2 rounded-xl border border-purple-500/20 animate-fade-in">
                <span className="block text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase">Chives</span>
                <span className="block text-xl font-display font-bold text-purple-500">{totalChives}</span>
             </div>
           )}
           {showMarigolds && (
             <div className="bg-orange-500/10 p-2 rounded-xl border border-orange-500/20 animate-fade-in">
                <span className="block text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase">Marigold</span>
                <span className="block text-xl font-display font-bold text-orange-500">{totalMarigolds}</span>
             </div>
           )}
        </div>

        {/* Visual Map rendering a simplified scaled representation */}
        {/* We use a flex container to represent the bed. */}
        <div className="relative w-full h-[120px] bg-[#3e2723] rounded-sm shadow-[inset_0_4px_20px_rgba(0,0,0,0.5)] overflow-hidden border border-amber-900/50 my-6">
           {/* Grid markings */}
           <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
           
           {/* Centerline Chives (2 rows) */}
           {showChives && (
              <>
                 <div className="absolute w-full h-1 bg-purple-500/30 top-[33%]" />
                 <div className="absolute w-full h-1 bg-purple-500/30 top-[66%]" />
                 <div className="absolute inset-0 flex flex-col justify-center gap-6 py-4 px-8 opacity-70">
                    <div className="flex justify-between w-full">
                       {[...Array(5)].map((_, i) => <div key={'c1'+i} className="w-1.5 h-1.5 bg-purple-400 rounded-full" />)}
                    </div>
                    <div className="flex justify-between w-full">
                       {[...Array(5)].map((_, i) => <div key={'c2'+i} className="w-1.5 h-1.5 bg-purple-400 rounded-full" />)}
                    </div>
                 </div>
              </>
           )}

           {/* Sweet Basil (3 main rows) */}
           <div className="absolute inset-0 flex flex-col justify-between py-2 px-12 z-10">
              {[...Array(3)].map((_, rowIdx) => (
                 <div key={'br'+rowIdx} className="flex justify-between w-full items-center">
                    {[...Array(9)].map((_, i) => (
                       <Sprout key={'b'+i} size={14} className="text-emerald-400 opacity-90 drop-shadow-md" />
                    ))}
                 </div>
              ))}
           </div>

           {/* Nasturtiums (Outer Perimeter) */}
           {showNasturtiums && (
             <div className="absolute inset-0 flex flex-col justify-between p-0.5 z-20">
                <div className="flex justify-between w-full">
                   {[...Array(7)].map((_, i) => <div key={'n1'+i} className="w-2 h-2 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]" />)}
                </div>
                <div className="flex justify-between w-full">
                   {[...Array(7)].map((_, i) => <div key={'n2'+i} className="w-2 h-2 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]" />)}
                </div>
             </div>
           )}

           {/* Marigolds (Ends) */}
           {showMarigolds && (
             <div className="absolute inset-0 flex justify-between items-center px-1 z-30">
                <div className="flex flex-col gap-6">
                   {[...Array(3)].map((_, i) => <div key={'m1'+i} className="w-2.5 h-2.5 bg-orange-500 rounded-full outline outline-2 outline-orange-300" />)}
                </div>
                <div className="flex flex-col gap-6">
                   {[...Array(3)].map((_, i) => <div key={'m2'+i} className="w-2.5 h-2.5 bg-orange-500 rounded-full outline outline-2 outline-orange-300" />)}
                </div>
             </div>
           )}
        </div>

        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-600 dark:text-emerald-400">
           <ShieldAlert size={14} className="shrink-0" />
           <p>This layout creates a <strong>Push-Pull IPM Defense</strong> while maintaining strict 15cm basil spacing for airflow to combat Downy Mildew.</p>
        </div>
      </div>
    </div>
  );
}

export default BedVisualizer;
