import Foundation

@MainActor
public protocol TradeServiceProtocol: Sendable {
    func fetchTrades(
        page: Int,
        perPage: Int,
        search: String?,
        indexName: String?,
        strategyName: String?,
        optionType: String?,
        tradingType: String?,
        sortBy: String?,
        sortOrder: String?
    ) async throws -> PaginatedTradesResponse
    
    func deleteTrade(id: Int) async throws
    func estimateCharges(payload: TradeEstimateRequest) async throws -> TradeEstimateResponse
    func createTrade(trade: CreateTradeRequest) async throws -> Trade
    func bulkImportTrades(trades: [BulkTradeItem]) async throws -> BulkImportResponse
}

public final class TradeService: TradeServiceProtocol {
    private let client: APIClient
    
    public init(client: APIClient = .shared) {
        self.client = client
    }
    
    public func estimateCharges(payload: TradeEstimateRequest) async throws -> TradeEstimateResponse {
        return try await client.request(
            endpoint: APIEndpoints.estimateCharges,
            method: .post,
            body: payload,
            requiresAuth: true
        )
    }
    
    public func createTrade(trade: CreateTradeRequest) async throws -> Trade {
        return try await client.request(
            endpoint: APIEndpoints.trades,
            method: .post,
            body: trade,
            requiresAuth: true
        )
    }
    
    public func bulkImportTrades(trades: [BulkTradeItem]) async throws -> BulkImportResponse {
        return try await client.request(
            endpoint: APIEndpoints.bulkTrades,
            method: .post,
            body: BulkImportRequest(trades: trades),
            requiresAuth: true
        )
    }
    
    public func fetchTrades(
        page: Int = 1,
        perPage: Int = 25,
        search: String? = nil,
        indexName: String? = nil,
        strategyName: String? = nil,
        optionType: String? = nil,
        tradingType: String? = nil,
        sortBy: String? = "trade_date",
        sortOrder: String? = "desc"
    ) async throws -> PaginatedTradesResponse {
        var params: [String: String] = [
            "page": "\(page)",
            "per_page": "\(perPage)"
        ]
        
        if let search = search, !search.trimmingCharacters(in: .whitespaces).isEmpty {
            params["search"] = search.trimmingCharacters(in: .whitespaces)
        }
        if let idx = indexName, idx != "ALL" {
            params["index_name"] = idx
        }
        if let strat = strategyName, strat != "ALL" {
            params["strategy_name"] = strat
        }
        if let opt = optionType, opt != "ALL" {
            params["option_type"] = opt
        }
        if let tradeType = tradingType, tradeType != "ALL" {
            params["trading_type"] = tradeType
        }
        if let sort = sortBy {
            params["sort_by"] = sort
        }
        if let order = sortOrder {
            params["sort_order"] = order
        }
        
        return try await client.request(
            endpoint: APIEndpoints.trades,
            method: .get,
            queryParams: params,
            requiresAuth: true
        )
    }
    
    public func deleteTrade(id: Int) async throws {
        let _: GenericMessageResponse = try await client.request(
            endpoint: APIEndpoints.trade(id: id),
            method: .delete,
            requiresAuth: true
        )
    }
}
