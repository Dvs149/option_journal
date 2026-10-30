import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusSquare,
  ListFilter,
  BarChart3,
  MoreHorizontal,
  CalendarDays,
  LineChart,
  ShieldAlert,
  BookOpen,
  PieChart,
  Wallet,
  Settings,
  X,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function MobileNav() {
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const primaryItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Add Trade', path: '/add-trade', icon: PlusSquare },
    { name: 'All Trades', path: '/trades', icon: ListFilter },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  ];

  const secondaryItems = [
    { name: 'Trading Calendar', path: '/calendar', icon: CalendarDays },
    { name: 'Equity Curve', path: '/equity-curve', icon: LineChart },
    { name: 'Risk Management', path: '/risk-management', icon: ShieldAlert },
    { name: 'Trading Journal', path: '/journal', icon: BookOpen },
    { name: 'Strategy Analysis', path: '/strategy-analysis', icon: PieChart },
    { name: 'Capital Management', path: '/capital-management', icon: Wallet },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Fixed Bottom Navigation Bar for Mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0e1626]/95 light:bg-white/95 backdrop-blur-lg border-t border-[#1e293b] light:border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-pb">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-all ${
                  isActive
                    ? 'text-blue-500 font-semibold'
                    : 'text-slate-400 light:text-slate-500 hover:text-white light:hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}

        {/* 'More' Button */}
        <button
          onClick={() => setShowMoreDrawer(true)}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium text-slate-400 light:text-slate-500 hover:text-white light:hover:text-slate-900 transition-all"
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" />
          <span>More</span>
        </button>
      </nav>

      {/* Slide-over Drawer for 'More' navigation */}
      {showMoreDrawer && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm lg:hidden">
          <div className="bg-[#0e1626] light:bg-white border-t border-[#1e293b] light:border-slate-200 rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 space-y-4 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1e293b] light:border-slate-200">
              <span className="font-bold text-base text-white light:text-slate-900">
                All Modules & Tools
              </span>
              <button
                onClick={() => setShowMoreDrawer(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid of Secondary Modules */}
            <div className="grid grid-cols-2 gap-2.5">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setShowMoreDrawer(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                        isActive
                          ? 'bg-blue-600/15 border-blue-500 text-blue-400 font-semibold'
                          : 'bg-[#131c2e] light:bg-slate-100 border-[#1e293b] light:border-slate-200 text-slate-300 light:text-slate-700'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="text-xs truncate">{item.name}</span>
                  </NavLink>
                );
              })}
            </div>

            {/* Quick Actions & Logout */}
            <div className="pt-2 border-t border-[#1e293b] light:border-slate-200 flex items-center justify-between">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 text-xs text-slate-300 light:text-slate-700 py-2 px-3 rounded-xl bg-[#131c2e] light:bg-slate-200"
              >
                {isDark ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                <span className="font-semibold">Dark Mode:</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-300 text-slate-700'
                }`}>
                  {isDark ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                onClick={async () => {
                  setShowMoreDrawer(false);
                  await logout();
                  navigate('/login');
                }}
                className="flex items-center gap-2 text-xs text-red-400 py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
