<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CapitalTransaction;
use App\Models\Trade;
use App\Models\TradingAccount;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CapitalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $account = $user->defaultAccount ?: $user->tradingAccounts()->first();

        $trades = Trade::where('user_id', $user->id)
            ->where('trading_account_id', $account->id)
            ->orderBy('trade_date', 'asc')
            ->get();

        $transactions = CapitalTransaction::where('user_id', $user->id)
            ->where('trading_account_id', $account->id)
            ->orderBy('transaction_date', 'desc')
            ->get();

        $totalDeposits = (float) $transactions->where('transaction_type', 'deposit')->sum('amount');
        $totalWithdrawals = (float) $transactions->where('transaction_type', 'withdrawal')->sum('amount');
        $netCapitalInflow = $totalDeposits - $totalWithdrawals;

        $totalNetPnl = (float) $trades->sum('net_pnl');
        $initialCapital = (float) $account->initial_capital;
        $currentCapital = $initialCapital + $netCapitalInflow + $totalNetPnl;

        // Peak capital
        $running = $initialCapital;
        $peak = $initialCapital;
        foreach ($trades->groupBy('trade_date')->sortKeys() as $d => $dayTrades) {
            $running += (float) $dayTrades->sum('net_pnl');
            if ($running > $peak) $peak = $running;
        }

        // Today's & Month's progress toward target
        $todayStr = Carbon::today('Asia/Kolkata')->toDateString();
        $todayPnl = (float) $trades->where('trade_date', $todayStr)->sum('net_pnl');

        $monthStr = Carbon::today('Asia/Kolkata')->format('Y-m');
        $thisMonthTrades = $trades->filter(fn($t) => str_starts_with($t->trade_date, $monthStr));
        $thisMonthPnl = (float) $thisMonthTrades->sum('net_pnl');

        $dailyTarget = (float) $account->daily_profit_target;
        $monthlyTarget = (float) $account->monthly_profit_target;

        $dailyTargetAchievementPct = $dailyTarget > 0 ? round(($todayPnl / $dailyTarget) * 100, 1) : 0;
        $monthlyTargetAchievementPct = $monthlyTarget > 0 ? round(($thisMonthPnl / $monthlyTarget) * 100, 1) : 0;
        $remainingMonthlyTarget = max(0, $monthlyTarget - $thisMonthPnl);

        // Capital Growth Chart (combining capital balance day by day)
        $growthChart = [];
        $runCap = $initialCapital;
        foreach ($trades->groupBy('trade_date')->sortKeys() as $d => $dayTrades) {
            $dayPnl = (float) $dayTrades->sum('net_pnl');
            $runCap += $dayPnl;
            $growthChart[] = [
                'date' => $d,
                'displayDate' => Carbon::parse($d)->format('d M'),
                'capital' => round($runCap, 2),
                'pnl' => round($dayPnl, 2),
            ];
        }

        $investedBase = $initialCapital + max(0, $netCapitalInflow);
        $overallRoi = $investedBase > 0 ? round(($totalNetPnl / $investedBase) * 100, 2) : 0;

        return response()->json([
            'account' => $account,
            'initial_capital' => $initialCapital,
            'current_capital' => round($currentCapital, 2),
            'total_deposits' => round($totalDeposits, 2),
            'total_withdrawals' => round($totalWithdrawals, 2),
            'net_capital_inflow' => round($netCapitalInflow, 2),
            'total_profit' => round($totalNetPnl, 2),
            'overall_roi' => $overallRoi,
            'highest_capital' => round($peak, 2),
            'current_drawdown' => round(max(0, $peak - $currentCapital), 2),
            'today_pnl' => round($todayPnl, 2),
            'daily_target' => $dailyTarget,
            'daily_target_achievement_pct' => $dailyTargetAchievementPct,
            'this_month_pnl' => round($thisMonthPnl, 2),
            'monthly_target' => $monthlyTarget,
            'monthly_target_achievement_pct' => $monthlyTargetAchievementPct,
            'remaining_monthly_target' => round($remainingMonthlyTarget, 2),
            'growth_chart' => $growthChart,
            'transactions' => $transactions,
        ]);
    }

    public function storeTransaction(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'transaction_type' => ['required', 'in:deposit,withdrawal'],
            'amount' => ['required', 'numeric', 'min:1'],
            'transaction_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $user = $request->user();
        $account = $user->defaultAccount ?: $user->tradingAccounts()->first();

        $transaction = CapitalTransaction::create([
            'user_id' => $user->id,
            'trading_account_id' => $account->id,
            'transaction_type' => $validated['transaction_type'],
            'amount' => $validated['amount'],
            'transaction_date' => $validated['transaction_date'],
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'message' => ucfirst($validated['transaction_type']) . ' recorded successfully',
            'transaction' => $transaction,
        ], 201);
    }

    public function destroyTransaction(Request $request, CapitalTransaction $transaction): JsonResponse
    {
        if ($transaction->user_id !== $request->user()->id) {
            abort(403);
        }

        $transaction->delete();

        return response()->json([
            'message' => 'Transaction removed successfully',
        ]);
    }

    public function updateInitialCapital(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'initial_capital' => ['required', 'numeric', 'min:0'],
        ]);

        $user = $request->user();
        $account = $user->defaultAccount ?: $user->tradingAccounts()->first();

        $account->update([
            'initial_capital' => $validated['initial_capital'],
        ]);

        return response()->json([
            'message' => 'Initial capital updated successfully',
            'account' => $account,
        ]);
    }
}
