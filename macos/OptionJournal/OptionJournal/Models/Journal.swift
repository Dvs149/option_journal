import Foundation

// MARK: - Journal Response & Summary
public struct JournalResponse: Codable, Sendable {
    public let data: [JournalTradeItem]
    public let currentPage: Int
    public let lastPage: Int
    public let perPage: Int
    public let total: Int
    public let summaryStats: JournalSummaryStats?
}

public struct JournalSummaryStats: Codable, Sendable {
    public let totalEntries: Int
    public let successfulTrades: Int
    @FlexibleDouble public var winRate: Double?
    public let failedTrades: Int
    @FlexibleDouble public var failedPct: Double?
    @FlexibleDouble public var bestTradePnl: Double?
    public let bestTradeDate: String?
    @FlexibleDouble public var worstTradePnl: Double?
    public let worstTradeDate: String?
}

// MARK: - Journal Trade Item
public struct JournalTradeItem: Codable, Identifiable, Sendable, Hashable {
    public let id: Int
    public let tradeDate: String
    public let displayDate: String?
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
    @FlexibleDouble public var totalCharges: Double?
    @FlexibleDouble public var netPnl: Double?
    public let notes: String?
    public let journal: TradeJournal?
    public let screenshots: [TradeScreenshot]?
    
    public var isProfit: Bool {
        (netPnl ?? 0) > 0
    }
}

// MARK: - Trade Screenshot
public struct TradeScreenshot: Codable, Identifiable, Sendable, Hashable {
    public let id: Int
    public let tradeId: Int?
    public let filePath: String
    public let fileUrl: String?
    public let fileName: String?
    public let caption: String?
}

// MARK: - Update Journal Request
public struct UpdateJournalRequest: Codable, Sendable {
    public let marketConditions: String?
    public let tradeSetup: String?
    public let whatWentRight: String?
    public let whatWentWrong: String?
    public let mistakesMade: String?
    public let lessonsLearned: String?
    public let personalNotes: String?
    
    public init(
        marketConditions: String? = nil,
        tradeSetup: String? = nil,
        whatWentRight: String? = nil,
        whatWentWrong: String? = nil,
        mistakesMade: String? = nil,
        lessonsLearned: String? = nil,
        personalNotes: String? = nil
    ) {
        self.marketConditions = marketConditions
        self.tradeSetup = tradeSetup
        self.whatWentRight = whatWentRight
        self.whatWentWrong = whatWentWrong
        self.mistakesMade = mistakesMade
        self.lessonsLearned = lessonsLearned
        self.personalNotes = personalNotes
    }
}
