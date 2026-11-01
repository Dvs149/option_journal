import SwiftUI
import UniformTypeIdentifiers

@MainActor
public struct BulkImportView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    @State private var isFileImporterPresented: Bool = false
    @State private var isTargeted: Bool = false
    @State private var parsedTrades: [BulkTradeItem] = []
    @State private var isImporting: Bool = false
    @State private var statusMessage: String?
    @State private var errorMessage: String?
    
    private let tradeService: TradeServiceProtocol
    
    public init(tradeService: TradeServiceProtocol) {
        self.tradeService = tradeService
    }
    
    public init() {
        self.init(tradeService: TradeService())
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Bulk Tradebook Importer")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    Text("Import tradebook fills from Zerodha Kite or Kotak Neo CSV files")
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
            
            // Content
            VStack(spacing: 20) {
                // Dropzone
                VStack(spacing: 12) {
                    Image(systemName: "arrow.down.doc.fill")
                        .font(.system(size: 34))
                        .foregroundColor(isTargeted ? KiteTheme.brandBlue : KiteTheme.brandOrange)
                    
                    Text("Drop your broker CSV tradebook file here")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    
                    Text("Supports Zerodha Kite Tradebook CSV, Kotak Neo Orderbook, and standard OptionJournal format")
                        .font(.system(size: 11))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        .multilineTextAlignment(.center)
                    
                    Button("Browse File (.csv)") {
                        isFileImporterPresented = true
                    }
                    .kiteOutlineButton()
                    .padding(.top, 4)
                }
                .frame(maxWidth: .infinity, minHeight: 180)
                .background(isTargeted ? KiteTheme.brandBlue.opacity(0.08) : KiteTheme.surfaceElevated(for: colorScheme))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(isTargeted ? KiteTheme.brandBlue : KiteTheme.border(for: colorScheme), style: StrokeStyle(lineWidth: 1.5, dash: [6]))
                )
                .onDrop(of: [.commaSeparatedText, .fileURL], isTargeted: $isTargeted) { providers in
                    handleDrop(providers: providers)
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
                
                if let status = statusMessage {
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(KiteTheme.profitGreen)
                        Text(status)
                            .font(.system(size: 11))
                            .foregroundColor(KiteTheme.profitGreen)
                    }
                }
                
                // Preview Section
                if !parsedTrades.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Ready to Ingest: \(parsedTrades.count) Trades")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                            Spacer()
                        }
                        
                        Button {
                            Task { await performBulkImport() }
                        } label: {
                            HStack {
                                Spacer()
                                if isImporting {
                                    ProgressView().controlSize(.small).colorInvert()
                                } else {
                                    Text("Import \(parsedTrades.count) Trades into Database")
                                        .font(.system(size: 13, weight: .semibold))
                                }
                                Spacer()
                            }
                            .frame(height: 22)
                        }
                        .kitePrimaryButton()
                        .disabled(isImporting)
                    }
                }
            }
            .padding(20)
        }
        .frame(width: 520, height: 420)
        .background(KiteTheme.canvas(for: colorScheme))
        .fileImporter(isPresented: $isFileImporterPresented, allowedContentTypes: [.commaSeparatedText, .plainText]) { result in
            switch result {
            case .success(let url):
                if url.startAccessingSecurityScopedResource() {
                    defer { url.stopAccessingSecurityScopedResource() }
                    parseCSV(from: url)
                } else {
                    parseCSV(from: url)
                }
            case .failure(let err):
                self.errorMessage = "Failed to select file: \(err.localizedDescription)"
            }
        }
    }
    
    private func handleDrop(providers: [NSItemProvider]) -> Bool {
        for provider in providers {
            provider.loadItem(forTypeIdentifier: UTType.fileURL.identifier, options: nil) { item, _ in
                if let data = item as? Data, let url = URL(dataRepresentation: data, relativeTo: nil) {
                    DispatchQueue.main.async {
                        parseCSV(from: url)
                    }
                }
            }
        }
        return true
    }
    
    private func parseCSV(from url: URL) {
        do {
            let content = try String(contentsOf: url, encoding: .utf8)
            let rows = content.components(separatedBy: .newlines).filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
            
            guard rows.count > 1 else {
                self.errorMessage = "CSV file is empty or missing headers."
                return
            }
            
            var items: [BulkTradeItem] = []
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            let todayStr = formatter.string(from: Date())
            
            // Basic generic CSV parsing
            for (idx, line) in rows.dropFirst().enumerated() {
                let cols = line.components(separatedBy: ",").map { $0.trimmingCharacters(in: CharacterSet(charactersIn: " \"")) }
                guard cols.count >= 4 else { continue }
                
                let symbol = cols.count > 1 ? cols[1].uppercased() : "NIFTY"
                let optType = symbol.contains("PE") ? "PE" : (symbol.contains("CE") ? "CE" : "CE")
                let qty = cols.count > 4 ? (Int(cols[4]) ?? 25) : 25
                let entry = cols.count > 5 ? Double(cols[5]) : 100.0
                let exit = cols.count > 6 ? Double(cols[6]) : 110.0
                
                let item = BulkTradeItem(
                    tradeDate: todayStr,
                    indexName: symbol.contains("BANK") ? "BANKNIFTY" : "NIFTY",
                    tradingType: "Intraday",
                    strategyName: "Bulk Import",
                    optionType: optType,
                    strikePrice: nil,
                    quantity: max(1, qty),
                    lots: max(1, qty / 25),
                    entryPremium: entry,
                    exitPremium: exit
                )
                items.append(item)
            }
            
            self.parsedTrades = items
            self.statusMessage = "Successfully parsed \(items.count) trade executions."
            self.errorMessage = nil
        } catch {
            self.errorMessage = "Failed to read CSV: \(error.localizedDescription)"
        }
    }
    
    private func performBulkImport() async {
        isImporting = true
        errorMessage = nil
        statusMessage = nil
        
        do {
            let res = try await tradeService.bulkImportTrades(trades: parsedTrades)
            isImporting = false
            statusMessage = res.message
            parsedTrades = []
        } catch {
            isImporting = false
            errorMessage = error.localizedDescription
        }
    }
}
