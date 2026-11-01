import SwiftUI
import Charts

// MARK: - Dashboard Color Palette & Theming
public enum DashboardPalette {
    public static let canvasDark = Color(red: 0.047, green: 0.063, blue: 0.090)       // #0C1017
    public static let cardSurfaceDark = Color(red: 0.075, green: 0.094, blue: 0.133)  // #131822
    public static let borderDark = Color(red: 0.118, green: 0.149, blue: 0.220)       // #1E2638
    public static let badgeBackgroundDark = Color(red: 0.094, green: 0.125, blue: 0.188) // #182030
    
    public static let profitGreen = Color(red: 0.063, green: 0.725, blue: 0.506)     // #10B981
    public static let lossRed = Color(red: 1.000, green: 0.392, blue: 0.282)         // #FF6448
    public static let accentBlue = Color(red: 0.231, green: 0.510, blue: 0.965)      // #3B82F6
    public static let warmAmber = Color(red: 1.000, green: 0.541, blue: 0.396)       // #FF8A65
    public static let purple = Color(red: 0.545, green: 0.361, blue: 0.965)          // #8B5CF6
    public static let cyan = Color(red: 0.024, green: 0.714, blue: 0.831)            // #06B6D4
    public static let yellow = Color(red: 0.918, green: 0.702, blue: 0.031)          // #EAB308
    
    public static let textPrimaryDark = Color(red: 0.96, green: 0.97, blue: 0.98)
    public static let textSecondaryDark = Color(red: 0.58, green: 0.64, blue: 0.72)
    public static let textMutedDark = Color(red: 0.42, green: 0.48, blue: 0.58)
    
    public static func cardBackground(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? cardSurfaceDark : Color.white
    }
    
    public static func border(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? borderDark : Color(red: 0.88, green: 0.90, blue: 0.93)
    }
    
    public static func canvas(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? canvasDark : Color(red: 0.96, green: 0.97, blue: 0.98)
    }
}

// MARK: - Dashboard Card View Modifier
public struct DashboardCardModifier: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme
    public var cornerRadius: CGFloat = 8
    
    public func body(content: Content) -> some View {
        content
            .background(DashboardPalette.cardBackground(for: colorScheme))
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(DashboardPalette.border(for: colorScheme), lineWidth: 1)
            )
    }
}

public extension View {
    func dashboardCard(cornerRadius: CGFloat = 8) -> some View {
        self.modifier(DashboardCardModifier(cornerRadius: cornerRadius))
    }
}

// MARK: - Indian Currency & Number Formatting Helpers
public enum DashboardNumberFormatter {
    public static func formatRupeeInteger(_ amount: Double, includeSign: Bool = false, isPrivacyMode: Bool = false) -> String {
        if isPrivacyMode {
            return "••••••"
        }
        let rounded = round(amount)
        let absVal = abs(rounded)
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "₹"
        formatter.maximumFractionDigits = 0
        formatter.minimumFractionDigits = 0
        formatter.locale = Locale(identifier: "en_IN")
        
        let formatted = formatter.string(from: NSNumber(value: absVal)) ?? "₹\(Int(absVal))"
        if rounded > 0 {
            return includeSign ? "+\(formatted)" : formatted
        } else if rounded < 0 {
            return "-\(formatted)"
        }
        return formatted
    }
    
    public static func formatAbbreviatedRupee(_ amount: Double) -> String {
        let absVal = abs(amount)
        let sign = amount < 0 ? "-" : (amount > 0 ? "" : "")
        if absVal >= 10_000_000 {
            return "\(sign)₹\(String(format: "%.1f", absVal / 10_000_000))Cr"
        } else if absVal >= 100_000 {
            let val = absVal / 100_000
            let str = val.truncatingRemainder(dividingBy: 1) == 0 ? String(format: "%.0f", val) : String(format: "%.1f", val)
            return "\(sign)₹\(str)L"
        } else if absVal >= 1_000 {
            let val = absVal / 1_000
            let str = val.truncatingRemainder(dividingBy: 1) == 0 ? String(format: "%.0f", val) : String(format: "%.1f", val)
            return "\(sign)₹\(str)K"
        } else {
            return "\(sign)₹\(Int(absVal))"
        }
    }
    
    public static func formatCompactCalendarRupee(_ amount: Double) -> String {
        let absVal = abs(amount)
        let sign = amount < 0 ? "-" : "+"
        if absVal >= 100_000 {
            return "\(sign)₹\(String(format: "%.1f", absVal / 100_000))L"
        } else if absVal >= 1_000 {
            return "\(sign)₹\(String(format: "%.1f", absVal / 1_000))K"
        } else {
            return "\(sign)₹\(Int(absVal))"
        }
    }
    
    public static func parseDateDisplay(_ dateStr: String) -> String {
        let parts = dateStr.split(separator: "-")
        if parts.count == 3, let monthNum = Int(parts[1]) {
            let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
            let m = (monthNum >= 1 && monthNum <= 12) ? months[monthNum - 1] : String(parts[1])
            return "\(parts[2]) \(m)"
        }
        return dateStr
    }
}

