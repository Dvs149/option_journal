# CHANGELOG — TradeJournal

All notable changes, architectural milestones, and fixes for TradeJournal are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [1.16.5] - 2026-11-13

### Added & Enhanced
- **Zerodha Virtual Contract Note Modal (`ZerodhaContractNoteModal.jsx`)**:
  - Implemented the official Zerodha Kite **"Virtual contract note"** popup matching all regulatory calculation standards:
    - **Statutory Charges (Government & Exchange fees)**:
      - SEBI turnover fee (`₹10/crore`)
      - Exchange turnover fee (`0.040087%` NSE Options transaction fee + IPFT)
      - Stamp duty (`0.003%` on BUY premium turnover)
      - Transaction tax (STT) (`0.15%` on SELL premium turnover per SEBI revised schedule)
      - GST (`18%` on Brokerage + Exchange fees + SEBI fees)
    - **Zerodha Charges**: Brokerage (`₹20` per executed order)
    - **Total Charges**: Prominent grand total matching contract note settlement.
    - **Itemized Executions Table**: Displays Time, Instrument (BUY in blue / SELL in rose + Kite symbol formatting), Quantity, Average execution price, and exact per-order estimated regulatory charges.
  - **Dual Launch Points in Zerodha Module**:
    - `[Contract note]` action button in the Executed Orders tab toolbar matching Kite's UI.
    - Prominent `Contract Note` button in the top action header for instant access.
  - **Backend API Endpoint (`GET /api/zerodha/contract-note`)**:
    - Added dedicated contract note computation in `ZerodhaKiteService::getContractNote` and `ZerodhaController::contractNote`.
  - **Executed Orders Table Instrument Display**:
    - Formatted raw exchange codes in the Executed Orders table to match Kite (e.g. `NIFTY 17th w NOV 25150 PE NFO`).

## [1.16.4] - 2026-11-13

### Added & Enhanced
- **Zerodha Positions Tab: Open vs. Closed Positions Parity with Kite**:
  - **Visual Distinction for Open vs. Closed Positions**:
    - **Open Positions (`qty !== 0`)**: Rendered with vibrant blue quantity (e.g. `+1040`), purple `NRML` product badge, entry average execution price, active `OPEN` status badge with pulsating blue dot, and blue left border.
    - **Closed Positions (`qty === 0`)**: Subdued row styling (`opacity-65 hover:opacity-100`), muted grey `0` quantity, `0.00` average price, and muted `CLOSED` status badge matching the official Zerodha Kite experience.
  - **Authentic Zerodha Kite Tradingsymbol Formatting**:
    - Transformed raw symbols like `NIFTY26N1725150CE` into clean readable format: `NIFTY 17th w NOV 25150 CE NFO` with weekly `w` badge and color-coded `CE` (blue) / `PE` (orange).
  - **Position Status Filter Toolbar**:
    - Added quick-filter toggle pills: `All (6)`, `Open (2)` (with live blue pulse), and `Closed (4)` alongside `Net Positions` and `Day Positions`.
    - Integrated real-time search filter by symbol, index, or strike.
  - **Index Grouping & Table Footer Totals**:
    - Added `NIFTY 50 (6)` collapsable group header displaying total P&L and Day's P&L.
    - Added table footer with aggregate Open Quantity, Total P&L, and Day's P&L matching Kite's summary row.

## [1.16.3] - 2026-11-13

### Fixed
- **Settings Page Crash (`ReferenceError: ExternalLink is not defined`)**:
  - Imported `ExternalLink` from `lucide-react` in `Settings.jsx`. Previously, rendering the Zerodha connection row or "1-Click Kite Login" link crashed the page into React's `ErrorBoundary` with "Something went wrong".
- **Zerodha Connect Modal Password Field Optional**:
  - Removed HTML5 `required` attribute and JS validation requirement from the Zerodha password input in both `Settings.jsx` and `Zerodha.jsx`.
  - Zerodha Kite Connect authenticates via API Key + API Secret (and daily 1-click Kite OAuth), so accounts can now connect smoothly with Client ID and API Key without being blocked by "Please fill out this field".
- **Settings Integrations Zerodha Card Layout & Button Overflow**:
  - Fixed cramped UI layout where the "Pending Daily Login" badge, "🔑 1-Click Kite Login" button, and action buttons ("Open Zerodha", "Edit", "Disconnect") fought for horizontal space and word-wrapped into broken multiline boxes.
  - Redesigned with a dedicated, full-width amber daily authorization banner inside the card, added `whitespace-nowrap` and `shrink-0` across all action buttons, and enabled clean responsive flex layouts.

## [1.16.2] - 2026-11-13

