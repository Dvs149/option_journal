import React, { useState } from 'react';
import { X, TrendingUp, TrendingDown, MinusCircle, Layers, Check } from 'lucide-react';
import { READY_MADE_STRATEGIES, STRATEGY_CATEGORIES } from '../../utils/strategyPresets';

export default function ReadyMadeStrategiesModal({
  isOpen,
  onClose,
  onSelectStrategy,
  spotPrice = 25000,
  strikeStep = 50,
  nearestExpiry = '',
  nextExpiry = '',
  lotSize = 25,
}) {
  const [activeCategory, setActiveCategory] = useState('bullish');

  if (!isOpen) return null;

  const filteredStrategies = READY_MADE_STRATEGIES.filter(
    (s) => s.category === activeCategory
  );

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'bullish':
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'bearish':
        return <TrendingDown className="w-4 h-4 text-rose-400" />;
      case 'neutral':
        return <MinusCircle className="w-4 h-4 text-cyan-400" />;
      default:
        return <Layers className="w-4 h-4 text-purple-400" />;
    }
  };

  const handleApply = (strategy) => {
    const legs = strategy.generateLegs(
      spotPrice,
      strikeStep,
      nearestExpiry,
      nextExpiry,
      lotSize
    );
    onSelectStrategy({
      name: strategy.name,
      legs,
      sentiment: strategy.sentiment,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="bg-[#0e1626] border border-[#1e293b] rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-[#121b2d]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Ready-Made Strategies</h2>
              <p className="text-xs text-slate-400">
                Choose a proven option strategy template to populate your builder instantly
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Tabs: Bullish, Bearish, Neutral, Others */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-[#1e293b] bg-[#0e1626]">
          {STRATEGY_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
                  isActive
                    ? 'border-blue-500 text-white bg-[#121b2d]'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#121b2d]/50'
                }`}
              >
                {getCategoryIcon(cat.id)}
                <span>{cat.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400">
                  {READY_MADE_STRATEGIES.filter((s) => s.category === cat.id).length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Strategies Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStrategies.map((strategy) => (
            <div
              key={strategy.id}
              onClick={() => handleApply(strategy)}
              className="group bg-[#121b2d] hover:bg-[#162238] border border-[#1e293b] hover:border-blue-500/50 rounded-xl p-4 flex flex-col justify-between transition-all cursor-pointer shadow-sm hover:shadow-lg"
            >
              <div>
                {/* Title & Badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors">
                    {strategy.name}
                  </h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                      strategy.riskProfile === 'Limited Risk'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : strategy.riskProfile === 'Unlimited'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {strategy.riskProfile}
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                  {strategy.desc}
                </p>

                {/* SVG Payoff Curve Thumbnail */}
                <div className="h-20 w-full bg-[#0b101c] rounded-lg border border-slate-800/80 p-2 flex items-center justify-center relative overflow-hidden mb-3">
                  {/* Subtle zero line */}
                  <div className="absolute inset-x-2 top-1/2 border-t border-slate-800 border-dashed" />
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full stroke-blue-400 fill-none"
                    preserveAspectRatio="none"
                  >
                    <path
                      d={strategy.svgPath}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {/* Bottom Sentiment & Action */}
              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/80 text-slate-400">
                <span className="font-mono text-slate-300">
                  {strategy.sentiment}
                </span>
                <span className="text-blue-400 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Apply <Check className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
