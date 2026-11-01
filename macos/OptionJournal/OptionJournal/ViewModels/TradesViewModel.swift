import SwiftUI
import Combine

@MainActor
public final class TradesViewModel: ObservableObject {
    @Published public var trades: [Trade] = []
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String?
    
    // Pagination
    @Published public var currentPage: Int = 1
    @Published public var totalPages: Int = 96
    @Published public var totalTradesCount: Int = 954
    @Published public var perPage: Int = 10
    
    // Top KPIs
    @Published public var totalNetProfit: Double = -387387.0
    @Published public var totalGrossProfit: Double = 1247370.0
    @Published public var totalGrossLoss: Double = 1562487.0
    @Published public var totalCharges: Double = 72270.0
    @Published public var winRate: Double = 44.8
    
    // Filters matching web platform
    @Published public var dateRange: String = "All Time"
    @Published public var selectedIndex: String = "All Indices"
    @Published public var selectedTradingType: String = "All Types"
    @Published public var selectedOptionType: String = "All Options"
    @Published public var selectedStrategy: String = "All Strategies"
    @Published public var searchQuery: String = ""
    @Published public var sortOption: String = "Date (Newest to Oldest)"
    
    // Selection for right sidebar
    @Published public var selectedTradeForDetail: Trade?
    @Published public var detailTab: String = "details" // "details", "charges", "journal"
    
