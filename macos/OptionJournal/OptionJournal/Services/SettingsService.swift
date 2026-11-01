import Foundation

@MainActor
public protocol SettingsServiceProtocol: Sendable {
    func fetchDropdownOptions() async throws -> DropdownOptionsResponse
    func toggleOptionStatus(id: Int, isActive: Bool) async throws
}

public final class SettingsService: SettingsServiceProtocol {
    private let client: APIClient
    
    public init(client: APIClient) {
        self.client = client
    }
    
    public convenience init() {
        self.init(client: .shared)
    }
    
    public func fetchDropdownOptions() async throws -> DropdownOptionsResponse {
        return try await client.request(
            endpoint: APIEndpoints.dropdownOptions,
            method: .get,
            requiresAuth: true
        )
    }
    
    public func toggleOptionStatus(id: Int, isActive: Bool) async throws {
        let req = ToggleDropdownStatusRequest(isActive: isActive)
        let _: GenericMessageResponse = try await client.request(
            endpoint: APIEndpoints.dropdownOptionStatus(id: id),
            method: .put,
            body: req,
            requiresAuth: true
        )
    }
}
