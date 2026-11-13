import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import MobileNav from './MobileNav';
import ErrorBoundary from '../common/ErrorBoundary';
import { useFilter } from '../../context/FilterContext';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useToast } from '../../context/ToastContext';
import api from '../../api/client';

export default function AppLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Close mobile sidebar on Escape
  useEscapeKey(() => setMobileSidebarOpen(false), mobileSidebarOpen);
  const {
    filter,
    updateFilter,
    dateRangeDisplay,
    customFrom,
    customTo,
    updateCustomDates,
  } = useFilter();

  // Global Zerodha Kite Login Redirect Handler
  // Detects ?request_token=... on any landing route (e.g. http://localhost:5173/?request_token=...)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('request_token');
    if (token) {
      showToast('Authenticating Zerodha Kite daily session...', 'info');
      api.post('/zerodha/exchange-token', { request_token: token })
        .then((res) => {
          showToast('🎉 Zerodha Kite session authenticated! Loading your live portfolio...', 'success');
          // Clean the query parameter from URL
          window.history.replaceState({}, document.title, window.location.pathname);
          // Navigate to /zerodha so user immediately sees live portfolio
          navigate('/zerodha');
        })
        .catch((err) => {
          console.error('Kite token exchange error', err);
          showToast(err.response?.data?.message || 'Failed to exchange Zerodha request token', 'error');
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    }
  }, [navigate, showToast]);

  return (
    <div className="flex h-screen w-full bg-[#0b0f19] light:bg-[#f8fafc] overflow-hidden text-slate-100 light:text-slate-800">
      {/* Desktop Permanent Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative flex-1 max-w-xs w-full bg-[#0e1626] light:bg-white h-full shadow-2xl">
            <Sidebar onCloseMobile={() => setMobileSidebarOpen(false)} />
          </div>
          <div
            className="flex-1"
            onClick={() => setMobileSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Navbar
          filter={filter}
          onFilterChange={updateFilter}
          dateRangeDisplay={dateRangeDisplay}
          customFrom={customFrom}
          customTo={customTo}
          onCustomDateChange={updateCustomDates}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        <main className="flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-6 pb-20 lg:pb-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>

        <MobileNav />
      </div>
    </div>
  );
}
