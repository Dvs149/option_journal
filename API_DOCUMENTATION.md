# API DOCUMENTATION — TradeJournal REST API

Base URL: `http://localhost:8000/api` (or environment-configured domain)

## 1. Authentication & Headers

Protected endpoints require a valid Sanctum Bearer token:
```http
Authorization: Bearer <sanctum_plain_text_token>
Accept: application/json
Content-Type: application/json
```

---

## 2. Authentication Endpoints

### 2.1 User Registration
- **`POST /register`**
- **Description**: Creates a new user, default trading account, default strategies, seeds dropdown options, and issues a token.
- **Request Body**:
  ```json
  {
    "name": "Rahul Sharma",
    "username": "rahul_trader",
    "email": "rahul@example.com",
    "password": "password123",
    "password_confirmation": "password123",
    "initial_capital": 500000.00
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "User registered successfully",
    "user": { "id": 1, "name": "Rahul Sharma", "username": "rahul_trader", "email": "rahul@example.com" },
    "token": "1|abcdef..."
  }
  ```

### 2.2 User Login
- **`POST /login`**
- **Description**: Authenticates user via **username**, **email**, or **display name** and issues a Sanctum token.
- **Request Body**:
  ```json
  {
    "login": "rahul_trader",
    "password": "password123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Logged in successfully",
    "user": { "id": 1, "name": "Rahul Sharma", "username": "rahul_trader", "email": "rahul@example.com", "default_account": { ... } },
    "token": "2|fedcba..."
  }
  ```

### 2.3 Current User Profile
- **`GET /user`**
- **Response (200 OK)**:
  ```json
  {
    "user": { "id": 1, "name": "Rahul Sharma", "username": "rahul_trader", "email": "rahul@example.com", "default_account": { ... } }
  }
  ```

### 2.4 User Logout
- **`POST /logout`**
- **Description**: Revokes current access token.
- **Response (200 OK)**:
  ```json
  { "message": "Logged out successfully" }
  ```

### 2.5 Update Profile
- **`PUT /user/profile`**
- **Request Body**: `{ "name": "Rahul S", "username": "rahul_pro", "email": "rahul@example.com" }`
- **Response (200 OK)**: `{ "message": "Profile updated successfully", "user": { ... } }`

### 2.6 Change Password
- **`PUT /user/password`**
- **Request Body**: `{ "current_password": "oldPassword", "new_password": "newPassword8+", "new_password_confirmation": "newPassword8+" }`
- **Response (200 OK)**: `{ "message": "Password changed successfully" }`

---

## 3. Dashboard Endpoints

