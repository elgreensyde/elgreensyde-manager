import React, { useState } from 'react';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import db from '../services/db';
import { toast } from 'react-hot-toast';

/**
 * CSVImport: Bulk upload for Crops and Inventory.
 * Provides a template and handles the parsing/insertion logic.
 */
function CSVImport({ type = 'crops', onComplete }) {
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  const getTemplate = () => {
    const headers = type === 'crops' 
      ? 'common_name,scientific_name,category,days_to_maturity,harvest_window_days,rooting_or_germ_days\n'
      : 'sku_code,product_name,current_stock,restock_alert_level,retail_price\n';
    const blob = new Blob([headers], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elgreensyde_${type}_template.csv`;
    a.click();
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').filter(l => l.trim() !== '');
        const headers = lines[0].split(',').map(h => h.trim());
        const data = lines.slice(1).map(line => {
          const values = line.split(',');
          const obj = {};
          headers.forEach((h, i) => {
            const val = values[i]?.trim();
            obj[h] = isNaN(val) ? val : parseFloat(val);
          });
          return obj;
        });

        // Batch insert to DB
        const table = type === 'crops' ? 'crops' : 'inventory';
        await db.insertMany(table, data);
        
        setResults({ count: data.length, success: true });
        toast.success(`Successfully imported ${data.length} ${type}`);
        if (onComplete) onComplete();
      } catch (err) {
        console.error('Import error:', err);
        setResults({ error: err.message, success: false });
        toast.error(`Import failed: ${err.message}`);
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="glass-card-static p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <FileSpreadsheet size={16} /> Bulk {type === 'crops' ? 'Crop Library' : 'Inventory'} Import
        </h3>
        <button 
          onClick={getTemplate}
          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 uppercase tracking-widest border-b border-indigo-600/30"
        >
          <Download size={12} /> Template
        </button>
      </div>

      {!results ? (
        <div className="relative group">
          <input 
            type="file" 
            accept=".csv"
            onChange={handleFile}
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
            disabled={importing}
          />
          <div className={`p-8 border-2 border-dashed rounded-3xl text-center transition-all ${importing ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100 group-hover:border-indigo-400 group-hover:bg-indigo-50/50'}`}>
            <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${importing ? 'bg-slate-100 text-slate-400 animate-pulse' : 'bg-indigo-100 text-indigo-600 group-hover:scale-110 transition-transform'}`}>
              <Upload size={24} />
            </div>
            <p className="text-sm font-bold text-slate-800">{importing ? 'Processing Data...' : 'Drop CSV or Browse'}</p>
            <p className="text-xs text-slate-500 mt-1">Upload the populated template to bulk load records.</p>
          </div>
        </div>
      ) : (
        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-scale-in ${results.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
          {results.success ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">{results.success ? 'Import Complete' : 'Import Failed'}</p>
            <p className="text-xs opacity-80 truncate">{results.success ? `Added ${results.count} items to the collection.` : results.error}</p>
          </div>
          <button onClick={() => setResults(null)} className="text-[10px] font-bold uppercase tracking-widest ml-auto">Reset</button>
        </div>
      )}

      <div className="bg-slate-50 rounded-2xl p-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Usage Notice</p>
        <p className="text-[10px] leading-relaxed text-slate-500 italic">
          Use this pipeline to easily add Crop #21 or bulk update SKU pricing. Ensure all required fields in the template are populated correctly to avoid row-rejection.
        </p>
      </div>
    </div>
  );
}

export default CSVImport;
