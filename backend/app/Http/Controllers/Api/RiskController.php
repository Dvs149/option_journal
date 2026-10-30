<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trade;
use App\Models\TradingAccount;
use App\Services\TradingAnalyticsService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RiskController extends Controller
{
    public function __construct(
        protected TradingAnalyticsService $analyticsService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $account = $user->defaultAccount ?: $user->tradingAccounts()->first();

        if (!$account) {
            return response()->json(['error' => 'No trading account found'], 404);
        }

        $allTrades = Trade::where('user_id', $user->id)
            ->where('trading_account_id', $account->id)
            ->orderBy('trade_date', 'asc')
            ->get();

        $dailyGrouped = $allTrades->groupBy('trade_date')->map(fn($trades) => (float) $trades->sum('net_pnl'));

        $largestSingleDayProfit = $dailyGrouped->count() > 0 ? max(0, $dailyGrouped->max()) : 0.0;
        $largestSingleDayLoss = $dailyGrouped->count() > 0 ? abs(min(0, $dailyGrouped->min())) : 0.0;

        $winningTrades = $allTrades->where('net_pnl', '>', 0);
        $losingTrades = $allTrades->where('net_pnl', '<', 0);
        $avgWin = $winningTrades->count() > 0 ? (float) $winningTrades->sum('net_pnl') / $winningTrades->count() : 0.0;
        $avgLoss = $losingTrades->count() > 0 ? abs((float) $losingTrades->sum('net_pnl')) / $losingTrades->count() : 0.0;
        $rrRatio = $avgLoss > 0 ? round($avgWin / $avgLoss, 2) : ($avgWin > 0 ? 10.0 : 0.0);

        $drawdownStats = $this->analyticsService->calculateDrawdown(
            $account->initial_capital,
            collect(),
            $allTrades
        );

        $todayStr = Carbon::today('Asia/Kolkata')->toDateString();
        $todaysTrades = $allTrades->filter(fn($t) => Carbon::parse($t->trade_date)->toDateString() === $todayStr);

        $riskSummary = $this->analyticsService->calculateRiskSummary(
            $account,
            $todaysTrades,
            $allTrades,
            $drawdownStats['max_drawdown']
        );

        return response()->json([
            'account_limits' => [
                'daily_max_loss' => (float) $account->daily_max_loss,
                'daily_profit_target' => (float) $account->daily_profit_target,
                'monthly_max_loss' => (float) $account->monthly_max_loss,
                'monthly_profit_target' => (float) $account->monthly_profit_target,
            ],
            'metrics' => [
                'largest_single_day_profit' => round($largestSingleDayProfit, 2),
                'largest_single_day_loss' => round($largestSingleDayLoss, 2),
                'avg_risk_to_reward' => $rrRatio,
                'max_drawdown' => round($drawdownStats['max_drawdown'], 2),
                'max_drawdown_pct' => round($drawdownStats['max_drawdown_pct'], 2),
                'current_drawdown' => round($drawdownStats['current_drawdown'], 2),
                'consecutive_losing_days' => $riskSummary['consecutive_loss_days'],
                'consecutive_winning_days' => $riskSummary['consecutive_win_days'],
                'daily_current_loss' => $riskSummary['daily_current_loss'],
                'daily_current_profit' => $riskSummary['daily_current_profit'],
            ],
            'alerts' => $riskSummary['alerts'],
        ]);
    }

    public function updateLimits(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'daily_max_loss' => ['required', 'numeric', 'min:0'],
            'daily_profit_target' => ['required', 'numeric', 'min:0'],
            'monthly_max_loss' => ['required', 'numeric', 'min:0'],
            'monthly_profit_target' => ['required', 'numeric', 'min:0'],
        ]);

        $user = $request->user();
        $account = $user->defaultAccount ?: $user->tradingAccounts()->first();

        $account->update($validated);

        return response()->json([
            'message' => 'Risk limits updated successfully',
            'account' => $account,
        ]);
    }
}
