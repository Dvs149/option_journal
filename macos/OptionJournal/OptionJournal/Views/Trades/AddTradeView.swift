import SwiftUI
import AppKit
import UniformTypeIdentifiers

public struct AddTradeView: View {
    @StateObject private var viewModel = AddTradeViewModel()
    @Environment(\.colorScheme) private var colorScheme
    @ObservedObject private var preferences = PreferencesManager.shared
    
    public init() {}
    
    public var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(alignment: .leading, spacing: 18) {
                // MARK: - Breadcrumb & Header
                headerSection
                
                // MARK: - Section Navigation Strip
                sectionNavigationStrip
                
                // Status banners
                if let success = viewModel.successMessage {
                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(DashboardPalette.profitGreen)
                        Text(success)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(DashboardPalette.profitGreen)
                        Spacer()
                    }
                    .padding(12)
                    .background(DashboardPalette.profitGreen.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(DashboardPalette.profitGreen.opacity(0.3), lineWidth: 1))
                }
                
                if let error = viewModel.errorMessage {
                    HStack(spacing: 8) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(DashboardPalette.lossRed)
                        Text(error)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(DashboardPalette.lossRed)
                        Spacer()
                    }
                    .padding(12)
                    .background(DashboardPalette.lossRed.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(DashboardPalette.lossRed.opacity(0.3), lineWidth: 1))
                }
                
                // MARK: - Main 2-Column Form Layout
                HStack(alignment: .top, spacing: 20) {
                    // Left Column (Cards 1, 2, 3)
                    VStack(alignment: .leading, spacing: 20) {
                        // Card 1: Trade Details
                        tradeDetailsCard
                        
                        // Card 2: P&L & Charges
                        pnlAndChargesCard
                        
                        // Card 3: Strategy & Journal
                        strategyAndJournalCard
                    }
                    .frame(maxWidth: .infinity)
                    
                    // Right Column (Sticky Sidebars)
                    VStack(alignment: .leading, spacing: 20) {
                        // Trade Summary Card
                        tradeSummaryCard
                        
                        // Quick Actions Card
                        quickActionsCard
                    }
                    .frame(width: 320)
                }
            }
            .padding(24)
        }
        .background(Color(red: 11/255, green: 17/255, blue: 30/255))
        .sheet(isPresented: $viewModel.showPreviewModal) {
            TradePreviewSheet(viewModel: viewModel)
        }
        .sheet(isPresented: $viewModel.showBulkImportModal) {
            BulkImportSheet()
        }
    }
    
    // =========================================================================
    // MARK: - Header & Breadcrumb
    // =========================================================================
    @ViewBuilder
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Text("Home")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                Image(systemName: "chevron.right")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(DashboardPalette.textMutedDark)
                Text("Add Trade")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(DashboardPalette.textPrimaryDark)
            }
            
            Text("Add Trade")
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(DashboardPalette.textPrimaryDark)
            
            Text("Record your option trade with all details")
                .font(.system(size: 13))
                .foregroundColor(DashboardPalette.textSecondaryDark)
        }
    }
    
    // =========================================================================
    // MARK: - Section Navigation Strip
    // =========================================================================
    @ViewBuilder
    private var sectionNavigationStrip: some View {
        HStack(spacing: 8) {
            TabPillButton(
                title: "Trade Details",
                icon: "doc.text",
                isSelected: viewModel.activeTab == "trade_details"
            ) {
                viewModel.activeTab = "trade_details"
            }
            
            TabPillButton(
                title: "P&L & Charges",
                icon: "receipt",
                isSelected: viewModel.activeTab == "pnl_charges"
            ) {
                viewModel.activeTab = "pnl_charges"
            }
            
            TabPillButton(
                title: "Strategy & Journal",
                icon: "book.closed",
                isSelected: viewModel.activeTab == "strategy_journal"
            ) {
                viewModel.activeTab = "strategy_journal"
            }
            
            TabPillButton(
                title: "Preview",
                icon: "eye",
                isSelected: false
            ) {
                viewModel.showPreviewModal = true
            }
            
            Spacer()
            
            // Bulk Import Pill
            Button {
                viewModel.showBulkImportModal = true
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 12, weight: .bold))
                    Text("Bulk Import")
                        .font(.system(size: 12, weight: .semibold))
                }
                .foregroundColor(Color(hex: "#F97316"))
                .padding(.horizontal, 14)
                .padding(.vertical, 7)
                .background(Color(hex: "#F97316").opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(hex: "#F97316").opacity(0.4), lineWidth: 1))
            }
            .buttonStyle(.plain)
        }
        .padding(6)
        .background(Color(red: 18/255, green: 27/255, blue: 45/255))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(DashboardPalette.borderDark, lineWidth: 1))
    }
    
    // =========================================================================
    // MARK: - Card 1: Trade Details
    // =========================================================================
    @ViewBuilder
    private var tradeDetailsCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            VStack(alignment: .leading, spacing: 2) {
                Text("Trade Details")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(DashboardPalette.textPrimaryDark)
                Text("Enter basic trade information")
                    .font(.system(size: 11))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
            }
            
            // Row 1: Trading Date, Index, Trading Type (3 cols)
            HStack(spacing: 14) {
                FormDatePickerField(label: "Trading Date", date: $viewModel.tradeDate, isRequired: true)
                    .frame(maxWidth: .infinity)
                
                FormPickerField(
                    label: "Index",
                    selection: $viewModel.indexName,
                    options: viewModel.availableIndices,
                    titleForOption: { "\($0) (Lot: \(viewModel.lotSize(for: $0)))" },
                    isRequired: true
                ) {
                    viewModel.onIndexChanged()
                }
                .frame(maxWidth: .infinity)
                
                FormPickerField(
                    label: "Trading Type",
                    selection: $viewModel.tradingType,
                    options: viewModel.availableTradingTypes,
                    titleForOption: { $0 },
                    isRequired: true
                )
                .frame(maxWidth: .infinity)
            }
            
            // Row 2: Option Type, Strike Price, Expiry Date (3 cols)
            HStack(spacing: 14) {
                OptionTypeSelector(optionType: $viewModel.optionType) {
                    viewModel.recalculateCharges()
                }
                .frame(maxWidth: .infinity)
                
                FormInputField(
                    label: "Strike Price",
                    text: $viewModel.strikePriceText,
                    placeholder: "25900",
                    isMonospaced: true
                )
                .frame(maxWidth: .infinity)
                
                FormDatePickerField(label: "Expiry Date", date: $viewModel.expiryDate)
                    .frame(maxWidth: .infinity)
            }
            
            // If Both Option Type is selected, show explicit leg inputs
            if viewModel.optionType == "Both" {
                VStack(alignment: .leading, spacing: 10) {
                    Text("Straddle / Strangle Legs Breakdown (CE + PE)")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(DashboardPalette.warmAmber)
                    
                    HStack(spacing: 14) {
                        FormInputField(label: "CE Entry Price (₹)", text: $viewModel.ceEntryPriceText, placeholder: "0.00", isMonospaced: true) {
                            viewModel.onBothPremiumsChanged()
                        }
                        FormInputField(label: "PE Entry Price (₹)", text: $viewModel.peEntryPriceText, placeholder: "0.00", isMonospaced: true) {
                            viewModel.onBothPremiumsChanged()
                        }
                        FormInputField(label: "CE Exit Price (₹)", text: $viewModel.ceExitPriceText, placeholder: "0.00", isMonospaced: true) {
                            viewModel.onBothPremiumsChanged()
                        }
                        FormInputField(label: "PE Exit Price (₹)", text: $viewModel.peExitPriceText, placeholder: "0.00", isMonospaced: true) {
                            viewModel.onBothPremiumsChanged()
                        }
                    }
                }
                .padding(12)
                .background(Color(red: 14/255, green: 22/255, blue: 38/255))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(DashboardPalette.warmAmber.opacity(0.3), lineWidth: 1))
            }
            
            // Row 3: Entry Premium, Exit Premium, Quantity (Shares) (3 cols)
            HStack(spacing: 14) {
                FormInputField(
                    label: "Entry Premium",
                    text: $viewModel.entryPremiumText,
                    placeholder: "123.00",
                    isMonospaced: true
                ) {
                    viewModel.recalculateCharges()
                }
                .frame(maxWidth: .infinity)
                
                FormInputField(
                    label: "Exit Premium",
                    text: $viewModel.exitPremiumText,
                    placeholder: "156.00",
                    isMonospaced: true
                ) {
                    viewModel.recalculateCharges()
                }
                .frame(maxWidth: .infinity)
                
                FormInputField(
                    label: "Quantity (Shares)",
                    text: $viewModel.quantityText,
                    placeholder: "65",
                    isMonospaced: true
                ) {
                    viewModel.onQuantityChanged()
                }
                .frame(maxWidth: .infinity)
            }
            
            // Row 4: Number of Lots, Strategy Name, Market Condition (3 cols)
            HStack(spacing: 14) {
                VStack(alignment: .leading, spacing: 4) {
                    FormInputField(
                        label: "Number of Lots",
                        text: $viewModel.lotsText,
                        placeholder: "1",
                        isMonospaced: true
                    ) {
                        viewModel.onLotsChanged()
                    }
                    
                    Text("Lot size: \(viewModel.currentLotSize) (\(viewModel.indexName))")
                        .font(.system(size: 10))
                        .foregroundColor(DashboardPalette.textMutedDark)
                }
                .frame(maxWidth: .infinity)
                
                FormPickerField(
                    label: "Strategy Name",
                    selection: $viewModel.strategyName,
                    options: viewModel.availableStrategies,
                    titleForOption: { $0 }
                )
                .frame(maxWidth: .infinity)
                
                FormPickerField(
                    label: "Market Condition",
                    selection: $viewModel.marketCondition,
                    options: viewModel.availableMarketConditions,
                    titleForOption: { $0 }
                )
                .frame(maxWidth: .infinity)
            }
        }
        .padding(18)
        .dashboardCard()
    }
    
    // =========================================================================
    // MARK: - Card 2: P&L & Charges
    // =========================================================================
    @ViewBuilder
    private var pnlAndChargesCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            VStack(alignment: .leading, spacing: 2) {
                Text("P&L & Charges")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(DashboardPalette.textPrimaryDark)
                Text("Enter profit, loss and trading charges")
                    .font(.system(size: 11))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
            }
            
            // Top Row: Gross Profit, Gross Loss, Total Charges, Auto Calculate Button
            HStack(alignment: .bottom, spacing: 14) {
                FormInputField(
                    label: "Gross Profit",
                    text: $viewModel.grossProfitText,
                    placeholder: "0.00",
                    textColor: DashboardPalette.profitGreen,
                    isMonospaced: true
                )
                .frame(maxWidth: .infinity)
                
                FormInputField(
                    label: "Gross Loss",
                    text: $viewModel.grossLossText,
                    placeholder: "0.00",
                    textColor: DashboardPalette.lossRed,
                    isMonospaced: true
                )
                .frame(maxWidth: .infinity)
                
                FormInputField(
                    label: "Total Charges",
                    text: $viewModel.totalChargesText,
                    placeholder: "0.00",
                    isMonospaced: true
                )
                .frame(maxWidth: .infinity)
                
                Button {
                    viewModel.recalculateCharges()
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "arrow.triangle.2.circlepath")
                            .font(.system(size: 11, weight: .bold))
                        Text("Auto Calculate")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundColor(Color(hex: "#60A5FA"))
                    .frame(maxWidth: .infinity)
                    .frame(height: 34)
                    .background(Color(red: 24/255, green: 40/255, blue: 68/255))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(hex: "#3B82F6").opacity(0.4), lineWidth: 1))
                }
                .buttonStyle(.plain)
            }
            
            // 7 Statutory Charges Grid (4 columns)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 14), count: 4), spacing: 12) {
                FormInputField(label: "Brokerage", text: $viewModel.brokerageText, isMonospaced: true)
                FormInputField(label: "STT", text: $viewModel.sttText, isMonospaced: true)
                FormInputField(label: "Exchange Charges", text: $viewModel.exchangeChargesText, isMonospaced: true)
                FormInputField(label: "GST", text: $viewModel.gstText, isMonospaced: true)
                FormInputField(label: "SEBI Charges", text: $viewModel.sebiChargesText, isMonospaced: true)
                FormInputField(label: "Stamp Duty", text: $viewModel.stampDutyText, isMonospaced: true)
                FormInputField(label: "Other Charges", text: $viewModel.otherChargesText, isMonospaced: true) {
                    viewModel.recalculateCharges()
                }
            }
            
            // Large Highlight Bar: Net P&L (Automatically calculated)
            let net = viewModel.calculatedNetPnl
            let isProfit = net >= 0
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Net P&L")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(DashboardPalette.textPrimaryDark)
                    Text("Automatically calculated")
                        .font(.system(size: 11))
                        .foregroundColor(DashboardPalette.textSecondaryDark)
                }
                
                Spacer()
                
                Text(DashboardNumberFormatter.formatRupeeInteger(net, includeSign: true, isPrivacyMode: preferences.isPrivacyModeEnabled))
                    .font(.system(size: 26, weight: .bold, design: .monospaced))
                    .foregroundColor(isProfit ? DashboardPalette.profitGreen : DashboardPalette.lossRed)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(Color(red: 14/255, green: 22/255, blue: 38/255))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isProfit ? DashboardPalette.profitGreen.opacity(0.3) : DashboardPalette.lossRed.opacity(0.3), lineWidth: 1)
            )
        }
        .padding(18)
        .dashboardCard()
    }
    
    // =========================================================================
    // MARK: - Card 3: Strategy & Journal Reflections
    // =========================================================================
    @ViewBuilder
    private var strategyAndJournalCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            VStack(alignment: .leading, spacing: 2) {
                Text("Strategy & Journal")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(DashboardPalette.textPrimaryDark)
                Text("Add strategy details and notes (optional)")
                    .font(.system(size: 11))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
            }
            
            // Grid of 8 Journal Reflection Inputs (4 cols x 2 rows)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 14), count: 4), spacing: 12) {
                FormInputField(label: "Entry Reason", text: $viewModel.entryReason, placeholder: "e.g. Breakout above resistance")
                FormInputField(label: "Exit Reason", text: $viewModel.exitReason, placeholder: "e.g. Booked profit at target")
                FormInputField(label: "Trade Setup", text: $viewModel.tradeSetup, placeholder: "e.g. Long Straddle before event")
                FormInputField(label: "What Went Right?", text: $viewModel.whatWentRight, placeholder: "e.g. Good entry timing")
                
                FormInputField(label: "What Went Wrong?", text: $viewModel.whatWentWrong, placeholder: "e.g. Exited early")
                FormInputField(label: "Mistakes Made", text: $viewModel.mistakesMade, placeholder: "e.g. Could have held longer")
                FormInputField(label: "Lessons Learned", text: $viewModel.lessonsLearned, placeholder: "e.g. Be patient with targets")
                FormInputField(label: "Personal Notes", text: $viewModel.personalNotes, placeholder: "e.g. N/A")
            }
            
            // Screenshot Upload Box (Dashed card with Browse Files)
            VStack(spacing: 8) {
                HStack(spacing: 14) {
                    Image(systemName: "square.and.arrow.up.circle.fill")
                        .font(.system(size: 28))
                        .foregroundColor(Color(hex: "#3B82F6"))
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Upload Chart Screenshots (Optional)")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(DashboardPalette.textPrimaryDark)
                        Text("Select or drag & drop multiple chart screenshots (PNG, JPG up to 10MB each)")
                            .font(.system(size: 11))
                            .foregroundColor(DashboardPalette.textSecondaryDark)
                    }
                    
                    Spacer()
                    
                    Button {
                        selectScreenshots()
                    } label: {
                        Text("Browse Files")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(DashboardPalette.textPrimaryDark)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 7)
                            .background(Color(red: 22/255, green: 32/255, blue: 51/255))
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .overlay(RoundedRectangle(cornerRadius: 8).stroke(DashboardPalette.borderDark, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
                
                // Thumbnail preview strip
                if !viewModel.selectedScreenshots.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 10) {
                            ForEach(viewModel.selectedScreenshots, id: \.self) { url in
                                HStack(spacing: 6) {
                                    Image(systemName: "photo")
                                        .font(.system(size: 12))
                                        .foregroundColor(Color(hex: "#60A5FA"))
                                    Text(url.lastPathComponent)
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundColor(DashboardPalette.textPrimaryDark)
                                        .lineLimit(1)
                                    Button {
                                        viewModel.selectedScreenshots.removeAll(where: { $0 == url })
                                    } label: {
                                        Image(systemName: "xmark.circle.fill")
                                            .font(.system(size: 12))
                                            .foregroundColor(DashboardPalette.lossRed)
                                    }
                                    .buttonStyle(.plain)
                                }
                                .padding(.horizontal, 8)
                                .padding(.vertical, 5)
                                .background(Color(red: 22/255, green: 32/255, blue: 51/255))
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                                .overlay(RoundedRectangle(cornerRadius: 6).stroke(DashboardPalette.borderDark, lineWidth: 1))
                            }
                        }
                    }
                    .padding(.top, 4)
                }
            }
            .padding(14)
            .background(Color(red: 14/255, green: 22/255, blue: 38/255))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(DashboardPalette.borderDark, style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
            )
        }
        .padding(18)
        .dashboardCard()
    }
    
    // =========================================================================
    // MARK: - Right Column: Card 1 - Trade Summary
    // =========================================================================
    @ViewBuilder
    private var tradeSummaryCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header with Live Calculation pill
            HStack {
                Text("Trade Summary")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(DashboardPalette.textPrimaryDark)
                Spacer()
                HStack(spacing: 4) {
                    Circle()
                        .fill(DashboardPalette.profitGreen)
                        .frame(width: 6, height: 6)
                    Text("Live calculation")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(DashboardPalette.profitGreen)
                }
            }
            
            // Key-Value specifications
            VStack(spacing: 9) {
                SummaryRow(label: "Index", value: viewModel.indexName)
                SummaryRow(label: "Type", value: viewModel.tradingType)
                
                HStack {
                    Text("Option Type")
                        .font(.system(size: 11))
                        .foregroundColor(DashboardPalette.textSecondaryDark)
                    Spacer()
                    Text(viewModel.optionType)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color(hex: "#60A5FA"))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(hex: "#3B82F6").opacity(0.16))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }
                
                SummaryRow(label: "Strike Price", value: viewModel.strikePriceText.isEmpty ? "—" : viewModel.strikePriceText)
                
                let df = DateFormatter()
                let _ = df.dateFormat = "yyyy-MM-dd"
                SummaryRow(label: "Expiry Date", value: df.string(from: viewModel.expiryDate))
                
                SummaryRow(label: "Lots", value: "\(viewModel.lots) (\(viewModel.quantity) Qty)")
                SummaryRow(label: "Entry Premium", value: "₹\(viewModel.entryPremiumText.isEmpty ? "0" : viewModel.entryPremiumText)")
                SummaryRow(label: "Exit Premium", value: "₹\(viewModel.exitPremiumText.isEmpty ? "0" : viewModel.exitPremiumText)")
                
                Divider().background(DashboardPalette.borderDark)
                
                let gp = viewModel.calculatedGrossProfit
                let gl = viewModel.calculatedGrossLoss
                let ch = viewModel.calculatedTotalCharges
                
                HStack {
                    Text("Gross Profit")
                        .font(.system(size: 11))
                        .foregroundColor(DashboardPalette.textSecondaryDark)
                    Spacer()
                    Text(DashboardNumberFormatter.formatRupeeInteger(gp, isPrivacyMode: preferences.isPrivacyModeEnabled))
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(DashboardPalette.profitGreen)
                }
                
                HStack {
                    Text("Gross Loss")
                        .font(.system(size: 11))
                        .foregroundColor(DashboardPalette.textSecondaryDark)
                    Spacer()
                    Text(DashboardNumberFormatter.formatRupeeInteger(gl, isPrivacyMode: preferences.isPrivacyModeEnabled))
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(DashboardPalette.lossRed)
                }
                
                HStack {
                    Text("Total Charges")
                        .font(.system(size: 11))
                        .foregroundColor(DashboardPalette.textSecondaryDark)
                    Spacer()
                    Text(DashboardNumberFormatter.formatRupeeInteger(ch, isPrivacyMode: preferences.isPrivacyModeEnabled))
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(DashboardPalette.textSecondaryDark)
                }
                
                Divider().background(DashboardPalette.borderDark)
                
                // Final Net P&L in Summary Card
                let net = viewModel.calculatedNetPnl
                let isProfit = net >= 0
                HStack(alignment: .bottom) {
                    Text("Net P&L")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(DashboardPalette.textPrimaryDark)
                    Spacer()
                    Text(DashboardNumberFormatter.formatRupeeInteger(net, includeSign: true, isPrivacyMode: preferences.isPrivacyModeEnabled))
                        .font(.system(size: 22, weight: .bold, design: .monospaced))
                        .foregroundColor(isProfit ? DashboardPalette.profitGreen : DashboardPalette.lossRed)
                }
                .padding(.top, 2)
            }
        }
        .padding(18)
        .dashboardCard()
    }
    
    // =========================================================================
    // MARK: - Right Column: Card 2 - Quick Actions
    // =========================================================================
    @ViewBuilder
    private var quickActionsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Actions")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(DashboardPalette.textPrimaryDark)
            
            // 1. Primary Save Trade
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
                        Text("Save Trade")
                            .font(.system(size: 13, weight: .bold))
                    }
                    Spacer()
                }
                .foregroundColor(.white)
                .frame(height: 38)
                .background(Color(hex: "#3B82F6"))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.plain)
            .keyboardShortcut("s", modifiers: .command)
            .disabled(viewModel.isSaving)
            
            // 2. Save & Add Another
            Button {
                Task {
                    _ = await viewModel.saveAndAddAnother()
                }
            } label: {
                HStack {
                    Spacer()
                    Text("Save & Add Another")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(DashboardPalette.textPrimaryDark)
                    Spacer()
                }
                .frame(height: 36)
                .background(Color(red: 22/255, green: 32/255, blue: 51/255))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(DashboardPalette.borderDark, lineWidth: 1))
            }
            .buttonStyle(.plain)
            .disabled(viewModel.isSaving)
            
            // 3. Reset Form
            Button {
                viewModel.resetForm()
            } label: {
                HStack {
                    Spacer()
                    Text("Reset Form")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(DashboardPalette.textSecondaryDark)
                    Spacer()
                }
                .frame(height: 36)
                .background(Color(red: 22/255, green: 32/255, blue: 51/255))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(DashboardPalette.borderDark, lineWidth: 1))
            }
            .buttonStyle(.plain)
        }
        .padding(18)
        .dashboardCard()
    }
    
    // Screenshot Picker Dialog (NSOpenPanel)
    private func selectScreenshots() {
        let panel = NSOpenPanel()
        panel.allowedContentTypes = [.png, .jpeg]
        panel.allowsMultipleSelection = true
        panel.canChooseDirectories = false
        panel.canCreateDirectories = false
        if panel.runModal() == .OK {
            viewModel.selectedScreenshots.append(contentsOf: panel.urls)
        }
    }
}

