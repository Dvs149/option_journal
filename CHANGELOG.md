# CHANGELOG — TradeJournal

All notable changes, architectural milestones, and fixes for TradeJournal are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [1.24.0] - 2026-11-25

### Added & UI
- **Free Time Stories & Immersive Reader Module (`/stories`)**:
  - **Standalone Free Time Reading Hub**:
    - Built a dedicated, self-contained story management and reader module designed specifically for reading stories and literature during trading breaks and free time.
    - Completely decoupled from financial and trade logging tables for clean separation of concerns.
  - **Rich Image Embedding & Story Formatting**:
    - **Multi-Method Image Uploads**: Add images via device file upload button, drag-and-drop directly onto the editor, or instant clipboard image pasting (`Ctrl+V` / `Cmd+V`).
    - **Web Image Links**: Added modal popover to embed external image URLs with custom captions.
    - **Live Write & Preview Tabs**: Side-by-side or toggled Preview mode rendering real-time formatted typography, blockquotes, headings (`#`, `##`), scene breaks (`---`), and high-res image cards.
    - **Interactive Image Lightbox**: Clicking any image inside the story reader opens a high-resolution distraction-free lightbox with zoom and download capabilities.
    - **Card Thumbnail Previews**: Grid cards automatically extract and display the story's lead image as a polished book banner.
    - **Intelligent Paragraph Splitter Tool (`splitIntoShortParagraphs`)**:
      - Added dedicated `Split Paragraphs` toolbar button with `WrapText` icon in `StoryFormModal.jsx`.
      - Automatically decomposes massive walls of text into short, highly-readable paragraphs of 2 to 3 lines each (~20–32 words, ~140–200 characters) separated by clean `\n\n` double newlines.
      - **Zero Content Loss**: 100% preserves every word, punctuation mark, dialogue quote, markdown heading (`#`, `##`), blockquote (`>`), divider (`---`), and image (`![alt](url)`).
      - **Selection & Full Text Support**: Splits selected text if highlighted in the textarea, or formats the entire story content if no selection exists.
      - **Live Confirmation Toast**: Shows real-time badge in toolbar (`✓ Split X large paragraphs into Y short paragraphs (2-3 lines each)`) with automatic timeout.
  - **Full Story Lifecycle (CRUD)**:
    - **Add & Edit**: `StoryFormModal.jsx` supports title, author, category/genre, synopsis, rich long-form content, theme accent colors, tags, reading status, and favorites.
    - **View / Read**: `StoryReaderModal.jsx` provides a dedicated reader view with live reading progress tracking, automatic word count calculation, estimated reading time, and reading typography controls.
    - **Delete**: Protected by custom `ConfirmationModal.jsx` with soft-deletion support in database.
  - **Specialized Reader Mode for Very Long Stories**:
    - **Automatic Paragraph Reading Resume & Auto-Scroll**:
      - Remembers the exact paragraph where the reader stopped reading or closed the modal.
      - **Real-Time Viewport Paragraph Detection**: Dynamically tracks which narrative block, heading, or image the reader's gaze is on during scrolling.
      - **Dual Persistence**: Saves reading position immediately to client-side `localStorage` (`tj_story_pos_{id}`) and debounced to backend database via `PATCH /api/stories/{id}/progress` (`last_read_paragraph`).
      - **Smooth Auto-Scroll on Open (Once-Only Session Lock)**: Reopening any story in Reader mode automatically scrolls down smoothly to the exact paragraph once per open session. Isolated from subsequent background story updates or reading progress debounces to prevent recurring auto-scrolls or repeated resume banners while actively reading.
      - **Subtle Visual Feedback**: Shows a temporary glowing highlight on the resumed paragraph and a floating pill banner (`📍 Resumed at paragraph X`) with a 1-click `Top` shortcut to restart from the beginning.
      - **Paragraph Indicators & Mobile View Optimization**: Dedicated `flex-shrink-0` paragraph badge (`¶X`) in the Reader header next to the title so it is never pushed off or clipped by long author names or categories on mobile screens. Also added prominent paragraph numbers in Grid cards and List rows without requiring horizontal scroll.
    - **Scroll Progress Tracking**: Real-time reading progress bar pinned to the top of the reader (0% to 100%) with automatic progress persistence to database.
    - **Custom Typography**: Adjust font sizes (14px to 26px), line spacing (normal, relaxed, loose), and font styles (Book Serif, Clean Sans, Monospace).
    - **Reading Background Themes**: 4 specialized reading environments: Night Dark, Warm Sepia/Book Paper, Charcoal, and Clean Day Paper.
    - **Fullscreen Mode**: 1-click distraction-free reading canvas for extensive multi-chapter stories.
    - **Reading Status Updates**: Auto-updates last read timestamp, transitions from Unread to Reading, and 1-click Mark as Completed.
  - **Discovery, Filters & Organization**:
    - Grid card view and tabular list view toggles with automatic `localStorage` persistence (`tj_stories_view_mode`), ensuring the user's selected layout (Grid or List) is remembered across sessions.
    - **Responsive Mobile List View (Zero Horizontal Scroll)**: Replaced rigid 5-column desktop table on mobile screens (`< md`) with a native stacked mobile card row displaying Story Title, Category badge, Author, Words & Length, Status & Progress bar with percentage, and all Action buttons (`Read`, `Bookmark`, `Edit`, `Delete`) within the 100% viewport width. Seamlessly preserves the full 5-column table on desktop (`>= md`).
    - **Header Natural Scroll**: Removed `sticky top-0 z-20` positioning from the Free Time Stories header banner in `Stories.jsx`, ensuring it scrolls away naturally with the page instead of floating over list and grid content when scrolling.
    - Persisted per-page preferences (`tj_stories_per_page`) for seamless browsing.
    - Search across titles, authors, categories, and synopses.
    - Status tabs (`All`, `Unread`, `In Progress`, `Completed`, `Favorites`).
    - Smart sliding-window pagination using `getPaginationPages`.
    - Curated sample stories seeder (`The Archer and the Unshakable Target`, `The Whispering Ledger of Amsterdam`, `The Stargazer's Apprentice`).
  - **Backend API & Database Architecture**:
    - Added `stories` table with `LONGTEXT` content column, soft deletes, and user foreign key indexing (`2026_11_25_120000_create_stories_table.php`).
    - Implemented `Story` Eloquent model with automatic word count and reading time calculation boot hooks.
    - Implemented `StoryController.php` with 7 endpoints (`index`, `store`, `show`, `update`, `destroy`, `toggleFavorite`, `updateProgress`, `seedSamples`).
    - Registered module in `UserModuleVisibility.php`, `Sidebar.jsx`, and `ModuleContext.jsx`.
    - Added automated Feature test suite `StoryApiTest.php` with 100% pass rate.

