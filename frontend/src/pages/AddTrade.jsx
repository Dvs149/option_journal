import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Receipt,
  BookOpen,
  Eye,
  RotateCw,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Upload,
  Camera,
  Layers,
  Image as ImageIcon,
  Sparkles,
  Info,
  TrendingUp,
  SlidersHorizontal,
} from 'lucide-react';
import api from '../api/client';
import { formatINR, formatDate } from '../utils/formatters';
import { useLotSizes } from '../context/LotSizeContext';
import { useToast } from '../context/ToastContext';
import { useBrokerage } from '../context/BrokerageContext';
import { useDropdown } from '../context/DropdownContext';
import { useTheme } from '../context/ThemeContext';
import BulkImportModal from '../components/trades/BulkImportModal';
import ImageOrderImportModal from '../components/trades/ImageOrderImportModal';
import OptionChainModal from '../components/trades/OptionChainModal';
import {
  DEFAULT_INDEX_CONFIG,
  getIndexAtmStrike,
  getIndexStrikeStep,
  getIndexNearestExpiry,
} from '../utils/marketData';

export default function AddTrade() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { isKite } = useTheme();
  const { calculateCharges } = useBrokerage();
  const { getActiveOptions } = useDropdown();

  const activeIndices = useMemo(() => getActiveOptions('add-trade', 'index_name'), [getActiveOptions]);
  const activeTradingTypes = useMemo(() => getActiveOptions('add-trade', 'trading_type'), [getActiveOptions]);
  const activeOptionTypes = useMemo(() => getActiveOptions('add-trade', 'option_type'), [getActiveOptions]);
  const activeStrategies = useMemo(() => getActiveOptions('add-trade', 'strategy_name'), [getActiveOptions]);
  const activeMarketConditions = useMemo(() => getActiveOptions('add-trade', 'market_conditions'), [getActiveOptions]);

  // Active section tab: 'trade_details' | 'pnl_charges' | 'strategy_journal' | 'preview'
  const [activeTab, setActiveTab] = useState('trade_details');
  // Trade position mode: 'CLOSED' (round-trip) or 'OPEN' (open position / partial orders)
  const [tradeMode, setTradeMode] = useState('CLOSED');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showImageOrderModal, setShowImageOrderModal] = useState(false);
  const [showOptionChainModal, setShowOptionChainModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();
  const setSuccessMessage = (msg) => { if (msg) showToast(msg, 'success'); };
  const setErrorMessage = (msg) => { if (msg) showToast(msg, 'error'); };
  const [selectedScreenshots, setSelectedScreenshots] = useState([]);
  const [viewingLightboxUrl, setViewingLightboxUrl] = useState(null);

  // Auto-fill form from Option Chain selection
  const handleSelectOptionFromChain = (opt) => {
    if (!opt) return;
    const lotSz = getLotSize(opt.index_name) || opt.lot_size || 50;
    const lotsNum = Math.max(1, parseInt(form.lots, 10) || 1);
    const calculatedQty = lotsNum * lotSz;
    const isBoth = opt.option_type === 'Both';

    setForm((prev) => {
      const cePrice = opt.ce_price != null ? String(opt.ce_price) : (opt.option_type === 'CE' ? String(opt.price) : '');
      const pePrice = opt.pe_price != null ? String(opt.pe_price) : (opt.option_type === 'PE' ? String(opt.price) : '');
      const totalEntry = isBoth
        ? String(((Number(opt.ce_price) || 0) + (Number(opt.pe_price) || 0)).toFixed(2))
        : (opt.price > 0 ? String(opt.price) : prev.entry_premium);

      return {
        ...prev,
        index_name: opt.index_name || prev.index_name,
        strike_price: String(opt.strike_price || prev.strike_price),
        option_type: opt.option_type || prev.option_type,
        expiry_date: opt.expiry_date || prev.expiry_date,
        entry_premium: totalEntry,
        ce_entry_price: isBoth ? cePrice : (opt.option_type === 'CE' ? cePrice : ''),
        pe_entry_price: isBoth ? pePrice : (opt.option_type === 'PE' ? pePrice : ''),
        strategy_name: isBoth && (!prev.strategy_name || prev.strategy_name === 'ALL') ? 'Long Straddle' : prev.strategy_name,
        quantity: String(calculatedQty),
        lots: String(lotsNum),
      };
    });
  };

  const blockNegativeKeys = (e) => {
    if (e.key === '-' || e.key === 'Minus' || e.key === 'e' || e.key === 'E' || e.key === '+') {
      e.preventDefault();
    }
  };

  // Apply parsed order(s) from screenshot modal directly into AddTrade form
  const handleApplyOrdersToForm = (selectedOrders, chosenOptionType = 'auto') => {
    if (!selectedOrders || selectedOrders.length === 0) return;

    const ceOrders = selectedOrders.filter((o) => (o.option_type || '').toUpperCase() === 'CE');
    const peOrders = selectedOrders.filter((o) => (o.option_type || '').toUpperCase() === 'PE');
    const buys = selectedOrders.filter((o) => o.type === 'BUY');
    const sells = selectedOrders.filter((o) => o.type === 'SELL');

    // Check if we should combine same-strike orders into "Both" (Straddle)
    const hasMatchingStrike =
      ceOrders.length > 0 &&
      peOrders.length > 0 &&
      ceOrders.some((c) => peOrders.some((p) => String(c.strike_price) === String(p.strike_price)));

    const shouldCombineBoth =
      chosenOptionType === 'Both' ||
      (chosenOptionType === 'auto' && hasMatchingStrike);

    if (shouldCombineBoth && (ceOrders.length > 0 || peOrders.length > 0 || selectedOrders.length >= 2)) {
      const ceOrd = ceOrders[0] || selectedOrders.find((o) => (o.option_type || '').toUpperCase() === 'CE') || selectedOrders[0];
      const peOrd = peOrders[0] || selectedOrders.find((o) => (o.option_type || '').toUpperCase() === 'PE') || selectedOrders[1] || selectedOrders[0];
      const commonIndex = ceOrd.index_name || peOrd.index_name || form.index_name;
      const commonStrike = ceOrd.strike_price || peOrd.strike_price || form.strike_price;
      const commonExpiry = ceOrd.expiry_date || peOrd.expiry_date || form.expiry_date;
      const cleanLots = Math.max(1, parseInt(ceOrd.lots || peOrd.lots || 1, 10));
      const cleanQty = Math.max(1, parseInt(ceOrd.quantity || peOrd.quantity || 1, 10));

      const ceBuy = ceOrders.find((o) => o.type === 'BUY') || (ceOrd.type === 'BUY' ? ceOrd : null);
      const ceSell = ceOrders.find((o) => o.type === 'SELL') || (ceOrd.type === 'SELL' ? ceOrd : null);
      const peBuy = peOrders.find((o) => o.type === 'BUY') || (peOrd.type === 'BUY' ? peOrd : null);
      const peSell = peOrders.find((o) => o.type === 'SELL') || (peOrd.type === 'SELL' ? peOrd : null);

      const isClosed = ceBuy && ceSell && peBuy && peSell;

      if (isClosed) {
        setTradeMode('CLOSED');
        const ceEntry = parseFloat(ceBuy.price) || 0;
        const ceExit = parseFloat(ceSell.price) || 0;
        const peEntry = parseFloat(peBuy.price) || 0;
        const peExit = parseFloat(peSell.price) || 0;
        const totalEntry = (ceEntry + peEntry).toFixed(2);
        const totalExit = (ceExit + peExit).toFixed(2);

        setForm((prev) => ({
          ...prev,
          trade_date: ceBuy.trade_date || ceBuy.order_date || prev.trade_date,
          index_name: commonIndex,
          option_type: 'Both',
          strike_price: String(commonStrike),
          expiry_date: commonExpiry || prev.expiry_date,
          lots: String(cleanLots),
          quantity: String(cleanQty),
          ce_entry_price: String(ceEntry),
          pe_entry_price: String(peEntry),
          entry_premium: String(totalEntry),
          ce_exit_price: String(ceExit),
          pe_exit_price: String(peExit),
          exit_premium: String(totalExit),
          strategy_name: 'Long Straddle',
        }));
      } else {
        // Open position (e.g. 2 BUY orders for CE & PE with same strike)
        const ceEntry = parseFloat(ceBuy ? ceBuy.price : ceOrd.price) || 0;
        const peEntry = parseFloat(peBuy ? peBuy.price : peOrd.price) || 0;
        const totalEntry = (ceEntry + peEntry).toFixed(2);

        setTradeMode('OPEN');
        setForm((prev) => ({
          ...prev,
          trade_date: (ceBuy || ceOrd).trade_date || prev.trade_date,
          index_name: commonIndex,
          option_type: 'Both',
          strike_price: String(commonStrike),
          expiry_date: commonExpiry || prev.expiry_date,
          lots: String(cleanLots),
          quantity: String(cleanQty),
          ce_entry_price: String(ceEntry),
          pe_entry_price: String(peEntry),
          entry_premium: String(totalEntry),
          ce_exit_price: '',
          pe_exit_price: '',
          exit_premium: '',
          strategy_name: 'Long Straddle',
        }));
      }
      return;
    }

    if (buys.length > 0 && sells.length > 0) {
      const buy = buys[0];
      const sell = sells[0];
      setTradeMode('CLOSED');
      const buyQty = Math.max(1, Math.abs(parseInt(buy.quantity, 10) || 1));
      const sellQty = Math.max(1, Math.abs(parseInt(sell.quantity, 10) || 1));
      const cleanQty = Math.min(buyQty, sellQty);
      const cleanLots = Math.max(1, Math.abs(parseInt(buy.lots, 10) || parseInt(sell.lots, 10) || Math.round(cleanQty / currentLotSize) || 1));
      const buyPrice = Math.max(0, Math.abs(parseFloat(buy.price) || 0));
      const sellPrice = Math.max(0, Math.abs(parseFloat(sell.price) || 0));
      const cleanStrike = Math.max(0, Math.abs(parseFloat(buy.strike_price || sell.strike_price || form.strike_price) || 0));
      const optType = chosenOptionType !== 'auto' ? chosenOptionType : (buy.option_type || form.option_type);

      setForm((prev) => ({
        ...prev,
        trade_date: buy.trade_date || prev.trade_date,
        index_name: buy.index_name || prev.index_name,
        strike_price: String(cleanStrike),
        option_type: optType,
        expiry_date: buy.expiry_date || prev.expiry_date,
        quantity: String(cleanQty),
        lots: String(cleanLots),
        entry_premium: String(buyPrice),
        exit_premium: String(sellPrice),
      }));
    } else {
      const ord = selectedOrders[0];
      const isBuy = ord.type === 'BUY';
      const cleanQty = Math.max(1, Math.abs(parseInt(ord.quantity, 10) || 1));
      const cleanLots = Math.max(1, Math.abs(parseInt(ord.lots, 10) || Math.round(cleanQty / currentLotSize) || 1));
      const cleanPrice = Math.max(0, Math.abs(parseFloat(ord.price) || 0));
      const cleanStrike = Math.max(0, Math.abs(parseFloat(ord.strike_price || form.strike_price) || 0));
      const optType = chosenOptionType !== 'auto' ? chosenOptionType : (ord.option_type || form.option_type);

      if (isBuy) {
        setTradeMode('OPEN');
        setForm((prev) => ({
          ...prev,
          trade_date: ord.trade_date || prev.trade_date,
          index_name: ord.index_name || prev.index_name,
          strike_price: String(cleanStrike),
          option_type: optType,
          expiry_date: ord.expiry_date || prev.expiry_date,
          quantity: String(cleanQty),
          lots: String(cleanLots),
          entry_premium: String(cleanPrice),
          exit_premium: '',
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          index_name: ord.index_name || prev.index_name,
          strike_price: String(cleanStrike),
          option_type: optType,
          expiry_date: ord.expiry_date || prev.expiry_date,
          quantity: String(cleanQty),
          lots: String(cleanLots),
          exit_premium: String(cleanPrice),
        }));
      }
    }
  };

  // Live ATM Strikes and Expiries from NSE/BSE
  const [atmStrikesData, setAtmStrikesData] = useState({});

  // Form State - defaults to ATM strike of initial index (NIFTY)
  const [form, setForm] = useState({
    trade_date: new Date().toISOString().split('T')[0],
    index_name: 'NIFTY',
    trading_type: 'Intraday',
    option_type: 'CE',
    strike_price: String(getIndexAtmStrike('NIFTY')),
    expiry_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    // Both Option Type (CE + PE) leg prices
    ce_entry_price: '',
    pe_entry_price: '',
    ce_exit_price: '',
    pe_exit_price: '',
    entry_premium: '123.00',
    exit_premium: '156.00',
    quantity: '50',
    lots: '1',
    strategy_name: 'Long Straddle',
    custom_strategy: '',
    market_conditions: 'Rangebound',
    // P&L & Charges
    gross_profit: '6500.00',
    gross_loss: '0.00',
    total_charges: '165.00',
    brokerage: '40.00',
    stt: '15.00',
    exchange_charges: '12.00',
    gst: '18.00',
    sebi_charges: '2.00',
    stamp_duty: '3.00',
    other_charges: '',
    // Strategy & Journal
    entry_reason: 'Breakout above resistance',
    exit_reason: 'Booked profit at target',
    trade_setup: 'Long Straddle before event',
    what_went_right: 'Good entry timing',
    what_went_wrong: 'Exited early',
    mistakes_made: 'Could have held longer',
    lessons_learned: 'Be patient with targets',
    personal_notes: 'N/A',
  });

  // Fetch live ATM strikes and upcoming expiries across all indices on mount
  useEffect(() => {
    let isMounted = true;
    api.get('/option-chain/atm-strikes')
      .then((res) => {
        if (!isMounted) return;
        const map = res.data?.data || res.data;
        if (map && typeof map === 'object') {
          setAtmStrikesData(map);
          const curIdx = form.index_name || 'NIFTY';
          const liveAtm = map[curIdx]?.atm_strike;
          if (liveAtm) {
            setForm((prev) => {
              const prevClean = prev.strike_price ? String(prev.strike_price) : '';
              const fallbackAtm = String(DEFAULT_INDEX_CONFIG[curIdx]?.atm_strike || '24350');
              if (!prevClean || prevClean === '25000' || prevClean === fallbackAtm) {
                return {
                  ...prev,
                  strike_price: String(liveAtm),
                  expiry_date: map[curIdx]?.nearest_expiry || prev.expiry_date,
                };
              }
              return prev;
            });
          }
        }
      })
      .catch((err) => {
        console.warn('Could not fetch live ATM strikes, using fallback index ATM strikes', err);
      });
    return () => { isMounted = false; };
  }, []);

  const { getLotSize, calculateQuantity, calculateLots, lotSizes } = useLotSizes();

  const currentLotSize = getLotSize(form.index_name);

  const currentAtmStrike = useMemo(
    () => getIndexAtmStrike(form.index_name, atmStrikesData),
    [form.index_name, atmStrikesData]
  );

  const currentStrikeStep = useMemo(
    () => getIndexStrikeStep(form.index_name, atmStrikesData),
    [form.index_name, atmStrikesData]
  );

  // Sync quantity automatically whenever index or lots or dynamic lot size changes
  useEffect(() => {
    const numLots = parseInt(form.lots, 10) || 1;
    setForm((prev) => ({
      ...prev,
      quantity: (numLots * currentLotSize).toString(),
    }));
  }, [form.index_name, currentLotSize]);

  // Handle Index Change - automatically switches to ATM strike of newly selected index
  const handleIndexChange = (e) => {
    const newIndex = e.target.value;
    const lotSize = getLotSize(newIndex);
    const currentLots = parseInt(form.lots, 10) || 1;
    const newAtm = getIndexAtmStrike(newIndex, atmStrikesData);
    const nearestExp = getIndexNearestExpiry(newIndex, atmStrikesData);

    setForm((prev) => ({
      ...prev,
      index_name: newIndex,
      strike_price: newAtm ? String(newAtm) : prev.strike_price,
      quantity: (currentLots * lotSize).toString(),
      ...(nearestExp ? { expiry_date: nearestExp } : {}),
    }));
  };

  // Handle Lots Change - automatically calculates Quantity
  const handleLotsChange = (e) => {
    let raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw === '') {
      setForm((prev) => ({
        ...prev,
        lots: '',
        quantity: '0',
      }));
      return;
    }
    const numLots = Math.max(1, Math.abs(parseInt(raw, 10) || 1));
    setForm((prev) => ({
      ...prev,
      lots: numLots.toString(),
      quantity: (numLots * currentLotSize).toString(),
    }));
  };

  // Handle Quantity Change - automatically calculates Lots
  const handleQuantityChange = (e) => {
    let raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw === '') {
      setForm((prev) => ({
        ...prev,
        quantity: '',
        lots: '1',
      }));
      return;
    }
    const numQty = Math.max(1, Math.abs(parseInt(raw, 10) || 1));
    const calcLots = Math.max(1, Math.round(numQty / currentLotSize));
    setForm((prev) => ({
      ...prev,
      quantity: numQty.toString(),
      lots: calcLots.toString(),
    }));
  };

  const nonNegativeNumericFields = [
    'strike_price',
    'entry_premium',
    'exit_premium',
    'gross_profit',
    'gross_loss',
    'total_charges',
    'brokerage',
    'stt',
    'exchange_charges',
    'gst',
    'sebi_charges',
    'stamp_duty',
    'other_charges',
    'ce_entry_price',
    'pe_entry_price',
    'ce_exit_price',
    'pe_exit_price',
  ];

  // Generic Field Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    let cleanValue = value;
    if (nonNegativeNumericFields.includes(name)) {
      cleanValue = value.replace(/-/g, '').replace(/[^0-9.]/g, '');
      const parts = cleanValue.split('.');
      if (parts.length > 2) {
        cleanValue = parts[0] + '.' + parts.slice(1).join('');
      }
    }
    setForm((prev) => ({ ...prev, [name]: cleanValue }));
  };

  // Both Option Type (CE & PE) Prices Change
  const handleBothPricesChange = (e) => {
    const { name, value } = e.target;
    const cleanVal = value.replace(/-/g, '').replace(/[^0-9.]/g, '');
    setForm((prev) => {
      const next = { ...prev, [name]: cleanVal };

      if (name === 'ce_entry_price' || name === 'pe_entry_price') {
        const ce = Math.max(0, parseFloat(name === 'ce_entry_price' ? cleanVal : next.ce_entry_price) || 0);
        const pe = Math.max(0, parseFloat(name === 'pe_entry_price' ? cleanVal : next.pe_entry_price) || 0);
        next.entry_premium = (ce + pe).toFixed(2);
      }

      if (name === 'ce_exit_price' || name === 'pe_exit_price') {
        const ce = Math.max(0, parseFloat(name === 'ce_exit_price' ? cleanVal : next.ce_exit_price) || 0);
        const pe = Math.max(0, parseFloat(name === 'pe_exit_price' ? cleanVal : next.pe_exit_price) || 0);
        next.exit_premium = (ce + pe).toFixed(2);
      }

      return next;
    });
  };

  // Automatically calculate P&L and trading charges whenever any trade input field changes
  useEffect(() => {
    let entry = parseFloat(form.entry_premium) || 0;
    let exit = tradeMode === 'OPEN' ? 0 : (parseFloat(form.exit_premium) || 0);

    // For Both, prioritize leg prices sum if populated
    if (form.option_type === 'Both') {
      const ceEn = parseFloat(form.ce_entry_price) || 0;
      const peEn = parseFloat(form.pe_entry_price) || 0;
      if (ceEn > 0 || peEn > 0) entry = ceEn + peEn;

      if (tradeMode !== 'OPEN') {
        const ceEx = parseFloat(form.ce_exit_price) || 0;
        const peEx = parseFloat(form.pe_exit_price) || 0;
        if (ceEx > 0 || peEx > 0) exit = ceEx + peEx;
      }
    }

    const qty = parseInt(form.quantity, 10) || 0;

    if (qty > 0 && (entry > 0 || exit > 0)) {
      const est = calculateCharges({
        entry,
        exit,
        quantity: qty,
        optionType: form.option_type,
        indexName: form.index_name,
        executedOrders: tradeMode === 'OPEN' ? (form.option_type === 'Both' ? 2 : 1) : undefined,
        ceEntry: form.ce_entry_price,
        peEntry: form.pe_entry_price,
        ceExit: tradeMode === 'OPEN' ? undefined : form.ce_exit_price,
        peExit: tradeMode === 'OPEN' ? undefined : form.pe_exit_price,
      });

      setForm((prev) => {
        const other = parseFloat(prev.other_charges) || 0;
        const total = (est.total_charges + other).toFixed(2);
        const grossP = tradeMode === 'OPEN' ? '0.00' : (est.gross_profit > 0 ? est.gross_profit.toFixed(2) : '0.00');
        const grossL = tradeMode === 'OPEN' ? '0.00' : (est.gross_loss > 0 ? est.gross_loss.toFixed(2) : '0.00');

        // Guard against redundant state updates to avoid unnecessary renders
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
    tradeMode,
    form.entry_premium,
    form.exit_premium,
    form.quantity,
    form.lots,
    form.option_type,
    form.index_name,
    form.ce_entry_price,
    form.pe_entry_price,
    form.ce_exit_price,
    form.pe_exit_price,
    calculateCharges,
  ]);

  // Total Charges Computed
  const computedTotalCharges = useMemo(() => {
    const b = parseFloat(form.brokerage) || 0;
    const s = parseFloat(form.stt) || 0;
    const ex = parseFloat(form.exchange_charges) || 0;
    const g = parseFloat(form.gst) || 0;
    const seb = parseFloat(form.sebi_charges) || 0;
    const st = parseFloat(form.stamp_duty) || 0;
    const o = parseFloat(form.other_charges) || 0;
    return (b + s + ex + g + seb + st + o).toFixed(2);
  }, [
    form.brokerage,
    form.stt,
    form.exchange_charges,
    form.gst,
    form.sebi_charges,
    form.stamp_duty,
    form.other_charges,
  ]);

  // Gross Profit & Gross Loss calculation
  const computedGrossProfit = useMemo(() => {
    if (tradeMode === 'OPEN') return '0.00';
    const entry = Math.max(0, parseFloat(form.entry_premium) || 0);
    const exit = Math.max(0, parseFloat(form.exit_premium) || 0);
    const qty = Math.max(0, parseFloat(form.quantity) || 0);
    if (entry > 0 && exit > 0 && qty > 0) {
      const diff = (exit - entry) * qty;
      return diff > 0 ? diff.toFixed(2) : '0.00';
    }
    return Math.max(0, parseFloat(form.gross_profit || 0)).toFixed(2);
  }, [tradeMode, form.entry_premium, form.exit_premium, form.quantity, form.gross_profit]);

  const computedGrossLoss = useMemo(() => {
    if (tradeMode === 'OPEN') return '0.00';
    const entry = Math.max(0, parseFloat(form.entry_premium) || 0);
    const exit = Math.max(0, parseFloat(form.exit_premium) || 0);
    const qty = Math.max(0, parseFloat(form.quantity) || 0);
    if (entry > 0 && exit > 0 && qty > 0) {
      const diff = (exit - entry) * qty;
      return diff < 0 ? Math.abs(diff).toFixed(2) : '0.00';
    }
    return Math.max(0, parseFloat(form.gross_loss || 0)).toFixed(2);
  }, [tradeMode, form.entry_premium, form.exit_premium, form.quantity, form.gross_loss]);

  // Net P&L Computed
  const computedNetPnl = useMemo(() => {
    if (tradeMode === 'OPEN') {
      const ch = parseFloat(computedTotalCharges) || 0;
      return (-ch).toFixed(2);
    }
    const gp = parseFloat(computedGrossProfit) || 0;
    const gl = parseFloat(computedGrossLoss) || 0;
    const ch = parseFloat(computedTotalCharges) || 0;
    return (gp - gl - ch).toFixed(2);
  }, [tradeMode, computedGrossProfit, computedGrossLoss, computedTotalCharges]);

  // Auto Calculate Charges & P&L dynamically based on Brokerage & Regulatory settings
  const handleAutoCalculate = async () => {
    const entry = parseFloat(form.entry_premium) || 0;
    const exit = parseFloat(form.exit_premium) || 0;
    const qty = parseInt(form.quantity, 10) || 0;

    const isOpen = tradeMode === 'OPEN';
    const numOrders = isOpen ? (form.option_type === 'Both' ? 2 : 1) : (form.option_type === 'Both' ? 4 : 2);

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
        exit_premium: isOpen ? 0 : exit,
        quantity: qty,
        option_type: form.option_type,
        index_name: form.index_name,
        isOpen,
        status: isOpen ? 'OPEN' : 'CLOSED',
        executed_orders: numOrders,
        ce_entry_price: form.ce_entry_price,
        pe_entry_price: form.pe_entry_price,
        ce_exit_price: isOpen ? undefined : form.ce_exit_price,
        pe_exit_price: isOpen ? undefined : form.pe_exit_price,
      });

      if (res.data) {
        const est = res.data;
        setForm((prev) => ({
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
        showToast(`Charges calculated using dynamic regulatory rates (${est.exchange || 'NSE'})`);
        return;
      }
    } catch {
      // Local estimation fallback using active BrokerageContext rates
      const localEst = calculateCharges({
        entry,
        exit,
        quantity: qty,
        optionType: form.option_type,
        indexName: form.index_name,
        ceEntry: form.ce_entry_price,
        peEntry: form.pe_entry_price,
        ceExit: form.ce_exit_price,
        peExit: form.pe_exit_price,
      });

      setForm((prev) => ({
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
      showToast(`Charges auto-calculated via active brokerage schedule`);
    }
  };

  // Reset form
  const handleReset = () => {
    const defaultAtm = getIndexAtmStrike('NIFTY', atmStrikesData);
    const defaultExp = getIndexNearestExpiry('NIFTY', atmStrikesData) || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    setForm({
      trade_date: new Date().toISOString().split('T')[0],
      index_name: 'NIFTY',
      trading_type: 'Intraday',
      option_type: 'CE',
      strike_price: defaultAtm ? String(defaultAtm) : '',
      expiry_date: defaultExp,
      ce_entry_price: '',
      pe_entry_price: '',
      ce_exit_price: '',
      pe_exit_price: '',
      entry_premium: '',
      exit_premium: '',
      quantity: '50',
      lots: '1',
      strategy_name: 'Long Straddle',
      custom_strategy: '',
      market_conditions: 'Rangebound',
      gross_profit: '0.00',
      gross_loss: '0.00',
      total_charges: '0.00',
      brokerage: '40.00',
      stt: '0.00',
      exchange_charges: '0.00',
      gst: '0.00',
      sebi_charges: '0.00',
      stamp_duty: '0.00',
      other_charges: '0.00',
      entry_reason: '',
      exit_reason: '',
      trade_setup: '',
      what_went_right: '',
      what_went_wrong: '',
      mistakes_made: '',
      lessons_learned: '',
      personal_notes: '',
    });
    setSelectedScreenshots([]);
  };

  // Handle multiple Screenshot files
  const handleScreenshotFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validNewItems = [];
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage(`"${file.name}" exceeds the 10MB limit.`);
        continue;
      }
      validNewItems.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
      });
    }

    if (validNewItems.length > 0) {
      setSelectedScreenshots((prev) => [...prev, ...validNewItems]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveScreenshotItem = (idToRemove) => {
    setSelectedScreenshots((prev) => {
      const item = prev.find((it) => it.id === idToRemove);
      if (item?.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter((it) => it.id !== idToRemove);
    });
  };

  // Handle Submit
  const handleSaveTrade = async (keepOpen = false) => {
    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        trade_date: form.trade_date,
        status: tradeMode,
        index_name: form.index_name,
        trading_type: form.trading_type,
        strategy_name: form.strategy_name === 'CUSTOM' ? form.custom_strategy : form.strategy_name,
        option_type: form.option_type,
        strike_price: form.strike_price || null,
        expiry_date: form.expiry_date || null,
        ce_entry_price: form.option_type === 'Both' && form.ce_entry_price ? parseFloat(form.ce_entry_price) : null,
        pe_entry_price: form.option_type === 'Both' && form.pe_entry_price ? parseFloat(form.pe_entry_price) : null,
        entry_premium: form.entry_premium || null,
        ce_exit_price: tradeMode === 'OPEN' ? null : (form.option_type === 'Both' && form.ce_exit_price ? parseFloat(form.ce_exit_price) : null),
        pe_exit_price: tradeMode === 'OPEN' ? null : (form.option_type === 'Both' && form.pe_exit_price ? parseFloat(form.pe_exit_price) : null),
        exit_premium: tradeMode === 'OPEN' ? null : (form.exit_premium || null),
        exit_date: tradeMode === 'OPEN' ? null : (form.trade_date),
        quantity: parseInt(form.quantity, 10) || null,
        lots: parseInt(form.lots, 10) || 1,
        gross_profit: tradeMode === 'OPEN' ? 0 : (parseFloat(computedGrossProfit) || 0),
        gross_loss: tradeMode === 'OPEN' ? 0 : (parseFloat(computedGrossLoss) || 0),
        brokerage: parseFloat(form.brokerage) || 0,
        stt: parseFloat(form.stt) || 0,
        exchange_charges: parseFloat(form.exchange_charges) || 0,
        gst: parseFloat(form.gst) || 0,
        sebi_charges: parseFloat(form.sebi_charges) || 0,
        stamp_duty: parseFloat(form.stamp_duty) || 0,
        other_charges: parseFloat(form.other_charges) || 0,
        total_charges: parseFloat(computedTotalCharges) || 0,
        // Journal & Analysis
        market_conditions: form.market_conditions,
        entry_reason: form.entry_reason,
        exit_reason: tradeMode === 'OPEN' ? null : form.exit_reason,
        trade_setup: form.trade_setup,
        what_went_right: form.what_went_right,
        what_went_wrong: form.what_went_wrong,
        mistakes_made: form.mistakes_made,
        lessons_learned: form.lessons_learned,
        personal_notes: form.personal_notes,
      };

      if (form.option_type === 'Both' && (form.ce_entry_price || form.pe_entry_price)) {
        const legDetails = `Legs: [CE Entry: ₹${form.ce_entry_price || 0}, Exit: ₹${form.ce_exit_price || 0}] [PE Entry: ₹${form.pe_entry_price || 0}, Exit: ₹${form.pe_exit_price || 0}]`;
        payload.trade_setup = payload.trade_setup ? `${payload.trade_setup} | ${legDetails}` : legDetails;
      }

      const res = await api.post('/trades', payload);
      const createdTrade = res.data?.trade;
      if (selectedScreenshots.length > 0 && createdTrade?.id) {
        try {
          const formData = new FormData();
          selectedScreenshots.forEach((item) => {
            formData.append('screenshots[]', item.file);
          });
          await api.post(`/trades/${createdTrade.id}/screenshots`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (uploadErr) {
          console.error('Screenshots upload failed', uploadErr);
        }
      }
      setSuccessMessage('Trade successfully saved and recorded in journal!');

      if (keepOpen) {
        const curIdx = form.index_name || 'NIFTY';
        const defaultAtm = getIndexAtmStrike(curIdx, atmStrikesData);
        // Reset premiums and strike price for next trade, keep index & date
        setForm((prev) => ({
          ...prev,
          strike_price: defaultAtm ? String(defaultAtm) : '',
          ce_entry_price: '',
          pe_entry_price: '',
          ce_exit_price: '',
          pe_exit_price: '',
          entry_premium: '',
          exit_premium: '',
          gross_profit: '0.00',
          gross_loss: '0.00',
          entry_reason: '',
          exit_reason: '',
          what_went_right: '',
          what_went_wrong: '',
        }));
        setSelectedScreenshots([]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setTimeout(() => {
          navigate('/trades');
        }, 800);
      }
    } catch (err) {
      let msg = err.response?.data?.message || 'Failed to save trade. Please verify all required fields.';
      if (err.response?.data?.errors) {
        const errorList = Object.values(err.response.data.errors).flat().join('. ');
        if (errorList) msg = errorList;
      } else if (!err.response) {
        msg = 'Cannot connect to backend server. Please verify Laravel is active on port 8000.';
      }
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToSection = (sectionId) => {
    setActiveTab(sectionId);
    if (sectionId === 'preview') {
      setShowPreviewModal(true);
      return;
    }
    const elem = document.getElementById(sectionId);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12 text-slate-100 light:text-slate-800">
      {/* Page Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white light:text-slate-900">
              Add Trade
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Record your option trade with all details
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Trade Details / P&L & Charges / Strategy & Journal / Preview) */}
      <div className="flex items-center gap-2 p-1.5 bg-[#121b2d] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 rounded-2xl overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => scrollToSection('trade_details')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'trade_details'
              ? isKite
                ? 'text-[#ff5722] font-semibold bg-transparent shadow-none hover:bg-transparent'
                : 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
              : isKite
                ? 'text-[#9b9b9b] hover:text-white bg-transparent font-medium'
                : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 hover:bg-[#18233a] light:hover:bg-slate-200/60 font-medium'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Trade Details</span>
        </button>

        {/* <button
          type="button"
          onClick={() => scrollToSection('pnl_charges')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'pnl_charges'
              ? isKite
                ? 'text-[#ff5722] font-semibold bg-transparent shadow-none hover:bg-transparent'
                : 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
              : isKite
                ? 'text-[#9b9b9b] hover:text-white bg-transparent font-medium'
                : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 hover:bg-[#18233a] light:hover:bg-slate-200/60 font-medium'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>P&L & Charges</span>
        </button> */}

        {/* <button
          type="button"
          onClick={() => scrollToSection('strategy_journal')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'strategy_journal'
              ? isKite
                ? 'text-[#ff5722] font-semibold bg-transparent shadow-none hover:bg-transparent'
                : 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
              : isKite
                ? 'text-[#9b9b9b] hover:text-white bg-transparent font-medium'
                : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 hover:bg-[#18233a] light:hover:bg-slate-200/60 font-medium'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Strategy & Journal</span>
        </button> */}

        <button
          type="button"
          onClick={() => scrollToSection('preview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'preview'
              ? isKite
                ? 'text-[#ff5722] font-semibold bg-transparent shadow-none hover:bg-transparent'
                : 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
              : isKite
                ? 'text-[#9b9b9b] hover:text-white bg-transparent font-medium'
                : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 hover:bg-[#18233a] light:hover:bg-slate-200/60 font-medium'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Preview</span>
        </button>

        <button
          type="button"
          onClick={() => setShowOptionChainModal(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            isKite
              ? 'text-indigo-400 border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10'
              : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-600/10 border border-indigo-500/30 bg-indigo-500/5 shadow-sm'
          }`}
          title="Live NSE & BSE Option Chain with real spot prices, Greeks, and ATM strikes"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>Option Chain</span>
        </button>

        <button
          type="button"
          onClick={() => setShowImageOrderModal(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            isKite
              ? 'text-cyan-400 border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10'
              : 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-600/10 border border-cyan-500/30 bg-cyan-500/5 shadow-sm'
          }`}
          title="Import executed orders from order book screenshot (Zerodha Kite, Groww, etc.)"
        >
          <Camera className="w-3.5 h-3.5 text-cyan-400" />
          <span>Image Orders</span>
        </button>

        <button
          type="button"
          onClick={() => setShowBulkImportModal(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
            isKite
              ? 'text-[#ff5722] border border-[#ff5722]/30 bg-[#ff5722]/5 hover:bg-[#ff5722]/10'
              : 'text-blue-400 hover:text-blue-300 hover:bg-blue-600/10 border border-blue-500/30 bg-blue-500/5 shadow-sm'
          }`}
          title="Import trades in bulk from Zerodha, Kotak Neo, or Custom Excel"
        >
          <Upload className={`w-3.5 h-3.5 ${isKite ? 'text-[#ff5722]' : 'text-blue-400'}`} />
          <span>Bulk Import</span>
        </button>
      </div>

      {/* Main Grid: Left Form Cards (8 cols) & Right Summary + Quick Actions (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Form Sections */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Trade Details */}
          <div
            id="trade_details"
            className="p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-5"
          >
            <div>
              <h2 className="text-sm md:text-base font-bold text-white light:text-slate-900">
                Trade Details
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Enter basic trade information
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Position Mode Selector: Closed vs Open Position */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0e1626]/80 light:bg-slate-50 border border-[#1e293b] light:border-slate-200">
                <div>
                  <span className="text-xs font-bold text-white light:text-slate-900 block">
                    Position Mode
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Choose closed round-trip trade or an open position (with partial exits)
                  </span>
                </div>
                <div className="inline-flex p-1 rounded-xl bg-[#121b2d] light:bg-slate-200/70 border border-[#1e293b] light:border-slate-300">
                  <button
                    type="button"
                    onClick={() => setTradeMode('CLOSED')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      tradeMode === 'CLOSED'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white light:hover:text-slate-900'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Closed (Round-Trip)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTradeMode('OPEN')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      tradeMode === 'OPEN'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white light:hover:text-slate-900'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Open Position (BTST/Partial)</span>
                  </button>
                </div>
              </div>

              {/* Row 1: Trading Date, Index, Trading Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Trading Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      name="trade_date"
                      value={form.trade_date}
                      onChange={handleChange}
                      onClick={(e) => { try { e.target.showPicker?.(); } catch {} }}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Index <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="index_name"
                    value={form.index_name}
                    onChange={handleIndexChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    {/* Dynamic indices list filtered by active status in Dropdown Manager */}
                    {Object.keys(lotSizes)
                      .filter((idx) => {
                        if (idx === 'BANK NIFTY') return false;
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
                  <label className="block text-slate-400 mb-1 font-medium">
                    Trading Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="trading_type"
                    value={form.trading_type}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
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

              {/* Row 2: Option Type (Pills), Strike Price, Expiry Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Option Type <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-200">
                    {(activeOptionTypes && activeOptionTypes.length > 0
                      ? activeOptionTypes.map((o) => o.option_value)
                      : ['CE', 'PE', 'Both']
                    ).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setForm((prev) => {
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
                        className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                          form.option_type === opt
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white light:hover:text-slate-900'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <label className="text-slate-400 font-medium">
                        Strike Price
                      </label>
                      {currentAtmStrike && (
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, strike_price: String(currentAtmStrike) }))}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold transition-all cursor-pointer ${
                            String(form.strike_price) === String(currentAtmStrike)
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-[#1e293b] text-slate-400 hover:text-[#ff5722] hover:border-[#ff5722]/50 border border-transparent'
                          }`}
                          title={`Click to set ATM Strike (${currentAtmStrike})`}
                        >
                          ATM: {currentAtmStrike}
                        </button>
                      )}
                    </div>
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
                    step={currentStrikeStep}
                    min="0"
                    placeholder={currentAtmStrike ? String(currentAtmStrike) : "ATM Strike"}
                    name="strike_price"
                    value={form.strike_price}
                    onChange={handleChange}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    name="expiry_date"
                    value={form.expiry_date}
                    onChange={handleChange}
                    onClick={(e) => { try { e.target.showPicker?.(); } catch {} }}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                  />
                </div>
              </div>

              {/* Row 3: Entry Premium, Exit Premium, Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {form.option_type === 'Both' ? (
                  <>
                    {/* Both: CE & PE Entry Prices */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-400 font-medium">
                          Entry Premium
                        </label>
                        <span className="text-[10px] text-blue-400 font-mono-numbers font-semibold">
                          Total: ₹{form.entry_premium || '0.00'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="CE Entry"
                            name="ce_entry_price"
                            value={form.ce_entry_price}
                            onChange={handleBothPricesChange}
                            onKeyDown={blockNegativeKeys}
                            className="w-full pl-2.5 pr-8 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500 transition-colors"
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
                            name="pe_entry_price"
                            value={form.pe_entry_price}
                            onChange={handleBothPricesChange}
                            onKeyDown={blockNegativeKeys}
                            className="w-full pl-2.5 pr-8 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500 transition-colors"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-400 pointer-events-none">
                            PE
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Both: CE & PE Exit Prices or Open Notice */}
                    {tradeMode === 'OPEN' ? (
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">
                          Exit Status
                        </label>
                        <div className="px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-1.5 font-medium min-h-[42px]">
                          <Info className="w-4 h-4 shrink-0 text-amber-400" />
                          <span>Open Position (Execute exits from All Trades)</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-slate-400 font-medium">
                            Exit Premium
                          </label>
                          <span className="text-[10px] text-blue-400 font-mono-numbers font-semibold">
                            Total: ₹{form.exit_premium || '0.00'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="relative">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              placeholder="CE Exit"
                              name="ce_exit_price"
                              value={form.ce_exit_price}
                              onChange={handleBothPricesChange}
                              onKeyDown={blockNegativeKeys}
                              className="w-full pl-2.5 pr-8 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500 transition-colors"
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
                              name="pe_exit_price"
                              value={form.pe_exit_price}
                              onChange={handleBothPricesChange}
                              onKeyDown={blockNegativeKeys}
                              className="w-full pl-2.5 pr-8 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500 transition-colors"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-400 pointer-events-none">
                              PE
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">
                        Entry Premium
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="123.00"
                        name="entry_premium"
                        value={form.entry_premium}
                        onChange={handleChange}
                        onKeyDown={blockNegativeKeys}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    {tradeMode === 'OPEN' ? (
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">
                          Exit Status
                        </label>
                        <div className="px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-1.5 font-medium min-h-[42px]">
                          <Info className="w-4 h-4 shrink-0 text-amber-400" />
                          <span>Open Position (Record partial exits from All Trades)</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">
                          Exit Premium
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="156.00"
                          name="exit_premium"
                          value={form.exit_premium}
                          onChange={handleChange}
                          onKeyDown={blockNegativeKeys}
                          className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Quantity (Shares)
                  </label>
                  <input
                    type="number"
                    step={currentLotSize}
                    min="1"
                    placeholder="50"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleQuantityChange}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Row 4: Number of Lots, Strategy Name, Market Condition */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Number of Lots
                  </label>
                  <input
                    type="number"
                    min="1"
                    name="lots"
                    value={form.lots}
                    onChange={handleLotsChange}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <span className="text-[10px] text-slate-500 light:text-slate-400 mt-1 block">
                    Lot size: {currentLotSize} ({form.index_name})
                  </span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Strategy Name
                  </label>
                  <select
                    name="strategy_name"
                    value={form.strategy_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
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
                    <option value="CUSTOM">Custom Strategy...</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Market Condition
                  </label>
                  <select
                    name="market_conditions"
                    value={form.market_conditions}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
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
                  </select>
                </div>
              </div>

              {form.strategy_name === 'CUSTOM' && (
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Custom Strategy Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter custom strategy"
                    name="custom_strategy"
                    value={form.custom_strategy}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Card 2: P&L & Charges */}
          <div
            id="pnl_charges"
            className="p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-5"
          >
            <div>
              <h2 className="text-sm md:text-base font-bold text-white light:text-slate-900">
                P&L & Charges
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Enter profit, loss and trading charges
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Row 1: Gross Profit, Gross Loss, Total Charges, Auto Calculate Button */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-3">
                  <label className="block text-slate-400 mb-1 font-medium">
                    Gross Profit
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    name="gross_profit"
                    value={computedGrossProfit}
                    onChange={handleChange}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-emerald-50/40 border border-emerald-500/40 text-xs text-emerald-400 font-mono-numbers font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-slate-400 mb-1 font-medium">
                    Gross Loss
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    name="gross_loss"
                    value={computedGrossLoss}
                    onChange={handleChange}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-rose-400 font-mono-numbers focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-slate-400 mb-1 font-medium">
                    Total Charges
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    name="total_charges"
                    value={computedTotalCharges}
                    readOnly
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-xs text-slate-300 light:text-slate-700 font-mono-numbers focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="button"
                    onClick={handleAutoCalculate}
                    className="w-full px-3 py-2.5 rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Auto Calculate</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Charges breakdown 4-column */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="block text-slate-400 mb-1">SEBI turnover fee</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    name="sebi_charges"
                    value={form.sebi_charges}
                    onChange={handleChange}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Exchange Charges</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    name="exchange_charges"
                    value={form.exchange_charges}
                    onChange={handleChange}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500"
                  />
                </div>

                

                <div>
                  <label className="block text-slate-400 mb-1">Stamp Duty</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    name="stamp_duty"
                    value={form.stamp_duty}
                    onChange={handleChange}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">STT</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    name="stt"
                    value={form.stt}
                    onChange={handleChange}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500"
                  />
                </div>

              </div>

              {/* Row 3: Charges breakdown 3-column */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">GST</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    name="gst"
                    value={form.gst}
                    onChange={handleChange}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500"
                  />
                </div>
                

                
                <div>
                  <label className="block text-slate-400 mb-1">Brokerage</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    name="brokerage"
                    value={form.brokerage}
                    onChange={handleChange}
                    onKeyDown={blockNegativeKeys}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* <div>
                  <label className="block text-slate-400 mb-1">Other Charges</label>
                  <input
                    type="number"
                    step="0.01"
                    name="other_charges"
                    value={form.other_charges}
                    onChange={handleChange}
                    className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500"
                  />
                </div> */}
              </div>

              {/* Net P&L Highlight Box */}
              <div className="mt-4 p-4 rounded-2xl bg-[#0e1626] light:bg-emerald-50/50 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white light:text-slate-900 block">
                    Net P&L
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Automatically calculated
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`text-2xl font-black font-mono-numbers tracking-tight ${
                      parseFloat(computedNetPnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {parseFloat(computedNetPnl) >= 0 ? '+' : ''}
                    {formatINR(computedNetPnl)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Strategy & Journal */}
          <div
            id="strategy_journal"
            className="p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-5"
          >
            <div>
              <h2 className="text-sm md:text-base font-bold text-white light:text-slate-900">
                Strategy & Journal
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Add strategy details and notes (optional)
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Row 1: Entry Reason, Exit Reason, Trade Setup, What Went Right */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Entry Reason</label>
                  <input
                    type="text"
                    placeholder="Breakout above resistance"
                    name="entry_reason"
                    value={form.entry_reason}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Exit Reason</label>
                  <input
                    type="text"
                    placeholder="Booked profit at target"
                    name="exit_reason"
                    value={form.exit_reason}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Trade Setup</label>
                  <input
                    type="text"
                    placeholder="Long Straddle before event"
                    name="trade_setup"
                    value={form.trade_setup}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">What Went Right?</label>
                  <input
                    type="text"
                    placeholder="Good entry timing"
                    name="what_went_right"
                    value={form.what_went_right}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 2: What Went Wrong, Mistakes Made, Lessons Learned, Personal Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">What Went Wrong?</label>
                  <input
                    type="text"
                    placeholder="Exited early"
                    name="what_went_wrong"
                    value={form.what_went_wrong}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Mistakes Made</label>
                  <input
                    type="text"
                    placeholder="Could have held longer"
                    name="mistakes_made"
                    value={form.mistakes_made}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Lessons Learned</label>
                  <input
                    type="text"
                    placeholder="Be patient with targets"
                    name="lessons_learned"
                    value={form.lessons_learned}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Personal Notes</label>
                  <input
                    type="text"
                    placeholder="N/A"
                    name="personal_notes"
                    value={form.personal_notes}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-xs text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Row 3: Multiple Screenshot Upload Section */}
              <div className="pt-2 space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleScreenshotFilesChange}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-2xl border-2 border-dashed border-[#1e293b] light:border-slate-300 hover:border-blue-500/50 light:hover:border-blue-500 cursor-pointer transition-colors bg-[#0e1626]/50 light:bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center flex-shrink-0">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-200 light:text-slate-800 block">
                        {selectedScreenshots.length > 0
                          ? `${selectedScreenshots.length} Screenshot${selectedScreenshots.length > 1 ? 's' : ''} Selected`
                          : 'Upload Chart Screenshots (Optional)'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {selectedScreenshots.length > 0
                          ? 'Click to add more screenshots (PNG, JPG up to 10MB each)'
                          : 'Select or drag & drop multiple chart screenshots (PNG, JPG up to 10MB each)'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#162033] light:bg-slate-200 text-slate-300 light:text-slate-700 text-xs font-medium hover:text-white hover:bg-blue-600 transition-colors shadow-sm"
                  >
                    {selectedScreenshots.length > 0 ? '+ Add More Images' : 'Browse Files'}
                  </button>
                </div>

                {/* Multiple Screenshots Grid */}
                {selectedScreenshots.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                    {selectedScreenshots.map((item, idx) => (
                      <div
                        key={item.id}
                        className="group relative rounded-2xl bg-[#0e1626] border border-[#1e293b] overflow-hidden shadow-md hover:border-blue-500/40 transition-colors"
                      >
                        <div
                          className="h-28 w-full cursor-pointer overflow-hidden"
                          onClick={() => setViewingLightboxUrl(item.preview)}
                        >
                          <img
                            src={item.preview}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>

                        {/* File Details Tag */}
                        <div className="p-1.5 bg-[#0a0f1d] border-t border-[#1e293b] flex items-center justify-between text-[10px] text-slate-400">
                          <span className="truncate max-w-[90px]" title={item.name}>
                            {item.name}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono ml-1 flex-shrink-0">
                            {item.size}
                          </span>
                        </div>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveScreenshotItem(item.id);
                          }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center text-xs font-bold shadow-lg transition-transform hover:scale-110"
                          title="Remove image"
                        >
                          ✕
                        </button>

                        {/* Index indicator */}
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[9px] font-bold text-slate-200">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Sticky Trade Summary & Quick Actions */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
          {/* Trade Summary Card */}
          <div className="p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white light:text-slate-900">
                Trade Summary
              </h2>
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live calculation
              </span>
            </div>

            {/* Spec details table */}
            <div className="divide-y divide-[#1e293b]/60 light:divide-slate-200 text-xs">
              <div className="py-2 flex items-center justify-between text-slate-400">
                <span>Status</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    tradeMode === 'OPEN'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                  }`}
                >
                  {tradeMode === 'OPEN' ? 'OPEN (Holding)' : 'CLOSED'}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between text-slate-400">
                <span>Index</span>
                <span className="font-semibold text-white light:text-slate-900 font-sans">
                  {form.index_name}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between text-slate-400">
                <span>Type</span>
                <span className="font-semibold text-white light:text-slate-900 font-sans">
                  {form.trading_type}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between text-slate-400">
                <span>Option Type</span>
                <span className="font-semibold text-blue-400 font-sans">
                  {form.option_type}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between text-slate-400">
                <span>Strike Price</span>
                <span className="font-semibold text-white light:text-slate-900 font-mono-numbers">
                  {form.strike_price || '-'}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between text-slate-400">
                <span>Expiry Date</span>
                <span className="font-semibold text-white light:text-slate-900">
                  {form.expiry_date ? formatDate(form.expiry_date) : '-'}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between text-slate-400">
                <span>Lots</span>
                <span className="font-semibold text-white light:text-slate-900 font-mono-numbers">
                  {form.lots} ({form.quantity} Qty)
                </span>
              </div>
              <div className="py-2 text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Entry Premium</span>
                  <span className="font-semibold text-white light:text-slate-900 font-mono-numbers">
                    {form.entry_premium ? formatINR(form.entry_premium) : '-'}
                  </span>
                </div>
                {form.option_type === 'Both' && (form.ce_entry_price || form.pe_entry_price) && (
                  <div className="flex items-center justify-between mt-1 text-[11px] font-mono-numbers px-2 py-1 rounded-lg bg-[#0e1626] border border-[#1e293b]">
                    <span className="text-emerald-400 font-semibold">CE: ₹{form.ce_entry_price || '0.00'}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-rose-400 font-semibold">PE: ₹{form.pe_entry_price || '0.00'}</span>
                  </div>
                )}
              </div>
              <div className="py-2 text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Exit Premium</span>
                  {tradeMode === 'OPEN' ? (
                    <span className="text-amber-400 font-semibold text-[11px]">
                      Pending Exit (Open)
                    </span>
                  ) : (
                    <span className="font-semibold text-white light:text-slate-900 font-mono-numbers">
                      {form.exit_premium ? formatINR(form.exit_premium) : '-'}
                    </span>
                  )}
                </div>
                {tradeMode !== 'OPEN' && form.option_type === 'Both' && (form.ce_exit_price || form.pe_exit_price) && (
                  <div className="flex items-center justify-between mt-1 text-[11px] font-mono-numbers px-2 py-1 rounded-lg bg-[#0e1626] border border-[#1e293b]">
                    <span className="text-emerald-400 font-semibold">CE: ₹{form.ce_exit_price || '0.00'}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-rose-400 font-semibold">PE: ₹{form.pe_exit_price || '0.00'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Calculations */}
            <div className="pt-2 border-t border-[#1e293b] light:border-slate-200 divide-y divide-[#1e293b]/60 light:divide-slate-200 text-xs">
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-400">Gross Profit</span>
                <span className="font-bold text-emerald-400 font-mono-numbers">
                  {tradeMode === 'OPEN' ? '₹0.00' : formatINR(computedGrossProfit)}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-400">Gross Loss</span>
                <span className="font-bold text-rose-400 font-mono-numbers">
                  {tradeMode === 'OPEN' ? '₹0.00' : formatINR(computedGrossLoss)}
                </span>
              </div>
              <div className="py-2 flex items-center justify-between">
                <span className="text-slate-400">
                  {tradeMode === 'OPEN' ? 'Entry Charges' : 'Total Charges'}
                </span>
                <span className="font-bold text-slate-300 light:text-slate-700 font-mono-numbers">
                  {formatINR(computedTotalCharges)}
                </span>
              </div>
            </div>

            {/* Net P&L in Summary */}
            <div className="pt-3 border-t border-[#1e293b] light:border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 light:text-slate-700">
                {tradeMode === 'OPEN' ? 'Position Status' : 'Net P&L'}
              </span>
              {tradeMode === 'OPEN' ? (
                <div className="text-right">
                  <span className="text-base font-black font-mono-numbers text-amber-400 block">
                    OPEN POSITION
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Pending exit executions
                  </span>
                </div>
              ) : (
                <span
                  className={`text-xl font-black font-mono-numbers ${
                    parseFloat(computedNetPnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {parseFloat(computedNetPnl) >= 0 ? '+' : ''}
                  {formatINR(computedNetPnl)}
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="p-5 md:p-6 rounded-3xl bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-white light:text-slate-900">
              Quick Actions
            </h2>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSaveTrade(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? 'Saving...' : 'Save Trade'}
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSaveTrade(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-slate-200 light:text-slate-800 hover:bg-[#162033] light:hover:bg-slate-200 font-semibold text-xs transition-colors disabled:opacity-50"
            >
              Save & Add Another
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-slate-200 light:hover:text-slate-900 font-semibold text-xs transition-colors"
            >
              Reset Form
            </button>
          </div>
        </div>
      </div>

      {/* Floating Bottom Action Bar for Mobile View */}
      <div className="fixed bottom-16 inset-x-0 p-3 bg-[#0e1626]/95 light:bg-white/95 backdrop-blur-md border-t border-[#1e293b] light:border-slate-200 z-30 lg:hidden flex items-center justify-between gap-3 shadow-2xl">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400">Estimated Net P&L</span>
          <span
            className={`text-sm font-bold font-mono-numbers ${
              parseFloat(computedNetPnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {parseFloat(computedNetPnl) >= 0 ? '+' : ''}
            {formatINR(computedNetPnl)}
          </span>
        </div>
        <button
          type="button"
          disabled={submitting}
          onClick={() => handleSaveTrade(false)}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save Trade'}
        </button>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e293b] light:border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white light:text-slate-900">
                  Trade Card Preview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200">
                <div>
                  <span className="text-sm font-bold text-white light:text-slate-900 block">
                    {form.index_name} {form.strike_price} {form.option_type}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {form.strategy_name} • {form.trading_type} • {form.trade_date ? formatDate(form.trade_date) : '-'}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`text-base font-black font-mono-numbers ${
                      parseFloat(computedNetPnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {parseFloat(computedNetPnl) >= 0 ? '+' : ''}
                    {formatINR(computedNetPnl)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Total Charges: {formatINR(computedTotalCharges)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Entry Reason</span>
                  <span className="text-slate-200 light:text-slate-800">
                    {form.entry_reason || 'Not specified'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200">
                  <span className="text-slate-400 block mb-0.5">Exit Reason</span>
                  <span className="text-slate-200 light:text-slate-800">
                    {form.exit_reason || 'Not specified'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 text-xs font-semibold text-slate-300 light:text-slate-700"
              >
                Close Preview
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setShowPreviewModal(false);
                  handleSaveTrade(false);
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30"
              >
                Save This Trade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onImportSuccess={() => {
          // Keep modal open on the Success Results screen so user can review imported entries
        }}
      />

      {/* Image Order Import Modal */}
      <ImageOrderImportModal
        isOpen={showImageOrderModal}
        onClose={() => setShowImageOrderModal(false)}
        onImportSuccess={() => {
          navigate('/all-trades');
        }}
        onApplyToForm={handleApplyOrdersToForm}
      />

      {/* Real-Time Option Chain Modal (NSE & BSE) */}
      <OptionChainModal
        isOpen={showOptionChainModal}
        onClose={() => setShowOptionChainModal(false)}
        initialSymbol={form.index_name}
        initialStrike={form.strike_price}
        initialOptionType={form.option_type}
        initialExpiry={form.expiry_date}
        onSelectOption={handleSelectOptionFromChain}
      />

      {/* Lightbox Modal for enlarged view */}
      {viewingLightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          onClick={() => setViewingLightboxUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-[#121b2d] border border-[#1e293b] rounded-3xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e293b]">
              <span className="text-xs font-semibold text-slate-300">Screenshot Preview</span>
              <button
                type="button"
                onClick={() => setViewingLightboxUrl(null)}
                className="w-7 h-7 rounded-full bg-[#162033] text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-3 max-h-[80vh] overflow-auto flex items-center justify-center">
              <img
                src={viewingLightboxUrl}
                alt="Enlarged screenshot"
                className="max-h-[75vh] w-auto rounded-xl object-contain shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