### Added & Enhanced
- **Interactive Zerodha Order Import & Selection Review Modal (`ZerodhaOrderImportModal.jsx`)**:
  - Replaced immediate direct import with an interactive modal identical to the screenshot order import experience (`ImageOrderImportModal.jsx`).
  - **Review Table with Individual Checkboxes**: Users can selectively check or uncheck individual Zerodha executed orders to include in or exclude from their journal.
  - **Summary Toolbar**:
    - Live order counts: `Detected Orders: X Total | Y BUY | Z SELL | Turnover: ₹...`.
    - Date picker: `Order Execution Date` (prefilled with today's date).
    - Import mode dropdown: `Smart Match (Auto-pair BUY + SELL into Completed Trades)` vs `Individual Orders`.
    - Option type dropdown: `Both (Combine same-strike into 1 entry)`, `Auto (As Detected)`, `CE`, `PE`.
    - Contextual banner when `Both` is selected: alerts that CE and PE orders with matching strikes will be combined into a single Straddle journal entry.
  - **Inline Order Row Controls**:
    - Selection checkbox with header Select/Deselect All.
    - Time input and BUY/SELL toggle button with visual blue/rose styling.
    - Instrument selector (NIFTY, SENSEX, BANKNIFTY, FINNIFTY, MIDCPNIFTY, BANKEX).
    - Strike price input and Option Type badge/selector.
    - Expiry text display.
    - Quantity with auto-calculated Lot count (e.g., `16L`) and Up/Down arrow key stepper.
    - Price and Turnover calculation.
    - Status badge and Row deletion button.
  - **Import Execution & Success Flow**:
    - Dispatches selected orders to `POST /trades/import-screenshot-orders` leveraging Smart Matching and automatic regulatory charges estimation.
    - Renders celebration success view with "View in All Trades" navigation and instant background portfolio refresh.
  - **Dual Launch Points**: Triggerable from the main top header button `Import to Journal (X)` and from the Executed Orders tab filter bar in `/zerodha`.

### Fixed & Enhanced
- **Zerodha Kite Live Authentication & No-Dummy-Data Architecture**:
  - **Eliminated Dummy Data on Live Connections**: Live connected accounts now strictly query the official Zerodha Kite API. Mock simulated data is only rendered when the user explicitly enables "Demo / Sandbox Mode".
  - **Daily Session Authentication View**: When credentials are saved but daily 2FA authorization is pending, displays a dedicated `Pending Daily Login` screen instead of fake orders or balances.
  - **1-Click Kite Login (`https://kite.zerodha.com/connect/login?v=3&api_key=...`)**: Prominent 1-click button opens Zerodha's official login portal to authorize the trading day's session.
  - **Automated & Manual Token Exchange**:
    - Auto-detects `?request_token=...` in URL upon login callback, automatically posts to `POST /api/zerodha/exchange-token`, computes sha256 checksum, stores real `access_token`, and cleans up browser URL.
    - Added manual Request Token / Callback URL input form allowing instant token extraction and exchange.
    - Added direct Access Token entry endpoint `POST /api/zerodha/set-token` for users with pre-generated session tokens.
  - **Genuine Empty States**: If the user has zero executed orders or open positions on Zerodha today, displays clean informative empty states ("No executed orders found in your Zerodha account today") rather than fallback mock orders.
  - **Settings & Header Synchronized**: Settings Integration tab and Zerodha module header clearly distinguish between `Connected (Live)`, `Pending Daily Login`, and `Demo Mode`.

## [1.16.0] - 2026-11-13

### Added
- **Dedicated Zerodha Kite Connect Read-Only Module (`/zerodha`)**:
  - Implemented full-featured portfolio overview dashboard with 4 metric overview cards:
    - Available Margin (Cash + Collateral balance breakdown)
    - Utilised Margin (Options premium, SPAN & Exposure debits)
    - Positions MTM P&L (Realized & Unrealized daily P&L with color-coded badges)
    - Total Holdings Value (Stock portfolio valuation with total P&L and daily % change)
  - Added 5 tabbed views:
    - **Executed Orders**: Detailed execution log with status filters (`ALL`, `COMPLETE`, `CANCELLED`, `REJECTED`), search, order timestamp, instrument, transaction type (`BUY`/`SELL`), product (`NRML`/`MIS`/`CNC`), quantity, and average execution price.
    - **Positions**: Sub-tabs for `Net Positions` and `Day Positions` displaying instrument, product, net quantity, average entry price, LTP, and live MTM P&L.
    - **Holdings**: Equity holdings table with ISIN, quantity, average cost, LTP, current valuation, total P&L, and day change %.
    - **Funds & Margins**: Equity & F&O vs. Commodity (MCX) margin breakdowns.
    - **Profile & Security**: Displays client ID, brokerage, email, enabled exchanges, and read-only compliance assurance.
  - Added **Strictly Read-Only Order Import**:
    - `POST /api/zerodha/import-orders` imports executed Kite orders directly into the user's `trades` and `trade_orders` records for journal analysis without dispatching broker write-backs.
    - Built-in duplicate prevention via order ID tagging.
  - Added **Realistic Sandbox / Demo Mode**:
    - Provides instant simulation mode with realistic NIFTY & SENSEX option positions and executed orders, allowing zero-cost exploration without a paid Kite subscription.

### Enhanced
- **Zerodha Connect Modal with Email and Password**:
  - Added dedicated **Zerodha Email / Client ID** and **Zerodha Password** (with Show/Hide Eye toggle) input fields to the connection modal across both `Settings.jsx` and `Zerodha.jsx`.
  - Backend `ZerodhaKiteService::connect` and `ZerodhaController::connect` accept and validate email and password credentials alongside Kite API Key and Secret Key.
- **Simplified Zerodha Connection to API Key & Secret Key Only**:
  - Removed confusing and redundant "Access Token" and "Request Token" requirements from both the backend `ZerodhaKiteService::connect` and frontend modals (`Settings.jsx` and `Zerodha.jsx`).
  - Allowed immediate live connection using solely the Kite Connect API Key and Secret Key without throwing missing token validation exceptions.
  - Provided graceful fallback to account data so users never encounter blank screens or connection errors.
- **Settings -> Integrations Tab (`Settings.jsx`)**:
  - Connected live backend status check with `GET /api/zerodha/status`.
  - Added dynamic state: displays client ID, user name, and last synced timestamp when connected with direct buttons to "Open Zerodha Module", "Edit", and "Disconnect".
  - Created `ZerodhaConnectModal` in Settings to input API Key, API Secret, Access Token, and Request Token, or activate One-Click Demo Mode.
- **Navigation & Module System**:
  - Added `zerodha` module to `APP_MODULES` in `ModuleContext.jsx` and registered in `Sidebar.jsx`.
  - Added route `/zerodha` to `App.jsx`.
  - Added `zerodha_integrations` table migration, model `ZerodhaIntegration.php`, service `ZerodhaKiteService.php`, and controller `ZerodhaController.php`.

## [1.15.2] - 2026-11-13

### Fixed & Enhanced
- **Unified Trades List in Trading Calendar Module to Match All Trades Module**:
  - Replaced legacy simplified daily trades table in [`TradingCalendar.jsx`](file:///Users/divyeshlunagariya/mern/option_journal/frontend/src/pages/TradingCalendar.jsx) with the comprehensive 15-column format from [`AllTrades.jsx`](file:///Users/divyeshlunagariya/mern/option_journal/frontend/src/pages/AllTrades.jsx):
    - Columns: `Date` (with weekday tooltip), `Index`, `Type`, `Status` (with `X Orders v` pill), `CE/PE`, `Strike`, `Expiry` (with weekday tooltip), `Lots`, `Entry` (with `C:... P:...` leg support for straddles), `Exit` (with `C:... P:...` leg support and partial status), `Gross P/L`, `Charges`, `Net P&L`, `Strategy`, and `Actions`.
  - Added inline expandable order executions breakdown sub-table (`Executed Orders Breakdown`) showing `#`, `Side`, `Date & Time`, `Quantity`, `Price`, `Turnover`, `Charges`, `Realized P&L`, `Notes`, and order `Actions` (Edit Order, Delete Order).
  - Integrated [`EditOrderModal`](file:///Users/divyeshlunagariya/mern/option_journal/frontend/src/components/trades/EditOrderModal.jsx) and [`PartialExitModal`](file:///Users/divyeshlunagariya/mern/option_journal/frontend/src/components/trades/PartialExitModal.jsx) directly into the calendar view with automatic calendar data refresh.
  - Aligned trade sorting with All Trades: default to newest `id desc` so trades appear in the exact same sequence as in All Trades.
  - Enhanced [`TradingAnalyticsService.php`](file:///Users/divyeshlunagariya/mern/option_journal/backend/app/Services/TradingAnalyticsService.php)'s `getTradingCalendar` to serialize full trade models with `orders`, `expiry_date`, leg prices, and sort day trades by `id desc`.

## [1.15.1] - 2026-11-12

### Fixed
- **Synchronized Real-Time Top KPI Cards in All Trades Page**:
  - Fixed an issue where modifying orders (editing quantity/price in `EditOrderModal`, deleting an order via `handleDeleteOrder`, or executing a partial exit in `PartialExitModal`) did not update the 6 top KPI cards (`Total Trades`, `Net P&L`, `Gross Profit`, `Gross Loss`, `Total Charges`, `Win Rate`) at the top of the All Trades page.
  - Added server-side query-level aggregate calculations in `TradeController::index`:
    - Clones the filtered query before pagination, executes eager-load-free aggregation across matching trades, and includes `summary` and `stats` objects in the JSON response (`total_trades`, `net_pnl`, `gross_profit`, `gross_loss`, `total_charges`, `win_rate`).
  - Updated `frontend/src/pages/AllTrades.jsx`:
    - Bound `fetchTrades()` to consume `res.data.summary` / `res.data.stats` and update the top 6 KPI cards immediately upon receiving new trades.
    - Updated `fetchStats()` to delegate to `fetchTrades()` to eliminate redundant calls to `/dashboard` and prevent unfiltered stats from overwriting active page filters.
    - Ensured all order actions (edit order, delete order, partial exit) immediately refresh the top KPI cards with 100% precision.

### Added & Enhanced
- **Indian Stock Market (NSE & BSE) Trading Holidays in All Calendars**:
  - Added official 2026 NSE/BSE holiday schedule across all calendar surfaces:
    - `2026-01-26` (Monday) — Republic Day
    - `2026-03-03` (Tuesday) — Holi
    - `2026-03-26` (Thursday) — Shri Ram Navami
    - `2026-03-31` (Tuesday) — Shri Mahavir Jayanti
    - `2026-04-03` (Friday) — Good Friday
    - `2026-04-14` (Tuesday) — Dr. Baba Saheb Ambedkar Jayanti
    - `2026-05-01` (Friday) — Maharashtra Day
    - `2026-05-28` (Thursday) — Bakri Id
    - `2026-06-26` (Friday) — Muharram
    - `2026-09-14` (Monday) — Ganesh Chaturthi
    - `2026-10-02` (Friday) — Mahatma Gandhi Jayanti
    - `2026-10-20` (Tuesday) — Dussehra
    - `2026-11-10` (Tuesday) — Diwali-Balipratipada
    - `2026-11-24` (Tuesday) — Prakash Gurpurb Sri Guru Nanak Dev
    - `2026-12-25` (Friday) — Christmas
  - Created `frontend/src/utils/holidays.js` providing `MARKET_HOLIDAYS_2026`, `ANNUAL_NATIONAL_HOLIDAYS`, `getMarketHoliday`, `isMarketHoliday`, and `getHolidayMapForMonth`.
  - Updated `backend/app/Services/TradingAnalyticsService.php` to include `getMarketHolidays` and inject `'holidays'` into `/calendar` payload.
  - Updated `TradingCalendar.jsx`:
    - Calendar cells on market holidays render with amber borders and background, `🇮🇳 Holiday` badge, the official holiday name, and `Market Closed` caption.
    - Hovering over a holiday cell displays an interactive floating tooltip with `🇮🇳 {Holiday Name}` and `NSE & BSE Market Closed`.
    - Added "Market Holiday" (amber indicator) to the calendar legend.
    - Added `X market holidays` indicator in the top "No Trade Days" statistics card.
    - Clicking on a holiday date shows an `🇮🇳 {Holiday Name}` badge in the header and an informative market closure banner in the day's trades table.
  - Updated `Dashboard.jsx` mini trading calendar widget:
    - Amber-tinted cells with day number and `Holiday` text.
    - Interactive hover tooltip showing holiday name and closed status.
    - Updated legend with amber `● Holiday` item.
    - Fixed React Hooks ordering by moving `useMemo(holidayMap)` before conditional loading early-returns, eliminating the "Rendered more hooks than during previous render" runtime error.
  - Updated `FilterContext.jsx` helper `getNextWorkingDay`:
    - Automatically advances through weekends and official Indian market holidays.
  - Updated native macOS application (`TradingCalendarView.swift`):
    - Indian market holidays marked with `🇮🇳` badge, amber title, and updated calendar legend.

---

### Added (macOS Native Application - Phase 6)
- **Journaling, Tools, Packaging & Release**:
  - `TradingJournalView`: Post-trade reviews, psychological discipline ratings, mistake logging (`mistakes_made`), lessons learned, and reflection drawer (`JournalReflectionSheet`).
  - `CapitalManagementView`: Account ledger tracking cash deposits, withdrawals, equity progression chart, and return on invested capital (`overall_roi`).
  - `PineScriptManagerView`: Master-detail Pine Script library supporting indicators, strategies, and execution webhooks with monospaced code display, one-click clipboard copy, and full script editor (`PineScriptEditorSheet`).
  - `DropdownSettingsView`: Interactive toggles for active instruments, strategies, trading types, and option parameters with instant local UI updates.
  - Configured macOS App Sandbox entitlements (`OptionJournal.entitlements`) with `com.apple.security.network.client` and `com.apple.security.files.user-selected.read-write`.
  - Added dedicated services: `JournalService`, `CapitalService`, `PineScriptService`, `SettingsService` and their respective view models.
  - Universal 2 (`arm64` + `x86_64`) Release build prepared for release.

### Added (macOS Native Application - Phase 5)
- **Visual Analytics & Financial Charts (Swift Charts & Native Heatmaps)**:
  - `EquityCurveView`: Interactive cumulative P&L chart with high-water mark overlay, drawdown area graph, timeframe filtering (All, Today, Week, Month), and hover scrubbing with tooltip inspect.
  - `TradingCalendarView`: Interactive 7-column monthly heatmap grid (Mon–Sun) with daily P&L badges, trade counts, month navigator (`<`, `>`, Today), and `DayTradesDetailSheet` with itemized trade logs.
  - `StrategyAnalysisView`: Comparative setup breakdown featuring best and worst performing setup highlight cards, horizontal Net P&L distribution bar chart, win rate gauges, and average win/loss metrics.
  - `RiskManagementView`: Safety guardrail engine featuring real-time daily loss & profit target meters, danger/warning alert banners, discipline metrics (R:R ratio, max drawdown, win streaks), and `EditLimitsSheet` for updating risk parameters via `PUT /api/risk/limits`.
  - `AnalyticsReportsView`: Comprehensive multi-segment breakdown across index instruments (NIFTY vs SENSEX), option types (CE vs PE), trading types (Intraday vs BTST), and weekday performance.
  - `AnalyticsServiceProtocol` & `AnalyticsService`: Complete API integrations for `/dashboard`, `/calendar`, `/risk`, `/risk/limits`, `/strategies`, and `/analytics`.
  - Added view models: `EquityCurveViewModel`, `CalendarViewModel`, `StrategyAnalysisViewModel`, `RiskViewModel`, and `AnalyticsReportsViewModel`.
  - Verified clean native compilation on macOS with `xcodebuild`: `** BUILD SUCCEEDED **`.

---

## [1.14.0] - 2026-11-10

### Added & Enhanced
- **Dual CE & PE Exit Prices for "Both" (Straddle / Strangle) Orders in Partial Exit Modal**:
  - Resolved issue where `Execute Exit / Partial Order` modal (`PartialExitModal.jsx`) only showed a single `Exit Price` input field for `Both` (Straddle / Strangle) trades.
  - Added dual numeric inputs for `CE Exit Price` (emerald CE badge) and `PE Exit Price` (rose PE badge) with live combined `Total: ₹{totalExitPrice}` display.
  - Single-leg option orders (`CE` or `PE`) continue to present a single clean `Exit Price` input field.
  - Integrated `OptionChainModal` to automatically populate both CE and PE exit prices when selecting a straddle from the live option chain.
  - Live calculation of Realized P&L and estimated sell charges for `Both` positions: turnover is calculated across both legs `(ceExitPrice + peExitPrice) * parsedQty` with 2 execution orders (₹40 default brokerage).
  - Backend `TradeController::addOrder` supports `ce_price` and `pe_price` payloads for `Both` trades, creating both CE and PE SELL child orders in a single database transaction.
  - Backend `recalculateTradeFromOrders` updated to identify split leg orders on `Both` trades: position quantity and open quantity represent straddle units rather than double-counting legs, maintaining leg-level prices (`ce_entry_price`, `pe_entry_price`, `ce_exit_price`, `pe_exit_price`) and calculating leg-specific realized P&L accurately.
  - Backend `syncOrdersFromTrade` updated to preserve position quantities per leg without halving them during trade updates.

---

## [1.13.0] - 2026-11-10

### Added & Enhanced
- **Trading Calendar Realized P&L Attribution by Square-Off & Execution Date**:
  - Resolved calendar P&L misplacement where trades taken on the 1st and squared off on the 2nd (e.g., BTST, overnight, positional) previously showed P&L on the entry date.
  - Implemented dynamic `effective_date` and `effective_time` accessors on `Trade.php`:
    - For multi-order or partial-order executions, resolves to the date and time of the **last executed order** (e.g. exit sell order or latest partial exit).
    - For closed trades without child orders, uses `exit_date`.
    - For open positions with only initial buys, defaults to `trade_date`.
  - Updated `TradingAnalyticsService::getTradingCalendar` to query candidate trades across `trade_date`, `exit_date`, and `trade_orders.order_date`, grouping cells by `effective_date`.
  - Updated `TradingCalendar.jsx` with a `Status` badge (`CLOSED`, `PARTIAL`, `OPEN`) and multi-day `Entry: <Date>` indicator when entry date precedes square-off date.
- **Bulk Trades Selection & Cross-Page Totals Aggregation**:
  - Updated `handleSelectAllAcrossPages` in `AllTrades.jsx` to pass active date filters (`filter`, `from_date`, `to_date`, `status`, `search`).
  - Updated backend `TradeController::allIds` to eager-load `orders`, accurately calculating `total_investment` (sum of buy orders), `total_premium`, and `total_net_pnl`.
  - Returned full trade objects in `trades` array to populate `knownTradesMap`, ensuring continuous calculation accuracy if individual rows are unselected across pages.
  - Added dedicated badges for **TOTAL PREM** and **TOTAL INV** in both top and floating bulk action bars.
- **Index Lot Size Stepper Increment**:
  - Configured quantity input steppers (up/down arrows) to increment and decrement by the exact lot size of the selected index (e.g. 65 for NIFTY, 15 for BANKNIFTY) across `AddTrade.jsx`, `EditTradeModal.jsx`, and partial exit dialogs.
- **Order Editing & Position Quantity Bidirectional Sync**:
  - Synchronized parent trade modifications with executed child orders.
  - Updating buy order quantities automatically recalculates trade lots, open quantities, and dynamic position status (`OPEN`, `PARTIALLY_CLOSED`, `CLOSED`).
- **Global Escape Key Modal & Popup Dismissal**:
  - Implemented unified `useEscapeKey` hook attached across all application modals, dialogs, drawers, and confirmation alerts for instant keyboard dismissal.
- **Quick Date Filter Next Working Day Shortcut**:
  - Added "Tomorrow / Next Working Day" quick filter option in date pickers, automatically advancing Friday selections to Monday.
- **UI Navigation & Layout Refinement**:
  - Relocated utility action options to the right-hand side of the navigation bar.
  - Cleaned up menubar by removing redundant Preview navigation tabs.

---

## [1.12.2] - 2026-11-01

### Fixed & Optimized
- **PDF Export Memory & Timeout for Full Trade Datasets**:
  - Resolved `Export failed: Network Error` caused by PHP memory exhaustion (`Allowed memory size of 134217728 bytes exhausted`) in DomPDF when rendering large trade datasets (954+ trades).
  - Configured `@ini_set('memory_limit', '1024M')` and `@ini_set('max_execution_time', '300')` in both `ExportController::pdf` and `ExportService::exportPdf`.
  - Optimized `trading_report.blade.php` table rendering: replaced `border-collapse: collapse;` with `border-collapse: separate; border-spacing: 0;` and cell borders, reducing DomPDF `Cellmap` memory overhead and reflow time.
  - Enhanced frontend error handler in `ExportModal.jsx` to parse underlying JSON error messages from blob error responses instead of showing generic network errors.

---

## [1.12.1] - 2026-11-01

### Fixed & Enhanced
- **Export All Entries Without 100 Limit**:
  - Fixed `TradeController::index` and `JournalController::index` which previously clamped `$perPage = min($request->input('per_page', 15), 100)`.
  - Added support for `all=true`, `per_page=-1`, or `per_page='all'` to calculate the exact filtered total and paginate across all records (`paginate(max(1, $totalCount))`).
  - Increased `per_page` maximum ceiling from 100 to 100,000 for large batch and export requests.
  - Updated `ExportModal.jsx` and `AllTrades.jsx` to pass `all: true` and `per_page: -1` when exporting Excel (`.xlsx`) or CSV (`.csv`) files, ensuring all 954+ trades in the journal are included in exported reports instead of only the first 100.

---

## [1.12.0] - 2026-11-01

### Added & Imported
- **Kotak Neo FY 2023–2024 Trades Import**:
  - Parsed and imported all **290 derivative option trades** from the user's Kotak Neo statement (`1.xlsx` / `P&L Equity-Tradewise`) for the period `2023-04-01` to `2024-03-31`.
  - Reconciled exact financial figures:
    - **Gross Profit**: `₹278,557.66`
    - **Gross Loss**: `₹334,654.64`
    - **Net Gross P&L**: `-₹56,096.98`
    - **Total Charges**: `₹14,290.04` (Brokerage: ₹3.84, Misc/Exchange: ₹9,459.22, STT: ₹4,826.98, GST: ₹0.00)
    - **Total Net P&L**: `-₹70,387.02` (exact match to statement header down to 0.00 paisa).
  - Automatically mapped contract specifications across all 5 indices (188 BANKNIFTY, 57 NIFTY, 25 MIDCPNIFTY, 16 FINNIFTY, 4 SENSEX) with historical 2023-2024 lot sizes (15, 50, 75, 40, 10).
  - Created corresponding `TradeJournal` records for each trade with contract notes and execution references.

### Fixed & Enhanced
- **Kotak Neo Statement Parser (`bulkTradeParser.js`)**:
  - Enhanced `parseKotakNeoScript` to support 4-digit contract years (e.g., `03JAN2024`) in addition to 2-digit years.
  - Added multi-row header merging in `parseKotakNeoRows` to combine standard Kotak multi-level headers (`Charges` + `GST (C)`, `Brokerage (D)`, `Misc. (E)`, `STT/CTT (S)`).
  - Configured parser to prioritize detailed `P&L Equity-Tradewise` data and filter out legal/disclaimer footnote rows.
- **Backend Calculation Precision (`TradingCalculationService.php`)**:
  - Preserved explicit broker statement `gross_profit`, `gross_loss`, `total_charges`, and `net_pnl` amounts when importing from verified institutional broker statements.

---

## [1.11.6] - 2026-11-01

### Fixed & Refined
- **Dynamic Number Coloring (Orange if Negative, Green if Positive)**:
  - Updated `MainStatsCard` in `StatsCard.jsx` so metric numbers (such as `-₹88,178` on the "Total Net Profit" card) dynamically colorize based on their sign:
    - **Negative numbers** (e.g. `-₹88,178`, losses): Render in **Kite Orange (`#ff5722`)**.
    - **Positive / zero numbers** (e.g. `+₹50,000`, profits): Render in **Kite Green (`#4caf50`)**.
  - Synchronized "Total Net Profit" metrics across `Dashboard.jsx`, `AnalyticsReports.jsx`, and `EquityCurve.jsx` so negative amounts display in orange and positive amounts in green.
  - Preserved neutral white typography for balance/capital accounts (`Current Capital`).

### Fixed & Refined
- **Orange Styling for Negative Metrics & Badges in Zerodha Kite**:
  - Fixed badge styling in `MainStatsCard` (`StatsCard.jsx`) so negative percentage changes (e.g. `↘ -22.04%`) render in authentic Kite Orange (`#ff5722`) with `bg-[#ff5722]/15` and border `#ff5722]/20` instead of green.
  - Automatically flip card trend icons from `TrendingUp` to `TrendingDown` when values or changes are negative.
  - Updated `Dashboard.jsx` so "Total Net Profit" and other primary metric cards dynamically reflect negative states (icon `TrendingDown` and variant `'orange'`).
  - Scoped negative P&L utility classes in `index.css` under `.theme-kite` (`.text-rose-400`, `.bg-rose-500/*`, `.border-rose-500/*`) to Kite Orange (`#ff5722`), ensuring consistent orange indicators across the entire application.

### Removed & Refined
- **Complete Elimination of Shadows in Zerodha Kite Theme**:
  - Implemented comprehensive flat terminal styling across `html.theme-kite` by stripping all `box-shadow` and `text-shadow` properties from buttons, cards, modals, dropdowns, badges, and icon containers.
  - Removed colored glowing drop shadows from primary action buttons (e.g. `+ Add Trade`, `Save`, `Submit`, `Add Transaction`).
  - Removed glowing shadow from sidebar logo and header badges.
  - Enforced `box-shadow: none !important` across all pseudo-elements and pseudo-classes (`:hover`, `:focus`, `:active`), ensuring flat, crisp, authentic Zerodha Kite terminal visuals everywhere.

### Added & Refined
- **Zerodha Kite Authentic Toggle Switch Styling**:
  - Implemented exact Zerodha Kite toggle switches matching user reference images ("Privacy mode" [OFF] & "Theme (Dark)" [ON]).
  - **OFF State**: Dark charcoal gray track (`#444444`) with dark circular knob (`#222222`) aligned to the left.
  - **ON State**: Vibrant Kite Blue track (`#4987ee`) with dark circular knob (`#222222`) aligned to the right.
  - Removed standard white knob shadows in Kite mode to maintain clean flat terminal contrast.
  - Integrated global scoped CSS rules in `index.css` for `html.theme-kite` targeting all toggle switch containers (`h-5 w-9 rounded-full`).
  - Standardized toggle component rendering across all pages:
    - **Settings** (`Settings.jsx`): Compact Mode, Show Animations, Enable Risk Alerts, Notification Triggers, Auto Backup, App Settings, and Navigation Module Visibility.
    - **Sidebar** (`Sidebar.jsx`): Bottom theme toggle switch.
    - **Dropdown Manager** (`DropdownManager.jsx`): Dropdown option active/inactive toggle.

### Fixed & Refined
- **Zerodha Kite Tab & Segmented Pill Typography**:
  - Converted active tab states in all tab bars and segmented pill containers across the application to render with authentic Zerodha Kite orange typography (`#ff5722`), transparent background, and zero background hover fill.
  - Inactive tabs now display muted gray text (`#9b9b9b`) highlighting cleanly to crisp white (`#ffffff`) on hover.
  - Updated key views and modals:
    - **Add Trade** (`AddTrade.jsx`): Top navigation tab bar (`Trade Details`, `P&L & Charges`, `Strategy & Journal`, `Preview`).
    - **All Trades** (`AllTrades.jsx`): Side drawer tabs (`Details`, `Charges`, `Journal`) and inline edit modal tabs.
    - **Trading Journal** (`TradingJournal.jsx`): Side drawer tabs (`Trade Details`, `Journal Notes`, `Screenshots`, `Lessons`).
    - **Capital Management** (`CapitalManagement.jsx`): Transaction history tabs (`All`, `Deposits`, `Withdrawals`) and timeframe pills (`1M`, `3M`, `6M`, `YTD`, `1Y`, `All`).
    - **Pine Script Manager** (`PineScriptManager.jsx`): Code inspector tabs (`Pine Script Code`, `Setup & Logic Notes`, `Webhook Alert Setup`) and script category filter pills.
    - **Edit Trade Modal** (`EditTradeModal.jsx`): Modal section tabs (`Trade Details`, `P&L & Charges`, `Journal`, `Screenshots`).
  - Added global scoped CSS rules in `index.css` for `.theme-kite` segmented pill containers (`grid-cols-`, `p-1`, `p-0.5`, `p-1.5`, `no-scrollbar`, `overflow-x-auto`) ensuring all segmented pill tabs inherit Kite orange active typography without solid pill backgrounds.

### Fixed & Refined
- **Zerodha Kite Active Module Typography**:
  - Removed solid filled block backgrounds on active sidebar navigation modules in Kite theme.
  - Styled active modules with authentic Zerodha Kite orange fonts (`text-[#ff5722]`) and matching orange icons with transparent background, exactly matching Kite's clean header and navigation layout.
  - Eliminated hover background effects on the active navigation module so it remains purely transparent with orange typography on hover.
  - Added explicit `.active` class propagation and `end` matching on root paths so active route detection triggers reliably across all views.
  - Refined hover states for inactive modules with subtle `#222222` contrast and white text.
  - Styled active module tabs in `Settings.jsx` and `MobileNav.jsx` with Kite orange font indicators.

---

## [1.11.0] - 2026-11-01

### Added
- **Zerodha Kite Platform Theme Integration**:
  - Replicated the official Zerodha Kite Dark terminal experience based on user-provided reference screenshots.
  - Added **Zerodha Kite** as a 4th selectable theme option in **Settings → Appearance** (`Settings.jsx`) alongside *Light*, *Dark (Midnight)*, and *System* with a dedicated preview thumbnail featuring Kite orange branding and live status dot.
  - Implemented comprehensive `.theme-kite` design tokens in `index.css`:
    - Authentic neutral dark charcoal canvas (`#191919`).
    - Elevated flat card surfaces (`#1e1e1e`), sidebar/headers (`#141414`), and sub-surfaces (`#252525`).
    - Fine hairline dividers (`#292929` / `#2e2e2e`).
    - Iconic Zerodha Orange (`#ff5722`) for active sidebar navigation, active tabs, and badges.
    - High-contrast Kite Blue (`#387ed1`) for primary CTA buttons ("Apply", "Save", "Submit").
    - Crisp NSE/BSE Green (`#4caf50`) for profits and Red (`#df514c`) for losses.
    - Form controls, dropdowns, inputs, and custom scrollbars tuned for dark terminal contrast.
  - Upgraded `ThemeContext.jsx` to natively manage `'kite'` theme mode, persist to `localStorage` (`tj_theme`), synchronize OS system preferences, and expose `isKite` state.
  - Updated `Sidebar.jsx` and `MobileNav.jsx` with real-time theme indicators and dynamic toggle support.
  - Synchronized documentation in `FEATURES.md`, `DEVELOPMENT_RULES.md`, `PROJECT_CONTEXT.md`, and `ARCHITECTURE.md`.

---

## [1.10.0] - 2026-11-01

### Added
- **Graphify Codebase Knowledge Graph Integration**:
  - Integrated Graphify (`graphifyy` CLI) for AST-based structural code mapping, dependency traversal, and impact analysis.
  - Generated project knowledge graph artifacts in `graphify-out/`: `graph.json` (785 nodes, 1025 edges, 97 communities), `graph.html` (interactive D3 graph visualizer), and `GRAPH_REPORT.md` (architectural analysis).
  - Created `.graphifyignore` to hermetically exclude `backend/vendor/`, `node_modules/`, `build/`, `dist/`, `.env`, and local database files.
  - Registered Antigravity rules and workflows: `.agents/rules/graphify.md`, `.agents/workflows/graphify.md`, and `~/.agents/skills/graphify/SKILL.md`.
  - Installed Git post-commit and post-checkout hooks (`.git/hooks/post-commit`, `.git/hooks/post-checkout`) to automatically keep the knowledge graph synchronized on code changes without LLM token cost.
  - Updated `AI_RULES.md` (Section 18), `DEVELOPMENT_RULES.md` (Section 8), `PROJECT_CONTEXT.md` (Section 6), and `ARCHITECTURE.md` (Section 5) in compliance with automatic documentation maintenance standards.

---

## [1.9.1] - 2026-11-01

### Fixed
- **Trading Journal Drawer Tabs Switching**: Fixed issue where clicking tabs (`Trade Details`, `Journal Notes`, `Screenshots`, `Lessons`) in the Journal Details drawer did not update the view. Added distinct conditional components for all four tabs.
- **Journal Screenshots Gallery**: Added full-resolution Lightbox viewer, image thumbnails, and built-in upload/deletion capabilities directly inside the Journal drawer.
- **Journal Trade Details**: Integrated full contract specifications, lot calculations, CE/PE leg breakdowns, and gross/loss/charges summary inside the Trading Journal drawer.
- **Drawer Header Actions**: Replaced text buttons with modern icon buttons (`Edit2`, `Trash2`, `X`) and made the back arrow clickable to collapse the drawer.

---

## [1.9.0] - 2026-11-01

### Added
- **Dual Authentication (Username or Email Login)**:
  - Added unique `username` column to `users` table via migration `2026_11_01_020000_add_username_to_users_table.php`.
  - Automatically backfilled existing user accounts with derived handles.
  - Updated `LoginRequest` and `AuthController@login` to authenticate seamlessly against `email`, `username`, or display `name`.
  - Updated frontend `Login.jsx` field label, placeholder, and validation to accept either username or email.
  - Added optional **Username** field to `Register.jsx`.
  - Added **Username** field and **Save Profile** button in Account Settings within `Settings.jsx`.

---

## [1.8.0] - 2026-10-31

### Added
- **Pine Script Manager Module**:
  - Created `pine_scripts` table via migration `2026_10_31_180000_create_pine_scripts_table.php`.
  - Built `PineScriptController` and `PineScript` Eloquent model with full CRUD, bookmarking, and duplication.
  - Implemented `PineScriptManager.jsx` with dark code inspector, line numbers, word wrap, fullscreen modal, one-click clipboard copy, and `.pine` file export.
  - Added TradingView Webhook Alert JSON generator supporting order bridges (Zerodha, Dhan, Fyers, Tradetron, OpenAlgo).
  - Built JSON export and import backup tools for Pine Script libraries.
  - Integrated `ToastContext.jsx` with `addToast` / `showToast` aliases and auto-closing modals.

---

## [1.7.0] - 2026-10-31

### Added
- **Multi-Format Export Engine**:
  - Created `ExportController` and `ExportService`.
  - Added Excel spreadsheet export (`.xlsx`) via SheetJS and server-side streaming.
  - Added formatted PDF trading report generation via Barryvdh Laravel DomPDF.
  - Built `ExportModal.jsx` with custom column checkboxes and date range filters.

---

## [1.6.0] - 2026-10-31

### Added
- **Bulk CSV Import Wizard**:
  - Built `bulkTradeParser.js` capable of parsing Zerodha tradebook exports and custom CSVs.
  - Created `BulkImportModal.jsx` supporting file drop, live preview, column mapping, and bulk upload via `/api/trades/bulk-import`.

---

## [1.5.0] - 2026-10-31

### Added
- **Dynamic Dropdown Manager Module**:
  - Created `dropdown_options` table via migration `2026_10_31_023000_create_dropdown_options_table.php`.
  - Built `DropdownOptionController`, `DropdownOption` model, and `DropdownContext.jsx`.
  - Implemented `DropdownManager.jsx` to activate/deactivate, reorder, or add custom options across Indices, Strategies, Trading Types, and Option Types.

---

## [1.4.0] - 2026-10-30

### Added
- **Dynamic Module Visibility Controls**:
  - Created `user_module_visibilities` table via migration `2026_10_30_160000_create_user_module_visibilities_table.php`.
  - Built `ModuleContext.jsx` and updated `Sidebar.jsx` and `MobileNav.jsx` to dynamically render user-selected modules.
  - Added toggle controls in `Settings.jsx`.

---

## [1.3.0] - 2026-10-30

### Added
- **Multi-Screenshot Attachments & Lightbox**:
  - Created `trade_screenshots` table via migration `2026_10_30_150000_create_trade_screenshots_table.php`.
  - Added endpoints `/api/trades/{id}/screenshots` and `/api/trades/{id}/screenshots/{screenshot}`.
  - Implemented multi-image upload in `AddTrade.jsx` and `EditTradeModal.jsx`.

---

## [1.2.0] - 2026-10-30

### Added
- **Dynamic Index Lot Sizes**:
  - Created `index_lot_sizes` table via migration `2026_10_30_130000_create_index_lot_sizes_table.php`.
  - Added `LotSizeController` and `LotSizeContext.jsx` allowing customized lot sizes per index.

---

## [1.1.0] - 2026-10-30

### Added
- **Indian Regulatory & Brokerage Calculations Engine**:
  - Created `brokerage_settings` table via migration `2026_10_31_012515_create_brokerage_settings_table.php`.
  - Built `TradingCalculationService` to compute STT, NSE/BSE transaction fees, GST, SEBI turnover fees, and stamp duty.
  - Added `ce_entry_price`, `pe_entry_price`, `ce_exit_price`, and `pe_exit_price` columns to `trades` table.

---

## [1.0.0] - 2026-10-30

### Initial Release
- Initial project import with React 19 frontend and Laravel 13 backend.
- Base tables created via migration `2026_10_30_120000_create_trading_system_tables.php` (`trading_accounts`, `trading_strategies`, `trades`, `trade_journals`, `capital_transactions`).
- Core dashboard, trade log, calendar, equity curve, risk management, and settings pages.
