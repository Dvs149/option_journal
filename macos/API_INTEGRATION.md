# API INTEGRATION — OptionJournal macOS Native Client

This document provides the exhaustive specification for integrating the native macOS SwiftUI application with the Laravel REST API backend (`backend/routes/api.php`).

---

## 1. Environment & Network Configuration

### Base URL Resolution
- **Local Development**: `http://127.0.0.1:8000/api`
- **LAN / Network Test**: `http://<local-ip>:8000/api`
- **Production Server**: Configurable via an `AppEnvironment` configuration structure.

### App Transport Security (ATS) Configuration
Because the local backend serves over plain HTTP during development (`http://127.0.0.1:8000`), the macOS target's `Info.plist` must permit local networking:
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
</dict>
```

### Sandbox Entitlements
To permit outbound network requests in sandboxed macOS builds, `OptionJournal.entitlements` must declare:
```xml
<key>com.apple.security.network.client</key>
<true/>
```

---

## 2. Authentication & Header Contracts

All requests to protected routes require the standard Bearer token header issued by Laravel Sanctum:

```http
GET /api/dashboard HTTP/1.1
Host: 127.0.0.1:8000
Authorization: Bearer 24|UMPX4xTTCVPvu0TLqbV44G2Kuxz0V2VnGUm7Tud7cd81c66d
Accept: application/json
Content-Type: application/json
```

### Standard Error Response Structures

#### 1. Validation Error (HTTP 422 Unprocessable Entity)
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "trade_date": ["The trade date field is required."],
    "quantity": ["The quantity must be greater than 0."]
  }
}
```

#### 2. Authentication Error (HTTP 401 Unauthorized)
```json
{
  "message": "Unauthenticated."
}
```

#### 3. General Error (HTTP 400 / 404 / 500)
```json
{
  "message": "Resource not found or database error"
}
```

---

## 3. Complete Endpoint Catalog

### 3.1 Authentication & Profile (`/api`)

| Method | Endpoint | Description | Request Body / Query | Expected Response |
|---|---|---|---|---|
| `POST` | `/register` | User signup & bootstrap | `RegisterRequestDTO` | `AuthResponseDTO` (201) |
| `POST` | `/login` | Dual login (username/email) | `LoginRequestDTO` | `AuthResponseDTO` (200) |
| `GET` | `/ping` | Server health check | None | `{"status":"ok"}` (200) |
| `GET` | `/user` | Get current user & account | None | `UserDTO` (200) |
| `POST` | `/logout` | Revoke active token | None | `{"message":"..."}` (200) |
| `PUT` | `/user/profile` | Update user info | `{"name","username","email"}` | `UserDTO` (200) |
| `PUT` | `/user/password`| Change account password | `{"current_password","new_password",...}` | `{"message":"..."}` (200) |

---

### 3.2 Dashboard (`/api/dashboard`)

| Method | Endpoint | Description | Query Parameters | Expected Response |
|---|---|---|---|---|
| `GET` | `/dashboard` | Executive KPI overview & series | `filter`, `from_date`, `to_date`, `trading_account_id` | `DashboardOverviewDTO` (200) |

**Sample Response Structure**:
```json
{
  "stats": {
    "total_net_profit": -70387.02,
    "total_gross_profit": 278557.66,
    "total_gross_loss": 334654.64,
    "total_charges": 14290.04,
    "total_trades": 290,
    "win_rate": 45.7,
    "profit_factor": 0.83,
    "current_capital": 311822.00
  },
  "recent_trades": [ ... ],
  "daily_pnl_chart": [ { "date": "2024-01-03", "net_pnl": -2898.70, "trades": 5 } ],
  "equity_curve": [ { "date": "2024-01-03", "cumulative_pnl": -2898.70, "capital": 497101.30 } ],
  "index_distribution": [ { "index_name": "BANKNIFTY", "count": 188, "net_pnl": -45200.00 } ]
}
```

---

### 3.3 Trades Management (`/api/trades`)

