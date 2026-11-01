import SwiftUI

public struct AddTradeView: View {
    @StateObject private var viewModel = AddTradeViewModel()
    @Environment(\.colorScheme) private var colorScheme
    @ObservedObject private var preferences = PreferencesManager.shared
    
    public init() {}
    
    public var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Add Trade Execution")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                        Text("Log derivative option trades with real-time statutory charge estimation")
                            .font(.system(size: 12))
                            .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    }
                    Spacer()
                    
                    if let success = viewModel.successMessage {
                        HStack(spacing: 6) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(KiteTheme.profitGreen)
                            Text(success)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(KiteTheme.profitGreen)
                        }
                    }
                }
                
                if let error = viewModel.errorMessage {
                    HStack(spacing: 8) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(KiteTheme.lossRed)
                        Text(error)
                            .font(.system(size: 12))
                            .foregroundColor(KiteTheme.lossRed)
                    }
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(KiteTheme.lossRed.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                }
                
                // Form Layout: 2 Columns
                HStack(alignment: .top, spacing: 20) {
                    // MARK: - Left Form Column
                    VStack(alignment: .leading, spacing: 16) {
                        // Section 1: Instrument & Type
                        VStack(alignment: .leading, spacing: 12) {
                            Text("1. Instrument & Strategy")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                            
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Trade Date").font(.system(size: 11)).foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                    DatePicker("", selection: $viewModel.tradeDate, displayedComponents: [.date])
                                        .labelsHidden()
                                        .datePickerStyle(.compact)
                                }
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Index Symbol").font(.system(size: 11)).foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                    Picker("", selection: $viewModel.indexName) {
                                        ForEach(viewModel.availableIndices, id: \.self) { idx in
                                            Text(idx).tag(idx)
                                        }
                                    }
                                    .pickerStyle(.menu)
                                    .onChange(of: viewModel.indexName) { _ in viewModel.updateQuantity() }
                                }
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Option Type").font(.system(size: 11)).foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                    Picker("", selection: $viewModel.optionType) {
                                        ForEach(viewModel.availableOptionTypes, id: \.self) { opt in
                                            Text(opt).tag(opt)
                                        }
                                    }
                                    .pickerStyle(.segmented)
                                    .onChange(of: viewModel.optionType) { _ in viewModel.triggerEstimation() }
                                }
                            }
                            
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Trading Style").font(.system(size: 11)).foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                    Picker("", selection: $viewModel.tradingType) {
                                        ForEach(viewModel.availableTradingTypes, id: \.self) { t in
                                            Text(t).tag(t)
                                        }
                                    }
                                    .pickerStyle(.menu)
                                }
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Strategy Name").font(.system(size: 11)).foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                    Picker("", selection: $viewModel.strategyName) {
                                        ForEach(viewModel.availableStrategies, id: \.self) { s in
                                            Text(s).tag(s)
                                        }
                                    }
                                    .pickerStyle(.menu)
                                }
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Strike Price").font(.system(size: 11)).foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                    TextField("e.g. 24500", text: $viewModel.strikePriceText)
                                        .textFieldStyle(.plain)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 5)
                                        .background(KiteTheme.surfaceElevated(for: colorScheme))
                                        .clipShape(RoundedRectangle(cornerRadius: 4))
                                        .overlay(RoundedRectangle(cornerRadius: 4).stroke(KiteTheme.border(for: colorScheme), lineWidth: 1))
                                }
                            }
                        }
                        .padding(14)
                        .kiteCard()
                        
                        // Section 2: Position Size & Premiums
                        VStack(alignment: .leading, spacing: 12) {
                            Text("2. Quantity & Execution Premiums")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                            
                            HStack(spacing: 20) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Lots").font(.system(size: 11)).foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                    Stepper("\(viewModel.lots) Lots", value: $viewModel.lots, in: 1...1000)
                                        .onChange(of: viewModel.lots) { _ in viewModel.updateQuantity() }
                                }
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Total Quantity (Shares)").font(.system(size: 11)).foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                    Text("\(viewModel.quantity)")
                                        .font(.system(size: 13, weight: .bold, design: .monospaced))
                                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                                        .padding(.horizontal, 10)
                                        .padding(.vertical, 6)
                                        .background(KiteTheme.surfaceElevated(for: colorScheme))
                                        .clipShape(RoundedRectangle(cornerRadius: 4))
                                }
                            }
                            
                            if viewModel.optionType != "Both" {
                                HStack(spacing: 14) {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Entry Premium (₹)").font(.system(size: 11)).foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                        TextField("0.00", text: $viewModel.entryPremiumText)
                                            .textFieldStyle(.plain)
                                            .font(.system(size: 13, design: .monospaced))
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 7)
                                            .background(KiteTheme.surfaceElevated(for: colorScheme))
                                            .clipShape(RoundedRectangle(cornerRadius: 4))
                                            .overlay(RoundedRectangle(cornerRadius: 4).stroke(KiteTheme.border(for: colorScheme), lineWidth: 1))
                                            .onChange(of: viewModel.entryPremiumText) { _ in viewModel.triggerEstimation() }
                                    }
                                    
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Exit Premium (₹)").font(.system(size: 11)).foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                        TextField("0.00", text: $viewModel.exitPremiumText)
                                            .textFieldStyle(.plain)
                                            .font(.system(size: 13, design: .monospaced))
                                            .padding(.horizontal, 10)
                                            .padding(.vertical, 7)
                                            .background(KiteTheme.surfaceElevated(for: colorScheme))
                                            .clipShape(RoundedRectangle(cornerRadius: 4))
                                            .overlay(RoundedRectangle(cornerRadius: 4).stroke(KiteTheme.border(for: colorScheme), lineWidth: 1))
                                            .onChange(of: viewModel.exitPremiumText) { _ in viewModel.triggerEstimation() }
                                    }
                                }
                            } else {
                                // Multi Leg (Both) Inputs
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack(spacing: 12) {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text("CE Entry (₹)").font(.system(size: 10)).foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                            TextField("0.00", text: $viewModel.ceEntryPriceText)
                                                .textFieldStyle(.plain)
                                                .padding(6)
                                                .background(KiteTheme.surfaceElevated(for: colorScheme))
                                                .clipShape(RoundedRectangle(cornerRadius: 4))
                                                .onChange(of: viewModel.ceEntryPriceText) { _ in viewModel.triggerEstimation() }
                                        }
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text("CE Exit (₹)").font(.system(size: 10)).foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                            TextField("0.00", text: $viewModel.ceExitPriceText)
                                                .textFieldStyle(.plain)
                                                .padding(6)
                                                .background(KiteTheme.surfaceElevated(for: colorScheme))
                                                .clipShape(RoundedRectangle(cornerRadius: 4))
                                                .onChange(of: viewModel.ceExitPriceText) { _ in viewModel.triggerEstimation() }
                                        }
                                    }
                                    HStack(spacing: 12) {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text("PE Entry (₹)").font(.system(size: 10)).foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                            TextField("0.00", text: $viewModel.peEntryPriceText)
                                                .textFieldStyle(.plain)
                                                .padding(6)
                                                .background(KiteTheme.surfaceElevated(for: colorScheme))
                                                .clipShape(RoundedRectangle(cornerRadius: 4))
                                                .onChange(of: viewModel.peEntryPriceText) { _ in viewModel.triggerEstimation() }
                                        }
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text("PE Exit (₹)").font(.system(size: 10)).foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                            TextField("0.00", text: $viewModel.peExitPriceText)
                                                .textFieldStyle(.plain)
                                                .padding(6)
                                                .background(KiteTheme.surfaceElevated(for: colorScheme))
                                                .clipShape(RoundedRectangle(cornerRadius: 4))
                                                .onChange(of: viewModel.peExitPriceText) { _ in viewModel.triggerEstimation() }
                                        }
                                    }
                                }
                            }
                        }
                        .padding(14)
                        .kiteCard()
                        
                        // Section 3: Notes & Trade Rationale
                        VStack(alignment: .leading, spacing: 10) {
                            Text("3. Execution Notes & Setup Rationale")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                            
                            TextField("Setup reason (e.g. 15-min breakout at CPR support)", text: $viewModel.entryReason)
                                .textFieldStyle(.plain)
                                .padding(8)
                                .background(KiteTheme.surfaceElevated(for: colorScheme))
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                                .overlay(RoundedRectangle(cornerRadius: 4).stroke(KiteTheme.border(for: colorScheme), lineWidth: 1))
                            
                            TextField("Execution notes & trade reflections...", text: $viewModel.notes)
                                .textFieldStyle(.plain)
                                .padding(8)
                                .background(KiteTheme.surfaceElevated(for: colorScheme))
                                .clipShape(RoundedRectangle(cornerRadius: 4))
                                .overlay(RoundedRectangle(cornerRadius: 4).stroke(KiteTheme.border(for: colorScheme), lineWidth: 1))
                        }
                        .padding(14)
                        .kiteCard()
                    }
                    .frame(maxWidth: .infinity)
                    
                    // MARK: - Right Column: Live Statutory Calculation & Preview
                    VStack(alignment: .leading, spacing: 14) {
                        Text("Live Charges & P&L Estimation")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                        
                        if let est = viewModel.estimatedCharges {
                            let net = est.netPnl ?? 0.0
                            let gross = est.grossPnl ?? 0.0
                            let totalCharges = est.totalCharges ?? 0.0
                            
                            VStack(alignment: .leading, spacing: 14) {
                                // Estimated Net P&L Card
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("ESTIMATED NET P&L")
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                        .tracking(0.6)
                                    
                                    Text(CurrencyFormatter.format(amount: net, includeSign: true, isPrivacyMode: preferences.isPrivacyModeEnabled))
                                        .font(.system(size: 26, weight: .bold, design: .monospaced))
                                        .foregroundColor(KiteTheme.pnlColor(for: net))
                                }
                                
                                Divider().background(KiteTheme.border(for: colorScheme))
                                
                                // Charges Breakdown
                                VStack(spacing: 8) {
                                    ChargeRow(label: "Gross P&L", value: CurrencyFormatter.format(amount: gross, includeSign: true))
                                    ChargeRow(label: "Brokerage", value: CurrencyFormatter.format(amount: est.brokerage ?? 0))
                                    ChargeRow(label: "STT / CTT", value: CurrencyFormatter.format(amount: est.stt ?? 0))
                                    ChargeRow(label: "Exchange Charges", value: CurrencyFormatter.format(amount: est.exchangeCharges ?? 0))
                                    ChargeRow(label: "GST (18%)", value: CurrencyFormatter.format(amount: est.gst ?? 0))
                                    ChargeRow(label: "SEBI Turnover", value: CurrencyFormatter.format(amount: est.sebiCharges ?? 0))
                                    ChargeRow(label: "Stamp Duty", value: CurrencyFormatter.format(amount: est.stampDuty ?? 0))
                                    
                                    Divider().background(KiteTheme.border(for: colorScheme))
                                    
                                    ChargeRow(label: "Total Charges", value: CurrencyFormatter.format(amount: totalCharges), isBold: true)
                                }
                            }
                            .padding(16)
                            .kiteCard()
                        } else {
                            VStack(spacing: 10) {
                                Image(systemName: "calculator")
                                    .font(.system(size: 28))
                                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                Text("Enter entry and exit premiums to see live Indian broker statutory tax breakdown.")
                                    .font(.system(size: 11))
                                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                                    .multilineTextAlignment(.center)
                            }
                            .frame(maxWidth: .infinity, minHeight: 220)
                            .kiteCard()
                        }
                        
                        // Save Button
                        Button {
                            Task {
                                _ = await viewModel.saveTrade()
                            }
                        } label: {
                            HStack {
                                Spacer()
                                if viewModel.isSaving {
                                    ProgressView().controlSize(.small).colorInvert()
                                } else {
                                    Text("Save Trade Execution")
                                        .font(.system(size: 13, weight: .semibold))
                                }
                                Spacer()
                            }
                            .frame(height: 22)
                        }
                        .kitePrimaryButton()
                        .keyboardShortcut("s", modifiers: .command)
                        .disabled(viewModel.isSaving)
                    }
                    .frame(width: 320)
                }
            }
            .padding(24)
        }
        .background(KiteTheme.canvas(for: colorScheme))
    }
}

private struct ChargeRow: View {
    @Environment(\.colorScheme) private var colorScheme
    let label: String
    let value: String
    var isBold: Bool = false
    
    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 11, weight: isBold ? .semibold : .regular))
                .foregroundColor(isBold ? KiteTheme.textPrimary(for: colorScheme) : KiteTheme.textSecondary(for: colorScheme))
            Spacer()
            Text(value)
                .font(.system(size: 11, weight: isBold ? .bold : .medium, design: .monospaced))
                .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
        }
    }
}
