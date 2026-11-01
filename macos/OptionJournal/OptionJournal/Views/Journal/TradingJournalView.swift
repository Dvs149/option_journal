import SwiftUI

public struct TradingJournalView: View {
    @Environment(\.colorScheme) private var colorScheme
    @StateObject private var viewModel = TradingJournalViewModel()
    
    public init() {}
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header
            headerView
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            // Content
            if viewModel.isLoading && viewModel.trades.isEmpty {
                VStack {
                    Spacer()
                    ProgressView("Loading journal entries...")
                        .font(.system(size: 13))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage, viewModel.trades.isEmpty {
                VStack(spacing: 12) {
                    Spacer()
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 32))
                        .foregroundColor(KiteTheme.lossRed)
                    Text("Failed to load journal")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    Text(error)
                        .font(.system(size: 12))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Button("Try Again") {
                        Task { await viewModel.loadJournal() }
                    }
                    .buttonStyle(KiteSecondaryButtonStyle())
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(spacing: 16) {
                        // Summary Stats Bar
                        summaryStatsBar
                        
                        // Filters Toolbar
                        filtersToolbar
                        
                        // Journal Entries List
                        if viewModel.trades.isEmpty {
                            VStack(spacing: 12) {
                                Image(systemName: "book.closed")
                                    .font(.system(size: 36))
                                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                Text("No Journal Entries Found")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                                Text("Try adjusting your search criteria or outcome filters.")
                                    .font(.system(size: 12))
                                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                            }
                            .padding(.vertical, 40)
                            .frame(maxWidth: .infinity)
                        } else {
                            VStack(spacing: 12) {
                                ForEach(viewModel.trades) { trade in
                                    journalCard(trade)
                                }
                            }
                            
                            // Pagination
                            paginationFooter
                        }
                    }
                    .padding(20)
                }
            }
        }
        .background(KiteTheme.canvas(for: colorScheme))
        .sheet(isPresented: $viewModel.showEditSheet) {
            JournalReflectionSheet(viewModel: viewModel)
        }
        .task {
            await viewModel.loadJournal()
        }
    }
    
    // MARK: - Header
    private var headerView: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Trading Journal & Reflection")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                Text("Post-trade reviews, psychological discipline, mistake logging, and lessons learned")
                    .font(.system(size: 12))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
            
            Spacer()
            
            Button(action: {
                Task { await viewModel.loadJournal(page: viewModel.currentPage) }
            }) {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
            .buttonStyle(PlainButtonStyle())
            .padding(6)
            .background(KiteTheme.surface(for: colorScheme))
            .overlay(
                RoundedRectangle(cornerRadius: 4)
                    .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
            )
            .help("Refresh Journal")
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
    }
    
    // MARK: - Summary Stats Bar
    @ViewBuilder
    private var summaryStatsBar: some View {
        if let stats = viewModel.summaryStats {
            HStack(spacing: 12) {
                statPill(title: "TOTAL ENTRIES", value: "\(stats.totalEntries)", color: KiteTheme.textPrimary(for: colorScheme))
                statPill(
                    title: "WIN RATE",
                    value: String(format: "%.1f%%", stats.winRate ?? 0),
                    color: (stats.winRate ?? 0) >= 50 ? KiteTheme.profitGreen : KiteTheme.brandOrange
                )
                statPill(
                    title: "BEST TRADE",
                    value: formatCurrency(stats.bestTradePnl ?? 0),
                    color: KiteTheme.profitGreen,
                    sub: stats.bestTradeDate
                )
                statPill(
                    title: "WORST TRADE",
                    value: formatCurrency(stats.worstTradePnl ?? 0),
                    color: KiteTheme.lossRed,
                    sub: stats.worstTradeDate
                )
            }
        }
    }
    
    private func statPill(title: String, value: String, color: Color, sub: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.system(size: 9, weight: .semibold))
                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            Text(value)
                .font(.system(size: 14, weight: .bold, design: .monospaced))
                .foregroundColor(color)
            if let sub = sub, !sub.isEmpty {
                Text(sub)
                    .font(.system(size: 10))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(KiteTheme.surface(for: colorScheme))
        .overlay(
            RoundedRectangle(cornerRadius: 4)
                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
        )
    }
    
    // MARK: - Filters Toolbar
    private var filtersToolbar: some View {
        HStack(spacing: 12) {
            // Search field
            HStack(spacing: 6) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 11))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                TextField("Search lessons, mistakes, setups...", text: $viewModel.searchQuery)
                    .textFieldStyle(PlainTextFieldStyle())
                    .font(.system(size: 12))
                    .onSubmit {
                        Task { await viewModel.loadJournal(page: 1) }
                    }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .frame(width: 240)
            .background(KiteTheme.surface(for: colorScheme))
            .overlay(
                RoundedRectangle(cornerRadius: 4)
                    .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
            )
            
            // Outcome Picker
            Picker("Outcome", selection: $viewModel.selectedOutcome) {
                Text("All Outcomes").tag("ALL")
                Text("Wins Only").tag("win")
                Text("Losses Only").tag("loss")
            }
            .pickerStyle(.segmented)
            .frame(width: 240)
            .onChange(of: viewModel.selectedOutcome) { _ in
                Task { await viewModel.loadJournal(page: 1) }
            }
            
            // Mistakes toggle
            Toggle("Mistakes Logged Only", isOn: $viewModel.hasMistakesOnly)
                .font(.system(size: 12))
                .onChange(of: viewModel.hasMistakesOnly) { _ in
                    Task { await viewModel.loadJournal(page: 1) }
                }
            
            Spacer()
        }
    }
    
    // MARK: - Journal Card
    private func journalCard(_ trade: JournalTradeItem) -> some View {
        let net = trade.netPnl ?? 0.0
        let isProfit = trade.isProfit
        let j = trade.journal
        
        return VStack(alignment: .leading, spacing: 12) {
            // Header row
            HStack(alignment: .center, spacing: 12) {
                // Contract info
                HStack(spacing: 8) {
                    Text(trade.indexName)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    
                    Text(trade.optionType)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(trade.optionType == "CE" ? KiteTheme.profitGreen : KiteTheme.lossRed)
                        .padding(.horizontal, 4)
                        .padding(.vertical, 1)
                        .background(
                            (trade.optionType == "CE" ? KiteTheme.profitGreen : KiteTheme.lossRed).opacity(0.12)
                        )
                        .cornerRadius(3)
                    
                    if let strike = trade.strikePrice {
                        Text(String(format: "%.0f", strike))
                            .font(.system(size: 13, weight: .semibold, design: .monospaced))
                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    }
                    
                    Text("•")
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    
                    Text(trade.tradingType)
                        .font(.system(size: 11))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    
                    if let strat = trade.strategyName, !strat.isEmpty {
                        Text("•")
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        Text(strat)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(KiteTheme.brandBlue)
                    }
                }
                
                Spacer()
                
                // Date & Net P&L
                HStack(spacing: 16) {
                    Text(trade.displayDate ?? trade.tradeDate)
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    
                    Text(formatCurrency(net))
                        .font(.system(size: 15, weight: .bold, design: .monospaced))
                        .foregroundColor(isProfit ? KiteTheme.profitGreen : KiteTheme.lossRed)
                    
                    Button("Reflect") {
                        viewModel.openReflectionSheet(for: trade)
                    }
                    .buttonStyle(KiteSecondaryButtonStyle())
                }
            }
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            // Reflection Notes Content
            if let j = j, hasAnyReflection(j) {
                VStack(alignment: .leading, spacing: 8) {
                    if let setup = j.tradeSetup, !setup.isEmpty {
                        reflectionBlock(label: "TRADE SETUP & CONTEXT", text: setup, color: KiteTheme.brandBlue)
                    }
                    
                    if let right = j.whatWentRight, !right.isEmpty {
                        reflectionBlock(label: "WHAT WENT RIGHT", text: right, color: KiteTheme.profitGreen)
                    }
                    
                    if let wrong = j.whatWentWrong, !wrong.isEmpty {
                        reflectionBlock(label: "WHAT WENT WRONG", text: wrong, color: KiteTheme.lossRed)
                    }
                    
                    if let mistakes = j.mistakesMade, !mistakes.isEmpty {
                        HStack(alignment: .top, spacing: 6) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 11))
                                .foregroundColor(KiteTheme.brandOrange)
                            reflectionBlock(label: "DISCIPLINE MISTAKES", text: mistakes, color: KiteTheme.brandOrange)
                        }
                    }
                    
                    if let lessons = j.lessonsLearned, !lessons.isEmpty {
                        reflectionBlock(label: "KEY LESSONS", text: lessons, color: KiteTheme.textPrimary(for: colorScheme))
                    }
                    
                    if let notes = j.personalNotes, !notes.isEmpty {
                        reflectionBlock(label: "JOURNAL NOTES", text: notes, color: KiteTheme.textSecondary(for: colorScheme))
                    }
                }
            } else {
                HStack {
                    Text("No reflection logged yet for this trade.")
                        .font(.system(size: 12))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme).opacity(0.6))
                    Spacer()
                    Button("Log Reflection Now") {
                        viewModel.openReflectionSheet(for: trade)
                    }
                    .buttonStyle(KiteGhostButtonStyle())
                }
            }
        }
        .padding(14)
        .background(KiteTheme.surface(for: colorScheme))
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
        )
    }
    
    private func reflectionBlock(label: String, text: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.system(size: 9, weight: .bold))
                .foregroundColor(color)
            Text(text)
                .font(.system(size: 12))
                .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
        }
    }
    
    private func hasAnyReflection(_ j: TradeJournal) -> Bool {
        !(j.tradeSetup ?? "").isEmpty ||
        !(j.whatWentRight ?? "").isEmpty ||
        !(j.whatWentWrong ?? "").isEmpty ||
        !(j.mistakesMade ?? "").isEmpty ||
        !(j.lessonsLearned ?? "").isEmpty ||
        !(j.personalNotes ?? "").isEmpty
    }
    
    // MARK: - Pagination Footer
    private var paginationFooter: some View {
        HStack {
            Text("Showing \(viewModel.trades.count) of \(viewModel.totalTrades) entries")
                .font(.system(size: 11))
                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            
            Spacer()
            
            HStack(spacing: 8) {
                Button("Previous") {
                    if viewModel.currentPage > 1 {
                        Task { await viewModel.loadJournal(page: viewModel.currentPage - 1) }
                    }
                }
                .buttonStyle(KiteSecondaryButtonStyle())
                .disabled(viewModel.currentPage <= 1)
                
                Text("Page \(viewModel.currentPage) of \(max(1, viewModel.totalPages))")
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                
                Button("Next") {
                    if viewModel.currentPage < viewModel.totalPages {
                        Task { await viewModel.loadJournal(page: viewModel.currentPage + 1) }
                    }
                }
                .buttonStyle(KiteSecondaryButtonStyle())
                .disabled(viewModel.currentPage >= viewModel.totalPages)
            }
        }
        .padding(.top, 8)
    }
    
    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "₹"
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: value)) ?? "₹\(value)"
    }
}

