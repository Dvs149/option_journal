import SwiftUI
import Combine

@MainActor
public final class AuthViewModel: ObservableObject {
    @Published public var loginInput: String = ""
    @Published public var password: String = ""
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String?
    
    private let authService: AuthServiceProtocol
    
    public init(authService: AuthServiceProtocol) {
        self.authService = authService
    }
    
    public convenience init() {
        self.init(authService: AuthService())
    }
    
    public var isFormValid: Bool {
        !loginInput.trimmingCharacters(in: .whitespaces).isEmpty &&
        !password.isEmpty
    }
    
    public func performLogin(appState: AppState) async -> Bool {
        guard isFormValid else {
            errorMessage = "Please enter both login/email and password."
            return false
        }
        
        isLoading = true
        errorMessage = nil
        
        let request = LoginRequest(
            login: loginInput.trimmingCharacters(in: .whitespaces),
            password: password
        )
        
        do {
            let response = try await authService.login(credentials: request)
            appState.didLogin(user: response.user)
            isLoading = false
            return true
        } catch let networkError as NetworkError {
            self.errorMessage = networkError.localizedDescription
            isLoading = false
            return false
        } catch {
            self.errorMessage = error.localizedDescription
            isLoading = false
            return false
        }
    }
}
