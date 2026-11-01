# macOS Development Guide — OptionJournal

This document provides developer guidelines, environment setup instructions, architecture standards, and workflow practices for engineering the native macOS OptionJournal application.

---

## 1. Prerequisites & Environment Setup

### Required Tools
- **macOS**: Sonoma (14.0+) or Sequoia (15.0+)
- **Xcode**: Version 16.0 or higher
- **Swift**: Version 5.9 / 6.0 with Swift Concurrency
- **Command Line Tools**: `xcode-select --install`
- **Backend Service**: Local PHP 8.3+ with Laravel 13 and MySQL 8.0 running on `http://127.0.0.1:8000`

### Initializing the Project
1. Open the project in Xcode:
   ```bash
   open macos/OptionJournal/OptionJournal.xcodeproj
   ```
2. Verify Target Settings:
   - **Target**: `OptionJournal`
   - **Supported Platforms**: macOS
   - **Deployment Target**: macOS 14.0+
   - **Bundle Identifier**: `com.optionjournal.macos`
   - **Signing & Capabilities**: Development Team selected, App Sandbox enabled.

3. Verify Backend Service:
   - Ensure Laravel backend is running:
     ```bash
     cd backend && php artisan serve --host=127.0.0.1 --port=8000
     ```
   - Test connectivity:
     ```bash
     curl -s http://127.0.0.1:8000/api/health | jq .
     ```

---

## 2. Architecture & Code Conventions

### MVVM Pattern Rules
1. **Views (`SwiftUI`)**:
   - Strictly declarative UI code.
   - Do **not** make network calls directly inside views or handlers.
   - Bind to `@StateObject` or `@ObservedObject` ViewModels.
   - Extract reusable components into `Core/Components/` (e.g., `KiteMetricCard`, `KiteStatusBadge`, `CompactTable`).

2. **ViewModels (`@MainActor class ObservableObject`)**:
   - Manage presentation logic, form validation, filter state, and async data loading.
   - All ViewModels must be annotated with `@MainActor`.
   - Maintain state properties (`@Published var state: ViewState = .idle`).
   - Catch and handle errors gracefully, translating network errors into user-friendly diagnostic messages.

3. **Services (`Actor` or `Sendable class`)**:
   - Manage business communication with Laravel REST endpoints via `APIClient`.
   - Service methods are `async throws -> Model`.
   - Thread-safe and decoupled from UI lifecycles.

4. **Network & Keychain Layers**:
   - `APIClient` executes standard `URLSession` calls with `JSONDecoder` (`convertFromSnakeCase`).
   - `KeychainManager` wraps Apple `Security.framework` for secure storage of Sanctum bearer tokens.

---

## 3. Swift Concurrency & Best Practices

- **Strict Concurrency**: The project compiles with Swift Concurrency warnings treated with high priority.
- **Data Isolation**: Model types conform to `Sendable`, `Identifiable`, `Codable`, and `Hashable`.
- **Background Tasks**: All network decodes and heavy computations occur off the main thread; ViewModels update state on `@MainActor`.
- **Cancellation**: SwiftUI `.task(id:)` modifier is preferred for automatic task cancellation when views disappear or filter parameters change.

```swift
// Example ViewModel lifecycle
@MainActor
final class TradesViewModel: ObservableObject {
    @Published private(set) var trades: [TradeItem] = []
    @Published private(set) var isLoading: Bool = false
    @Published var errorMessage: String?

    private let tradeService: TradeServiceProtocol

    init(tradeService: TradeServiceProtocol = TradeService()) {
        self.tradeService = tradeService
    }

    func loadTrades(page: Int = 1) async {
        isLoading = true
        errorMessage = nil
        do {
            let response = try await tradeService.fetchTrades(page: page)
            self.trades = response.trades
        } catch {
            self.errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
```

---

## 4. UI Design System Guidelines (Zerodha Kite Dark Theme)

When styling SwiftUI views, adhere strictly to the tokens defined in `KiteTheme.swift`:

| Element | Dark Mode Token | Value |
|---|---|---|
| Background Canvas | `KiteTheme.canvasDark` | `#191919` |
| Surface / Cards | `KiteTheme.surfaceDark` | `#1E1E1E` |
| Secondary Surface | `KiteTheme.surfaceDarkElevated`| `#252525` |
| Primary Text | `KiteTheme.textPrimaryDark` | `#E0E0E0` |
| Secondary Text | `KiteTheme.textSecondaryDark` | `#9E9E9E` |
| Accent / Brand | `KiteTheme.brandBlue` | `#387ED1` |
| Active Highlight | `KiteTheme.brandOrange` | `#FF5722` |
| Profit Value | `KiteTheme.profitGreen` | `#4CAF50` |
| Loss Value | `KiteTheme.lossRed` | `#DF514C` |
| Subtle Border | `KiteTheme.borderDark` | `#2D2D2D` |

### Styling Conventions
- **No Drop Shadows**: Use crisp 1px borders (`#2D2D2D`) instead of drop shadows.
- **Numbers & Monospace**: Always apply `.monospacedDigit()` to currency figures, quantities, strikes, and percentages to prevent horizontal layout jiggle during live updates.
- **Interactive State**: Active tabs, selected sidebar items, and toggled controls should display orange (`#FF5722`) text/icons without aggressive background hover blurs.

---

## 5. Local Networking & App Transport Security (ATS)

In local development, the app connects to `http://127.0.0.1:8000` (unencrypted HTTP).
The Xcode project `Info.plist` must include:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsLocalNetworking</key>
    <true/>
</dict>
```

In production, HTTPS is enforced automatically by default ATS rules.

---

## 6. Testing Strategy

### Unit Tests
- `OptionJournalTests`:
  - Test DTO JSON parsing from sample Laravel backend payloads.
  - Test `KeychainManager` saving, reading, and clearing tokens.
  - Test ViewModels using mock services implementing service protocols (`MockTradeService`, `MockAuthService`).

### UI Tests
- `OptionJournalUITests`:
  - Launch flow: Login -> Dashboard navigation.
  - Trade creation form verification.
  - Export dialog invocation.

---

## 7. Recommended Daily Workflow

1. Start Laravel backend: `php artisan serve --port=8000`
2. Open `OptionJournal.xcodeproj` in Xcode 16.
3. Select Scheme: `OptionJournal > My Mac`.
4. Press `Cmd + R` to build and run.
5. Use Xcode Console (`Cmd + Shift + C`) to inspect network logs and state transitions.
