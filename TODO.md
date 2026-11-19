# TODO & DEVELOPMENT ROADMAP — TradeJournal

This document tracks prioritized future improvements, architectural tasks, and prospective features.

---

## Priority 0: Stability, Quality Control & Security (Immediate)

- [x] **Indian Stock Market (NSE & BSE) Trading Holidays in All Calendars**:
  - Added full 2026 official NSE & BSE exchange holidays schedule to main Trading Calendar (`TradingCalendar.jsx`), Dashboard mini calendar (`Dashboard.jsx`), and macOS application (`TradingCalendarView.swift`).
  - Rendered distinct amber styling, `🇮🇳 Holiday` signs/badges, holiday names, interactive hover tooltips, and updated legends.
  - Updated `FilterContext.jsx`'s `getNextWorkingDay` to automatically skip weekends and market holidays.
- [x] **Dual CE & PE Exit Prices for Both (Straddle/Strangle) Orders**:
  - Support separate CE and PE exit price inputs in partial exit dialog (`PartialExitModal.jsx`), live combined total display, option chain straddle selection, and split leg SELL order execution in backend.
- [x] **Real-time KPI Top Cards Synchronization on Order & Trade Updates**:
  - Bound top KPI cards (Total Trades, Net P&L, Gross Profit, Gross Loss, Total Charges, Win Rate) in `AllTrades.jsx` to pre-paginated query aggregate summary in `TradeController::index`, ensuring instant updates whenever an order is edited, deleted, or partially exited, and across all active filter combinations.
- [x] **Trading Calendar Daily Trades Table Parity with All Trades**:
  - Upgraded daily trades list in `TradingCalendar.jsx` to 15-column format matching `AllTrades.jsx` with expandable order executions breakdown, Expiry/Gross P&L/Charges/Strategy columns, straddle leg prices, newest-first ordering, and inline partial exit/order edit modals.
- [x] **Zerodha Kite Connect Read-Only Module & Settings Integration**:
  - Added dedicated `/zerodha` module with 4 summary metric cards (Available Margin, Used Margin, Positions MTM P&L, Holdings Value) and 5 tabbed sections (Executed Orders, Positions, Holdings, Funds & Margins, Profile & Security).
  - Strictly enforced read-only architecture: zero order creation, modification, or cancellation APIs.
  - Added Zerodha Email / Client ID and Password fields (with show/hide eye toggle) alongside Kite API Key & Secret Key in connection modals.
  - Eliminated dummy mock data for live connected accounts: prompts for daily 2FA session login (`needs_auth`) with 1-Click Kite Login button (`https://kite.zerodha.com/connect/login?v=3&api_key=...`) and automated callback exchange.
  - Implemented interactive order review & selection modal (`ZerodhaOrderImportModal.jsx`) allowing selective order imports, Smart Match pairing into closed trades, Both (straddle) leg consolidation, inline quantity/price/type edits, and turnover tracking matching the screenshot import experience.
  - Implemented Zerodha Virtual Contract Note modal (`ZerodhaContractNoteModal.jsx`) and API (`GET /api/zerodha/contract-note`) with statutory charges breakdown (SEBI, Exchange, Stamp duty, STT, GST), brokerage, total charges, and per-order itemized breakdown matching official Kite contract note.
  - Added visual Open vs Closed position distinction in Positions tab with Kite-matched bold blue quantity, muted closed rows, All/Open/Closed filters, and index summary headers.
  - Added instant Demo / Sandbox simulation mode for testing without a paid Kite subscription.
  - Integrated live credentials configuration, connection status, and navigation in `Settings -> Integrations`.
- [x] **Automated Tests for Calculation Engine & Capital API**:
  - Added PHPUnit tests in `backend/tests/Feature/CapitalApiTest.php` and `TradeApiTest.php` verifying STT, BSE/BFO exchange fees, GST, SEBI fees, ascending creation order imports, capital opening balance calculations, and timeframe filtering against known contract note standards.
- [x] **Chronological Ascending Order for Trade Imports**:
  - Ensured all order imports (Zerodha Kite auto-sync, CSV imports, screenshot parser) sort orders in strict ascending creation order (`first-created first-added`).
- [x] **Interactive Timeframe Filtering in Capital Management**:
  - Implemented dynamic timeframe filtering (`1M`, `3M`, `6M`, `YTD`, `1Y`, `All`), period stats, opening capital anchoring, and clean date formatting in `CapitalManagement.jsx` and `CapitalController.php`.
- [x] **Table Height & Pagination Stabilization**:
  - Stabilized table container height and bottom-anchored pagination controls across All Trades and Trading Journal.
- [x] **All Trades KPI Top Cards Red/Green Dynamic Color Coding (Zerodha Parity)**:
  - Dynamically styled top KPI cards in `AllTrades.jsx` (Net P&L, Gross Profit, Gross Loss) to render numbers in emerald green (`+₹...`) when profitable and rose red (`-₹...`) when negative, with matching dynamic icon badge colors and drawer financial summary sign consistency matching the Zerodha Kite module.
- [x] **Zero-Hardcoded Secrets & Credential Hardening**:
  - Purged all hardcoded Zerodha API keys and secrets from source files (`ZerodhaKiteService.php`, `Settings.jsx`, `Zerodha.jsx`).
  - Enforced secure `.env` variable access and database-stored user credentials.
  - Added user modal prompts before OAuth redirect when API key is unconfigured.
  - Updated `backend/.env.example` with clean blank templates.
