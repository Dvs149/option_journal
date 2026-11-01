import SwiftUI
import Charts

public struct RiskManagementView: View {
    @StateObject private var viewModel = RiskViewModel()
    @ObservedObject private var preferences = PreferencesManager.shared
    @Environment(\.colorScheme) private var colorScheme
    
    // Sheet edit states
    @State private var editDailyLoss: String = "25000"
    @State private var editDailyTarget: String = "20000"
    @State private var editMonthlyLoss: String = "100000"
    @State private var editMonthlyTarget: String = "150000"
    
    public init() {}
    
    public var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(alignment: .leading, spacing: 20) {
                // MARK: - Header
                headerSection
                
                // MARK: - Top 5 Limit Progress Cards
                topLimitCardsSection
                
                // MARK: - Row 1: Daily P&L vs Limits + Drawdown Curve
                HStack(alignment: .top, spacing: 16) {
                    dailyPnlVsLimitsCard
                        .frame(minWidth: 450, maxWidth: .infinity)
                    
                    drawdownCurveCard
                        .frame(minWidth: 350, maxWidth: .infinity)
                }
                .frame(maxWidth: .infinity)
                
                // MARK: - Row 2: 6 Metrics Strip
                metricsStripSection
                
                // MARK: - Row 3: Risk Alerts + Risk vs Reward + Risk Metrics
                HStack(alignment: .top, spacing: 16) {
                    riskAlertsCard
                        .frame(minWidth: 300, maxWidth: .infinity)
                    
                    riskVsRewardCard
                        .frame(minWidth: 320, maxWidth: .infinity)
                    
                    riskMetricsCard
                        .frame(width: 340)
                }
                .frame(maxWidth: .infinity)
                
                // MARK: - Row 4: Daily Risk Summary + Monthly Risk Overview
                HStack(alignment: .top, spacing: 16) {
                    dailyRiskSummaryCard
                        .frame(minWidth: 480, maxWidth: .infinity)
                    
                    monthlyRiskOverviewCard
                        .frame(width: 380)
                }
                .frame(maxWidth: .infinity)
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .background(Color(hex: "0b111e"))
        .sheet(isPresented: $viewModel.showLimitsSheet) {
            configureLimitsSheet
        }
        .task {
            await viewModel.loadData()
            editDailyLoss = "\(Int(viewModel.dailyMaxLoss))"
            editDailyTarget = "\(Int(viewModel.dailyProfitTarget))"
            editMonthlyLoss = "\(Int(viewModel.monthlyMaxLoss))"
            editMonthlyTarget = "\(Int(viewModel.monthlyProfitTarget))"
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Risk Management")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundColor(.white)
                Text("Monitor and control your trading risk, drawdown limits, and rules")
                    .font(.system(size: 13))
                    .foregroundColor(Color(hex: "94a3b8"))
            }
            
            Spacer()
            
            Button {
                viewModel.showLimitsSheet = true
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 12))
                    Text("Configure Limits")
                        .font(.system(size: 12, weight: .semibold))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 14)
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
    
    // MARK: - Top 5 Limit Cards
    private var topLimitCardsSection: some View {
        HStack(spacing: 12) {
            limitGaugeCard(
                title: "Daily Loss Limit",
                target: DashboardNumberFormatter.formatRupeeInteger(viewModel.dailyMaxLoss, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled),
                current: "Used: ₹0",
                pct: 0.0,
                color: Color(hex: "f43f5e"),
                icon: "shield.slash.fill"
            )
            
            limitGaugeCard(
                title: "Daily Profit Target",
                target: DashboardNumberFormatter.formatRupeeInteger(viewModel.dailyProfitTarget, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled),
                current: "Current: ₹0",
                pct: 0.0,
                color: Color(hex: "10b981"),
                icon: "target"
            )
            
            limitGaugeCard(
                title: "Monthly Loss Limit",
                target: DashboardNumberFormatter.formatRupeeInteger(viewModel.monthlyMaxLoss, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled),
                current: "Used: ₹0",
                pct: 0.0,
                color: Color(hex: "f43f5e"),
                icon: "shield.lefthalf.filled"
            )
            
            limitGaugeCard(
                title: "Monthly Profit Target",
                target: DashboardNumberFormatter.formatRupeeInteger(viewModel.monthlyProfitTarget, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled),
                current: "Current: +₹11,494",
                pct: 0.077,
                color: Color(hex: "10b981"),
                icon: "trophy.fill"
            )
            
            limitGaugeCard(
                title: "Account Capital",
                target: DashboardNumberFormatter.formatRupeeInteger(viewModel.accountCapital, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled),
                current: "Available: 100%",
                pct: 1.0,
                color: Color(hex: "3b82f6"),
                icon: "creditcard.fill"
            )
        }
    }
    
    private func limitGaugeCard(title: String, target: String, current: String, pct: Double, color: Color, icon: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: icon)
                        .font(.system(size: 11))
                        .foregroundColor(color)
                    Text(title)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(Color(hex: "94a3b8"))
                }
                Spacer()
                Text(target)
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundColor(.white)
            }
            
            // Progress Bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color(hex: "1e293b"))
                        .frame(height: 6)
                    
                    RoundedRectangle(cornerRadius: 3)
                        .fill(color)
                        .frame(width: max(geo.size.width * CGFloat(min(pct, 1.0)), 4), height: 6)
                }
            }
            .frame(height: 6)
            
            HStack {
                Text(current)
                    .font(.system(size: 10))
                    .foregroundColor(Color(hex: "64748b"))
                Spacer()
                Text("\(Int(pct * 100))%")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(color)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 1: Daily P&L vs Limits Card
    private var dailyPnlVsLimitsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Daily P&L vs Risk Limits")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                
                Spacer()
                
                HStack(spacing: 12) {
                    HStack(spacing: 4) {
                        Rectangle().fill(Color(hex: "10b981")).frame(width: 10, height: 2)
                        Text("+₹20K Target").font(.system(size: 10)).foregroundColor(Color(hex: "94a3b8"))
                    }
                    HStack(spacing: 4) {
                        Rectangle().fill(Color(hex: "f43f5e")).frame(width: 10, height: 2)
                        Text("-₹25K Limit").font(.system(size: 10)).foregroundColor(Color(hex: "94a3b8"))
                    }
                }
            }
            
            Chart {
                RuleMark(y: .value("Target", 20000))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [4]))
                    .foregroundStyle(Color(hex: "10b981"))
                
                RuleMark(y: .value("Limit", -25000))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [4]))
                    .foregroundStyle(Color(hex: "f43f5e"))
                
                BarMark(x: .value("Date", "25 Apr"), y: .value("P&L", -25450)).foregroundStyle(Color(hex: "f43f5e"))
                BarMark(x: .value("Date", "16 Jun"), y: .value("P&L", -44216)).foregroundStyle(Color(hex: "f43f5e"))
                BarMark(x: .value("Date", "23 Jul"), y: .value("P&L", -69174)).foregroundStyle(Color(hex: "f43f5e"))
                BarMark(x: .value("Date", "28 Oct"), y: .value("P&L", -28153)).foregroundStyle(Color(hex: "f43f5e"))
                BarMark(x: .value("Date", "03 Nov"), y: .value("P&L", 11494)).foregroundStyle(Color(hex: "10b981"))
            }
            .chartYAxis {
                AxisMarks(position: .leading) { val in
                    AxisGridLine().foregroundStyle(Color(hex: "1e293b"))
                    AxisValueLabel {
                        if let d = val.as(Double.self) {
                            Text("\(Int(d / 1000))K").font(.system(size: 9)).foregroundColor(Color(hex: "64748b"))
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
            .frame(height: 200)
        }
        .padding(16)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 1: Drawdown Curve Card
    private var drawdownCurveCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Drawdown Curve")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                Text("Max: ₹4,00,628")
                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                    .foregroundColor(Color(hex: "f43f5e"))
            }
            
            Chart {
                AreaMark(x: .value("Date", "Jan"), y: .value("DD", 0))
                AreaMark(x: .value("Date", "Apr"), y: .value("DD", -57000))
                AreaMark(x: .value("Date", "Jun"), y: .value("DD", -101000))
                AreaMark(x: .value("Date", "Jul"), y: .value("DD", -170000))
                AreaMark(x: .value("Date", "Oct"), y: .value("DD", -400628))
                AreaMark(x: .value("Date", "Nov"), y: .value("DD", -387387))
            }
            .foregroundStyle(
                LinearGradient(
                    colors: [Color(hex: "f43f5e").opacity(0.05), Color(hex: "f43f5e").opacity(0.4)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .chartYAxis {
                AxisMarks(position: .leading) { val in
                    AxisGridLine().foregroundStyle(Color(hex: "1e293b"))
                    AxisValueLabel {
                        if let d = val.as(Double.self) {
                            Text("-₹\(Int(abs(d) / 1000))K").font(.system(size: 9)).foregroundColor(Color(hex: "64748b"))
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
            .frame(height: 200)
        }
        .padding(16)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 2: 6 Metrics Strip
    private var metricsStripSection: some View {
        HStack(spacing: 12) {
            stripCard(title: "Maximum Drawdown", value: "₹4,00,628", sub: "(80.1%)", color: Color(hex: "f43f5e"))
            stripCard(title: "Current Drawdown", value: "₹3,87,387", sub: "(77.5%)", color: Color(hex: "f43f5e"))
            stripCard(title: "Consecutive Loss Days", value: "0", sub: "Max: 5", color: Color(hex: "94a3b8"))
            stripCard(title: "Consecutive Win Days", value: "1", sub: "Max: 4", color: Color(hex: "10b981"))
            stripCard(title: "Largest Single-Day Loss", value: "-₹69,174", sub: "23 Jul 2026", color: Color(hex: "f43f5e"))
            stripCard(title: "Largest Single-Day Profit", value: "+₹44,216", sub: "11 Aug 2026", color: Color(hex: "10b981"))
        }
    }
    
    private func stripCard(title: String, value: String, sub: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(Color(hex: "94a3b8"))
            Text(value)
                .font(.system(size: 16, weight: .bold, design: .monospaced))
                .foregroundColor(color)
            Text(sub)
                .font(.system(size: 10))
                .foregroundColor(Color(hex: "64748b"))
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 3: Risk Alerts Card
    private var riskAlertsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Risk Limit Alerts")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 16))
                        .foregroundColor(Color(hex: "10b981"))
                    VStack(alignment: .leading, spacing: 2) {
                        Text("All Risk Limits Safe")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.white)
                        Text("No daily or monthly thresholds breached today.")
                            .font(.system(size: 10))
                            .foregroundColor(Color(hex: "94a3b8"))
                    }
                }
                .padding(10)
                .background(Color(hex: "0e1524"))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "f59e0b"))
                    Text("Overall Drawdown remains high at 80.1%")
                        .font(.system(size: 10))
                        .foregroundColor(Color(hex: "94a3b8"))
                }
                .padding(8)
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
    
    // MARK: - Row 3: Risk vs Reward Card
    private var riskVsRewardCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Risk vs Reward Analysis")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            Chart {
                PointMark(x: .value("Risk", 2500), y: .value("Reward", 8000)).foregroundStyle(Color(hex: "10b981"))
                PointMark(x: .value("Risk", 5000), y: .value("Reward", 12500)).foregroundStyle(Color(hex: "10b981"))
                PointMark(x: .value("Risk", 7500), y: .value("Reward", 23610)).foregroundStyle(Color(hex: "10b981"))
                PointMark(x: .value("Risk", 12000), y: .value("Reward", -13724)).foregroundStyle(Color(hex: "f43f5e"))
                PointMark(x: .value("Risk", 15000), y: .value("Reward", -28153)).foregroundStyle(Color(hex: "f43f5e"))
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
                        if let d = val.as(Double.self) {
                            Text("\(Int(d / 1000))K").font(.system(size: 8)).foregroundColor(Color(hex: "94a3b8"))
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
    
    // MARK: - Row 3: Risk Metrics Card
    private var riskMetricsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Risk Metrics")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            VStack(spacing: 6) {
                metricRow("Average R:R", "1 : 0.85")
                metricRow("VaR (95% Daily)", "₹14,250")
                metricRow("Discipline Score", "92%")
                metricRow("Loss Limit Breaches", "4 days")
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
    
    private func metricRow(_ title: String, _ val: String) -> some View {
        HStack {
            Text(title).font(.system(size: 11)).foregroundColor(Color(hex: "94a3b8"))
            Spacer()
            Text(val).font(.system(size: 11, weight: .bold, design: .monospaced)).foregroundColor(.white)
        }
    }
    
    // MARK: - Row 4: Daily Risk Summary Card
    private var dailyRiskSummaryCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Daily Risk Summary")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.white)
            
            HStack {
                Text("DATE").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 90, alignment: .leading)
                Text("TRADES").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 65, alignment: .leading)
                Text("DAILY P&L").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 85, alignment: .leading)
                Text("LIMIT USED").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 85, alignment: .leading)
                Spacer()
                Text("STATUS").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 75, alignment: .trailing)
            }
            .padding(.vertical, 4)
            
            Divider().background(Color(hex: "1e293b"))
            
            ForEach(viewModel.dailyRiskRows) { row in
                HStack {
                    Text(row.date).font(.system(size: 11, design: .monospaced)).foregroundColor(.white).frame(width: 90, alignment: .leading)
                    Text("\(row.trades)").font(.system(size: 11, design: .monospaced)).foregroundColor(Color(hex: "94a3b8")).frame(width: 65, alignment: .leading)
                    Text(row.pnl >= 0 ? "+₹\(Int(row.pnl))" : "-₹\(Int(abs(row.pnl)))")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(row.pnl >= 0 ? Color(hex: "10b981") : Color(hex: "f43f5e"))
                        .frame(width: 85, alignment: .leading)
                    Text("\(String(format: "%.1f", row.usedLimitPct))%").font(.system(size: 11, design: .monospaced)).foregroundColor(row.usedLimitPct > 100 ? Color(hex: "f43f5e") : Color(hex: "94a3b8")).frame(width: 85, alignment: .leading)
                    Spacer()
                    Text(row.status)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(row.status == "Safe" ? Color(hex: "10b981") : Color(hex: "f43f5e"))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(row.status == "Safe" ? Color(hex: "10b981").opacity(0.15) : Color(hex: "f43f5e").opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                        .frame(width: 75, alignment: .trailing)
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
    
    // MARK: - Row 4: Monthly Risk Overview Card
    private var monthlyRiskOverviewCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Monthly Risk Overview")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.white)
            
            VStack(alignment: .leading, spacing: 10) {
                checkItem("Daily Loss Capped at ₹25,000", true)
                checkItem("Overtrading Protection (Max 15 trades/day)", true)
                checkItem("Stoploss Execution Compliance > 90%", true)
                checkItem("No Revenge Trading after 2 consecutive losses", true)
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
    
    private func checkItem(_ title: String, _ passed: Bool) -> some View {
        HStack(spacing: 8) {
            Image(systemName: passed ? "checkmark.circle.fill" : "xmark.circle.fill")
                .font(.system(size: 13))
                .foregroundColor(passed ? Color(hex: "10b981") : Color(hex: "f43f5e"))
            Text(title)
                .font(.system(size: 11))
                .foregroundColor(.white)
        }
    }
    
    // MARK: - Configure Limits Modal Sheet
    private var configureLimitsSheet: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Configure Risk Limits")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                Button {
                    viewModel.showLimitsSheet = false
                } label: {
                    Image(systemName: "xmark")
                        .foregroundColor(Color(hex: "94a3b8"))
                }
                .buttonStyle(.plain)
            }
            
            Divider().background(Color(hex: "1e293b"))
            
            VStack(alignment: .leading, spacing: 12) {
                limitInputRow(title: "Daily Max Loss (₹)", text: $editDailyLoss)
                limitInputRow(title: "Daily Profit Target (₹)", text: $editDailyTarget)
                limitInputRow(title: "Monthly Max Loss (₹)", text: $editMonthlyLoss)
                limitInputRow(title: "Monthly Profit Target (₹)", text: $editMonthlyTarget)
            }
            
            Spacer()
            
            HStack {
                Button("Cancel") {
                    viewModel.showLimitsSheet = false
                }
                .buttonStyle(.plain)
                .foregroundColor(Color(hex: "94a3b8"))
                
                Spacer()
                
                Button {
                    if let dl = Double(editDailyLoss), let dt = Double(editDailyTarget),
                       let ml = Double(editMonthlyLoss), let mt = Double(editMonthlyTarget) {
                        Task {
                            await viewModel.saveLimits(dailyLoss: dl, dailyTarget: dt, monthlyLoss: ml, monthlyTarget: mt)
                        }
                    }
                } label: {
                    Text("Save Risk Limits")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color(hex: "3b82f6"))
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(20)
        .frame(width: 420, height: 350)
        .background(Color(hex: "121b2d"))
    }
    
    private func limitInputRow(title: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(Color(hex: "94a3b8"))
            TextField("", text: text)
                .textFieldStyle(.plain)
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(.white)
                .padding(8)
                .background(Color(hex: "0e1524"))
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(Color(hex: "1e293b"), lineWidth: 1)
                )
        }
    }
}
