# Build & Release Guide — OptionJournal macOS

This document describes the configuration, sandboxing, signing, notarization, packaging, and distribution pipelines for the native OptionJournal macOS application.

---

## 1. Build Configurations & Architectures

OptionJournal supports macOS 14.0+ (Sonoma) and macOS 15.0+ (Sequoia) as a **Universal 2** binary (`arm64` and `x86_64`).

### Build Configurations
- **Debug**:
  - Swift Optimization Level: `-Onone`
  - Compilation Mode: Single File / Incremental
  - Logging: Detailed HTTP traffic and debug diagnostics enabled
  - Server Base URL: `http://127.0.0.1:8000/api`
- **Release**:
  - Swift Optimization Level: `-O` (Whole Module Optimization)
  - Compilation Mode: Whole Module
  - Hardened Runtime: Enabled
  - Server Base URL: Production API endpoint (configurable via User Defaults or environment)

---

## 2. App Sandbox & Entitlements

OptionJournal adheres to Apple App Sandbox security requirements. Entitlements are declared in `OptionJournal.entitlements`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- App Sandbox Enforced -->
    <key>com.apple.security.app-sandbox</key>
    <true/>

    <!-- Outgoing Network Connections for Laravel API Access -->
    <key>com.apple.security.network.client</key>
    <true/>

    <!-- User Selected File Read/Write (CSV, Excel, PDF Export & Tradebook Import) -->
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>

    <!-- Keychain Access for Sanctum Token Storage -->
    <key>keychain-access-groups</key>
    <array>
        <string>$(AppIdentifierPrefix)com.optionjournal.macos</string>
    </array>
</dict>
</plist>
```

---

## 3. Code Signing & Hardened Runtime

To distribute outside the Mac App Store (Direct Distribution) or through TestFlight/Mac App Store:

### Required Certificates
1. **Developer ID Application**: Signs the binary for Gatekeeper compatibility.
2. **Developer ID Installer**: Signs `.pkg` distribution packages (if distributing via PKG).
3. **Apple Distribution**: Used for Mac App Store submission.

### Signing via Xcode CLI
```bash
# Archive the project
xcodebuild archive \
  -project macos/OptionJournal/OptionJournal.xcodeproj \
  -scheme OptionJournal \
  -configuration Release \
  -archivePath ./build/OptionJournal.xcarchive

# Export signed app
xcodebuild -exportArchive \
  -archivePath ./build/OptionJournal.xcarchive \
  -exportPath ./build/Export \
  -exportOptionsPlist macos/ExportOptions.plist
```

---

## 4. Apple Notarization (Direct Distribution)

All macOS apps distributed outside the Mac App Store must be notarized by Apple to pass Gatekeeper checks without security warnings.

### Submitting for Notarization with `notarytool`
```bash
# Store App Store Connect credentials in Keychain
xcrun notarytool store-credentials "AC_PASSWORD" \
  --apple-id "developer@optionjournal.com" \
  --team-id "TEAM_ID_HERE" \
  --password "app-specific-password"

# Submit zip or dmg for notarization
xcrun notarytool submit ./build/OptionJournal.dmg \
  --keychain-profile "AC_PASSWORD" \
  --wait

# Staple notarization ticket to DMG
xcrun stapler staple ./build/OptionJournal.dmg
```

---

## 5. DMG Packaging

To create a professional macOS installation DMG with drag-to-Applications layout:

```bash
# Using standard macOS hdiutil or create-dmg
create-dmg \
  --volname "OptionJournal Installer" \
  --volicon "macos/OptionJournal/Assets.xcassets/AppIcon.appiconset/icon_512x512.png" \
  --window-pos 200 120 \
  --window-size 660 400 \
  --icon-size 128 \
  --icon "OptionJournal.app" 180 170 \
  --hide-extension "OptionJournal.app" \
  --app-drop-link 480 170 \
  "build/OptionJournal-Installer.dmg" \
  "build/Export/OptionJournal.app"
```

---

## 6. Release Checklist

- [ ] Ensure all automated tests pass (`xcodebuild test`).
- [ ] Confirm backend API version compatibility with Laravel 13 `/api/health`.
- [ ] Verify App Sandbox entitlements are minimal and correctly configured.
- [ ] Update `CFBundleShortVersionString` (e.g., `1.0.0`) and `CFBundleVersion` (build number).
- [ ] Test Clean-Install on a fresh macOS user profile:
  - Login authentication against local/remote Laravel backend.
  - Keychain persistence of Sanctum token across application relaunch.
  - Table scrolling and data density performance with 1,000+ trade records.
  - CSV / XLSX / PDF export saving via macOS `NSSavePanel`.
  - Chart rendering in both Dark Mode and Light Mode.
- [ ] Notarize and staple DMG.
- [ ] Publish release binaries with SHA-256 checksums.
