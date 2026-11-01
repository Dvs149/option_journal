import SwiftUI
import Charts

public struct StrategyAnalysisView: View {
    @Environment(\.colorScheme) private var colorScheme
    @StateObject private var viewModel = StrategyAnalysisViewModel()
    
    public init() {}
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header
            headerView
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            // Content
            if viewModel.isLoading {
                VStack {
                    Spacer()
                    ProgressView("Analyzing strategy performance...")
                        .font(.system(size: 13))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage {
                VStack(spacing: 12) {
                    Spacer()
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 32))
                        .foregroundColor(KiteTheme.lossRed)
                    Text("Failed to load strategies")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    Text(error)
                        .font(.system(size: 12))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Button("Try Again") {
                        Task { await viewModel.loadData() }
                    }
                    .buttonStyle(KiteSecondaryButtonStyle())
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if viewModel.strategies.isEmpty {
                VStack(spacing: 12) {
                    Spacer()
                    Image(systemName: "chart.pie")
                        .font(.system(size: 36))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Text("No Strategy Data")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    Text("Assign strategies to your trades (e.g. CPR Breakout, Iron Condor, Scalping) to view comparative analytics.")
                        .font(.system(size: 12))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(spacing: 16) {
                        // Highlights Row (Best & Worst)
                        highlightsRow
                        
                        // Strategy P&L Bar Chart
                        strategyChartCard
                        
                        // Detailed Strategy Breakdown Cards
                        strategiesListSection
                    }
                    .padding(20)
                }
            }
        }
        .background(KiteTheme.canvas(for: colorScheme))
        .task {
            await viewModel.loadData()
        }
    }
    
    // MARK: - Header
    private var headerView: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Strategy Analysis")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                Text("Performance breakdown, win rates, and profit expectancy by setup")
                    .font(.system(size: 12))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
            
            Spacer()
            
