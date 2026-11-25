# PROJECT CONTEXT — TradeJournal

## 1. Executive Summary

**TradeJournal** is a specialized, production-ready, full-stack financial trading journal and analytics system designed specifically for active Indian stock market derivatives (Futures & Options) traders. 

The application is tailored for traders executing intraday, BTST (Buy Today Sell Tomorrow), and positional option strategies on major Indian indices (**NIFTY 50**, **BANK NIFTY**, **FINNIFTY**, **SENSEX**, **BANKEX**, **MIDCPNIFTY**) and stock options.

The system addresses the core needs of active option traders:
- Eliminating manual spreadsheet errors in trade logging.
- Automatically calculating accurate Indian statutory charges (STT, Exchange Turnover Fees, GST, SEBI Turnover Fees, Stamp Duty, and Brokerage) based on real contract turnover.
- Enforcing risk management parameters (Daily Maximum Loss, Daily Profit Targets, Monthly Drawdown Limits).
- Tracking psychological trade reflections, setup criteria, emotional state, and discipline checklists.
- Managing TradingView Pine Script indicators, strategies, and automated webhook alert JSON payloads.
- Permitting customization of indices, lot sizes, regulatory schedules, and navigation modules.

---

## 2. Target Audience & Market Domain

- **Target Users**: Retail and proprietary Indian options buyers and sellers.
- **Underlying Instruments**: Indian Index Options (NSE & BSE) and Stock Options.
- **Brokers Supported**: Zerodha (native trade log parser), Dhan, Fyers, Angel One, Groww, Kotak Neo, and custom brokers.
- **Base Currency**: Indian Rupee (`INR` / `₹`) with Lakh (`L`) and Crore (`Cr`) formatting.
- **Regulatory Framework**: Securities and Exchange Board of India (SEBI), NSE & BSE transaction fee schedules, Finance Act STT rates.
- **Timezone**: Indian Standard Time (`IST` / `Asia/Kolkata`, UTC+5:30).

---

## 3. Technology Stack & Operational Environment

| Layer | Technology | Version | Key Libraries / Frameworks |
|---|---|---|---|
| **Frontend** | React SPA | 19.0.0 | Vite 6.2+, Tailwind CSS 4.0, React Router v7.3, Lucide React, Recharts 2.15, SheetJS (XLSX), date-fns |
| **Backend** | PHP / Laravel | Laravel 13.x / PHP 8.3+ | Laravel Sanctum 4.0, Barryvdh Laravel DomPDF 3.1, Laravel Tinker |
| **Database** | MySQL | 8.0+ | Relational schema with Foreign Keys, Soft Deletes, Index optimizations |
| **Auth** | Stateful / Token-based | Sanctum | Bearer Token, Dual Username/Email authentication |
| **File Storage** | Local Public Disk | Storage Driver | Stored in `storage/app/public/screenshots`, linked via `public/storage` |

### Default Ports & Development Servers
- **Frontend Vite Dev Server**: `http://localhost:3000/` (or `http://127.0.0.1:3000/`)
- **Backend Laravel API Server**: `http://localhost:8000/` (or `http://127.0.0.1:8000/`)
- **Database Engine**: `127.0.0.1:3306` (`option_journal` database)

---

## 4. Key Functional Subsystems

1. **Trade Logging & Execution**:
   - Single-leg (CE / PE) and Multi-leg (Both / Straddle / Strangle) trade recording with separate CE and PE entry/exit price tracking and live option chain integration.
   - Position tracking: Open positions, partial exit scaling (with dual CE & PE exit fields for straddles), and round-trip closed trades.
   - Multi-order executions breakdown: itemizes all individual BUY/SELL orders with execution time, price, quantity, individual charges, and order-level realized P&L.
   - Dynamic lot sizing with up/down stepper arrows incrementing by index lot size.
   - Real-time gross P&L and net P&L calculation after taxes and brokerage, with dynamic Zerodha-parity red/green styling (+/- prefixes and icon state transitions) on top KPI cards across All Trades, and live query-level KPI card synchronization on every order execution, edit, delete, or partial exit.
   - Global Dashboard filter synchronization: seamless timeframe filtering across `Today`, `Yesterday`, `This Week`, `This Month`, `Last Month`, `This Year`, `All Time`, and `Custom Range` with dynamic period card titles (`Today's Net Profit`, etc.) and single-day date formatting.
   - Dynamic sliding window pagination utility (`pagination.js`) deployed across All Trades, Trading Calendar, and Trading Journal, ensuring active pages are always visible and highlighted regardless of total page count.
2. **Indian Regulatory Charges Calculator**:
   - Brokerage: Flat ₹20 per executed order (or customizable per user).
   - STT: 0.15000% on sell-side option premium turnover.
   - Exchange Transaction Charges: 0.03553% (NSE) or 0.03250% (BSE) on total premium turnover.
   - SEBI Turnover Charges: ₹10 per crore of premium turnover + GST.
   - GST: 18% on (Brokerage + Exchange Charges + SEBI Charges).
   - Stamp Duty: 0.003% on buy-side option premium turnover.
3. **Trading Calendar & Heatmap**:
   - Color-coded monthly view of winning days (green) and losing days (red).
   - Dynamic realized P&L attribution: places multi-day/BTST trades on their exit/square-off date, and partial orders on the latest order executed date.
   - Indian Stock Market (NSE & BSE) Trading Holidays: official exchange schedule marked across all calendar components (main Trading Calendar and Dashboard mini calendar) with amber cells, `🇮🇳 Holiday` signs/badges, holiday names, and market closed tooltips/banners.
   - Automatic next working day calculation skipping both weekends and market holidays.
   - Daily trade volume count and net profit/loss aggregated per calendar day with itemized trades breakdown (15-column format unified with All Trades, including expandable inline executions and order action dialogs), multi-day exit indicators, and pagination controls (`10, 15, 25, 50 / page`).
