import SwiftUI

public struct DropdownSettingsView: View {
    @Environment(\.colorScheme) private var colorScheme
    @StateObject private var viewModel = DropdownSettingsViewModel()
    
    public init() {}
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header
            headerView
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            // Content
            if viewModel.isLoading && viewModel.options.isEmpty {
                VStack {
                    Spacer()
                    ProgressView("Loading dropdown configuration...")
                        .font(.system(size: 13))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage, viewModel.options.isEmpty {
                VStack(spacing: 12) {
                    Spacer()
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 32))
                        .foregroundColor(KiteTheme.lossRed)
                    Text("Failed to load dropdown options")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    Text(error)
                        .font(.system(size: 12))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Button("Try Again") {
                        Task { await viewModel.loadData() }
                    }
                    .buttonStyle(KiteSecondaryButtonStyle())
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        // Category Filter Bar
                        categoryFilterBar
                        
                        // Options Grid / List
                        VStack(spacing: 8) {
                            ForEach(viewModel.filteredOptions) { item in
                                optionRow(item)
                            }
                        }
                    }
                    .padding(20)
                }
            }
        }
        .background(KiteTheme.canvas(for: colorScheme))
        .task {
            await viewModel.loadData()
        }
    }
    
    // MARK: - Header
    private var headerView: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Dropdown Manager")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                Text("Enable or disable instruments, strategies, and option classifications across trade entry forms")
                    .font(.system(size: 12))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
            
            Spacer()
            
            Button(action: {
                Task { await viewModel.loadData() }
            }) {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
            .buttonStyle(PlainButtonStyle())
            .padding(6)
            .background(KiteTheme.surface(for: colorScheme))
            .overlay(
                RoundedRectangle(cornerRadius: 4)
                    .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
            )
            .help("Refresh Dropdown Options")
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
    }
    
    // MARK: - Category Filter Bar
    private var categoryFilterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(viewModel.dropdownKeys, id: \.self) { key in
                    let isSelected = viewModel.selectedDropdownKey == key
                    Button(action: {
                        viewModel.selectedDropdownKey = key
                    }) {
                        Text(formatKeyLabel(key))
                            .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                            .foregroundColor(isSelected ? KiteTheme.brandBlue : KiteTheme.textSecondary(for: colorScheme))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(
                                isSelected ? KiteTheme.brandBlue.opacity(0.12) : KiteTheme.surface(for: colorScheme)
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 4)
                                    .stroke(
                                        isSelected ? KiteTheme.brandBlue : KiteTheme.border(for: colorScheme),
                                        lineWidth: 1
                                    )
                            )
                            .cornerRadius(4)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
        }
    }
    
    // MARK: - Option Row
    private func optionRow(_ item: DropdownOptionItem) -> some View {
        HStack(spacing: 12) {
            // Category Badge
            Text(formatKeyLabel(item.dropdownKey).uppercased())
                .font(.system(size: 9, weight: .bold))
                .foregroundColor(KiteTheme.brandBlue)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(KiteTheme.brandBlue.opacity(0.12))
                .cornerRadius(3)
                .frame(width: 140, alignment: .leading)
            
            // Value
            Text(item.optionValue)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
            
            if let label = item.optionLabel, !label.isEmpty && label != item.optionValue {
                Text("(\(label))")
                    .font(.system(size: 11))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
            
            Spacer()
            
            // Status Tag
            Text(item.isActive ? "ACTIVE" : "DISABLED")
                .font(.system(size: 9, weight: .bold))
                .foregroundColor(item.isActive ? KiteTheme.profitGreen : KiteTheme.textSecondary(for: colorScheme))
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(
                    (item.isActive ? KiteTheme.profitGreen : KiteTheme.textSecondary(for: colorScheme)).opacity(0.12)
                )
                .cornerRadius(3)
            
            // Toggle Switch
            Toggle("", isOn: Binding(
                get: { item.isActive },
                set: { _ in
                    Task { await viewModel.toggleStatus(for: item) }
                }
            ))
            .toggleStyle(SwitchToggleStyle(tint: KiteTheme.brandBlue))
            .labelsHidden()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(KiteTheme.surface(for: colorScheme))
        .overlay(
            RoundedRectangle(cornerRadius: 4)
                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
        )
    }
    
    private func formatKeyLabel(_ key: String) -> String {
        switch key {
        case "ALL": return "All Options"
        case "index_name": return "Indices / Symbols"
        case "strategy_name": return "Strategies"
        case "trading_type": return "Trading Types"
        case "option_type": return "Option Types"
        case "date_period": return "Date Periods"
        default: return key.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }
}
