import Foundation
import Combine
import SwiftUI

@MainActor
public final class CapitalManagementViewModel: ObservableObject {
    @Published public var capitalData: CapitalResponse? = nil
    @Published public var isLoading: Bool = false
    @Published public var isSaving: Bool = false
    @Published public var errorMessage: String? = nil
    @Published public var successMessage: String? = nil
    
    // Add Transaction Sheet Form
    @Published public var showAddTransactionSheet: Bool = false
    @Published public var transactionType: String = "deposit" // "deposit" or "withdrawal"
    @Published public var transactionAmount: String = ""
    @Published public var transactionDate: Date = Date()
    @Published public var transactionNotes: String = ""
    
    private let capitalService: CapitalServiceProtocol
    
    public init(capitalService: CapitalServiceProtocol) {
        self.capitalService = capitalService
    }
    
    public convenience init() {
        self.init(capitalService: CapitalService())
    }
    
    public func loadData() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let res = try await capitalService.fetchCapitalData()
            self.capitalData = res
            self.isLoading = false
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
        }
    }
    
    public func openAddTransactionSheet() {
        transactionType = "deposit"
        transactionAmount = ""
        transactionDate = Date()
        transactionNotes = ""
        showAddTransactionSheet = true
    }
    
    public func addTransaction() async -> Bool {
        guard let amount = Double(transactionAmount), amount > 0 else {
            errorMessage = "Please enter a valid positive transaction amount."
            return false
        }
        
        isSaving = true
        errorMessage = nil
        
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let dateStr = formatter.string(from: transactionDate)
        
        let req = CreateTransactionRequest(
            transactionType: transactionType,
            amount: amount,
            transactionDate: dateStr,
            notes: transactionNotes.isEmpty ? nil : transactionNotes
        )
        
        do {
            try await capitalService.addTransaction(request: req)
            isSaving = false
            showAddTransactionSheet = false
            successMessage = "\(transactionType.capitalized) recorded successfully"
            await loadData()
            return true
        } catch {
            self.errorMessage = error.localizedDescription
            self.isSaving = false
            return false
        }
    }
    
    public func deleteTransaction(_ id: Int) async {
        do {
            try await capitalService.deleteTransaction(id: id)
            await loadData()
        } catch {
            self.errorMessage = error.localizedDescription
        }
    }
}
