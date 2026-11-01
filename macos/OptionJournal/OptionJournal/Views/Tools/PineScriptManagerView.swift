import SwiftUI

public struct PineScriptManagerView: View {
    @StateObject private var viewModel = PineScriptViewModel()
    @ObservedObject private var preferences = PreferencesManager.shared
    @Environment(\.colorScheme) private var colorScheme
    
    public init() {}
    
    public var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(alignment: .leading, spacing: 20) {
                // MARK: - Header
                headerSection
                
                // MARK: - Top 5 Metric Cards
                topMetricsSection
                
                // MARK: - Filter & Search Bar
                filterSearchBarSection
                
                // MARK: - Main Split: Script Cards List + Code Inspector
                HStack(alignment: .top, spacing: 16) {
                    scriptCardsList
                        .frame(width: 380)
                    
                    if let script = viewModel.selectedScript {
                        scriptInspectorCard(for: script)
                            .frame(minWidth: 480, maxWidth: .infinity)
                    }
                }
                .frame(maxWidth: .infinity)
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .background(Color(hex: "0b111e"))
        .task {
            await viewModel.loadScripts()
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        HStack {
            HStack(spacing: 12) {
                ZStack {
                    Circle().fill(Color(hex: "3b82f6").opacity(0.2)).frame(width: 44, height: 44)
                    Image(systemName: "curlybraces")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(Color(hex: "3b82f6"))
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Pine Script Manager")
                        .font(.system(size: 26, weight: .bold))
                        .foregroundColor(.white)
                    Text("Store, organize, copy and deploy TradingView indicators, options strategies, and webhook alerts.")
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "94a3b8"))
                }
            }
            
            Spacer()
            
            HStack(spacing: 8) {
                Button {
                    // Export
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "square.and.arrow.up")
                        Text("Export")
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
                    // Import
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "square.and.arrow.down")
                        Text("Import")
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
                    // New Script
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "plus")
                        Text("New Script")
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
    
    // MARK: - Top 5 Metric Cards
    private var topMetricsSection: some View {
        HStack(spacing: 12) {
            statCard(title: "Total Scripts", value: "\(viewModel.totalScriptsCount)", icon: "doc.text.fill", color: Color(hex: "3b82f6"))
            statCard(title: "Strategies", value: "\(viewModel.strategiesCount)", icon: "bolt.fill", color: Color(hex: "a855f7"))
            statCard(title: "Indicators", value: "\(viewModel.indicatorsCount)", icon: "square.stack.3d.up.fill", color: Color(hex: "06b6d4"))
            statCard(title: "Webhook Alerts", value: "\(viewModel.webhookAlertsCount)", icon: "waveform.path.ecg", color: Color(hex: "f59e0b"))
            statCard(title: "Starred", value: "\(viewModel.starredCount)", icon: "star.fill", color: Color(hex: "f59e0b"))
        }
    }
    
