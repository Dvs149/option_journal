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

@MainActor
public final class CalendarViewModel: ObservableObject {
    @Published public var currentYear: Int
    @Published public var currentMonth: Int
    @Published public var calendarData: CalendarResponse? = nil
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var selectedDay: CalendarDayItem? = nil
    @Published public var showDaySheet: Bool = false
    
    private let analyticsService: AnalyticsServiceProtocol
    private let calendar = Calendar(identifier: .gregorian)
    
    public init(analyticsService: AnalyticsServiceProtocol) {
        self.analyticsService = analyticsService
        let now = Date()
        let cal = Calendar.current
        self.currentYear = cal.component(.year, from: now)
        self.currentMonth = cal.component(.month, from: now)
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
        return "\(calendarData?.monthName ?? "") \(currentYear)"
    }
    
    public func loadData() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let res = try await analyticsService.fetchCalendar(year: currentYear, month: currentMonth)
            self.calendarData = res
            self.isLoading = false
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
        }
    }
    
    public func previousMonth() {
        if currentMonth == 1 {
            currentMonth = 12
            currentYear -= 1
        } else {
            currentMonth -= 1
        }
        Task {
            await loadData()
        }
    }
    
    public func nextMonth() {
        if currentMonth == 12 {
            currentMonth = 1
            currentYear += 1
        } else {
            currentMonth += 1
        }
        Task {
            await loadData()
        }
    }
    
    public func goToToday() {
        let now = Date()
        currentYear = calendar.component(.year, from: now)
        currentMonth = calendar.component(.month, from: now)
        Task {
            await loadData()
        }
    }
    
    public func selectDay(_ day: CalendarDayItem) {
        self.selectedDay = day
        self.showDaySheet = true
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
        
        let weekday = calendar.component(.weekday, from: firstOfMonth)
        // In Gregorian: 1 = Sun, 2 = Mon, 3 = Tue, 4 = Wed, 5 = Thu, 6 = Fri, 7 = Sat
        // We want Monday = 0, Tuesday = 1, ..., Sunday = 6
        let leadingSpaces = (weekday + 5) % 7
        
        var cells: [CalendarGridCell] = []
        
        // Blank cells before first of month
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
        
        // Today components
        let todayComps = calendar.dateComponents([.year, .month, .day], from: Date())
        
        // Map of day items by day number
        let daysMap = Dictionary(grouping: calendarData?.days ?? [], by: { $0.day })
            .compactMapValues { $0.first }
        
        for day in range {
            let isToday = (todayComps.year == currentYear && todayComps.month == currentMonth && todayComps.day == day)
            let dayItem = daysMap[day]
            let dateStr = String(format: "%04d-%02d-%02d", currentYear, currentMonth, day)
            
            cells.append(CalendarGridCell(
                id: "day-\(day)",
                dayNumber: day,
                dateString: dateStr,
                dayItem: dayItem,
                isCurrentMonth: true,
                isToday: isToday
            ))
        }
        
        return cells
    }
}
