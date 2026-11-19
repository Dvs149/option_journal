<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CapitalTransaction;
use App\Models\Trade;
use App\Models\TradingAccount;
use App\Services\TradingAnalyticsService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CapitalController extends Controller
{
    public function __construct(
        protected TradingAnalyticsService $analyticsService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $account = $user->defaultAccount ?: $user->tradingAccounts()->first();

        if (!$account) {
            return response()->json([
                'account' => null,
                'initial_capital' => 0,
                'current_capital' => 0,
                'opening_capital' => 0,
                'total_deposits' => 0,
                'total_withdrawals' => 0,
                'period_deposits' => 0,
                'period_withdrawals' => 0,
                'lifetime_deposits' => 0,
                'lifetime_withdrawals' => 0,
                'net_capital_inflow' => 0,
                'total_profit' => 0,
                'period_profit' => 0,
                'lifetime_profit' => 0,
                'overall_roi' => 0,
                'period_roi' => 0,
                'highest_capital' => 0,
                'current_drawdown' => 0,
                'today_pnl' => 0,
                'daily_target' => 0,
                'daily_target_achievement_pct' => 0,
                'this_month_pnl' => 0,
                'monthly_target' => 0,
                'monthly_target_achievement_pct' => 0,
                'remaining_monthly_target' => 0,
                'date_range' => [
                    'filter' => 'all',
                    'start_date' => null,
                    'end_date' => null,
                    'display' => 'All Time',
                ],
                'growth_chart' => [],
                'transactions' => [],
            ]);
        }

        $filter = strtolower(trim($request->input('filter', $request->input('time_range', '1m'))));
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');

        if ($fromDate && $toDate) {
            $startDate = $fromDate;
            $endDate = $toDate;
        } else {
            [$startDate, $endDate] = $this->analyticsService->resolveDateRange($filter, $fromDate, $toDate);
        }

        $allTrades = Trade::where('user_id', $user->id)
            ->where('trading_account_id', $account->id)
            ->orderBy('trade_date', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        $allTransactions = CapitalTransaction::where('user_id', $user->id)
            ->where('trading_account_id', $account->id)
            ->orderBy('transaction_date', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        $initialCapital = (float) $account->initial_capital;

        // Group trades by standardized Y-m-d date
        $tradesByDate = $allTrades->groupBy(function ($t) {
            return $t->effective_date ?? Carbon::parse($t->trade_date)->toDateString();
        })->sortKeys();

        // Group transactions by standardized Y-m-d date
        $txByDate = $allTransactions->groupBy(function ($tx) {
            return Carbon::parse($tx->transaction_date)->toDateString();
        })->sortKeys();

        // All active dates sorted
        $allDates = $tradesByDate->keys()->merge($txByDate->keys())->unique()->sort()->values();

        $runningCap = $initialCapital;
        $peak = $initialCapital;
        $dailyRecords = [];

        foreach ($allDates as $d) {
            $dayTrades = $tradesByDate->get($d, collect());
            $dayTxs = $txByDate->get($d, collect());

            $dayPnl = (float) $dayTrades->sum('net_pnl');
            $dayDeposits = (float) $dayTxs->where('transaction_type', 'deposit')->sum('amount');
            $dayWithdrawals = (float) $dayTxs->where('transaction_type', 'withdrawal')->sum('amount');
            $dayNetInflow = $dayDeposits - $dayWithdrawals;

            $runningCap += $dayNetInflow + $dayPnl;
            if ($runningCap > $peak) {
                $peak = $runningCap;
            }

            $dailyRecords[$d] = [
                'date' => $d,
                'displayDate' => Carbon::parse($d)->format('d M'),
                'capital' => round($runningCap, 2),
                'pnl' => round($dayPnl, 2),
                'deposits' => round($dayDeposits, 2),
                'withdrawals' => round($dayWithdrawals, 2),
            ];
        }

        $currentCapital = $runningCap;

        // Calculate opening capital balance at $startDate
        $openingCapital = $initialCapital;
        if ($startDate) {
            $priorDates = $allDates->filter(fn($d) => $d < $startDate);
            if ($priorDates->isNotEmpty()) {
                $lastPriorDate = $priorDates->last();
                $openingCapital = $dailyRecords[$lastPriorDate]['capital'];
            }
        }

        // Build filtered growth chart
        $growthChart = [];
        if ($startDate && $endDate) {
            $recordsInRange = collect($dailyRecords)->filter(fn($r, $d) => $d >= $startDate && $d <= $endDate);

            // Starting anchor point for this timeframe
            $growthChart[] = [
                'date' => $startDate,
                'displayDate' => Carbon::parse($startDate)->format('d M'),
                'capital' => round($openingCapital, 2),
                'pnl' => 0.0,
            ];

            foreach ($recordsInRange as $d => $rec) {
                if ($d !== $startDate) {
                    $growthChart[] = $rec;
                } else {
                    $growthChart[0] = $rec;
                }
            }

            // End anchor point to show complete timeframe line
            $todayStr = Carbon::today('Asia/Kolkata')->toDateString();
            $lastAnchorDate = $endDate < $todayStr ? $endDate : $todayStr;
            $lastRecDate = !empty($growthChart) ? $growthChart[count($growthChart) - 1]['date'] : $startDate;

            if ($lastAnchorDate > $lastRecDate) {
                $lastCap = !empty($growthChart) ? $growthChart[count($growthChart) - 1]['capital'] : $openingCapital;
                $growthChart[] = [
                    'date' => $lastAnchorDate,
                    'displayDate' => Carbon::parse($lastAnchorDate)->format('d M'),
                    'capital' => round($lastCap, 2),
                    'pnl' => 0.0,
                ];
            }
        } else {
            // All Time
            if (!empty($dailyRecords)) {
                $firstDate = $allDates->first();
                $growthChart[] = [
                    'date' => Carbon::parse($firstDate)->subDay()->toDateString(),
                    'displayDate' => Carbon::parse($firstDate)->subDay()->format('d M'),
                    'capital' => round($initialCapital, 2),
                    'pnl' => 0.0,
                ];
                foreach ($dailyRecords as $rec) {
                    $growthChart[] = $rec;
                }
            } else {
                $todayStr = Carbon::today('Asia/Kolkata')->toDateString();
                $growthChart[] = [
                    'date' => $todayStr,
                    'displayDate' => Carbon::parse($todayStr)->format('d M'),
                    'capital' => round($initialCapital, 2),
                    'pnl' => 0.0,
                ];
            }
        }

        // Filtered trades & transactions for period stats
        $filteredTrades = $allTrades->filter(function ($t) use ($startDate, $endDate) {
            $d = $t->effective_date ?? Carbon::parse($t->trade_date)->toDateString();
            if ($startDate && $d < $startDate) return false;
            if ($endDate && $d > $endDate) return false;
            return true;
        });

        $filteredTransactions = $allTransactions->filter(function ($tx) use ($startDate, $endDate) {
            $d = Carbon::parse($tx->transaction_date)->toDateString();
            if ($startDate && $d < $startDate) return false;
            if ($endDate && $d > $endDate) return false;
            return true;
        });

        $periodDeposits = (float) $filteredTransactions->where('transaction_type', 'deposit')->sum('amount');
        $periodWithdrawals = (float) $filteredTransactions->where('transaction_type', 'withdrawal')->sum('amount');
        $periodNetInflow = $periodDeposits - $periodWithdrawals;
        $periodNetPnl = (float) $filteredTrades->sum('net_pnl');

        $totalDeposits = (float) $allTransactions->where('transaction_type', 'deposit')->sum('amount');
        $totalWithdrawals = (float) $allTransactions->where('transaction_type', 'withdrawal')->sum('amount');
        $lifetimeNetInflow = $totalDeposits - $totalWithdrawals;
        $totalNetPnl = (float) $allTrades->sum('net_pnl');

        $investedBase = $initialCapital + max(0, $lifetimeNetInflow);
        $overallRoi = $investedBase > 0 ? round(($totalNetPnl / $investedBase) * 100, 2) : 0;

        $periodBase = $openingCapital + max(0, $periodNetInflow);
        $periodRoi = $periodBase > 0 ? round(($periodNetPnl / $periodBase) * 100, 2) : 0;

        // Today's & Month's progress toward target
        $todayStr = Carbon::today('Asia/Kolkata')->toDateString();
        $todayPnl = (float) $allTrades->filter(fn($t) => ($t->effective_date ?? Carbon::parse($t->trade_date)->toDateString()) === $todayStr)->sum('net_pnl');

        $monthStr = Carbon::today('Asia/Kolkata')->format('Y-m');
        $thisMonthTrades = $allTrades->filter(fn($t) => str_starts_with($t->effective_date ?? Carbon::parse($t->trade_date)->toDateString(), $monthStr));
        $thisMonthPnl = (float) $thisMonthTrades->sum('net_pnl');

        $dailyTarget = (float) $account->daily_profit_target;
        $monthlyTarget = (float) $account->monthly_profit_target;

        $dailyTargetAchievementPct = $dailyTarget > 0 ? round(($todayPnl / $dailyTarget) * 100, 1) : 0;
        $monthlyTargetAchievementPct = $monthlyTarget > 0 ? round(($thisMonthPnl / $monthlyTarget) * 100, 1) : 0;
        $remainingMonthlyTarget = max(0, $monthlyTarget - $thisMonthPnl);

        return response()->json([
            'account' => $account,
            'initial_capital' => $initialCapital,
            'current_capital' => round($currentCapital, 2),
            'opening_capital' => round($openingCapital, 2),
            'total_deposits' => round($filter === 'all' ? $totalDeposits : $periodDeposits, 2),
            'total_withdrawals' => round($filter === 'all' ? $totalWithdrawals : $periodWithdrawals, 2),
            'lifetime_deposits' => round($totalDeposits, 2),
            'lifetime_withdrawals' => round($totalWithdrawals, 2),
            'period_deposits' => round($periodDeposits, 2),
            'period_withdrawals' => round($periodWithdrawals, 2),
            'net_capital_inflow' => round($filter === 'all' ? $lifetimeNetInflow : $periodNetInflow, 2),
            'total_profit' => round($filter === 'all' ? $totalNetPnl : $periodNetPnl, 2),
            'lifetime_profit' => round($totalNetPnl, 2),
            'period_profit' => round($periodNetPnl, 2),
            'overall_roi' => $overallRoi,
            'period_roi' => $periodRoi,
            'highest_capital' => round($peak, 2),
            'current_drawdown' => round(max(0, $peak - $currentCapital), 2),
            'today_pnl' => round($todayPnl, 2),
            'daily_target' => $dailyTarget,
            'daily_target_achievement_pct' => $dailyTargetAchievementPct,
            'this_month_pnl' => round($thisMonthPnl, 2),
            'monthly_target' => $monthlyTarget,
            'monthly_target_achievement_pct' => $monthlyTargetAchievementPct,
            'remaining_monthly_target' => round($remainingMonthlyTarget, 2),
            'date_range' => [
                'filter' => $filter,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'display' => $startDate && $endDate
                    ? Carbon::parse($startDate)->format('d M Y') . ' - ' . Carbon::parse($endDate)->format('d M Y')
                    : 'All Time',
            ],
            'growth_chart' => $growthChart,
            'transactions' => $allTransactions->sortByDesc('transaction_date')->values(),
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
