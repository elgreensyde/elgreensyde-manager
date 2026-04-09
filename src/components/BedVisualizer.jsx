import React, { useState } from 'react';
import { LayoutGrid, Sprout, ShieldAlert } from 'lucide-react';

function BedVisualizer() {
  const [targetBasil, setTargetBasil] = useState(32);
  const [showNasturtiums, setShowNasturtiums] = useState(true);
  const [showMarigolds, setShowMarigolds] = useState(true);
  const [showChives, setShowChives] = useState(true);

  // Blueprint Constants
  const bedWidth = 0.9; // 36 inches / 90cm
  const basilSpacing = 0.15; // 6 inches / 15cm
  const basilRows = 3;

  // Math based on target
  const plantsPerRow = Math.ceil(targetBasil / basilRows);
  const requiredLength = (plantsPerRow * basilSpacing).toFixed(2);
  
  const chivesSpacing = 0.3; // 30cm
  const chivesPerRow = Math.max(1, Math.floor(requiredLength / chivesSpacing));
  const totalChives = showChives ? chivesPerRow * 2 : 0; // 2 center inter-rows
  
  const nasturtiumSpacing = 0.5; // 50cm
  const nasturtiumPerRow = Math.max(1, Math.floor(requiredLength / nasturtiumSpacing));
  const totalNasturtiums = showNasturtiums ? nasturtiumPerRow * 2 : 0; // 2 outer edges
  
  const totalMarigolds = showMarigolds ? 6 : 0; // 3 on each end

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
              <span>Target Basil Count: <span className="text-emerald-500 text-sm">{targetBasil}</span></span>
              <span>Req. Bed Length: <span className="text-emerald-500">{requiredLength}m</span></span>
            </div>
            <input 
              type="range" 
              min="10" max="150" step="1" 
              value={targetBasil} 
              onChange={(e) => setTargetBasil(Number(e.target.value))}
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
              <span className="block text-xl font-display font-bold text-emerald-500">{targetBasil}</span>
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

        {/* Visual Map Rendering */}
        <div className="w-full h-[180px] bg-[#3e2723] rounded-xl shadow-[inset_0_4px_20px_rgba(0,0,0,0.5)] overflow-x-auto overflow-y-hidden border border-amber-900/50 my-6 shrink-0 custom-scrollbar">
           <div className="relative h-full py-4 px-10 flex flex-col justify-between" style={{ minWidth: `${Math.max(100, plantsPerRow * 4)}%` }}>
               {/* Grid markings */}
               <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
               
               {/* Nasturtiums Top Edge */}
               {showNasturtiums && (
                 <div className="absolute top-1 left-8 right-8 flex justify-between z-20">
                    {[...Array(nasturtiumPerRow)].map((_, i) => <div key={'n1'+i} className="w-2.5 h-2.5 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]" />)}
                 </div>
               )}

               {/* Chives Line 1 */}
               {showChives && (
                 <div className="absolute top-[33%] left-8 right-8 flex justify-between z-10 translate-y-[-50%]">
                    {[...Array(chivesPerRow)].map((_, i) => <div key={'c1'+i} className="w-1.5 h-1.5 bg-purple-400 rounded-full" />)}
                 </div>
               )}

               {/* Chives Line 2 */}
               {showChives && (
                 <div className="absolute top-[66%] left-8 right-8 flex justify-between z-10 translate-y-[50%]">
                    {[...Array(chivesPerRow)].map((_, i) => <div key={'c2'+i} className="w-1.5 h-1.5 bg-purple-400 rounded-full" />)}
                 </div>
               )}

               {/* Sweet Basil (Exactly mapped rows) */}
               <div className="absolute inset-0 top-[15%] bottom-[15%] left-10 right-10 flex flex-col justify-between z-30">
                  {[...Array(basilRows)].map((_, rowIdx) => {
                     let thisRowPlants = Math.floor(targetBasil / basilRows);
                     if (rowIdx < targetBasil % basilRows) thisRowPlants++;
                     
                     return (
                     <div key={'br'+rowIdx} className="flex justify-between w-full items-center">
                        {[...Array(thisRowPlants)].map((_, i) => (
                           <Sprout key={'b'+i} size={18} className="text-emerald-400 shrink-0 drop-shadow-md" />
                        ))}
                     </div>
                     );
                  })}
               </div>

               {/* Nasturtiums Bottom Edge */}
               {showNasturtiums && (
                 <div className="absolute bottom-1 left-8 right-8 flex justify-between z-20">
                    {[...Array(nasturtiumPerRow)].map((_, i) => <div key={'n2'+i} className="w-2.5 h-2.5 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]" />)}
                 </div>
               )}

               {/* Marigolds (Ends) */}
               {showMarigolds && (
                 <div className="absolute inset-0 flex justify-between items-center px-2 z-40 pointer-events-none">
                    <div className="flex flex-col justify-between h-[60%]">
                       {[...Array(3)].map((_, i) => <div key={'m1'+i} className="w-3.5 h-3.5 bg-orange-500 rounded-full outline outline-2 outline-orange-300" />)}
                    </div>
                    <div className="flex flex-col justify-between h-[60%]">
                       {[...Array(3)].map((_, i) => <div key={'m2'+i} className="w-3.5 h-3.5 bg-orange-500 rounded-full outline outline-2 outline-orange-300" />)}
                    </div>
                 </div>
               )}
           </div>
        </div>

        <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-600 dark:text-emerald-400">
           <ShieldAlert size={16} className="shrink-0" />
           <p>This layout uses the <strong>Bukidnon Push-Pull IPM Defense</strong>. It maintains exactly 6-inch (15cm) basil spacing in 3 rows for airflow to combat Downy Mildew, scaling dynamically to your required yield.</p>
        </div>
      </div>
    </div>
  );
}

export default BedVisualizer;