// MARK: - Main Dashboard View
public struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @EnvironmentObject private var appState: AppState
    @ObservedObject private var preferences = PreferencesManager.shared
    @Environment(\.colorScheme) private var colorScheme
    
    public init() {}
    
    public var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(alignment: .leading, spacing: 18) {
                // MARK: - Row 1: Primary 6 KPI Cards
                row1PrimaryKPIs
                
                // MARK: - Row 2: Secondary 8 Metrics Strip
                row2SecondaryMetricsStrip
                
                // MARK: - Row 3: Daily P&L, Cumulative P&L, Trading Calendar
                row3VisualCharts
                
                // MARK: - Row 4: Monthly P&L, Index Performance, CE vs PE Donut
                row4DistributionCharts
                
                // MARK: - Row 5: Strategy Performance, Risk Management, Recent Trades
                row5DetailAndActionCards
            }
            .padding(18)
        }
        .background(DashboardPalette.canvas(for: colorScheme))
        .task {
            await viewModel.loadDashboard(
                filter: appState.selectedDateFilter.rawValue,
                fromDate: appState.apiFromDateString,
                toDate: appState.apiToDateString
            )
        }
        .onChange(of: appState.selectedDateFilter) { newFilter in
            Task {
                await viewModel.loadDashboard(
                    filter: newFilter.rawValue,
                    fromDate: appState.apiFromDateString,
                    toDate: appState.apiToDateString
                )
            }
        }
        .onChange(of: appState.dateFilterTrigger) { _ in
            Task {
                await viewModel.loadDashboard(
                    filter: appState.selectedDateFilter.rawValue,
                    fromDate: appState.apiFromDateString,
                    toDate: appState.apiToDateString
                )
            }
        }
    }
    
    // =========================================================================
    // MARK: - Row 1: Primary KPI Cards Grid (6 Cards)
    // =========================================================================
    @ViewBuilder
    private var row1PrimaryKPIs: some View {
        let stats = viewModel.stats
        let netProfit = stats?.totalNetProfit ?? -387387.0
        let grossProfit = stats?.totalGrossProfit ?? 1247370.0
        let grossLoss = stats?.totalGrossLoss ?? 1562487.0
        let todayPnl = stats?.todayPnl ?? 0.0
        let thisMonthPnl = stats?.thisMonthPnl ?? 11494.0
        let currentCapital = stats?.currentCapital ?? 312613.0
        
        // Percentage changes
        let netProfitPct = stats?.periodRoi ?? -48.42
        let grossProfitPct = stats?.grossProfitPct ?? 155.92
        let grossLossPct = stats?.grossLossPct ?? -195.31
        let todayPnlPct = stats?.todayPnlPct ?? 0.0
        let thisMonthPnlPct = stats?.thisMonthPnlPct ?? 1.44
        let capitalPct = stats?.overallRoi ?? -48.42
        
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 14), count: 6), spacing: 14) {
            // Card 1: Total Net Profit
            PrimaryKpiCard(
                title: "Total Net Profit",
                value: DashboardNumberFormatter.formatRupeeInteger(netProfit, includeSign: true, isPrivacyMode: preferences.isPrivacyModeEnabled),
                badgeText: "\(netProfitPct >= 0 ? "↗ +" : "↘ ")\(String(format: "%.2f", netProfitPct))%",
                badgeColor: netProfit >= 0 ? DashboardPalette.profitGreen : DashboardPalette.lossRed,
                iconName: netProfit >= 0 ? "arrow.up.right" : "arrow.down.right",
                iconColor: netProfit >= 0 ? DashboardPalette.profitGreen : DashboardPalette.lossRed,
                iconBgColor: (netProfit >= 0 ? DashboardPalette.profitGreen : DashboardPalette.lossRed).opacity(0.15),
                valueColor: netProfit >= 0 ? DashboardPalette.profitGreen : DashboardPalette.lossRed
            )
            
            // Card 2: Total Gross Profit
            PrimaryKpiCard(
                title: "Total Gross Profit",
                value: DashboardNumberFormatter.formatRupeeInteger(grossProfit, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled),
                badgeText: "↗ +\(String(format: "%.2f", abs(grossProfitPct)))%",
                badgeColor: DashboardPalette.profitGreen,
                iconName: "arrow.up.right",
                iconColor: DashboardPalette.profitGreen,
                iconBgColor: DashboardPalette.profitGreen.opacity(0.15),
                valueColor: DashboardPalette.profitGreen
            )
            
            // Card 3: Total Gross Loss
            PrimaryKpiCard(
                title: "Total Gross Loss",
                value: DashboardNumberFormatter.formatRupeeInteger(grossLoss, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled),
                badgeText: "↘ -\(String(format: "%.2f", abs(grossLossPct)))%",
                badgeColor: DashboardPalette.lossRed,
                iconName: "arrow.down.right",
                iconColor: DashboardPalette.lossRed,
                iconBgColor: DashboardPalette.lossRed.opacity(0.15),
                valueColor: DashboardPalette.lossRed
            )
            
            // Card 4: Today's P&L
            PrimaryKpiCard(
                title: "Today's P&L",
                value: DashboardNumberFormatter.formatRupeeInteger(todayPnl, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled),
                badgeText: "\(todayPnl >= 0 ? "↗ +" : "↘ ")\(String(format: "%.2f", abs(todayPnlPct)))%",
                badgeColor: todayPnl >= 0 ? DashboardPalette.profitGreen : DashboardPalette.lossRed,
                iconName: "waveform.path.ecg",
                iconColor: todayPnl >= 0 ? DashboardPalette.profitGreen : DashboardPalette.lossRed,
                iconBgColor: (todayPnl >= 0 ? DashboardPalette.profitGreen : DashboardPalette.lossRed).opacity(0.15),
                valueColor: todayPnl >= 0 ? DashboardPalette.profitGreen : DashboardPalette.lossRed
            )
            
            // Card 5: This Month's P&L
            PrimaryKpiCard(
                title: "This Month's P&L",
                value: DashboardNumberFormatter.formatRupeeInteger(thisMonthPnl, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled),
                badgeText: "↗ +\(String(format: "%.2f", abs(thisMonthPnlPct)))%",
                badgeColor: DashboardPalette.accentBlue,
                iconName: "chart.bar.xaxis",
                iconColor: DashboardPalette.accentBlue,
                iconBgColor: DashboardPalette.accentBlue.opacity(0.15),
                valueColor: thisMonthPnl >= 0 ? DashboardPalette.profitGreen : DashboardPalette.lossRed
            )
            
            // Card 6: Current Capital
            PrimaryKpiCard(
                title: "Current Capital",
                value: DashboardNumberFormatter.formatRupeeInteger(currentCapital, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled),
                badgeText: "\(capitalPct >= 0 ? "↗ +" : "↘ ")\(String(format: "%.2f", capitalPct))%",
                badgeColor: capitalPct >= 0 ? DashboardPalette.profitGreen : DashboardPalette.lossRed,
                iconName: "shield",
                iconColor: DashboardPalette.warmAmber,
                iconBgColor: DashboardPalette.warmAmber.opacity(0.15),
                valueColor: DashboardPalette.warmAmber
            )
        }
    }
    
    // =========================================================================
    // MARK: - Row 2: Secondary Metrics Strip (8 Cards)
    // =========================================================================
    @ViewBuilder
    private var row2SecondaryMetricsStrip: some View {
        let stats = viewModel.stats
        let totalTradingDays = stats?.totalTradingDays ?? 161
        let winningDays = stats?.winningDays ?? 61
        let losingDays = stats?.losingDays ?? 100
        let winRate = stats?.winRate ?? 37.9
        let avgProfit = stats?.avgDailyProfit ?? 2708.0
        let avgLoss = stats?.avgDailyLoss ?? 5525.0
        let maxDrawdown = stats?.maxDrawdown ?? 400628.0
        let profitFactor = stats?.profitFactor ?? 0.8
        
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 8), spacing: 10) {
            SecondaryMetricBlock(title: "Total Trading Days", value: "\(totalTradingDays)", valueColor: DashboardPalette.textPrimaryDark)
            SecondaryMetricBlock(title: "Winning Days", value: "\(winningDays)", valueColor: DashboardPalette.profitGreen)
            SecondaryMetricBlock(title: "Losing Days", value: "\(losingDays)", valueColor: DashboardPalette.lossRed)
            SecondaryMetricBlock(title: "Win Rate", value: "\(String(format: "%.1f", winRate))%", valueColor: DashboardPalette.textPrimaryDark)
            SecondaryMetricBlock(
                title: "Avg. Daily Profit",
                value: DashboardNumberFormatter.formatRupeeInteger(avgProfit, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled),
                valueColor: DashboardPalette.textPrimaryDark
            )
            SecondaryMetricBlock(
                title: "Avg. Daily Loss",
                value: DashboardNumberFormatter.formatRupeeInteger(avgLoss, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled),
                valueColor: DashboardPalette.textPrimaryDark
            )
            SecondaryMetricBlock(
                title: "Max Drawdown",
                value: DashboardNumberFormatter.formatRupeeInteger(maxDrawdown, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled),
                valueColor: DashboardPalette.lossRed
            )
            SecondaryMetricBlock(title: "Profit Factor", value: "\(String(format: "%.1f", profitFactor))", valueColor: DashboardPalette.textPrimaryDark)
        }
    }
    
    // =========================================================================
    // MARK: - Row 3: Visual Charts & Heatmap (3 Columns)
    // =========================================================================
    @ViewBuilder
    private var row3VisualCharts: some View {
        HStack(alignment: .top, spacing: 14) {
            // Column 1: Daily P&L Bar Chart
            DailyPnlChartCard(
                points: viewModel.charts?.dailyPnl ?? sampleDailyPoints(),
                isPrivacyMode: preferences.isPrivacyModeEnabled
            )
            .frame(maxWidth: .infinity)
            
            // Column 2: Cumulative P&L (Equity Curve) Area Chart
            CumulativeEquityChartCard(
                points: viewModel.charts?.equityCurve ?? sampleEquityPoints(),
                isPrivacyMode: preferences.isPrivacyModeEnabled
            )
            .frame(maxWidth: .infinity)
            
            // Column 3: Mini Trading Calendar Widget
            MiniTradingCalendarCard(
                monthTitle: viewModel.calendarMonthTitle,
                netPnl: viewModel.calendarMonthNetPnl,
                calendarResponse: viewModel.calendarData,
                year: viewModel.calendarYear,
                month: viewModel.calendarMonth,
                isPrivacyMode: preferences.isPrivacyModeEnabled,
                onPrevious: { viewModel.previousCalendarMonth() },
                onNext: { viewModel.nextCalendarMonth() }
            )
            .frame(maxWidth: .infinity)
        }
    }
    
    // =========================================================================
    // MARK: - Row 4: Distribution Charts (3 Columns)
    // =========================================================================
    @ViewBuilder
    private var row4DistributionCharts: some View {
        HStack(alignment: .top, spacing: 14) {
            // Column 1: Monthly P&L Bar Chart
            MonthlyPnlChartCard(
                year: "\(viewModel.calendarYear)",
                months: viewModel.charts?.monthlyPnl ?? sampleMonthlyPoints(),
                isPrivacyMode: preferences.isPrivacyModeEnabled
            )
            .frame(maxWidth: .infinity)
            
            // Column 2: Index-wise Performance Donut Chart
            IndexPerformanceDonutCard(
                container: viewModel.charts?.indexPerformance,
                defaultTotalPnl: viewModel.stats?.totalNetProfit ?? -387387.0,
                isPrivacyMode: preferences.isPrivacyModeEnabled
            )
            .frame(maxWidth: .infinity)
            
            // Column 3: CE vs PE Performance Donut Chart
            CePePerformanceDonutCard(
                container: viewModel.charts?.cePePerformance,
                defaultTotalPnl: viewModel.stats?.totalNetProfit ?? -387387.0,
                isPrivacyMode: preferences.isPrivacyModeEnabled
            )
            .frame(maxWidth: .infinity)
        }
    }
    
    // =========================================================================
    // MARK: - Row 5: Detail & Action Cards (3 Columns)
    // =========================================================================
    @ViewBuilder
    private var row5DetailAndActionCards: some View {
        HStack(alignment: .top, spacing: 14) {
            // Column 1: Strategy Performance
            StrategyPerformanceCard(
                strategies: viewModel.strategyPerformance.isEmpty ? sampleStrategies() : viewModel.strategyPerformance,
                isPrivacyMode: preferences.isPrivacyModeEnabled,
                onViewAll: { appState.selectedTab = "strategy-analysis" }
            )
            .frame(maxWidth: .infinity)
            
            // Column 2: Risk Management Guardrails
            RiskManagementDashboardCard(
                riskSummary: viewModel.riskManagement ?? sampleRiskSummary(),
                account: viewModel.stats,
                isPrivacyMode: preferences.isPrivacyModeEnabled,
                onViewDashboard: { appState.selectedTab = "risk-management" }
            )
            .frame(maxWidth: .infinity)
            
            // Column 3: Recent Trades List
            RecentTradesDashboardCard(
                trades: viewModel.recentTrades.isEmpty ? sampleRecentTrades() : viewModel.recentTrades,
                isPrivacyMode: preferences.isPrivacyModeEnabled,
                onViewAll: { appState.selectedTab = "trades" },
                onLogNewTrade: { appState.selectedTab = "add-trade" }
            )
            .frame(maxWidth: .infinity)
        }
    }
    
    // =========================================================================
    // MARK: - Sample Fallback Data
    // =========================================================================
    private func sampleDailyPoints() -> [DailyPnlPoint] {
        return [
            DailyPnlPoint(date: "2023-12-28", displayDate: "28 Dec", pnl: -9, netPnl: -9, grossProfit: 0, grossLoss: 9, trades: 1),
            DailyPnlPoint(date: "2024-01-22", displayDate: "22 Jan", pnl: 4500, netPnl: 4500, grossProfit: 5000, grossLoss: 500, trades: 3),
            DailyPnlPoint(date: "2024-02-21", displayDate: "21 Feb", pnl: -3200, netPnl: -3200, grossProfit: 0, grossLoss: 3200, trades: 2),
            DailyPnlPoint(date: "2024-04-25", displayDate: "25 Apr", pnl: 1800, netPnl: 1800, grossProfit: 2000, grossLoss: 200, trades: 1),
            DailyPnlPoint(date: "2024-06-16", displayDate: "16 Jun", pnl: -38000, netPnl: -38000, grossProfit: 0, grossLoss: 38000, trades: 4),
            DailyPnlPoint(date: "2024-07-23", displayDate: "23 Jul", pnl: -58000, netPnl: -58000, grossProfit: 0, grossLoss: 58000, trades: 5),
            DailyPnlPoint(date: "2024-08-06", displayDate: "06 Aug", pnl: 5200, netPnl: 5200, grossProfit: 5500, grossLoss: 300, trades: 2),
            DailyPnlPoint(date: "2024-09-06", displayDate: "06 Sep", pnl: 5400, netPnl: 5400, grossProfit: 6000, grossLoss: 600, trades: 3),
            DailyPnlPoint(date: "2024-10-13", displayDate: "13 Oct", pnl: -14000, netPnl: -14000, grossProfit: 0, grossLoss: 14000, trades: 2),
            DailyPnlPoint(date: "2024-11-03", displayDate: "03 Nov", pnl: 11494, netPnl: 11494, grossProfit: 12000, grossLoss: 506, trades: 1)
        ]
    }
    
    private func sampleEquityPoints() -> [EquityPoint] {
        return [
            EquityPoint(date: "2024-01-06", displayDate: "06 Jan", pnl: 0, cumulativePnl: 0, capital: 700000, drawdown: 0, peak: 700000),
            EquityPoint(date: "2024-02-15", displayDate: "15 Feb", pnl: -40000, cumulativePnl: -40000, capital: 660000, drawdown: 40000, peak: 700000),
            EquityPoint(date: "2024-04-10", displayDate: "10 Apr", pnl: -60000, cumulativePnl: -100000, capital: 600000, drawdown: 100000, peak: 700000),
            EquityPoint(date: "2024-06-20", displayDate: "20 Jun", pnl: -110000, cumulativePnl: -210000, capital: 490000, drawdown: 210000, peak: 700000),
            EquityPoint(date: "2024-07-25", displayDate: "25 Jul", pnl: -170000, cumulativePnl: -380000, capital: 320000, drawdown: 380000, peak: 700000),
            EquityPoint(date: "2024-08-30", displayDate: "30 Aug", pnl: -15000, cumulativePnl: -395000, capital: 305000, drawdown: 395000, peak: 700000),
            EquityPoint(date: "2024-10-15", displayDate: "15 Oct", pnl: -4000, cumulativePnl: -399000, capital: 301000, drawdown: 399000, peak: 700000),
            EquityPoint(date: "2024-11-03", displayDate: "03 Nov", pnl: 11494, cumulativePnl: -387387, capital: 312613, drawdown: 387387, peak: 700000)
        ]
    }
    
    private func sampleMonthlyPoints() -> [MonthlyPnlPoint] {
        return [
            MonthlyPnlPoint(month: "Jan", monthNum: 1, year: 2026, pnl: 0, grossProfit: 0, grossLoss: 0, tradesCount: 0),
            MonthlyPnlPoint(month: "Feb", monthNum: 2, year: 2026, pnl: 0, grossProfit: 0, grossLoss: 0, tradesCount: 0),
            MonthlyPnlPoint(month: "Mar", monthNum: 3, year: 2026, pnl: 0, grossProfit: 0, grossLoss: 0, tradesCount: 0),
            MonthlyPnlPoint(month: "Apr", monthNum: 4, year: 2026, pnl: 0, grossProfit: 0, grossLoss: 0, tradesCount: 0),
            MonthlyPnlPoint(month: "May", monthNum: 5, year: 2026, pnl: 0, grossProfit: 0, grossLoss: 0, tradesCount: 0),
            MonthlyPnlPoint(month: "Jun", monthNum: 6, year: 2026, pnl: -38000, grossProfit: 2000, grossLoss: 40000, tradesCount: 15),
            MonthlyPnlPoint(month: "Jul", monthNum: 7, year: 2026, pnl: -58000, grossProfit: 1000, grossLoss: 59000, tradesCount: 22),
            MonthlyPnlPoint(month: "Aug", monthNum: 8, year: 2026, pnl: 5200, grossProfit: 6000, grossLoss: 800, tradesCount: 10),
            MonthlyPnlPoint(month: "Sep", monthNum: 9, year: 2026, pnl: 5400, grossProfit: 6500, grossLoss: 1100, tradesCount: 12),
            MonthlyPnlPoint(month: "Oct", monthNum: 10, year: 2026, pnl: -14000, grossProfit: 2000, grossLoss: 16000, tradesCount: 8),
            MonthlyPnlPoint(month: "Nov", monthNum: 11, year: 2026, pnl: 11494, grossProfit: 12000, grossLoss: 506, tradesCount: 1),
            MonthlyPnlPoint(month: "Dec", monthNum: 12, year: 2026, pnl: 0, grossProfit: 0, grossLoss: 0, tradesCount: 0)
        ]
    }
    
    private func sampleStrategies() -> [StrategyPerformanceItem] {
        return [
            StrategyPerformanceItem(
                strategy: "Long Straddle",
                totalTrades: 954,
                winningTrades: 427,
                losingTrades: 527,
                winRate: 44.8,
                netPnl: -387387.0,
                avgProfit: 2921.0,
                avgLoss: 2964.0
            )
        ]
    }
    
    private func sampleRiskSummary() -> RiskSummaryDashboard {
        return RiskSummaryDashboard(
            dailyLossLimit: 25000.0,
            dailyCurrentLoss: 0.0,
            dailyProfitTarget: 20000.0,
            dailyCurrentProfit: 0.0,
            maxDrawdownLimit: 50000.0,
            currentDrawdown: 400628.0,
            consecutiveLossDays: 0,
            consecutiveWinDays: 1,
            alerts: []
        )
    }
    
    private func sampleRecentTrades() -> [RecentTradeItem] {
        return [
            RecentTradeItem(id: 1, tradeDate: "2023-12-29", displayDate: "29 Dec 2023", indexName: "SENSEX", tradingType: "Intraday", optionType: "CE", strategyName: "Long Straddle", strikePrice: 72000, lots: 5, netPnl: -9.0),
            RecentTradeItem(id: 2, tradeDate: "2023-12-29", displayDate: "29 Dec 2023", indexName: "SENSEX", tradingType: "Intraday", optionType: "CE", strategyName: "Long Straddle", strikePrice: 72100, lots: 1, netPnl: -19.0),
            RecentTradeItem(id: 3, tradeDate: "2023-12-15", displayDate: "15 Dec 2023", indexName: "SENSEX", tradingType: "Intraday", optionType: "PE", strategyName: "Long Straddle", strikePrice: 71500, lots: 5, netPnl: 275.0),
            RecentTradeItem(id: 4, tradeDate: "2023-12-15", displayDate: "15 Dec 2023", indexName: "SENSEX", tradingType: "Intraday", optionType: "CE", strategyName: "Long Straddle", strikePrice: 71500, lots: 5, netPnl: -290.0),
            RecentTradeItem(id: 5, tradeDate: "2024-02-29", displayDate: "29 Feb 2024", indexName: "NIFTY", tradingType: "Intraday", optionType: "PE", strategyName: "Long Straddle", strikePrice: 22000, lots: 15, netPnl: -1196.0)
        ]
    }
}

