import SwiftUI
import Charts

public struct EquityCurveView: View {
    @Environment(\.colorScheme) private var colorScheme
    @StateObject private var viewModel = EquityCurveViewModel()
    @State private var hoveredDate: String? = nil
    
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
                    ProgressView("Calculating equity trajectory...")
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
                    Text("Failed to load equity data")
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
            } else if viewModel.points.isEmpty {
                VStack(spacing: 12) {
                    Spacer()
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .font(.system(size: 36))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Text("No Equity Data Available")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    Text("Execute trades to view your cumulative equity curve and drawdown metrics.")
                        .font(.system(size: 12))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(spacing: 16) {
                        // Summary KPI Metrics
                        kpiSummaryRow
                        
                        // Main Chart Card
                        chartCard
                        
                        // Drawdown Breakdown Card
                        drawdownCard
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
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 8) {
                    Text("Equity Curve")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    
                    Text("\(viewModel.points.count) data points")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(KiteTheme.surface(for: colorScheme))
                        .cornerRadius(4)
                }
                
                Text("Cumulative net portfolio gains with high-water mark overlay and drawdown analysis")
                    .font(.system(size: 12))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
            
            Spacer()
            
            // Timeframe Selector
            Picker("Timeframe", selection: $viewModel.selectedTimeframe) {
                Text("All Time").tag("all")
                Text("Today").tag("today")
                Text("This Week").tag("week")
                Text("This Month").tag("month")
            }
            .pickerStyle(.segmented)
            .frame(width: 280)
            .onChange(of: viewModel.selectedTimeframe) { newValue in
                viewModel.setTimeframe(newValue)
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
            .help("Refresh Equity Curve")
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
    }
    
    // MARK: - KPI Summary Row
    private var kpiSummaryRow: some View {
        HStack(spacing: 12) {
            // Net Cumulative P&L
            let netPnl = viewModel.currentNetPnl
            let isProfit = netPnl >= 0
            kpiCard(
                title: "Cumulative P&L",
                value: formatCurrency(netPnl),
                valueColor: isProfit ? KiteTheme.profitGreen : KiteTheme.lossRed,
                subtitle: isProfit ? "+Profitable" : "-Drawdown",
                icon: isProfit ? "arrow.up.right" : "arrow.down.right"
            )
            
            // Peak Portfolio High-Water Mark
            kpiCard(
                title: "Peak Value (HWM)",
                value: formatCurrency(viewModel.peakPnl),
                valueColor: KiteTheme.brandBlue,
                subtitle: "Highest Portfolio P&L",
                icon: "mountain.2"
            )
            
            // Max Drawdown
            kpiCard(
                title: "Max Drawdown",
                value: formatCurrency(viewModel.maxDrawdown),
                valueColor: viewModel.maxDrawdown > 0 ? KiteTheme.lossRed : KiteTheme.textPrimary(for: colorScheme),
                subtitle: "Peak to trough decline",
                icon: "arrow.down.to.line"
            )
            
            // Current Drawdown from Peak
            let currentDd = max(0, viewModel.peakPnl - viewModel.currentNetPnl)
            kpiCard(
                title: "Current Drawdown",
                value: formatCurrency(currentDd),
                valueColor: currentDd > 0 ? KiteTheme.lossRed : KiteTheme.profitGreen,
                subtitle: currentDd > 0 ? "Below High-Water Mark" : "At All-Time High",
                icon: "shield.slash"
            )
        }
    }
    
    private func kpiCard(title: String, value: String, valueColor: Color, subtitle: String, icon: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(title.uppercased())
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                Spacer()
                Image(systemName: icon)
                    .font(.system(size: 11))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
            
            Text(value)
                .font(.system(size: 18, weight: .bold, design: .monospaced))
                .foregroundColor(valueColor)
            
            Text(subtitle)
                .font(.system(size: 11))
                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(KiteTheme.surface(for: colorScheme))
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
        )
    }
    
    // MARK: - Main Chart Card
    private var chartCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Cumulative P&L vs Peak High-Water Mark")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    Text("Solid line: Cumulative P&L | Dotted line: Peak High-Water Mark")
                        .font(.system(size: 11))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                }
                
                Spacer()
                
                if let hovered = selectedHoverPoint {
                    HStack(spacing: 12) {
                        Text(hovered.displayDate ?? hovered.date)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        
                        Text("P&L: \(formatCurrency(hovered.cumulativePnl ?? 0))")
                            .font(.system(size: 12, weight: .bold, design: .monospaced))
                            .foregroundColor((hovered.cumulativePnl ?? 0) >= 0 ? KiteTheme.profitGreen : KiteTheme.lossRed)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(KiteTheme.canvas(for: colorScheme))
                    .cornerRadius(4)
                }
            }
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            Chart {
                ForEach(viewModel.points) { pt in
                    // Area under cumulative P&L
                    AreaMark(
                        x: .value("Date", pt.displayDate ?? pt.date),
                        y: .value("Cumulative P&L", pt.cumulativePnl ?? 0)
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [
                                KiteTheme.brandBlue.opacity(0.25),
                                KiteTheme.brandBlue.opacity(0.0)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    
                    // Cumulative P&L Line
                    LineMark(
                        x: .value("Date", pt.displayDate ?? pt.date),
                        y: .value("Cumulative P&L", pt.cumulativePnl ?? 0)
                    )
                    .foregroundStyle(KiteTheme.brandBlue)
                    .lineStyle(StrokeStyle(lineWidth: 2))
                    
                    // High-water mark line
                    if let peak = pt.peak {
                        LineMark(
                            x: .value("Date", pt.displayDate ?? pt.date),
                            y: .value("Peak", peak)
                        )
                        .foregroundStyle(KiteTheme.brandOrange.opacity(0.65))
                        .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [4, 4]))
                    }
                }
                
                // Zero baseline
                RuleMark(y: .value("Break Even", 0))
                    .foregroundStyle(KiteTheme.border(for: colorScheme))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [2, 2]))
                
                // Hover indicator rule
                if let hovered = selectedHoverPoint {
                    RuleMark(x: .value("Date", hovered.displayDate ?? hovered.date))
                        .foregroundStyle(KiteTheme.textSecondary(for: colorScheme).opacity(0.5))
                        .lineStyle(StrokeStyle(lineWidth: 1))
                }
            }
            .chartXAxis {
                AxisMarks(values: .automatic(desiredCount: 6)) { value in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [2, 2]))
                        .foregroundStyle(KiteTheme.border(for: colorScheme))
                    AxisValueLabel()
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundStyle(KiteTheme.textSecondary(for: colorScheme))
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading, values: .automatic(desiredCount: 6)) { value in
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
            .chartOverlay { proxy in
                GeometryReader { geometry in
                    Rectangle()
                        .fill(Color.clear)
                        .contentShape(Rectangle())
                        .onContinuousHover { phase in
                            switch phase {
                            case .active(let location):
                                let origin = geometry[proxy.plotAreaFrame].origin
                                let xPosition = location.x - origin.x
                                if let dateValue: String = proxy.value(atX: xPosition) {
                                    hoveredDate = dateValue
                                }
                            case .ended:
                                hoveredDate = nil
                            }
                        }
                }
            }
            .frame(height: 280)
        }
        .padding(16)
        .background(KiteTheme.surface(for: colorScheme))
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
        )
    }
    
    // MARK: - Drawdown Breakdown Card
    private var drawdownCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Historical Drawdown (Underwater Chart)")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    Text("Distance from highest portfolio peak over time")
                        .font(.system(size: 11))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                }
                Spacer()
            }
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            Chart {
                ForEach(viewModel.points) { pt in
                    let dd = -(pt.drawdown ?? 0)
                    AreaMark(
                        x: .value("Date", pt.displayDate ?? pt.date),
                        y: .value("Drawdown", dd)
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [
                                KiteTheme.lossRed.opacity(0.0),
                                KiteTheme.lossRed.opacity(0.3)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    
                    LineMark(
                        x: .value("Date", pt.displayDate ?? pt.date),
                        y: .value("Drawdown", dd)
                    )
                    .foregroundStyle(KiteTheme.lossRed.opacity(0.85))
                    .lineStyle(StrokeStyle(lineWidth: 1.5))
                }
                
                RuleMark(y: .value("Peak", 0))
                    .foregroundStyle(KiteTheme.border(for: colorScheme))
            }
            .chartXAxis {
                AxisMarks(values: .automatic(desiredCount: 6)) { value in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [2, 2]))
                        .foregroundStyle(KiteTheme.border(for: colorScheme))
                    AxisValueLabel()
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundStyle(KiteTheme.textSecondary(for: colorScheme))
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading, values: .automatic(desiredCount: 4)) { value in
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
            .frame(height: 140)
        }
        .padding(16)
        .background(KiteTheme.surface(for: colorScheme))
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
        )
    }
    
    // MARK: - Helpers
    private var selectedHoverPoint: EquityPoint? {
        guard let hovered = hoveredDate else { return nil }
        return viewModel.points.first { ($0.displayDate ?? $0.date) == hovered || $0.date == hovered }
    }
    
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