- [x] **Dashboard Date Range Filter Reflection & Period KPI Adaptability**:
  - Fixed query parameter conflict where `from_date` and `to_date` overridden named filters like `today` or `yesterday`.
  - Updated `TradingAnalyticsService::resolveDateRange` to only use explicit dates for `custom` filters.
  - Formatted single-day ranges cleanly as `19 Nov 2026` instead of `19 Nov 2026 - 19 Nov 2026`.
  - Added dynamic period titles to top Dashboard KPI cards (`Today's Net Profit`, `This Week's Net Profit`, etc.).
  - Added automated unit tests in `FinancialCalculationTest.php`.
- [ ] **Bulk Import Parser Validation Suite**:
  - Write unit tests for `frontend/src/utils/bulkTradeParser.js` ensuring correct parsing of varied Zerodha Kite Tradebook CSV formats, multi-lot orders, and split executions.
- [ ] **Database Backup & Integrity Check**:
  - Ensure automated MySQL database dumps or cron snapshots for local persistent data.

---

## Priority 1: Performance & Code Optimization (Near-Term)

- [ ] **Route-Level Code Splitting (Vite)**:
  - Migrate top-level page imports in `App.jsx` to `React.lazy()` with a shared loading fallback skeleton to reduce initial JS chunk size from ~1.97MB to <300kB.
- [ ] **Manual Rollup Chunking**:
  - Configure `vite.config.js` to split `vendor-recharts` and `vendor-xlsx` into distinct async chunks.
- [ ] **Light Mode Consistency Audit**:
  - Review all modals and tables to guarantee 100% color contrast compliance in Light Mode.
- [ ] **Image Compression on Upload**:
  - Compress high-resolution chart screenshots on client or backend before saving to disk to save storage space.

---

## Priority 2: Feature Enhancements (Mid-Term)

- [ ] **Direct Broker Webhook Ingestion**:
  - Build incoming webhook listener endpoints (`/api/webhooks/orders`) to automatically receive real-time fill executions from broker webhooks (Zerodha Kite Connect, Dhan API, Fyers API).
- [ ] **Interactive Strategy Payoff Diagram**:
  - Add visual Black-Scholes / Greeks payoff diagram chart (Delta, Gamma, Theta, Vega) in `StrategyAnalysis.jsx` and `AddTrade.jsx`.
- [ ] **Multi-Account Switching**:
  - Support adding secondary broker accounts (e.g. Zerodha + Dhan) and switching between them with an account switcher pill in the Navbar.
- [ ] **Automated Daily Journal Reminders**:
  - Notification or toast prompt if user logged trades during the day but has uncompleted reflections in the Trading Journal.

---

## Priority 3: Native macOS SwiftUI Application Roadmap

Implementation phases for building the native macOS application (`macos/OptionJournal/`) connecting to the existing Laravel REST API:

- [x] **Phase 1: Foundation, Design System & Authentication**
  - [x] Implement `KiteTheme.swift` with Zerodha Kite Dark/Light color palette, typography, and status tokens.
  - [x] Implement `KeychainManager.swift` for secure macOS Keychain persistence of Sanctum bearer tokens.
  - [x] Implement `APIClient.swift` with async/await, Bearer token injection, snake_case decoding, and error diagnostics.
  - [x] Implement `AuthService`, `AuthViewModel`, and `LoginView` with validation and error alerts.

- [x] **Phase 2: App Shell & Navigation**
  - [x] Implement `MainSplitView.swift` (`NavigationSplitView`) with Zerodha-styled collapsible sidebar.
  - [x] Implement macOS Native Toolbar (Account status, Privacy Mode toggle, Light/Dark appearance switcher, Refresh button).
  - [x] Build global `AppState` with user profile, network status banner, and notification toasts.

- [x] **Phase 3: Dashboard & All Trades Module**
  - [x] Implement `DashboardViewModel` and `DashboardView` with compact Kite metric cards (Net P&L, Win Rate, Profit Factor, Charges).
  - [x] Implement `TradesViewModel` with server-side pagination, multi-attribute filtering (Date, Symbol, Type, Strategy), and sorting.
  - [x] Build `TradesTableView` using compact macOS `Table` with monospaced financial numbers and P&L coloring.
  - [x] Build `TradeDetailSheet` inspector for inspecting trade breakdown, charges, and journal notes.

- [x] **Phase 4: Trade Management & Native Exporter**
  - [x] Implement `AddTradeView` / `EditTradeView` with real-time local charge calculation preview.
  - [x] Implement `BulkImportView` supporting drag-and-drop Zerodha Kite tradebook CSV parsing.
  - [x] Implement `ExportReportSheet` supporting custom aggregation (Trade-by-Trade, Daily, Monthly, Yearly) and native `NSSavePanel` file saving for CSV, XLSX, and PDF.

- [x] **Phase 5: Visual Analytics & Financial Charts**
  - [x] Implement `EquityCurveView` using Swift Charts with cumulative P&L area graphs and benchmark overlays.
  - [x] Implement `TradingCalendarView` with interactive monthly grid and daily P&L badges.
  - [x] Implement `StrategyAnalysisView` with win rate breakdowns and strategy distribution charts.
  - [x] Implement `RiskManagementView` with daily drawdown limits, max loss thresholds, and discipline alerts.

- [x] **Phase 6: Journaling, Tools, Packaging & Release**
  - [x] Implement `TradingJournalView` with daily reflection editor and screenshot gallery.
  - [x] Implement `CapitalManagementView` for tracking deposits, withdrawals, and current margin.
  - [x] Implement `PineScriptManagerView` with syntax highlighting and code copying.
  - [x] Implement `DropdownSettingsView` for toggling option parameters.
  - [x] Configure App Sandbox entitlements (`network.client`, `files.user-selected.read-write`).
  - [x] Prepare Universal 2 build (`arm64` + `x86_64`), notarize via `notarytool`, and package DMG.

