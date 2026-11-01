import SwiftUI

public struct PineScriptManagerView: View {
    @Environment(\.colorScheme) private var colorScheme
    @StateObject private var viewModel = PineScriptViewModel()
    
    public init() {}
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header
            headerView
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            // Content
            if viewModel.isLoading && viewModel.scripts.isEmpty {
                VStack {
                    Spacer()
                    ProgressView("Loading script library...")
                        .font(.system(size: 13))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage, viewModel.scripts.isEmpty {
                VStack(spacing: 12) {
                    Spacer()
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 32))
                        .foregroundColor(KiteTheme.lossRed)
                    Text("Failed to load Pine Scripts")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    Text(error)
                        .font(.system(size: 12))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Button("Try Again") {
                        Task { await viewModel.loadScripts() }
                    }
                    .buttonStyle(KiteSecondaryButtonStyle())
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                HStack(spacing: 0) {
                    // Left List Column
                    leftListPane
                        .frame(width: 300)
                    
                    Divider()
                        .background(KiteTheme.border(for: colorScheme))
                    
                    // Right Code Viewer Column
                    if let script = viewModel.selectedScript {
                        rightCodePane(script)
                    } else {
                        emptyDetailPane
                    }
                }
            }
        }
        .background(KiteTheme.canvas(for: colorScheme))
        .sheet(isPresented: $viewModel.showEditorSheet) {
            PineScriptEditorSheet(viewModel: viewModel)
        }
        .task {
            await viewModel.loadScripts()
        }
    }
    
    // MARK: - Header
    private var headerView: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Pine Script Manager")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                Text("Library of TradingView indicators, strategies, and execution webhooks")
                    .font(.system(size: 12))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
            
            Spacer()
            
            Button("New Script") {
                viewModel.openNewScriptSheet()
            }
            .buttonStyle(KitePrimaryButtonStyle())
            
            Button(action: {
                Task { await viewModel.loadScripts() }
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
            .help("Refresh Scripts")
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
    }
    
    // MARK: - Left List Pane
    private var leftListPane: some View {
        VStack(spacing: 0) {
            // Search & Filters
            VStack(spacing: 8) {
                HStack(spacing: 6) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 11))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    TextField("Search scripts...", text: $viewModel.searchQuery)
                        .textFieldStyle(PlainTextFieldStyle())
                        .font(.system(size: 12))
                        .onSubmit {
                            Task { await viewModel.loadScripts() }
                        }
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 6)
                .background(KiteTheme.surface(for: colorScheme))
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
                )
                
                // Type Filter Tabs
                Picker("Filter", selection: $viewModel.selectedType) {
                    Text("All").tag("ALL")
                    Text("Strategy").tag("strategy")
                    Text("Indicator").tag("indicator")
                }
                .pickerStyle(.segmented)
                .onChange(of: viewModel.selectedType) { _ in
                    Task { await viewModel.loadScripts() }
                }
            }
            .padding(12)
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            // Scripts List
            if viewModel.scripts.isEmpty {
                VStack(spacing: 8) {
                    Spacer()
                    Text("No scripts found.")
                        .font(.system(size: 12))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Spacer()
                }
            } else {
                ScrollView {
                    VStack(spacing: 4) {
                        ForEach(viewModel.scripts) { script in
                            scriptListItem(script)
                        }
                    }
                    .padding(8)
                }
            }
        }
        .background(KiteTheme.surface(for: colorScheme).opacity(0.5))
    }
    
    private func scriptListItem(_ script: PineScript) -> some View {
        let isSelected = viewModel.selectedScript?.id == script.id
        
        return Button(action: {
            viewModel.selectScript(script)
        }) {
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(script.title)
                        .font(.system(size: 13, weight: isSelected ? .bold : .medium))
                        .foregroundColor(isSelected ? KiteTheme.brandBlue : KiteTheme.textPrimary(for: colorScheme))
                        .lineLimit(1)
                    
                    HStack(spacing: 6) {
                        Text(script.scriptType.uppercased())
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(script.scriptType == "strategy" ? KiteTheme.profitGreen : KiteTheme.brandOrange)
                        
                        Text(script.version ?? "v5")
                            .font(.system(size: 9, design: .monospaced))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        
                        Text("•")
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        
                        Text(script.category ?? "Options")
                            .font(.system(size: 10))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    }
                }
                
                Spacer()
                
                Button(action: {
                    Task { await viewModel.toggleFavorite(script.id) }
                }) {
                    Image(systemName: (script.isFavorite ?? false) ? "star.fill" : "star")
                        .font(.system(size: 11))
                        .foregroundColor((script.isFavorite ?? false) ? KiteTheme.brandOrange : KiteTheme.textSecondary(for: colorScheme).opacity(0.4))
                }
                .buttonStyle(PlainButtonStyle())
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .background(
                isSelected ? KiteTheme.brandBlue.opacity(0.12) : Color.clear
            )
            .cornerRadius(4)
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    // MARK: - Right Code Pane
    private func rightCodePane(_ script: PineScript) -> some View {
        VStack(spacing: 0) {
            // Script Details Header Bar
            HStack(alignment: .center, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(script.title)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                        
                        Text(script.scriptType.uppercased())
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(script.scriptType == "strategy" ? KiteTheme.profitGreen : KiteTheme.brandOrange)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(
                                (script.scriptType == "strategy" ? KiteTheme.profitGreen : KiteTheme.brandOrange).opacity(0.12)
                            )
                            .cornerRadius(3)
                        
                        Text(script.version ?? "v5")
                            .font(.system(size: 10, design: .monospaced))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    }
                    
                    if let desc = script.description, !desc.isEmpty {
                        Text(desc)
                            .font(.system(size: 11))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                            .lineLimit(2)
                    }
                }
                
                Spacer()
                
                // Actions
                HStack(spacing: 8) {
                    Button(action: {
                        viewModel.copyCodeToClipboard(script.code)
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: viewModel.showCopiedFeedback ? "checkmark" : "doc.on.doc")
                            Text(viewModel.showCopiedFeedback ? "Copied!" : "Copy Code")
                        }
                    }
                    .buttonStyle(KiteSecondaryButtonStyle())
                    
                    Button("Edit") {
                        viewModel.openEditScriptSheet(script)
                    }
                    .buttonStyle(KiteSecondaryButtonStyle())
                    
                    Button("Duplicate") {
                        Task { await viewModel.duplicateScript(script.id) }
                    }
                    .buttonStyle(KiteSecondaryButtonStyle())
                    
                    Button(action: {
                        Task { await viewModel.deleteScript(script.id) }
                    }) {
                        Image(systemName: "trash")
                            .foregroundColor(KiteTheme.lossRed)
                    }
                    .buttonStyle(KiteSecondaryButtonStyle())
                }
            }
            .padding(14)
            .background(KiteTheme.surface(for: colorScheme))
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            // Code Display Container
            ScrollView([.horizontal, .vertical]) {
                Text(script.code)
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    .padding(16)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    .textSelection(.enabled)
            }
            .background(KiteTheme.canvas(for: colorScheme))
        }
    }
    
    private var emptyDetailPane: some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: "chevron.left.forwardslash.chevron.right")
                .font(.system(size: 36))
                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            Text("Select a Pine Script")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
            Text("Choose a script from the sidebar to inspect syntax and copy code.")
                .font(.system(size: 12))
                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(KiteTheme.canvas(for: colorScheme))
    }
}

