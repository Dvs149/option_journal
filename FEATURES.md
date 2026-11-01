# FEATURES — TradeJournal

## 1. Feature Status Matrix

| Module / Capability | Status | Front-End Component / Page | Back-End Controller / Service |
|---|---|---|---|
| **Dual Login (Username / Email)** | Production Ready | `pages/Login.jsx` | `AuthController.php`, `LoginRequest.php` |
| **User Registration & Setup** | Production Ready | `pages/Register.jsx` | `AuthController.php`, `RegisterRequest.php` |
| **Dashboard KPIs & Charts** | Production Ready | `pages/Dashboard.jsx` | `DashboardController.php`, `TradingAnalyticsService.php` |
| **Add Single & Multi-leg Trade** | Production Ready | `pages/AddTrade.jsx` | `TradeController.php`, `TradingCalculationService.php` |
| **All Trades Table & Explorer** | Production Ready | `pages/AllTrades.jsx` | `TradeController.php` |
| **Multi-screenshot Upload & Lightbox** | Production Ready | `components/trades/EditTradeModal.jsx` | `TradeController.php`, `TradeScreenshot.php` |
| **Zerodha Bulk CSV Import** | Production Ready | `components/trades/BulkImportModal.jsx` | `TradeController.php`, `utils/bulkTradeParser.js` |
| **Multi-Format Export (Excel/CSV/PDF)** | Production Ready | `components/trades/ExportModal.jsx` | `ExportController.php`, `ExportService.php` |
| **Trading Calendar & Heatmap** | Production Ready | `pages/TradingCalendar.jsx` | `CalendarController.php` |
| **Trading Journal (4-Tab Drawer)** | Production Ready | `pages/TradingJournal.jsx` | `JournalController.php` |
| **Equity Curve & Capital Management**| Production Ready | `pages/EquityCurve.jsx`, `CapitalManagement.jsx` | `CapitalController.php`, `TradingAnalyticsService.php` |
| **Risk Management & Live Limits** | Production Ready | `pages/RiskManagement.jsx` | `RiskController.php` |
| **Strategy Analysis** | Production Ready | `pages/StrategyAnalysis.jsx` | `StrategyController.php`, `TradingAnalyticsService.php` |
| **Dynamic Dropdown Manager** | Production Ready | `pages/DropdownManager.jsx` | `DropdownOptionController.php`, `DropdownOption.php` |
| **Pine Script Manager & Webhook Alert**| Production Ready | `pages/PineScriptManager.jsx` | `PineScriptController.php`, `PineScript.php` |
| **Brokerage & Tax Schedule Editor** | Production Ready | `pages/Settings.jsx` | `BrokerageSettingController.php`, `BrokerageSetting.php` |
| **Dynamic Module Visibility** | Production Ready | `pages/Settings.jsx`, `components/layout/Sidebar.jsx` | `ModuleVisibilityController.php`, `UserModuleVisibility.php` |
| **Dark / Light Theme Switcher** | Production Ready | `context/ThemeContext.jsx`, `Navbar.jsx` | Native CSS Tokens (`index.css`) |

---

## 2. In-Depth Feature Breakdown

### 2.1 Dashboard & Visual Analytics
- **Primary KPIs**: Net P&L (colored by profit/loss), Gross Profit, Gross Loss, Total Regulatory Charges & Brokerage, Current Capital.
- **Secondary KPIs**: Total Trades, Winning Days vs Losing Days, Win Rate %, Profit Factor, Max Drawdown, Average Daily P&L.
- **Visual Charts**:
  - Daily P&L bar chart with green/red bars.
  - Cumulative Equity Curve with high-water mark.
  - Monthly P&L breakdown bars.
  - Index Distribution Donut (NIFTY, BANKNIFTY, SENSEX, etc.).
  - Option Type Donut (CE vs PE distribution).
  - Mini Trading Calendar Heatmap preview.
  - Live Risk & Limit gauge indicators.

