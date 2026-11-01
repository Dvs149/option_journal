import SwiftUI

public struct SettingsView: View {
    @EnvironmentObject private var appState: AppState
    @ObservedObject private var preferences = PreferencesManager.shared
    @Environment(\.colorScheme) private var colorScheme
    @State private var apiBaseURL: String = APIEndpoints.baseURL
    
    public init() {}
    
    public var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                VStack(alignment: .leading, spacing: 2) {
                    Text("Settings")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    Text("Terminal preferences, broker account details, and API configuration")
                        .font(.system(size: 12))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                }
                
                // Appearance Section
                VStack(alignment: .leading, spacing: 14) {
                    Text("Appearance")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    
                    Picker("Theme Mode", selection: $preferences.appearance) {
                        ForEach(AppAppearance.allCases) { mode in
                            Text(mode.displayName).tag(mode)
                        }
                    }
                    .pickerStyle(.segmented)
                    
                    Toggle("Privacy Mode (Mask P&L values)", isOn: $preferences.isPrivacyModeEnabled)
                        .kiteToggle()
                }
                .padding(16)
                .kiteCard()
                
                // User & Broker Profile Section
                if let user = appState.currentUser {
                    VStack(alignment: .leading, spacing: 14) {
                        Text("Trader Profile")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                        
                        HStack(spacing: 40) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Full Name")
                                    .font(.system(size: 11))
                                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                Text(user.name)
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                            }
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Email")
                                    .font(.system(size: 11))
                                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                Text(user.email)
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                            }
                            
                            if let username = user.username {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Username")
                                        .font(.system(size: 11))
                                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                    Text(username)
                                        .font(.system(size: 13, weight: .medium))
                                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                                }
                            }
                        }
                        
                        if let account = user.defaultAccount {
                            Divider()
                                .background(KiteTheme.border(for: colorScheme))
                            
                            HStack(spacing: 40) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Primary Broker")
                                        .font(.system(size: 11))
                                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                    Text(account.brokerName ?? "Zerodha")
                                        .font(.system(size: 13, weight: .medium))
                                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                                }
                                
                                if let cap = account.initialCapital {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Initial Capital")
                                            .font(.system(size: 11))
                                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                        Text(CurrencyFormatter.format(amount: cap, includeSign: false))
                                            .font(.system(size: 13, weight: .medium, design: .monospaced))
                                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                                    }
                                }
                            }
                        }
                    }
                    .padding(16)
                    .kiteCard()
                }
                
                // Backend API URL Configuration
                VStack(alignment: .leading, spacing: 14) {
                    Text("Backend Connection")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Laravel 13 API Base URL")
                            .font(.system(size: 11))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        
                        HStack {
                            TextField("http://127.0.0.1:8000/api", text: $apiBaseURL)
                                .textFieldStyle(.plain)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 7)
                                .background(KiteTheme.surfaceElevated(for: colorScheme))
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 4)
                                        .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
                                )
                            
                            Button("Save") {
                                UserDefaults.standard.set(apiBaseURL, forKey: "custom_api_base_url")
                            }
                            .kitePrimaryButton()
                        }
                    }
                }
                .padding(16)
                .kiteCard()
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .background(KiteTheme.canvas(for: colorScheme))
    }
}