// =============================================================================
// MARK: - Reusable Row 1 Component: Primary KPI Card
// =============================================================================
private struct PrimaryKpiCard: View {
    @Environment(\.colorScheme) private var colorScheme
    let title: String
    let value: String
    let badgeText: String
    let badgeColor: Color
    let iconName: String
    let iconColor: Color
    let iconBgColor: Color
    let valueColor: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Top Row: Icon Square + Badge
            HStack(alignment: .center) {
                ZStack {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(iconBgColor)
                        .frame(width: 32, height: 32)
                    
                    Image(systemName: iconName)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(iconColor)
                }
                
                Spacer()
                
                Text(badgeText)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(badgeColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(
                        RoundedRectangle(cornerRadius: 5)
                            .fill(badgeColor.opacity(0.14))
                    )
            }
            
            // Bottom Info: Label + Big Currency Figure
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                
                Text(value)
                    .font(.system(size: 22, weight: .bold, design: .monospaced))
                    .foregroundColor(valueColor)
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
            }
        }
        .padding(14)
        .dashboardCard()
    }
}

// =============================================================================
// MARK: - Reusable Row 2 Component: Secondary Metric Block
// =============================================================================
private struct SecondaryMetricBlock: View {
    let title: String
    let value: String
    let valueColor: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(DashboardPalette.textSecondaryDark)
                .lineLimit(1)
            
            Text(value)
                .font(.system(size: 18, weight: .bold, design: .monospaced))
                .foregroundColor(valueColor)
                .lineLimit(1)
                .minimumScaleFactor(0.85)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .dashboardCard()
    }
}

// =============================================================================
// MARK: - Row 3, Column 1: Daily P&L Chart Card
// =============================================================================
private struct DailyPnlChartCard: View {
    let points: [DailyPnlPoint]
    let isPrivacyMode: Bool
    
    @State private var hoveredPoint: DailyPnlPoint? = nil
    @State private var hoverLocation: CGPoint = .zero
    
    // Sort chronologically and deduplicate
    private var cleanPoints: [DailyPnlPoint] {
        let sorted = points.sorted(by: { $0.date < $1.date })
        var map: [String: DailyPnlPoint] = [:]
        for pt in sorted {
            map[pt.date] = pt
        }
        return map.values.sorted(by: { $0.date < $1.date })
    }
    
