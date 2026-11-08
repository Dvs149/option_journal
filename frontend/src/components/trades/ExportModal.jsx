import React, { useState, useMemo, useEffect } from 'react';
import {
  Download,
  X,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  Check,
  RotateCw,
  Layers,
  CalendarDays,
  CalendarRange,
  BarChart3,
  SlidersHorizontal,
  Sparkles,
  CheckSquare,
  Square,
  FileCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../api/client';
import { formatDate } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import { useDropdown } from '../../context/DropdownContext';

// Column definitions for Trade-by-Trade Log
const TRADE_COLUMNS = [
  { id: 'date', label: 'Date', default: true },
  { id: 'index_name', label: 'Index / Symbol', default: true },
  { id: 'trading_type', label: 'Trading Type', default: true },
  { id: 'option_type', label: 'Option Type (CE/PE)', default: true },
  { id: 'strike_price', label: 'Strike Price', default: true },
  { id: 'expiry_date', label: 'Expiry Date', default: false },
  { id: 'lots', label: 'Lots', default: true },
  { id: 'quantity', label: 'Quantity (Shares)', default: false },
  { id: 'entry_premium', label: 'Entry Premium (₹)', default: true },
  { id: 'exit_premium', label: 'Exit Premium (₹)', default: true },
  { id: 'gross_profit', label: 'Gross Profit (₹)', default: false },
  { id: 'gross_loss', label: 'Gross Loss (₹)', default: false },
  { id: 'brokerage', label: 'Brokerage (₹)', default: false },
  { id: 'total_charges', label: 'Total Charges (₹)', default: true },
  { id: 'net_pnl', label: 'Net P&L (₹)', default: true },
  { id: 'strategy_name', label: 'Strategy', default: true },
  { id: 'entry_reason', label: 'Entry Reason', default: false },
  { id: 'exit_reason', label: 'Exit Reason', default: false },
  { id: 'notes', label: 'Notes', default: false },
];

// Column definitions for Daily P&L
const DAILY_COLUMNS = [
  { id: 'date', label: 'Date', default: true },
  { id: 'trades_count', label: 'Total Trades', default: true },
  { id: 'winning_trades', label: 'Winning Trades', default: false },
  { id: 'losing_trades', label: 'Losing Trades', default: false },
  { id: 'gross_profit', label: 'Gross Profit (₹)', default: true },
  { id: 'gross_loss', label: 'Gross Loss (₹)', default: true },
  { id: 'total_charges', label: 'Total Charges (₹)', default: true },
  { id: 'net_pnl', label: 'Net P&L (₹)', default: true },
  { id: 'win_rate', label: 'Win Rate %', default: true },
  { id: 'status', label: 'Day Status (Win/Loss)', default: true },
];

// Column definitions for Monthly P&L
const MONTHLY_COLUMNS = [
  { id: 'month', label: 'Month', default: true },
  { id: 'trades_count', label: 'Total Trades', default: true },
  { id: 'winning_trades', label: 'Winning Trades', default: false },
  { id: 'losing_trades', label: 'Losing Trades', default: false },
  { id: 'gross_profit', label: 'Gross Profit (₹)', default: true },
  { id: 'gross_loss', label: 'Gross Loss (₹)', default: true },
  { id: 'total_charges', label: 'Total Charges (₹)', default: true },
  { id: 'net_pnl', label: 'Net P&L (₹)', default: true },
  { id: 'win_rate', label: 'Win Rate %', default: true },
  { id: 'status', label: 'Month Status (Profit/Loss)', default: true },
];

// Column definitions for Yearly P&L
const YEARLY_COLUMNS = [
  { id: 'year', label: 'Year', default: true },
  { id: 'trades_count', label: 'Total Trades', default: true },
  { id: 'winning_trades', label: 'Winning Trades', default: false },
  { id: 'losing_trades', label: 'Losing Trades', default: false },
  { id: 'gross_profit', label: 'Gross Profit (₹)', default: true },
  { id: 'gross_loss', label: 'Gross Loss (₹)', default: true },
  { id: 'total_charges', label: 'Total Charges (₹)', default: true },
  { id: 'net_pnl', label: 'Net P&L (₹)', default: true },
  { id: 'win_rate', label: 'Win Rate %', default: true },
  { id: 'status', label: 'Year Status (Profit/Loss)', default: true },
];

export default function ExportModal({
  isOpen,
  onClose,
  initialFilter = 'this_month',
  initialFromDate = '',
  initialToDate = '',
  initialIndex = 'ALL',
  initialTradingType = 'ALL',
  initialOptionType = 'ALL',
  initialStrategy = 'ALL',
  lotSizes = {},
  tradeIndices = [],
  tradeTradingTypes = [],
  tradeOptionTypes = [],
  tradeStrategies = [],
}) {
  const { showToast } = useToast();
  const { getActiveOptions } = useDropdown();

  // Dynamically load active options from Dropdown Manager
  const activeDatePeriods = useMemo(() => {
    const list = getActiveOptions('trades', 'date_period');
    if (list && list.length > 0) return list;
    return [
      { option_value: 'this_month', option_label: 'This Month' },
      { option_value: 'last_month', option_label: 'Last Month' },
      { option_value: 'today', option_label: 'Today' },
      { option_value: 'yesterday', option_label: 'Yesterday' },
      { option_value: 'tomorrow', option_label: 'Tomorrow / Next Working Day' },
      { option_value: 'this_week', option_label: 'This Week' },
      { option_value: 'this_year', option_label: 'This Year' },
      { option_value: 'all', option_label: 'All Time' },
      { option_value: 'custom', option_label: 'Custom Date Range' },
    ];
  }, [getActiveOptions]);

  const activeIndices = useMemo(() => {
    const list = getActiveOptions('trades', 'index_name');
    if (list && list.length > 0) return list;
    if (tradeIndices && tradeIndices.length > 0) return tradeIndices;
    return Object.keys(lotSizes)
      .filter((idx) => idx !== 'BANK NIFTY')
      .map((idx) => ({ option_value: idx, option_label: idx === 'BANKNIFTY' ? 'BANK NIFTY' : idx }));
  }, [getActiveOptions, tradeIndices, lotSizes]);

  const activeTradingTypes = useMemo(() => {
    const list = getActiveOptions('trades', 'trading_type');
    if (list && list.length > 0) return list;
    if (tradeTradingTypes && tradeTradingTypes.length > 0) return tradeTradingTypes;
    return [
      { option_value: 'Intraday', option_label: 'Intraday' },
      { option_value: 'BTST', option_label: 'BTST' },
      { option_value: 'Overnight', option_label: 'Overnight' },
      { option_value: 'Positional', option_label: 'Positional' },
      { option_value: 'Scalping', option_label: 'Scalping' },
    ];
  }, [getActiveOptions, tradeTradingTypes]);

  const activeOptionTypes = useMemo(() => {
    const list = getActiveOptions('trades', 'option_type');
    if (list && list.length > 0) return list;
    if (tradeOptionTypes && tradeOptionTypes.length > 0) return tradeOptionTypes;
    return [
      { option_value: 'CE', option_label: 'CE (Calls)' },
      { option_value: 'PE', option_label: 'PE (Puts)' },
      { option_value: 'Both', option_label: 'Both' },
    ];
  }, [getActiveOptions, tradeOptionTypes]);

  const activeStrategies = useMemo(() => {
    const list = getActiveOptions('trades', 'strategy_name');
    if (list && list.length > 0) return list;
    if (tradeStrategies && tradeStrategies.length > 0) return tradeStrategies;
    return [];
  }, [getActiveOptions, tradeStrategies]);

  // Export File Format: 'xlsx' | 'csv' | 'pdf'
  const [format, setFormat] = useState('xlsx');

  // Report Aggregation / P&L Mode: 'trades' | 'daily' | 'monthly' | 'yearly'
  const [reportType, setReportType] = useState('trades');

  // Filters State
  const [filterPeriod, setFilterPeriod] = useState(initialFilter || 'this_month');
  const [customFrom, setCustomFrom] = useState(initialFromDate || '');
  const [customTo, setCustomTo] = useState(initialToDate || '');
  const [selectedIndex, setSelectedIndex] = useState(initialIndex || 'ALL');
  const [selectedTradingType, setSelectedTradingType] = useState(initialTradingType || 'ALL');
  const [selectedOption, setSelectedOption] = useState(initialOptionType || 'ALL');
  const [selectedStrategy, setSelectedStrategy] = useState(initialStrategy || 'ALL');

  // Selected Columns per report type
  const [selectedColumns, setSelectedColumns] = useState(() => {
    return TRADE_COLUMNS.filter((c) => c.default).map((c) => c.id);
  });

  const [exporting, setExporting] = useState(false);

  // Synchronize when modal opens
  useEffect(() => {
    if (isOpen) {
      setFilterPeriod(initialFilter || 'this_month');
      setCustomFrom(initialFromDate || '');
      setCustomTo(initialToDate || '');
      setSelectedIndex(initialIndex || 'ALL');
      setSelectedTradingType(initialTradingType || 'ALL');
      setSelectedOption(initialOptionType || 'ALL');
      setSelectedStrategy(initialStrategy || 'ALL');
      // Reset to default columns for current report type
      resetColumnsForReportType(reportType);
    }
  }, [isOpen]);

  // When report type changes, reset columns to its appropriate defaults
  const handleReportTypeChange = (newType) => {
    setReportType(newType);
    resetColumnsForReportType(newType);
  };

  const resetColumnsForReportType = (type) => {
    let cols = [];
    if (type === 'trades') cols = TRADE_COLUMNS;
    else if (type === 'daily') cols = DAILY_COLUMNS;
    else if (type === 'monthly') cols = MONTHLY_COLUMNS;
    else if (type === 'yearly') cols = YEARLY_COLUMNS;
    setSelectedColumns(cols.filter((c) => c.default).map((c) => c.id));
  };

  // Active column options depending on report type
  const currentColumnOptions = useMemo(() => {
    if (reportType === 'daily') return DAILY_COLUMNS;
    if (reportType === 'monthly') return MONTHLY_COLUMNS;
    if (reportType === 'yearly') return YEARLY_COLUMNS;
    return TRADE_COLUMNS;
  }, [reportType]);

  // Toggle single column
  const toggleColumn = (colId) => {
    setSelectedColumns((prev) => {
      if (prev.includes(colId)) {
        if (prev.length === 1) {
          showToast('At least one column must be selected.', 'warning');
          return prev;
        }
        return prev.filter((id) => id !== colId);
      } else {
        return [...prev, colId];
      }
    });
  };

  // Preset: Date & Net P&L Only
  const applyDateAndPnlPreset = () => {
    if (reportType === 'trades') {
      setSelectedColumns(['date', 'net_pnl']);
    } else if (reportType === 'daily') {
      setSelectedColumns(['date', 'net_pnl']);
    } else if (reportType === 'monthly') {
      setSelectedColumns(['month', 'net_pnl']);
    } else if (reportType === 'yearly') {
      setSelectedColumns(['year', 'net_pnl']);
    }
    showToast('Applied preset: Date & Net P&L Only', 'info');
  };

  // Preset: Standard
  const applyStandardPreset = () => {
    resetColumnsForReportType(reportType);
    showToast('Applied preset: Standard Columns', 'info');
  };

  // Preset: Select All
  const applySelectAll = () => {
    setSelectedColumns(currentColumnOptions.map((c) => c.id));
  };

  // Preset: Clear to minimal
  const applyClearAll = () => {
    const firstCol = currentColumnOptions[0]?.id || 'date';
    const pnlCol = 'net_pnl';
    setSelectedColumns([firstCol, pnlCol]);
  };

  // Build filter query params
  const getQueryParams = () => {
    return {
      filter: filterPeriod,
      from_date: filterPeriod === 'custom' ? customFrom : undefined,
      to_date: filterPeriod === 'custom' ? customTo : undefined,
      index_name: selectedIndex === 'ALL' ? undefined : selectedIndex,
      trading_type: selectedTradingType === 'ALL' ? undefined : selectedTradingType,
      option_type: selectedOption === 'ALL' ? undefined : selectedOption,
      strategy_name: selectedStrategy === 'ALL' ? undefined : selectedStrategy,
      report_type: reportType,
      columns: selectedColumns.join(','),
    };
  };

  // Execute Export
  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      showToast('Please select at least one column to export.', 'warning');
      return;
    }

    setExporting(true);
    showToast(`Preparing ${format.toUpperCase()} export...`, 'info');

    try {
      if (format === 'pdf') {
        // Backend PDF export
        const res = await api.get('/export/pdf', {
          params: getQueryParams(),
          responseType: 'blob',
        });
        const blob = new Blob([res.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const periodStr = filterPeriod || 'all';
        a.download = `TradeJournal_${reportType.toUpperCase()}_Report_${periodStr}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast('✓ PDF report generated and downloaded successfully!', 'success');
        onClose();
        return;
      }

      // For Excel (.xlsx) and CSV (.csv): Fetch full matching trade dataset without pagination limits
      const res = await api.get('/trades', {
        params: {
          ...getQueryParams(),
          all: true,
          per_page: -1,
        },
      });

      const trades = res.data?.data || [];
      if (!trades || trades.length === 0) {
        showToast('No trades found matching the selected filters.', 'warning');
        setExporting(false);
        return;
      }

      let exportRows = [];

      if (reportType === 'trades') {
        // Trade-by-Trade Log
        exportRows = trades.map((t, idx) => {
          const row = {
            'Sr. No.': idx + 1,
          };
          selectedColumns.forEach((colId) => {
            switch (colId) {
              case 'date':
                row['Date'] = formatDate(t.trade_date);
                break;
              case 'index_name':
                row['Index / Symbol'] = t.index_name;
                break;
              case 'trading_type':
                row['Trading Type'] = t.trading_type || 'Intraday';
                break;
              case 'option_type':
                row['Option Type'] = t.option_type || '';
                break;
              case 'strike_price':
                row['Strike Price'] = t.strike_price ? Number(t.strike_price) : '';
                break;
              case 'expiry_date':
                row['Expiry Date'] = t.expiry_date ? formatDate(t.expiry_date) : '';
                break;
              case 'lots':
                row['Lots'] = Number(t.lots || 1);
                break;
              case 'quantity':
                row['Quantity'] = Number(t.quantity || 0);
                break;
              case 'entry_premium':
                row['Entry Premium (₹)'] = Number(t.entry_premium || 0);
                break;
              case 'exit_premium':
                row['Exit Premium (₹)'] = Number(t.exit_premium || 0);
                break;
              case 'gross_profit':
                row['Gross Profit (₹)'] = Number(t.gross_profit || 0);
                break;
              case 'gross_loss':
                row['Gross Loss (₹)'] = Number(t.gross_loss || 0);
                break;
              case 'brokerage':
                row['Brokerage (₹)'] = Number(t.brokerage || 0);
                break;
              case 'total_charges':
                row['Total Charges (₹)'] = Number(t.total_charges || 0);
                break;
              case 'net_pnl':
                row['Net P&L (₹)'] = Number(t.net_pnl || 0);
                break;
              case 'strategy_name':
                row['Strategy'] = t.strategy_name || '';
                break;
              case 'entry_reason':
                row['Entry Reason'] = t.entry_reason || '';
                break;
              case 'exit_reason':
                row['Exit Reason'] = t.exit_reason || '';
                break;
              case 'notes':
                row['Notes'] = t.notes || '';
                break;
              default:
                break;
            }
          });
          return row;
        });
      } else if (reportType === 'daily') {
        // Group by Date
        const dayMap = {};
        trades.forEach((t) => {
          const d = t.trade_date;
          if (!dayMap[d]) {
            dayMap[d] = {
              date: d,
              trades: 0,
              wins: 0,
              losses: 0,
              grossProfit: 0,
              grossLoss: 0,
              charges: 0,
              netPnl: 0,
            };
          }
          dayMap[d].trades += 1;
          const net = Number(t.net_pnl || 0);
          if (net > 0) dayMap[d].wins += 1;
          else if (net < 0) dayMap[d].losses += 1;
          dayMap[d].grossProfit += Number(t.gross_profit || 0);
          dayMap[d].grossLoss += Number(t.gross_loss || 0);
          dayMap[d].charges += Number(t.total_charges || 0);
          dayMap[d].netPnl += net;
        });

        const sortedDays = Object.values(dayMap).sort((a, b) => b.date.localeCompare(a.date));
        exportRows = sortedDays.map((d, idx) => {
          const row = {
            'Sr. No.': idx + 1,
          };
          const winRate = d.trades > 0 ? Number(((d.wins / d.trades) * 100).toFixed(1)) : 0;
          const status = d.netPnl > 0 ? 'Win' : d.netPnl < 0 ? 'Loss' : 'Breakeven';

          selectedColumns.forEach((colId) => {
            switch (colId) {
              case 'date':
                row['Date'] = formatDate(d.date);
                break;
              case 'trades_count':
                row['Total Trades'] = d.trades;
                break;
              case 'winning_trades':
                row['Winning Trades'] = d.wins;
                break;
              case 'losing_trades':
                row['Losing Trades'] = d.losses;
                break;
              case 'gross_profit':
                row['Gross Profit (₹)'] = Number(d.grossProfit.toFixed(2));
                break;
              case 'gross_loss':
                row['Gross Loss (₹)'] = Number(d.grossLoss.toFixed(2));
                break;
              case 'total_charges':
                row['Total Charges (₹)'] = Number(d.charges.toFixed(2));
                break;
              case 'net_pnl':
                row['Net P&L (₹)'] = Number(d.netPnl.toFixed(2));
                break;
              case 'win_rate':
                row['Win Rate %'] = winRate;
                break;
              case 'status':
                row['Day Status'] = status;
                break;
              default:
                break;
            }
          });
          return row;
        });
      } else if (reportType === 'monthly') {
        // Group by Month (YYYY-MM)
        const monthMap = {};
        trades.forEach((t) => {
          const ym = (t.trade_date || '').substring(0, 7);
          if (!ym) return;
          if (!monthMap[ym]) {
            monthMap[ym] = {
              monthKey: ym,
              trades: 0,
              wins: 0,
              losses: 0,
              grossProfit: 0,
              grossLoss: 0,
              charges: 0,
              netPnl: 0,
            };
          }
          monthMap[ym].trades += 1;
          const net = Number(t.net_pnl || 0);
          if (net > 0) monthMap[ym].wins += 1;
          else if (net < 0) monthMap[ym].losses += 1;
          monthMap[ym].grossProfit += Number(t.gross_profit || 0);
          monthMap[ym].grossLoss += Number(t.gross_loss || 0);
          monthMap[ym].charges += Number(t.total_charges || 0);
          monthMap[ym].netPnl += net;
        });

        const sortedMonths = Object.values(monthMap).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
        exportRows = sortedMonths.map((m, idx) => {
          const row = {
            'Sr. No.': idx + 1,
          };
          const winRate = m.trades > 0 ? Number(((m.wins / m.trades) * 100).toFixed(1)) : 0;
          const status = m.netPnl > 0 ? 'Profit' : m.netPnl < 0 ? 'Loss' : 'Breakeven';
          // Format month e.g. Oct 2026
          let formattedMonth = m.monthKey;
          try {
            const dateObj = new Date(`${m.monthKey}-01`);
            formattedMonth = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          } catch (e) {
            formattedMonth = m.monthKey;
          }

          selectedColumns.forEach((colId) => {
            switch (colId) {
              case 'month':
                row['Month'] = formattedMonth;
                break;
              case 'trades_count':
                row['Total Trades'] = m.trades;
                break;
              case 'winning_trades':
                row['Winning Trades'] = m.wins;
                break;
              case 'losing_trades':
                row['Losing Trades'] = m.losses;
                break;
              case 'gross_profit':
                row['Gross Profit (₹)'] = Number(m.grossProfit.toFixed(2));
                break;
              case 'gross_loss':
                row['Gross Loss (₹)'] = Number(m.grossLoss.toFixed(2));
                break;
              case 'total_charges':
                row['Total Charges (₹)'] = Number(m.charges.toFixed(2));
                break;
              case 'net_pnl':
                row['Net P&L (₹)'] = Number(m.netPnl.toFixed(2));
                break;
              case 'win_rate':
                row['Win Rate %'] = winRate;
                break;
              case 'status':
                row['Month Status'] = status;
                break;
              default:
                break;
            }
          });
          return row;
        });
      } else if (reportType === 'yearly') {
        // Group by Year (YYYY)
        const yearMap = {};
        trades.forEach((t) => {
          const y = (t.trade_date || '').substring(0, 4);
          if (!y) return;
          if (!yearMap[y]) {
            yearMap[y] = {
              year: y,
              trades: 0,
              wins: 0,
              losses: 0,
              grossProfit: 0,
              grossLoss: 0,
              charges: 0,
              netPnl: 0,
            };
          }
          yearMap[y].trades += 1;
          const net = Number(t.net_pnl || 0);
          if (net > 0) yearMap[y].wins += 1;
          else if (net < 0) yearMap[y].losses += 1;
          yearMap[y].grossProfit += Number(t.gross_profit || 0);
          yearMap[y].grossLoss += Number(t.gross_loss || 0);
          yearMap[y].charges += Number(t.total_charges || 0);
          yearMap[y].netPnl += net;
        });

        const sortedYears = Object.values(yearMap).sort((a, b) => b.year.localeCompare(a.year));
        exportRows = sortedYears.map((y, idx) => {
          const row = {
            'Sr. No.': idx + 1,
          };
          const winRate = y.trades > 0 ? Number(((y.wins / y.trades) * 100).toFixed(1)) : 0;
          const status = y.netPnl > 0 ? 'Profit' : y.netPnl < 0 ? 'Loss' : 'Breakeven';

          selectedColumns.forEach((colId) => {
            switch (colId) {
              case 'year':
                row['Year'] = y.year;
                break;
              case 'trades_count':
                row['Total Trades'] = y.trades;
                break;
              case 'winning_trades':
                row['Winning Trades'] = y.wins;
                break;
              case 'losing_trades':
                row['Losing Trades'] = y.losses;
                break;
              case 'gross_profit':
                row['Gross Profit (₹)'] = Number(y.grossProfit.toFixed(2));
                break;
              case 'gross_loss':
                row['Gross Loss (₹)'] = Number(y.grossLoss.toFixed(2));
                break;
              case 'total_charges':
                row['Total Charges (₹)'] = Number(y.charges.toFixed(2));
                break;
              case 'net_pnl':
                row['Net P&L (₹)'] = Number(y.netPnl.toFixed(2));
                break;
              case 'win_rate':
                row['Win Rate %'] = winRate;
                break;
              case 'status':
                row['Year Status'] = status;
                break;
              default:
                break;
            }
          });
          return row;
        });
      }

      if (exportRows.length === 0) {
        showToast('No aggregated records found to export.', 'warning');
        setExporting(false);
        return;
      }

      // Generate worksheet from JSON
      const worksheet = XLSX.utils.json_to_sheet(exportRows);

      // Auto-compute column widths
      const colKeys = Object.keys(exportRows[0]);
      worksheet['!cols'] = colKeys.map((k) => ({
        wch: Math.max(k.length + 3, 12),
      }));

      const workbook = XLSX.utils.book_new();
      const sheetName = reportType.toUpperCase();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      const timestamp = new Date().toISOString().split('T')[0];
      const baseFilename = `TradeJournal_${reportType.toUpperCase()}_Report_${timestamp}`;

      if (format === 'xlsx') {
        XLSX.writeFile(workbook, `${baseFilename}.xlsx`);
        showToast(`✓ Exported ${exportRows.length} rows to Excel (${baseFilename}.xlsx)!`, 'success');
      } else if (format === 'csv') {
        const csvContent = XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseFilename}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast(`✓ Exported ${exportRows.length} rows to CSV (${baseFilename}.csv)!`, 'success');
      }

      onClose();
    } catch (err) {
      console.error('Export error:', err);
      let errMsg = err.message || 'Unknown error';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json?.message) errMsg = json.message;
        } catch (_) {
          // ignore parsing error
        }
      } else if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      }
      showToast(`Export failed: ${errMsg}`, 'error');
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-[#0b1322] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-2xl overflow-hidden">
        
        {/* ========================================================= */}
        {/* MODAL HEADER                                              */}
        {/* ========================================================= */}
        <div className="px-6 py-4 border-b border-[#1e293b] light:border-slate-200 flex items-center justify-between bg-[#0e1626]/80 light:bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
              <Download className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white light:text-slate-900 tracking-tight">
                  Export Trading Journal
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold uppercase tracking-wider">
                  Custom Exporter
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Export custom P&L reports, trade logs, and choose the exact columns to include
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#162033] light:bg-slate-200 text-slate-400 hover:text-white light:hover:text-slate-900 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* MODAL BODY (Scrollable)                                   */}
        {/* ========================================================= */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-300 light:text-slate-700 custom-scrollbar">
          
          {/* STEP 1: REPORT AGGREGATION TYPE */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white light:text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span>1. Choose Report Aggregation (P&L Type) *</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { id: 'trades', label: 'Trade-by-Trade', desc: 'Itemized log of each trade', icon: Layers },
                { id: 'daily', label: 'Daily P&L', desc: 'Grouped by trading date', icon: CalendarDays },
                { id: 'monthly', label: 'Monthly P&L', desc: 'Consolidated month totals', icon: CalendarRange },
                { id: 'yearly', label: 'Yearly P&L', desc: 'Annual summary & win rates', icon: BarChart3 },
              ].map((item) => {
                const IconComponent = item.icon;
                const active = reportType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleReportTypeChange(item.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      active
                        ? 'bg-blue-600/15 border-blue-500/60 shadow-lg shadow-blue-500/10 text-white light:text-slate-900'
                        : 'bg-[#0e1626] light:bg-slate-50 border-[#1e293b] light:border-slate-200 hover:border-slate-600'
                    }`}
                  >
                    {active && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    )}
                    <IconComponent className={`w-4 h-4 mb-1.5 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span className="block font-bold text-xs">{item.label}</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">{item.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: FILE FORMAT SELECTION */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-white light:text-slate-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>2. Choose File Format *</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'xlsx', label: 'Excel Spreadsheet', ext: '.xlsx', icon: FileSpreadsheet, color: 'text-emerald-400', badge: 'Recommended' },
                { id: 'csv', label: 'CSV File', ext: '.csv', icon: FileText, color: 'text-blue-400', badge: 'Universal' },
                { id: 'pdf', label: 'PDF Report', ext: '.pdf', icon: FileCheck, color: 'text-rose-400', badge: 'Printable' },
              ].map((fmt) => {
                const IconComp = fmt.icon;
                const active = format === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setFormat(fmt.id)}
                    className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                      active
                        ? 'bg-[#142038] light:bg-blue-50 border-blue-500 shadow-md text-white light:text-slate-900'
                        : 'bg-[#0e1626] light:bg-slate-50 border-[#1e293b] light:border-slate-200 hover:border-slate-600 text-slate-300'
                    }`}
                  >
                    <IconComp className={`w-5 h-5 ${fmt.color}`} />
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs block">{fmt.label}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#1e293b] light:bg-slate-200 text-slate-300 light:text-slate-700 font-mono">
                          {fmt.ext}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">{fmt.badge}</span>
                    </div>
                    {active && <Check className="w-4 h-4 text-blue-400 ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 3: SCOPE & FILTERING CONTROLS */}
          <div className="space-y-3 p-4 rounded-2xl bg-[#0e1626]/70 light:bg-slate-50 border border-[#1e293b] light:border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white light:text-slate-900 flex items-center gap-2">
                <Filter className="w-4 h-4 text-amber-400" />
                <span>3. Filter Export Data</span>
              </label>
              <span className="text-[10px] text-slate-400">
                Defaults to active filters on All Trades page
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Date Period Filter */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-medium">Date Period</label>
                <select
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0b1322] light:bg-white border border-[#1e293b] light:border-slate-300 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer transition-colors"
                >
                  {activeDatePeriods.map((opt) => (
                    <option key={opt.option_value} value={opt.option_value}>
                      {opt.option_label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Index Filter */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-medium">Index / Symbol</label>
                <select
                  value={selectedIndex}
                  onChange={(e) => setSelectedIndex(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0b1322] light:bg-white border border-[#1e293b] light:border-slate-300 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer transition-colors"
                >
                  <option value="ALL">All Indices</option>
                  {activeIndices.map((opt) => (
                    <option key={opt.option_value} value={opt.option_value}>
                      {opt.option_label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Trading Type */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-medium">Trading Type</label>
                <select
                  value={selectedTradingType}
                  onChange={(e) => setSelectedTradingType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0b1322] light:bg-white border border-[#1e293b] light:border-slate-300 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer transition-colors"
                >
                  <option value="ALL">All Types</option>
                  {activeTradingTypes.map((opt) => (
                    <option key={opt.option_value} value={opt.option_value}>
                      {opt.option_label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Option Type */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-medium">Option Type</label>
                <select
                  value={selectedOption}
                  onChange={(e) => setSelectedOption(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0b1322] light:bg-white border border-[#1e293b] light:border-slate-300 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer transition-colors"
                >
                  <option value="ALL">All Options</option>
                  {activeOptionTypes.map((opt) => (
                    <option key={opt.option_value} value={opt.option_value}>
                      {opt.option_label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Strategy Filter */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 font-medium">Strategy</label>
                <select
                  value={selectedStrategy}
                  onChange={(e) => setSelectedStrategy(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0b1322] light:bg-white border border-[#1e293b] light:border-slate-300 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer transition-colors"
                >
                  <option value="ALL">All Strategies</option>
                  {activeStrategies.map((opt) => (
                    <option key={opt.option_value} value={opt.option_value}>
                      {opt.option_label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Date Pickers (if Custom Range is selected) */}
            {filterPeriod === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#1e293b] light:border-slate-200">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">From Date</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    onClick={(e) => { try { e.target.showPicker?.(); } catch {} }}
                    className="w-full px-3 py-2 rounded-xl bg-[#0b1322] light:bg-white border border-[#1e293b] light:border-slate-300 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">To Date</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    onClick={(e) => { try { e.target.showPicker?.(); } catch {} }}
                    className="w-full px-3 py-2 rounded-xl bg-[#0b1322] light:bg-white border border-[#1e293b] light:border-slate-300 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* STEP 4: COLUMN CUSTOMIZATION */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-white light:text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                  <span>4. Choose Columns to Include in List *</span>
                </label>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Select which columns appear in the exported file. <strong className="text-blue-400 font-semibold">Sr. No. (#)</strong> is always included automatically as the first column.
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={applyDateAndPnlPreset}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition-colors"
                  title="Export only Date and Net P&L (with Sr. No.)"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Date &amp; Net P&amp;L Only</span>
                </button>
                <button
                  type="button"
                  onClick={applyStandardPreset}
                  className="px-2 py-1 rounded-lg bg-[#162033] light:bg-slate-200 text-slate-300 light:text-slate-700 hover:text-white text-[11px] font-medium transition-colors"
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={applySelectAll}
                  className="px-2 py-1 rounded-lg bg-[#162033] light:bg-slate-200 text-slate-300 light:text-slate-700 hover:text-white text-[11px] font-medium transition-colors"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={applyClearAll}
                  className="px-2 py-1 rounded-lg bg-[#162033] light:bg-slate-200 text-slate-400 hover:text-rose-400 text-[11px] font-medium transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Selection Count Pill */}
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="px-2 py-0.5 rounded-md bg-[#162033] light:bg-slate-200 text-blue-400 font-bold font-mono">
                {selectedColumns.length + 1}
              </span>
              <span>columns will be exported (1 fixed Sr. No. + {selectedColumns.length} selected)</span>
            </div>

            {/* Checkbox Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-3 rounded-2xl bg-[#0e1626]/80 light:bg-slate-50 border border-[#1e293b] light:border-slate-200 custom-scrollbar">
              
              {/* Always included Sr. No. indicator */}
              <div className="flex items-center gap-2 p-2 rounded-xl bg-[#142038] light:bg-slate-200 border border-blue-500/30 opacity-90 cursor-not-allowed">
                <CheckSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="font-bold text-white light:text-slate-900 text-[11px]">
                  # Sr. No. <span className="text-[9px] text-blue-400 font-normal">(Always)</span>
                </span>
              </div>

              {/* Dynamic Columns */}
              {currentColumnOptions.map((col) => {
                const isSelected = selectedColumns.includes(col.id);
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => toggleColumn(col.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/10 border-blue-500/40 text-white light:text-slate-900'
                        : 'bg-[#0b1322] light:bg-white border-[#1e293b] light:border-slate-200 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    )}
                    <span className={`text-[11px] truncate ${isSelected ? 'font-semibold' : ''}`}>
                      {col.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MODAL FOOTER                                              */}
        {/* ========================================================= */}
        <div className="px-6 py-4 border-t border-[#1e293b] light:border-slate-200 bg-[#0e1626]/80 light:bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>Ready to export:</span>
            <span className="font-bold text-white light:text-slate-900">
              {reportType.toUpperCase()}
            </span>
            <span>&bull;</span>
            <span className="text-emerald-400 font-bold uppercase">
              .{format}
            </span>
            <span>&bull;</span>
            <span>{selectedColumns.length + 1} columns</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              disabled={exporting}
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#162033] hover:bg-[#1f2d48] light:bg-slate-200 light:hover:bg-slate-300 text-slate-300 light:text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={exporting || selectedColumns.length === 0}
              onClick={handleExport}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {exporting ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-white" />
                  <span>Exporting {format.toUpperCase()}...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-white" />
                  <span>Download Export (.{format})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}