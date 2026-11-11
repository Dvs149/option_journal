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
  - `date_preset`: `today`, `yesterday`, `this_week`, `this_month`, `last_month`, `this_year`, `all`
  - `start_date`: `YYYY-MM-DD`
  - `end_date`: `YYYY-MM-DD`
- **Response (200 OK)**:
  ```json
  {
    "kpis": {
      "net_pnl": 45200.00,
      "gross_profit": 62000.00,
      "gross_loss": 12000.00,
      "total_charges": 4800.00,
      "total_trades": 24,
      "win_rate": 66.67,
      "profit_factor": 5.17,
      "current_capital": 545200.00
    },
    "recent_trades": [ ... ],
    "equity_curve": [ { "date": "2026-10-01", "pnl": 5200, "cumulative": 505200 } ],
    "daily_pnl_chart": [ { "date": "2026-10-01", "net_pnl": 5200, "trades": 3 } ],
    "index_distribution": [ { "name": "NIFTY", "value": 18 }, { "name": "BANKNIFTY", "value": 6 } ]
  }
  ```

---

## 4. Trades Management Endpoints

### 4.1 List Trades
- **`GET /trades`**
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `per_page`: Records per page (default: 10, max: 100)
  - `sort_by`: `trade_date`, `net_pnl`, `strike_price`, `lots` (default: `trade_date`)
  - `sort_direction`: `asc`, `desc` (default: `desc`)
  - `index_name`: `NIFTY`, `BANKNIFTY`, etc.
  - `trading_type`: `Intraday`, `BTST`, `Overnight`
  - `strategy_name`: `Long Straddle`, etc.
  - `option_type`: `CE`, `PE`, `Both`
  - `start_date`: `YYYY-MM-DD`
  - `end_date`: `YYYY-MM-DD`
  - `search`: Search query across index, strategy, reasons, notes
- **Response (200 OK)**: Paginated resource collection with summary statistics.

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
            "lots": 1,
            "quantity": 65,
            "open_quantity": 0,
            "entry_premium": 171.05,
            "exit_premium": 216.11,
            "net_pnl": 2157.31,
            "trade_date": "2026-11-01",
            "exit_date": "2026-11-02",
            "effective_date": "2026-11-02"
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
