import SwiftUI

public struct SidebarItem: Identifiable, Hashable {
    public let id: String
    public let name: String
    public let icon: String
    
    public init(id: String, name: String, icon: String) {
        self.id = id
        self.name = name
        self.icon = icon
    }
}

public struct SidebarView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.colorScheme) private var colorScheme
    @Binding public var selection: String
    
    public static let navigationItems: [SidebarItem] = [
        SidebarItem(id: "dashboard", name: "Dashboard", icon: "square.grid.2x2"),
        SidebarItem(id: "add-trade", name: "Add Trade", icon: "plus.square"),
        SidebarItem(id: "trades", name: "All Trades", icon: "list.bullet.rectangle"),
        SidebarItem(id: "calendar", name: "Trading Calendar", icon: "calendar"),
        SidebarItem(id: "equity-curve", name: "Equity Curve", icon: "chart.line.uptrend.xyaxis"),
        SidebarItem(id: "risk-management", name: "Risk Management", icon: "shield"),
        SidebarItem(id: "journal", name: "Trading Journal", icon: "book.closed"),
        SidebarItem(id: "strategy-analysis", name: "Strategy Analysis", icon: "chart.pie"),
        SidebarItem(id: "analytics", name: "Analytics & Reports", icon: "chart.bar.xaxis"),
        SidebarItem(id: "capital-management", name: "Capital Management", icon: "wallet.pass"),
        SidebarItem(id: "pine-scripts", name: "Pine Script Manager", icon: "chevron.left.forwardslash.chevron.right"),
        SidebarItem(id: "dropdown-manager", name: "Dropdown Manager", icon: "slider.horizontal.3"),
        SidebarItem(id: "settings", name: "Settings", icon: "gearshape")
    ]
    
    public init(selection: Binding<String>) {
        self._selection = selection
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            // MARK: - Brand Header
            HStack(spacing: 10) {
                AppLogoView(size: 28)
                
                VStack(alignment: .leading, spacing: 1) {
                    Text("TradeJournal")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    
                    Text("OPTIONS PRO")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(KiteTheme.brandOrange)
                        .tracking(0.8)
                }
                
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .overlay(
                Rectangle()
                    .frame(height: 1)
                    .foregroundColor(KiteTheme.border(for: colorScheme)),
                alignment: .bottom
            )
            
            // MARK: - Navigation Items
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 2) {
                    ForEach(Self.navigationItems) { item in
                        SidebarRow(
                            item: item,
                            isSelected: selection == item.id,
                            onSelect: {
                                selection = item.id
                            }
                        )
                    }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 10)
            }
            
            Spacer(minLength: 0)
            
            // MARK: - User Footer Section
            if let user = appState.currentUser {
                HStack(spacing: 10) {
                    Circle()
                        .fill(KiteTheme.surfaceElevated(for: colorScheme))
                        .frame(width: 28, height: 28)
                        .overlay(
                            Text(String(user.name.prefix(1)).uppercased())
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                        )
                    
                    VStack(alignment: .leading, spacing: 1) {
                        Text(user.name)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                            .lineLimit(1)
                        
                        Text(user.username ?? user.email)
                            .font(.system(size: 10))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                            .lineLimit(1)
                    }
                    
                    Spacer()
                    
                    Button {
                        Task {
                            await appState.logout()
                        }
                    } label: {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .font(.system(size: 12))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    }
                    .buttonStyle(.plain)
                    .help("Logout")
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(KiteTheme.surface(for: colorScheme))
                .overlay(
                    Rectangle()
                        .frame(height: 1)
                        .foregroundColor(KiteTheme.border(for: colorScheme)),
                    alignment: .top
                )
            }
        }
        .background(KiteTheme.surface(for: colorScheme))
        .frame(minWidth: 200, idealWidth: 220, maxWidth: 260)
    }
}

// MARK: - Sidebar Row Component
private struct SidebarRow: View {
    @Environment(\.colorScheme) private var colorScheme
    let item: SidebarItem
    let isSelected: Bool
    let onSelect: () -> Void
    @State private var isHovered: Bool = false
    
    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 10) {
                Image(systemName: item.icon)
                    .font(.system(size: 13, weight: isSelected ? .semibold : .regular))
                    .foregroundColor(isSelected ? KiteTheme.brandOrange : (isHovered ? KiteTheme.textPrimary(for: colorScheme) : KiteTheme.textSecondary(for: colorScheme)))
                    .frame(width: 18, alignment: .center)
                
                Text(item.name)
                    .font(.system(size: 12.5, weight: isSelected ? .semibold : .medium))
                    .foregroundColor(isSelected ? KiteTheme.brandOrange : (isHovered ? KiteTheme.textPrimary(for: colorScheme) : KiteTheme.textSecondary(for: colorScheme)))
                
                Spacer()
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(
                RoundedRectangle(cornerRadius: 6)
                    .fill(
                        (isHovered && !isSelected)
                            ? (colorScheme == .dark ? Color(red: 0.16, green: 0.16, blue: 0.16) : Color(red: 0.94, green: 0.94, blue: 0.94))
                            : Color.clear
                    )
            )
        }
        .buttonStyle(.plain)
        .onHover { hovering in
            // No hover effect when active
            if !isSelected {
                isHovered = hovering
            } else {
                isHovered = false
            }
        }
    }
}