### 2.2 Trade Logging Engine (`AddTrade.jsx`)
- Supports single-leg buying/selling (`CE` or `PE`) and multi-leg simultaneous positions (`Both` / Straddle / Strangle).
- Automatic lot sizing: changing index immediately recalibrates contract quantities.
- Real-time tax preview: dynamically queries `/api/trades/estimate-charges` or computes client-side charges before trade submission.
- Multi-screenshot attachment with drag-and-drop preview.
- Customizable strategy, trading type (Intraday, BTST, Positional), and execution notes.

### 2.3 All Trades Explorer (`AllTrades.jsx`)
- Paginated table supporting 10, 20, 50, or 100 rows per page.
- Search filter matching index, strategy, tags, notes, and trade setup.
- Interactive Date Range filter popover:
  - Preset shortcuts: *Today, Yesterday, This Week, This Month, Last Month, This Year, All Time*.
  - Custom two-month date range calendar picker with start and end date selection.
- Multi-row bulk actions: multi-checkbox selection with one-click bulk delete.
- Interactive Side Drawer: 
  - Details Tab: comprehensive contract specifications.
  - Charges Tab: breakdown of STT, exchange charges, GST, SEBI fee, stamp duty, brokerage.
  - Journal Tab: quick read/write reflection notes.
  - Sleek top-right action icons: Edit, Delete, Close (`✕`).

### 2.4 Trading Journal & Reflection Drawer (`TradingJournal.jsx`)
- Dedicated psychological and qualitative analysis tool.
- Tabbed Journal Details Side Drawer:
  1. **Trade Details Tab**: Shows complete execution contract specs, lot sizing, and CE/PE leg prices.
  2. **Journal Notes Tab**: Trade setup description, *What Went Right?*, *What Went Wrong?*, emotional mood (Happy/Neutral/Sad), star ratings (1-5), and tags.
  3. **Screenshots Tab**: Multi-image chart gallery with full-screen Lightbox viewer and built-in upload/deletion.
  4. **Lessons Tab**: Key lessons learned, pitfalls avoided, market conditions & volatility review, and discipline checklist.

### 2.5 Pine Script Manager (`PineScriptManager.jsx`)
- Complete library to store, organize, and inspect TradingView Pine Script indicators, strategies, and alerts.
- Filter by script type (Indicator, Strategy, Alert, Library), version (v5, v6, v4), and category (Options, Price Action, Scalping).
- Interactive Code Inspector:
  - Monospace dark theme with line numbering.
  - Word wrap toggle.
  - Character count and line count.
  - Full-screen code modal expansion.
  - One-click clipboard copy with visual feedback toast.
  - Direct download as `.pine` file.
- TradingView Webhook Alert Setup:
  - Pre-formatted JSON alert payloads for automated webhook bridges (Zerodha, Dhan, Fyers, OpenAlgo, Tradetron).
- Script duplication (`Copy of ...`), favorite starring, and JSON backup export/import.

### 2.6 Dynamic Dropdown Manager (`DropdownManager.jsx`)
- Control dropdown menus across modules without hardcoded code changes.
- Supports dropdowns for: Indices, Trading Types, Strategies, Option Types, Market Conditions, and Emotional Moods.
- Features:
  - Toggle options active/inactive.
  - Add custom options with custom colors.
  - Re-order option sequences.
  - Reset to default catalog at any time.

### 2.7 Document Generation & Export (`ExportModal.jsx`)
- Client-side and server-side export engine:
  - **Excel (`.xlsx`)**: Formatted multi-tab workbook via SheetJS.
  - **CSV**: Standard comma-separated trade logs.
  - **PDF Report**: Formatted executive report with KPIs, monthly summaries, and trade tables generated via Barryvdh DomPDF.
  - Custom column toggles: select exactly which data columns to include in the exported report.

### 2.8 Dynamic Module Visibility & Settings (`Settings.jsx`)
- Customize which modules appear in the sidebar and mobile navigation.
- Configure custom index lot sizes (NIFTY, BANKNIFTY, FINNIFTY, SENSEX, BANKEX, or custom stocks).
- Customize brokerage rate schedules (flat fee, exchange fees, STT, GST).
- Update profile name, unique username, and email.
- Change password with confirmation.
- 1-click database reset and sample data seeder.
