import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusSquare,
  ListFilter,
  CalendarDays,
  LineChart,
  ShieldAlert,
  BookOpen,
  PieChart,
  BarChart3,
  Wallet,
  Settings,
  Moon,
  Sun,
  LogOut,
  MoreVertical,
  Activity,
  User as UserIcon,
  TrendingUp,
  SlidersHorizontal,
  Code2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useModules } from '../../context/ModuleContext';

export default function Sidebar({ onCloseMobile }) {
  const { user, logout } = useAuth();
  const { theme, isDark, toggleTheme, isKite } = useTheme();
  const { isModuleVisible } = useModules();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Add Trade', path: '/add-trade', icon: PlusSquare },
    { name: 'All Trades', path: '/trades', icon: ListFilter },
    { name: 'Trading Calendar', path: '/calendar', icon: CalendarDays },
    { name: 'Equity Curve', path: '/equity-curve', icon: LineChart },
    { name: 'Risk Management', path: '/risk-management', icon: ShieldAlert },
    { name: 'Trading Journal', path: '/journal', icon: BookOpen },
    { name: 'Strategy Analysis', path: '/strategy-analysis', icon: PieChart },
    { name: 'Analytics & Reports', path: '/analytics', icon: BarChart3 },
    { name: 'Capital Management', path: '/capital-management', icon: Wallet },
    { name: 'Pine Script Manager', path: '/pine-scripts', icon: Code2 },
    { name: 'Dropdown Manager', path: '/dropdown-manager', icon: SlidersHorizontal },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const visibleNavItems = navItems.filter((item) => isModuleVisible(item.path));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col h-full bg-[#0e1626] light:bg-white border-r border-[#1e293b] light:border-slate-200 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-[#1e293b] light:border-slate-200">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
          <Activity className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg text-white light:text-slate-900 tracking-tight leading-tight">
            TradeJournal
          </span>
          <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">
            Options Pro
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => onCloseMobile && onCloseMobile()}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                  isActive
                    ? `active ${
                        isKite
                          ? 'text-[#ff5722] font-semibold bg-transparent shadow-none hover:bg-transparent'
                          : 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-semibold'
                      }`
                    : `${
                        isKite
                          ? 'text-[#9b9b9b] hover:text-white hover:bg-[#202020] font-medium'
                          : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 hover:bg-[#162033] light:hover:bg-slate-100 font-medium'
                      }`
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-[#1e293b] light:border-slate-200 space-y-2">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          type="button"
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 hover:bg-[#162033] light:hover:bg-slate-200/70 transition-colors"
          title={`Current Theme: ${theme === 'kite' ? 'Zerodha Kite' : isDark ? 'Dark (Midnight)' : 'Light'}. Click to toggle.`}
        >
          <div className="flex items-center gap-2.5">
            {isKite ? (
              <div className="w-4 h-4 rounded-full bg-[#ff5722] text-white flex items-center justify-center text-[9px] font-black">
                K
              </div>
            ) : isDark ? (
              <Moon className="w-4 h-4 text-blue-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
            <span className="font-semibold text-slate-200 light:text-slate-800">
              {isKite ? 'Zerodha Kite' : isDark ? 'Dark Mode' : 'Light Mode'}
            </span>
          </div>
          <div
            className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center ${
              isKite ? 'bg-[#4987ee] justify-end' : isDark ? 'bg-blue-600 justify-end' : 'bg-slate-600 justify-start'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full transform transition-transform ${
                isKite ? 'bg-[#222222] shadow-none' : 'bg-white shadow-md'
              }`}
            />
          </div>
        </button>

        {/* User Profile Card */}
        <div className="relative">
          <div
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center justify-between p-2 rounded-xl bg-[#131c2e] light:bg-slate-100 cursor-pointer hover:bg-[#18233a] light:hover:bg-slate-200 transition-colors"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold uppercase flex-shrink-0">
                {user?.name ? user.name[0] : 'T'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white light:text-slate-900 truncate">
                  {user?.name || 'Trader'}
                </span>
                <span className="text-[11px] text-slate-400 light:text-slate-500 truncate">
                  {user?.email || 'trader@example.com'}
                </span>
              </div>
            </div>
            <MoreVertical className="w-4 h-4 text-slate-400 flex-shrink-0" />
          </div>

          {/* User Popover Menu */}
          {showUserMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 p-1 bg-[#162033] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-xl shadow-xl z-50">
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  navigate('/settings');
                  onCloseMobile && onCloseMobile();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 light:text-slate-700 hover:bg-[#1f2d47] light:hover:bg-slate-100 rounded-lg transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Account Settings</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
