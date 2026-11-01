# FEATURE MAPPING — React SPA to Native macOS Application

This document maps every existing capability, component, and user interaction in the React web application to its corresponding native SwiftUI implementation in the macOS client.

---

## Complete Mapping Matrix

| Existing Module | Existing Functionality | Existing API Endpoint | Required macOS Screen / Component | Required API Changes | Implementation Priority | Status |
|---|---|---|---|---|:---:|:---:|
| **Authentication** | Dual Login (Username, Email, Display Name) | `POST /api/login` | `LoginView` (Floating Window / Sheet) | None (Reused as-is) | P0 (Critical) | Planned |
| **Authentication** | Trader Registration & Initial Capital Setup | `POST /api/register` | `RegisterView` (Sheet Modal) | None (Reused as-is) | P0 (Critical) | Planned |
| **Authentication** | Token Persistence & Keychain Management | LocalStorage / Sanctum | `KeychainManager` (Native Keychain) | None (Client storage) | P0 (Critical) | Planned |
| **Authentication** | Logout / Token Invalidation | `POST /api/logout` | `AppToolbar` / Menu Bar Item | None (Reused as-is) | P0 (Critical) | Planned |
| **Authentication** | User Profile Update | `PUT /api/user/profile` | `SettingsView` (Profile Tab) | None (Reused as-is) | P2 (Medium) | Planned |
| **Authentication** | Change Password | `PUT /api/user/password` | `SettingsView` (Security Tab) | None (Reused as-is) | P2 (Medium) | Planned |
| **Navigation** | Sidebar Navigation & Active Highlighting | `Sidebar.jsx`, `ModuleContext` | `SidebarView` (`NavigationSplitView`) | None (Local State / API) | P0 (Critical) | Planned |
| **Navigation** | Global Date Range Filter (Presets + Custom Picker) | `FilterContext.jsx` | `DateRangePickerView` (`ToolbarItem`) | None (Query Param passed) | P0 (Critical) | Planned |
| **Navigation** | Module Visibility Manager (Show/Hide Modules) | `GET /api/module-visibility`, `PUT /api/module-visibility/batch` | `SidebarView` & `SettingsView` | None (Reused as-is) | P2 (Medium) | Planned |
| **Dashboard** | Primary KPI Cards (Net P&L, Gross Profit/Loss, Charges, Capital) | `GET /api/dashboard` | `DashboardView` → `PrimaryKPIsGrid` | None (Reused as-is) | P0 (Critical) | Planned |
| **Dashboard** | Secondary KPIs (Win Rate, Profit Factor, Max Drawdown, Avg P&L) | `GET /api/dashboard` | `DashboardView` → `SecondaryKPIsBar` | None (Reused as-is) | P0 (Critical) | Planned |
| **Dashboard** | Daily P&L Performance Bar Chart (Green/Red) | `GET /api/dashboard` | `DailyPnLChartView` (`Swift Charts`) | None (Reused as-is) | P1 (High) | Planned |
| **Dashboard** | Cumulative Equity Curve & High-Water Mark | `GET /api/dashboard` | `EquityChartView` (`Swift Charts`) | None (Reused as-is) | P1 (High) | Planned |
| **Dashboard** | Monthly P&L Breakdown Bars | `GET /api/dashboard` | `MonthlyPnLChartView` (`Swift Charts`) | None (Reused as-is) | P1 (High) | Planned |
| **Dashboard** | Index & Option Type Distribution Donut Charts | `GET /api/dashboard` | `DistributionDonutView` (`Swift Charts`) | None (Reused as-is) | P2 (Medium) | Planned |
| **Dashboard** | Mini Trading Calendar Heatmap Preview | `GET /api/dashboard` | `MiniCalendarWidget` | None (Reused as-is) | P1 (High) | Planned |
| **Dashboard** | Live Risk & Daily Limit Gauge | `GET /api/dashboard` | `RiskGaugeWidget` | None (Reused as-is) | P1 (High) | Planned |
| **Dashboard** | Recent Trades Table Preview | `GET /api/dashboard` | `DashboardView` → `RecentTradesList` | None (Reused as-is) | P1 (High) | Planned |
| **Add Trade** | Single-Leg Option Logging (`CE` or `PE`) | `POST /api/trades` | `TradeFormView` (Single Leg Tab) | None (Reused as-is) | P0 (Critical) | Planned |
| **Add Trade** | Multi-Leg Option Logging (`Both` / Straddle) | `POST /api/trades` | `TradeFormView` (Multi Leg Tab) | None (Reused as-is) | P0 (Critical) | Planned |
| **Add Trade** | Dynamic Lot Sizing & Quantity Auto-Calculation | `GET /api/lot-sizes` | `TradeFormView` (Live Stepper) | None (Reused as-is) | P0 (Critical) | Planned |
| **Add Trade** | Real-time Indian Tax & Brokerage Preview | `POST /api/trades/estimate-charges`| `ChargesLivePreviewView` | None (Reused as-is) | P1 (High) | Planned |
| **Add Trade** | Setup Rationale, Exit Reason, & Execution Notes | `POST /api/trades` | `TradeFormView` (Notes Section) | None (Reused as-is) | P0 (Critical) | Planned |
| **Add Trade** | Chart Screenshot Drag & Drop Upload | `POST /api/trades/{id}/screenshots`| `ScreenshotDropZone` | None (Multipart Upload) | P1 (High) | Planned |
| **All Trades** | Compact Dense Trades Table with Column Sorting | `GET /api/trades` | `TradesTableView` (SwiftUI `Table`) | None (Reused as-is) | P0 (Critical) | Planned |
| **All Trades** | Pagination (10, 25, 50, 100, Unlimited) | `GET /api/trades` (`per_page`, `page`) | `TradesTableView` (Paging Toolbar) | None (Reused as-is) | P0 (Critical) | Planned |
| **All Trades** | Full-Text Search across Index, Strategy, Notes | `GET /api/trades` (`search=...`) | `ToolbarItem` (`.searchable`) | None (Reused as-is) | P0 (Critical) | Planned |
| **All Trades** | Multi-Parameter Filter Bar (Index, Type, Leg, Strategy) | `GET /api/trades` | `TradeFilterBarView` | None (Reused as-is) | P0 (Critical) | Planned |
| **All Trades** | Multi-Row Checkbox Selection & Bulk Delete | `POST /api/trades/bulk-delete` | `TradesTableView` (Selection Model) | None (Reused as-is) | P1 (High) | Planned |
| **All Trades** | Trade Side Inspector Drawer (Specs, Charges, Notes) | `GET /api/trades/{id}` | `TradeDetailInspector` | None (Reused as-is) | P0 (Critical) | Planned |
| **All Trades** | Edit Trade Sheet Modal | `PUT /api/trades/{id}` | `EditTradeSheet` | None (Reused as-is) | P0 (Critical) | Planned |
| **All Trades** | Duplicate Trade Action | `POST /api/trades/{id}/duplicate` | Context Menu / Action Button | None (Reused as-is) | P1 (High) | Planned |
| **All Trades** | Delete Single Trade | `DELETE /api/trades/{id}` | Context Menu / Action Button | None (Reused as-is) | P0 (Critical) | Planned |
| **Bulk Import** | Kotak Neo & Zerodha CSV/Excel Upload | `POST /api/trades/bulk-import` | `BulkImportSheet` (`.fileImporter`) | None (Reused as-is) | P1 (High) | Planned |
| **Bulk Import** | In-Memory Pre-Import Validation & Parsing | Client Parser / Native Swift | `KotakParser` & `ZerodhaParser` (Swift) | None (Client parsing) | P1 (High) | Planned |
| **Export** | Custom Report Exporter (Trade, Daily, Monthly, Yearly) | `GET /export/pdf`, `/export/csv`, `/export/excel` | `ExportReportSheet` | None (Reused as-is) | P1 (High) | Planned |
| **Export** | Custom Column Selector for Reports | `columns=...` query param | `ExportReportSheet` (Column Grid) | None (Reused as-is) | P1 (High) | Planned |
| **Calendar** | Monthly Calendar Grid with Daily Net P&L Pills | `GET /api/calendar` | `TradingCalendarView` | None (Reused as-is) | P1 (High) | Planned |
| **Calendar** | Color-coded Profit (Green) & Loss (Red) Days | `GET /api/calendar` | `CalendarDayCell` | None (Reused as-is) | P1 (High) | Planned |
| **Calendar** | Day Inspection (Click day to view trades executed) | `GET /api/trades?from_date=...` | `CalendarDayPopover` / Split | None (Reused as-is) | P1 (High) | Planned |
| **Calendar** | Monthly Summary Banner (Total P&L, Win Days, Win %) | `GET /api/calendar` | `CalendarSummaryBanner` | None (Reused as-is) | P1 (High) | Planned |
| **Risk Guard** | Live Limit Gauges (Daily Loss, Daily Target, Drawdown) | `GET /api/risk` | `RiskManagementView` | None (Reused as-is) | P1 (High) | Planned |
| **Risk Guard** | Threshold Breach Alert Banners & Audio/Haptic Warning | `GET /api/risk` | `RiskAlertBanner` | None (Local Trigger) | P1 (High) | Planned |
| **Risk Guard** | Update Risk Guardrails & Thresholds | `PUT /api/risk/limits` | `EditRiskLimitsSheet` | None (Reused as-is) | P1 (High) | Planned |
| **Risk Guard** | Risk-Reward Ratio & Expectancy Analytics | `GET /api/risk` | `RiskMetricsGridView` | None (Reused as-is) | P2 (Medium) | Planned |
| **Journal** | Psychological Reflections List & Search | `GET /api/journal` | `TradingJournalView` | None (Reused as-is) | P1 (High) | Planned |
| **Journal** | 4-Tab Reflection Drawer (Specs, Notes, Media, Lessons) | `GET /api/journal/{id}` | `JournalDrawer` | None (Reused as-is) | P1 (High) | Planned |
| **Journal** | Emotional Mood Selector & 1-5 Star Execution Rating | `PUT /api/journal/{id}` | `JournalNotesTab` | None (Reused as-is) | P1 (High) | Planned |
| **Journal** | Multi-Image Chart Screenshot Gallery with Lightbox | `GET /api/trades/{id}` | `ScreenshotGallery` (`QuickLook`) | None (Reused as-is) | P1 (High) | Planned |
| **Capital** | Starting Capital Configuration | `PUT /api/capital/initial` | `CapitalManagementView` | None (Reused as-is) | P1 (High) | Planned |
| **Capital** | Deposits & Withdrawals Transaction Ledger | `GET /api/capital`, `POST /api/capital/transactions` | `CapitalTransactionsTable` | None (Reused as-is) | P1 (High) | Planned |
| **Capital** | Cumulative Equity Curve & High-Water Mark | `GET /api/capital` | `EquityCurveView` (`Swift Charts`) | None (Reused as-is) | P1 (High) | Planned |
| **Capital** | Drawdown Curve (% Portfolio Dip from Peak) | `GET /api/capital` | `DrawdownChartView` (`Swift Charts`) | None (Reused as-is) | P1 (High) | Planned |
| **Strategy** | Strategy Performance Cards & P&L Comparison | `GET /api/strategies` | `StrategyAnalysisView` | None (Reused as-is) | P2 (Medium) | Planned |
| **Strategy** | Strategy Profitability Bar Chart | `GET /api/strategies` | `StrategyComparisonChart` | None (Reused as-is) | P2 (Medium) | Planned |
| **Strategy** | Create / Delete Trading Strategies | `POST /api/strategies`, `DELETE /api/strategies/{id}` | `StrategyManagementSheet` | None (Reused as-is) | P2 (Medium) | Planned |
| **Analytics** | Deep-Dive Performance by Index (NIFTY vs BN) | `GET /api/analytics` | `AnalyticsReportsView` (Index Tab) | None (Reused as-is) | P2 (Medium) | Planned |
| **Analytics** | Performance by Trading Type (Intraday vs BTST) | `GET /api/analytics` | `AnalyticsReportsView` (Type Tab) | None (Reused as-is) | P2 (Medium) | Planned |
| **Analytics** | Performance by Day of Week (Monday to Friday) | `GET /api/analytics` | `AnalyticsReportsView` (Weekday Tab) | None (Reused as-is) | P2 (Medium) | Planned |
| **Pine Script** | TradingView Script Library Gallery & Category Filter | `GET /api/pine-scripts` | `PineScriptListView` | None (Reused as-is) | P2 (Medium) | Planned |
| **Pine Script** | Syntax-Highlighted Dark Code Inspector & Line Numbers | `GET /api/pine-scripts/{id}` | `PineCodeInspectorView` | None (Local Native Text) | P2 (Medium) | Planned |
| **Pine Script** | Webhook Alert JSON Payload Generator | Local / `tags` | `WebhookAlertSheet` | None (Local Native Tool) | P2 (Medium) | Planned |
| **Pine Script** | One-Click Clipboard Copy & `.pine` File Export | Local / File Manager | Action Button (`NSPasteboard`) | None (Local Native) | P2 (Medium) | Planned |
| **Pine Script** | Script Library JSON Backup Export & Restore | `GET /export-json`, `POST /import-json` | File Menu Actions | None (Reused as-is) | P2 (Medium) | Planned |
| **Dropdowns** | Dynamic Dropdown Manager (Indices, Strategies, Types) | `GET /api/dropdown-options` | `DropdownManagerView` | None (Reused as-is) | P2 (Medium) | Planned |
| **Dropdowns** | Toggle Option Status / Add Custom Option with Color | `PUT /status`, `POST /dropdown-options` | `DropdownOptionRow` | None (Reused as-is) | P2 (Medium) | Planned |
| **Settings** | Dynamic Lot Sizes Configuration (NIFTY, BN, SENSEX) | `GET /api/lot-sizes`, `PUT /batch` | `SettingsView` (Lot Sizes Tab) | None (Reused as-is) | P1 (High) | Planned |
| **Settings** | Indian Statutory Brokerage & Tax Schedule Editor | `GET /api/brokerage-settings`, `PUT /brokerage-settings` | `SettingsView` (Brokerage Tab) | None (Reused as-is) | P1 (High) | Planned |
| **Settings** | Full Database Backup & Restore (JSON Snapshot) | `GET /api/export/backup`, `POST /api/export/restore` | `SettingsView` (Data Tab) | None (Reused as-is) | P2 (Medium) | Planned |
| **Appearance** | Zerodha Kite Dark, Midnight Dark, Light, System | Local / AppKit Appearance | `SettingsView` (Appearance Tab) | None (Native `@AppStorage`) | P0 (Critical) | Planned |
