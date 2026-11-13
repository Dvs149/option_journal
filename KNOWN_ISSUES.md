# KNOWN ISSUES & TECHNICAL DEBT — TradeJournal

This document records verified operational observations, technical debt, and known edge-case constraints in the TradeJournal codebase.

---

## 1. Verified Technical Debt & Performance Observations

### 1.1 Large Frontend Bundle Size Warning
- **Severity**: Low (Performance optimization)
- **Component**: Vite Production Build (`frontend/src/`)
- **Observed Behavior**: `npm run build` outputs a warning:
  `(!) Some chunks are larger than 500 kB after minification (index-*.js: 1,969 kB | gzip: 504 kB)`.
- **Root Cause**: The main bundle bundles all 14 pages along with heavy third-party dependencies:
  - `recharts` (~450 kB)
  - `xlsx` (SheetJS ~350 kB)
  - `lucide-react` (~250 kB)
- **Recommended Remedy**: Implement route-level code splitting using `React.lazy()` and `Suspense` in `App.jsx`, and configure `build.rollupOptions.output.manualChunks` in `vite.config.js`.

### 1.2 Storage Symlink for Public Image Access
- **Severity**: Medium (Configuration)
- **Component**: Laravel File Storage (`backend/storage/app/public/screenshots`)
- **Observed Behavior**: Newly cloned environments or remote deployments may fail to display uploaded trade chart screenshots with a 404 error if the symbolic link is missing.
- **Root Cause**: Laravel saves uploaded screenshots to `storage/app/public/screenshots/`, which requires `public/storage` symlink to be web-accessible.
- **Workaround / Fix**: Run `php artisan storage:link` on fresh installations.

### 1.3 Localhost Port Sandbox Isolation
- **Severity**: Low (Development environment)
- **Component**: IDE Agent Terminal Sandbox
- **Observed Behavior**: Database-connected CLI commands (e.g. `php artisan migrate`, `php artisan tinker`) fail when executed in strict sandboxed mode with `Operation not permitted (Connection: mysql, Host: 127.0.0.1, Port: 3306)`.
- **Root Cause**: Sandbox restricts local TCP socket bindings.
- **Remedy**: Database operations must run with sandbox bypass or standard host CLI.

### 1.4 Hardcoded Dark Hex Classes in Legacy Pages
- **Severity**: Low (UI Consistency)
- **Component**: `Settings.jsx`, `AllTrades.jsx`
- **Observed Behavior**: Some deeply nested container elements use explicit dark background classes (`bg-[#121b2d]`, `bg-[#0e1626]`, `border-[#1e293b]`) without corresponding `light:` variants.
- **Remedy**: Ongoing audit to ensure all surface elements include `light:bg-white` or `light:bg-slate-50` and `light:border-slate-200`.

### 1.5 DomPDF CSS3 Constraints in PDF Export
- **Severity**: Low (Formatting limitation)
- **Component**: `backend/app/Services/ExportService.php`
- **Observed Behavior**: Complex modern CSS features (CSS Grid, Flexbox, Web Fonts) are not supported by Barryvdh DomPDF.
- **Remedy**: PDF export templates must strictly use HTML `<table>` elements with inline styles and web-safe fonts.

---

## 2. Resolved Issues

| Issue ID | Description | Resolution Date | Resolution Details |
|---|---|---|---|
| **ISSUE-001** | `addToast is not a function` in `PineScriptManager.jsx` | 2026-10-31 | Added `addToast: showToast` alias in `ToastContext.jsx` and updated callers. |
| **ISSUE-002** | Pine Script "Add to Library" modal did not auto-close | 2026-10-31 | Added explicit `setShowAddModal(false)` and form reset in `handleSaveScript`. |
| **ISSUE-003** | Only email was allowed during login, rejecting usernames | 2026-11-01 | Added `username` column, updated `LoginRequest` and `AuthController` to resolve username/email/name. |
| **ISSUE-004** | Journal Details drawer tabs (`Trade Details`, `Journal Notes`, `Screenshots`, `Lessons`) did not update content | 2026-11-01 | Replaced static block with four dedicated conditional views for each tab with lightbox and contract specs. |
| **ISSUE-005** | Calendar attributed P&L to trade entry date instead of square-off date for BTST/multi-day trades | 2026-11-10 | Added dynamic `effective_date` resolution to `Trade.php` and updated `getTradingCalendar` to group by exit/latest execution date. |
| **ISSUE-006** | "Select all across pages" in All Trades did not calculate Total Prem, Total Inv, and Net P&L | 2026-11-09 | Passed active date & status filters to `/trades/all-ids` and eager-loaded orders in backend calculation. |
| **ISSUE-007** | Quantity input up/down stepper arrows stepped by 1 rather than instrument lot size | 2026-11-09 | Updated quantity inputs across trade forms and partial exit dialogs to step by dynamic index lot size. |
| **ISSUE-008** | Editing buy order quantity did not recalculate open quantity or update position status | 2026-11-09 | Added bidirectional synchronization in `updateOrder` / `recalculateTradeFromOrders` to update lots and status. |
| **ISSUE-009** | Popups and dialogs did not close on pressing Escape key | 2026-11-09 | Implemented unified `useEscapeKey` hook attached across all modals, sheets, and drawers. |
| **ISSUE-010** | Single Exit Price input in Partial Exit modal for "Both" (Straddle / Strangle) orders | 2026-11-10 | Added dual CE & PE exit price inputs with live combined total, option chain integration, and backend split leg order execution. |
| **ISSUE-011** | Calendar cells and Dashboard mini calendar lacked Indian stock market trading holiday indicators | 2026-11-12 | Sourced official 2026 NSE/BSE holidays into backend and frontend utilities, displaying amber holiday badges, holiday names, closed tooltips, and legend across all calendars. |
| **ISSUE-012** | "Rendered more hooks than during previous render" error on Dashboard | 2026-11-12 | Repositioned `useMemo(holidayMap)` to the top level of `Dashboard.jsx` before conditional loading returns. |
| **ISSUE-013** | Order modifications (edit, delete, partial exit) did not update top KPI cards (Total Trades, Net P&L, Gross Profit, Gross Loss, Total Charges, Win Rate) | 2026-11-12 | Added server-side aggregate `summary` to `GET /trades` payload covering all active filters before pagination, and bound `AllTrades.jsx` `fetchTrades()` to refresh `stats` state on every order or trade change. |
| **ISSUE-014** | Trades table in Trading Calendar did not match All Trades module layout, columns, or order | 2026-11-13 | Upgraded Trading Calendar table to the comprehensive 15-column format matching All Trades, including expandable inline executions breakdown, Expiry/Gross P&L/Charges/Strategy columns, straddle leg prices, order edit/exit modals, and newest-first sorting. |
