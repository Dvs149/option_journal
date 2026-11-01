# CHANGELOG — TradeJournal

All notable changes, architectural milestones, and fixes for TradeJournal are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

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
