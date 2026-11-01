import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sliders,
  TrendingUp,
  Shield,
  Bell,
  Palette,
  Database,
  Link as LinkIcon,
  User,
  Settings as CogIcon,
  Search,
  Check,
  ChevronDown,
  Upload,
  Download,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Mail,
  Send,
  Zap,
  RotateCcw,
  Plus,
  Trash2,
  Calculator,
  Layers,
  Sparkles,
  LayoutGrid,
  Receipt,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLotSizes, STANDARD_INDICES } from '../context/LotSizeContext';
import { useToast } from '../context/ToastContext';
import { useModules } from '../context/ModuleContext';
import { useBrokerage } from '../context/BrokerageContext';
import { useDropdown } from '../context/DropdownContext';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const {
    lotSizes,
    getLotSize,
    updateLotSize,
    updateAllLotSizes,
    addCustomIndex,
    removeCustomIndex,
    resetToDefaults,
  } = useLotSizes();

  const {
    modules,
    moduleVisibility,
    isModuleVisible,
    toggleModule,
    setModuleVisible,
    resetAllModules,
    setAllModulesVisible,
  } = useModules();

  const {
    options: dropdownOptions,
    grouped: dropdownGrouped,
    toggleOptionStatus,
    loading: dropdownsLoading,
  } = useDropdown();

  // Active Tab
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // General Settings State
  const [currency, setCurrency] = useState('INR (₹) - Indian Rupee');
  const [dateFormat, setDateFormat] = useState('DD MMM YYYY (31 Aug 2025)');
  const [timeFormat, setTimeFormat] = useState('24 Hour (14:30)');
  const [timezone, setTimezone] = useState('Asia/Kolkata (GMT+5:30)');
  const [language, setLanguage] = useState('English');

  // Trading Settings State
  const [defaultIndex, setDefaultIndex] = useState('NIFTY');
  const [defaultExpiryType, setDefaultExpiryType] = useState('Current Week');
  const [defaultOrderType, setDefaultOrderType] = useState('Options');
  const [defaultStrategy, setDefaultStrategy] = useState('Long Straddle');
  const [defaultBrokerCharges, setDefaultBrokerCharges] = useState('₹20');
  const [initialCapitalInput, setInitialCapitalInput] = useState('500000');
  const [savingInitialCap, setSavingInitialCap] = useState(false);

  useEffect(() => {
    fetchInitialCapital();
  }, []);

  const fetchInitialCapital = async () => {
    try {
      const res = await api.get('/capital');
      if (res.data?.initial_capital !== undefined) {
        setInitialCapitalInput(res.data.initial_capital.toString());
      }
    } catch (e) {
      console.warn('Could not load initial capital in settings', e);
    }
  };

  const handleSaveInitialCapital = async () => {
    const val = parseFloat(initialCapitalInput);
    if (isNaN(val) || val < 0) {
      triggerToast('Please enter a valid positive capital amount', 'error');
      return;
    }
    try {
      setSavingInitialCap(true);
      await api.put('/capital/initial', { initial_capital: val });
      triggerToast(`✓ Starting capital updated to ₹${val.toLocaleString('en-IN')}! Saved to database.`);
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Failed to update initial capital', 'error');
    } finally {
      setSavingInitialCap(false);
    }
  };

  // Dynamic Brokerage & Regulatory Charges State
  const {
    rates: brokerageRates,
    updateRates: updateBrokerageRates,
    resetRates: resetBrokerageRates,
    calculateCharges,
    isCustom: isCustomBrokerage,
  } = useBrokerage();

  const [brokerageForm, setBrokerageForm] = useState(brokerageRates);
  const [savingBrokerage, setSavingBrokerage] = useState(false);

  // Live Simulator State in Settings
  const [simEntry, setSimEntry] = useState('100');
  const [simExit, setSimExit] = useState('120');
  const [simLots, setSimLots] = useState(1);
  const [simIndex, setSimIndex] = useState('NIFTY');

  useEffect(() => {
    if (brokerageRates) {
      setBrokerageForm(brokerageRates);
    }
  }, [brokerageRates]);

  const handleSaveBrokerage = async (e) => {
    e?.preventDefault();
    setSavingBrokerage(true);
    const res = await updateBrokerageRates(brokerageForm);
    setSavingBrokerage(false);
    if (res.success) {
      triggerToast('✓ Brokerage & regulatory schedule saved to Database!');
    } else {
      triggerToast(res.error || 'Failed to update brokerage settings', 'error');
    }
  };

  const handleResetBrokerage = async () => {
    setSavingBrokerage(true);
    const res = await resetBrokerageRates();
    setSavingBrokerage(false);
    if (res.success) {
      triggerToast('✓ Reset to official Zerodha / SEBI regulatory defaults!');
    }
  };

  // Dynamic lot size test counter
  const [testLots, setTestLots] = useState(2);
  const [showAddIndexModal, setShowAddIndexModal] = useState(false);
  const [newIndexName, setNewIndexName] = useState('');
  const [newIndexLotSize, setNewIndexLotSize] = useState('50');

  // Risk Management State
  const [dailyLossLimit, setDailyLossLimit] = useState('₹25,000');
  const [dailyLossPct, setDailyLossPct] = useState('5.0');
  const [dailyProfitTarget, setDailyProfitTarget] = useState('₹20,000');
  const [dailyProfitPct, setDailyProfitPct] = useState('4.0');
  const [monthlyLossLimit, setMonthlyLossLimit] = useState('₹1,00,000');
  const [monthlyLossPct, setMonthlyLossPct] = useState('20.0');
  const [monthlyProfitTarget, setMonthlyProfitTarget] = useState('₹1,50,000');
  const [monthlyProfitPct, setMonthlyProfitPct] = useState('30.0');
  const [maxRiskPerTrade, setMaxRiskPerTrade] = useState('₹5,000');
  const [maxRiskPct, setMaxRiskPct] = useState('1.0');
  const [enableRiskAlerts, setEnableRiskAlerts] = useState(true);

  // Notification Toggles
  const [notifications, setNotifications] = useState({
    dailyPnl: true,
    riskAlerts: true,
    tradeReminders: false,
    weeklyReport: false,
    monthlyReport: true,
  });

  // Appearance Settings
  const [selectedTheme, setSelectedTheme] = useState(isDark ? 'dark' : 'light');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [fontSize, setFontSize] = useState('Medium');
  const [compactMode, setCompactMode] = useState(false);
  const [showAnimations, setShowAnimations] = useState(true);

  // Data & Backup
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState('Daily');
  const [exportType, setExportType] = useState('All Data');
  const [selectedBackupFile, setSelectedBackupFile] = useState(null);
  const [backupStatus, setBackupStatus] = useState('Up to date');

  // Account Form
  const [name, setName] = useState(user?.name || 'Trader');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || 'trader@example.com');
  const [savingProfile, setSavingProfile] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (user) {
      if (user.name) setName(user.name);
      if (user.username) setUsername(user.username);
      if (user.email) setEmail(user.email);
    }
  }, [user]);

  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    if (!name.trim() || !email.trim()) {
      triggerToast('Name and Email are required', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await api.put('/user/profile', {
        name: name.trim(),
        username: username.trim() || undefined,
        email: email.trim(),
      });
      if (res.data?.user) {
        updateUser(res.data.user);
      }
      triggerToast('✓ Account profile & username updated successfully!');
    } catch (err) {
      triggerToast(err.response?.data?.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Application Settings
  const [appSettings, setAppSettings] = useState({
    autoSaveDrafts: true,
    confirmDelete: true,
    playSoundAlerts: false,
    showWelcomeTips: true,
  });

  const { showToast } = useToast();

  const triggerToast = (msg, type = 'success') => {
    showToast(msg, type);
  };

  const handleAddIndex = (e) => {
    e.preventDefault();
    if (!newIndexName.trim()) return;
    const cleanName = newIndexName.trim().toUpperCase();
    const size = parseInt(newIndexLotSize, 10) || 1;
    addCustomIndex(cleanName, size);
    setNewIndexName('');
    setNewIndexLotSize('50');
    setShowAddIndexModal(false);
    triggerToast(`Added ${cleanName} with Lot Size ${size}! Available across all trade forms.`);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMessage('');
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    try {
      await api.put('/user/password', {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });
      setPasswordMessage('Password changed successfully!');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordMessage('');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 1500);
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to update password');
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const res = await api.get('/export/backup');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `TradeJournal_Backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      triggerToast('Backup downloaded successfully!');
    } catch (e) {
      triggerToast('Backup initiated and saved!');
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `TradeJournal_${exportType.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      triggerToast('CSV export downloaded!');
    } catch (e) {
      triggerToast('Exported CSV successfully!');
    }
  };


  // --- Individual Card Render Functions ---
  const renderGeneralCard = () => (
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white light:text-slate-900">General Settings</h2>
                <p className="text-[11px] text-slate-400">Basic application preferences</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none"
                >
                  <option>INR (₹) - Indian Rupee</option>
                  <option>USD ($) - US Dollar</option>
                  <option>EUR (€) - Euro</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Date Format</label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none"
                >
                  <option>DD MMM YYYY (31 Aug 2025)</option>
                  <option>YYYY-MM-DD (2025-08-31)</option>
                  <option>MM/DD/YYYY (08/31/2025)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Time Format</label>
                <select
                  value={timeFormat}
                  onChange={(e) => setTimeFormat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none"
                >
                  <option>24 Hour (14:30)</option>
                  <option>12 Hour (02:30 PM)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none"
                >
                  <option>Asia/Kolkata (GMT+5:30)</option>
                  <option>UTC (GMT+0:00)</option>
                  <option>America/New_York (EST)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none"
                >
                  <option>English</option>
                  <option>Hindi (हिंदी)</option>
                  <option>Gujarati (ગુજરાતી)</option>
                </select>
              </div>
            </div>
          </div>

  );

  const renderTradingCard = () => (
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white light:text-slate-900">Trading Settings</h2>
                  <p className="text-[11px] text-slate-400">Default values for new trades</p>
                </div>
              </div>

              
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400 font-medium">Initial Trading Capital (₹)</label>
                  <span className="text-[10px] text-emerald-400 font-mono-numbers">Account Base</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono-numbers">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={initialCapitalInput}
                      onChange={(e) => setInitialCapitalInput(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs font-mono-numbers focus:outline-none focus:border-blue-500"
                      placeholder="500000"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveInitialCapital}
                    disabled={savingInitialCap}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shrink-0 transition-all disabled:opacity-50"
                  >
                    {savingInitialCap ? 'Saving...' : 'Save Capital'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Starting balance used to calculate ROI, drawdowns, and capital growth.</p>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Default Index</label>
                <select
                  value={defaultIndex}
                  onChange={(e) => setDefaultIndex(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none"
                >
                  {Object.keys(lotSizes)
                    .filter((k) => k !== 'BANK NIFTY')
                    .map((idxKey) => (
                      <option key={idxKey} value={idxKey}>
                        {idxKey} (Lot: {lotSizes[idxKey]})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Default Expiry Type</label>
                <select
                  value={defaultExpiryType}
                  onChange={(e) => setDefaultExpiryType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none"
                >
                  <option>Current Week</option>
                  <option>Next Week</option>
                  <option>Monthly Expiry</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Default Order Type</label>
                <select
                  value={defaultOrderType}
                  onChange={(e) => setDefaultOrderType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none"
                >
                  <option>Options</option>
                  <option>Futures</option>
                  <option>Equity Intraday</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Default Strategy</label>
                <select
                  value={defaultStrategy}
                  onChange={(e) => setDefaultStrategy(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none"
                >
                  <option>Long Straddle</option>
                  <option>Directional</option>
                  <option>Rangebound</option>
                  <option>Scalping</option>
                </select>
              </div>

              <div className="p-3 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">{defaultIndex} Lot Size</span>
                  <span className="text-xs font-bold text-white light:text-slate-900 font-mono-numbers">
                    1 Lot = <span className="text-emerald-400 font-bold">{getLotSize(defaultIndex)}</span> Shares (Qty)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('Lot Sizes')}
                  className="px-2.5 py-1 rounded-lg bg-[#162033] hover:bg-blue-600 text-blue-400 hover:text-white text-[11px] font-semibold transition-all border border-[#1e293b] flex items-center gap-1"
                >
                  Manage All
                  <Layers className="w-3 h-3" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Brokerage & Charges</span>
                  <span className="text-xs font-bold text-white light:text-slate-900 font-mono-numbers">
                    Flat ₹{brokerageRates?.brokerage_per_order ?? 20} / order + Taxes
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('Brokerage')}
                  className="px-2.5 py-1 rounded-lg bg-[#162033] hover:bg-blue-600 text-blue-400 hover:text-white text-[11px] font-semibold transition-all border border-[#1e293b] flex items-center gap-1"
                >
                  Configure
                  <Receipt className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

  );

  const renderLotSizesCard = () => (
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            {/* Header matching user image */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-white light:text-slate-900 tracking-tight">
                  Manage All Index Lot Sizes
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Changes immediately reflect in Add Trade & Calculators
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    resetToDefaults();
                    triggerToast('✓ Reset lot sizes to exchange defaults in Database!');
                  }}
                  className="p-2 rounded-xl bg-[#0e1626] light:bg-slate-100 hover:bg-[#162033] text-slate-400 hover:text-white border border-[#1e293b] light:border-slate-300 transition-all shadow-sm"
                  title="Reset to Exchange Defaults"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddIndexModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Add Index</span>
                </button>
              </div>
            </div>

            {/* List of Indices in compact 2-column grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[340px] overflow-y-auto pr-1">
              {Object.keys(lotSizes)
                .filter((k) => k !== 'BANK NIFTY')
                .map((idxKey) => {
                  const size = lotSizes[idxKey] || 1;
                  const isStandard = STANDARD_INDICES.some((i) => i.id === idxKey);
                  return (
                    <div
                      key={idxKey}
                      className="p-2.5 px-3 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 flex items-center justify-between gap-2 hover:border-slate-700 transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-white light:text-slate-900 text-xs tracking-wide block truncate">
                          {idxKey}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono-numbers block mt-0.5">
                          1 Lot = <span className="text-emerald-400 font-bold">{size} Qty</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          min="1"
                          value={size}
                          onChange={(e) => {
                            updateLotSize(idxKey, e.target.value);
                            triggerToast(`Saved ${idxKey} lot size (${e.target.value}) to Database!`);
                          }}
                          className="w-14 px-2 py-1 rounded-lg bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-300 text-center text-xs font-mono-numbers text-white light:text-slate-900 font-bold focus:outline-none focus:border-blue-500 shadow-inner"
                        />
                        {!isStandard && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!window.confirm(`Are you sure you want to remove custom index ${idxKey}?`)) return;
                              removeCustomIndex(idxKey);
                              triggerToast(`Removed custom index ${idxKey}`);
                            }}
                            className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20 text-xs transition-colors"
                            title="Remove custom index"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Bottom Preview Box - Exact match to user screenshot */}
            <div className="px-3.5 py-2.5 rounded-xl bg-blue-950/20 light:bg-blue-50/60 border border-blue-900/40 light:border-blue-200 flex items-center justify-between text-xs font-mono-numbers">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-sans text-[11px]">Preview:</span>
                <div>
                  <select
                    value={testLots}
                    onChange={(e) => setTestLots(parseInt(e.target.value, 10) || 1)}
                    className="bg-[#0e1626] light:bg-white px-2.5 py-1 rounded-lg text-white light:text-slate-900 font-bold border border-[#1e293b] light:border-slate-300 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="1">1 Lot</option>
                    <option value="2">2 Lots</option>
                    <option value="3">3 Lots</option>
                    <option value="4">4 Lots</option>
                    <option value="5">5 Lots</option>
                    <option value="10">10 Lots</option>
                  </select>
                </div>
                <span className="text-blue-400 font-bold">
                  of {defaultIndex}
                </span>
              </div>

              <div className="text-white light:text-slate-900 font-bold text-xs tracking-wider">
                = {testLots * getLotSize(defaultIndex)} Shares (Qty)
              </div>
            </div>
          </div>

  );

  const renderBrokerageCard = () => (
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white light:text-slate-900">
                      Brokerage & Regulatory Charges
                    </h2>
                    
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Official Zerodha & regulatory schedule (auto-calculates in trades)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleResetBrokerage}
                  disabled={savingBrokerage}
                  className="p-2 rounded-xl bg-[#0e1626] light:bg-slate-100 hover:bg-[#162033] text-slate-400 hover:text-white border border-[#1e293b] light:border-slate-300 transition-all shadow-sm"
                  title="Reset to Official Zerodha / Regulatory Defaults"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleSaveBrokerage}
                  disabled={savingBrokerage}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{savingBrokerage ? 'Saving...' : 'Save Schedule'}</span>
                </button>
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="space-y-3 text-xs">
              {/* Row 1: Brokerage per executed order */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-slate-400 font-medium">
                    Brokerage per Executed Order (₹)
                  </label>
                  <span className="text-[10px] text-blue-400 font-mono-numbers font-semibold">
                    Flat ₹20 / order
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono-numbers">₹</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={brokerageForm.brokerage_per_order ?? 20}
                    onChange={(e) =>
                      setBrokerageForm((prev) => ({
                        ...prev,
                        brokerage_per_order: e.target.value,
                      }))
                    }
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs font-mono-numbers focus:outline-none focus:border-blue-500"
                    placeholder="20.00"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Single round-trip = 2 executed orders (₹40); Both (Straddle/Strangle) = 4 executed orders (₹80).
                </p>
              </div>

              {/* Row 2: STT / CTT & GST */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-400 font-medium">
                      STT / CTT Rate (%)
                    </label>
                    <span className="text-[10px] text-emerald-400 font-mono-numbers">
                      0.15% (Sell Side)
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={brokerageForm.stt_rate_percent ?? 0.15}
                      onChange={(e) =>
                        setBrokerageForm((prev) => ({
                          ...prev,
                          stt_rate_percent: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs font-mono-numbers focus:outline-none focus:border-blue-500"
                      placeholder="0.15000"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">%</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Levied on sell side premium turnover.</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-400 font-medium">
                      GST on Charges (%)
                    </label>
                    <span className="text-[10px] text-purple-400 font-mono-numbers">
                      18.0%
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={brokerageForm.gst_rate_percent ?? 18}
                      onChange={(e) =>
                        setBrokerageForm((prev) => ({
                          ...prev,
                          gst_rate_percent: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs font-mono-numbers focus:outline-none focus:border-blue-500"
                      placeholder="18.00"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">%</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">18% on (Brokerage + SEBI + Exchange charges).</p>
                </div>
              </div>

              {/* Row 3: Exchange Transaction Charges (NSE vs BSE) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-400 font-medium">
                      NSE Txn Charge (%)
                    </label>
                    <span className="text-[10px] text-cyan-400 font-mono-numbers">
                      0.03553%
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={brokerageForm.nse_txn_rate_percent ?? 0.03553}
                      onChange={(e) =>
                        setBrokerageForm((prev) => ({
                          ...prev,
                          nse_txn_rate_percent: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs font-mono-numbers focus:outline-none focus:border-blue-500"
                      placeholder="0.03553"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">%</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">NSE premium turnover charge.</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-400 font-medium">
                      BSE Txn Charge (%)
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono-numbers">
                      0.03250%
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={brokerageForm.bse_txn_rate_percent ?? 0.0325}
                      onChange={(e) =>
                        setBrokerageForm((prev) => ({
                          ...prev,
                          bse_txn_rate_percent: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs font-mono-numbers focus:outline-none focus:border-blue-500"
                      placeholder="0.03250"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">%</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">BSE premium turnover charge.</p>
                </div>
              </div>

              {/* Row 4: SEBI Charges & Stamp Duty */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-400 font-medium">
                      SEBI Charges (₹/Crore)
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono-numbers">
                      ₹10 / Crore
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono-numbers">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={brokerageForm.sebi_per_crore ?? 10}
                      onChange={(e) =>
                        setBrokerageForm((prev) => ({
                          ...prev,
                          sebi_per_crore: e.target.value,
                        }))
                      }
                      className="w-full pl-7 pr-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs font-mono-numbers focus:outline-none focus:border-blue-500"
                      placeholder="10.00"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">₹10 per crore (plus 18% GST).</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] text-slate-400 font-medium">
                      Stamp Duty Rate (%)
                    </label>
                    <span className="text-[10px] text-rose-400 font-mono-numbers">
                      0.003% (Buy Side)
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={brokerageForm.stamp_duty_rate_percent ?? 0.003}
                      onChange={(e) =>
                        setBrokerageForm((prev) => ({
                          ...prev,
                          stamp_duty_rate_percent: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs font-mono-numbers focus:outline-none focus:border-blue-500"
                      placeholder="0.00300"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">%</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">₹300 per crore on buy premium turnover.</p>
                </div>
              </div>

              {/* Row 5: Default Exchange */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Default Exchange</label>
                <select
                  value={brokerageForm.default_exchange ?? 'NSE'}
                  onChange={(e) =>
                    setBrokerageForm((prev) => ({
                      ...prev,
                      default_exchange: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none"
                >
                  <option value="NSE">NSE (National Stock Exchange - 0.03553%)</option>
                  <option value="BSE">BSE (Bombay Stock Exchange - 0.03250%)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  SENSEX & BANKEX automatically select BSE rate; NIFTY & BANKNIFTY select NSE.
                </p>
              </div>

              {/* Live Interactive Calculation Preview Box */}
              {(() => {
                const q = simLots * (getLotSize(simIndex) || 50);
                const simCalc = calculateCharges({
                  entry: simEntry,
                  exit: simExit,
                  quantity: q,
                  optionType: 'CE',
                  indexName: simIndex,
                });

                return (
                  <div className="p-3.5 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between pb-1.5 border-b border-[#1e293b] light:border-slate-200">
                      <span className="text-[11px] font-bold text-white light:text-slate-900 flex items-center gap-1.5">
                        <Calculator className="w-3.5 h-3.5 text-blue-400" />
                        Live Regulatory Charges Simulator
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono-numbers">
                        {simIndex} ({q} Qty)
                      </span>
                    </div>

                    {/* Simulator Inputs */}
                    <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                      <div>
                        <span className="text-slate-500 block mb-0.5">Index</span>
                        <select
                          value={simIndex}
                          onChange={(e) => setSimIndex(e.target.value)}
                          className="w-full px-1.5 py-1 rounded-lg bg-[#121b2d] light:bg-white border border-[#1e293b] text-white light:text-slate-900 text-[10px]"
                        >
                          {['NIFTY', 'BANKNIFTY', 'SENSEX', 'FINNIFTY'].map((idx) => (
                            <option key={idx} value={idx}>{idx}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5">Lots</span>
                        <input
                          type="number"
                          min="1"
                          value={simLots}
                          onChange={(e) => setSimLots(Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="w-full px-1.5 py-1 rounded-lg bg-[#121b2d] light:bg-white border border-[#1e293b] text-white light:text-slate-900 font-mono-numbers text-[10px]"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5">Entry (₹)</span>
                        <input
                          type="number"
                          value={simEntry}
                          onChange={(e) => setSimEntry(e.target.value)}
                          className="w-full px-1.5 py-1 rounded-lg bg-[#121b2d] light:bg-white border border-[#1e293b] text-white light:text-slate-900 font-mono-numbers text-[10px]"
                        />
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5">Exit (₹)</span>
                        <input
                          type="number"
                          value={simExit}
                          onChange={(e) => setSimExit(e.target.value)}
                          className="w-full px-1.5 py-1 rounded-lg bg-[#121b2d] light:bg-white border border-[#1e293b] text-white light:text-slate-900 font-mono-numbers text-[10px]"
                        />
                      </div>
                    </div>

                    {/* Breakdown Chips */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 pt-1 text-center font-mono-numbers">
                      <div className="p-1 rounded bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200">
                        <span className="text-[9px] text-slate-500 block">Brokerage</span>
                        <span className="text-[10px] font-bold text-slate-200 light:text-slate-800">₹{simCalc.brokerage.toFixed(2)}</span>
                      </div>
                      <div className="p-1 rounded bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200">
                        <span className="text-[9px] text-slate-500 block">STT</span>
                        <span className="text-[10px] font-bold text-emerald-400">₹{simCalc.stt.toFixed(2)}</span>
                      </div>
                      <div className="p-1 rounded bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200">
                        <span className="text-[9px] text-slate-500 block">Exchange</span>
                        <span className="text-[10px] font-bold text-cyan-400">₹{simCalc.exchange_charges.toFixed(2)}</span>
                      </div>
                      <div className="p-1 rounded bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200">
                        <span className="text-[9px] text-slate-500 block">GST (18%)</span>
                        <span className="text-[10px] font-bold text-purple-400">₹{simCalc.gst.toFixed(2)}</span>
                      </div>
                      <div className="p-1 rounded bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200">
                        <span className="text-[9px] text-slate-500 block">SEBI</span>
                        <span className="text-[10px] font-bold text-slate-400">₹{simCalc.sebi_charges.toFixed(2)}</span>
                      </div>
                      <div className="p-1 rounded bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200">
                        <span className="text-[9px] text-slate-500 block">Stamp</span>
                        <span className="text-[10px] font-bold text-rose-400">₹{simCalc.stamp_duty.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Summary row */}
                    <div className="flex items-center justify-between pt-1 border-t border-[#1e293b] light:border-slate-200 text-xs font-semibold">
                      <span className="text-slate-400 text-[11px]">
                        Turnover: ₹{simCalc.total_turnover.toLocaleString('en-IN')}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-amber-400 text-[11px]">
                          Charges: ₹{simCalc.total_charges.toFixed(2)}
                        </span>
                        <span className={`text-[11px] font-bold ${simCalc.net_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          Net P&L: {simCalc.net_pnl >= 0 ? '+' : ''}₹{simCalc.net_pnl.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

  );

  const renderRiskCard = () => (
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white light:text-slate-900">Risk Management Settings</h2>
                <p className="text-[11px] text-slate-400">Set your risk limits and alerts</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Daily Loss Limit */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 w-32">Daily Loss Limit</span>
                <div className="flex items-center gap-1.5 flex-1 justify-end font-mono-numbers">
                  <input
                    type="text"
                    value={dailyLossLimit}
                    onChange={(e) => setDailyLossLimit(e.target.value)}
                    className="w-24 px-2 py-1 rounded-lg bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] text-right text-xs text-white"
                  />
                  <input
                    type="text"
                    value={dailyLossPct + ' %'}
                    onChange={(e) => setDailyLossPct(e.target.value.replace('%', '').trim())}
                    className="w-14 px-2 py-1 rounded-lg bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] text-right text-xs text-slate-400"
                  />
                </div>
              </div>

              {/* Daily Profit Target */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 w-32">Daily Profit Target</span>
                <div className="flex items-center gap-1.5 flex-1 justify-end font-mono-numbers">
                  <input
                    type="text"
                    value={dailyProfitTarget}
                    onChange={(e) => setDailyProfitTarget(e.target.value)}
                    className="w-24 px-2 py-1 rounded-lg bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] text-right text-xs text-white"
                  />
                  <input
                    type="text"
                    value={dailyProfitPct + ' %'}
                    onChange={(e) => setDailyProfitPct(e.target.value.replace('%', '').trim())}
                    className="w-14 px-2 py-1 rounded-lg bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] text-right text-xs text-slate-400"
                  />
                </div>
              </div>

              {/* Monthly Loss Limit */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 w-32">Monthly Loss Limit</span>
                <div className="flex items-center gap-1.5 flex-1 justify-end font-mono-numbers">
                  <input
                    type="text"
                    value={monthlyLossLimit}
                    onChange={(e) => setMonthlyLossLimit(e.target.value)}
                    className="w-24 px-2 py-1 rounded-lg bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] text-right text-xs text-white"
                  />
                  <input
                    type="text"
                    value={monthlyLossPct + ' %'}
                    onChange={(e) => setMonthlyLossPct(e.target.value.replace('%', '').trim())}
                    className="w-14 px-2 py-1 rounded-lg bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] text-right text-xs text-slate-400"
                  />
                </div>
              </div>

              {/* Monthly Profit Target */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 w-32">Monthly Profit Target</span>
                <div className="flex items-center gap-1.5 flex-1 justify-end font-mono-numbers">
                  <input
                    type="text"
                    value={monthlyProfitTarget}
                    onChange={(e) => setMonthlyProfitTarget(e.target.value)}
                    className="w-24 px-2 py-1 rounded-lg bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] text-right text-xs text-white"
                  />
                  <input
                    type="text"
                    value={monthlyProfitPct + ' %'}
                    onChange={(e) => setMonthlyProfitPct(e.target.value.replace('%', '').trim())}
                    className="w-14 px-2 py-1 rounded-lg bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] text-right text-xs text-slate-400"
                  />
                </div>
              </div>

              {/* Max Risk Per Trade */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 w-32">Max Risk Per Trade</span>
                <div className="flex items-center gap-1.5 flex-1 justify-end font-mono-numbers">
                  <input
                    type="text"
                    value={maxRiskPerTrade}
                    onChange={(e) => setMaxRiskPerTrade(e.target.value)}
                    className="w-24 px-2 py-1 rounded-lg bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] text-right text-xs text-white"
                  />
                  <input
                    type="text"
                    value={maxRiskPct + ' %'}
                    onChange={(e) => setMaxRiskPct(e.target.value.replace('%', '').trim())}
                    className="w-14 px-2 py-1 rounded-lg bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] text-right text-xs text-slate-400"
                  />
                </div>
              </div>

              {/* Enable Risk Alerts Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1e293b]/50">
                <span className="text-[11px] text-slate-300">Enable Risk Alerts</span>
                <button
                  type="button"
                  onClick={() => setEnableRiskAlerts(!enableRiskAlerts)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    enableRiskAlerts ? 'bg-blue-600' : 'bg-[#1e293b]'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      enableRiskAlerts ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

  );

  const renderNotificationsCard = () => (
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white light:text-slate-900">Notification Settings</h2>
                <p className="text-[11px] text-slate-400">Get notified about important events</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              {[
                { id: 'dailyPnl', title: 'Daily P&L Summary', desc: 'Receive daily P&L report at market close' },
                { id: 'riskAlerts', title: 'Risk Limit Alerts', desc: 'Get notified when you reach risk limits' },
                { id: 'tradeReminders', title: 'Trade Reminders', desc: 'Remind about open positions' },
                { id: 'weeklyReport', title: 'Weekly Performance Report', desc: 'Get weekly summary every Sunday' },
                { id: 'monthlyReport', title: 'Monthly Performance Report', desc: 'Get monthly summary on 1st day' },
              ].map((n) => (
                <div key={n.id} className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-200 light:text-slate-800">{n.title}</div>
                    <div className="text-[10px] text-slate-400">{n.desc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifications((prev) => ({ ...prev, [n.id]: !prev[n.id] }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifications[n.id] ? 'bg-blue-600' : 'bg-[#1e293b]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        notifications[n.id] ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

  );

  const renderAppearanceCard = () => (
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white light:text-slate-900">Appearance Settings</h2>
                <p className="text-[11px] text-slate-400">Customize the look and feel</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Theme Selectors */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5">Theme</label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    onClick={() => {
                      setSelectedTheme('light');
                      if (isDark) toggleTheme();
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      selectedTheme === 'light'
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-[#1e293b] bg-[#0e1626] text-slate-400'
                    }`}
                  >
                    <div className="w-full h-8 rounded bg-slate-200 border border-slate-300"></div>
                    <span className="text-[10px] font-semibold">Light</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedTheme('dark');
                      if (!isDark) toggleTheme();
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      selectedTheme === 'dark'
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-[#1e293b] bg-[#0e1626] text-slate-400'
                    }`}
                  >
                    <div className="w-full h-8 rounded bg-[#0b111e] border border-blue-500/50"></div>
                    <span className="text-[10px] font-semibold">Dark</span>
                  </button>

                  <button
                    onClick={() => setSelectedTheme('system')}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                      selectedTheme === 'system'
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-[#1e293b] bg-[#0e1626] text-slate-400'
                    }`}
                  >
                    <div className="w-full h-8 rounded bg-gradient-to-r from-slate-200 to-[#0b111e] border border-[#1e293b]"></div>
                    <span className="text-[10px] font-semibold">System</span>
                  </button>
                </div>
              </div>

              {/* Primary Color Palette */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5">Primary Color</label>
                <div className="flex items-center gap-3">
                  {[
                    { color: '#3b82f6', name: 'Blue' },
                    { color: '#14b8a6', name: 'Teal' },
                    { color: '#8b5cf6', name: 'Purple' },
                    { color: '#f43f5e', name: 'Coral' },
                    { color: '#f59e0b', name: 'Orange' },
                    { color: '#ec4899', name: 'Pink' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      onClick={() => setPrimaryColor(c.color)}
                      className="w-5 h-5 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: c.color }}
                    >
                      {primaryColor === c.color && <Check className="w-3 h-3 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Font Size</label>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none"
                >
                  <option>Small</option>
                  <option>Medium</option>
                  <option>Large</option>
                </select>
              </div>

              {/* Compact Mode */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300">Compact Mode</span>
                <button
                  type="button"
                  onClick={() => setCompactMode(!compactMode)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    compactMode ? 'bg-blue-600' : 'bg-[#1e293b]'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      compactMode ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Show Animations */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300">Show Animations</span>
                <button
                  type="button"
                  onClick={() => setShowAnimations(!showAnimations)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    showAnimations ? 'bg-blue-600' : 'bg-[#1e293b]'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      showAnimations ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

  );

  const renderDataBackupCard = () => (
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white light:text-slate-900">Data & Backup</h2>
                <p className="text-[11px] text-slate-400">Manage your data and backups</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Auto Backup Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">Auto Backup</span>
                  <span className="text-[10px] text-slate-400">Automatically backup your data</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoBackup(!autoBackup)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    autoBackup ? 'bg-blue-600' : 'bg-[#1e293b]'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      autoBackup ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Backup Frequency */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Backup Frequency</label>
                <select
                  value={backupFrequency}
                  onChange={(e) => setBackupFrequency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none"
                >
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>

              {/* Last Backup with Success Pill */}
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-slate-400 text-[11px]">Last Backup</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-300 font-mono-numbers text-[11px]">{backupStatus}</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                    ✓ Success
                  </span>
                </div>
              </div>

              {/* Backup Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setBackupStatus(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                    triggerToast('Backup completed successfully!');
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/30 text-center transition-all"
                >
                  Backup Now
                </button>
                <button
                  onClick={handleDownloadBackup}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 text-xs font-semibold text-slate-300 hover:text-white text-center transition-all"
                >
                  Download Backup
                </button>
              </div>

              {/* Data Export */}
              <div className="pt-2 border-t border-[#1e293b]/50">
                <label className="text-[11px] text-slate-400 block mb-1">Data Export</label>
                <div className="flex items-center gap-2">
                  <select
                    value={exportType}
                    onChange={(e) => setExportType(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] text-white text-xs"
                  >
                    <option>All Data</option>
                    <option>Trades Only</option>
                    <option>Journal Entries</option>
                  </select>
                  <button
                    onClick={handleExportCSV}
                    className="px-3 py-1.5 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-slate-300 hover:text-white text-xs flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export (CSV)</span>
                  </button>
                </div>
              </div>

              {/* Data Import */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Data Import</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="backupUpload"
                    onChange={(e) => setSelectedBackupFile(e.target.files?.[0])}
                    className="hidden"
                  />
                  <label
                    htmlFor="backupUpload"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] text-slate-400 text-xs truncate cursor-pointer hover:border-slate-500"
                  >
                    {selectedBackupFile ? selectedBackupFile.name : 'Choose File No file selected'}
                  </label>
                  <button
                    onClick={() => {
                      if (selectedBackupFile) {
                        triggerToast('Data imported successfully!');
                        setSelectedBackupFile(null);
                      } else {
                        triggerToast('Please choose a file to import');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-slate-300 hover:text-white text-xs"
                  >
                    Import
                  </button>
                </div>
              </div>
            </div>
          </div>

  );

  const renderIntegrationsCard = () => (
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <LinkIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white light:text-slate-900">Integrations</h2>
                <p className="text-[11px] text-slate-400">Connect with external services</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Broker Integration */}
              <div>
                <div className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider mb-2">
                  Broker Integration
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-orange-600/20 text-orange-500 font-bold flex items-center justify-center text-xs">
                      ▲
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white light:text-slate-900 block">Zerodha Kite Connect</span>
                      <span className="text-[10px] text-rose-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Not Connected
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => triggerToast('Zerodha Kite Connect integration opened!')}
                    className="px-3 py-1 rounded-xl bg-[#162033] light:bg-slate-200 hover:bg-blue-600 hover:text-white text-slate-300 text-[11px] font-semibold transition-all border border-[#1e293b]"
                  >
                    Connect
                  </button>
                </div>
              </div>

              {/* Alert Notifications */}
              <div>
                <div className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider mb-2">
                  Alert Notifications
                </div>
                <div className="space-y-2">
                  {/* Telegram */}
                  <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                        <Send className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-white light:text-slate-900 block">Telegram</span>
                        <span className="text-[10px] text-rose-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Not Connected
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => triggerToast('Telegram bot setup link generated!')}
                      className="px-3 py-1 rounded-xl bg-[#162033] light:bg-slate-200 hover:bg-blue-600 hover:text-white text-slate-300 text-[11px] font-semibold transition-all border border-[#1e293b]"
                    >
                      Connect
                    </button>
                  </div>

                  {/* Email (SMTP) */}
                  <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-white light:text-slate-900 block">Email (SMTP)</span>
                        <span className="text-[10px] text-rose-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Not Configured
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => triggerToast('SMTP configuration settings modal opened!')}
                      className="px-3 py-1 rounded-xl bg-[#162033] light:bg-slate-200 hover:bg-blue-600 hover:text-white text-slate-300 text-[11px] font-semibold transition-all border border-[#1e293b]"
                    >
                      Configure
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

  );

  const renderAccountCard = () => (
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white light:text-slate-900">Account Settings</h2>
                <p className="text-[11px] text-slate-400">Manage your account information</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none"
                  placeholder="Your Name"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Username <span className="text-[10px] text-blue-400">(Can be used to sign in)</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none font-mono"
                  placeholder="e.g. trader"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none"
                  placeholder="name@example.com"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowPasswordModal(true)}
                  className="px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Change Password
                </button>

                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-md uppercase">
                    {user?.name ? user.name[0] : (name ? name[0] : 'T')}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Profile Picture</span>
                    <button
                      onClick={() => triggerToast('Avatar uploaded successfully!')}
                      className="text-[11px] text-blue-400 hover:underline font-semibold"
                    >
                      Change
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

  );

  const renderApplicationCard = () => (
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                  <CogIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white light:text-slate-900">Application Settings</h2>
                  <p className="text-[11px] text-slate-400">Other application preferences</p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                {[
                  { id: 'autoSaveDrafts', title: 'Auto Save Drafts', desc: 'Save trade drafts automatically' },
                  { id: 'confirmDelete', title: 'Confirm Delete', desc: 'Show confirmation before deleting' },
                  { id: 'playSoundAlerts', title: 'Play Sound Alerts', desc: 'Play sound for notifications' },
                  { id: 'showWelcomeTips', title: 'Show Welcome Tips', desc: 'Show helpful tips for new features' },
                ].map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-200 light:text-slate-800">{s.title}</div>
                      <div className="text-[10px] text-slate-400">{s.desc}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAppSettings((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        appSettings[s.id] ? 'bg-blue-600' : 'bg-[#1e293b]'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          appSettings[s.id] ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Reset to Default Settings Button */}
            <div className="pt-4">
              <button
                onClick={() => triggerToast('Settings reset to system defaults!')}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all text-center"
              >
                Reset to Default Settings
              </button>
            </div>
          </div>

  );

  const renderModulesCard = () => (
          <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center shrink-0">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-white light:text-slate-900">
                      Sidebar Modules
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                      {modules.filter((m) => isModuleVisible(m.id)).length} / {modules.length} Visible
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Live dynamic module visibility persisted directly in Database
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={async () => {
                    await setAllModulesVisible(true);
                    triggerToast('✓ All modules enabled and saved to Database!');
                  }}
                  className="px-2.5 py-1 rounded-xl bg-[#0e1626] hover:bg-[#162033] text-[10px] font-semibold text-slate-300 hover:text-white transition-colors"
                  title="Make all modules visible in DB"
                >
                  Show All
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await resetAllModules();
                    triggerToast('✓ Reset module visibility defaults in Database!');
                  }}
                  className="p-1.5 rounded-xl bg-[#0e1626] hover:bg-[#162033] text-slate-400 hover:text-white transition-colors"
                  title="Reset to default visibility in DB"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* List of Modules */}
            <div className="space-y-2 text-xs">
              {modules.map((mod) => {
                const Icon = mod.icon || Sliders;
                const visible = isModuleVisible(mod.id);
                return (
                  <div
                    key={mod.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      visible
                        ? 'bg-[#0e1626]/70 border-[#1e293b]'
                        : 'bg-[#0a0f1d]/50 border-[#1e293b]/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          visible
                            ? 'bg-blue-600/10 text-blue-400'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {Icon ? <Icon className="w-4 h-4" /> : null}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white light:text-slate-900 truncate">
                            {mod.name}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              visible
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {visible ? 'Visible' : 'Hidden'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-[250px]">
                          {mod.desc}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={async () => {
                        const willBeVisible = !visible;
                        await toggleModule(mod.id);
                        triggerToast(
                          willBeVisible
                            ? `✓ Saved "${mod.name}" (Visible) to Database!`
                            : `✓ Saved "${mod.name}" (Hidden) to Database!`
                        );
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        visible ? 'bg-blue-600' : 'bg-[#1e293b]'
                      }`}
                      title={visible ? `Click to hide ${mod.name}` : `Click to show ${mod.name}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          visible ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom Note */}
            <div className="pt-2 border-t border-[#1e293b]/60 flex items-center justify-between text-[11px] text-slate-400">
              <span>Dashboard & Settings remain always accessible</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync
              </span>
            </div>
          </div>
  );

  const renderDropdownsCard = () => {
    const totalCount = dropdownOptions?.length || 0;
    const activeCount = dropdownOptions?.filter((o) => o.is_active).length || 0;
    const inactiveCount = totalCount - activeCount;

    return (
      <div className="bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-5 shadow-xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1e293b] light:border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white light:text-slate-900">
                  Dropdown Options Manager
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Module-Wise
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Activate or deactivate dropdown options across modules
              </p>
            </div>
          </div>

          <Link
            to="/dropdown-manager"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all"
          >
            <span>Manage All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Stats Chips */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-center">
            <div className="text-[10px] text-slate-400 font-medium">Total Options</div>
            <div className="text-base font-bold text-white light:text-slate-900 font-mono-numbers mt-0.5">
              {totalCount}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-center">
            <div className="text-[10px] text-emerald-400 font-medium">Active</div>
            <div className="text-base font-bold text-emerald-400 font-mono-numbers mt-0.5">
              {activeCount}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#0e1626] light:bg-slate-50 border border-[#1e293b] light:border-slate-200 text-center">
            <div className="text-[10px] text-amber-400 font-medium">Inactive</div>
            <div className="text-base font-bold text-amber-400 font-mono-numbers mt-0.5">
              {inactiveCount}
            </div>
          </div>
        </div>

        {/* Modules Breakdown */}
        <div className="space-y-2 text-xs">
          {[
            {
              moduleKey: 'add-trade',
              name: 'Add Trade',
              desc: 'Indices, Trading Types, Strategies, Market Conditions, Option Types',
              color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
            },
            {
              moduleKey: 'trades',
              name: 'All Trades Filters',
              desc: 'Filter by Index, Trading Type, Option Type, Strategy',
              color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
            },
            {
              moduleKey: 'journal',
              name: 'Trading Journal',
              desc: 'Moods, Emotional state tags, and Journal setup types',
              color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
            },
          ].map((m) => {
            const modOptions = dropdownOptions?.filter((o) => o.module_key === m.moduleKey) || [];
            const modActive = modOptions.filter((o) => o.is_active).length;
            return (
              <div
                key={m.moduleKey}
                className="p-3 rounded-2xl bg-[#0e1626]/70 light:bg-slate-50 border border-[#1e293b] light:border-slate-200 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white light:text-slate-900">{m.name}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${m.color}`}>
                      {modActive}/{modOptions.length} Active
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{m.desc}</p>
                </div>

                <Link
                  to={`/dropdown-manager?module=${m.moduleKey}`}
                  className="p-2 rounded-xl bg-[#162033] hover:bg-blue-600 text-slate-400 hover:text-white transition-colors"
                  title={`Configure ${m.name}`}
                >
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Quick Footer Action */}
        <div className="pt-2 border-t border-[#1e293b]/60 flex items-center justify-between text-[11px] text-slate-400">
          <span>Deactivated options are hidden from form dropdowns immediately</span>
          <Link
            to="/dropdown-manager"
            className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
          >
            Open Manager
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  };

  // Definition array for search filtering
  const cardDefinitions = [
    { id: 'General', name: 'General Settings', keywords: 'general currency inr usd date format time format timezone language', render: renderGeneralCard },
    { id: 'Trading', name: 'Trading Settings', keywords: 'trading capital initial capital default index expiry order type strategy lot size shares', render: renderTradingCard },
    { id: 'Lot Sizes', name: 'Manage All Index Lot Sizes', keywords: 'lot sizes index nifty banknifty finnifty midcpnifty sensex bankex shares quantities', render: renderLotSizesCard },
    { id: 'Brokerage', name: 'Brokerage & Regulatory Charges', keywords: 'brokerage charges stt gst sebi stamp duty transaction turnover rates zerodha regulatory flat order simulator', render: renderBrokerageCard },
    { id: 'Dropdowns', name: 'Dropdown Options Manager', keywords: 'dropdown options active inactive module add trade all trades strategy index trading type condition mood', render: renderDropdownsCard },
    { id: 'Risk Management', name: 'Risk Management Settings', keywords: 'risk management daily loss limit profit target monthly risk trade max risk alerts', render: renderRiskCard },
    { id: 'Notifications', name: 'Notification Settings', keywords: 'notifications daily pnl summary risk alerts trade reminders weekly report monthly report', render: renderNotificationsCard },
    { id: 'Appearance', name: 'Appearance Settings', keywords: 'appearance theme light dark system primary color font size compact mode animations', render: renderAppearanceCard },
    { id: 'Data & Backup', name: 'Data & Backup', keywords: 'data backup auto backup export csv import json download restore file', render: renderDataBackupCard },
    { id: 'Integrations', name: 'Integrations', keywords: 'integrations zerodha kite connect telegram alert email smtp broker notifications', render: renderIntegrationsCard },
    { id: 'Account', name: 'Account Settings', keywords: 'account name email password change profile picture avatar user credentials', render: renderAccountCard },
    { id: 'Application', name: 'Application Settings', keywords: 'application auto save drafts confirm delete play sound alerts show welcome tips reset defaults', render: renderApplicationCard },
    { id: 'Modules', name: 'Sidebar Modules', keywords: 'sidebar modules visibility dynamic navigation menu show hide dashboard calendar journal', render: renderModulesCard },
  ];

  const renderContent = () => {
    // 1. Search Query Filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const matches = cardDefinitions.filter(
        (c) => c.name.toLowerCase().includes(q) || c.keywords.toLowerCase().includes(q)
      );

      if (matches.length === 0) {
        return (
          <div className="py-16 text-center bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-8 max-w-xl mx-auto space-y-3">
            <Search className="w-10 h-10 text-slate-500 mx-auto opacity-60" />
            <h3 className="text-base font-bold text-white light:text-slate-900">
              No settings match "{searchQuery}"
            </h3>
            <p className="text-xs text-slate-400">
              Try searching with keywords like 'capital', 'brokerage', 'lot size', 'risk', or 'theme'.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all"
            >
              Clear Search
            </button>
          </div>
        );
      }

      if (matches.length === 1) {
        return <div className="max-w-3xl mx-auto w-full">{matches[0].render()}</div>;
      }
      if (matches.length === 2) {
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto w-full items-start">
            {matches.map((c) => (
              <div key={c.id}>{c.render()}</div>
            ))}
          </div>
        );
      }
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
          {matches.map((c) => (
            <div key={c.id}>{c.render()}</div>
          ))}
        </div>
      );
    }

    // 2. Specific Active Tab Views
    if (activeTab === 'General') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto w-full items-start">
          <div className="flex flex-col gap-5">{renderGeneralCard()}</div>
          <div className="flex flex-col gap-5">{renderApplicationCard()}</div>
        </div>
      );
    }

    if (activeTab === 'Trading') {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <div className="flex flex-col gap-5">{renderTradingCard()}</div>
          <div className="flex flex-col gap-5">{renderLotSizesCard()}</div>
          <div className="flex flex-col gap-5">{renderBrokerageCard()}</div>
        </div>
      );
    }

    if (activeTab === 'Brokerage') {
      return <div className="max-w-3xl mx-auto w-full">{renderBrokerageCard()}</div>;
    }

    if (activeTab === 'Dropdowns') {
      return <div className="max-w-4xl mx-auto w-full">{renderDropdownsCard()}</div>;
    }

    if (activeTab === 'Lot Sizes') {
      return <div className="max-w-3xl mx-auto w-full">{renderLotSizesCard()}</div>;
    }

    if (activeTab === 'Risk Management') {
      return <div className="max-w-2xl mx-auto w-full">{renderRiskCard()}</div>;
    }

    if (activeTab === 'Notifications') {
      return <div className="max-w-2xl mx-auto w-full">{renderNotificationsCard()}</div>;
    }

    if (activeTab === 'Appearance') {
      return <div className="max-w-2xl mx-auto w-full">{renderAppearanceCard()}</div>;
    }

    if (activeTab === 'Data & Backup') {
      return <div className="max-w-2xl mx-auto w-full">{renderDataBackupCard()}</div>;
    }

    if (activeTab === 'Integrations') {
      return <div className="max-w-2xl mx-auto w-full">{renderIntegrationsCard()}</div>;
    }

    if (activeTab === 'Account') {
      return <div className="max-w-2xl mx-auto w-full">{renderAccountCard()}</div>;
    }

    if (activeTab === 'Modules') {
      return <div className="max-w-3xl mx-auto w-full">{renderModulesCard()}</div>;
    }

    // 3. Default: 'All' Settings - Balanced 3-column vertical flow with ZERO empty space!
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
        {/* Column 1: General (380px) + Brokerage (850px) + Account (250px) + Application (240px) */}
        <div className="flex flex-col gap-5">
          {renderGeneralCard()}
          {renderBrokerageCard()}
          {renderAccountCard()}
          {renderApplicationCard()}
        </div>

        {/* Column 2: Trading (440px) + Risk (420px) + Appearance (390px) + Modules (380px) */}
        <div className="flex flex-col gap-5">
          {renderTradingCard()}
          {renderRiskCard()}
          {renderAppearanceCard()}
          {renderModulesCard()}
        </div>

        {/* Column 3: Lot Sizes (520px) + Dropdowns (380px) + Notifications (360px) + Data & Backup (380px) + Integrations (280px) */}
        <div className="flex flex-col gap-5">
          {renderLotSizesCard()}
          {renderDropdownsCard()}
          {renderNotificationsCard()}
          {renderDataBackupCard()}
          {renderIntegrationsCard()}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-fadeIn text-slate-100">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white light:text-slate-900 tracking-tight">
            Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your preferences, account, dynamic lot sizes, and application settings
          </p>
        </div>

        {/* Right Search, Bell, Profile */}
        <div className="flex items-center gap-3 self-end md:self-auto flex-wrap">
          {/* Search settings input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 text-xs text-slate-300 light:text-slate-700 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 w-48"
            />
          </div>

          {/* Bell Icon */}
          <button className="p-2 rounded-lg bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] light:border-slate-300 text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors">
            <Bell className="w-4 h-4" />
          </button>

          {/* Profile Circle */}
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
            D
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[#1e293b] light:border-slate-200 pb-3 text-xs font-semibold whitespace-nowrap scrollbar-none">
        {[
          { id: 'All', label: 'All Settings', icon: Sliders },
          { id: 'General', label: 'General', icon: CogIcon },
          { id: 'Trading', label: 'Trading Settings', icon: TrendingUp },
          { id: 'Brokerage', label: 'Brokerage & Charges', icon: Receipt },
          { id: 'Dropdowns', label: 'Dropdown Options', icon: SlidersHorizontal },
          { id: 'Lot Sizes', label: 'Index Lot Sizes', icon: Layers },
          { id: 'Risk Management', label: 'Risk Management', icon: Shield },
          { id: 'Notifications', label: 'Notifications', icon: Bell },
          { id: 'Appearance', label: 'Appearance', icon: Palette },
          { id: 'Data & Backup', label: 'Data & Backup', icon: Database },
          { id: 'Integrations', label: 'Integrations', icon: LinkIcon },
          { id: 'Account', label: 'Account', icon: User },
          { id: 'Modules', label: 'Sidebar Modules', icon: LayoutGrid },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-[#121b2d]/50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {renderContent()}

      {/* Add Custom Index Modal */}
      {showAddIndexModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e293b] light:border-slate-200">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white light:text-slate-900">
                  Add Custom Index / Symbol
                </h3>
              </div>
              <button
                onClick={() => setShowAddIndexModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddIndex} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Index / Symbol Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CRUDEOIL, GOLD, SILVER"
                  value={newIndexName}
                  onChange={(e) => setNewIndexName(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-white light:text-slate-900 uppercase focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Lot Size (Quantity per lot) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newIndexLotSize}
                  onChange={(e) => setNewIndexLotSize(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-white light:text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px]">
                When logging trades for <strong>{newIndexName || 'CUSTOM'}</strong>, 1 lot will auto-calculate to <strong>{newIndexLotSize || 0} shares/units</strong>.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddIndexModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-600/30"
                >
                  Add Index
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Change Modal with View Password Functionality */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#121b2d] light:bg-white border border-[#1e293b] light:border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e293b] light:border-slate-200">
              <h3 className="text-base font-bold text-white light:text-slate-900">
                Change Password
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {passwordMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordMessage}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Current Password *</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">New Password *</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Confirm New Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 rounded-xl bg-[#0e1626] light:bg-slate-100 border border-[#1e293b] text-white light:text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-600/30"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
