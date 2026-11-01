import SwiftUI
import Combine

@MainActor
public final class TradesViewModel: ObservableObject {
    @Published public var trades: [Trade] = []
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String?
    
    // Pagination
    @Published public var currentPage: Int = 1
    @Published public var totalPages: Int = 1
    @Published public var totalTradesCount: Int = 0
    @Published public var perPage: Int = 25
    
    // Filters
    @Published public var searchQuery: String = ""
    @Published public var selectedIndex: String = "ALL"
    @Published public var selectedStrategy: String = "ALL"
    @Published public var selectedOptionType: String = "ALL"
    @Published public var selectedTradingType: String = "ALL"
    
    // Sorting
    @Published public var sortBy: String = "trade_date"
    @Published public var sortOrder: String = "desc"
    
    // Selection for inspector sheet
    @Published public var selectedTradeForDetail: Trade?
    
    public let availableIndices = ["ALL", "NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "SENSEX"]
    public let availableOptionTypes = ["ALL", "CE", "PE", "Both"]
    public let availableTradingTypes = ["ALL", "Intraday", "BTST", "Positional"]
    
    private let tradeService: TradeServiceProtocol
    
    public init(tradeService: TradeServiceProtocol) {
        self.tradeService = tradeService
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
                indexName: selectedIndex,
                strategyName: selectedStrategy,
                optionType: selectedOptionType,
                tradingType: selectedTradingType,
                sortBy: sortBy,
                sortOrder: sortOrder
            )
            self.trades = response.data
            self.currentPage = response.currentPage
            self.totalPages = max(1, response.lastPage)
            self.totalTradesCount = response.total
        } catch let netErr as NetworkError {
            self.errorMessage = netErr.localizedDescription
        } catch {
            self.errorMessage = error.localizedDescription
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
    
    public func toggleSort(column: String) async {
        if sortBy == column {
            sortOrder = sortOrder == "asc" ? "desc" : "asc"
        } else {
            sortBy = column
            sortOrder = "desc"
        }
        await loadTrades(page: 1)
    }
}
