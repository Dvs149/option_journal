import SwiftUI

// MARK: - Kite Button Styles
public struct KitePrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled
    
    public init() {}
    
    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13, weight: .medium))
            .foregroundColor(.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(
                RoundedRectangle(cornerRadius: 4)
                    .fill(isEnabled ? KiteTheme.brandBlue.opacity(configuration.isPressed ? 0.85 : 1.0) : Color.gray.opacity(0.4))
            )
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

public struct KiteOutlineButtonStyle: ButtonStyle {
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.isEnabled) private var isEnabled
    
    public init() {}
    
    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13, weight: .medium))
            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
            .padding(.horizontal, 14)
            .padding(.vertical, 7)
            .background(
                RoundedRectangle(cornerRadius: 4)
                    .fill(KiteTheme.surface(for: colorScheme).opacity(configuration.isPressed ? 0.7 : 1.0))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 4)
                    .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
            )
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

public typealias KiteSecondaryButtonStyle = KiteOutlineButtonStyle

public struct KiteGhostButtonStyle: ButtonStyle {
    @Environment(\.colorScheme) private var colorScheme
    
    public init() {}
    
    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13, weight: .regular))
            .foregroundColor(configuration.isPressed ? KiteTheme.brandBlue : KiteTheme.textSecondary(for: colorScheme))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - Kite Flat Card Container Modifier
public struct KiteCardModifier: ViewModifier {
    @Environment(\.colorScheme) private var colorScheme
    public var cornerRadius: CGFloat = 6
    
    public func body(content: Content) -> some View {
        content
            .background(KiteTheme.surface(for: colorScheme))
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
            )
    }
}

// MARK: - Kite Toggle Style (Zerodha Theme)
public struct KiteToggleStyle: ToggleStyle {
    public init() {}
    
    public func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 8) {
            configuration.label
            
            Button {
                withAnimation(.easeInOut(duration: 0.15)) {
                    configuration.isOn.toggle()
                }
            } label: {
                ZStack(alignment: configuration.isOn ? .trailing : .leading) {
                    RoundedRectangle(cornerRadius: 9)
                        .fill(configuration.isOn ? KiteTheme.brandBlue : Color(red: 0.22, green: 0.22, blue: 0.22))
                        .frame(width: 32, height: 18)
                    
                    Circle()
                        .fill(Color(red: 0.12, green: 0.12, blue: 0.12))
                        .frame(width: 14, height: 14)
                        .padding(2)
                }
            }
            .buttonStyle(.plain)
        }
    }
}

// MARK: - View Extensions
public extension View {
    func kiteCard(cornerRadius: CGFloat = 6) -> some View {
        self.modifier(KiteCardModifier(cornerRadius: cornerRadius))
    }
    
    func kitePrimaryButton() -> some View {
        self.buttonStyle(KitePrimaryButtonStyle())
    }
    
    func kiteOutlineButton() -> some View {
        self.buttonStyle(KiteOutlineButtonStyle())
    }
    
    func kiteGhostButton() -> some View {
        self.buttonStyle(KiteGhostButtonStyle())
    }
    
    func kiteToggle() -> some View {
        self.toggleStyle(KiteToggleStyle())
    }
}
