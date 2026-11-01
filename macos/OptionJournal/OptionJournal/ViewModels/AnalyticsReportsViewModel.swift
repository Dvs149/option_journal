import Foundation
import Combine
import SwiftUI

@MainActor
public final class AnalyticsReportsViewModel: ObservableObject {
    @Published public var data: AdvancedAnalyticsResponse? = nil
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var selectedFilter: String = "all"
    
    private let analyticsService: AnalyticsServiceProtocol
    
    public init(analyticsService: AnalyticsServiceProtocol) {
        self.analyticsService = analyticsService
    }
    
    public convenience init() {
        self.init(analyticsService: AnalyticsService())
    }
    
    public func loadData() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let res = try await analyticsService.fetchAdvancedAnalytics(
                filter: selectedFilter,
                fromDate: nil,
                toDate: nil
            )
            self.data = res
            self.isLoading = false
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
        }
    }
    
    public func setFilter(_ filter: String) {
        guard selectedFilter != filter else { return }
        selectedFilter = filter
        Task {
            await loadData()
        }
    }
}
