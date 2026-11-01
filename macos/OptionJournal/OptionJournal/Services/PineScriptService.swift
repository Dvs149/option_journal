import Foundation

@MainActor
public protocol PineScriptServiceProtocol: Sendable {
    func fetchScripts(search: String?, scriptType: String?, isFavorite: Bool?) async throws -> PineScriptResponse
    func createScript(request: CreatePineScriptRequest) async throws
    func updateScript(id: Int, request: CreatePineScriptRequest) async throws
    func deleteScript(id: Int) async throws
    func toggleFavorite(id: Int) async throws
    func duplicateScript(id: Int) async throws
}

public final class PineScriptService: PineScriptServiceProtocol {
    private let client: APIClient
    
    public init(client: APIClient) {
        self.client = client
    }
    
    public convenience init() {
        self.init(client: .shared)
    }
    
    public func fetchScripts(search: String? = nil, scriptType: String? = nil, isFavorite: Bool? = nil) async throws -> PineScriptResponse {
        var params: [String: String] = [:]
        if let s = search, !s.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            params["search"] = s
        }
        if let t = scriptType, !t.isEmpty && t != "ALL" {
            params["script_type"] = t
        }
        if let fav = isFavorite, fav {
            params["is_favorite"] = "1"
        }
        
        return try await client.request(
            endpoint: APIEndpoints.pineScripts,
            method: .get,
            queryParams: params.isEmpty ? nil : params,
            requiresAuth: true
        )
    }
    
    public func createScript(request: CreatePineScriptRequest) async throws {
        let _: GenericMessageResponse = try await client.request(
            endpoint: APIEndpoints.pineScripts,
            method: .post,
            body: request,
            requiresAuth: true
        )
    }
    
    public func updateScript(id: Int, request: CreatePineScriptRequest) async throws {
        let _: GenericMessageResponse = try await client.request(
            endpoint: APIEndpoints.pineScript(id: id),
            method: .put,
            body: request,
            requiresAuth: true
        )
    }
    
    public func deleteScript(id: Int) async throws {
        let _: GenericMessageResponse = try await client.request(
            endpoint: APIEndpoints.pineScript(id: id),
            method: .delete,
            requiresAuth: true
        )
    }
    
    public func toggleFavorite(id: Int) async throws {
        let _: GenericMessageResponse = try await client.request(
            endpoint: APIEndpoints.pineScriptFavorite(id: id),
            method: .post,
            requiresAuth: true
        )
    }
    
    public func duplicateScript(id: Int) async throws {
        let _: GenericMessageResponse = try await client.request(
            endpoint: APIEndpoints.pineScriptDuplicate(id: id),
            method: .post,
            requiresAuth: true
        )
    }
}
