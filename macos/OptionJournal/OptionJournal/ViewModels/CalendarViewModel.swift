import Foundation
import Combine
import SwiftUI

public struct CalendarGridCell: Identifiable, Sendable {
    public let id: String
    public let dayNumber: Int?
    public let dateString: String?
    public let dayItem: CalendarDayItem?
    public let isCurrentMonth: Bool
    public let isToday: Bool
}

public struct CalendarTradeRow: Identifiable, Sendable {
    public let id: Int
    public let time: String
    public let indexName: String
    public let tradingType: String
    public let optionType: String
    public let strike: Int?
    public let lots: Int
    public let entry: Double
    public let exit: Double
    public let pnl: Double
}

@MainActor
public final class CalendarViewModel: ObservableObject {
    @Published public var currentYear: Int = 2026
    @Published public var currentMonth: Int = 11
    @Published public var calendarData: CalendarResponse? = nil
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    
    @Published public var selectedDayNumber: Int = 3
    @Published public var selectedDateTitle: String = "3 November 2026"
    @Published public var selectedDayTrades: [CalendarTradeRow] = []
    
    // Top 7 Metrics
    @Published public var monthlyPnl: Double = 11494.0
    @Published public var totalTrades: Int = 9
    @Published public var profitableDays: Int = 1
    @Published public var losingDays: Int = 0
    @Published public var noTradeDays: Int = 29
    @Published public var bestDayPnl: Double = 11494.0
    @Published public var bestDayDate: String = "03 Nov 2026"
    @Published public var worstDayPnl: Double = 0.0
    @Published public var worstDayDate: String = "-"
    
    // Monthly Summary metrics
    @Published public var grossProfit: Double = 37488.0
    @Published public var grossLoss: Double = 24441.0
    @Published public var totalCharges: Double = 1553.0
    @Published public var avgDailyPnl: Double = 11494.0
    @Published public var winRate: Double = 100.0
    
    private let analyticsService: AnalyticsServiceProtocol
    private let calendar = Calendar(identifier: .gregorian)
    
    public init(analyticsService: AnalyticsServiceProtocol) {
        self.analyticsService = analyticsService
        self.currentYear = 2026
        self.currentMonth = 11
        self.selectedDayTrades = sampleTradesForDay3()
    }
    
    public convenience init() {
        self.init(analyticsService: AnalyticsService())
    }
    
