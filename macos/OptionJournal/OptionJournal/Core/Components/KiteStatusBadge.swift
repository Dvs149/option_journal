import SwiftUI

public enum BadgeVariant {
    case win
    case loss
    case callOption   // CE
    case putOption    // PE
    case buy
    case sell
    case neutral
    case custom(color: Color, text: String)
}

public struct KiteStatusBadge: View {
    public let text: String
    public let variant: BadgeVariant
    
    public init(text: String, variant: BadgeVariant = .neutral) {
        self.text = text
        self.variant = variant
    }
    
    public init(optionType: String) {
        let upper = optionType.uppercased()
        self.text = upper
        if upper.contains("CE") || upper.contains("CALL") {
            self.variant = .callOption
        } else if upper.contains("PE") || upper.contains("PUT") {
            self.variant = .putOption
        } else {
            self.variant = .neutral
        }
    }
    
    public init(pnl: Double) {
        if pnl > 0 {
            self.text = "WIN"
            self.variant = .win
        } else if pnl < 0 {
            self.text = "LOSS"
            self.variant = .loss
        } else {
            self.text = "EVEN"
            self.variant = .neutral
        }
    }
    
    private var foregroundColor: Color {
        switch variant {
        case .win:
            return KiteTheme.profitGreen
        case .loss:
            return KiteTheme.lossRed
        case .callOption:
            return Color(red: 0.15, green: 0.55, blue: 0.95) // Bright Blue
        case .putOption:
            return Color(red: 0.65, green: 0.35, blue: 0.85) // Purple / Put
        case .buy:
            return KiteTheme.profitGreen
        case .sell:
            return KiteTheme.lossRed
        case .neutral:
            return Color.gray
        case .custom(let color, _):
            return color
        }
    }
    
    private var backgroundColor: Color {
        foregroundColor.opacity(0.12)
    }
    
    public var body: some View {
        Text(text)
            .font(.system(size: 11, weight: .semibold, design: .rounded))
            .foregroundColor(foregroundColor)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(
                RoundedRectangle(cornerRadius: 3)
                    .fill(backgroundColor)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 3)
                    .stroke(foregroundColor.opacity(0.25), lineWidth: 0.5)
            )
    }
}
