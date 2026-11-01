import SwiftUI

public struct TradingCalendarView: View {
    @Environment(\.colorScheme) private var colorScheme
    @StateObject private var viewModel = CalendarViewModel()
    
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 7)
    private let weekdayHeaders = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
    
    public init() {}
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header with navigation and monthly metrics
            headerView
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            // Content
            if viewModel.isLoading {
                VStack {
                    Spacer()
                    ProgressView("Loading calendar data...")
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
                    Text("Failed to load calendar")
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
            } else {
                ScrollView {
                    VStack(spacing: 16) {
                        // Month Stats Header Bar
                        monthStatsBar
                        
                        // Calendar Grid Container
                        calendarGridCard
                    }
                    .padding(20)
                }
            }
        }
        .background(KiteTheme.canvas(for: colorScheme))
        .sheet(item: $viewModel.selectedDay) { day in
            DayTradesDetailSheet(day: day)
        }
        .task {
            await viewModel.loadData()
        }
    }
    
    // MARK: - Header
    private var headerView: some View {
        HStack(alignment: .center, spacing: 16) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Trading Calendar")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                Text("Monthly profit/loss distribution and daily performance heatmap")
                    .font(.system(size: 12))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
            
            Spacer()
            
            // Month navigation controls
            HStack(spacing: 8) {
                Button(action: { viewModel.previousMonth() }) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                        .frame(width: 28, height: 28)
                        .background(KiteTheme.surface(for: colorScheme))
                        .overlay(
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
                        )
                }
                .buttonStyle(PlainButtonStyle())
                .help("Previous Month")
                
                Text(viewModel.monthTitle)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    .frame(minWidth: 140, alignment: .center)
                
                Button(action: { viewModel.nextMonth() }) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                        .frame(width: 28, height: 28)
                        .background(KiteTheme.surface(for: colorScheme))
                        .overlay(
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
                        )
                }
                .buttonStyle(PlainButtonStyle())
                .help("Next Month")
                
                Button("Today") {
                    viewModel.goToToday()
                }
                .buttonStyle(KiteSecondaryButtonStyle())
                .padding(.leading, 4)
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
    }
    
    // MARK: - Monthly Stats Bar
    private var monthStatsBar: some View {
        HStack(spacing: 12) {
            if let cal = viewModel.calendarData {
                let net = cal.totalNetPnl ?? 0.0
                let isProfit = net >= 0
                
                statPill(
                    label: "MONTH NET P&L",
                    value: formatCurrency(net),
                    color: isProfit ? KiteTheme.profitGreen : KiteTheme.lossRed
                )
                
                statPill(
                    label: "WIN RATE",
                    value: String(format: "%.1f%%", cal.winRate ?? 0),
                    color: (cal.winRate ?? 0) >= 50 ? KiteTheme.profitGreen : KiteTheme.brandOrange
                )
                
                statPill(
                    label: "TRADING DAYS",
                    value: "\(cal.totalTradingDays) days",
                    color: KiteTheme.textPrimary(for: colorScheme)
                )
                
                statPill(
                    label: "WIN / LOSS DAYS",
                    value: "\(cal.winningDays)W / \(cal.losingDays)L",
                    color: KiteTheme.brandBlue
                )
            }
        }
    }
    
    private func statPill(label: String, value: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 9, weight: .semibold))
                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            Text(value)
                .font(.system(size: 15, weight: .bold, design: .monospaced))
                .foregroundColor(color)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(KiteTheme.surface(for: colorScheme))
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
        )
    }
    
    // MARK: - Calendar Grid Card
    private var calendarGridCard: some View {
        VStack(spacing: 8) {
            // Days of week header
            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(weekdayHeaders, id: \.self) { dayName in
                    Text(dayName)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                }
            }
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            // Days cells
            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(viewModel.gridCells) { cell in
                    calendarCellView(cell)
                }
            }
        }
        .padding(16)
        .background(KiteTheme.surface(for: colorScheme))
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
        )
    }
    
    // MARK: - Cell View
    @ViewBuilder
    private func calendarCellView(_ cell: CalendarGridCell) -> some View {
        if let dayNumber = cell.dayNumber {
            Button(action: {
                if let item = cell.dayItem {
                    viewModel.selectDay(item)
                }
            }) {
                VStack(alignment: .leading, spacing: 6) {
                    // Day header
                    HStack {
                        Text("\(dayNumber)")
                            .font(.system(size: 12, weight: cell.isToday ? .bold : .medium))
                            .foregroundColor(cell.isToday ? KiteTheme.brandBlue : KiteTheme.textPrimary(for: colorScheme))
                            .padding(cell.isToday ? 3 : 0)
                            .background(
                                cell.isToday ? KiteTheme.brandBlue.opacity(0.15) : Color.clear
                            )
                            .cornerRadius(3)
                        
                        Spacer()
                        
                        if let item = cell.dayItem, item.tradeCount > 0 {
                            Text("\(item.tradeCount)t")
                                .font(.system(size: 9, weight: .medium, design: .monospaced))
                                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                .padding(.horizontal, 4)
                                .padding(.vertical, 1)
                                .background(KiteTheme.canvas(for: colorScheme).opacity(0.6))
                                .cornerRadius(3)
                        }
                    }
                    
                    Spacer()
                    
                    // P&L info
                    if let item = cell.dayItem {
                        let net = item.netPnl ?? 0.0
                        let isProfit = net > 0
                        let isLoss = net < 0
                        
                        Text(formatCurrency(net))
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(
                                isProfit ? KiteTheme.profitGreen : (isLoss ? KiteTheme.lossRed : KiteTheme.textSecondary(for: colorScheme))
                            )
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    } else {
                        Text("-")
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme).opacity(0.3))
                    }
                }
                .padding(8)
                .frame(height: 84)
                .frame(maxWidth: .infinity, alignment: .topLeading)
                .background(cellBackgroundColor(for: cell.dayItem))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(
                            cell.isToday ? KiteTheme.brandBlue : KiteTheme.border(for: colorScheme),
                            lineWidth: cell.isToday ? 1.5 : 1
                        )
                )
            }
            .buttonStyle(PlainButtonStyle())
            .disabled(cell.dayItem == nil || (cell.dayItem?.tradeCount ?? 0) == 0)
        } else {
            // Empty placeholder for leading days
            RoundedRectangle(cornerRadius: 6)
                .fill(KiteTheme.canvas(for: colorScheme).opacity(0.4))
                .frame(height: 84)
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(KiteTheme.border(for: colorScheme).opacity(0.3), lineWidth: 1)
                )
        }
    }
    
    private func cellBackgroundColor(for item: CalendarDayItem?) -> Color {
        guard let item = item, item.tradeCount > 0 else {
            return KiteTheme.canvas(for: colorScheme)
        }
        let net = item.netPnl ?? 0.0
        if net > 0 {
            return KiteTheme.profitGreen.opacity(0.10)
        } else if net < 0 {
            return KiteTheme.lossRed.opacity(0.10)
        }
        return KiteTheme.canvas(for: colorScheme)
    }
    
    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "₹"
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: value)) ?? "₹\(value)"
    }
}