            // Search field
            HStack(spacing: 6) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 11))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                TextField("Filter strategies...", text: $viewModel.searchText)
                    .textFieldStyle(PlainTextFieldStyle())
                    .font(.system(size: 12))
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .frame(width: 160)
            .background(KiteTheme.surface(for: colorScheme))
            .overlay(
                RoundedRectangle(cornerRadius: 4)
                    .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
            )
            
            // Sort Picker
            Picker("Sort", selection: $viewModel.sortCriteria) {
                ForEach(StrategySortCriteria.allCases) { criteria in
                    Text(criteria.rawValue).tag(criteria)
                }
            }
            .pickerStyle(.segmented)
            .frame(width: 220)
            
            // Refresh
            Button(action: {
                Task { await viewModel.loadData() }
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
            .help("Refresh Strategies")
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
    }
    
    // MARK: - Highlights Row
    private var highlightsRow: some View {
        HStack(spacing: 12) {
            // Best Performing
            if let best = viewModel.bestPerforming {
                highlightCard(
                    badge: "TOP PERFORMER",
                    title: best.strategy,
                    winRate: best.winRate ?? 0,
                    netPnl: best.netPnl ?? 0,
                    tradesCount: best.totalTrades,
                    accentColor: KiteTheme.profitGreen,
                    icon: "crown.fill"
                )
            }
            
            // Worst Performing
            if let worst = viewModel.worstPerforming, worst.strategy != viewModel.bestPerforming?.strategy {
                highlightCard(
                    badge: "UNDERPERFORMER",
                    title: worst.strategy,
                    winRate: worst.winRate ?? 0,
                    netPnl: worst.netPnl ?? 0,
                    tradesCount: worst.totalTrades,
                    accentColor: KiteTheme.lossRed,
                    icon: "exclamationmark.triangle.fill"
                )
            }
        }
    }
    
    private func highlightCard(
        badge: String,
        title: String,
        winRate: Double,
        netPnl: Double,
        tradesCount: Int,
        accentColor: Color,
        icon: String
    ) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Image(systemName: icon)
                        .font(.system(size: 10))
                        .foregroundColor(accentColor)
                    Text(badge)
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(accentColor)
                }
                
                Text(title)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    .lineLimit(1)
                
                Text("\(tradesCount) trades • \(String(format: "%.1f%%", winRate)) Win Rate")
                    .font(.system(size: 11))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
            
            Spacer()
            
            Text(formatCurrency(netPnl))
                .font(.system(size: 16, weight: .bold, design: .monospaced))
                .foregroundColor(netPnl >= 0 ? KiteTheme.profitGreen : KiteTheme.lossRed)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(KiteTheme.surface(for: colorScheme))
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(accentColor.opacity(0.3), lineWidth: 1)
        )
    }
    
    // MARK: - Strategy Chart Card
    private var strategyChartCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Net P&L by Strategy")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    Text("Comparison of total realized profitability across option strategies")
                        .font(.system(size: 11))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                }
                Spacer()
            }
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            Chart {
                ForEach(viewModel.displayedStrategies) { item in
                    let pnl = item.netPnl ?? 0.0
                    BarMark(
                        x: .value("Net P&L", pnl),
                        y: .value("Strategy", item.strategy)
                    )
                    .foregroundStyle(pnl >= 0 ? KiteTheme.profitGreen : KiteTheme.lossRed)
                    .cornerRadius(3)
                }
                
                RuleMark(x: .value("Break Even", 0))
                    .foregroundStyle(KiteTheme.border(for: colorScheme))
            }
            .chartXAxis {
                AxisMarks(position: .bottom, values: .automatic(desiredCount: 6)) { value in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [2, 2]))
                        .foregroundStyle(KiteTheme.border(for: colorScheme))
                    AxisValueLabel {
                        if let dbl = value.as(Double.self) {
                            Text(formatCompactCurrency(dbl))
                                .font(.system(size: 10, design: .monospaced))
                                .foregroundStyle(KiteTheme.textSecondary(for: colorScheme))
                        }
                    }
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisValueLabel()
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(KiteTheme.textPrimary(for: colorScheme))
                }
            }
            .frame(height: max(160, CGFloat(viewModel.displayedStrategies.count * 32)))
        }
        .padding(16)
        .background(KiteTheme.surface(for: colorScheme))
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
        )
    }
    
    // MARK: - Strategies List Section
    private var strategiesListSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("DETAILED BREAKDOWN")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            
            VStack(spacing: 8) {
                ForEach(viewModel.displayedStrategies) { item in
                    strategyRowView(item)
                }
            }
        }
    }
    
    private func strategyRowView(_ item: StrategyPerformanceItem) -> some View {
        let winRate = item.winRate ?? 0.0
        let net = item.netPnl ?? 0.0
        
        return HStack(spacing: 16) {
            // Strategy Name & Trades Count
            VStack(alignment: .leading, spacing: 4) {
                Text(item.strategy)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                
                Text("\(item.totalTrades) trades • \(item.winningTrades)W / \(item.losingTrades)L")
                    .font(.system(size: 11))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
            .frame(width: 180, alignment: .leading)
            
            // Win Rate Progress Bar
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("Win Rate")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Spacer()
                    Text(String(format: "%.1f%%", winRate))
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(winRate >= 50 ? KiteTheme.profitGreen : KiteTheme.brandOrange)
                }
                
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(KiteTheme.canvas(for: colorScheme))
                            .frame(height: 6)
                        
                        RoundedRectangle(cornerRadius: 3)
                            .fill(winRate >= 50 ? KiteTheme.profitGreen : KiteTheme.brandOrange)
                            .frame(width: geo.size.width * CGFloat(min(max(winRate / 100.0, 0), 1.0)), height: 6)
                    }
                }
                .frame(height: 6)
            }
            .frame(maxWidth: .infinity)
            
            // Avg Win / Avg Loss
            VStack(alignment: .trailing, spacing: 2) {
                Text("Avg Win: \(formatCurrency(item.avgProfit ?? 0))")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundColor(KiteTheme.profitGreen)
                Text("Avg Loss: \(formatCurrency(item.avgLoss ?? 0))")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundColor(KiteTheme.lossRed)
            }
            .frame(width: 140, alignment: .trailing)
            
            // Total Net P&L
            Text(formatCurrency(net))
                .font(.system(size: 14, weight: .bold, design: .monospaced))
                .foregroundColor(net >= 0 ? KiteTheme.profitGreen : KiteTheme.lossRed)
                .frame(width: 120, alignment: .trailing)
        }
        .padding(12)
        .background(KiteTheme.surface(for: colorScheme))
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
        )
    }
    
    // MARK: - Helpers
    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "₹"
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: value)) ?? "₹\(value)"
    }
    
    private func formatCompactCurrency(_ value: Double) -> String {
        if abs(value) >= 100000 {
            return String(format: "₹%.1fL", value / 100000)
        } else if abs(value) >= 1000 {
            return String(format: "₹%.1fk", value / 1000)
        }
        return String(format: "₹%.0f", value)
    }
}
