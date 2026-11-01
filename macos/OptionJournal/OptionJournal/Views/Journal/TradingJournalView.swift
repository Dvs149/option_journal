import SwiftUI
import Charts

public struct TradingJournalView: View {
    @StateObject private var viewModel = TradingJournalViewModel()
    @ObservedObject private var preferences = PreferencesManager.shared
    @Environment(\.colorScheme) private var colorScheme
    
    public init() {}
    
    public var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(alignment: .leading, spacing: 20) {
                // MARK: - Header
                headerSection
                
                // MARK: - Top 5 Metric Cards
                kpiMetricsSection
                
                // MARK: - Main 2-Column Split: Entries Table + Journal Details Inspector
                HStack(alignment: .top, spacing: 16) {
                    journalEntriesTableCard
                        .frame(minWidth: 500, maxWidth: .infinity)
                    
                    if let selected = viewModel.selectedEntry {
                        journalDetailsInspector(for: selected)
                            .frame(width: 380)
                            .transition(.move(edge: .trailing).combined(with: .opacity))
                    }
                }
                .frame(maxWidth: .infinity)
                
                // MARK: - Bottom Row: Strategy Performance + Sentiment + Common Tags
                HStack(alignment: .top, spacing: 16) {
                    strategyPerformanceCard
                        .frame(minWidth: 320, maxWidth: .infinity)
                    
                    sentimentAnalysisCard
                        .frame(width: 300)
                    
                    commonTagsCard
                        .frame(width: 320)
                }
                .frame(maxWidth: .infinity)
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .background(Color(hex: "0b111e"))
        .task {
            await viewModel.loadJournal()
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Trading Journal")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundColor(.white)
                Text("Document your trading decisions, psychology, notes, lessons learned and emotions")
                    .font(.system(size: 13))
                    .foregroundColor(Color(hex: "94a3b8"))
            }
            
            Spacer()
            
            HStack(spacing: 6) {
                Image(systemName: "calendar")
                    .font(.system(size: 11))
                    .foregroundColor(Color(hex: "3b82f6"))
                Text("All Time")
                    .font(.system(size: 12))
                    .foregroundColor(.white)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color(hex: "121b2d"))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color(hex: "1e293b"), lineWidth: 1)
            )
        }
    }
    
    // MARK: - Top 5 Metric Cards
    private var kpiMetricsSection: some View {
        HStack(spacing: 12) {
            journalKpiCard(
                title: "Total Journal Entries",
                value: "\(viewModel.totalJournalEntries)",
                sub: "All logged trades",
                subColor: Color(hex: "3b82f6"),
                icon: "book.fill",
                iconColor: Color(hex: "3b82f6")
            )
            
            journalKpiCard(
                title: "Successful Trades",
                value: "\(viewModel.successfulTrades)",
                sub: "Win rate 44.8%",
                subColor: Color(hex: "10b981"),
                icon: "checkmark.circle.fill",
                iconColor: Color(hex: "10b981")
            )
            
            journalKpiCard(
                title: "Failed Trades",
                value: "\(viewModel.failedTrades)",
                sub: "Loss rate 55.1%",
                subColor: Color(hex: "f43f5e"),
                icon: "exclamationmark.triangle.fill",
                iconColor: Color(hex: "f43f5e")
            )
            
            journalKpiCard(
                title: "Best Trade",
                value: "+₹\(Int(viewModel.bestTradePnl))",
                sub: viewModel.bestTradeDate,
                subColor: Color(hex: "10b981"),
                icon: "trophy.fill",
                iconColor: Color(hex: "10b981"),
                valColor: Color(hex: "10b981")
            )
            
            journalKpiCard(
                title: "Worst Trade",
                value: "-₹\(Int(abs(viewModel.worstTradePnl)))",
                sub: viewModel.worstTradeDate,
                subColor: Color(hex: "f43f5e"),
                icon: "chart.line.downtrend.xyaxis",
                iconColor: Color(hex: "f43f5e"),
                valColor: Color(hex: "f43f5e")
            )
        }
    }
    
    private func journalKpiCard(title: String, value: String, sub: String, subColor: Color, icon: String, iconColor: Color, valColor: Color = .white) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(Color(hex: "94a3b8"))
                Spacer()
                Image(systemName: icon)
                    .font(.system(size: 12))
                    .foregroundColor(iconColor)
            }
            
            Text(value)
                .font(.system(size: 20, weight: .bold, design: .monospaced))
                .foregroundColor(valColor)
            
            Text(sub)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(subColor)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Journal Entries Table Card (Left)
    private var journalEntriesTableCard: some View {
        VStack(spacing: 0) {
            // Filter and Search Toolbar
            HStack(spacing: 12) {
                // Search Field
                HStack(spacing: 6) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 11))
                        .foregroundColor(Color(hex: "64748b"))
                    TextField("Search reflections, strategies, notes...", text: $viewModel.searchQuery)
                        .textFieldStyle(.plain)
                        .font(.system(size: 12))
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
                .background(Color(hex: "0e1524"))
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(Color(hex: "1e293b"), lineWidth: 1)
                )
                .frame(maxWidth: 280)
                
                // Outcome Filter Pills
                HStack(spacing: 4) {
                    filterPill("All (954)", code: "ALL")
                    filterPill("Successful (427)", code: "SUCCESSFUL")
                    filterPill("Mistakes Only (526)", code: "MISTAKES")
                }
                
                Spacer()
            }
            .padding(14)
            .background(Color(hex: "0e1524"))
            
            Divider().background(Color(hex: "1e293b"))
            
            // Table Header
            HStack(spacing: 8) {
                Text("MOOD").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 45, alignment: .leading)
                Text("DATE").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 85, alignment: .leading)
                Text("CONTRACT / STRATEGY").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 170, alignment: .leading)
                Text("NET P&L").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 85, alignment: .leading)
                Text("RATING").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 75, alignment: .leading)
                Spacer()
                Text("TAGS").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 130, alignment: .leading)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(Color(hex: "0e1524"))
            
            Divider().background(Color(hex: "1e293b"))
            
            // Rows
            VStack(spacing: 0) {
                ForEach(viewModel.entries) { entry in
                    journalRow(entry)
                        .onTapGesture {
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                viewModel.selectedEntry = entry
                            }
                        }
                    
                    Divider().background(Color(hex: "1e293b").opacity(0.5))
                }
            }
            
            // Pagination Footer
            HStack {
                Text("Showing 1 to \(viewModel.entries.count) of \(viewModel.totalJournalEntries) entries")
                    .font(.system(size: 11))
                    .foregroundColor(Color(hex: "94a3b8"))
                Spacer()
                HStack(spacing: 4) {
                    Text("< 1 2 3 ... 96 >")
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundColor(Color(hex: "94a3b8"))
                }
            }
            .padding(12)
            .background(Color(hex: "0e1524"))
        }
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    private func filterPill(_ title: String, code: String) -> some View {
        Button {
            viewModel.selectedFilter = code
        } label: {
            Text(title)
                .font(.system(size: 11, weight: viewModel.selectedFilter == code ? .bold : .medium))
                .foregroundColor(viewModel.selectedFilter == code ? .white : Color(hex: "94a3b8"))
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(viewModel.selectedFilter == code ? Color(hex: "3b82f6") : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: 6))
        }
        .buttonStyle(.plain)
    }
    
    private func journalRow(_ entry: DetailedJournalEntry) -> some View {
        let isSelected = viewModel.selectedEntry?.id == entry.id
        let isProfit = entry.netPnl >= 0
        
        return HStack(spacing: 8) {
            // Mood Emoji
            Text(entry.mood == "happy" ? "😊" : (entry.mood == "sad" ? "😞" : "😐"))
                .font(.system(size: 16))
                .frame(width: 45, alignment: .leading)
            
            // Date
            Text(entry.date)
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(.white)
                .frame(width: 85, alignment: .leading)
            
            // Contract & Strategy
            VStack(alignment: .leading, spacing: 1) {
                HStack(spacing: 4) {
                    Text(entry.indexName)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.white)
                    Text(entry.optionType)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(entry.optionType == "CE" ? Color(hex: "10b981") : Color(hex: "f43f5e"))
                    if let s = entry.strike {
                        Text("\(s)")
                            .font(.system(size: 10, design: .monospaced))
                            .foregroundColor(Color(hex: "94a3b8"))
                    }
                }
                Text(entry.strategy)
                    .font(.system(size: 10))
                    .foregroundColor(Color(hex: "64748b"))
            }
            .frame(width: 170, alignment: .leading)
            
            // Net P&L
            Text(isProfit ? "+₹\(Int(entry.netPnl))" : "-₹\(Int(abs(entry.netPnl)))")
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .foregroundColor(isProfit ? Color(hex: "10b981") : Color(hex: "f43f5e"))
                .frame(width: 85, alignment: .leading)
            
            // Star Rating
            HStack(spacing: 1) {
                ForEach(1...5, id: \.self) { star in
                    Image(systemName: star <= entry.rating ? "star.fill" : "star")
                        .font(.system(size: 9))
                        .foregroundColor(star <= entry.rating ? Color(hex: "f59e0b") : Color(hex: "334155"))
                }
            }
            .frame(width: 75, alignment: .leading)
            
            Spacer()
            
            // Tags
            HStack(spacing: 4) {
                ForEach(entry.tags.prefix(2), id: \.self) { tag in
                    Text("#\(tag)")
                        .font(.system(size: 9))
                        .foregroundColor(Color(hex: "94a3b8"))
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(Color(hex: "0e1524"))
                        .clipShape(RoundedRectangle(cornerRadius: 3))
                }
            }
            .frame(width: 130, alignment: .leading)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(isSelected ? Color(hex: "1e293b").opacity(0.8) : Color.clear)
        .contentShape(Rectangle())
    }
    
    // MARK: - Journal Details Inspector (Right)
    private func journalDetailsInspector(for entry: DetailedJournalEntry) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header
            HStack {
                Text("Trade Details")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                
                Spacer()
                
                HStack(spacing: 10) {
                    Image(systemName: "pencil")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "94a3b8"))
                    Image(systemName: "trash")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "f43f5e"))
                    Image(systemName: "xmark")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "94a3b8"))
                        .onTapGesture {
                            viewModel.selectedEntry = nil
                        }
                }
            }
            
            // Tabs: Details, Notes, Screenshots, Lessons
            HStack(spacing: 0) {
                inspectorTabButton("Details", tab: "details")
                inspectorTabButton("Notes", tab: "notes")
                inspectorTabButton("Screenshots", tab: "screenshots")
                inspectorTabButton("Lessons", tab: "lessons")
            }
            .background(Color(hex: "0e1524"))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 12) {
                    if viewModel.activeInspectorTab == "details" {
                        entryDetailsTab(entry)
                    } else if viewModel.activeInspectorTab == "notes" {
                        entryNotesTab(entry)
                    } else if viewModel.activeInspectorTab == "screenshots" {
                        entryScreenshotsTab()
                    } else {
                        entryLessonsTab(entry)
                    }
                }
                .padding(.top, 4)
            }
        }
        .padding(16)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    private func inspectorTabButton(_ title: String, tab: String) -> some View {
        Button {
            viewModel.activeInspectorTab = tab
        } label: {
            Text(title)
                .font(.system(size: 11, weight: viewModel.activeInspectorTab == tab ? .bold : .medium))
                .foregroundColor(viewModel.activeInspectorTab == tab ? .white : Color(hex: "94a3b8"))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 7)
                .background(viewModel.activeInspectorTab == tab ? Color(hex: "3b82f6") : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }
    
    private func entryDetailsTab(_ entry: DetailedJournalEntry) -> some View {
        VStack(spacing: 8) {
            infoRow("Contract", "\(entry.indexName) \(entry.strike != nil ? "\(entry.strike!)" : "") \(entry.optionType)")
            infoRow("Trading Type", entry.tradingType)
            infoRow("Strategy", entry.strategy)
            infoRow("Date", entry.date)
            Divider().background(Color(hex: "1e293b"))
            HStack {
                Text("Net Result").font(.system(size: 12, weight: .bold)).foregroundColor(.white)
                Spacer()
                let isProfit = entry.netPnl >= 0
                Text(isProfit ? "+₹\(Int(entry.netPnl))" : "-₹\(Int(abs(entry.netPnl)))")
                    .font(.system(size: 16, weight: .bold, design: .monospaced))
                    .foregroundColor(isProfit ? Color(hex: "10b981") : Color(hex: "f43f5e"))
            }
        }
        .padding(12)
        .background(Color(hex: "0e1524"))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
    
    private func entryNotesTab(_ entry: DetailedJournalEntry) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            noteBox("Market Conditions", entry.marketConditions)
            noteBox("Trade Setup", entry.tradeSetup)
            noteBox("Personal Notes & Psychology", entry.personalNotes)
        }
    }
    
    private func entryScreenshotsTab() -> some View {
        VStack(alignment: .leading, spacing: 10) {
            VStack(spacing: 6) {
                Image(systemName: "photo.badge.plus")
                    .font(.system(size: 24))
                    .foregroundColor(Color(hex: "64748b"))
                Text("No screenshot attached")
                    .font(.system(size: 12))
                    .foregroundColor(.white)
                Text("Upload 5-min or 15-min chart setup")
                    .font(.system(size: 10))
                    .foregroundColor(Color(hex: "64748b"))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 32)
            .background(Color(hex: "0e1524"))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(style: StrokeStyle(lineWidth: 1, dash: [4]))
                    .foregroundColor(Color(hex: "1e293b"))
            )
        }
    }
    
    private func entryLessonsTab(_ entry: DetailedJournalEntry) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            lessonItem("What Went Right?", entry.whatWentRight, "checkmark.circle.fill", Color(hex: "10b981"))
            lessonItem("What Went Wrong?", entry.whatWentWrong, "xmark.circle.fill", Color(hex: "f43f5e"))
            lessonItem("Mistakes Made", entry.mistakesMade, "exclamationmark.triangle.fill", Color(hex: "f59e0b"))
            lessonItem("Lessons Learned", entry.lessonsLearned, "lightbulb.fill", Color(hex: "3b82f6"))
        }
    }
    
    private func noteBox(_ title: String, _ text: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(Color(hex: "64748b"))
            Text(text)
                .font(.system(size: 11))
                .foregroundColor(.white)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: "0e1524"))
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }
    
    private func lessonItem(_ title: String, _ text: String, _ icon: String, _ color: Color) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 13))
                .foregroundColor(color)
                .frame(width: 16)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.white)
                Text(text)
                    .font(.system(size: 11))
                    .foregroundColor(Color(hex: "94a3b8"))
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: "0e1524"))
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }
    
    private func infoRow(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).font(.system(size: 11)).foregroundColor(Color(hex: "94a3b8"))
            Spacer()
            Text(value).font(.system(size: 11, weight: .medium)).foregroundColor(.white)
        }
    }
    
    // MARK: - Bottom Row: Strategy Performance Card
    private var strategyPerformanceCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Strategy Performance (From Journal)")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            Chart {
                BarMark(x: .value("Strategy", "Long Straddle"), y: .value("P&L", -387387)).foregroundStyle(Color(hex: "f43f5e"))
                BarMark(x: .value("Strategy", "Directional CE"), y: .value("P&L", 18500)).foregroundStyle(Color(hex: "10b981"))
                BarMark(x: .value("Strategy", "Directional PE"), y: .value("P&L", 24200)).foregroundStyle(Color(hex: "10b981"))
            }
            .chartYAxis {
                AxisMarks(position: .leading) { val in
                    AxisGridLine().foregroundStyle(Color(hex: "1e293b"))
                    AxisValueLabel {
                        if let d = val.as(Double.self) {
                            Text("\(Int(d / 1000))K").font(.system(size: 8)).foregroundColor(Color(hex: "64748b"))
                        }
                    }
                }
            }
            .chartXAxis {
                AxisMarks { val in
                    AxisValueLabel {
                        if let s = val.as(String.self) {
                            Text(s).font(.system(size: 9)).foregroundColor(Color(hex: "94a3b8"))
                        }
                    }
                }
            }
            .frame(height: 110)
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Bottom Row: Sentiment Analysis Card
    private var sentimentAnalysisCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Trade Notes Sentiment")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            HStack(spacing: 14) {
                // Mini Pie
                ZStack {
                    Circle()
                        .stroke(Color(hex: "10b981"), lineWidth: 12)
                        .frame(width: 70, height: 70)
                    Text("45%")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.white)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    sentimentRow("Positive", "45%", Color(hex: "10b981"))
                    sentimentRow("Neutral", "25%", Color(hex: "f59e0b"))
                    sentimentRow("Negative", "30%", Color(hex: "f43f5e"))
                }
            }
            .padding(.top, 4)
            Spacer()
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    private func sentimentRow(_ label: String, _ pct: String, _ color: Color) -> some View {
        HStack {
            Circle().fill(color).frame(width: 6, height: 6)
            Text(label).font(.system(size: 10)).foregroundColor(Color(hex: "94a3b8"))
            Spacer()
            Text(pct).font(.system(size: 10, weight: .bold)).foregroundColor(.white)
        }
    }
    
    // MARK: - Bottom Row: Common Tags Card
    private var commonTagsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Common Tags")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            VStack(spacing: 5) {
                tagItem("#LongStraddle", count: 954, color: Color(hex: "3b82f6"))
                tagItem("#StoplossExecution", count: 480, color: Color(hex: "10b981"))
                tagItem("#ExpiryGreed", count: 120, color: Color(hex: "f43f5e"))
                tagItem("#RevengeTrading", count: 45, color: Color(hex: "f43f5e"))
            }
            Spacer()
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    private func tagItem(_ tag: String, count: Int, color: Color) -> some View {
        HStack {
            Text(tag)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(.white)
            Spacer()
            Text("\(count)")
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .foregroundColor(color)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(color.opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: 4))
        }
    }
}