| Method | Endpoint | Description | Request Body / Query | Expected Response |
|---|---|---|---|---|
| `GET` | `/trades` | List paginated or all trades | `all`, `per_page`, `page`, `filter`, `from_date`, `to_date`, `index_name`, `trading_type`, `option_type`, `strategy_name`, `search`, `sort_by`, `sort_order` | `PaginatedTradesDTO` (200) |
| `POST` | `/trades` | Create single or multi-leg trade | `TradeFormDTO` (JSON or Multipart) | `TradeDTO` (201) |
| `GET` | `/trades/{id}` | Get single trade details | None | `TradeDTO` (200) |
| `PUT` | `/trades/{id}` | Update trade | `TradeFormDTO` | `TradeDTO` (200) |
| `DELETE` | `/trades/{id}` | Soft delete trade | None | `{"message":"..."}` (200) |
| `GET` | `/trades/all-ids` | Get array of all matching IDs | Filter parameters | `{"ids": [1, 2, 3...]}` (200) |
| `POST` | `/trades/bulk-delete` | Delete multiple trades | `{"ids": [101, 102]}` | `{"deleted_count": 2}` (200) |
| `POST` | `/trades/bulk-import` | Batch import parsed trades | `{"trades": [ ... ]}` | `{"imported_count": 290}` (200) |
| `POST` | `/trades/estimate-charges`| Dry-run tax calculation | `{"entry_premium","exit_premium","quantity","index_name"}` | `ChargeBreakdownDTO` (200) |
| `POST` | `/trades/{id}/duplicate` | Duplicate an existing trade | None | `TradeDTO` (201) |
| `POST` | `/trades/{id}/screenshots` | Upload screenshot image | Multipart `image` | `TradeScreenshotDTO` (201) |
| `DELETE` | `/trades/{id}/screenshots/{sId}` | Delete screenshot | None | `{"message":"..."}` (200) |
| `POST` | `/trades/reset-all-data` | Wipe and reseed trades | None | `{"message":"..."}` (200) |

---

### 3.4 Calendar & Heatmap (`/api/calendar`)

| Method | Endpoint | Description | Query Parameters | Expected Response |
|---|---|---|---|---|
| `GET` | `/calendar` | Monthly trading calendar & stats | `year`, `month`, `trading_account_id` | `CalendarMonthDTO` (200) |

**Sample Response Structure**:
```json
{
  "year": 2024,
  "month": 1,
  "days": {
    "2024-01-03": { "net_pnl": -2898.70, "trade_count": 5, "is_profit": false },
    "2024-01-04": { "net_pnl": 4520.00, "trade_count": 2, "is_profit": true }
  },
  "monthly_summary": {
    "net_pnl": 18250.00,
    "winning_days": 12,
    "losing_days": 6,
    "win_rate": 66.7
  }
}
```

---

### 3.5 Risk Management & Guardrails (`/api/risk`)

| Method | Endpoint | Description | Request Body / Query | Expected Response |
|---|---|---|---|---|
| `GET` | `/risk` | Fetch live limits & usage | None | `RiskStatusDTO` (200) |
| `PUT` | `/risk/limits` | Update account risk thresholds | `{"daily_max_loss","daily_profit_target","monthly_max_loss","monthly_profit_target"}` | `RiskStatusDTO` (200) |

---

### 3.6 Trading Journal & Qualitative Reflections (`/api/journal`)

| Method | Endpoint | Description | Request Body / Query | Expected Response |
|---|---|---|---|---|
| `GET` | `/journal` | Paginated trades with journals | `strategy_name`, `outcome`, `has_mistakes`, `search` | `PaginatedJournalDTO` (200) |
| `GET` | `/journal/{trade_id}` | Fetch journal for trade | None | `TradeJournalDTO` (200) |
| `PUT` | `/journal/{trade_id}` | Save reflections & reviews | `JournalUpdateDTO` | `TradeJournalDTO` (200) |

---

### 3.7 Capital Management & Transactions (`/api/capital`)