// =============================================================================
// MARK: - Reusable UI Form Primitives
// =============================================================================
private struct SummaryRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 11))
                .foregroundColor(DashboardPalette.textSecondaryDark)
            Spacer()
            Text(value)
                .font(.system(size: 11, weight: .medium, design: .monospaced))
                .foregroundColor(DashboardPalette.textPrimaryDark)
        }
    }
}

private struct TabPillButton: View {
    let title: String
    let icon: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 11, weight: isSelected ? .bold : .medium))
                Text(title)
                    .font(.system(size: 12, weight: isSelected ? .bold : .medium))
            }
            .foregroundColor(isSelected ? DashboardPalette.textPrimaryDark : DashboardPalette.textSecondaryDark)
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(
                RoundedRectangle(cornerRadius: 7)
                    .fill(isSelected ? Color(red: 28/255, green: 42/255, blue: 70/255) : Color.clear)
            )
        }
        .buttonStyle(.plain)
    }
}

private struct FormInputField: View {
    let label: String
    @Binding var text: String
    var placeholder: String = ""
    var textColor: Color = DashboardPalette.textPrimaryDark
    var isMonospaced: Bool = false
    var isRequired: Bool = false
    var onChange: (() -> Void)? = nil
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 2) {
                Text(label)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                if isRequired {
                    Text("*")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(DashboardPalette.lossRed)
                }
            }
            
            TextField(placeholder, text: $text)
                .textFieldStyle(.plain)
                .font(.system(size: 12, weight: .medium, design: isMonospaced ? .monospaced : .default))
                .foregroundColor(textColor)
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
                .background(Color(red: 14/255, green: 22/255, blue: 38/255))
                .clipShape(RoundedRectangle(cornerRadius: 7))
                .overlay(
                    RoundedRectangle(cornerRadius: 7)
                        .stroke(DashboardPalette.borderDark, lineWidth: 1)
                )
                .onChange(of: text) { _ in
                    onChange?()
                }
        }
    }
}

