import SwiftUI
import Combine

@MainActor
public final class AppState: ObservableObject {
    @Published public var currentUser: User?
    @Published public var isAuthenticated: Bool = false
    @Published public var isInitialLoading: Bool = true
    @Published public var selectedTab: String = "dashboard"
    @Published public var isPrivacyMode: Bool = false
    @Published public var globalError: String?
    
    private let authService: AuthServiceProtocol
    private let keychain: KeychainManager
    
    public init(authService: AuthServiceProtocol, keychain: KeychainManager = .shared) {
        self.authService = authService
        self.keychain = keychain
        
        // Initial token check
        if keychain.getToken() != nil {
            self.isAuthenticated = true
        }
    }
    
    public convenience init() {
        self.init(authService: AuthService(), keychain: .shared)
    }
    
    public func bootstrap() async {
        isInitialLoading = true
        defer { isInitialLoading = false }
        
        guard keychain.getToken() != nil else {
            isAuthenticated = false
            currentUser = nil
            return
        }
        
        do {
            let user = try await authService.fetchCurrentUser()
            self.currentUser = user
            self.isAuthenticated = true
        } catch {
            // Token was invalid or expired
            _ = keychain.deleteToken()
            self.isAuthenticated = false
            self.currentUser = nil
        }
    }
    
    public func didLogin(user: User) {
        self.currentUser = user
        self.isAuthenticated = true
        self.globalError = nil
    }
    
    public func logout() async {
        do {
            try await authService.logout()
        } catch {
            // Proceed with local logout regardless of network error
            _ = keychain.deleteToken()
        }
        self.currentUser = nil
        self.isAuthenticated = false
    }
}
