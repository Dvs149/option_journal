import SwiftUI
import Charts

public struct CapitalManagementView: View {
    @StateObject private var viewModel = CapitalManagementViewModel()
    @ObservedObject private var preferences = PreferencesManager.shared
    @Environment(\.colorScheme) private var colorScheme
    
    public init() {}
    
    public var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(alignment: .leading, spacing: 20) {
                // MARK: - Header
                headerSection
                
                // MARK: - Top 7 Metric Cards
                topMetricsSection
                
                // MARK: - Row 1: Capital Growth + Capital Allocation
                HStack(alignment: .top, spacing: 16) {
                    capitalGrowthCard
                        .frame(minWidth: 480, maxWidth: .infinity)
                    
                    capitalAllocationCard
                        .frame(width: 380)
                }
                .frame(maxWidth: .infinity)
                
                // MARK: - Row 2: Position Sizing Calculator + Risk-Based Table + Capital Utilization
                HStack(alignment: .top, spacing: 16) {
                    positionSizingCalculatorCard
                        .frame(minWidth: 320, maxWidth: .infinity)
                    
                    riskBasedPositionSizeCard
                        .frame(minWidth: 320, maxWidth: .infinity)
                    
                    capitalUtilizationCard
                        .frame(width: 260)
                }
                .frame(maxWidth: .infinity)
                
                // MARK: - Row 3: Deposit & Withdrawal History + Open Positions Capital
                HStack(alignment: .top, spacing: 16) {
                    depositWithdrawalHistoryCard
                        .frame(minWidth: 400, maxWidth: .infinity)
                    
                    openPositionsCapitalCard
                        .frame(minWidth: 360, maxWidth: .infinity)
                }
                .frame(maxWidth: .infinity)
                
                // MARK: - Row 4: Capital Milestones + Key Insights
                HStack(alignment: .top, spacing: 16) {
                    capitalMilestonesCard
                        .frame(minWidth: 480, maxWidth: .infinity)
                    
                    keyInsightsCard
                        .frame(width: 380)
                }
                .frame(maxWidth: .infinity)
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .background(Color(hex: "0b111e"))
        .sheet(isPresented: $viewModel.showEditCapitalModal) {
            editCapitalSheet
        }
        .task {
            await viewModel.loadData()
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Capital Management")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundColor(.white)
                Text("Manage your trading capital, deposits, withdrawals and position sizing")
                    .font(.system(size: 13))
                    .foregroundColor(Color(hex: "94a3b8"))
            }
            
            Spacer()
            
            HStack(spacing: 8) {
                HStack(spacing: 6) {
                    Image(systemName: "calendar")
                        .font(.system(size: 11))
                        .foregroundColor(Color(hex: "3b82f6"))
                    Text("All Time")
                        .font(.system(size: 12))
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color(hex: "121b2d"))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color(hex: "1e293b"), lineWidth: 1)
                )
                