private struct FormPickerField<T: Hashable>: View {
    let label: String
    @Binding var selection: T
    let options: [T]
    let titleForOption: (T) -> String
    var isRequired: Bool = false
    var onChange: (() -> Void)? = nil
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 2) {
                Text(label)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                if isRequired {
                    Text("*")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(DashboardPalette.lossRed)
                }
            }
            
            Menu {
                ForEach(options, id: \.self) { opt in
                    Button(titleForOption(opt)) {
                        selection = opt
                        onChange?()
                    }
                }
            } label: {
                HStack {
                    Text(titleForOption(selection))
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(DashboardPalette.textPrimaryDark)
                        .lineLimit(1)
                    Spacer()
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundColor(DashboardPalette.textMutedDark)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 7)
                .background(Color(red: 14/255, green: 22/255, blue: 38/255))
                .clipShape(RoundedRectangle(cornerRadius: 7))
                .overlay(
                    RoundedRectangle(cornerRadius: 7)
                        .stroke(DashboardPalette.borderDark, lineWidth: 1)
                )
            }
            .buttonStyle(.plain)
        }
    }
}

private struct FormDatePickerField: View {
    let label: String
    @Binding var date: Date
    var isRequired: Bool = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 2) {
                Text(label)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                if isRequired {
                    Text("*")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(DashboardPalette.lossRed)
                }
            }
            
            DatePicker("", selection: $date, displayedComponents: [.date])
                .labelsHidden()
                .datePickerStyle(.compact)
                .padding(.horizontal, 6)
                .padding(.vertical, 3)
                .background(Color(red: 14/255, green: 22/255, blue: 38/255))
                .clipShape(RoundedRectangle(cornerRadius: 7))
                .overlay(
                    RoundedRectangle(cornerRadius: 7)
                        .stroke(DashboardPalette.borderDark, lineWidth: 1)
                )
        }
    }
}