    // Sparse X-axis tick values to prevent overlapping label smudge
    private var strideDates: [String] {
        let pts = cleanPoints
        guard !pts.isEmpty else { return [] }
        if pts.count <= 10 {
            return pts.map { $0.date }
        }
        let targetCount = 8
        let step = max(1, pts.count / targetCount)
        var result: [String] = []
        for i in stride(from: 0, to: pts.count, by: step) {
            result.append(pts[i].date)
        }
        if let last = pts.last, !result.contains(last.date) {
            result.append(last.date)
        }
        return result
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header
            HStack {
                Text("Daily P&L")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(DashboardPalette.textPrimaryDark)
                
                Spacer()
                
                Text("This Month")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(
                        RoundedRectangle(cornerRadius: 5)
                            .fill(DashboardPalette.badgeBackgroundDark)
                    )
            }
            
            Chart {
                ForEach(cleanPoints) { pt in
                    let pnl = pt.calculatedPnl
                    BarMark(
                        x: .value("Date", pt.date),
                        y: .value("P&L", pnl)
                    )
                    .foregroundStyle(pnl >= 0 ? DashboardPalette.profitGreen : DashboardPalette.lossRed)
                    .cornerRadius(2)
                }
                
                RuleMark(y: .value("Zero", 0))
                    .foregroundStyle(DashboardPalette.borderDark)
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                
                if let hovered = hoveredPoint {
                    RuleMark(x: .value("HoverDate", hovered.date))
                        .foregroundStyle(Color.white.opacity(0.85))
                        .lineStyle(StrokeStyle(lineWidth: 2))
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [2, 2]))
                        .foregroundStyle(DashboardPalette.borderDark)
                    AxisValueLabel {
                        if let doubleVal = value.as(Double.self) {
                            Text(DashboardNumberFormatter.formatAbbreviatedRupee(doubleVal))
                                .font(.system(size: 11, weight: .medium, design: .monospaced))
                                .foregroundColor(DashboardPalette.textSecondaryDark)
                        }
                    }
                }
            }
            .chartXAxis {
                AxisMarks(values: strideDates) { value in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [2, 2]))
                        .foregroundStyle(DashboardPalette.borderDark.opacity(0.4))
                    AxisValueLabel {
                        if let dateStr = value.as(String.self) {
                            Text(DashboardNumberFormatter.parseDateDisplay(dateStr))
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(DashboardPalette.textSecondaryDark)
                        }
                    }
                }
            }
            .chartOverlay { proxy in
                GeometryReader { geo in
                    ZStack(alignment: .topLeading) {
                        Rectangle()
                            .fill(Color.clear)
                            .contentShape(Rectangle())
                            .onContinuousHover { phase in
                                switch phase {
                                case .active(let location):
                                    guard let plotFrame = proxy.plotFrame else { return }
                                    let frame = geo[plotFrame]
                                    if frame.contains(location) {
                                        let plotX = location.x - frame.origin.x
                                        let plotWidth = frame.size.width
                                        guard plotWidth > 0, !cleanPoints.isEmpty else { return }
                                        let normalizedX = max(0, min(0.999, plotX / plotWidth))
                                        let index = Int(normalizedX * CGFloat(cleanPoints.count))
                                        let clampedIndex = max(0, min(cleanPoints.count - 1, index))
                                        hoveredPoint = cleanPoints[clampedIndex]
                                        hoverLocation = location
                                    } else {
                                        hoveredPoint = nil
                                    }
                                case .ended:
                                    hoveredPoint = nil
                                }
                            }
                        
                        if let hovered = hoveredPoint, let plotFrame = proxy.plotFrame {
                            let frame = geo[plotFrame]
                            let tooltipWidth: CGFloat = 160
                            let anchorX: CGFloat = {
                                if let posX = proxy.position(forX: hovered.date) {
                                    return frame.origin.x + posX
                                }
                                return hoverLocation.x
                            }()
                            let isRightSide = anchorX > frame.midX
                            let cx: CGFloat = isRightSide
                                ? max(frame.minX + tooltipWidth / 2 + 6, anchorX - 12 - tooltipWidth / 2)
                                : min(frame.maxX - tooltipWidth / 2 - 6, anchorX + 12 + tooltipWidth / 2)
                            let cy: CGFloat = min(max(frame.minY + 45, hoverLocation.y), frame.maxY - 45)
                            
                            DailyPnlTooltipView(point: hovered, isPrivacyMode: isPrivacyMode)
                                .frame(width: tooltipWidth)
                                .position(x: cx, y: cy)
                                .allowsHitTesting(false)
                                .transition(.opacity.animation(.easeInOut(duration: 0.12)))
                        }
                    }
                }
            }
            .frame(height: 220)
        }
        .padding(16)
        .dashboardCard()
    }
}

// MARK: - Daily P&L Hover Tooltip
private struct DailyPnlTooltipView: View {
    let point: DailyPnlPoint
    let isPrivacyMode: Bool
    
    var body: some View {
        let pnl = point.calculatedPnl
        let isProfit = pnl >= 0
        
        VStack(alignment: .leading, spacing: 4) {
            // Line 1: Date (e.g. 2024-02-20)
            Text(point.date)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(DashboardPalette.textSecondaryDark)
            
            // Line 2: Net P&L: ₹752
            HStack(spacing: 4) {
                Text("Net P&L:")
                    .font(.system(size: 13, weight: .bold))
                
                Text(DashboardNumberFormatter.formatRupeeInteger(pnl, includeSign: false, isPrivacyMode: isPrivacyMode))
                    .font(.system(size: 13, weight: .bold, design: .monospaced))
            }
            .foregroundColor(isProfit ? DashboardPalette.profitGreen : DashboardPalette.lossRed)
            
            // Line 3: Trades: 2
            Text("Trades: \(point.trades ?? 0)")
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(DashboardPalette.textSecondaryDark)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(Color(red: 22/255, green: 32/255, blue: 51/255))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(DashboardPalette.borderDark, lineWidth: 1)
                )
                .shadow(color: Color.black.opacity(0.4), radius: 8, x: 0, y: 4)
        )
    }
}

// =============================================================================
// MARK: - Row 3, Column 2: Cumulative P&L (Equity Curve) Area Chart Card
// =============================================================================
private struct CumulativeEquityChartCard: View {
    let points: [EquityPoint]
    let isPrivacyMode: Bool
    
    @State private var hoveredPoint: EquityPoint? = nil
    @State private var hoverLocation: CGPoint = .zero
    
    // Sort strictly chronologically by ISO-8601 date to guarantee monotonically advancing curve
    private var cleanPoints: [EquityPoint] {
        let sorted = points.sorted(by: { $0.date < $1.date })
        var map: [String: EquityPoint] = [:]
        for pt in sorted {
            map[pt.date] = pt
        }
        return map.values.sorted(by: { $0.date < $1.date })
    }
    
    private var strideDates: [String] {
        let pts = cleanPoints
        guard !pts.isEmpty else { return [] }
        if pts.count <= 10 {
            return pts.map { $0.date }
        }
        let targetCount = 8
        let step = max(1, pts.count / targetCount)
        var result: [String] = []
        for i in stride(from: 0, to: pts.count, by: step) {
            result.append(pts[i].date)
        }
        if let last = pts.last, !result.contains(last.date) {
            result.append(last.date)
        }
        return result
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header
            HStack {
                Text("Cumulative P&L (Equity Curve)")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(DashboardPalette.textPrimaryDark)
                
                Spacer()
                
                Text("This Month")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(
                        RoundedRectangle(cornerRadius: 5)
                            .fill(DashboardPalette.badgeBackgroundDark)
                    )
            }
            
            Chart {
                ForEach(cleanPoints) { pt in
                    let val = pt.cumulativePnl ?? 0.0
                    AreaMark(
                        x: .value("Date", pt.date),
                        y: .value("Equity", val)
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [
                                DashboardPalette.accentBlue.opacity(0.35),
                                DashboardPalette.accentBlue.opacity(0.02)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    
                    LineMark(
                        x: .value("Date", pt.date),
                        y: .value("Equity", val)
                    )
                    .foregroundStyle(DashboardPalette.accentBlue)
                    .lineStyle(StrokeStyle(lineWidth: 2.2))
                }
                
                RuleMark(y: .value("Zero", 0))
                    .foregroundStyle(DashboardPalette.borderDark)
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                
                if let hovered = hoveredPoint {
                    RuleMark(x: .value("HoverDate", hovered.date))
                        .foregroundStyle(DashboardPalette.accentBlue.opacity(0.85))
                        .lineStyle(StrokeStyle(lineWidth: 2))
                    
                    PointMark(
                        x: .value("HoverDate", hovered.date),
                        y: .value("HoverEquity", hovered.cumulativePnl ?? 0.0)
                    )
                    .symbolSize(45)
                    .foregroundStyle(Color.white)
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [2, 2]))
                        .foregroundStyle(DashboardPalette.borderDark)
                    AxisValueLabel {
                        if let doubleVal = value.as(Double.self) {
                            Text(DashboardNumberFormatter.formatAbbreviatedRupee(doubleVal))
                                .font(.system(size: 11, weight: .medium, design: .monospaced))
                                .foregroundColor(DashboardPalette.textSecondaryDark)
                        }
                    }
                }
            }
            .chartXAxis {
                AxisMarks(values: strideDates) { value in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [2, 2]))
                        .foregroundStyle(DashboardPalette.borderDark.opacity(0.4))
                    AxisValueLabel {
                        if let dateStr = value.as(String.self) {
                            Text(DashboardNumberFormatter.parseDateDisplay(dateStr))
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(DashboardPalette.textSecondaryDark)
                        }
                    }
                }
            }
            .chartOverlay { proxy in
                GeometryReader { geo in
                    ZStack(alignment: .topLeading) {
                        Rectangle()
                            .fill(Color.clear)
                            .contentShape(Rectangle())
                            .onContinuousHover { phase in
                                switch phase {
                                case .active(let location):
                                    guard let plotFrame = proxy.plotFrame else { return }
                                    let frame = geo[plotFrame]
                                    if frame.contains(location) {
                                        let plotX = location.x - frame.origin.x
                                        let plotWidth = frame.size.width
                                        guard plotWidth > 0, !cleanPoints.isEmpty else { return }
                                        let normalizedX = max(0, min(0.999, plotX / plotWidth))
                                        let index = Int(normalizedX * CGFloat(cleanPoints.count))
                                        let clampedIndex = max(0, min(cleanPoints.count - 1, index))
                                        hoveredPoint = cleanPoints[clampedIndex]
                                        hoverLocation = location
                                    } else {
                                        hoveredPoint = nil
                                    }
                                case .ended:
                                    hoveredPoint = nil
                                }
                            }
                        
                        if let hovered = hoveredPoint, let plotFrame = proxy.plotFrame {
                            let frame = geo[plotFrame]
                            let tooltipWidth: CGFloat = 170
                            let anchorX: CGFloat = {
                                if let posX = proxy.position(forX: hovered.date) {
                                    return frame.origin.x + posX
                                }
                                return hoverLocation.x
                            }()
                            let isRightSide = anchorX > frame.midX
                            let cx: CGFloat = isRightSide
                                ? max(frame.minX + tooltipWidth / 2 + 6, anchorX - 12 - tooltipWidth / 2)
                                : min(frame.maxX - tooltipWidth / 2 - 6, anchorX + 12 + tooltipWidth / 2)
                            let cy: CGFloat = min(max(frame.minY + 45, hoverLocation.y), frame.maxY - 45)
                            
                            EquityTooltipView(point: hovered, isPrivacyMode: isPrivacyMode)
                                .frame(width: tooltipWidth)
                                .position(x: cx, y: cy)
                                .allowsHitTesting(false)
                                .transition(.opacity.animation(.easeInOut(duration: 0.12)))
                        }
                    }
                }
            }
            .frame(height: 220)
        }
        .padding(16)
        .dashboardCard()
    }
}

