import SwiftUI
import Combine

@main
struct MyApp: App {
    @StateObject private var appState = AppState()
    @ObservedObject private var preferences = PreferencesManager.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .preferredColorScheme(preferences.appearance.colorScheme)
                .frame(minWidth: 900, minHeight: 600)
        }
        .windowStyle(.titleBar)
        .windowToolbarStyle(.unified(showsTitle: false))
    }
}
