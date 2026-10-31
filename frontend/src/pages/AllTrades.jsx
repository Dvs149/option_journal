import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Download,
  Copy,
  Edit2,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Calendar,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Database,
  Trophy,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Receipt,
  BookOpen,
  Image as ImageIcon,
  RotateCw,
  Upload,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import api from '../api/client';
import { formatINR, formatDate } from '../utils/formatters';
import { useLotSizes } from '../context/LotSizeContext';
import { useToast } from '../context/ToastContext';
import { useFilter } from '../context/FilterContext';
import { useBrokerage } from '../context/BrokerageContext';
import { useDropdown } from '../context/DropdownContext';
import BulkImportModal from '../components/trades/BulkImportModal';
import ExportModal from '../components/trades/ExportModal';
import * as XLSX from 'xlsx';

// Helper to resolve individual CE and PE leg prices
const getLegPrices = (trade) => {
  if (!trade) return { ceEntry: null, peEntry: null, ceExit: null, peExit: null };
  let ceEntry = trade.ce_entry_price != null ? parseFloat(trade.ce_entry_price) : null;
  let peEntry = trade.pe_entry_price != null ? parseFloat(trade.pe_entry_price) : null;
  let ceExit = trade.ce_exit_price != null ? parseFloat(trade.ce_exit_price) : null;
  let peExit = trade.pe_exit_price != null ? parseFloat(trade.pe_exit_price) : null;

  // Fallback to parsing from trade_setup or notes if not populated on columns directly
  if (ceEntry === null && peEntry === null) {
    const raw = (trade.journal?.trade_setup || '') + ' ' + (trade.notes || '');
    const m = raw.match(/CE Entry:\s*₹?([0-9.]+),\s*Exit:\s*₹?([0-9.]+).*PE Entry:\s*₹?([0-9.]+),\s*Exit:\s*₹?([0-9.]+)/i);
    if (m) {
      ceEntry = parseFloat(m[1]);
      ceExit = parseFloat(m[2]);
      peEntry = parseFloat(m[3]);
      peExit = parseFloat(m[4]);
    }
  }

  return { ceEntry, peEntry, ceExit, peExit };
};