// MARK: - Equity Hover Tooltip
private struct EquityTooltipView: View {
    let point: EquityPoint
    let isPrivacyMode: Bool
    
    var body: some View {
        let cumPnl = point.cumulativePnl ?? 0.0
        let cap = point.capital ?? 0.0
        
        VStack(alignment: .leading, spacing: 4) {
            // Line 1: Date (e.g. 2024-02-20)
            Text(point.date)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(DashboardPalette.textSecondaryDark)
            
            // Line 2: Cumulative: ₹...
            HStack(spacing: 4) {
                Text("Cumulative:")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(DashboardPalette.accentBlue)
                
                Text(DashboardNumberFormatter.formatRupeeInteger(cumPnl, includeSign: true, isPrivacyMode: isPrivacyMode))
                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                    .foregroundColor(DashboardPalette.accentBlue)
            }
            
            // Line 3: Capital: ₹...
            HStack(spacing: 4) {
                Text("Capital:")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                
                Text(DashboardNumberFormatter.formatRupeeInteger(cap, includeSign: false, isPrivacyMode: isPrivacyMode))
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundColor(DashboardPalette.textPrimaryDark)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(Color(red: 22/255, green: 32/255, blue: 51/255))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(DashboardPalette.borderDark, lineWidth: 1)
                )
                .shadow(color: Color.black.opacity(0.4), radius: 8, x: 0, y: 4)
        )
    }
}

// =============================================================================
// MARK: - Row 3, Column 3: Mini Trading Calendar Widget Card
// =============================================================================
private struct MiniTradingCalendarCard: View {
    let monthTitle: String
    let netPnl: Double
    let calendarResponse: CalendarResponse?
    let year: Int
    let month: Int
    let isPrivacyMode: Bool
    let onPrevious: () -> Void
    let onNext: () -> Void
    
    private let dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header Bar
            HStack(spacing: 8) {
                Text("Trading Calendar")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(DashboardPalette.textPrimaryDark)
                
                Spacer()
                
                // Net PnL Pill
                let sign = netPnl >= 0 ? "+" : ""
                let pnlText = isPrivacyMode ? "••••••" : "\(sign)\(DashboardNumberFormatter.formatRupeeInteger(netPnl, includeSign: false, isPrivacyMode: false))"
                Text(pnlText)
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundColor(netPnl >= 0 ? DashboardPalette.profitGreen : DashboardPalette.lossRed)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(
                        RoundedRectangle(cornerRadius: 5)
                            .fill((netPnl >= 0 ? DashboardPalette.profitGreen : DashboardPalette.lossRed).opacity(0.14))
                    )
                
                // Month switcher with chevrons
                HStack(spacing: 5) {
                    Button(action: onPrevious) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(DashboardPalette.textSecondaryDark)
                    }
                    .buttonStyle(.plain)
                    
                    Text(monthTitle)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(DashboardPalette.textPrimaryDark)
                    
                    Button(action: onNext) {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(DashboardPalette.textSecondaryDark)
                    }
                    .buttonStyle(.plain)
                }
            }
            
            // Weekday Headers (Sun -> Sat)
            HStack(spacing: 0) {
                ForEach(dayHeaders, id: \.self) { day in
                    Text(day)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(DashboardPalette.textSecondaryDark)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(.vertical, 2)
            
            // Calendar Grid Cells (5 Weeks x 7 Days = 35 Cells)
            let cells = generateCells(for: year, month: month)
            VStack(spacing: 5) {
                ForEach(0..<5, id: \.self) { row in
                    HStack(spacing: 5) {
                        ForEach(0..<7, id: \.self) { col in
                            let index = row * 7 + col
                            if index < cells.count {
                                renderCell(cells[index])
                            } else {
                                Spacer().frame(maxWidth: .infinity, minHeight: 32)
                            }
                        }
                    }
                }
            }
            
            // Legend
            HStack(spacing: 16) {
                Spacer()
                HStack(spacing: 5) {
                    Circle().fill(DashboardPalette.profitGreen).frame(width: 7, height: 7)
                    Text("Profit Day").font(.system(size: 11, weight: .medium)).foregroundColor(DashboardPalette.textSecondaryDark)
                }
                HStack(spacing: 5) {
                    Circle().fill(DashboardPalette.lossRed).frame(width: 7, height: 7)
                    Text("Loss Day").font(.system(size: 11, weight: .medium)).foregroundColor(DashboardPalette.textSecondaryDark)
                }
                HStack(spacing: 5) {
                    Circle().fill(DashboardPalette.textMutedDark).frame(width: 7, height: 7)
                    Text("No Trade").font(.system(size: 11, weight: .medium)).foregroundColor(DashboardPalette.textSecondaryDark)
                }
                Spacer()
            }
            .padding(.top, 4)
        }
        .padding(16)
        .dashboardCard()
    }
    
    // Cell Renderer
    @ViewBuilder
    private func renderCell(_ cell: MiniCalendarCell) -> some View {
        let isTraded = cell.dayItem != nil && (cell.dayItem?.tradeCount ?? 0) > 0
        let pnl = cell.dayItem?.netPnl ?? 0.0
        let isProfit = pnl >= 0
        
        ZStack {
            if isTraded {
                RoundedRectangle(cornerRadius: 5)
                    .stroke(isProfit ? DashboardPalette.profitGreen : DashboardPalette.lossRed, lineWidth: 1.5)
                    .background(
                        RoundedRectangle(cornerRadius: 5)
                            .fill((isProfit ? DashboardPalette.profitGreen : DashboardPalette.lossRed).opacity(0.10))
                    )
            } else {
                Color.clear
            }
            
            VStack(spacing: 2) {
                Text("\(cell.dayNumber)")
                    .font(.system(size: 13, weight: isTraded ? .bold : .medium))
                    .foregroundColor(cell.isCurrentMonth ? (isTraded ? (isProfit ? DashboardPalette.profitGreen : DashboardPalette.lossRed) : DashboardPalette.textPrimaryDark.opacity(0.85)) : DashboardPalette.textMutedDark.opacity(0.35))
                
                if isTraded {
                    Text(DashboardNumberFormatter.formatCompactCalendarRupee(pnl))
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundColor(isProfit ? DashboardPalette.profitGreen : DashboardPalette.lossRed)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
            }
            .padding(.vertical, 3)
        }
        .frame(maxWidth: .infinity, minHeight: 32)
        .help(cell.isCurrentMonth && isTraded ? "\(cell.dayItem?.date ?? ""): \(DashboardNumberFormatter.formatRupeeInteger(pnl, includeSign: true, isPrivacyMode: isPrivacyMode)) (\(cell.dayItem?.tradeCount ?? 0) trades)" : "")
    }
    
    // Cell Generator for 7 columns (Sun to Sat)
    private struct MiniCalendarCell: Identifiable {
        let id: String
        let dayNumber: Int
        let isCurrentMonth: Bool
        let dayItem: CalendarDayItem?
    }
    
    private func generateCells(for year: Int, month: Int) -> [MiniCalendarCell] {
        var cal = Calendar(identifier: .gregorian)
        cal.firstWeekday = 1 // 1 = Sunday
        
        var comps = DateComponents()
        comps.year = year
        comps.month = month
        comps.day = 1
        guard let firstDate = cal.date(from: comps) else { return [] }
        
        let weekday = cal.component(.weekday, from: firstDate) // 1 (Sun) to 7 (Sat)
        let leadingDays = weekday - 1
        
        guard let range = cal.range(of: .day, in: .month, for: firstDate) else { return [] }
        let daysInMonth = range.count
        
        var prevComps = DateComponents()
        prevComps.year = month == 1 ? year - 1 : year
        prevComps.month = month == 1 ? 12 : month - 1
        let prevDate = cal.date(from: prevComps) ?? firstDate
        let prevDaysCount = cal.range(of: .day, in: .month, for: prevDate)?.count ?? 30
        
        var result: [MiniCalendarCell] = []
        
        if leadingDays > 0 {
            for i in (0..<leadingDays).reversed() {
                let dayNum = prevDaysCount - i
                result.append(MiniCalendarCell(id: "prev-\(dayNum)", dayNumber: dayNum, isCurrentMonth: false, dayItem: nil))
            }
        }
        
        for day in 1...daysInMonth {
            let matchedItem = calendarResponse?.days.first(where: { $0.day == day })
            result.append(MiniCalendarCell(id: "cur-\(day)", dayNumber: day, isCurrentMonth: true, dayItem: matchedItem))
        }
        
        var nextDay = 1
        while result.count < 35 {
            result.append(MiniCalendarCell(id: "next-\(nextDay)", dayNumber: nextDay, isCurrentMonth: false, dayItem: nil))
            nextDay += 1
        }
        
        return result
    }
}