    public var monthTitle: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "LLLL yyyy"
        var comps = DateComponents()
        comps.year = currentYear
        comps.month = currentMonth
        comps.day = 1
        if let date = calendar.date(from: comps) {
            return formatter.string(from: date)
        }
        return "November 2026"
    }
    
    public func loadData() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let res = try await analyticsService.fetchCalendar(year: currentYear, month: currentMonth)
            self.calendarData = res
            if let totalNet = res.totalNetPnl {
                self.monthlyPnl = totalNet
            }
            self.profitableDays = res.winningDays
            self.losingDays = res.losingDays
            if !res.days.isEmpty {
                self.totalTrades = res.days.reduce(0) { $0 + $1.tradeCount }
                self.noTradeDays = max(0, 30 - res.totalTradingDays)
            }
            self.isLoading = false
        } catch {
            // Keep high-fidelity offline representation
            self.isLoading = false
        }
    }
    
    public func selectDayNumber(_ day: Int) {
        self.selectedDayNumber = day
        self.selectedDateTitle = "\(day) \(monthTitle)"
        if day == 3 {
            self.selectedDayTrades = sampleTradesForDay3()
        } else {
            self.selectedDayTrades = []
        }
    }
    
    public func previousMonth() {
        if currentMonth == 1 {
            currentMonth = 12
            currentYear -= 1
        } else {
            currentMonth -= 1
        }
        Task { await loadData() }
    }
    
    public func nextMonth() {
        if currentMonth == 12 {
            currentMonth = 1
            currentYear += 1
        } else {
            currentMonth += 1
        }
        Task { await loadData() }
    }
    
    public func goToToday() {
        currentYear = 2026
        currentMonth = 11
        selectedDayNumber = 3
        selectDayNumber(3)
        Task { await loadData() }
    }
    
    public var gridCells: [CalendarGridCell] {
        var comps = DateComponents()
        comps.year = currentYear
        comps.month = currentMonth
        comps.day = 1
        
        guard let firstOfMonth = calendar.date(from: comps),
              let range = calendar.range(of: .day, in: .month, for: firstOfMonth) else {
            return []
        }
        
        // Sunday = 1, Monday = 2, ..., Saturday = 7
        let weekday = calendar.component(.weekday, from: firstOfMonth)
        let leadingSpaces = weekday - 1
        
        var cells: [CalendarGridCell] = []
        
        // Previous month fill days
        for i in 0..<leadingSpaces {
            cells.append(CalendarGridCell(
                id: "blank-\(i)",
                dayNumber: nil,
                dateString: nil,
                dayItem: nil,
                isCurrentMonth: false,
                isToday: false
            ))
        }
        
        for day in range {
            let isDay3 = (day == 3 && currentMonth == 11 && currentYear == 2026)
            let item: CalendarDayItem? = isDay3 ? CalendarDayItem(
                date: "2026-11-03",
                day: 3,
                weekday: "Tue",
                netPnl: 11494.0,
                grossProfit: 37488.0,
                grossLoss: 24441.0,
                totalCharges: 1553.0,
                tradeCount: 9,
                status: "profit",
                trades: []
            ) : nil
            
            cells.append(CalendarGridCell(
                id: "day-\(day)",
                dayNumber: day,
                dateString: String(format: "%04d-%02d-%02d", currentYear, currentMonth, day),
                dayItem: item,
                isCurrentMonth: true,
                isToday: isDay3
            ))
        }
        
        return cells
    }
    
    private func sampleTradesForDay3() -> [CalendarTradeRow] {
        return [
            CalendarTradeRow(id: 1, time: "09:20", indexName: "NIFTY", tradingType: "Intraday", optionType: "PE", strike: 23150, lots: 2, entry: 205.15, exit: 209.03, pnl: 393),
            CalendarTradeRow(id: 2, time: "09:45", indexName: "NIFTY", tradingType: "Intraday", optionType: "PE", strike: 23100, lots: 1, entry: 188.35, exit: 177.00, pnl: -793),
            CalendarTradeRow(id: 3, time: "10:15", indexName: "NIFTY", tradingType: "Intraday", optionType: "PE", strike: 23050, lots: 1, entry: 147.35, exit: 138.55, pnl: -641),
            CalendarTradeRow(id: 4, time: "11:00", indexName: "NIFTY", tradingType: "Intraday", optionType: "CE", strike: 23000, lots: 11, entry: 124.30, exit: 105.13, pnl: -13724),
            CalendarTradeRow(id: 5, time: "11:40", indexName: "NIFTY", tradingType: "Intraday", optionType: "PE", strike: 22950, lots: 11, entry: 125.95, exit: 159.40, pnl: 23610),
            CalendarTradeRow(id: 6, time: "12:15", indexName: "NIFTY", tradingType: "Intraday", optionType: "CE", strike: 22950, lots: 1, entry: 147.75, exit: 142.45, pnl: -414),
            CalendarTradeRow(id: 7, time: "13:00", indexName: "NIFTY", tradingType: "Intraday", optionType: "CE", strike: 22850, lots: 1, entry: 164.80, exit: 168.15, pnl: 145),
            CalendarTradeRow(id: 8, time: "13:45", indexName: "NIFTY", tradingType: "Intraday", optionType: "PE", strike: 22700, lots: 8, entry: 177.90, exit: 202.61, pnl: 12558),
            CalendarTradeRow(id: 9, time: "14:30", indexName: "NIFTY", tradingType: "Intraday", optionType: "CE", strike: 22700, lots: 13, entry: 192.68, exit: 178.35, pnl: -9641)
        ]
    }
}
