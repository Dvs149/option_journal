import Foundation
import Combine
import SwiftUI

public struct StrategyScatterPoint: Identifiable, Sendable {
    public let id = UUID()
    public let risk: Double
    public let reward: Double
}

@MainActor
public final class StrategyAnalysisViewModel: ObservableObject {
    @Published public var strategies: [StrategyPerformanceItem] = []
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var selectedTimeframe: String = "All"
    
    // Top 6 Metrics
    @Published public var totalStrategiesCount: Int = 1
    @Published public var mostProfitableName: String = "-"
    @Published public var mostProfitablePnl: Double = 0.0
    @Published public var highestWinRateName: String = "Long Straddle"
    @Published public var highestWinRateVal: Double = 44.8
    @Published public var bestRiskRewardName: String = "Long Straddle"
    @Published public var bestRiskRewardVal: String = "1 : 0.9"
    @Published public var mostTradedName: String = "Long Straddle"
    @Published public var mostTradedCount: Int = 954
    @Published public var leastProfitableName: String = "Long Straddle"
    @Published public var leastProfitablePnl: Double = -387387.0
    
    // Scatter Plot Points
    @Published public var scatterPoints: [StrategyScatterPoint] = []
    
    private let analyticsService: AnalyticsServiceProtocol
    
    public init(analyticsService: AnalyticsServiceProtocol) {
        self.analyticsService = analyticsService
        self.strategies = sampleStrategies()
        self.scatterPoints = sampleScatterPoints()
    }
    
    public convenience init() {
        self.init(analyticsService: AnalyticsService())
    }
    
    public func loadData() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let res = try await analyticsService.fetchStrategies()
            if !res.performance.isEmpty {
                self.strategies = res.performance
                self.totalStrategiesCount = res.performance.count
            }
            self.isLoading = false
        } catch {
            self.isLoading = false
        }
    }
    
    public func setTimeframe(_ tf: String) {
        self.selectedTimeframe = tf
        Task { await loadData() }
    }
    
    private func sampleStrategies() -> [StrategyPerformanceItem] {
        return [
            StrategyPerformanceItem(
                strategy: "Long Straddle",
                totalTrades: 954,
                winningTrades: 427,
                losingTrades: 527,
                winRate: 44.8,
                netPnl: -387387,
                avgProfit: 2708,
                avgLoss: 5525
            )
        ]
    }
    
    private func sampleScatterPoints() -> [StrategyScatterPoint] {
        return [
            StrategyScatterPoint(risk: 1000, reward: -500),
            StrategyScatterPoint(risk: 1500, reward: -1200),
            StrategyScatterPoint(risk: 2000, reward: -800),
            StrategyScatterPoint(risk: 2500, reward: 2200),
            StrategyScatterPoint(risk: 3000, reward: -1500),
            StrategyScatterPoint(risk: 3500, reward: 3100),
            StrategyScatterPoint(risk: 4000, reward: -3200),
            StrategyScatterPoint(risk: 4500, reward: 4500),
            StrategyScatterPoint(risk: 5000, reward: -4800),
            StrategyScatterPoint(risk: 5500, reward: 6000),
            StrategyScatterPoint(risk: 6000, reward: -6500),
            StrategyScatterPoint(risk: 7000, reward: 8200),
            StrategyScatterPoint(risk: 8000, reward: -9100),
            StrategyScatterPoint(risk: 10000, reward: 12500),
            StrategyScatterPoint(risk: 12000, reward: -13724),
            StrategyScatterPoint(risk: 15000, reward: 23610),
            StrategyScatterPoint(risk: 18000, reward: -28153),
            StrategyScatterPoint(risk: 22000, reward: -44216),
            StrategyScatterPoint(risk: 25000, reward: -69174)
        ]
    }
}
