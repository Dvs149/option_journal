import SwiftUI
import Charts

public struct TradesTableView: View {
    @StateObject private var viewModel = TradesViewModel()
    @ObservedObject private var preferences = PreferencesManager.shared
    @Environment(\.colorScheme) private var colorScheme
    
    @State private var isExportSheetPresented: Bool = false
    @State private var isImportSheetPresented: Bool = false
    @State private var isAddTradeSheetPresented: Bool = false
    @State private var selectedTradeIds: Set<Int> = []
    @State private var breakdownTab: String = "Index" // "Index", "Option Type", "Trading Type", "Strategy"
    
    public init() {}
    
    public var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(alignment: .leading, spacing: 20) {
                // MARK: - Header
                headerSection
                
                // MARK: - 6 Top Metric Cards
                kpiMetricsSection
                
                // MARK: - Filters Bar (2 Rows)
                filterBarSection
                
                // MARK: - Main Table + Trade Details Inspector
                HStack(alignment: .top, spacing: 16) {
                    tradesTableCard
                        .frame(maxWidth: .infinity)
                    
                    if let selected = viewModel.selectedTradeForDetail {
                        tradeDetailsInspector(for: selected)
                            .frame(width: 360)
                            .transition(.move(edge: .trailing).combined(with: .opacity))
                    }
                }
                .frame(maxWidth: .infinity)
                
                // MARK: - Bottom Row: Performance Breakdown & Recent Trades
                HStack(alignment: .top, spacing: 16) {
                    performanceBreakdownCard
                        .frame(maxWidth: .infinity)
                    
                    recentTradesCard
                        .frame(width: 380)
                }
                .frame(maxWidth: .infinity)
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .background(Color(hex: "0b111e"))
        .sheet(isPresented: $isImportSheetPresented) {
            BulkImportView()
        }
        .sheet(isPresented: $isExportSheetPresented) {
            ExportReportSheet()
        }
        .sheet(isPresented: $isAddTradeSheetPresented) {
            AddTradeView()
        }
        .task {
            if viewModel.trades.isEmpty {
                await viewModel.loadTrades(page: 1)
            }
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("All Trades")
                .font(.system(size: 26, weight: .bold))
                .foregroundColor(.white)
            Text("View, edit, delete and analyze all your trading records")
                .font(.system(size: 13))
                .foregroundColor(Color(hex: "94a3b8"))
        }
    }
    
    // MARK: - 6 Top Metric Cards
    private var kpiMetricsSection: some View {
        HStack(spacing: 12) {
            // 1. Total Trades
            tradeStatCard(
                title: "Total Trades",
                value: "\(viewModel.totalTradesCount)",
                badgeText: "All logged trades",
                badgeColor: Color(hex: "3b82f6"),
                icon: "doc.text.fill",
                iconColor: Color(hex: "3b82f6")
            )
            
            // 2. Net P&L
            tradeStatCard(
                title: "Net P&L",
                value: DashboardNumberFormatter.formatRupeeInteger(viewModel.totalNetProfit, includeSign: true, isPrivacyMode: preferences.isPrivacyModeEnabled),
                badgeText: viewModel.totalNetProfit >= 0 ? "Net Profit" : "Net Loss",
                badgeColor: viewModel.totalNetProfit >= 0 ? Color(hex: "10b981") : Color(hex: "f43f5e"),
                icon: "indianrupeesign",
                iconColor: viewModel.totalNetProfit >= 0 ? Color(hex: "10b981") : Color(hex: "f43f5e"),
                isPnl: true,
                pnlValue: viewModel.totalNetProfit
            )
            
            // 3. Gross Profit
            tradeStatCard(
                title: "Gross Profit",
                value: DashboardNumberFormatter.formatRupeeInteger(viewModel.totalGrossProfit, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled),
                badgeText: "Gross earnings",
                badgeColor: Color(hex: "10b981"),
                icon: "chart.line.uptrend.xyaxis",
                iconColor: Color(hex: "10b981")
            )
            
            // 4. Gross Loss
            tradeStatCard(
                title: "Gross Loss",
                value: DashboardNumberFormatter.formatRupeeInteger(viewModel.totalGrossLoss, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled),
                badgeText: "Gross losses",
                badgeColor: Color(hex: "f43f5e"),
                icon: "chart.line.downtrend.xyaxis",
                iconColor: Color(hex: "f43f5e")
            )
            
            // 5. Total Charges
            tradeStatCard(
                title: "Total Charges",
                value: DashboardNumberFormatter.formatRupeeInteger(viewModel.totalCharges, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled),
                badgeText: "Brokerage & taxes",
                badgeColor: Color(hex: "06b6d4"),
                icon: "creditcard.fill",
                iconColor: Color(hex: "06b6d4")
            )
            
            // 6. Win Rate
            tradeStatCard(
                title: "Win Rate",
                value: String(format: "%.1f%%", viewModel.winRate),
                badgeText: "Performance index",
                badgeColor: Color(hex: "f59e0b"),
                icon: "trophy.fill",
                iconColor: Color(hex: "f59e0b")
            )
        }
    }
    
