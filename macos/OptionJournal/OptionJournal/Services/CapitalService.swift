import Foundation

@MainActor
public protocol CapitalServiceProtocol: Sendable {
    func fetchCapitalData() async throws -> CapitalResponse
    func addTransaction(request: CreateTransactionRequest) async throws
    func deleteTransaction(id: Int) async throws
}

public final class CapitalService: CapitalServiceProtocol {
    private let client: APIClient
    
    public init(client: APIClient) {
        self.client = client
    }
    
    public convenience init() {
        self.init(client: .shared)
    }
    
    public func fetchCapitalData() async throws -> CapitalResponse {
        return try await client.request(
            endpoint: APIEndpoints.capital,
            method: .get,
            requiresAuth: true
        )
    }
    
    public func addTransaction(request: CreateTransactionRequest) async throws {
        let _: GenericMessageResponse = try await client.request(
            endpoint: APIEndpoints.capitalTransactions,
            method: .post,
            body: request,
            requiresAuth: true
        )
    }
    
    public func deleteTransaction(id: Int) async throws {
        let _: GenericMessageResponse = try await client.request(
            endpoint: APIEndpoints.capitalTransaction(id: id),
            method: .delete,
            requiresAuth: true
        )
    }
}
