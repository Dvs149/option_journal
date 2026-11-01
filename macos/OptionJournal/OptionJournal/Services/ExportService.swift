import AppKit
import Foundation

public enum ExportFormat: String, CaseIterable, Identifiable {
    case excel = "excel"
    case csv = "csv"
    case pdf = "pdf"
    
    public var id: String { rawValue }
    
    public var displayName: String {
        switch self {
        case .excel: return "Excel Spreadsheet (.xlsx)"
        case .csv: return "CSV File (.csv)"
        case .pdf: return "PDF Report (.pdf)"
        }
    }
    
    public var fileExtension: String {
        switch self {
        case .excel: return "xlsx"
        case .csv: return "csv"
        case .pdf: return "pdf"
        }
    }
    
    public var endpoint: String {
        switch self {
        case .excel: return "/export/excel"
        case .csv: return "/export/csv"
        case .pdf: return "/export/pdf"
        }
    }
}

@MainActor
public protocol ExportServiceProtocol: Sendable {
    func downloadReport(format: ExportFormat, filters: [String: String]) async throws -> Data
    func saveFileToDisk(data: Data, suggestedFileName: String) -> URL?
}

public final class ExportService: ExportServiceProtocol {
    private let client: APIClient
    
    public init(client: APIClient = .shared) {
        self.client = client
    }
    
    public func downloadReport(format: ExportFormat, filters: [String: String]) async throws -> Data {
        return try await client.downloadData(endpoint: format.endpoint, queryParams: filters)
    }
    
    public func saveFileToDisk(data: Data, suggestedFileName: String) -> URL? {
        let savePanel = NSSavePanel()
        savePanel.title = "Export OptionJournal Report"
        savePanel.nameFieldStringValue = suggestedFileName
        savePanel.canCreateDirectories = true
        
        let response = savePanel.runModal()
        if response == .OK, let destinationURL = savePanel.url {
            do {
                try data.write(to: destinationURL)
                return destinationURL
            } catch {
                return nil
            }
        }
        return nil
    }
}