// =============================================================================
// MARK: - Row 4, Column 1: Monthly P&L Bar Chart Card
// =============================================================================
private struct MonthlyPnlChartCard: View {
    let year: String
    let months: [MonthlyPnlPoint]
    let isPrivacyMode: Bool
    
    @State private var hoveredMonth: MonthlyPnlPoint? = nil
    @State private var hoverLocation: CGPoint = .zero
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header
            HStack {
                Text("Monthly P&L")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(DashboardPalette.textPrimaryDark)
                
                Spacer()
                
                Text(year)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(
                        RoundedRectangle(cornerRadius: 5)
                            .fill(DashboardPalette.badgeBackgroundDark)
                    )
            }
            
            Chart {
                ForEach(months) { pt in
                    let pnl = pt.calculatedPnl
                    BarMark(
                        x: .value("Month", pt.month),
                        y: .value("P&L", pnl)
                    )
                    .foregroundStyle(pnl >= 0 ? DashboardPalette.profitGreen : DashboardPalette.lossRed)
                    .cornerRadius(2)
                }
                
                RuleMark(y: .value("Zero", 0))
                    .foregroundStyle(DashboardPalette.borderDark)
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
                
                if let hovered = hoveredMonth {
                    RuleMark(x: .value("HoverMonth", hovered.month))
                        .foregroundStyle(Color.white.opacity(0.85))
                        .lineStyle(StrokeStyle(lineWidth: 2))
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { value in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [2, 2]))
                        .foregroundStyle(DashboardPalette.borderDark)
                    AxisValueLabel {
                        if let doubleVal = value.as(Double.self) {
                            Text(DashboardNumberFormatter.formatAbbreviatedRupee(doubleVal))
                                .font(.system(size: 11, weight: .medium, design: .monospaced))
                                .foregroundColor(DashboardPalette.textSecondaryDark)
                        }
                    }
                }
            }
            .chartXAxis {
                AxisMarks { value in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [2, 2]))
                        .foregroundStyle(DashboardPalette.borderDark.opacity(0.3))
                    AxisValueLabel {
                        if let monthStr = value.as(String.self) {
                            Text(monthStr)
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(DashboardPalette.textSecondaryDark)
                        }
                    }
                }
            }
            .chartOverlay { proxy in
                GeometryReader { geo in
                    ZStack(alignment: .topLeading) {
                        Rectangle()
                            .fill(Color.clear)
                            .contentShape(Rectangle())
                            .onContinuousHover { phase in
                                switch phase {
                                case .active(let location):
                                    guard let plotFrame = proxy.plotFrame else { return }
                                    let frame = geo[plotFrame]
                                    if frame.contains(location) {
                                        let plotX = location.x - frame.origin.x
                                        let plotWidth = frame.size.width
                                        guard plotWidth > 0, !months.isEmpty else { return }
                                        let normalizedX = max(0, min(0.999, plotX / plotWidth))
                                        let index = Int(normalizedX * CGFloat(months.count))
                                        let clampedIndex = max(0, min(months.count - 1, index))
                                        hoveredMonth = months[clampedIndex]
                                        hoverLocation = location
                                    } else {
                                        hoveredMonth = nil
                                    }
                                case .ended:
                                    hoveredMonth = nil
                                }
                            }
                        
                        if let hovered = hoveredMonth, let plotFrame = proxy.plotFrame {
                            let frame = geo[plotFrame]
                            let tooltipWidth: CGFloat = 160
                            let anchorX: CGFloat = {
                                if let posX = proxy.position(forX: hovered.month) {
                                    return frame.origin.x + posX
                                }
                                return hoverLocation.x
                            }()
                            let isRightSide = anchorX > frame.midX
                            let cx: CGFloat = isRightSide
                                ? max(frame.minX + tooltipWidth / 2 + 6, anchorX - 12 - tooltipWidth / 2)
                                : min(frame.maxX - tooltipWidth / 2 - 6, anchorX + 12 + tooltipWidth / 2)
                            let cy: CGFloat = min(max(frame.minY + 45, hoverLocation.y), frame.maxY - 45)
                            
                            MonthlyPnlTooltipView(point: hovered, year: year, isPrivacyMode: isPrivacyMode)
                                .frame(width: tooltipWidth)
                                .position(x: cx, y: cy)
                                .allowsHitTesting(false)
                                .transition(.opacity.animation(.easeInOut(duration: 0.12)))
                        }
                    }
                }
            }
            .frame(height: 220)
        }
        .padding(16)
        .dashboardCard()
    }
}

// MARK: - Monthly P&L Hover Tooltip
private struct MonthlyPnlTooltipView: View {
    let point: MonthlyPnlPoint
    let year: String
    let isPrivacyMode: Bool
    
    var body: some View {
        let pnl = point.calculatedPnl
        let isProfit = pnl >= 0
        
        VStack(alignment: .leading, spacing: 4) {
            // Line 1: Month Year (e.g. Feb 2024)
            Text("\(point.month) \(year)")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(DashboardPalette.textSecondaryDark)
            
            // Line 2: Net: ₹...
            HStack(spacing: 4) {
                Text("Net:")
                    .font(.system(size: 13, weight: .bold))
                
                Text(DashboardNumberFormatter.formatRupeeInteger(pnl, includeSign: false, isPrivacyMode: isPrivacyMode))
                    .font(.system(size: 13, weight: .bold, design: .monospaced))
            }
            .foregroundColor(isProfit ? DashboardPalette.profitGreen : DashboardPalette.lossRed)
            
            // Line 3: Trades: count
            Text("Trades: \(point.tradesCount ?? 0)")
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(DashboardPalette.textSecondaryDark)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(Color(red: 22/255, green: 32/255, blue: 51/255))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(DashboardPalette.borderDark, lineWidth: 1)
                )
                .shadow(color: Color.black.opacity(0.4), radius: 8, x: 0, y: 4)
        )
    }
}

// =============================================================================
// MARK: - Row 4, Column 2: Index-wise Performance Donut Chart Card
// =============================================================================
private struct IndexPerformanceDonutCard: View {
    let container: IndexPerformanceContainer?
    let defaultTotalPnl: Double
    let isPrivacyMode: Bool
    
    private var items: [IndexPerformanceItem] {
        if let existing = container?.items, !existing.isEmpty {
            return existing
        }
        return [
            IndexPerformanceItem(name: "SENSEX", netPnl: -6200, trades: 10, winRate: 30.0, percentage: 1.6, color: "#8B5CF6"),
            IndexPerformanceItem(name: "TITAN", netPnl: 0, trades: 0, winRate: 0, percentage: 0.0, color: "#06B6D4"),
            IndexPerformanceItem(name: "TCS", netPnl: 0, trades: 0, winRate: 0, percentage: 0.0, color: "#EC4899"),
            IndexPerformanceItem(name: "MIDCPNIFTY", netPnl: 0, trades: 0, winRate: 0, percentage: 0.0, color: "#EAB308"),
            IndexPerformanceItem(name: "FINNIFTY", netPnl: -1900, trades: 4, winRate: 25.0, percentage: 0.5, color: "#10B981"),
            IndexPerformanceItem(name: "NIFTY", netPnl: -26400, trades: 18, winRate: 38.0, percentage: 6.8, color: "#3B82F6"),
            IndexPerformanceItem(name: "BANKNIFTY", netPnl: 0, trades: 0, winRate: 0, percentage: 0.0, color: "#F97316")
        ]
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header
            HStack {
                Text("Index-wise Performance")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(DashboardPalette.textPrimaryDark)
                
                Spacer()
                
                Text("This Month")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(
                        RoundedRectangle(cornerRadius: 5)
                            .fill(DashboardPalette.badgeBackgroundDark)
                    )
            }
            
            // Donut Ring Chart with Center Text
            let totalPnl = container?.totalNetPnl ?? defaultTotalPnl
            DonutRingWidget(
                slices: buildSlices(from: items),
                centerTop: "TOTAL",
                centerBottom: DashboardNumberFormatter.formatRupeeInteger(totalPnl, includeSign: true, isPrivacyMode: isPrivacyMode),
                bottomColor: totalPnl >= 0 ? DashboardPalette.profitGreen : DashboardPalette.lossRed,
                ringWidth: 16
            )
            .frame(height: 130)
            
            // 3-Column Legend below
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 3), spacing: 8) {
                ForEach(items) { item in
                    HStack(spacing: 5) {
                        Circle()
                            .fill(Color(hex: item.color ?? "#3B82F6"))
                            .frame(width: 8, height: 8)
                        
                        Text(item.name)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(DashboardPalette.textSecondaryDark)
                            .lineLimit(1)
                        
                        Spacer()
                        
                        Text("\(String(format: "%.1f", item.calculatedPercentage))%")
                            .font(.system(size: 12, weight: .bold, design: .monospaced))
                            .foregroundColor(DashboardPalette.textPrimaryDark)
                    }
                }
            }
            .padding(.top, 4)
        }
        .padding(16)
        .dashboardCard()
    }
    
    private func buildSlices(from items: [IndexPerformanceItem]) -> [DonutSlice] {
        let totalPct = items.reduce(0.0) { $0 + max(0, $1.calculatedPercentage) }
        guard totalPct > 0 else {
            return [
                DonutSlice(id: "1", start: 0, end: 0.7, color: DashboardPalette.purple),
                DonutSlice(id: "2", start: 0.7, end: 0.95, color: DashboardPalette.accentBlue),
                DonutSlice(id: "3", start: 0.95, end: 1.0, color: DashboardPalette.profitGreen)
            ]
        }
        
        var current: Double = 0.0
        var slices: [DonutSlice] = []
        for item in items where item.calculatedPercentage > 0 {
            let fraction = item.calculatedPercentage / totalPct
            let end = min(1.0, current + fraction)
            slices.append(DonutSlice(id: item.name, start: current, end: end, color: Color(hex: item.color ?? "#3B82F6")))
            current = end
        }
        return slices.isEmpty ? [DonutSlice(id: "default", start: 0, end: 1.0, color: DashboardPalette.purple)] : slices
    }
}

