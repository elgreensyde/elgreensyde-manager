import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Home, Sprout, CheckSquare, ShoppingCart, Menu, X, BookOpen, Package, DollarSign, Beaker, Shield, ChevronRight, Sun, Moon, Map } from 'lucide-react';
import { useTheme } from './contexts/ThemeContext';
import { initializeSeedData } from './services/seedData';
import Dashboard from './pages/Dashboard';
import CropLibrary from './pages/CropLibrary';
import Batches from './pages/Batches';
import Tasks from './pages/Tasks';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Finance from './pages/Finance';
import Fertilizer from './pages/Fertilizer';
import IPM from './pages/IPM';
import Zones from './pages/Zones';

function App() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    initializeSeedData();
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [location]);

  const mainNav = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/batches', icon: Sprout, label: 'Batches' },
    { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { to: '/pos', icon: ShoppingCart, label: 'POS' },
  ];

  const moreNav = [
    { to: '/crops', icon: BookOpen, label: 'Crop Library' },
    { to: '/inventory', icon: Package, label: 'Inventory' },
    { to: '/finance', icon: DollarSign, label: 'Finance' },
    { to: '/fertilizer', icon: Beaker, label: 'Fertilizer & Nutrients' },
    { to: '/ipm', icon: Shield, label: 'IPM (Plant Protection)' },
    { to: '/zones', icon: Map, label: 'Zones Map' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/crops" element={<CropLibrary />} />
          <Route path="/batches" element={<Batches />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/fertilizer" element={<Fertilizer />} />
          <Route path="/ipm" element={<IPM />} />
          <Route path="/zones" element={<Zones />} />
        </Routes>
      </main>

      {/* More Menu Overlay */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 no-print" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--color-bg-overlay)' }} />
          <div
            className="absolute bottom-20 right-4 left-4 sm:left-auto sm:right-4 sm:w-72 z-50 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="glass-card-static p-2" style={{ borderColor: 'var(--color-border)' }}>
              <div className="px-3 py-2 mb-1 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-themed-muted">More Modules</h3>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
                  style={{ background: 'var(--color-bg-card)' }}
                  id="theme-toggle-more"
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-500" />}
                </button>
              </div>
              {moreNav.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                    ${isActive
                      ? 'text-themed-primary'
                      : 'text-themed-muted hover:text-themed-primary'}`
                  }
                  style={({ isActive }) => isActive ? { background: 'var(--color-bg-card-hover)' } : {}}
                >
                  <item.icon size={20} className="flex-shrink-0" />
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  <ChevronRight size={16} className="opacity-40 group-hover:opacity-70 transition-opacity" />
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 no-print border-t"
           style={{ background: 'var(--color-bg-nav)', backdropFilter: 'blur(20px)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {mainNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className="flex flex-col items-center gap-1 py-3 px-4 min-w-[64px] transition-all duration-200"
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1 rounded-lg transition-all duration-200 ${isActive ? 'bg-forest-600/20' : ''}`}>
                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.5}
                      style={{ color: isActive ? 'var(--color-badge-herb-text)' : 'var(--color-text-muted)' }} />
                  </div>
                  <span className="text-[10px] font-medium"
                    style={{ color: isActive ? 'var(--color-badge-herb-text)' : 'var(--color-text-muted)' }}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className="flex flex-col items-center gap-1 py-3 px-4 min-w-[64px] transition-all duration-200"
          >
            <div className={`p-1 rounded-lg transition-all duration-200 ${moreOpen ? 'bg-forest-600/20' : ''}`}>
              {moreOpen
                ? <X size={22} strokeWidth={2.5} style={{ color: 'var(--color-badge-herb-text)' }} />
                : <Menu size={22} strokeWidth={1.5} style={{ color: 'var(--color-text-muted)' }} />}
            </div>
            <span className="text-[10px] font-medium" style={{ color: moreOpen ? 'var(--color-badge-herb-text)' : 'var(--color-text-muted)' }}>
              More
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;
