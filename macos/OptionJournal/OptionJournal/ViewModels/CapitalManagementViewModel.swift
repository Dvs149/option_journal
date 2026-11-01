import Foundation
import Combine
import SwiftUI

public struct CapitalHistoryRow: Identifiable, Sendable {
    public let id: Int
    public let date: String
    public let type: String // "Deposit" or "Withdrawal"
    public let amount: Double
    public let balanceAfter: Double
    public let notes: String
}

public struct PositionSizeRow: Identifiable, Sendable {
    public let id = UUID()
    public let riskPct: String
    public let riskAmt: Double
    public let qtyLots: String
    public let notes: String
    public let isRecommended: Bool
    public let isHighRisk: Bool
}

@MainActor
public final class CapitalManagementViewModel: ObservableObject {
    @Published public var isLoading: Bool = false
    @Published public var isSaving: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var successMessage: String? = nil
    @Published public var selectedTimeRange: String = "1Y"
    @Published public var txHistoryTab: String = "All" // "All", "Deposits", "Withdrawals"
    
    // Top 7 Metrics
    @Published public var initialCapital: Double = 800000.0
    @Published public var totalDeposits: Double = 0.0
    @Published public var totalWithdrawals: Double = 100000.0
    @Published public var currentCapital: Double = 312613.0
    @Published public var availableForTrading: Double = 312613.0
    @Published public var totalProfit: Double = -387387.0
    @Published public var roi: Double = -48.42
    
    // Position Sizing Calculator Form
    @Published public var calcAccountCapital: String = "208450"
    @Published public var calcRiskPct: String = "1.0"
    @Published public var calcStopLoss: String = "50"
    @Published public var calcIndex: String = "NIFTY"
    @Published public var calcLotSize: Int = 65
    
    // Modals
    @Published public var showEditCapitalModal: Bool = false
    @Published public var showAddTransactionSheet: Bool = false
    @Published public var newInitialCapitalInput: String = "800000"
    
    // Transactions History
    @Published public var transactions: [CapitalHistoryRow] = [
        CapitalHistoryRow(id: 1, date: "01 Nov 2026", type: "Withdrawal", amount: -100000, balanceAfter: 100000, notes: "-")
    ]
    
    private let capitalService: CapitalServiceProtocol
    
    public init(capitalService: CapitalServiceProtocol) {
        self.capitalService = capitalService
    }
    
    public convenience init() {
        self.init(capitalService: CapitalService())
    }
    
    public func loadData() async {
        isLoading = true
        errorMessage = nil
        do {
            let res = try await capitalService.fetchCapitalData()
            if let initCap = res.initialCapital {
                self.initialCapital = initCap
            }
            if let curr = res.currentCapital {
                self.currentCapital = curr
                self.availableForTrading = curr
            }
            self.isLoading = false
        } catch {
            self.isLoading = false
        }
    }
    
    // Calculator outputs
    public var calcRiskAmount: Double {
        let cap = Double(calcAccountCapital) ?? 208450.0
        let pct = Double(calcRiskPct) ?? 1.0
        return (cap * pct) / 100.0
    }
    
    public var calcRecommendedLots: Double {
        let sl = Double(calcStopLoss) ?? 50.0
        let lossPerLot = sl * Double(calcLotSize)
        if lossPerLot > 0 {
            return calcRiskAmount / lossPerLot
        }
        return 0.0
    }
    
    public var calcTotalQty: Int {
        return Int(round(calcRecommendedLots * Double(calcLotSize)))
    }
    
    public var positionSizeRows: [PositionSizeRow] {
        let cap = Double(calcAccountCapital) ?? 208450.0
        let sl = Double(calcStopLoss) ?? 50.0
        let perLot = sl * Double(calcLotSize)
        
        func makeRow(pct: Double, note: String, rec: Bool = false, high: Bool = false) -> PositionSizeRow {
            let risk = (cap * pct) / 100.0
            let lots = perLot > 0 ? (risk / perLot) : 0
            let lotsStr = rec ? "\(String(format: "%.1f", lots)) (=1)" : String(format: "%.1f", lots)
            return PositionSizeRow(riskPct: "\(String(format: "%.1f", pct))%", riskAmt: risk, qtyLots: lotsStr, notes: note, isRecommended: rec, isHighRisk: high)
        }
        
        return [
            makeRow(pct: 0.5, note: "Conservative"),
            makeRow(pct: 1.0, note: "Recommended", rec: true),
            makeRow(pct: 1.5, note: "Slightly Aggressive"),
            makeRow(pct: 2.0, note: "Aggressive"),
            makeRow(pct: 3.0, note: "High Risk", high: true)
        ]
    }
}
