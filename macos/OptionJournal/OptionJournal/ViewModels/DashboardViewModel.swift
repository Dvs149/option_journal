import SwiftUI
import Combine

@MainActor
public final class DashboardViewModel: ObservableObject {
    @Published public var stats: DashboardStats?
    @Published public var charts: DashboardChartsData?
    @Published public var strategyPerformance: [StrategyPerformanceItem] = []
    @Published public var recentTrades: [RecentTradeItem] = []
    @Published public var riskManagement: RiskSummaryDashboard?
    @Published public var calendarData: CalendarResponse?
    
    @Published public var calendarYear: Int
    @Published public var calendarMonth: Int
    @Published public var isCalendarLoading: Bool = false
    
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String?
    @Published public var selectedFilter: String = "all"
    
    private let analyticsService: AnalyticsServiceProtocol
    private let calendar = Calendar(identifier: .gregorian)
    
    public init(analyticsService: AnalyticsServiceProtocol) {
        self.analyticsService = analyticsService
        let now = Date()
        let cal = Calendar.current
        self.calendarYear = cal.component(.year, from: now)
        self.calendarMonth = cal.component(.month, from: now)
    }
    
    public convenience init() {
        self.init(analyticsService: AnalyticsService())
    }
    
    // MARK: - Calendar Helpers
    public var calendarMonthTitle: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "LLLL yyyy"
        var comps = DateComponents()
        comps.year = calendarYear
        comps.month = calendarMonth
        comps.day = 1
        if let date = calendar.date(from: comps) {
            return formatter.string(from: date)
        }
        return "\(calendarData?.monthName ?? "") \(calendarYear)"
    }
    
    public var calendarMonthNetPnl: Double {
        calendarData?.totalNetPnl ?? 0.0
    }
    
    public func previousCalendarMonth() {
        if calendarMonth == 1 {
            calendarMonth = 12
            calendarYear -= 1
        } else {
            calendarMonth -= 1
        }
        Task { await loadCalendar() }
    }
    
    public func nextCalendarMonth() {
        if calendarMonth == 12 {
            calendarMonth = 1
            calendarYear += 1
        } else {
            calendarMonth += 1
        }
        Task { await loadCalendar() }
    }
    
    public func loadCalendar() async {
        isCalendarLoading = true
        do {
            let res = try await analyticsService.fetchCalendar(year: calendarYear, month: calendarMonth)
            self.calendarData = res
        } catch {
            // Silently fallback or log
        }
        isCalendarLoading = false
    }
    
    // MARK: - Main Data Loading
    public func loadDashboard(filter: String = "all", fromDate: String? = nil, toDate: String? = nil) async {
        isLoading = true
        errorMessage = nil
        self.selectedFilter = filter
        
        async let dashboardTask: DashboardDataResponse = analyticsService.fetchDashboardData(
            filter: filter,
            fromDate: fromDate,
            toDate: toDate
        )
        async let calendarTask: CalendarResponse = analyticsService.fetchCalendar(
            year: calendarYear,
            month: calendarMonth
        )
        
        do {
            let (dash, cal) = try await (dashboardTask, calendarTask)
            self.stats = dash.stats
            self.charts = dash.charts
            self.strategyPerformance = dash.strategyPerformance ?? []
            self.recentTrades = dash.recentTrades ?? []
            self.riskManagement = dash.riskManagement
            self.calendarData = cal
        } catch let netErr as NetworkError {
            self.errorMessage = netErr.localizedDescription
        } catch {
            self.errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
}
