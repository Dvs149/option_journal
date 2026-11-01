import SwiftUI
import Charts

public struct CapitalManagementView: View {
    @Environment(\.colorScheme) private var colorScheme
    @StateObject private var viewModel = CapitalManagementViewModel()
    
    public init() {}
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header
            headerView
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            // Content
            if viewModel.isLoading && viewModel.capitalData == nil {
                VStack {
                    Spacer()
                    ProgressView("Loading capital ledger...")
                        .font(.system(size: 13))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage, viewModel.capitalData == nil {
                VStack(spacing: 12) {
                    Spacer()
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 32))
                        .foregroundColor(KiteTheme.lossRed)
                    Text("Failed to load capital data")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    Text(error)
                        .font(.system(size: 12))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Button("Try Again") {
                        Task { await viewModel.loadData() }
                    }
                    .buttonStyle(KiteSecondaryButtonStyle())
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let data = viewModel.capitalData {
                ScrollView {
                    VStack(spacing: 16) {
                        // Summary Cards Row
                        summaryRow(data)
                        
                        // Capital Growth Chart
                        if let chartPoints = data.growthChart, !chartPoints.isEmpty {
                            growthChartCard(chartPoints, initialCap: data.initialCapital ?? 0)
                        }
                        
                        // Transactions Table Section
                        transactionsSection(data.transactions ?? [])
                    }
                    .padding(20)
                }
            }
        }
        .background(KiteTheme.canvas(for: colorScheme))
        .sheet(isPresented: $viewModel.showAddTransactionSheet) {
            AddTransactionSheet(viewModel: viewModel)
        }
        .task {
            await viewModel.loadData()
        }
    }
    
    // MARK: - Header
    private var headerView: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Capital Management")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                Text("Account balance, capital deposits, withdrawals, and ROI tracking")
                    .font(.system(size: 12))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
            
            Spacer()
            
            Button("Record Transaction") {
                viewModel.openAddTransactionSheet()
            }
            .buttonStyle(KitePrimaryButtonStyle())
            
            Button(action: {
                Task { await viewModel.loadData() }
            }) {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
            .buttonStyle(PlainButtonStyle())
            .padding(6)
            .background(KiteTheme.surface(for: colorScheme))
            .overlay(
                RoundedRectangle(cornerRadius: 4)
                    .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
            )
            .help("Refresh Capital Data")
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
    }
    
    // MARK: - Summary Row
    private func summaryRow(_ data: CapitalResponse) -> some View {
        HStack(spacing: 12) {
            let currentCap = data.currentCapital ?? 0.0
            let totalProfit = data.totalProfit ?? 0.0
            let roi = data.overallRoi ?? 0.0
            
            statCard(
                title: "Current Capital Balance",
                value: formatCurrency(currentCap),
                valueColor: KiteTheme.brandBlue,
                subtitle: "Initial: \(formatCurrency(data.initialCapital ?? 0))",
                icon: "wallet.pass"
            )
            
            statCard(
                title: "Total Realized Profit",
                value: formatCurrency(totalProfit),
                valueColor: totalProfit >= 0 ? KiteTheme.profitGreen : KiteTheme.lossRed,
                subtitle: "Cumulative trading P&L",
                icon: totalProfit >= 0 ? "arrow.up.right" : "arrow.down.right"
            )
            
            statCard(
                title: "Overall ROI",
                value: String(format: "%+.2f%%", roi),
                valueColor: roi >= 0 ? KiteTheme.profitGreen : KiteTheme.lossRed,
                subtitle: "Return on invested capital",
                icon: "percent"
            )
            
            statCard(
                title: "Net Capital Inflow",
                value: formatCurrency(data.netCapitalInflow ?? 0),
                valueColor: KiteTheme.textPrimary(for: colorScheme),
                subtitle: "Deposits - Withdrawals",
                icon: "arrow.left.arrow.right"
            )
        }
    }
    
