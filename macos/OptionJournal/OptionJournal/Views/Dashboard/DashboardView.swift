import SwiftUI

public struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @EnvironmentObject private var appState: AppState
    @ObservedObject private var preferences = PreferencesManager.shared
    @Environment(\.colorScheme) private var colorScheme
    @State private var selectedTradeForDetail: Trade?
    
    public init() {}
    
    public var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(alignment: .leading, spacing: 20) {
                // MARK: - Header Bar & Filter
                HStack {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Dashboard")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                        
                        Text("Real-time summary of trading performance & risk limits")
                            .font(.system(size: 12))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    }
                    
                    Spacer()
                    
                    // Timeframe Picker
                    Picker("Period", selection: $viewModel.selectedFilter) {
                        Text("All Time").tag("all")
                        Text("This Month").tag("this_month")
                        Text("This Week").tag("this_week")
                        Text("Today").tag("today")
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 320)
                    .onChange(of: viewModel.selectedFilter) { _ in
                        Task { await viewModel.loadDashboard() }
                    }
                    
                    Button {
                        Task { await viewModel.loadDashboard() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 11))
                    }
                    .kiteOutlineButton()
                }
                
                if viewModel.isLoading && viewModel.stats == nil {
                    VStack(spacing: 12) {
                        ProgressView()
                            .controlSize(.regular)
                        Text("Loading performance analytics...")
                            .font(.system(size: 12))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    }
                    .frame(maxWidth: .infinity, minHeight: 200)
                } else if let stats = viewModel.stats {
                    // MARK: - Primary Metric Cards Grid
                    let net = stats.totalNetProfit ?? 0.0
                    let charges = stats.totalCharges ?? 0.0
                    let winRate = stats.winRate ?? 0.0
                    let profitFactor = stats.profitFactor ?? 0.0
                    
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 190, maximum: 260), spacing: 14)], spacing: 14) {
                        MetricCard(
                            title: "Total Net Profit",
                            value: CurrencyFormatter.format(amount: net, includeSign: true, isPrivacyMode: preferences.isPrivacyModeEnabled),
                            badgeText: CurrencyFormatter.formatPercent(value: stats.periodRoi ?? 0.0),
                            isPositive: net >= 0,
                            icon: net >= 0 ? "arrow.up.right" : "arrow.down.right"
                        )
                        
                        MetricCard(
                            title: "Win Rate",
                            value: "\(String(format: "%.1f", winRate))%",
                            badgeText: "\(stats.winningDays ?? 0)W / \(stats.losingDays ?? 0)L Days",
                            isPositive: winRate >= 50.0,
                            icon: "trophy"
                        )
                        
                        MetricCard(
                            title: "Profit Factor",
                            value: "\(String(format: "%.2f", profitFactor))",
                            badgeText: profitFactor >= 1.5 ? "Exceptional" : "Normal",
                            isPositive: profitFactor >= 1.0,
                            icon: "chart.line.uptrend.xyaxis"
                        )
                        
                        MetricCard(
                            title: "Total Charges",
                            value: CurrencyFormatter.format(amount: charges, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled),
                            badgeText: "STT & Brokerage",
                            isPositive: false,
                            icon: "tag"
                        )
                    }
                    
                    // MARK: - Today & This Month Quick Summary
                    HStack(spacing: 14) {
                        SummaryStrip(
                            title: "Today's P&L",
                            amount: stats.todayPnl ?? 0.0,
                            isPrivacyMode: preferences.isPrivacyModeEnabled
                        )
                        
                        SummaryStrip(
                            title: "This Week's P&L",
                            amount: stats.thisWeekPnl ?? 0.0,
                            isPrivacyMode: preferences.isPrivacyModeEnabled
                        )
                        
                        SummaryStrip(
                            title: "This Month's P&L",
                            amount: stats.thisMonthPnl ?? 0.0,
                            isPrivacyMode: preferences.isPrivacyModeEnabled
                        )
                    }
                    
                    // MARK: - Recent Trades List
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Recent Executions")
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                            
                            Spacer()
                            
                            Button("View All Trades (⌘3)") {
                                appState.selectedTab = "trades"
                            }
                            .kiteGhostButton()
                        }
                        
                        if viewModel.recentTrades.isEmpty {
                            Text("No recent trades in this period.")
                                .font(.system(size: 12))
                                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                .frame(maxWidth: .infinity, minHeight: 80)
                                .kiteCard()
                        } else {
                            VStack(spacing: 0) {
                                ForEach(viewModel.recentTrades) { item in
                                    RecentTradeRow(item: item)
                                    if item.id != viewModel.recentTrades.last?.id {
                                        Divider()
                                            .background(KiteTheme.border(for: colorScheme))
                                    }
                                }
                            }
                            .kiteCard()
                        }
                    }
                }
            }
            .padding(24)
        }
        .background(KiteTheme.canvas(for: colorScheme))
        .task {
            await viewModel.loadDashboard()
        }
    }
}

