# CHANGELOG — TradeJournal

All notable changes, architectural milestones, and fixes for TradeJournal are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.11.3] - 2026-11-01

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
- Initial project import with React 19 frontend and Laravel 12 backend.
- Base tables created via migration `2026_10_30_120000_create_trading_system_tables.php` (`trading_accounts`, `trading_strategies`, `trades`, `trade_journals`, `capital_transactions`).
- Core dashboard, trade log, calendar, equity curve, risk management, and settings pages.
