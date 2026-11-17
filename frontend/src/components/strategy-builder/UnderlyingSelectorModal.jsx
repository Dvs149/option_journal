import React, { useState } from 'react';
import { Search, X, Check, TrendingUp } from 'lucide-react';
import { DEFAULT_INDEX_CONFIG } from '../../utils/marketData';

const POPULAR_INDICES = [
  { symbol: 'NIFTY', name: 'NIFTY 50', exchange: 'NSE' },
  { symbol: 'BANKNIFTY', name: 'NIFTY BANK', exchange: 'NSE' },
  { symbol: 'FINNIFTY', name: 'NIFTY FIN SERVICE', exchange: 'NSE' },
  { symbol: 'SENSEX', name: 'BSE SENSEX', exchange: 'BSE' },
  { symbol: 'MIDCPNIFTY', name: 'NIFTY MIDCAP SELECT', exchange: 'NSE' },
  { symbol: 'BANKEX', name: 'BSE BANKEX', exchange: 'BSE' },
];

const POPULAR_STOCKS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', exchange: 'NSE' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', exchange: 'NSE' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', exchange: 'NSE' },
  { symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE' },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', exchange: 'NSE' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', exchange: 'NSE' },
];

export default function UnderlyingSelectorModal({
  isOpen,
  onClose,
  selectedSymbol = 'NIFTY',
  onSelectSymbol,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredIndices = POPULAR_INDICES.filter(
    (i) =>
      i.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredStocks = POPULAR_STOCKS.filter(
    (s) =>
      s.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (sym) => {
    onSelectSymbol(sym);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="bg-[#0e1626] border border-[#1e293b] rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header & Search Bar */}
        <div className="p-4 border-b border-[#1e293b] bg-[#121b2d]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Select Underlying Instrument</h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              autoFocus
              placeholder="Type stock or index name: SBIN, TCS, NIFTY..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0b101c] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* List of Indices & Stocks */}
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-[#1e293b]">
          {/* Major Indices */}
          <div className="p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1.5">
              Major Indices
            </span>
            <div className="space-y-1">
              {filteredIndices.map((item) => {
                const isSelected = selectedSymbol === item.symbol;
                return (
                  <div
                    key={item.symbol}
                    onClick={() => handleSelect(item.symbol)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'hover:bg-[#121b2d] text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-white">{item.symbol}</div>
                      <div className="text-[10px] text-slate-400">{item.name}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.5 rounded bg-slate-800">
                        {item.exchange}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Popular Stocks */}
          <div className="p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-1.5">
              F&O Stocks
            </span>
            <div className="space-y-1">
              {filteredStocks.map((item) => {
                const isSelected = selectedSymbol === item.symbol;
                return (
                  <div
                    key={item.symbol}
                    onClick={() => handleSelect(item.symbol)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'hover:bg-[#121b2d] text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-white">{item.symbol}</div>
                      <div className="text-[10px] text-slate-400">{item.name}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-mono px-1.5 py-0.5 rounded bg-slate-800">
                        {item.exchange}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
