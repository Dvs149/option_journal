import SwiftUI
import Charts

public struct AnalyticsReportsView: View {
    @StateObject private var viewModel = AnalyticsReportsViewModel()
    @ObservedObject private var preferences = PreferencesManager.shared
    @Environment(\.colorScheme) private var colorScheme
    
    public init() {}
    
    public var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(alignment: .leading, spacing: 20) {
                // MARK: - Header
                headerSection
                
                // MARK: - Top 7 Metric Cards
                topMetricsSection
                
                // MARK: - Navigation Tabs
                navTabsSection
                
                // MARK: - Row 1: Performance Overview + Monthly Performance
                HStack(alignment: .top, spacing: 16) {
                    performanceOverviewCard
                        .frame(minWidth: 480, maxWidth: .infinity)
                    
                    monthlyPerformanceCard
                        .frame(width: 400)
                }
                .frame(maxWidth: .infinity)
                
                // MARK: - Row 2: P&L Analysis + Trade Distribution + Win/Loss Analysis
                HStack(alignment: .top, spacing: 16) {
                    pnlAnalysisCard
                        .frame(minWidth: 360, maxWidth: .infinity)
                    
                    tradeDistributionCard
                        .frame(width: 300)
                    
                    winLossAnalysisCard
                        .frame(width: 300)
                }
                .frame(maxWidth: .infinity)
                
                // MARK: - Row 3: Risk Metrics + Trade Duration Analysis
                HStack(alignment: .top, spacing: 16) {
                    riskMetricsCard
                        .frame(minWidth: 360, maxWidth: .infinity)
                    
                    tradeDurationAnalysisCard
                        .frame(minWidth: 360, maxWidth: .infinity)
                }
                .frame(maxWidth: .infinity)
                
                // MARK: - Row 4: Detailed Statistics + Monthly Summary Table + Reports & Export
                HStack(alignment: .top, spacing: 16) {
                    detailedStatisticsCard
                        .frame(minWidth: 320, maxWidth: .infinity)
                    
                    monthlySummaryTableCard
                        .frame(minWidth: 360, maxWidth: .infinity)
                    
                    reportsExportCard
                        .frame(width: 320)
                }
                .frame(maxWidth: .infinity)
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .background(Color(hex: "0b111e"))
        .task {
            await viewModel.loadData()
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Analytics & Reports")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundColor(.white)
                Text("Get detailed insights into your trading performance")
                    .font(.system(size: 13))
                    .foregroundColor(Color(hex: "94a3b8"))
            }
            
            Spacer()
            
            HStack(spacing: 8) {
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
                
                HStack(spacing: 2) {
                    ForEach(["7D", "1M", "3M", "6M", "YTD", "1Y", "All"], id: \.self) { r in
                        Button {
                            viewModel.setTimeframe(r)
                        } label: {
                            Text(r)
                                .font(.system(size: 11, weight: viewModel.selectedFilter == r ? .bold : .medium))
                                .foregroundColor(viewModel.selectedFilter == r ? .white : Color(hex: "94a3b8"))
                                .padding(.horizontal, 7)
                                .padding(.vertical, 5)
                                .background(viewModel.selectedFilter == r ? Color(hex: "3b82f6") : Color.clear)
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(2)
                .background(Color(hex: "121b2d"))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color(hex: "1e293b"), lineWidth: 1)
                )
            }
        }
    }
    
    // MARK: - Top 7 Metric Cards
    private var topMetricsSection: some View {
        HStack(spacing: 10) {
            statMetricCard(title: "Total Net Profit", value: DashboardNumberFormatter.formatRupeeInteger(viewModel.totalNetProfit, includeSign: true, isPrivacyMode: preferences.isPrivacyModeEnabled), sub: "Net Loss", subColor: Color(hex: "f43f5e"), icon: "indianrupeesign", iconColor: Color(hex: "f43f5e"), valColor: Color(hex: "f43f5e"))
            statMetricCard(title: "Total Trades", value: "\(viewModel.totalTrades)", sub: "Logged trades", subColor: Color(hex: "3b82f6"), icon: "doc.text.fill", iconColor: Color(hex: "3b82f6"))
            statMetricCard(title: "Win Rate", value: "\(String(format: "%.1f", viewModel.winRate))%", sub: "Overall Win Rate", subColor: Color(hex: "10b981"), icon: "percent", iconColor: Color(hex: "10b981"))
            statMetricCard(title: "Profit Factor", value: "\(String(format: "%.1f", viewModel.profitFactor))", sub: "Gross P / Gross L", subColor: Color(hex: "10b981"), icon: "scalemass.fill", iconColor: Color(hex: "10b981"))
            statMetricCard(title: "Expectancy (per trade)", value: "₹\(Int(viewModel.expectancy))", sub: "Avg expectation", subColor: Color(hex: "f59e0b"), icon: "trophy.fill", iconColor: Color(hex: "f59e0b"))
            statMetricCard(title: "Max Drawdown", value: DashboardNumberFormatter.formatRupeeInteger(viewModel.maxDrawdown, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled), sub: "Peak to trough", subColor: Color(hex: "f43f5e"), icon: "exclamationmark.circle.fill", iconColor: Color(hex: "f43f5e"), valColor: Color(hex: "f43f5e"))
            statMetricCard(title: "Sharpe Ratio", value: "0", sub: "Risk-adjusted", subColor: Color(hex: "06b6d4"), icon: "chart.bar.fill", iconColor: Color(hex: "06b6d4"))
        }
    }
    