    private func statCard(title: String, value: String, valueColor: Color, subtitle: String, icon: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(title.uppercased())
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                Spacer()
                Image(systemName: icon)
                    .font(.system(size: 11))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
            
            Text(value)
                .font(.system(size: 16, weight: .bold, design: .monospaced))
                .foregroundColor(valueColor)
            
            Text(subtitle)
                .font(.system(size: 11))
                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(KiteTheme.surface(for: colorScheme))
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
        )
    }
    
    // MARK: - Growth Chart Card
    private func growthChartCard(_ points: [CapitalGrowthPoint], initialCap: Double) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Capital Growth Trajectory")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    Text("Total portfolio value progression over time")
                        .font(.system(size: 11))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                }
                Spacer()
            }
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            Chart {
                ForEach(points) { pt in
                    AreaMark(
                        x: .value("Date", pt.displayDate ?? pt.date),
                        y: .value("Capital", pt.capital ?? 0)
                    )
                    .foregroundStyle(
                        LinearGradient(
                            colors: [
                                KiteTheme.brandBlue.opacity(0.25),
                                KiteTheme.brandBlue.opacity(0.0)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    
                    LineMark(
                        x: .value("Date", pt.displayDate ?? pt.date),
                        y: .value("Capital", pt.capital ?? 0)
                    )
                    .foregroundStyle(KiteTheme.brandBlue)
                    .lineStyle(StrokeStyle(lineWidth: 2))
                }
                
                RuleMark(y: .value("Initial Capital", initialCap))
                    .foregroundStyle(KiteTheme.border(for: colorScheme))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [4, 4]))
            }
            .chartXAxis {
                AxisMarks(values: .automatic(desiredCount: 6)) { value in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [2, 2]))
                        .foregroundStyle(KiteTheme.border(for: colorScheme))
                    AxisValueLabel()
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundStyle(KiteTheme.textSecondary(for: colorScheme))
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading, values: .automatic(desiredCount: 5)) { value in
                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5, dash: [2, 2]))
                        .foregroundStyle(KiteTheme.border(for: colorScheme))
                    AxisValueLabel {
                        if let dbl = value.as(Double.self) {
                            Text(formatCompactCurrency(dbl))
                                .font(.system(size: 10, design: .monospaced))
                                .foregroundStyle(KiteTheme.textSecondary(for: colorScheme))
                        }
                    }
                }
            }
            .frame(height: 220)
        }
        .padding(16)
        .background(KiteTheme.surface(for: colorScheme))
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
        )
    }
    
    // MARK: - Transactions Section
    private func transactionsSection(_ txs: [CapitalTransaction]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("TRANSACTION HISTORY")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            
            if txs.isEmpty {
                VStack(spacing: 8) {
                    Text("No capital deposits or withdrawals recorded yet.")
                        .font(.system(size: 12))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                }
                .padding(20)
                .frame(maxWidth: .infinity)
                .background(KiteTheme.surface(for: colorScheme))
                .cornerRadius(6)
            } else {
                VStack(spacing: 8) {
                    ForEach(txs) { tx in
                        transactionRow(tx)
                    }
                }
            }
        }
    }
    
    private func transactionRow(_ tx: CapitalTransaction) -> some View {
        HStack(spacing: 12) {
            // Type Badge
            Text(tx.transactionType.uppercased())
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(tx.isDeposit ? KiteTheme.profitGreen : KiteTheme.brandOrange)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(
                    (tx.isDeposit ? KiteTheme.profitGreen : KiteTheme.brandOrange).opacity(0.12)
                )
                .cornerRadius(4)
                .frame(width: 90, alignment: .leading)
            
            // Date
            Text(tx.transactionDate)
                .font(.system(size: 12, design: .monospaced))
                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                .frame(width: 100, alignment: .leading)
            
            // Notes
            Text(tx.notes ?? "-")
                .font(.system(size: 12))
                .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                .lineLimit(1)
            
            Spacer()
            
            // Amount
            let amt = tx.amount ?? 0.0
            Text("\(tx.isDeposit ? "+" : "-")\(formatCurrency(amt))")
                .font(.system(size: 13, weight: .bold, design: .monospaced))
                .foregroundColor(tx.isDeposit ? KiteTheme.profitGreen : KiteTheme.brandOrange)
                .frame(width: 120, alignment: .trailing)
            
            // Delete button
            Button(action: {
                Task { await viewModel.deleteTransaction(tx.id) }
            }) {
                Image(systemName: "trash")
                    .font(.system(size: 11))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
            .buttonStyle(PlainButtonStyle())
            .padding(4)
            .help("Delete Transaction")
        }
        .padding(10)
        .background(KiteTheme.surface(for: colorScheme))
        .cornerRadius(4)
        .overlay(
            RoundedRectangle(cornerRadius: 4)
                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
        )
    }
    
    // MARK: - Helpers
    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "₹"
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: value)) ?? "₹\(value)"
    }
    
    private func formatCompactCurrency(_ value: Double) -> String {
        if abs(value) >= 100000 {
            return String(format: "₹%.1fL", value / 100000)
        } else if abs(value) >= 1000 {
            return String(format: "₹%.1fk", value / 1000)
        }
        return String(format: "₹%.0f", value)
    }
}

