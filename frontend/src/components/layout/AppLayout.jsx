import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import MobileNav from './MobileNav';
import { useFilter } from '../../context/FilterContext';

export default function AppLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const {
    filter,
    updateFilter,
    dateRangeDisplay,
    customFrom,
    customTo,
    updateCustomDates,
  } = useFilter();

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
          <Outlet />
        </main>

        <MobileNav />
      </div>
    </div>
  );
}
