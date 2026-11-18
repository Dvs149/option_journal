import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ChevronDown,
  Layers,
  FolderKanban,
  RotateCcw,
  Plus,
  Play,
  Save,
  Flame,
  BarChart3,
  Table as TableIcon,
  PieChart,
  HelpCircle,
  Share2,
} from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { DEFAULT_INDEX_CONFIG, normalizeIndexSymbol } from '../utils/marketData';
import { generatePayoffCurve } from '../utils/blackScholes';
import StrategyMetricsHeader from '../components/strategy-builder/StrategyMetricsHeader';
import StrategyPayoffChart from '../components/strategy-builder/StrategyPayoffChart';
import StrategyLegsTable from '../components/strategy-builder/StrategyLegsTable';
import ReadyMadeStrategiesModal from '../components/strategy-builder/ReadyMadeStrategiesModal';
import DraftPortfoliosModal from '../components/strategy-builder/DraftPortfoliosModal';
import PnLTable from '../components/strategy-builder/PnLTable';
import GreeksTable from '../components/strategy-builder/GreeksTable';
import UnderlyingSelectorModal from '../components/strategy-builder/UnderlyingSelectorModal';
import OptionChainModal from '../components/trades/OptionChainModal';

export default function StrategyBuilder() {
  const toast = useToast();
  const notify = useCallback(
    (msg, type = 'success') => {
      if (type === 'error' && typeof toast?.error === 'function') {
        toast.error(msg);
      } else if (type === 'info' && typeof toast?.info === 'function') {
        toast.info(msg);
      } else if (typeof toast?.success === 'function' && type === 'success') {
        toast.success(msg);
      } else if (typeof toast?.showToast === 'function') {
        toast.showToast(msg, type);
      } else if (typeof toast?.show === 'function') {
        toast.show(msg, type);
      } else {
        console.log(`[${type}] ${msg}`);
      }
    },
    [toast]
  );

  const location = useLocation();

  // Helper to read initial payload from router state or sessionStorage synchronously
  const initialPayload = useMemo(() => {
    let imported = location.state;
    if (!imported || !imported.legs || imported.legs.length === 0) {
      try {
        const stored = sessionStorage.getItem('strategy_builder_import');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.legs && (!parsed.timestamp || Date.now() - parsed.timestamp < 600000)) {
            imported = parsed;
          }
        }
      } catch (e) {}
    }
    return imported;
  }, [location.state]);

  const initialSymbol = (initialPayload?.symbol || 'NIFTY').toUpperCase();
  const initialSpot = useMemo(() => {
    if (initialPayload?.legs?.length) {
      const valid = initialPayload.legs.map((l) => Number(l.strike)).filter((s) => s > 0);
      if (valid.length) {
        return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
      }
    }
    return DEFAULT_INDEX_CONFIG[initialSymbol]?.atm_strike || 25000;
  }, [initialPayload, initialSymbol]);

  // Underlying selection
  const [symbol, setSymbol] = useState(initialSymbol);
  const activeSymbolRef = useRef(initialSymbol);

  const [spotPrice, setSpotPrice] = useState(initialSpot);
  const [spotChange, setSpotChange] = useState(0);
  const [spotChangePct, setSpotChangePct] = useState(0);
  const [strikeStep, setStrikeStep] = useState(DEFAULT_INDEX_CONFIG[initialSymbol]?.strike_step || 50);
  const [lotSize, setLotSize] = useState(DEFAULT_INDEX_CONFIG[initialSymbol]?.lot_size || 25);
  const [expiryDates, setExpiryDates] = useState([]);
  const [selectedExpiry, setSelectedExpiry] = useState(initialPayload?.legs?.find((l) => l.expiry)?.expiry || '');

  const [daysToExpiry, setDaysToExpiry] = useState(() => {
    const exp = initialPayload?.legs?.find((l) => l.expiry)?.expiry;
    if (!exp) return 2;
    try {
      const expDate = new Date(exp);
      const today = new Date();
      const d1 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const d2 = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
      const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 2;
    } catch {
      return 2;
    }
  });

  const [optionChain, setOptionChain] = useState([]);

  // Strategy Legs
  const [strategyName, setStrategyName] = useState(
    initialPayload?.strategyName || 'Bull Call Spread'
  );
  const [legs, setLegs] = useState(() => {
    if (initialPayload?.legs?.length) {
      return initialPayload.legs;
    }
    return [
      {
        id: 'leg_1',
        isActive: true,
        side: 'BUY',
        type: 'CE',
        strike: 25200,
        expiry: '',
        lots: 1,
        lotSize: 25,
        entryPrice: 140.0,
        ltp: 140.0,
        iv: 14.2,
        bookedPnL: 0,
      },
      {
        id: 'leg_2',
        isActive: true,
        side: 'SELL',
        type: 'CE',
        strike: 25300,
        expiry: '',
        lots: 1,
        lotSize: 25,
        entryPrice: 85.0,
        ltp: 85.0,
        iv: 13.8,
        bookedPnL: 0,
      },
    ];
  });

  // Target Evaluation Sliders
  const [targetPrice, setTargetPrice] = useState(initialSpot);
  const [targetDaysOffset, setTargetDaysOffset] = useState(0);
  const [ivAdjustment, setIvAdjustment] = useState(0);
  const [isBookedPnlVisible, setIsBookedPnlVisible] = useState(false);

  // Active View Tab: 'chart', 'matrix', 'greeks'
  const [activeTab, setActiveTab] = useState('chart');

  // Modals
  const [isReadyMadeOpen, setIsReadyMadeOpen] = useState(false);
  const [isDraftsOpen, setIsDraftsOpen] = useState(false);
  const [isUnderlyingOpen, setIsUnderlyingOpen] = useState(false);
  const [isOptionChainOpen, setIsOptionChainOpen] = useState(false);

  // Zerodha Integration Data
  const [zerodhaConnected, setZerodhaConnected] = useState(false);
  const [availableMargin, setAvailableMargin] = useState(366737);
  const [importingZerodha, setImportingZerodha] = useState(false);

  // Synchronize state when imported payload arrives or changes
  useEffect(() => {
    if (initialPayload && initialPayload.legs && initialPayload.legs.length > 0) {
      const targetSym = (initialPayload.symbol || 'NIFTY').toUpperCase();
      setSymbol(targetSym);
      activeSymbolRef.current = targetSym;
      setLegs(initialPayload.legs);
      if (initialPayload.strategyName) {
        setStrategyName(initialPayload.strategyName);
      }

      // Compute spot price from strikes or index default
      const valid = initialPayload.legs.map((l) => Number(l.strike)).filter((s) => s > 0);
      const computedSpot = valid.length
        ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
        : DEFAULT_INDEX_CONFIG[targetSym]?.atm_strike || 25000;

      setSpotPrice(computedSpot);
      setTargetPrice(computedSpot);
      setLotSize(DEFAULT_INDEX_CONFIG[targetSym]?.lot_size || 25);
      setStrikeStep(DEFAULT_INDEX_CONFIG[targetSym]?.strike_step || 50);

      const exp = initialPayload.legs.find((l) => l.expiry)?.expiry;
      if (exp) {
        setSelectedExpiry(exp);
        try {
          const expDate = new Date(exp);
          const today = new Date();
          const d1 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const d2 = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
          const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
          setDaysToExpiry(diff > 0 ? diff : 2);
        } catch {
          setDaysToExpiry(2);
        }
      }

      notify(
        `Imported ${initialPayload.legs.length} position${initialPayload.legs.length > 1 ? 's' : ''} for ${targetSym} into Strategy Builder`,
        'success'
      );
    }
  }, [initialPayload, notify]);

  // Keep active symbol ref in sync
  useEffect(() => {
    activeSymbolRef.current = symbol;
  }, [symbol]);

  // Fetch Option Chain & Market Data for Symbol
  const fetchMarketData = useCallback(async (sym) => {
    try {
      const res = await api.get(`/option-chain?symbol=${sym}`);
      if (activeSymbolRef.current !== sym) return;

      if (res.data?.success || res.data?.chain) {
        let spot = Number(res.data.spot_price);
        if (!spot || spot <= 0) {
          spot = DEFAULT_INDEX_CONFIG[sym]?.atm_strike || 25000;
        }

        // Sanity check to avoid cross-symbol contamination
        if (sym === 'SENSEX' && spot < 50000) {
          spot = DEFAULT_INDEX_CONFIG.SENSEX?.atm_strike || 82600;
        } else if (sym === 'NIFTY' && spot > 40000) {
          spot = DEFAULT_INDEX_CONFIG.NIFTY?.atm_strike || 24500;
        } else if (sym === 'BANKNIFTY' && (spot < 30000 || spot > 75000)) {
          spot = DEFAULT_INDEX_CONFIG.BANKNIFTY?.atm_strike || 57000;
        }

        setSpotPrice(spot);
        setTargetPrice((prev) => {
          if (!prev || Math.abs(prev - spot) / spot > 0.15) {
            return spot;
          }
          return prev;
        });

        setSpotChange(Number(res.data.spot_change) || 0);
        setSpotChangePct(Number(res.data.spot_change_pct) || 0);
        setOptionChain(res.data.chain || []);

        const expiries = res.data.expiries || [];
        setExpiryDates(expiries);
        if (expiries.length > 0) {
          const nearest = expiries[0].date;
          setSelectedExpiry((prev) => prev || nearest);
          setDaysToExpiry((prev) => (prev > 0 ? prev : Math.max(2, expiries[0].days_left || 2)));
        }

        const step = Number(res.data.strike_step) || DEFAULT_INDEX_CONFIG[sym]?.strike_step || 50;
        setStrikeStep(step);
        const lot = Number(res.data.default_lot) || DEFAULT_INDEX_CONFIG[sym]?.lot_size || 25;
        setLotSize(lot);
      }
    } catch (err) {
      console.warn('Fallback to local market defaults for', sym);
      const conf = DEFAULT_INDEX_CONFIG[sym] || DEFAULT_INDEX_CONFIG.NIFTY;
      setSpotPrice(conf.atm_strike);
      setTargetPrice(conf.atm_strike);
      setStrikeStep(conf.strike_step);
      setLotSize(conf.lot_size);
    }
  }, []);

  // Check Zerodha Connection
  const checkZerodhaStatus = useCallback(async () => {
    try {
      const res = await api.get('/zerodha/details');
      if (res.data?.connected) {
        setZerodhaConnected(true);
        if (res.data.margins?.available_cash) {
          setAvailableMargin(res.data.margins.available_cash);
        }
      }
    } catch {
      // not connected or offline
    }
  }, []);

  useEffect(() => {
    fetchMarketData(symbol);
    checkZerodhaStatus();
  }, [symbol, fetchMarketData, checkZerodhaStatus]);

  // Update target price when spot price is first loaded
  useEffect(() => {
    setTargetPrice(spotPrice);
  }, [spotPrice]);

  // Generate Payoff Points and Strategy Metrics
  const payoffData = useMemo(() => {
    return generatePayoffCurve({
      legs,
      spotPrice,
      daysToExpiry: Math.max(1, daysToExpiry),
      targetDaysFromNow: targetDaysOffset,
      ivAdjustment,
      rangePercent: 0.035,
      steps: 120,
    });
  }, [legs, spotPrice, daysToExpiry, targetDaysOffset, ivAdjustment]);

  // Leg table handlers
  const handleUpdateLeg = (index, updates) => {
    setLegs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...updates };
      return updated;
    });
  };

  const handleToggleLeg = (index) => {
    setLegs((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isActive: updated[index].isActive === false };
      return updated;
    });
  };

  const handleDeleteLeg = (index) => {
    setLegs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDuplicateLeg = (index) => {
    setLegs((prev) => {
      const legToDup = { ...prev[index], id: `leg_${Date.now()}` };
      return [...prev, legToDup];
    });
  };

  const handleAddLeg = () => {
    setIsOptionChainOpen(true);
  };

  const handleAddLegFromChain = (legData) => {
    setLegs((prev) => [
      ...prev,
      {
        id: `leg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        isActive: true,
        ...legData,
      },
    ]);
    notify(`Added ${legData.side} ${legData.strike} ${legData.type} to Builder`, 'success');
  };

  const handleRemoveLegById = (legId) => {
    setLegs((prev) => prev.filter((l) => l.id !== legId));
  };

  const handleSelectExpiryFromChain = async (expDate) => {
    setSelectedExpiry(expDate);
    try {
      const res = await api.get(`/option-chain?symbol=${symbol}&expiry=${expDate}`);
      if (res.data?.chain) {
        setOptionChain(res.data.chain);
      }
    } catch (err) {
      console.warn('Failed to fetch chain for expiry:', expDate);
    }
  };

  const handleClearAll = () => {
    setLegs([]);
    notify('All legs cleared from builder', 'info');
  };

  // Ready-Made Strategy Selection
  const handleSelectReadyMade = ({ name, legs: newLegs }) => {
    setStrategyName(name);
    setLegs(newLegs);
    notify(`Applied strategy: ${name}`, 'success');
  };

  // Import Live Positions from Zerodha
  const handleImportZerodhaPositions = async () => {
    try {
      setImportingZerodha(true);
      const res = await api.get('/zerodha/details');
      const positions = res.data?.positions || [];
      const openPositions = positions.filter((p) => Number(p.quantity) !== 0);

      if (openPositions.length === 0) {
        notify('No open positions found in your Zerodha Kite account.', 'info');
        return;
      }

      const importedLegs = openPositions.map((pos, idx) => {
        const isBuy = Number(pos.quantity) > 0;
        const absQty = Math.abs(Number(pos.quantity));
        const inst = String(pos.tradingsymbol || '');
        const isCall = inst.endsWith('CE');
        const isPut = inst.endsWith('PE');
        const type = isCall ? 'CE' : isPut ? 'PE' : 'FUT';

        // Extract strike
        const matchStrike = inst.match(/\d{4,6}/);
        const strike = matchStrike ? Number(matchStrike[0]) : spotPrice;

        return {
          id: `zerodha_${idx}_${Date.now()}`,
          isActive: true,
          side: isBuy ? 'BUY' : 'SELL',
          type,
          strike,
          expiry: selectedExpiry,
          lots: Math.max(1, Math.round(absQty / lotSize)),
          lotSize,
          entryPrice: Number(pos.average_price || pos.last_price || 0),
          ltp: Number(pos.last_price || 0),
          iv: 15.0,
          bookedPnL: Number(pos.pnl || 0),
        };
      });

      setLegs(importedLegs);
      setStrategyName(`${symbol} Live Positions`);
      notify(`Imported ${importedLegs.length} live positions from Zerodha Kite!`, 'success');
    } catch (err) {
      console.error('Zerodha import failed:', err);
      notify('Failed to import positions from Zerodha Kite', 'error');
    } finally {
      setImportingZerodha(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white p-4 lg:p-6 select-none">
      {/* Top Navigation & Underlying Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 bg-[#121b2d] border border-[#1e293b] rounded-2xl p-4 shadow-xl">
        {/* Left: Underlying Instrument Selector */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUnderlyingOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#0e1626] hover:bg-[#162033] border border-slate-700/80 rounded-xl transition-all font-bold text-sm text-white group"
          >
            <span>{symbol}</span>
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform" />
          </button>

          {/* Spot Price Display */}
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black font-mono tracking-tight text-white">
              {spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
            </span>
            <span
              className={`text-xs font-mono font-semibold ${
                spotChange >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {spotChange >= 0 ? '+' : ''}
              {spotChange.toFixed(1)} ({spotChangePct >= 0 ? '+' : ''}
              {spotChangePct.toFixed(2)}%)
            </span>
          </div>

          <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 pl-3 border-l border-slate-800">
            <span>Lot: <strong className="text-slate-200 font-mono">{lotSize}</strong></span>
            <span>Step: <strong className="text-slate-200 font-mono">{strikeStep}</strong></span>
          </div>
        </div>

        {/* Right: Quick Action Buttons (Ready-made, Drafts, Import Zerodha) */}
        <div className="flex items-center gap-2">
          {/* Zerodha Quick Import */}
          {zerodhaConnected && (
            <button
              onClick={handleImportZerodhaPositions}
              disabled={importingZerodha}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-500/30 text-xs font-bold transition-all disabled:opacity-50"
              title="Import live open positions from Zerodha Kite into Strategy Builder"
            >
              <Flame className="w-4 h-4 text-orange-500" />
              <span>{importingZerodha ? 'Importing...' : 'Import Live Positions'}</span>
            </button>
          )}

          {/* Ready-made strategies button */}
          <button
            onClick={() => setIsReadyMadeOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0e1626] hover:bg-[#162033] border border-slate-700 text-xs font-bold text-white transition-all"
          >
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Ready-made</span>
          </button>

          {/* Draft Portfolios button */}
          <button
            onClick={() => setIsDraftsOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 text-xs font-bold transition-all"
          >
            <FolderKanban className="w-4 h-4" />
            <span>Draft Portfolios</span>
          </button>
        </div>
      </div>

      {/* Sensibull Header Summary Cards */}
      <StrategyMetricsHeader
        metrics={payoffData}
        spotPrice={spotPrice}
        targetPrice={targetPrice}
        availableMargin={availableMargin}
      />

      {/* Main Workspace Layout (2 Columns: Left = Legs & Portfolios, Right = Chart & Analytics) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (5 Cols): Strategy Legs Table & Controls */}
        <div className="lg:col-span-5 space-y-4">
          <StrategyLegsTable
            legs={legs}
            onUpdateLeg={handleUpdateLeg}
            onToggleLeg={handleToggleLeg}
            onDeleteLeg={handleDeleteLeg}
            onDuplicateLeg={handleDuplicateLeg}
            onAddLeg={handleAddLeg}
            onClearAll={handleClearAll}
            strikeStep={strikeStep}
            spotPrice={spotPrice}
            expiryDates={expiryDates}
            isBookedPnlVisible={isBookedPnlVisible}
            onToggleBookedPnl={() => setIsBookedPnlVisible(!isBookedPnlVisible)}
          />

          {/* Quick Draft Actions Card */}
          <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-white">Save Strategy</h4>
              <p className="text-[11px] text-slate-400">Save current legs to Drafts or TradeJournal</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDraftsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                Save Draft
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (7 Cols): Payoff Chart, P&L Matrix, Greeks */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* View Mode Switching Tabs (Payoff Graph, P&L Table, Greeks) */}
          <div className="flex items-center justify-between bg-[#121b2d] border border-[#1e293b] rounded-2xl p-1.5">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('chart')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'chart'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Payoff Graph
              </button>

              <button
                onClick={() => setActiveTab('matrix')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'matrix'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                P&L Table
              </button>

              <button
                onClick={() => setActiveTab('greeks')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'greeks'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <PieChart className="w-3.5 h-3.5" />
                Greeks
              </button>
            </div>

            <span className="text-[11px] font-mono text-slate-400 px-3 hidden sm:inline">
              Target: <strong className="text-cyan-400">{targetPrice}</strong> ({(((targetPrice - spotPrice) / spotPrice) * 100).toFixed(1)}%)
            </span>
          </div>

          {/* Active Tab View */}
          <div className="flex-1">
            {activeTab === 'chart' && (
              <StrategyPayoffChart
                payoffData={payoffData}
                spotPrice={spotPrice}
                targetPrice={targetPrice}
                onTargetPriceChange={setTargetPrice}
                targetDaysOffset={targetDaysOffset}
                onTargetDaysChange={setTargetDaysOffset}
                daysToExpiry={daysToExpiry}
                optionChain={optionChain}
                underlyingSymbol={symbol}
              />
            )}

            {activeTab === 'matrix' && (
              <PnLTable
                points={payoffData.points}
                spotPrice={spotPrice}
                targetPrice={targetPrice}
              />
            )}

            {activeTab === 'greeks' && (
              <GreeksTable
                legs={legs.filter((l) => l.isActive !== false)}
                spotPrice={spotPrice}
                daysToExpiry={daysToExpiry}
              />
            )}
          </div>
        </div>
      </div>

      {/* Ready-Made Strategies Modal */}
      <ReadyMadeStrategiesModal
        isOpen={isReadyMadeOpen}
        onClose={() => setIsReadyMadeOpen(false)}
        onSelectStrategy={handleSelectReadyMade}
        spotPrice={spotPrice}
        strikeStep={strikeStep}
        nearestExpiry={selectedExpiry}
        nextExpiry={expiryDates[1]?.date || selectedExpiry}
        lotSize={lotSize}
      />

      {/* Draft Portfolios Modal */}
      <DraftPortfoliosModal
        isOpen={isDraftsOpen}
        onClose={() => setIsDraftsOpen(false)}
        onLoadStrategy={({ name, legs: loadedLegs }) => {
          setStrategyName(name);
          setLegs(loadedLegs);
          notify(`Loaded strategy: ${name}`, 'success');
        }}
        currentBuilderLegs={legs}
        currentUnderlying={symbol}
      />

      {/* Underlying Instrument Selector Modal */}
      <UnderlyingSelectorModal
        isOpen={isUnderlyingOpen}
        onClose={() => setIsUnderlyingOpen(false)}
        selectedSymbol={symbol}
        onSelectSymbol={(sym) => {
          setSymbol(sym);
          fetchMarketData(sym);
        }}
      />

      {/* Option Chain Modal for Adding Legs */}
      <OptionChainModal
        isOpen={isOptionChainOpen}
        onClose={() => setIsOptionChainOpen(false)}
        initialSymbol={symbol}
        initialExpiry={selectedExpiry}
        mode="builder"
        activeLegs={legs}
        onAddLegFromChain={handleAddLegFromChain}
        onRemoveLeg={handleRemoveLegById}
        onSymbolChange={(newSym) => {
          setSymbol(newSym);
          fetchMarketData(newSym);
        }}
        onExpiryChange={(newExp) => {
          setSelectedExpiry(newExp);
        }}
      />
    </div>
  );
}
