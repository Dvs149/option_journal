import SwiftUI

public struct RiskManagementView: View {
    @Environment(\.colorScheme) private var colorScheme
    @StateObject private var viewModel = RiskViewModel()
    
    public init() {}
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header
            headerView
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            // Content
            if viewModel.isLoading {
                VStack {
                    Spacer()
                    ProgressView("Calculating risk exposure...")
                        .font(.system(size: 13))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage, viewModel.accountLimits == nil {
                VStack(spacing: 12) {
                    Spacer()
                    Image(systemName: "exclamationmark.triangle")
                        .font(.system(size: 32))
                        .foregroundColor(KiteTheme.lossRed)
                    Text("Failed to load risk guardrails")
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
            } else {
                ScrollView {
                    VStack(spacing: 16) {
                        // Alerts Section
                        alertsSection
                        
                        // Today's Live Limits Gauges
                        limitsGaugesCard
                        
                        // Key Risk Metrics Grid
                        metricsGridSection
                    }
                    .padding(20)
                }
            }
        }
        .background(KiteTheme.canvas(for: colorScheme))
        .sheet(isPresented: $viewModel.showLimitsSheet) {
            EditLimitsSheet(viewModel: viewModel)
        }
        .task {
            await viewModel.loadData()
        }
    }
    
    // MARK: - Header
    private var headerView: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text("Risk Management")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                Text("Capital protection guardrails, drawdown monitors, and discipline alerts")
                    .font(.system(size: 12))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
            
            Spacer()
            
            Button("Configure Limits") {
                viewModel.openLimitsSheet()
            }
            .buttonStyle(KiteSecondaryButtonStyle())
            
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
            .help("Refresh Risk Status")
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
    }
    
    // MARK: - Alerts Section
    @ViewBuilder
    private var alertsSection: some View {
        if !viewModel.alerts.isEmpty {
            VStack(spacing: 8) {
                ForEach(viewModel.alerts) { alert in
                    let isDanger = alert.type == "danger"
                    let isSuccess = alert.type == "success"
                    let alertColor = isDanger ? KiteTheme.lossRed : (isSuccess ? KiteTheme.profitGreen : KiteTheme.brandOrange)
                    let alertIcon = isDanger ? "exclamationmark.octagon.fill" : (isSuccess ? "checkmark.seal.fill" : "exclamationmark.triangle.fill")
                    
                    HStack(spacing: 12) {
                        Image(systemName: alertIcon)
                            .font(.system(size: 14))
                            .foregroundColor(alertColor)
                        
                        Text(alert.message)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                        
                        Spacer()
                    }
                    .padding(12)
                    .background(alertColor.opacity(0.12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(alertColor.opacity(0.3), lineWidth: 1)
                    )
                }
            }
        } else {
            HStack(spacing: 10) {
                Image(systemName: "checkmark.shield.fill")
                    .font(.system(size: 14))
                    .foregroundColor(KiteTheme.profitGreen)
                
                Text("All Risk Guardrails Secure: Trading within safe daily loss and drawdown parameters.")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                
                Spacer()
            }
            .padding(12)
            .background(KiteTheme.profitGreen.opacity(0.08))
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .stroke(KiteTheme.profitGreen.opacity(0.2), lineWidth: 1)
            )
        }
    }
    