| Method | Endpoint | Description | Request Body / Query | Expected Response |
|---|---|---|---|---|
| `GET` | `/capital` | Capital ledger & analytics | None | `CapitalOverviewDTO` (200) |
| `POST` | `/capital/transactions` | Log Deposit or Withdrawal | `{"type":"Deposit","amount":50000,"transaction_date":"2026-10-01","notes":"Capital injection"}` | `TransactionDTO` (201) |
| `DELETE` | `/capital/transactions/{id}` | Delete capital transaction | None | `{"message":"..."}` (200) |
| `PUT` | `/capital/initial` | Update baseline capital | `{"initial_capital": 500000.00}` | `{"message":"..."}` (200) |

---

### 3.8 Strategy Analysis (`/api/strategies`)

| Method | Endpoint | Description | Request Body / Query | Expected Response |
|---|---|---|---|---|
| `GET` | `/strategies` | Strategy performance breakdown | `filter`, `from_date`, `to_date` | `[StrategyDTO]` (200) |
| `POST` | `/strategies` | Create new trading strategy | `{"name":"Iron Condor","description":"4-leg range trade"}` | `StrategyDTO` (201) |
| `DELETE` | `/strategies/{id}` | Remove trading strategy | None | `{"message":"..."}` (200) |

---

### 3.9 Pine Script Manager (`/api/pine-scripts`)

| Method | Endpoint | Description | Request Body / Query | Expected Response |
|---|---|---|---|---|
| `GET` | `/pine-scripts` | List user script repository | `script_type`, `category`, `search`, `is_favorite` | `[PineScriptDTO]` (200) |
| `POST` | `/pine-scripts` | Create new Pine Script | `{"title","script_type","version","category","code",...}` | `PineScriptDTO` (201) |
| `GET` | `/pine-scripts/{id}` | Fetch single script | None | `PineScriptDTO` (200) |
| `PUT` | `/pine-scripts/{id}` | Update script code | Update payload | `PineScriptDTO` (200) |
| `DELETE` | `/pine-scripts/{id}` | Delete script | None | `{"message":"..."}` (200) |
| `POST` | `/pine-scripts/{id}/favorite` | Toggle favorite star | None | `PineScriptDTO` (200) |
| `POST` | `/pine-scripts/{id}/duplicate`| Clone script | None | `PineScriptDTO` (201) |
| `GET` | `/pine-scripts/export-json` | Export library to JSON file | None | JSON file download (200) |
| `POST` | `/pine-scripts/import-json` | Batch restore library | JSON payload | `{"imported_count": 15}` (200) |

---

### 3.10 System Configuration & Settings (`/api/...`)

- **Lot Sizes (`/api/lot-sizes`)**: Full CRUD and batch updates for index lot sizes (`NIFTY`, `BANKNIFTY`, etc.).
- **Brokerage Settings (`/api/brokerage-settings`)**: Read and update custom regulatory rates (`brokerage_per_order`, `stt_rate_percent`, `nse_txn_rate_percent`, etc.).
- **Dropdown Manager (`/api/dropdown-options`)**: Read, toggle status, and create custom options across modules.
- **Module Visibility (`/api/module-visibility`)**: Persist which sidebar modules the user prefers to display or hide.
- **Document Exports (`/api/export/pdf`, `/api/export/csv`, `/api/export/excel`)**: Stream formatted PDFs, CSVs, and Excel files.
- **Backup & Restore (`/api/export/backup`, `/api/export/restore`)**: Snapshot and restore entire user portfolio.

---

## 4. Swift Concurrency Implementation Blueprint

```swift
import Foundation

public actor APIClient {
    public static let shared = APIClient()

    private let session: URLSession
    private let baseURL: URL

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30.0
        config.timeoutIntervalForResource = 300.0
        self.session = URLSession(configuration: config)
        self.baseURL = URL(string: "http://127.0.0.1:8000/api")!
    }

    public func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T {
        var urlRequest = endpoint.urlRequest(baseURL: baseURL)

        // Inject Bearer token from Keychain
        if let token = KeychainManager.shared.getToken() {
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        urlRequest.setValue("application/json", forHTTPHeaderField: "Accept")

        let (data, response) = try await session.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                await MainActor.run {
                    AuthViewModel.shared.handleUnauthorized()
                }
            }
            throw APIError.httpError(statusCode: httpResponse.statusCode, data: data)
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .useDefaultKeys
        return try decoder.decode(T.self, from: data)
    }
}
```
