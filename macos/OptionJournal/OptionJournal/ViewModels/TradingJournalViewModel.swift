import Foundation
import Combine
import SwiftUI

@MainActor
public final class TradingJournalViewModel: ObservableObject {
    @Published public var trades: [JournalTradeItem] = []
    @Published public var summaryStats: JournalSummaryStats? = nil
    @Published public var isLoading: Bool = false
    @Published public var isSaving: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var successMessage: String? = nil
    
    // Filters & Pagination
    @Published public var searchQuery: String = ""
    @Published public var selectedStrategy: String = "ALL"
    @Published public var selectedOutcome: String = "ALL"
    @Published public var hasMistakesOnly: Bool = false
    @Published public var currentPage: Int = 1
    @Published public var totalPages: Int = 1
    @Published public var totalTrades: Int = 0
    
    // Active Reflection Editing
    @Published public var selectedTrade: JournalTradeItem? = nil
    @Published public var showEditSheet: Bool = false
    @Published public var editMarketConditions: String = ""
    @Published public var editTradeSetup: String = ""
    @Published public var editWhatWentRight: String = ""
    @Published public var editWhatWentWrong: String = ""
    @Published public var editMistakesMade: String = ""
    @Published public var editLessonsLearned: String = ""
    @Published public var editPersonalNotes: String = ""
    
    private let journalService: JournalServiceProtocol
    
    public init(journalService: JournalServiceProtocol) {
        self.journalService = journalService
    }
    
    public convenience init() {
        self.init(journalService: JournalService())
    }
    
    public func loadJournal(page: Int = 1) async {
        isLoading = true
        errorMessage = nil
        currentPage = page
        
        do {
            let res = try await journalService.fetchJournal(
                page: page,
                perPage: 15,
                strategy: selectedStrategy == "ALL" ? nil : selectedStrategy,
                optionType: nil,
                outcome: selectedOutcome == "ALL" ? nil : selectedOutcome,
                search: searchQuery.isEmpty ? nil : searchQuery,
                hasMistakes: hasMistakesOnly ? true : nil
            )
            
            self.trades = res.data
            self.summaryStats = res.summaryStats
            self.currentPage = res.currentPage
            self.totalPages = res.lastPage
            self.totalTrades = res.total
            self.isLoading = false
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
        }
    }
    
    public func openReflectionSheet(for trade: JournalTradeItem) {
        self.selectedTrade = trade
        let j = trade.journal
        self.editMarketConditions = j?.marketConditions ?? ""
        self.editTradeSetup = j?.tradeSetup ?? ""
        self.editWhatWentRight = j?.whatWentRight ?? ""
        self.editWhatWentWrong = j?.whatWentWrong ?? ""
        self.editMistakesMade = j?.mistakesMade ?? ""
        self.editLessonsLearned = j?.lessonsLearned ?? ""
        self.editPersonalNotes = j?.personalNotes ?? ""
        self.showEditSheet = true
    }
    
    public func saveReflection() async -> Bool {
        guard let trade = selectedTrade else { return false }
        isSaving = true
        errorMessage = nil
        
        do {
            let req = UpdateJournalRequest(
                marketConditions: editMarketConditions,
                tradeSetup: editTradeSetup,
                whatWentRight: editWhatWentRight,
                whatWentWrong: editWhatWentWrong,
                mistakesMade: editMistakesMade,
                lessonsLearned: editLessonsLearned,
                personalNotes: editPersonalNotes
            )
            try await journalService.updateJournal(tradeId: trade.id, request: req)
            isSaving = false
            showEditSheet = false
            successMessage = "Trade reflection saved successfully"
            await loadJournal(page: currentPage)
            return true
        } catch {
            self.errorMessage = error.localizedDescription
            self.isSaving = false
            return false
        }
    }
}