    // MARK: - Live Gauges Card
    private var limitsGaugesCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Active Guardrails")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    Text("Daily capital loss thresholds and target progress")
                        .font(.system(size: 11))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                }
                Spacer()
            }
            
            Divider()
                .background(KiteTheme.border(for: colorScheme))
            
            HStack(spacing: 24) {
                // Daily Max Loss Gauge
                let dailyLoss = viewModel.metrics?.dailyCurrentLoss ?? 0
                let dailyMaxLossLimit = viewModel.accountLimits?.dailyMaxLoss ?? 0
                let lossRatio = viewModel.dailyLossPercentage
                
                gaugeBlock(
                    title: "Daily Max Loss Threshold",
                    currentValue: formatCurrency(dailyLoss),
                    limitValue: formatCurrency(dailyMaxLossLimit),
                    progress: lossRatio,
                    progressColor: lossRatio >= 1.0 ? KiteTheme.lossRed : (lossRatio >= 0.8 ? KiteTheme.brandOrange : KiteTheme.brandBlue),
                    statusText: lossRatio >= 1.0 ? "LIMIT BREACHED" : "\(String(format: "%.0f%%", lossRatio * 100)) of max loss utilized"
                )
                
                // Daily Profit Target Gauge
                let dailyProfit = viewModel.metrics?.dailyCurrentProfit ?? 0
                let dailyTargetLimit = viewModel.accountLimits?.dailyProfitTarget ?? 0
                let profitRatio = viewModel.dailyProfitPercentage
                
                gaugeBlock(
                    title: "Daily Profit Target",
                    currentValue: formatCurrency(dailyProfit),
                    limitValue: formatCurrency(dailyTargetLimit),
                    progress: profitRatio,
                    progressColor: KiteTheme.profitGreen,
                    statusText: profitRatio >= 1.0 ? "TARGET ACHIEVED" : "\(String(format: "%.0f%%", profitRatio * 100)) of target reached"
                )
            }
            
            // Monthly Limits Summary
            HStack(spacing: 16) {
                HStack {
                    Text("Monthly Max Loss Limit:")
                        .font(.system(size: 11))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Text(formatCurrency(viewModel.accountLimits?.monthlyMaxLoss ?? 0))
                        .font(.system(size: 12, weight: .semibold, design: .monospaced))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                }
                
                Spacer()
                
                HStack {
                    Text("Monthly Profit Target:")
                        .font(.system(size: 11))
                        .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
                    Text(formatCurrency(viewModel.accountLimits?.monthlyProfitTarget ?? 0))
                        .font(.system(size: 12, weight: .semibold, design: .monospaced))
                        .foregroundColor(KiteTheme.profitGreen)
                }
            }
            .padding(.top, 4)
        }
        .padding(16)
        .background(KiteTheme.surface(for: colorScheme))
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
        )
    }
    
    private func gaugeBlock(
        title: String,
        currentValue: String,
        limitValue: String,
        progress: Double,
        progressColor: Color,
        statusText: String
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title.uppercased())
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            
            HStack(alignment: .firstTextBaseline) {
                Text(currentValue)
                    .font(.system(size: 18, weight: .bold, design: .monospaced))
                    .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                
                Text("/ \(limitValue)")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
            
            // Progress Bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(KiteTheme.canvas(for: colorScheme))
                        .frame(height: 8)
                    
                    RoundedRectangle(cornerRadius: 4)
                        .fill(progressColor)
                        .frame(width: geo.size.width * CGFloat(min(max(progress, 0), 1.0)), height: 8)
                }
            }
            .frame(height: 8)
            
            Text(statusText)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(progressColor)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    // MARK: - Metrics Grid Section
    private var metricsGridSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("HISTORICAL DISCIPLINE & DRAWDOWN METRICS")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            
            if let m = viewModel.metrics {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    metricCard(
                        title: "Largest Single-Day Profit",
                        value: formatCurrency(m.largestSingleDayProfit ?? 0),
                        valueColor: KiteTheme.profitGreen,
                        icon: "arrow.up.circle"
                    )
                    
                    metricCard(
                        title: "Largest Single-Day Loss",
                        value: formatCurrency(m.largestSingleDayLoss ?? 0),
                        valueColor: KiteTheme.lossRed,
                        icon: "arrow.down.circle"
                    )
                    
                    metricCard(
                        title: "Average Risk:Reward Ratio",
                        value: "1 : \(String(format: "%.2f", m.avgRiskToReward ?? 0))",
                        valueColor: KiteTheme.brandBlue,
                        icon: "scale.3d"
                    )
                    
                    metricCard(
                        title: "Max Portfolio Drawdown",
                        value: formatCurrency(m.maxDrawdown ?? 0),
                        valueColor: KiteTheme.lossRed,
                        subtitle: "\(String(format: "%.1f%%", m.maxDrawdownPct ?? 0)) from capital peak",
                        icon: "arrow.down.to.line"
                    )
                    
                    metricCard(
                        title: "Current Drawdown",
                        value: formatCurrency(m.currentDrawdown ?? 0),
                        valueColor: (m.currentDrawdown ?? 0) > 0 ? KiteTheme.lossRed : KiteTheme.profitGreen,
                        subtitle: (m.currentDrawdown ?? 0) > 0 ? "Under recovery" : "All-time peak",
                        icon: "water.waves"
                    )
                    
                    let winStreak = m.consecutiveWinningDays ?? 0
                    let lossStreak = m.consecutiveLosingDays ?? 0
                    metricCard(
                        title: "Current Streak",
                        value: winStreak > 0 ? "\(winStreak) Win Days" : (lossStreak > 0 ? "\(lossStreak) Loss Days" : "Flat"),
                        valueColor: winStreak > 0 ? KiteTheme.profitGreen : (lossStreak > 0 ? KiteTheme.lossRed : KiteTheme.textSecondary(for: colorScheme)),
                        subtitle: "Consecutive trading days",
                        icon: "flame.fill"
                    )
                }
            }
        }
    }
    
    private func metricCard(title: String, value: String, valueColor: Color, subtitle: String? = nil, icon: String) -> some View {
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
                .font(.system(size: 15, weight: .bold, design: .monospaced))
                .foregroundColor(valueColor)
            
            if let sub = subtitle {
                Text(sub)
                    .font(.system(size: 11))
                    .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(KiteTheme.surface(for: colorScheme))
        .overlay(
            RoundedRectangle(cornerRadius: 6)
                .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
        )
    }
    
    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "₹"
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: value)) ?? "₹\(value)"
    }
}

