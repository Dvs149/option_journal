import Foundation

@MainActor
public protocol AnalyticsServiceProtocol: Sendable {
    func fetchDashboardData(filter: String?, fromDate: String?, toDate: String?) async throws -> DashboardDataResponse
    func fetchCalendar(year: Int, month: Int) async throws -> CalendarResponse
    func fetchRisk() async throws -> RiskResponse
    func updateRiskLimits(limits: UpdateRiskLimitsRequest) async throws
    func fetchStrategies() async throws -> StrategyAnalysisResponse
    func fetchAdvancedAnalytics(filter: String?, fromDate: String?, toDate: String?) async throws -> AdvancedAnalyticsResponse
}

public final class AnalyticsService: AnalyticsServiceProtocol {
    private let client: APIClient
    
    public init(client: APIClient) {
        self.client = client
    }
    
    public convenience init() {
        self.init(client: .shared)
    }
    
    public func fetchDashboardData(filter: String? = "all", fromDate: String? = nil, toDate: String? = nil) async throws -> DashboardDataResponse {
        var params: [String: String] = [:]
        if let filter = filter {
            params["filter"] = filter
        }
        if let from = fromDate {
            params["from_date"] = from
        }
        if let to = toDate {
            params["to_date"] = to
        }
        
        return try await client.request(
            endpoint: APIEndpoints.dashboard,
            method: .get,
            queryParams: params.isEmpty ? nil : params,
            requiresAuth: true
        )
    }
    
    public func fetchCalendar(year: Int, month: Int) async throws -> CalendarResponse {
        let params: [String: String] = [
            "year": String(year),
            "month": String(month)
        ]
        
        return try await client.request(
            endpoint: APIEndpoints.calendar,
            method: .get,
            queryParams: params,
            requiresAuth: true
        )
    }
    
    public func fetchRisk() async throws -> RiskResponse {
        return try await client.request(
            endpoint: APIEndpoints.risk,
            method: .get,
            requiresAuth: true
        )
    }
    
    public func updateRiskLimits(limits: UpdateRiskLimitsRequest) async throws {
        let _: GenericMessageResponse = try await client.request(
            endpoint: APIEndpoints.riskLimits,
            method: .put,
            body: limits,
            requiresAuth: true
        )
    }
    
    public func fetchStrategies() async throws -> StrategyAnalysisResponse {
        return try await client.request(
            endpoint: APIEndpoints.strategies,
            method: .get,
            requiresAuth: true
        )
    }
    
    public func fetchAdvancedAnalytics(filter: String? = "all", fromDate: String? = nil, toDate: String? = nil) async throws -> AdvancedAnalyticsResponse {
        var params: [String: String] = [:]
        if let filter = filter {
            params["filter"] = filter
        }
        if let from = fromDate {
            params["from_date"] = from
        }
        if let to = toDate {
            params["to_date"] = to
        }
        
        return try await client.request(
            endpoint: APIEndpoints.analytics,
            method: .get,
            queryParams: params.isEmpty ? nil : params,
            requiresAuth: true
        )
    }
}
