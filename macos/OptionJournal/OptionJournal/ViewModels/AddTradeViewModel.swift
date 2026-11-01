import SwiftUI
import Combine

@MainActor
public final class AddTradeViewModel: ObservableObject {
    // MARK: - Navigation & Active Section
    @Published public var activeTab: String = "trade_details" // "trade_details", "pnl_charges", "strategy_journal"
    @Published public var showPreviewModal: Bool = false
    @Published public var showBulkImportModal: Bool = false
    
    // MARK: - 1. Trade Details Form Fields
    @Published public var tradeDate: Date = Date()
    @Published public var indexName: String = "NIFTY"
    @Published public var tradingType: String = "Intraday"
    @Published public var optionType: String = "CE" // "CE", "PE", "Both"
    @Published public var strikePriceText: String = "25900"
    @Published public var expiryDate: Date = Date().addingTimeInterval(7 * 86400)
    
    // Premiums
    @Published public var entryPremiumText: String = "123.00"
    @Published public var exitPremiumText: String = "156.00"
    
    // Multi Leg (Both) Premiums
    @Published public var ceEntryPriceText: String = ""
    @Published public var peEntryPriceText: String = ""
    @Published public var ceExitPriceText: String = ""
    @Published public var peExitPriceText: String = ""
    
    // Position sizing
    @Published public var lotsText: String = "1"
    @Published public var quantityText: String = "65"
    
    // Strategy & Market
    @Published public var strategyName: String = "Long Straddle"
    @Published public var marketCondition: String = "Rangebound"
    
    // MARK: - 2. P&L & Charges Form Fields
    @Published public var grossProfitText: String = "2145.00"
    @Published public var grossLossText: String = "0.00"
    @Published public var totalChargesText: String = "145.27"
    
    // Detailed Charges Breakdown
    @Published public var brokerageText: String = "40.00"
    @Published public var sttText: String = "15.21"
    @Published public var exchangeChargesText: String = "6.44"
    @Published public var gstText: String = "8.36"
    @Published public var sebiChargesText: String = "0.02"
    @Published public var stampDutyText: String = "0.24"
    @Published public var otherChargesText: String = "75.00"
    
    // MARK: - 3. Strategy & Journal Reflections
    @Published public var entryReason: String = "Breakout above resistance"
    @Published public var exitReason: String = "Booked profit at target"
    @Published public var tradeSetup: String = "Long Straddle before event"
    @Published public var whatWentRight: String = "Good entry timing"
    @Published public var whatWentWrong: String = "Exited early"
    @Published public var mistakesMade: String = "Could have held longer"
    @Published public var lessonsLearned: String = "Be patient with targets"
    @Published public var personalNotes: String = "N/A"
    
    // Screenshots
    @Published public var selectedScreenshots: [URL] = []
    
    // Feedback & Loading
    @Published public var isSaving: Bool = false
    @Published public var isEstimating: Bool = false
    @Published public var errorMessage: String?
    @Published public var successMessage: String?
    