### 3.1 Get Dashboard Overview
- **`GET /dashboard`**
- **Query Parameters**:
  - `filter`: Preset range (`today`, `yesterday`, `this_week`, `this_month`, `last_month`, `this_year`, `all`, `custom`)
  - `from_date`: `YYYY-MM-DD` (used only when `filter=custom` or when `filter` is omitted)
  - `to_date`: `YYYY-MM-DD` (used only when `filter=custom` or when `filter` is omitted)
  - `trading_account_id`: Specific account ID (optional; defaults to user's active/default trading account)
- **Date Resolution & Precedence Rules**:
  - When a named filter (`today`, `yesterday`, `this_week`, etc.) is passed, it strictly dictates date filtering.
  - Spurious `from_date`/`to_date` values will **not** override named presets.
  - When `filter=custom`, `from_date` and `to_date` define the exact date bounds.
  - When `$startDate === $endDate` (e.g. `today`, `yesterday`), `date_range.display` returns a single date (e.g. `19 Nov 2026`) instead of a range.
- **Response (200 OK)**:
  ```json
  {
    "account": {
      "id": 1,
      "account_name": "Zerodha Primary",
      "broker_name": "Zerodha",
      "initial_capital": 500000.00
    },
    "date_range": {
      "filter": "today",
      "start_date": "2026-11-19",
      "end_date": "2026-11-19",
      "display": "19 Nov 2026"
    },
    "stats": {
      "total_net_profit": 5331.00,
      "total_gross_profit": 5754.00,
      "total_gross_loss": 0.00,
      "total_charges": 423.00,
      "today_pnl": 5331.00,
      "this_week_pnl": 5331.00,
      "this_month_pnl": 127754.00,
      "current_capital": 450859.00,
      "total_trading_days": 1,
      "winning_days": 1,
      "losing_days": 0,
      "win_rate": 100.0,
      "trade_win_rate": 100.0,
      "total_trades": 2,
      "avg_daily_profit": 5331.00,
      "avg_daily_loss": 0.00,
      "max_drawdown": 0.00,
      "profit_factor": 5.17
    },
    "charts": {
      "daily_pnl": [ { "date": "2026-11-19", "displayDate": "19 Nov", "pnl": 5331.00, "trades": 2 } ],
      "equity_curve": [ { "date": "2026-11-19", "displayDate": "19 Nov", "cumulative_pnl": 5331.00, "capital": 450859.00 } ],
      "index_performance": { "total_pnl": 5331.00, "items": [ { "name": "SENSEX", "pnl": 5331.00, "percentage": 100 } ] },
      "ce_pe_performance": { "total_pnl": 5331.00, "items": [ ... ] }
    }
  }
  ```

---

## 4. Trades Management Endpoints

### 4.1 List Trades
- **`GET /trades`**
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `per_page`: Records per page (default: 15, max: 100000, or `all`)
  - `sort_by`: `trade_date`, `net_pnl`, `strike_price`, `quantity`, etc. (default: `trade_date`)
  - `sort_order`: `asc`, `desc` (default: `desc`)
  - `index_name`: `NIFTY`, `BANKNIFTY`, `SENSEX`, etc.
  - `trading_type`: `Intraday`, `BTST`, `Positional`
  - `strategy_name`: `Long Straddle`, etc.
  - `option_type`: `CE`, `PE`, `Both`
  - `status`: `ALL`, `OPEN`, `CLOSED`, `PARTIALLY_CLOSED`, `OPEN_OR_PARTIAL`
  - `filter`: Preset range (`today`, `yesterday`, `this_week`, `this_month`, `last_month`, `this_year`, `all`, `custom`)
  - `from_date`: `YYYY-MM-DD`
  - `to_date`: `YYYY-MM-DD`
  - `search`: Search query across index, strategy, reasons, notes, strike price
- **Response (200 OK)**: Paginated resource collection with pre-paginated aggregate summary statistics:
  ```json
  {
    "current_page": 1,
    "data": [ ... ],
    "total": 6,
    "per_page": 15,
    "summary": {
      "total_trades": 6,
      "net_pnl": 38600.01,
      "gross_profit": 120450.8,
      "gross_loss": 80928.5,
      "total_charges": 922.29,
      "win_rate": 33.3
    },
    "stats": { ... }
  }
  ```

### 4.2 Create Trade
- **`POST /trades`**
- **Request Body (Multipart/form-data or JSON)**:
  ```json
  {
    "trade_date": "2026-10-31",
    "index_name": "NIFTY",
    "trading_type": "Intraday",
    "strategy_name": "Long Straddle",
    "option_type": "PE",
    "strike_price": 22950,
    "expiry_date": "2026-11-03",
    "lots": 11,
    "quantity": 715,
    "entry_price": 125.95,
    "exit_price": 159.40,
    "entry_reason": "Morning breakout of key level",
    "exit_reason": "Target resistance achieved",
    "notes": "Traded with high conviction",
    "screenshots": [ ... ]
  }
  ```
- **Response (201 Created)**: Created trade record with auto-calculated charges and net P&L.

### 4.3 Get Single Trade
- **`GET /trades/{id}`**
- **Response (200 OK)**: Trade record loaded with `journal` and `screenshots`.

### 4.4 Update Trade
- **`PUT /trades/{id}`**
- **Request Body**: Partial or full trade updates; triggers automatic charge and P&L re-calculation.

### 4.5 Delete Trade
- **`DELETE /trades/{id}`**
- **Response (200 OK)**: Soft-deletes trade record.

### 4.6 All Filtered IDs & Cross-Page Totals
- **`GET /trades/all-ids`**
- **Description**: Returns all trade IDs and accurate financial sums matching the current active filters across all pagination pages.
- **Query Parameters**:
  - `filter`: Preset range (`today`, `yesterday`, `this_week`, `this_month`, `last_month`, `this_year`, `all`, `custom`)
  - `from_date`: `YYYY-MM-DD`
  - `to_date`: `YYYY-MM-DD`
  - `status`: `ALL`, `OPEN`, `CLOSED`, `PARTIALLY_CLOSED`, `OPEN_OR_PARTIAL`
  - `index_name`, `trading_type`, `option_type`, `strategy_name`, `search`
- **Response (200 OK)**:
  ```json
  {
    "ids": [2981, 2982, 2983],
    "count": 33,
    "total_net_pnl": 128339.78,
    "total_investment": 2983770.45,
    "total_premium": 8413.68,
    "trades": [ ... ]
  }
  ```

### 4.7 Order Execution Operations (Partial Exits & Scaling)
- **`POST /trades/{id}/orders`**: Adds an order (BUY/SELL) to an existing trade, recalculates average prices, open quantity, and sets status (`OPEN`, `PARTIALLY_CLOSED`, `CLOSED`).
  - **Standard Payload**: `{ "order_type": "SELL", "quantity": 65, "price": 124.00, "order_date": "2026-11-10", "order_time": "12:50:00", "notes": "Partial Exit" }`
  - **Both (Straddle / Strangle) Payload**: When exiting a `Both` position, client passes `ce_price` and `pe_price` (along with optional combined `price`): `{ "order_type": "SELL", "quantity": 65, "price": 315.00, "ce_price": 150.00, "pe_price": 165.00, "order_date": "2026-11-10", "order_time": "12:50:00" }`. The backend creates both CE SELL and PE SELL leg orders within a single transaction and updates trade leg prices accordingly.
- **`PUT /trades/{id}/orders/{order_id}`**: Updates an executed order's quantity, price, or date/time and recalculates parent trade.
- **`DELETE /trades/{id}/orders/{order_id}`**: Removes an execution order and updates parent trade state.

### 4.8 Bulk Operations
- **`POST /trades/bulk-delete`**: `{ "trade_ids": [12, 13, 14] }`
- **`POST /trades/bulk-import`**: Uploads CSV file (Zerodha or standardized format).
- **`POST /trades/estimate-charges`**: Dry-run calculation of charges without saving.
- **`POST /trades/{id}/duplicate`**: Clones trade with current timestamp.
- **`POST /trades/{id}/screenshots`**: Uploads additional image screenshots.
- **`DELETE /trades/{id}/screenshots/{screenshot_id}`**: Deletes specific screenshot attachment.

---

## 5. Trading Calendar & Heatmap Endpoints

### 5.1 Calendar Overview
- **`GET /calendar`**
- **Description**: Returns monthly calendar days with itemized trade records. Automatically attributes P&L to the square-off / exit date for multi-day trades (BTST / positional), and to the last executed order date for partial orders. Also returns the official Indian Stock Market (NSE & BSE) trading holidays schedule for the requested month.
- **Query Parameters**: `year`, `month` (e.g. `year=2026&month=11`)
- **Response (200 OK)**:
  ```json
  {
    "year": 2026,
    "month": 11,
    "month_name": "November",
    "total_net_pnl": 128218.52,
    "total_trades": 35,
    "winning_trades": 22,
    "losing_trades": 13,
    "trade_win_rate": 62.9,
    "total_trading_days": 7,
    "winning_days": 5,
    "losing_days": 2,
    "win_rate": 71.4,
    "holidays": [
      {
        "date": "2026-11-10",
        "day": 10,
        "month": 11,
        "year": 2026,
        "weekday": "Tuesday",
        "name": "Diwali-Balipratipada"
      },
      {
        "date": "2026-11-24",
        "day": 24,
        "month": 11,
        "year": 2026,
        "weekday": "Tuesday",
        "name": "Prakash Gurpurb Sri Guru Nanak Dev"
      }
    ],
    "days": [
      {
        "date": "2026-11-02",
        "day": 2,
        "weekday": "Monday",
        "net_pnl": 1410.54,
        "gross_profit": 29404.38,
        "gross_loss": 27993.84,
        "total_charges": 628.94,
        "trade_count": 10,
        "status": "profit",
        "trades": [
          {
            "id": 2981,
            "time": "15:20",
            "index_name": "NIFTY",
            "trading_type": "BTST",
            "status": "CLOSED",
            "strategy_name": "Long Straddle",
            "option_type": "Both",
            "strike_price": 25000,
            "expiry_date": "2026-11-05",
            "lots": 1,
            "quantity": 65,
            "open_quantity": 0,
            "entry_premium": 171.05,
            "exit_premium": 216.11,
            "gross_profit": 2928.90,
            "gross_loss": 0.00,
            "total_charges": 771.59,
            "net_pnl": 2157.31,
            "trade_date": "2026-11-01",
            "exit_date": "2026-11-02",
            "effective_date": "2026-11-02",
            "orders": [
              {
                "id": 1940,
                "trade_id": 2981,
                "order_type": "BUY",
                "quantity": 65,
                "price": 171.05,
                "total_charges": 385.70
              }
            ]
          }
        ]
      }
    ],
    "weekday_analytics": { ... }
  }
  ```
      "win_rate": 77.78
    }
  }
  ```

---

## 6. Risk Management Endpoints

### 6.1 Get Risk Metrics & Guardrails
- **`GET /risk`**
- **Response (200 OK)**:
  ```json
  {
    "limits": {
      "daily_max_loss": 25000.00,
      "daily_profit_target": 20000.00,
      "monthly_max_loss": 100000.00,
      "monthly_profit_target": 150000.00
    },
    "current_status": {
      "today_pnl": -4200.00,
      "daily_loss_pct_used": 16.8,
      "is_daily_loss_breached": false,
      "month_pnl": 35000.00
    }
  }
  ```

### 6.2 Update Risk Limits
- **`PUT /risk/limits`**
- **Request Body**: `{ "daily_max_loss": 30000, "daily_profit_target": 25000, "monthly_max_loss": 120000 }`

---

## 7. Trading Journal Endpoints

### 7.1 List Journal Entries
- **`GET /journal`**
- **Query Parameters**: `strategy_name`, `option_type`, `outcome` (`win`/`loss`), `has_mistakes`, `search`, `page`, `per_page`
- **Response (200 OK)**: Trades loaded with `journal` and `screenshots`.

### 7.2 Update Journal Record
- **`PUT /journal/{trade_id}`**
- **Request Body**:
  ```json
  {
    "trade_setup": "Breakout of 15-minute opening range",
    "what_went_right": "Waited patiently for confirmation candle",
    "what_went_wrong": "Did not scale out partially",
    "mistakes_made": "None",
    "lessons_learned": "Trailing SL preserved 80% of gains",
    "personal_notes": "Focused and disciplined execution",
    "market_conditions": "Trending morning session"
  }
  ```

---

## 8. Pine Script Manager Endpoints

- **`GET /pine-scripts`**: List user scripts with filter parameters (`script_type`, `category`, `search`, `is_favorite`).
- **`POST /pine-scripts`**: Save new Pine Script (`title`, `script_type`, `version`, `category`, `code`, `tradingview_url`, `tags`).
- **`GET /pine-scripts/{id}`**: Fetch single script.
- **`PUT /pine-scripts/{id}`**: Update existing script.
- **`DELETE /pine-scripts/{id}`**: Delete script.
- **`POST /pine-scripts/{id}/favorite`**: Toggle favorite star.
- **`POST /pine-scripts/{id}/duplicate`**: Clones script with `"Copy of ..."` title.
- **`GET /pine-scripts/export-json`**: Exports entire user library as downloadable JSON.
- **`POST /pine-scripts/import-json`**: Imports scripts from JSON backup payload.

---

## 9. Dropdown Manager Endpoints

- **`GET /dropdown-options`**: Fetch all module dropdown options (grouped and indexed).
- **`POST /dropdown-options`**: Create custom option (`module_key`, `dropdown_key`, `option_value`, `option_label`, `color`).
- **`PUT /dropdown-options/{id}/status`**: Toggle active/inactive state (`{ "is_active": false }`).
- **`PUT /dropdown-options/{id}`**: Update option label/order.
- **`DELETE /dropdown-options/{id}`**: Delete custom option.
- **`POST /dropdown-options/reset`**: Resets dropdown catalog to factory system defaults.

---

## 10. Document Generation & Backup Endpoints

- **`GET /export/excel`**: Generates and downloads Excel spreadsheet (`.xlsx`).
- **`GET /export/csv`**: Generates and downloads CSV file.
- **`GET /export/pdf`**: Compiles and streams formatted PDF trading report via DomPDF.
- **`GET /export/backup`**: Full JSON snapshot of user account, trades, journals, settings.
- **`POST /export/restore`**: Restores user database from uploaded JSON snapshot.

---

## 11. Zerodha Kite Connect Endpoints (STRICTLY READ-ONLY)

> **Important**: This integration is strictly read-only. It contains zero order placement, modification, or cancellation APIs.

### 11.1 Check Connection Status
- **`GET /zerodha/status`**
- **Description**: Returns current Zerodha integration status, broker client ID, and connection mode.
- **Response**:
  ```json
  {
    "is_connected": true,
    "is_demo": false,
    "integration": {
      "id": 1,
      "broker_user_id": "ZR113592",
      "user_name": "Trader",
      "email": "trader@example.com",
      "broker": "ZERODHA",
      "is_connected": true,
      "is_demo": false,
      "last_synced_at": "2026-11-13T15:59:32+05:30"
    }
  }
  ```

### 11.2 Connect Credentials (Email, Password, API Key & Secret Key)
- **`POST /zerodha/connect`**
- **Description**: Connects Zerodha using user's Email / Client ID, Password, and Kite API Key & Secret Key.
- **Request Body**:
  ```json
  {
    "email": "trader@example.com",
    "password": "your_zerodha_password",
    "api_key": "i7nm8563g7p5a2dw",
    "api_secret": "your_api_secret_key"
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "message": "Successfully connected to Zerodha Kite Connect in READ-ONLY mode.",
    "integration": { ... }
  }
  ```

### 11.3 Connect Demo / Sandbox Mode
- **`POST /zerodha/connect-demo`**
- **Description**: Connects simulated Zerodha portfolio with realistic margins, executed orders, net/day positions, and holdings.
- **Response**:
  ```json
  {
    "status": "success",
    "message": "Zerodha Kite Demo connection activated with realistic portfolio and orders.",
    "integration": { ... }
  }
  ```

### 11.4 Disconnect Integration
- **`POST /zerodha/disconnect`**
- **Description**: Clears active session tokens and disconnects Zerodha.

### 11.5 Get Full Portfolio Details (Read-Only)
- **`GET /zerodha/details`**
- **Description**: Consolidated portfolio data containing available/used margins, executed orders, net & day positions with MTM, and stock holdings.
- **Response Modes**:
  - `status: "needs_auth"`: Returned when the user has saved credentials but the daily Kite Connect session token has expired or not yet been authorized. Contains `login_url` pointing to `https://kite.zerodha.com/connect/login?v=3&api_key=...`.
  - `status: "success"`: Returned with live real data when active session token is present.
  - `status: "demo"`: Returned when user has explicitly activated Demo Sandbox mode.

