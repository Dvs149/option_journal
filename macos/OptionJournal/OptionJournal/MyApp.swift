import SwiftUI
import Combine
import AppKit

@main
struct MyApp: App {
    @StateObject private var appState = AppState()
    @ObservedObject private var preferences = PreferencesManager.shared
    
    init() {
        setupApplicationIcon()
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .preferredColorScheme(preferences.appearance.colorScheme)
                .frame(minWidth: 900, minHeight: 600)
                .onAppear {
                    setupApplicationIcon()
                }
        }
        .windowStyle(.titleBar)
        .windowToolbarStyle(.unified(showsTitle: false))
    }
    
    @MainActor
    private func setupApplicationIcon() {
        // 1. Try bundled AppIcon.icns
        if let iconPath = Bundle.main.path(forResource: "AppIcon", ofType: "icns"),
           let iconImage = NSImage(contentsOfFile: iconPath) {
            NSApplication.shared.applicationIconImage = iconImage
            return
        }
        
        // 2. Render vector AppLogo at 512x512 (scale 2x = 1024x1024 Retina)
        let renderer = ImageRenderer(content: AppLogoView(size: 512, showShadow: false))
        renderer.scale = 2.0
        if let rendered = renderer.nsImage {
            NSApplication.shared.applicationIconImage = rendered
            return
        }
        
        // 3. Fallback to asset catalog
        if let assetImage = NSImage(named: "AppIcon") ?? NSImage(named: "app_logo_3x") {
            NSApplication.shared.applicationIconImage = assetImage
        }
    }
}