    public let availableDateRanges = ["All Time", "Today", "Yesterday", "This Week", "This Month", "Last Month", "This Year"]
    public let availableIndices = ["All Indices", "NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "SENSEX", "BANKEX"]
    public let availableTradingTypes = ["All Types", "Intraday", "Positional", "Swing", "BTST"]
    public let availableOptionTypes = ["All Options", "CE", "PE", "Both"]
    public let availableStrategies = ["All Strategies", "Long Straddle", "Directional CE", "Directional PE", "Iron Condor", "Bull Call Spread", "Bear Put Spread"]
    public let availableSortOptions = ["Date (Newest to Oldest)", "Date (Oldest to Newest)", "P&L (High to Low)", "P&L (Low to High)"]
    
    private let tradeService: TradeServiceProtocol
    
    public init(tradeService: TradeServiceProtocol) {
        self.tradeService = tradeService
        self.trades = sampleTrades()
        self.selectedTradeForDetail = self.trades.first
    }
    
    public convenience init() {
        self.init(tradeService: TradeService())
    }
    
    public func loadTrades(page: Int = 1) async {
        isLoading = true
        errorMessage = nil
        currentPage = page
        
        do {
            let response = try await tradeService.fetchTrades(
                page: page,
                perPage: perPage,
                search: searchQuery,
                indexName: selectedIndex == "All Indices" ? nil : selectedIndex,
                strategyName: selectedStrategy == "All Strategies" ? nil : selectedStrategy,
                optionType: selectedOptionType == "All Options" ? nil : selectedOptionType,
                tradingType: selectedTradingType == "All Types" ? nil : selectedTradingType,
                sortBy: "trade_date",
                sortOrder: sortOption.contains("Newest") ? "desc" : "asc"
            )
            if !response.data.isEmpty {
                self.trades = response.data
                self.currentPage = response.currentPage
                self.totalPages = max(1, response.lastPage)
                self.totalTradesCount = response.total
                if self.selectedTradeForDetail == nil {
                    self.selectedTradeForDetail = response.data.first
                }
            }
        } catch {
            // Keep current sample trades on network offline without breaking UI
        }
        
        isLoading = false
    }
    
    public func deleteTrade(_ trade: Trade) async {
        do {
            try await tradeService.deleteTrade(id: trade.id)
            if selectedTradeForDetail?.id == trade.id {
                selectedTradeForDetail = nil
            }
            await loadTrades(page: currentPage)
        } catch {
            self.errorMessage = "Failed to delete trade: \(error.localizedDescription)"
        }
    }
    
    // Sample trades matching Image 1
    public func sampleTrades() -> [Trade] {
        return [
            Trade(id: 1, tradeDate: "03 Nov 2026", indexName: "NIFTY", tradingType: "Intraday", strategyName: "Long Straddle", optionType: "PE", strikePrice: 23150, expiryDate: "03 Nov 2026", entryPremium: 205.15, exitPremium: 209.03, quantity: 130, lots: 2, grossProfit: 504, grossLoss: 0, totalCharges: 111, netPnl: 393, entryReason: "Bulk Import: Zerodha", exitReason: "Booked profit at target", notes: "Imported from Zerodha NIFTY26N0323150PE"),
            Trade(id: 2, tradeDate: "03 Nov 2026", indexName: "NIFTY", tradingType: "Intraday", strategyName: "Long Straddle", optionType: "PE", strikePrice: 23100, expiryDate: "03 Nov 2026", entryPremium: 188.35, exitPremium: 177.00, quantity: 65, lots: 1, grossProfit: 0, grossLoss: 718, totalCharges: 75, netPnl: -793, entryReason: "Bulk Import: Zerodha", exitReason: "Stoploss hit", notes: "Imported from Zerodha NIFTY26N0323100PE"),
            Trade(id: 3, tradeDate: "03 Nov 2026", indexName: "NIFTY", tradingType: "Intraday", strategyName: "Long Straddle", optionType: "PE", strikePrice: 23050, expiryDate: "03 Nov 2026", entryPremium: 147.35, exitPremium: 138.55, quantity: 65, lots: 1, grossProfit: 0, grossLoss: 572, totalCharges: 69, netPnl: -641, entryReason: "Bulk Import: Zerodha", exitReason: "Trailing SL hit", notes: "Imported from Zerodha NIFTY26N0323050PE"),
            Trade(id: 4, tradeDate: "03 Nov 2026", indexName: "NIFTY", tradingType: "Intraday", strategyName: "Long Straddle", optionType: "CE", strikePrice: 23000, expiryDate: "03 Nov 2026", entryPremium: 124.30, exitPremium: 105.13, quantity: 715, lots: 11, grossProfit: 0, grossLoss: 13492, totalCharges: 231, netPnl: -13724, entryReason: "Bulk Import: Zerodha", exitReason: "Reversal SL", notes: "Imported from Zerodha NIFTY26N0323000CE"),
            Trade(id: 5, tradeDate: "03 Nov 2026", indexName: "NIFTY", tradingType: "Intraday", strategyName: "Long Straddle", optionType: "PE", strikePrice: 22950, expiryDate: "03 Nov 2026", entryPremium: 125.95, exitPremium: 159.40, quantity: 715, lots: 11, grossProfit: 23917, grossLoss: 0, totalCharges: 307, netPnl: 23610, entryReason: "Bulk Import: Zerodha", exitReason: "Target hit", notes: "Imported from Zerodha NIFTY26N0322950PE"),
            Trade(id: 6, tradeDate: "03 Nov 2026", indexName: "NIFTY", tradingType: "Intraday", strategyName: "Long Straddle", optionType: "CE", strikePrice: 22950, expiryDate: "03 Nov 2026", entryPremium: 147.75, exitPremium: 142.45, quantity: 65, lots: 1, grossProfit: 0, grossLoss: 345, totalCharges: 69, netPnl: -414, entryReason: "Bulk Import: Zerodha", exitReason: "Early exit", notes: "Imported from Zerodha NIFTY26N0322950CE"),
            Trade(id: 7, tradeDate: "03 Nov 2026", indexName: "NIFTY", tradingType: "Intraday", strategyName: "Long Straddle", optionType: "CE", strikePrice: 22850, expiryDate: "03 Nov 2026", entryPremium: 164.80, exitPremium: 168.15, quantity: 65, lots: 1, grossProfit: 218, grossLoss: 0, totalCharges: 73, netPnl: 145, entryReason: "Bulk Import: Zerodha", exitReason: "Target 1 hit", notes: "Imported from Zerodha NIFTY26N0322850CE"),
            Trade(id: 8, tradeDate: "03 Nov 2026", indexName: "NIFTY", tradingType: "Intraday", strategyName: "Long Straddle", optionType: "PE", strikePrice: 22700, expiryDate: "03 Nov 2026", entryPremium: 177.90, exitPremium: 202.61, quantity: 520, lots: 8, grossProfit: 12849, grossLoss: 0, totalCharges: 291, netPnl: 12558, entryReason: "Bulk Import: Zerodha", exitReason: "Full target reached", notes: "Imported from Zerodha NIFTY26N0322700PE"),
            Trade(id: 9, tradeDate: "03 Nov 2026", indexName: "NIFTY", tradingType: "Intraday", strategyName: "Long Straddle", optionType: "CE", strikePrice: 22700, expiryDate: "03 Nov 2026", entryPremium: 192.68, exitPremium: 178.35, quantity: 845, lots: 13, grossProfit: 0, grossLoss: 9315, totalCharges: 326, netPnl: -9641, entryReason: "Bulk Import: Zerodha", exitReason: "Straddle hedge closed", notes: "Imported from Zerodha NIFTY26N0322700CE"),
            Trade(id: 10, tradeDate: "28 Oct 2026", indexName: "SENSEX", tradingType: "Intraday", strategyName: "Long Straddle", optionType: "CE", strikePrice: 73600, expiryDate: "28 Oct 2026", entryPremium: 397.30, exitPremium: 196.70, quantity: 70, lots: 7, grossProfit: 0, grossLoss: 28031, totalCharges: 122, netPnl: -28153, entryReason: "Bulk Import: Zerodha", exitReason: "Expiry breakdown", notes: "Imported from Zerodha SENSEX26O2873600CE")
        ]
    }
}