### 11.6 Exchange Request Token for Live Session
- **`POST /zerodha/exchange-token`**
- **Description**: Exchanges the `request_token` generated during daily Zerodha login redirect (`https://kite.zerodha.com/connect/login?v=3&api_key=...`) for a live Kite `access_token` using sha256 checksum exchange.
- **Request Body**:
  ```json
  {
    "request_token": "8fa76b92xxxxxx"
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "message": "Zerodha Kite daily session authenticated successfully! Real portfolio & orders unlocked.",
    "integration": { ... }
  }
  ```

### 11.7 Save Direct Access Token
- **`POST /zerodha/set-token`**
- **Description**: Directly sets and validates an active Kite session `access_token` against Kite's `/user/profile` endpoint.
- **Request Body**:
  ```json
  {
    "access_token": "78kd92jd01xxxx"
  }
  ```

### 11.8 Import Executed Orders to TradeJournal
- **`POST /zerodha/import-orders`**
- **Description**: Purely internal read-only import that copies executed broker orders into TradeJournal trades and trade orders for analysis. Does not dispatch any broker orders.
- **Optional Request Body**: `{ "order_ids": ["26111300049281"] }`
- **Response**:
  ```json
  {
    "status": "success",
    "imported_count": 5,
    "message": "Successfully imported 5 executed Zerodha order(s) into your TradeJournal."
  }
  ```

