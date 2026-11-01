import SwiftUI

public struct NativeToolbarModifier: ViewModifier {
    @EnvironmentObject private var appState: AppState
    @ObservedObject private var preferences = PreferencesManager.shared
    @Environment(\.colorScheme) private var colorScheme
    @Binding public var selection: String
    
    @State private var isCustomDatePopoverPresented: Bool = false
    @State private var tempStartDate: Date = Calendar.current.date(byAdding: .month, value: -1, to: Date()) ?? Date()
    @State private var tempEndDate: Date = Date()
    
    public init(selection: Binding<String>) {
        self._selection = selection
    }
    
    public func body(content: Content) -> some View {
        content
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    HStack(spacing: 8) {
                        dateFilterMenu
                        accountPill
                        privacyTogglePill
                        appearanceSwitcherMenu
                        addTradeButton
                    }
                }
            }
    }
    
    // MARK: - 1. Date Range Filter Dropdown
    @ViewBuilder
    private var dateFilterMenu: some View {
        Menu {
            ForEach(DateRangeFilter.allCases) { filter in
                Button {
                    if filter == .custom {
                        tempStartDate = appState.customStartDate
                        tempEndDate = appState.customEndDate
                        isCustomDatePopoverPresented = true
                    } else {
                        appState.selectedDateFilter = filter
                        appState.dateFilterTrigger += 1
                    }
                } label: {
                    HStack {
                        Text(filter.displayName)
                        if appState.selectedDateFilter == filter && filter != .custom {
                            Image(systemName: "checkmark")
                        }
                    }
                }
            }
        } label: {
            HStack(spacing: 6) {
                Image(systemName: "calendar")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(DashboardPalette.accentBlue)
                
                Text(appState.dateFilterDisplayTitle)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(colorScheme == .dark ? DashboardPalette.textPrimaryDark : Color(red: 0.1, green: 0.1, blue: 0.1))
                
                Image(systemName: "chevron.down")
                    .font(.system(size: 8, weight: .bold))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
            }
            .padding(.horizontal, 10)
            .frame(height: 28)
            .background(
                Capsule()
                    .fill(colorScheme == .dark ? DashboardPalette.cardSurfaceDark : Color.white)
            )
            .overlay(
                Capsule()
                    .stroke(
                        appState.selectedDateFilter != .allTime
                            ? DashboardPalette.accentBlue.opacity(0.85)
                            : (colorScheme == .dark ? DashboardPalette.borderDark : Color(red: 0.85, green: 0.88, blue: 0.92)),
                        lineWidth: 1
                    )
            )
        }
        .menuStyle(.borderlessButton)
        .fixedSize()
        .padding(.leading,10)
        .popover(isPresented: $isCustomDatePopoverPresented, arrowEdge: .bottom) {
            VStack(alignment: .leading, spacing: 14) {
                Text("Select Date Range")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(colorScheme == .dark ? DashboardPalette.textPrimaryDark : Color(red: 0.1, green: 0.1, blue: 0.1))
                
                VStack(alignment: .leading, spacing: 6) {
                    Text("Start Date")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(DashboardPalette.textSecondaryDark)
                    DatePicker("", selection: $tempStartDate, displayedComponents: .date)
                        .datePickerStyle(.compact)
                        .labelsHidden()
                }
                
                VStack(alignment: .leading, spacing: 6) {
                    Text("End Date")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundColor(DashboardPalette.textSecondaryDark)
                    DatePicker("", selection: $tempEndDate, displayedComponents: .date)
                        .datePickerStyle(.compact)
                        .labelsHidden()
                }
                
                Divider()
                    .background(DashboardPalette.borderDark)
                
                HStack(spacing: 10) {
                    Button("Cancel") {
                        isCustomDatePopoverPresented = false
                    }
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                    .buttonStyle(.plain)
                    
                    Spacer()
                    
                    Button {
                        appState.customStartDate = tempStartDate
                        appState.customEndDate = tempEndDate
                        appState.selectedDateFilter = .custom
                        appState.dateFilterTrigger += 1
                        isCustomDatePopoverPresented = false
                    } label: {
                        Text("Apply Range")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color(red: 0.15, green: 0.48, blue: 0.92))
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(16)
            .frame(width: 240)
            .background(colorScheme == .dark ? DashboardPalette.cardSurfaceDark : Color.white)
        }
    }
    
    // MARK: - 2. Account Information Pill
    @ViewBuilder
    private var accountPill: some View {
        let account = appState.currentUser?.defaultAccount
        let broker = account?.brokerName ?? "Zerodha"
        let capital = account?.initialCapital ?? 800000.0
        
        HStack(spacing: 6) {
            Circle()
                .fill(DashboardPalette.profitGreen)
                .frame(width: 6, height: 6)
            
            Text(broker)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(colorScheme == .dark ? DashboardPalette.textPrimaryDark : Color(red: 0.1, green: 0.1, blue: 0.1))
            
            Text("•")
                .font(.system(size: 10))
                .foregroundColor(DashboardPalette.textMutedDark)
            
            Text(CurrencyFormatter.formatCompact(amount: capital, isPrivacyMode: preferences.isPrivacyModeEnabled))
                .font(.system(size: 11, weight: .medium, design: .monospaced))
                .foregroundColor(DashboardPalette.textSecondaryDark)
        }
        .padding(.horizontal, 10)
        .frame(height: 28)
        .background(
            Capsule()
                .fill(colorScheme == .dark ? DashboardPalette.cardSurfaceDark : Color.white)
        )
        .overlay(
            Capsule()
                .stroke(colorScheme == .dark ? DashboardPalette.borderDark : Color(red: 0.85, green: 0.88, blue: 0.92), lineWidth: 1)
        )
    }
    
    // MARK: - 3. Privacy Mode Toggle Pill (Custom Clean Switch)
    @ViewBuilder
    private var privacyTogglePill: some View {
        Button {
            withAnimation(.easeInOut(duration: 0.18)) {
                preferences.isPrivacyModeEnabled.toggle()
            }
        } label: {
            HStack(spacing: 7) {
                Text("Privacy")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                
                // Custom Mini Switch Track & Thumb
                ZStack(alignment: preferences.isPrivacyModeEnabled ? .trailing : .leading) {
                    Capsule()
                        .fill(preferences.isPrivacyModeEnabled ? DashboardPalette.accentBlue : Color(red: 0.20, green: 0.24, blue: 0.32))
                        .frame(width: 26, height: 14)
                    
                    Circle()
                        .fill(Color.white)
                        .frame(width: 10, height: 10)
                        .padding(.horizontal, 2)
                }
            }
            .padding(.horizontal, 10)
            .frame(height: 28)
            .background(
                Capsule()
                    .fill(colorScheme == .dark ? DashboardPalette.cardSurfaceDark : Color.white)
            )
            .overlay(
                Capsule()
                    .stroke(colorScheme == .dark ? DashboardPalette.borderDark : Color(red: 0.85, green: 0.88, blue: 0.92), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .help("Mask financial figures and P&L numbers")
    }
    
    // MARK: - 4. Appearance Switcher Menu
    @ViewBuilder
    private var appearanceSwitcherMenu: some View {
        Menu {
            ForEach(AppAppearance.allCases) { mode in
                Button {
                    preferences.appearance = mode
                } label: {
                    HStack {
                        Text(mode.displayName)
                        if preferences.appearance == mode {
                            Image(systemName: "checkmark")
                        }
                    }
                }
            }
        } label: {
            HStack(spacing: 3) {
                Image(systemName: preferences.appearance == .dark ? "moon.fill" : (preferences.appearance == .light ? "sun.max.fill" : "circle.righthalf.filled"))
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(colorScheme == .dark ? DashboardPalette.textPrimaryDark : Color(red: 0.1, green: 0.1, blue: 0.1))
                
                Image(systemName: "chevron.down")
                    .font(.system(size: 8, weight: .bold))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
            }
            .padding(.horizontal, 9)
            .frame(height: 28)
            .background(
                Capsule()
                    .fill(colorScheme == .dark ? DashboardPalette.cardSurfaceDark : Color.white)
            )
            .overlay(
                Capsule()
                    .stroke(colorScheme == .dark ? DashboardPalette.borderDark : Color(red: 0.85, green: 0.88, blue: 0.92), lineWidth: 1)
            )
        }
        .menuStyle(.borderlessButton)
        .fixedSize()
        .help("Appearance Mode")
    }
    
    // MARK: - 5. Quick Add Trade Button
    @ViewBuilder
    private var addTradeButton: some View {
        Button {
            selection = "add-trade"
        } label: {
            HStack(spacing: 5) {
                Image(systemName: "plus")
                    .font(.system(size: 11, weight: .bold))
                Text("Add Trade")
                    .font(.system(size: 11, weight: .bold))
            }
            .foregroundColor(.white)
            .padding(.horizontal, 14)
            .frame(height: 28)
            .background(
                Capsule()
                    .fill(Color(red: 0.15, green: 0.48, blue: 0.92))
            )
        }
        .buttonStyle(.plain)
        .keyboardShortcut("n", modifiers: .command)
        .help("New Trade (⌘N)")
        .padding(.horizontal, 10)
    }
}

public extension View {
    func nativeToolbar(selection: Binding<String>) -> some View {
        self.modifier(NativeToolbarModifier(selection: selection))
    }
}
