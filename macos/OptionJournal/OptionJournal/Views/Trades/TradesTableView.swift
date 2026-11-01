import SwiftUI

public struct TradesTableView: View {
    @StateObject private var viewModel = TradesViewModel()
    @ObservedObject private var preferences = PreferencesManager.shared
    @Environment(\.colorScheme) private var colorScheme
    @State private var selectedTradeId: Int?
    @State private var isExportSheetPresented: Bool = false
    @State private var isImportSheetPresented: Bool = false
    
    public init() {}
    
    public var body: some View {
        VStack(spacing: 0) {
            // MARK: - Filter & Search Toolbar
            HStack(spacing: 12) {
                // Search Field
                HStack(spacing: 6) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 11))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    TextField("Search strike, strategy, notes...", text: $viewModel.searchQuery)
                        .textFieldStyle(.plain)
                        .font(.system(size: 12))
                        .onSubmit {
                            Task { await viewModel.loadTrades(page: 1) }
                        }
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(KiteTheme.surfaceElevated(for: colorScheme))
                .clipShape(RoundedRectangle(cornerRadius: 4))
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
                )
                .frame(width: 240)
                
                // Index Filter
                Picker("Index", selection: $viewModel.selectedIndex) {
                    ForEach(viewModel.availableIndices, id: \.self) { idx in
                        Text(idx).tag(idx)
                    }
                }
                .pickerStyle(.menu)
                .frame(width: 120)
                .onChange(of: viewModel.selectedIndex) { _ in
                    Task { await viewModel.loadTrades(page: 1) }
                }
                
                // Option Type Filter
                Picker("Option", selection: $viewModel.selectedOptionType) {
                    ForEach(viewModel.availableOptionTypes, id: \.self) { opt in
                        Text(opt).tag(opt)
                    }
                }
                .pickerStyle(.menu)
                .frame(width: 100)
                .onChange(of: viewModel.selectedOptionType) { _ in
                    Task { await viewModel.loadTrades(page: 1) }
                }
                
                // Trading Type Filter
                Picker("Type", selection: $viewModel.selectedTradingType) {
                    ForEach(viewModel.availableTradingTypes, id: \.self) { t in
                        Text(t).tag(t)
                    }
                }
                .pickerStyle(.menu)
                .frame(width: 120)
                .onChange(of: viewModel.selectedTradingType) { _ in
                    Task { await viewModel.loadTrades(page: 1) }
                }
                
                Spacer()
                