// MARK: - Add Transaction Sheet
public struct AddTransactionSheet: View {
    @ObservedObject var viewModel: CapitalManagementViewModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Record Capital Transaction")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    Text("Log a cash deposit or capital withdrawal")
                        .font(.system(size: 12))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                }
                
                Spacer()
                
                Button(action: { dismiss() }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                        .frame(width: 24, height: 24)
                        .background(KiteTheme.surface(for: colorScheme))
                        .cornerRadius(12)
                }
                .buttonStyle(PlainButtonStyle())
            }
            .padding(16)
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            VStack(spacing: 16) {
                // Transaction Type
                VStack(alignment: .leading, spacing: 4) {
                    Text("Transaction Type")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    
                    Picker("Type", selection: $viewModel.transactionType) {
                        Text("Deposit (+ Capital)").tag("deposit")
                        Text("Withdrawal (- Capital)").tag("withdrawal")
                    }
                    .pickerStyle(.segmented)
                }
                
                // Amount
                VStack(alignment: .leading, spacing: 4) {
                    Text("Amount (₹)")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    
                    TextField("e.g. 50000", text: $viewModel.transactionAmount)
                        .textFieldStyle(PlainTextFieldStyle())
                        .font(.system(size: 13, design: .monospaced))
                        .padding(8)
                        .background(KiteTheme.surface(for: colorScheme))
                        .overlay(
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
                        )
                }
                
                // Date
                VStack(alignment: .leading, spacing: 4) {
                    Text("Transaction Date")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    
                    DatePicker("", selection: $viewModel.transactionDate, displayedComponents: .date)
                        .labelsHidden()
                }
                
                // Notes
                VStack(alignment: .leading, spacing: 4) {
                    Text("Notes / Reference (Optional)")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    
                    TextField("e.g. Added funds via UPI / Bank transfer", text: $viewModel.transactionNotes)
                        .textFieldStyle(PlainTextFieldStyle())
                        .font(.system(size: 12))
                        .padding(8)
                        .background(KiteTheme.surface(for: colorScheme))
                        .overlay(
                            RoundedRectangle(cornerRadius: 4)
                                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
                        )
                }
                
                if let err = viewModel.errorMessage {
                    Text(err)
                        .font(.system(size: 11))
                        .foregroundColor(KiteTheme.lossRed)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(16)
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            // Footer
            HStack {
                Spacer()
                Button("Cancel") { dismiss() }
                    .buttonStyle(KiteSecondaryButtonStyle())
                
                Button(action: {
                    Task {
                        _ = await viewModel.addTransaction()
                    }
                }) {
                    if viewModel.isSaving {
                        ProgressView()
                            .scaleEffect(0.7)
                            .frame(width: 120)
                    } else {
                        Text("Record Entry")
                            .frame(width: 120)
                    }
                }
                .buttonStyle(KitePrimaryButtonStyle())
                .disabled(viewModel.isSaving)
            }
            .padding(16)
        }
        .frame(width: 440)
        .background(KiteTheme.canvas(for: colorScheme))
    }
}
