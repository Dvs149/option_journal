import SwiftUI
import Charts

public struct EquityCurveView: View {
    @StateObject private var viewModel = EquityCurveViewModel()
    @ObservedObject private var preferences = PreferencesManager.shared
    @Environment(\.colorScheme) private var colorScheme
    
    public init() {}
    
    public var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(alignment: .leading, spacing: 20) {
                // MARK: - Header
                headerSection
                
                // MARK: - Top 8 Metric Cards
                kpiMetricsSection
                
                // MARK: - Row 1: Main Equity Curve + Capital Breakdown
                HStack(alignment: .top, spacing: 16) {
                    mainEquityCurveCard
                        .frame(minWidth: 500, maxWidth: .infinity)
                    
                    capitalBreakdownCard
                        .frame(width: 360)
                }
                .frame(maxWidth: .infinity)
                
                // MARK: - Row 2: Drawdown Underwater + Monthly Returns + Yearly Performance
                HStack(alignment: .top, spacing: 16) {
                    drawdownUnderwaterCard
                        .frame(minWidth: 300, maxWidth: .infinity)
                    
                    monthlyReturnsCard
                        .frame(minWidth: 300, maxWidth: .infinity)
                    
                    yearlyPerformanceCard
                        .frame(width: 320)
                }
                .frame(maxWidth: .infinity)
                
                // MARK: - Row 3: Capital Transactions + Capital Growth + Performance Metrics
                HStack(alignment: .top, spacing: 16) {
                    capitalTransactionsCard
                        .frame(minWidth: 320, maxWidth: .infinity)
                    
                    capitalGrowthCard
                        .frame(minWidth: 300, maxWidth: .infinity)
                    
                    performanceMetricsCard
                        .frame(width: 320)
                }
                .frame(maxWidth: .infinity)
                
                // MARK: - Row 4: Daily Equity Progress Table + Equity Curve Insights
                HStack(alignment: .top, spacing: 16) {
                    dailyEquityProgressCard
                        .frame(minWidth: 500, maxWidth: .infinity)
                    
                    equityCurveInsightsCard
                        .frame(width: 360)
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
                Text("Equity Curve")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundColor(.white)
                Text("Track your trading capital growth, drawdowns and overall performance")
                    .font(.system(size: 13))
                    .foregroundColor(Color(hex: "94a3b8"))
            }
            
            Spacer()
            
            HStack(spacing: 8) {
                // Date Range Label
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
                
                // Quick Timeframe Selector
                HStack(spacing: 2) {
                    ForEach(["1M", "3M", "6M", "YTD", "1Y", "All"], id: \.self) { r in
                        Button {
                            viewModel.setTimeframe(r)
                        } label: {
                            Text(r)
                                .font(.system(size: 11, weight: viewModel.selectedRange == r ? .bold : .medium))
                                .foregroundColor(viewModel.selectedRange == r ? .white : Color(hex: "94a3b8"))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 5)
                                .background(viewModel.selectedRange == r ? Color(hex: "3b82f6") : Color.clear)
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
    
    // MARK: - Top 8 Metric Cards
    private var kpiMetricsSection: some View {
        HStack(spacing: 10) {
            equityKpiCard(title: "Initial Capital", value: DashboardNumberFormatter.formatRupeeInteger(viewModel.initialCapital, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled), sub: "-", subColor: Color(hex: "64748b"))
            equityKpiCard(title: "Current Capital", value: DashboardNumberFormatter.formatRupeeInteger(viewModel.currentCapital, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled), sub: viewModel.currentCapitalPct, subColor: Color(hex: "f43f5e"))
            equityKpiCard(title: "Total Net Profit", value: DashboardNumberFormatter.formatRupeeInteger(viewModel.totalNetProfit, includeSign: true, isPrivacyMode: preferences.isPrivacyModeEnabled), sub: viewModel.totalNetProfitPct, subColor: Color(hex: "f43f5e"), valColor: Color(hex: "f43f5e"))
            equityKpiCard(title: "Total Deposits", value: DashboardNumberFormatter.formatRupeeInteger(viewModel.totalDeposits, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled), sub: "-", subColor: Color(hex: "64748b"))
            equityKpiCard(title: "Total Withdrawals", value: DashboardNumberFormatter.formatRupeeInteger(viewModel.totalWithdrawals, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled), sub: "-", subColor: Color(hex: "64748b"))
            equityKpiCard(title: "Highest Capital", value: DashboardNumberFormatter.formatRupeeInteger(viewModel.highestCapital, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled), sub: viewModel.highestCapitalDate, subColor: Color(hex: "64748b"))
            equityKpiCard(title: "Max Drawdown", value: DashboardNumberFormatter.formatRupeeInteger(viewModel.maxDrawdown, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled), sub: "(\(viewModel.maxDrawdownPct))", subColor: Color(hex: "f43f5e"), valColor: Color(hex: "f43f5e"))
            equityKpiCard(title: "ROI", value: viewModel.roi, sub: "All time return", subColor: Color(hex: "f43f5e"), valColor: Color(hex: "f43f5e"))
        }
    }
    
    private func equityKpiCard(title: String, value: String, sub: String, subColor: Color, valColor: Color = .white) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(Color(hex: "94a3b8"))
            Text(value)
                .font(.system(size: 16, weight: .bold, design: .monospaced))
                .foregroundColor(valColor)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            Text(sub)
                .font(.system(size: 10, weight: .semibold))
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
    
    // MARK: - Row 1: Main Equity Curve Card
    private var mainEquityCurveCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                HStack(spacing: 8) {
                    Text("Equity Curve")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                    
                    Text("Peak Balance: ₹5,00,000")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(Color(hex: "06b6d4"))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(hex: "06b6d4").opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }
                
                Spacer()
                
                HStack(spacing: 4) {
                    chartTabButton("Equity Curve", tab: "equity")
                    chartTabButton("Drawdown Analysis", tab: "drawdown")
                    chartTabButton("Capital Growth", tab: "growth")
                }
            }
            
            // Chart Area
            Chart {
                ForEach(viewModel.points) { pt in
                    AreaMark(
                        x: .value("Date", pt.date),
                        y: .value("Capital", pt.balance ?? 500000)
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color(hex: "3b82f6").opacity(0.5), Color(hex: "3b82f6").opacity(0.02)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    
                    LineMark(
                        x: .value("Date", pt.date),
                        y: .value("Capital", pt.balance ?? 500000)
                    )
                    .foregroundStyle(Color(hex: "3b82f6"))
                    .lineStyle(StrokeStyle(lineWidth: 2))
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { val in
                    AxisGridLine().foregroundStyle(Color(hex: "1e293b"))
                    AxisValueLabel {
                        if let d = val.as(Double.self) {
                            Text("₹\(String(format: "%.1f", d / 100000))L")
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
                                .font(.system(size: 9))
                                .foregroundColor(Color(hex: "94a3b8"))
                        }
                    }
                }
            }
            .frame(height: 220)
        }
        .padding(16)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    private func chartTabButton(_ title: String, tab: String) -> some View {
        Button {
            viewModel.equityTab = tab
        } label: {
            Text(title)
                .font(.system(size: 11, weight: viewModel.equityTab == tab ? .bold : .medium))
                .foregroundColor(viewModel.equityTab == tab ? .white : Color(hex: "94a3b8"))
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(viewModel.equityTab == tab ? Color(hex: "1e293b") : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: 6))
        }
        .buttonStyle(.plain)
    }
    
    // MARK: - Row 1: Capital Breakdown Card
    private var capitalBreakdownCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Capital Breakdown")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.white)
            
            // Donut Chart Representation
            ZStack {
                Circle()
                    .stroke(Color(hex: "06b6d4"), lineWidth: 18)
                    .frame(width: 130, height: 130)
                
                VStack(spacing: 2) {
                    Text("TOTAL")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(Color(hex: "64748b"))
                    Text(DashboardNumberFormatter.formatRupeeInteger(viewModel.currentCapital, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled))
                        .font(.system(size: 13, weight: .bold, design: .monospaced))
                        .foregroundColor(.white)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 4)
            
            // Legend Rows
            VStack(spacing: 6) {
                breakdownLegendRow(title: "Initial Capital", pct: "71.4%", amount: "₹5,00,000", color: Color(hex: "06b6d4"))
                breakdownLegendRow(title: "Net Profit", pct: "0.0%", amount: "₹0", color: Color(hex: "10b981"))
                breakdownLegendRow(title: "Deposits", pct: "28.6%", amount: "₹2,00,000", color: Color(hex: "3b82f6"))
                breakdownLegendRow(title: "Withdrawals", pct: "0.0%", amount: "₹0", color: Color(hex: "f43f5e"))
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
    
    private func breakdownLegendRow(title: String, pct: String, amount: String, color: Color) -> some View {
        HStack {
            HStack(spacing: 6) {
                Circle().fill(color).frame(width: 8, height: 8)
                Text(title).font(.system(size: 11)).foregroundColor(Color(hex: "94a3b8"))
            }
            Spacer()
            Text(pct).font(.system(size: 10, weight: .bold)).foregroundColor(.white)
            Text(amount).font(.system(size: 11, design: .monospaced)).foregroundColor(Color(hex: "94a3b8")).frame(width: 75, alignment: .trailing)
        }
    }
    
    // MARK: - Row 2: Drawdown Underwater Card
    private var drawdownUnderwaterCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Drawdown Analysis")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            Chart {
                ForEach(viewModel.points) { pt in
                    AreaMark(
                        x: .value("Date", pt.date),
                        y: .value("Drawdown", -(pt.drawdown ?? 0))
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color(hex: "f43f5e").opacity(0.05), Color(hex: "f43f5e").opacity(0.4)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    
                    LineMark(
                        x: .value("Date", pt.date),
                        y: .value("Drawdown", -(pt.drawdown ?? 0))
                    )
                    .foregroundStyle(Color(hex: "f43f5e"))
                    .lineStyle(StrokeStyle(lineWidth: 1.5))
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { val in
                    AxisGridLine().foregroundStyle(Color(hex: "1e293b"))
                    AxisValueLabel {
                        if let d = val.as(Double.self) {
                            Text("-₹\(Int(abs(d) / 1000))K").font(.system(size: 8)).foregroundColor(Color(hex: "64748b"))
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
            .frame(height: 120)
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 2: Monthly Returns Card
    private var monthlyReturnsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Monthly Returns")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            Chart {
                BarMark(x: .value("Month", "Jun"), y: .value("Net", -145000)).foregroundStyle(Color(hex: "f43f5e"))
                BarMark(x: .value("Month", "Jul"), y: .value("Net", -198000)).foregroundStyle(Color(hex: "f43f5e"))
                BarMark(x: .value("Month", "Aug"), y: .value("Net", 12000)).foregroundStyle(Color(hex: "10b981"))
                BarMark(x: .value("Month", "Sep"), y: .value("Net", 14000)).foregroundStyle(Color(hex: "10b981"))
                BarMark(x: .value("Month", "Oct"), y: .value("Net", -45000)).foregroundStyle(Color(hex: "f43f5e"))
                BarMark(x: .value("Month", "Nov"), y: .value("Net", 11494)).foregroundStyle(Color(hex: "10b981"))
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
            .frame(height: 120)
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 2: Yearly Performance Card
    private var yearlyPerformanceCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Yearly Performance")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            VStack(spacing: 6) {
                HStack {
                    Text("YEAR").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 45, alignment: .leading)
                    Text("OPENING").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 65, alignment: .leading)
                    Text("NET P&L").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 75, alignment: .leading)
                    Spacer()
                    Text("ROI%").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 50, alignment: .trailing)
                }
                .padding(.vertical, 4)
                
                Divider().background(Color(hex: "1e293b"))
                
                ForEach(viewModel.yearlyData) { y in
                    HStack {
                        Text(y.year).font(.system(size: 11, weight: .bold)).foregroundColor(.white).frame(width: 45, alignment: .leading)
                        Text("₹\(Int(y.opening))").font(.system(size: 11, design: .monospaced)).foregroundColor(Color(hex: "94a3b8")).frame(width: 65, alignment: .leading)
                        Text("-₹\(Int(abs(y.pnl)))").font(.system(size: 11, weight: .bold, design: .monospaced)).foregroundColor(Color(hex: "f43f5e")).frame(width: 75, alignment: .leading)
                        Spacer()
                        Text("\(String(format: "%.1f", y.roi))%").font(.system(size: 11, weight: .bold)).foregroundColor(Color(hex: "f43f5e")).frame(width: 50, alignment: .trailing)
                    }
                    .padding(.vertical, 2)
                }
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
    
    // MARK: - Row 3: Capital Transactions Card
    private var capitalTransactionsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Capital Transactions")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                HStack(spacing: 4) {
                    ForEach(["all", "deposits", "withdrawals"], id: \.self) { t in
                        Button {
                            viewModel.txTab = t
                        } label: {
                            Text(t.capitalized)
                                .font(.system(size: 10, weight: viewModel.txTab == t ? .bold : .medium))
                                .foregroundColor(viewModel.txTab == t ? .white : Color(hex: "94a3b8"))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 3)
                                .background(viewModel.txTab == t ? Color(hex: "1e293b") : Color.clear)
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            
            VStack(spacing: 6) {
                ForEach(viewModel.transactions) { tx in
                    HStack {
                        VStack(alignment: .leading, spacing: 1) {
                            Text(tx.date).font(.system(size: 11, design: .monospaced)).foregroundColor(.white)
                            Text(tx.notes).font(.system(size: 9)).foregroundColor(Color(hex: "64748b"))
                        }
                        Spacer()
                        Text(tx.type)
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(Color(hex: "10b981"))
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(Color(hex: "10b981").opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                        Text("+₹\(Int(tx.amount))")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(.white)
                            .frame(width: 80, alignment: .trailing)
                    }
                    .padding(.vertical, 4)
                    Divider().background(Color(hex: "1e293b").opacity(0.5))
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
    
    // MARK: - Row 3: Capital Growth Card
    private var capitalGrowthCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Capital Growth")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            Chart {
                AreaMark(x: .value("Month", "Jun"), y: .value("Val", -1.45))
                AreaMark(x: .value("Month", "Jul"), y: .value("Val", -1.98))
                AreaMark(x: .value("Month", "Aug"), y: .value("Val", 0.12))
                AreaMark(x: .value("Month", "Sep"), y: .value("Val", 0.14))
                AreaMark(x: .value("Month", "Oct"), y: .value("Val", -0.45))
                AreaMark(x: .value("Month", "Nov"), y: .value("Val", 0.11))
            }
            .foregroundStyle(
                LinearGradient(
                    colors: [Color(hex: "06b6d4").opacity(0.5), Color(hex: "06b6d4").opacity(0.02)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .chartYAxis {
                AxisMarks(position: .leading) { val in
                    AxisGridLine().foregroundStyle(Color(hex: "1e293b"))
                    AxisValueLabel {
                        if let d = val.as(Double.self) {
                            Text("\(String(format: "%.1f", d))L").font(.system(size: 8)).foregroundColor(Color(hex: "64748b"))
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
            .frame(height: 105)
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 3: Performance Metrics Card
    private var performanceMetricsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Performance Metrics")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            VStack(spacing: 6) {
                metricRow("Profit Factor", "0.80")
                metricRow("Sharpe Ratio", "-0.45")
                metricRow("Win / Loss Ratio", "0.61")
                metricRow("Avg Daily Profit", "₹2,708")
                metricRow("Avg Daily Loss", "₹5,525")
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
    
    private func metricRow(_ title: String, _ val: String) -> some View {
        HStack {
            Text(title).font(.system(size: 11)).foregroundColor(Color(hex: "94a3b8"))
            Spacer()
            Text(val).font(.system(size: 11, weight: .bold, design: .monospaced)).foregroundColor(.white)
        }
    }
    
    // MARK: - Row 4: Daily Equity Progress Card
    private var dailyEquityProgressCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Daily Equity Progress")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.white)
            
            HStack {
                Text("DATE").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 90, alignment: .leading)
                Text("OPENING").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 85, alignment: .leading)
                Text("DAILY P&L").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 85, alignment: .leading)
                Text("CLOSING").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 85, alignment: .leading)
                Spacer()
                Text("DRAWDOWN").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 85, alignment: .trailing)
            }
            .padding(.vertical, 4)
            
            Divider().background(Color(hex: "1e293b"))
            
            ForEach(viewModel.dailyRows) { row in
                HStack {
                    Text(row.date).font(.system(size: 11, design: .monospaced)).foregroundColor(.white).frame(width: 90, alignment: .leading)
                    Text("₹\(Int(row.opening))").font(.system(size: 11, design: .monospaced)).foregroundColor(Color(hex: "94a3b8")).frame(width: 85, alignment: .leading)
                    Text(row.pnl >= 0 ? "+₹\(Int(row.pnl))" : "-₹\(Int(abs(row.pnl)))")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(row.pnl >= 0 ? Color(hex: "10b981") : Color(hex: "f43f5e"))
                        .frame(width: 85, alignment: .leading)
                    Text("₹\(Int(row.closing))").font(.system(size: 11, weight: .medium, design: .monospaced)).foregroundColor(.white).frame(width: 85, alignment: .leading)
                    Spacer()
                    Text("₹\(Int(row.drawdown))").font(.system(size: 11, design: .monospaced)).foregroundColor(Color(hex: "f43f5e")).frame(width: 85, alignment: .trailing)
                }
                .padding(.vertical, 3)
                
                Divider().background(Color(hex: "1e293b").opacity(0.4))
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
    
    // MARK: - Row 4: Equity Curve Insights Card
    private var equityCurveInsightsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Equity Curve Insights")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.white)
            
            VStack(alignment: .leading, spacing: 10) {
                insightItem("Consistent Losses during Jul & Jun", "Large drawdowns occurred primarily on expiry days with oversizing.", "exclamationmark.triangle.fill", Color(hex: "f59e0b"))
                insightItem("Positive Recovery in November", "November is showing early signs of discipline with ₹11.5K net profit.", "checkmark.circle.fill", Color(hex: "10b981"))
                insightItem("Risk-to-Reward Adjustment", "Reduce average daily loss from ₹5,525 to below ₹3,000 to flip profit factor > 1.0.", "shield.fill", Color(hex: "3b82f6"))
            }
            Spacer()
        }
        .padding(16)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    private func insightItem(_ title: String, _ desc: String, _ icon: String, _ color: Color) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(color)
                .frame(width: 18)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.white)
                Text(desc)
                    .font(.system(size: 10))
                    .foregroundColor(Color(hex: "94a3b8"))
            }
        }
    }
}
