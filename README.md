# TradeJournal — Advanced Options Trading & Pine Script Management System

A high-performance, full-stack financial web application designed for active Indian stock market options traders (NIFTY 50, BANK NIFTY, SENSEX, BANKEX, FINNIFTY, and Individual Equities).

TradeJournal provides an end-to-end trading operating system: manual trade logging, automatic multi-leg options P&L and Indian regulatory charge calculations, equity curves, automated risk controls, psychological journaling, multi-timeframe analytics, customizable dropdown managers, and a dedicated **Pine Script Manager** for TradingView indicators, strategies, and webhook alerts.

---

## 📸 Key Modules & Dashboard Features

The user interface matches modern financial trading terminals (Zerodha Kite, TradingView) with native **Dark Mode** and **Light Mode** support.

- **Dashboard Overview**:
  - **Main KPI Cards**: Total Net Profit, Total Gross Profit, Total Gross Loss, Today's P&L, This Month's P&L, Current Capital.
  - **Secondary Statistics**: Total Trading Days, Winning Days, Losing Days, Win Rate %, Avg Daily Profit, Avg Daily Loss, Maximum Drawdown, Profit Factor.
  - **Visualizations**: Daily P&L bar charts, Cumulative Equity Curve, Monthly P&L breakdown, Index Performance Donut, CE vs PE Donut, Interactive Calendar Heatmap, Strategy Performance Table, Risk Management Gauges, Recent Trades.
- **Add & Edit Trade**:
  - Record trades with option leg details, CE/PE entry/exit prices, strike prices, lot sizes, and automatic charge breakdown.
  - Multi-screenshot attachment for technical charts and setup proof.
- **All Trades Explorer**:
  - Searchable, sortable, and filterable trade table with multi-select bulk operations.
  - **Interactive Date Range Filter**: Popover picker with quick presets (*Today, Yesterday, This Week, This Month, Last Month, This Year, All Time*) and Custom Date Range picker.
  - **Comprehensive Export Modal**: Trade-by-trade, Daily, Monthly, and Yearly P&L aggregation in Excel (`.xlsx`), CSV, and PDF report formats with custom column selection.
  - **Trade Details Side Drawer**: Quick tabbed preview (*Details*, *Charges*, *Journal*) with header action icons (Edit, Delete, Close).
- **Pine Script Manager**:
  - Dedicated module to manage, store, categorize, and deploy TradingView indicators, options strategies, and webhook alerts.
  - **Interactive Code Inspector**: Monospace dark editor theme, line numbers, word wrap, character count, and fullscreen expansion.
  - **One-Click Quick Copy**: Instant clipboard copy with visual notification.
  - **Download `.pine` File**: Direct file download for local archiving.
  - **TradingView Webhook Alert Setup**: Formatted JSON alert payloads for automated order execution bridges (Zerodha, Dhan, Fyers, OpenAlgo, Tradetron).
  - One-click script cloning/duplication, JSON export/import backup, and favorite bookmarking.
- **Dropdown Manager**:
  - Dynamic module-wise dropdown option control for Indices, Trading Types, Option Types, Strategies, and Date Periods.
  - Activate, deactivate, add custom options, or reset to system defaults.
- **Trading Calendar & Heatmap**:
  - Interactive calendar displaying daily P&L color-coded by win/loss and daily trade summaries.
- **Equity Curve & Capital Management**:
  - Cumulative equity curve, high-water mark, peak-to-trough drawdown calculation, and capital deposit/withdrawal tracking.
- **Risk Management**:
  - Set daily max loss limits, daily profit targets, monthly drawdown guardrails, and risk parameter alerts.
- **Settings & Dynamic Module Visibility**:
  - Customize which modules appear in navigation, toggle dark/light themes, configure broker fee presets, and manage profile security.

---

## 🛠 Technology Stack

### Frontend
- **ReactJS** (Vite + React 19)
- **Tailwind CSS** (v4 with full dark/light theme tokens)
- **React Router v7**
- **Axios** with automatic Bearer Token interceptors
- **Recharts** (AreaChart, BarChart, PieChart, Donut, Custom Tooltips)
- **Lucide React** (Modern, clean icon set)
- **SheetJS (XLSX)** for client-side spreadsheet generation