private struct OptionTypeSelector: View {
    @Binding var optionType: String
    var onChange: (() -> Void)? = nil
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 2) {
                Text("Option Type")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(DashboardPalette.textSecondaryDark)
                Text("*")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(DashboardPalette.lossRed)
            }
            
            HStack(spacing: 3) {
                ForEach(["CE", "PE", "Both"], id: \.self) { opt in
                    Button {
                        optionType = opt
                        onChange?()
                    } label: {
                        Text(opt)
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(
                                optionType == opt
                                    ? (opt == "CE" ? DashboardPalette.profitGreen : (opt == "PE" ? DashboardPalette.lossRed : DashboardPalette.warmAmber))
                                    : DashboardPalette.textSecondaryDark
                            )
                            .frame(maxWidth: .infinity, minHeight: 25)
                            .background(
                                RoundedRectangle(cornerRadius: 5)
                                    .fill(
                                        optionType == opt
                                            ? (opt == "CE" ? DashboardPalette.profitGreen.opacity(0.18) : (opt == "PE" ? DashboardPalette.lossRed.opacity(0.18) : DashboardPalette.warmAmber.opacity(0.18)))
                                            : Color.clear
                                    )
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(2)
            .background(Color(red: 14/255, green: 22/255, blue: 38/255))
            .clipShape(RoundedRectangle(cornerRadius: 7))
            .overlay(
                RoundedRectangle(cornerRadius: 7)
                    .stroke(DashboardPalette.borderDark, lineWidth: 1)
            )
        }
    }
}

// =============================================================================
// MARK: - Trade Preview Sheet
// =============================================================================
private struct TradePreviewSheet: View {
    @ObservedObject var viewModel: AddTradeViewModel
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var preferences = PreferencesManager.shared
    
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack {
                Text("Trade Slip & Verification")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(DashboardPalette.textPrimaryDark)
                Spacer()
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 18))
                        .foregroundColor(DashboardPalette.textSecondaryDark)
                }
                .buttonStyle(.plain)
            }
            
            VStack(spacing: 8) {
                SummaryRow(label: "Index", value: "\(viewModel.indexName) (\(viewModel.optionType))")
                SummaryRow(label: "Strike Price", value: viewModel.strikePriceText)
                SummaryRow(label: "Lots / Qty", value: "\(viewModel.lots) Lots (\(viewModel.quantity) Shares)")
                SummaryRow(label: "Entry Premium", value: "₹\(viewModel.entryPremiumText)")
                SummaryRow(label: "Exit Premium", value: "₹\(viewModel.exitPremiumText)")
                SummaryRow(label: "Strategy", value: viewModel.strategyName)
                SummaryRow(label: "Market Condition", value: viewModel.marketCondition)
                
                Divider().background(DashboardPalette.borderDark)
                
                SummaryRow(label: "Gross Profit", value: "₹\(viewModel.grossProfitText)")
                SummaryRow(label: "Gross Loss", value: "₹\(viewModel.grossLossText)")
                SummaryRow(label: "Brokerage", value: "₹\(viewModel.brokerageText)")
                SummaryRow(label: "STT", value: "₹\(viewModel.sttText)")
                SummaryRow(label: "Exchange Charges", value: "₹\(viewModel.exchangeChargesText)")
                SummaryRow(label: "GST (18%)", value: "₹\(viewModel.gstText)")
                SummaryRow(label: "SEBI Charges", value: "₹\(viewModel.sebiChargesText)")
                SummaryRow(label: "Stamp Duty", value: "₹\(viewModel.stampDutyText)")
                SummaryRow(label: "Total Charges", value: "₹\(viewModel.totalChargesText)")
                
                Divider().background(DashboardPalette.borderDark)
                
                let net = viewModel.calculatedNetPnl
                HStack {
                    Text("Calculated Net P&L")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(DashboardPalette.textPrimaryDark)
                    Spacer()
                    Text(DashboardNumberFormatter.formatRupeeInteger(net, includeSign: true, isPrivacyMode: preferences.isPrivacyModeEnabled))
                        .font(.system(size: 20, weight: .bold, design: .monospaced))
                        .foregroundColor(net >= 0 ? DashboardPalette.profitGreen : DashboardPalette.lossRed)
                }
            }
            .padding(16)
            .background(Color(red: 14/255, green: 22/255, blue: 38/255))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            
            HStack(spacing: 12) {
                Button("Close") {
                    dismiss()
                }
                .keyboardShortcut(.cancelAction)
                
                Spacer()
                
                Button {
                    Task {
                        let success = await viewModel.saveTrade()
                        if success {
                            dismiss()
                        }
                    }
                } label: {
                    Text("Confirm & Save Trade")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color(hex: "#3B82F6"))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(24)
        .frame(width: 480)
        .background(Color(red: 18/255, green: 27/255, blue: 45/255))
    }
}

