import Foundation
import Combine
import SwiftUI

public enum StrategySortCriteria: String, CaseIterable, Identifiable, Sendable {
    case pnl = "Net P&L"
    case winRate = "Win Rate"
    case totalTrades = "Total Trades"
    
    public var id: String { rawValue }
}

@MainActor
public final class StrategyAnalysisViewModel: ObservableObject {
    @Published public var strategies: [StrategyPerformanceItem] = []
    @Published public var bestPerforming: StrategyPerformanceItem? = nil
    @Published public var worstPerforming: StrategyPerformanceItem? = nil
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var sortCriteria: StrategySortCriteria = .pnl
    @Published public var searchText: String = ""
    
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
            let res = try await analyticsService.fetchStrategies()
            self.strategies = res.performance
            self.bestPerforming = res.bestPerforming
            self.worstPerforming = res.worstPerforming
            self.isLoading = false
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
        }
    }
    
    public var displayedStrategies: [StrategyPerformanceItem] {
        var list = strategies
        if !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            list = list.filter {
                $0.strategy.localizedCaseInsensitiveContains(searchText)
            }
        }
        
        switch sortCriteria {
        case .pnl:
            return list.sorted { ($0.netPnl ?? 0) > ($1.netPnl ?? 0) }
        case .winRate:
            return list.sorted { ($0.winRate ?? 0) > ($1.winRate ?? 0) }
        case .totalTrades:
            return list.sorted { $0.totalTrades > $1.totalTrades }
        }
    }
}