### Backend
- **Laravel 11 / 12** (PHP 8.2+ and PHP 8.5 compatible)
- **Laravel Sanctum** (Stateful API token authentication)
- **Service Layer Architecture**:
  - `TradingCalculationService`: Accurate P&L and Indian regulatory charges (STT, Exchange, GST, SEBI, Stamp duty).
  - `TradingAnalyticsService`: Equity curves, streaks, win rates, drawdowns, and date range resolution.
  - `RiskManagementService`: Threshold enforcement, drawdown alerts, and parameter monitoring.
  - `ExportService`: Data aggregation and PDF/Excel generation.
- **Form Request Validation** (`StoreTradeRequest`, `UpdateTradeRequest`, `RegisterRequest`, `LoginRequest`)
- **Database Transactions & Soft Deletes**

### Database
- **MySQL / SQLite** (Strict `decimal(15,2)` for financial fields, foreign keys, and indexes on `trade_date`, `user_id`, `index_name`, `net_pnl`, `strategy_name`).

---

## 📂 Project Structure

```
option_journal/
├── backend/                              # Laravel REST API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/          # Auth, Trade, PineScript, Dashboard, Calendar,
│   │   │   │                             # Risk, Journal, Strategy, Capital, Analytics,
│   │   │   │                             # DropdownOption, BrokerageSetting, Export
│   │   │   └── Requests/                 # Strict financial form requests
│   │   ├── Models/                       # Trade, PineScript, DropdownOption, BrokerageSetting,
│   │   │                                 # User, TradingAccount, TradeScreenshot, CapitalTransaction
│   │   └── Services/                     # Calculations, Drawdown, Analytics, Export
│   ├── database/
│   │   ├── migrations/                   # Database schema migrations
│   │   └── seeders/                      # DatabaseSeeder with realistic trading records
│   ├── resources/views/reports/          # Blade templates for DomPDF report exports
│   └── routes/
│       └── api.php                       # Authenticated REST API endpoints
├── frontend/                             # React + Vite Single Page Application
│   ├── src/
│   │   ├── api/                          # Axios API client configuration
│   │   ├── components/
│   │   │   ├── common/                   # StatsCard, ErrorBoundary, Lightbox
│   │   │   ├── layout/                   # AppLayout, Sidebar, Navbar
│   │   │   └── trades/                   # ExportModal, BulkImportModal, EditTradeModal
│   │   ├── context/                      # AuthContext, ThemeContext, FilterContext,
│   │   │                                 # ModuleContext, DropdownContext, ToastContext
│   │   ├── pages/                        # Dashboard, AddTrade, AllTrades, TradingCalendar,
│   │   │                                 # EquityCurve, RiskManagement, TradingJournal,
│   │   │                                 # StrategyAnalysis, AnalyticsReports, CapitalManagement,
│   │   │                                 # PineScriptManager, DropdownManager, Settings, Login
│   │   └── utils/                        # Currency formatters (₹), date helpers, P&L colors
│   └── vite.config.js                    # Vite dev server with reverse proxy
└── README.md
```

---

## 🚀 Quick Start & Installation

### Prerequisites
- **PHP >= 8.2**
- **Composer**
- **Node.js >= 18** and **npm**
- **MySQL** (or SQLite)

### 1. Backend Setup

```bash
cd backend

# Install PHP dependencies
composer install

# Environment configuration
cp .env.example .env
php artisan key:generate

# Run database migrations
php artisan migrate

# Start Laravel backend server (Port 8000)
php artisan serve --host=127.0.0.1 --port=8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Build production bundle
npm run build

# Start Vite development server (Port 3000, accessible on your Wi-Fi network)
npm run dev
```

On the Mac running the project, find its Wi-Fi IP with `ipconfig getifaddr en0`. From another device on the same Wi-Fi network, open **`http://<MAC-IP>:3000`** (for example, `http://192.168.1.5:3000`). Keep both the Laravel server on port 8000 and Vite on port 3000 running on the Mac. API requests are proxied through Vite, so other devices do not need direct access to port 8000. If macOS Firewall prompts you, allow incoming connections for the development server.

### Keep the servers running after closing VS Code (macOS)

From the project root, install per-user `launchd` services:

```bash
python3 scripts/macos/background_services.py install
```

The services run independently of VS Code, restart if they stop, and start automatically the next time you log in to your Mac. You can lock the screen; the added `caffeinate` service prevents idle system sleep while you are logged in. Closing the laptop lid, manually putting the Mac to sleep, logging out, or losing Wi-Fi will make it unreachable. To stop and remove the background services:

```bash
python3 scripts/macos/background_services.py uninstall
```

Logs are written to `~/Library/Logs/OptionJournal/`.

---

## 🔑 Demo Account Credentials

