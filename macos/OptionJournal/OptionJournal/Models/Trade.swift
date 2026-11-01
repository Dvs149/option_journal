import Foundation

// MARK: - Trade Model
public struct Trade: Codable, Identifiable, Sendable, Hashable {
    public let id: Int
    public let tradeDate: String
    public let indexName: String
    public let tradingType: String
    public let strategyName: String?
    public let optionType: String
    @FlexibleDouble public var strikePrice: Double?
    public let expiryDate: String?
    @FlexibleDouble public var ceEntryPrice: Double?
    @FlexibleDouble public var peEntryPrice: Double?
    @FlexibleDouble public var entryPremium: Double?
    @FlexibleDouble public var ceExitPrice: Double?
    @FlexibleDouble public var peExitPrice: Double?
    @FlexibleDouble public var exitPremium: Double?
    public let quantity: Int?
    public let lots: Int?
    @FlexibleDouble public var grossProfit: Double?
    @FlexibleDouble public var grossLoss: Double?
    @FlexibleDouble public var brokerage: Double?
    @FlexibleDouble public var stt: Double?
    @FlexibleDouble public var exchangeCharges: Double?
    @FlexibleDouble public var gst: Double?
    @FlexibleDouble public var sebiCharges: Double?
    @FlexibleDouble public var stampDuty: Double?
    @FlexibleDouble public var otherCharges: Double?
    @FlexibleDouble public var totalCharges: Double?
    @FlexibleDouble public var netPnl: Double?
    public let entryReason: String?
    public let exitReason: String?
    public let notes: String?
    public let journal: TradeJournal?
    public let screenshotUrl: String?
    public let createdAt: String?
    public let updatedAt: String?
    
    public var calculatedNetPnl: Double {
        netPnl ?? 0.0
    }
    
    public var isProfit: Bool {
        calculatedNetPnl > 0
    }

