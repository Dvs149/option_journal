import SwiftUI

public struct DropdownSettingsView: View {
    @StateObject private var viewModel = DropdownSettingsViewModel()
    @ObservedObject private var preferences = PreferencesManager.shared
    @Environment(\.colorScheme) private var colorScheme
    
    public init() {}
    
    public var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(alignment: .leading, spacing: 20) {
                // MARK: - Header
                headerSection
                
                // MARK: - Top 4 Metric Cards
                topMetricsSection
                
                // MARK: - Module Filter Bar
                moduleFilterBarSection
                
                // MARK: - Add Trade Section Header
                addTradeSectionHeader
                
                // MARK: - 2x2 Grid Cards: Index, Trading Type, Option Type, Strategy Name
                VStack(spacing: 16) {
                    HStack(alignment: .top, spacing: 16) {
                        dropdownGroupCard(
                            title: "Index",
                            activeCount: viewModel.indexOptions.filter { $0.isActive }.count,
                            totalCount: 9,
                            key: "index_name",
                            options: viewModel.indexOptions,
                            badgeColor: Color(hex: "3b82f6")
                        )
                        .frame(maxWidth: .infinity)
                        
                        dropdownGroupCard(
                            title: "Trading Type",
                            activeCount: viewModel.tradingTypeOptions.filter { $0.isActive }.count,
                            totalCount: 5,
                            key: "trading_type",
                            options: viewModel.tradingTypeOptions,
                            badgeColor: Color(hex: "10b981")
                        )
                        .frame(maxWidth: .infinity)
                    }
                    .frame(maxWidth: .infinity)
                    
                    HStack(alignment: .top, spacing: 16) {
                        dropdownGroupCard(
                            title: "Option Type",
                            activeCount: viewModel.optionTypeOptions.filter { $0.isActive }.count,
                            totalCount: 3,
                            key: "option_type",
                            options: viewModel.optionTypeOptions,
                            badgeColor: Color(hex: "06b6d4")
                        )
                        .frame(maxWidth: .infinity)
                        
                        dropdownGroupCard(
                            title: "Strategy Name",
                            activeCount: viewModel.strategyOptions.filter { $0.isActive }.count,
                            totalCount: 14,
                            key: "strategy_name",
                            options: viewModel.strategyOptions,
                            badgeColor: Color(hex: "a855f7")
                        )
                        .frame(maxWidth: .infinity)
                    }
                    .frame(maxWidth: .infinity)
                    
                    dropdownGroupCard(
                        title: "Market Condition",
                        activeCount: viewModel.marketConditionOptions.filter { $0.isActive }.count,
                        totalCount: 6,
                        key: "market_conditions",
                        options: viewModel.marketConditionOptions,
                        badgeColor: Color(hex: "f59e0b")
                    )
                    .frame(maxWidth: .infinity)
                }
                .frame(maxWidth: .infinity)
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .background(Color(hex: "0b111e"))
        .task {
            await viewModel.loadData()
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Dropdown & Option Manager")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundColor(.white)
                Text("Manage all options & dropdown lists module-wise (Add Trade, All Trades, Journal). Easily activate, deactivate, or add custom options.")
                    .font(.system(size: 13))
                    .foregroundColor(Color(hex: "94a3b8"))
            }
            
            Spacer()
            
            HStack(spacing: 8) {
                Button {
                    // Reset defaults
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "arrow.counterclockwise")
                        Text("Reset Defaults")
                    }
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 7)
                    .background(Color(hex: "121b2d"))
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(Color(hex: "1e293b"), lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
                
                Button {
                    // Add Custom Option
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "plus")
                        Text("Add Custom Option")
                    }
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 7)
                    .background(Color(hex: "3b82f6"))
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                }
                .buttonStyle(.plain)
            }
        }
    }
    
    // MARK: - Top 4 Metric Cards
    private var topMetricsSection: some View {
        HStack(spacing: 12) {
            statCard("Total Dropdown Options", "\(viewModel.totalOptionsCount)", "slider.horizontal.3", Color(hex: "3b82f6"))
            statCard("Active in Dropdowns", "\(viewModel.activeOptionsCount)", "checkmark.circle.fill", Color(hex: "10b981"))
            statCard("Deactivated (Hidden)", "\(viewModel.deactivatedCount)", "eye.slash.fill", Color(hex: "64748b"))
            statCard("Configured Modules", "\(viewModel.configuredModulesCount)", "square.stack.3d.up.fill", Color(hex: "a855f7"))
        }
    }
    
    private func statCard(_ title: String, _ value: String, _ icon: String, _ color: Color) -> some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.system(size: 11, weight: .medium)).foregroundColor(Color(hex: "94a3b8"))
                Text(value).font(.system(size: 20, weight: .bold, design: .monospaced)).foregroundColor(.white)
            }
            Spacer()
            ZStack {
                Circle().fill(color.opacity(0.15)).frame(width: 36, height: 36)
                Image(systemName: icon).font(.system(size: 14)).foregroundColor(color)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Module Filter Bar
    private var moduleFilterBarSection: some View {
        HStack {
            HStack(spacing: 4) {
                modulePill("All Modules (81)", isSelected: viewModel.selectedModulePill.contains("All"))
                modulePill("Add Trade (37)", isSelected: viewModel.selectedModulePill.contains("Add Trade"))
                modulePill("All Trades (34)", isSelected: viewModel.selectedModulePill.contains("All Trades"))
                modulePill("Trading Journal (10)", isSelected: viewModel.selectedModulePill.contains("Journal"))
            }
            
            Spacer()
            
            HStack(spacing: 8) {
                HStack(spacing: 2) {
                    ForEach(["All", "Active Only", "Inactive"], id: \.self) { f in
                        Button {
                            viewModel.statusFilter = f
                        } label: {
                            Text(f)
                                .font(.system(size: 11, weight: viewModel.statusFilter == f ? .bold : .medium))
                                .foregroundColor(viewModel.statusFilter == f ? .white : Color(hex: "94a3b8"))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 5)
                                .background(viewModel.statusFilter == f ? Color(hex: "f97316") : Color.clear)
                                .clipShape(RoundedRectangle(cornerRadius: 5))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(2)
                .background(Color(hex: "121b2d"))
                .clipShape(RoundedRectangle(cornerRadius: 6))
                
                HStack(spacing: 6) {
                    Image(systemName: "magnifyingglass").font(.system(size: 10)).foregroundColor(Color(hex: "64748b"))
                    TextField("Search options...", text: $viewModel.searchQuery)
                        .textFieldStyle(.plain)
                        .font(.system(size: 11))
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 5)
                .background(Color(hex: "0e1524"))
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(Color(hex: "1e293b"), lineWidth: 1)
                )
                .frame(width: 150)
            }
        }
    }
    
    private func modulePill(_ label: String, isSelected: Bool) -> some View {
        Button {
            viewModel.selectedModulePill = label
        } label: {
            Text(label)
                .font(.system(size: 11, weight: isSelected ? .bold : .medium))
                .foregroundColor(isSelected ? .white : Color(hex: "94a3b8"))
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(isSelected ? Color(hex: "f43f5e") : Color(hex: "121b2d"))
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(Color(hex: "1e293b"), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }
    
    // MARK: - Add Trade Section Header
    private var addTradeSectionHeader: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 6) {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .font(.system(size: 12))
                    .foregroundColor(Color(hex: "3b82f6"))
                Text("Add Trade")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                Text("(5 Dropdowns)")
                    .font(.system(size: 11))
                    .foregroundColor(Color(hex: "64748b"))
            }
            Text("Options used when entering new trades (Index, Trading Type, Strategy, Market Condition, Option Type)")
                .font(.system(size: 11))
                .foregroundColor(Color(hex: "94a3b8"))
        }
        .padding(.top, 4)
    }
    
    // MARK: - Dropdown Group Card
    private func dropdownGroupCard(
        title: String,
        activeCount: Int,
        totalCount: Int,
        key: String,
        options: [DropdownOptionItem],
        badgeColor: Color
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            // Group Header
            HStack {
                VStack(alignment: .leading, spacing: 1) {
                    HStack(spacing: 6) {
                        Text(title)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                        
                        Text("\(activeCount) / \(totalCount) Active")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(Color(hex: "10b981"))
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(Color(hex: "10b981").opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                    Text("Key: \(key)")
                        .font(.system(size: 9, design: .monospaced))
                        .foregroundColor(Color(hex: "64748b"))
                }
                
                Spacer()
                
                HStack(spacing: 6) {
                    Text("Enable All").font(.system(size: 9)).foregroundColor(Color(hex: "94a3b8"))
                    Text("Disable All").font(.system(size: 9)).foregroundColor(Color(hex: "94a3b8"))
                    Image(systemName: "plus").font(.system(size: 10)).foregroundColor(Color(hex: "3b82f6"))
                }
            }
            
            Divider().background(Color(hex: "1e293b"))
            
            // Options list
            VStack(spacing: 6) {
                ForEach(options) { opt in
                    HStack {
                        // Badge
                        Text(opt.optionValue)
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(badgeColor)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(badgeColor.opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                            .frame(width: 80, alignment: .leading)
                        
                        VStack(alignment: .leading, spacing: 1) {
                            Text(opt.optionLabel ?? opt.optionValue)
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.white)
                            Text(opt.isActive ? "Status: Active" : "Status: Inactive (Hidden)")
                                .font(.system(size: 9))
                                .foregroundColor(opt.isActive ? Color(hex: "10b981") : Color(hex: "64748b"))
                        }
                        
                        Spacer()
                        
                        Image(systemName: "pencil").font(.system(size: 10)).foregroundColor(Color(hex: "64748b"))
                        
                        // Switch toggle
                        Toggle("", isOn: Binding(
                            get: { opt.isActive },
                            set: { _ in viewModel.toggleOptionStatus(in: key, optionId: opt.id) }
                        ))
                        .labelsHidden()
                        .scaleEffect(0.65)
                    }
                    .padding(8)
                    .background(Color(hex: "0e1524"))
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                }
            }
            
            Divider().background(Color(hex: "1e293b"))
            
            HStack {
                Text("Changes take effect instantly in Add Trade")
                    .font(.system(size: 9))
                    .foregroundColor(Color(hex: "64748b"))
                Spacer()
                Text("+ Add Option")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(Color(hex: "3b82f6"))
            }
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
}
