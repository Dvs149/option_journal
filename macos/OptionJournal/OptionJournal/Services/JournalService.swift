import Foundation

@MainActor
public protocol JournalServiceProtocol: Sendable {
    func fetchJournal(
        page: Int,
        perPage: Int,
        strategy: String?,
        optionType: String?,
        outcome: String?,
        search: String?,
        hasMistakes: Bool?
    ) async throws -> JournalResponse
    
    func updateJournal(tradeId: Int, request: UpdateJournalRequest) async throws
}

public final class JournalService: JournalServiceProtocol {
    private let client: APIClient
    
    public init(client: APIClient) {
        self.client = client
    }
    
    public convenience init() {
        self.init(client: .shared)
    }
    
    public func fetchJournal(
        page: Int = 1,
        perPage: Int = 15,
        strategy: String? = nil,
        optionType: String? = nil,
        outcome: String? = nil,
        search: String? = nil,
        hasMistakes: Bool? = nil
    ) async throws -> JournalResponse {
        var params: [String: String] = [
            "page": String(page),
            "per_page": String(perPage)
        ]
        
        if let s = strategy, !s.isEmpty && s != "ALL" {
            params["strategy_name"] = s
        }
        if let o = optionType, !o.isEmpty && o != "ALL" {
            params["option_type"] = o
        }
        if let out = outcome, !out.isEmpty && out != "ALL" {
            params["outcome"] = out
        }
        if let q = search, !q.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            params["search"] = q
        }
        if let hm = hasMistakes, hm {
            params["has_mistakes"] = "1"
        }
        
        return try await client.request(
            endpoint: APIEndpoints.journal,
            method: .get,
            queryParams: params,
            requiresAuth: true
        )
    }
    
    public func updateJournal(tradeId: Int, request: UpdateJournalRequest) async throws {
        let _: GenericMessageResponse = try await client.request(
            endpoint: APIEndpoints.journalDetail(id: tradeId),
            method: .put,
            body: request,
            requiresAuth: true
        )
    }
}
