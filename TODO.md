# TODO & DEVELOPMENT ROADMAP — TradeJournal

This document tracks prioritized future improvements, architectural tasks, and prospective features.

---

## Priority 0: Stability, Quality Control & Security (Immediate)

- [ ] **Automated Tests for Calculation Engine**:
  - Add PHPUnit / Pest tests in `backend/tests/Feature/TradingCalculationTest.php` testing STT, exchange fees, GST, SEBI turnover fees, and stamp duty edge cases against known Indian broker contract notes.
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