## [1.23.0] - 2026-11-19

### Fixed & UI
- **Dynamic Sliding Window Pagination Across All Data Tables (`pagination.js`, `AllTrades.jsx`, `TradingCalendar.jsx`, `TradingJournal.jsx`)**:
  - **Resolved Missing/Non-Highlighted Active Pages**:
    - Fixed an issue where navigating past page 5 on datasets with 11+ pages (such as 104 trades at 10/page) failed to render or highlight active pages 6 through 10.
    - Previously, button generation in `AllTrades.jsx` was hardcoded to `Array.from({ length: Math.min(5, pagination.last_page) }, (_, i) => i + 1)`, freezing the visible buttons at `1, 2, 3, 4, 5 ... 11` regardless of the user's active page.
  - **Shared Sliding Window Utility (`frontend/src/utils/pagination.js`)**:
    - Created `getPaginationPages(currentPage, lastPage)` generating a window dynamically centered on the active page:
      - Pages 1 to 5: `1, 2, 3, 4, 5 ... 11`
      - Page 6: `1 ... 4, 5, 6, 7, 8 ... 11` (Page 6 active in center)
      - Page 9: `1 ... 7, 8, 9, 10, 11` (Page 9 active)
      - Page 11: `1 ... 7, 8, 9, 10, 11` (Page 11 active)
      - Total pages $\le 7$: renders all consecutive numbers (`1, 2, 3, 4, 5, 6, 7`) without ellipsis markers.
    - Eliminates duplicate ellipsis markers and orphaned single page jumps.
  - **Universal Deployment**:
    - Applied across `AllTrades.jsx`, `TradingCalendar.jsx` (daily trades list), and `TradingJournal.jsx`.
    - Preserved container minimum heights and pinned bottom alignment (`mt-auto`) to guarantee zero layout shifts during page switching.

