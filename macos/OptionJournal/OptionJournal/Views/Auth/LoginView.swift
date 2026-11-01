import SwiftUI

public struct LoginView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.colorScheme) private var colorScheme
    @StateObject private var viewModel = AuthViewModel()
    @FocusState private var focusedField: Field?
    
    enum Field: Hashable {
        case login
        case password
    }
    
    public init() {}
    
    public var body: some View {
        ZStack {
            KiteTheme.canvas(for: colorScheme)
                .ignoresSafeArea()
            
            VStack(spacing: 24) {
                // MARK: - Header
                VStack(spacing: 8) {
                    HStack(spacing: 12) {
                        AppLogoView(size: 38, showShadow: true)
                        
                        Text("OptionJournal")
                            .font(.system(size: 24, weight: .bold, design: .default))
                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    }
                    
                    Text("Native Trading Journal & Analytics Terminal")
                        .font(.system(size: 12, weight: .regular))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                }
                
                // MARK: - Login Card
                VStack(alignment: .leading, spacing: 16) {
                    Text("Login to Terminal")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Username or Email")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        
                        TextField("admin or user@example.com", text: $viewModel.loginInput)
                            .textFieldStyle(.plain)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 8)
                            .background(KiteTheme.surfaceElevated(for: colorScheme))
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                            .overlay(
                                RoundedRectangle(cornerRadius: 4)
                                    .stroke(focusedField == .login ? KiteTheme.brandBlue : KiteTheme.border(for: colorScheme), lineWidth: 1)
                            )
                            .focused($focusedField, equals: .login)
                            .onSubmit {
                                focusedField = .password
                            }
                    }
                    
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Password")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        
                        SecureField("••••••••", text: $viewModel.password)
                            .textFieldStyle(.plain)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 8)
                            .background(KiteTheme.surfaceElevated(for: colorScheme))
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                            .overlay(
                                RoundedRectangle(cornerRadius: 4)
                                    .stroke(focusedField == .password ? KiteTheme.brandBlue : KiteTheme.border(for: colorScheme), lineWidth: 1)
                            )
                            .focused($focusedField, equals: .password)
                            .onSubmit {
                                Task {
                                    await viewModel.performLogin(appState: appState)
                                }
                            }
                    }
                    
                    if let error = viewModel.errorMessage {
                        HStack(alignment: .top, spacing: 6) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 11))
                                .foregroundColor(KiteTheme.lossRed)
                            Text(error)
                                .font(.system(size: 11))
                                .foregroundColor(KiteTheme.lossRed)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .padding(.top, 2)
                    }
                    
                    Button(action: {
                        Task {
                            await viewModel.performLogin(appState: appState)
                        }
                    }) {
                        HStack {
                            Spacer()
                            if viewModel.isLoading {
                                ProgressView()
                                    .controlSize(.small)
                                    .colorInvert()
                            } else {
                                Text("Login")
                                    .font(.system(size: 13, weight: .semibold))
                            }
                            Spacer()
                        }
                        .frame(height: 20)
                    }
                    .kitePrimaryButton()
                    .disabled(viewModel.isLoading || !viewModel.isFormValid)
                    .padding(.top, 4)
                }
                .padding(24)
                .frame(width: 340)
                .kiteCard(cornerRadius: 6)
                
                // MARK: - Footer
                Text("Connected to Laravel 13 API Backend")
                    .font(.system(size: 11))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme).opacity(0.7))
            }
            .padding()
        }
        .onAppear {
            focusedField = .login
        }
    }
}
