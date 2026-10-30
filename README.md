# TradeJournal — Advanced Options Trading P&L Management System

A personal, high-performance web application designed for active Indian stock market options traders (NIFTY 50, BANK NIFTY, SENSEX, BANKEX, FINNIFTY, and Individual Equities).

TradeJournal tracks trades manually, calculates accurate net P&L with Indian regulatory charges (STT, Exchange turnover, GST, SEBI, Stamp duty), computes equity curves, enforces risk parameters, logs psychological reflections, and provides multi-factor analytics.

---

## 📸 Dashboard Reference

The user interface matches modern financial trading terminals (Zerodha Kite, TradingView) with native **Dark Mode** and **Light Mode** support.

- **Main Statistics Cards**: Total Net Profit, Total Gross Profit, Total Gross Loss, Today's P&L, This Month's P&L, Current Capital.
- **Secondary KPI Row**: Total Trading Days, Winning Days, Losing Days, Win Rate %, Avg Daily Profit, Avg Daily Loss, Maximum Drawdown, Profit Factor.
- **Visualizations**: Daily P&L bar chart, Cumulative Equity Curve, Monthly P&L, Index Performance Donut, CE vs PE Donut, Interactive Monthly Calendar Heatmap, Strategy Performance Table, Risk Management Gauges, Recent Trades.

---

## 🛠 Technology Stack

### Frontend
- **ReactJS** (Vite + React 19)
- **Tailwind CSS**
- **React Router v7**
- **Axios** with Bearer Token Interceptors
- **Recharts** (AreaChart, BarChart, PieChart, Donut, Custom Tooltips)
- **Lucide React** Icons

### Backend
- **Laravel 13** (PHP 8.5 compatible)
- **Laravel Sanctum** API Token Authentication
- **Service Layer Architecture** (`TradingCalculationService`, `TradingAnalyticsService`, `RiskManagementService`, `ExportService`)
- **Form Request Validation** (`StoreTradeRequest`, `UpdateTradeRequest`, `RegisterRequest`, `LoginRequest`)
- **Database Transactions & Soft Deletes**

### Database
- **MySQL** (with `decimal(15,2)` for financial fields, foreign keys, and indexes on `trade_date`, `index_name`, `net_pnl`, `strategy_name`)
- **SQLite** supported out-of-the-box for instant local development with zero external dependencies.

---

## 📂 Project Structure

```
option_journal/
├── backend/                     # Laravel 13 REST API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/ # Auth, Trade, Dashboard, Calendar, Risk, Journal, Strategy, Capital, Analytics, Export
│   │   │   └── Requests/        # Form Requests with strict financial validation
│   │   ├── Models/              # User, TradingAccount, Trade, TradeJournal, TradingStrategy, CapitalTransaction
│   │   └── Services/            # Core business calculations, drawdown formulas, charges estimation, analytics
│   ├── database/
│   │   ├── migrations/          # Normalized database schema with foreign keys and decimal(15,2)
│   │   └── seeders/             # DatabaseSeeder populated with realistic demo trading records
│   ├── routes/
│   │   └── api.php              # RESTful API endpoints protected by Sanctum
│   └── tests/                   # Automated PHPUnit tests for calculations, charges, win rates, and drawdowns
├── frontend/                    # React + Vite + Tailwind CSS Single Page Application
│   ├── src/
│   │   ├── api/                 # Axios HTTP client configuration
│   │   ├── components/          # Reusable UI cards, modals, layout, sidebar, navbar, mobile bottom nav
│   │   ├── context/             # AuthContext, ThemeContext (Dark/Light), FilterContext
│   │   ├── pages/               # Dashboard, AddTrade, AllTrades, TradingCalendar, EquityCurve, RiskManagement,
│   │   │                        # TradingJournal, StrategyAnalysis, AnalyticsReports, CapitalManagement, Settings, Login, Register
│   │   └── utils/               # Indian currency formatters (₹1,28,450), compact formatters, date formatters
│   └── vite.config.js           # Vite dev server with reverse proxy to Laravel backend
└── README.md
```

---

## 🚀 Quick Start & Installation

### Prerequisites
- **PHP >= 8.2** (Tested on PHP 8.5)
- **Composer**
- **Node.js >= 18** and **npm**
- **MySQL** or **SQLite** (SQLite is enabled by default for zero-friction setup)

### 1. Backend Setup

```bash
cd backend

# Install dependencies (already included in workspace)
composer install

# Environment configuration
cp .env.example .env
php artisan key:generate

# Set Timezone to Indian Standard Time
# (Already pre-configured: APP_TIMEZONE=Asia/Kolkata)

# Run migrations and seed demo data
php artisan migrate:fresh --seed

# Start backend server (Port 8000)
php artisan serve --host=127.0.0.1 --port=8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Build production bundle
npm run build

# Start frontend development server (Port 3000)
npm run dev -- --host 127.0.0.1 --port 3000
```

Open your browser at **`http://127.0.0.1:3000`**.

---

## 🔑 Demo Account Credentials

A fully populated demo account is pre-seeded with 28 realistic trading activities, matching the exact figures in the reference dashboard overview:

- **Email**: `trader@example.com`
- **Password**: `password`
- *(Or click the 1-click **"Explore Demo Account"** button on the Login page!)*

---

## 🧮 Important Business Logic & Formulas

1. **Net P&L**:
   $$\text{Net P\&L} = \text{Gross Profit} - \text{Gross Loss} - \text{Total Charges}$$
2. **Indian Option Charges Breakdown**:
   $$\text{Total Charges} = \text{Brokerage} + \text{STT} + \text{Exchange Charges} + \text{GST (18\%)} + \text{SEBI} + \text{Stamp Duty} + \text{Other}$$
3. **Current Capital**:
   $$\text{Current Capital} = \text{Initial Capital} + \text{Deposits} - \text{Withdrawals} + \sum \text{Net P\&L}$$
   *Deposits and withdrawals are isolated in a dedicated ledger so they do not artificially distort trading ROI or win rate.*
4. **Drawdown**:
   $$\text{Drawdown}_t = \max_{0 \le s \le t}(\text{Equity}_s) - \text{Equity}_t$$
   $$\text{Maximum Drawdown} = \max_{t}(\text{Drawdown}_t)$$
5. **Profit Factor**:
   $$\text{Profit Factor} = \frac{\sum \text{Gross Profits}}{\sum \text{Gross Losses}}$$
6. **Win Rate**:
   $$\text{Win Rate \%} = \frac{\text{Winning Trading Days}}{\text{Total Trading Days}} \times 100$$

---

## 🧪 Automated Testing

Automated tests cover mathematical accuracy, charge estimations, equity peak drawdown calculations, and Sanctum authentication:

```bash
cd backend
php artisan test
```

All 7 unit and feature tests pass with 34 assertions.

---

## 📱 Mobile Responsive Viewports

TradeJournal is fully responsive across all device sizes:
- **Mobile (375px to 430px)**: Automatic switch to mobile bottom navigation (`Dashboard`, `Add Trade`, `All Trades`, `Analytics`, `More`), 2-column KPI cards, vertically stacked charts, touch-friendly inputs.
- **Tablet (768px to 1023px)**: 3-column statistics cards, touch-optimized calendar, scrollable data tables.
- **Desktop (1024px to 1920px)**: Full sidebar navigation, 6-column statistics cards, side-by-side charts, full-width management tables.
