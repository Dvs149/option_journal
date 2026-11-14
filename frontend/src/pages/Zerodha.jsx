import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  RefreshCw,
  Wallet,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  Settings as SettingsIcon,
  LogOut,
  Info,
  Clock,
  Sparkles,
  Search,
  Filter,
  Eye,
  EyeOff,
  Key,
  Lock,
  ChevronRight,
  Database,
  FileText,
} from 'lucide-react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import ZerodhaOrderImportModal from '../components/trades/ZerodhaOrderImportModal';
import ZerodhaContractNoteModal from '../components/trades/ZerodhaContractNoteModal';

// Helper to format raw exchange tradingsymbols into authentic Zerodha Kite display
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

export default function Zerodha() {
  const navigate = useNavigate();
  const { triggerToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showContractNoteModal, setShowContractNoteModal] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [details, setDetails] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('orders'); // orders, positions, holdings, margins, profile
  const [positionType, setPositionType] = useState('net'); // net, day
  const [positionStatusFilter, setPositionStatusFilter] = useState('ALL'); // ALL, OPEN, CLOSED
  const [positionSearchQuery, setPositionSearchQuery] = useState('');
  const [orderFilter, setOrderFilter] = useState('ALL'); // ALL, COMPLETE, CANCELLED, REJECTED
  const [searchQuery, setSearchQuery] = useState('');
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Form states for connect (Email, Password, API Key, Secret)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Token exchange & direct token states
  const [requestTokenInput, setRequestTokenInput] = useState('');
  const [isExchanging, setIsExchanging] = useState(false);
  const [accessTokenInput, setAccessTokenInput] = useState('');
  const [isSettingToken, setIsSettingToken] = useState(false);
  const [showDirectToken, setShowDirectToken] = useState(false);

  // Fetch integration status & details
  const fetchZerodhaData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Check status
      const statusRes = await api.get('/zerodha/status');
      setStatusData(statusRes.data);

      if (statusRes.data?.integration?.broker_user_id) {
        setEmail(statusRes.data.integration.broker_user_id);
      } else if (statusRes.data?.integration?.email) {
        setEmail(statusRes.data.integration.email);
      }
      if (statusRes.data?.integration?.api_key && statusRes.data.integration.api_key !== 'DEMO_KITE_KEY') {
        setApiKey(statusRes.data.integration.api_key);
      } else if (statusRes.data?.integration?.meta?.api_key) {
        setApiKey(statusRes.data.integration.meta.api_key);
      }

      if (statusRes.data?.is_connected) {
        // Fetch full portfolio details
        const detailsRes = await api.get('/zerodha/details');
        setDetails(detailsRes.data);
      } else {
        setDetails(null);
      }
    } catch (err) {
      console.error('Failed to load Zerodha data', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch Zerodha details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Exchange request_token for live session access_token
  const handleExchangeToken = async (explicitToken) => {
    const rawToken = (explicitToken || requestTokenInput).trim();
    if (!rawToken) {
      triggerToast('Please provide a valid request token or callback URL', 'error');
      return;
    }

    try {
      setIsExchanging(true);
      const res = await api.post('/zerodha/exchange-token', {
        request_token: rawToken,
      });

      triggerToast(res.data?.message || 'Zerodha Kite daily session authenticated!', 'success');
      setRequestTokenInput('');
      fetchZerodhaData();
    } catch (err) {
      console.error('Exchange failed', err);
      triggerToast(err.response?.data?.message || 'Failed to exchange request token with Zerodha', 'error');
    } finally {
      setIsExchanging(false);
    }
  };

  // Direct access_token setter
  const handleSetAccessToken = async (e) => {
    e?.preventDefault();
    const token = accessTokenInput.trim();
    if (!token) {
      triggerToast('Please enter an access token', 'error');
      return;
    }

    try {
      setIsSettingToken(true);
      const res = await api.post('/zerodha/set-token', {
        access_token: token,
      });

      triggerToast(res.data?.message || 'Zerodha Access Token verified and active!', 'success');
      setAccessTokenInput('');
      setShowDirectToken(false);
      fetchZerodhaData();
    } catch (err) {
      console.error('Direct token failed', err);
      triggerToast(err.response?.data?.message || 'Invalid or expired Zerodha access token', 'error');
    } finally {
      setIsSettingToken(false);
    }
  };

  // Initial load + Auto-detect request_token from URL callback
  useEffect(() => {
    fetchZerodhaData();

    // Check if user just returned from Zerodha login redirect
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('request_token');
    if (tokenParam) {
      handleExchangeToken(tokenParam);
      // Clean query parameter from URL without page reload
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [fetchZerodhaData]);

  // Connect via Form with Email & Password + API Key & Secret
  const handleConnect = async (e) => {
    e.preventDefault();
    if (!email.trim() && !apiKey.trim()) {
      triggerToast('Please provide your Zerodha Client ID or Kite API Key', 'error');
      return;
    }

    try {
      setConnecting(true);
      const res = await api.post('/zerodha/connect', {
        email: email.trim() || null,
        password: password.trim() || null,
        api_key: apiKey.trim() || null,
        api_secret: apiSecret.trim() || null,
      });

      triggerToast(res.data?.message || 'Zerodha Kite Connected Successfully!', 'success');
      setShowConnectModal(false);
      fetchZerodhaData();
    } catch (err) {
      console.error('Connect failed', err);
      triggerToast(err.response?.data?.message || 'Failed to connect Zerodha', 'error');
    } finally {
      setConnecting(false);
    }
  };

  // Connect Demo Account
  const handleConnectDemo = async () => {
    try {
      setConnecting(true);
      const res = await api.post('/zerodha/connect-demo');
      triggerToast('Connected in Demo Sandbox mode with sample portfolio!', 'success');
      setShowConnectModal(false);
      fetchZerodhaData();
    } catch (err) {
      console.error('Demo connect failed', err);
      triggerToast(err.response?.data?.message || 'Failed to connect Demo account', 'error');
    } finally {
      setConnecting(false);
    }
  };

  // Disconnect
  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect Zerodha Kite Connect?')) {
      return;
    }
    try {
      await api.post('/zerodha/disconnect');
      triggerToast('Zerodha Kite disconnected', 'info');
      fetchZerodhaData();
    } catch (err) {
      console.error('Disconnect failed', err);
      triggerToast('Failed to disconnect Zerodha', 'error');
    }
  };

  // Import executed orders to TradeJournal
  const handleImportOrders = async () => {
    try {
      setImporting(true);
      const res = await api.post('/zerodha/import-orders');
      if (res.data?.imported_count > 0) {
        triggerToast(res.data.message, 'success');
      } else {
        triggerToast(res.data?.message || 'All executed orders already imported.', 'info');
      }
    } catch (err) {
      console.error('Import failed', err);
      triggerToast(err.response?.data?.message || 'Failed to import orders', 'error');
    } finally {
      setImporting(false);
    }
  };

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  };

  const isDemo = Boolean(statusData?.is_demo || details?.is_demo);
  const isNeedsAuth = details?.status === 'needs_auth';
  const profile = details?.profile || statusData?.integration || {};
  const summary = details?.summary || {};
  const margins = details?.margins || {};
  const orders = details?.orders || [];
  const allOrders = details?.all_orders || orders;
  const positions = details?.positions || { net: [], day: [] };
  const holdings = details?.holdings || [];

  // Calculate Virtual Contract Note total charges for today's executed orders
  const contractNoteCharges = useMemo(() => {
    if (summary.contract_note_charges != null && Number(summary.contract_note_charges) > 0) {
      return Number(summary.contract_note_charges);
    }

    if (!orders || orders.length === 0) return 0;

    let buyTurnover = 0;
    let sellTurnover = 0;
    let totalTurnover = 0;
    let execCount = 0;

    const executed = orders.filter((o) => {
      const status = String(o.status || '').toUpperCase();
      return ['COMPLETE', 'TRADED', 'EXECUTED'].includes(status) || !status;
    });

    executed.forEach((ord) => {
      const isBuy = String(ord.transaction_type || '').toUpperCase() === 'BUY';
      const qty = Math.abs(parseInt(ord.filled_quantity ?? ord.quantity ?? 0, 10) || 0);
      const price = parseFloat(ord.average_price ?? ord.price ?? 0) || 0;
      const turnover = qty * price;
      if (turnover <= 0 && qty <= 0) return;
      execCount++;
      if (isBuy) buyTurnover += turnover;
      else sellTurnover += turnover;
      totalTurnover += turnover;
    });

    if (execCount === 0) return 0;

    const brokerage = execCount * 20.00;
    const rawExchange = totalTurnover * 0.0003553;
    const rawSebi = totalTurnover * 0.000001;
    const stampDuty = Math.round(buyTurnover * 0.00003);
    const rawStt = sellTurnover * 0.0015;
    const rawGst = (brokerage + rawExchange + rawSebi) * 0.18;

    return Math.round((brokerage + rawExchange + rawSebi + stampDuty + rawStt + rawGst) * 100) / 100;
  }, [orders, summary.contract_note_charges]);

  // Closed vs Open positions list
  const netPositionsList = positions?.net || [];
  const closedPositionsList = useMemo(() => {
    return netPositionsList.filter((p) => Number(p.quantity ?? 0) === 0);
  }, [netPositionsList]);

  const openPositionsList = useMemo(() => {
    return netPositionsList.filter((p) => Number(p.quantity ?? 0) !== 0);
  }, [netPositionsList]);

  // Gross P&L from closed positions ONLY (Total P&L, not Day's P&L)
  const closedGrossPnl = useMemo(() => {
    if (summary.closed_positions_pnl != null) {
      return Number(summary.closed_positions_pnl);
    }
    if (closedPositionsList.length === 0) return 0;
    return closedPositionsList.reduce((acc, p) => acc + Number(p.pnl ?? 0), 0);
  }, [closedPositionsList, summary.closed_positions_pnl]);

  // Net P&L: Total P&L of closed positions minus contract note charges
  const dayNetPnl = summary.net_pnl != null
    ? Number(summary.net_pnl)
    : Math.round((closedGrossPnl - contractNoteCharges) * 100) / 100;

  // Gross P&L from ALL positions (both closed and open Total P&L)
  const overallGrossPnl = useMemo(() => {
    if (summary.overall_gross_pnl != null) {
      return Number(summary.overall_gross_pnl);
    }
    if (netPositionsList.length === 0) return 0;
    return netPositionsList.reduce((acc, p) => acc + Number(p.pnl ?? 0), 0);
  }, [netPositionsList, summary.overall_gross_pnl]);

  // Overall Net P&L: Both closed and open Total P&L minus contract note charges
  const overallNetPnl = summary.overall_net_pnl != null
    ? Number(summary.overall_net_pnl)
    : Math.round((overallGrossPnl - contractNoteCharges) * 100) / 100;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 space-y-4">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Connecting to Zerodha Kite API...</p>
      </div>
    );
  }

  // UNCONNECTED STATE
  if (!statusData?.is_connected) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto px-2 sm:px-4 py-4">
        {/* Banner */}
        <div className="bg-gradient-to-br from-[#121b2d] via-[#101725] to-[#0d1320] border border-[#1e293b] rounded-3xl p-8 sm:p-12 shadow-xl relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
                <Flame className="w-4 h-4 text-orange-500" />
                <span>Zerodha Kite Connect Integration</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Live Portfolio & Executed Orders Sync
              </h1>

              <p className="text-sm text-slate-400 leading-relaxed">
                Connect your Zerodha Kite account to review real-time available margins, executed orders, net & day positions, and holdings. This integration is <strong className="text-emerald-400">strictly read-only</strong>: TradeJournal never executes, creates, or alters broker orders.
              </p>

              {/* Read-Only Safety Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-2.5 text-xs text-slate-300 bg-[#162238]/60 p-2.5 rounded-xl border border-white/5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Strictly Read-Only (Zero order placement)</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300 bg-[#162238]/60 p-2.5 rounded-xl border border-white/5">
                  <Wallet className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Real-time Margins & Cash Balances</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300 bg-[#162238]/60 p-2.5 rounded-xl border border-white/5">
                  <Layers className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Net & Day Positions with Live MTM</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-300 bg-[#162238]/60 p-2.5 rounded-xl border border-white/5">
                  <Download className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>1-Click Import to TradeJournal</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs shadow-lg shadow-orange-600/25 transition-all flex items-center gap-2"
                >
                  <Flame className="w-4 h-4" />
                  Connect Zerodha Kite
                </button>

                <button
                  type="button"
                  onClick={handleConnectDemo}
                  disabled={connecting}
                  className="px-5 py-2.5 rounded-xl bg-[#1c283f] hover:bg-[#243350] text-slate-200 font-semibold text-xs border border-[#2b3a56] transition-all flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Try with Sandbox / Demo
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/settings?tab=Integrations')}
                  className="px-4 py-2.5 rounded-xl bg-transparent hover:bg-white/5 text-slate-400 hover:text-white font-medium text-xs transition-all flex items-center gap-1.5"
                >
                  <SettingsIcon className="w-4 h-4" />
                  Configure in Settings
                </button>
              </div>
            </div>

            <div className="w-full md:w-64 shrink-0 bg-[#0c1322] border border-[#1e293b] rounded-2xl p-5 space-y-3">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Connection Status
              </span>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-sm font-bold text-white">Not Connected</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Enter your Zerodha credentials & Kite API Key to link your live account with zero risk.
              </p>
              <a
                href="https://kite.trade/docs/connect/v3/"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-orange-400 hover:underline flex items-center gap-1 pt-1"
              >
                Kite Connect API Documentation
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Modal for Connect */}
        {showConnectModal && renderConnectModal()}
      </div>
    );
  }

  // Filtered orders
  const filteredOrders = allOrders.filter((order) => {
    if (orderFilter !== 'ALL') {
      if (orderFilter === 'COMPLETE' && !['COMPLETE', 'TRADED', 'EXECUTED'].includes(order.status)) return false;
      if (orderFilter === 'CANCELLED' && order.status !== 'CANCELLED') return false;
      if (orderFilter === 'REJECTED' && order.status !== 'REJECTED') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const sym = (order.tradingsymbol || '').toLowerCase();
      const oid = (order.order_id || '').toLowerCase();
      return sym.includes(q) || oid.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4">
      {/* Top Header Card */}
      <div className="bg-[#121b2d] border border-[#1e293b] rounded-3xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-600/20 text-orange-500 font-extrabold flex items-center justify-center text-xl shadow-inner border border-orange-500/20">
            ▲
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-white tracking-tight">
                Zerodha Kite Connect
              </h1>
              {isDemo ? (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider">
                  Demo / Sandbox Mode
                </span>
              ) : isNeedsAuth ? (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  Session Login Required
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Connected
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
              <span>Client ID: <strong className="text-white font-mono">{profile.broker_user_id || 'N/A'}</strong></span>
              <span>•</span>
              <span>User: <strong className="text-slate-200">{profile.user_name || 'Trader'}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <Clock className="w-3 h-3" />
                Synced: {details?.last_synced_at ? new Date(details.last_synced_at).toLocaleTimeString() : 'Just now'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchZerodhaData(true)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-xl bg-[#162033] hover:bg-[#1e2c46] text-slate-200 text-xs font-semibold border border-[#1e293b] flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Fetch latest data from Zerodha"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          {!isNeedsAuth && (
            <>
              <button
                type="button"
                onClick={() => setShowContractNoteModal(true)}
                disabled={orders.length === 0}
                className="px-3.5 py-2 rounded-xl bg-[#162033] hover:bg-[#1e2c46] text-slate-200 text-xs font-semibold border border-[#1e293b] flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                title="View Virtual Contract Note with regulatory charges breakdown"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Contract Note</span>
              </button>

              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                disabled={orders.length === 0}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                title="Review and select executed orders to import into TradeJournal"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{`Import to Journal (${orders.length})`}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => navigate('/settings?tab=Integrations')}
            className="p-2 rounded-xl bg-[#162033] hover:bg-[#1e2c46] text-slate-400 hover:text-white border border-[#1e293b] transition-all"
            title="Zerodha Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleDisconnect}
            className="p-2 rounded-xl bg-[#162033] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-[#1e293b] transition-all"
            title="Disconnect Zerodha"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* VIEW A: SESSION AUTHENTICATION REQUIRED (NO DUMMY DATA DISPLAYED) */}
      {isNeedsAuth && !isDemo ? (
        <div className="space-y-6">
          {/* Main Action Banner */}
          <div className="bg-gradient-to-br from-[#1c1815] via-[#151a28] to-[#0f1422] border border-orange-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center">
                  <Key className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-white tracking-tight">
                    Zerodha Kite Daily Session Authentication Required
                  </h2>
                  <p className="text-xs text-orange-300/80">
                    Kite Connect v3 requires daily 2FA authorization to load your genuine live portfolio & orders
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0b101c]/80 border border-white/10 text-xs text-slate-300 space-y-2">
                <p className="leading-relaxed">
                  Your credentials for <strong className="text-white font-mono">{email || apiKey}</strong> are saved securely. However, per SEBI & Zerodha guidelines, a live session must be authorized once every day.
                </p>
                <div className="flex items-center gap-2 text-emerald-400 font-medium pt-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Strictly Read-Only: Zero dummy data will be displayed. Your real orders and balances appear immediately upon authorization.</span>
                </div>
              </div>

              {/* 2-Step Login Process */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Step 1: 1-Click Kite Login */}
                <div className="bg-[#121b2d] border border-orange-500/30 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg">
                  <div className="space-y-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold uppercase tracking-wider inline-block">
                      Step 1 (Recommended)
                    </span>
                    <h3 className="text-sm font-bold text-white">Log in with Zerodha Kite</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Click below to log in securely through Zerodha's official login portal with your Client ID, Password, and TOTP.
                    </p>
                  </div>

                  <a
                    href={details?.login_url || `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey || 'i7nm8563g7p5a2dw'}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <Flame className="w-4 h-4 text-white" />
                    <span>🔑 1-Click Login with Zerodha Kite</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                </div>

                {/* Step 2: Paste Request Token / Callback URL */}
                <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider inline-block">
                      Step 2
                    </span>
                    <h3 className="text-sm font-bold text-white">Authenticate Request Token</h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      After login, Zerodha redirects you. If not redirected to this tab, copy and paste the redirected URL or <code>request_token</code> below:
                    </p>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleExchangeToken(); }} className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Paste request_token or full redirect URL"
                        value={requestTokenInput}
                        onChange={(e) => setRequestTokenInput(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-[#090f1d] border border-[#1e293b] text-white text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={isExchanging || !requestTokenInput.trim()}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                      >
                        {isExchanging ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        <span>{isExchanging ? 'Syncing...' : 'Authenticate'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Advanced Access Token Toggle */}
              <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setShowDirectToken(!showDirectToken)}
                  className="text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{showDirectToken ? 'Hide Direct Access Token Input' : 'Or enter an active Kite Access Token directly'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleConnectDemo}
                  disabled={connecting}
                  className="text-amber-400 hover:underline flex items-center gap-1.5 text-xs font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Want to test simulation instead? Switch to Demo Mode</span>
                </button>
              </div>

              {/* Direct Access Token Form */}
              {showDirectToken && (
                <form onSubmit={handleSetAccessToken} className="p-4 rounded-2xl bg-[#0b101c] border border-white/10 space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white block">
                      Direct Kite Access Token
                    </label>
                    <p className="text-[11px] text-slate-400">
                      If you already have a 32-character active daily session access token generated from Postman or Kite CLI:
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 78kd92jd01xxxx"
                      value={accessTokenInput}
                      onChange={(e) => setAccessTokenInput(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-[#090f1d] border border-[#1e293b] text-white text-xs font-mono focus:outline-none focus:border-orange-500"
                    />
                    <button
                      type="submit"
                      disabled={isSettingToken || !accessTokenInput.trim()}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isSettingToken ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>Save & Activate</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-4 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Live Margin & Cash</h4>
              <p className="text-[11px] text-slate-400">
                Real-time equity and commodity available cash, collateral, and debit balances.
              </p>
            </div>

            <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-4 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Executed Orders Today</h4>
              <p className="text-[11px] text-slate-400">
                View all traded, limit, and market orders executed today with 1-click journal import.
              </p>
            </div>

            <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-4 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Net & Day Positions</h4>
              <p className="text-[11px] text-slate-400">
                Track open F&O and equity positions with real-time mark-to-market (MTM) P&L.
              </p>
            </div>

            <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-4 space-y-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Strictly Read-Only</h4>
              <p className="text-[11px] text-slate-400">
                Zero order placement or modification logic exists. Your trading funds are 100% safe.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW B: LIVE / DEMO DASHBOARD (WITH REAL LIVE DATA) */
        <>
          {/* 4 Top Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Closed Position Net P&L (Gross Total P&L of closed positions minus charges) */}
            <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-white">Closed Net P&L</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                    Today
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-slate-400">
                    Closed ({closedPositionsList.length})
                  </span>
                </div>
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    dayNetPnl >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {dayNetPnl >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                </div>
              </div>
              <div>
                <div
                  className={`text-xl font-black font-mono ${
                    dayNetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {dayNetPnl >= 0 ? '+' : ''}
                  {formatCurrency(dayNetPnl)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between font-mono">
                  <span>
                    Gross: <span className={closedGrossPnl >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                      {closedGrossPnl >= 0 ? '+' : ''}{formatCurrency(closedGrossPnl)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowContractNoteModal(true)}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 group"
                    title="View Virtual Contract Note breakdown"
                  >
                    <span>Charges:</span>
                    <span className="text-orange-400 font-semibold group-hover:underline">
                      -{formatCurrency(contractNoteCharges)}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Overall Net P&L (Total P&L of both closed and open positions minus charges) */}
            <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-white">Overall Net P&L</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                    Open + Closed
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-slate-400">
                    All ({netPositionsList.length})
                  </span>
                </div>
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    overallNetPnl >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {overallNetPnl >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                </div>
              </div>
              <div>
                <div
                  className={`text-xl font-black font-mono ${
                    overallNetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {overallNetPnl >= 0 ? '+' : ''}
                  {formatCurrency(overallNetPnl)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between font-mono">
                  <span>
                    Gross: <span className={overallGrossPnl >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                      {overallGrossPnl >= 0 ? '+' : ''}{formatCurrency(overallGrossPnl)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowContractNoteModal(true)}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 group"
                    title="View Virtual Contract Note breakdown"
                  >
                    <span>Charges:</span>
                    <span className="text-orange-400 font-semibold group-hover:underline">
                      -{formatCurrency(contractNoteCharges)}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Card 3: Used Margin */}
            <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>Used Margin (Debits)</span>
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <div className="text-xl font-black text-white font-mono">
                  {formatCurrency(summary.used_margin ?? 0)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>Option Prem: {formatCurrency(margins?.equity?.utilised?.option_premium ?? 0)}</span>
                  <span>SPAN: {formatCurrency(margins?.equity?.utilised?.span ?? 0)}</span>
                </div>
              </div>
            </div>

            {/* Card 4: Holdings Portfolio */}
            <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                <span>Holdings Value ({holdings.length} stocks)</span>
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
              </div>
              <div>
                <div className="text-xl font-black text-white font-mono">
                  {formatCurrency(summary.holdings_value ?? 0)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                  <span>Total P&L:</span>
                  <span
                    className={`font-semibold font-mono ${
                      (summary.holdings_pnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {(summary.holdings_pnl ?? 0) >= 0 ? '+' : ''}
                    {formatCurrency(summary.holdings_pnl ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-2 border-b border-[#1e293b] pb-2 text-xs overflow-x-auto">
            {[
              { id: 'orders', label: `Executed Orders (${orders.length})` },
              { id: 'positions', label: `Positions (${positions.net?.length ?? 0})` },
              { id: 'holdings', label: `Holdings (${holdings.length})` },
              { id: 'margins', label: 'Funds & Margins' },
              { id: 'profile', label: 'Profile & Security' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl font-semibold transition-all shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-[#162033]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#121b2d] border border-[#1e293b] p-3 rounded-2xl">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search symbol (e.g. NIFTY, SENSEX) or Order ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  {['ALL', 'COMPLETE', 'CANCELLED', 'REJECTED'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setOrderFilter(f)}
                      className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                        orderFilter === f
                          ? 'bg-[#1c2942] text-white border border-blue-500/40'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {f}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setShowContractNoteModal(true)}
                    disabled={orders.length === 0}
                    className="ml-2 px-3 py-1.5 rounded-lg bg-[#162033] hover:bg-[#1f2d47] text-blue-400 hover:text-blue-300 font-semibold text-xs border border-blue-500/30 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
                    title="View Zerodha Virtual Contract Note"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>Contract note</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowImportModal(true)}
                    disabled={orders.length === 0}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm shadow-blue-600/20 shrink-0 cursor-pointer disabled:opacity-50"
                    title="Review and select executed orders to import into journal"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Import to Journal ({orders.length})</span>
                  </button>
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-slate-500">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">No executed orders found</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {searchQuery
                      ? 'No orders matched your search criteria.'
                      : 'Orders placed and executed in your Zerodha account today will automatically display here.'}
                  </p>
                </div>
              ) : (
                <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#0e1626] border-b border-[#1e293b] text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                        <tr>
                          <th className="py-3 px-4">Time</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Instrument</th>
                          <th className="py-3 px-4">Product</th>
                          <th className="py-3 px-4">Qty</th>
                          <th className="py-3 px-4">Avg Price</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Order ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e293b] text-slate-200">
                        {filteredOrders.map((order, idx) => {
                          const isBuy = String(order.transaction_type).toUpperCase() === 'BUY';
                          const isSuccess = ['COMPLETE', 'TRADED', 'EXECUTED'].includes(order.status);
                          return (
                            <tr key={order.order_id || idx} className="hover:bg-[#162238]/40 transition-colors">
                              <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                                {order.order_timestamp ? new Date(order.order_timestamp).toLocaleTimeString() : 'N/A'}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isBuy
                                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                      : 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                                  }`}
                                >
                                  {order.transaction_type}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {(() => {
                                  const inst = formatKiteInstrument(order.tradingsymbol, order.exchange);
                                  return (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {inst.isOption ? (
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-bold text-white">{inst.index}</span>
                                          {inst.dayNum ? (
                                            <span className="text-slate-200">
                                              {inst.dayNum}
                                              <sup className="text-[9px] text-slate-300 font-normal">{inst.daySuffix}</sup>
                                            </span>
                                          ) : null}
                                          {inst.isWeekly && (
                                            <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-400 font-mono font-bold">
                                              w
                                            </span>
                                          )}
                                          <span className="text-slate-400">{inst.monthStr}</span>
                                          <span className="font-mono-numbers font-bold text-white">{inst.strike}</span>
                                          <span className={`font-bold ${inst.optType === 'CE' ? 'text-blue-400' : 'text-orange-400'}`}>
                                            {inst.optType}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="font-semibold text-white">{order.tradingsymbol}</span>
                                      )}
                                      <span className="text-[10px] text-slate-500 uppercase font-mono">{order.exchange || 'NFO'}</span>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                                {order.product}
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-white">
                                {order.filled_quantity ?? order.quantity} / {order.quantity}
                              </td>
                              <td className="py-3 px-4 font-mono text-white">
                                ₹{Number(order.average_price || order.price || 0).toFixed(2)}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    isSuccess
                                      ? 'bg-emerald-500/10 text-emerald-400'
                                      : order.status === 'CANCELLED'
                                      ? 'bg-slate-700/40 text-slate-400'
                                      : 'bg-rose-500/10 text-rose-400'
                                  }`}
                                >
                                  {order.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                                #{order.order_id}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: POSITIONS */}
          {activeTab === 'positions' && (() => {
            const rawPositions = positions[positionType] || [];
            const openPositions = rawPositions.filter((p) => Number(p.quantity) !== 0);
            const closedPositions = rawPositions.filter((p) => Number(p.quantity) === 0);

            const totalPositionsCount = rawPositions.length;
            const openCount = openPositions.length;
            const closedCount = closedPositions.length;

            const filteredPositions = rawPositions.filter((pos) => {
              const isOpen = Number(pos.quantity) !== 0;
              if (positionStatusFilter === 'OPEN' && !isOpen) return false;
              if (positionStatusFilter === 'CLOSED' && isOpen) return false;
              if (positionSearchQuery.trim()) {
                const q = positionSearchQuery.toLowerCase();
                const sym = (pos.tradingsymbol || '').toLowerCase();
                return sym.includes(q);
              }
              return true;
            });

            const totalPnl = filteredPositions.reduce((acc, p) => acc + Number(p.pnl ?? 0), 0);
            const totalDayPnl = filteredPositions.reduce((acc, p) => acc + Number(p.m2m ?? 0), 0);

            return (
              <div className="space-y-4">
                {/* Positions Filter Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#121b2d] border border-[#1e293b] p-3 rounded-2xl">
                  {/* Left: Net / Day selector + Open / Closed filter pills */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center bg-[#090f1d] p-1 rounded-xl border border-[#1e293b]">
                      <button
                        type="button"
                        onClick={() => setPositionType('net')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          positionType === 'net'
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Net Positions ({positions.net?.length ?? 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPositionType('day')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          positionType === 'day'
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Day Positions ({positions.day?.length ?? 0})
                      </button>
                    </div>

                    <div className="flex items-center gap-1 bg-[#090f1d] p-1 rounded-xl border border-[#1e293b] text-xs">
                      <button
                        type="button"
                        onClick={() => setPositionStatusFilter('ALL')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                          positionStatusFilter === 'ALL'
                            ? 'bg-[#1c2942] text-white border border-blue-500/40'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        All ({totalPositionsCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPositionStatusFilter('OPEN')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          positionStatusFilter === 'OPEN'
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 font-bold'
                            : 'text-slate-400 hover:text-blue-300'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        <span>Open ({openCount})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPositionStatusFilter('CLOSED')}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          positionStatusFilter === 'CLOSED'
                            ? 'bg-slate-700/40 text-slate-200 border border-slate-600 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>Closed ({closedCount})</span>
                      </button>
                    </div>
                  </div>

                  {/* Search */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search positions..."
                      value={positionSearchQuery}
                      onChange={(e) => setPositionSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#090f1d] border border-[#1e293b] text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {filteredPositions.length === 0 ? (
                  <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-slate-500">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-white">
                      No {positionStatusFilter !== 'ALL' ? positionStatusFilter.toLowerCase() : ''} {positionType} positions
                    </h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      {positionSearchQuery
                        ? 'No positions matched your search query.'
                        : 'Your Zerodha F&O and equity positions will appear here with live MTM P&L.'}
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl overflow-hidden shadow-sm">
                    {/* Collapsible Index Header Row like Kite: NIFTY 50 (6) */}
                    <div className="px-4 py-3 bg-[#0a1120] border-b border-[#1e293b] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs tracking-wide">
                          NIFTY 50 ({filteredPositions.length})
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                          {openCount} Open • {closedCount} Closed
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400 font-sans font-normal">Total P&L:</span>
                          <span className={totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-400 font-sans font-normal">Day's P&L:</span>
                          <span className={totalDayPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {totalDayPnl >= 0 ? '+' : ''}{formatCurrency(totalDayPnl)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#0e1626] border-b border-[#1e293b] text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                          <tr>
                            <th className="py-3 px-4 w-20">Product</th>
                            <th className="py-3 px-4">Instrument</th>
                            <th className="py-3 px-4 text-center w-24">Status</th>
                            <th className="py-3 px-4 text-right">Qty</th>
                            <th className="py-3 px-4 text-right">Avg</th>
                            <th className="py-3 px-4 text-right">LTP</th>
                            <th className="py-3 px-4 text-right">P&L</th>
                            <th className="py-3 px-4 text-right">Day's P&L</th>
                            <th className="py-3 px-4 text-right">Chg.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e293b]/70">
                          {filteredPositions.map((pos, idx) => {
                            const qty = Number(pos.quantity ?? 0);
                            const isOpen = qty !== 0;
                            const pnl = Number(pos.pnl ?? 0);
                            const dayPnl = Number(pos.m2m ?? pos.pnl ?? 0);
                            const isProfit = pnl >= 0;
                            const isDayProfit = dayPnl >= 0;
                            const inst = formatKiteInstrument(pos.tradingsymbol, pos.exchange);

                            // Avg price: For open position, use entry price; for closed position, show 0.00 (as in Zerodha Kite)
                            const avgPrice = isOpen
                              ? Number(pos.average_price ?? (qty > 0 ? pos.buy_price : pos.sell_price) ?? 0)
                              : 0;
                            const ltp = Number(pos.last_price ?? 0);
                            const closePrice = Number(pos.close_price ?? ltp);
                            const chgPercent = closePrice > 0 ? ((ltp - closePrice) / closePrice) * 100 : 0;

                            return (
                              <tr
                                key={pos.tradingsymbol || idx}
                                className={`transition-all ${
                                  isOpen
                                    ? 'bg-[#121b2d] hover:bg-[#162238] border-l-2 border-l-blue-500 font-medium'
                                    : 'opacity-65 hover:opacity-100 bg-[#090f1d]/40 hover:bg-[#121b2d]/60 border-l-2 border-l-transparent text-slate-400'
                                }`}
                              >
                                {/* Product badge */}
                                <td className="py-3 px-4 whitespace-nowrap">
                                  {isOpen ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-900/40 text-purple-300 border border-purple-500/30">
                                      {pos.product || 'NRML'}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#1a2333] text-slate-500 border border-slate-700/50">
                                      {pos.product || 'NRML'}
                                    </span>
                                  )}
                                </td>

                                {/* Instrument with Kite styling */}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {inst.isOption ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className={`font-bold ${isOpen ? 'text-white' : 'text-slate-300'}`}>
                                          {inst.index}
                                        </span>
                                        {inst.dayNum ? (
                                          <span className={isOpen ? 'text-slate-200' : 'text-slate-400'}>
                                            {inst.dayNum}
                                            <sup className="text-[9px] font-normal">{inst.daySuffix}</sup>
                                          </span>
                                        ) : null}
                                        {inst.isWeekly && (
                                          <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-400 font-mono font-bold">
                                            w
                                          </span>
                                        )}
                                        <span className="text-slate-400">{inst.monthStr}</span>
                                        <span className={`font-mono-numbers font-bold ${isOpen ? 'text-white' : 'text-slate-300'}`}>
                                          {inst.strike}
                                        </span>
                                        <span
                                          className={`font-bold ${
                                            inst.optType === 'CE' ? 'text-blue-400' : 'text-orange-400'
                                          }`}
                                        >
                                          {inst.optType}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className={isOpen ? 'font-bold text-white' : 'text-slate-300'}>
                                        {pos.tradingsymbol}
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-500 uppercase font-mono">
                                      {pos.exchange || 'NFO'}
                                    </span>
                                  </div>
                                </td>

                                {/* Status Badge: OPEN vs CLOSED */}
                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                  {isOpen ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/15 text-blue-400 border border-blue-500/30 inline-flex items-center gap-1 shadow-sm">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                      OPEN
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800/80 text-slate-500 border border-slate-700/50 inline-block">
                                      CLOSED
                                    </span>
                                  )}
                                </td>

                                {/* Qty: Bold Blue for Open; Muted Grey for Closed */}
                                <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                                  {isOpen ? (
                                    <span className="text-blue-400 text-sm">
                                      {qty > 0 ? `+${qty}` : qty}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 font-normal">0</span>
                                  )}
                                </td>

                                {/* Avg Price: Entry price for Open; 0.00 for Closed */}
                                <td className="py-3 px-4 text-right font-mono whitespace-nowrap">
                                  {isOpen ? (
                                    <span className="text-white font-medium">₹{avgPrice.toFixed(2)}</span>
                                  ) : (
                                    <span className="text-slate-500">0.00</span>
                                  )}
                                </td>

                                {/* LTP */}
                                <td className="py-3 px-4 text-right font-mono font-semibold text-white whitespace-nowrap">
                                  ₹{ltp.toFixed(2)}
                                </td>

                                {/* Column 7: Total P&L */}
                                <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                                  <span className={isProfit ? 'text-emerald-400' : 'text-rose-400'}>
                                    {isProfit ? '+' : ''}{formatCurrency(pnl)}
                                  </span>
                                </td>

                                {/* Column 8: Day's P&L */}
                                <td className="py-3 px-4 text-right font-mono font-semibold whitespace-nowrap">
                                  <span className={isDayProfit ? 'text-emerald-400' : 'text-rose-400'}>
                                    {isDayProfit ? '+' : ''}{formatCurrency(dayPnl)}
                                  </span>
                                </td>

                                {/* Chg % */}
                                <td className="py-3 px-4 text-right font-mono text-[11px] whitespace-nowrap">
                                  <span
                                    className={
                                      chgPercent > 0
                                        ? 'text-emerald-400'
                                        : chgPercent < 0
                                        ? 'text-rose-400'
                                        : 'text-slate-500'
                                    }
                                  >
                                    {chgPercent > 0 ? '+' : ''}{chgPercent.toFixed(2)}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-[#0a1120] border-t border-[#1e293b] font-bold text-xs">
                          <tr>
                            <td colSpan={3} className="py-3 px-4 text-slate-400">
                              <div className="flex items-center gap-2">
                                <span>Total P&L ({filteredPositions.length} positions)</span>
                                {contractNoteCharges > 0 && (
                                  <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">
                                    Net (Closed): {dayNetPnl >= 0 ? '+' : ''}
                                    {formatCurrency(dayNetPnl)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-blue-400">
                              {openCount > 0 ? `${openPositions.reduce((sum, p) => sum + Number(p.quantity || 0), 0)} Open` : '0'}
                            </td>
                            <td colSpan={2} />
                            <td className="py-3 px-4 text-right font-mono font-bold text-sm">
                              <span className={totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-sm">
                              <span className={totalDayPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                {totalDayPnl >= 0 ? '+' : ''}{formatCurrency(totalDayPnl)}
                              </span>
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 3: HOLDINGS */}
          {activeTab === 'holdings' && (
            <div className="space-y-4">
              {holdings.length === 0 ? (
                <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 mx-auto flex items-center justify-center text-slate-500">
                    <ArrowUpRight className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">No demat stock holdings</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Long-term CNC equity shares in your Zerodha Demat account will be displayed here.
                  </p>
                </div>
              ) : (
                <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#0e1626] border-b border-[#1e293b] text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                        <tr>
                          <th className="py-3 px-4">Instrument</th>
                          <th className="py-3 px-4">Qty</th>
                          <th className="py-3 px-4">Avg Price</th>
                          <th className="py-3 px-4">LTP</th>
                          <th className="py-3 px-4">Cur. Value</th>
                          <th className="py-3 px-4">P&L</th>
                          <th className="py-3 px-4">Day Chg</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e293b] text-slate-200">
                        {holdings.map((h, idx) => {
                          const pnl = Number(h.pnl || 0);
                          const isProfit = pnl >= 0;
                          const curValue = (Number(h.quantity || 0) * Number(h.last_price || 0));
                          return (
                            <tr key={h.tradingsymbol || idx} className="hover:bg-[#162238]/40 transition-colors">
                              <td className="py-3 px-4 font-semibold text-white">
                                {h.tradingsymbol}
                                <span className="text-[10px] text-slate-500 ml-1.5">{h.exchange}</span>
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-white">{h.quantity}</td>
                              <td className="py-3 px-4 font-mono text-slate-300">₹{Number(h.average_price || 0).toFixed(2)}</td>
                              <td className="py-3 px-4 font-mono font-semibold text-white">₹{Number(h.last_price || 0).toFixed(2)}</td>
                              <td className="py-3 px-4 font-mono font-bold text-white">{formatCurrency(curValue)}</td>
                              <td className="py-3 px-4 font-mono font-bold">
                                <span className={isProfit ? 'text-emerald-400' : 'text-rose-400'}>
                                  {isProfit ? '+' : ''}{formatCurrency(pnl)}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                                {Number(h.day_change_percentage || 0).toFixed(2)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FUNDS & MARGINS */}
          {activeTab === 'margins' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Equity Margins */}
              <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Equity & F&O Margin</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                    ACTIVE
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Available Cash Balance</span>
                    <span className="font-mono font-bold text-white">
                      {formatCurrency(margins?.equity?.available?.cash ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Collateral (Pledged)</span>
                    <span className="font-mono text-slate-200">
                      {formatCurrency(margins?.equity?.available?.collateral ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Total Net Available</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatCurrency(margins?.equity?.net ?? 0)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[#1e293b]" />
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Utilised Debits</span>
                    <span className="font-mono text-rose-400">
                      {formatCurrency(margins?.equity?.utilised?.debits ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Option Premium Paid</span>
                    <span className="font-mono text-slate-300">
                      {formatCurrency(margins?.equity?.utilised?.option_premium ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>SPAN Margin Required</span>
                    <span className="font-mono text-slate-300">
                      {formatCurrency(margins?.equity?.utilised?.span ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Commodity Margins */}
              <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">Commodity (MCX) Margin</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-700/40 text-slate-300 text-[10px] font-bold">
                    MCX
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Available Cash Balance</span>
                    <span className="font-mono font-bold text-white">
                      {formatCurrency(margins?.commodity?.available?.cash ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Total Net Available</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {formatCurrency(margins?.commodity?.net ?? 0)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[#1e293b]" />
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Utilised Debits</span>
                    <span className="font-mono text-slate-300">
                      {formatCurrency(margins?.commodity?.utilised?.debits ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PROFILE & SECURITY */}
          {activeTab === 'profile' && (
            <div className="bg-[#121b2d] border border-[#1e293b] rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-3 border-b border-[#1e293b] pb-4">
                <div className="w-10 h-10 rounded-2xl bg-orange-600/20 text-orange-500 font-bold flex items-center justify-center text-lg">
                  ▲
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{profile.user_name || 'Zerodha Trader'}</h3>
                  <p className="text-xs text-slate-400 font-mono">Client ID: {profile.broker_user_id || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-[#0e1626] border border-[#1e293b] space-y-2">
                  <span className="text-slate-400 block text-[11px]">Brokerage House</span>
                  <span className="font-mono font-bold text-white text-sm">{profile.broker || 'ZERODHA'}</span>
                </div>
                <div className="p-4 rounded-xl bg-[#0e1626] border border-[#1e293b] space-y-2">
                  <span className="text-slate-400 block text-[11px]">Connected Email</span>
                  <span className="font-mono font-semibold text-white">{profile.email || 'N/A'}</span>
                </div>
                <div className="p-4 rounded-xl bg-[#0e1626] border border-[#1e293b] space-y-2">
                  <span className="text-slate-400 block text-[11px]">Integration Mode</span>
                  <span className="font-mono font-semibold text-emerald-400">
                    {isDemo ? 'Sandbox Simulation' : 'Live Kite Connect v3'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Strictly Read-Only Guarantee</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  This TradeJournal integration is architected exclusively with GET read endpoints. There is zero code or API ability to place orders, modify stops, or cancel trades. Your broker funds and orders remain completely safe.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Zerodha Order Selection & Import Modal */}
      <ZerodhaOrderImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        rawOrders={orders}
        onImportSuccess={() => fetchZerodhaData(true)}
      />

      {/* Zerodha Virtual Contract Note Modal */}
      <ZerodhaContractNoteModal
        isOpen={showContractNoteModal}
        onClose={() => setShowContractNoteModal(false)}
        orders={orders}
        clientInfo={profile}
      />

      {/* Connect Modal */}
      {showConnectModal && renderConnectModal()}
    </div>
  );

  function renderConnectModal() {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-[#121b2d] border border-[#1e293b] rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
          <div className="flex items-center justify-between border-b border-[#1e293b] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-600/20 text-orange-500 font-bold flex items-center justify-center text-sm">
                ▲
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Connect Zerodha Kite</h3>
                <p className="text-[11px] text-slate-400">Strictly Read-Only Portfolio Connection</p>
              </div>
            </div>
            <button
              onClick={() => setShowConnectModal(false)}
              className="text-slate-400 hover:text-white text-lg p-1"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleConnect} className="space-y-3.5 text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Zerodha Client ID / Email <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. NQ2990 or trader@example.com"
                className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Zerodha Password <span className="text-slate-500 text-[10px] font-normal">(Optional — daily login uses Kite OAuth)</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Optional: enter password or leave blank"
                  className="w-full px-3 py-2 pr-10 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white text-xs focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">
                  Kite API Key <span className="text-slate-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="e.g. i7nm8563g7p5a2dw"
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 text-[11px]">
                  API Secret Key <span className="text-slate-500">(Optional)</span>
                </label>
                <input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter API Secret"
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] border border-[#1e293b] text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[11px] text-orange-300 space-y-1">
              <span className="font-semibold block">Need to test right away?</span>
              <p className="text-slate-400">
                Zerodha charges ₹2,000/mo for live API access. If you don't have a paid subscription right now, click <strong>"Connect with Demo Sandbox"</strong> below to explore with simulated real-time positions!
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#1e293b]">
              <button
                type="button"
                onClick={handleConnectDemo}
                disabled={connecting}
                className="px-3.5 py-2 rounded-xl bg-[#1c2942] hover:bg-[#253656] text-amber-400 font-semibold text-xs border border-amber-500/30 flex items-center gap-1.5 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Connect Demo
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-4 py-2 rounded-xl bg-transparent hover:bg-white/5 text-slate-400 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connecting}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs shadow-md shadow-orange-600/25 transition-all disabled:opacity-50"
                >
                  {connecting ? 'Connecting...' : 'Connect Live'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }
}