// MARK: - Day Trades Detail Sheet
public struct DayTradesDetailSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    let day: CalendarDayItem
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(day.weekday)
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(KiteTheme.brandBlue)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(KiteTheme.brandBlue.opacity(0.15))
                            .cornerRadius(4)
                        
                        Text(day.date)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    }
                    
                    Text("\(day.tradeCount) total trades taken")
                        .font(.system(size: 12))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                }
                
                Spacer()
                
                // Net Day Summary
                let net = day.netPnl ?? 0.0
                VStack(alignment: .trailing, spacing: 2) {
                    Text("DAY NET P&L")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Text(formatCurrency(net))
                        .font(.system(size: 16, weight: .bold, design: .monospaced))
                        .foregroundColor(net >= 0 ? KiteTheme.profitGreen : KiteTheme.lossRed)
                }
                
                Button(action: { dismiss() }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        .frame(width: 24, height: 24)
                        .background(KiteTheme.surface(for: colorScheme))
                        .cornerRadius(12)
                }
                .buttonStyle(PlainButtonStyle())
                .padding(.leading, 12)
            }
            .padding(16)
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            // Charges & Gross metrics row
            HStack(spacing: 12) {
                metricBox(title: "Gross Profit", value: formatCurrency(day.grossProfit ?? 0), color: KiteTheme.profitGreen)
                metricBox(title: "Gross Loss", value: formatCurrency(day.grossLoss ?? 0), color: KiteTheme.lossRed)
                metricBox(title: "Total Charges", value: formatCurrency(day.totalCharges ?? 0), color: KiteTheme.textPrimary(for: colorScheme))
            }
            .padding(16)
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            // Trades List
            if let trades = day.trades, !trades.isEmpty {
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(trades) { trade in
                            tradeRow(trade)
                        }
                    }
                    .padding(16)
                }
            } else {
                VStack(spacing: 8) {
                    Spacer()
                    Text("No individual trade logs recorded for this day.")
                        .font(.system(size: 12))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .frame(width: 640, height: 500)
        .background(KiteTheme.canvas(for: colorScheme))
    }
    
    private func metricBox(title: String, value: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title.uppercased())
                .font(.system(size: 9, weight: .semibold))
                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            Text(value)
                .font(.system(size: 13, weight: .bold, design: .monospaced))
                .foregroundColor(color)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(KiteTheme.surface(for: colorScheme))
        .cornerRadius(4)
        .overlay(
            RoundedRectangle(cornerRadius: 4)
                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
        )
    }
    
    private func tradeRow(_ trade: CalendarDayTrade) -> some View {
        HStack(spacing: 12) {
            // Time & Contract
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(trade.indexName)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    
                    Text(trade.optionType)
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(trade.optionType == "CE" ? KiteTheme.profitGreen : KiteTheme.lossRed)
                        .padding(.horizontal, 4)
                        .padding(.vertical, 1)
                        .background(
                            (trade.optionType == "CE" ? KiteTheme.profitGreen : KiteTheme.lossRed).opacity(0.12)
                        )
                        .cornerRadius(3)
                    
                    if let strike = trade.strikePrice {
                        Text(String(format: "%.0f", strike))
                            .font(.system(size: 12, weight: .semibold, design: .monospaced))
                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    }
                }
                
                HStack(spacing: 6) {
                    if let time = trade.time {
                        Text(time)
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    }
                    Text("•")
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Text(trade.tradingType)
                        .font(.system(size: 11))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    if let strat = trade.strategyName, !strat.isEmpty {
                        Text("•")
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        Text(strat)
                            .font(.system(size: 11))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    }
                }
            }
            
            Spacer()
            
            // Lots & Premiums
            VStack(alignment: .trailing, spacing: 2) {
                Text("\(trade.lots ?? 1) Lots")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                
                HStack(spacing: 4) {
                    Text(formatDecimal(trade.entryPremium ?? 0))
                    Text("→")
                    Text(formatDecimal(trade.exitPremium ?? 0))
                }
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
            
            // Net P&L
            let net = trade.netPnl ?? 0.0
            Text(formatCurrency(net))
                .font(.system(size: 13, weight: .bold, design: .monospaced))
                .foregroundColor(net >= 0 ? KiteTheme.profitGreen : KiteTheme.lossRed)
                .frame(width: 100, alignment: .trailing)
        }
        .padding(12)
        .background(KiteTheme.surface(for: colorScheme))
        .cornerRadius(6)
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
    
    private func formatDecimal(_ value: Double) -> String {
        String(format: "%.2f", value)
    }
}