// MARK: - Journal Reflection Sheet
public struct JournalReflectionSheet: View {
    @ObservedObject var viewModel: TradingJournalViewModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Trade Reflection & Post-Mortem")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    if let trade = viewModel.selectedTrade {
                        Text("\(trade.indexName) \(trade.optionType) • \(trade.displayDate ?? trade.tradeDate)")
                            .font(.system(size: 12))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    }
                }
                
                Spacer()
                
                Button(action: { dismiss() }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        .frame(width: 24, height: 24)
                        .background(KiteTheme.surface(for: colorScheme))
                        .cornerRadius(12)
                }
                .buttonStyle(PlainButtonStyle())
            }
            .padding(16)
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            // Scrollable fields
            ScrollView {
                VStack(spacing: 14) {
                    fieldBlock(title: "Market Conditions & Bias", placeholder: "e.g. Gap up, CPR breakout, high IV", text: $viewModel.editMarketConditions)
                    fieldBlock(title: "Trade Setup & Entry Rationale", placeholder: "e.g. 15m candle close above EMA, volume surge", text: $viewModel.editTradeSetup)
                    fieldBlock(title: "What Went Right", placeholder: "e.g. Followed stop loss strictly, let winners run", text: $viewModel.editWhatWentRight)
                    fieldBlock(title: "What Went Wrong", placeholder: "e.g. Premature exit, chased momentum", text: $viewModel.editWhatWentWrong)
                    fieldBlock(title: "Mistakes Made (Discipline)", placeholder: "e.g. Over-leveraged, entered before candle confirmation", text: $viewModel.editMistakesMade)
                    fieldBlock(title: "Lessons Learned & Rules to Adopt", placeholder: "e.g. Never trade without predetermined stop loss", text: $viewModel.editLessonsLearned)
                    fieldBlock(title: "Personal Notes", placeholder: "Additional observations", text: $viewModel.editPersonalNotes)
                    
                    if let err = viewModel.errorMessage {
                        Text(err)
                            .font(.system(size: 11))
                            .foregroundColor(KiteTheme.lossRed)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .padding(16)
            }
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            // Footer
            HStack {
                Spacer()
                Button("Cancel") { dismiss() }
                    .buttonStyle(KiteSecondaryButtonStyle())
                
                Button(action: {
                    Task {
                        _ = await viewModel.saveReflection()
                    }
                }) {
                    if viewModel.isSaving {
                        ProgressView()
                            .scaleEffect(0.7)
                            .frame(width: 100)
                    } else {
                        Text("Save Reflection")
                            .frame(width: 100)
                    }
                }
                .buttonStyle(KitePrimaryButtonStyle())
                .disabled(viewModel.isSaving)
            }
            .padding(16)
        }
        .frame(width: 540, height: 600)
        .background(KiteTheme.canvas(for: colorScheme))
    }
    
    private func fieldBlock(title: String, placeholder: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
            
            TextField(placeholder, text: text)
                .textFieldStyle(PlainTextFieldStyle())
                .font(.system(size: 12))
                .padding(8)
                .background(KiteTheme.surface(for: colorScheme))
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
                )
        }
    }
}