    private func tradeStatCard(
        title: String,
        value: String,
        badgeText: String,
        badgeColor: Color,
        icon: String,
        iconColor: Color,
        isPnl: Bool = false,
        pnlValue: Double = 0
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(title)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(Color(hex: "94a3b8"))
                Spacer()
                Image(systemName: icon)
                    .font(.system(size: 13))
                    .foregroundColor(iconColor)
            }
            
            Text(value)
                .font(.system(size: 20, weight: .bold, design: .monospaced))
                .foregroundColor(isPnl ? (pnlValue >= 0 ? Color(hex: "10b981") : Color(hex: "f43f5e")) : .white)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            
            Text(badgeText)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(badgeColor)
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
    
    // MARK: - Filters Bar (2 Rows)
    private var filterBarSection: some View {
        VStack(spacing: 12) {
            // Row 1: Dropdown filters
            HStack(spacing: 10) {
                // Date Range
                filterDropdown(title: "Date Range", selection: $viewModel.dateRange, options: viewModel.availableDateRanges)
                // Index
                filterDropdown(title: "Index", selection: $viewModel.selectedIndex, options: viewModel.availableIndices)
                // Trading Type
                filterDropdown(title: "Trading Type", selection: $viewModel.selectedTradingType, options: viewModel.availableTradingTypes)
                // Option Type
                filterDropdown(title: "Option Type", selection: $viewModel.selectedOptionType, options: viewModel.availableOptionTypes)
                // Strategy
                filterDropdown(title: "Strategy", selection: $viewModel.selectedStrategy, options: viewModel.availableStrategies)
                
                Spacer()
            }
            
            // Row 2: Search, Sort & Action Buttons
            HStack(spacing: 12) {
                // Search Input
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "64748b"))
                    TextField("Search trades...", text: $viewModel.searchQuery)
                        .textFieldStyle(.plain)
                        .font(.system(size: 13))
                        .foregroundColor(.white)
                        .onSubmit {
                            Task { await viewModel.loadTrades(page: 1) }
                        }
                    if !viewModel.searchQuery.isEmpty {
                        Button {
                            viewModel.searchQuery = ""
                            Task { await viewModel.loadTrades(page: 1) }
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 11))
                                .foregroundColor(Color(hex: "64748b"))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color(hex: "0e1524"))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color(hex: "1e293b"), lineWidth: 1)
                )
                .frame(maxWidth: 320)
                
                // Sort Menu
                Menu {
                    ForEach(viewModel.availableSortOptions, id: \.self) { opt in
                        Button(opt) {
                            viewModel.sortOption = opt
                            Task { await viewModel.loadTrades(page: 1) }
                        }
                    }
                } label: {
                    HStack(spacing: 6) {
                        Text(viewModel.sortOption)
                            .font(.system(size: 12))
                            .foregroundColor(.white)
                        Image(systemName: "chevron.down")
                            .font(.system(size: 10))
                            .foregroundColor(Color(hex: "94a3b8"))
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color(hex: "0e1524"))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color(hex: "1e293b"), lineWidth: 1)
                    )
                }
                .menuStyle(.borderlessButton)
                .frame(width: 200)
                
                Spacer()
                
                // + Add Trade Button
                Button {
                    isAddTradeSheetPresented = true
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "plus")
                            .font(.system(size: 12, weight: .bold))
                        Text("Add Trade")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Color(hex: "3b82f6"))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
                
                // Bulk Import Button
                Button {
                    isImportSheetPresented = true
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: 12))
                        Text("Bulk Import")
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color(hex: "121b2d"))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color(hex: "1e293b"), lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
                
                // Export Button
                Button {
                    isExportSheetPresented = true
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "square.and.arrow.down")
                            .font(.system(size: 12))
                        Text("Export")
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(Color(hex: "121b2d"))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color(hex: "1e293b"), lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }
    
    private func filterDropdown(title: String, selection: Binding<String>, options: [String]) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(Color(hex: "94a3b8"))
            
            Menu {
                ForEach(options, id: \.self) { opt in
                    Button(opt) {
                        selection.wrappedValue = opt
                        Task { await viewModel.loadTrades(page: 1) }
                    }
                }
            } label: {
                HStack {
                    Text(selection.wrappedValue)
                        .font(.system(size: 12))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    Spacer()
                    Image(systemName: "chevron.down")
                        .font(.system(size: 10))
                        .foregroundColor(Color(hex: "94a3b8"))
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
                .background(Color(hex: "0e1524"))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color(hex: "1e293b"), lineWidth: 1)
                )
            }
            .menuStyle(.borderlessButton)
            .frame(width: 155)
        }
    }
    
    // MARK: - Trades Table Card
    private var tradesTableCard: some View {
        VStack(spacing: 0) {
            ScrollView(.horizontal, showsIndicators: false) {
                VStack(spacing: 0) {
                    // Table Header
                    HStack(spacing: 8) {
                        // Checkbox
                        Image(systemName: selectedTradeIds.count == viewModel.trades.count && !viewModel.trades.isEmpty ? "checkmark.square.fill" : "square")
                            .foregroundColor(Color(hex: "64748b"))
                            .frame(width: 24)
                            .onTapGesture {
                                if selectedTradeIds.count == viewModel.trades.count {
                                    selectedTradeIds.removeAll()
                                } else {
                                    selectedTradeIds = Set(viewModel.trades.map { $0.id })
                                }
                            }
                        
                        headerCell("DATE", width: 90)
                        headerCell("INDEX", width: 75)
                        headerCell("TYPE", width: 65)
                        headerCell("CE/PE", width: 50)
                        headerCell("STRIKE", width: 60)
                        headerCell("EXPIRY", width: 85)
                        headerCell("LOTS", width: 45)
                        headerCell("ENTRY", width: 65)
                        headerCell("EXIT", width: 65)
                        headerCell("GROSS P/L", width: 80)
                        headerCell("CHARGES", width: 65)
                        headerCell("NET P&L", width: 80)
                        headerCell("STRATEGY", width: 100)
                        Spacer()
                        headerCell("ACTIONS", width: 65)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(Color(hex: "0e1524"))
                    
                    Divider().background(Color(hex: "1e293b"))
                    
                    // Table Rows
                    if viewModel.trades.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "tray")
                                .font(.system(size: 32))
                                .foregroundColor(Color(hex: "64748b"))
                            Text("No trades match your criteria")
                                .font(.system(size: 14))
                                .foregroundColor(Color(hex: "94a3b8"))
                        }
                        .frame(maxWidth: .infinity, minHeight: 280)
                    } else {
                        VStack(spacing: 0) {
                            ForEach(viewModel.trades) { trade in
                                tradeTableRow(trade)
                                    .onTapGesture {
                                        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                            viewModel.selectedTradeForDetail = trade
                                        }
                                    }
                                
                                Divider().background(Color(hex: "1e293b").opacity(0.6))
                            }
                        }
                    }
                }
                .frame(minWidth: 920, maxWidth: .infinity)
            }
            
            Divider().background(Color(hex: "1e293b"))
            
            // Pagination Footer
            HStack {
                Text("Showing 1 to \(viewModel.trades.count) of \(viewModel.totalTradesCount) trades")
                    .font(.system(size: 12))
                    .foregroundColor(Color(hex: "94a3b8"))
                
                Spacer()
                
                // Pagination Buttons
                HStack(spacing: 6) {
                    Button {
                        if viewModel.currentPage > 1 {
                            Task { await viewModel.loadTrades(page: viewModel.currentPage - 1) }
                        }
                    } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 10))
                            .foregroundColor(Color(hex: "94a3b8"))
                            .frame(width: 28, height: 28)
                            .background(Color(hex: "0e1524"))
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                    }
                    .buttonStyle(.plain)
                    
                    ForEach(1...min(5, viewModel.totalPages), id: \.self) { p in
                        paginationPageButton(p)
                    }
                    
                    if viewModel.totalPages > 5 {
                        Text("...")
                            .foregroundColor(Color(hex: "64748b"))
                        
                        Button {
                            Task { await viewModel.loadTrades(page: viewModel.totalPages) }
                        } label: {
                            Text("\(viewModel.totalPages)")
                                .font(.system(size: 12))
                                .foregroundColor(.white)
                                .frame(width: 28, height: 28)
                                .background(Color(hex: "0e1524"))
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                        .buttonStyle(.plain)
                    }
                    
                    Button {
                        if viewModel.currentPage < viewModel.totalPages {
                            Task { await viewModel.loadTrades(page: viewModel.currentPage + 1) }
                        }
                    } label: {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 10))
                            .foregroundColor(Color(hex: "94a3b8"))
                            .frame(width: 28, height: 28)
                            .background(Color(hex: "0e1524"))
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                    }
                    .buttonStyle(.plain)
                    
                    // 10 / page selector
                    Menu {
                        Button("10 / page") { viewModel.perPage = 10 }
                        Button("25 / page") { viewModel.perPage = 25 }
                        Button("50 / page") { viewModel.perPage = 50 }
                    } label: {
                        HStack(spacing: 4) {
                            Text("\(viewModel.perPage) / page")
                                .font(.system(size: 11))
                                .foregroundColor(.white)
                            Image(systemName: "chevron.down")
                                .font(.system(size: 9))
                                .foregroundColor(Color(hex: "94a3b8"))
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 5)
                        .background(Color(hex: "0e1524"))
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(Color(hex: "1e293b"), lineWidth: 1)
                        )
                    }
                    .menuStyle(.borderlessButton)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color(hex: "0e1524"))
        }
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    private func paginationPageButton(_ p: Int) -> some View {
        let isCurrent = p == viewModel.currentPage
        return Button {
            Task { await viewModel.loadTrades(page: p) }
        } label: {
            Text("\(p)")
                .font(.system(size: 12, weight: isCurrent ? .bold : .regular))
                .foregroundColor(.white)
                .frame(width: 28, height: 28)
                .background(isCurrent ? Color(hex: "3b82f6") : Color(hex: "0e1524"))
                .clipShape(RoundedRectangle(cornerRadius: 6))
        }
        .buttonStyle(.plain)
    }

    private func headerCell(_ title: String, width: CGFloat) -> some View {
        Text(title)
            .font(.system(size: 11, weight: .bold))
            .foregroundColor(Color(hex: "94a3b8"))
            .frame(width: width, alignment: .leading)
    }
    
    private func tradeTableRow(_ trade: Trade) -> some View {
        let isSelected = viewModel.selectedTradeForDetail?.id == trade.id
        let isChecked = selectedTradeIds.contains(trade.id)
        let isProfit = trade.calculatedNetPnl >= 0
        
        return HStack(spacing: 8) {
            // Checkbox
            Image(systemName: isChecked ? "checkmark.square.fill" : "square")
                .foregroundColor(isChecked ? Color(hex: "3b82f6") : Color(hex: "64748b"))
                .frame(width: 24)
                .onTapGesture {
                    if isChecked {
                        selectedTradeIds.remove(trade.id)
                    } else {
                        selectedTradeIds.insert(trade.id)
                    }
                }
            
            // Date
            Text(trade.tradeDate)
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(.white)
                .frame(width: 90, alignment: .leading)
            
            // Index
            Text(trade.indexName)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.white)
                .frame(width: 75, alignment: .leading)
            
            // Type
            Text(trade.tradingType)
                .font(.system(size: 11))
                .foregroundColor(Color(hex: "94a3b8"))
                .frame(width: 65, alignment: .leading)
            
            // CE/PE Badge
            Text(trade.optionType)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(trade.optionType == "CE" ? Color(hex: "10b981") : Color(hex: "f43f5e"))
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(trade.optionType == "CE" ? Color(hex: "10b981").opacity(0.15) : Color(hex: "f43f5e").opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: 4))
                .frame(width: 50, alignment: .leading)
            
            // Strike
            Text(trade.strikePrice != nil ? "\(Int(trade.strikePrice!))" : "-")
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(.white)
                .frame(width: 60, alignment: .leading)
            
            // Expiry
            Text(trade.expiryDate ?? "-")
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(Color(hex: "94a3b8"))
                .frame(width: 85, alignment: .leading)
            
            // Lots
            Text("\(trade.lots ?? 1)")
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(.white)
                .frame(width: 45, alignment: .leading)
            
            // Entry
            Text(String(format: "%.2f", trade.entryPremium ?? 0))
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(Color(hex: "94a3b8"))
                .frame(width: 65, alignment: .leading)
            
            // Exit
            Text(String(format: "%.2f", trade.exitPremium ?? 0))
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(Color(hex: "94a3b8"))
                .frame(width: 65, alignment: .leading)
            
            // Gross P/L
            let gross = (trade.grossProfit ?? 0) > 0 ? (trade.grossProfit ?? 0) : -(trade.grossLoss ?? 0)
            Text(gross >= 0 ? "+₹\(Int(gross))" : "-₹\(Int(abs(gross)))")
                .font(.system(size: 12, weight: .medium, design: .monospaced))
                .foregroundColor(gross >= 0 ? Color(hex: "10b981") : Color(hex: "f43f5e"))
                .frame(width: 80, alignment: .leading)
            
            // Charges
            Text("₹\(Int(trade.totalCharges ?? 0))")
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(Color(hex: "94a3b8"))
                .frame(width: 65, alignment: .leading)
            
            // Net P&L
            Text(isProfit ? "+₹\(Int(trade.calculatedNetPnl))" : "-₹\(Int(abs(trade.calculatedNetPnl)))")
                .font(.system(size: 12, weight: .bold, design: .monospaced))
                .foregroundColor(isProfit ? Color(hex: "10b981") : Color(hex: "f43f5e"))
                .frame(width: 80, alignment: .leading)
            
            // Strategy
            Text(trade.strategyName ?? "Long Straddle")
                .font(.system(size: 11))
                .foregroundColor(Color(hex: "94a3b8"))
                .lineLimit(1)
                .frame(width: 100, alignment: .leading)
            
            Spacer()
            
            // Actions
            HStack(spacing: 8) {
                Button {
                    viewModel.selectedTradeForDetail = trade
                } label: {
                    Image(systemName: "pencil")
                        .font(.system(size: 11))
                        .foregroundColor(Color(hex: "94a3b8"))
                }
                .buttonStyle(.plain)
                
                Button {
                    Task { await viewModel.deleteTrade(trade) }
                } label: {
                    Image(systemName: "trash")
                        .font(.system(size: 11))
                        .foregroundColor(Color(hex: "f43f5e"))
                }
                .buttonStyle(.plain)
            }
            .frame(width: 65, alignment: .leading)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(isSelected ? Color(hex: "1e293b").opacity(0.8) : Color.clear)
        .contentShape(Rectangle())
    }
    
    // MARK: - Trade Details Inspector (Right Sidebar)
    private func tradeDetailsInspector(for trade: Trade) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            // Inspector Header
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "arrow.left")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "94a3b8"))
                        .onTapGesture {
                            viewModel.selectedTradeForDetail = nil
                        }
                    Text("Trade Details")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                }
                
                Spacer()
                
                HStack(spacing: 10) {
                    Image(systemName: "pencil")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "94a3b8"))
                    
                    Image(systemName: "trash")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "f43f5e"))
                        .onTapGesture {
                            Task { await viewModel.deleteTrade(trade) }
                        }
                    
                    Image(systemName: "xmark")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "94a3b8"))
                        .onTapGesture {
                            viewModel.selectedTradeForDetail = nil
                        }
                }
            }
            
            // Tabs: Details, Charges, Journal
            HStack(spacing: 0) {
                tabButton("Details", tab: "details")
                tabButton("Charges", tab: "charges")
                tabButton("Journal", tab: "journal")
            }
            .background(Color(hex: "0e1524"))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 14) {
                    if viewModel.detailTab == "details" {
                        detailsTabContent(for: trade)
                    } else if viewModel.detailTab == "charges" {
                        chargesTabContent(for: trade)
                    } else {
                        journalTabContent(for: trade)
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
    
    private func tabButton(_ title: String, tab: String) -> some View {
        Button {
            viewModel.detailTab = tab
        } label: {
            Text(title)
                .font(.system(size: 12, weight: viewModel.detailTab == tab ? .bold : .medium))
                .foregroundColor(viewModel.detailTab == tab ? .white : Color(hex: "94a3b8"))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(viewModel.detailTab == tab ? Color(hex: "3b82f6") : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }
    
    private func detailsTabContent(for trade: Trade) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // Grid of Trade Specs
            VStack(spacing: 8) {
                specRow("Trade Date", trade.tradeDate, "Index", trade.indexName)
                specRow("Trading Type", trade.tradingType, "Option Type", trade.optionType)
                specRow("Strike Price", trade.strikePrice != nil ? "\(Int(trade.strikePrice!))" : "-", "Expiry Date", trade.expiryDate ?? "-")
                specRow("Lots", "\(trade.lots ?? 1) (\((trade.lots ?? 1) * 65) Qty)", "Strategy", trade.strategyName ?? "Long Straddle")
                specRow("Entry Premium", "₹\(String(format: "%.2f", trade.entryPremium ?? 0))", "Exit Premium", "₹\(String(format: "%.2f", trade.exitPremium ?? 0))")
            }
            .padding(12)
            .background(Color(hex: "0e1524"))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            
            // Financial Summary
            VStack(spacing: 8) {
                summaryRow("Gross Profit", "₹\(Int(trade.grossProfit ?? 0))", Color(hex: "10b981"))
                summaryRow("Gross Loss", "₹\(Int(trade.grossLoss ?? 0))", Color(hex: "f43f5e"))
                summaryRow("Total Charges", "₹\(Int(trade.totalCharges ?? 0))", Color(hex: "94a3b8"))
                Divider().background(Color(hex: "1e293b"))
                HStack {
                    Text("Net P&L")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                    Spacer()
                    let isProfit = trade.calculatedNetPnl >= 0
                    Text(isProfit ? "+₹\(Int(trade.calculatedNetPnl))" : "-₹\(Int(abs(trade.calculatedNetPnl)))")
                        .font(.system(size: 18, weight: .bold, design: .monospaced))
                        .foregroundColor(isProfit ? Color(hex: "10b981") : Color(hex: "f43f5e"))
                }
            }
            .padding(12)
            .background(Color(hex: "0e1524"))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            
            // Reasons & Notes
            VStack(alignment: .leading, spacing: 6) {
                Text("Entry Reason")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Color(hex: "94a3b8"))
                Text(trade.entryReason ?? "Bulk Import: Zerodha")
                    .font(.system(size: 12))
                    .foregroundColor(.white)
                
                Text("Exit Reason")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Color(hex: "94a3b8"))
                    .padding(.top, 4)
                Text(trade.exitReason ?? "Booked profit at target")
                    .font(.system(size: 12))
                    .foregroundColor(.white)
                
                Text("Notes")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Color(hex: "94a3b8"))
                    .padding(.top, 4)
                Text(trade.notes ?? "Imported from Zerodha tradebook")
                    .font(.system(size: 11))
                    .foregroundColor(Color(hex: "94a3b8"))
            }
            .padding(12)
            .background(Color(hex: "0e1524"))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            
            // Chart Screenshots
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("CHART SCREENSHOTS")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(Color(hex: "64748b"))
                    Spacer()
                    Text("+ Add Images")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(Color(hex: "3b82f6"))
                }
                
                VStack(spacing: 6) {
                    Image(systemName: "arrow.up.circle")
                        .font(.system(size: 20))
                        .foregroundColor(Color(hex: "64748b"))
                    Text("Click to upload chart screenshots (multiple)")
                        .font(.system(size: 11))
                        .foregroundColor(Color(hex: "94a3b8"))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
                .background(Color(hex: "0e1524"))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(style: StrokeStyle(lineWidth: 1, dash: [4]))
                        .foregroundColor(Color(hex: "1e293b"))
                )
            }
        }
    }
    
    private func chargesTabContent(for trade: Trade) -> some View {
        VStack(spacing: 8) {
            chargeItem("Brokerage", trade.brokerage ?? 40.0)
            chargeItem("STT / CTT", trade.stt ?? 15.21)
            chargeItem("Exchange Turn. Charges", trade.exchangeCharges ?? 6.44)
            chargeItem("GST (18%)", trade.gst ?? 8.36)
            chargeItem("SEBI Turnover Charges", trade.sebiCharges ?? 0.02)
            chargeItem("Stamp Duty", trade.stampDuty ?? 0.24)
            chargeItem("Other / IPFT Charges", trade.otherCharges ?? 75.0)
            Divider().background(Color(hex: "1e293b"))
            HStack {
                Text("Total Charges")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                Text("₹\(String(format: "%.2f", trade.totalCharges ?? 145.27))")
                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                    .foregroundColor(Color(hex: "f43f5e"))
            }
        }
        .padding(12)
        .background(Color(hex: "0e1524"))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
    
    private func journalTabContent(for trade: Trade) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            journalEntryCard("Market Condition", trade.journal?.marketConditions ?? "Rangebound with high IV")
            journalEntryCard("Trade Setup", trade.journal?.tradeSetup ?? "Long Straddle before expiry event")
            journalEntryCard("What Went Right?", trade.journal?.whatWentRight ?? "Good entry timing, executed strictly at support")
            journalEntryCard("What Went Wrong?", trade.journal?.whatWentWrong ?? "Exited CE leg too early before full decay")
            journalEntryCard("Mistakes Made", trade.journal?.mistakesMade ?? "Could have held longer for target 2")
            journalEntryCard("Lessons Learned", trade.journal?.lessonsLearned ?? "Be patient with targets during trending market days")
            journalEntryCard("Personal Notes", trade.journal?.personalNotes ?? "Emotional discipline maintained 100%")
        }
    }
    
    private func journalEntryCard(_ title: String, _ text: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(Color(hex: "64748b"))
            Text(text)
                .font(.system(size: 12))
                .foregroundColor(.white)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: "0e1524"))
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }
    
    private func chargeItem(_ name: String, _ val: Double) -> some View {
        HStack {
            Text(name)
                .font(.system(size: 11))
                .foregroundColor(Color(hex: "94a3b8"))
            Spacer()
            Text("₹\(String(format: "%.2f", val))")
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(.white)
        }
    }
    
    private func specRow(_ l1: String, _ v1: String, _ l2: String, _ v2: String) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(l1)
                    .font(.system(size: 10))
                    .foregroundColor(Color(hex: "64748b"))
                Text(v1)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(l2)
                    .font(.system(size: 10))
                    .foregroundColor(Color(hex: "64748b"))
                Text(v2)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
    
    private func summaryRow(_ label: String, _ val: String, _ color: Color) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 12))
                .foregroundColor(Color(hex: "94a3b8"))
            Spacer()
            Text(val)
                .font(.system(size: 12, weight: .medium, design: .monospaced))
                .foregroundColor(color)
        }
    }
    
    // MARK: - Bottom Row: Performance Breakdown Card
    private var performanceBreakdownCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Performance Breakdown")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                
                Spacer()
                
                // Tabs: Index, Option Type, Trading Type, Strategy
                HStack(spacing: 4) {
                    ForEach(["Index", "Option Type", "Trading Type", "Strategy"], id: \.self) { tab in
                        Button {
                            breakdownTab = tab
                        } label: {
                            Text(tab)
                                .font(.system(size: 11, weight: breakdownTab == tab ? .bold : .medium))
                                .foregroundColor(breakdownTab == tab ? Color(hex: "f97316") : Color(hex: "94a3b8"))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            
            // Legend
            HStack(spacing: 16) {
                Spacer()
                HStack(spacing: 6) {
                    Circle().fill(Color(hex: "10b981")).frame(width: 8, height: 8)
                    Text("Profit").font(.system(size: 11)).foregroundColor(Color(hex: "94a3b8"))
                }
                HStack(spacing: 6) {
                    Circle().fill(Color(hex: "f43f5e")).frame(width: 8, height: 8)
                    Text("Loss").font(.system(size: 11)).foregroundColor(Color(hex: "94a3b8"))
                }
            }
            
            // Bar Chart
            Chart {
                ForEach(breakdownItems) { item in
                    BarMark(
                        x: .value("Category", item.name),
                        y: .value("Amount", item.profit)
                    )
                    .foregroundStyle(Color(hex: "10b981"))
                    .position(by: .value("Type", "Profit"))
                    
                    BarMark(
                        x: .value("Category", item.name),
                        y: .value("Amount", item.loss)
                    )
                    .foregroundStyle(Color(hex: "f43f5e"))
                    .position(by: .value("Type", "Loss"))
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { val in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [2]))
                        .foregroundStyle(Color(hex: "1e293b"))
                    AxisValueLabel {
                        if let d = val.as(Double.self) {
                            Text("\(Int(d / 1000))K")
                                .font(.system(size: 9))
                                .foregroundColor(Color(hex: "64748b"))
                        }
                    }
                }
            }
            .chartXAxis {
                AxisMarks { val in
                    AxisValueLabel {
                        if let s = val.as(String.self) {
                            Text(s)
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(Color(hex: "94a3b8"))
                        }
                    }
                }
            }
            .frame(height: 180)
        }
        .padding(16)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    private struct BreakdownItem: Identifiable {
        let id = UUID()
        let name: String
        let profit: Double
        let loss: Double
    }
    
    private var breakdownItems: [BreakdownItem] {
        switch breakdownTab {
        case "Option Type":
            return [
                BreakdownItem(name: "CE", profit: 65000, loss: 42000),
                BreakdownItem(name: "PE", profit: 58000, loss: 38000),
                BreakdownItem(name: "Both", profit: 12000, loss: 9000)
            ]
        case "Trading Type":
            return [
                BreakdownItem(name: "Intraday", profit: 85000, loss: 62000),
                BreakdownItem(name: "Positional", profit: 32000, loss: 19000),
                BreakdownItem(name: "Swing", profit: 18000, loss: 8000)
            ]
        case "Strategy":
            return [
                BreakdownItem(name: "Long Straddle", profit: 75000, loss: 51000),
                BreakdownItem(name: "Directional CE", profit: 38000, loss: 24000),
                BreakdownItem(name: "Directional PE", profit: 22000, loss: 14000)
            ]
        default: // Index
            return [
                BreakdownItem(name: "NIFTY", profit: 48000, loss: 23000),
                BreakdownItem(name: "BANKNIFTY", profit: 39000, loss: 31000),
                BreakdownItem(name: "SENSEX", profit: 22000, loss: 26000),
                BreakdownItem(name: "BANKEX", profit: 12000, loss: 15000),
                BreakdownItem(name: "STOCKS", profit: 8000, loss: 11000)
            ]
        }
    }
    
    // MARK: - Bottom Row: Recent Trades Card
    private var recentTradesCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Recent Trades")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                Text("View All")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Color(hex: "3b82f6"))
            }
            
            // Mini Header
            HStack(spacing: 6) {
                Text("DATE").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 75, alignment: .leading)
                Text("INDEX").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 55, alignment: .leading)
                Text("TYPE").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 50, alignment: .leading)
                Text("CE/PE").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 40, alignment: .leading)
                Spacer()
                Text("NET P&L").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 70, alignment: .trailing)
            }
            .padding(.vertical, 4)
            
            Divider().background(Color(hex: "1e293b"))
            
            // Mini Rows (top 5)
            VStack(spacing: 8) {
                ForEach(viewModel.trades.prefix(5)) { trade in
                    HStack(spacing: 6) {
                        Text(trade.tradeDate)
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(.white)
                            .frame(width: 75, alignment: .leading)
                        
                        Text(trade.indexName)
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 55, alignment: .leading)
                        
                        Text(trade.tradingType)
                            .font(.system(size: 10))
                            .foregroundColor(Color(hex: "94a3b8"))
                            .frame(width: 50, alignment: .leading)
                        
                        Text(trade.optionType)
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(trade.optionType == "CE" ? Color(hex: "10b981") : Color(hex: "f43f5e"))
                            .padding(.horizontal, 4)
                            .padding(.vertical, 1)
                            .background(trade.optionType == "CE" ? Color(hex: "10b981").opacity(0.15) : Color(hex: "f43f5e").opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 3))
                            .frame(width: 40, alignment: .leading)
                        
                        Spacer()
                        
                        let isProfit = trade.calculatedNetPnl >= 0
                        Text(isProfit ? "+₹\(Int(trade.calculatedNetPnl))" : "-₹\(Int(abs(trade.calculatedNetPnl)))")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(isProfit ? Color(hex: "10b981") : Color(hex: "f43f5e"))
                            .frame(width: 70, alignment: .trailing)
                    }
                    .padding(.vertical, 3)
                    
                    if trade.id != viewModel.trades.prefix(5).last?.id {
                        Divider().background(Color(hex: "1e293b").opacity(0.4))
                    }
                }
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
}
