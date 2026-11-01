import Foundation
import Combine
import SwiftUI

public struct DailyRiskRow: Identifiable, Sendable {
    public let id = UUID()
    public let date: String
    public let trades: Int
    public let pnl: Double
    public let status: String // "Safe", "Warning", "Breached"
    public let usedLimitPct: Double
}

@MainActor
public final class RiskViewModel: ObservableObject {
    @Published public var isLoading: Bool = false
    @Published public var isSaving: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var successMessage: String? = nil
    
    // Config Limits Sheet
    @Published public var showLimitsSheet: Bool = false
    @Published public var dailyMaxLoss: Double = 25000.0
    @Published public var dailyProfitTarget: Double = 20000.0
    @Published public var monthlyMaxLoss: Double = 100000.0
    @Published public var monthlyProfitTarget: Double = 150000.0
    @Published public var accountCapital: Double = 312613.0
    
    // Top 5 Cards Values
    @Published public var todayLossUsed: Double = 0.0
    @Published public var todayProfitCurrent: Double = 0.0
    @Published public var monthLossUsed: Double = 0.0
    @Published public var monthProfitCurrent: Double = 11494.0
    
    // Row 2: 6 Metrics
    @Published public var maxDrawdown: Double = 400628.0
    @Published public var currentDrawdown: Double = 387387.0
    @Published public var consecutiveLossDays: Int = 0
    @Published public var consecutiveWinDays: Int = 1
    @Published public var largestSingleDayLoss: Double = -69174.0
    @Published public var largestSingleDayProfit: Double = 44216.0
    
    // Daily Risk Rows
    @Published public var dailyRiskRows: [DailyRiskRow] = [
        DailyRiskRow(date: "03 Nov 2026", trades: 9, pnl: 11494, status: "Safe", usedLimitPct: 0.0),
        DailyRiskRow(date: "28 Oct 2026", trades: 7, pnl: -28153, status: "Breached", usedLimitPct: 112.6),
        DailyRiskRow(date: "23 Jul 2026", trades: 14, pnl: -69174, status: "Breached", usedLimitPct: 276.7),
        DailyRiskRow(date: "16 Jun 2026", trades: 8, pnl: -44216, status: "Breached", usedLimitPct: 176.8),
        DailyRiskRow(date: "25 Apr 2026", trades: 6, pnl: -25450, status: "Breached", usedLimitPct: 101.8)
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
            let res = try await analyticsService.fetchRisk()
            let lim = res.accountLimits
            self.dailyMaxLoss = lim.dailyMaxLoss ?? 25000
            self.dailyProfitTarget = lim.dailyProfitTarget ?? 20000
            self.monthlyMaxLoss = lim.monthlyMaxLoss ?? 100000
            self.monthlyProfitTarget = lim.monthlyProfitTarget ?? 150000
            
            let m = res.metrics
            self.maxDrawdown = m.maxDrawdown ?? 400628
            self.currentDrawdown = m.currentDrawdown ?? 387387
            self.largestSingleDayProfit = m.largestSingleDayProfit ?? 44216
            self.largestSingleDayLoss = -(abs(m.largestSingleDayLoss ?? 69174))
            self.consecutiveLossDays = m.consecutiveLosingDays ?? 0
            self.consecutiveWinDays = m.consecutiveWinningDays ?? 1
            self.isLoading = false
        } catch {
            self.isLoading = false
        }
    }
    
    public func saveLimits(dailyLoss: Double, dailyTarget: Double, monthlyLoss: Double, monthlyTarget: Double) async {
        isSaving = true
        self.dailyMaxLoss = dailyLoss
        self.dailyProfitTarget = dailyTarget
        self.monthlyMaxLoss = monthlyLoss
        self.monthlyProfitTarget = monthlyTarget
        
        do {
            let req = UpdateRiskLimitsRequest(
                dailyMaxLoss: dailyLoss,
                dailyProfitTarget: dailyTarget,
                monthlyMaxLoss: monthlyLoss,
                monthlyProfitTarget: monthlyTarget
            )
            try await analyticsService.updateRiskLimits(limits: req)
            self.isSaving = false
            self.showLimitsSheet = false
            self.successMessage = "Risk parameters updated successfully"
        } catch {
            self.isSaving = false
            self.showLimitsSheet = false
        }
    }
}
