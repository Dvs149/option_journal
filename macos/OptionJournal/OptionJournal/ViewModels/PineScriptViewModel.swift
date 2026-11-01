import Foundation
import Combine
import AppKit
import SwiftUI

@MainActor
public final class PineScriptViewModel: ObservableObject {
    @Published public var scripts: [PineScript] = []
    @Published public var stats: PineScriptStats? = nil
    @Published public var selectedScript: PineScript? = nil
    @Published public var isLoading: Bool = false
    @Published public var isSaving: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var successMessage: String? = nil
    @Published public var showCopiedFeedback: Bool = false
    
    // Filters
    @Published public var searchQuery: String = ""
    @Published public var selectedType: String = "ALL"
    @Published public var favoritesOnly: Bool = false
    
    // Editor Sheet
    @Published public var showEditorSheet: Bool = false
    @Published public var editingScriptId: Int? = nil
    @Published public var editTitle: String = ""
    @Published public var editType: String = "indicator"
    @Published public var editVersion: String = "v5"
    @Published public var editCategory: String = "Options"
    @Published public var editTargetMarket: String = "All"
    @Published public var editTimeframe: String = "5m"
    @Published public var editDescription: String = ""
    @Published public var editCode: String = ""
    @Published public var editIsFavorite: Bool = false
    
    private let pineService: PineScriptServiceProtocol
    
    public init(pineService: PineScriptServiceProtocol) {
        self.pineService = pineService
    }
    
    public convenience init() {
        self.init(pineService: PineScriptService())
    }
    
    public func loadScripts() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let res = try await pineService.fetchScripts(
                search: searchQuery.isEmpty ? nil : searchQuery,
                scriptType: selectedType == "ALL" ? nil : selectedType,
                isFavorite: favoritesOnly ? true : nil
            )
            self.scripts = res.scripts
            self.stats = res.stats
            
            if selectedScript == nil || !scripts.contains(where: { $0.id == selectedScript?.id }) {
                self.selectedScript = scripts.first
            }
            self.isLoading = false
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
        }
    }
    
    public func selectScript(_ script: PineScript) {
        self.selectedScript = script
    }
    
    public func copyCodeToClipboard(_ code: String) {
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(code, forType: .string)
        self.showCopiedFeedback = true
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            self.showCopiedFeedback = false
        }
    }
    
    public func openNewScriptSheet() {
        self.editingScriptId = nil
        self.editTitle = ""
        self.editType = "indicator"
        self.editVersion = "v5"
        self.editCategory = "Options"
        self.editTargetMarket = "All"
        self.editTimeframe = "5m"
        self.editDescription = ""
        self.editCode = "//@version=5\nindicator(\"My Script\", overlay=true)\nplot(close)"
        self.editIsFavorite = false
        self.showEditorSheet = true
    }
    
    public func openEditScriptSheet(_ script: PineScript) {
        self.editingScriptId = script.id
        self.editTitle = script.title
        self.editType = script.scriptType
        self.editVersion = script.version ?? "v5"
        self.editCategory = script.category ?? "Options"
        self.editTargetMarket = script.targetMarket ?? "All"
        self.editTimeframe = script.timeframe ?? "5m"
        self.editDescription = script.description ?? ""
        self.editCode = script.code
        self.editIsFavorite = script.isFavorite ?? false
        self.showEditorSheet = true
    }
    
    public func saveScript() async -> Bool {
        guard !editTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "Please enter a script title."
            return false
        }
        guard !editCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "Please enter the Pine Script code."
            return false
        }
        
        isSaving = true
        errorMessage = nil
        
        let req = CreatePineScriptRequest(
            title: editTitle,
            scriptType: editType,
            version: editVersion,
            category: editCategory,
            targetMarket: editTargetMarket,
            timeframe: editTimeframe,
            description: editDescription.isEmpty ? nil : editDescription,
            code: editCode,
            isFavorite: editIsFavorite
        )
        
        do {
            if let id = editingScriptId {
                try await pineService.updateScript(id: id, request: req)
            } else {
                try await pineService.createScript(request: req)
            }
            isSaving = false
            showEditorSheet = false
            await loadScripts()
            return true
        } catch {
            self.errorMessage = error.localizedDescription
            self.isSaving = false
            return false
        }
    }
    
    public func toggleFavorite(_ id: Int) async {
        do {
            try await pineService.toggleFavorite(id: id)
            await loadScripts()
        } catch {
            self.errorMessage = error.localizedDescription
        }
    }
    
    public func duplicateScript(_ id: Int) async {
        do {
            try await pineService.duplicateScript(id: id)
            await loadScripts()
        } catch {
            self.errorMessage = error.localizedDescription
        }
    }
    
    public func deleteScript(_ id: Int) async {
        do {
            try await pineService.deleteScript(id: id)
            if selectedScript?.id == id {
                selectedScript = nil
            }
            await loadScripts()
        } catch {
            self.errorMessage = error.localizedDescription
        }
    }
}
