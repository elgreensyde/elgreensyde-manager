import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Home, Sprout, CheckSquare, ShoppingCart, Menu, X, BookOpen, Package, DollarSign, Beaker, ChevronRight, Sun, Moon, ScanEye, ClipboardList, Target, Zap, CloudSun } from 'lucide-react';
import { useTheme } from './contexts/ThemeContext';
import { initializeSeedData } from './services/seedData';
import Dashboard from './pages/Dashboard';
import CropLibrary from './pages/CropLibrary';
import Batches from './pages/Batches';
import Tasks from './pages/Tasks';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Finance from './pages/Finance';
import Maintenance from './pages/Maintenance';
import Monitoring from './pages/Monitoring';
import ReturnSummary from './pages/ReturnSummary';
import OrderBuilder from './pages/OrderBuilder';
import FulfillmentBoard from './pages/FulfillmentBoard';
import PlantingTargets from './pages/PlantingTargets';
import Weather from './pages/Weather';
import { Toaster } from 'react-hot-toast';
import awayService from './services/awayService';
import notificationService from './services/notificationService';
import supabase from './lib/supabase';
import SmartAssistant from './components/SmartAssistant';

function GlobalDialog() {
  const [data, setData] = useState(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const handler = (e) => {
      setData(e.detail);
      setInputValue(e.detail.defaultValue || '');
    };
    window.addEventListener('show-dialog', handler);
    return () => window.removeEventListener('show-dialog', handler);
  }, []);

  if (!data) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { data.onCancel(); setData(null); }} />
      <div className="relative w-full max-w-sm glass-card border p-6 animate-slide-up shadow-2xl" style={{ borderColor: 'var(--color-border)' }}>
        <h3 className="text-lg font-display font-bold mb-3" style={{ color: 'var(--color-text-heading)' }}>
          {data.type === 'confirm' ? 'Confirm Action' : 'Input Required'}
        </h3>
        <p className="text-sm mb-5" style={{ color: 'var(--color-text-primary)' }}>{data.message}</p>
        
        {data.type === 'prompt' && (
          <input 
            type="text" 
            autoFocus 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="input-field w-full mb-5" 
            placeholder="Type here..."
          />
        )}
        
        <div className="flex gap-3">
          <button className="flex-1 py-3 rounded-xl text-sm font-bold opacity-80 hover:opacity-100 transition-all" 
                  style={{ background: 'var(--color-bg-overlay)', color: 'var(--color-text-primary)' }}
                  onClick={() => { data.onCancel(); setData(null); }}>
            Cancel
          </button>
          <button className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition-transform active:scale-95 ${data.type === 'confirm' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                  disabled={data.type === 'prompt' && data.required && !inputValue.trim()}
                  onClick={() => { data.onConfirm(data.type === 'prompt' ? inputValue : true); setData(null); }}>
            {data.type === 'confirm' ? 'Yes, Delete' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [moreOpen, setMoreOpen] = useState(false);
  const [absenceInfo, setAbsenceInfo] = useState({ requiresAcknowledgment: false });
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const init = async () => {
      await initializeSeedData();
      await notificationService.registerPush();
      const [info, notifs] = await Promise.all([
        awayService.checkAbsenceStatus(),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false)
      ]);
      setAbsenceInfo(info);
      setUnreadCount(notifs.count || 0);
    };
    init();
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [location]);

  const mainNav = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/batches', icon: Sprout, label: 'Batches' },
    { to: '/tasks', icon: CheckSquare, label: 'Tasks', badge: true },
    { to: '/pos', icon: ShoppingCart, label: 'POS' },
  ];

  const moreNav = [
    { to: '/monitoring', icon: ScanEye, label: 'Farm Walk' },
    { to: '/weather', icon: CloudSun, label: 'Weather' },
    { to: '/orders', icon: ClipboardList, label: 'Orders' },
    { to: '/targets', icon: Target, label: 'Planting Targets' },
    { to: '/crops', icon: BookOpen, label: 'Crop Library' },
    { to: '/inventory', icon: Package, label: 'Inventory' },
    { to: '/finance', icon: DollarSign, label: 'Finance' },
    { to: '/maintenance', icon: Beaker, label: 'Action Logs' },
  ];

  return (
    <div className="flex h-screen bg-themed-primary overflow-hidden relative">
      {absenceInfo.requiresAcknowledgment && (
        <ReturnSummary 
          period={absenceInfo.returnedPeriod} 
          onComplete={() => setAbsenceInfo({ ...absenceInfo, requiresAcknowledgment: false })} 
        />
      )}
      <GlobalDialog />
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: 'var(--color-bg-card)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)'
          }
        }} 
      />
      {/* DESKTOP SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex flex-col w-64 border-r no-print" style={{ background: 'var(--color-bg-nav)', borderColor: 'var(--color-border)' }}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-xl font-display font-bold text-themed-heading">Elgreensyde</h1>
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-black/5" title="Toggle Theme">
             {theme === 'dark' ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-indigo-500" />}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-themed-muted px-2 mb-2 mt-4">Core</p>
          {mainNav.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all ${isActive ? 'bg-forest-600/10 text-green-600 font-semibold' : 'text-themed-secondary hover:bg-black/5'}`}>
              <div className="flex items-center gap-3">
                <item.icon size={18} /> <span>{item.label}</span>
              </div>
              {item.badge && unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{unreadCount}</span>}
            </NavLink>
          ))}
          
          <p className="text-xs font-bold uppercase tracking-wider text-themed-muted px-2 mb-2 mt-8">Operations</p>
          {moreNav.map(item => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${isActive ? 'bg-forest-600/10 text-green-600 font-semibold' : 'text-themed-secondary hover:bg-black/5'}`}>
              <item.icon size={18} /> <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto pb-24 relative no-scrollbar">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/crops" element={<CropLibrary />} />
          <Route path="/batches" element={<Batches />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/orders" element={<FulfillmentBoard />} />
          <Route path="/weather" element={<Weather />} />
          <Route path="/orders/new" element={<OrderBuilder />} />
          <Route path="/targets" element={<PlantingTargets />} />
        </Routes>
      </main>

      {/* MOBILE MORE OVERLAY */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40 no-print" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--color-bg-overlay)' }} />
          <div className="absolute right-4 left-4 z-50 animate-slide-up" style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }} onClick={e => e.stopPropagation()}>
            <div className="glass-card-static p-2" style={{ borderColor: 'var(--color-border)' }}>
              <div className="px-3 py-2 mb-1 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-themed-muted">More Modules</h3>
                <button onClick={toggleTheme} className="p-2 rounded-lg" style={{ background: 'var(--color-bg-card)' }}>
                  {theme === 'dark' ? <Sun size={16} className="text-amber-500" /> : <Moon size={16} className="text-indigo-500" />}
                </button>
              </div>
              {moreNav.map(item => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-xl ${isActive ? 'text-green-600 bg-forest-600/10' : 'text-themed-muted'}`}>
                  <item.icon size={20} /> <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION — with iOS/Android safe area inset */}
      <nav className="bottom-nav md:hidden fixed bottom-0 left-0 right-0 z-30 no-print border-t" style={{ background: 'var(--color-bg-nav)', backdropFilter: 'blur(20px)', borderColor: 'var(--color-border)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {mainNav.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className="flex flex-col items-center gap-1 py-3 px-4 min-w-[64px] relative">
              {({ isActive }) => (
                <>
                  <div className={`p-1 rounded-lg ${isActive ? 'bg-forest-600/20' : ''}`}>
                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.5} style={{ color: isActive ? 'var(--color-badge-herb-text)' : 'var(--color-text-muted)' }} />
                    {item.badge && unreadCount > 0 && <span className="absolute top-2 right-4 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />}
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: isActive ? 'var(--color-badge-herb-text)' : 'var(--color-text-muted)' }}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button onClick={() => setMoreOpen(!moreOpen)} className="flex flex-col items-center gap-1 py-3 px-4 min-w-[64px]">
            <div className={`p-1 rounded-lg ${moreOpen ? 'bg-forest-600/20' : ''}`}>
              {moreOpen ? <X size={22} strokeWidth={2.5} style={{ color: 'var(--color-badge-herb-text)' }} /> : <Menu size={22} strokeWidth={1.5} style={{ color: 'var(--color-text-muted)' }} />}
            </div>
            <span className="text-[10px] font-medium" style={{ color: moreOpen ? 'var(--color-badge-herb-text)' : 'var(--color-text-muted)' }}>More</span>
          </button>
        </div>
      </nav>

      <SmartAssistant />
    </div>
  );
}

export default App;