4. **Risk Management & Guardrails**:
   - Daily maximum allowable loss and daily profit target tracking with live violation alerts.
   - Monthly drawdown monitoring.
5. **Psychological Journaling**:
   - Trade setup documentation, entry/exit rationale, what went right, what went wrong.
   - Star rating (1-5), emotional mood tracking (Happy, Neutral, Sad), and custom tags.
   - Four-tab drawer: Trade Details, Journal Notes, Multi-screenshot Lightbox, and Lessons Learned.
6. **Capital & Equity Management**:
   - Starting capital, deposit/withdrawal transaction ledger, cumulative equity curve, high-water mark, peak-to-trough drawdown %.
   - Interactive timeframe filtering (`1M`, `3M`, `6M`, `YTD`, `1Y`, `All`) and custom date ranges.
   - Dynamic AreaChart bounded to the active period with opening balance anchoring, dynamic Y-axis bounds, and clean date formatting (`displayDate`).
   - Period-specific KPI cards (Period Profit, Period Deposits, Period Withdrawals, Period ROI) with profit/loss color indications.
7. **Pine Script Manager**:
   - Repository for TradingView indicators, options strategies, libraries, and webhook alerts.
   - Syntax-highlighted dark inspector, line counts, word wrap, fullscreen modal, one-click copy, `.pine` download, JSON backup/restore.
8. **Dynamic System Customization**:
   - Module visibility manager (toggle visibility of any navigation link).
   - Dropdown options manager (activate/deactivate or add custom indices, strategies, order types).
   - Dynamic lot sizes per index.
   - Multi-theme engine (Zerodha Kite platform theme, Midnight Dark, Light, and System preference) persisted in LocalStorage.
9. **Zerodha Kite Connect Integration**:
   - Dedicated `/zerodha` module providing strictly read-only visibility into available/utilized funds, real-time net/day positions, executed orders, and equity holdings.
   - Zero order placement/execution capability for 100% account and fund safety.
   - Live authentication with 1-Click Kite Login (`https://kite.zerodha.com/connect/login?v=3&api_key=...`) and automated callback exchange; zero dummy data on live accounts.
   - 1-Click Auto-Sync today's executed orders in strict ascending creation order (`first-created first-added`).
   - Built-in interactive order review modal (`ZerodhaOrderImportModal.jsx`) with checkbox selection, Smart Match auto-pairing into closed trades, Both (straddle) leg consolidation, and turnover tracking matching screenshot import.
   - Exact Zerodha Virtual Contract Note parity for NSE and BSE/BFO contracts (0.0325% transaction fee, per-order integer-rounded stamp duty).
   - Instant sandbox/demo simulation mode for testing without a paid Kite subscription.
   - Settings -> Integrations tab for credentials management and live connection status.
   - Zero hardcoded credentials: all API keys and secrets load strictly via user database settings or gitignored `.env` environment variables.
   - Custom in-app confirmation modal (`ConfirmationModal.jsx`) for disconnecting broker sessions, replacing unstyled native browser `window.confirm()` prompts.
10. **Strategy Builder**:
   - Multi-leg options payoff builder with live option chain strike selection, break-even analysis, max profit/loss calculations, and draft portfolio saving.
11. **Free Time Stories & Immersive Reader**:
   - Completely standalone reading module for reading stories, literature, philosophy, and reflections during trading breaks and free time.
   - Full story CRUD with title, author, category, synopsis, cover color, tags, reading status, and favorites.
   - Rich Story Editor with multi-channel image embedding: upload button, drag & drop, clipboard image pasting (`Ctrl+V`), external image links, formatting shortcuts, and live Write/Preview tabs.
   - Built for very long stories: `LONGTEXT` database column, live reading progress percentage, auto-word counting, estimated reading time, reading typography controls (font size, line spacing, font family), 4 eye-friendly background themes (Night, Sepia Book Paper, Charcoal, Clean Paper Day), high-res image lightbox, and distraction-free fullscreen mode.
   - Curated sample stories seeder and smart sliding-window pagination.

---

## 5. System Constraints & Assumptions

- User access is single-tenant per account: each user's trades, accounts, strategies, scripts, and settings are strictly partitioned by `user_id`.
- Soft deletion is enabled on `trades` table to preserve historical audits.
- Screenshots are stored on the local public disk and resolved through client-aware URL parsers.

---

## 6. Developer Tooling & Codebase Knowledge Graph (Graphify)

- **Knowledge Graph Tooling**: Graphify (`graphifyy`) integrated at repository root.
- **Output Artifacts**:
  - `graphify-out/graph.json`: Machine-navigable AST graph (785 nodes, 1025 edges, 97 communities).
  - `graphify-out/graph.html`: Interactive D3 visual graph of project structure and dependencies.
  - `graphify-out/GRAPH_REPORT.md`: Comprehensive textual report with god nodes, community hubs, and surprising connections.
- **Repository Configuration**:
  - `.graphifyignore`: Excludes `backend/vendor/`, `node_modules/`, `dist/`, `build/`, `.env`, and local database files.
  - `.agents/rules/graphify.md`: Antigravity rule instructing the AI assistant to query the graph before answering architectural questions.
  - `.agents/workflows/graphify.md`: Antigravity workflow for building and refreshing the graph.
  - `.git/hooks/post-commit` & `post-checkout`: Git hooks that trigger AST updates on code commits without LLM cost.
