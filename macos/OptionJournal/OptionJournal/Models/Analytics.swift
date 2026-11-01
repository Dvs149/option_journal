import Foundation

// MARK: - Dashboard Data Response
public struct DashboardDataResponse: Codable, Sendable {
    public let account: TradingAccount?
    public let stats: DashboardStats
    public let recentTrades: [RecentTradeItem]?
    public let equityCurveData: [EquityPoint]?
}

// MARK: - Equity Point for Swift Charts
public struct EquityPoint: Codable, Identifiable, Sendable, Hashable {
    public var id: String { date }
    public let date: String
    public let displayDate: String?
    @FlexibleDouble public var pnl: Double?
    @FlexibleDouble public var cumulativePnl: Double?
    @FlexibleDouble public var capital: Double?
    @FlexibleDouble public var drawdown: Double?
    @FlexibleDouble public var peak: Double?
}

// MARK: - Calendar Models
public struct CalendarResponse: Codable, Sendable {
    public let year: Int
    public let month: Int
    public let monthName: String
    @FlexibleDouble public var totalNetPnl: Double?
    public let totalTradingDays: Int
    public let winningDays: Int
    public let losingDays: Int
    @FlexibleDouble public var winRate: Double?
    public let days: [CalendarDayItem]
}

public struct CalendarDayItem: Codable, Identifiable, Sendable, Hashable {
    public var id: String { date }
    public let date: String
    public let day: Int
    public let weekday: String
    @FlexibleDouble public var netPnl: Double?
    @FlexibleDouble public var grossProfit: Double?
    @FlexibleDouble public var grossLoss: Double?
    @FlexibleDouble public var totalCharges: Double?
    public let tradeCount: Int
    public let status: String
    public let trades: [CalendarDayTrade]?
    
    public var isProfit: Bool {
        (netPnl ?? 0) > 0
    }
}

public struct CalendarDayTrade: Codable, Identifiable, Sendable, Hashable {
    public let id: Int
    public let time: String?
    public let indexName: String
    public let tradingType: String
    public let strategyName: String?
    public let optionType: String
    @FlexibleDouble public var strikePrice: Double?
    public let lots: Int?
    @FlexibleDouble public var entryPremium: Double?
    @FlexibleDouble public var exitPremium: Double?
    @FlexibleDouble public var grossProfit: Double?
    @FlexibleDouble public var grossLoss: Double?
    @FlexibleDouble public var netPnl: Double?
}

// MARK: - Risk Management Models
public struct RiskResponse: Codable, Sendable {
    public let accountLimits: AccountLimits
    public let metrics: RiskMetrics
    public let alerts: [RiskAlertItem]?
}

public struct AccountLimits: Codable, Sendable {
    @FlexibleDouble public var dailyMaxLoss: Double?
    @FlexibleDouble public var dailyProfitTarget: Double?
    @FlexibleDouble public var monthlyMaxLoss: Double?
    @FlexibleDouble public var monthlyProfitTarget: Double?
}

public struct UpdateRiskLimitsRequest: Codable, Sendable {
    public let dailyMaxLoss: Double
    public let dailyProfitTarget: Double
    public let monthlyMaxLoss: Double
    public let monthlyProfitTarget: Double
    
    public init(dailyMaxLoss: Double, dailyProfitTarget: Double, monthlyMaxLoss: Double, monthlyProfitTarget: Double) {
        self.dailyMaxLoss = dailyMaxLoss
        self.dailyProfitTarget = dailyProfitTarget
        self.monthlyMaxLoss = monthlyMaxLoss
        self.monthlyProfitTarget = monthlyProfitTarget
    }
}

public struct RiskMetrics: Codable, Sendable {
    @FlexibleDouble public var largestSingleDayProfit: Double?
    @FlexibleDouble public var largestSingleDayLoss: Double?
    @FlexibleDouble public var avgRiskToReward: Double?
    @FlexibleDouble public var maxDrawdown: Double?
    @FlexibleDouble public var maxDrawdownPct: Double?
    @FlexibleDouble public var currentDrawdown: Double?
    public let consecutiveLosingDays: Int?
    public let consecutiveWinningDays: Int?
    @FlexibleDouble public var dailyCurrentLoss: Double?
    @FlexibleDouble public var dailyCurrentProfit: Double?
}

public struct RiskAlertItem: Codable, Identifiable, Sendable, Hashable {
    public var id: String { message }
    public let type: String?
    public let message: String
    public let severity: String?
}

