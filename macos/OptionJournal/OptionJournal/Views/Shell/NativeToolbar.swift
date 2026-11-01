import SwiftUI

public struct NativeToolbarModifier: ViewModifier {
    @EnvironmentObject private var appState: AppState
    @ObservedObject private var preferences = PreferencesManager.shared
    @Environment(\.colorScheme) private var colorScheme
    @Binding public var selection: String
    
    public init(selection: Binding<String>) {
        self._selection = selection
    }
    
    public func body(content: Content) -> some View {
        content
            .toolbar {
                // MARK: - Account Information Pill
                ToolbarItem(placement: .navigation) {
                    if let account = appState.currentUser?.defaultAccount {
                        HStack(spacing: 6) {
                            Circle()
                                .fill(KiteTheme.profitGreen)
                                .frame(width: 7, height: 7)
                            
                            Text(account.brokerName ?? "Broker")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                            
                            if let capital = account.initialCapital {
                                Text("•")
                                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                Text(CurrencyFormatter.formatCompact(amount: capital, isPrivacyMode: preferences.isPrivacyModeEnabled))
                                    .font(.system(size: 11, design: .monospaced))
                                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                            }
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(KiteTheme.surfaceElevated(for: colorScheme))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                        .overlay(
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
                        )
                    }
                }
                
                // MARK: - Privacy Mode Toggle
                ToolbarItem(placement: .automatic) {
                    HStack(spacing: 6) {
                        Text("Privacy")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        
                        Toggle("", isOn: $preferences.isPrivacyModeEnabled)
                            .kiteToggle()
                    }
                    .help("Mask financial figures and P&L numbers")
                }
                
                // MARK: - Appearance Switcher
                ToolbarItem(placement: .automatic) {
                    Menu {
                        ForEach(AppAppearance.allCases) { mode in
                            Button {
                                preferences.appearance = mode
                            } label: {
                                HStack {
                                    Text(mode.displayName)
                                    if preferences.appearance == mode {
                                        Image(systemName: "checkmark")
                                    }
                                }
                            }
                        }
                    } label: {
                        Image(systemName: preferences.appearance == .dark ? "moon.fill" : (preferences.appearance == .light ? "sun.max.fill" : "circle.righthalf.filled"))
                            .font(.system(size: 12))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    }
                    .menuStyle(.borderlessButton)
                    .help("Appearance Mode")
                }
                
                // MARK: - Quick Add Trade Button
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        selection = "add-trade"
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "plus")
                                .font(.system(size: 11, weight: .bold))
                            Text("Add Trade")
                                .font(.system(size: 11, weight: .semibold))
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(KiteTheme.brandBlue)
                        .foregroundColor(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                    .buttonStyle(.plain)
                    .keyboardShortcut("n", modifiers: .command)
                    .help("New Trade (⌘N)")
                }
            }
    }
}

public extension View {
    func nativeToolbar(selection: Binding<String>) -> some View {
        self.modifier(NativeToolbarModifier(selection: selection))
    }
}
