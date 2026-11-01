import Foundation
import Combine
import SwiftUI

@MainActor
public final class DropdownSettingsViewModel: ObservableObject {
    @Published public var options: [DropdownOptionItem] = []
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var selectedDropdownKey: String = "ALL"
    
    private let settingsService: SettingsServiceProtocol
    
    public init(settingsService: SettingsServiceProtocol) {
        self.settingsService = settingsService
    }
    
    public convenience init() {
        self.init(settingsService: SettingsService())
    }
    
    public func loadData() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let res = try await settingsService.fetchDropdownOptions()
            self.options = res.options
            self.isLoading = false
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
        }
    }
    
    public var dropdownKeys: [String] {
        let keys = Set(options.map { $0.dropdownKey }).sorted()
        return ["ALL"] + keys
    }
    
    public var filteredOptions: [DropdownOptionItem] {
        if selectedDropdownKey == "ALL" {
            return options
        }
        return options.filter { $0.dropdownKey == selectedDropdownKey }
    }
    
    public func toggleStatus(for item: DropdownOptionItem) async {
        let targetState = !item.isActive
        do {
            try await settingsService.toggleOptionStatus(id: item.id, isActive: targetState)
            // Update locally for instant responsiveness
            if let idx = options.firstIndex(where: { $0.id == item.id }) {
                options[idx] = DropdownOptionItem(
                    id: item.id,
                    moduleKey: item.moduleKey,
                    dropdownKey: item.dropdownKey,
                    dropdownLabel: item.dropdownLabel,
                    optionValue: item.optionValue,
                    optionLabel: item.optionLabel,
                    isActive: targetState,
                    sortOrder: item.sortOrder
                )
            }
        } catch {
            self.errorMessage = error.localizedDescription
        }
    }
}