### 11.9 Interactive Zerodha Order Review & Import
- **`POST /trades/import-screenshot-orders`**
- **Description**: Powers the interactive `ZerodhaOrderImportModal` popup. Takes user-reviewed and selected orders from Zerodha, with configurable `import_mode` (`smart` vs `individual`) and `option_type` (`Both`, `auto`, `CE`, `PE`), automatically pairing CE and PE orders with matching strikes into a single Straddle trade entry.
- **Request Body**:
  ```json
  {
    "orders": [
      {
        "id": "26111300049281",
        "time": "09:20:14",
        "type": "BUY",
        "index_name": "NIFTY",
        "strike_price": "25200",
        "option_type": "CE",
        "expiry_date": "2026-11-26",
        "quantity": 250,
        "price": 216.80
      }
    ],
    "trade_date": "2026-11-13",
    "import_mode": "smart",
    "option_type": "Both"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Successfully imported 1 trades with 2 orders",
    "imported_trades_count": 1,
    "imported_orders_count": 2
  }
  ```

### 11.10 Virtual Contract Note
- **`GET /zerodha/contract-note`**
- **Description**: Returns estimated statutory and broker charges for all executed orders today, matching Zerodha Kite's official Virtual Contract Note popup.
- **Response**:
  ```json
  {
    "status": "success",
    "trade_date": "2026-11-13",
    "executed_orders_count": 14,
    "statutory_charges": {
      "sebi_turnover_fee": 0.96,
      "exchange_turnover_fee": 339.74,
      "stamp_duty": 13.00,
      "stt": 637.01,
      "gst": 111.73
    },
    "zerodha_charges": {
      "brokerage": 280.00
    },
    "total_charges": 1382.44,
    "turnover": {
      "buy": 422841.25,
      "sell": 424674.25,
      "total": 847515.50
    },
    "orders": [
      {
        "order_id": "2121087078346301440",
        "order_timestamp": "2026-11-13 09:15:42",
        "transaction_type": "SELL",
        "tradingsymbol": "NIFTY26N1725300CE",
        "exchange": "NFO",
        "product": "NRML",
        "quantity": 845,
        "average_price": 115.26,
        "turnover": 97392.75,
        "charges": 215.89
      }
    ]
  }
  ```

