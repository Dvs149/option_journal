import SwiftUI

// MARK: - Zerodha Kite Design System Theme
public enum KiteTheme {
    // MARK: - Brand & Action Tokens
    public static let brandBlue = Color(red: 0.220, green: 0.494, blue: 0.820)       // #387ED1 (Kite Primary Action)
    public static let brandOrange = Color(red: 1.000, green: 0.341, blue: 0.133)     // #FF5722 (Active Indicator & Negative Badge)
    
    // MARK: - Financial P&L Tokens
    public static let profitGreen = Color(red: 0.298, green: 0.686, blue: 0.314)    // #4CAF50 (Profits & Wins)
    public static let lossRed = Color(red: 0.875, green: 0.318, blue: 0.298)        // #DF514C (Losses)
    
    // MARK: - Dark Mode Backgrounds & Surfaces
    public static let canvasDark = Color(red: 0.098, green: 0.098, blue: 0.098)     // #191919
    public static let surfaceDark = Color(red: 0.118, green: 0.118, blue: 0.118)    // #1E1E1E
    public static let surfaceElevatedDark = Color(red: 0.145, green: 0.145, blue: 0.145) // #252525
    public static let borderDark = Color(red: 0.176, green: 0.176, blue: 0.176)     // #2D2D2D
    
    // MARK: - Dark Mode Typography
    public static let textPrimaryDark = Color(red: 0.90, green: 0.90, blue: 0.90)   // #E6E6E6
    public static let textSecondaryDark = Color(red: 0.62, green: 0.62, blue: 0.62) // #9E9E9E
    public static let textMutedDark = Color(red: 0.45, green: 0.45, blue: 0.45)     // #737373
    
    // MARK: - Light Mode Backgrounds & Surfaces
    public static let canvasLight = Color(red: 0.965, green: 0.965, blue: 0.965)    // #F6F6F6
    public static let surfaceLight = Color(red: 1.000, green: 1.000, blue: 1.000)   // #FFFFFF
    public static let surfaceElevatedLight = Color(red: 0.98, green: 0.98, blue: 0.98) // #FAFAFA
    public static let borderLight = Color(red: 0.88, green: 0.88, blue: 0.88)       // #E0E0E0
    
    // MARK: - Light Mode Typography
    public static let textPrimaryLight = Color(red: 0.13, green: 0.13, blue: 0.13)  // #212121
    public static let textSecondaryLight = Color(red: 0.40, green: 0.40, blue: 0.40)// #666666
    public static let textMutedLight = Color(red: 0.60, green: 0.60, blue: 0.60)    // #999999
    
    // MARK: - Dynamic Adaptive Helpers
    public static func canvas(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? canvasDark : canvasLight
    }
    
    public static func surface(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? surfaceDark : surfaceLight
    }
    
    public static func surfaceElevated(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? surfaceElevatedDark : surfaceElevatedLight
    }
    
    public static func border(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? borderDark : borderLight
    }
    
    public static func textPrimary(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? textPrimaryDark : textPrimaryLight
    }
    
    public static func textSecondary(for colorScheme: ColorScheme) -> Color {
        colorScheme == .dark ? textSecondaryDark : textSecondaryLight
    }
    
    public static func pnlColor(for value: Double) -> Color {
        if value > 0 {
            return profitGreen
        } else if value < 0 {
            return lossRed
        }
        return textSecondaryDark
    }
}

// MARK: - Indian Financial Number Formatter
public enum CurrencyFormatter {
    private static let indianNumberFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "₹"
        formatter.maximumFractionDigits = 2
        formatter.minimumFractionDigits = 2
        formatter.locale = Locale(identifier: "en_IN")
        return formatter
    }()
    
    private static let compactFormatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "₹"
        formatter.maximumFractionDigits = 0
        formatter.minimumFractionDigits = 0
        formatter.locale = Locale(identifier: "en_IN")
        return formatter
    }()
    
    public static func format(amount: Double, includeSign: Bool = false, isPrivacyMode: Bool = false) -> String {
        if isPrivacyMode {
            return "••••••"
        }
        let formatted = indianNumberFormatter.string(from: NSNumber(value: abs(amount))) ?? "₹\(abs(amount))"
        if amount > 0 {
            return includeSign ? "+\(formatted)" : formatted
        } else if amount < 0 {
            return "-\(formatted)"
        }
        return formatted
    }
    
    public static func formatCompact(amount: Double, isPrivacyMode: Bool = false) -> String {
        if isPrivacyMode {
            return "••••••"
        }
        let formatted = compactFormatter.string(from: NSNumber(value: abs(amount))) ?? "₹\(abs(amount))"
        if amount < 0 {
            return "-\(formatted)"
        }
        return formatted
    }
    
    public static func formatPercent(value: Double, includeSign: Bool = true, isPrivacyMode: Bool = false) -> String {
        if isPrivacyMode {
            return "•••%"
        }
        let sign = value > 0 ? "+" : ""
        let formatted = String(format: "%.2f%%", value)
        return includeSign && value > 0 ? "\(sign)\(formatted)" : formatted
    }
}
