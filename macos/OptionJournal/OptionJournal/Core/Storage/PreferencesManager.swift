import SwiftUI
import Combine

public enum AppAppearance: String, CaseIterable, Identifiable {
    case dark = "dark"
    case light = "light"
    case system = "system"
    
    public var id: String { rawValue }
    
    public var displayName: String {
        switch self {
        case .dark: return "Kite Dark"
        case .light: return "Kite Light"
        case .system: return "System Default"
        }
    }
    
    public var colorScheme: ColorScheme? {
        switch self {
        case .dark: return .dark
        case .light: return .light
        case .system: return nil
        }
    }
}

public final class PreferencesManager: ObservableObject {
    public static let shared = PreferencesManager()
    
    @AppStorage("app_appearance") public var appearance: AppAppearance = .dark
    @AppStorage("privacy_mode_enabled") public var isPrivacyModeEnabled: Bool = false
    @AppStorage("last_selected_tab") public var lastSelectedTab: String = "dashboard"
    
    private init() {}
}