### 11.11 Auto-Sync Today's Executed Orders
- **`POST /zerodha/sync-today`**
- **Description**: Fetches executed orders for today from Zerodha Kite, excludes already-imported orders, sorts new orders in chronological ascending order, and pairs them into trade journal entries.
- **Response**:
  ```json
  {
    "success": true,
    "message": "Synchronized 2 executed orders into 1 journal trades",
    "synced_count": 2,
    "imported_trades_count": 1
  }
  ```

---

## 12. Capital Management & Growth Endpoints

### 12.1 Capital Summary & Growth Chart
- **`GET /capital`**
- **Description**: Returns initial capital, current capital, period profit/ROI, deposit/withdrawal totals, transactions, and the capital growth chart points. Supports dynamic timeframe filtering (`1m`, `3m`, `6m`, `ytd`, `1y`, `all`, `custom`) and custom date ranges (`from_date`, `to_date`).
- **Query Parameters**:
  - `filter` / `time_range`: `1m`, `3m`, `6m`, `ytd`, `1y`, `all`, `custom` (default: `1m`)
  - `from_date`: `YYYY-MM-DD` (optional, overrides filter)
  - `to_date`: `YYYY-MM-DD` (optional, overrides filter)
- **Response (200 OK)**:
  ```json
  {
    "account": {
      "id": 1,
      "account_name": "Primary Trading Account",
      "initial_capital": 800000.00
    },
    "initial_capital": 800000.00,
    "current_capital": 432340.00,
    "opening_capital": 453757.00,
    "total_deposits": 0.00,
    "total_withdrawals": 60000.00,
    "period_deposits": 0.00,
    "period_withdrawals": 60000.00,
    "lifetime_deposits": 0.00,
    "lifetime_withdrawals": 60000.00,
    "net_capital_inflow": -60000.00,
    "total_profit": -21417.00,
    "period_profit": -21417.00,
    "lifetime_profit": -307660.00,
    "overall_roi": -38.46,
    "period_roi": -4.72,
    "highest_capital": 800000.00,
    "current_drawdown": 367660.00,
    "today_pnl": -21417.00,
    "date_range": {
      "filter": "1m",
      "start_date": "2026-11-01",
      "end_date": "2026-11-30",
      "display": "01 Nov 2026 - 30 Nov 2026"
    },
    "growth_chart": [
      {
        "date": "2026-11-01",
        "displayDate": "01 Nov",
        "capital": 453757.00,
        "pnl": 0.00
      },
      {
        "date": "2026-11-16",
        "displayDate": "16 Nov",
        "capital": 453757.00,
        "pnl": 0.00,
        "withdrawals": 60000.00
      },
      {
        "date": "2026-11-18",
        "displayDate": "18 Nov",
        "capital": 432340.00,
        "pnl": -21417.00
      }
    ],
    "transactions": [
      {
        "id": 1,
        "transaction_type": "withdrawal",
        "amount": 60000.00,
        "transaction_date": "2026-11-16",
        "notes": "Bank transfer"
      }
    ]
  }
  ```

