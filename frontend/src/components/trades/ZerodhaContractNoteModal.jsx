import React, { useMemo } from 'react';
import {
  FileText,
  X,
  Printer,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { formatINR } from '../../utils/formatters';
import { useEscapeKey } from '../../hooks/useEscapeKey';

// Helper to format tradingsymbol to authentic Kite display
function formatKiteInstrument(sym, exchange = 'NFO') {
  if (!sym) return { display: '', isOption: false, exchange };

  // NSE / BSE Options contract regex:
  // Weekly: NIFTY26N1725150CE -> Index: NIFTY, YY: 26, MonthChar: N, Day: 17, Strike: 25150, Type: CE
  // Monthly: NIFTY26NOV25000CE -> Index: NIFTY, YY: 26, MonthStr: NOV, Strike: 25000, Type: CE
  const match = sym.match(/^(NIFTY|SENSEX|BANKNIFTY|FINNIFTY|MIDCPNIFTY|BANKEX)(\d{2})(?:([1-9OND])(\d{2})|([A-Z]{3}))(\d{4,6})(CE|PE)$/i);
  if (match) {
    const [, index, , weeklyMonthChar, day, monthlyStr, strike, optType] = match;
    const isWeekly = Boolean(weeklyMonthChar && day);

    const monthMap = {
      '1': 'JAN', '2': 'FEB', '3': 'MAR', '4': 'APR', '5': 'MAY', '6': 'JUN',
      '7': 'JUL', '8': 'AUG', '9': 'SEP', 'O': 'OCT', 'N': 'NOV', 'D': 'DEC',
      'JAN': 'JAN', 'FEB': 'FEB', 'MAR': 'MAR', 'APR': 'APR', 'MAY': 'MAY', 'JUN': 'JUN',
      'JUL': 'JUL', 'AUG': 'AUG', 'SEP': 'SEP', 'OCT': 'OCT', 'NOV': 'NOV', 'DEC': 'DEC'
    };

    let month = '';
    let dayNum = '';
    let daySuffix = '';
    let dayStr = '';

    if (isWeekly) {
      month = monthMap[weeklyMonthChar.toUpperCase()] || weeklyMonthChar;
      const d = parseInt(day, 10);
      dayNum = d;
      const j = d % 10;
      const k = d % 100;
      if (j === 1 && k !== 11) daySuffix = 'st';
      else if (j === 2 && k !== 12) daySuffix = 'nd';
      else if (j === 3 && k !== 13) daySuffix = 'rd';
      else daySuffix = 'th';
      dayStr = `${dayNum}${daySuffix}`;
    } else {
      month = monthMap[monthlyStr.toUpperCase()] || monthlyStr;
    }

    return {
      index,
      dayNum,
      daySuffix,
      dayStr,
      monthStr: month,
      isWeekly,
      strike,
      optType: optType.toUpperCase(),
      exchange,
      isOption: true,
      display: isWeekly
        ? `${index} ${dayStr} w ${month} ${strike} ${optType.toUpperCase()}`
        : `${index} ${month} ${strike} ${optType.toUpperCase()}`
    };
  }

  return { display: sym, isOption: false, exchange };
}

export default function ZerodhaContractNoteModal({
  isOpen,
  onClose,
  orders = [],
  clientInfo = {},
}) {
  useEscapeKey(onClose, isOpen);

  // Calculate regulatory and broker charges matching Zerodha Kite Virtual Contract Note
  const contractNote = useMemo(() => {
    if (!orders || orders.length === 0) {
      return {
        sebiFee: 0,
        exchangeFee: 0,
        stampDuty: 0,
        stt: 0,
        gst: 0,
        brokerage: 0,
        total: 0,
        items: [],
      };
    }

    let totalBuyTurnover = 0;
    let totalSellTurnover = 0;
    let totalTurnover = 0;
    let executedCount = 0;

    const orderRows = [];

    // Filter to only executed/traded orders
    const executedOrders = orders.filter((o) => {
      const status = String(o.status || '').toUpperCase();
      return ['COMPLETE', 'TRADED', 'EXECUTED'].includes(status) || !status;
    });

    executedOrders.forEach((ord) => {
      const isBuy = String(ord.transaction_type || '').toUpperCase() === 'BUY';
      const qty = Math.abs(parseInt(ord.filled_quantity ?? ord.quantity ?? 0, 10) || 0);
      const price = parseFloat(ord.average_price ?? ord.price ?? 0) || 0;
      const turnover = qty * price;

      if (turnover <= 0 && qty <= 0) return;

      executedCount++;
      if (isBuy) {
        totalBuyTurnover += turnover;
      } else {
        totalSellTurnover += turnover;
      }
      totalTurnover += turnover;

      // Extract time
      let timeStr = '—';
      if (ord.order_timestamp) {
        timeStr = ord.order_timestamp.includes(' ')
          ? ord.order_timestamp.split(' ')[1]
          : ord.order_timestamp;
      }

      // Per-order charges matching Zerodha Kite virtual contract note:
      // Brokerage: ₹20 per executed order
      const ordBrokerage = 20.00;
      // NSE Options transaction charge: 0.03553%
      const ordExchange = turnover * 0.0003553;
      // SEBI fee: 0.0001% (₹10/crore)
      const ordSebi = turnover * 0.000001;
      // Stamp duty: 0.003% on buy turnover only (rounded)
      const ordStamp = isBuy ? Math.round(turnover * 0.00003) : 0;
      // STT: 0.15% on sell turnover only
      const ordStt = isBuy ? 0 : turnover * 0.0015;
      // GST: 18% on (brokerage + exchange fee + sebi fee)
      const ordGst = (ordBrokerage + ordExchange + ordSebi) * 0.18;
      const ordTotal = ordBrokerage + ordExchange + ordSebi + ordStamp + ordStt + ordGst;

      orderRows.push({
        id: ord.order_id || Math.random(),
        rawTimestamp: ord.order_timestamp || '',
        time: timeStr,
        type: isBuy ? 'BUY' : 'SELL',
        tradingsymbol: ord.tradingsymbol,
        exchange: ord.exchange || 'NFO',
        quantity: qty,
        price,
        charges: ordTotal,
      });
    });

    // Sort newest first (descending by timestamp)
    orderRows.sort((a, b) => {
      if (b.rawTimestamp && a.rawTimestamp) {
        return b.rawTimestamp.localeCompare(a.rawTimestamp);
      }
      return (b.time || '').localeCompare(a.time || '');
    });

    // Aggregate totals matching Kite
    const brokerage = executedCount * 20.00;
    const exchangeFee = totalTurnover * 0.0003553;
    const sebiFee = totalTurnover * 0.000001;
    const stampDuty = Math.round(totalBuyTurnover * 0.00003);
    const stt = totalSellTurnover * 0.0015;
    const gst = (brokerage + exchangeFee + sebiFee) * 0.18;
    // Total rounds unrounded sum to match Kite's exact total
    const total = brokerage + exchangeFee + sebiFee + stampDuty + stt + gst;

    return {
      sebiFee,
      exchangeFee,
      stampDuty,
      stt,
      gst,
      brokerage,
      total,
      totalTurnover,
      executedCount,
      items: orderRows,
    };
  }, [orders]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-[#14171f] border border-[#232936] shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#232936] bg-[#11141b]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-600/20 text-orange-500 flex items-center justify-center font-bold text-sm border border-orange-500/20">
              <FileText className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-tight">
                Virtual contract note
              </h2>
              <p className="text-[11px] text-slate-400">
                Estimated breakdown of statutory & broker charges for today&apos;s executed orders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f2430] transition-colors cursor-pointer"
              title="Print Virtual Contract Note"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1f2430] transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Section 1: Statutory Charges */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-300 pb-1 border-b border-[#232936]">
              Statutory Charges (Government &amp; Exchange fees)
            </h3>
            <div className="space-y-1.5 text-slate-300 pt-1">
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">SEBI turnover fee</span>
                <span className="font-mono font-medium text-white">
                  {contractNote.sebiFee.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Exchange turnover fee</span>
                <span className="font-mono font-medium text-white">
                  {contractNote.exchangeFee.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Stamp duty</span>
                <span className="font-mono font-medium text-white">
                  {contractNote.stampDuty.toFixed(0)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Transaction tax (STT)</span>
                <span className="font-mono font-medium text-white">
                  {contractNote.stt.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">GST</span>
                <span className="font-mono font-medium text-white">
                  {contractNote.gst.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Zerodha Charges */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-300 pb-1 border-b border-[#232936]">
              Zerodha Charges
            </h3>
            <div className="pt-1">
              <div className="flex items-center justify-between py-1 text-slate-300">
                <span className="text-slate-400">Brokerage</span>
                <span className="font-mono font-medium text-white">
                  {contractNote.brokerage.toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Total */}
          <div className="flex items-center justify-between py-3 border-t border-b border-[#232936] text-sm font-bold">
            <span className="text-white">Total</span>
            <span className="font-mono text-base text-white">
              {contractNote.total.toFixed(2)}
            </span>
          </div>

          {/* Section 4: Itemized Executions Breakdown */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300">
                Itemized Executions ({contractNote.items.length})
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                Turnover: {formatINR(contractNote.totalTurnover)}
              </span>
            </div>

            <div className="rounded-2xl border border-[#232936] overflow-hidden bg-[#10131a]">
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#141822] border-b border-[#232936] text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Instrument</th>
                      <th className="py-2.5 px-3 text-right">Qty.</th>
                      <th className="py-2.5 px-3 text-right">Avg. price</th>
                      <th className="py-2.5 px-3 text-right">Charges</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e2430]">
                    {contractNote.items.map((it, idx) => {
                      const isBuy = it.type === 'BUY';
                      const inst = formatKiteInstrument(it.tradingsymbol, it.exchange);

                      return (
                        <tr key={it.id || idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                            {it.time}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  isBuy ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'
                                }`}
                              >
                                {it.type}
                              </span>
                              {inst.isOption ? (
                                <span className="font-semibold text-slate-200">
                                  {inst.index}{' '}
                                  {inst.dayNum ? (
                                    <>
                                      {inst.dayNum}
                                      <sup className="text-[9px] text-slate-300 font-normal">{inst.daySuffix}</sup>{' '}
                                    </>
                                  ) : null}
                                  {inst.isWeekly && (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-400 font-mono font-bold mr-1 inline-flex items-center">
                                      w
                                    </span>
                                  )}
                                  {inst.monthStr} {inst.strike}{' '}
                                  <span className={inst.optType === 'CE' ? 'text-blue-400' : 'text-orange-400'}>
                                    {inst.optType}
                                  </span>
                                </span>
                              ) : (
                                <span className="font-semibold text-slate-200">{it.tradingsymbol}</span>
                              )}
                              <span className="text-[10px] text-slate-500 uppercase font-mono">{it.exchange}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-white font-medium">
                            {it.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                            {it.price.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-white">
                            {it.charges.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footnote */}
          <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-white/[0.02] p-3 rounded-xl border border-[#232936]">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              *The data is an approximation based on the current orderbook and may change in the actual contract note after settlement.{' '}
              <a
                href="https://zerodha.com/charges/#tab-equities"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:underline"
              >
                Learn more.
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#232936] bg-[#11141b]">
          <div className="text-[11px] text-slate-400">
            {contractNote.executedCount} orders executed today
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#1c2433] hover:bg-[#253045] text-white border border-[#2b374d] transition-all cursor-pointer shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
