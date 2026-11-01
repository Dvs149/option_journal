import Foundation
import Combine
import SwiftUI

public struct MonthlySummaryRow: Identifiable, Sendable {
    public let id = UUID()
    public let month: String
    public let trades: Int
    public let winRate: Double
    public let netPnl: Double
    public let profitFactor: Double
    public let maxDd: Double
}

public struct DailyBarItem: Identifiable, Sendable {
    public let id = UUID()
    public let date: String
    public let pnl: Double
}

@MainActor
public final class AnalyticsReportsViewModel: ObservableObject {
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var selectedFilter: String = "All"
    @Published public var activeNavTab: String = "Overview" // "Overview", "Detailed Reports", "Custom Reports", "Export Data"
    @Published public var pnlPeriod: String = "Daily" // "Daily", "Weekly", "Monthly", "Yearly"
    @Published public var distributionTab: String = "By Index" // "By Type", "By Index", "By Strategy", "By Expiry"
    @Published public var durationTab: String = "By Holding Time" // "By Holding Time", "By Time of Day"
    
    // Top 7 Metrics
    @Published public var totalNetProfit: Double = -387387.0
    @Published public var totalTrades: Int = 954
    @Published public var winRate: Double = 44.8
    @Published public var profitFactor: Double = 0.8
    @Published public var expectancy: Double = 0.0
    @Published public var maxDrawdown: Double = 400628.0
    @Published public var sharpeRatio: Double = 0.0
    
    // Report export checkboxes
    @Published public var checkSummary: Bool = true
    @Published public var checkHistory: Bool = true
    @Published public var checkStrategy: Bool = false
    @Published public var checkRisk: Bool = false
    @Published public var checkMonthly: Bool = false
    @Published public var checkTax: Bool = false
    @Published public var checkCustom: Bool = false
    
    // Monthly Summary Rows
    @Published public var monthlyRows: [MonthlySummaryRow] = [
        MonthlySummaryRow(month: "Jan", trades: 1, winRate: 0, netPnl: 0, profitFactor: 1.0, maxDd: 0),
        MonthlySummaryRow(month: "Feb", trades: 1, winRate: 0, netPnl: 0, profitFactor: 1.0, maxDd: 0),
        MonthlySummaryRow(month: "Mar", trades: 1, winRate: 0, netPnl: 0, profitFactor: 1.0, maxDd: 0),
        MonthlySummaryRow(month: "Apr", trades: 1, winRate: 0, netPnl: 0, profitFactor: 1.0, maxDd: 0),
        MonthlySummaryRow(month: "May", trades: 1, winRate: 0, netPnl: 0, profitFactor: 1.0, maxDd: 0),
        MonthlySummaryRow(month: "Jun", trades: 1, winRate: 0, netPnl: 0, profitFactor: 1.0, maxDd: 0),
        MonthlySummaryRow(month: "Jul", trades: 1, winRate: 0, netPnl: 0, profitFactor: 1.0, maxDd: 0),
        MonthlySummaryRow(month: "Aug", trades: 1, winRate: 0, netPnl: 0, profitFactor: 1.0, maxDd: 0),
        MonthlySummaryRow(month: "Sep", trades: 1, winRate: 0, netPnl: 0, profitFactor: 1.0, maxDd: 0),
        MonthlySummaryRow(month: "Oct", trades: 1, winRate: 0, netPnl: 0, profitFactor: 1.0, maxDd: 0),
        MonthlySummaryRow(month: "Nov", trades: 1, winRate: 0, netPnl: 0, profitFactor: 1.0, maxDd: 0),
        MonthlySummaryRow(month: "Dec", trades: 1, winRate: 0, netPnl: 0, profitFactor: 1.0, maxDd: 0)
    ]
    
    // Daily P&L Items
    @Published public var dailyItems: [DailyBarItem] = [
        DailyBarItem(date: "25 Apr", pnl: -25450),
        DailyBarItem(date: "16 Jun", pnl: -44216),
        DailyBarItem(date: "23 Jul", pnl: -69174),
        DailyBarItem(date: "11 Aug", pnl: 44216),
        DailyBarItem(date: "28 Oct", pnl: -28153),
        DailyBarItem(date: "03 Nov", pnl: 11494)
    ]
    
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
            let res = try await analyticsService.fetchAdvancedAnalytics(filter: selectedFilter.lowercased(), fromDate: nil, toDate: nil)
            _ = res
            self.isLoading = false
        } catch {
            self.isLoading = false
        }
    }
    
    public func setTimeframe(_ tf: String) {
        selectedFilter = tf
        Task { await loadData() }
    }
}
