# OptionJournal for macOS — Native Trading Terminal

**OptionJournal for macOS** is a high-performance, native macOS desktop application built with **Swift** and **SwiftUI**. Designed specifically for active Indian derivative (Futures & Options) traders, it communicates seamlessly with the centralized **Laravel REST API** backend and **MySQL** database, providing a fast, focused trading journal experience.

Inspired by the clean, minimal aesthetic of the **Zerodha Kite** trading terminal, OptionJournal for macOS prioritizes high-density data visualization, native SF Pro typography, financial P&L indicators, responsive charts, and fluid macOS window management.

---

## Key Highlights

- **100% Native Swift & SwiftUI**: Zero WebViews, zero Electron, zero React Native overhead. Pure macOS AppKit & SwiftUI execution.
- **Architectural Foundation**: Clean MVVM (Model-View-ViewModel) architecture utilizing modern **Swift Concurrency** (`async`/`await`, Actors) and **URLSession**.
- **Secure Credential Storage**: Apple Keychain Services (`Security.framework`) securely stores and manages Laravel Sanctum Bearer tokens and login credentials.
- **Unified Single Source of Truth**: Connects directly to the existing Laravel REST backend. All calculations, statutory charges, analytics, and trade persistence remain centralized.
- **Trading-Terminal UI**: Dark Mode-first trading terminal design with custom Kite-inspired color tokens, compact tables, side inspector drawers, and Swift Charts.
- **Multi-leg & Single-leg Options**: Complete support for CE (Calls), PE (Puts), and multi-leg simultaneous positions (Straddles, Strangles) across NIFTY, BANKNIFTY, FINNIFTY, MIDCPNIFTY, and SENSEX.

---

## System Requirements

| Specification | Requirement |
|---|---|
| **Operating System** | macOS 14.0 (Sonoma) or macOS 15.0+ (Sequoia) |
| **Architecture** | Apple Silicon (M1/M2/M3/M4) and Intel (x86_64) |
| **IDE / Toolchain** | Xcode 16.0+ |
| **Swift Version** | Swift 6.0 / 5.10 |
| **Backend Dependency**| TradeJournal Laravel REST API (`backend/`) running on `http://127.0.0.1:8000/api` |
| **Database** | MySQL 8.x (`option_journal`) |

---

## Project Structure at a Glance

```
macos/
├── OptionJournal/
│   ├── OptionJournal.xcodeproj             # Xcode Project configuration
│   └── OptionJournal/
│       ├── App/                            # @main entry point and AppEnvironment
│       ├── Core/                           # Networking, Keychain, Constants, Theme
│       ├── Models/                         # Swift Decodable/Encodable data models
│       ├── ViewModels/                     # @Observable MVVM ViewModels
│       ├── Views/                          # Native SwiftUI modular screens
│       └── Resources/                      # Asset catalogs, App Icons, Entitlements
├── README.md                               # Project overview and quick start
├── ARCHITECTURE.md                         # Technical architecture and patterns
├── API_INTEGRATION.md                      # Backend API mapping and contracts
├── FEATURE_MAPPING.md                      # Complete React to macOS feature matrix
├── DEVELOPMENT.md                          # Local development and debugging guide
└── BUILD_AND_RELEASE.md                    # Compilation, signing, and DMG distribution
```

---

## Quick Start (Running Locally)

### 1. Ensure Backend is Running
Before launching the macOS application, verify that the Laravel backend server is operational:
```bash
cd backend
php artisan serve --port=8000
```
Verify connectivity:
```bash
curl http://127.0.0.1:8000/api/ping
# Output: {"status":"ok","app":"TradeJournal API"}
```

### 2. Open Project in Xcode
Double-click `macos/OptionJournal/OptionJournal.xcodeproj` or run:
```bash
open macos/OptionJournal/OptionJournal.xcodeproj
```

### 3. Build & Run
1. Select the **OptionJournal** scheme and target **My Mac**.
2. Press `⌘R` (Product → Run).
3. The native application window will launch, presenting the authentication login dialog or the main terminal split-view.

---

## Documentation Directory

For in-depth specifications, refer to the accompanying engineering documents:
- [`ARCHITECTURE.md`](ARCHITECTURE.md): Complete architecture, MVVM design, and data flow.
- [`API_INTEGRATION.md`](API_INTEGRATION.md): Endpoint inventory, authentication contracts, and payloads.
- [`FEATURE_MAPPING.md`](FEATURE_MAPPING.md): Detailed comparison matrix between React SPA and macOS app.
- [`DEVELOPMENT.md`](DEVELOPMENT.md): Coding guidelines, Swift concurrency conventions, and testing tips.
- [`BUILD_AND_RELEASE.md`](BUILD_AND_RELEASE.md): Signing, Hardened Runtime, and packaging procedures.