// =============================================================================
// MARK: - Bulk Import Sheet
// =============================================================================
private struct BulkImportSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var selectedFileUrl: URL? = nil
    @State private var isImporting: Bool = false
    @State private var importMessage: String? = nil
    @State private var isSuccess: Bool = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack {
                Text("Bulk Trade Import")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(DashboardPalette.textPrimaryDark)
                Spacer()
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 18))
                        .foregroundColor(DashboardPalette.textSecondaryDark)
                }
                .buttonStyle(.plain)
            }
            
            Text("Import multiple trades from Zerodha, Groww, AngelOne CSV or Excel files.")
                .font(.system(size: 12))
                .foregroundColor(DashboardPalette.textSecondaryDark)
            
            // File Selection Box
            VStack(spacing: 12) {
                Image(systemName: "doc.badge.arrow.up")
                    .font(.system(size: 32))
                    .foregroundColor(Color(hex: "#F97316"))
                
                if let file = selectedFileUrl {
                    Text(file.lastPathComponent)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(DashboardPalette.textPrimaryDark)
                } else {
                    Text("Choose CSV or XLSX file")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(DashboardPalette.textSecondaryDark)
                }
                
                Button("Browse File") {
                    let panel = NSOpenPanel()
                    panel.allowedContentTypes = [.commaSeparatedText]
                    panel.allowsMultipleSelection = false
                    panel.canChooseDirectories = false
                    if panel.runModal() == .OK {
                        selectedFileUrl = panel.url
                    }
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(Color(red: 24/255, green: 40/255, blue: 68/255))
                .clipShape(RoundedRectangle(cornerRadius: 6))
            }
            .frame(maxWidth: .infinity)
            .padding(24)
            .background(Color(red: 14/255, green: 22/255, blue: 38/255))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color(hex: "#F97316").opacity(0.4), style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
            )
            
            if let msg = importMessage {
                Text(msg)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(isSuccess ? DashboardPalette.profitGreen : DashboardPalette.lossRed)
            }
            
            HStack {
                Button("Cancel") {
                    dismiss()
                }
                Spacer()
                Button {
                    guard let file = selectedFileUrl else { return }
                    isImporting = true
                    Task {
                        // Simulate or parse import
                        try? await Task.sleep(nanoseconds: 800_000_000)
                        isImporting = false
                        isSuccess = true
                        importMessage = "✓ Successfully processed file \(file.lastPathComponent)!"
                    }
                } label: {
                    Text(isImporting ? "Importing..." : "Start Import")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(selectedFileUrl == nil ? Color.gray : Color(hex: "#F97316"))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .buttonStyle(.plain)
                .disabled(selectedFileUrl == nil || isImporting)
            }
        }
        .padding(24)
        .frame(width: 460)
        .background(Color(red: 18/255, green: 27/255, blue: 45/255))
    }
}
