import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  FileText,
  Receipt,
  BookOpen,
  Camera,
  RotateCw,
  Trash2,
  Upload,
  AlertCircle,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import api from '../../api/client';
import { useLotSizes } from '../../context/LotSizeContext';
import { useToast } from '../../context/ToastContext';
import { useBrokerage } from '../../context/BrokerageContext';
import { useDropdown } from '../../context/DropdownContext';
import { useTheme } from '../../context/ThemeContext';
import { formatINR } from '../../utils/formatters';
import OptionChainModal from './OptionChainModal';

const getLegPrices = (trade) => {
  if (!trade) return { ceEntry: null, peEntry: null, ceExit: null, peExit: null };
  let ceEntry = trade.ce_entry_price != null ? parseFloat(trade.ce_entry_price) : null;
  let peEntry = trade.pe_entry_price != null ? parseFloat(trade.pe_entry_price) : null;
  let ceExit = trade.ce_exit_price != null ? parseFloat(trade.ce_exit_price) : null;
  let peExit = trade.pe_exit_price != null ? parseFloat(trade.pe_exit_price) : null;

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

export default function EditTradeModal({ trade, isOpen, onClose, onSaved }) {
  const { isKite } = useTheme();
  const { getLotSize, lotSizes } = useLotSizes();
  const { showToast } = useToast();
  const { calculateCharges } = useBrokerage();
  const { getActiveOptions } = useDropdown();

  const activeIndices = useMemo(() => getActiveOptions('add-trade', 'index_name'), [getActiveOptions]);
  const activeTradingTypes = useMemo(() => getActiveOptions('add-trade', 'trading_type'), [getActiveOptions]);
  const activeOptionTypes = useMemo(() => getActiveOptions('add-trade', 'option_type'), [getActiveOptions]);
  const activeStrategies = useMemo(() => getActiveOptions('add-trade', 'strategy_name'), [getActiveOptions]);
  const activeMarketConditions = useMemo(() => getActiveOptions('add-trade', 'market_conditions'), [getActiveOptions]);

  const [modalTab, setModalTab] = useState('details'); // 'details' | 'charges' | 'journal' | 'screenshots'
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [existingScreenshots, setExistingScreenshots] = useState([]);
  const [deletedScreenshotIds, setDeletedScreenshotIds] = useState([]);
  const [stagedNewFiles, setStagedNewFiles] = useState([]);
  const [showOptionChainModal, setShowOptionChainModal] = useState(false);
  const fileInputRef = useRef(null);

  const blockNegativeKeys = (e) => {
    if (e.key === '-' || e.key === 'Minus' || e.key === 'e' || e.key === 'E' || e.key === '+') {
      e.preventDefault();
    }
  };

  const handleEditFieldChange = (name, value) => {
    let cleanVal = value;
    const nonNegNumeric = [
      'strike_price', 'entry_premium', 'exit_premium', 'gross_profit', 'gross_loss',
      'brokerage', 'stt', 'exchange_charges', 'gst', 'sebi_charges', 'stamp_duty',
      'other_charges', 'ce_entry_price', 'pe_entry_price', 'ce_exit_price', 'pe_exit_price'
    ];
    if (nonNegNumeric.includes(name)) {
      cleanVal = value.replace(/-/g, '').replace(/[^0-9.]/g, '');
      const parts = cleanVal.split('.');
      if (parts.length > 2) cleanVal = parts[0] + '.' + parts.slice(1).join('');
    }
    setEditForm((prev) => ({ ...prev, [name]: cleanVal }));
  };

  const handleEditLotsChange = (value) => {
    let raw = value.replace(/[^0-9]/g, '');
    if (raw === '') {
      setEditForm((prev) => ({ ...prev, lots: '', quantity: '0' }));
      return;
    }
    const numLots = Math.max(1, Math.abs(parseInt(raw, 10) || 1));
    const lotSize = getLotSize(editForm.index_name || 'NIFTY');
    setEditForm((prev) => ({
      ...prev,
      lots: numLots.toString(),
      quantity: (numLots * lotSize).toString(),
    }));
  };

  const handleEditQuantityChange = (value) => {
    let raw = value.replace(/[^0-9]/g, '');
    if (raw === '') {
      setEditForm((prev) => ({ ...prev, quantity: '', lots: '1' }));
      return;
    }
    const numQty = Math.max(1, Math.abs(parseInt(raw, 10) || 1));
    const lotSize = getLotSize(editForm.index_name || 'NIFTY');
    const calcLots = Math.max(1, Math.round(numQty / lotSize));
    setEditForm((prev) => ({
      ...prev,
      quantity: numQty.toString(),
      lots: calcLots.toString(),
    }));
  };

  const handleSelectOptionFromChain = (opt) => {
    if (!opt) return;
    const newLotSize = getLotSize(opt.index_name) || opt.lot_size || 50;
    const curLots = Math.max(1, Math.abs(parseInt(editForm.lots, 10) || 1));
    const newQty = curLots * newLotSize;
    const isBoth = opt.option_type === 'Both';

    setEditForm((prev) => {
      const cePrice = opt.ce_price != null ? String(Math.max(0, parseFloat(opt.ce_price) || 0)) : (opt.option_type === 'CE' ? String(Math.max(0, parseFloat(opt.price) || 0)) : '');
      const pePrice = opt.pe_price != null ? String(Math.max(0, parseFloat(opt.pe_price) || 0)) : (opt.option_type === 'PE' ? String(Math.max(0, parseFloat(opt.price) || 0)) : '');
      const totalEntry = isBoth
        ? String(((Number(opt.ce_price) || 0) + (Number(opt.pe_price) || 0)).toFixed(2))
        : (opt.price > 0 ? String(Math.max(0, parseFloat(opt.price) || 0)) : prev.entry_premium);

      return {
        ...prev,
        index_name: opt.index_name || prev.index_name,
        strike_price: String(Math.max(0, parseFloat(opt.strike_price || prev.strike_price) || 0)),
        option_type: opt.option_type || prev.option_type,
        expiry_date: opt.expiry_date || prev.expiry_date,
        entry_premium: totalEntry,
        ce_entry_price: isBoth ? cePrice : (opt.option_type === 'CE' ? cePrice : ''),
        pe_entry_price: isBoth ? pePrice : (opt.option_type === 'PE' ? pePrice : ''),
        strategy_name: isBoth && (!prev.strategy_name || prev.strategy_name === 'ALL') ? 'Long Straddle' : prev.strategy_name,
        quantity: String(newQty),
        lots: String(curLots),
      };
    });
  };

  useEffect(() => {
    if (!trade) return;
    const legs = getLegPrices(trade);
    const knownStrategies = [
      'Long Straddle', 'Long Strangle', 'Directional CE', 'Directional PE',
      'Bull Call Spread', 'Bear Put Spread', 'Iron Condor', 'Short Straddle',
      'Short Strangle', 'BTST', 'Intraday Options'
    ];
    const isCustomStrategy = trade.strategy_name && !knownStrategies.includes(trade.strategy_name);

    // Extract screenshots
    let scList = [];
    if (trade.screenshots_list && Array.isArray(trade.screenshots_list)) {
      scList = trade.screenshots_list.map((s) => ({
        id: s.id,
        url: resolveScreenshot(s.url || s.path),
        filename: s.filename || 'Screenshot',
      }));
    } else if (trade.screenshots && Array.isArray(trade.screenshots)) {
      scList = trade.screenshots.map((s) => ({
        id: s.id,
        url: resolveScreenshot(s.url || s.path),
        filename: s.filename || 'Screenshot',
      }));
    } else if (trade.screenshot_url || trade.screenshot_path) {
      scList = [{
        id: 'legacy',
        url: resolveScreenshot(trade.screenshot_url || trade.screenshot_path),
        filename: 'Main Screenshot',
      }];
    }
    setExistingScreenshots(scList);
    setDeletedScreenshotIds([]);
    setStagedNewFiles([]);
    setModalTab('details');

    setEditForm({
      id: trade.id,
      trade_date: trade.trade_date ? trade.trade_date.split('T')[0].split(' ')[0] : new Date().toISOString().split('T')[0],
      index_name: trade.index_name || 'NIFTY',
      status: trade.status || 'CLOSED',
      open_quantity: trade.open_quantity != null ? trade.open_quantity.toString() : (trade.status === 'OPEN' ? (trade.quantity ? trade.quantity.toString() : '0') : '0'),
      trading_type: trade.trading_type || 'Intraday',
      option_type: trade.option_type || 'CE',
      strike_price: trade.strike_price != null ? trade.strike_price.toString() : '',
      expiry_date: trade.expiry_date ? trade.expiry_date.split('T')[0].split(' ')[0] : '',
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
    });
  }, [trade]);

  // Computed Charges
  const computedTotalCharges = useMemo(() => {
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

  const isTradeOpen = editForm.status === 'OPEN' || !editForm.exit_premium;

  const computedGrossProfit = useMemo(() => {
    if (editForm.status === 'OPEN' || !editForm.exit_premium) {
      return '0.00';
    }
    const entry = Math.max(0, parseFloat(editForm.entry_premium) || 0);
    const exit = Math.max(0, parseFloat(editForm.exit_premium) || 0);
    const qty = Math.max(0, parseFloat(editForm.quantity) || 0);
    if (entry > 0 && exit > 0 && qty > 0) {
      const diff = (exit - entry) * qty;
      return diff > 0 ? diff.toFixed(2) : '0.00';
    }
    return Math.max(0, parseFloat(editForm.gross_profit || 0)).toFixed(2);
  }, [editForm.status, editForm.entry_premium, editForm.exit_premium, editForm.quantity, editForm.gross_profit]);

  const computedGrossLoss = useMemo(() => {
    if (editForm.status === 'OPEN' || !editForm.exit_premium) {
      return '0.00';
    }
    const entry = Math.max(0, parseFloat(editForm.entry_premium) || 0);
    const exit = Math.max(0, parseFloat(editForm.exit_premium) || 0);
    const qty = Math.max(0, parseFloat(editForm.quantity) || 0);
    if (entry > 0 && exit > 0 && qty > 0) {
      const diff = (exit - entry) * qty;
      return diff < 0 ? Math.abs(diff).toFixed(2) : '0.00';
    }
    return Math.max(0, parseFloat(editForm.gross_loss || 0)).toFixed(2);
  }, [editForm.status, editForm.entry_premium, editForm.exit_premium, editForm.quantity, editForm.gross_loss]);

  const computedNetPnl = useMemo(() => {
    if (editForm.status === 'OPEN' || !editForm.exit_premium) {
      const ch = parseFloat(computedTotalCharges) || 0;
      return (-ch).toFixed(2);
    }
    const gp = parseFloat(computedGrossProfit) || 0;
    const gl = parseFloat(computedGrossLoss) || 0;
    const ch = parseFloat(computedTotalCharges) || 0;
    return (gp - gl - ch).toFixed(2);
  }, [editForm.status, editForm.exit_premium, computedGrossProfit, computedGrossLoss, computedTotalCharges]);

  // Automatically calculate P&L and charges in real-time whenever trade fields change
  useEffect(() => {
    const isOpen = editForm.status === 'OPEN' || !editForm.exit_premium;
    let entry = parseFloat(editForm.entry_premium) || 0;
    let exit = isOpen ? 0 : (parseFloat(editForm.exit_premium) || 0);

    if (editForm.option_type === 'Both') {
      const ceEn = parseFloat(editForm.ce_entry_price) || 0;
      const peEn = parseFloat(editForm.pe_entry_price) || 0;
      if (ceEn > 0 || peEn > 0) entry = ceEn + peEn;

      if (!isOpen) {
        const ceEx = parseFloat(editForm.ce_exit_price) || 0;
        const peEx = parseFloat(editForm.pe_exit_price) || 0;
        if (ceEx > 0 || peEx > 0) exit = ceEx + peEx;
      }
    }

    const qty = parseInt(editForm.quantity, 10) || 0;
    const numOrders = isOpen ? (editForm.option_type === 'Both' ? 2 : 1) : (editForm.option_type === 'Both' ? 4 : 2);

    if (qty > 0 && (entry > 0 || exit > 0)) {
      const est = calculateCharges({
        entry,
        exit,
        quantity: qty,
        optionType: editForm.option_type,
        indexName: editForm.index_name,
        isOpen,
        status: editForm.status,
        executedOrders: numOrders,
        ceEntry: editForm.ce_entry_price,
        peEntry: editForm.pe_entry_price,
        ceExit: isOpen ? undefined : editForm.ce_exit_price,
        peExit: isOpen ? undefined : editForm.pe_exit_price,
      });

      setEditForm((prev) => {
        const other = parseFloat(prev.other_charges) || 0;
        const total = (est.total_charges + other).toFixed(2);
        const grossP = isOpen ? '0.00' : (est.gross_profit > 0 ? est.gross_profit.toFixed(2) : '0.00');
        const grossL = isOpen ? '0.00' : (est.gross_loss > 0 ? est.gross_loss.toFixed(2) : '0.00');

        if (
          prev.brokerage === est.brokerage.toFixed(2) &&
          prev.stt === est.stt.toFixed(2) &&
          prev.exchange_charges === est.exchange_charges.toFixed(2) &&
          prev.gst === est.gst.toFixed(2) &&
          prev.sebi_charges === est.sebi_charges.toFixed(2) &&
          prev.stamp_duty === est.stamp_duty.toFixed(2) &&
          prev.total_charges === total &&
          prev.gross_profit === grossP &&
          prev.gross_loss === grossL
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
          gross_profit: grossP,
          gross_loss: grossL,
        };
      });
    }
  }, [
    editForm.status,
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

  const handleAutoCalculateCharges = async () => {
    const isOpen = editForm.status === 'OPEN' || !editForm.exit_premium;
    const entry = parseFloat(editForm.entry_premium) || 0;
    const exit = isOpen ? 0 : (parseFloat(editForm.exit_premium) || 0);
    const qty = parseInt(editForm.quantity, 10) || 0;
    const numOrders = isOpen ? (editForm.option_type === 'Both' ? 2 : 1) : (editForm.option_type === 'Both' ? 4 : 2);

    let gp = '0.00';
    let gl = '0.00';
    if (!isOpen && entry > 0 && exit > 0 && qty > 0) {
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
        isOpen,
        status: editForm.status,
        executed_orders: numOrders,
        ce_entry_price: editForm.ce_entry_price,
        pe_entry_price: editForm.pe_entry_price,
        ce_exit_price: isOpen ? undefined : editForm.ce_exit_price,
        pe_exit_price: isOpen ? undefined : editForm.pe_exit_price,
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
          total_charges: Number(est.total_charges).toFixed(2),
        }));
        showToast(`Charges calculated using dynamic regulatory rates (${est.exchange || 'NSE'})`);
        return;
      }
    } catch {
      // Fallback local estimation using active BrokerageContext rates
      const localEst = calculateCharges({
        entry,
        exit,
        quantity: qty,
        optionType: editForm.option_type,
        indexName: editForm.index_name,
        isOpen,
        status: editForm.status,
        ceEntry: editForm.ce_entry_price,
        peEntry: editForm.pe_entry_price,
        ceExit: isOpen ? undefined : editForm.ce_exit_price,
        peExit: isOpen ? undefined : editForm.pe_exit_price,
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
        total_charges: localEst.total_charges.toFixed(2),
      }));
      showToast('Charges auto-calculated via active brokerage schedule');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSavingEdit(true);
      const strategyFinal = editForm.strategy_name === 'CUSTOM' ? editForm.custom_strategy : editForm.strategy_name;
      const payload = {
        ...editForm,
        status: editForm.status || trade.status || 'CLOSED',
        open_quantity: editForm.open_quantity != null ? parseInt(editForm.open_quantity, 10) : trade.open_quantity,
        strategy_name: strategyFinal || 'Intraday Options',
        strike_price: editForm.strike_price ? parseFloat(editForm.strike_price) : null,
        entry_premium: editForm.entry_premium ? parseFloat(editForm.entry_premium) : null,
        exit_premium: editForm.exit_premium ? parseFloat(editForm.exit_premium) : null,
        quantity: editForm.quantity ? parseInt(editForm.quantity, 10) : 50,
        lots: editForm.lots ? parseInt(editForm.lots, 10) : 1,
        gross_profit: parseFloat(computedGrossProfit) || 0,
        gross_loss: parseFloat(computedGrossLoss) || 0,
        brokerage: parseFloat(editForm.brokerage) || 0,
        stt: parseFloat(editForm.stt) || 0,
        exchange_charges: parseFloat(editForm.exchange_charges) || 0,
        gst: parseFloat(editForm.gst) || 0,
        sebi_charges: parseFloat(editForm.sebi_charges) || 0,
        stamp_duty: parseFloat(editForm.stamp_duty) || 0,
        other_charges: parseFloat(editForm.other_charges) || 0,
        total_charges: parseFloat(computedTotalCharges) || 0,
        ce_entry_price: editForm.option_type === 'Both' && editForm.ce_entry_price ? parseFloat(editForm.ce_entry_price) : null,
        pe_entry_price: editForm.option_type === 'Both' && editForm.pe_entry_price ? parseFloat(editForm.pe_entry_price) : null,
        ce_exit_price: editForm.option_type === 'Both' && editForm.ce_exit_price ? parseFloat(editForm.ce_exit_price) : null,
        pe_exit_price: editForm.option_type === 'Both' && editForm.pe_exit_price ? parseFloat(editForm.pe_exit_price) : null,
      };

      const res = await api.put(`/trades/${editForm.id}`, payload);
      let updatedTrade = res.data?.trade || { ...trade, ...payload };

      // Handle screenshots deletion
      for (const delId of deletedScreenshotIds) {
        if (delId && delId !== 'legacy') {
          try {
            await api.delete(`/trades/${editForm.id}/screenshots/${delId}`);
          } catch (delErr) {
            console.error('Error deleting screenshot', delErr);
          }
        }
      }

      // Handle newly staged screenshot files
      if (stagedNewFiles.length > 0) {
        try {
          const formData = new FormData();
          stagedNewFiles.forEach((item) => {
            formData.append('screenshots[]', item.file);
          });
          const uploadRes = await api.post(`/trades/${editForm.id}/screenshots`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          if (uploadRes.data?.trade) {
            updatedTrade = uploadRes.data.trade;
          }
        } catch (upErr) {
          console.error('Screenshot upload failed', upErr);
        }
      }

      showToast('Trade updated successfully!');
      if (onSaved) onSaved(updatedTrade);
      if (onClose) onClose();
    } catch (err) {
      console.error('Failed to update trade', err);
      showToast(err.response?.data?.message || 'Failed to update trade. Please check inputs.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  if (!isOpen || !trade) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-[#1e293b] light:border-slate-200 bg-[#0e1626] light:bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-white light:text-slate-900 flex items-center gap-2">
              <span>Edit Trade #{trade.id}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                editForm.option_type === 'CE'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : editForm.option_type === 'PE'
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}>
                {editForm.index_name} {editForm.strike_price ? `${Math.round(editForm.strike_price)} ` : ''}{editForm.option_type}
              </span>
            </h3>
            <p className="text-xs text-slate-400 light:text-slate-500 mt-0.5">
              Modify trade execution legs, charges, and journal reflections
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowOptionChainModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 border border-indigo-500/30 transition-all cursor-pointer"
              title="Open live Option Chain"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Option Chain</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Tabs */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-[#0e1626] light:bg-slate-100 border-b border-[#1e293b] light:border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setModalTab('details')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
              modalTab === 'details'
                ? isKite
                  ? 'text-[#ff5722] font-semibold bg-transparent shadow-none hover:bg-transparent'
                  : 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : isKite
                  ? 'text-[#9b9b9b] hover:text-white'
                  : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trade</span> Details
          </button>
          <button
            type="button"
            onClick={() => setModalTab('charges')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
              modalTab === 'charges'
                ? isKite
                  ? 'text-[#ff5722] font-semibold bg-transparent shadow-none hover:bg-transparent'
                  : 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : isKite
                  ? 'text-[#9b9b9b] hover:text-white'
                  : 'text-slate-400 hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            P&L & Charges
          </button>
          <button
            type="button"
            onClick={() => setModalTab('journal')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
              modalTab === 'journal'
                ? isKite
                  ? 'text-[#ff5722] font-semibold bg-transparent shadow-none hover:bg-transparent'
                  : 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : isKite
                  ? 'text-[#9b9b9b] hover:text-white'
                  : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Journal
          </button>
          <button
            type="button"
            onClick={() => setModalTab('screenshots')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl transition-all cursor-pointer ${
              modalTab === 'screenshots'
                ? isKite
                  ? 'text-[#ff5722] font-semibold bg-transparent shadow-none hover:bg-transparent'
                  : 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : isKite
                  ? 'text-[#9b9b9b] hover:text-white'
                  : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Screenshots ({existingScreenshots.length - deletedScreenshotIds.length + stagedNewFiles.length})
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 text-xs">
          {/* TAB 1: DETAILS */}
          {modalTab === 'details' && (
            <div className="space-y-3.5">
              {/* Row 1: Date, Index, Trading Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Trade Date *</label>
                  <input
                    type="date"
                    required
                    value={editForm.trade_date || ''}
                    onChange={(e) => setEditForm({ ...editForm, trade_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white focus:outline-none focus:border-blue-500 font-mono-numbers"
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
                      .filter((idx) => {
                        if (idx === 'BANK NIFTY') return false;
                        if (editForm.index_name === idx) return true;
                        if (activeIndices && activeIndices.length > 0) {
                          return activeIndices.some((opt) => opt.option_value === idx);
                        }
                        return true;
                      })
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
                    {activeTradingTypes && activeTradingTypes.length > 0 ? (
                      activeTradingTypes.map((opt) => (
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 font-medium">Strike Price</label>
                    <button
                      type="button"
                      onClick={() => setShowOptionChainModal(true)}
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
                      title="View live Option Chain"
                    >
                      <Layers className="w-3 h-3" />
                      <span>Option Chain</span>
                    </button>
                  </div>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="25000"
                    value={editForm.strike_price || ''}
                    onChange={(e) => handleEditFieldChange('strike_price', e.target.value)}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Expiry Date</label>
                  <input
                    type="date"
                    value={editForm.expiry_date || ''}
                    onChange={(e) => setEditForm({ ...editForm, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white focus:outline-none focus:border-blue-500 font-mono-numbers"
                  />
                </div>
              </div>

              {/* Row 3: Entry Premium, Exit Premium, Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {editForm.option_type === 'Both' ? (
                  <>
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
                            step="any"
                            min="0"
                            placeholder="CE Entry"
                            value={editForm.ce_entry_price || ''}
                            onChange={(e) => {
                              const cleanVal = e.target.value.replace(/-/g, '').replace(/[^0-9.]/g, '');
                              const ce = Math.max(0, parseFloat(cleanVal) || 0);
                              const pe = Math.max(0, parseFloat(editForm.pe_entry_price) || 0);
                              setEditForm((prev) => ({
                                ...prev,
                                ce_entry_price: cleanVal,
                                entry_premium: (ce + pe).toFixed(2),
                              }));
                            }}
                            onKeyDown={blockNegativeKeys}
                            className="w-full pl-2.5 pr-7 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers text-xs"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-400 pointer-events-none">
                            CE
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="PE Entry"
                            value={editForm.pe_entry_price || ''}
                            onChange={(e) => {
                              const cleanVal = e.target.value.replace(/-/g, '').replace(/[^0-9.]/g, '');
                              const ce = Math.max(0, parseFloat(editForm.ce_entry_price) || 0);
                              const pe = Math.max(0, parseFloat(cleanVal) || 0);
                              setEditForm((prev) => ({
                                ...prev,
                                pe_entry_price: cleanVal,
                                entry_premium: (ce + pe).toFixed(2),
                              }));
                            }}
                            onKeyDown={blockNegativeKeys}
                            className="w-full pl-2.5 pr-7 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers text-xs"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-400 pointer-events-none">
                            PE
                          </span>
                        </div>
                      </div>
                    </div>

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
                            step="any"
                            min="0"
                            placeholder="CE Exit"
                            value={editForm.ce_exit_price || ''}
                            onChange={(e) => {
                              const cleanVal = e.target.value.replace(/-/g, '').replace(/[^0-9.]/g, '');
                              const ce = Math.max(0, parseFloat(cleanVal) || 0);
                              const pe = Math.max(0, parseFloat(editForm.pe_exit_price) || 0);
                              setEditForm((prev) => ({
                                ...prev,
                                ce_exit_price: cleanVal,
                                exit_premium: (ce + pe).toFixed(2),
                              }));
                            }}
                            onKeyDown={blockNegativeKeys}
                            className="w-full pl-2.5 pr-7 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers text-xs"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-400 pointer-events-none">
                            CE
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="PE Exit"
                            value={editForm.pe_exit_price || ''}
                            onChange={(e) => {
                              const cleanVal = e.target.value.replace(/-/g, '').replace(/[^0-9.]/g, '');
                              const ce = Math.max(0, parseFloat(editForm.ce_exit_price) || 0);
                              const pe = Math.max(0, parseFloat(cleanVal) || 0);
                              setEditForm((prev) => ({
                                ...prev,
                                pe_exit_price: cleanVal,
                                exit_premium: (ce + pe).toFixed(2),
                              }));
                            }}
                            onKeyDown={blockNegativeKeys}
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
                        step="any"
                        min="0"
                        placeholder="123.00"
                        value={editForm.entry_premium || ''}
                        onChange={(e) => handleEditFieldChange('entry_premium', e.target.value)}
                        onKeyDown={blockNegativeKeys}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">Exit Premium</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="156.00"
                        value={editForm.exit_premium || ''}
                        onChange={(e) => handleEditFieldChange('exit_premium', e.target.value)}
                        onKeyDown={blockNegativeKeys}
                        className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Quantity (Shares)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="50"
                    value={editForm.quantity || ''}
                    onChange={(e) => handleEditQuantityChange(e.target.value)}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 4: Lots, Strategy, Market Condition */}
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
                    onChange={(e) => handleEditLotsChange(e.target.value)}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Strategy Name</label>
                  <select
                    value={editForm.strategy_name || 'Intraday Options'}
                    onChange={(e) => setEditForm({ ...editForm, strategy_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white focus:outline-none focus:border-blue-500"
                  >
                    {activeStrategies && activeStrategies.length > 0 ? (
                      activeStrategies.map((opt) => (
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
                        <option value="BTST">BTST</option>
                        <option value="Intraday Options">Intraday Options</option>
                      </>
                    )}
                    {editForm.strategy_name &&
                      activeStrategies &&
                      !activeStrategies.some((s) => s.option_value === editForm.strategy_name) && (
                        <option value={editForm.strategy_name}>{editForm.strategy_name} (Current)</option>
                      )}
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
                    {activeMarketConditions && activeMarketConditions.length > 0 ? (
                      activeMarketConditions.map((opt) => (
                        <option key={opt.option_value} value={opt.option_value}>
                          {opt.option_label}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Rangebound">Rangebound</option>
                        <option value="Bullish Trend">Bullish Trend</option>
                        <option value="Bearish Trend">Bearish Trend</option>
                        <option value="High Volatility">High Volatility</option>
                        <option value="Consolidation">Consolidation</option>
                        <option value="Expiry Day Volatility">Expiry Day Volatility</option>
                      </>
                    )}
                    {editForm.market_conditions &&
                      activeMarketConditions &&
                      !activeMarketConditions.some((m) => m.option_value === editForm.market_conditions) && (
                        <option value={editForm.market_conditions}>{editForm.market_conditions} (Current)</option>
                      )}
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
          {modalTab === 'charges' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-3">
                  <label className="block text-slate-400 mb-1 font-medium">Gross Profit</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={computedGrossProfit}
                    onChange={(e) => handleEditFieldChange('gross_profit', e.target.value)}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-emerald-500/40 text-emerald-400 font-mono-numbers font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-slate-400 mb-1 font-medium">Gross Loss</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={computedGrossLoss}
                    onChange={(e) => handleEditFieldChange('gross_loss', e.target.value)}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-rose-500/40 text-rose-400 font-mono-numbers focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-slate-400 mb-1 font-medium">Total Charges</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    readOnly
                    value={computedTotalCharges}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-slate-300 font-mono-numbers focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={handleAutoCalculateCharges}
                    className="w-full px-3 py-2 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Auto Calculate</span>
                  </button>
                </div>
              </div>

              {/* Charges Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">Brokerage</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editForm.brokerage ?? '40.00'}
                    onChange={(e) => handleEditFieldChange('brokerage', e.target.value)}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">STT / CTT</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editForm.stt ?? '0.00'}
                    onChange={(e) => handleEditFieldChange('stt', e.target.value)}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">Exchange Charges</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editForm.exchange_charges ?? '0.00'}
                    onChange={(e) => handleEditFieldChange('exchange_charges', e.target.value)}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">GST (18%)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editForm.gst ?? '0.00'}
                    onChange={(e) => handleEditFieldChange('gst', e.target.value)}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">SEBI Charges</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editForm.sebi_charges ?? '0.00'}
                    onChange={(e) => handleEditFieldChange('sebi_charges', e.target.value)}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">Stamp Duty</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editForm.stamp_duty ?? '0.00'}
                    onChange={(e) => handleEditFieldChange('stamp_duty', e.target.value)}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">Other Charges</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={editForm.other_charges ?? '0.00'}
                    onChange={(e) => handleEditFieldChange('other_charges', e.target.value)}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono-numbers text-xs"
                  />
                </div>
              </div>

              {/* Net P&L Summary Banner */}
              <div className="p-3.5 rounded-2xl bg-[#0e1626] border border-[#1e293b] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Calculated Net P&L</span>
                  <span className="text-[10px] text-slate-400">Gross Profit - Gross Loss - Total Charges</span>
                </div>
                <span
                  className={`text-xl font-black font-mono-numbers ${
                    parseFloat(computedNetPnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {parseFloat(computedNetPnl) >= 0 ? '+' : ''}
                  {formatINR(computedNetPnl)}
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: JOURNAL */}
          {modalTab === 'journal' && (
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
                    placeholder="Hit daily target limit"
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
                    placeholder="Directional momentum with VWAP support"
                    value={editForm.trade_setup || ''}
                    onChange={(e) => setEditForm({ ...editForm, trade_setup: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">What Went Right?</label>
                  <input
                    type="text"
                    placeholder="Followed risk-to-reward discipline"
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
                    placeholder="Chased slightly on entry"
                    value={editForm.what_went_wrong || ''}
                    onChange={(e) => setEditForm({ ...editForm, what_went_wrong: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Mistakes Made</label>
                  <input
                    type="text"
                    placeholder="Premature partial exit"
                    value={editForm.mistakes_made || ''}
                    onChange={(e) => setEditForm({ ...editForm, mistakes_made: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Personal Notes / Reflections</label>
                <textarea
                  rows={2}
                  placeholder="Additional observations about execution psychology..."
                  value={editForm.personal_notes || ''}
                  onChange={(e) => setEditForm({ ...editForm, personal_notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* TAB 4: SCREENSHOTS */}
          {modalTab === 'screenshots' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Trade Screenshots</span>
                  <span className="text-[11px] text-slate-400">Attach chart snapshots or execution confirmations</span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/40 hover:bg-blue-600/30 font-semibold text-xs flex items-center gap-1.5 transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      const staged = files.map((file) => ({
                        id: `staged-${Date.now()}-${Math.random()}`,
                        file,
                        previewUrl: URL.createObjectURL(file),
                        filename: file.name,
                      }));
                      setStagedNewFiles((prev) => [...prev, ...staged]);
                    }
                    e.target.value = '';
                  }}
                />
              </div>

              {/* Existing & Staged Image Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Existing Screenshots */}
                {existingScreenshots
                  .filter((sc) => !deletedScreenshotIds.includes(sc.id))
                  .map((sc) => (
                    <div
                      key={sc.id}
                      className="group relative rounded-xl overflow-hidden border border-[#1e293b] bg-[#0e1626] aspect-video flex items-center justify-center"
                    >
                      <img
                        src={sc.url}
                        alt={sc.filename}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setDeletedScreenshotIds((prev) => [...prev, sc.id])}
                        className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-rose-600/80 text-white opacity-0 group-hover:opacity-100 hover:bg-rose-600 transition-all shadow-md"
                        title="Remove screenshot"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 right-1 text-[9px] bg-black/70 px-1 py-0.5 rounded truncate text-slate-300">
                        {sc.filename}
                      </span>
                    </div>
                  ))}

                {/* Staged New Screenshots */}
                {stagedNewFiles.map((item) => (
                  <div
                    key={item.id}
                    className="group relative rounded-xl overflow-hidden border-2 border-dashed border-blue-500/50 bg-[#0e1626] aspect-video flex items-center justify-center"
                  >
                    <img
                      src={item.previewUrl}
                      alt={item.filename}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setStagedNewFiles((prev) => prev.filter((x) => x.id !== item.id))}
                      className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-rose-600 text-white hover:bg-rose-500 transition-all shadow-md"
                      title="Discard upload"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 right-1 text-[9px] bg-blue-600/80 px-1 py-0.5 rounded truncate text-white">
                      New: {item.filename}
                    </span>
                  </div>
                ))}

                {existingScreenshots.filter((sc) => !deletedScreenshotIds.includes(sc.id)).length === 0 &&
                  stagedNewFiles.length === 0 && (
                    <div className="col-span-3 py-8 text-center text-slate-500 border border-dashed border-[#1e293b] rounded-2xl">
                      <Camera className="w-8 h-8 mx-auto text-slate-600 mb-1.5" />
                      <p className="text-xs">No screenshots attached to this trade.</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-400 hover:underline text-[11px] font-semibold mt-1 inline-block"
                      >
                        + Click here to attach image
                      </button>
                    </div>
                  )}
              </div>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#1e293b] light:border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">P&L Preview:</span>
              <span
                className={`font-mono-numbers font-bold text-xs ${
                  parseFloat(computedNetPnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {parseFloat(computedNetPnl) >= 0 ? '+' : ''}
                {formatINR(computedNetPnl)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={savingEdit}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {savingEdit ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Option Chain Modal */}
      <OptionChainModal
        isOpen={showOptionChainModal}
        onClose={() => setShowOptionChainModal(false)}
        initialSymbol={editForm.index_name}
        initialStrike={editForm.strike_price}
        initialOptionType={editForm.option_type}
        initialExpiry={editForm.expiry_date}
        onSelectOption={handleSelectOptionFromChain}
      />
    </div>
  );
}