    // Available dropdown options matching web platform
    public let availableIndices = ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "SENSEX", "BANKEX"]
    public let availableOptionTypes = ["CE", "PE", "Both"]
    public let availableTradingTypes = ["Intraday", "Positional", "Swing", "BTST", "Scalping"]
    public let availableStrategies = [
        "Long Straddle",
        "Directional CE",
        "Directional PE",
        "Short Straddle",
        "Short Strangle",
        "Bull Call Spread",
        "Bear Put Spread",
        "Iron Condor",
        "Iron Butterfly",
        "Scalping",
        "Breakout",
        "Reversal"
    ]
    public let availableMarketConditions = [
        "Rangebound",
        "Trending Up",
        "Trending Down",
        "Volatile",
        "Breakout",
        "Consolidation"
    ]
    
    private let tradeService: TradeServiceProtocol
    private var isUpdatingInternally: Bool = false
    
    public init(tradeService: TradeServiceProtocol) {
        self.tradeService = tradeService
        self.recalculateCharges()
    }
    
    public convenience init() {
        self.init(tradeService: TradeService())
    }
    
    // MARK: - Lot Size Mapping (Matches Modern NSE / BSE Lots)
    public func lotSize(for index: String) -> Int {
        switch index.uppercased() {
        case "NIFTY": return 65
        case "BANKNIFTY": return 15
        case "FINNIFTY": return 25
        case "MIDCPNIFTY": return 50
        case "SENSEX": return 10
        case "BANKEX": return 15
        default: return 65
        }
    }
    
    public var currentLotSize: Int {
        lotSize(for: indexName)
    }
    
    public var lots: Int {
        Int(lotsText) ?? 1
    }
    
    public var quantity: Int {
        Int(quantityText) ?? (lots * currentLotSize)
    }
    
    // MARK: - Bidirectional Synchronization
    public func onIndexChanged() {
        let size = currentLotSize
        let l = max(1, Int(lotsText) ?? 1)
        quantityText = "\(l * size)"
        recalculateCharges()
    }
    
    public func onLotsChanged() {
        guard !isUpdatingInternally else { return }
        isUpdatingInternally = true
        let l = max(1, Int(lotsText) ?? 1)
        quantityText = "\(l * currentLotSize)"
        isUpdatingInternally = false
        recalculateCharges()
    }
    
    public func onQuantityChanged() {
        guard !isUpdatingInternally else { return }
        isUpdatingInternally = true
        let q = max(1, Int(quantityText) ?? currentLotSize)
        let calcLots = max(1, Int(round(Double(q) / Double(currentLotSize))))
        lotsText = "\(calcLots)"
        isUpdatingInternally = false
        recalculateCharges()
    }
    
    public func onBothPremiumsChanged() {
        let ceEn = Double(ceEntryPriceText) ?? 0.0
        let peEn = Double(peEntryPriceText) ?? 0.0
        let ceEx = Double(ceExitPriceText) ?? 0.0
        let peEx = Double(peExitPriceText) ?? 0.0
        
        if ceEn > 0 || peEn > 0 {
            entryPremiumText = String(format: "%.2f", ceEn + peEn)
        }
        if ceEx > 0 || peEx > 0 {
            exitPremiumText = String(format: "%.2f", ceEx + peEx)
        }
        recalculateCharges()
    }
    
    // MARK: - Complete Indian Statutory Charges Calculation Engine
    public func recalculateCharges() {
        let entry = Double(entryPremiumText) ?? 0.0
        let exit = Double(exitPremiumText) ?? 0.0
        let qty = Double(quantity)
        
        guard qty > 0 else { return }
        
        // 1. Gross P&L
        let diff = (exit - entry) * qty
        let gp: Double
        let gl: Double
        if diff >= 0 {
            gp = diff
            gl = 0.0
        } else {
            gp = 0.0
            gl = abs(diff)
        }
        grossProfitText = String(format: "%.2f", gp)
        grossLossText = String(format: "%.2f", gl)
        
        // Turnovers
        let turnoverBuy = entry * qty
        let turnoverSell = exit * qty
        let totalTurnover = turnoverBuy + turnoverSell
        
        // Executed orders: 2 for Single leg (Buy + Sell), 4 for Both
        let orders = optionType == "Both" ? 4 : 2
        
        // 1. Brokerage: Flat ₹20 per executed order
        let brokerage = round(20.0 * Double(orders) * 100) / 100
        brokerageText = String(format: "%.2f", brokerage)
        
        // 2. STT: 0.15% on sell side (turnoverSell)
        let stt = round(turnoverSell * 0.0015 * 100) / 100
        sttText = String(format: "%.2f", stt)
        
        // 3. Exchange Charges: BSE 0.0325% | NSE 0.03553% on total turnover
        let isBse = ["SENSEX", "BANKEX"].contains(indexName.uppercased())
        let txnRate = isBse ? 0.000325 : 0.0003553
        let exchangeCharges = round(totalTurnover * txnRate * 100) / 100
        exchangeChargesText = String(format: "%.2f", exchangeCharges)
        
        // 4. SEBI Charges: ₹10 per crore (0.0001% of total turnover)
        let sebiCharges = round(totalTurnover * 0.000001 * 100) / 100
        sebiChargesText = String(format: "%.2f", sebiCharges)
        
        // 5. Stamp Duty: 0.003% on buy side (turnoverBuy)
        let stampDuty = round(turnoverBuy * 0.00003 * 100) / 100
        stampDutyText = String(format: "%.2f", stampDuty)
        
        // 6. GST: 18% on (Brokerage + Exchange Charges + SEBI Charges)
        let gst = round((brokerage + exchangeCharges + sebiCharges) * 0.18 * 100) / 100
        gstText = String(format: "%.2f", gst)
        
        // 7. Other Charges
        let other = Double(otherChargesText) ?? 0.0
        
        // Total Charges
        let total = brokerage + stt + exchangeCharges + gst + sebiCharges + stampDuty + other
        totalChargesText = String(format: "%.2f", total)
    }
    
    // Computed Net P&L
    public var calculatedNetPnl: Double {
        let gp = Double(grossProfitText) ?? 0.0
        let gl = Double(grossLossText) ?? 0.0
        let ch = Double(totalChargesText) ?? 0.0
        return gp - gl - ch
    }
    
    public var calculatedGrossProfit: Double {
        Double(grossProfitText) ?? 0.0
    }
    
    public var calculatedGrossLoss: Double {
        Double(grossLossText) ?? 0.0
    }
    
    public var calculatedTotalCharges: Double {
        Double(totalChargesText) ?? 0.0
    }
    
    // MARK: - Save Trade Execution
    public func saveTrade(resetOnSuccess: Bool = true) async -> Bool {
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
        
        let gp = Double(grossProfitText)
        let gl = Double(grossLossText)
        let bro = Double(brokerageText)
        let stt = Double(sttText)
        let ex = Double(exchangeChargesText)
        let gst = Double(gstText)
        let sebi = Double(sebiChargesText)
        let stamp = Double(stampDutyText)
        let other = Double(otherChargesText)
        let totalCh = Double(totalChargesText)
        let net = calculatedNetPnl
        
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
            notes: personalNotes.isEmpty ? nil : personalNotes,
            marketConditions: marketCondition.isEmpty ? nil : marketCondition,
            tradeSetup: tradeSetup.isEmpty ? nil : tradeSetup,
            whatWentRight: whatWentRight.isEmpty ? nil : whatWentRight,
            whatWentWrong: whatWentWrong.isEmpty ? nil : whatWentWrong,
            mistakesMade: mistakesMade.isEmpty ? nil : mistakesMade,
            lessonsLearned: lessonsLearned.isEmpty ? nil : lessonsLearned,
            personalNotes: personalNotes.isEmpty ? nil : personalNotes,
            grossProfit: gp,
            grossLoss: gl,
            brokerage: bro,
            stt: stt,
            exchangeCharges: ex,
            gst: gst,
            sebiCharges: sebi,
            stampDuty: stamp,
            otherCharges: other,
            totalCharges: totalCh,
            netPnl: net
        )
        
        do {
            _ = try await tradeService.createTrade(trade: req)
            isSaving = false
            successMessage = "Trade saved successfully!"
            if resetOnSuccess {
                resetForm()
            }
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
    
    // Save and prepare for another trade
    public func saveAndAddAnother() async -> Bool {
        let success = await saveTrade(resetOnSuccess: false)
        if success {
            // Keep date, index, type, strategy; clear premiums and notes
            entryPremiumText = ""
            exitPremiumText = ""
            ceEntryPriceText = ""
            peEntryPriceText = ""
            ceExitPriceText = ""
            peExitPriceText = ""
            strikePriceText = ""
            entryReason = ""
            exitReason = ""
            tradeSetup = ""
            whatWentRight = ""
            whatWentWrong = ""
            mistakesMade = ""
            lessonsLearned = ""
            personalNotes = ""
            selectedScreenshots = []
            grossProfitText = "0.00"
            grossLossText = "0.00"
            totalChargesText = "0.00"
            successMessage = "Trade logged! Ready for next trade."
        }
        return success
    }
    
    public func resetForm() {
        strikePriceText = ""
        entryPremiumText = ""
        exitPremiumText = ""
        ceEntryPriceText = ""
        peEntryPriceText = ""
        ceExitPriceText = ""
        peExitPriceText = ""
        lotsText = "1"
        quantityText = "\(currentLotSize)"
        grossProfitText = "0.00"
        grossLossText = "0.00"
        totalChargesText = "0.00"
        entryReason = ""
        exitReason = ""
        tradeSetup = ""
        whatWentRight = ""
        whatWentWrong = ""
        mistakesMade = ""
        lessonsLearned = ""
        personalNotes = ""
        selectedScreenshots = []
        errorMessage = nil
        successMessage = nil
    }
}