### 12.2 Record Capital Transaction
- **`POST /capital/transactions`**
- **Description**: Records a capital deposit or withdrawal.
- **Request Body**:
  ```json
  {
    "transaction_type": "deposit",
    "amount": 100000.00,
    "transaction_date": "2026-11-19",
    "notes": "Capital addition"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "Deposit recorded successfully",
    "transaction": { "id": 2, "transaction_type": "deposit", "amount": 100000.00 }
  }
  ```

### 12.3 Delete Capital Transaction
- **`DELETE /capital/transactions/{id}`**
- **Response**: `{ "message": "Transaction removed successfully" }`

### 12.4 Update Initial Starting Capital
- **`PUT /capital/initial`**
- **Request Body**: `{ "initial_capital": 800000.00 }`
- **Response**: `{ "message": "Initial capital updated successfully", "initial_capital": 800000.00 }`

---

## 13. Free Time Stories & Reader Endpoints

### 13.1 Upload Story Image
- **`POST /stories/upload-image`**
- **Description**: Uploads an image file to local public storage for embedding in story content. Supports JPEG, PNG, WEBP, GIF, and SVG up to 10MB.
- **Request (Multipart Form-Data)**:
  - `image`: File (image binary)
- **Response (201 Created)**:
  ```json
  {
    "status": "success",
    "message": "Image uploaded successfully",
    "url": "/storage/stories/k5Jd79Xla908df.png",
    "filename": "mountain_illustration.png"
  }
  ```