// MARK: - Strategy Analysis Models
public struct StrategyAnalysisResponse: Codable, Sendable {
    public let performance: [StrategyPerformanceItem]
    public let bestPerforming: StrategyPerformanceItem?
    public let worstPerforming: StrategyPerformanceItem?
}

public struct StrategyPerformanceItem: Codable, Identifiable, Sendable, Hashable {
    public var id: String { strategy }
    public let strategy: String
    public let totalTrades: Int
    public let winningTrades: Int
    public let losingTrades: Int
    @FlexibleDouble public var winRate: Double?
    @FlexibleDouble public var netPnl: Double?
    @FlexibleDouble public var avgProfit: Double?
    @FlexibleDouble public var avgLoss: Double?
}

// MARK: - Dashboard Stats
public struct DashboardStats: Codable, Sendable {
    @FlexibleDouble public var totalNetProfit: Double?
    @FlexibleDouble public var totalGrossProfit: Double?
    @FlexibleDouble public var totalGrossLoss: Double?
    @FlexibleDouble public var totalCharges: Double?
    @FlexibleDouble public var todayPnl: Double?
    @FlexibleDouble public var thisWeekPnl: Double?
    @FlexibleDouble public var thisMonthPnl: Double?
    @FlexibleDouble public var currentCapital: Double?
    public let totalTradingDays: Int?
    public let winningDays: Int?
    public let losingDays: Int?
    public let breakevenDays: Int?
    @FlexibleDouble public var winRate: Double?
    @FlexibleDouble public var profitFactor: Double?
    @FlexibleDouble public var periodRoi: Double?
    @FlexibleDouble public var overallRoi: Double?
}

// MARK: - Recent Trade Item
public struct RecentTradeItem: Codable, Identifiable, Sendable, Hashable {
    public let id: Int
    public let tradeDate: String
    public let displayDate: String?
    public let indexName: String
    public let tradingType: String
    public let optionType: String
    public let strategyName: String?
    @FlexibleDouble public var strikePrice: Double?
    public let lots: Int?
    @FlexibleDouble public var netPnl: Double?
    
    public var calculatedNetPnl: Double {
        netPnl ?? 0.0
    }
}

// MARK: - Weekday & Advanced Analytics
public struct WeekdayAnalyticsItem: Codable, Sendable, Hashable {
    public let day: String
    @FlexibleDouble public var netPnl: Double?
    public let tradingDays: Int?
    public let winDays: Int?
    public let lossDays: Int?
    @FlexibleDouble public var winRate: Double?
}

public struct AdvancedAnalyticsResponse: Codable, Sendable {
    public let metrics: AdvancedMetrics?
    public let comparisons: AdvancedComparisons?
    public let weekdayAnalytics: [String: WeekdayAnalyticsItem]?
}

public struct DayPnlHighlight: Codable, Sendable {
    public let date: String?
    @FlexibleDouble public var pnl: Double?
}

public struct AdvancedMetrics: Codable, Sendable {
    public let totalTrades: Int?
    @FlexibleDouble public var totalNetPnl: Double?
    @FlexibleDouble public var totalGrossProfit: Double?
    @FlexibleDouble public var totalGrossLoss: Double?
    @FlexibleDouble public var totalCharges: Double?
    @FlexibleDouble public var avgWinningTrade: Double?
    @FlexibleDouble public var avgLosingTrade: Double?
    @FlexibleDouble public var largestWinningTrade: Double?
    @FlexibleDouble public var largestLosingTrade: Double?
    public let bestTradingDay: DayPnlHighlight?
    public let worstTradingDay: DayPnlHighlight?
}

public struct AdvancedComparisons: Codable, Sendable {
    public let niftyVsSensex: [String: Double]?
    public let bankniftyVsNifty: [String: Double]?
    public let ceVsPe: [String: Double]?
    public let typeComparison: [String: Double]?
    public let quarterly: [QuarterlyPnlItem]?
    public let yearly: [YearlyPnlItem]?
}

public struct QuarterlyPnlItem: Codable, Identifiable, Sendable {
    public var id: String { quarter }
    public let quarter: String
    @FlexibleDouble public var netPnl: Double?
    public let trades: Int?
}

public struct YearlyPnlItem: Codable, Identifiable, Sendable {
    public var id: String { year }
    public let year: String
    @FlexibleDouble public var netPnl: Double?
    public let trades: Int?
}
