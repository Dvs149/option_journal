import Foundation
import Combine
import AppKit
import SwiftUI

@MainActor
public final class PineScriptViewModel: ObservableObject {
    @Published public var scripts: [PineScript] = []
    @Published public var selectedScript: PineScript? = nil
    @Published public var isLoading: Bool = false
    @Published public var isSaving: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var successMessage: String? = nil
    @Published public var showCopiedFeedback: Bool = false
    
    // Top 5 Metrics
    @Published public var totalScriptsCount: Int = 1
    @Published public var strategiesCount: Int = 0
    @Published public var indicatorsCount: Int = 1
    @Published public var webhookAlertsCount: Int = 0
    @Published public var starredCount: Int = 1
    
    // Filters
    @Published public var searchQuery: String = ""
    @Published public var selectedFilterType: String = "All" // "All", "Strategies", "Indicators", "Alerts", "Libraries", "Starred"
    @Published public var selectedCategory: String = "All Categories"
    @Published public var selectedTargetMarket: String = "All Markets"
    @Published public var selectedSortBy: String = "Newest First"
    
    // Inspector
    @Published public var activeInspectorTab: String = "code" // "code", "notes", "webhook"
    @Published public var wrapLines: Bool = false
    
    // Editor Sheet
    @Published public var showEditorSheet: Bool = false
    @Published public var editingScriptId: Int? = nil
    @Published public var editTitle: String = ""
    @Published public var editType: String = "indicator"
    @Published public var editVersion: String = "v5"
    @Published public var editCategory: String = "Options"
    @Published public var editTargetMarket: String = "All"
    @Published public var editTimeframe: String = "5m"
    @Published public var editDescription: String = ""
    @Published public var editCode: String = ""
    @Published public var editIsFavorite: Bool = false
    
    private let pineService: PineScriptServiceProtocol
    
    public init(pineService: PineScriptServiceProtocol) {
        self.pineService = pineService
        self.scripts = sampleScripts()
        self.selectedScript = self.scripts.first
    }
    
    public convenience init() {
        self.init(pineService: PineScriptService())
    }
    
    public func loadScripts() async {
        isLoading = true
        errorMessage = nil
        do {
            let res = try await pineService.fetchScripts(search: nil, scriptType: nil, isFavorite: nil)
            if !res.scripts.isEmpty {
                self.scripts = res.scripts
                self.totalScriptsCount = res.scripts.count
            }
            self.isLoading = false
        } catch {
            self.isLoading = false
        }
    }
    
    public func copyCodeToClipboard(_ code: String) {
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(code, forType: .string)
        self.showCopiedFeedback = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            self.showCopiedFeedback = false
        }
    }
    
    private func sampleScripts() -> [PineScript] {
        let sampleCode = """
//@version=5
indicator("High - Low Difference + Day Selector", overlay=true)

// --- HIGH - LOW DIFFERENCE ---
hlDifference = high - low

plot(
    hlDifference,
    title="High - Low Difference",
    color=color.blue,
    display=display.status_line + display.data_window,
    precision=2
)

// --- SELECT DAY ---
selectedDay = input.string(
    "Friday",
    "Select Day",
    options=["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
)

nextDay = switch selectedDay
    "Monday"    => dayofweek.monday
    "Tuesday"   => dayofweek.tuesday
    "Wednesday" => dayofweek.wednesday
    "Thursday"  => dayofweek.thursday
    "Friday"    => dayofweek.friday

barcolor(dayofweek == nextDay ? color.white : na)
"""
        return [
            PineScript(
                id: 1,
                title: "Day Movement with particular day color",
                scriptType: "indicator",
                version: "v5",
                category: "Options",
                targetMarket: "All",
                timeframe: "5m",
                description: "You have combined two features: 1. High - Low Difference: Displays candle range in the status line and Data Window. 2. Select Day: Lets you choose Monday-Friday and colors that day's candles white.",
                code: sampleCode,
                tradingviewUrl: "https://www.tradingview.com",
                isFavorite: true
            )
        ]
    }
}