                // Total Count Badge
                Text("\(viewModel.totalTradesCount) Trades")
                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(KiteTheme.surfaceElevated(for: colorScheme))
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                
                // Bulk Import Button
                Button {
                    isImportSheetPresented = true
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.up.doc")
                            .font(.system(size: 11))
                        Text("Import")
                            .font(.system(size: 11, weight: .medium))
                    }
                }
                .kiteOutlineButton()
                .help("Bulk Import Tradebook (.csv)")
                
                // Export Button
                Button {
                    isExportSheetPresented = true
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.down.doc")
                            .font(.system(size: 11))
                        Text("Export")
                            .font(.system(size: 11, weight: .medium))
                    }
                }
                .kiteOutlineButton()
                .keyboardShortcut("e", modifiers: .command)
                .help("Export Reports (⌘E)")
                
                // Refresh Button
                Button {
                    Task { await viewModel.loadTrades(page: viewModel.currentPage) }
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 11))
                }
                .kiteOutlineButton()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(KiteTheme.surface(for: colorScheme))
            .overlay(
                Rectangle()
                    .frame(height: 1)
                    .foregroundColor(KiteTheme.border(for: colorScheme)),
                alignment: .bottom
            )
            
            // MARK: - High-Density Trading Table
            ZStack {
                if viewModel.isLoading && viewModel.trades.isEmpty {
                    VStack(spacing: 12) {
                        ProgressView()
                            .controlSize(.regular)
                        Text("Loading trades from database...")
                            .font(.system(size: 12))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.trades.isEmpty {
                    VStack(spacing: 8) {
                        Image(systemName: "tray")
                            .font(.system(size: 32))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        Text("No trades match the selected filter")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    Table(viewModel.trades, selection: $selectedTradeId) {
                        TableColumn("Date") { trade in
                            Text(trade.tradeDate)
                                .font(.system(size: 12, design: .monospaced))
                                .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                        }
                        .width(min: 85, ideal: 95, max: 105)
                        
                        TableColumn("Contract") { trade in
                            HStack(spacing: 6) {
                                Text(trade.indexName)
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                                
                                KiteStatusBadge(optionType: trade.optionType)
                                
                                if let strike = trade.strikePrice {
                                    Text("\(Int(strike))")
                                        .font(.system(size: 12, design: .monospaced))
                                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                                }
                            }
                        }
                        .width(min: 150, ideal: 180, max: 220)
                        
                        TableColumn("Type") { trade in
                            Text(trade.tradingType)
                                .font(.system(size: 11))
                                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        }
                        .width(min: 65, ideal: 75, max: 85)
                        
                        TableColumn("Lots") { trade in
                            Text("\(trade.lots ?? 0)")
                                .font(.system(size: 12, design: .monospaced))
                                .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                        }
                        .width(min: 40, ideal: 50, max: 60)
                        
                        TableColumn("Entry") { trade in
                            Text(CurrencyFormatter.format(amount: trade.entryPremium ?? 0, includeSign: false))
                                .font(.system(size: 12, design: .monospaced))
                                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        }
                        .width(min: 65, ideal: 75, max: 90)
                        
                        TableColumn("Exit") { trade in
                            Text(CurrencyFormatter.format(amount: trade.exitPremium ?? 0, includeSign: false))
                                .font(.system(size: 12, design: .monospaced))
                                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        }
                        .width(min: 65, ideal: 75, max: 90)
                        
                        TableColumn("Charges") { trade in
                            Text(CurrencyFormatter.format(amount: trade.totalCharges ?? 0, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled))
                                .font(.system(size: 12, design: .monospaced))
                                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        }
                        .width(min: 70, ideal: 80, max: 95)
                        
                        TableColumn("Net P&L") { trade in
                            Text(CurrencyFormatter.format(amount: trade.calculatedNetPnl, includeSign: true, isPrivacyMode: preferences.isPrivacyModeEnabled))
                                .font(.system(size: 12, weight: .bold, design: .monospaced))
                                .foregroundColor(KiteTheme.pnlColor(for: trade.calculatedNetPnl))
                        }
                        .width(min: 95, ideal: 110, max: 130)
                        
                        TableColumn("Actions") { trade in
                            HStack(spacing: 8) {
                                Button {
                                    viewModel.selectedTradeForDetail = trade
                                } label: {
                                    Image(systemName: "info.circle")
                                        .font(.system(size: 12))
                                        .foregroundColor(KiteTheme.brandBlue)
                                }
                                .buttonStyle(.plain)
                                .help("View Trade Details")
                                
                                Button {
                                    Task { await viewModel.deleteTrade(trade) }
                                } label: {
                                    Image(systemName: "trash")
                                        .font(.system(size: 11))
                                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                }
                                .buttonStyle(.plain)
                                .help("Delete Trade")
                            }
                        }
                        .width(min: 55, ideal: 65, max: 75)
                    }
                    .tableStyle(.bordered(alternatesRowBackgrounds: true))
                }
            }
            .background(KiteTheme.canvas(for: colorScheme))
            
            // MARK: - Pagination Footer
            HStack {
                Text("Page \(viewModel.currentPage) of \(viewModel.totalPages)")
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                
                Spacer()
                
                HStack(spacing: 8) {
                    Button("Previous") {
                        Task { await viewModel.loadTrades(page: max(1, viewModel.currentPage - 1)) }
                    }
                    .kiteOutlineButton()
                    .disabled(viewModel.currentPage <= 1 || viewModel.isLoading)
                    
                    Button("Next") {
                        Task { await viewModel.loadTrades(page: min(viewModel.totalPages, viewModel.currentPage + 1)) }
                    }
                    .kiteOutlineButton()
                    .disabled(viewModel.currentPage >= viewModel.totalPages || viewModel.isLoading)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(KiteTheme.surface(for: colorScheme))
            .overlay(
                Rectangle()
                    .frame(height: 1)
                    .foregroundColor(KiteTheme.border(for: colorScheme)),
                alignment: .top
            )
        }
        .sheet(item: $viewModel.selectedTradeForDetail) { trade in
            TradeDetailSheet(trade: trade) {
                Task { await viewModel.deleteTrade(trade) }
            }
        }
        .sheet(isPresented: $isExportSheetPresented) {
            ExportReportSheet()
        }
        .sheet(isPresented: $isImportSheetPresented) {
            BulkImportView()
        }
        .task {
            await viewModel.loadTrades(page: 1)
        }
    }
}