// MARK: - Edit Limits Sheet
public struct EditLimitsSheet: View {
    @ObservedObject var viewModel: RiskViewModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme
    
    public var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Configure Risk Parameters")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
                    Text("Set maximum allowable capital loss and daily profit targets")
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
                limitInputField(
                    title: "Daily Maximum Loss (₹)",
                    description: "Trading alerts will trigger when daily losses approach or reach this threshold.",
                    text: $viewModel.editDailyMaxLoss
                )
                
                limitInputField(
                    title: "Daily Profit Target (₹)",
                    description: "Target goal for the trading session to lock in and protect gains.",
                    text: $viewModel.editDailyProfitTarget
                )
                
                limitInputField(
                    title: "Monthly Maximum Loss (₹)",
                    description: "Portfolio circuit breaker for cumulative monthly losses.",
                    text: $viewModel.editMonthlyMaxLoss
                )
                
                limitInputField(
                    title: "Monthly Profit Target (₹)",
                    description: "Monthly account growth objective.",
                    text: $viewModel.editMonthlyProfitTarget
                )
                
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
                Button("Cancel") {
                    dismiss()
                }
                .buttonStyle(KiteSecondaryButtonStyle())
                
                Button(action: {
                    Task {
                        _ = await viewModel.saveLimits()
                    }
                }) {
                    if viewModel.isSaving {
                        ProgressView()
                            .scaleEffect(0.7)
                            .frame(width: 100)
                    } else {
                        Text("Save Guardrails")
                            .frame(width: 100)
                    }
                }
                .buttonStyle(KitePrimaryButtonStyle())
                .disabled(viewModel.isSaving)
            }
            .padding(16)
        }
        .frame(width: 480)
        .background(KiteTheme.canvas(for: colorScheme))
    }
    
    private func limitInputField(title: String, description: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(KiteTheme.textPrimary(for: colorScheme))
            
            Text(description)
                .font(.system(size: 11))
                .foregroundColor(KiteTheme.textSecondary(for: colorScheme))
            
            TextField("0.00", text: text)
                .textFieldStyle(PlainTextFieldStyle())
                .font(.system(size: 13, design: .monospaced))
                .padding(8)
                .background(KiteTheme.surface(for: colorScheme))
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(KiteTheme.border(for: colorScheme), lineWidth: 1)
                )
        }
    }
}
