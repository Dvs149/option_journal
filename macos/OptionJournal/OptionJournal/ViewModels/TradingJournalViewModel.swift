import Foundation
import Combine
import SwiftUI

public struct DetailedJournalEntry: Identifiable, Sendable {
    public let id: Int
    public let date: String
    public let indexName: String
    public let tradingType: String
    public let optionType: String
    public let strike: Int?
    public let strategy: String
    public let netPnl: Double
    public let mood: String // "happy", "neutral", "sad"
    public let rating: Int // 1 to 5
    public let tags: [String]
    public let marketConditions: String
    public let tradeSetup: String
    public let whatWentRight: String
    public let whatWentWrong: String
    public let mistakesMade: String
    public let lessonsLearned: String
    public let personalNotes: String
}

@MainActor
public final class TradingJournalViewModel: ObservableObject {
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var searchQuery: String = ""
    @Published public var selectedFilter: String = "ALL" // "ALL", "SUCCESSFUL", "MISTAKES"
    @Published public var activeInspectorTab: String = "notes" // "details", "notes", "screenshots", "lessons"
    
    // Top 5 Metrics
    @Published public var totalJournalEntries: Int = 954
    @Published public var successfulTrades: Int = 427
    @Published public var failedTrades: Int = 526
    @Published public var bestTradePnl: Double = 44216.0
    @Published public var bestTradeDate: String = "11 Aug 2026"
    @Published public var worstTradePnl: Double = -69174.0
    @Published public var worstTradeDate: String = "23 Jul 2026"
    
    // Entries List
    @Published public var entries: [DetailedJournalEntry] = []
    @Published public var selectedEntry: DetailedJournalEntry?
    
    private let journalService: JournalServiceProtocol
    
    public init(journalService: JournalServiceProtocol) {
        self.journalService = journalService
        self.entries = sampleEntries()
        self.selectedEntry = self.entries.first
    }
    
    public convenience init() {
        self.init(journalService: JournalService())
    }
    
    public func loadJournal() async {
        isLoading = true
        errorMessage = nil
        do {
            let res = try await journalService.fetchJournal(page: 1, perPage: 20, strategy: nil, optionType: nil, outcome: nil, search: nil, hasMistakes: nil)
            if !res.data.isEmpty {
                self.totalJournalEntries = res.total
            }
            self.isLoading = false
        } catch {
            self.isLoading = false
        }
    }
    
    private func sampleEntries() -> [DetailedJournalEntry] {
        return [
            DetailedJournalEntry(
                id: 1,
                date: "03 Nov 2026",
                indexName: "NIFTY",
                tradingType: "Intraday",
                optionType: "PE",
                strike: 22950,
                strategy: "Long Straddle",
                netPnl: 23610,
                mood: "happy",
                rating: 5,
                tags: ["NIFTY", "Long Straddle", "Disciplined"],
                marketConditions: "High implied volatility prior to US election results",
                tradeSetup: "Long Straddle at ATM 22950 before opening bell",
                whatWentRight: "Target 1 hit smoothly at 159.40, trailing SL protected gains",
                whatWentWrong: "Exited early before secondary momentum expansion",
                mistakesMade: "None, followed rules strictly",
                lessonsLearned: "Straddles during high IV collapse work best with trailing SL",
                personalNotes: "Great emotional calmness throughout the trade."
            ),
            DetailedJournalEntry(
                id: 2,
                date: "03 Nov 2026",
                indexName: "NIFTY",
                tradingType: "Intraday",
                optionType: "PE",
                strike: 22700,
                strategy: "Long Straddle",
                netPnl: 12558,
                mood: "happy",
                rating: 4,
                tags: ["NIFTY", "Target Hit"],
                marketConditions: "Trend continuation after morning consolidation",
                tradeSetup: "PE leg breakdown at 22700 support",
                whatWentRight: "Executed immediately on 5-min candle breakdown",
                whatWentWrong: "Minor slippage on market exit order",
                mistakesMade: "Used market order instead of limit order",
                lessonsLearned: "Always use limit orders on options during volatile sessions",
                personalNotes: "Confidence is rebuilding nicely."
            ),
            DetailedJournalEntry(
                id: 3,
                date: "03 Nov 2026",
                indexName: "NIFTY",
                tradingType: "Intraday",
                optionType: "CE",
                strike: 23000,
                strategy: "Long Straddle",
                netPnl: -13724,
                mood: "sad",
                rating: 2,
                tags: ["NIFTY", "Stoploss", "Decay"],
                marketConditions: "Choppy theta decay midday between 11:30 and 13:00",
                tradeSetup: "CE hedge attempt after PE leg scaled out",
                whatWentRight: "Strictly executed SL at ₹105 without hoping",
                whatWentWrong: "Entered during midday lunch hour chop",
                mistakesMade: "Traded during low-volume lunchtime period",
                lessonsLearned: "Do not open new breakout positions between 11:30 and 13:30",
                personalNotes: "Disappointed with timing, but respected stoploss."
            ),
            DetailedJournalEntry(
                id: 4,
                date: "28 Oct 2026",
                indexName: "SENSEX",
                tradingType: "Intraday",
                optionType: "CE",
                strike: 73600,
                strategy: "Long Straddle",
                netPnl: -28153,
                mood: "sad",
                rating: 1,
                tags: ["SENSEX", "Expiry", "Oversized"],
                marketConditions: "Expiry day premium erosion with sudden sharp spikes",
                tradeSetup: "Holding 7 lots into zero-hero expiry",
                whatWentRight: "Initial entry was profitable for 10 minutes",
                whatWentWrong: "Greed prevented booking profit at +15%",
                mistakesMade: "Oversized position with 7 lots on expiry day",
                lessonsLearned: "Max lot size on expiry must be capped at 3 lots",
                personalNotes: "Painful lesson on expiry day greed."
            ),
            DetailedJournalEntry(
                id: 5,
                date: "23 Jul 2026",
                indexName: "BANKNIFTY",
                tradingType: "Intraday",
                optionType: "PE",
                strike: 51200,
                strategy: "Directional PE",
                netPnl: -69174,
                mood: "sad",
                rating: 1,
                tags: ["BANKNIFTY", "Revenge Trading"],
                marketConditions: "Budget day violent whipsaw both sides",
                tradeSetup: "Chasing gap down after missing initial move",
                whatWentRight: "Cut position before 100% wipeout",
                whatWentWrong: "FOMO chased price at extended highs",
                mistakesMade: "Averaged down on losing PE position twice",
                lessonsLearned: "NEVER average down on option buying. Hard rule.",
                personalNotes: "Worst trade of the year. Must review every week."
            )
        ]
    }
}
