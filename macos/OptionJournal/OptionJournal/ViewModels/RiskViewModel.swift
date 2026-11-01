import Foundation
import Combine
import SwiftUI

@MainActor
public final class RiskViewModel: ObservableObject {
    @Published public var accountLimits: AccountLimits? = nil
    @Published public var metrics: RiskMetrics? = nil
    @Published public var alerts: [RiskAlertItem] = []
    @Published public var isLoading: Bool = false
    @Published public var isSaving: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var successMessage: String? = nil
    
    // Limits editing sheet state
    @Published public var showLimitsSheet: Bool = false
    @Published public var editDailyMaxLoss: String = ""
    @Published public var editDailyProfitTarget: String = ""
    @Published public var editMonthlyMaxLoss: String = ""
    @Published public var editMonthlyProfitTarget: String = ""
    
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
            self.accountLimits = res.accountLimits
            self.metrics = res.metrics
            self.alerts = res.alerts ?? []
            self.isLoading = false
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
        }
    }
    
    public func openLimitsSheet() {
        if let limits = accountLimits {
            editDailyMaxLoss = String(format: "%.2f", limits.dailyMaxLoss ?? 0)
            editDailyProfitTarget = String(format: "%.2f", limits.dailyProfitTarget ?? 0)
            editMonthlyMaxLoss = String(format: "%.2f", limits.monthlyMaxLoss ?? 0)
            editMonthlyProfitTarget = String(format: "%.2f", limits.monthlyProfitTarget ?? 0)
        } else {
            editDailyMaxLoss = "0.00"
            editDailyProfitTarget = "0.00"
            editMonthlyMaxLoss = "0.00"
            editMonthlyProfitTarget = "0.00"
        }
        showLimitsSheet = true
    }
    
    public func saveLimits() async -> Bool {
        guard let dailyLoss = Double(editDailyMaxLoss), dailyLoss >= 0,
              let dailyTarget = Double(editDailyProfitTarget), dailyTarget >= 0,
              let monthlyLoss = Double(editMonthlyMaxLoss), monthlyLoss >= 0,
              let monthlyTarget = Double(editMonthlyProfitTarget), monthlyTarget >= 0 else {
            errorMessage = "Please enter valid positive numbers for all risk limits."
            return false
        }
        
        isSaving = true
        errorMessage = nil
        
        do {
            let req = UpdateRiskLimitsRequest(
                dailyMaxLoss: dailyLoss,
                dailyProfitTarget: dailyTarget,
                monthlyMaxLoss: monthlyLoss,
                monthlyProfitTarget: monthlyTarget
            )
            try await analyticsService.updateRiskLimits(limits: req)
            isSaving = false
            showLimitsSheet = false
            successMessage = "Risk parameters updated successfully"
            await loadData()
            return true
        } catch {
            errorMessage = error.localizedDescription
            isSaving = false
            return false
        }
    }
    
    // Gauge helpers
    public var dailyLossPercentage: Double {
        guard let limits = accountLimits, let maxLoss = limits.dailyMaxLoss, maxLoss > 0,
              let currentLoss = metrics?.dailyCurrentLoss else { return 0 }
        return min(currentLoss / maxLoss, 1.0)
    }
    
    public var dailyProfitPercentage: Double {
        guard let limits = accountLimits, let target = limits.dailyProfitTarget, target > 0,
              let currentProfit = metrics?.dailyCurrentProfit else { return 0 }
        return min(currentProfit / target, 1.0)
    }
}