// MARK: - KPI Metric Card
private struct MetricCard: View {
    @Environment(\.colorScheme) private var colorScheme
    let title: String
    let value: String
    let badgeText: String
    let isPositive: Bool
    let icon: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                ZStack {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(isPositive ? KiteTheme.profitGreen.opacity(0.12) : KiteTheme.brandOrange.opacity(0.12))
                        .frame(width: 28, height: 28)
                    
                    Image(systemName: icon)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(isPositive ? KiteTheme.profitGreen : KiteTheme.brandOrange)
                }
                
                Spacer()
                
                HStack(spacing: 3) {
                    Text(badgeText)
                        .font(.system(size: 10, weight: .semibold))
                }
                .foregroundColor(isPositive ? KiteTheme.profitGreen : KiteTheme.brandOrange)
                .padding(.horizontal, 6)
                .padding(.vertical, 3)
                .background(
                    RoundedRectangle(cornerRadius: 4)
                        .fill(isPositive ? KiteTheme.profitGreen.opacity(0.12) : KiteTheme.brandOrange.opacity(0.12))
                )
            }
            
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                
                Text(value)
                    .font(.system(size: 20, weight: .bold, design: .monospaced))
                    .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
            }
        }
        .padding(14)
        .kiteCard(cornerRadius: 6)
    }
}

// MARK: - Summary Strip
private struct SummaryStrip: View {
    @Environment(\.colorScheme) private var colorScheme
    let title: String
    let amount: Double
    let isPrivacyMode: Bool
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.system(size: 11))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                Text(CurrencyFormatter.format(amount: amount, includeSign: true, isPrivacyMode: isPrivacyMode))
                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                    .foregroundColor(KiteTheme.pnlColor(for: amount))
            }
            Spacer()
        }
        .padding(12)
        .kiteCard(cornerRadius: 6)
    }
}

// MARK: - Recent Trade Row
private struct RecentTradeRow: View {
    @Environment(\.colorScheme) private var colorScheme
    @ObservedObject private var preferences = PreferencesManager.shared
    let item: RecentTradeItem
    
    var body: some View {
        HStack(spacing: 12) {
            Text(item.displayDate ?? item.tradeDate)
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                .frame(width: 80, alignment: .leading)
            
            Text(item.indexName)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                .frame(width: 80, alignment: .leading)
            
            KiteStatusBadge(optionType: item.optionType)
            
            if let strike = item.strikePrice {
                Text("\(Int(strike))")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
            }
            
            Text(item.strategyName ?? item.tradingType)
                .font(.system(size: 11))
                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                .lineLimit(1)
            
            Spacer()
            
            Text(CurrencyFormatter.format(amount: item.calculatedNetPnl, includeSign: true, isPrivacyMode: preferences.isPrivacyModeEnabled))
                .font(.system(size: 12, weight: .bold, design: .monospaced))
                .foregroundColor(KiteTheme.pnlColor(for: item.calculatedNetPnl))
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 9)
    }
}
