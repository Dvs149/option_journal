import SwiftUI
import Combine

// MARK: - Date Range Filter Enum
public enum DateRangeFilter: String, CaseIterable, Identifiable, Sendable {
    case today = "today"
    case yesterday = "yesterday"
    case thisWeek = "this_week"
    case thisMonth = "this_month"
    case lastMonth = "last_month"
    case thisYear = "this_year"
    case allTime = "all"
    case custom = "custom"
    
    public var id: String { rawValue }
    
    public var displayName: String {
        switch self {
        case .today: return "Today"
        case .yesterday: return "Yesterday"
        case .thisWeek: return "This Week"
        case .thisMonth: return "This Month"
        case .lastMonth: return "Last Month"
        case .thisYear: return "This Year"
        case .allTime: return "All Time"
        case .custom: return "Custom Range..."
        }
    }
}

@MainActor
public final class AppState: ObservableObject {
    @Published public var currentUser: User?
    @Published public var isAuthenticated: Bool = false
    @Published public var isInitialLoading: Bool = true
    @Published public var selectedTab: String = "dashboard"
    @Published public var isPrivacyMode: Bool = false
    @Published public var globalError: String?
    
    // Global Date Filter State
    @Published public var selectedDateFilter: DateRangeFilter = .allTime
    @Published public var customStartDate: Date = Calendar.current.date(byAdding: .month, value: -1, to: Date()) ?? Date()
    @Published public var customEndDate: Date = Date()
    @Published public var dateFilterTrigger: Int = 0
    
    public var dateFilterDisplayTitle: String {
        if selectedDateFilter == .custom {
            let formatter = DateFormatter()
            formatter.dateFormat = "dd MMM"
            return "\(formatter.string(from: customStartDate)) - \(formatter.string(from: customEndDate))"
        }
        return selectedDateFilter.displayName
    }
    
    public var apiFromDateString: String? {
        guard selectedDateFilter == .custom else { return nil }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: customStartDate)
    }
    
    public var apiToDateString: String? {
        guard selectedDateFilter == .custom else { return nil }
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: customEndDate)
    }
    
    private let authService: AuthServiceProtocol
    private let keychain: KeychainManager
    
    public init(authService: AuthServiceProtocol, keychain: KeychainManager = .shared) {
        self.authService = authService
        self.keychain = keychain
        
        // Initial token check
        if keychain.getToken() != nil {
            self.isAuthenticated = true
        }
    }
    
    public convenience init() {
        self.init(authService: AuthService(), keychain: .shared)
    }
    
    public func bootstrap() async {
        isInitialLoading = true
        defer { isInitialLoading = false }
        
        guard keychain.getToken() != nil else {
            isAuthenticated = false
            currentUser = nil
            return
        }
        
        do {
            let user = try await authService.fetchCurrentUser()
            self.currentUser = user
            self.isAuthenticated = true
        } catch {
            // Token was invalid or expired
            _ = keychain.deleteToken()
            self.isAuthenticated = false
            self.currentUser = nil
        }
    }
    
    public func didLogin(user: User) {
        self.currentUser = user
        self.isAuthenticated = true
        self.globalError = nil
    }
    
    public func logout() async {
        do {
            try await authService.logout()
        } catch {
            // Proceed with local logout regardless of network error
            _ = keychain.deleteToken()
        }
        self.currentUser = nil
        self.isAuthenticated = false
    }
}