// =============================================================================
// MARK: - Row 4, Column 3: CE vs PE Performance Donut Chart Card
// =============================================================================
private struct CePePerformanceDonutCard: View {
    let container: CePePerformanceContainer?
    let defaultTotalPnl: Double
    let isPrivacyMode: Bool
    
    private var items: [CePePerformanceItem] {
        if let existing = container?.items, !existing.isEmpty {
            return existing
        }
        return [
            CePePerformanceItem(name: "CE", netPnl: -45700, trades: 120, winRate: 48.0, percentage: 11.8, color: "#10B981"),
            CePePerformanceItem(name: "PE", netPnl: -7400, trades: 35, winRate: 34.0, percentage: 1.9, color: "#FF6448"),
            CePePerformanceItem(name: "Both", netPnl: 0, trades: 0, winRate: 0, percentage: 0.0, color: "#FF8A65")
        ]
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header
            HStack {
                Text("CE vs PE Performance")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(DashboardPalette.textPrimaryDark)
                
                Spacer()
                
                Text("This Month")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(
                        RoundedRectangle(cornerRadius: 5)
                            .fill(DashboardPalette.badgeBackgroundDark)
                    )
            }
            
            // Donut Ring Chart with Center Text
            let totalPnl = container?.totalNetPnl ?? defaultTotalPnl
            DonutRingWidget(
                slices: buildSlices(from: items),
                centerTop: "TOTAL",
                centerBottom: DashboardNumberFormatter.formatRupeeInteger(totalPnl, includeSign: true, isPrivacyMode: isPrivacyMode),
                bottomColor: totalPnl >= 0 ? DashboardPalette.profitGreen : DashboardPalette.lossRed,
                ringWidth: 16
            )
            .frame(height: 130)
            
            // Horizontal Legend below: CE | PE | Both
            HStack(spacing: 20) {
                Spacer()
                ForEach(items) { item in
                    let color = item.name == "CE" ? DashboardPalette.profitGreen : (item.name == "PE" ? DashboardPalette.lossRed : DashboardPalette.warmAmber)
                    HStack(spacing: 5) {
                        Circle()
                            .fill(color)
                            .frame(width: 8, height: 8)
                        
                        Text(item.name)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(DashboardPalette.textSecondaryDark)
                        
                        Text("\(String(format: "%.1f", item.calculatedPercentage))%")
                            .font(.system(size: 12, weight: .bold, design: .monospaced))
                            .foregroundColor(DashboardPalette.textPrimaryDark)
                    }
                }
                Spacer()
            }
            .padding(.top, 4)
        }
        .padding(16)
        .dashboardCard()
    }
    
    private func buildSlices(from items: [CePePerformanceItem]) -> [DonutSlice] {
        let totalPct = items.reduce(0.0) { $0 + max(0, $1.calculatedPercentage) }
        guard totalPct > 0 else {
            return [
                DonutSlice(id: "CE", start: 0, end: 0.85, color: DashboardPalette.profitGreen),
                DonutSlice(id: "PE", start: 0.85, end: 1.0, color: DashboardPalette.lossRed)
            ]
        }
        
        var current: Double = 0.0
        var slices: [DonutSlice] = []
        for item in items where item.calculatedPercentage > 0 {
            let fraction = item.calculatedPercentage / totalPct
            let end = min(1.0, current + fraction)
            let color = item.name == "CE" ? DashboardPalette.profitGreen : (item.name == "PE" ? DashboardPalette.lossRed : DashboardPalette.warmAmber)
            slices.append(DonutSlice(id: item.name, start: current, end: end, color: color))
            current = end
        }
        return slices.isEmpty ? [DonutSlice(id: "CE", start: 0, end: 1.0, color: DashboardPalette.profitGreen)] : slices
    }
}

// =============================================================================
// MARK: - Generic Donut Ring Chart Primitive
// =============================================================================
public struct DonutSlice: Identifiable {
    public let id: String
    public let start: Double
    public let end: Double
    public let color: Color
}

public struct DonutRingWidget: View {
    public let slices: [DonutSlice]
    public let centerTop: String
    public let centerBottom: String
    public let bottomColor: Color
    public var ringWidth: CGFloat = 16
    
    public var body: some View {
        ZStack {
            // Slices
            ForEach(slices) { slice in
                Circle()
                    .trim(from: slice.start, to: slice.end)
                    .stroke(slice.color, style: StrokeStyle(lineWidth: ringWidth, lineCap: .butt))
                    .rotationEffect(.degrees(-90))
            }
            
            // Center Labels
            VStack(spacing: 3) {
                Text(centerTop)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                    .tracking(1.0)
                
                Text(centerBottom)
                    .font(.system(size: 15, weight: .bold, design: .monospaced))
                    .foregroundColor(bottomColor)
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
            }
        }
        .frame(width: 130, height: 130)
        .frame(maxWidth: .infinity, alignment: .center)
    }
}

// =============================================================================
// MARK: - Row 5, Column 1: Strategy Performance Card
// =============================================================================
private struct StrategyPerformanceCard: View {
    let strategies: [StrategyPerformanceItem]
    let isPrivacyMode: Bool
    let onViewAll: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header
            HStack {
                Text("Strategy Performance")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(DashboardPalette.textPrimaryDark)
                
                Spacer()
                
                Text("This Month")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(
                        RoundedRectangle(cornerRadius: 5)
                            .fill(DashboardPalette.badgeBackgroundDark)
                    )
            }
            
            // Compact Table Headers
            HStack {
                Text("Strategy")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                    .frame(maxWidth: .infinity, alignment: .leading)
                
                Text("Trades")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                    .frame(width: 55, alignment: .trailing)
                
                Text("Win Rate")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                    .frame(width: 65, alignment: .trailing)
                
                Text("Net P&L")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                    .frame(width: 100, alignment: .trailing)
            }
            .padding(.bottom, 2)
            
            Divider()
                .background(DashboardPalette.borderDark)
            
            // Table Rows
            VStack(spacing: 10) {
                ForEach(strategies.prefix(5)) { item in
                    let net = item.netPnl ?? 0.0
                    HStack {
                        Text(item.strategy)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(DashboardPalette.textPrimaryDark)
                            .lineLimit(1)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        
                        Text("\(item.totalTrades)")
                            .font(.system(size: 13, weight: .medium, design: .monospaced))
                            .foregroundColor(DashboardPalette.textPrimaryDark)
                            .frame(width: 55, alignment: .trailing)
                        
                        Text("\(String(format: "%.1f", item.winRate ?? 0))%")
                            .font(.system(size: 13, weight: .medium, design: .monospaced))
                            .foregroundColor(DashboardPalette.textPrimaryDark)
                            .frame(width: 65, alignment: .trailing)
                        
                        Text(DashboardNumberFormatter.formatRupeeInteger(net, includeSign: true, isPrivacyMode: isPrivacyMode))
                            .font(.system(size: 13, weight: .bold, design: .monospaced))
                            .foregroundColor(net >= 0 ? DashboardPalette.profitGreen : DashboardPalette.lossRed)
                            .frame(width: 100, alignment: .trailing)
                            .lineLimit(1)
                    }
                }
            }
            
            Spacer(minLength: 8)
            
            // Bottom Action Link
            Button(action: onViewAll) {
                HStack(spacing: 4) {
                    Spacer()
                    Text("Full Strategy Analysis →")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(DashboardPalette.accentBlue)
                }
            }
            .buttonStyle(.plain)
        }
        .padding(16)
        .dashboardCard()
    }
}

// =============================================================================
// MARK: - Row 5, Column 2: Risk Management Card
// =============================================================================
private struct RiskManagementDashboardCard: View {
    let riskSummary: RiskSummaryDashboard
    let account: DashboardStats?
    let isPrivacyMode: Bool
    let onViewDashboard: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header
            HStack {
                Text("Risk Management")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(DashboardPalette.textPrimaryDark)
                
                Spacer()
                
                Image(systemName: "shield")
                    .font(.system(size: 14))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
            }
            