                HStack(spacing: 2) {
                    ForEach(["1M", "3M", "6M", "YTD", "1Y", "All"], id: \.self) { r in
                        Button {
                            viewModel.selectedTimeRange = r
                        } label: {
                            Text(r)
                                .font(.system(size: 11, weight: viewModel.selectedTimeRange == r ? .bold : .medium))
                                .foregroundColor(viewModel.selectedTimeRange == r ? .white : Color(hex: "94a3b8"))
                                .padding(.horizontal, 7)
                                .padding(.vertical, 5)
                                .background(viewModel.selectedTimeRange == r ? Color(hex: "f97316") : Color.clear)
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(2)
                .background(Color(hex: "121b2d"))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color(hex: "1e293b"), lineWidth: 1)
                )
            }
        }
    }
    
    // MARK: - Top 7 Metric Cards
    private var topMetricsSection: some View {
        HStack(spacing: 10) {
            capitalMetricCard(title: "Initial Capital", value: DashboardNumberFormatter.formatRupeeInteger(viewModel.initialCapital, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled), sub: "Edit Capital ->", subColor: Color(hex: "3b82f6"), hasEdit: true)
            capitalMetricCard(title: "Total Deposits", value: DashboardNumberFormatter.formatRupeeInteger(viewModel.totalDeposits, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled), sub: "0 Transactions", subColor: Color(hex: "94a3b8"), hasPlus: true)
            capitalMetricCard(title: "Total Withdrawals", value: DashboardNumberFormatter.formatRupeeInteger(viewModel.totalWithdrawals, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled), sub: "1 Transactions", subColor: Color(hex: "94a3b8"), hasPlus: true)
            capitalMetricCard(title: "Current Capital", value: DashboardNumberFormatter.formatRupeeInteger(viewModel.currentCapital, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled), sub: "-48.42%", subColor: Color(hex: "f43f5e"))
            capitalMetricCard(title: "Available for Trading", value: DashboardNumberFormatter.formatRupeeInteger(viewModel.availableForTrading, includeSign: false, isPrivacyMode: preferences.isPrivacyModeEnabled), sub: "100%", subColor: Color(hex: "10b981"))
            capitalMetricCard(title: "Total Profit", value: DashboardNumberFormatter.formatRupeeInteger(viewModel.totalProfit, includeSign: true, isPrivacyMode: preferences.isPrivacyModeEnabled), sub: "-48.42%", subColor: Color(hex: "f43f5e"), valColor: Color(hex: "f43f5e"))
            capitalMetricCard(title: "ROI", value: "\(String(format: "%.2f", viewModel.roi))%", sub: "Annualized", subColor: Color(hex: "f43f5e"), valColor: Color(hex: "f43f5e"))
        }
    }
    
    private func capitalMetricCard(title: String, value: String, sub: String, subColor: Color, hasEdit: Bool = false, hasPlus: Bool = false, valColor: Color = .white) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(title).font(.system(size: 10, weight: .medium)).foregroundColor(Color(hex: "94a3b8"))
                Spacer()
                if hasEdit {
                    Image(systemName: "pencil").font(.system(size: 10)).foregroundColor(Color(hex: "64748b")).onTapGesture { viewModel.showEditCapitalModal = true }
                } else if hasPlus {
                    Image(systemName: "plus").font(.system(size: 10)).foregroundColor(Color(hex: "64748b"))
                }
            }
            Text(value)
                .font(.system(size: 16, weight: .bold, design: .monospaced))
                .foregroundColor(valColor)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            Text(sub)
                .font(.system(size: 9, weight: .semibold))
                .foregroundColor(subColor)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 1: Capital Growth Card
    private var capitalGrowthCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 8) {
                    Text("Capital Growth")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                    
                    legendDot("Capital", Color(hex: "3b82f6"))
                    legendDot("Deposits", Color(hex: "10b981"))
                    legendDot("Withdrawals", Color(hex: "f43f5e"))
                    legendDot("Net Profit", Color(hex: "a855f7"))
                }
                
                Spacer()
                
                HStack(spacing: 6) {
                    Text("This Year")
                        .font(.system(size: 10))
                        .foregroundColor(Color(hex: "94a3b8"))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(hex: "0e1524"))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                    
                    Text("₹3,12,613")
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(Color(hex: "3b82f6"))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(hex: "3b82f6").opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }
            }
            
            Chart {
                AreaMark(x: .value("Date", "Jan"), y: .value("Val", 800000))
                AreaMark(x: .value("Date", "Apr"), y: .value("Val", 720000))
                AreaMark(x: .value("Date", "Jun"), y: .value("Val", 550000))
                AreaMark(x: .value("Date", "Jul"), y: .value("Val", 398000))
                AreaMark(x: .value("Date", "Oct"), y: .value("Val", 301000))
                AreaMark(x: .value("Date", "Nov"), y: .value("Val", 312613))
            }
            .foregroundStyle(
                LinearGradient(
                    colors: [Color(hex: "3b82f6").opacity(0.4), Color(hex: "3b82f6").opacity(0.02)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .chartYAxis {
                AxisMarks(position: .leading) { val in
                    AxisGridLine().foregroundStyle(Color(hex: "1e293b"))
                    AxisValueLabel {
                        if let d = val.as(Double.self) {
                            Text("₹\(Int(d / 100000))L").font(.system(size: 8)).foregroundColor(Color(hex: "64748b"))
                        }
                    }
                }
            }
            .chartXAxis {
                AxisMarks { val in
                    AxisValueLabel {
                        if let s = val.as(String.self) {
                            Text(s).font(.system(size: 9)).foregroundColor(Color(hex: "94a3b8"))
                        }
                    }
                }
            }
            .frame(height: 180)
        }
        .padding(16)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    private func legendDot(_ label: String, _ color: Color) -> some View {
        HStack(spacing: 4) {
            Circle().fill(color).frame(width: 6, height: 6)
            Text(label).font(.system(size: 9)).foregroundColor(Color(hex: "94a3b8"))
        }
    }
    
    // MARK: - Row 1: Capital Allocation Card
    private var capitalAllocationCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Capital Allocation")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.white)
            
            ZStack {
                Circle().stroke(Color(hex: "06b6d4"), lineWidth: 16).frame(width: 100, height: 100)
                VStack(spacing: 2) {
                    Text("Total Capital").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b"))
                    Text("₹2,78,450").font(.system(size: 12, weight: .bold, design: .monospaced)).foregroundColor(.white)
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 4)
            
            VStack(spacing: 6) {
                allocRow("Available for Trading", "₹3,12,613", "100.0%", Color(hex: "06b6d4"))
                allocRow("Used in Open Positions", "₹0", "0.0%", Color(hex: "f59e0b"))
                allocRow("Cash Reserve", "₹0", "0.0%", Color(hex: "10b981"))
            }
        }
        .padding(16)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    private func allocRow(_ label: String, _ amt: String, _ pct: String, _ color: Color) -> some View {
        HStack {
            HStack(spacing: 6) {
                Circle().fill(color).frame(width: 6, height: 6)
                Text(label).font(.system(size: 11)).foregroundColor(Color(hex: "94a3b8"))
            }
            Spacer()
            Text(amt).font(.system(size: 11, design: .monospaced)).foregroundColor(.white)
            Text(pct).font(.system(size: 10, weight: .bold)).foregroundColor(color).frame(width: 45, alignment: .trailing)
        }
    }
    
    // MARK: - Row 2: Position Sizing Calculator Card
    private var positionSizingCalculatorCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Position Sizing Calculator")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            HStack(spacing: 8) {
                calcInputField("Account Capital (₹)", text: $viewModel.calcAccountCapital)
                calcInputField("Risk Per Trade (%)", text: $viewModel.calcRiskPct)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Risk Amount (₹)").font(.system(size: 10)).foregroundColor(Color(hex: "94a3b8"))
                    Text("₹\(Int(viewModel.calcRiskAmount))")
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                        .foregroundColor(Color(hex: "10b981"))
                        .padding(.vertical, 6)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            
            HStack(spacing: 8) {
                calcInputField("Stop Loss (Points/₹)", text: $viewModel.calcStopLoss)
                VStack(alignment: .leading, spacing: 4) {
                    Text("Lot Size").font(.system(size: 10)).foregroundColor(Color(hex: "94a3b8"))
                    Text("\(viewModel.calcIndex) (\(viewModel.calcLotSize))")
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundColor(.white)
                        .padding(6)
                        .background(Color(hex: "0e1524"))
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            
            HStack(spacing: 6) {
                Image(systemName: "info.circle.fill").font(.system(size: 11)).foregroundColor(Color(hex: "3b82f6"))
                Text("Risk: ₹\(Int(viewModel.calcRiskAmount)). With \(viewModel.calcStopLoss) pts SL (\(viewModel.calcIndex)), take \(String(format: "%.1f", viewModel.calcRecommendedLots)) lots (\(viewModel.calcTotalQty) Qty).")
                    .font(.system(size: 10))
                    .foregroundColor(Color(hex: "94a3b8"))
            }
            .padding(8)
            .background(Color(hex: "0e1524"))
            .clipShape(RoundedRectangle(cornerRadius: 6))
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    private func calcInputField(_ title: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.system(size: 10)).foregroundColor(Color(hex: "94a3b8"))
            TextField("", text: text)
                .textFieldStyle(.plain)
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(.white)
                .padding(6)
                .background(Color(hex: "0e1524"))
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(Color(hex: "1e293b"), lineWidth: 1)
                )
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    // MARK: - Row 2: Risk-Based Position Size Card
    private var riskBasedPositionSizeCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Risk-Based Position Size")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            HStack {
                Text("RISK %").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 45, alignment: .leading)
                Text("RISK AMT (₹)").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 75, alignment: .leading)
                Text("QTY (LOTS)").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 65, alignment: .leading)
                Spacer()
                Text("NOTES").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 80, alignment: .trailing)
            }
            .padding(.vertical, 2)
            
            Divider().background(Color(hex: "1e293b"))
            
            ForEach(viewModel.positionSizeRows) { r in
                HStack {
                    Text(r.riskPct).font(.system(size: 10, weight: .medium)).foregroundColor(.white).frame(width: 45, alignment: .leading)
                    Text("₹\(Int(r.riskAmt))").font(.system(size: 10, design: .monospaced)).foregroundColor(r.isRecommended ? Color(hex: "10b981") : Color(hex: "94a3b8")).frame(width: 75, alignment: .leading)
                    Text(r.qtyLots).font(.system(size: 10, design: .monospaced)).foregroundColor(r.isRecommended ? Color(hex: "10b981") : .white).frame(width: 65, alignment: .leading)
                    Spacer()
                    Text(r.notes)
                        .font(.system(size: 9, weight: r.isRecommended ? .bold : .regular))
                        .foregroundColor(r.isRecommended ? Color(hex: "10b981") : (r.isHighRisk ? Color(hex: "f43f5e") : Color(hex: "64748b")))
                        .frame(width: 80, alignment: .trailing)
                }
                .padding(.vertical, 2)
            }
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 2: Capital Utilization Card
    private var capitalUtilizationCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Capital Utilization")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            ZStack {
                Circle().stroke(Color(hex: "06b6d4"), lineWidth: 8).frame(width: 65, height: 65)
                VStack(spacing: 1) {
                    Text("0.0%").font(.system(size: 10, weight: .bold)).foregroundColor(.white)
                    Text("Capital Use").font(.system(size: 7)).foregroundColor(Color(hex: "64748b"))
                }
            }
            .frame(maxWidth: .infinity)
            
            VStack(spacing: 4) {
                utilRow("Used in Open Positions", "₹0")
                utilRow("Available for Trading", "₹3,12,613")
                utilRow("Total Capital", "₹3,12,613")
            }
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    private func utilRow(_ label: String, _ amt: String) -> some View {
        HStack {
            Text(label).font(.system(size: 9)).foregroundColor(Color(hex: "94a3b8"))
            Spacer()
            Text(amt).font(.system(size: 10, design: .monospaced)).foregroundColor(.white)
        }
    }
    
    // MARK: - Row 3: Deposit & Withdrawal History Card
    private var depositWithdrawalHistoryCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Deposit & Withdrawal History")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                
                Spacer()
                
                HStack(spacing: 4) {
                    Text("All").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "f97316"))
                    Text("Deposits").font(.system(size: 9)).foregroundColor(Color(hex: "94a3b8"))
                    Text("Withdrawals").font(.system(size: 9)).foregroundColor(Color(hex: "94a3b8"))
                }
                
                Button("+ Add Transaction") {
                    viewModel.showAddTransactionSheet = true
                }
                .buttonStyle(.plain)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color(hex: "3b82f6"))
                .clipShape(RoundedRectangle(cornerRadius: 4))
            }
            
            HStack {
                Text("DATE").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 80, alignment: .leading)
                Text("TYPE").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 65, alignment: .leading)
                Text("AMOUNT (₹)").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 80, alignment: .leading)
                Text("BALANCE AFTER (₹)").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 100, alignment: .leading)
                Text("NOTES").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 60, alignment: .leading)
                Spacer()
                Text("ACTIONS").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 45, alignment: .trailing)
            }
            .padding(.vertical, 2)
            
            Divider().background(Color(hex: "1e293b"))
            
            ForEach(viewModel.transactions) { tx in
                HStack {
                    Text(tx.date).font(.system(size: 10, design: .monospaced)).foregroundColor(.white).frame(width: 80, alignment: .leading)
                    Text(tx.type)
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(Color(hex: "f43f5e"))
                        .padding(.horizontal, 4)
                        .padding(.vertical, 1)
                        .background(Color(hex: "f43f5e").opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 3))
                        .frame(width: 65, alignment: .leading)
                    Text("-₹1,00,000").font(.system(size: 10, design: .monospaced)).foregroundColor(Color(hex: "f43f5e")).frame(width: 80, alignment: .leading)
                    Text("₹1,00,000").font(.system(size: 10, design: .monospaced)).foregroundColor(.white).frame(width: 100, alignment: .leading)
                    Text(tx.notes).font(.system(size: 9)).foregroundColor(Color(hex: "64748b")).frame(width: 60, alignment: .leading)
                    Spacer()
                    Image(systemName: "trash").font(.system(size: 9)).foregroundColor(Color(hex: "f43f5e")).frame(width: 45, alignment: .trailing)
                }
                .padding(.vertical, 3)
            }
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 3: Open Positions Capital Card
    private var openPositionsCapitalCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Open Positions Capital")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            HStack {
                Text("SYMBOL").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 60, alignment: .leading)
                Text("TYPE").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 50, alignment: .leading)
                Text("QTY").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 40, alignment: .leading)
                Text("AVG PRICE").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 65, alignment: .leading)
                Text("LTP").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 50, alignment: .leading)
                Spacer()
                Text("POSITION VALUE (₹)").font(.system(size: 8, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 90, alignment: .trailing)
            }
            .padding(.vertical, 2)
            
            Divider().background(Color(hex: "1e293b"))
            
            VStack {
                Spacer()
                Text("No open positions currently.")
                    .font(.system(size: 11))
                    .foregroundColor(Color(hex: "64748b"))
                Spacer()
            }
            .frame(maxWidth: .infinity, minHeight: 60)
            
            Divider().background(Color(hex: "1e293b"))
            
            HStack {
                Text("Total Used Capital").font(.system(size: 10, weight: .bold)).foregroundColor(.white)
                Spacer()
                Text("₹0").font(.system(size: 10, weight: .bold, design: .monospaced)).foregroundColor(.white)
            }
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 4: Capital Milestones Card
    private var capitalMilestonesCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "flag.fill").font(.system(size: 11)).foregroundColor(Color(hex: "3b82f6"))
                    Text("Capital Milestones").font(.system(size: 14, weight: .bold)).foregroundColor(.white)
                }
                Spacer()
                Text("₹4,87,387 to recover base")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(Color(hex: "f59e0b"))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color(hex: "f59e0b").opacity(0.15))
                    .clipShape(RoundedRectangle(cornerRadius: 4))
            }
            
            Text("Dynamic growth tracking based on ₹8,00,000 initial capital")
                .font(.system(size: 10))
                .foregroundColor(Color(hex: "94a3b8"))
            
            // Progress Track
            HStack(spacing: 0) {
                milestoneNode("₹8L", "Base Capital", "Next Target", active: true)
                milestoneLine()
                milestoneNode("₹8.8L", "+10% Growth", "Target", active: false)
                milestoneLine()
                milestoneNode("₹10L", "+25% Growth", "Target", active: false)
                milestoneLine()
                milestoneNode("₹12L", "+50% Growth", "Target", active: false)
                milestoneLine()
                milestoneNode("₹16L", "2x Double", "Target", active: false)
            }
            .padding(.vertical, 6)
            
            HStack {
                Text("Current Capital: ₹3,12,613").font(.system(size: 10, weight: .bold)).foregroundColor(.white)
                Spacer()
                Text("Remaining to ₹8L: ₹4,87,387 (100% left)").font(.system(size: 10)).foregroundColor(Color(hex: "3b82f6"))
            }
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    private func milestoneNode(_ cap: String, _ desc: String, _ tag: String, active: Bool) -> some View {
        VStack(spacing: 2) {
            Circle()
                .fill(active ? Color(hex: "3b82f6") : Color(hex: "1e293b"))
                .frame(width: 14, height: 14)
            Text(cap).font(.system(size: 9, weight: .bold)).foregroundColor(.white)
            Text(desc).font(.system(size: 7)).foregroundColor(Color(hex: "64748b"))
            Text(tag)
                .font(.system(size: 7, weight: .bold))
                .foregroundColor(active ? Color(hex: "3b82f6") : Color(hex: "64748b"))
                .padding(.horizontal, 3)
                .padding(.vertical, 1)
                .background(active ? Color(hex: "3b82f6").opacity(0.15) : Color(hex: "0e1524"))
                .clipShape(RoundedRectangle(cornerRadius: 2))
        }
    }
    
    private func milestoneLine() -> some View {
        Rectangle().fill(Color(hex: "1e293b")).frame(height: 2).frame(maxWidth: .infinity)
    }
    
    // MARK: - Row 4: Key Insights Card
    private var keyInsightsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Key Insights")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                Spacer()
                Text("Live Diagnostics")
                    .font(.system(size: 9))
                    .foregroundColor(Color(hex: "64748b"))
            }
            
            VStack(alignment: .leading, spacing: 6) {
                insightRow("chart.line.downtrend.xyaxis", "Overall capital ROI is -48.42% since inception.", Color(hex: "10b981"))
                insightRow("arrow.down.circle", "Net capital inflow: -₹1,00,000 across 1 recorded transactions.", Color(hex: "10b981"))
                insightRow("checkmark.shield.fill", "Available trading balance: ₹3,12,613 (100.0% uncommitted).", Color(hex: "3b82f6"))
                insightRow("flag.fill", "Next account milestone: ₹8L (Base Capital). Need ₹4,87,387 in net profit.", Color(hex: "f59e0b"))
                insightRow("lightbulb.fill", "Recommended risk rule: Never risk more than 1-2% of your current capital (₹4,689) on a single trade.", Color(hex: "06b6d4"))
            }
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    private func insightRow(_ icon: String, _ text: String, _ color: Color) -> some View {
        HStack(alignment: .top, spacing: 6) {
            Image(systemName: icon).font(.system(size: 10)).foregroundColor(color).frame(width: 14)
            Text(text).font(.system(size: 9)).foregroundColor(Color(hex: "94a3b8"))
        }
    }
    
    // MARK: - Edit Capital Sheet
    private var editCapitalSheet: some View {
        VStack(spacing: 16) {
            Text("Edit Initial Capital").font(.system(size: 16, weight: .bold)).foregroundColor(.white)
            TextField("Amount", text: $viewModel.newInitialCapitalInput)
                .textFieldStyle(.plain)
                .font(.system(size: 13, design: .monospaced))
                .padding(8)
                .background(Color(hex: "0e1524"))
                .clipShape(RoundedRectangle(cornerRadius: 6))
            HStack {
                Button("Cancel") { viewModel.showEditCapitalModal = false }.buttonStyle(.plain)
                Spacer()
                Button("Save") {
                    if let val = Double(viewModel.newInitialCapitalInput) {
                        viewModel.initialCapital = val
                    }
                    viewModel.showEditCapitalModal = false
                }
                .buttonStyle(.plain)
                .foregroundColor(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(Color(hex: "3b82f6"))
                .clipShape(RoundedRectangle(cornerRadius: 6))
            }
        }
        .padding(20)
        .frame(width: 320)
        .background(Color(hex: "121b2d"))
    }
}
