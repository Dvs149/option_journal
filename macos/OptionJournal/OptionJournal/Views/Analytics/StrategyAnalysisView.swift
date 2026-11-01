import SwiftUI
import Charts

public struct StrategyAnalysisView: View {
    @StateObject private var viewModel = StrategyAnalysisViewModel()
    @ObservedObject private var preferences = PreferencesManager.shared
    @Environment(\.colorScheme) private var colorScheme
    
    public init() {}
    
    public var body: some View {
        ScrollView(.vertical, showsIndicators: true) {
            VStack(alignment: .leading, spacing: 20) {
                // MARK: - Header
                headerSection
                
                // MARK: - Top 6 Metric Cards
                kpiMetricsSection
                
                // MARK: - Row 1: Strategy Performance Table + Net P&L & Win Rate Charts
                HStack(alignment: .top, spacing: 16) {
                    strategyPerformanceTableCard
                        .frame(minWidth: 480, maxWidth: .infinity)
                    
                    VStack(spacing: 16) {
                        netPnlByStrategyCard
                        winRateByStrategyCard
                    }
                    .frame(width: 420)
                }
                .frame(maxWidth: .infinity)
                
                // MARK: - Row 2: Risk vs Reward Scatter + Trade Allocation + Key Insights
                HStack(alignment: .top, spacing: 16) {
                    riskVsRewardScatterCard
                        .frame(minWidth: 360, maxWidth: .infinity)
                    
                    tradeAllocationDonutCard
                        .frame(width: 300)
                    
                    keyInsightsCard
                        .frame(width: 340)
                }
                .frame(maxWidth: .infinity)
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .background(Color(hex: "0b111e"))
        .task {
            await viewModel.loadData()
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Strategy Analysis")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundColor(.white)
                Text("Compare and optimize performance across your trading setups and strategies")
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
                    ForEach(["1M", "3M", "6M", "YTD", "All"], id: \.self) { tf in
                        Button {
                            viewModel.setTimeframe(tf)
                        } label: {
                            Text(tf)
                                .font(.system(size: 11, weight: viewModel.selectedTimeframe == tf ? .bold : .medium))
                                .foregroundColor(viewModel.selectedTimeframe == tf ? .white : Color(hex: "94a3b8"))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 5)
                                .background(viewModel.selectedTimeframe == tf ? Color(hex: "3b82f6") : Color.clear)
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
    
    // MARK: - Top 6 Metric Cards
    private var kpiMetricsSection: some View {
        HStack(spacing: 12) {
            kpiCard(title: "Total Strategies", value: "\(viewModel.totalStrategiesCount)", sub: "", subColor: .clear, icon: "square.stack.3d.up.fill", iconColor: Color(hex: "3b82f6"))
            kpiCard(title: "Most Profitable", value: viewModel.mostProfitableName, sub: "₹0", subColor: Color(hex: "10b981"), icon: "chart.line.uptrend.xyaxis", iconColor: Color(hex: "10b981"))
            kpiCard(title: "Highest Win Rate", value: viewModel.highestWinRateName, sub: "\(String(format: "%.1f", viewModel.highestWinRateVal))%", subColor: Color(hex: "f59e0b"), icon: "trophy.fill", iconColor: Color(hex: "f59e0b"))
            kpiCard(title: "Best Risk-Reward", value: viewModel.bestRiskRewardName, sub: viewModel.bestRiskRewardVal, subColor: Color(hex: "3b82f6"), icon: "scalemass.fill", iconColor: Color(hex: "3b82f6"))
            kpiCard(title: "Most Traded", value: viewModel.mostTradedName, sub: "\(viewModel.mostTradedCount) trades", subColor: Color(hex: "a855f7"), icon: "arrow.left.arrow.right", iconColor: Color(hex: "a855f7"))
            kpiCard(title: "Least Profitable", value: viewModel.leastProfitableName, sub: DashboardNumberFormatter.formatRupeeInteger(viewModel.leastProfitablePnl, includeSign: true, isPrivacyMode: preferences.isPrivacyModeEnabled), subColor: Color(hex: "f43f5e"), icon: "chart.line.downtrend.xyaxis", iconColor: Color(hex: "f43f5e"))
        }
    }
    
    private func kpiCard(title: String, value: String, sub: String, subColor: Color, icon: String, iconColor: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(title)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(Color(hex: "94a3b8"))
                Spacer()
                Image(systemName: icon)
                    .font(.system(size: 12))
                    .foregroundColor(iconColor)
            }
            
            Text(value)
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)
            
            if !sub.isEmpty {
                Text(sub)
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundColor(subColor)
            } else {
                Spacer().frame(height: 14)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 1: Strategy Performance Table Card
    private var strategyPerformanceTableCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Strategy Performance")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(.white)
            
            VStack(spacing: 0) {
                // Table Header
                HStack(spacing: 8) {
                    Text("STRATEGY").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 140, alignment: .leading)
                    Text("TRADES").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 70, alignment: .leading)
                    Text("WIN RATE").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 80, alignment: .leading)
                    Text("NET P&L").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 100, alignment: .leading)
                    Text("AVG P&L").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 85, alignment: .leading)
                    Spacer()
                    Text("R:R RATIO").font(.system(size: 9, weight: .bold)).foregroundColor(Color(hex: "64748b")).frame(width: 75, alignment: .trailing)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color(hex: "0e1524"))
                
                Divider().background(Color(hex: "1e293b"))
                
                ForEach(viewModel.strategies) { item in
                    HStack(spacing: 8) {
                        // Strategy badge
                        Text(item.strategy)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(Color(hex: "3b82f6"))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Color(hex: "3b82f6").opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                            .frame(width: 140, alignment: .leading)
                        
                        Text("\(item.totalTrades)")
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(.white)
                            .frame(width: 70, alignment: .leading)
                        
                        Text("\(String(format: "%.1f", item.winRate ?? 0))%")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(Color(hex: "f59e0b"))
                            .frame(width: 80, alignment: .leading)
                        
                        let pnl = item.netPnl ?? 0
                        Text(pnl >= 0 ? "+₹\(Int(pnl))" : "-₹\(Int(abs(pnl)))")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundColor(pnl >= 0 ? Color(hex: "10b981") : Color(hex: "f43f5e"))
                            .frame(width: 100, alignment: .leading)
                        
                        let avg = item.totalTrades > 0 ? Int(pnl / Double(item.totalTrades)) : 0
                        Text(avg >= 0 ? "+₹\(avg)" : "-₹\(abs(avg))")
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(avg >= 0 ? Color(hex: "10b981") : Color(hex: "f43f5e"))
                            .frame(width: 85, alignment: .leading)
                        
                        Spacer()
                        
                        Text("1 : 0.9")
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(.white)
                            .frame(width: 75, alignment: .trailing)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                }
            }
            .background(Color(hex: "0e1524"))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color(hex: "1e293b"), lineWidth: 1)
            )
            
            Spacer()
        }
        .padding(16)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 1 Right: Net P&L by Strategy
    private var netPnlByStrategyCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Net P&L by Strategy")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            Chart {
                BarMark(
                    x: .value("Strategy", "Long Straddle"),
                    y: .value("P&L", -387387)
                )
                .foregroundStyle(Color(hex: "f43f5e"))
            }
            .chartYAxis {
                AxisMarks(position: .leading) { val in
                    AxisGridLine().foregroundStyle(Color(hex: "1e293b"))
                    AxisValueLabel {
                        if let d = val.as(Double.self) {
                            Text("-₹\(Int(abs(d) / 1000))K").font(.system(size: 8)).foregroundColor(Color(hex: "64748b"))
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
            .frame(height: 100)
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 1 Right: Win Rate by Strategy
    private var winRateByStrategyCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Win Rate by Strategy (%)")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            Chart {
                RuleMark(y: .value("50%", 50))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [4]))
                    .foregroundStyle(Color(hex: "64748b"))
                
                BarMark(
                    x: .value("Strategy", "Long Straddle"),
                    y: .value("WinRate", 44.8)
                )
                .foregroundStyle(Color(hex: "3b82f6"))
            }
            .chartYAxis {
                AxisMarks(position: .leading) { val in
                    AxisGridLine().foregroundStyle(Color(hex: "1e293b"))
                    AxisValueLabel {
                        if let d = val.as(Double.self) {
                            Text("\(Int(d))%").font(.system(size: 8)).foregroundColor(Color(hex: "64748b"))
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
            .frame(height: 100)
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 2: Risk vs Reward Scatter Card
    private var riskVsRewardScatterCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Risk vs Reward Scatter")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            Chart {
                RuleMark(y: .value("0", 0))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [2]))
                    .foregroundStyle(Color(hex: "334155"))
                
                ForEach(viewModel.scatterPoints) { pt in
                    PointMark(
                        x: .value("Risk", pt.risk),
                        y: .value("Reward", pt.reward)
                    )
                    .foregroundStyle(Color(hex: "3b82f6"))
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { val in
                    AxisGridLine().foregroundStyle(Color(hex: "1e293b"))
                    AxisValueLabel {
                        if let d = val.as(Double.self) {
                            Text("\(Int(d / 1000))K").font(.system(size: 8)).foregroundColor(Color(hex: "64748b"))
                        }
                    }
                }
            }
            .chartXAxis {
                AxisMarks { val in
                    AxisValueLabel {
                        if let d = val.as(Double.self) {
                            Text("₹\(Int(d / 1000))K").font(.system(size: 8)).foregroundColor(Color(hex: "94a3b8"))
                        }
                    }
                }
            }
            .frame(height: 150)
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 2: Trade Allocation Donut Card
    private var tradeAllocationDonutCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Trade Allocation")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            ZStack {
                Circle()
                    .stroke(Color(hex: "3b82f6"), lineWidth: 16)
                    .frame(width: 90, height: 90)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            
            HStack {
                HStack(spacing: 6) {
                    Circle().fill(Color(hex: "3b82f6")).frame(width: 8, height: 8)
                    Text("Long Straddle").font(.system(size: 11)).foregroundColor(Color(hex: "94a3b8"))
                }
                Spacer()
                Text("954 (100%)").font(.system(size: 11, weight: .bold, design: .monospaced)).foregroundColor(.white)
            }
            Spacer()
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
    
    // MARK: - Row 2: Key Insights Card
    private var keyInsightsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Key Insights")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
            
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "3b82f6"))
                        .frame(width: 16)
                    Text("Long Straddle leads win accuracy at 44.8%")
                        .font(.system(size: 11))
                        .foregroundColor(.white)
                }
                
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "f59e0b"))
                        .frame(width: 16)
                    Text("Long Straddle is experiencing drawdown (-₹3,87,387). Review execution and stops.")
                        .font(.system(size: 11))
                        .foregroundColor(Color(hex: "94a3b8"))
                }
            }
            Spacer()
        }
        .padding(14)
        .background(Color(hex: "121b2d"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(hex: "1e293b"), lineWidth: 1)
        )
    }
}
