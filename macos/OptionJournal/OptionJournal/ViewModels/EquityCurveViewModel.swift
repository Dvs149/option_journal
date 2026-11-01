import Foundation
import Combine
import SwiftUI

public struct DailyEquityRow: Identifiable, Sendable {
    public let id = UUID()
    public let date: String
    public let opening: Double
    public let pnl: Double
    public let closing: Double
    public let drawdown: Double
}

public struct CapitalTransactionItem: Identifiable, Sendable {
    public let id = UUID()
    public let date: String
    public let type: String // "Deposit" or "Withdrawal"
    public let amount: Double
    public let notes: String
}

public struct YearlyPerformanceRow: Identifiable, Sendable {
    public let id = UUID()
    public let year: String
    public let opening: Double
    public let pnl: Double
    public let roi: Double
    public let maxDd: Double
}

@MainActor
public final class EquityCurveViewModel: ObservableObject {
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var selectedRange: String = "All" // "1M", "3M", "6M", "YTD", "1Y", "All"
    @Published public var equityTab: String = "equity" // "equity", "drawdown", "growth"
    @Published public var txTab: String = "all" // "all", "deposits", "withdrawals"
    
    // Top 8 KPIs
    @Published public var initialCapital: Double = 500000.0
    @Published public var currentCapital: Double = 312613.0
    @Published public var currentCapitalPct: String = "-37.5%"
    @Published public var totalNetProfit: Double = -387387.0
    @Published public var totalNetProfitPct: String = "-37.5%"
    @Published public var totalDeposits: Double = 200000.0
    @Published public var totalWithdrawals: Double = 0.0
    @Published public var highestCapital: Double = 500000.0
    @Published public var highestCapitalDate: String = "01 Jan 2026"
    @Published public var maxDrawdown: Double = 400628.0
    @Published public var maxDrawdownPct: String = "80.1%"
    @Published public var roi: String = "-37.5%"
    
    // Chart Points
    @Published public var points: [EquityPoint] = []
    
    // Transactions
    @Published public var transactions: [CapitalTransactionItem] = [
        CapitalTransactionItem(date: "01 Jan 2026", type: "Deposit", amount: 500000, notes: "Initial Trading Capital"),
        CapitalTransactionItem(date: "15 Jun 2026", type: "Deposit", amount: 200000, notes: "Account Top-up")
    ]
    
    // Yearly Data
    @Published public var yearlyData: [YearlyPerformanceRow] = [
        YearlyPerformanceRow(year: "2026", opening: 500000, pnl: -387387, roi: -37.5, maxDd: 400628)
    ]
    
    // Daily Rows
    @Published public var dailyRows: [DailyEquityRow] = [
        DailyEquityRow(date: "03 Nov 2026", opening: 301119, pnl: 11494, closing: 312613, drawdown: 187387),
        DailyEquityRow(date: "28 Oct 2026", opening: 329272, pnl: -28153, closing: 301119, drawdown: 198881),
        DailyEquityRow(date: "23 Jul 2026", opening: 398446, pnl: -69174, closing: 329272, drawdown: 170728),
        DailyEquityRow(date: "16 Jun 2026", opening: 442662, pnl: -44216, closing: 398446, drawdown: 101554),
        DailyEquityRow(date: "25 Apr 2026", opening: 468112, pnl: -25450, closing: 442662, drawdown: 57338)
    ]
    
    private let analyticsService: AnalyticsServiceProtocol
    
    public init(analyticsService: AnalyticsServiceProtocol) {
        self.analyticsService = analyticsService
        self.generateSamplePoints()
    }
    
    public convenience init() {
        self.init(analyticsService: AnalyticsService())
    }
    
    public func loadData() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let res = try await analyticsService.fetchDashboardData(filter: selectedRange.lowercased(), fromDate: nil, toDate: nil)
            if let pts = res.equityCurveData, !pts.isEmpty {
                self.points = pts
                if let last = pts.last {
                    self.currentCapital = last.balance ?? 312613.0
                }
            }
            self.isLoading = false
        } catch {
            self.isLoading = false
        }
    }
    
    public func setTimeframe(_ tf: String) {
        selectedRange = tf
        Task { await loadData() }
    }
    
    private func generateSamplePoints() {
        self.points = [
            EquityPoint(date: "06 Jan", cumulativePnl: 0, balance: 500000, drawdown: 0, peak: 500000),
            EquityPoint(date: "13 Oct", cumulativePnl: -25000, balance: 475000, drawdown: 25000, peak: 500000),
            EquityPoint(date: "11 Jul", cumulativePnl: -55000, balance: 445000, drawdown: 55000, peak: 500000),
            EquityPoint(date: "06 Sep", cumulativePnl: -90000, balance: 410000, drawdown: 90000, peak: 500000),
            EquityPoint(date: "13 Dec", cumulativePnl: -140000, balance: 360000, drawdown: 140000, peak: 500000),
            EquityPoint(date: "22 Jan", cumulativePnl: -195000, balance: 305000, drawdown: 195000, peak: 500000),
            EquityPoint(date: "21 Feb", cumulativePnl: -230000, balance: 270000, drawdown: 230000, peak: 500000),
            EquityPoint(date: "25 Apr", cumulativePnl: -265000, balance: 235000, drawdown: 265000, peak: 500000),
            EquityPoint(date: "06 Aug", cumulativePnl: -310000, balance: 190000, drawdown: 310000, peak: 500000),
            EquityPoint(date: "16 Jun", cumulativePnl: -355000, balance: 145000, drawdown: 355000, peak: 500000),
            EquityPoint(date: "23 Jul", cumulativePnl: -398000, balance: 301119, drawdown: 398000, peak: 500000),
            EquityPoint(date: "03 Nov", cumulativePnl: -387387, balance: 312613, drawdown: 387387, peak: 500000)
        ]
    }
}