## [1.22.0] - 2026-11-19

### Added & UI
- **Pagination for Daily Trades Table in Trading Calendar (`TradingCalendar.jsx`)**:
  - **Eliminated Long Scrolling Lists**:
    - Resolved table overflow where days with large execution volumes (e.g., 29 trades on 19 Nov 2026) stretched the calendar card endlessly down the page.
  - **Comprehensive Pagination Controls**:
    - **Results Summary**: Displays `Showing X to Y of Z trades` with monospace font metrics.
    - **Previous / Next Navigation**: Added `ChevronLeft` and `ChevronRight` buttons with disabled states at boundaries.
    - **Smart Numbered Pagination**: Generates page buttons (`1, 2, 3...`) with ellipsis handling for higher page counts.
    - **Per-Page Selector**: Dropdown to toggle between `10 / page`, `15 / page`, `25 / page`, and `50 / page` (defaults to 10).
    - **State Resets**: Automatically resets to page 1 upon switching days, months, years, or column sorting.
    - **Design Parity**: Matched exact layout, button tokens, and dark/light mode themes used in `AllTrades.jsx`.

## [1.21.0] - 2026-11-19

### Enhanced & UI
- **Custom Confirmation Modal for Zerodha Kite Disconnect (`ConfirmationModal.jsx`)**:
  - **Eliminated Native Browser `window.confirm`**:
    - Replaced the browser-native JavaScript confirm prompt (`divyeshs-macbook-pro.local:3000 says: Are you sure you want to disconnect Zerodha Kite Connect?`) with a dedicated, theme-aware custom modal component (`ConfirmationModal.jsx`).
  - **Component Features**:
    - **Backdrop & Transitions**: Full viewport overlay with `bg-black/75 backdrop-blur-sm`, smooth `animate-fadeIn` and `animate-scaleUp` transitions, and click-outside dismissal.
    - **Keyboard Accessibility**: Integrated `useEscapeKey` so hitting the `Escape` key closes the dialog safely.
    - **Account Context Badge**: Highlights active Zerodha account context inside the modal (Origami icon, user display name, client ID, e.g. `NQ2990`, and `Connected` badge).
    - **Theme Parity**: Complete dark mode (`bg-[#121b2d]`, `border-[#1e293b]`) and light mode (`light:bg-white`, `light:border-slate-200`) styling.
    - **Loading & Concurrency Protection**: Displays animated spinner (`Loader2`) and disables buttons while disconnect request is in-flight to prevent duplicate API dispatches.
  - **Unified Deployment**:
    - Integrated across both `/zerodha` (`Zerodha.jsx`) and `/settings?tab=Integrations` (`Settings.jsx`).

## [1.20.0] - 2026-11-19

### Fixed
- **Dashboard Global Filter Reflection & Query Parameter Conflict**:
  - **Spurious Date Override Resolved**:
    - Fixed an issue where `GET /dashboard` requests from `Dashboard.jsx` unconditionally included `from_date` and `to_date` (defaulting to the current month in `FilterContext`) even when a specific named filter such as `Today`, `Yesterday`, or `This Week` was selected.
    - Updated `TradingAnalyticsService::resolveDateRange` to only apply explicit `$fromDate` and `$toDate` parameters when the filter is specifically `'custom'` or empty/null. Named filters (`today`, `yesterday`, `this_week`, `this_month`, `last_month`, `this_year`, `all`) now strictly govern date resolution.
    - Updated `Dashboard.jsx::fetchDashboard` to send `from_date` and `to_date` query parameters only when `filter === 'custom'`.
  - **Single-Day Date Range Display Formatting**:
    - Updated `TradingAnalyticsService` date range payload formatter so single-day ranges (where `$startDate === $endDate`, such as `Today` or `Yesterday`) format cleanly as `19 Nov 2026` instead of `19 Nov 2026 - 19 Nov 2026`.
    - Resolved header badge display overwrite so selecting `Today` immediately renders `19 Nov 2026` rather than reverting to the full month `01 Nov 2026 - 30 Nov 2026`.

