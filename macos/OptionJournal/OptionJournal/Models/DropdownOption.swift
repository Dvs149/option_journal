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
}

public struct ToggleDropdownStatusRequest: Codable, Sendable {
    public let isActive: Bool
    
    public init(isActive: Bool) {
        self.isActive = isActive
    }
}
