import Foundation
import Combine
import SwiftUI

public struct DropdownGroupItem: Identifiable, Sendable {
    public let id: String
    public let title: String
    public let key: String
    public let activeCount: Int
    public let totalCount: Int
    public var options: [DropdownOptionItem]
}

@MainActor
public final class DropdownSettingsViewModel: ObservableObject {
    @Published public var options: [DropdownOptionItem] = []
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var selectedModulePill: String = "All Modules (81)"
    @Published public var statusFilter: String = "All" // "All", "Active Only", "Inactive"
    @Published public var searchQuery: String = ""
    
    // Top 4 Metrics
    @Published public var totalOptionsCount: Int = 81
    @Published public var activeOptionsCount: Int = 50
    @Published public var deactivatedCount: Int = 31
    @Published public var configuredModulesCount: Int = 3
    
    // Dropdown Groups
    @Published public var indexOptions: [DropdownOptionItem] = []
    @Published public var tradingTypeOptions: [DropdownOptionItem] = []
    @Published public var optionTypeOptions: [DropdownOptionItem] = []
    @Published public var strategyOptions: [DropdownOptionItem] = []
    @Published public var marketConditionOptions: [DropdownOptionItem] = []
    
    private let settingsService: SettingsServiceProtocol
    
    public init(settingsService: SettingsServiceProtocol) {
        self.settingsService = settingsService
        self.populateSampleOptions()
    }
    
    public convenience init() {
        self.init(settingsService: SettingsService())
    }
    
    public func loadData() async {
        isLoading = true
        errorMessage = nil
        do {
            let res = try await settingsService.fetchDropdownOptions()
            if !res.options.isEmpty {
                self.options = res.options
                self.totalOptionsCount = res.total ?? res.options.count
                self.activeOptionsCount = res.activeTotal ?? res.options.filter { $0.isActive }.count
                self.deactivatedCount = self.totalOptionsCount - self.activeOptionsCount
            }
            self.isLoading = false
        } catch {
            self.isLoading = false
        }
    }
    
    public func toggleOptionStatus(in listKey: String, optionId: Int) {
        func toggleList(_ list: inout [DropdownOptionItem]) {
            if let idx = list.firstIndex(where: { $0.id == optionId }) {
                let cur = list[idx]
                list[idx] = DropdownOptionItem(
                    id: cur.id,
                    moduleKey: cur.moduleKey,
                    dropdownKey: cur.dropdownKey,
                    dropdownLabel: cur.dropdownLabel,
                    optionValue: cur.optionValue,
                    optionLabel: cur.optionLabel,
                    isActive: !cur.isActive,
                    sortOrder: cur.sortOrder
                )
            }
        }
        
        switch listKey {
        case "index_name": toggleList(&indexOptions)
        case "trading_type": toggleList(&tradingTypeOptions)
        case "option_type": toggleList(&optionTypeOptions)
        case "strategy_name": toggleList(&strategyOptions)
        case "market_conditions": toggleList(&marketConditionOptions)
        default: break
        }
    }
    