### Enhanced
- **Dynamic Period-Aware Dashboard KPI Card Titles**:
  - Added dynamic `periodTitlePrefix` in `Dashboard.jsx` so top metric cards adapt their title to the active filter:
    - `Today`: `Today's Net Profit` / `Today's Net Loss`, `Today's Gross Profit`, `Today's Gross Loss`.
    - `Yesterday`: `Yesterday's Net Profit` / `Yesterday's Net Loss`, `Yesterday's Gross Profit`, `Yesterday's Gross Loss`.
    - `This Week`: `This Week's Net Profit`, `This Week's Gross Profit`, `This Week's Gross Loss`.
    - `This Month` / `Last Month` / `This Year`: `This Month's Net Profit`, etc.
    - `All Time`: `Total Net Profit`, `Total Gross Profit`, `Total Gross Loss`.
    - `Custom`: `Period Net Profit`, `Period Gross Profit`, `Period Gross Loss`.
  - Secondary metrics (Total Trading Days, Winning Days, Losing Days, Win Rate) and charts (Daily P&L, Cumulative P&L, Index-wise Performance, CE vs PE) now accurately compute exclusively for the selected timeframe.

### Tests
- Added unit test `test_resolve_date_range_does_not_override_named_filter_with_spurious_dates` in `FinancialCalculationTest.php` to safeguard against parameter overriding regressions.

## [1.19.0] - 2026-11-19

### Security & Hardening
- **Zero Hardcoded Secrets & GitHub Repository Security Audit**:
  - **Purged Hardcoded Credentials Across Codebase**:
    - Removed all hardcoded Zerodha Kite API keys (``, ``) and API secrets (``) from source code files (`ZerodhaKiteService.php`, `Settings.jsx`, `Zerodha.jsx`).
    - Standardized credential loading exclusively through secure environment variables (`.env`, `config('services.zerodha.*')`) or encrypted user integration records stored in the database.
  - **Graceful Unconfigured Fallbacks**:
    - Updated 1-Click Kite Login buttons in `Zerodha.jsx` and `Settings.jsx` to intercept clicks when no API key is set, prompting the user with an informative modal and toast (`Please configure your Zerodha Kite API Key first.`) rather than linking with a hardcoded fallback key.
    - Updated backend `ZerodhaKiteService::getStatus` and `exchangeAndSaveToken` to generate `login_url` only when an active API key is present.
  - **Environment Configuration Templates**:
    - Updated `backend/.env.example` to document `ZERODHA_API_KEY` and `ZERODHA_API_SECRET` with clean, blank placeholder templates.
    - Verified that all `.env` files and `frontend/dist` remain strictly gitignored.
    - Recompiled frontend production assets (`dist/`) to ensure no compiled bundles contain secret keys.

## [1.18.0] - 2026-11-19

### Enhanced
- **All Trades Top KPI Cards Red/Green Dynamic Color Coding (Zerodha Parity)**:
  - **Dynamic Profit/Loss Color Palette**:
    - **Net P&L**: Configured the primary value to render in emerald green (`text-emerald-400`) with a `+` prefix when profitable (e.g. `+₹5,331`), and in rose red (`text-rose-400`) with a `-` sign when losing (e.g. `-₹21,417`).
    - **Dynamic Icon Container**: The top-right Indian Rupee badge dynamically switches between emerald green (`bg-emerald-500/10 text-emerald-400`) on profit and rose red (`bg-rose-500/10 text-rose-400`) on loss, matching Zerodha's top metric cards.
    - **Gross Profit**: Configured to display in emerald green (`text-emerald-400`) with a `+` prefix (e.g. `+₹5,754` or `+₹18,102`) with an emerald icon container whenever gross earnings are greater than 0.
    - **Gross Loss**: Configured to display in rose red (`text-rose-400`) with a `-` prefix (e.g. `-₹35,976`) with a rose icon container whenever gross losses are greater than 0.
    - **Zero / Neutral State**: Displays neutral slate/white when values are zero or no trades exist.
  - **Trade Details Drawer Consistency**:
    - Updated the Financial Summary box inside the trade details drawer to prefix positive Gross Profit with `+` and active Gross Loss with `-` for visual consistency across views.