    private func statMetricCard(title: String, value: String, sub: String, subColor: Color, icon: String, iconColor: Color, valColor: Color = .white) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(title)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(Color(hex: "94a3b8"))
                Spacer()
                Image(systemName: icon)
                    .font(.system(size: 11))
                    .foregroundColor(iconColor)
            }
            
            Text(value)
                .font(.system(size: 16, weight: .bold, design: .monospaced))
                .foregroundColor(valColor)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            
            Text(sub)
                .font(.system(size: 9, weight: .semibold))
                .foregroundColor(subColor)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Navigation Tabs
    private var navTabsSection: some View {
        HStack(spacing: 6) {
            ForEach(["Overview", "Detailed Reports", "Custom Reports", "Export Data"], id: \.self) { tab in
                Button {
                    viewModel.activeNavTab = tab
                } label: {
                    Text(tab)
                        .font(.system(size: 12, weight: viewModel.activeNavTab == tab ? .bold : .medium))
                        .foregroundColor(viewModel.activeNavTab == tab ? .white : Color(hex: "94a3b8"))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 7)
                        .background(viewModel.activeNavTab == tab ? Color(hex: "3b82f6") : Color(hex: "121b2d"))
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                        .overlay(
                            RoundedRectangle(cornerRadius: 6)
                                .stroke(Color(hex: "1e293b"), lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
            }
            Spacer()
        }
    }
    
    // MARK: - Row 1: Performance Overview Card
    private var performanceOverviewCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 12) {
                    Text("Performance Overview")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                    
                    HStack(spacing: 10) {
                        legendPill("Net P&L", Color(hex: "3b82f6"))
                        legendPill("Cumulative P&L", Color(hex: "10b981"))
                        legendPill("Drawdown", Color(hex: "f43f5e"))
                    }
                }
                
                Spacer()
                
                HStack(spacing: 8) {
                    Text("Net P&L v")
                        .font(.system(size: 11))
                        .foregroundColor(Color(hex: "94a3b8"))
                    
                    Text("-₹3,87,387")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(Color(hex: "f43f5e"))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(hex: "f43f5e").opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }
            }
            
            Chart {
                AreaMark(x: .value("Date", "Jan"), y: .value("Val", 0))
                AreaMark(x: .value("Date", "Apr"), y: .value("Val", 1800))
                AreaMark(x: .value("Date", "Jun"), y: .value("Val", 2100))
                AreaMark(x: .value("Date", "Jul"), y: .value("Val", 2300))
                AreaMark(x: .value("Date", "Oct"), y: .value("Val", 2700))
                AreaMark(x: .value("Date", "Nov"), y: .value("Val", 2500))
            }
            .foregroundStyle(
                LinearGradient(
                    colors: [Color(hex: "f43f5e").opacity(0.35), Color(hex: "f43f5e").opacity(0.02)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
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
    
    private func legendPill(_ label: String, _ color: Color) -> some View {
        HStack(spacing: 4) {
            Circle().fill(color).frame(width: 6, height: 6)
            Text(label).font(.system(size: 10)).foregroundColor(Color(hex: "94a3b8"))
        }
    }
    
    // MARK: - Row 1 Right: Monthly Performance Card
    private var monthlyPerformanceCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Monthly Performance")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                Text("2026")
                    .font(.system(size: 11))
                    .foregroundColor(Color(hex: "94a3b8"))
            }
            
            HStack(spacing: 12) {
                legendPill("Profit", Color(hex: "10b981"))
                legendPill("Loss", Color(hex: "f43f5e"))
                Spacer()
            }
            
            Chart {
                BarMark(x: .value("Month", "Jan"), y: .value("P&L", 0)).foregroundStyle(Color(hex: "64748b"))
                BarMark(x: .value("Month", "Feb"), y: .value("P&L", 0)).foregroundStyle(Color(hex: "64748b"))
                BarMark(x: .value("Month", "Mar"), y: .value("P&L", 0)).foregroundStyle(Color(hex: "64748b"))
                BarMark(x: .value("Month", "Apr"), y: .value("P&L", 0)).foregroundStyle(Color(hex: "64748b"))
                BarMark(x: .value("Month", "May"), y: .value("P&L", 0)).foregroundStyle(Color(hex: "64748b"))
                BarMark(x: .value("Month", "Jun"), y: .value("P&L", -145)).foregroundStyle(Color(hex: "f43f5e"))
                BarMark(x: .value("Month", "Jul"), y: .value("P&L", -198)).foregroundStyle(Color(hex: "f43f5e"))
                BarMark(x: .value("Month", "Aug"), y: .value("P&L", 12)).foregroundStyle(Color(hex: "10b981"))
                BarMark(x: .value("Month", "Sep"), y: .value("P&L", 14)).foregroundStyle(Color(hex: "10b981"))
                BarMark(x: .value("Month", "Oct"), y: .value("P&L", -45)).foregroundStyle(Color(hex: "f43f5e"))
                BarMark(x: .value("Month", "Nov"), y: .value("P&L", 11)).foregroundStyle(Color(hex: "10b981"))
                BarMark(x: .value("Month", "Dec"), y: .value("P&L", 0)).foregroundStyle(Color(hex: "64748b"))
            }
            .chartYAxis {
                AxisMarks(position: .leading) { val in
                    AxisGridLine().foregroundStyle(Color(hex: "1e293b"))
                    AxisValueLabel {
                        if let d = val.as(Double.self) {
                            Text("\(Int(d))K").font(.system(size: 8)).foregroundColor(Color(hex: "64748b"))
                        }
                    }
                }
            }
            .chartXAxis {
                AxisMarks { val in
                    AxisValueLabel {
                        if let s = val.as(String.self) {
                            Text(s).font(.system(size: 8)).foregroundColor(Color(hex: "94a3b8"))
                        }
                    }
                }
            }
            .frame(height: 155)
        }
        .padding(16)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 2: Profit & Loss Analysis Card
    private var pnlAnalysisCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Profit & Loss Analysis")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                
                Spacer()
                
                HStack(spacing: 2) {
                    ForEach(["Daily", "Weekly", "Monthly", "Yearly"], id: \.self) { p in
                        Button {
                            viewModel.pnlPeriod = p
                        } label: {
                            Text(p)
                                .font(.system(size: 10, weight: viewModel.pnlPeriod == p ? .bold : .medium))
                                .foregroundColor(viewModel.pnlPeriod == p ? .white : Color(hex: "94a3b8"))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 3)
                                .background(viewModel.pnlPeriod == p ? Color(hex: "3b82f6") : Color.clear)
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .background(Color(hex: "0e1524"))
                .clipShape(RoundedRectangle(cornerRadius: 6))
            }
            
            Chart {
                ForEach(viewModel.dailyItems) { item in
                    BarMark(
                        x: .value("Date", item.date),
                        y: .value("P&L", item.pnl)
                    )
                    .foregroundStyle(item.pnl >= 0 ? Color(hex: "10b981") : Color(hex: "f43f5e"))
                }
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
                            Text(s).font(.system(size: 8)).foregroundColor(Color(hex: "94a3b8"))
                        }
                    }
                }
            }
            .frame(height: 130)
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 2: Trade Distribution Card
    private var tradeDistributionCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Trade Distribution")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                Text("By Index v")
                    .font(.system(size: 10))
                    .foregroundColor(Color(hex: "94a3b8"))
            }
            
            ZStack {
                Circle().stroke(Color(hex: "3b82f6"), lineWidth: 12).frame(width: 75, height: 75)
                VStack(spacing: 1) {
                    Text("954").font(.system(size: 11, weight: .bold)).foregroundColor(.white)
                    Text("Trades").font(.system(size: 8)).foregroundColor(Color(hex: "94a3b8"))
                }
            }
            .frame(maxWidth: .infinity)
            
            VStack(spacing: 4) {
                HStack {
                    HStack(spacing: 4) {
                        Circle().fill(Color(hex: "3b82f6")).frame(width: 6, height: 6)
                        Text("NIFTY").font(.system(size: 10)).foregroundColor(Color(hex: "94a3b8"))
                    }
                    Spacer()
                    Text("50%").font(.system(size: 10, weight: .bold)).foregroundColor(.white)
                }
                HStack {
                    HStack(spacing: 4) {
                        Circle().fill(Color(hex: "10b981")).frame(width: 6, height: 6)
                        Text("BANKNIFTY").font(.system(size: 10)).foregroundColor(Color(hex: "94a3b8"))
                    }
                    Spacer()
                    Text("50%").font(.system(size: 10, weight: .bold)).foregroundColor(.white)
                }
            }
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 2: Win/Loss Analysis Card
    private var winLossAnalysisCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Win / Loss Analysis")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                Text("All")
                    .font(.system(size: 10))
                    .foregroundColor(Color(hex: "94a3b8"))
            }
            
            ZStack {
                Circle().stroke(Color(hex: "10b981"), lineWidth: 12).frame(width: 75, height: 75)
                VStack(spacing: 1) {
                    Text("44.8%").font(.system(size: 11, weight: .bold)).foregroundColor(.white)
                    Text("Win Rate").font(.system(size: 8)).foregroundColor(Color(hex: "94a3b8"))
                }
            }
            .frame(maxWidth: .infinity)
            
            HStack {
                HStack(spacing: 4) {
                    Circle().fill(Color(hex: "10b981")).frame(width: 6, height: 6)
                    Text("Wins: 427").font(.system(size: 10)).foregroundColor(Color(hex: "94a3b8"))
                }
                Spacer()
                HStack(spacing: 4) {
                    Circle().fill(Color(hex: "f43f5e")).frame(width: 6, height: 6)
                    Text("Losses: 526").font(.system(size: 10)).foregroundColor(Color(hex: "94a3b8"))
                }
            }
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 3: Risk Metrics Card
    private var riskMetricsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Risk Metrics")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            VStack(spacing: 8) {
                HStack {
                    metricBox("Max Drawdown", "₹4,00,628 (50.08%)", Color(hex: "f43f5e"))
                    metricBox("Avg Winning Trade", "₹2,859", Color(hex: "10b981"))
                    metricBox("Avg Losing Trade", "-₹3,057", Color(hex: "f43f5e"))
                }
                HStack {
                    metricBox("Largest Win", "₹44,216", Color(hex: "10b981"))
                    metricBox("Largest Loss", "-₹69,174", Color(hex: "f43f5e"))
                    metricBox("Risk Reward Ratio", "1 : 0.94", .white)
                }
            }
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    private func metricBox(_ title: String, _ val: String, _ color: Color) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.system(size: 10)).foregroundColor(Color(hex: "94a3b8"))
            Text(val).font(.system(size: 13, weight: .bold, design: .monospaced)).foregroundColor(color)
        }
        .padding(8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: "0e1524"))
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }
    
    // MARK: - Row 3: Trade Duration Analysis Card
    private var tradeDurationAnalysisCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Trade Duration Analysis")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                HStack(spacing: 4) {
                    Text("By Holding Time").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "f97316"))
                    Text("By Time of Day").font(.system(size: 9)).foregroundColor(Color(hex: "94a3b8"))
                }
            }
            
            VStack {
                Spacer()
                Text("No duration data available yet")
                    .font(.system(size: 11))
                    .foregroundColor(Color(hex: "64748b"))
                Spacer()
            }
            .frame(maxWidth: .infinity, minHeight: 90)
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 4: Detailed Statistics Card
    private var detailedStatisticsCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Detailed Statistics")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            VStack(spacing: 5) {
                dualStat("Total Trades", "954", "Expectancy (per trade)", "-₹406")
                dualStat("Profitable Trades", "61", "Average Trade Duration", "Intraday")
                dualStat("Losing Trades", "100", "Max Drawdown", "₹4,00,628")
                dualStat("Win Rate", "44.8%", "Sharpe Ratio", "0")
                dualStat("Total Net Profit", "-₹3,87,387", "Sortino Ratio", "0")
                dualStat("Gross Profit", "₹12,47,370", "Calmar Ratio", "0")
                dualStat("Gross Loss", "-₹15,62,487", "Max Consecutive Wins", "0")
                dualStat("Profit Factor", "0.8", "Max Consecutive Losses", "0")
            }
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    private func dualStat(_ l1: String, _ v1: String, _ l2: String, _ v2: String) -> some View {
        HStack {
            HStack {
                Text(l1).font(.system(size: 10)).foregroundColor(Color(hex: "94a3b8"))
                Spacer()
                Text(v1).font(.system(size: 10, weight: .bold, design: .monospaced)).foregroundColor(.white)
            }
            .frame(maxWidth: .infinity)
            
            Rectangle().fill(Color(hex: "1e293b")).frame(width: 1, height: 12).padding(.horizontal, 2)
            
            HStack {
                Text(l2).font(.system(size: 10)).foregroundColor(Color(hex: "94a3b8"))
                Spacer()
                Text(v2).font(.system(size: 10, weight: .bold, design: .monospaced)).foregroundColor(.white)
            }
            .frame(maxWidth: .infinity)
        }
    }
    
    // MARK: - Row 4: Monthly Summary Table Card
    private var monthlySummaryTableCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Monthly Summary Table")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                Text("Export")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(Color(hex: "3b82f6"))
            }
            
            HStack {
                Text("MONTH").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 45, alignment: .leading)
                Text("TRADES").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 50, alignment: .leading)
                Text("WIN RATE").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 55, alignment: .leading)
                Text("NET P&L").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 65, alignment: .leading)
                Text("PROFIT FACTOR").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 80, alignment: .leading)
                Spacer()
                Text("MAX DD").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 50, alignment: .trailing)
            }
            .padding(.vertical, 2)
            
            Divider().background(Color(hex: "1e293b"))
            
            ForEach(viewModel.monthlyRows.prefix(8)) { r in
                HStack {
                    Text(r.month).font(.system(size: 10, weight: .bold)).foregroundColor(.white).frame(width: 45, alignment: .leading)
                    Text("\(r.trades)").font(.system(size: 10, design: .monospaced)).foregroundColor(Color(hex: "94a3b8")).frame(width: 50, alignment: .leading)
                    Text("\(Int(r.winRate))%").font(.system(size: 10, design: .monospaced)).foregroundColor(Color(hex: "94a3b8")).frame(width: 55, alignment: .leading)
                    Text("₹\(Int(r.netPnl))").font(.system(size: 10, design: .monospaced)).foregroundColor(Color(hex: "f59e0b")).frame(width: 65, alignment: .leading)
                    Text("\(String(format: "%.1f", r.profitFactor))").font(.system(size: 10, design: .monospaced)).foregroundColor(Color(hex: "94a3b8")).frame(width: 80, alignment: .leading)
                    Spacer()
                    Text("₹\(Int(r.maxDd))").font(.system(size: 10, design: .monospaced)).foregroundColor(Color(hex: "f59e0b")).frame(width: 50, alignment: .trailing)
                }
                .padding(.vertical, 1)
            }
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 4: Reports & Export Card
    private var reportsExportCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Reports & Export")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            Text("Select Report Type")
                .font(.system(size: 10))
                .foregroundColor(Color(hex: "94a3b8"))
            
            VStack(alignment: .leading, spacing: 6) {
                checkItem("Performance Summary", $viewModel.checkSummary)
                checkItem("Trade History", $viewModel.checkHistory)
                checkItem("Strategy Analysis", $viewModel.checkStrategy)
                checkItem("Risk Analysis", $viewModel.checkRisk)
                checkItem("Monthly Report", $viewModel.checkMonthly)
                checkItem("Tax Report (P&L)", $viewModel.checkTax)
            }
            
            HStack(spacing: 8) {
                Button("Preview Report") {}
                    .buttonStyle(.plain)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color(hex: "0e1524"))
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                
                Button("Export (PDF / CSV)") {}
                    .buttonStyle(.plain)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color(hex: "3b82f6"))
                    .clipShape(RoundedRectangle(cornerRadius: 6))
            }
            .padding(.top, 4)
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    private func checkItem(_ title: String, _ val: Binding<Bool>) -> some View {
        HStack(spacing: 6) {
            Image(systemName: val.wrappedValue ? "checkmark.square.fill" : "square")
                .font(.system(size: 11))
                .foregroundColor(val.wrappedValue ? Color(hex: "3b82f6") : Color(hex: "64748b"))
                .onTapGesture { val.wrappedValue.toggle() }
            Text(title)
                .font(.system(size: 11))
                .foregroundColor(.white)
        }
    }
}