    private func populateSampleOptions() {
        self.indexOptions = [
            DropdownOptionItem(id: 1, moduleKey: "add-trade", dropdownKey: "index_name", optionValue: "NIFTY", optionLabel: "NIFTY", isActive: true),
            DropdownOptionItem(id: 2, moduleKey: "add-trade", dropdownKey: "index_name", optionValue: "BANKNIFTY", optionLabel: "BANKNIFTY", isActive: true),
            DropdownOptionItem(id: 3, moduleKey: "add-trade", dropdownKey: "index_name", optionValue: "FINNIFTY", optionLabel: "FINNIFTY", isActive: false),
            DropdownOptionItem(id: 4, moduleKey: "add-trade", dropdownKey: "index_name", optionValue: "MIDCPNIFTY", optionLabel: "MIDCPNIFTY", isActive: false),
            DropdownOptionItem(id: 5, moduleKey: "add-trade", dropdownKey: "index_name", optionValue: "NIFTYNXT50", optionLabel: "NIFTYNXT50", isActive: false),
            DropdownOptionItem(id: 6, moduleKey: "add-trade", dropdownKey: "index_name", optionValue: "SENSEX", optionLabel: "SENSEX", isActive: true)
        ]
        
        self.tradingTypeOptions = [
            DropdownOptionItem(id: 10, moduleKey: "add-trade", dropdownKey: "trading_type", optionValue: "Intraday", optionLabel: "Intraday", isActive: true),
            DropdownOptionItem(id: 11, moduleKey: "add-trade", dropdownKey: "trading_type", optionValue: "BTST", optionLabel: "BTST (Buy Today Sell Tomorrow)", isActive: true),
            DropdownOptionItem(id: 12, moduleKey: "add-trade", dropdownKey: "trading_type", optionValue: "Overnight", optionLabel: "Overnight", isActive: true),
            DropdownOptionItem(id: 13, moduleKey: "add-trade", dropdownKey: "trading_type", optionValue: "Positional", optionLabel: "Positional", isActive: true),
            DropdownOptionItem(id: 14, moduleKey: "add-trade", dropdownKey: "trading_type", optionValue: "Scalping", optionLabel: "Scalping", isActive: false)
        ]
        
        self.optionTypeOptions = [
            DropdownOptionItem(id: 20, moduleKey: "add-trade", dropdownKey: "option_type", optionValue: "CE", optionLabel: "CE (Call Option)", isActive: true),
            DropdownOptionItem(id: 21, moduleKey: "add-trade", dropdownKey: "option_type", optionValue: "PE", optionLabel: "PE (Put Option)", isActive: true),
            DropdownOptionItem(id: 22, moduleKey: "add-trade", dropdownKey: "option_type", optionValue: "Both", optionLabel: "Both (Straddle / Strangle)", isActive: true)
        ]
        
        self.strategyOptions = [
            DropdownOptionItem(id: 30, moduleKey: "add-trade", dropdownKey: "strategy_name", optionValue: "Long Straddle", optionLabel: "Long Straddle", isActive: true),
            DropdownOptionItem(id: 31, moduleKey: "add-trade", dropdownKey: "strategy_name", optionValue: "Long Strangle", optionLabel: "Long Strangle", isActive: false),
            DropdownOptionItem(id: 32, moduleKey: "add-trade", dropdownKey: "strategy_name", optionValue: "Directional CE", optionLabel: "Directional CE", isActive: false),
            DropdownOptionItem(id: 33, moduleKey: "add-trade", dropdownKey: "strategy_name", optionValue: "Directional PE", optionLabel: "Directional PE", isActive: false),
            DropdownOptionItem(id: 34, moduleKey: "add-trade", dropdownKey: "strategy_name", optionValue: "Bull Call Spread", optionLabel: "Bull Call Spread", isActive: false),
            DropdownOptionItem(id: 35, moduleKey: "add-trade", dropdownKey: "strategy_name", optionValue: "Bear Put Spread", optionLabel: "Bear Put Spread", isActive: false)
        ]
        
        self.marketConditionOptions = [
            DropdownOptionItem(id: 40, moduleKey: "add-trade", dropdownKey: "market_conditions", optionValue: "Rangebound", optionLabel: "Rangebound", isActive: true),
            DropdownOptionItem(id: 41, moduleKey: "add-trade", dropdownKey: "market_conditions", optionValue: "Trending Bullish", optionLabel: "Trending Bullish", isActive: true),
            DropdownOptionItem(id: 42, moduleKey: "add-trade", dropdownKey: "market_conditions", optionValue: "Trending Bearish", optionLabel: "Trending Bearish", isActive: true),
            DropdownOptionItem(id: 43, moduleKey: "add-trade", dropdownKey: "market_conditions", optionValue: "High Volatility", optionLabel: "High Volatility", isActive: true)
        ]
    }
}