### Added & Enhanced
- **Interactive Capital Management Timeframe & Growth Chart Filtering**:
  - **Dynamic Timeframe Buttons (`1M`, `3M`, `6M`, `YTD`, `1Y`, `All`)**:
    - Connected quick timeframe pill buttons in `CapitalManagement.jsx` to dynamically compute date ranges and query backend with parameters (`filter`, `from_date`, `to_date`).
    - Synchronized the calendar date badge (e.g., `01 Nov 2026 – 30 Nov 2026`) to instantly update on timeframe click.
    - Updated Capital Growth card badge to dynamically show the active period name (`1 Month`, `3 Months`, `6 Months`, `YTD`, `1 Year`, `All Time`) instead of hardcoded `This Year`.
  - **Dynamic AreaChart Scaling & Clean Date Formatting**:
    - Filtered Capital Growth area chart exclusively to the selected period, eliminating historical years clutter.
    - Added opening balance anchor point at period start to visualize true capital growth progression across the timeframe.
    - Standardized X-axis to clean formatted dates (`displayDate`: e.g. `01 Nov`, `18 Nov`) instead of raw unformatted timestamps (`2022-11-20 00:00:00`).
    - Replaced hardcoded Y-axis domain (`[0, 400000]`) with dynamic bounds (`dataMin - 10000`, `dataMax + 10000`) and Indian Rupee compact format (`₹4.3L`, `₹5.2L`).
    - Enhanced tooltip to display formatted date, total capital balance, and individual day P&L.
  - **Period-Specific KPI Cards & Profit/Loss Styling**:
    - Updated top cards (`1M Profit`, `1M Deposits`, `1M Withdrawals`, `1M ROI`) to reflect the active period when filtered, with lifetime totals displayed when `All` is selected.
    - Fixed card color styling: losses now render in rose red (`text-rose-400` with `TrendingDown`) and profits in emerald green (`text-emerald-400` with `TrendingUp`).
  - **Backend Analytics & Capital API (`CapitalController.php` & `TradingAnalyticsService.php`)**:
    - Enhanced `TradingAnalyticsService::resolveDateRange` to support `7d`, `1m`, `3m`, `6m`, `ytd`, `1y` and explicit `from_date` / `to_date`.
    - Extended `GET /api/capital` to accept `filter`, `time_range`, `from_date`, and `to_date`, returning both period metrics and lifetime account metrics.
    - Added automated PHPUnit test suite in `backend/tests/Feature/CapitalApiTest.php` verifying timeframe filtering, opening capital calculations, and period metrics.

- **Chronological Ascending Order for Trade Imports & Synchronization**:
  - **First-Created-First-Imported Execution Order**:
    - Sorted orders in strict ascending chronological order by execution timestamp in `ZerodhaKiteService::syncTodayOrdersToJournal` and `ZerodhaKiteService::importOrdersToJournal`.
    - Sorted incoming orders ascending in `OrderScreenshotParserService::parseScreenshotAndBuildTrades` before grouping and pairing.
    - Ensured selected orders in `ZerodhaOrderImportModal.jsx` and `ImageOrderImportModal.jsx` are sorted ascending before API submission.
    - Added automated test in `TradeApiTest.php` (`test_sync_and_import_orders_in_ascending_creation_order`).

- **Zerodha Virtual Contract Note Parity for BSE / BFO Contracts**:
  - Sourced exact BSE / BFO exchange transaction charge rate (`0.0325%`) vs. NSE (`0.05%`), resolving contract note discrepancy on SENSEX options.
  - Implemented exact per-order integer-rounded stamp duty accumulation matching Zerodha Kite's official calculation engine.

- **Cascading Deletion of Associated Orders**:
  - Configured `Trade` model boot hooks (`deleting`) and `TradeController::destroy` to cascade-delete related `trade_orders` upon trade deletion.
  - Allows orders previously imported from Zerodha to be cleanly re-synchronized if a trade is deleted.

- **Table Height & Pagination Stabilization**:
  - Set consistent minimum container heights on table cards in `AllTrades.jsx` and `TradingJournal.jsx`.
  - Pinned pagination controls to the bottom with `mt-auto`, preventing vertical layout shifts between pages with 1 trade versus 10 trades.

- **Strategy Builder & Option Chain Integration**:
  - Integrated option chain modal directly into `StrategyBuilder.jsx` for selecting strikes and building strategy payoff curves and portfolio drafts.

---

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
