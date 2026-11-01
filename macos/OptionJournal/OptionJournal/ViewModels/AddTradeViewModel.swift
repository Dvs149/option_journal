import SwiftUI
import Combine

@MainActor
public final class AddTradeViewModel: ObservableObject {
    @Published public var tradeDate: Date = Date()
    @Published public var indexName: String = "NIFTY"
    @Published public var tradingType: String = "Intraday"
    @Published public var strategyName: String = "Directional CE"
    @Published public var optionType: String = "CE"
    @Published public var strikePriceText: String = ""
    @Published public var expiryDate: Date = Date()
    
    // Position sizing
    @Published public var lots: Int = 1
    @Published public var quantity: Int = 25
    
    // Single Leg Premiums
    @Published public var entryPremiumText: String = ""
    @Published public var exitPremiumText: String = ""
    
    // Multi Leg (Both) Premiums
    @Published public var ceEntryPriceText: String = ""
    @Published public var peEntryPriceText: String = ""
    @Published public var ceExitPriceText: String = ""
    @Published public var peExitPriceText: String = ""
    
    // Notes & Rationale
    @Published public var entryReason: String = ""
    @Published public var exitReason: String = ""
    @Published public var notes: String = ""
    
    // Estimation & State
    @Published public var estimatedCharges: TradeEstimateResponse?
    @Published public var isEstimating: Bool = false
    @Published public var isSaving: Bool = false
    @Published public var errorMessage: String?
    @Published public var successMessage: String?
    
    public let availableIndices = ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "SENSEX"]
    public let availableOptionTypes = ["CE", "PE", "Both"]
    public let availableTradingTypes = ["Intraday", "BTST", "Overnight"]
    public let availableStrategies = [
        "Directional CE",
        "Directional PE",
        "Long Straddle",
        "Short Strangle",
        "Bull Call Spread",
        "Bear Put Spread",
        "Iron Condor",
        "BTST",
        "Scalping"
    ]
    
    private let tradeService: TradeServiceProtocol
    private var estimateTask: Task<Void, Never>?
    
    public init(tradeService: TradeServiceProtocol) {
        self.tradeService = tradeService
        self.updateQuantity()
    }
    
    public convenience init() {
        self.init(tradeService: TradeService())
    }
    
    public func updateQuantity() {
        let lotMultiplier: Int
        switch indexName {
        case "NIFTY": lotMultiplier = 25
        case "BANKNIFTY": lotMultiplier = 15
        case "FINNIFTY": lotMultiplier = 25
        case "MIDCPNIFTY": lotMultiplier = 50
        case "SENSEX": lotMultiplier = 10
        default: lotMultiplier = 25
        }
        self.quantity = max(1, lots) * lotMultiplier
        triggerEstimation()
    }
    
    public func triggerEstimation() {
        estimateTask?.cancel()
        estimateTask = Task {
            try? await Task.sleep(nanoseconds: 200_000_000) // 200ms debounce
            guard !Task.isCancelled else { return }
            await estimateCharges()
        }
    }
    
    private func estimateCharges() async {
        let entry = Double(entryPremiumText) ?? 0.0
        let exit = Double(exitPremiumText) ?? 0.0
        
        let ceEntry = Double(ceEntryPriceText)
        let peEntry = Double(peEntryPriceText)
        let ceExit = Double(ceExitPriceText)
        let peExit = Double(peExitPriceText)
        
        guard (entry > 0 && exit > 0) || ((ceEntry ?? 0) > 0 || (peEntry ?? 0) > 0) else {
            self.estimatedCharges = nil
            return
        }
        
        isEstimating = true
        let req = TradeEstimateRequest(
            indexName: indexName,
            optionType: optionType,
            entryPremium: entry,
            exitPremium: exit,
            quantity: quantity,
            ceEntryPrice: ceEntry,
            peEntryPrice: peEntry,
            ceExitPrice: ceExit,
            peExitPrice: peExit
        )
        
        do {
            let res = try await tradeService.estimateCharges(payload: req)
            self.estimatedCharges = res
        } catch {
            // Silently fallback without disrupting form
        }
        isEstimating = false
    }
    
    public func saveTrade() async -> Bool {
        errorMessage = nil
        successMessage = nil
        
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let tradeDateStr = formatter.string(from: tradeDate)
        let expiryDateStr = formatter.string(from: expiryDate)
        
        let strike = Double(strikePriceText)
        let entry = Double(entryPremiumText)
        let exit = Double(exitPremiumText)
        let ceEntry = Double(ceEntryPriceText)
        let peEntry = Double(peEntryPriceText)
        let ceExit = Double(ceExitPriceText)
        let peExit = Double(peExitPriceText)
        
        guard quantity > 0 else {
            errorMessage = "Quantity must be greater than 0."
            return false
        }
        
        isSaving = true
        let req = CreateTradeRequest(
            tradeDate: tradeDateStr,
            indexName: indexName,
            tradingType: tradingType,
            strategyName: strategyName,
            optionType: optionType,
            strikePrice: strike,
            expiryDate: expiryDateStr,
            entryPremium: entry,
            exitPremium: exit,
            ceEntryPrice: ceEntry,
            peEntryPrice: peEntry,
            ceExitPrice: ceExit,
            peExitPrice: peExit,
            quantity: quantity,
            lots: lots,
            entryReason: entryReason.isEmpty ? nil : entryReason,
            exitReason: exitReason.isEmpty ? nil : exitReason,
            notes: notes.isEmpty ? nil : notes
        )
        
        do {
            _ = try await tradeService.createTrade(trade: req)
            isSaving = false
            successMessage = "Trade saved successfully!"
            resetForm()
            return true
        } catch let netErr as NetworkError {
            self.errorMessage = netErr.localizedDescription
            isSaving = false
            return false
        } catch {
            self.errorMessage = error.localizedDescription
            isSaving = false
            return false
        }
    }
    
    public func resetForm() {
        strikePriceText = ""
        entryPremiumText = ""
        exitPremiumText = ""
        ceEntryPriceText = ""
        peEntryPriceText = ""
        ceExitPriceText = ""
        peExitPriceText = ""
        entryReason = ""
        exitReason = ""
        notes = ""
        estimatedCharges = nil
    }
}
