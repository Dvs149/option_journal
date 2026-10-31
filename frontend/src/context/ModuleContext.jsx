import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  PlusSquare,
  ListFilter,
  CalendarDays,
  LineChart,
  ShieldAlert,
  BookOpen,
  PieChart,
  BarChart3,
  Wallet,
  SlidersHorizontal,
  Code2,
} from 'lucide-react';
import api from '../api/client';

export const APP_MODULES = [
  {
    id: 'add-trade',
    name: 'Add Trade',
    path: '/add-trade',
    icon: PlusSquare,
    desc: 'Record new trades with option leg details, CE/PE entry/exit, and automatic calculations',
    category: 'Trading',
  },
  {
    id: 'trades',
    name: 'All Trades',
    path: '/trades',
    icon: ListFilter,
    desc: 'View, filter, edit, and export your entire trading history with full drawer & lightbox preview',
    category: 'Trading',
  },
  {
    id: 'calendar',
    name: 'Trading Calendar',
    path: '/calendar',
    icon: CalendarDays,
    desc: 'Interactive calendar view showing daily P&L, trading days, and monthly heatmaps',
    category: 'Analysis',
  },
  {
    id: 'equity-curve',
    name: 'Equity Curve',
    path: '/equity-curve',
    icon: LineChart,
    desc: 'Track cumulative equity growth, high-water mark, and peak-to-trough drawdowns',
    category: 'Analytics',
  },
  {
    id: 'risk-management',
    name: 'Risk Management',
    path: '/risk-management',
    icon: ShieldAlert,
    desc: 'Set daily loss limits, maximum profit targets, and automated risk alert enforcement',
    category: 'Risk',
  },
  {
    id: 'journal',
    name: 'Trading Journal',
    path: '/journal',
    icon: BookOpen,
    desc: 'Reflect on trade setups, psychology, what went right/wrong, and lessons learned',
    category: 'Journaling',
  },
  {
    id: 'strategy-analysis',
    name: 'Strategy Analysis',
    path: '/strategy-analysis',
    icon: PieChart,
    desc: 'Analyze win rates and profitability breakdown across all option strategies',
    category: 'Analysis',
  },
  {
    id: 'analytics',
    name: 'Analytics & Reports',
    path: '/analytics',
    icon: BarChart3,
    desc: 'Deep performance metrics, win/loss ratios, average R:R, and monthly comparisons',
    category: 'Analytics',
  },
  {
    id: 'capital-management',
    name: 'Capital Management',
    path: '/capital-management',
    icon: Wallet,
    desc: 'Manage account deposits, withdrawals, ROI calculations, and live net capital balance',
    category: 'Account',
  },
  {
    id: 'pine-scripts',
    name: 'Pine Script Manager',
    path: '/pine-scripts',
    icon: Code2,
    desc: 'Manage, organize, and copy TradingView Pine Script indicators, strategies, and webhook alerts',
    category: 'Tools',
  },
  {
    id: 'dropdown-manager',
    name: 'Dropdown Manager',
    path: '/dropdown-manager',
    icon: SlidersHorizontal,
    desc: 'Manage, activate & deactivate dropdown options module-wise across Add Trade, All Trades, etc.',
    category: 'Settings',
  },
];

const STORAGE_KEY = 'tj_module_visibility';

const DEFAULT_VISIBILITY = APP_MODULES.reduce((acc, mod) => {
  acc[mod.id] = true;
  return acc;
}, {});

const ModuleContext = createContext();

export function ModuleProvider({ children }) {
  const [moduleVisibility, setModuleVisibilityState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_VISIBILITY, ...parsed };
      }
    } catch (e) {
      console.error('Failed to parse module visibility from localStorage', e);
    }
    return DEFAULT_VISIBILITY;
  });

  const [loading, setLoading] = useState(false);
  const [isDbSynced, setIsDbSynced] = useState(false);

  // Fetch module visibility from Database API on mount
  const fetchVisibilityFromDB = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/module-visibility');
      if (res.data?.visibility) {
        setModuleVisibilityState((prev) => ({
          ...prev,
          ...res.data.visibility,
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data.visibility));
        setIsDbSynced(true);
      }
    } catch (err) {
      console.warn('Could not fetch module visibility from DB, using cached preferences:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVisibilityFromDB();
  }, [fetchVisibilityFromDB]);

  // Keep localStorage updated as cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(moduleVisibility));
    } catch (e) {
      console.error('Failed to save module visibility to localStorage', e);
    }
  }, [moduleVisibility]);

  const isModuleVisible = (keyOrPath) => {
    if (!keyOrPath) return true;
    // Core routes like Dashboard and Settings are always visible
    if (keyOrPath === '/' || keyOrPath === '/settings' || keyOrPath === 'dashboard' || keyOrPath === 'settings') {
      return true;
    }

    // Lookup by path (e.g. '/calendar')
    const byPath = APP_MODULES.find((m) => m.path === keyOrPath);
    if (byPath) {
      return moduleVisibility[byPath.id] !== false;
    }

    // Lookup by id (e.g. 'calendar')
    if (moduleVisibility[keyOrPath] !== undefined) {
      return moduleVisibility[keyOrPath] !== false;
    }

    return true;
  };

  /**
   * Toggle a module and persist immediately into Database
   */
  const toggleModule = async (id) => {
    const nextVal = !moduleVisibility[id];

    // Optimistic UI update
    setModuleVisibilityState((prev) => ({
      ...prev,
      [id]: nextVal,
    }));

    // Persist into Database
    try {
      await api.post('/module-visibility', {
        module_key: id,
        is_visible: nextVal,
      });
      setIsDbSynced(true);
    } catch (err) {
      console.error('Failed to save module visibility toggle in database:', err);
    }
  };

  /**
   * Set specific module visibility and persist in Database
   */
  const setModuleVisible = async (id, isVisible) => {
    const val = Boolean(isVisible);

    setModuleVisibilityState((prev) => ({
      ...prev,
      [id]: val,
    }));

    try {
      await api.post('/module-visibility', {
        module_key: id,
        is_visible: val,
      });
      setIsDbSynced(true);
    } catch (err) {
      console.error('Failed to set module visibility in database:', err);
    }
  };

  /**
   * Reset all modules to default visible in Database
   */
  const resetAllModules = async () => {
    setModuleVisibilityState(DEFAULT_VISIBILITY);

    try {
      const res = await api.post('/module-visibility/reset');
      if (res.data?.visibility) {
        setModuleVisibilityState(res.data.visibility);
      }
      setIsDbSynced(true);
    } catch (err) {
      console.error('Failed to reset module visibility in database:', err);
    }
  };

  /**
   * Set all modules visible or hidden in Database batch
   */
  const setAllModulesVisible = async (isVisible) => {
    const updated = {};
    APP_MODULES.forEach((m) => {
      updated[m.id] = Boolean(isVisible);
    });

    setModuleVisibilityState(updated);

    try {
      await api.put('/module-visibility/batch', {
        visibility: updated,
      });
      setIsDbSynced(true);
    } catch (err) {
      console.error('Failed to batch update module visibility in database:', err);
    }
  };

  return (
    <ModuleContext.Provider
      value={{
        modules: APP_MODULES,
        moduleVisibility,
        isModuleVisible,
        toggleModule,
        setModuleVisible,
        resetAllModules,
        setAllModulesVisible,
        fetchVisibilityFromDB,
        loading,
        isDbSynced,
      }}
    >
      {children}
    </ModuleContext.Provider>
  );
}

export function useModules() {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error('useModules must be used within a ModuleProvider');
  }
  return context;
}
