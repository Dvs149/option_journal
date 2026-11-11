import SwiftUI
import Charts

public struct TradingCalendarView: View {
    @StateObject private var viewModel = CalendarViewModel()
    @ObservedObject private var preferences = PreferencesManager.shared
    @Environment(\.colorScheme) private var colorScheme
    
    private let calendarColumns = Array(repeating: GridItem(.flexible(), spacing: 6), count: 7)
    private let weekdayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    
    public init() {}
    
    public var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(alignment: .leading, spacing: 20) {
                // MARK: - Header
                headerSection
                
                // MARK: - Top 7 Metric Cards
                topMetricsRow
                
                // MARK: - Main 2-Column Split
                HStack(alignment: .top, spacing: 16) {
                    // Left Column: Calendar Grid + Selected Day Trades Table
                    VStack(spacing: 16) {
                        calendarContainerCard
                        selectedDayTradesCard
                    }
                    .frame(minWidth: 500, maxWidth: .infinity)
                    
                    // Right Column: Charts & Monthly Summary
                    VStack(spacing: 16) {
                        monthlyPerformanceCard
                        dailyPnlTrendCard
                        weekdayPerformanceCard
                        monthlySummaryCard
                    }
                    .frame(width: 380)
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
                Text("Trading Calendar")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundColor(.white)
                Text("View your daily P&L, trade details and performance heatmap")
                    .font(.system(size: 13))
                    .foregroundColor(Color(hex: "94a3b8"))
            }
            
            Spacer()
            
            // Month Picker Pill & Today Button
            HStack(spacing: 8) {
                Menu {
                    Button("November 2026") { viewModel.currentMonth = 11; viewModel.currentYear = 2026 }
                    Button("October 2026") { viewModel.currentMonth = 10; viewModel.currentYear = 2026 }
                    Button("September 2026") { viewModel.currentMonth = 9; viewModel.currentYear = 2026 }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "calendar")
                            .font(.system(size: 11))
                            .foregroundColor(Color(hex: "94a3b8"))
                        Text(viewModel.monthTitle)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white)
                        
                        Text(viewModel.monthlyPnl >= 0 ? "+₹\(Int(viewModel.monthlyPnl))" : "-₹\(Int(abs(viewModel.monthlyPnl)))")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(viewModel.monthlyPnl >= 0 ? Color(hex: "10b981") : Color(hex: "f43f5e"))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(hex: "10b981").opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                        
                        Image(systemName: "chevron.down")
                            .font(.system(size: 9))
                            .foregroundColor(Color(hex: "94a3b8"))
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color(hex: "121b2d"))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color(hex: "1e293b"), lineWidth: 1)
                    )
                }
                .menuStyle(.borderlessButton)
                
                Button {
                    viewModel.goToToday()
                } label: {
                    Text("Today")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
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
    }
    
    // MARK: - Top 7 Metric Cards
    private var topMetricsRow: some View {
        HStack(spacing: 10) {
            statMetricCard(
                title: "Monthly P&L",
                value: DashboardNumberFormatter.formatRupeeInteger(viewModel.monthlyPnl, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled),
                badge: viewModel.monthlyPnl >= 0 ? "+0.0%" : "-0.0%",
                badgeColor: Color(hex: "10b981"),
                valueColor: viewModel.monthlyPnl >= 0 ? Color(hex: "10b981") : Color(hex: "f43f5e")
            )
            
            statMetricCard(
                title: "Total Trades",
                value: "\(viewModel.totalTrades)",
                badge: "0.0%",
                badgeColor: Color(hex: "94a3b8")
            )
            
            statMetricCard(
                title: "Profitable Days",
                value: "\(viewModel.profitableDays)",
                badge: "100.0%",
                badgeColor: Color(hex: "10b981")
            )
            
            statMetricCard(
                title: "Losing Days",
                value: "\(viewModel.losingDays)",
                badge: "0.0%",
                badgeColor: Color(hex: "94a3b8")
            )
            
            statMetricCard(
                title: "No Trade Days",
                value: "\(viewModel.noTradeDays)",
                badge: "-",
                badgeColor: Color(hex: "64748b")
            )
            
            statMetricCard(
                title: "Best Day",
                value: viewModel.bestDayPnl > 0 ? "+\(DashboardNumberFormatter.formatRupeeInteger(viewModel.bestDayPnl, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled))" : "₹0",
                badge: viewModel.bestDayDate,
                badgeColor: Color(hex: "10b981"),
                valueColor: Color(hex: "10b981")
            )
            
            statMetricCard(
                title: "Worst Day",
                value: "₹0",
                badge: "-",
                badgeColor: Color(hex: "64748b")
            )
        }
    }
    
    private func statMetricCard(title: String, value: String, badge: String, badgeColor: Color, valueColor: Color = .white) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(Color(hex: "94a3b8"))
            
            Text(value)
                .font(.system(size: 18, weight: .bold, design: .monospaced))
                .foregroundColor(valueColor)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            
            Text(badge)
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(badgeColor)
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
    
    // MARK: - Calendar Container Card
    private var calendarContainerCard: some View {
        VStack(spacing: 12) {
            // Calendar Nav Header
            HStack {
                HStack(spacing: 8) {
                    Button {
                        viewModel.previousMonth()
                    } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(Color(hex: "94a3b8"))
                    }
                    .buttonStyle(.plain)
                    
                    Text(viewModel.monthTitle)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                    
                    Button {
                        viewModel.nextMonth()
                    } label: {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(Color(hex: "94a3b8"))
                    }
                    .buttonStyle(.plain)
                    
                    Text("+₹11,494")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(Color(hex: "10b981"))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(hex: "10b981").opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }
                
                Spacer()
                
                // Month selector
                Menu {
                    Button("November 2026") { viewModel.currentMonth = 11 }
                } label: {
                    HStack(spacing: 4) {
                        Text(viewModel.monthTitle)
                            .font(.system(size: 11))
                            .foregroundColor(.white)
                        Image(systemName: "chevron.down")
                            .font(.system(size: 9))
                            .foregroundColor(Color(hex: "94a3b8"))
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(Color(hex: "0e1524"))
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(Color(hex: "1e293b"), lineWidth: 1)
                    )
                }
                .menuStyle(.borderlessButton)
            }
            .padding(.horizontal, 14)
            .padding(.top, 14)
            
            Divider().background(Color(hex: "1e293b"))
            
            // Weekday Headers
            HStack(spacing: 6) {
                ForEach(weekdayHeaders, id: \.self) { day in
                    Text(day)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color(hex: "94a3b8"))
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(.horizontal, 14)
            
            // Calendar Grid
            LazyVGrid(columns: calendarColumns, spacing: 6) {
                ForEach(viewModel.gridCells) { cell in
                    if let d = cell.dayNumber {
                        dayGridCell(day: d, item: cell.dayItem)
                            .onTapGesture {
                                viewModel.selectDayNumber(d)
                            }
                    } else {
                        // Empty placeholder
                        RoundedRectangle(cornerRadius: 8)
                            .fill(Color(hex: "0b111e").opacity(0.3))
                            .frame(height: 70)
                    }
                }
            }
            .padding(.horizontal, 14)
            
            // Calendar Legend
            HStack(spacing: 18) {
                HStack(spacing: 6) {
                    Circle().fill(Color(hex: "10b981")).frame(width: 8, height: 8)
                    Text("Profit Day").font(.system(size: 11)).foregroundColor(Color(hex: "94a3b8"))
                }
                HStack(spacing: 6) {
                    Circle().fill(Color(hex: "f43f5e")).frame(width: 8, height: 8)
                    Text("Loss Day").font(.system(size: 11)).foregroundColor(Color(hex: "94a3b8"))
                }
                HStack(spacing: 6) {
                    Circle().fill(Color(hex: "f59e0b")).frame(width: 8, height: 8)
                    Text("Market Holiday").font(.system(size: 11)).foregroundColor(Color(hex: "94a3b8"))
                }
                HStack(spacing: 6) {
                    Circle().fill(Color(hex: "334155")).frame(width: 8, height: 8)
                    Text("No Trade").font(.system(size: 11)).foregroundColor(Color(hex: "94a3b8"))
                }
                Spacer()
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 14)
        }
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    private func marketHoliday(for day: Int) -> String? {
        let y = viewModel.currentYear
        let m = viewModel.currentMonth
        if y == 2026 {
            if m == 1 && day == 26 { return "Republic Day" }
            if m == 3 && day == 3 { return "Holi" }
            if m == 3 && day == 26 { return "Shri Ram Navami" }
            if m == 3 && day == 31 { return "Shri Mahavir Jayanti" }
            if m == 4 && day == 3 { return "Good Friday" }
            if m == 4 && day == 14 { return "Dr. Baba Saheb Ambedkar Jayanti" }
            if m == 5 && day == 1 { return "Maharashtra Day" }
            if m == 5 && day == 28 { return "Bakri Id" }
            if m == 6 && day == 26 { return "Muharram" }
            if m == 9 && day == 14 { return "Ganesh Chaturthi" }
            if m == 10 && day == 2 { return "Mahatma Gandhi Jayanti" }
            if m == 10 && day == 20 { return "Dussehra" }
            if m == 11 && day == 10 { return "Diwali-Balipratipada" }
            if m == 11 && day == 24 { return "Prakash Gurpurb Sri Guru Nanak Dev" }
            if m == 12 && day == 25 { return "Christmas" }
        }
        return nil
    }

    private func dayGridCell(day: Int, item: CalendarDayItem?) -> some View {
        let isSelected = viewModel.selectedDayNumber == day
        let isDay3 = (day == 3 && viewModel.currentMonth == 11 && viewModel.currentYear == 2026)
        let holidayName = marketHoliday(for: day)
        let isHoliday = holidayName != nil
        
        return VStack(alignment: .leading, spacing: 2) {
            HStack {
                Text("\(day)")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(isDay3 ? .white : (isHoliday ? Color(hex: "f59e0b") : Color(hex: "94a3b8")))
                Spacer()
                if isHoliday {
                    Text("🇮🇳")
                        .font(.system(size: 9))
                }
            }
            
            Spacer()
            
            if isDay3 {
                VStack(spacing: 1) {
                    Text("+11.5K")
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                        .foregroundColor(.white)
                    Text("9 trades")
                        .font(.system(size: 9))
                        .foregroundColor(.white.opacity(0.85))
                }
                .frame(maxWidth: .infinity)
            } else if let hName = holidayName {
                VStack(spacing: 1) {
                    Text(hName)
                        .font(.system(size: 8.5, weight: .bold))
                        .foregroundColor(Color(hex: "fcd34d"))
                        .lineLimit(1)
                    Text("Closed")
                        .font(.system(size: 7.5))
                        .foregroundColor(Color(hex: "f59e0b").opacity(0.8))
                }
                .frame(maxWidth: .infinity)
            }
            
            Spacer()
        }
        .padding(6)
        .frame(height: 70)
        .background(
            isDay3 ? Color(hex: "059669") :
            (isHoliday ? Color(hex: "1c1917") :
            (isSelected ? Color(hex: "1e293b") : Color(hex: "0e1524")))
        )
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(
                    isSelected ? Color(hex: "3b82f6") :
                    (isHoliday ? Color(hex: "f59e0b").opacity(0.5) : Color(hex: "1e293b")),
                    lineWidth: isSelected ? 2 : 1
                )
        )
    }
    
    // MARK: - Selected Day Trades Card
    private var selectedDayTradesCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Trades on \(viewModel.selectedDateTitle)")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.white)
                .padding(.horizontal, 14)
                .padding(.top, 14)
            
            Divider().background(Color(hex: "1e293b"))
            
            if viewModel.selectedDayTrades.isEmpty {
                let hol = marketHoliday(for: viewModel.selectedDayNumber)
                VStack(spacing: 8) {
                    if let holName = hol {
                        Text("🇮🇳 \(holName)")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(Color(hex: "f59e0b"))
                        Text("Indian Stock Market (NSE & BSE) closed for trading holiday.")
                            .font(.system(size: 11))
                            .foregroundColor(Color(hex: "94a3b8"))
                    } else {
                        Text("No trade activity recorded on this day.")
                            .font(.system(size: 12))
                            .foregroundColor(Color(hex: "64748b"))
                    }
                }
                .frame(maxWidth: .infinity, minHeight: 90)
                .padding(.bottom, 14)
            } else {
                VStack(spacing: 0) {
                    // Mini Table Header
                    HStack(spacing: 6) {
                        Text("TIME").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 50, alignment: .leading)
                        Text("INDEX").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 65, alignment: .leading)
                        Text("TYPE").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 55, alignment: .leading)
                        Text("CE/PE").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 45, alignment: .leading)
                        Text("STRIKE").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 55, alignment: .leading)
                        Text("LOTS").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 40, alignment: .leading)
                        Text("ENTRY").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 60, alignment: .leading)
                        Text("EXIT").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 60, alignment: .leading)
                        Text("P&L").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 75, alignment: .leading)
                        Spacer()
                        Text("ACTIONS").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 55, alignment: .trailing)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Color(hex: "0e1524"))
                    
                    Divider().background(Color(hex: "1e293b"))
                    
                    ForEach(viewModel.selectedDayTrades) { t in
                        HStack(spacing: 6) {
                            Text(t.time)
                                .font(.system(size: 11, design: .monospaced))
                                .foregroundColor(Color(hex: "94a3b8"))
                                .frame(width: 50, alignment: .leading)
                            
                            Text(t.indexName)
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.white)
                                .frame(width: 65, alignment: .leading)
                            
                            Text(t.tradingType)
                                .font(.system(size: 10))
                                .foregroundColor(Color(hex: "94a3b8"))
                                .frame(width: 55, alignment: .leading)
                            
                            Text(t.optionType)
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(t.optionType == "CE" ? Color(hex: "10b981") : Color(hex: "f43f5e"))
                                .padding(.horizontal, 4)
                                .padding(.vertical, 1)
                                .background(t.optionType == "CE" ? Color(hex: "10b981").opacity(0.15) : Color(hex: "f43f5e").opacity(0.15))
                                .clipShape(RoundedRectangle(cornerRadius: 3))
                                .frame(width: 45, alignment: .leading)
                            
                            Text(t.strike != nil ? "\(t.strike!)" : "-")
                                .font(.system(size: 11, design: .monospaced))
                                .foregroundColor(.white)
                                .frame(width: 55, alignment: .leading)
                            
                            Text("\(t.lots)")
                                .font(.system(size: 11, design: .monospaced))
                                .foregroundColor(.white)
                                .frame(width: 40, alignment: .leading)
                            
                            Text(String(format: "%.2f", t.entry))
                                .font(.system(size: 11, design: .monospaced))
                                .foregroundColor(Color(hex: "94a3b8"))
                                .frame(width: 60, alignment: .leading)
                            
                            Text(String(format: "%.2f", t.exit))
                                .font(.system(size: 11, design: .monospaced))
                                .foregroundColor(Color(hex: "94a3b8"))
                                .frame(width: 60, alignment: .leading)
                            
                            Text(t.pnl >= 0 ? "+₹\(Int(t.pnl))" : "-₹\(Int(abs(t.pnl)))")
                                .font(.system(size: 11, weight: .bold, design: .monospaced))
                                .foregroundColor(t.pnl >= 0 ? Color(hex: "10b981") : Color(hex: "f43f5e"))
                                .frame(width: 75, alignment: .leading)
                            
                            Spacer()
                            
                            HStack(spacing: 6) {
                                Image(systemName: "pencil")
                                    .font(.system(size: 10))
                                    .foregroundColor(Color(hex: "94a3b8"))
                                Image(systemName: "trash")
                                    .font(.system(size: 10))
                                    .foregroundColor(Color(hex: "f43f5e"))
                            }
                            .frame(width: 55, alignment: .trailing)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        
                        Divider().background(Color(hex: "1e293b").opacity(0.5))
                    }
                }
            }
        }
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Right Column Cards
    private var monthlyPerformanceCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Monthly Performance")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                Text("November 2026")
                    .font(.system(size: 10))
                    .foregroundColor(Color(hex: "94a3b8"))
            }
            
            Chart {
                BarMark(x: .value("Week", "1 Aug"), y: .value("P&L", 11494))
                    .foregroundStyle(Color(hex: "10b981"))
                BarMark(x: .value("Week", "8 Aug"), y: .value("P&L", 0))
                    .foregroundStyle(Color(hex: "64748b"))
                BarMark(x: .value("Week", "15 Aug"), y: .value("P&L", 0))
                    .foregroundStyle(Color(hex: "64748b"))
                BarMark(x: .value("Week", "22 Aug"), y: .value("P&L", 0))
                    .foregroundStyle(Color(hex: "64748b"))
                BarMark(x: .value("Week", "29 Aug"), y: .value("P&L", 0))
                    .foregroundStyle(Color(hex: "64748b"))
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
    
    private var dailyPnlTrendCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Daily P&L Trend")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                Text("November 2026")
                    .font(.system(size: 10))
                    .foregroundColor(Color(hex: "94a3b8"))
            }
            
            Chart {
                AreaMark(x: .value("Date", "1 Aug"), y: .value("P&L", 0))
                AreaMark(x: .value("Date", "2 Aug"), y: .value("P&L", 11494))
                AreaMark(x: .value("Date", "8 Aug"), y: .value("P&L", 11494))
                AreaMark(x: .value("Date", "15 Aug"), y: .value("P&L", 11494))
                AreaMark(x: .value("Date", "22 Aug"), y: .value("P&L", 11494))
                AreaMark(x: .value("Date", "29 Aug"), y: .value("P&L", 11494))
            }
            .foregroundStyle(
                LinearGradient(
                    colors: [Color(hex: "3b82f6").opacity(0.6), Color(hex: "3b82f6").opacity(0.05)],
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
    
    private var weekdayPerformanceCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Weekday Performance")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            Chart {
                BarMark(x: .value("Day", "Mon"), y: .value("P&L", 8000)).foregroundStyle(Color(hex: "10b981"))
                BarMark(x: .value("Day", "Tue"), y: .value("P&L", 11494)).foregroundStyle(Color(hex: "10b981"))
                BarMark(x: .value("Day", "Wed"), y: .value("P&L", 6500)).foregroundStyle(Color(hex: "10b981"))
                BarMark(x: .value("Day", "Thu"), y: .value("P&L", -3500)).foregroundStyle(Color(hex: "f43f5e"))
                BarMark(x: .value("Day", "Fri"), y: .value("P&L", 18000)).foregroundStyle(Color(hex: "10b981"))
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
    
    private var monthlySummaryCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Monthly Summary")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            VStack(spacing: 6) {
                summaryDualRow("Total Trades", "\(viewModel.totalTrades)", "Gross Profit", "₹37,488", Color(hex: "10b981"))
                summaryDualRow("Profitable Days", "\(viewModel.profitableDays)", "Gross Loss", "-₹24,441", Color(hex: "f43f5e"))
                summaryDualRow("Losing Days", "\(viewModel.losingDays)", "Total Charges", "₹1,553", Color(hex: "94a3b8"))
                summaryDualRow("No Trade Days", "\(viewModel.noTradeDays)", "Net P&L", "₹11,494", Color(hex: "10b981"))
                summaryDualRow("Win Rate", "100.0%", "Average Daily P&L", "₹11,494", Color(hex: "10b981"))
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
    
    private func summaryDualRow(_ l1: String, _ v1: String, _ l2: String, _ v2: String, _ c2: Color) -> some View {
        HStack {
            HStack {
                Text(l1).font(.system(size: 11)).foregroundColor(Color(hex: "94a3b8"))
                Spacer()
                Text(v1).font(.system(size: 11, weight: .bold, design: .monospaced)).foregroundColor(.white)
            }
            .frame(maxWidth: .infinity)
            
            Rectangle().fill(Color(hex: "1e293b")).frame(width: 1, height: 14).padding(.horizontal, 4)
            
            HStack {
                Text(l2).font(.system(size: 11)).foregroundColor(Color(hex: "94a3b8"))
                Spacer()
                Text(v2).font(.system(size: 11, weight: .bold, design: .monospaced)).foregroundColor(c2)
            }
            .frame(maxWidth: .infinity)
        }
    }
}
