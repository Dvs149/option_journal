import Foundation
import Combine
import SwiftUI

@MainActor
public final class EquityCurveViewModel: ObservableObject {
    @Published public var points: [EquityPoint] = []
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var selectedTimeframe: String = "all"
    @Published public var hoveredPoint: EquityPoint? = nil
    
    // Summary KPI metrics derived from points
    @Published public var currentNetPnl: Double = 0.0
    @Published public var peakPnl: Double = 0.0
    @Published public var maxDrawdown: Double = 0.0
    @Published public var totalPointsCount: Int = 0
    
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
            let res = try await analyticsService.fetchDashboardData(
                filter: selectedTimeframe,
                fromDate: nil,
                toDate: nil
            )
            
            let rawPoints = res.equityCurveData ?? []
            self.points = rawPoints
            self.totalPointsCount = rawPoints.count
            
            // Calculate summary values
            if let last = rawPoints.last {
                self.currentNetPnl = last.cumulativePnl ?? 0.0
            } else {
                self.currentNetPnl = 0.0
            }
            
            let peaks = rawPoints.compactMap { $0.peak }
            self.peakPnl = peaks.max() ?? 0.0
            
            let drawdowns = rawPoints.compactMap { $0.drawdown }
            self.maxDrawdown = drawdowns.max() ?? 0.0
            
            isLoading = false
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
        }
    }
    
    public func setTimeframe(_ timeframe: String) {
        guard selectedTimeframe != timeframe else { return }
        selectedTimeframe = timeframe
        Task {
            await loadData()
        }
    }
}
