import SwiftUI

@MainActor
public struct ExportReportSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    @State private var selectedAggregation: String = "trade"
    @State private var selectedFormat: ExportFormat = .excel
    @State private var selectedPeriod: String = "all"
    @State private var selectedIndex: String = "ALL"
    @State private var selectedTradingType: String = "ALL"
    @State private var selectedOptionType: String = "ALL"
    @State private var isExporting: Bool = false
    @State private var errorMessage: String?
    @State private var successPath: String?
    
    private let exportService: ExportServiceProtocol
    
    public init(exportService: ExportServiceProtocol) {
        self.exportService = exportService
    }
    
    public init() {
        self.init(exportService: ExportService())
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            // MARK: - Header
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 8) {
                        Text("Export Trading Journal")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                        
                        Text("CUSTOM EXPORTER")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundColor(KiteTheme.brandBlue)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(KiteTheme.brandBlue.opacity(0.12))
                            .clipShape(RoundedRectangle(cornerRadius: 3))
                    }
                    
                    Text("Export custom P&L reports, trade logs, and choose formats")
                        .font(.system(size: 11))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                }
                
                Spacer()
                
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 16))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                }
                .buttonStyle(.plain)
            }
            .padding(18)
            .background(KiteTheme.surface(for: colorScheme))
            .overlay(
                Rectangle()
                    .frame(height: 1)
                    .foregroundColor(KiteTheme.border(for: colorScheme)),
                alignment: .bottom
            )
            
            // MARK: - Body
            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 20) {
                    // 1. Choose Report Format
                    VStack(alignment: .leading, spacing: 10) {
                        Text("1. Choose File Format *")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                        
                        HStack(spacing: 12) {
                            FormatCard(
                                title: "Excel Spreadsheet",
                                ext: ".xlsx",
                                subtitle: "Recommended",
                                isSelected: selectedFormat == .excel,
                                icon: "tablecells"
                            ) {
                                selectedFormat = .excel
                            }
                            
                            FormatCard(
                                title: "CSV File",
                                ext: ".csv",
                                subtitle: "Universal",
                                isSelected: selectedFormat == .csv,
                                icon: "doc.plaintext"
                            ) {
                                selectedFormat = .csv
                            }
                            
                            FormatCard(
                                title: "PDF Report",
                                ext: ".pdf",
                                subtitle: "Printable",
                                isSelected: selectedFormat == .pdf,
                                icon: "doc.richtext"
                            ) {
                                selectedFormat = .pdf
                            }
                        }
                    }
                    
                    // 2. Filter Export Data
                    VStack(alignment: .leading, spacing: 10) {
                        Text("2. Filter Export Data")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                        
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Date Period").font(.system(size: 10)).foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                Picker("", selection: $selectedPeriod) {
                                    Text("All Time").tag("all")
                                    Text("This Month").tag("this_month")
                                    Text("This Week").tag("this_week")
                                    Text("Today").tag("today")
                                }
                                .pickerStyle(.menu)
                            }
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Index / Symbol").font(.system(size: 10)).foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                Picker("", selection: $selectedIndex) {
                                    Text("All Indices").tag("ALL")
                                    Text("NIFTY").tag("NIFTY")
                                    Text("BANKNIFTY").tag("BANKNIFTY")
                                    Text("FINNIFTY").tag("FINNIFTY")
                                    Text("SENSEX").tag("SENSEX")
                                }
                                .pickerStyle(.menu)
                            }
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Option Type").font(.system(size: 10)).foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                Picker("", selection: $selectedOptionType) {
                                    Text("All Options").tag("ALL")
                                    Text("CE").tag("CE")
                                    Text("PE").tag("PE")
                                    Text("Both").tag("Both")
                                }
                                .pickerStyle(.menu)
                            }
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Trading Type").font(.system(size: 10)).foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                Picker("", selection: $selectedTradingType) {
                                    Text("All Types").tag("ALL")
                                    Text("Intraday").tag("Intraday")
                                    Text("BTST").tag("BTST")
                                    Text("Positional").tag("Positional")
                                }
                                .pickerStyle(.menu)
                            }
                        }
                        .padding(12)
                        .kiteCard()
                    }
                    
                    if let error = errorMessage {
                        HStack(spacing: 6) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(KiteTheme.lossRed)
                            Text(error)
                                .font(.system(size: 11))
                                .foregroundColor(KiteTheme.lossRed)
                        }
                    }
                    
                    if let saved = successPath {
                        HStack(spacing: 6) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(KiteTheme.profitGreen)
                            Text("Export saved to: \(saved)")
                                .font(.system(size: 11))
                                .foregroundColor(KiteTheme.profitGreen)
                        }
                    }
                }
                .padding(20)
            }
            
            // MARK: - Footer Actions
            HStack {
                Text("Ready to export: TRADES • \(selectedFormat.fileExtension.uppercased())")
                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                
                Spacer()
                
                Button("Cancel") {
                    dismiss()
                }
                .kiteOutlineButton()
                
                Button {
                    Task { await performExport() }
                } label: {
                    HStack(spacing: 6) {
                        if isExporting {
                            ProgressView().controlSize(.small).colorInvert()
                        } else {
                            Image(systemName: "arrow.down.to.line")
                            Text("Download Export (\(selectedFormat.fileExtension))")
                                .font(.system(size: 12, weight: .semibold))
                        }
                    }
                }
                .kitePrimaryButton()
                .disabled(isExporting)
            }
            .padding(16)
            .background(KiteTheme.surface(for: colorScheme))
            .overlay(
                Rectangle()
                    .frame(height: 1)
                    .foregroundColor(KiteTheme.border(for: colorScheme)),
                alignment: .top
            )
        }
        .frame(width: 580, height: 420)
        .background(KiteTheme.canvas(for: colorScheme))
    }
    
    private func performExport() async {
        isExporting = true
        errorMessage = nil
        successPath = nil
        
        var filters: [String: String] = [
            "filter": selectedPeriod
        ]
        if selectedIndex != "ALL" {
            filters["index_name"] = selectedIndex
        }
        if selectedOptionType != "ALL" {
            filters["option_type"] = selectedOptionType
        }
        if selectedTradingType != "ALL" {
            filters["trading_type"] = selectedTradingType
        }
        
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyyMMdd_HHmm"
        let timestamp = formatter.string(from: Date())
        let suggestedName = "OptionJournal_Export_\(timestamp).\(selectedFormat.fileExtension)"
        
        do {
            let data = try await exportService.downloadReport(format: selectedFormat, filters: filters)
            if let savedURL = exportService.saveFileToDisk(data: data, suggestedFileName: suggestedName) {
                self.successPath = savedURL.lastPathComponent
            }
            isExporting = false
        } catch {
            self.errorMessage = "Export failed: \(error.localizedDescription)"
            isExporting = false
        }
    }
}

private struct FormatCard: View {
    @Environment(\.colorScheme) private var colorScheme
    let title: String
    let ext: String
    let subtitle: String
    let isSelected: Bool
    let icon: String
    let onSelect: () -> Void
    
    var body: some View {
        Button(action: onSelect) {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(isSelected ? KiteTheme.brandBlue : KiteTheme.textSecondary(for: colorScheme))
                    
                    Text(ext)
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    
                    Spacer()
                    
                    if isSelected {
                        Image(systemName: "checkmark")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(KiteTheme.brandBlue)
                    }
                }
                
                Text(title)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                
                Text(subtitle)
                    .font(.system(size: 10))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
            .padding(12)
            .background(isSelected ? KiteTheme.brandBlue.opacity(0.08) : KiteTheme.surfaceElevated(for: colorScheme))
            .clipShape(RoundedRectangle(cornerRadius: 6))
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .stroke(isSelected ? KiteTheme.brandBlue : KiteTheme.border(for: colorScheme), lineWidth: isSelected ? 1.5 : 1)
            )
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
    }
}