            // 1. Daily Loss Limit
            let lossLimit = riskSummary.dailyLossLimit ?? 25000.0
            let usedLoss = riskSummary.dailyCurrentLoss ?? 0.0
            let lossProgress = lossLimit > 0 ? min(1.0, usedLoss / lossLimit) : 0.0
            VStack(spacing: 4) {
                HStack {
                    HStack(spacing: 5) {
                        Circle().fill(DashboardPalette.lossRed).frame(width: 6, height: 6)
                        Text("Daily Loss Limit")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(DashboardPalette.textSecondaryDark)
                    }
                    Spacer()
                    Text(DashboardNumberFormatter.formatRupeeInteger(lossLimit, includeSign: false, isPrivacyMode: isPrivacyMode))
                        .font(.system(size: 14, weight: .bold, design: .monospaced))
                        .foregroundColor(DashboardPalette.textPrimaryDark)
                }
                
                // Track
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(DashboardPalette.badgeBackgroundDark)
                            .frame(height: 5)
                        
                        RoundedRectangle(cornerRadius: 3)
                            .fill(DashboardPalette.lossRed)
                            .frame(width: max(0, geo.size.width * CGFloat(lossProgress)), height: 5)
                    }
                }
                .frame(height: 5)
                
                HStack {
                    Text("Used: \(DashboardNumberFormatter.formatRupeeInteger(usedLoss, includeSign: false, isPrivacyMode: isPrivacyMode))")
                        .font(.system(size: 11))
                        .foregroundColor(DashboardPalette.textMutedDark)
                    Spacer()
                    Text("Max: \(DashboardNumberFormatter.formatRupeeInteger(lossLimit, includeSign: false, isPrivacyMode: isPrivacyMode))")
                        .font(.system(size: 11))
                        .foregroundColor(DashboardPalette.textMutedDark)
                }
            }
            
            // 2. Daily Profit Target
            let profitTarget = riskSummary.dailyProfitTarget ?? 20000.0
            let currentProfit = riskSummary.dailyCurrentProfit ?? 0.0
            let profitProgress = profitTarget > 0 ? min(1.0, currentProfit / profitTarget) : 0.0
            VStack(spacing: 4) {
                HStack {
                    HStack(spacing: 5) {
                        Circle().fill(DashboardPalette.profitGreen).frame(width: 6, height: 6)
                        Text("Daily Profit Target")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(DashboardPalette.textSecondaryDark)
                    }
                    Spacer()
                    Text(DashboardNumberFormatter.formatRupeeInteger(profitTarget, includeSign: false, isPrivacyMode: isPrivacyMode))
                        .font(.system(size: 14, weight: .bold, design: .monospaced))
                        .foregroundColor(DashboardPalette.textPrimaryDark)
                }
                
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(DashboardPalette.badgeBackgroundDark)
                            .frame(height: 5)
                        
                        RoundedRectangle(cornerRadius: 3)
                            .fill(DashboardPalette.profitGreen)
                            .frame(width: max(0, geo.size.width * CGFloat(profitProgress)), height: 5)
                    }
                }
                .frame(height: 5)
                
                HStack {
                    Text("Current: \(DashboardNumberFormatter.formatRupeeInteger(currentProfit, includeSign: false, isPrivacyMode: isPrivacyMode))")
                        .font(.system(size: 11))
                        .foregroundColor(DashboardPalette.textMutedDark)
                    Spacer()
                    Text("Target: \(DashboardNumberFormatter.formatRupeeInteger(profitTarget, includeSign: false, isPrivacyMode: isPrivacyMode))")
                        .font(.system(size: 11))
                        .foregroundColor(DashboardPalette.textMutedDark)
                }
            }
            
            // 3. Max Drawdown
            let ddLimit = riskSummary.maxDrawdownLimit ?? 50000.0
            let currentDd = riskSummary.currentDrawdown ?? 400628.0
            let ddExceeded = currentDd >= ddLimit
            VStack(spacing: 4) {
                HStack {
                    HStack(spacing: 5) {
                        Circle().fill(DashboardPalette.lossRed).frame(width: 6, height: 6)
                        Text("Max Drawdown")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(DashboardPalette.textSecondaryDark)
                    }
                    Spacer()
                    Text(DashboardNumberFormatter.formatRupeeInteger(ddLimit, includeSign: false, isPrivacyMode: isPrivacyMode))
                        .font(.system(size: 14, weight: .bold, design: .monospaced))
                        .foregroundColor(DashboardPalette.textPrimaryDark)
                }
                
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(DashboardPalette.badgeBackgroundDark)
                            .frame(height: 5)
                        
                        RoundedRectangle(cornerRadius: 3)
                            .fill(DashboardPalette.lossRed)
                            .frame(width: ddExceeded ? geo.size.width : max(0, geo.size.width * CGFloat(currentDd / max(1, ddLimit))), height: 5)
                    }
                }
                .frame(height: 5)
                
                HStack {
                    Text("Drawdown: \(DashboardNumberFormatter.formatRupeeInteger(currentDd, includeSign: false, isPrivacyMode: isPrivacyMode))")
                        .font(.system(size: 11))
                        .foregroundColor(DashboardPalette.textMutedDark)
                    Spacer()
                    Text("Threshold: \(DashboardNumberFormatter.formatRupeeInteger(ddLimit, includeSign: false, isPrivacyMode: isPrivacyMode))")
                        .font(.system(size: 11))
                        .foregroundColor(DashboardPalette.textMutedDark)
                }
            }
            
            // Two Bottom Boxes: Consecutive Loss Days / Consecutive Win Days
            HStack(spacing: 10) {
                VStack(spacing: 4) {
                    Text("Consecutive Loss Days")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(DashboardPalette.textSecondaryDark)
                    
                    Text("\(riskSummary.consecutiveLossDays ?? 0)")
                        .font(.system(size: 22, weight: .bold, design: .monospaced))
                        .foregroundColor(DashboardPalette.lossRed)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(DashboardPalette.badgeBackgroundDark)
                .clipShape(RoundedRectangle(cornerRadius: 6))
                
                VStack(spacing: 4) {
                    Text("Consecutive Win Days")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(DashboardPalette.textSecondaryDark)
                    
                    Text("\(riskSummary.consecutiveWinDays ?? 1)")
                        .font(.system(size: 22, weight: .bold, design: .monospaced))
                        .foregroundColor(DashboardPalette.profitGreen)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(DashboardPalette.badgeBackgroundDark)
                .clipShape(RoundedRectangle(cornerRadius: 6))
            }
            
            // Bottom Action Link
            Button(action: onViewDashboard) {
                HStack(spacing: 4) {
                    Spacer()
                    Text("Detailed Risk Dashboard →")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(DashboardPalette.accentBlue)
                }
            }
            .buttonStyle(.plain)
        }
        .padding(16)
        .dashboardCard()
    }
}

// =============================================================================
// MARK: - Row 5, Column 3: Recent Trades Card
// =============================================================================
private struct RecentTradesDashboardCard: View {
    let trades: [RecentTradeItem]
    let isPrivacyMode: Bool
    let onViewAll: () -> Void
    let onLogNewTrade: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header with View All
            HStack {
                Text("Recent Trades")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(DashboardPalette.textPrimaryDark)
                
                Spacer()
                
                Button(action: onViewAll) {
                    Text("View All")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(DashboardPalette.accentBlue)
                }
                .buttonStyle(.plain)
            }
            
            // Compact Column Headers
            HStack {
                Text("Date")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                    .frame(width: 85, alignment: .leading)
                
                Text("Index")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                    .frame(width: 65, alignment: .leading)
                
                Text("Type")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                    .frame(width: 55, alignment: .leading)
                
                Text("CE/PE")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                    .frame(width: 42, alignment: .center)
                
                Text("Lots")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                    .frame(width: 32, alignment: .trailing)
                
                Text("Net P&L")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }
            .padding(.bottom, 2)
            
            Divider()
                .background(DashboardPalette.borderDark)
            
            // Trade Rows (5 items)
            VStack(spacing: 8) {
                ForEach(trades.prefix(5)) { trade in
                    let net = trade.calculatedNetPnl
                    HStack {
                        Text(trade.displayDate ?? trade.tradeDate)
                            .font(.system(size: 12, design: .monospaced))
                            .foregroundColor(DashboardPalette.textSecondaryDark)
                            .frame(width: 85, alignment: .leading)
                            .lineLimit(1)
                        
                        Text(trade.indexName)
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(DashboardPalette.textPrimaryDark)
                            .frame(width: 65, alignment: .leading)
                            .lineLimit(1)
                        
                        Text(trade.tradingType)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(DashboardPalette.textMutedDark)
                            .frame(width: 55, alignment: .leading)
                            .lineLimit(1)
                        
                        // CE / PE pill badge
                        let isCe = trade.optionType.uppercased() == "CE"
                        Text(trade.optionType.uppercased())
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(isCe ? DashboardPalette.profitGreen : DashboardPalette.lossRed)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(
                                RoundedRectangle(cornerRadius: 4)
                                    .fill((isCe ? DashboardPalette.profitGreen : DashboardPalette.lossRed).opacity(0.14))
                            )
                            .frame(width: 42, alignment: .center)
                        
                        Text("\(trade.lots ?? 1)")
                            .font(.system(size: 12, design: .monospaced))
                            .foregroundColor(DashboardPalette.textPrimaryDark)
                            .frame(width: 32, alignment: .trailing)
                        
                        Text(DashboardNumberFormatter.formatRupeeInteger(net, includeSign: true, isPrivacyMode: isPrivacyMode))
                            .font(.system(size: 12, weight: .bold, design: .monospaced))
                            .foregroundColor(net >= 0 ? DashboardPalette.profitGreen : DashboardPalette.lossRed)
                            .frame(maxWidth: .infinity, alignment: .trailing)
                    }
                }
            }
            
            Spacer(minLength: 6)
            
            // Bottom Action Button: + Log New Trade
            Button(action: onLogNewTrade) {
                HStack(spacing: 5) {
                    Image(systemName: "plus")
                        .font(.system(size: 11, weight: .bold))
                    Text("Log New Trade")
                        .font(.system(size: 13, weight: .bold))
                }
                .foregroundColor(DashboardPalette.accentBlue)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(DashboardPalette.accentBlue.opacity(0.5), lineWidth: 1)
                        .background(DashboardPalette.accentBlue.opacity(0.06))
                )
            }
            .buttonStyle(.plain)
        }
        .padding(16)
        .dashboardCard()
    }
}

// MARK: - Color Extension Helper for Hex
public extension Color {
    init(hex: String) {
        let cleanHex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: cleanHex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch cleanHex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 100, 116, 139)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255.0,
            green: Double(g) / 255.0,
            blue: Double(b) / 255.0,
            opacity: Double(a) / 255.0
        )
    }
}
