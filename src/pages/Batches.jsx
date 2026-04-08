import { useState, useEffect } from 'react';
import { Plus, Search, Calendar, MapPin, Sprout as SproutIcon, Scissors, LayoutDashboard, X, Edit3, Trash2, PackageCheck, Layers, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import db from '../services/db';
import lifecycleScheduler from '../services/lifecycleScheduler';
import weatherService from '../services/weatherService';
import { checkHarvestSafety } from '../services/harvestSafety';

const TRAY_STATUSES = ['Sown', 'Germinated', 'Ready', 'Transplanted', 'Completed'];
const BATCH_STATUSES = ['Nursery', 'Completed', 'Discarded'];
const PLOT_STATUSES = ['Active', 'Ready to Clear', 'Cleared', 'Resting'];
const PROPAGATION_METHODS = ['Seed', 'Kratky', 'Soil Cuttings'];

function Batches() {
  const [batches, setBatches] = useState([]);
  const [plots, setPlots] = useState([]);
  const [crops, setCrops] = useState([]);
  const [trays, setTrays] = useState([]);
  const [harvestLogs, setHarvestLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('trays');
  
  // Modals
  const [showPlotModal, setShowPlotModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showTrayModal, setShowTrayModal] = useState(false);
  const [showHarvestModal, setShowHarvestModal] = useState(false);
  const [showTransplantModal, setShowTransplantModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [safetyAssessment, setSafetyAssessment] = useState(null);
  const [isCheckingSafety, setIsCheckingSafety] = useState(false);
  
  const [activePlotForHarvest, setActivePlotForHarvest] = useState(null);
  const [activeTrayForTransplant, setActiveTrayForTransplant] = useState(null);
  
  // Edit State
  const [editingPlotId, setEditingPlotId] = useState(null);
  const [editingBatchId, setEditingBatchId] = useState(null);
  const [editingTrayId, setEditingTrayId] = useState(null);
  
  // Forms
  const defaultPlotForm = { plot_code: '', crop_id: '', sowing_date: new Date().toISOString().split('T')[0], status: 'Active' };
  const defaultBatchForm = { batch_code: '', crop_id: '', propagation_method: 'Seed', start_date: new Date().toISOString().split('T')[0], initial_quantity: '', input_cost: '' };
  const defaultTrayForm = { tray_code: '', crop_id: '', sowing_date: new Date().toISOString().split('T')[0], growing_medium: 'Soil Plugs', target_transplant_date: '', status: 'Sown' };
  const defaultHarvestForm = { harvest_date: new Date().toISOString().split('T')[0], yield_weight_g: '', cull_weight_g: 0, harvest_outcome: 'Safe', notes: '' };
  const defaultTransplantForm = { target_plot_id: '', transplant_date: new Date().toISOString().split('T')[0] };

  const [plotForm, setPlotForm] = useState(defaultPlotForm);
  const [batchForm, setBatchForm] = useState(defaultBatchForm);
  const [trayForm, setTrayForm] = useState(defaultTrayForm);
  const [harvestForm, setHarvestForm] = useState(defaultHarvestForm);
  const [transplantForm, setTransplantForm] = useState(defaultTransplantForm);

  const load = async () => {
    const [b, p, c, t, h] = await Promise.all([
      db.getAll('batches') || [],
      db.getAll('plots') || [],
      db.getAll('crops') || [],
      db.getAll('trays') || [],
      db.getAll('harvest_logs') || []
    ]);
    setBatches(b || []);
    setPlots(p || []);
    setCrops(c || []);
    setTrays(t || []);
    setHarvestLogs(h || []);
    setLoading(false);
  };
  
  useEffect(() => { load(); }, []);

  const getCrop = (id) => crops.find(c => c.id === id);

  const generateCode = (prefix, cropId, setter, formState) => {
    let cropPart = 'UNKN';
    if (cropId) {
      const crop = getCrop(cropId);
      if (crop) {
        cropPart = crop.common_name.substring(0,3).toUpperCase();
      }
    }
    const rand = Math.floor(Math.random() * 900) + 100;
    setter({ ...formState, crop_id: cropId, [`${prefix}_code`]: `${prefix.toUpperCase()}-${cropPart}-${rand}` });
  };

  const generateRandomBedCode = () => `BED-${Math.floor(Math.random() * 9000) + 1000}`;

  const calculateTargetDate = (cropId, startDateStr) => {
    if (!cropId || !startDateStr) return '';
    const crop = getCrop(cropId);
    if (!crop || !crop.rooting_or_germ_days) return '';
    const date = new Date(startDateStr);
    date.setDate(date.getDate() + crop.rooting_or_germ_days);
    return date.toISOString().split('T')[0];
  };

  const handleTrayCropChange = (cropId) => {
    const targetDate = calculateTargetDate(cropId, trayForm.sowing_date);
    generateCode('tray', cropId, setTrayForm, { ...trayForm, crop_id: cropId, target_transplant_date: targetDate });
  };

  const handleTrayDateChange = (dateStr) => {
    const targetDate = calculateTargetDate(trayForm.crop_id, dateStr);
    setTrayForm({ ...trayForm, sowing_date: dateStr, target_transplant_date: targetDate });
  };

  // Filtered lists
  const filteredTrays = trays.filter(t => {
    const crop = getCrop(t.crop_id);
    return !search || t.tray_code?.toLowerCase().includes(search.toLowerCase()) || (crop?.common_name || '').toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => new Date(b.sowing_date) - new Date(a.sowing_date));

  const filteredBatches = batches.filter(b => {
    const crop = getCrop(b.crop_id);
    return !search || b.batch_code?.toLowerCase().includes(search.toLowerCase()) || (crop?.common_name || '').toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

  const filteredPlots = plots.filter(p => {
    const crop = getCrop(p.crop_id);
    return !search || p.plot_code?.toLowerCase().includes(search.toLowerCase()) || (crop?.common_name || '').toLowerCase().includes(search.toLowerCase());
  });

  // --- TRAY HANDLERS ---
  const handleCreateTray = async (e) => {
    e.preventDefault();
    try {
      const dataToSave = { ...trayForm };
      if (!dataToSave.crop_id) dataToSave.crop_id = null;
      if (!dataToSave.sowing_date) dataToSave.sowing_date = null;
      if (!dataToSave.target_transplant_date) dataToSave.target_transplant_date = null;
      
      if (editingTrayId) {
        await db.update('trays', editingTrayId, dataToSave);
      } else {
        const newTray = await db.insert('trays', dataToSave);
        if (newTray) {
           await lifecycleScheduler.generateTaskChain(newTray.tray_id || newTray.id, 'batch', dataToSave.sowing_date, dataToSave.crop_id);
        }
      }
      toast.success(editingTrayId ? 'Tray updated!' : 'Tray created & Scheduled!');
      setShowTrayModal(false);
      setTrayForm(defaultTrayForm);
      setEditingTrayId(null);
      load();
    } catch (err) {
      alert(err.message);
      if(err.message.includes("tray_code_key")) toast.error("Tray Code already exists!");
      else toast.error("Error saving tray.");
    }
  };

  const openEditTray = (tray) => {
    setEditingTrayId(tray.tray_id || tray.id);
    setTrayForm({ 
      tray_code: tray.tray_code, crop_id: tray.crop_id, 
      sowing_date: tray.sowing_date, growing_medium: tray.growing_medium, 
      target_transplant_date: tray.target_transplant_date, status: tray.status 
    });
    setShowTrayModal(true);
  };

  const deleteTray = async (id) => {
    if(confirm('Delete this tray tracking record? (Warning: Scheduled tasks will also be deleted)')) {
      try {
        await db.delete('trays', id);
        await lifecycleScheduler.cleanupTasks(id, 'batch');
        toast.success('Tray and linked tasks deleted.');
        load();
      } catch (err) {
        alert(err.message);
        toast.error('Failed to delete tray.');
      }
    }
  };

  const handleTransplant = async (e) => {
    e.preventDefault();
    if (!activeTrayForTransplant || !transplantForm.target_plot_id) return;
    
    try {
      // 1. Mark tray as Transplanted/Completed
      await db.update('trays', activeTrayForTransplant.tray_id || activeTrayForTransplant.id, { 
        status: 'Completed', 
        assigned_plot_id: transplantForm.target_plot_id 
      });

      // 2. Mark plot as Active and assign crop & original sowing date
      await db.update('plots', transplantForm.target_plot_id, {
        status: 'Active',
        crop_id: activeTrayForTransplant.crop_id,
        sowing_date: transplantForm.transplant_date // Track when it actually hit the bed
      });

      toast.success('Successfully transplanted to plot!');
      
      // 3. Trigger secondary task generation for Plot
      await lifecycleScheduler.generateTaskChain(transplantForm.target_plot_id, 'plot', transplantForm.transplant_date, activeTrayForTransplant.crop_id);
      
      setShowTransplantModal(false);
      setTransplantForm(defaultTransplantForm);
      setEditingTrayId(null); // Clean up tray editing if any
      setActiveTrayForTransplant(null);
      load();
    } catch (err) {
      alert(err.message);
      toast.error('Failed to transplant. Check console.');
      console.error(err);
    }
  };

  // --- PLOT HANDLERS ---
  const handleCreatePlot = async (e) => {
    e.preventDefault();
    try {
      const dataToSave = { ...plotForm };
      if (!dataToSave.crop_id) dataToSave.crop_id = null;
      if (!dataToSave.sowing_date) dataToSave.sowing_date = null;

      if (editingPlotId) await db.update('plots', editingPlotId, dataToSave);
      else await db.insert('plots', dataToSave);
      toast.success(editingPlotId ? 'Plot updated!' : 'Plot created!');
      setShowPlotModal(false);
      setPlotForm(defaultPlotForm);
      setEditingPlotId(null);
      load();
    } catch (err) {
      alert(err.message);
      if(err.message.includes("plots_plot_code_key")) toast.error("Plot Code already exists! Please use a unique code.");
      else toast.error("Error saving plot.");
    }
  };

  const openEditPlot = (plot) => {
    setEditingPlotId(plot.plot_id || plot.id);
    setPlotForm({ plot_code: plot.plot_code, crop_id: plot.crop_id, sowing_date: plot.sowing_date, status: plot.status });
    setShowPlotModal(true);
  };

  const deletePlot = async (id) => {
    if(confirm('Delete this plot? (Warning: This will cascade delete harvest logs and scheduled tasks!)')) {
      try {
        await db.delete('plots', id);
        await lifecycleScheduler.cleanupTasks(id, 'plot');
        toast.success('Plot and tasks deleted.');
        load();
      } catch (err) {
        alert(err.message);
        toast.error('Failed to delete plot.');
      }
    }
  };

  // --- BATCH HANDLERS ---
  const handleCreateBatch = async (e) => {
    e.preventDefault();
    try {
      const dataToSave = {
         ...batchForm,
         initial_quantity: parseInt(batchForm.initial_quantity) || 0,
         input_cost: parseFloat(batchForm.input_cost) || 0,
         status: editingBatchId ? batchForm.status : 'Nursery'
      };
      if (!dataToSave.crop_id) dataToSave.crop_id = null;
      if (!dataToSave.start_date) dataToSave.start_date = null;

      if (editingBatchId) {
        await db.update('batches', editingBatchId, dataToSave);
        if (dataToSave.status === 'Archived') {
           await lifecycleScheduler.cleanupTasks(editingBatchId, 'batch');
        }
      } else {
        const newBatch = await db.insert('batches', dataToSave);
        if (newBatch) {
           await lifecycleScheduler.generateTaskChain(newBatch.batch_id || newBatch.id, 'batch', dataToSave.start_date, dataToSave.crop_id);
        }
      }
      
      toast.success(editingBatchId ? 'Batch updated!' : 'Batch initialized & Scheduled!');
      setShowBatchModal(false);
      setBatchForm(defaultBatchForm);
      setEditingBatchId(null);
      load();
    } catch (err) {
      alert(err.message);
      if(err.message.includes("batches_batch_code_key")) toast.error("Batch Code already exists! Please use a unique code.");
      else toast.error("Error saving batch.");
    }
  };

  const deleteBatch = async (id) => {
    if(confirm('Archive this batch and delete all pending tasks?')) {
      try {
        await db.update('batches', id, { status: 'Archived' });
        await lifecycleScheduler.cleanupTasks(id, 'batch');
        toast.success('Batch archived.');
        load();
      } catch (err) {
        alert(err.message);
        toast.error('Failed to archive batch.');
      }
    }
  };

  const openEditBatch = (batch) => {
    setEditingBatchId(batch.batch_id || batch.id);
    setBatchForm({ batch_code: batch.batch_code, crop_id: batch.crop_id, propagation_method: batch.propagation_method, start_date: batch.start_date, initial_quantity: batch.initial_quantity, input_cost: batch.input_cost, status: batch.status });
    setShowBatchModal(true);
  };

  const moveToInventory = async (batch) => {
    const qty = prompt(`How many units survived to be sent to inventory? (Started with ${batch.initial_quantity})`, batch.initial_quantity);
    if (!qty) return;
    const finalQty = parseInt(qty);
    if (isNaN(finalQty)) return toast.error("Invalid amount");

    try {
      const crop = getCrop(batch.crop_id);
      const tempSku = `SKU-${crop.common_name.substring(0,3).toUpperCase()}-POT`;
      
      const inventory = await db.getAll('inventory') || [];
      const existing = inventory.find(i => i.sku_code === tempSku || i.product_name.includes(crop.common_name));
      
      if (existing) {
        await db.update('inventory', existing.sku_id || existing.id, { current_stock: parseFloat(existing.current_stock) + finalQty });
      } else {
        await db.insert('inventory', { sku_code: tempSku, product_name: `${crop.common_name} (Potted)`, sales_format: 'Units', current_stock: finalQty, restock_alert_level: 5 });
      }

      await db.update('batches', batch.batch_id || batch.id, { status: 'Completed' });
      toast.success(`Sent ${finalQty} units to inventory!`);
      load();
    } catch(err) {
      alert(err.message);
      toast.error('Failed to move to inventory.');
    }
  };

  const handleStartHarvest = async (plotOrBatch) => {
    setActivePlotForHarvest(plotOrBatch);
    setIsCheckingSafety(true);
    const crop = getCrop(plotOrBatch.crop_id);
    const assessment = await checkHarvestSafety(plotOrBatch.plot_id || plotOrBatch.id, 'plot', crop);
    setSafetyAssessment(assessment);
    setIsCheckingSafety(false);

    if (assessment.status === 'Safe') {
      setShowHarvestModal(true);
    } else {
      setShowSafetyModal(true);
    }
  };

  const handleLogHarvest = async (e) => {
    e.preventDefault();
    if (!activePlotForHarvest) return;
    try {
      await db.insert('harvest_logs', {
         plot_id: activePlotForHarvest.id || activePlotForHarvest.plot_id,
         harvest_date: harvestForm.harvest_date,
         yield_weight_g: parseFloat(harvestForm.yield_weight_g) || 0,
         cull_weight_g: parseFloat(harvestForm.cull_weight_g) || 0,
         harvest_outcome: harvestForm.harvest_outcome || 'Safe',
         notes: harvestForm.notes
      });
      toast.success('Harvest logged successfully!');
      setShowHarvestModal(false);
      setHarvestForm(defaultHarvestForm);
      setActivePlotForHarvest(null);
      setSafetyAssessment(null);
      load();
    } catch(err) {
      alert(err.message);
      toast.error('Could not log harvest.');
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="loading-spinner mx-auto" /></div>;

  return (
    <div className="page-enter flex flex-col h-screen overflow-hidden relative">
      <div className="px-5 pt-6 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--color-text-heading)' }}>Cultivation Operations</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {trays.filter(t=>t.status!=='Completed').length} Trays &middot; {plots.filter(p=>p.status==='Active').length} Active Plots &middot; {batches.filter(b=>b.status==='Nursery').length} Nursery Batches
            </p>
          </div>
        </div>
        
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input type="text" placeholder="Search crops, codes..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
        </div>

        {/* Tab Toggle */}
        <div className="flex gap-2 mb-2 w-full lg:w-2/3">
          <button onClick={() => setActiveTab('trays')} className={`flex-1 py-2 text-sm font-semibold rounded-xl border ${activeTab==='trays' ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' : 'border-transparent text-gray-500'}`}>
             <Layers size={14} className="inline mr-1"/> Trays
          </button>
          <button onClick={() => setActiveTab('plots')} className={`flex-1 py-2 text-sm font-semibold rounded-xl border ${activeTab==='plots' ? 'bg-forest-600/20 text-green-500 border-green-500/30' : 'border-transparent text-gray-500'}`}>
             <LayoutDashboard size={14} className="inline mr-1"/> Plots
          </button>
          <button onClick={() => setActiveTab('batches')} className={`flex-1 py-2 text-sm font-semibold rounded-xl border ${activeTab==='batches' ? 'bg-amber-600/20 text-amber-500 border-amber-500/30' : 'border-transparent text-gray-500'}`}>
            <SproutIcon size={14} className="inline mr-1"/> Batches
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 sm:pb-6">
        <div className="w-full h-full max-w-5xl">
          
          {/* TRAY STAGE MONITOR */}
          <div className={`space-y-4 ${activeTab === 'trays' ? 'block animate-fade-in' : 'hidden'}`}>
            <div className="flex flex-wrap items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2"><Layers size={16} /> Propagation Trays</h2>
              <button className="btn-primary !py-1.5 !px-3 !text-xs bg-indigo-600 hover:bg-indigo-700 border-transparent shadow-indigo-600/20" onClick={() => {setEditingTrayId(null); setTrayForm(defaultTrayForm); setShowTrayModal(true);}}><Plus size={14}/> Add Tray</button>
            </div>
            
            {filteredTrays.length === 0 ? (
              <div className="glass-card-static p-6 text-center border border-dashed border-gray-600/40">
                <p className="text-sm text-gray-500">No trays in propagation right now.</p>
              </div>
            ) : filteredTrays.map(tray => {
               const crop = getCrop(tray.crop_id);
               const isReady = tray.status === 'Ready' || tray.status === 'Germinated';
               let badgeColor = 'bg-gray-500/20 text-gray-400';
               if (tray.status === 'Ready') badgeColor = 'bg-blue-500/20 text-blue-400';
               if (tray.status === 'Germinated') badgeColor = 'bg-indigo-500/20 text-indigo-300';
               if (tray.status === 'Completed' || tray.status === 'Transplanted') badgeColor = 'bg-green-500/20 text-green-400 opacity-50';

               const daysIn = tray.sowing_date ? Math.floor((new Date() - new Date(tray.sowing_date)) / (1000 * 60 * 60 * 24)) : 0;
               const germDays = crop?.rooting_or_germ_days;
               const showProgress = germDays && tray.status !== 'Completed' && tray.status !== 'Transplanted';
               return (
                <div key={tray.tray_id || tray.id} className="glass-card p-4 group select-none active:bg-black/5 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-mono text-themed-muted">{tray.tray_code}</span>
                      <h3 className="font-semibold text-themed-heading">{crop ? crop.common_name : 'Unknown Crop'}</h3>
                      <p className="text-xs text-themed-muted mt-1 flex items-center gap-1"><Calendar size={12}/> Target Transplant: {tray.target_transplant_date}</p>
                      {showProgress && (
                        <div className="mt-3">
                          <div className="flex justify-between items-center mb-1 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                            <span>Day {daysIn} of {germDays}</span>
                            <span>{Math.min(100, Math.floor((daysIn / germDays) * 100))}%</span>
                          </div>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 transition-all duration-1000"
                              style={{ width: `${Math.min(100, (daysIn / germDays) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-3">
                       <span className={`badge text-[10px] ${badgeColor}`}>{tray.status}</span>
                       <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={(e) => { 
                             e.preventDefault();
                             e.stopPropagation(); 
                             openEditTray(tray); 
                           }} 
                           className="p-3 -m-3 text-gray-400 hover:text-white transition-colors"
                         >
                           <Edit3 size={20}/>
                         </button>
                         <button 
                           onClick={(e) => { 
                             e.preventDefault();
                             e.stopPropagation(); 
                             deleteTray(tray.tray_id || tray.id); 
                           }} 
                           className="p-3 -m-3 text-red-400 hover:text-red-500 transition-colors"
                         >
                           <Trash2 size={20}/>
                         </button>
                       </div>
                    </div>
                  </div>
                  {isReady && (
                    <div className="mt-4 border-t border-white/5 pt-3">
                      <button className="btn-secondary !text-xs !py-1.5 !px-3 w-full justify-center text-blue-400 border-blue-500/30 hover:bg-blue-500/10" onClick={() => { setActiveTrayForTransplant(tray); setShowTransplantModal(true); }}>
                        Transplant & Assign <ArrowRight size={14} className="ml-1"/>
                      </button>
                    </div>
                  )}
                </div>
               );
            })}
          </div>

          {/* PLOT MONITOR (Pipeline A) */}
          <div className={`space-y-4 ${activeTab === 'plots' ? 'block animate-fade-in' : 'hidden'}`}>
            <div className="flex flex-wrap items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-green-600 flex items-center gap-2"><LayoutDashboard size={16} /> Plot Monitor <span className="text-xs font-normal text-gray-500 ml-2 hidden sm:inline">(Basil & Parsley, Cut-and-come-again)</span></h2>
              <button className="btn-primary !py-1.5 !px-3 !text-xs" onClick={() => {setEditingPlotId(null); setPlotForm({...defaultPlotForm, plot_code: generateRandomBedCode()}); setShowPlotModal(true);}}><Plus size={14}/> Add Plot</button>
            </div>
            
            {filteredPlots.length === 0 ? (
              <div className="glass-card-static p-6 text-center border border-dashed border-gray-600/40">
                <p className="text-sm text-gray-500">No plots found. Create one to begin.</p>
              </div>
            ) : filteredPlots.map(plot => {
               const crop = getCrop(plot.crop_id);
               let badgeColor = 'bg-green-500/20 text-green-400';
               if (plot.status === 'Cleared' || plot.status === 'Resting') badgeColor = 'bg-gray-500/20 text-gray-400';
               if (plot.status === 'Ready to Clear') badgeColor = 'bg-orange-500/20 text-orange-400';

               const plotHarvests = harvestLogs.filter(h => h.plot_id === (plot.plot_id || plot.id));
               const totalYield = plotHarvests.reduce((sum, h) => sum + parseFloat(h.yield_weight_g || 0), 0);

               return (
                <div key={plot.plot_id || plot.id} className="glass-card p-4 group select-none active:bg-black/5 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono text-themed-muted">{plot.plot_code}</span>
                      <h3 className="font-semibold text-themed-heading">{plot.crop_id ? (crop ? crop.common_name : 'Unknown Crop') : 'Empty Bed'}</h3>
                      {plot.sowing_date && <p className="text-xs text-themed-muted mt-1 flex items-center gap-1"><Calendar size={12}/> Planted: {plot.sowing_date}</p>}
                      {plot.sowing_date && crop?.days_to_maturity && plot.status === 'Active' && (
                        <div className="mt-3">
                          <div className="flex justify-between items-center mb-1 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                            <span>Day {Math.floor((new Date() - new Date(plot.sowing_date)) / (1000 * 60 * 60 * 24))} of {crop.days_to_maturity}</span>
                            <span>{Math.min(100, Math.floor(((new Date() - new Date(plot.sowing_date)) / (1000 * 60 * 60 * 24)) / crop.days_to_maturity * 100))}%</span>
                          </div>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 transition-all duration-1000" 
                              style={{ width: `${Math.min(100, ((new Date() - new Date(plot.sowing_date)) / (1000 * 60 * 60 * 24)) / crop.days_to_maturity * 100)}%` }} 
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <span className={`badge text-[10px] ${badgeColor}`}>{plot.status}</span>
                       <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={(e) => { 
                             e.preventDefault();
                             e.stopPropagation(); 
                             openEditPlot(plot); 
                           }} 
                           className="p-3 -m-3 text-gray-400 hover:text-white transition-colors"
                         >
                           <Edit3 size={20}/>
                         </button>
                         <button 
                           onClick={(e) => { 
                             e.preventDefault();
                             e.stopPropagation(); 
                             deletePlot(plot.plot_id || plot.id); 
                           }} 
                           className="p-3 -m-3 text-red-400 hover:text-red-500 transition-colors"
                         >
                           <Trash2 size={20}/>
                         </button>
                       </div>
                    </div>
                  </div>
                  {plot.status === 'Active' && (
                    <div className="mt-4 flex flex-col gap-2 border-t border-white/5 pt-3">
                      <div className="flex justify-between items-center text-xs text-themed-muted">
                        <span>{plotHarvests.length} Harvests</span>
                        <span className="font-bold text-green-400">{totalYield.toFixed(1)}g Total</span>
                      </div>
                      <button className="btn-primary !text-xs !py-1.5 !px-2 w-full justify-center" onClick={() => handleStartHarvest(plot)} disabled={isCheckingSafety}>
                         {isCheckingSafety ? <div className="loading-spinner h-3 w-3 border-2" /> : <><Scissors size={12}/> Log Harvest</>}
                      </button>
                    </div>
                  )}
                </div>
               );
            })}
          </div>

          {/* BATCH MONITOR (Pipeline B) */}
          <div className={`space-y-4 ${activeTab === 'batches' ? 'block animate-fade-in' : 'hidden'}`}>
            <div className="flex flex-wrap items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-500 flex items-center gap-2"><SproutIcon size={16} /> Batch Monitor <span className="text-xs font-normal text-gray-500 ml-2 hidden sm:inline">(Potted Herbs & Retail Units)</span></h2>
              <button className="btn-primary !py-1.5 !px-3 !text-xs bg-amber-600 hover:bg-amber-700 border-amber-600" onClick={() => {setEditingBatchId(null); setBatchForm(defaultBatchForm); setShowBatchModal(true);}}><Plus size={14}/> Add Batch</button>
            </div>
            
            {filteredBatches.length === 0 ? (
              <div className="glass-card-static p-6 text-center border border-dashed border-gray-600/40">
                <p className="text-sm text-gray-500">No batches recorded.</p>
              </div>
            ) : filteredBatches.map(batch => {
               const crop = getCrop(batch.crop_id);
               return (
                <div key={batch.batch_id || batch.id} className={`glass-card p-4 group select-none active:bg-black/5 transition-colors ${batch.status === 'Completed' ? 'opacity-50' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono text-themed-muted">{batch.batch_code}</span>
                      <h3 className="font-semibold text-themed-heading">{crop ? crop.common_name : 'Unknown Crop'}</h3>
                      <p className="text-xs text-themed-muted mt-1 flex items-center gap-1"><MapPin size={12}/> {batch.propagation_method}</p>
                      {batch.start_date && crop?.days_to_maturity && batch.status === 'Nursery' && (
                        <div className="mt-3">
                          <div className="flex justify-between items-center mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                            <span>Day {Math.floor((new Date() - new Date(batch.start_date)) / (1000 * 60 * 60 * 24))} of {crop.days_to_maturity}</span>
                            <span>{Math.min(100, Math.floor(((new Date() - new Date(batch.start_date)) / (1000 * 60 * 60 * 24)) / crop.days_to_maturity * 100))}%</span>
                          </div>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-500 transition-all duration-1000" 
                              style={{ width: `${Math.min(100, ((new Date() - new Date(batch.start_date)) / (1000 * 60 * 60 * 24)) / crop.days_to_maturity * 100)}%` }} 
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <span className={`badge text-[10px] ${batch.status === 'Nursery' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>{batch.status}</span>
                       <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                           onClick={(e) => { 
                             e.preventDefault();
                             e.stopPropagation(); 
                             openEditBatch(batch); 
                           }} 
                           className="p-3 -m-3 text-gray-400 hover:text-white transition-colors"
                         >
                           <Edit3 size={20}/>
                         </button>
                         <button 
                           onClick={(e) => { 
                             e.preventDefault();
                             e.stopPropagation(); 
                             deleteBatch(batch.batch_id || batch.id); 
                           }} 
                           className="p-3 -m-3 text-red-400 hover:text-red-500 transition-colors"
                         >
                           <Trash2 size={20}/>
                         </button>
                       </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between items-center text-xs text-themed-muted">
                     <span>Started: {batch.start_date}</span>
                     <span>{batch.initial_quantity} Units</span>
                  </div>
                  {batch.status === 'Nursery' && (
                    <div className="mt-3 text-right border-t border-white/5 pt-3">
                       <button onClick={() => moveToInventory(batch)} className="btn-secondary !text-xs !py-1 !px-2 bg-green-500/10 text-green-400 border-transparent hover:bg-green-500/20 w-full justify-center">
                         <PackageCheck size={14} className="mr-1"/> Complete & Send to Flow
                       </button>
                    </div>
                  )}
                </div>
               );
            })}
          </div>
        </div>
      </div>

      {/* TRAY MODAL */}
      {showTrayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTrayModal(false)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-3xl p-6 border" style={{ background: 'var(--color-bg-modal)', borderColor: 'var(--color-border)' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-themed-heading flex items-center gap-2"><Layers size={18}/> {editingTrayId ? 'Edit Tray' : 'New Propagation Tray'}</h2>
              <button onClick={() => setShowTrayModal(false)} className="text-themed-muted hover:text-themed-heading"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleCreateTray} className="space-y-4">
              <div>
                <label className="text-xs text-themed-muted block mb-1">Crop Variety *</label>
                <select required value={trayForm.crop_id} onChange={e => handleTrayCropChange(e.target.value)} className="input-field w-full">
                  <option value="">Select Crop...</option>
                  {crops.map(c => <option key={c.id} value={c.id}>{c.common_name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-themed-muted block mb-1">Tray Code *</label>
                <input type="text" required value={trayForm.tray_code} onChange={e => setTrayForm({...trayForm, tray_code: e.target.value})} className="input-field w-full" placeholder="TRAY-BSL-XX" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Sowing Date</label>
                  <input type="date" required value={trayForm.sowing_date} onChange={e => handleTrayDateChange(e.target.value)} className="input-field w-full" />
                </div>
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Target Transplant</label>
                  <input type="date" required value={trayForm.target_transplant_date} onChange={e => setTrayForm({...trayForm, target_transplant_date: e.target.value})} className="input-field w-full border-indigo-500/30" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Growing Medium</label>
                  <select value={trayForm.growing_medium} onChange={e => setTrayForm({...trayForm, growing_medium: e.target.value})} className="input-field w-full">
                    {['Soil Plugs', 'Rockwool', 'Oasis Cubes', 'Peat Moss', 'Perlite'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Status</label>
                  <select value={trayForm.status} onChange={e => setTrayForm({...trayForm, status: e.target.value})} className="input-field w-full">
                    {TRAY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              
              <button type="submit" className="btn-primary w-full py-3 mt-2 justify-center bg-indigo-600 hover:bg-indigo-700">{editingTrayId ? 'Update Tray' : 'Start Tray'}</button>
            </form>
          </div>
        </div>
      )}

      {/* TRANSPLANT MODAL */}
      {showTransplantModal && activeTrayForTransplant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTransplantModal(false)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-3xl p-6 border border-blue-500/30 bg-gray-900 shadow-2xl shadow-blue-500/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ArrowRight size={18} className="text-blue-400"/> Transplant & Assign
              </h2>
              <button onClick={() => setShowTransplantModal(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleTransplant} className="space-y-4">
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 mb-4 flex justify-between">
                <div>
                  <p className="text-xs text-gray-400 uppercase">Source Tray</p>
                  <p className="font-mono text-sm text-blue-400 font-bold">{activeTrayForTransplant.tray_code}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase">Crop Data</p>
                  <p className="text-sm text-white">{getCrop(activeTrayForTransplant.crop_id)?.common_name || 'Unknown'}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-blue-400 block mb-1">Destination Physical Plot *</label>
                <select required value={transplantForm.target_plot_id} onChange={e => setTransplantForm({...transplantForm, target_plot_id: e.target.value})} className="input-field w-full border-blue-500/20 bg-blue-500/5">
                  <option value="">Select a Cleared or Resting Plot...</option>
                  {plots.filter(p => p.status === 'Cleared' || p.status === 'Resting').map(p => (
                    <option key={p.plot_id || p.id} value={p.plot_id || p.id}>{p.plot_code} ({p.status})</option>
                  ))}
                </select>
                {plots.filter(p => p.status === 'Cleared' || p.status === 'Resting').length === 0 && (
                  <p className="text-xs text-red-400 mt-1">No cleared or resting plots available. Please add or clear a plot first.</p>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Transplant Date *</label>
                <input type="date" required value={transplantForm.transplant_date} onChange={e => setTransplantForm({...transplantForm, transplant_date: e.target.value})} className="input-field w-full" />
              </div>

              <div className="text-[10px] text-gray-400 mt-4 leading-tight">
                This will automatically mark the target plot as <span className="text-green-400 font-bold">Active</span> and begin its yield tracking cycle using the original tray's lineage.
              </div>
              
              <button type="submit" disabled={plots.filter(p => p.status === 'Cleared' || p.status === 'Resting').length === 0} className="btn-primary w-full py-3 mt-4 justify-center bg-blue-600 hover:bg-blue-500 disabled:opacity-50">Confirm Transplant</button>
            </form>
          </div>
        </div>
      )}

      {/* PLOT MODAL */}
      {showPlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPlotModal(false)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-3xl p-6 border" style={{ background: 'var(--color-bg-modal)', borderColor: 'var(--color-border)' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-themed-heading flex items-center gap-2"><LayoutDashboard size={18}/> {editingPlotId ? 'Edit Plot' : 'New Plot/Bed Definition'}</h2>
              <button onClick={() => setShowPlotModal(false)} className="text-themed-muted hover:text-themed-heading"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleCreatePlot} className="space-y-4">
              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="text-xs text-themed-muted">Plot UID *</label>
                  <button type="button" onClick={() => setPlotForm({...plotForm, plot_code: generateRandomBedCode()})} className="text-[10px] text-green-500 hover:text-green-400 font-bold">Auto Generate</button>
                </div>
                <input type="text" required value={plotForm.plot_code} onChange={e => setPlotForm({...plotForm, plot_code: e.target.value})} className="input-field w-full" placeholder="e.g. BED-FRONT-01 or PLT-BSL-01" />
              </div>
              
              <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg flex items-start gap-2">
                <LayoutDashboard size={16} className="text-green-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-green-200">Plots represent physical beds. You do not need to select a crop when creating a cleared bed. It will be assigned an active crop automatically during tray transplanting.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Sowing/Active Date</label>
                  <input type="date" value={plotForm.sowing_date} onChange={e => setPlotForm({...plotForm, sowing_date: e.target.value})} className="input-field w-full" />
                </div>
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Status</label>
                  <select value={plotForm.status} onChange={e => setPlotForm({...plotForm, status: e.target.value})} className="input-field w-full">
                    {PLOT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {plotForm.status === 'Active' && (
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Manual Crop Assignment (Optional)</label>
                  <select value={plotForm.crop_id} onChange={e => setPlotForm({...plotForm, crop_id: e.target.value})} className="input-field w-full">
                    <option value="">No active crop...</option>
                    {crops.map(c => <option key={c.id} value={c.id}>{c.common_name}</option>)}
                  </select>
                </div>
              )}
              
              <button type="submit" className="btn-primary w-full py-3 mt-2 justify-center border-green-500/50">{editingPlotId ? 'Update Plot' : 'Save Plot Record'}</button>
            </form>
          </div>
        </div>
      )}

      {/* BATCH MODAL */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBatchModal(false)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-3xl p-6 border" style={{ background: 'var(--color-bg-modal)', borderColor: 'var(--color-border)' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-themed-heading flex items-center gap-2"><SproutIcon size={18}/> {editingBatchId ? 'Edit Batch track' : 'New Batch (Pot/Kratky) Track'}</h2>
              <button onClick={() => setShowBatchModal(false)} className="text-themed-muted hover:text-themed-heading"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="text-xs text-themed-muted block mb-1">Crop Variant (Pot) *</label>
                <select required value={batchForm.crop_id} onChange={e => generateCode('batch', e.target.value, setBatchForm, batchForm)} className="input-field w-full">
                  <option value="">Select Crop to suggest code...</option>
                  {crops.map(c => <option key={c.id} value={c.id}>{c.common_name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="text-xs text-themed-muted block mb-1">Batch Code *</label>
                   <input type="text" required value={batchForm.batch_code} onChange={e => setBatchForm({...batchForm, batch_code: e.target.value})} className="input-field w-full" placeholder="BCH-TME-XX" />
                 </div>
                 <div>
                   <label className="text-xs text-themed-muted block mb-1">Start Date</label>
                   <input type="date" required value={batchForm.start_date} onChange={e => setBatchForm({...batchForm, start_date: e.target.value})} className="input-field w-full" />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Propagation Method</label>
                  <select required value={batchForm.propagation_method} onChange={e => setBatchForm({...batchForm, propagation_method: e.target.value})} className="input-field w-full border-amber-500/20">
                     {PROPAGATION_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-themed-muted block mb-1">Vessel Count *</label>
                  <input type="number" required min="1" value={batchForm.initial_quantity} onChange={e => setBatchForm({...batchForm, initial_quantity: e.target.value})} className="input-field w-full" placeholder="e.g. 50 pots" />
                </div>
              </div>

              <div>
                <label className="text-xs text-themed-muted block mb-1">Cost of Inputs (₱ - Optional)</label>
                <input type="number" min="0" step="0.01" value={batchForm.input_cost} onChange={e => setBatchForm({...batchForm, input_cost: e.target.value})} className="input-field w-full" placeholder="0.00" />
              </div>

              {editingBatchId && (
                 <div>
                   <label className="text-xs text-themed-muted block mb-1">Batch Status</label>
                   <select value={batchForm.status} onChange={e => setBatchForm({...batchForm, status: e.target.value})} className="input-field w-full">
                     {BATCH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                 </div>
              )}
              
              <button type="submit" className="btn-primary w-full py-3 mt-2 justify-center bg-amber-600 hover:bg-amber-700">{editingBatchId ? 'Update Batch' : 'Initialize Batch'}</button>
            </form>
          </div>
        </div>
      )}

      {/* HARVEST SAFETY MODAL */}
      {showSafetyModal && safetyAssessment && activePlotForHarvest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowSafetyModal(false)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-3xl p-6 border shadow-2xl" style={{ 
            background: 'var(--color-bg-modal)', 
            borderColor: safetyAssessment.status === 'Blocked' ? '#e74c3c' : '#f39c12' 
          }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-themed-heading flex items-center gap-2">
                <AlertTriangle size={20} className={safetyAssessment.status === 'Blocked' ? 'text-red-500' : 'text-orange-500'}/> 
                Harvest Safety Assessment
              </h2>
              <button onClick={() => setShowSafetyModal(false)} className="text-themed-muted hover:text-themed-heading"><X size={20}/></button>
            </div>

            <div className="mb-6 space-y-3">
              <div className={`p-4 rounded-xl border ${safetyAssessment.status === 'Blocked' ? 'bg-red-500/10 border-red-500/30' : 'bg-orange-500/10 border-orange-500/30'}`}>
                <p className={`text-sm font-bold mb-2 ${safetyAssessment.status === 'Blocked' ? 'text-red-500' : 'text-orange-500'}`}>
                  STATUS: {safetyAssessment.status.toUpperCase()}
                </p>
                <ul className="space-y-1">
                  {safetyAssessment.reasons.map((r, i) => (
                    <li key={i} className="text-xs text-themed-primary flex gap-2">
                      <span className="shrink-0">•</span> {r}
                    </li>
                  ))}
                </ul>
              </div>

              {safetyAssessment.status === 'Caution' && (
                <div className="text-xs text-themed-muted italic">
                  Produce may be harvested but requires careful inspection or sorting. Edible parts must be strictly validated.
                </div>
              )}
            </div>

            <div className="space-y-2">
              {safetyAssessment.status === 'Caution' ? (
                <>
                  <button onClick={() => {
                    setHarvestForm({...defaultHarvestForm, harvest_outcome: 'Caution - Harvested'});
                    setShowSafetyModal(false);
                    setShowHarvestModal(true);
                  }} className="btn-primary w-full py-3 justify-center bg-orange-600 hover:bg-orange-700 border-orange-600/50">
                    Harvest Anyway (Log Warning)
                  </button>
                  <button onClick={() => {
                    setHarvestForm({...defaultHarvestForm, harvest_outcome: 'Caution - Partial'});
                    setShowSafetyModal(false);
                    setShowHarvestModal(true);
                  }} className="btn-secondary w-full py-3 justify-center border-orange-500/30 text-orange-400">
                    Partial Harvest (Cull Affected Sections)
                  </button>
                  <button onClick={() => setShowSafetyModal(false)} className="btn-secondary w-full py-3 justify-center">
                    Postpone & Reschedule
                  </button>
                </>
              ) : (
                <button onClick={() => setShowSafetyModal(false)} className="btn-primary w-full py-3 justify-center bg-red-600 hover:bg-red-700 border-red-600/50">
                  Close & Schedule Treatment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HARVEST MODAL */}
      {showHarvestModal && activePlotForHarvest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHarvestModal(false)} />
          <div className="relative w-full max-w-md animate-slide-up rounded-3xl p-6 border" style={{ background: 'var(--color-bg-modal)', borderColor: 'var(--color-border)' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-themed-heading flex items-center gap-2">
                <Scissors size={18}/> Log Harvest 
                <span className="text-xs text-themed-muted ml-2 font-mono">({activePlotForHarvest.plot_code})</span>
              </h2>
              <button onClick={() => setShowHarvestModal(false)} className="text-themed-muted hover:text-themed-heading"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleLogHarvest} className="space-y-4">
              {harvestForm.harvest_outcome !== 'Safe' && (
                <div className={`p-3 rounded-xl border mb-2 ${harvestForm.harvest_outcome.includes('Partial') ? 'bg-orange-500/10 border-orange-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500 mb-1">Safety Outcome: {harvestForm.harvest_outcome}</p>
                  <p className="text-[10px] text-themed-primary leading-tight">
                    {safetyAssessment?.reasons[0] || 'Safety warning logged with this harvest.'}
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs text-themed-muted block mb-1">Harvest Date *</label>
                <input type="date" required value={harvestForm.harvest_date} onChange={e => setHarvestForm({...harvestForm, harvest_date: e.target.value})} className="input-field w-full" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="text-xs font-bold text-green-500 block mb-1">Good Yield (Grams) *</label>
                   <input type="number" step="0.1" required min="1" value={harvestForm.yield_weight_g} onChange={e => setHarvestForm({...harvestForm, yield_weight_g: e.target.value})} className="input-field border-green-500/30 w-full" placeholder="150" />
                 </div>
                 <div>
                   <label className={`text-xs font-bold block mb-1 ${harvestForm.harvest_outcome.includes('Partial') ? 'text-orange-500 animate-pulse' : 'text-red-500'}`}>
                     Culled Weight (Waste) {harvestForm.harvest_outcome.includes('Partial') ? '*' : ''}
                   </label>
                   <input type="number" step="0.1" min="0" required={harvestForm.harvest_outcome.includes('Partial')} value={harvestForm.cull_weight_g} onChange={e => setHarvestForm({...harvestForm, cull_weight_g: e.target.value})} className={`input-field w-full ${harvestForm.harvest_outcome.includes('Partial') ? 'border-orange-500' : 'border-red-500/30'}`} placeholder="5" />
                 </div>
              </div>

              <div>
                <label className="text-xs text-themed-muted block mb-1">Harvest Notes / Remarks</label>
                <textarea value={harvestForm.notes} onChange={e => setHarvestForm({...harvestForm, notes: e.target.value})} className="input-field w-full min-h-[60px] py-2" placeholder="e.g. Discarded aphid-heavy tips, quality otherwise good." />
              </div>

              <div className="p-3 bg-black/5 rounded-xl border border-white/5 mt-3">
                <p className="text-[10px] text-themed-muted">Culled weight will immediately funnel into your Finance Lost Potential tracker.</p>
              </div>
              
              <button type="submit" className="btn-primary w-full py-3 mt-2 justify-center">Save Harvest Record</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Batches;
