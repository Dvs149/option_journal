import SwiftUI

public struct TradeDetailSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    @ObservedObject private var preferences = PreferencesManager.shared
    public let trade: Trade
    public var onDelete: (() -> Void)?
    
    public init(trade: Trade, onDelete: (() -> Void)? = nil) {
        self.trade = trade
        self.onDelete = onDelete
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            // MARK: - Header
            HStack {
                HStack(spacing: 8) {
                    Text(trade.indexName)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    
                    KiteStatusBadge(optionType: trade.optionType)
                    
                    if let strike = trade.strikePrice {
                        Text("\(Int(strike))")
                            .font(.system(size: 13, weight: .semibold, design: .monospaced))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    }
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
            
            // MARK: - Body Content
            ScrollView(.vertical, showsIndicators: true) {
                VStack(alignment: .leading, spacing: 20) {
                    // P&L Banner
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("NET PROFIT / LOSS")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                .tracking(0.6)
                            
                            Text(CurrencyFormatter.format(amount: trade.calculatedNetPnl, includeSign: true, isPrivacyMode: preferences.isPrivacyModeEnabled))
                                .font(.system(size: 24, weight: .bold, design: .monospaced))
                                .foregroundColor(KiteTheme.pnlColor(for: trade.calculatedNetPnl))
                        }
                        
                        Spacer()
                        
                        VStack(alignment: .trailing, spacing: 4) {
                            Text("TOTAL CHARGES")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                .tracking(0.6)
                            
                            Text(CurrencyFormatter.format(amount: trade.totalCharges ?? 0, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled))
                                .font(.system(size: 16, weight: .semibold, design: .monospaced))
                                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        }
                    }
                    .padding(14)
                    .kiteCard()
                    
                    // Execution Specs
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Execution Details")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                        
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                            SpecItem(label: "Trade Date", value: trade.tradeDate)
                            SpecItem(label: "Trading Type", value: trade.tradingType)
                            SpecItem(label: "Strategy", value: trade.strategyName ?? "Standard")
                            SpecItem(label: "Lots", value: "\(trade.lots ?? 0)")
                            SpecItem(label: "Total Quantity", value: "\(trade.quantity ?? 0)")
                            SpecItem(label: "Expiry Date", value: trade.expiryDate ?? "—")
                            SpecItem(label: "Entry Premium", value: CurrencyFormatter.format(amount: trade.entryPremium ?? 0, includeSign: false))
                            SpecItem(label: "Exit Premium", value: CurrencyFormatter.format(amount: trade.exitPremium ?? 0, includeSign: false))
                            SpecItem(label: "Gross P&L", value: CurrencyFormatter.format(amount: (trade.grossProfit ?? 0) - (trade.grossLoss ?? 0), includeSign: true, isPrivacyMode: preferences.isPrivacyModeEnabled))
                        }
                    }
                    .padding(14)
                    .kiteCard()
                    
                    // Charges Breakdown
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Brokerage & Statutory Charges Breakdown")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                        
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                            SpecItem(label: "Brokerage", value: CurrencyFormatter.format(amount: trade.brokerage ?? 0))
                            SpecItem(label: "STT / CTT", value: CurrencyFormatter.format(amount: trade.stt ?? 0))
                            SpecItem(label: "Exchange Charges", value: CurrencyFormatter.format(amount: trade.exchangeCharges ?? 0))
                            SpecItem(label: "GST", value: CurrencyFormatter.format(amount: trade.gst ?? 0))
                            SpecItem(label: "SEBI Fees", value: CurrencyFormatter.format(amount: trade.sebiCharges ?? 0))
                            SpecItem(label: "Stamp Duty", value: CurrencyFormatter.format(amount: trade.stampDuty ?? 0))
                        }
                    }
                    .padding(14)
                    .kiteCard()
                    
                    // Rationale & Journal
                    if let journal = trade.journal {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Journal & Psychology")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                            
                            if let setup = journal.tradeSetup, !setup.isEmpty {
                                JournalNote(title: "Setup Rationale", text: setup)
                            }
                            if let right = journal.whatWentRight, !right.isEmpty {
                                JournalNote(title: "What Went Right", text: right)
                            }
                            if let wrong = journal.whatWentWrong, !wrong.isEmpty {
                                JournalNote(title: "What Went Wrong", text: wrong)
                            }
                            if let mistakes = journal.mistakesMade, !mistakes.isEmpty {
                                JournalNote(title: "Mistakes Made", text: mistakes)
                            }
                            if let lesson = journal.lessonsLearned, !lesson.isEmpty {
                                JournalNote(title: "Lessons Learned", text: lesson)
                            }
                        }
                        .padding(14)
                        .kiteCard()
                    } else if let notes = trade.notes, !notes.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Notes")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                            Text(notes)
                                .font(.system(size: 12))
                                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        }
                        .padding(14)
                        .kiteCard()
                    }
                    
                    // Actions
                    HStack {
                        Spacer()
                        if let onDelete = onDelete {
                            Button("Delete Trade") {
                                onDelete()
                                dismiss()
                            }
                            .foregroundColor(KiteTheme.lossRed)
                            .kiteGhostButton()
                        }
                    }
                }
                .padding(18)
            }
        }
        .frame(minWidth: 500, idealWidth: 540, maxWidth: 600, minHeight: 500, idealHeight: 600)
        .background(KiteTheme.canvas(for: colorScheme))
    }
}

private struct SpecItem: View {
    @Environment(\.colorScheme) private var colorScheme
    let label: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.system(size: 10))
                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            Text(value)
                .font(.system(size: 12, weight: .medium, design: .monospaced))
                .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
        }
    }
}

private struct JournalNote: View {
    @Environment(\.colorScheme) private var colorScheme
    let title: String
    let text: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(KiteTheme.brandBlue)
            Text(text)
                .font(.system(size: 12))
                .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
        }
        .padding(.vertical, 2)
    }
}
