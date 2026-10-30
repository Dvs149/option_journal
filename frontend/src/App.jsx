import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { FilterProvider } from './context/FilterContext';
import { LotSizeProvider } from './context/LotSizeContext';
import { ToastProvider } from './context/ToastContext';
import AppLayout from './components/layout/AppLayout';

import Dashboard from './pages/Dashboard';
import AddTrade from './pages/AddTrade';
import AllTrades from './pages/AllTrades';
import TradingCalendar from './pages/TradingCalendar';
import EquityCurve from './pages/EquityCurve';
import RiskManagement from './pages/RiskManagement';
import TradingJournal from './pages/TradingJournal';
import StrategyAnalysis from './pages/StrategyAnalysis';
import AnalyticsReports from './pages/AnalyticsReports';
import CapitalManagement from './pages/CapitalManagement';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b0f19] text-white">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FilterProvider>
          <LotSizeProvider>
            <ToastProvider>
              <BrowserRouter>
              <Routes>
              {/* Public Authentication */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Protected Trading Workspace */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="add-trade" element={<AddTrade />} />
                <Route path="trades" element={<AllTrades />} />
                <Route path="calendar" element={<TradingCalendar />} />
                <Route path="equity-curve" element={<EquityCurve />} />
                <Route path="risk-management" element={<RiskManagement />} />
                <Route path="journal" element={<TradingJournal />} />
                <Route path="strategy-analysis" element={<StrategyAnalysis />} />
                <Route path="analytics" element={<AnalyticsReports />} />
                <Route path="capital-management" element={<CapitalManagement />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
        </LotSizeProvider>
      </FilterProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