    private func statCard(title: String, value: String, icon: String, color: Color) -> some View {
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(color.opacity(0.15)).frame(width: 36, height: 36)
                Image(systemName: icon).font(.system(size: 13)).foregroundColor(color)
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 11, weight: .medium)).foregroundColor(Color(hex: "94a3b8"))
                Text(value).font(.system(size: 18, weight: .bold, design: .monospaced)).foregroundColor(.white)
            }
            Spacer()
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Filter & Search Bar
    private var filterSearchBarSection: some View {
        VStack(spacing: 10) {
            HStack(spacing: 12) {
                // Search Input
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "64748b"))
                    TextField("Search scripts by title, strategy logic, tags, or code content...", text: $viewModel.searchQuery)
                        .textFieldStyle(.plain)
                        .font(.system(size: 12))
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color(hex: "0e1524"))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color(hex: "1e293b"), lineWidth: 1)
                )
                
                // Pills
                HStack(spacing: 4) {
                    ForEach(["All", "Strategies", "Indicators", "Alerts", "Libraries", "Starred"], id: \.self) { pill in
                        Button {
                            viewModel.selectedFilterType = pill
                        } label: {
                            Text(pill)
                                .font(.system(size: 11, weight: viewModel.selectedFilterType == pill ? .bold : .medium))
                                .foregroundColor(viewModel.selectedFilterType == pill ? .white : Color(hex: "94a3b8"))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(viewModel.selectedFilterType == pill ? Color(hex: "f97316") : Color.clear)
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(2)
                .background(Color(hex: "121b2d"))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            
            // Sub filters row
            HStack(spacing: 12) {
                dropdownLabel("Category", viewModel.selectedCategory)
                dropdownLabel("Target Market", viewModel.selectedTargetMarket)
                dropdownLabel("Sort By", viewModel.selectedSortBy)
                Spacer()
                Text("Showing \(viewModel.scripts.count) script")
                    .font(.system(size: 11))
                    .foregroundColor(Color(hex: "94a3b8"))
            }
        }
    }
    
    private func dropdownLabel(_ title: String, _ val: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.system(size: 10)).foregroundColor(Color(hex: "64748b"))
            HStack(spacing: 4) {
                Text(val).font(.system(size: 11)).foregroundColor(.white)
                Image(systemName: "chevron.down").font(.system(size: 8)).foregroundColor(Color(hex: "94a3b8"))
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color(hex: "0e1524"))
            .clipShape(RoundedRectangle(cornerRadius: 6))
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .stroke(Color(hex: "1e293b"), lineWidth: 1)
            )
        }
    }
    
    // MARK: - Script Cards List (Left)
    private var scriptCardsList: some View {
        VStack(spacing: 10) {
            ForEach(viewModel.scripts) { script in
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        HStack(spacing: 4) {
                            Text("INDICATOR")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(Color(hex: "3b82f6"))
                                .padding(.horizontal, 5)
                                .padding(.vertical, 2)
                                .background(Color(hex: "3b82f6").opacity(0.15))
                                .clipShape(RoundedRectangle(cornerRadius: 3))
                            
                            Text("v5")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(Color(hex: "94a3b8"))
                                .padding(.horizontal, 4)
                                .padding(.vertical, 2)
                                .background(Color(hex: "0e1524"))
                                .clipShape(RoundedRectangle(cornerRadius: 3))
                            
                            Text("Options")
                                .font(.system(size: 9))
                                .foregroundColor(Color(hex: "94a3b8"))
                                .padding(.horizontal, 4)
                                .padding(.vertical, 2)
                                .background(Color(hex: "0e1524"))
                                .clipShape(RoundedRectangle(cornerRadius: 3))
                        }
                        
                        Spacer()
                        
                        Image(systemName: "star.fill")
                            .font(.system(size: 11))
                            .foregroundColor(Color(hex: "f59e0b"))
                    }
                    
                    Text(script.title)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                    
                    Text(script.description ?? "")
                        .font(.system(size: 10))
                        .foregroundColor(Color(hex: "94a3b8"))
                        .lineLimit(3)
                    
                    HStack {
                        HStack(spacing: 4) {
                            Text("All").font(.system(size: 9)).foregroundColor(Color(hex: "64748b"))
                            Text("•").font(.system(size: 9)).foregroundColor(Color(hex: "64748b"))
                            Text("5m").font(.system(size: 9)).foregroundColor(Color(hex: "64748b"))
                        }
                        Spacer()
                        Button {
                            viewModel.copyCodeToClipboard(script.code)
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "doc.on.doc").font(.system(size: 10))
                                Text("Copy").font(.system(size: 10, weight: .medium))
                            }
                            .foregroundColor(Color(hex: "94a3b8"))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(12)
                .background(Color(hex: "121b2d"))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Color(hex: "3b82f6"), lineWidth: 1.5)
                )
            }
            Spacer()
        }
    }
    
    // MARK: - Script Details Inspector (Right)
    private func scriptInspectorCard(for script: PineScript) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text("INDICATOR")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(Color(hex: "3b82f6"))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(hex: "3b82f6").opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                        
                        Text("Pine v5").font(.system(size: 9)).foregroundColor(Color(hex: "94a3b8"))
                        Text("•").font(.system(size: 9)).foregroundColor(Color(hex: "64748b"))
                        Text("Options").font(.system(size: 9)).foregroundColor(Color(hex: "94a3b8"))
                        Text("•").font(.system(size: 9)).foregroundColor(Color(hex: "64748b"))
                        Text("Market: All").font(.system(size: 9)).foregroundColor(Color(hex: "94a3b8"))
                    }
                    
                    Text(script.title)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(.white)
                }
                
                Spacer()
                
                HStack(spacing: 12) {
                    Button {
                        viewModel.copyCodeToClipboard(script.code)
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: viewModel.showCopiedFeedback ? "checkmark" : "doc.on.doc")
                            Text(viewModel.showCopiedFeedback ? "Copied!" : "Copy Code")
                        }
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color(hex: "f97316"))
                    }
                    .buttonStyle(.plain)
                    
                    Image(systemName: "square.and.arrow.down").font(.system(size: 12)).foregroundColor(Color(hex: "94a3b8"))
                    Image(systemName: "arrow.up.right.square").font(.system(size: 12)).foregroundColor(Color(hex: "94a3b8"))
                    Image(systemName: "pencil").font(.system(size: 12)).foregroundColor(Color(hex: "94a3b8"))
                    Image(systemName: "trash").font(.system(size: 12)).foregroundColor(Color(hex: "f43f5e"))
                }
            }
            
            // Tabs Row
            HStack {
                HStack(spacing: 0) {
                    tabPill("Pine Script Code (31 lines)", tab: "code")
                    tabPill("Setup & Logic Notes", tab: "notes")
                    tabPill("Webhook Alert Setup", tab: "webhook")
                }
                .background(Color(hex: "0e1524"))
                .clipShape(RoundedRectangle(cornerRadius: 6))
                
                Spacer()
                
                HStack(spacing: 4) {
                    Text("Wrap Lines").font(.system(size: 10)).foregroundColor(Color(hex: "94a3b8"))
                    Toggle("", isOn: $viewModel.wrapLines).labelsHidden().scaleEffect(0.7)
                }
            }
            
            // Code Editor View
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    HStack(spacing: 6) {
                        Text(">_").font(.system(size: 11, weight: .bold, design: .monospaced)).foregroundColor(Color(hex: "06b6d4"))
                        Text("day_movement_with_particular_day_color.pine")
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(.white)
                    }
                    Spacer()
                    Text("31 lines  749 chars")
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundColor(Color(hex: "64748b"))
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(Color(hex: "080c14"))
                
                Divider().background(Color(hex: "1e293b"))
                
                // Code block with line numbers
                ScrollView([.vertical, .horizontal], showsIndicators: true) {
                    let lines = script.code.components(separatedBy: "\n")
                    VStack(alignment: .leading, spacing: 2) {
                        ForEach(Array(lines.enumerated()), id: \.offset) { idx, line in
                            HStack(alignment: .top, spacing: 12) {
                                Text("\(idx + 1)")
                                    .font(.system(size: 11, design: .monospaced))
                                    .foregroundColor(Color(hex: "64748b"))
                                    .frame(width: 25, alignment: .trailing)
                                
                                Text(line)
                                    .font(.system(size: 11, design: .monospaced))
                                    .foregroundColor(codeColorFor(line))
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                    }
                    .padding(14)
                }
                .background(Color(hex: "080c14"))
            }
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color(hex: "1e293b"), lineWidth: 1)
            )
        }
        .padding(16)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    private func tabPill(_ title: String, tab: String) -> some View {
        Button {
            viewModel.activeInspectorTab = tab
        } label: {
            Text(title)
                .font(.system(size: 11, weight: viewModel.activeInspectorTab == tab ? .bold : .medium))
                .foregroundColor(viewModel.activeInspectorTab == tab ? .white : Color(hex: "94a3b8"))
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(viewModel.activeInspectorTab == tab ? Color(hex: "1e293b") : Color.clear)
                .clipShape(RoundedRectangle(cornerRadius: 6))
        }
        .buttonStyle(.plain)
    }
    
    private func codeColorFor(_ line: String) -> Color {
        let trimmed = line.trimmingCharacters(in: .whitespaces)
        if trimmed.hasPrefix("//") {
            return Color(hex: "64748b")
        } else if trimmed.hasPrefix("indicator") || trimmed.hasPrefix("plot") || trimmed.hasPrefix("input") || trimmed.hasPrefix("barcolor") {
            return Color(hex: "38bdf8")
        } else if trimmed.contains("switch") || trimmed.contains("=>") {
            return Color(hex: "c084fc")
        } else if trimmed.contains("\"") {
            return Color(hex: "34d399")
        }
        return .white
    }
}
