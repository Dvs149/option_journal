import SwiftUI

public struct MainSplitView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.colorScheme) private var colorScheme
    @State private var columnVisibility: NavigationSplitViewVisibility = .all
    
    public init() {}
    
    public var body: some View {
        NavigationSplitView(columnVisibility: $columnVisibility) {
            SidebarView(selection: $appState.selectedTab)
                .navigationSplitViewColumnWidth(min: 200, ideal: 220, max: 260)
        } detail: {
            Group {
                switch appState.selectedTab {
                case "dashboard":
                    DashboardView()
                case "add-trade":
                    AddTradeView()
                case "trades":
                    TradesTableView()
                case "calendar":
                    TradingCalendarView()
                case "equity-curve":
                    EquityCurveView()
                case "risk-management":
                    RiskManagementView()
                case "journal":
                    TradingJournalView()
                case "strategy-analysis":
                    StrategyAnalysisView()
                case "analytics":
                    AnalyticsReportsView()
                case "capital-management":
                    CapitalManagementView()
                case "pine-scripts":
                    PineScriptManagerView()
                case "dropdown-manager":
                    DropdownSettingsView()
                case "settings":
                    SettingsView()
                default:
                    DashboardView()
                }
            }
            .nativeToolbar(selection: $appState.selectedTab)
        }
        .navigationSplitViewStyle(.balanced)
    }
}
