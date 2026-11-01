import Foundation

@MainActor
public protocol AuthServiceProtocol: Sendable {
    func login(credentials: LoginRequest) async throws -> AuthResponse
    func fetchCurrentUser() async throws -> User
    func logout() async throws
}

public final class AuthService: AuthServiceProtocol {
    private let client: APIClient
    private let keychain: KeychainManager
    
    public init(client: APIClient = .shared, keychain: KeychainManager = .shared) {
        self.client = client
        self.keychain = keychain
    }
    
    public func login(credentials: LoginRequest) async throws -> AuthResponse {
        let response: AuthResponse = try await client.request(
            endpoint: APIEndpoints.login,
            method: .post,
            body: credentials,
            requiresAuth: false
        )
        _ = keychain.saveToken(response.token)
        return response
    }
    
    public func fetchCurrentUser() async throws -> User {
        let response: UserProfileResponse = try await client.request(
            endpoint: APIEndpoints.currentUser,
            method: .get,
            requiresAuth: true
        )
        return response.user
    }
    
    public func logout() async throws {
        let _: GenericMessageResponse = try await client.request(
            endpoint: APIEndpoints.logout,
            method: .post,
            requiresAuth: true
        )
        _ = keychain.deleteToken()
    }
}