export default function AllTrades() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { lotSizes = {}, getLotSize } = useLotSizes();
  const { calculateCharges } = useBrokerage();

  // Primary state
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState({
    total_trades: 0,
    net_pnl: 0,
    gross_profit: 0,
    gross_loss: 0,
    total_charges: 0,
    win_rate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    per_page: 10,
  });

  // Filters
  const { filter, customFrom, customTo, dateRangeDisplay } = useFilter();
  const { getActiveOptions } = useDropdown();
  const tradeIndices = useMemo(() => getActiveOptions('trades', 'index_name'), [getActiveOptions]);
  const tradeTradingTypes = useMemo(() => getActiveOptions('trades', 'trading_type'), [getActiveOptions]);
  const tradeOptionTypes = useMemo(() => getActiveOptions('trades', 'option_type'), [getActiveOptions]);
  const tradeStrategies = useMemo(() => getActiveOptions('trades', 'strategy_name'), [getActiveOptions]);

  const [selectedIndex, setSelectedIndex] = useState('ALL');
  const [selectedTradingType, setSelectedTradingType] = useState('ALL');
  const [selectedOption, setSelectedOption] = useState('ALL');
  const [selectedStrategy, setSelectedStrategy] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const selectAllRef = useRef(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Selected trade for side drawer
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [drawerTab, setDrawerTab] = useState('details'); // 'details' | 'charges' | 'journal'
  const selLegs = useMemo(() => getLegPrices(selectedTrade), [selectedTrade]);

  // Performance Breakdown chart tab
  const [breakdownTab, setBreakdownTab] = useState('Index'); // 'Index' | 'Option Type' | 'Trading Type' | 'Strategy'

  // Edit / Delete modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalTab, setEditModalTab] = useState('details'); // 'details' | 'charges' | 'journal'
  const [tradeToDelete, setTradeToDelete] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editExistingScreenshots, setEditExistingScreenshots] = useState([]);
  const [editDeletedScreenshotIds, setEditDeletedScreenshotIds] = useState([]);
  const [editStagedNewFiles, setEditStagedNewFiles] = useState([]);
  const [lightboxState, setLightboxState] = useState({ isOpen: false, images: [], currentIndex: 0 });
  const [uploadingDrawerScreenshot, setUploadingDrawerScreenshot] = useState(false);
  const editFileInputRef = useRef(null);
  const drawerFileInputRef = useRef(null);
  const [sortBy, setSortBy] = useState('trade_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const { showToast } = useToast();
  const setFeedbackMessage = (msg, type = 'success') => {
    if (msg) showToast(msg, type);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // Fetch Dashboard Stats & Trades
  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchTrades();
  }, [selectedIndex, selectedTradingType, selectedOption, selectedStrategy, page, perPage, sortBy, sortOrder]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard', { params: { filter: 'all' } });
      if (res.data?.stats) {
        const s = res.data.stats;
        setStats({
          total_trades: s.total_trades ?? 0,
          net_pnl: s.total_net_profit ?? 0,
          gross_profit: s.total_gross_profit ?? 0,
          gross_loss: s.total_gross_loss ?? 0,
          total_charges: s.total_charges ?? 0,
          win_rate: s.trade_win_rate ?? 0,
        });
      }
    } catch (e) {
      console.warn('Dashboard stats fallback applied', e);
    }
  };

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const res = await api.get('/trades', {
        params: {
          index_name: selectedIndex === 'ALL' ? undefined : selectedIndex,
          trading_type: selectedTradingType === 'ALL' ? undefined : selectedTradingType,
          option_type: selectedOption === 'ALL' ? undefined : selectedOption,
          strategy_name: selectedStrategy === 'ALL' ? undefined : selectedStrategy,
          search: search || undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
          page,
          per_page: perPage,
        },
      });

      const list = res.data?.data || [];
      setTrades(list);
      setPagination({
        current_page: res.data?.current_page || 1,
        last_page: res.data?.last_page || 1,
        total: res.data?.total || list.length,
        per_page: res.data?.per_page || perPage,
      });

      // If URL contains editTradeId, automatically trigger edit modal
      const editId = searchParams.get('editTradeId');
      if (editId) {
        const found = list.find((t) => t.id.toString() === editId.toString());
        if (found) {
          handleOpenEdit(found);
          setSelectedTrade(found);
        }
      } else if (list.length > 0 && !selectedTrade) {
        // Default select the first trade for the drawer on wide screens
        setSelectedTrade(list[0]);
      }
    } catch (err) {
      console.error('Failed to load trades', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTrades();
  };

  // Reset selection when primary search/filters change (preserves across page changes)
  useEffect(() => {
    setSelectedRowIds(new Set());
  }, [selectedIndex, selectedTradingType, selectedOption, selectedStrategy, search]);

  // Selected IDs specifically on the current page
  const selectedOnCurrentPageCount = useMemo(() => {
    if (!trades || trades.length === 0) return 0;
    return trades.filter((t) => selectedRowIds.has(t.id)).length;
  }, [trades, selectedRowIds]);

  const isAllOnPageSelected = useMemo(() => {
    return trades.length > 0 && selectedOnCurrentPageCount === trades.length;
  }, [trades.length, selectedOnCurrentPageCount]);

  const isSomeOnPageSelected = useMemo(() => {
    return selectedOnCurrentPageCount > 0 && selectedOnCurrentPageCount < trades.length;
  }, [selectedOnCurrentPageCount, trades.length]);

  // Sync indeterminate state on header checkbox
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isSomeOnPageSelected;
    }
  }, [isSomeOnPageSelected]);

  // Toggle selection for all trades on CURRENT page
  const toggleSelectAllCurrentPage = () => {
    const next = new Set(selectedRowIds);
    if (isAllOnPageSelected) {
      // Uncheck only current page trades; preserve selections on other pages
      trades.forEach((t) => next.delete(t.id));
    } else {
      // Check all trades on this page and merge with existing selections
      trades.forEach((t) => next.add(t.id));
    }
    setSelectedRowIds(next);
  };

  const toggleSelectRow = (id, e) => {
    e.stopPropagation();
    const next = new Set(selectedRowIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedRowIds(next);
  };

  // Select all trades across all pages
  const [loadingAllIds, setLoadingAllIds] = useState(false);
  const handleSelectAllAcrossPages = async () => {
    try {
      setLoadingAllIds(true);
      const res = await api.get('/trades/all-ids', {
        params: {
          index_name: selectedIndex === 'ALL' ? undefined : selectedIndex,
          trading_type: selectedTradingType === 'ALL' ? undefined : selectedTradingType,
          option_type: selectedOption === 'ALL' ? undefined : selectedOption,
          strategy_name: selectedStrategy === 'ALL' ? undefined : selectedStrategy,
          search: search || undefined,
        },
      });
      const ids = res.data?.ids || [];
      setSelectedRowIds(new Set(ids));
      setFeedbackMessage(`Selected all ${ids.length} trade(s) across all pages.`);
    } catch (err) {
      console.error('Failed to select all trades across pages', err);
    } finally {
      setLoadingAllIds(false);
    }
  };

  // Bulk delete trades
  const handleBulkDelete = async () => {
    if (selectedRowIds.size === 0) return;
    setDeletingBulk(true);
    try {
      const ids = Array.from(selectedRowIds);
      const res = await api.post('/trades/bulk-delete', { trade_ids: ids });
      setFeedbackMessage(res.data?.message || `Successfully deleted ${ids.length} trade(s).`);

      if (selectedTrade && selectedRowIds.has(selectedTrade.id)) {
        setSelectedTrade(null);
      }

      setSelectedRowIds(new Set());
      setShowBulkDeleteModal(false);

      if (selectedOnCurrentPageCount === trades.length && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchTrades();
      }
      fetchStats();
    } catch (err) {
      console.error('Failed to bulk delete trades', err);
      showToast(err.response?.data?.message || 'Failed to delete selected trades', 'error');
    } finally {
      setDeletingBulk(false);
    }
  };

  // Export handlers
  const [exporting, setExporting] = useState(false);

  const handleExport = async (type) => {
    setShowExportMenu(false);
    if (exporting) return;

    if (type === 'excel') {
      await handleExportExcel();
    } else if (type === 'csv') {
      await handleExportCsv();
    } else if (type === 'pdf') {
      await handleExportPdf();
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    showToast('Generating Excel (.xlsx) file...', 'info');
    try {
      // Fetch all trades matching the current filter (up to 5000 trades)
      const res = await api.get('/trades', {
        params: {
          filter,
          from_date: filter === 'custom' ? customFrom : undefined,
          to_date: filter === 'custom' ? customTo : undefined,
          index_name: selectedIndex === 'ALL' ? undefined : selectedIndex,
          trading_type: selectedTradingType === 'ALL' ? undefined : selectedTradingType,
          option_type: selectedOption === 'ALL' ? undefined : selectedOption,
          strategy_name: selectedStrategy === 'ALL' ? undefined : selectedStrategy,
          search: search || undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
          per_page: 5000,
        },
      });

      const list = res.data?.data || trades;
      if (!list || list.length === 0) {
        showToast('No trades found to export.', 'warning');
        return;
      }

      const rows = list.map((t, idx) => ({
        '#': idx + 1,
        'Date': t.trade_date,
        'Index / Symbol': t.index_name,
        'Trading Type': t.trading_type || 'Intraday',
        'Option Type': t.option_type,
        'Strike Price': t.strike_price || '',
        'Expiry Date': t.expiry_date || '',
        'Lots': t.lots || 1,
        'Quantity': t.quantity || '',
        'Entry Premium (₹)': Number(t.entry_premium || 0),
        'Exit Premium (₹)': Number(t.exit_premium || 0),
        'Gross Profit (₹)': Number(t.gross_profit || 0),
        'Gross Loss (₹)': Number(t.gross_loss || 0),
        'Brokerage (₹)': Number(t.brokerage || 0),
        'STT (₹)': Number(t.stt || 0),
        'Exchange Charges (₹)': Number(t.exchange_charges || 0),
        'GST (₹)': Number(t.gst || 0),
        'SEBI Charges (₹)': Number(t.sebi_charges || 0),
        'Stamp Duty (₹)': Number(t.stamp_duty || 0),
        'Total Charges (₹)': Number(t.total_charges || 0),
        'Net P&L (₹)': Number(t.net_pnl || 0),
        'Strategy': t.strategy_name || '',
        'Entry Reason': t.entry_reason || '',
        'Exit Reason': t.exit_reason || '',
        'Notes': t.notes || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!cols'] = [
        { wch: 4 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 },
        { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 16 },
        { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 10 },
        { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
        { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 30 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Trades');
      const fileName = `trades_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      showToast(`✓ Exported ${list.length} trades to Excel (${fileName})!`, 'success');
    } catch (err) {
      console.error('Excel export error:', err);
      showToast(`Failed to export Excel: ${err.message}`, 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    showToast('Downloading CSV...', 'info');
    try {
      const res = await api.get('/export/csv', {
        params: {
          filter: filter || 'all',
          from_date: filter === 'custom' ? customFrom : undefined,
          to_date: filter === 'custom' ? customTo : undefined,
          index_name: selectedIndex === 'ALL' ? undefined : selectedIndex,
          trading_type: selectedTradingType === 'ALL' ? undefined : selectedTradingType,
          option_type: selectedOption === 'ALL' ? undefined : selectedOption,
          strategy_name: selectedStrategy === 'ALL' ? undefined : selectedStrategy,
        },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trades_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('✓ CSV file downloaded successfully!', 'success');
    } catch (err) {
      console.error('CSV export error:', err);
      showToast(`Failed to export CSV: ${err.message}`, 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    showToast('Generating PDF Report with all trades...', 'info');
    try {
      const res = await api.get('/export/pdf', {
        params: {
          filter: filter || 'this_month',
          from_date: filter === 'custom' ? customFrom : undefined,
          to_date: filter === 'custom' ? customTo : undefined,
          index_name: selectedIndex === 'ALL' ? undefined : selectedIndex,
          trading_type: selectedTradingType === 'ALL' ? undefined : selectedTradingType,
          option_type: selectedOption === 'ALL' ? undefined : selectedOption,
          strategy_name: selectedStrategy === 'ALL' ? undefined : selectedStrategy,
          search: search || undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
        },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TradeJournal_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('✓ PDF report downloaded successfully!', 'success');
    } catch (err) {
      console.error('PDF export error:', err);
      showToast(`Failed to export PDF: ${err.message}`, 'error');
    } finally {
      setExporting(false);
    }
  };

  // Delete trade
  const handleDeleteTrade = async () => {
    if (!tradeToDelete) return;
    try {
      await api.delete(`/trades/${tradeToDelete.id}`);
      setFeedbackMessage('Trade successfully deleted.');
      setTradeToDelete(null);
      if (selectedTrade?.id === tradeToDelete.id) {
        setSelectedTrade(null);
      }
      fetchTrades();
      fetchStats();
      setTimeout(() => setFeedbackMessage(''), 3000);
    } catch (e) {
      console.error('Failed to delete trade', e);
    }
  };

  // Duplicate trade
  const handleDuplicateTrade = async (id, e) => {
    e?.stopPropagation();
    try {
      await api.post(`/trades/${id}/duplicate`);
      setFeedbackMessage('Trade duplicated successfully!');
      fetchTrades();
      fetchStats();
      setTimeout(() => setFeedbackMessage(''), 3000);
    } catch (e) {
      console.error('Failed to duplicate trade', e);
    }
  };

  // Computed fields for edit modal
  const editComputedTotalCharges = useMemo(() => {
    const b = parseFloat(editForm.brokerage) || 0;
    const s = parseFloat(editForm.stt) || 0;
    const ex = parseFloat(editForm.exchange_charges) || 0;
    const g = parseFloat(editForm.gst) || 0;
    const seb = parseFloat(editForm.sebi_charges) || 0;
    const st = parseFloat(editForm.stamp_duty) || 0;
    const o = parseFloat(editForm.other_charges) || 0;
    return (b + s + ex + g + seb + st + o).toFixed(2);
  }, [
    editForm.brokerage,
    editForm.stt,
    editForm.exchange_charges,
    editForm.gst,
    editForm.sebi_charges,
    editForm.stamp_duty,
    editForm.other_charges,
  ]);

  const editComputedGrossProfit = useMemo(() => {
    const entry = parseFloat(editForm.entry_premium) || 0;
    const exit = parseFloat(editForm.exit_premium) || 0;
    const qty = parseFloat(editForm.quantity) || 0;
    if (entry > 0 && exit > 0 && qty > 0) {
      const diff = (exit - entry) * qty;
      return diff > 0 ? diff.toFixed(2) : '0.00';
    }
    return parseFloat(editForm.gross_profit || 0).toFixed(2);
  }, [editForm.entry_premium, editForm.exit_premium, editForm.quantity, editForm.gross_profit]);

  const editComputedGrossLoss = useMemo(() => {
    const entry = parseFloat(editForm.entry_premium) || 0;
    const exit = parseFloat(editForm.exit_premium) || 0;
    const qty = parseFloat(editForm.quantity) || 0;
    if (entry > 0 && exit > 0 && qty > 0) {
      const diff = (exit - entry) * qty;
      return diff < 0 ? Math.abs(diff).toFixed(2) : '0.00';
    }
    return parseFloat(editForm.gross_loss || 0).toFixed(2);
  }, [editForm.entry_premium, editForm.exit_premium, editForm.quantity, editForm.gross_loss]);

  const editComputedNetPnl = useMemo(() => {
    const gp = parseFloat(editComputedGrossProfit) || 0;
    const gl = parseFloat(editComputedGrossLoss) || 0;
    const ch = parseFloat(editComputedTotalCharges) || 0;
    return (gp - gl - ch).toFixed(2);
  }, [editComputedGrossProfit, editComputedGrossLoss, editComputedTotalCharges]);

  // Automatically calculate P&L and charges in real-time whenever trade fields change
  useEffect(() => {
    let entry = parseFloat(editForm.entry_premium) || 0;
    let exit = parseFloat(editForm.exit_premium) || 0;

    if (editForm.option_type === 'Both') {
      const ceEn = parseFloat(editForm.ce_entry_price) || 0;
      const peEn = parseFloat(editForm.pe_entry_price) || 0;
      const ceEx = parseFloat(editForm.ce_exit_price) || 0;
      const peEx = parseFloat(editForm.pe_exit_price) || 0;
      if (ceEn > 0 || peEn > 0) entry = ceEn + peEn;
      if (ceEx > 0 || peEx > 0) exit = ceEx + peEx;
    }

    const qty = parseInt(editForm.quantity, 10) || 0;

    if (qty > 0 && (entry > 0 || exit > 0)) {
      const est = calculateCharges({
        entry,
        exit,
        quantity: qty,
        optionType: editForm.option_type,
        indexName: editForm.index_name,
        ceEntry: editForm.ce_entry_price,
        peEntry: editForm.pe_entry_price,
        ceExit: editForm.ce_exit_price,
        peExit: editForm.pe_exit_price,
      });

      setEditForm((prev) => {
        const other = parseFloat(prev.other_charges) || 0;
        const total = (est.total_charges + other).toFixed(2);

        if (
          prev.brokerage === est.brokerage.toFixed(2) &&
          prev.stt === est.stt.toFixed(2) &&
          prev.exchange_charges === est.exchange_charges.toFixed(2) &&
          prev.gst === est.gst.toFixed(2) &&
          prev.sebi_charges === est.sebi_charges.toFixed(2) &&
          prev.stamp_duty === est.stamp_duty.toFixed(2) &&
          prev.total_charges === total &&
          prev.gross_profit === (est.gross_profit > 0 ? est.gross_profit.toFixed(2) : '0.00') &&
          prev.gross_loss === (est.gross_loss > 0 ? est.gross_loss.toFixed(2) : '0.00')
        ) {
          return prev;
        }

        return {
          ...prev,
          brokerage: est.brokerage.toFixed(2),
          stt: est.stt.toFixed(2),
          exchange_charges: est.exchange_charges.toFixed(2),
          gst: est.gst.toFixed(2),
          sebi_charges: est.sebi_charges.toFixed(2),
          stamp_duty: est.stamp_duty.toFixed(2),
          total_charges: total,
          gross_profit: est.gross_profit > 0 ? est.gross_profit.toFixed(2) : '0.00',
          gross_loss: est.gross_loss > 0 ? est.gross_loss.toFixed(2) : '0.00',
        };
      });
    }
  }, [
    editForm.entry_premium,
    editForm.exit_premium,
    editForm.quantity,
    editForm.lots,
    editForm.option_type,
    editForm.index_name,
    editForm.ce_entry_price,
    editForm.pe_entry_price,
    editForm.ce_exit_price,
    editForm.pe_exit_price,
    calculateCharges,
  ]);

  const handleEditAutoCalculate = async () => {
    const entry = parseFloat(editForm.entry_premium) || 0;
    const exit = parseFloat(editForm.exit_premium) || 0;
    const qty = parseInt(editForm.quantity, 10) || 0;

    let gp = '0.00';
    let gl = '0.00';
    if (entry > 0 && exit > 0 && qty > 0) {
      const diff = (exit - entry) * qty;
      if (diff >= 0) {
        gp = diff.toFixed(2);
        gl = '0.00';
      } else {
        gp = '0.00';
        gl = Math.abs(diff).toFixed(2);
      }
    }

    try {
      const res = await api.post('/trades/estimate-charges', {
        entry_premium: entry,
        exit_premium: exit,
        quantity: qty,
        option_type: editForm.option_type,
        index_name: editForm.index_name,
        ce_entry_price: editForm.ce_entry_price,
        pe_entry_price: editForm.pe_entry_price,
        ce_exit_price: editForm.ce_exit_price,
        pe_exit_price: editForm.pe_exit_price,
      });

      if (res.data) {
        const est = res.data;
        setEditForm((prev) => ({
          ...prev,
          gross_profit: gp,
          gross_loss: gl,
          brokerage: Number(est.brokerage).toFixed(2),
          stt: Number(est.stt).toFixed(2),
          exchange_charges: Number(est.exchange_charges).toFixed(2),
          gst: Number(est.gst).toFixed(2),
          sebi_charges: Number(est.sebi_charges).toFixed(2),
          stamp_duty: Number(est.stamp_duty).toFixed(2),
          other_charges: Number(est.other_charges || 0).toFixed(2),
          total_charges: Number(est.total_charges).toFixed(2),
        }));
      }
    } catch {
      const localEst = calculateCharges({
        entry,
        exit,
        quantity: qty,
        optionType: editForm.option_type,
        indexName: editForm.index_name,
        ceEntry: editForm.ce_entry_price,
        peEntry: editForm.pe_entry_price,
        ceExit: editForm.ce_exit_price,
        peExit: editForm.pe_exit_price,
      });

      setEditForm((prev) => ({
        ...prev,
        gross_profit: gp,
        gross_loss: gl,
        brokerage: localEst.brokerage.toFixed(2),
        stt: localEst.stt.toFixed(2),
        exchange_charges: localEst.exchange_charges.toFixed(2),
        gst: localEst.gst.toFixed(2),
        sebi_charges: localEst.sebi_charges.toFixed(2),
        stamp_duty: localEst.stamp_duty.toFixed(2),
        other_charges: '0.00',
        total_charges: localEst.total_charges.toFixed(2),
      }));
    }
  };

  const resolveScreenshot = (tradeOrUrl) => {
    if (!tradeOrUrl) return null;
    let url = typeof tradeOrUrl === 'string' ? tradeOrUrl : (tradeOrUrl.screenshot_url || tradeOrUrl.screenshot_path);
    if (!url) return null;
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const parsed = new URL(url);
        if (typeof window !== 'undefined' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
          const clientHost = window.location.hostname || '127.0.0.1';
          parsed.hostname = (clientHost === 'localhost') ? '127.0.0.1' : clientHost;
          return parsed.toString();
        }
      } catch (e) {
        // ignore
      }
      return url;
    }
    const clean = url.replace(/^\/?(storage\/)?/, '');
    return `/storage/${clean}`;
  };

  const getTradeScreenshots = (trade) => {
    if (!trade) return [];
    if (trade.screenshots_list && Array.isArray(trade.screenshots_list) && trade.screenshots_list.length > 0) {
      return trade.screenshots_list.map((s) => ({
        id: s.id,
        url: resolveScreenshot(s.url || s.path),
        path: s.path,
        filename: s.filename || 'Screenshot',
        caption: s.caption || '',
      }));
    }
    if (trade.screenshots && Array.isArray(trade.screenshots) && trade.screenshots.length > 0) {
      return trade.screenshots.map((s) => ({
        id: s.id,
        url: resolveScreenshot(s.url || s.path),
        path: s.path,
        filename: s.filename || (s.path ? s.path.split('/').pop() : 'Screenshot'),
        caption: s.caption || '',
      }));
    }
    const single = resolveScreenshot(trade);
    if (single) {
      return [{
        id: null,
        url: single,
        path: trade.screenshot_path,
        filename: 'Chart Screenshot',
        caption: '',
      }];
    }
    return [];
  };

  const openLightbox = (images, index = 0) => {
    const list = Array.isArray(images) ? images : [images];
    const formatted = list.map((item) => {
      if (typeof item === 'string') return { url: resolveScreenshot(item), filename: 'Screenshot' };
      return { ...item, url: resolveScreenshot(item.url || item.path) };
    });
    setLightboxState({
      isOpen: true,
      images: formatted,
      currentIndex: Math.max(0, Math.min(index, formatted.length - 1)),
    });
  };

  const closeLightbox = () => {
    setLightboxState({ isOpen: false, images: [], currentIndex: 0 });
  };

  const prevLightboxImage = () => {
    setLightboxState((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length,
    }));
  };

  const nextLightboxImage = () => {
    setLightboxState((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.images.length,
    }));
  };

  const setViewingScreenshotUrl = (url) => {
    if (url) {
      openLightbox([url], 0);
    } else {
      closeLightbox();
    }
  };

  const handleEditAddFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newStaged = [];
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setFeedbackMessage(`"${file.name}" exceeds 10MB limit.`, 'error');
        continue;
      }
      newStaged.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
      });
    }

    if (newStaged.length > 0) {
      setEditStagedNewFiles((prev) => [...prev, ...newStaged]);
    }

    if (editFileInputRef.current) {
      editFileInputRef.current.value = '';
    }
  };

  const handleRemoveExistingScreenshot = (screenshotId, index) => {
    setEditExistingScreenshots((prev) => prev.filter((_, i) => i !== index));
    if (screenshotId) {
      setEditDeletedScreenshotIds((prev) => [...prev, screenshotId]);
    }
  };

  const handleRemoveStagedNewFile = (tempId) => {
    setEditStagedNewFiles((prev) => {
      const item = prev.find((it) => it.id === tempId);
      if (item?.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter((it) => it.id !== tempId);
    });
  };

  const handleDrawerScreenshotUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !selectedTrade) return;

    try {
      setUploadingDrawerScreenshot(true);
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('screenshots[]', file);
      });
      const res = await api.post(`/trades/${selectedTrade.id}/screenshots`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.trade) {
        setSelectedTrade(res.data.trade);
      }
      fetchTrades();
      setFeedbackMessage(`${files.length} screenshot(s) uploaded successfully!`);
    } catch (err) {
      console.error('Drawer screenshot upload failed', err);
      setFeedbackMessage('Failed to upload screenshots.', 'error');
    } finally {
      setUploadingDrawerScreenshot(false);
      if (drawerFileInputRef.current) {
        drawerFileInputRef.current.value = '';
      }
    }
  };

  const handleDrawerDeleteSingleScreenshot = async (screenshotId) => {
    if (!selectedTrade) return;
    if (!window.confirm('Are you sure you want to permanently remove this screenshot?')) return;
    try {
      setUploadingDrawerScreenshot(true);
      let res;
      if (screenshotId) {
        res = await api.delete(`/trades/${selectedTrade.id}/screenshots/${screenshotId}`);
      } else {
        res = await api.delete(`/trades/${selectedTrade.id}/screenshot`);
      }
      if (res.data?.trade) {
        setSelectedTrade(res.data.trade);
      }
      fetchTrades();
      setFeedbackMessage('Screenshot removed successfully!');
    } catch (err) {
      console.error('Failed to delete screenshot', err);
      setFeedbackMessage('Failed to remove screenshot.', 'error');
    } finally {
      setUploadingDrawerScreenshot(false);
    }
  };

  // Open Edit Modal with all trade details
  const handleOpenEdit = (trade, e) => {
    e?.stopPropagation();
    const legs = getLegPrices(trade);
    const knownStrategies = [
      'Long Straddle', 'Long Strangle', 'Directional CE', 'Directional PE',
      'Bull Call Spread', 'Bear Put Spread', 'Iron Condor', 'Short Straddle',
      'Short Strangle', 'BTST', 'Intraday Options'
    ];
    const isCustomStrategy = trade.strategy_name && !knownStrategies.includes(trade.strategy_name);

    setEditExistingScreenshots(getTradeScreenshots(trade));
    setEditDeletedScreenshotIds([]);
    setEditStagedNewFiles([]);
    setEditModalTab('details');
    setEditForm({
      id: trade.id,
      trade_date: trade.trade_date ? trade.trade_date.split('T')[0] : '',
      index_name: trade.index_name || 'NIFTY',
      trading_type: trade.trading_type || 'Intraday',
      option_type: trade.option_type || 'CE',
      strike_price: trade.strike_price != null ? trade.strike_price.toString() : '',
      expiry_date: trade.expiry_date ? trade.expiry_date.split('T')[0] : '',
      ce_entry_price: trade.ce_entry_price != null ? trade.ce_entry_price.toString() : (legs.ceEntry != null ? legs.ceEntry.toString() : ''),
      pe_entry_price: trade.pe_entry_price != null ? trade.pe_entry_price.toString() : (legs.peEntry != null ? legs.peEntry.toString() : ''),
      ce_exit_price: trade.ce_exit_price != null ? trade.ce_exit_price.toString() : (legs.ceExit != null ? legs.ceExit.toString() : ''),
      pe_exit_price: trade.pe_exit_price != null ? trade.pe_exit_price.toString() : (legs.peExit != null ? legs.peExit.toString() : ''),
      entry_premium: trade.entry_premium != null ? trade.entry_premium.toString() : '',
      exit_premium: trade.exit_premium != null ? trade.exit_premium.toString() : '',
      quantity: trade.quantity != null ? trade.quantity.toString() : '50',
      lots: trade.lots != null ? trade.lots.toString() : '1',
      strategy_name: isCustomStrategy ? 'CUSTOM' : (trade.strategy_name || 'Long Straddle'),
      custom_strategy: isCustomStrategy ? trade.strategy_name : '',
      market_conditions: trade.journal?.market_conditions || trade.market_conditions || 'Rangebound',
      // P&L & Charges
      gross_profit: trade.gross_profit != null ? trade.gross_profit.toString() : '0.00',
      gross_loss: trade.gross_loss != null ? trade.gross_loss.toString() : '0.00',
      brokerage: trade.brokerage != null ? trade.brokerage.toString() : '40.00',
      stt: trade.stt != null ? trade.stt.toString() : '0.00',
      exchange_charges: trade.exchange_charges != null ? trade.exchange_charges.toString() : '0.00',
      gst: trade.gst != null ? trade.gst.toString() : '0.00',
      sebi_charges: trade.sebi_charges != null ? trade.sebi_charges.toString() : '0.00',
      stamp_duty: trade.stamp_duty != null ? trade.stamp_duty.toString() : '0.00',
      other_charges: trade.other_charges != null ? trade.other_charges.toString() : '0.00',
      total_charges: trade.total_charges != null ? trade.total_charges.toString() : '0.00',
      net_pnl: trade.net_pnl != null ? trade.net_pnl.toString() : '0.00',
      // Strategy & Journal
      entry_reason: trade.entry_reason || '',
      exit_reason: trade.exit_reason || '',
      trade_setup: trade.journal?.trade_setup || '',
      what_went_right: trade.journal?.what_went_right || '',
      what_went_wrong: trade.journal?.what_went_wrong || '',
      mistakes_made: trade.journal?.mistakes_made || '',
      lessons_learned: trade.journal?.lessons_learned || '',
      personal_notes: trade.journal?.personal_notes || trade.notes || '',
      screenshot_url: trade.screenshot_url,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      setSavingEdit(true);
      const strategyFinal = editForm.strategy_name === 'CUSTOM' ? editForm.custom_strategy : editForm.strategy_name;
      const payload = {
        ...editForm,
        strategy_name: strategyFinal,
        gross_profit: parseFloat(editComputedGrossProfit) || 0,
        gross_loss: parseFloat(editComputedGrossLoss) || 0,
        brokerage: parseFloat(editForm.brokerage) || 0,
        stt: parseFloat(editForm.stt) || 0,
        exchange_charges: parseFloat(editForm.exchange_charges) || 0,
        gst: parseFloat(editForm.gst) || 0,
        sebi_charges: parseFloat(editForm.sebi_charges) || 0,
        stamp_duty: parseFloat(editForm.stamp_duty) || 0,
        other_charges: parseFloat(editForm.other_charges) || 0,
        total_charges: parseFloat(editComputedTotalCharges) || 0,
        ce_entry_price: editForm.option_type === 'Both' && editForm.ce_entry_price ? parseFloat(editForm.ce_entry_price) : null,
        pe_entry_price: editForm.option_type === 'Both' && editForm.pe_entry_price ? parseFloat(editForm.pe_entry_price) : null,
        ce_exit_price: editForm.option_type === 'Both' && editForm.ce_exit_price ? parseFloat(editForm.ce_exit_price) : null,
        pe_exit_price: editForm.option_type === 'Both' && editForm.pe_exit_price ? parseFloat(editForm.pe_exit_price) : null,
      };
      const res = await api.put(`/trades/${editForm.id}`, payload);
      let updatedTrade = res.data?.trade || { ...selectedTrade, ...payload };

      // 1. Delete screenshots marked for removal
      for (const delId of editDeletedScreenshotIds) {
        try {
          if (delId) {
            await api.delete(`/trades/${editForm.id}/screenshots/${delId}`);
          }
        } catch (delErr) {
          console.error('Error deleting screenshot on edit', delErr);
        }
      }

      // 2. Upload newly staged screenshots
      if (editStagedNewFiles.length > 0) {
        try {
          const formData = new FormData();
          editStagedNewFiles.forEach((item) => {
            formData.append('screenshots[]', item.file);
          });
          const uploadRes = await api.post(`/trades/${editForm.id}/screenshots`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          if (uploadRes.data?.trade) {
            updatedTrade = uploadRes.data.trade;
          }
        } catch (upErr) {
          console.error('Screenshot upload on edit failed', upErr);
        }
      }

      setShowEditModal(false);
      setFeedbackMessage('Trade updated successfully!');
      fetchTrades();
      fetchStats();
      if (selectedTrade?.id === editForm.id) {
        setSelectedTrade(updatedTrade);
      }
      setTimeout(() => setFeedbackMessage(''), 3000);
    } catch (err) {
      console.error('Failed to update trade', err);
      setFeedbackMessage('Failed to update trade. Please check all fields.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Performance Breakdown data
  const breakdownData = useMemo(() => {
    if (breakdownTab === 'Index') {
      return [
        { name: 'NIFTY', profit: 48.2, loss: 24.3 },
        { name: 'BANKNIFTY', profit: 41.6, loss: 38.2 },
        { name: 'SENSEX', profit: 18.6, loss: 22.4 },
        { name: 'BANKEX', profit: 8.9, loss: 12.3 },
        { name: 'STOCKS', profit: 4.5, loss: 9.1 },
      ];
    }
    if (breakdownTab === 'Option Type') {
      return [
        { name: 'CE (Calls)', profit: 68.4, loss: 32.1 },
        { name: 'PE (Puts)', profit: 54.2, loss: 48.6 },
        { name: 'Both (Spreads)', profit: 21.0, loss: 8.4 },
      ];
    }
    if (breakdownTab === 'Trading Type') {
      return [
        { name: 'Intraday', profit: 84.5, loss: 56.2 },
        { name: 'BTST', profit: 34.0, loss: 18.4 },
        { name: 'Overnight', profit: 12.5, loss: 9.2 },
      ];
    }
    // Strategy
    return [
      { name: 'Long Straddle', profit: 52.0, loss: 16.5 },
      { name: 'Directional CE', profit: 38.4, loss: 24.0 },
      { name: 'Directional PE', profit: 28.1, loss: 31.2 },
      { name: 'Short Strangle', profit: 22.5, loss: 9.8 },
      { name: 'Rangebound', profit: 14.2, loss: 11.0 },
    ];
  }, [breakdownTab]);

  return (
    <div className="space-y-6 pb-24 md:pb-12 text-slate-100 light:text-slate-800">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white light:text-slate-900">
            All Trades
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            View, edit, delete and analyze all your trading records
          </p>
        </div>
      </div>

      {/* 1. Main Statistics Cards (6 Horizontal Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Trades */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Total Trades</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-white light:text-slate-900 font-mono-numbers block">
              {stats.total_trades}
            </span>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
              All logged trades
            </span>
          </div>
        </div>

        {/* Card 2: Net P&L */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Net P&L</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-white light:text-slate-900 font-mono-numbers block">
              {formatINR(stats.net_pnl)}
            </span>
            <span className={`text-[10px] font-semibold flex items-center gap-0.5 mt-0.5 ${stats.total_trades > 0 ? (stats.net_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-500 font-normal'}`}>
              {stats.total_trades > 0 ? (
                <>
                  {stats.net_pnl >= 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
                  {stats.net_pnl >= 0 ? 'Net Profit' : 'Net Loss'}
                </>
              ) : (
                'No trades yet'
              )}
            </span>
          </div>
        </div>

        {/* Card 3: Gross Profit */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Gross Profit</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-white light:text-slate-900 font-mono-numbers block">
              {formatINR(stats.gross_profit)}
            </span>
            <span className={`text-[10px] font-medium block mt-0.5 ${stats.total_trades > 0 && stats.gross_profit > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
              {stats.total_trades > 0 && stats.gross_profit > 0 ? 'Gross earnings' : 'No profit yet'}
            </span>
          </div>
        </div>

        {/* Card 4: Gross Loss */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Gross Loss</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-white light:text-slate-900 font-mono-numbers block">
              {formatINR(stats.gross_loss)}
            </span>
            <span className={`text-[10px] font-medium block mt-0.5 ${stats.total_trades > 0 && stats.gross_loss > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
              {stats.total_trades > 0 && stats.gross_loss > 0 ? 'Gross losses' : 'No losses yet'}
            </span>
          </div>
        </div>

        {/* Card 5: Total Charges */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Total Charges</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-white light:text-slate-900 font-mono-numbers block">
              {formatINR(stats.total_charges)}
            </span>
            <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
              Brokerage & taxes
            </span>
          </div>
        </div>

        {/* Card 6: Win Rate */}
        <div className="p-4 rounded-2xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">Win Rate</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-xl font-bold text-white light:text-slate-900 font-mono-numbers block">
              {stats.win_rate}%
            </span>
            <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
              Performance Index
            </span>
          </div>
        </div>
      </div>

      {/* 2. Filters & Action Toolbar Card */}
      <div className="p-4 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3.5">
        {/* Row 1: Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {/* Date Range Selector */}
          <div>
            <label className="block text-slate-400 text-[11px] mb-1">Date Range</label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={dateRangeDisplay || 'All Time'}
                className="w-full pl-3 pr-8 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 cursor-pointer focus:outline-none"
              />
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Index Selector */}
          <div>
            <label className="block text-slate-400 text-[11px] mb-1">Index</label>
            <select
              value={selectedIndex}
              onChange={(e) => {
                setSelectedIndex(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none"
            >
              <option value="ALL">All Indices</option>
              {Object.keys(lotSizes)
                .filter((idx) => {
                  if (idx === 'BANK NIFTY') return false;
                  if (tradeIndices && tradeIndices.length > 0) {
                    return tradeIndices.some((opt) => opt.option_value === idx);
                  }
                  return true;
                })
                .map((idx) => (
                  <option key={idx} value={idx}>
                    {idx === 'BANKNIFTY' ? 'BANK NIFTY' : idx}
                  </option>
                ))}
            </select>
          </div>

          {/* Trading Type Selector */}
          <div>
            <label className="block text-slate-400 text-[11px] mb-1">Trading Type</label>
            <select
              value={selectedTradingType}
              onChange={(e) => {
                setSelectedTradingType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none"
            >
              <option value="ALL">All Types</option>
              {tradeTradingTypes && tradeTradingTypes.length > 0 ? (
                tradeTradingTypes.map((opt) => (
                  <option key={opt.option_value} value={opt.option_value}>
                    {opt.option_label}
                  </option>
                ))
              ) : (
                <>
                  <option value="Intraday">Intraday</option>
                  <option value="BTST">BTST</option>
                  <option value="Overnight">Overnight</option>
                </>
              )}
            </select>
          </div>

          {/* Option Type Selector */}
          <div>
            <label className="block text-slate-400 text-[11px] mb-1">Option Type</label>
            <select
              value={selectedOption}
              onChange={(e) => {
                setSelectedOption(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none"
            >
              <option value="ALL">All Options</option>
              {tradeOptionTypes && tradeOptionTypes.length > 0 ? (
                tradeOptionTypes.map((opt) => (
                  <option key={opt.option_value} value={opt.option_value}>
                    {opt.option_label}
                  </option>
                ))
              ) : (
                <>
                  <option value="CE">CE (Calls)</option>
                  <option value="PE">PE (Puts)</option>
                  <option value="Both">Both (Spreads)</option>
                </>
              )}
            </select>
          </div>

          {/* Strategy Selector */}
          <div>
            <label className="block text-slate-400 text-[11px] mb-1">Strategy</label>
            <select
              value={selectedStrategy}
              onChange={(e) => {
                setSelectedStrategy(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none"
            >
              <option value="ALL">All Strategies</option>
              {tradeStrategies && tradeStrategies.length > 0 ? (
                tradeStrategies.map((opt) => (
                  <option key={opt.option_value} value={opt.option_value}>
                    {opt.option_label}
                  </option>
                ))
              ) : (
                <>
                  <option value="Long Straddle">Long Straddle</option>
                  <option value="Long Strangle">Long Strangle</option>
                  <option value="Directional CE">Directional CE</option>
                  <option value="Directional PE">Directional PE</option>
                  <option value="Bull Call Spread">Bull Call Spread</option>
                  <option value="Bear Put Spread">Bear Put Spread</option>
                  <option value="Iron Condor">Iron Condor</option>
                  <option value="Short Straddle">Short Straddle</option>
                  <option value="Short Strangle">Short Strangle</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Row 2: Search Input, Sort Selector & Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          {/* Search Box & Sort */}
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search trades..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </form>

            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('_');
                setSortBy(sb);
                setSortOrder(so);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none shrink-0"
              title="Sort Order"
            >
              <option value="trade_date_desc">Date (Newest to Oldest)</option>
              <option value="trade_date_asc">Date (Oldest to Newest)</option>
              <option value="id_desc">Entry Time (Newest First)</option>
              <option value="net_pnl_desc">Net P&L (Highest First)</option>
              <option value="net_pnl_asc">Net P&L (Lowest First)</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => navigate('/add-trade')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Trade</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBulkImportModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-blue-500/30 text-blue-400 hover:text-blue-300 hover:bg-blue-600/10 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
              title="Bulk Import trades from Zerodha, Kotak Neo, or Custom Excel"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk Import</span>
            </button>

            {/* Export Button - Opens Export Modal */}
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export</span>
            </button>

            
          </div>
        </div>
      </div>

      {/* 3. Main Trades Table with Drawer (Grid 12-col) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Table Container (takes 8 cols if drawer is active, or full 12 cols) */}
        <div className={selectedTrade ? 'lg:col-span-8 space-y-4' : 'lg:col-span-12 space-y-4'}>
          {/* Bulk Selection Action Bar */}
          {selectedRowIds.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#121b2d] light:bg-blue-50/80 border border-blue-500/30 light:border-blue-200 rounded-2xl shadow-sm animate-fadeIn">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center justify-center min-w-6 h-6 px-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold text-xs">
                  {selectedRowIds.size}
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-white light:text-slate-900">
                    {selectedRowIds.size} {selectedRowIds.size === 1 ? 'trade' : 'trades'} selected
                  </span>
                  <span className="text-slate-400 light:text-slate-500 ml-2">
                    (Page {pagination.current_page || page}: {selectedOnCurrentPageCount} of {trades.length} selected)
                  </span>
                </div>
                {/* Option to select all on this page if not all on current page are selected */}
                {!isAllOnPageSelected && trades.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAllCurrentPage}
                    className="text-xs text-blue-400 hover:text-blue-300 light:text-blue-600 underline font-medium"
                  >
                    Select all {trades.length} on page {pagination.current_page || page}
                  </button>
                )}
                {/* Option to select ALL trades across all pages */}
                {selectedRowIds.size < pagination.total && (
                  <button
                    type="button"
                    disabled={loadingAllIds}
                    onClick={handleSelectAllAcrossPages}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 light:text-blue-600 font-semibold underline disabled:opacity-50"
                  >
                    {loadingAllIds ? (
                      <RotateCw className="w-3 h-3 animate-spin inline" />
                    ) : null}
                    Select all {pagination.total} trades across all pages
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRowIds(new Set())}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white light:text-slate-600 hover:bg-[#18233a] light:hover:bg-slate-200 transition-colors"
                >
                  Clear Selection
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkDeleteModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedRowIds.size})</span>
                </button>
              </div>
            </div>
          )}

          <div className="rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-[#0e1626]/60 light:bg-slate-50 border-b border-[#1e293b] light:border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-3.5 w-6">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={isAllOnPageSelected}
                        onChange={toggleSelectAllCurrentPage}
                        className="rounded bg-[#0e1626] border-[#1e293b] text-blue-600 focus:ring-0 cursor-pointer"
                        title={isAllOnPageSelected ? "Deselect all on this page" : "Select all on this page"}
                      />
                    </th>
                    <th
                      onClick={() => handleSort('trade_date')}
                      className="py-3 px-3 cursor-pointer select-none hover:text-white light:hover:text-slate-900 transition-colors"
                      title="Sort by Date"
                    >
                      <div className="flex items-center gap-1">
                        <span>Date</span>
                        {sortBy === 'trade_date' ? (
                          sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-400" /> : <ChevronDown className="w-3 h-3 text-blue-400" />
                        ) : (
                          <ArrowUpDown className="w-2.5 h-2.5 text-slate-500 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-3">Index</th>
                    <th className="py-3 px-2">Type</th>
                    <th className="py-3 px-2">CE/PE</th>
                    <th
                      onClick={() => handleSort('strike_price')}
                      className="py-3 px-2 cursor-pointer select-none hover:text-white light:hover:text-slate-900 transition-colors"
                      title="Sort by Strike"
                    >
                      <div className="flex items-center gap-1">
                        <span>Strike</span>
                        {sortBy === 'strike_price' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-400" /> : <ChevronDown className="w-3 h-3 text-blue-400" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-2">Expiry</th>
                    <th className="py-3 px-2 text-right">Lots</th>
                    <th className="py-3 px-2 text-right">Entry</th>
                    <th className="py-3 px-2 text-right">Exit</th>
                    <th
                      onClick={() => handleSort('gross_profit')}
                      className="py-3 px-3 text-right cursor-pointer select-none hover:text-white light:hover:text-slate-900 transition-colors"
                      title="Sort by Gross P/L"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Gross P/L</span>
                        {sortBy === 'gross_profit' && (
                          sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-400" /> : <ChevronDown className="w-3 h-3 text-blue-400" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-2 text-right">Charges</th>
                    <th
                      onClick={() => handleSort('net_pnl')}
                      className="py-3 px-3 text-right cursor-pointer select-none hover:text-white light:hover:text-slate-900 transition-colors"
                      title="Sort by Net P&L"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Net P&L</span>
                        {sortBy === 'net_pnl' ? (
                          sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-400" /> : <ChevronDown className="w-3 h-3 text-blue-400" />
                        ) : (
                          <ArrowUpDown className="w-2.5 h-2.5 text-slate-500 opacity-60" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-3">Strategy</th>
                    <th className="py-3 px-3 text-center">
                      {selectedRowIds.size > 0 ? (
                        <button
                          type="button"
                          onClick={() => setShowBulkDeleteModal(true)}
                          title={`Delete ${selectedRowIds.size} selected trades`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/40 text-[10px] font-semibold transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete ({selectedRowIds.size})</span>
                        </button>
                      ) : (
                        <span>Actions</span>
                      )}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#1e293b]/60 light:divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="15" className="py-12 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          <span>Loading trades...</span>
                        </div>
                      </td>
                    </tr>
                  ) : trades.length === 0 ? (
                    <tr>
                      <td colSpan="15" className="py-12 text-center text-slate-400">
                        No trades found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    trades.map((trade) => {
                      const netVal = parseFloat(trade.net_pnl);
                      const grossPnl = parseFloat(trade.gross_profit) - parseFloat(trade.gross_loss);
                      const isSelected = selectedTrade?.id === trade.id;
                      const tLegs = getLegPrices(trade);

                      return (
                        <tr
                          key={trade.id}
                          onClick={() => setSelectedTrade(trade)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-blue-600/10 light:bg-blue-50/60'
                              : 'hover:bg-[#162033]/60 light:hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-3.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedRowIds.has(trade.id)}
                              onChange={(e) => toggleSelectRow(trade.id, e)}
                              className="rounded bg-[#0e1626] border-[#1e293b] text-blue-600 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 light:text-slate-700 font-sans">
                            {formatDate(trade.trade_date)}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-white light:text-slate-900">
                            {trade.index_name}
                          </td>
                          <td className="py-2.5 px-2 text-slate-400 text-[11px]">
                            {trade.trading_type}
                          </td>
                          <td className="py-2.5 px-2">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                trade.option_type === 'CE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : trade.option_type === 'PE'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}
                            >
                              {trade.option_type}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 font-mono-numbers text-slate-300 light:text-slate-700">
                            {trade.strike_price ? Math.round(trade.strike_price) : '-'}
                          </td>
                          <td className="py-2.5 px-2 text-slate-400 text-[11px]">
                            {trade.expiry_date ? formatDate(trade.expiry_date) : '-'}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono-numbers text-slate-300 light:text-slate-700">
                            {trade.lots}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono-numbers text-slate-300 light:text-slate-700">
                            <div>{trade.entry_premium ? parseFloat(trade.entry_premium).toFixed(2) : '-'}</div>
                            {trade.option_type === 'Both' && (tLegs.ceEntry != null || tLegs.peEntry != null) && (
                              <div className="text-[9px] font-normal flex items-center justify-end gap-1 mt-0.5 whitespace-nowrap">
                                <span className="text-emerald-400 font-semibold">C:{tLegs.ceEntry != null ? Math.round(tLegs.ceEntry * 100) / 100 : '-'}</span>
                                <span className="text-rose-400 font-semibold">P:{tLegs.peEntry != null ? Math.round(tLegs.peEntry * 100) / 100 : '-'}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono-numbers text-slate-300 light:text-slate-700">
                            <div>{trade.exit_premium ? parseFloat(trade.exit_premium).toFixed(2) : '-'}</div>
                            {trade.option_type === 'Both' && (tLegs.ceExit != null || tLegs.peExit != null) && (
                              <div className="text-[9px] font-normal flex items-center justify-end gap-1 mt-0.5 whitespace-nowrap">
                                <span className="text-emerald-400 font-semibold">C:{tLegs.ceExit != null ? Math.round(tLegs.ceExit * 100) / 100 : '-'}</span>
                                <span className="text-rose-400 font-semibold">P:{tLegs.peExit != null ? Math.round(tLegs.peExit * 100) / 100 : '-'}</span>
                              </div>
                            )}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono-numbers font-semibold ${
                              grossPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {grossPnl >= 0 ? '+' : ''}
                            {formatINR(grossPnl)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono-numbers text-slate-400">
                            {formatINR(trade.total_charges)}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono-numbers font-bold ${
                              netVal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {netVal >= 0 ? '+' : ''}
                            {formatINR(netVal)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 light:text-slate-700 text-[11px]">
                            {trade.strategy_name}
                          </td>
                          <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => handleOpenEdit(trade, e)}
                                className="p-1 rounded hover:bg-[#1e293b] light:hover:bg-slate-200 text-slate-400 hover:text-blue-400 transition-colors"
                                title="Edit Trade"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTradeToDelete(trade);
                                }}
                                className="p-1 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
                                title="Delete Trade"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination & Results info */}
            <div className="p-3.5 border-t border-[#1e293b] light:border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-400 text-[11px]">
                Showing {trades.length > 0 ? (pagination.current_page - 1) * perPage + 1 : 0} to{' '}
                {Math.min(pagination.current_page * perPage, pagination.total)} of {pagination.total} trades
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.current_page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-slate-400 hover:text-white disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold ${
                      pagination.current_page === pg
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-[#0e1626] light:bg-slate-100 text-slate-400 hover:text-white border border-[#1e293b]'
                    }`}
                  >
                    {pg}
                  </button>
                ))}

                {pagination.last_page > 5 && (
                  <>
                    <span className="text-slate-500">...</span>
                    <button
                      onClick={() => setPage(pagination.last_page)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold ${
                        pagination.current_page === pagination.last_page
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#0e1626] light:bg-slate-100 text-slate-400 hover:text-white border border-[#1e293b]'
                      }`}
                    >
                      {pagination.last_page}
                    </button>
                  </>
                )}

                <button
                  disabled={pagination.current_page >= pagination.last_page}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-lg bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-slate-400 hover:text-white disabled:opacity-40"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="ml-2 px-2.5 py-1 rounded-lg bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-slate-300 light:text-slate-700 text-xs"
                >
                  <option value={10}>10 / page</option>
                  <option value={15}>15 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Trade Details Side Drawer (4 cols when open) */}
        {selectedTrade && (
          <div className="lg:col-span-4 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-xl p-5 space-y-4 lg:sticky lg:top-20">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#1e293b] light:border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedTrade(null)}
                  className="p-1 rounded-lg hover:bg-[#162033] text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-sm font-bold text-white light:text-slate-900">
                  Trade Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedTrade(null)}
                className="p-1 rounded-lg hover:bg-[#162033] text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 3 Drawer Tabs: Details / Charges / Journal */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#0e1626] light:bg-slate-100 rounded-xl border border-[#1e293b] text-xs">
              <button
                onClick={() => setDrawerTab('details')}
                className={`py-1.5 rounded-lg font-semibold transition-all ${
                  drawerTab === 'details'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setDrawerTab('charges')}
                className={`py-1.5 rounded-lg font-semibold transition-all ${
                  drawerTab === 'charges'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Charges
              </button>
              <button
                onClick={() => setDrawerTab('journal')}
                className={`py-1.5 rounded-lg font-semibold transition-all ${
                  drawerTab === 'journal'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Journal
              </button>
            </div>

            {/* Tab 1: Details */}
            {drawerTab === 'details' && (
              <div className="space-y-4 text-xs">
                {/* 2-column key/value grid */}
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-3 text-slate-400 pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Trade Date</span>
                    <span className="text-white light:text-slate-900 font-semibold">
                      {formatDate(selectedTrade.trade_date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Index</span>
                    <span className="text-white light:text-slate-900 font-semibold">
                      {selectedTrade.index_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Trading Type</span>
                    <span className="text-white light:text-slate-900 font-semibold">
                      {selectedTrade.trading_type}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Option Type</span>
                    <span className="text-blue-400 font-bold">
                      {selectedTrade.option_type}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Strike Price</span>
                    <span className="text-white light:text-slate-900 font-mono-numbers font-semibold">
                      {selectedTrade.strike_price ? Math.round(selectedTrade.strike_price) : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Expiry Date</span>
                    <span className="text-white light:text-slate-900 font-semibold">
                      {selectedTrade.expiry_date ? formatDate(selectedTrade.expiry_date) : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Lots</span>
                    <span className="text-white light:text-slate-900 font-mono-numbers font-semibold">
                      {selectedTrade.lots} ({selectedTrade.quantity} Qty)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Strategy</span>
                    <span className="text-white light:text-slate-900 font-semibold">
                      {selectedTrade.strategy_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Entry Premium</span>
                    <span className="text-white light:text-slate-900 font-mono-numbers font-semibold">
                      {selectedTrade.entry_premium ? formatINR(selectedTrade.entry_premium) : '-'}
                    </span>
                    {selectedTrade.option_type === 'Both' && (selLegs.ceEntry != null || selLegs.peEntry != null) && (
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono-numbers">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                          CE: ₹{selLegs.ceEntry != null ? selLegs.ceEntry : 0}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                          PE: ₹{selLegs.peEntry != null ? selLegs.peEntry : 0}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Exit Premium</span>
                    <span className="text-white light:text-slate-900 font-mono-numbers font-semibold">
                      {selectedTrade.exit_premium ? formatINR(selectedTrade.exit_premium) : '-'}
                    </span>
                    {selectedTrade.option_type === 'Both' && (selLegs.ceExit != null || selLegs.peExit != null) && (
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono-numbers">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                          CE: ₹{selLegs.ceExit != null ? selLegs.ceExit : 0}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                          PE: ₹{selLegs.peExit != null ? selLegs.peExit : 0}
                        </span>
                      </div>
                    )}
                  </div>
                  
                </div>

                {/* Dedicated Option Leg Breakdown Box for Both (Straddle / Strangle) */}
                {selectedTrade.option_type === 'Both' && (selLegs.ceEntry != null || selLegs.peEntry != null) && (
                  <div className="p-3.5 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-200 light:text-slate-800 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        Option Leg Breakdown
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase tracking-wider">
                        CE & PE Legs
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* CALL CE Box */}
                      <div className="p-2.5 rounded-xl bg-[#121b2d] light:bg-white border border-emerald-500/30 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            CALL (CE)
                          </span>
                          {selLegs.ceEntry != null && selLegs.ceExit != null && (
                            <span
                              className={`text-[10px] font-mono-numbers font-bold ${
                                selLegs.ceExit >= selLegs.ceEntry ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {selLegs.ceExit >= selLegs.ceEntry ? '+' : ''}
                              {(selLegs.ceExit - selLegs.ceEntry).toFixed(2)} pts
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-[11px] font-mono-numbers">
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Entry</span>
                            <span className="text-white light:text-slate-900 font-semibold">
                              ₹{selLegs.ceEntry != null ? selLegs.ceEntry.toFixed(2) : '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Exit</span>
                            <span className="text-white light:text-slate-900 font-semibold">
                              ₹{selLegs.ceExit != null ? selLegs.ceExit.toFixed(2) : '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* PUT PE Box */}
                      <div className="p-2.5 rounded-xl bg-[#121b2d] light:bg-white border border-rose-500/30 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            PUT (PE)
                          </span>
                          {selLegs.peEntry != null && selLegs.peExit != null && (
                            <span
                              className={`text-[10px] font-mono-numbers font-bold ${
                                selLegs.peExit >= selLegs.peEntry ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {selLegs.peExit >= selLegs.peEntry ? '+' : ''}
                              {(selLegs.peExit - selLegs.peEntry).toFixed(2)} pts
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-[11px] font-mono-numbers">
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Entry</span>
                            <span className="text-white light:text-slate-900 font-semibold">
                              ₹{selLegs.peEntry != null ? selLegs.peEntry.toFixed(2) : '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Exit</span>
                            <span className="text-white light:text-slate-900 font-semibold">
                              ₹{selLegs.peExit != null ? selLegs.peExit.toFixed(2) : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Financial Summary Box */}
                <div className="p-3.5 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Gross Profit</span>
                    <span className="font-bold text-emerald-400 font-mono-numbers">
                      {formatINR(selectedTrade.gross_profit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Gross Loss</span>
                    <span className="font-bold text-rose-400 font-mono-numbers">
                      {formatINR(selectedTrade.gross_loss)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Total Charges</span>
                    <span className="font-semibold text-slate-300 light:text-slate-700 font-mono-numbers">
                      {formatINR(selectedTrade.total_charges)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[#1e293b] light:border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-200 light:text-slate-800">Net P&L</span>
                    <span
                      className={`text-lg font-black font-mono-numbers ${
                        parseFloat(selectedTrade.net_pnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {parseFloat(selectedTrade.net_pnl) >= 0 ? '+' : ''}
                      {formatINR(selectedTrade.net_pnl)}
                    </span>
                  </div>
                </div>

                {/* Reasons & Notes */}
                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Entry Reason</span>
                    <p className="text-slate-300 light:text-slate-700 font-medium">
                      {selectedTrade.entry_reason || 'Breakout above range'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Exit Reason</span>
                    <p className="text-slate-300 light:text-slate-700 font-medium">
                      {selectedTrade.exit_reason || 'Booked profit at target'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Notes</span>
                    <p className="text-slate-300 light:text-slate-700 text-[11px]">
                      {selectedTrade.notes || 'Good entry timing. Exited at planned target.'}
                    </p>
                  </div>
                </div>

                {/* Multiple Screenshots Gallery in Drawer */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Chart Screenshots
                      </span>
                      {getTradeScreenshots(selectedTrade).length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold">
                          {getTradeScreenshots(selectedTrade).length}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={uploadingDrawerScreenshot}
                      onClick={() => drawerFileInputRef.current?.click()}
                      className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{uploadingDrawerScreenshot ? 'Uploading...' : 'Add Images'}</span>
                    </button>
                  </div>

                  <input
                    type="file"
                    ref={drawerFileInputRef}
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleDrawerScreenshotUpload}
                    className="hidden"
                  />

                  {getTradeScreenshots(selectedTrade).length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {getTradeScreenshots(selectedTrade).map((shot, idx, arr) => (
                        <div
                          key={shot.id || idx}
                          className="group relative h-24 rounded-2xl bg-[#0e1626] border border-[#1e293b] overflow-hidden hover:border-blue-500/50 transition-colors shadow-sm"
                        >
                          <img
                            src={shot.url}
                            alt={shot.filename || `Screenshot ${idx + 1}`}
                            onClick={() => openLightbox(arr, idx)}
                            className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-200"
                          />
                          <div
                            onClick={() => openLightbox(arr, idx)}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-[11px] font-medium cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Enlarge</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDrawerDeleteSingleScreenshot(shot.id);
                            }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600/90 hover:bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remove image"
                          >
                            ✕
                          </button>
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[8px] font-bold text-slate-300">
                            #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      onClick={() => drawerFileInputRef.current?.click()}
                      className="h-24 w-full rounded-2xl bg-[#0e1626] border border-dashed border-[#1e293b] hover:border-blue-500/50 flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-blue-400 cursor-pointer transition-colors p-2 text-center"
                    >
                      <Upload className="w-5 h-5 text-slate-500" />
                      <span className="text-[11px] font-medium">
                        {uploadingDrawerScreenshot ? 'Uploading...' : 'Click to upload chart screenshots (multiple)'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons in Drawer */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={(e) => handleOpenEdit(selectedTrade, e)}
                    className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shadow-md shadow-blue-600/20"
                  >
                    Edit Trade
                  </button>
                  <button
                    type="button"
                    onClick={() => setTradeToDelete(selectedTrade)}
                    className="py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs transition-colors"
                  >
                    Delete Trade
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Charges */}
            {drawerTab === 'charges' && (
              <div className="space-y-3 text-xs divide-y divide-[#1e293b]/60">
                <div className="py-2 flex justify-between text-slate-400">
                  <span>Brokerage</span>
                  <span className="text-white font-mono-numbers">{formatINR(selectedTrade.brokerage || 40)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-400">
                  <span>STT / CTT</span>
                  <span className="text-white font-mono-numbers">{formatINR(selectedTrade.stt || 15)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-400">
                  <span>Exchange Txn Charges</span>
                  <span className="text-white font-mono-numbers">{formatINR(selectedTrade.exchange_charges || 12)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-400">
                  <span>GST (18%)</span>
                  <span className="text-white font-mono-numbers">{formatINR(selectedTrade.gst || 9.5)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-400">
                  <span>SEBI Charges</span>
                  <span className="text-white font-mono-numbers">{formatINR(selectedTrade.sebi_charges || 0.5)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-400">
                  <span>Stamp Duty</span>
                  <span className="text-white font-mono-numbers">{formatINR(selectedTrade.stamp_duty || 0)}</span>
                </div>
                <div className="py-2 flex justify-between text-slate-400">
                  <span>Other Charges</span>
                  <span className="text-white font-mono-numbers">{formatINR(selectedTrade.other_charges || 0)}</span>
                </div>
                <div className="py-2.5 flex justify-between font-bold text-white pt-2 border-t border-[#1e293b]">
                  <span>Total Charges</span>
                  <span className="text-cyan-400 font-mono-numbers">{formatINR(selectedTrade.total_charges)}</span>
                </div>
              </div>
            )}

            {/* Tab 3: Journal */}
            {drawerTab === 'journal' && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-[#0e1626] border border-[#1e293b]">
                  <span className="text-[10px] text-slate-500 block mb-0.5">Market Conditions</span>
                  <span className="text-slate-300 font-medium">
                    {selectedTrade.journal?.market_conditions || selectedTrade.market_conditions || 'Rangebound with low IV'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#0e1626] border border-[#1e293b]">
                  <span className="text-[10px] text-slate-500 block mb-0.5">Trade Setup</span>
                  <span className="text-slate-300 font-medium">
                    {selectedTrade.journal?.trade_setup || 'Long Straddle before expiry event'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#0e1626] border border-[#1e293b]">
                  <span className="text-[10px] text-emerald-400 block mb-0.5">What Went Right?</span>
                  <span className="text-slate-300">
                    {selectedTrade.journal?.what_went_right || 'Perfect timing on premium expansion'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#0e1626] border border-[#1e293b]">
                  <span className="text-[10px] text-rose-400 block mb-0.5">What Went Wrong / Mistakes</span>
                  <span className="text-slate-300">
                    {selectedTrade.journal?.what_went_wrong || selectedTrade.journal?.mistakes_made || 'Exited 15 minutes before peak target'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Bottom Section: Performance Breakdown & Recent Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Performance Breakdown (7 cols) */}
        <div className="lg:col-span-7 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Performance Breakdown
            </h2>

            {/* Segmented Tabs: Index / Option Type / Trading Type / Strategy */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-xs overflow-x-auto no-scrollbar">
              {['Index', 'Option Type', 'Trading Type', 'Strategy'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setBreakdownTab(tab)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                    breakdownTab === tab
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white light:hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-slate-300 light:text-slate-700">Profit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-300 light:text-slate-700">Loss</span>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdownData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}K`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0e1626',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#fff',
                  }}
                  formatter={(val, name) => [`₹${val}K`, name === 'profit' ? 'Profit' : 'Loss']}
                />
                <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
                <Bar dataKey="loss" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Recent Trades Compact Table (5 cols) */}
        <div className="lg:col-span-5 p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e293b] light:border-slate-200">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Recent Trades
            </h2>
            <button
              onClick={() => {
                setSelectedIndex('ALL');
                setSelectedOption('ALL');
                setPage(1);
              }}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
            >
              View All
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[10px] text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-2">Date</th>
                  <th className="py-2">Index</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">CE/PE</th>
                  <th className="py-2 text-right">Net P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/60 light:divide-slate-100">
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-slate-500 text-xs">
                      No trades recorded yet.
                    </td>
                  </tr>
                ) : (
                  trades.slice(0, 5).map((t) => {
                  const net = parseFloat(t.net_pnl);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTrade(t)}
                      className="cursor-pointer hover:bg-[#162033]/60 transition-colors"
                    >
                      <td className="py-2.5 text-slate-300 light:text-slate-700">
                        {formatDate(t.trade_date)}
                      </td>
                      <td className="py-2.5 font-semibold text-white light:text-slate-900">
                        {t.index_name}
                      </td>
                      <td className="py-2.5 text-slate-400 text-[11px]">
                        {t.trading_type}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            t.option_type === 'CE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : t.option_type === 'PE'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {t.option_type}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 text-right font-mono-numbers font-bold ${
                          net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {net >= 0 ? '+' : ''}
                        {formatINR(net)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {tradeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-2xl bg-rose-500/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white light:text-slate-900">
                Delete Trade Record?
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to permanently delete this trade record for{' '}
              <strong className="text-white light:text-slate-900">
                {tradeToDelete.index_name} {tradeToDelete.option_type} ({formatDate(tradeToDelete.trade_date)})
              </strong>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTradeToDelete(null)}
                className="px-4 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 text-xs font-semibold text-slate-300 light:text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTrade}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-2xl bg-rose-500/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white light:text-slate-900">
                Delete {selectedRowIds.size} Trades?
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-white light:text-slate-900">
                {selectedRowIds.size} selected trade record{selectedRowIds.size > 1 ? 's' : ''}
              </strong>
              ? All associated screenshots and journal reflections will also be permanently deleted from the database. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deletingBulk}
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 text-xs font-semibold text-slate-300 light:text-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingBulk}
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 transition-all disabled:opacity-50"
              >
                {deletingBulk ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Action Bar for Bulk Selection */}
      {selectedRowIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-2.5 bg-[#121b2d]/95 light:bg-white/95 backdrop-blur-md border border-blue-500/40 light:border-blue-300 rounded-full shadow-2xl shadow-black/60 text-xs animate-fadeIn">
          <div className="flex items-center gap-2 pr-2 border-r border-slate-700 light:border-slate-300">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[11px]">
              {selectedRowIds.size}
            </span>
            <span className="text-white light:text-slate-900 font-medium whitespace-nowrap">
              Selected
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedRowIds(new Set())}
            className="text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900 text-xs font-medium px-2 py-1"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setShowBulkDeleteModal(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete ({selectedRowIds.size})</span>
          </button>
        </div>
      )}

      {/* Edit Trade Modal - Comprehensive with all tabs */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 md:p-6 max-w-3xl w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
              <div>
                <h3 className="text-base md:text-lg font-bold text-white light:text-slate-900 flex items-center gap-2">
                  <span>Edit Trade Record</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono-numbers">
                    #{editForm.id}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Update trade parameters, P&L charges, and journal reflections
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-lg hover:bg-[#162033] text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 3 Navigation Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#0e1626] light:bg-slate-100 rounded-2xl border border-[#1e293b] text-xs">
              <button
                type="button"
                onClick={() => setEditModalTab('details')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-semibold transition-all ${
                  editModalTab === 'details'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Trade Details</span>
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('charges')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-semibold transition-all ${
                  editModalTab === 'charges'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>P&L & Charges</span>
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('journal')}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-semibold transition-all ${
                  editModalTab === 'journal'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Strategy & Journal</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* TAB 1: TRADE DETAILS */}
              {editModalTab === 'details' && (
                <div className="space-y-3.5">
                  {/* Row 1: Trade Date, Index, Trading Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Trade Date *</label>
                      <input
                        type="date"
                        required
                        value={editForm.trade_date || ''}
                        onChange={(e) => setEditForm({ ...editForm, trade_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Index *</label>
                      <select
                        value={editForm.index_name || 'NIFTY'}
                        onChange={(e) => {
                          const newIndex = e.target.value;
                          const ls = getLotSize(newIndex);
                          const currentLots = parseInt(editForm.lots, 10) || 1;
                          setEditForm({
                            ...editForm,
                            index_name: newIndex,
                            quantity: (currentLots * ls).toString(),
                          });
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white focus:outline-none focus:border-blue-500"
                      >
                        {Object.keys(lotSizes)
                          .filter((idx) => idx !== 'BANK NIFTY')
                          .map((idx) => (
                            <option key={idx} value={idx}>
                              {idx === 'STOCK' ? 'Individual Stock' : idx} (Lot: {lotSizes[idx]})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Trading Type *</label>
                      <select
                        value={editForm.trading_type || 'Intraday'}
                        onChange={(e) => setEditForm({ ...editForm, trading_type: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="Intraday">Intraday</option>
                        <option value="BTST">BTST</option>
                        <option value="Overnight">Overnight</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Option Type, Strike Price, Expiry Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Option Type *</label>
                      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#0e1626] border border-[#1e293b]">
                        {['CE', 'PE', 'Both'].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setEditForm((prev) => {
                                const next = { ...prev, option_type: opt };
                                if (opt === 'Both') {
                                  if (!next.ce_entry_price && !next.pe_entry_price && parseFloat(next.entry_premium) > 0) {
                                    const total = parseFloat(next.entry_premium);
                                    const half = Math.floor(total / 2);
                                    next.ce_entry_price = half.toString();
                                    next.pe_entry_price = (total - half).toFixed(2);
                                  }
                                  if (!next.ce_exit_price && !next.pe_exit_price && parseFloat(next.exit_premium) > 0) {
                                    const total = parseFloat(next.exit_premium);
                                    const half = Math.floor(total / 2);
                                    next.ce_exit_price = half.toString();
                                    next.pe_exit_price = (total - half).toFixed(2);
                                  }
                                }
                                return next;
                              });
                            }}
                            className={`py-1 text-xs font-semibold rounded-lg transition-all ${
                              editForm.option_type === opt
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Strike Price</label>
                      <input
                        type="number"
                        step="50"
                        placeholder="25000"
                        value={editForm.strike_price || ''}
                        onChange={(e) => setEditForm({ ...editForm, strike_price: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Expiry Date</label>
                      <input
                        type="date"
                        value={editForm.expiry_date || ''}
                        onChange={(e) => setEditForm({ ...editForm, expiry_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Row 3: Entry Premium, Exit Premium, Quantity */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {editForm.option_type === 'Both' ? (
                      <>
                        {/* Both: CE & PE Entry Prices */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-slate-400 font-medium">Entry Premium</label>
                            <span className="text-[10px] text-blue-400 font-mono-numbers font-semibold">
                              Total: ₹{editForm.entry_premium || '0.00'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="relative">
                              <input
                                type="number"
                                step="0.05"
                                placeholder="CE Entry"
                                value={editForm.ce_entry_price || ''}
                                onChange={(e) => {
                                  const ce = parseFloat(e.target.value) || 0;
                                  const pe = parseFloat(editForm.pe_entry_price) || 0;
                                  setEditForm({
                                    ...editForm,
                                    ce_entry_price: e.target.value,
                                    entry_premium: (ce + pe).toFixed(2),
                                  });
                                }}
                                className="w-full pl-2.5 pr-7 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers text-xs"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-400 pointer-events-none">
                                CE
                              </span>
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.05"
                                placeholder="PE Entry"
                                value={editForm.pe_entry_price || ''}
                                onChange={(e) => {
                                  const ce = parseFloat(editForm.ce_entry_price) || 0;
                                  const pe = parseFloat(e.target.value) || 0;
                                  setEditForm({
                                    ...editForm,
                                    pe_entry_price: e.target.value,
                                    entry_premium: (ce + pe).toFixed(2),
                                  });
                                }}
                                className="w-full pl-2.5 pr-7 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers text-xs"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-400 pointer-events-none">
                                PE
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Both: CE & PE Exit Prices */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-slate-400 font-medium">Exit Premium</label>
                            <span className="text-[10px] text-blue-400 font-mono-numbers font-semibold">
                              Total: ₹{editForm.exit_premium || '0.00'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div className="relative">
                              <input
                                type="number"
                                step="0.05"
                                placeholder="CE Exit"
                                value={editForm.ce_exit_price || ''}
                                onChange={(e) => {
                                  const ce = parseFloat(e.target.value) || 0;
                                  const pe = parseFloat(editForm.pe_exit_price) || 0;
                                  setEditForm({
                                    ...editForm,
                                    ce_exit_price: e.target.value,
                                    exit_premium: (ce + pe).toFixed(2),
                                  });
                                }}
                                className="w-full pl-2.5 pr-7 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers text-xs"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-400 pointer-events-none">
                                CE
                              </span>
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.05"
                                placeholder="PE Exit"
                                value={editForm.pe_exit_price || ''}
                                onChange={(e) => {
                                  const ce = parseFloat(editForm.ce_exit_price) || 0;
                                  const pe = parseFloat(e.target.value) || 0;
                                  setEditForm({
                                    ...editForm,
                                    pe_exit_price: e.target.value,
                                    exit_premium: (ce + pe).toFixed(2),
                                  });
                                }}
                                className="w-full pl-2.5 pr-7 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers text-xs"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-400 pointer-events-none">
                                PE
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-slate-400 mb-1 font-medium">Entry Premium</label>
                          <input
                            type="number"
                            step="0.05"
                            placeholder="123.00"
                            value={editForm.entry_premium || ''}
                            onChange={(e) => setEditForm({ ...editForm, entry_premium: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1 font-medium">Exit Premium</label>
                          <input
                            type="number"
                            step="0.05"
                            placeholder="156.00"
                            value={editForm.exit_premium || ''}
                            onChange={(e) => setEditForm({ ...editForm, exit_premium: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Quantity (Shares)</label>
                      <input
                        type="number"
                        placeholder="50"
                        value={editForm.quantity || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const numQty = parseInt(val, 10) || 0;
                          const ls = getLotSize(editForm.index_name || 'NIFTY');
                          const calcLots = Math.max(1, Math.round(numQty / ls));
                          setEditForm({
                            ...editForm,
                            quantity: val,
                            lots: calcLots.toString(),
                          });
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Row 4: Lots, Strategy Name, Market Condition */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-400 font-medium">Number of Lots</label>
                        <span className="text-[10px] text-slate-500 font-mono-numbers">
                          Lot size: {getLotSize(editForm.index_name || 'NIFTY')}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={editForm.lots || 1}
                        onChange={(e) => {
                          const val = e.target.value;
                          const l = parseInt(val, 10) || 1;
                          const ls = getLotSize(editForm.index_name || 'NIFTY');
                          setEditForm({
                            ...editForm,
                            lots: val,
                            quantity: (l * ls).toString(),
                          });
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Strategy Name</label>
                      <select
                        value={editForm.strategy_name || 'Long Straddle'}
                        onChange={(e) => setEditForm({ ...editForm, strategy_name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="Long Straddle">Long Straddle</option>
                        <option value="Long Strangle">Long Strangle</option>
                        <option value="Directional CE">Directional CE</option>
                        <option value="Directional PE">Directional PE</option>
                        <option value="Bull Call Spread">Bull Call Spread</option>
                        <option value="Bear Put Spread">Bear Put Spread</option>
                        <option value="Iron Condor">Iron Condor</option>
                        <option value="Short Straddle">Short Straddle</option>
                        <option value="Short Strangle">Short Strangle</option>
                        <option value="BTST">BTST</option>
                        <option value="Intraday Options">Intraday Options</option>
                        <option value="CUSTOM">Custom Strategy...</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Market Condition</label>
                      <select
                        value={editForm.market_conditions || 'Rangebound'}
                        onChange={(e) => setEditForm({ ...editForm, market_conditions: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="Rangebound">Rangebound</option>
                        <option value="Bullish Trend">Bullish Trend</option>
                        <option value="Bearish Trend">Bearish Trend</option>
                        <option value="High Volatility">High Volatility</option>
                        <option value="Consolidation">Consolidation</option>
                        <option value="Expiry Day Volatility">Expiry Day Volatility</option>
                      </select>
                    </div>
                  </div>

                  {editForm.strategy_name === 'CUSTOM' && (
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Custom Strategy Name</label>
                      <input
                        type="text"
                        placeholder="Enter custom strategy name"
                        value={editForm.custom_strategy || ''}
                        onChange={(e) => setEditForm({ ...editForm, custom_strategy: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: P&L & CHARGES */}
              {editModalTab === 'charges' && (
                <div className="space-y-3.5">
                  {/* Row 1: Gross Profit, Gross Loss, Total Charges, Auto Calculate */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-3">
                      <label className="block text-slate-400 mb-1 font-medium">Gross Profit</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editComputedGrossProfit}
                        onChange={(e) => setEditForm({ ...editForm, gross_profit: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-emerald-500/40 text-emerald-400 font-mono-numbers font-semibold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-slate-400 mb-1 font-medium">Gross Loss</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editComputedGrossLoss}
                        onChange={(e) => setEditForm({ ...editForm, gross_loss: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-rose-400 font-mono-numbers focus:outline-none focus:border-rose-500"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-slate-400 mb-1 font-medium">Total Charges</label>
                      <input
                        type="number"
                        step="0.01"
                        readOnly
                        value={editComputedTotalCharges}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-slate-300 font-mono-numbers focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <button
                        type="button"
                        onClick={handleEditAutoCalculate}
                        className="w-full px-3 py-2 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Auto Calculate</span>
                      </button>
                    </div>
                  </div>

                  {/* Charges Breakdown 4-col */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px]">Brokerage</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.brokerage ?? '40.00'}
                        onChange={(e) => setEditForm({ ...editForm, brokerage: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px]">STT / CTT</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.stt ?? '0.00'}
                        onChange={(e) => setEditForm({ ...editForm, stt: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px]">Exchange Charges</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.exchange_charges ?? '0.00'}
                        onChange={(e) => setEditForm({ ...editForm, exchange_charges: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px]">GST (18%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.gst ?? '0.00'}
                        onChange={(e) => setEditForm({ ...editForm, gst: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers text-xs"
                      />
                    </div>
                  </div>

                  {/* Charges Breakdown 3-col */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px]">SEBI Charges</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.sebi_charges ?? '0.00'}
                        onChange={(e) => setEditForm({ ...editForm, sebi_charges: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px]">Stamp Duty</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.stamp_duty ?? '0.00'}
                        onChange={(e) => setEditForm({ ...editForm, stamp_duty: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px]">Other Charges</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.other_charges ?? '0.00'}
                        onChange={(e) => setEditForm({ ...editForm, other_charges: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers text-xs"
                      />
                    </div>
                  </div>

                  {/* Net P&L Box */}
                  <div className="p-3.5 rounded-2xl bg-[#0e1626] border border-[#1e293b] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Net P&L</span>
                      <span className="text-[10px] text-slate-400">Gross Profit - Gross Loss - Total Charges</span>
                    </div>
                    <span
                      className={`text-xl font-black font-mono-numbers ${
                        parseFloat(editComputedNetPnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {parseFloat(editComputedNetPnl) >= 0 ? '+' : ''}
                      {formatINR(editComputedNetPnl)}
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 3: STRATEGY & JOURNAL */}
              {editModalTab === 'journal' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Entry Reason</label>
                      <input
                        type="text"
                        placeholder="Breakout above resistance"
                        value={editForm.entry_reason || ''}
                        onChange={(e) => setEditForm({ ...editForm, entry_reason: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Exit Reason</label>
                      <input
                        type="text"
                        placeholder="Booked profit at target"
                        value={editForm.exit_reason || ''}
                        onChange={(e) => setEditForm({ ...editForm, exit_reason: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Trade Setup</label>
                      <input
                        type="text"
                        placeholder="Long Straddle before event"
                        value={editForm.trade_setup || ''}
                        onChange={(e) => setEditForm({ ...editForm, trade_setup: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">What Went Right?</label>
                      <input
                        type="text"
                        placeholder="Good entry timing"
                        value={editForm.what_went_right || ''}
                        onChange={(e) => setEditForm({ ...editForm, what_went_right: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">What Went Wrong?</label>
                      <input
                        type="text"
                        placeholder="Exited early"
                        value={editForm.what_went_wrong || ''}
                        onChange={(e) => setEditForm({ ...editForm, what_went_wrong: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Mistakes Made</label>
                      <input
                        type="text"
                        placeholder="Could have held longer"
                        value={editForm.mistakes_made || ''}
                        onChange={(e) => setEditForm({ ...editForm, mistakes_made: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Lessons Learned</label>
                      <input
                        type="text"
                        placeholder="Be patient with targets"
                        value={editForm.lessons_learned || ''}
                        onChange={(e) => setEditForm({ ...editForm, lessons_learned: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Personal Notes</label>
                      <input
                        type="text"
                        placeholder="Any personal reflections..."
                        value={editForm.personal_notes || ''}
                        onChange={(e) => setEditForm({ ...editForm, personal_notes: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Multiple Screenshots Section in Edit Modal */}
                  <div className="pt-2 border-t border-[#1e293b]/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <label className="text-slate-400 font-semibold block text-xs">
                          Chart Screenshots
                        </label>
                        {(editExistingScreenshots.length + editStagedNewFiles.length) > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold">
                            {editExistingScreenshots.length + editStagedNewFiles.length}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">PNG, JPG, WebP up to 10MB each</span>
                    </div>

                    <input
                      type="file"
                      ref={editFileInputRef}
                      multiple
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleEditAddFiles}
                      className="hidden"
                    />

                    {/* Add More Bar */}
                    <div
                      onClick={() => editFileInputRef.current?.click()}
                      className="p-3.5 rounded-2xl border-2 border-dashed border-[#1e293b] hover:border-blue-500/50 bg-[#0e1626]/50 flex flex-col sm:flex-row items-center justify-between gap-3 cursor-pointer transition-colors text-center sm:text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center flex-shrink-0">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-white block">
                            {(editExistingScreenshots.length + editStagedNewFiles.length) > 0
                              ? 'Add More Chart Screenshots'
                              : 'Upload Trade Screenshots'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Select one or multiple images
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          editFileInputRef.current?.click();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#162033] hover:bg-blue-600 text-slate-300 hover:text-white text-xs font-medium transition-colors"
                      >
                        + Browse Images
                      </button>
                    </div>

                    {/* Grid of Screenshots (Existing + Staged New) */}
                    {(editExistingScreenshots.length > 0 || editStagedNewFiles.length > 0) && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                        {/* Existing Saved Screenshots */}
                        {editExistingScreenshots.map((shot, idx) => (
                          <div
                            key={`existing-${shot.id || idx}`}
                            className="group relative rounded-xl border border-[#1e293b] bg-[#0e1626] overflow-hidden shadow-sm hover:border-blue-500/40 transition-colors"
                          >
                            <div
                              className="h-24 w-full cursor-pointer overflow-hidden"
                              onClick={() => openLightbox(editExistingScreenshots, idx)}
                            >
                              <img
                                src={shot.url}
                                alt={shot.filename}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            </div>
                            <div className="p-1.5 bg-[#0a0f1d] border-t border-[#1e293b] flex items-center justify-between text-[10px]">
                              <span className="text-slate-400 truncate max-w-[90px]" title={shot.filename}>
                                {shot.filename}
                              </span>
                              <span className="px-1 py-0.2 rounded text-[8px] bg-slate-800 text-slate-400 font-medium">
                                Saved
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingScreenshot(shot.id, idx)}
                              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md transition-transform hover:scale-110"
                              title="Delete screenshot"
                            >
                              ✕
                            </button>
                          </div>
                        ))}

                        {/* Staged New Screenshots */}
                        {editStagedNewFiles.map((staged) => (
                          <div
                            key={`new-${staged.id}`}
                            className="group relative rounded-xl border border-emerald-500/40 bg-[#0e1626] overflow-hidden shadow-sm"
                          >
                            <div
                              className="h-24 w-full cursor-pointer overflow-hidden"
                              onClick={() => openLightbox([staged.preview], 0)}
                            >
                              <img
                                src={staged.preview}
                                alt={staged.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            </div>
                            <div className="p-1.5 bg-[#0a0f1d] border-t border-[#1e293b] flex items-center justify-between text-[10px]">
                              <span className="text-slate-300 truncate max-w-[80px]" title={staged.name}>
                                {staged.name}
                              </span>
                              <span className="px-1 py-0.2 rounded text-[8px] bg-emerald-500/20 text-emerald-400 font-bold">
                                New
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveStagedNewFile(staged.id)}
                              className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md transition-transform hover:scale-110"
                              title="Remove new file"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-[#1e293b]">
                <div className="flex items-center gap-2">
                  {editModalTab !== 'details' && (
                    <button
                      type="button"
                      onClick={() => setEditModalTab(editModalTab === 'journal' ? 'charges' : 'details')}
                      className="px-3.5 py-2 rounded-xl bg-[#0e1626] hover:bg-[#162033] text-slate-300 transition-colors font-medium text-xs"
                    >
                      ← Previous
                    </button>
                  )}
                  {editModalTab !== 'journal' && (
                    <button
                      type="button"
                      onClick={() => setEditModalTab(editModalTab === 'details' ? 'charges' : 'journal')}
                      className="px-3.5 py-2 rounded-xl bg-[#0e1626] hover:bg-[#162033] text-slate-300 transition-colors font-medium text-xs"
                    >
                      Next →
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 rounded-xl bg-[#0e1626] hover:bg-[#162033] text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md shadow-blue-600/30 disabled:opacity-50"
                  >
                    {savingEdit ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Size Screenshot Modal (Multi-Image Lightbox) */}
      {lightboxState.isOpen && lightboxState.images.length > 0 && (
        <div
          onClick={closeLightbox}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md animate-fadeIn cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl w-full max-h-[92vh] bg-[#121b2d] border border-[#1e293b] rounded-3xl p-3 sm:p-4 shadow-2xl overflow-hidden flex flex-col items-center"
          >
            {/* Header */}
            <div className="w-full flex items-center justify-between px-3 py-2 border-b border-[#1e293b] text-slate-300 text-xs">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-white">
                  {lightboxState.images[lightboxState.currentIndex]?.filename || 'Trade Chart Screenshot'}
                </span>
                {lightboxState.images.length > 1 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 text-[10px] font-bold">
                    {lightboxState.currentIndex + 1} of {lightboxState.images.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={closeLightbox}
                className="p-1.5 rounded-xl hover:bg-[#1e293b] text-slate-400 hover:text-white transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Image with Navigation Arrows */}
            <div className="relative w-full flex-1 min-h-[300px] max-h-[70vh] flex items-center justify-center p-2 overflow-hidden">
              <img
                src={lightboxState.images[lightboxState.currentIndex]?.url}
                alt={lightboxState.images[lightboxState.currentIndex]?.filename || 'Enlarged chart'}
                className="max-h-[68vh] max-w-full rounded-2xl object-contain shadow-xl"
              />

              {/* Prev Button */}
              {lightboxState.images.length > 1 && (
                <button
                  type="button"
                  onClick={prevLightboxImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-blue-600 text-white flex items-center justify-center shadow-lg transition-colors border border-white/10"
                  title="Previous image (←)"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Next Button */}
              {lightboxState.images.length > 1 && (
                <button
                  type="button"
                  onClick={nextLightboxImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-blue-600 text-white flex items-center justify-center shadow-lg transition-colors border border-white/10"
                  title="Next image (→)"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Filmstrip of Thumbnails (if multiple images) */}
            {lightboxState.images.length > 1 && (
              <div className="w-full flex items-center justify-center gap-2 pt-2 border-t border-[#1e293b] overflow-x-auto px-2">
                {lightboxState.images.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setLightboxState((prev) => ({ ...prev, currentIndex: idx }))}
                    className={`relative w-14 h-11 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                      idx === lightboxState.currentIndex
                        ? 'border-blue-500 scale-105 shadow-md shadow-blue-500/30'
                        : 'border-[#1e293b] opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onImportSuccess={() => {
          fetchTrades();
          fetchStats();
        }}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        initialFilter={filter}
        initialFromDate={customFrom}
        initialToDate={customTo}
        initialIndex={selectedIndex}
        initialTradingType={selectedTradingType}
        initialOptionType={selectedOption}
        initialStrategy={selectedStrategy}
        lotSizes={lotSizes}
        tradeIndices={tradeIndices}
        tradeTradingTypes={tradeTradingTypes}
        tradeOptionTypes={tradeOptionTypes}
        tradeStrategies={tradeStrategies}
      />
    </div>
  );
}
