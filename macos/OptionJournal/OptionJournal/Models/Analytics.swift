import Foundation

// MARK: - Dashboard Data Response
public struct DashboardDataResponse: Codable, Sendable {
    public let account: TradingAccount?
    public let stats: DashboardStats
    public let charts: DashboardChartsData?
    public let strategyPerformance: [StrategyPerformanceItem]?
    public let recentTrades: [RecentTradeItem]?
    public let riskManagement: RiskSummaryDashboard?
    public let equityCurveData: [EquityPoint]?
}

// MARK: - Dashboard Charts Data
public struct DashboardChartsData: Codable, Sendable {
    public let dailyPnl: [DailyPnlPoint]?
    public let equityCurve: [EquityPoint]?
    public let drawdownCurve: [EquityPoint]?
    public let monthlyPnl: [MonthlyPnlPoint]?
    public let indexPerformance: IndexPerformanceContainer?
    public let cePePerformance: CePePerformanceContainer?
}

// MARK: - Daily P&L Chart Point
public struct DailyPnlPoint: Codable, Identifiable, Sendable, Hashable {
    public var id: String { date }
    public let date: String
    public let displayDate: String?
    @FlexibleDouble public var pnl: Double?
    @FlexibleDouble public var netPnl: Double?
    @FlexibleDouble public var grossProfit: Double?
    @FlexibleDouble public var grossLoss: Double?
    public let trades: Int?
    
    public var calculatedPnl: Double {
        netPnl ?? pnl ?? 0.0
    }
}

// MARK: - Monthly P&L Chart Point
public struct MonthlyPnlPoint: Codable, Identifiable, Sendable, Hashable {
    public var id: String { "\(year ?? 0)-\(month)" }
    public let month: String
    public let monthNum: Int?
    public let year: Int?
    @FlexibleDouble public var pnl: Double?
    @FlexibleDouble public var grossProfit: Double?
    @FlexibleDouble public var grossLoss: Double?
    public let tradesCount: Int?
    
    public var calculatedPnl: Double {
        pnl ?? 0.0
    }
}

// MARK: - Index Performance
public struct IndexPerformanceContainer: Codable, Sendable {
    @FlexibleDouble public var totalNetPnl: Double?
    public let items: [IndexPerformanceItem]?
}

public struct IndexPerformanceItem: Codable, Identifiable, Sendable, Hashable {
    public var id: String { name }
    public let name: String
    @FlexibleDouble public var netPnl: Double?
    public let trades: Int?
    @FlexibleDouble public var winRate: Double?
    @FlexibleDouble public var percentage: Double?
    public let color: String?
    
    public var calculatedNetPnl: Double {
        netPnl ?? 0.0
    }
    public var calculatedPercentage: Double {
        percentage ?? 0.0
    }
}

// MARK: - CE vs PE Performance
public struct CePePerformanceContainer: Codable, Sendable {
    @FlexibleDouble public var totalNetPnl: Double?
    public let items: [CePePerformanceItem]?
}

public struct CePePerformanceItem: Codable, Identifiable, Sendable, Hashable {
    public var id: String { name }
    public let name: String
    @FlexibleDouble public var netPnl: Double?
    public let trades: Int?
    @FlexibleDouble public var winRate: Double?
    @FlexibleDouble public var percentage: Double?
    public let color: String?
    
    public var calculatedNetPnl: Double {
        netPnl ?? 0.0
    }
    public var calculatedPercentage: Double {
        percentage ?? 0.0
    }
}

// MARK: - Risk Summary Dashboard
public struct RiskSummaryDashboard: Codable, Sendable {
    @FlexibleDouble public var dailyLossLimit: Double?
    @FlexibleDouble public var dailyCurrentLoss: Double?
    @FlexibleDouble public var dailyProfitTarget: Double?
    @FlexibleDouble public var dailyCurrentProfit: Double?
    @FlexibleDouble public var maxDrawdownLimit: Double?
    @FlexibleDouble public var currentDrawdown: Double?
    public let consecutiveLossDays: Int?
    public let consecutiveWinDays: Int?
    public let alerts: [RiskAlertItem]?
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

    public var balance: Double? {
        capital
    }

    public init(
        date: String,
        displayDate: String? = nil,
        pnl: Double? = nil,
        cumulativePnl: Double? = nil,
        capital: Double? = nil,
        balance: Double? = nil,
        drawdown: Double? = nil,
        peak: Double? = nil
    ) {
        self.date = date
        self.displayDate = displayDate
        self._pnl = FlexibleDouble(wrappedValue: pnl)
        self._cumulativePnl = FlexibleDouble(wrappedValue: cumulativePnl)
        self._capital = FlexibleDouble(wrappedValue: capital ?? balance)
        self._drawdown = FlexibleDouble(wrappedValue: drawdown)
        self._peak = FlexibleDouble(wrappedValue: peak)
    }
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

    public init(
        date: String,
        day: Int,
        weekday: String = "",
        netPnl: Double? = nil,
        grossProfit: Double? = nil,
        grossLoss: Double? = nil,
        totalCharges: Double? = nil,
        tradeCount: Int = 0,
        status: String = "no_trade",
        trades: [CalendarDayTrade]? = nil
    ) {
        self.date = date
        self.day = day
        self.weekday = weekday
        self._netPnl = FlexibleDouble(wrappedValue: netPnl)
        self._grossProfit = FlexibleDouble(wrappedValue: grossProfit)
        self._grossLoss = FlexibleDouble(wrappedValue: grossLoss)
        self._totalCharges = FlexibleDouble(wrappedValue: totalCharges)
        self.tradeCount = tradeCount
        self.status = status
        self.trades = trades
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

    public init(
        strategy: String,
        totalTrades: Int,
        winningTrades: Int = 0,
        losingTrades: Int = 0,
        winRate: Double? = nil,
        netPnl: Double? = nil,
        avgProfit: Double? = nil,
        avgLoss: Double? = nil
    ) {
        self.strategy = strategy
        self.totalTrades = totalTrades
        self.winningTrades = winningTrades
        self.losingTrades = losingTrades
        self._winRate = FlexibleDouble(wrappedValue: winRate)
        self._netPnl = FlexibleDouble(wrappedValue: netPnl)
        self._avgProfit = FlexibleDouble(wrappedValue: avgProfit)
        self._avgLoss = FlexibleDouble(wrappedValue: avgLoss)
    }
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
    @FlexibleDouble public var tradeWinRate: Double?
    public let totalTrades: Int?
    @FlexibleDouble public var profitFactor: Double?
    @FlexibleDouble public var periodRoi: Double?
    @FlexibleDouble public var overallRoi: Double?
    @FlexibleDouble public var avgDailyProfit: Double?
    @FlexibleDouble public var avgDailyLoss: Double?
    @FlexibleDouble public var maxDrawdown: Double?
    @FlexibleDouble public var maxDrawdownPct: Double?
    @FlexibleDouble public var currentDrawdown: Double?
    @FlexibleDouble public var grossProfitPct: Double?
    @FlexibleDouble public var grossLossPct: Double?
    @FlexibleDouble public var todayPnlPct: Double?
    @FlexibleDouble public var thisMonthPnlPct: Double?
    @FlexibleDouble public var investedCapital: Double?
    @FlexibleDouble public var initialCapital: Double?
    @FlexibleDouble public var highestCapital: Double?
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
