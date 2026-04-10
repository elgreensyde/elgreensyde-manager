import React, { useState, useMemo } from 'react';
import { LayoutGrid, Sprout, ShieldAlert, X, Ruler, Maximize2, Move, AlertCircle } from 'lucide-react';

function BedVisualizer({ isOpen, onClose }) {
  const [targetCount, setTargetCount] = useState(32);
  const [intraRowSpacing, setIntraRowSpacing] = useState(6); // inches
  const [interRowSpacing, setInterRowSpacing] = useState(12); // inches
  const [bedWidth, setBedWidth] = useState(36); // inches

  // BUG-008: Handle uncontrolled input
  const safeTargetCount = targetCount || 0;

  // FEAT-013: Canopy Collision Detection
  const MATURE_CANOPY_DIAMETER = 8; // inches for typical Basil
  const isCollision = useMemo(() => {
    return (intraRowSpacing < MATURE_CANOPY_DIAMETER) || (interRowSpacing < MATURE_CANOPY_DIAMETER);
  }, [intraRowSpacing, interRowSpacing]);

  // Calculation Logic
  const sideBuffer = 4; 
  const endBuffer = 6; 
  
  const effectiveWidth = Math.max(0, bedWidth - (sideBuffer * 2));
  const rows = Math.max(1, Math.floor(effectiveWidth / interRowSpacing) + 1);
  
  const plantsPerRow = Math.ceil(safeTargetCount / rows);
  const plantingLength = plantsPerRow > 1 ? (plantsPerRow - 1) * intraRowSpacing : 0;
  const totalLength = plantingLength + (endBuffer * 2);
  const lengthMeters = (totalLength * 0.0254).toFixed(2);

  // BUG-011: Scaling Logic
  // Calculate a scale factor to fit the bed into a reasonable visual space (max ~800px display)
  const basePixelWidth = 800;
  const pixelsPerInch = Math.min(10, basePixelWidth / Math.max(totalLength, 36)); 
  const iconScale = Math.max(0.4, Math.min(1, pixelsPerInch / 6)); // Scale icons down with density

  // Companion Planting Logic
  const pullCount = Math.max(2, Math.floor(totalLength / 18));
  const pushCount = Math.max(2, Math.floor(totalLength / 24));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full h-full sm:h-auto sm:max-w-5xl bg-themed-card border-x sm:border border-white/10 sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-screen sm:max-h-[90vh] animate-slide-up">
        
        {/* Header (Always Visible) */}
        <div className="p-4 sm:p-6 border-b border-white/5 flex items-center justify-between bg-emerald-500/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 rounded-xl text-white">
              <LayoutGrid size={24} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-display font-bold text-themed-heading uppercase tracking-tight">Interactive Bed Matrix</h2>
              <p className="text-[10px] sm:text-xs text-themed-muted">Push-Pull IPM Strategic Layout Generator</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} className="text-themed-muted" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row gap-0 lg:gap-8">
          
          {/* FEAT-012: Visualization Area (Sticky on Mobile) */}
          <div className="sticky top-0 lg:relative z-20 w-full lg:flex-1 bg-themed-card lg:bg-transparent border-b lg:border-none border-white/5 p-4 sm:p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase text-themed-muted tracking-widest leading-none">Blueprint ({rows} Rows × {plantsPerRow} Columns)</h3>
              <div className="flex gap-3">
                <div className="flex items-center gap-1 text-[9px] font-bold text-themed-muted">
                   <div className="w-2 h-2 rounded-full bg-emerald-500" /> Main
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold text-themed-muted">
                   <div className="w-2 h-2 bg-orange-500" /> Anchor
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold text-themed-muted">
                   <div className="w-2 h-2 bg-purple-500 rotate-45" /> Pull
                </div>
              </div>
            </div>

            {/* THE CANVAS */}
            <div className="aspect-[21/9] lg:flex-1 bg-[#2d1b10] rounded-2xl sm:rounded-3xl border-4 sm:border-8 border-amber-900/30 relative overflow-hidden shadow-inner flex items-center justify-center p-4">
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
              
              <div className="relative border-x-2 border-dashed border-white/5 h-full flex items-center" 
                   style={{ width: `${totalLength * pixelsPerInch}px`, maxWidth: '95%' }}>
                
                {/* 1. Anchors */}
                <div className="absolute top-1 left-1 bg-orange-500 shadow-md shadow-orange-500/50" 
                     style={{ width: `${8 * iconScale}px`, height: `${8 * iconScale}px` }} />
                <div className="absolute top-1 right-1 bg-orange-500 shadow-md shadow-orange-500/50" 
                     style={{ width: `${8 * iconScale}px`, height: `${8 * iconScale}px` }} />
                <div className="absolute bottom-1 left-1 bg-orange-500 shadow-md shadow-orange-500/50" 
                     style={{ width: `${8 * iconScale}px`, height: `${8 * iconScale}px` }} />
                <div className="absolute bottom-1 right-1 bg-orange-500 shadow-md shadow-orange-500/50" 
                     style={{ width: `${8 * iconScale}px`, height: `${8 * iconScale}px` }} />

                {/* 2. Top Edge: Pull */}
                <div className="absolute top-1 left-[15%] right-[15%] flex justify-between">
                  {[...Array(pullCount)].map((_, i) => (
                    <div key={'pull-t'+i} className="bg-purple-500 rotate-45" 
                         style={{ width: `${6 * iconScale}px`, height: `${6 * iconScale}px` }} />
                  ))}
                </div>

                {/* 3. Bottom Edge: Push */}
                <div className="absolute bottom-1 left-[15%] right-[15%] flex justify-between">
                  {[...Array(pushCount)].map((_, i) => (
                    <div key={'push-b'+i} className="w-0 h-0 border-l-transparent border-r-transparent border-b-amber-500" 
                         style={{ 
                           borderLeftWidth: `${4 * iconScale}px`, 
                           borderRightWidth: `${4 * iconScale}px`, 
                           borderBottomWidth: `${7 * iconScale}px` 
                         }} />
                  ))}
                </div>

                {/* 4. Main Crops (Grid) */}
                <div className="absolute inset-x-[15%] inset-y-[20%] flex flex-col justify-between">
                  {[...Array(rows)].map((_, rowIdx) => {
                    let plantsInThisRow = Math.floor(safeTargetCount / rows);
                    if (rowIdx < safeTargetCount % rows) plantsInThisRow++;
                    
                    return (
                      <div key={'row'+rowIdx} className="flex justify-between items-center w-full">
                        {[...Array(plantsInThisRow)].map((_, pIdx) => (
                          <div key={'p'+rowIdx+pIdx} 
                               className={`rounded-full shadow-lg flex items-center justify-center transition-colors ${isCollision ? 'bg-red-500 shadow-red-500/40 animate-pulse' : 'bg-emerald-500 shadow-emerald-500/30'}`}
                               style={{ width: `${14 * iconScale}px`, height: `${14 * iconScale}px` }}>
                            <Sprout size={Math.max(6, 12 * iconScale)} className="text-white/80" />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* FEAT-013: Collision Warning Overlay */}
            {isCollision && (
              <div className="absolute inset-x-8 bottom-8 z-30 animate-bounce">
                 <div className="bg-red-600 text-white p-3 rounded-2xl shadow-xl flex items-center gap-3 border-2 border-red-400">
                    <AlertCircle size={24} />
                    <div>
                       <p className="text-[10px] font-black uppercase tracking-widest leading-none">Canopy Collision Warning</p>
                       <p className="text-[9px] font-bold opacity-90">Spacing is tighter than mature canopy diameter ({MATURE_CANOPY_DIAMETER}").</p>
                    </div>
                 </div>
              </div>
            )}
          </div>

          {/* Controls Panel (Scrollable below Visualization on mobile) */}
          <div className="w-full lg:w-80 space-y-6 shrink-0 p-6 lg:border-l border-white/5">
            {/* Required Length Highlight */}
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl shadow-inner">
              <div className="flex items-center gap-2 mb-1 text-emerald-500 uppercase tracking-widest font-bold text-[10px]">
                <Ruler size={14} /> <span>Required Bed Length</span>
              </div>
              <p className="text-3xl font-display font-bold text-themed-heading leading-none">
                {totalLength}" <span className="text-sm font-normal text-themed-muted opacity-60">({lengthMeters}m)</span>
              </p>
            </div>

            {/* Target Count */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-black uppercase text-themed-muted tracking-tighter">Target Main Count</label>
                <span className="text-2xl font-display font-bold text-emerald-500">{safeTargetCount}</span>
              </div>
              <input type="range" min="1" max="150" value={safeTargetCount} onChange={(e) => setTargetCount(Math.max(1, parseInt(e.target.value) || 0))} className="slider-emerald" />
            </div>

            <div className="h-px bg-white/5" />

            {/* Intra-row Spacing */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-black uppercase text-themed-muted tracking-tighter">Intra-row Spacing</label>
                <span className={`text-lg font-bold ${intraRowSpacing < MATURE_CANOPY_DIAMETER ? 'text-red-500' : 'text-themed-primary'}`}>{intraRowSpacing}"</span>
              </div>
              <input type="range" min="4" max="24" value={intraRowSpacing} onChange={(e) => setIntraRowSpacing(parseInt(e.target.value))} className={`slider-blue ${intraRowSpacing < MATURE_CANOPY_DIAMETER ? 'accent-red-500' : ''}`} />
            </div>

            {/* Inter-row Spacing */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-black uppercase text-themed-muted tracking-tighter">Inter-row Spacing</label>
                <span className={`text-lg font-bold ${interRowSpacing < MATURE_CANOPY_DIAMETER ? 'text-red-500' : 'text-themed-primary'}`}>{interRowSpacing}"</span>
              </div>
              <input type="range" min="6" max="36" value={interRowSpacing} onChange={(e) => setInterRowSpacing(parseInt(e.target.value))} className={`slider-indigo ${interRowSpacing < MATURE_CANOPY_DIAMETER ? 'accent-red-500' : ''}`} />
            </div>

            {/* Bed Width */}
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <label className="text-[10px] font-black uppercase text-themed-muted tracking-tighter">Physical Bed Width</label>
                <span className="text-lg font-bold text-themed-primary">{bedWidth}"</span>
              </div>
              <input type="range" min="24" max="60" value={bedWidth} onChange={(e) => setBedWidth(parseInt(e.target.value))} className="slider-amber" />
            </div>
          </div>
        </div>

        {/* Footer Actions (Always Visible) */}
        <div className="p-4 sm:p-6 bg-white/5 border-t border-white/5 flex flex-col sm:flex-row gap-4 shrink-0">
          <div className="flex-1 hidden sm:flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-themed-muted opacity-50">Surface Area</span>
              <span className="text-md font-bold text-themed-primary">{(totalLength * bedWidth / 144).toFixed(1)} sq ft</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-themed-muted opacity-50">Companion Load</span>
              <span className="text-md font-bold text-themed-primary">{pullCount*2 + pushCount*2 + 4} plants</span>
            </div>
          </div>
          <button onClick={onClose} className="btn-primary !py-4 !rounded-xl sm:!rounded-2xl text-md flex-1 sm:flex-none sm:px-12 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">
            Lock Configuration
          </button>
        </div>
      </div>
      <style>{`
        .slider-emerald { width: 100%; height: 8px; background: rgba(255,255,255,0.05); border-radius: 8px; appearance: none; cursor: pointer; accent-color: #10b981; }
        .slider-blue { width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 8px; appearance: none; cursor: pointer; accent-color: #3b82f6; }
        .slider-indigo { width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 8px; appearance: none; cursor: pointer; accent-color: #6366f1; }
        .slider-amber { width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 8px; appearance: none; cursor: pointer; accent-color: #f59e0b; }
        input[type='range'] { -webkit-appearance: none; }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

export default BedVisualizer;
