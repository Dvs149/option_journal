import SwiftUI
import Combine

@MainActor
public final class DashboardViewModel: ObservableObject {
    @Published public var stats: DashboardStats?
    @Published public var recentTrades: [RecentTradeItem] = []
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String?
    @Published public var selectedFilter: String = "all"
    
    private let analyticsService: AnalyticsServiceProtocol
    
    public init(analyticsService: AnalyticsServiceProtocol) {
        self.analyticsService = analyticsService
    }
    
    public convenience init() {
        self.init(analyticsService: AnalyticsService())
    }
    
    public func loadDashboard() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let response = try await analyticsService.fetchDashboardData(filter: selectedFilter, fromDate: nil, toDate: nil)
            self.stats = response.stats
            self.recentTrades = response.recentTrades ?? []
        } catch let netErr as NetworkError {
            self.errorMessage = netErr.localizedDescription
        } catch {
            self.errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
}
