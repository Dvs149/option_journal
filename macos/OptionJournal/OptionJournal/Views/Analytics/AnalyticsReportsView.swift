import SwiftUI

public struct AnalyticsReportsView: View {
    @Environment(\.colorScheme) private var colorScheme
    @StateObject private var viewModel = AnalyticsReportsViewModel()
    
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
                    ProgressView("Aggregating portfolio analytics...")
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
                    Text("Failed to load analytics")
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
            } else if let data = viewModel.data {
                ScrollView {
                    VStack(spacing: 16) {
                        // Key Metrics Row
                        if let m = data.metrics {
                            metricsSummaryRow(m)
                            
                            // Day Records Row (Best & Worst)
                            dayRecordsRow(m)
                        }
                        
                        // Comparisons Row (CE vs PE, Trading Types)
                        if let comp = data.comparisons {
                            comparisonsSection(comp)
                        }
                        
                        // Weekday Performance Section
                        if let weekdays = data.weekdayAnalytics, !weekdays.isEmpty {
                            weekdayAnalyticsSection(weekdays)
                        }
                    }
                    .padding(20)
                }
            } else {
                VStack(spacing: 12) {
                    Spacer()
                    Image(systemName: "chart.bar.xaxis")
                        .font(.system(size: 36))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Text("No Analytics Available")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    Text("Record trades in the journal to view deep performance statistics.")
                        .font(.system(size: 12))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
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
                Text("Performance Analytics")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                Text("Statistical breakdowns across instruments, trading styles, and market days")
                    .font(.system(size: 12))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
            
            Spacer()
            
            Picker("Timeframe", selection: $viewModel.selectedFilter) {
                Text("All Time").tag("all")
                Text("Today").tag("today")
                Text("This Week").tag("week")
                Text("This Month").tag("month")
            }
            .pickerStyle(.segmented)
            .frame(width: 280)
            .onChange(of: viewModel.selectedFilter) { newValue in
                viewModel.setFilter(newValue)
            }
            
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
            .help("Refresh Analytics")
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
    }
    
    // MARK: - Metrics Summary Row
    private func metricsSummaryRow(_ m: AdvancedMetrics) -> some View {
        HStack(spacing: 12) {
            let net = m.totalNetPnl ?? 0.0
            statCard(
                title: "Realized Net P&L",
                value: formatCurrency(net),
                valueColor: net >= 0 ? KiteTheme.profitGreen : KiteTheme.lossRed,
                subtitle: "\(m.totalTrades ?? 0) total trades",
                icon: net >= 0 ? "arrow.up.right" : "arrow.down.right"
            )
            
            statCard(
                title: "Avg Winning Trade",
                value: formatCurrency(m.avgWinningTrade ?? 0),
                valueColor: KiteTheme.profitGreen,
                subtitle: "Realized average gain",
                icon: "arrow.up.circle"
            )
            
            statCard(
                title: "Avg Losing Trade",
                value: formatCurrency(m.avgLosingTrade ?? 0),
                valueColor: KiteTheme.lossRed,
                subtitle: "Realized average loss",
                icon: "arrow.down.circle"
            )
            
            statCard(
                title: "Total Statutory Charges",
                value: formatCurrency(m.totalCharges ?? 0),
                valueColor: KiteTheme.textPrimary(for: colorScheme),
                subtitle: "Brokerage, STT, Exchange fees",
                icon: "doc.plaintext"
            )
        }
    }
    
    // MARK: - Day Records Row
    private func dayRecordsRow(_ m: AdvancedMetrics) -> some View {
        HStack(spacing: 12) {
            // Best Trading Day
            if let best = m.bestTradingDay {
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("BEST TRADING DAY")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(KiteTheme.profitGreen)
                        Text(best.date ?? "-")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    }
                    Spacer()
                    Text(formatCurrency(best.pnl ?? 0))
                        .font(.system(size: 15, weight: .bold, design: .monospaced))
                        .foregroundColor(KiteTheme.profitGreen)
                }
                .padding(12)
                .frame(maxWidth: .infinity)
                .background(KiteTheme.surface(for: colorScheme))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(KiteTheme.profitGreen.opacity(0.3), lineWidth: 1)
                )
            }
            
            // Worst Trading Day
            if let worst = m.worstTradingDay {
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("WORST TRADING DAY")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(KiteTheme.lossRed)
                        Text(worst.date ?? "-")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    }
                    Spacer()
                    Text(formatCurrency(worst.pnl ?? 0))
                        .font(.system(size: 15, weight: .bold, design: .monospaced))
                        .foregroundColor(KiteTheme.lossRed)
                }
                .padding(12)
                .frame(maxWidth: .infinity)
                .background(KiteTheme.surface(for: colorScheme))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(KiteTheme.lossRed.opacity(0.3), lineWidth: 1)
                )
            }
        }
    }
    
    // MARK: - Comparisons Section
    private func comparisonsSection(_ comp: AdvancedComparisons) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("SEGMENT & STYLE COMPARISONS")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            
            HStack(spacing: 12) {
                // Option Type CE vs PE
                if let cePe = comp.ceVsPe {
                    let ce = cePe["ce"] ?? 0
                    let pe = cePe["pe"] ?? 0
                    comparisonCard(
                        title: "Calls (CE) vs Puts (PE)",
                        firstLabel: "CE P&L",
                        firstValue: ce,
                        secondLabel: "PE P&L",
                        secondValue: pe
                    )
                }
                
                // Indices Nifty vs Sensex
                if let niftySensex = comp.niftyVsSensex {
                    let n = niftySensex["nifty"] ?? 0
                    let s = niftySensex["sensex"] ?? 0
                    comparisonCard(
                        title: "NIFTY 50 vs SENSEX",
                        firstLabel: "NIFTY P&L",
                        firstValue: n,
                        secondLabel: "SENSEX P&L",
                        secondValue: s
                    )
                }
            }
        }
    }
    
    private func comparisonCard(title: String, firstLabel: String, firstValue: Double, secondLabel: String, secondValue: Double) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
            
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(firstLabel)
                        .font(.system(size: 10))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Text(formatCurrency(firstValue))
                        .font(.system(size: 14, weight: .bold, design: .monospaced))
                        .foregroundColor(firstValue >= 0 ? KiteTheme.profitGreen : KiteTheme.lossRed)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text(secondLabel)
                        .font(.system(size: 10))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Text(formatCurrency(secondValue))
                        .font(.system(size: 14, weight: .bold, design: .monospaced))
                        .foregroundColor(secondValue >= 0 ? KiteTheme.profitGreen : KiteTheme.lossRed)
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(KiteTheme.surface(for: colorScheme))
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
        )
    }
    
    // MARK: - Weekday Analytics Section
    private func weekdayAnalyticsSection(_ weekdays: [String: WeekdayAnalyticsItem]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("WEEKDAY PERFORMANCE HEATMAP")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            
            let daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
            let items = daysOrder.compactMap { weekdays[$0] }
            
            VStack(spacing: 6) {
                ForEach(items, id: \.day) { item in
                    let net = item.netPnl ?? 0
                    let winRate = item.winRate ?? 0
                    
                    HStack(spacing: 16) {
                        Text(item.day)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                            .frame(width: 100, alignment: .leading)
                        
                        Text("\(item.tradingDays ?? 0) sessions • \(item.winDays ?? 0)W / \(item.lossDays ?? 0)L")
                            .font(.system(size: 11))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                            .frame(width: 160, alignment: .leading)
                        
                        // Win Rate Pill
                        Text("\(String(format: "%.1f%%", winRate)) Win Rate")
                            .font(.system(size: 11, weight: .medium, design: .monospaced))
                            .foregroundColor(winRate >= 50 ? KiteTheme.profitGreen : KiteTheme.brandOrange)
                        
                        Spacer()
                        
                        Text(formatCurrency(net))
                            .font(.system(size: 13, weight: .bold, design: .monospaced))
                            .foregroundColor(net >= 0 ? KiteTheme.profitGreen : KiteTheme.lossRed)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(KiteTheme.surface(for: colorScheme))
                    .overlay(
                        RoundedRectangle(cornerRadius: 4)
                            .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
                    )
                }
            }
        }
    }
    
    // MARK: - Helpers
    private func statCard(title: String, value: String, valueColor: Color, subtitle: String, icon: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(title.uppercased())
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                Spacer()
                Image(systemName: icon)
                    .font(.system(size: 11))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
            
            Text(value)
                .font(.system(size: 16, weight: .bold, design: .monospaced))
                .foregroundColor(valueColor)
            
            Text(subtitle)
                .font(.system(size: 11))
                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(KiteTheme.surface(for: colorScheme))
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
        )
    }
    
    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "₹"
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: value)) ?? "₹\(value)"
    }
}