### 13.2 List Stories
- **`GET /stories`**
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `per_page`: Stories per page (default: 12)
  - `search`: Filter text matching title, author, category, or summary
  - `category`: Filter by category (or `'all'`)
  - `status`: Filter by reading status (`unread`, `reading`, `completed`, or `'all'`)
  - `is_favorite`: Filter favorites (1 or 0)
  - `sort_by`: `created_at`, `title`, `word_count`, `estimated_reading_time`, `last_read_at` (default: `created_at`)
  - `sort_order`: `desc` or `asc` (default: `desc`)
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": 1,
        "title": "The Archer and the Unshakable Target",
        "author": "Ancient Eastern Parable",
        "category": "Philosophy & Wisdom",
        "summary": "A master archer teaches an apprentice that true accuracy comes from stillness within.",
        "content": "In a quiet monastery nestled between mist-covered peaks...",
        "cover_color": "#10b981",
        "tags": ["patience", "focus", "mindset"],
        "word_count": 520,
        "estimated_reading_time": 3,
        "reading_progress": 45,
        "status": "reading",
        "is_favorite": true,
        "last_read_at": "2026-11-25T11:30:00.000000Z",
        "created_at": "2026-11-25T11:00:00.000000Z"
      }
    ],
    "current_page": 1,
    "last_page": 1,
    "per_page": 12,
    "total": 1,
    "stats": {
      "total_stories": 1,
      "total_words": 520,
      "completed_count": 0,
      "reading_count": 1,
      "favorites_count": 1,
      "categories": ["Philosophy & Wisdom"]
    }
  }
  ```

### 13.2 Create Story
- **`POST /stories`**
- **Request Body**:
  ```json
  {
    "title": "The Whispering Ledger of Amsterdam",
    "author": "Historical Fiction",
    "category": "History & Commerce",
    "summary": "In 1636 Amsterdam, a merchant discovers that fortunes are preserved by discipline.",
    "content": "The rain over Amsterdam in the winter of 1636 had the chill of iron...",
    "cover_color": "#8b5cf6",
    "tags": ["history", "discipline"],
    "status": "unread",
    "is_favorite": false
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "status": "success",
    "message": "Story saved successfully",
    "data": { "id": 2, "title": "The Whispering Ledger of Amsterdam", "word_count": 780, "estimated_reading_time": 4 }
  }
  ```

### 13.3 View / Read Story
- **`GET /stories/{id}`**
- **Description**: Returns story data and automatically updates `last_read_at` and transitions unread stories to `reading`.
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "data": { "id": 1, "title": "The Archer and the Unshakable Target", "status": "reading", "last_read_at": "2026-11-25T11:45:00.000000Z" }
  }
  ```