A pre-configured demo account is available:

- **Email**: `trader@example.com`
- **Password**: `password`
- *(Or click the 1-click **"Explore Demo Account"** button on the Login page!)*

---

## 🧮 Business Logic & Mathematical Formulas

1. **Net P&L**:
   $$\text{Net P\&L} = \text{Gross Profit} - \text{Gross Loss} - \text{Total Charges}$$

2. **Indian Regulatory Options Charges Breakdown**:
   $$\text{Total Charges} = \text{Brokerage} + \text{STT} + \text{Exchange Turnover Charges} + \text{GST (18\%)} + \text{SEBI} + \text{Stamp Duty}$$
   - **Brokerage**: Standard flat rate (e.g. ₹20 per executed order).
   - **STT (Securities Transaction Tax)**: 0.125% on option sell premium value.
   - **Exchange Charges**: 0.05% on premium turnover (NSE/BSE).
   - **GST**: 18% levied on (Brokerage + Exchange Charges + SEBI Charges).
   - **SEBI Turnover Fee**: ₹10 per crore of turnover.
   - **Stamp Duty**: 0.003% on option buy turnover.

3. **Current Capital**:
   $$\text{Current Capital} = \text{Initial Capital} + \text{Deposits} - \text{Withdrawals} + \sum \text{Net P\&L}$$

4. **Drawdown & High-Water Mark**:
   $$\text{Peak Capital}_t = \max_{0 \le s \le t}(\text{Equity}_s)$$
   $$\text{Drawdown}_t = \text{Peak Capital}_t - \text{Equity}_t$$
   $$\text{Max Drawdown \%} = \frac{\max_t(\text{Drawdown}_t)}{\text{Peak Capital}} \times 100$$

5. **Profit Factor**:
   $$\text{Profit Factor} = \frac{\sum \text{Gross Profits}}{\sum \text{Gross Losses}}$$

6. **Win Rate**:
   $$\text{Win Rate \%} = \frac{\text{Winning Trading Days}}{\text{Total Trading Days}} \times 100$$

---

## 📡 API Endpoint Overview

All routes except authentication are protected via Laravel Sanctum (`auth:sanctum`):

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/login` | Authenticate user via username, email, or display name & issue Sanctum bearer token |
| `POST` | `/api/register` | Register new trader account |
| `GET` | `/api/dashboard` | Fetch dashboard KPIs, chart series, and daily P&L |
| `GET` | `/api/trades` | List trades with pagination, search, sorting & filtering |
| `POST` | `/api/trades` | Create new trade with auto-calculated charges |
| `PUT` | `/api/trades/{id}` | Update existing trade record |
| `DELETE` | `/api/trades/{id}` | Delete trade record |
| `POST` | `/api/trades/bulk-delete` | Batch delete selected trade records |
| `POST` | `/api/trades/bulk-import` | Bulk import trades from CSV |
| `GET` | `/api/pine-scripts` | List Pine Scripts with filters, search, and stats |
| `POST` | `/api/pine-scripts` | Create new Pine Script |
| `PUT` | `/api/pine-scripts/{id}` | Update existing Pine Script |
| `DELETE` | `/api/pine-scripts/{id}` | Delete Pine Script |
| `POST` | `/api/pine-scripts/{id}/duplicate` | Clone script with "Copy of ..." |
| `POST` | `/api/pine-scripts/{id}/favorite` | Toggle starred favorite status |
| `GET` | `/api/pine-scripts/export-json` | Export Pine Script library as JSON |
| `POST` | `/api/pine-scripts/import-json` | Import Pine Script library from JSON |
| `GET` | `/api/dropdown-options` | Fetch active and inactive module dropdown options |
| `POST` | `/api/dropdown-options` | Create custom dropdown option |
| `PUT` | `/api/dropdown-options/{id}/status` | Activate/deactivate dropdown option |
| `GET` | `/api/module-visibility` | Fetch user-specific visible/hidden modules |
| `POST` | `/api/module-visibility` | Toggle individual module visibility |
| `GET` | `/api/export/excel` | Export filtered trades as Excel (`.xlsx`) |
| `GET` | `/api/export/csv` | Export filtered trades as CSV |
| `GET` | `/api/export/pdf` | Generate comprehensive PDF trading report |

---

## 🧪 Testing

Run backend automated tests:

```bash
cd backend
php artisan test
```

Build and test frontend production assets:

```bash
cd frontend
npm run build
```

---

## 📄 License

Open-source under the [MIT License](LICENSE).
