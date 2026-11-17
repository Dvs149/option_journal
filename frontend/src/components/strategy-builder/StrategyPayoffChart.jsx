import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
  CartesianGrid,
  Area,
} from 'recharts';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  Minus,
  Plus,
  Calendar,
  Clock,
  HelpCircle,
} from 'lucide-react';

export default function StrategyPayoffChart({
  payoffData,
  spotPrice = 25000,
  targetPrice = 25000,
  onTargetPriceChange,
  targetDaysOffset = 0,
  onTargetDaysChange,
  daysToExpiry = 4,
  optionChain = [],
  underlyingSymbol = 'NIFTY',
}) {
  const [showOI, setShowOI] = useState(true);
  const [sdPreset, setSdPreset] = useState('full'); // '1sd', '2sd', 'full'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Zoom State
  const [xDomain, setXDomain] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [refAreaLeft, setRefAreaLeft] = useState(null);
  const [refAreaRight, setRefAreaRight] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const chartContainerRef = useRef(null);

  const {
    points = [],
    breakevensExpiry = [],
    breakevensTarget = [],
    sd1 = 300,
    sd2 = 600,
    minPrice = 24000,
    maxPrice = 26000,
  } = payoffData || {};

  // Build OI lookup map from Option Chain
  const oiMap = useMemo(() => {
    const map = {};
    if (Array.isArray(optionChain)) {
      optionChain.forEach((row) => {
        const strike = Number(row.strike_price);
        if (strike) {
          map[strike] = {
            callOi: Number(row.call?.oi || 0),
            putOi: Number(row.put?.oi || 0),
          };
        }
      });
    }
    return map;
  }, [optionChain]);

  // Combine payoff points with separate profit and loss regions
  const chartData = useMemo(() => {
    return points.map((p) => {
      const oiData = oiMap[p.spot] || {};
      const callOiCr = oiData.callOi ? Number((oiData.callOi / 10000000).toFixed(2)) : 0;
      const putOiCr = oiData.putOi ? Number((oiData.putOi / 10000000).toFixed(2)) : 0;

      // Profit area (strictly >= 0, clamped at 0 for negative values)
      const profitArea = p.expiryPnL >= 0 ? p.expiryPnL : 0;
      // Loss area (strictly <= 0, clamped at 0 for positive values)
      const lossArea = p.expiryPnL <= 0 ? p.expiryPnL : 0;

      return {
        ...p,
        callOiCr,
        putOiCr,
        profitArea,
        lossArea,
      };
    });
  }, [points, oiMap]);

  // Calculate visible points when zoomed in to auto-scale Y Axis
  const visiblePoints = useMemo(() => {
    if (!isZoomed || !xDomain) return points;
    const [left, right] = [Math.min(xDomain[0], xDomain[1]), Math.max(xDomain[0], xDomain[1])];
    const filtered = points.filter((p) => p.spot >= left && p.spot <= right);
    return filtered.length > 0 ? filtered : points;
  }, [isZoomed, xDomain, points]);

  // Dynamic Y Domain calculation
  const yDomain = useMemo(() => {
    let min = 0;
    let max = 0;
    const dataSubset = isZoomed && visiblePoints.length > 0 ? visiblePoints : points;
    dataSubset.forEach((p) => {
      if (p.expiryPnL < min) min = p.expiryPnL;
      if (p.expiryPnL > max) max = p.expiryPnL;
      if (p.targetPnL < min) min = p.targetPnL;
      if (p.targetPnL > max) max = p.targetPnL;
    });

    if (min === 0 && max === 0) {
      min = -1000;
      max = 1000;
    }

    const span = Math.max(200, max - min);
    const paddedMin = Math.floor((min - span * 0.15) / 100) * 100;
    const paddedMax = Math.ceil((max + span * 0.15) / 100) * 100;

    return [paddedMin, paddedMax];
  }, [isZoomed, visiblePoints, points]);

  // Calculate the gradient split offset for the zero line (Green above, Red below)
  const zeroOffset = useMemo(() => {
    const [minY, maxY] = yDomain;
    if (typeof minY !== 'number' || typeof maxY !== 'number') return 0.5;
    if (maxY <= 0) return 0; // entire chart is in loss
    if (minY >= 0) return 1; // entire chart is in profit
    return Math.max(0, Math.min(1, maxY / (maxY - minY)));
  }, [yDomain]);

  // Target spot price offset percentage
  const targetPctChange = spotPrice > 0 ? (((targetPrice - spotPrice) / spotPrice) * 100).toFixed(1) : '0.0';

  // Find projected P&L at target price
  const projectedPoint = useMemo(() => {
    if (!points.length) return null;
    let closest = points[0];
    let minDiff = Math.abs(points[0].spot - targetPrice);
    for (let i = 1; i < points.length; i++) {
      const diff = Math.abs(points[i].spot - targetPrice);
      if (diff < minDiff) {
        minDiff = diff;
        closest = points[i];
      }
    }
    return closest;
  }, [points, targetPrice]);

  const projectedPnL = projectedPoint ? projectedPoint.targetPnL : 0;
  const totalInvestment = useMemo(() => {
    let inv = 0;
    (payoffData?.legs || []).forEach((l) => {
      const qty = (Number(l.lots) || 1) * (Number(l.lotSize) || 25);
      const pr = Number(l.entryPrice || l.ltp || 0);
      inv += pr * qty;
    });
    if (inv <= 0) {
      inv = spotPrice * (underlyingSymbol === 'SENSEX' ? 20 : 25);
    }
    return inv;
  }, [payoffData, spotPrice, underlyingSymbol]);

  const projectedPct = totalInvestment > 0 ? (((projectedPnL) / totalInvestment) * 100).toFixed(1) : '0';

  // Format currency helpers
  const formatYAxis = (val) => {
    if (Math.abs(val) >= 100000) {
      return `${(val / 100000).toFixed(1)}L`;
    }
    if (Math.abs(val) >= 1000) {
      return `${(val / 1000).toFixed(0)}k`;
    }
    return val;
  };

  const formatTooltipCurrency = (val) => {
    if (typeof val !== 'number' || isNaN(val)) return '₹0';
    const sign = val >= 0 ? '+' : '-';
    const abs = Math.abs(val);
    if (abs >= 100000) {
      return `${sign}₹${(abs / 100000).toFixed(2)}L`;
    }
    return `${sign}₹${abs.toLocaleString('en-IN')}`;
  };

  const handleStepPrice = (delta) => {
    const step =
      underlyingSymbol === 'SENSEX' || underlyingSymbol === 'BANKNIFTY'
        ? 100
        : underlyingSymbol === 'MIDCPNIFTY'
        ? 25
        : 50;
    const newPrice = Math.round((targetPrice + delta * step) / step) * step;
    onTargetPriceChange?.(newPrice);
  };

  // =================== ZOOM ACTIONS ===================

  const handleResetZoom = useCallback(() => {
    setXDomain(null);
    setIsZoomed(false);
    setSdPreset('full');
    setRefAreaLeft(null);
    setRefAreaRight(null);
  }, []);

  const handleZoomIn = () => {
    const currentMin = isZoomed && xDomain ? xDomain[0] : minPrice;
    const currentMax = isZoomed && xDomain ? xDomain[1] : maxPrice;
    const center = Math.round((currentMin + currentMax) / 2);
    const currentSpan = currentMax - currentMin;
    const newSpan = Math.max(100, Math.round(currentSpan * 0.7));

    const newMin = Math.round(center - newSpan / 2);
    const newMax = Math.round(center + newSpan / 2);

    setXDomain([newMin, newMax]);
    setIsZoomed(true);
  };

  const handleZoomOut = () => {
    if (!isZoomed || !xDomain) return;
    const currentMin = xDomain[0];
    const currentMax = xDomain[1];
    const center = Math.round((currentMin + currentMax) / 2);
    const currentSpan = currentMax - currentMin;
    const newSpan = Math.round(currentSpan * 1.35);

    let newMin = Math.round(center - newSpan / 2);
    let newMax = Math.round(center + newSpan / 2);

    if (newMin <= minPrice && newMax >= maxPrice) {
      handleResetZoom();
    } else {
      setXDomain([newMin, newMax]);
    }
  };

  const handleApplySdPreset = (preset) => {
    setSdPreset(preset);
    if (preset === '1sd') {
      const margin = Math.max(100, sd1 * 1.15);
      setXDomain([Math.round(spotPrice - margin), Math.round(spotPrice + margin)]);
      setIsZoomed(true);
    } else if (preset === '2sd') {
      const margin = Math.max(200, sd2 * 1.15);
      setXDomain([Math.round(spotPrice - margin), Math.round(spotPrice + margin)]);
      setIsZoomed(true);
    } else {
      handleResetZoom();
    }
  };

  const handleChartMouseDown = (e) => {
    if (e && e.activeLabel) {
      setRefAreaLeft(Number(e.activeLabel));
      setIsDragging(true);
    }
  };

  const handleChartMouseMove = (e) => {
    if (isDragging && e && e.activeLabel) {
      setRefAreaRight(Number(e.activeLabel));
    }
    if (e && e.activePayload && e.activePayload[0]) {
      setHoveredPoint(e.activePayload[0].payload);
    }
  };

  const handleChartMouseUp = () => {
    if (refAreaLeft && refAreaRight && refAreaLeft !== refAreaRight) {
      const left = Math.min(refAreaLeft, refAreaRight);
      const right = Math.max(refAreaLeft, refAreaRight);

      if (right - left >= 50) {
        setXDomain([left, right]);
        setIsZoomed(true);
      }
    }
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setIsDragging(false);
  };

  // Wheel Zoom support
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (Math.abs(e.deltaY) > 5) {
        e.preventDefault();
        if (e.deltaY < 0) {
          handleZoomIn();
        } else {
          handleZoomOut();
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [isZoomed, xDomain, minPrice, maxPrice]);

  // Sensibull-identical Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const diffPoints = Math.round(data.spot - spotPrice);
      const pctFromSpot = (((data.spot - spotPrice) / spotPrice) * 100).toFixed(1);
      const signPts = diffPoints >= 0 ? '+' : '';
      const signPct = pctFromSpot >= 0 ? '+' : '';

      const targetPnLPct = (((data.targetPnL) / (spotPrice * 25)) * 100).toFixed(0);
      const expiryPnLPct = (((data.expiryPnL) / (spotPrice * 25)) * 100).toFixed(0);

      return (
        <div className="bg-[#0b101b]/95 border border-[#1e293b] p-3.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs min-w-[220px] z-50 pointer-events-none select-none">
          {/* Header: When price is at */}
          <div className="text-[11px] text-slate-400 font-sans">When price is at</div>
          <div className="flex items-baseline gap-2 font-mono mt-0.5 mb-2">
            <span className="font-bold text-white text-base">{data.spot.toLocaleString('en-IN')}</span>
            <span className={`text-xs font-semibold ${diffPoints >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {signPct}{pctFromSpot}% ({signPts}{diffPoints.toLocaleString('en-IN')})
            </span>
          </div>

          <div className="border-b border-slate-700/80 mb-2.5" />

          {/* Body: Expected P&L on */}
          <div className="text-[11px] text-slate-400 font-sans mb-1.5">Expected P&amp;L on</div>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center font-mono">
              <span className="text-slate-300 font-medium">
                {targetDaysOffset === 0 ? 'Target (T+0)' : `T+${targetDaysOffset} date`}
              </span>
              <span className={`font-bold ${data.targetPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatTooltipCurrency(data.targetPnL)} ({data.targetPnL >= 0 ? '+' : ''}{targetPnLPct}%)
              </span>
            </div>

            <div className="flex justify-between items-center font-mono">
              <span className="text-slate-300 font-medium">Expiry date</span>
              <span className={`font-bold ${data.expiryPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatTooltipCurrency(data.expiryPnL)} ({data.expiryPnL >= 0 ? '+' : ''}{expiryPnLPct}%)
              </span>
            </div>

            {showOI && (data.callOiCr > 0 || data.putOiCr > 0) && (
              <div className="border-t border-slate-800 pt-2 mt-2 flex justify-between text-[11px]">
                <span className="text-rose-400">Call OI: {data.callOiCr} Cr</span>
                <span className="text-emerald-400">Put OI: {data.putOiCr} Cr</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      ref={chartContainerRef}
      className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-4 flex flex-col h-full select-none"
    >
      {/* Sub-Header & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-[#1e293b]/70 pb-3">
        {/* Left Side: Legend & Indicators */}
        <div className="flex items-center gap-4 text-xs">
          {/* On Expiry Legend */}
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-[#10b981] rounded inline-block" />
            <span className="text-slate-300 font-medium">On Expiry</span>
          </div>
          {/* On Target Date Legend */}
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-[#38bdf8] rounded inline-block" />
            <span className="text-slate-300 font-medium">On Target Date</span>
          </div>

          {/* OI Toggle */}
          <button
            onClick={() => setShowOI(!showOI)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all text-xs ${
              showOI
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                : 'bg-[#0e1626] border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {showOI ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Open Interest
          </button>

          {/* SD Quick Zoom Presets */}
          <div className="flex items-center bg-[#0e1626] border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => handleApplySdPreset('1sd')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                sdPreset === '1sd' && isZoomed
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ±1 SD
            </button>
            <button
              onClick={() => handleApplySdPreset('2sd')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                sdPreset === '2sd' && isZoomed
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ±2 SD
            </button>
            <button
              onClick={() => handleApplySdPreset('full')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                !isZoomed ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Full Range
            </button>
          </div>
        </div>

        {/* Right Side: Zoom In / Zoom Out Toolbar */}
        <div className="flex items-center gap-2">
          {/* Zoom In (+) Button */}
          <button
            onClick={handleZoomIn}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0e1626] hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
            title="Zoom in on price axis (+)"
          >
            <ZoomIn className="w-3.5 h-3.5 text-blue-400" />
            Zoom In
          </button>

          {/* Zoom Out (-) Button */}
          <button
            onClick={handleZoomOut}
            disabled={!isZoomed}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all shadow-sm ${
              isZoomed
                ? 'bg-[#0e1626] hover:bg-slate-800 border-slate-700/80 text-slate-200 hover:text-white active:scale-95'
                : 'bg-[#0e1626]/40 border-slate-800/40 text-slate-600 cursor-not-allowed'
            }`}
            title="Zoom out on price axis (-)"
          >
            <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
            Zoom Out
          </button>

          {/* Primary "Zoom Out" / Reset Button */}
          {isZoomed && (
            <button
              onClick={handleResetZoom}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 animate-in fade-in active:scale-95"
              title="Reset zoom to default view"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Zoom
            </button>
          )}
        </div>
      </div>

      {/* Main Payoff Chart Area */}
      <div className="flex-1 w-full min-h-[390px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
            onMouseDown={handleChartMouseDown}
            onMouseMove={handleChartMouseMove}
            onMouseUp={handleChartMouseUp}
          >
            <defs>
              {/* Sensibull-identical split stroke for On Expiry Line: Green above zero, Red below zero */}
              <linearGradient id="splitStroke" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset={`${zeroOffset * 100}%`} stopColor="#10b981" />
                <stop offset={`${zeroOffset * 100}%`} stopColor="#ef4444" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>

              {/* Profit Area Fill (Green tint above zero) */}
              <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.04} />
              </linearGradient>

              {/* Loss Area Fill (Red tint below zero) */}
              <linearGradient id="lossFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.04} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.32} />
              </linearGradient>

              {/* Sensibull Diagonal Hatching pattern for SD zone */}
              <pattern
                id="sensibullHatch"
                width="10"
                height="10"
                patternTransform="rotate(45 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <line x1="0" y1="0" x2="0" y2="10" stroke="#334155" strokeWidth="1" strokeOpacity="0.35" />
              </pattern>
            </defs>

            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.6} />

            {/* Sensibull Hatch Pattern overlay across SD bands */}
            <ReferenceArea
              yAxisId="left"
              x1={spotPrice - sd2}
              x2={spotPrice + sd2}
              y1={0}
              y2={yDomain[1]}
              fill="url(#sensibullHatch)"
              stroke="none"
              fillOpacity={0.4}
            />

            <XAxis
              dataKey="spot"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              domain={isZoomed && xDomain ? xDomain : ['dataMin', 'dataMax']}
              type="number"
              allowDataOverflow={true}
              tickFormatter={(v) => Math.round(v).toLocaleString('en-IN')}
            />

            {/* Left Y-Axis: Profit/Loss */}
            <YAxis
              yAxisId="left"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickFormatter={formatYAxis}
              domain={yDomain}
              allowDataOverflow={true}
            />

            {/* Right Y-Axis: Open Interest (in Cr) */}
            {showOI && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(v) => `${v}Cr`}
                domain={[0, 'auto']}
              />
            )}

            <Tooltip content={<CustomTooltip />} />

            {/* Zero Baseline */}
            <ReferenceLine yAxisId="left" y={0} stroke="#475569" strokeWidth={1.5} />

            {/* Standard Deviation top labels */}
            <ReferenceLine yAxisId="left" x={spotPrice - sd2} stroke="#334155" strokeDasharray="2 2" label={{ value: '-2SD', position: 'top', fill: '#94a3b8', fontSize: 10 }} />
            <ReferenceLine yAxisId="left" x={spotPrice - sd1} stroke="#334155" strokeDasharray="2 2" label={{ value: '-1SD', position: 'top', fill: '#94a3b8', fontSize: 10 }} />
            <ReferenceLine yAxisId="left" x={spotPrice + sd1} stroke="#334155" strokeDasharray="2 2" label={{ value: '1SD', position: 'top', fill: '#94a3b8', fontSize: 10 }} />
            <ReferenceLine yAxisId="left" x={spotPrice + sd2} stroke="#334155" strokeDasharray="2 2" label={{ value: '2SD', position: 'top', fill: '#94a3b8', fontSize: 10 }} />

            {/* Current Spot Price Vertical Line */}
            <ReferenceLine
              yAxisId="left"
              x={spotPrice}
              stroke="#eab308"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Current: ${spotPrice.toLocaleString('en-IN')}`,
                position: 'top',
                fill: '#eab308',
                fontSize: 10,
                fontWeight: 600,
              }}
            />

            {/* Target Price Vertical Line */}
            <ReferenceLine
              yAxisId="left"
              x={targetPrice}
              stroke="#38bdf8"
              strokeWidth={2}
            />

            {/* Breakeven lines */}
            {breakevensExpiry.map((be, i) => (
              <ReferenceLine
                key={`be-${i}`}
                yAxisId="left"
                x={be}
                stroke="#94a3b8"
                strokeDasharray="2 2"
                label={{
                  value: `BE: ${be}`,
                  position: 'insideTopLeft',
                  fill: '#94a3b8',
                  fontSize: 9,
                }}
              />
            ))}

            {/* OI Bars */}
            {showOI && (
              <>
                <Bar
                  yAxisId="right"
                  dataKey="callOiCr"
                  fill="#ef4444"
                  opacity={0.35}
                  barSize={5}
                  name="Call OI"
                />
                <Bar
                  yAxisId="right"
                  dataKey="putOiCr"
                  fill="#10b981"
                  opacity={0.35}
                  barSize={5}
                  name="Put OI"
                />
              </>
            )}

            {/* GREEN PROFIT REGION (Area between y = 0 and positive payoff) */}
            <Area
              yAxisId="left"
              type="linear"
              dataKey="profitArea"
              baseValue={0}
              stroke="none"
              fill="url(#profitFill)"
              dot={false}
              isAnimationActive={false}
            />

            {/* RED LOSS REGION (Area between y = 0 and negative payoff) */}
            <Area
              yAxisId="left"
              type="linear"
              dataKey="lossArea"
              baseValue={0}
              stroke="none"
              fill="url(#lossFill)"
              dot={false}
              isAnimationActive={false}
            />

            {/* On Expiry P&L Line (Green in profit, Red in loss) */}
            <Line
              yAxisId="left"
              type="linear"
              dataKey="expiryPnL"
              stroke="url(#splitStroke)"
              strokeWidth={2.8}
              dot={false}
              name="On Expiry"
              isAnimationActive={false}
            />

            {/* On Target Date P&L Line (Cyan Curve) */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="targetPnL"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
              name="On Target Date"
              isAnimationActive={false}
            />

            {/* Hovered ring circle on active points */}
            {hoveredPoint && (
              <>
                <ReferenceDot
                  yAxisId="left"
                  x={hoveredPoint.spot}
                  y={hoveredPoint.expiryPnL}
                  r={5}
                  fill="#0e1626"
                  stroke={hoveredPoint.expiryPnL >= 0 ? '#10b981' : '#ef4444'}
                  strokeWidth={2.5}
                />
                <ReferenceDot
                  yAxisId="left"
                  x={hoveredPoint.spot}
                  y={hoveredPoint.targetPnL}
                  r={4}
                  fill="#0e1626"
                  stroke="#38bdf8"
                  strokeWidth={2}
                />
              </>
            )}

            {/* Selection Area Highlight for Drag-to-Zoom */}
            {refAreaLeft && refAreaRight && (
              <ReferenceArea
                yAxisId="left"
                x1={refAreaLeft}
                x2={refAreaRight}
                stroke="#38bdf8"
                strokeOpacity={0.8}
                fill="#38bdf8"
                fillOpacity={0.25}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Sensibull-style "Zoom Out" overlay button in the top right of the chart */}
        <div className="absolute top-3 right-5 flex items-center gap-2">
          {isZoomed ? (
            <button
              onClick={handleResetZoom}
              className="bg-[#0f172a]/95 hover:bg-slate-800 text-blue-400 hover:text-white border border-blue-500/50 hover:border-blue-400 px-3 py-1.5 rounded-lg shadow-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Zoom Out
            </button>
          ) : (
            <button
              onClick={handleZoomIn}
              className="bg-[#0f172a]/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 px-3 py-1.5 rounded-lg shadow-xl text-xs font-semibold transition-all flex items-center gap-1.5 active:scale-95"
            >
              <ZoomIn className="w-3.5 h-3.5 text-blue-400" />
              Zoom In
            </button>
          )}
        </div>

        {/* Sensibull-style Projected P&L badge anchored at bottom of Target Line */}
        {projectedPoint && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none flex items-center justify-center">
            <div
              className={`px-3 py-1.5 rounded-lg shadow-2xl backdrop-blur-md border text-xs font-bold flex items-center gap-1.5 transition-all ${
                projectedPnL >= 0
                  ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
                  : 'bg-[#431407]/90 border-orange-500/50 text-orange-200'
              }`}
            >
              <span>
                {projectedPnL >= 0 ? 'Projected profit:' : 'Projected loss:'}{' '}
                {projectedPnL >= 0 ? '+' : ''}
                {projectedPnL.toLocaleString('en-IN')} ({projectedPnL >= 0 ? '+' : ''}
                {projectedPct}%)
              </span>
              <HelpCircle className="w-3 h-3 opacity-70" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Interactive Sliders (Target Price & Expiry Date) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-[#1e293b]">
        {/* Slider 1: Underlying Target Price */}
        <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-1.5 font-medium text-slate-300">
              <span>{underlyingSymbol} Target</span>
              <button
                onClick={() => onTargetPriceChange?.(spotPrice)}
                className="text-[11px] text-blue-400 hover:text-blue-300 ml-2 cursor-pointer"
              >
                Reset
              </button>
            </div>
            {/* Stepper & Manual Entry */}
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${
                  Number(targetPctChange) >= 0
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-rose-500/10 text-rose-400'
                }`}
              >
                {Number(targetPctChange) >= 0 ? '+' : ''}
                {targetPctChange}%
              </span>
              <button
                onClick={() => handleStepPrice(-1)}
                className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => onTargetPriceChange?.(Number(e.target.value) || spotPrice)}
                className="w-20 bg-[#121b2d] border border-slate-700 text-center font-mono text-xs font-semibold text-white py-1 rounded focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => handleStepPrice(1)}
                className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Range Slider (-5% to +5%) */}
          <input
            type="range"
            min={Math.round(spotPrice * 0.95)}
            max={Math.round(spotPrice * 1.05)}
            step={
              underlyingSymbol === 'SENSEX' || underlyingSymbol === 'BANKNIFTY'
                ? 100
                : underlyingSymbol === 'MIDCPNIFTY'
                ? 25
                : 50
            }
            value={targetPrice}
            onChange={(e) => onTargetPriceChange?.(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
            <span>-5% ({Math.round(spotPrice * 0.95).toLocaleString('en-IN')})</span>
            <span className="text-yellow-500/80">Spot ({spotPrice.toLocaleString('en-IN')})</span>
            <span>+5% ({Math.round(spotPrice * 1.05).toLocaleString('en-IN')})</span>
          </div>
        </div>

        {/* Slider 2: Date to Expiry Slider */}
        <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-1.5 font-medium text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>Target Date: {targetDaysOffset === 0 ? 'Today (T+0)' : `T+${targetDaysOffset}`}</span>
              <button
                onClick={() => onTargetDaysChange?.(0)}
                className="text-[11px] text-blue-400 hover:text-blue-300 ml-2 cursor-pointer"
              >
                Reset
              </button>
            </div>
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              {targetDaysOffset >= daysToExpiry ? 'On Expiry 03:30 PM' : `${Math.max(0, daysToExpiry - targetDaysOffset)}D to expiry`}
            </span>
          </div>

          {/* Date Slider */}
          <input
            type="range"
            min={0}
            max={Math.max(1, daysToExpiry)}
            step={0.25}
            value={targetDaysOffset}
            onChange={(e) => onTargetDaysChange?.(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
            <span>Today (T+0)</span>
            <span className="text-cyan-400">
              {targetDaysOffset > 0 ? `+${targetDaysOffset} Days` : 'Live / Current'}
            </span>
            <span>Expiry ({daysToExpiry}D)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