    public init(
        id: Int,
        tradeDate: String,
        indexName: String,
        tradingType: String,
        strategyName: String? = nil,
        optionType: String,
        strikePrice: Double? = nil,
        expiryDate: String? = nil,
        ceEntryPrice: Double? = nil,
        peEntryPrice: Double? = nil,
        entryPremium: Double? = nil,
        ceExitPrice: Double? = nil,
        peExitPrice: Double? = nil,
        exitPremium: Double? = nil,
        quantity: Int? = nil,
        lots: Int? = nil,
        grossProfit: Double? = nil,
        grossLoss: Double? = nil,
        brokerage: Double? = nil,
        stt: Double? = nil,
        exchangeCharges: Double? = nil,
        gst: Double? = nil,
        sebiCharges: Double? = nil,
        stampDuty: Double? = nil,
        otherCharges: Double? = nil,
        totalCharges: Double? = nil,
        netPnl: Double? = nil,
        entryReason: String? = nil,
        exitReason: String? = nil,
        notes: String? = nil,
        journal: TradeJournal? = nil,
        screenshotUrl: String? = nil,
        createdAt: String? = nil,
        updatedAt: String? = nil
    ) {
        self.id = id
        self.tradeDate = tradeDate
        self.indexName = indexName
        self.tradingType = tradingType
        self.strategyName = strategyName
        self.optionType = optionType
        self._strikePrice = FlexibleDouble(wrappedValue: strikePrice)
        self.expiryDate = expiryDate
        self._ceEntryPrice = FlexibleDouble(wrappedValue: ceEntryPrice)
        self._peEntryPrice = FlexibleDouble(wrappedValue: peEntryPrice)
        self._entryPremium = FlexibleDouble(wrappedValue: entryPremium)
        self._ceExitPrice = FlexibleDouble(wrappedValue: ceExitPrice)
        self._peExitPrice = FlexibleDouble(wrappedValue: peExitPrice)
        self._exitPremium = FlexibleDouble(wrappedValue: exitPremium)
        self.quantity = quantity
        self.lots = lots
        self._grossProfit = FlexibleDouble(wrappedValue: grossProfit)
        self._grossLoss = FlexibleDouble(wrappedValue: grossLoss)
        self._brokerage = FlexibleDouble(wrappedValue: brokerage)
        self._stt = FlexibleDouble(wrappedValue: stt)
        self._exchangeCharges = FlexibleDouble(wrappedValue: exchangeCharges)
        self._gst = FlexibleDouble(wrappedValue: gst)
        self._sebiCharges = FlexibleDouble(wrappedValue: sebiCharges)
        self._stampDuty = FlexibleDouble(wrappedValue: stampDuty)
        self._otherCharges = FlexibleDouble(wrappedValue: otherCharges)
        self._totalCharges = FlexibleDouble(wrappedValue: totalCharges)
        self._netPnl = FlexibleDouble(wrappedValue: netPnl)
        self.entryReason = entryReason
        self.exitReason = exitReason
        self.notes = notes
        self.journal = journal
        self.screenshotUrl = screenshotUrl
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

// MARK: - Trade Journal Model
public struct TradeJournal: Codable, Identifiable, Sendable, Hashable {
    public let id: Int?
    public let tradeId: Int?
    public let marketConditions: String?
    public let tradeSetup: String?
    public let whatWentRight: String?
    public let whatWentWrong: String?
    public let mistakesMade: String?
    public let lessonsLearned: String?
    public let personalNotes: String?
}

// MARK: - Paginated Trades Response
public struct PaginatedTradesResponse: Codable, Sendable {
    public let currentPage: Int
    public let data: [Trade]
    public let lastPage: Int
    public let perPage: Int
    public let total: Int
    public let from: Int?
    public let to: Int?
}

// MARK: - Trade Charge Estimation
public struct TradeEstimateRequest: Codable, Sendable {
    public let indexName: String
    public let optionType: String
    public let entryPremium: Double
    public let exitPremium: Double
    public let quantity: Int
    public let ceEntryPrice: Double?
    public let peEntryPrice: Double?
    public let ceExitPrice: Double?
    public let peExitPrice: Double?
    
    public init(indexName: String, optionType: String, entryPremium: Double, exitPremium: Double, quantity: Int, ceEntryPrice: Double? = nil, peEntryPrice: Double? = nil, ceExitPrice: Double? = nil, peExitPrice: Double? = nil) {
        self.indexName = indexName
        self.optionType = optionType
        self.entryPremium = entryPremium
        self.exitPremium = exitPremium
        self.quantity = quantity
        self.ceEntryPrice = ceEntryPrice
        self.peEntryPrice = peEntryPrice
        self.ceExitPrice = ceExitPrice
        self.peExitPrice = peExitPrice
    }
}

public struct TradeEstimateResponse: Codable, Sendable {
    @FlexibleDouble public var grossPnl: Double?
    @FlexibleDouble public var brokerage: Double?
    @FlexibleDouble public var stt: Double?
    @FlexibleDouble public var exchangeCharges: Double?
    @FlexibleDouble public var gst: Double?
    @FlexibleDouble public var sebiCharges: Double?
    @FlexibleDouble public var stampDuty: Double?
    @FlexibleDouble public var totalCharges: Double?
    @FlexibleDouble public var netPnl: Double?
    @FlexibleDouble public var breakevenPoints: Double?
}

// MARK: - Create Trade Request
public struct CreateTradeRequest: Codable, Sendable {
    public let tradeDate: String
    public let indexName: String
    public let tradingType: String
    public let strategyName: String
    public let optionType: String
    public let strikePrice: Double?
    public let expiryDate: String?
    public let entryPremium: Double?
    public let exitPremium: Double?
    public let ceEntryPrice: Double?
    public let peEntryPrice: Double?
    public let ceExitPrice: Double?
    public let peExitPrice: Double?
    public let quantity: Int
    public let lots: Int
    public let entryReason: String?
    public let exitReason: String?
    public let notes: String?
    
    // Strategy & Journal Reflections
    public let marketConditions: String?
    public let tradeSetup: String?
    public let whatWentRight: String?
    public let whatWentWrong: String?
    public let mistakesMade: String?
    public let lessonsLearned: String?
    public let personalNotes: String?
    
    // P&L & Charges Breakdown
    public let grossProfit: Double?
    public let grossLoss: Double?
    public let brokerage: Double?
    public let stt: Double?
    public let exchangeCharges: Double?
    public let gst: Double?
    public let sebiCharges: Double?
    public let stampDuty: Double?
    public let otherCharges: Double?
    public let totalCharges: Double?
    public let netPnl: Double?
    
    public init(
        tradeDate: String,
        indexName: String,
        tradingType: String,
        strategyName: String,
        optionType: String,
        strikePrice: Double?,
        expiryDate: String?,
        entryPremium: Double?,
        exitPremium: Double?,
        ceEntryPrice: Double? = nil,
        peEntryPrice: Double? = nil,
        ceExitPrice: Double? = nil,
        peExitPrice: Double? = nil,
        quantity: Int,
        lots: Int,
        entryReason: String? = nil,
        exitReason: String? = nil,
        notes: String? = nil,
        marketConditions: String? = nil,
        tradeSetup: String? = nil,
        whatWentRight: String? = nil,
        whatWentWrong: String? = nil,
        mistakesMade: String? = nil,
        lessonsLearned: String? = nil,
        personalNotes: String? = nil,
        grossProfit: Double? = nil,
        grossLoss: Double? = nil,
        brokerage: Double? = nil,
        stt: Double? = nil,
        exchangeCharges: Double? = nil,
        gst: Double? = nil,
        sebiCharges: Double? = nil,
        stampDuty: Double? = nil,
        otherCharges: Double? = nil,
        totalCharges: Double? = nil,
        netPnl: Double? = nil
    ) {
        self.tradeDate = tradeDate
        self.indexName = indexName
        self.tradingType = tradingType
        self.strategyName = strategyName
        self.optionType = optionType
        self.strikePrice = strikePrice
        self.expiryDate = expiryDate
        self.entryPremium = entryPremium
        self.exitPremium = exitPremium
        self.ceEntryPrice = ceEntryPrice
        self.peEntryPrice = peEntryPrice
        self.ceExitPrice = ceExitPrice
        self.peExitPrice = peExitPrice
        self.quantity = quantity
        self.lots = lots
        self.entryReason = entryReason
        self.exitReason = exitReason
        self.notes = notes
        self.marketConditions = marketConditions
        self.tradeSetup = tradeSetup
        self.whatWentRight = whatWentRight
        self.whatWentWrong = whatWentWrong
        self.mistakesMade = mistakesMade
        self.lessonsLearned = lessonsLearned
        self.personalNotes = personalNotes
        self.grossProfit = grossProfit
        self.grossLoss = grossLoss
        self.brokerage = brokerage
        self.stt = stt
        self.exchangeCharges = exchangeCharges
        self.gst = gst
        self.sebiCharges = sebiCharges
        self.stampDuty = stampDuty
        self.otherCharges = otherCharges
        self.totalCharges = totalCharges
        self.netPnl = netPnl
    }
}

// MARK: - Bulk Import Models
public struct BulkTradeItem: Codable, Sendable {
    public let tradeDate: String
    public let indexName: String
    public let tradingType: String
    public let strategyName: String
    public let optionType: String
    public let strikePrice: Double?
    public let quantity: Int
    public let lots: Int
    public let entryPremium: Double?
    public let exitPremium: Double?
    
    public init(tradeDate: String, indexName: String, tradingType: String, strategyName: String, optionType: String, strikePrice: Double?, quantity: Int, lots: Int, entryPremium: Double?, exitPremium: Double?) {
        self.tradeDate = tradeDate
        self.indexName = indexName
        self.tradingType = tradingType
        self.strategyName = strategyName
        self.optionType = optionType
        self.strikePrice = strikePrice
        self.quantity = quantity
        self.lots = lots
        self.entryPremium = entryPremium
        self.exitPremium = exitPremium
    }
}

public struct BulkImportRequest: Codable, Sendable {
    public let trades: [BulkTradeItem]
    
    public init(trades: [BulkTradeItem]) {
        self.trades = trades
    }
}

public struct BulkImportResponse: Codable, Sendable {
    public let success: Bool
    public let message: String
    public let importedCount: Int?
}
