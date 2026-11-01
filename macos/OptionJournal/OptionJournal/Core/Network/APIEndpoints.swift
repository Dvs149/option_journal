import Foundation

public struct APIEndpoints {
    public static var baseURL: String {
        UserDefaults.standard.string(forKey: "custom_api_base_url") ?? "http://127.0.0.1:8000/api"
    }
    
    // MARK: - Auth
    public static let login = "/login"
    public static let register = "/register"
    public static let logout = "/logout"
    public static let currentUser = "/user"
    public static let updateProfile = "/user/profile"
    public static let updatePassword = "/user/password"
    
    // MARK: - Dashboard & Analytics
    public static let dashboard = "/dashboard"
    public static let analytics = "/analytics"
    public static let calendar = "/calendar"
    public static let risk = "/risk"
    public static let riskLimits = "/risk/limits"
    public static let strategies = "/strategies"
    
    // MARK: - Trades
    public static let trades = "/trades"
    public static func trade(id: Int) -> String { "/trades/\(id)" }
    public static func duplicateTrade(id: Int) -> String { "/trades/\(id)/duplicate" }
    public static let bulkTrades = "/trades/bulk"
    public static let bulkDeleteTrades = "/trades/bulk-delete"
    public static let estimateCharges = "/trades/estimate-charges"
    public static let lotSizes = "/lot-sizes"
    
    // MARK: - Journal & Screenshots
    public static let journal = "/journal"
    public static func journalDetail(id: Int) -> String { "/journal/\(id)" }
    public static func tradeScreenshots(tradeId: Int) -> String { "/trades/\(tradeId)/screenshots" }
    
    // MARK: - Capital & Accounts
    public static let capital = "/capital"
    public static let capitalTransactions = "/capital/transactions"
    public static func capitalTransaction(id: Int) -> String { "/capital/transactions/\(id)" }
    public static let tradingAccounts = "/trading-accounts"
    
    // MARK: - Tools & Settings
    public static let pineScripts = "/pine-scripts"
    public static func pineScript(id: Int) -> String { "/pine-scripts/\(id)" }
    public static func pineScriptFavorite(id: Int) -> String { "/pine-scripts/\(id)/favorite" }
    public static func pineScriptDuplicate(id: Int) -> String { "/pine-scripts/\(id)/duplicate" }
    public static let dropdownOptions = "/dropdown-options"
    public static func dropdownOptionStatus(id: Int) -> String { "/dropdown-options/\(id)/status" }
    public static let moduleVisibility = "/module-visibility"
    public static let brokerageSettings = "/brokerage-settings"
    
    // MARK: - Exporter
    public static let exportTrades = "/export/trades"
    public static let exportDailyPnL = "/export/daily-pnl"
    public static let exportMonthlyPnL = "/export/monthly-pnl"
    public static let exportYearlyPnL = "/export/yearly-pnl"
}
