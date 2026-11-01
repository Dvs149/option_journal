import Foundation

// MARK: - Capital Response
public struct CapitalResponse: Codable, Sendable {
    public let account: TradingAccount?
    @FlexibleDouble public var initialCapital: Double?
    @FlexibleDouble public var currentCapital: Double?
    @FlexibleDouble public var totalDeposits: Double?
    @FlexibleDouble public var totalWithdrawals: Double?
    @FlexibleDouble public var netCapitalInflow: Double?
    @FlexibleDouble public var totalProfit: Double?
    @FlexibleDouble public var overallRoi: Double?
    @FlexibleDouble public var highestCapital: Double?
    @FlexibleDouble public var currentDrawdown: Double?
    @FlexibleDouble public var todayPnl: Double?
    @FlexibleDouble public var dailyTarget: Double?
    @FlexibleDouble public var dailyTargetAchievementPct: Double?
    @FlexibleDouble public var thisMonthPnl: Double?
    @FlexibleDouble public var monthlyTarget: Double?
    @FlexibleDouble public var monthlyTargetAchievementPct: Double?
    @FlexibleDouble public var remainingMonthlyTarget: Double?
    public let growthChart: [CapitalGrowthPoint]?
    public let transactions: [CapitalTransaction]?
}

// MARK: - Growth Point
public struct CapitalGrowthPoint: Codable, Identifiable, Sendable, Hashable {
    public var id: String { date }
    public let date: String
    public let displayDate: String?
    @FlexibleDouble public var capital: Double?
    @FlexibleDouble public var pnl: Double?
}

// MARK: - Capital Transaction
public struct CapitalTransaction: Codable, Identifiable, Sendable, Hashable {
    public let id: Int
    public let transactionType: String
    @FlexibleDouble public var amount: Double?
    public let transactionDate: String
    public let notes: String?
    
    public var isDeposit: Bool {
        transactionType.lowercased() == "deposit"
    }
}

// MARK: - Create Transaction Request
public struct CreateTransactionRequest: Codable, Sendable {
    public let transactionType: String
    public let amount: Double
    public let transactionDate: String
    public let notes: String?
    
    public init(transactionType: String, amount: Double, transactionDate: String, notes: String? = nil) {
        self.transactionType = transactionType
        self.amount = amount
        self.transactionDate = transactionDate
        self.notes = notes
    }
}
