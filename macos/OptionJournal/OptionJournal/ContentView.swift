import SwiftUI

public struct ContentView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.colorScheme) private var colorScheme
    
    public var body: some View {
        Group {
            if appState.isInitialLoading {
                ZStack {
                    KiteTheme.canvas(for: colorScheme)
                        .ignoresSafeArea()
                    
                    VStack(spacing: 12) {
                        ProgressView()
                            .controlSize(.regular)
                        Text("Connecting to OptionJournal...")
                            .font(.system(size: 12))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    }
                }
            } else if !appState.isAuthenticated {
                LoginView()
            } else {
                MainSplitView()
            }
        }
        .task {
            await appState.bootstrap()
        }
    }
}
