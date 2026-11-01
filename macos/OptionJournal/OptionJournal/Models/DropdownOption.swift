import Foundation

public struct DropdownOptionsResponse: Codable, Sendable {
    public let success: Bool?
    public let options: [DropdownOptionItem]
    public let total: Int?
    public let activeTotal: Int?
}

public struct DropdownOptionItem: Codable, Identifiable, Sendable, Hashable {
    public let id: Int
    public let moduleKey: String
    public let dropdownKey: String
    public let dropdownLabel: String?
    public let optionValue: String
    public let optionLabel: String?
    public let isActive: Bool
    public let sortOrder: Int?

    public init(
        id: Int,
        moduleKey: String,
        dropdownKey: String,
        dropdownLabel: String? = nil,
        optionValue: String,
        optionLabel: String? = nil,
        isActive: Bool = true,
        sortOrder: Int? = 0
    ) {
        self.id = id
        self.moduleKey = moduleKey
        self.dropdownKey = dropdownKey
        self.dropdownLabel = dropdownLabel
        self.optionValue = optionValue
        self.optionLabel = optionLabel
        self.isActive = isActive
        self.sortOrder = sortOrder
    }
}

public struct ToggleDropdownStatusRequest: Codable, Sendable {
    public let isActive: Bool
    
    public init(isActive: Bool) {
        self.isActive = isActive
    }
}