// MARK: - Pine Script Editor Sheet
public struct PineScriptEditorSheet: View {
    @ObservedObject var viewModel: PineScriptViewModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(viewModel.editingScriptId != nil ? "Edit Pine Script" : "Create Pine Script")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    Text("TradingView script code and parameters")
                        .font(.system(size: 12))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                }
                
                Spacer()
                
                Button(action: { dismiss() }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        .frame(width: 24, height: 24)
                        .background(KiteTheme.surface(for: colorScheme))
                        .cornerRadius(12)
                }
                .buttonStyle(PlainButtonStyle())
            }
            .padding(16)
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            // Form & Code Editor
            VStack(spacing: 12) {
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Script Title")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                        TextField("e.g. 5m CPR Breakout", text: $viewModel.editTitle)
                            .textFieldStyle(PlainTextFieldStyle())
                            .font(.system(size: 12))
                            .padding(7)
                            .background(KiteTheme.surface(for: colorScheme))
                            .overlay(
                                RoundedRectangle(cornerRadius: 4)
                                    .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
                            )
                    }
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Type")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                        Picker("", selection: $viewModel.editType) {
                            Text("Indicator").tag("indicator")
                            Text("Strategy").tag("strategy")
                            Text("Library").tag("library")
                            Text("Alert").tag("alert")
                        }
                        .labelsHidden()
                    }
                    .frame(width: 140)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Description (Optional)")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    TextField("What does this script do?", text: $viewModel.editDescription)
                        .textFieldStyle(PlainTextFieldStyle())
                        .font(.system(size: 12))
                        .padding(7)
                        .background(KiteTheme.surface(for: colorScheme))
                        .overlay(
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
                        )
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Pine Script Source Code")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    
                    TextEditor(text: $viewModel.editCode)
                        .font(.system(size: 12, design: .monospaced))
                        .padding(6)
                        .background(KiteTheme.surface(for: colorScheme))
                        .overlay(
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
                        )
                }
                .frame(maxHeight: .infinity)
                
                if let err = viewModel.errorMessage {
                    Text(err)
                        .font(.system(size: 11))
                        .foregroundColor(KiteTheme.lossRed)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(16)
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            // Footer
            HStack {
                Spacer()
                Button("Cancel") { dismiss() }
                    .buttonStyle(KiteSecondaryButtonStyle())
                
                Button(action: {
                    Task {
                        _ = await viewModel.saveScript()
                    }
                }) {
                    if viewModel.isSaving {
                        ProgressView()
                            .scaleEffect(0.7)
                            .frame(width: 110)
                    } else {
                        Text("Save Script")
                            .frame(width: 110)
                    }
                }
                .buttonStyle(KitePrimaryButtonStyle())
                .disabled(viewModel.isSaving)
            }
            .padding(16)
        }
        .frame(width: 680, height: 600)
        .background(KiteTheme.canvas(for: colorScheme))
    }
}