### 13.4 Update Story
- **`PUT /stories/{id}`**
- **Request Body**: Optional fields: `title`, `author`, `category`, `summary`, `content`, `cover_color`, `tags`, `status`, `is_favorite`, `reading_progress`.
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "message": "Story updated successfully",
    "data": { "id": 1, "title": "Updated Title" }
  }
  ```

### 13.5 Delete Story
- **`DELETE /stories/{id}`**
- **Response (200 OK)**: `{ "status": "success", "message": "Story deleted successfully" }`

### 13.6 Toggle Favorite Bookmark
- **`PATCH /stories/{id}/favorite`**
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "message": "Added to favorites",
    "data": { "id": 1, "is_favorite": true }
  }
  ```

### 13.7 Update Reading Progress
- **`PATCH /stories/{id}/progress`**
- **Request Body**: `{ "progress": 85 }`
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "message": "Reading progress updated",
    "data": { "id": 1, "reading_progress": 85, "status": "reading" }
  }
  ```

### 13.8 Seed Curated Sample Stories
- **`POST /stories/samples`**
- **Description**: Automatically inserts 3 curated philosophical and inspiring stories into user's library for immediate reading.
- **Response (200 OK)**:
  ```json
  {
    "status": "success",
    "message": "Sample stories added successfully",
    "data": [ ... ]
  }
  ```
