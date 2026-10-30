<?php

namespace App\Services;

use App\Models\CapitalTransaction;
use App\Models\Trade;
use App\Models\TradingAccount;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class TradingAnalyticsService
{
    /**
     * Parse date range from filter string or custom dates.
     */
    public function resolveDateRange(string $filter = 'this_month', ?string $fromDate = null, ?string $toDate = null): array
    {
        $today = Carbon::today('Asia/Kolkata');

        switch ($filter) {
            case 'today':
                return [$today->toDateString(), $today->toDateString()];
            case 'yesterday':
                $yesterday = $today->copy()->subDay();
                return [$yesterday->toDateString(), $yesterday->toDateString()];
            case 'this_week':
                return [
                    $today->copy()->startOfWeek()->toDateString(),
                    $today->copy()->endOfWeek()->toDateString(),
                ];
            case 'this_month':
                return [
                    $today->copy()->startOfMonth()->toDateString(),
                    $today->copy()->endOfMonth()->toDateString(),
                ];
            case 'last_month':
                $lastMonth = $today->copy()->subMonth();
                return [
                    $lastMonth->copy()->startOfMonth()->toDateString(),
                    $lastMonth->copy()->endOfMonth()->toDateString(),
                ];
            case 'this_year':
                return [
                    $today->copy()->startOfYear()->toDateString(),
                    $today->copy()->endOfYear()->toDateString(),
                ];
            case 'custom':
                $start = $fromDate ?: $today->copy()->startOfMonth()->toDateString();
                $end = $toDate ?: $today->toDateString();
                return [$start, $end];
            case 'all':
            default:
                return [null, null];
        }
    }

    /**
     * Compute complete dashboard statistics and charts.
     */
    public function getDashboardData(User $user, ?int $accountId = null, string $filter = 'this_month', ?string $fromDate = null, ?string $toDate = null): array
    {
        $account = $accountId 
            ? $user->tradingAccounts()->find($accountId) 
            : ($user->defaultAccount ?: $user->tradingAccounts()->first());

        if (!$account) {
            // Create default account if none exists
            $account = TradingAccount::create([
                'user_id' => $user->id,
                'account_name' => 'Primary Trading Account',
                'broker_name' => 'Zerodha',
                'initial_capital' => 500000.00,
                'daily_profit_target' => 20000.00,
                'daily_max_loss' => 25000.00,
                'monthly_profit_target' => 150000.00,
                'monthly_max_loss' => 100000.00,
                'is_default' => true,
            ]);
        }

        [$startDate, $endDate] = $this->resolveDateRange($filter, $fromDate, $toDate);

        // All trades for equity curve and total capital calculation
        $allTradesQuery = Trade::where('user_id', $user->id)
            ->where('trading_account_id', $account->id)
            ->orderBy('trade_date', 'asc')
            ->orderBy('id', 'asc');

        $allTrades = $allTradesQuery->get();

        // Filtered trades for current view
        $filteredTrades = $allTrades->filter(function ($trade) use ($startDate, $endDate) {
            if ($startDate && $trade->trade_date < $startDate) return false;
            if ($endDate && $trade->trade_date > $endDate) return false;
            return true;
        })->values();

        // Capital transactions
        $capitalTransactions = CapitalTransaction::where('user_id', $user->id)
            ->where('trading_account_id', $account->id)
            ->orderBy('transaction_date', 'asc')
            ->get();

        $totalDeposits = (float) $capitalTransactions->where('transaction_type', 'deposit')->sum('amount');
        $totalWithdrawals = (float) $capitalTransactions->where('transaction_type', 'withdrawal')->sum('amount');
        $netCapitalInflow = $totalDeposits - $totalWithdrawals;

        $allLifetimeNetPnl = (float) $allTrades->sum('net_pnl');
        $currentCapital = (float) $account->initial_capital + $netCapitalInflow + $allLifetimeNetPnl;

        // Lifetime Peak and Drawdown calculation
        $drawdownStats = $this->calculateDrawdown($account->initial_capital, $capitalTransactions, $allTrades);

        // Core aggregate stats on filtered trades
        $totalGrossProfit = (float) $filteredTrades->sum('gross_profit');
        $totalGrossLoss = (float) $filteredTrades->sum('gross_loss');
        $totalCharges = (float) $filteredTrades->sum('total_charges');
        $totalNetProfit = (float) $filteredTrades->sum('net_pnl');

        $profitFactor = $totalGrossLoss > 0 
            ? round($totalGrossProfit / $totalGrossLoss, 2) 
            : ($totalGrossProfit > 0 ? 99.99 : 0.00);

        // Today's, Week's, Month's P&L
        $todayStr = Carbon::today('Asia/Kolkata')->toDateString();
        $todaysTrades = $allTrades->where('trade_date', $todayStr);
        $todayPnl = (float) $todaysTrades->sum('net_pnl');

        $weekStart = Carbon::today('Asia/Kolkata')->startOfWeek()->toDateString();
        $weekEnd = Carbon::today('Asia/Kolkata')->endOfWeek()->toDateString();
        $thisWeekPnl = (float) $allTrades->filter(fn($t) => $t->trade_date >= $weekStart && $t->trade_date <= $weekEnd)->sum('net_pnl');

        $monthStart = Carbon::today('Asia/Kolkata')->startOfMonth()->toDateString();
        $monthEnd = Carbon::today('Asia/Kolkata')->endOfMonth()->toDateString();
        $thisMonthPnl = (float) $allTrades->filter(fn($t) => $t->trade_date >= $monthStart && $t->trade_date <= $monthEnd)->sum('net_pnl');

        // Daily grouping for win rate and daily stats
        $dailyGrouped = $filteredTrades->groupBy('trade_date')->map(function ($trades, $date) {
            $net = (float) $trades->sum('net_pnl');
            $grossP = (float) $trades->sum('gross_profit');
            $grossL = (float) $trades->sum('gross_loss');
            $charges = (float) $trades->sum('total_charges');
            return [
                'date' => $date,
                'net_pnl' => round($net, 2),
                'gross_profit' => round($grossP, 2),
                'gross_loss' => round($grossL, 2),
                'total_charges' => round($charges, 2),
                'trades_count' => $trades->count(),
                'status' => $net > 0 ? 'win' : ($net < 0 ? 'loss' : 'breakeven'),
            ];
        })->sortBy('date')->values();

        $totalTradingDays = $dailyGrouped->count();
        $winningDays = $dailyGrouped->where('status', 'win')->count();
        $losingDays = $dailyGrouped->where('status', 'loss')->count();
        $breakevenDays = $dailyGrouped->where('status', 'breakeven')->count();

        $winRate = $totalTradingDays > 0 ? round(($winningDays / $totalTradingDays) * 100, 1) : 0.0;

        $winningDaysCollection = $dailyGrouped->where('status', 'win');
        $losingDaysCollection = $dailyGrouped->where('status', 'loss');

        $avgDailyProfit = $winningDays > 0 ? round($winningDaysCollection->sum('net_pnl') / $winningDays, 2) : 0.00;
        $avgDailyLoss = $losingDays > 0 ? round(abs($losingDaysCollection->sum('net_pnl')) / $losingDays, 2) : 0.00;

        // Trade-level win rate
        $totalClosedTrades = $filteredTrades->count();
        $winningTrades = $filteredTrades->where('net_pnl', '>', 0)->count();
        $losingTrades = $filteredTrades->where('net_pnl', '<', 0)->count();
        $tradeWinRate = $totalClosedTrades > 0 ? round(($winningTrades / $totalClosedTrades) * 100, 1) : 0.0;

        // Daily P&L Series for Chart
        $dailyChartData = $dailyGrouped->map(function ($day) {
            return [
                'date' => $day['date'],
                'displayDate' => Carbon::parse($day['date'])->format('d M'),
                'pnl' => $day['net_pnl'],
                'grossProfit' => $day['gross_profit'],
                'grossLoss' => $day['gross_loss'],
                'trades' => $day['trades_count'],
            ];
        })->values();

        // Cumulative P&L / Equity Curve Series
        $equityCurveData = $this->buildEquityCurveSeries($account->initial_capital, $allTrades, $startDate, $endDate);

        // Monthly P&L Chart Data (current year by default)
        $monthlyChartData = $this->buildMonthlyPnlSeries($allTrades);

        // Index-wise Performance
        $indexPerformance = $this->buildIndexPerformance($filteredTrades, $totalNetProfit);

        // CE vs PE Performance
        $cePePerformance = $this->buildCePePerformance($filteredTrades, $totalNetProfit);

        // Strategy Performance
        $strategyPerformance = $this->buildStrategyPerformance($filteredTrades);

        // Recent 5 Trades
        $recentTrades = $allTrades->sortByDesc('trade_date')->sortByDesc('id')->take(5)->map(function ($trade) {
            $formattedDate = Carbon::parse($trade->trade_date)->format('Y-m-d');
            return [
                'id' => $trade->id,
                'trade_date' => $formattedDate,
                'display_date' => Carbon::parse($trade->trade_date)->format('d M Y'),
                'index_name' => $trade->index_name,
                'trading_type' => $trade->trading_type,
                'option_type' => $trade->option_type,
                'strategy_name' => $trade->strategy_name,
                'strike_price' => $trade->strike_price,
                'lots' => $trade->lots,
                'net_pnl' => (float) $trade->net_pnl,
            ];
        })->values();

        // Risk & Streaks summary
        $riskSummary = $this->calculateRiskSummary($account, $todaysTrades, $allTrades, $drawdownStats['max_drawdown']);

        // ROI calculation
        $investedCapital = (float) $account->initial_capital + max(0, $netCapitalInflow);
        $overallRoi = $investedCapital > 0 ? round(($allLifetimeNetPnl / $investedCapital) * 100, 2) : 0.0;
        $periodRoi = $investedCapital > 0 ? round(($totalNetProfit / $investedCapital) * 100, 2) : 0.0;
        $grossProfitPct = $investedCapital > 0 ? round(($totalGrossProfit / $investedCapital) * 100, 2) : 0.0;
        $grossLossPct = $investedCapital > 0 ? round(($totalGrossLoss / $investedCapital) * 100, 2) : 0.0;
        $todayPnlPct = $investedCapital > 0 ? round(($todayPnl / $investedCapital) * 100, 2) : 0.0;
        $thisMonthPnlPct = $investedCapital > 0 ? round(($thisMonthPnl / $investedCapital) * 100, 2) : 0.0;

        return [
            'account' => [
                'id' => $account->id,
                'account_name' => $account->account_name,
                'broker_name' => $account->broker_name,
                'initial_capital' => (float) $account->initial_capital,
                'daily_profit_target' => (float) $account->daily_profit_target,
                'daily_max_loss' => (float) $account->daily_max_loss,
                'monthly_profit_target' => (float) $account->monthly_profit_target,
                'monthly_max_loss' => (float) $account->monthly_max_loss,
            ],
            'date_range' => [
                'filter' => $filter,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'display' => $startDate && $endDate 
                    ? Carbon::parse($startDate)->format('d M Y') . ' - ' . Carbon::parse($endDate)->format('d M Y')
                    : 'All Time',
            ],
            'stats' => [
                'total_net_profit' => round($totalNetProfit, 2),
                'total_gross_profit' => round($totalGrossProfit, 2),
                'total_gross_loss' => round($totalGrossLoss, 2),
                'total_charges' => round($totalCharges, 2),
                'today_pnl' => round($todayPnl, 2),
                'this_week_pnl' => round($thisWeekPnl, 2),
                'this_month_pnl' => round($thisMonthPnl, 2),
                'current_capital' => round($currentCapital, 2),
                'total_trading_days' => $totalTradingDays,
                'winning_days' => $winningDays,
                'losing_days' => $losingDays,
                'breakeven_days' => $breakevenDays,
                'win_rate' => $winRate,
                'trade_win_rate' => $tradeWinRate,
                'total_trades' => $totalClosedTrades,
                'avg_daily_profit' => round($avgDailyProfit, 2),
                'avg_daily_loss' => round($avgDailyLoss, 2),
                'max_drawdown' => round($drawdownStats['max_drawdown'], 2),
                'max_drawdown_pct' => round($drawdownStats['max_drawdown_pct'], 2),
                'current_drawdown' => round($drawdownStats['current_drawdown'], 2),
                'profit_factor' => $profitFactor,
                'overall_roi' => $overallRoi,
                'period_roi' => $periodRoi,
                'gross_profit_pct' => $grossProfitPct,
                'gross_loss_pct' => $grossLossPct,
                'today_pnl_pct' => $todayPnlPct,
                'this_month_pnl_pct' => $thisMonthPnlPct,
                'invested_capital' => round($investedCapital, 2),
                'initial_capital' => round((float) $account->initial_capital, 2),
                'highest_capital' => round($drawdownStats['highest_capital'], 2),
            ],
            'charts' => [
                'daily_pnl' => $dailyChartData,
                'equity_curve' => $equityCurveData,
                'monthly_pnl' => $monthlyChartData,
                'index_performance' => $indexPerformance,
                'ce_pe_performance' => $cePePerformance,
            ],
            'strategy_performance' => $strategyPerformance,
            'recent_trades' => $recentTrades,
            'risk_management' => $riskSummary,
        ];
    }

    /**
     * Build Equity Curve series.
     */
    public function buildEquityCurveSeries(float $initialCapital, Collection $trades, ?string $startDate = null, ?string $endDate = null): array
    {
        $daily = $trades->groupBy('trade_date')->sortKeys();
        
        $cumulativePnl = 0.0;
        $runningCapital = $initialCapital;
        $peakCapital = $initialCapital;
        $series = [];

        foreach ($daily as $date => $dayTrades) {
            $dayPnl = (float) $dayTrades->sum('net_pnl');
            $cumulativePnl += $dayPnl;
            $runningCapital += $dayPnl;

            if ($runningCapital > $peakCapital) {
                $peakCapital = $runningCapital;
            }

            $drawdown = $peakCapital - $runningCapital;

            if ((!$startDate || $date >= $startDate) && (!$endDate || $date <= $endDate)) {
                $series[] = [
                    'date' => $date,
                    'displayDate' => Carbon::parse($date)->format('d M'),
                    'pnl' => round($dayPnl, 2),
                    'cumulative_pnl' => round($cumulativePnl, 2),
                    'capital' => round($runningCapital, 2),
                    'drawdown' => round($drawdown, 2),
                    'peak' => round($peakCapital, 2),
                ];
            }
        }

        return $series;
    }

    /**
     * Calculate peak, max drawdown, and current drawdown.
     */
    public function calculateDrawdown(float $initialCapital, Collection $capitalTransactions, Collection $trades): array
    {
        $runningCapital = $initialCapital;
        $peakCapital = $initialCapital;
        $maxDrawdown = 0.0;
        $maxDrawdownPct = 0.0;

        $dailyTrades = $trades->groupBy('trade_date')->sortKeys();

        foreach ($dailyTrades as $date => $dayTrades) {
            $dayPnl = (float) $dayTrades->sum('net_pnl');
            $runningCapital += $dayPnl;

            if ($runningCapital > $peakCapital) {
                $peakCapital = $runningCapital;
            }

            $currentDd = $peakCapital - $runningCapital;
            if ($currentDd > $maxDrawdown) {
                $maxDrawdown = $currentDd;
                $maxDrawdownPct = $peakCapital > 0 ? ($maxDrawdown / $peakCapital) * 100 : 0.0;
            }
        }

        $currentDrawdown = max(0, $peakCapital - $runningCapital);

        return [
            'highest_capital' => $peakCapital,
            'max_drawdown' => $maxDrawdown,
            'max_drawdown_pct' => $maxDrawdownPct,
            'current_drawdown' => $currentDrawdown,
        ];
    }

    /**
     * Monthly P&L grouped by year and month.
     */
    public function buildMonthlyPnlSeries(Collection $trades, ?int $year = null): array
    {
        $year = $year ?: Carbon::today('Asia/Kolkata')->year;
        $months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        $result = [];
        for ($m = 1; $m <= 12; $m++) {
            $monthNum = str_pad($m, 2, '0', STR_PAD_LEFT);
            $prefix = "{$year}-{$monthNum}";
            $monthTrades = $trades->filter(fn($t) => str_starts_with($t->trade_date, $prefix));
            $net = (float) $monthTrades->sum('net_pnl');
            $grossP = (float) $monthTrades->sum('gross_profit');
            $grossL = (float) $monthTrades->sum('gross_loss');

            $result[] = [
                'month' => $months[$m - 1],
                'month_num' => $m,
                'year' => $year,
                'pnl' => round($net, 2),
                'gross_profit' => round($grossP, 2),
                'gross_loss' => round($grossL, 2),
                'trades_count' => $monthTrades->count(),
            ];
        }

        return $result;
    }

    /**
     * Index-wise performance aggregation.
     */
    public function buildIndexPerformance(Collection $trades, float $totalNetProfit): array
    {
        $grouped = $trades->groupBy('index_name');
        $result = [];

        $colors = [
            'NIFTY' => '#3b82f6',
            'BANKNIFTY' => '#06b6d4',
            'SENSEX' => '#8b5cf6',
            'BANKEX' => '#f97316',
            'STOCKS' => '#ec4899',
            'FINNIFTY' => '#10b981',
            'MIDCPNIFTY' => '#eab308',
        ];

        $totalAbsPnl = (float) $trades->sum(fn($t) => abs((float) $t->net_pnl));

        foreach ($grouped as $index => $idxTrades) {
            $net = (float) $idxTrades->sum('net_pnl');
            $absNet = abs($net);
            $pct = $totalAbsPnl > 0 ? round(($absNet / $totalAbsPnl) * 100, 1) : 0.0;
            $wins = $idxTrades->where('net_pnl', '>', 0)->count();

            $result[] = [
                'name' => $index,
                'net_pnl' => round($net, 2),
                'trades' => $idxTrades->count(),
                'win_rate' => $idxTrades->count() > 0 ? round(($wins / $idxTrades->count()) * 100, 1) : 0,
                'percentage' => $pct,
                'color' => $colors[$index] ?? '#64748b',
            ];
        }

        usort($result, fn($a, $b) => $b['net_pnl'] <=> $a['net_pnl']);

        return [
            'total_net_pnl' => round($totalNetProfit, 2),
            'items' => $result,
        ];
    }

    /**
     * CE vs PE performance aggregation.
     */
    public function buildCePePerformance(Collection $trades, float $totalNetProfit): array
    {
        $grouped = $trades->groupBy('option_type');
        $result = [];

        $colors = [
            'CE' => '#3b82f6',
            'PE' => '#ef4444',
            'Both' => '#f97316',
        ];

        $totalAbsPnl = (float) $trades->sum(fn($t) => abs((float) $t->net_pnl));

        foreach (['CE', 'PE', 'Both'] as $type) {
            $typeTrades = $grouped->get($type, collect());
            $net = (float) $typeTrades->sum('net_pnl');
            $pct = $totalAbsPnl > 0 ? round((abs($net) / $totalAbsPnl) * 100, 1) : 0.0;
            $wins = $typeTrades->where('net_pnl', '>', 0)->count();

            $result[] = [
                'name' => $type,
                'net_pnl' => round($net, 2),
                'trades' => $typeTrades->count(),
                'win_rate' => $typeTrades->count() > 0 ? round(($wins / $typeTrades->count()) * 100, 1) : 0,
                'percentage' => $pct,
                'color' => $colors[$type] ?? '#94a3b8',
            ];
        }

        return [
            'total_net_pnl' => round($totalNetProfit, 2),
            'items' => $result,
        ];
    }

    /**
     * Strategy performance table.
     */
    public function buildStrategyPerformance(Collection $trades): array
    {
        $grouped = $trades->groupBy('strategy_name');
        $result = [];

        foreach ($grouped as $strategy => $stTrades) {
            $net = (float) $stTrades->sum('net_pnl');
            $totalCount = $stTrades->count();
            $wins = $stTrades->where('net_pnl', '>', 0)->count();
            $losses = $stTrades->where('net_pnl', '<', 0)->count();
            $winTrades = $stTrades->where('net_pnl', '>', 0);
            $lossTrades = $stTrades->where('net_pnl', '<', 0);

            $result[] = [
                'strategy' => $strategy,
                'total_trades' => $totalCount,
                'winning_trades' => $wins,
                'losing_trades' => $losses,
                'win_rate' => $totalCount > 0 ? round(($wins / $totalCount) * 100, 1) : 0.0,
                'net_pnl' => round($net, 2),
                'avg_profit' => $wins > 0 ? round($winTrades->sum('net_pnl') / $wins, 2) : 0.00,
                'avg_loss' => $losses > 0 ? round(abs($lossTrades->sum('net_pnl')) / $losses, 2) : 0.00,
            ];
        }

        usort($result, fn($a, $b) => $b['net_pnl'] <=> $a['net_pnl']);

        return $result;
    }

    /**
     * Risk Management & alert summaries.
     */
    public function calculateRiskSummary(TradingAccount $account, Collection $todaysTrades, Collection $allTrades, float $maxDrawdown): array
    {
        $todayNet = (float) $todaysTrades->sum('net_pnl');
        $todayGrossLoss = (float) $todaysTrades->sum('gross_loss') + (float) $todaysTrades->sum('total_charges');
        $todayCurrentLoss = $todayNet < 0 ? abs($todayNet) : 0.0;
        $todayCurrentProfit = $todayNet > 0 ? $todayNet : 0.0;

        // Consecutive winning / losing streaks
        $daily = $allTrades->groupBy('trade_date')->sortKeysDesc();
        $consecutiveWins = 0;
        $consecutiveLosses = 0;

        $streakType = null;
        foreach ($daily as $date => $dayTrades) {
            $net = (float) $dayTrades->sum('net_pnl');
            if ($net > 0) {
                if ($streakType === null || $streakType === 'win') {
                    $streakType = 'win';
                    $consecutiveWins++;
                } else {
                    break;
                }
            } elseif ($net < 0) {
                if ($streakType === null || $streakType === 'loss') {
                    $streakType = 'loss';
                    $consecutiveLosses++;
                } else {
                    break;
                }
            }
        }

        $dailyLossLimit = (float) $account->daily_max_loss;
        $dailyProfitTarget = (float) $account->daily_profit_target;
        $maxDrawdownLimit = (float) $account->monthly_max_loss; // or custom limit

        $alerts = [];
        if ($dailyLossLimit > 0 && $todayCurrentLoss >= $dailyLossLimit) {
            $alerts[] = [
                'type' => 'danger',
                'message' => 'Daily Maximum Loss limit reached! Consider halting further trading today.',
            ];
        } elseif ($dailyLossLimit > 0 && $todayCurrentLoss >= ($dailyLossLimit * 0.8)) {
            $alerts[] = [
                'type' => 'warning',
                'message' => 'Approaching Daily Maximum Loss limit (80% reached).',
            ];
        }

        if ($dailyProfitTarget > 0 && $todayCurrentProfit >= $dailyProfitTarget) {
            $alerts[] = [
                'type' => 'success',
                'message' => 'Daily Profit Target achieved! Protect your capital.',
            ];
        }

        if ($consecutiveLosses >= 3) {
            $alerts[] = [
                'type' => 'warning',
                'message' => "Caution: {$consecutiveLosses} consecutive losing days recorded. Review strategy and risk parameters.",
            ];
        }

        return [
            'daily_loss_limit' => $dailyLossLimit,
            'daily_current_loss' => round($todayCurrentLoss, 2),
            'daily_profit_target' => $dailyProfitTarget,
            'daily_current_profit' => round($todayCurrentProfit, 2),
            'max_drawdown_limit' => $maxDrawdownLimit,
            'current_drawdown' => round($maxDrawdown, 2),
            'consecutive_loss_days' => $consecutiveLosses,
            'consecutive_win_days' => $consecutiveWins,
            'alerts' => $alerts,
        ];
    }

    /**
     * Heatmap and Calendar month data.
     */
    public function getTradingCalendar(User $user, ?int $accountId, int $year, int $month): array
    {
        $account = $accountId 
            ? $user->tradingAccounts()->find($accountId) 
            : ($user->defaultAccount ?: $user->tradingAccounts()->first());

        $monthStr = str_pad($month, 2, '0', STR_PAD_LEFT);
        $prefix = "{$year}-{$monthStr}";

        $trades = Trade::where('user_id', $user->id)
            ->when($account, fn($q) => $q->where('trading_account_id', $account->id))
            ->where('trade_date', 'like', "{$prefix}%")
            ->orderBy('trade_date', 'asc')
            ->get();

        $daily = $trades->groupBy('trade_date')->map(function ($dayTrades, $date) {
            $net = (float) $dayTrades->sum('net_pnl');
            $grossP = (float) $dayTrades->sum('gross_profit');
            $grossL = (float) $dayTrades->sum('gross_loss');
            $charges = (float) $dayTrades->sum('total_charges');

            return [
                'date' => $date,
                'day' => (int) Carbon::parse($date)->format('j'),
                'weekday' => Carbon::parse($date)->format('l'),
                'net_pnl' => round($net, 2),
                'gross_profit' => round($grossP, 2),
                'gross_loss' => round($grossL, 2),
                'total_charges' => round($charges, 2),
                'trade_count' => $dayTrades->count(),
                'status' => $net > 0 ? 'profit' : ($net < 0 ? 'loss' : 'breakeven'),
                'trades' => $dayTrades->map(fn($t) => [
                    'id' => $t->id,
                    'time' => $t->created_at ? $t->created_at->format('H:i') : '09:30',
                    'index_name' => $t->index_name,
                    'trading_type' => $t->trading_type,
                    'strategy_name' => $t->strategy_name,
                    'option_type' => $t->option_type,
                    'strike_price' => $t->strike_price,
                    'lots' => $t->lots ?? 1,
                    'entry_premium' => $t->entry_premium,
                    'exit_premium' => $t->exit_premium,
                    'gross_profit' => (float) $t->gross_profit,
                    'gross_loss' => (float) $t->gross_loss,
                    'net_pnl' => (float) $t->net_pnl,
                ])->values(),
            ];
        });

        // Weekday analytics (Monday - Friday)
        $weekdayStats = $this->calculateWeekdayAnalytics($trades);

        $totalNet = (float) $trades->sum('net_pnl');
        $tradingDays = $daily->count();
        $winDays = $daily->where('status', 'profit')->count();
        $lossDays = $daily->where('status', 'loss')->count();

        return [
            'year' => $year,
            'month' => $month,
            'month_name' => Carbon::createFromDate($year, $month, 1)->format('F'),
            'total_net_pnl' => round($totalNet, 2),
            'total_trading_days' => $tradingDays,
            'winning_days' => $winDays,
            'losing_days' => $lossDays,
            'win_rate' => $tradingDays > 0 ? round(($winDays / $tradingDays) * 100, 1) : 0,
            'days' => $daily->values(),
            'weekday_analytics' => $weekdayStats,
        ];
    }

    /**
     * Weekday analysis (Monday through Friday).
     */
    public function calculateWeekdayAnalytics(Collection $trades): array
    {
        $weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        $daily = $trades->groupBy('trade_date');

        $stats = [];
        foreach ($weekdays as $dayName) {
            $dayTrades = $trades->filter(fn($t) => Carbon::parse($t->trade_date)->format('l') === $dayName);
            $dayDays = $daily->filter(fn($t, $d) => Carbon::parse($d)->format('l') === $dayName);

            $net = (float) $dayTrades->sum('net_pnl');
            $wins = $dayDays->filter(fn($t) => (float) $t->sum('net_pnl') > 0)->count();
            $losses = $dayDays->filter(fn($t) => (float) $t->sum('net_pnl') < 0)->count();
            $totalDays = $dayDays->count();

            $stats[$dayName] = [
                'day' => $dayName,
                'net_pnl' => round($net, 2),
                'trading_days' => $totalDays,
                'winning_days' => $wins,
                'losing_days' => $losses,
                'win_rate' => $totalDays > 0 ? round(($wins / $totalDays) * 100, 1) : 0,
            ];
        }

        // Find most and least profitable weekdays
        $sorted = collect($stats)->sortByDesc('net_pnl');
        $mostProfitable = $sorted->first();
        $leastProfitable = $sorted->last();

        return [
            'by_day' => array_values($stats),
            'most_profitable' => $mostProfitable,
            'least_profitable' => $leastProfitable,
        ];
    }

    /**
     * Detailed comparisons for the Analytics & Reports page.
     */
    public function getAdvancedAnalytics(User $user, ?int $accountId, string $filter = 'all', ?string $fromDate = null, ?string $toDate = null): array
    {
        [$startDate, $endDate] = $this->resolveDateRange($filter, $fromDate, $toDate);

        $query = Trade::where('user_id', $user->id)
            ->when($accountId, fn($q) => $q->where('trading_account_id', $accountId))
            ->orderBy('trade_date', 'asc');

        if ($startDate) $query->where('trade_date', '>=', $startDate);
        if ($endDate) $query->where('trade_date', '<=', $endDate);

        $trades = $query->get();

        $dailyGrouped = $trades->groupBy('trade_date')->map(fn($t, $d) => (float) $t->sum('net_pnl'));

        // Best and Worst trading days
        $bestDay = $dailyGrouped->sortDesc()->keys()->first();
        $bestDayPnl = $bestDay ? $dailyGrouped[$bestDay] : 0.0;
        $worstDay = $dailyGrouped->sort()->keys()->first();
        $worstDayPnl = $worstDay ? $dailyGrouped[$worstDay] : 0.0;

        // Largest winning and losing trades
        $largestWinTrade = $trades->sortByDesc('net_pnl')->first();
        $largestLossTrade = $trades->sortBy('net_pnl')->first();

        // Average winning trade / average losing trade
        $winningTrades = $trades->where('net_pnl', '>', 0);
        $losingTrades = $trades->where('net_pnl', '<', 0);
        $avgWinTrade = $winningTrades->count() > 0 ? round($winningTrades->sum('net_pnl') / $winningTrades->count(), 2) : 0.0;
        $avgLossTrade = $losingTrades->count() > 0 ? round(abs($losingTrades->sum('net_pnl')) / $losingTrades->count(), 2) : 0.0;

        // Comparisons
        $niftyPnl = (float) $trades->where('index_name', 'NIFTY')->sum('net_pnl');
        $bankniftyPnl = (float) $trades->where('index_name', 'BANKNIFTY')->sum('net_pnl');
        $sensexPnl = (float) $trades->where('index_name', 'SENSEX')->sum('net_pnl');

        $cePnl = (float) $trades->where('option_type', 'CE')->sum('net_pnl');
        $pePnl = (float) $trades->where('option_type', 'PE')->sum('net_pnl');

        $intradayPnl = (float) $trades->where('trading_type', 'Intraday')->sum('net_pnl');
        $btstPnl = (float) $trades->where('trading_type', 'BTST')->sum('net_pnl');
        $overnightPnl = (float) $trades->where('trading_type', 'Overnight')->sum('net_pnl');

        // Quarterly performance
        $quarterly = [];
        foreach ($trades->groupBy(fn($t) => Carbon::parse($t->trade_date)->format('Y \Q') . Carbon::parse($t->trade_date)->quarter) as $q => $qTrades) {
            $quarterly[] = [
                'quarter' => $q,
                'net_pnl' => round((float) $qTrades->sum('net_pnl'), 2),
                'trades' => $qTrades->count(),
            ];
        }

        // Yearly performance
        $yearly = [];
        foreach ($trades->groupBy(fn($t) => Carbon::parse($t->trade_date)->format('Y')) as $yr => $yrTrades) {
            $yearly[] = [
                'year' => $yr,
                'net_pnl' => round((float) $yrTrades->sum('net_pnl'), 2),
                'trades' => $yrTrades->count(),
            ];
        }

        return [
            'metrics' => [
                'total_trades' => $trades->count(),
                'total_net_pnl' => round((float) $trades->sum('net_pnl'), 2),
                'total_gross_profit' => round((float) $trades->sum('gross_profit'), 2),
                'total_gross_loss' => round((float) $trades->sum('gross_loss'), 2),
                'total_charges' => round((float) $trades->sum('total_charges'), 2),
                'avg_winning_trade' => $avgWinTrade,
                'avg_losing_trade' => $avgLossTrade,
                'largest_winning_trade' => $largestWinTrade ? (float) $largestWinTrade->net_pnl : 0.0,
                'largest_losing_trade' => $largestLossTrade ? (float) $largestLossTrade->net_pnl : 0.0,
                'best_trading_day' => [
                    'date' => $bestDay,
                    'pnl' => round($bestDayPnl, 2),
                ],
                'worst_trading_day' => [
                    'date' => $worstDay,
                    'pnl' => round($worstDayPnl, 2),
                ],
            ],
            'comparisons' => [
                'nifty_vs_sensex' => [
                    'nifty' => round($niftyPnl, 2),
                    'sensex' => round($sensexPnl, 2),
                ],
                'banknifty_vs_nifty' => [
                    'banknifty' => round($bankniftyPnl, 2),
                    'nifty' => round($niftyPnl, 2),
                ],
                'ce_vs_pe' => [
                    'ce' => round($cePnl, 2),
                    'pe' => round($pePnl, 2),
                ],
                'type_comparison' => [
                    'intraday' => round($intradayPnl, 2),
                    'btst' => round($btstPnl, 2),
                    'overnight' => round($overnightPnl, 2),
                ],
                'quarterly' => $quarterly,
                'yearly' => $yearly,
            ],
            'weekday_analytics' => $this->calculateWeekdayAnalytics($trades),
        ];
    }
}
