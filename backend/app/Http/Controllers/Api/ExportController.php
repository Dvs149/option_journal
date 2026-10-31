<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CapitalTransaction;
use App\Models\Trade;
use App\Models\TradeJournal;
use App\Models\TradingAccount;
use App\Models\TradingStrategy;
use App\Services\ExportService;
use App\Services\TradingAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    public function __construct(
        protected ExportService $exportService,
        protected TradingAnalyticsService $analyticsService
    ) {}

    public function csv(Request $request): StreamedResponse
    {
        return $this->exportService->exportCsv(
            $request->user(),
            $request->input('trading_account_id'),
            $request->all()
        );
    }

    public function excel(Request $request): StreamedResponse
    {
        return $this->exportService->exportExcel(
            $request->user(),
            $request->input('trading_account_id'),
            $request->all()
        );
    }

    public function pdf(Request $request)
    {
        $user = $request->user();
        $accountId = $request->input('trading_account_id');
        $filter = $request->input('filter', 'this_month');
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');

        [$startDate, $endDate] = $this->analyticsService->resolveDateRange($filter, $fromDate, $toDate);

        // Fetch dashboard analytics for the date range
        $analytics = $this->analyticsService->getDashboardData(
            $user,
            $accountId,
            $filter,
            $fromDate,
            $toDate
        );

        // Query trades matching the user filters
        $query = Trade::where('user_id', $user->id);

        if ($accountId) {
            $query->where('trading_account_id', $accountId);
        } else {
            $defaultAccount = $user->defaultAccount ?: $user->tradingAccounts()->first();
            if ($defaultAccount) {
                $query->where('trading_account_id', $defaultAccount->id);
            }
        }

        if ($startDate) {
            $query->where('trade_date', '>=', $startDate);
        }
        if ($endDate) {
            $query->where('trade_date', '<=', $endDate);
        }

        if ($request->filled('index_name') && $request->input('index_name') !== 'ALL') {
            $query->where('index_name', $request->input('index_name'));
        }

        if ($request->filled('strategy_name') && $request->input('strategy_name') !== 'ALL') {
            $query->where('strategy_name', $request->input('strategy_name'));
        }

        if ($request->filled('option_type') && $request->input('option_type') !== 'ALL') {
            $query->where('option_type', $request->input('option_type'));
        }

        if ($request->filled('trading_type') && $request->input('trading_type') !== 'ALL') {
            $query->where('trading_type', $request->input('trading_type'));
        }

        if ($request->filled('search')) {
            $search = '%' . $request->input('search') . '%';
            $query->where(function ($q) use ($search) {
                $q->where('strategy_name', 'like', $search)
                  ->orWhere('index_name', 'like', $search)
                  ->orWhere('entry_reason', 'like', $search)
                  ->orWhere('exit_reason', 'like', $search)
                  ->orWhere('notes', 'like', $search)
                  ->orWhere('strike_price', 'like', $search);
            });
        }

        $sortBy = $request->input('sort_by', 'trade_date');
        $sortOrder = $request->input('sort_order', 'desc');
        if ($sortBy === 'latest' || $sortBy === 'date') {
            $sortBy = 'trade_date';
        }

        $allowedSorts = ['id', 'created_at', 'trade_date', 'net_pnl', 'gross_profit', 'gross_loss', 'total_charges', 'strike_price', 'quantity'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder === 'asc' ? 'asc' : 'desc');
            if ($sortBy !== 'id') {
                $query->orderBy('id', 'desc');
            }
        } else {
            $query->orderBy('trade_date', 'desc')->orderBy('id', 'desc');
        }

        $trades = $query->get();

        // Extract report aggregation type and custom column selections
        $reportType = $request->input('report_type', 'trades');
        $columnsInput = $request->input('columns');
        $selectedColumns = [];
        if (is_string($columnsInput) && strlen(trim($columnsInput)) > 0) {
            $selectedColumns = array_values(array_filter(array_map('trim', explode(',', $columnsInput))));
        } elseif (is_array($columnsInput)) {
            $selectedColumns = array_values($columnsInput);
        }

        // Build aggregated data when requested
        $aggregatedData = [];
        if ($reportType === 'daily') {
            $aggregatedData = $trades->groupBy('trade_date')->map(function ($dayTrades, $date) {
                $grossP = (float) $dayTrades->sum('gross_profit');
                $grossL = (float) $dayTrades->sum('gross_loss');
                $charges = (float) $dayTrades->sum('total_charges');
                $net = (float) $dayTrades->sum('net_pnl');
                $count = $dayTrades->count();
                $wins = $dayTrades->where('net_pnl', '>', 0)->count();
                $losses = $dayTrades->where('net_pnl', '<', 0)->count();
                $winRate = $count > 0 ? round(($wins / $count) * 100, 1) : 0;
                return [
                    'date' => $date,
                    'trades_count' => $count,
                    'winning_trades' => $wins,
                    'losing_trades' => $losses,
                    'gross_profit' => $grossP,
                    'gross_loss' => $grossL,
                    'total_charges' => $charges,
                    'net_pnl' => $net,
                    'win_rate' => $winRate,
                    'status' => $net > 0 ? 'Win' : ($net < 0 ? 'Loss' : 'Breakeven'),
                ];
            })->sortByDesc('date')->values();
        } elseif ($reportType === 'monthly') {
            $aggregatedData = $trades->groupBy(function ($t) {
                return \Carbon\Carbon::parse($t->trade_date)->format('Y-m');
            })->map(function ($monthTrades, $ym) {
                $grossP = (float) $monthTrades->sum('gross_profit');
                $grossL = (float) $monthTrades->sum('gross_loss');
                $charges = (float) $monthTrades->sum('total_charges');
                $net = (float) $monthTrades->sum('net_pnl');
                $count = $monthTrades->count();
                $wins = $monthTrades->where('net_pnl', '>', 0)->count();
                $losses = $monthTrades->where('net_pnl', '<', 0)->count();
                $winRate = $count > 0 ? round(($wins / $count) * 100, 1) : 0;
                $monthLabel = \Carbon\Carbon::parse($ym . '-01')->format('M Y');
                return [
                    'month' => $monthLabel,
                    'trades_count' => $count,
                    'winning_trades' => $wins,
                    'losing_trades' => $losses,
                    'gross_profit' => $grossP,
                    'gross_loss' => $grossL,
                    'total_charges' => $charges,
                    'net_pnl' => $net,
                    'win_rate' => $winRate,
                    'status' => $net > 0 ? 'Profit' : ($net < 0 ? 'Loss' : 'Breakeven'),
                ];
            })->values();
        } elseif ($reportType === 'yearly') {
            $aggregatedData = $trades->groupBy(function ($t) {
                return \Carbon\Carbon::parse($t->trade_date)->format('Y');
            })->map(function ($yearTrades, $year) {
                $grossP = (float) $yearTrades->sum('gross_profit');
                $grossL = (float) $yearTrades->sum('gross_loss');
                $charges = (float) $yearTrades->sum('total_charges');
                $net = (float) $yearTrades->sum('net_pnl');
                $count = $yearTrades->count();
                $wins = $yearTrades->where('net_pnl', '>', 0)->count();
                $losses = $yearTrades->where('net_pnl', '<', 0)->count();
                $winRate = $count > 0 ? round(($wins / $count) * 100, 1) : 0;
                return [
                    'year' => $year,
                    'trades_count' => $count,
                    'winning_trades' => $wins,
                    'losing_trades' => $losses,
                    'gross_profit' => $grossP,
                    'gross_loss' => $grossL,
                    'total_charges' => $charges,
                    'net_pnl' => $net,
                    'win_rate' => $winRate,
                    'status' => $net > 0 ? 'Profit' : ($net < 0 ? 'Loss' : 'Breakeven'),
                ];
            })->values();
        }

        // If specific category filters are active, update analytics stats so the summary cards match
        if (
            ($request->filled('index_name') && $request->input('index_name') !== 'ALL') ||
            ($request->filled('strategy_name') && $request->input('strategy_name') !== 'ALL') ||
            ($request->filled('option_type') && $request->input('option_type') !== 'ALL') ||
            ($request->filled('trading_type') && $request->input('trading_type') !== 'ALL') ||
            $request->filled('search')
        ) {
            $totalGrossProfit = (float) $trades->sum('gross_profit');
            $totalGrossLoss = (float) $trades->sum('gross_loss');
            $totalCharges = (float) $trades->sum('total_charges');
            $totalNetProfit = (float) $trades->sum('net_pnl');
            $totalTradesCount = $trades->count();
            $winningTrades = $trades->where('net_pnl', '>', 0)->count();
            $winRate = $totalTradesCount > 0 ? round(($winningTrades / $totalTradesCount) * 100, 1) : 0.0;
            $profitFactor = $totalGrossLoss > 0
                ? round($totalGrossProfit / $totalGrossLoss, 2)
                : ($totalGrossProfit > 0 ? 99.99 : 0.00);

            $analytics['stats']['total_net_profit'] = $totalNetProfit;
            $analytics['stats']['total_gross_profit'] = $totalGrossProfit;
            $analytics['stats']['total_gross_loss'] = $totalGrossLoss;
            $analytics['stats']['total_charges'] = $totalCharges;
            $analytics['stats']['total_trades'] = $totalTradesCount;
            $analytics['stats']['win_rate'] = $winRate;
            $analytics['stats']['profit_factor'] = $profitFactor;
        }

        return $this->exportService->exportPdf(
            $user,
            $analytics,
            $trades,
            $reportType,
            $selectedColumns,
            $aggregatedData
        );
    }

    public function backup(Request $request): JsonResponse
    {
        $user = $request->user();

        $accounts = TradingAccount::where('user_id', $user->id)->get();
        $strategies = TradingStrategy::where('user_id', $user->id)->get();
        $trades = Trade::where('user_id', $user->id)->with('journal')->get();
        $transactions = CapitalTransaction::where('user_id', $user->id)->get();

        $backupData = [
            'app' => 'TradeJournal',
            'version' => '1.0',
            'exported_at' => now('Asia/Kolkata')->toIso8601String(),
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
            ],
            'accounts' => $accounts,
            'strategies' => $strategies,
            'trades' => $trades,
            'capital_transactions' => $transactions,
        ];

        return response()->json($backupData);
    }

    public function restore(Request $request): JsonResponse
    {
        $request->validate([
            'backup_file' => ['required', 'file', 'mimes:json,txt'],
        ]);

        $content = file_get_contents($request->file('backup_file')->getRealPath());
        $data = json_decode($content, true);

        if (!$data || !isset($data['app']) || $data['app'] !== 'TradeJournal') {
            return response()->json(['error' => 'Invalid TradeJournal backup file structure.'], 422);
        }

        $user = $request->user();

        DB::transaction(function () use ($user, $data) {
            $account = $user->defaultAccount ?: $user->tradingAccounts()->first();

            if (isset($data['strategies']) && is_array($data['strategies'])) {
                foreach ($data['strategies'] as $st) {
                    TradingStrategy::firstOrCreate(
                        ['user_id' => $user->id, 'strategy_name' => $st['strategy_name']],
                        ['description' => $st['description'] ?? null]
                    );
                }
            }

            if (isset($data['trades']) && is_array($data['trades'])) {
                foreach ($data['trades'] as $t) {
                    $newTrade = Trade::create([
                        'user_id' => $user->id,
                        'trading_account_id' => $account->id,
                        'trade_date' => $t['trade_date'],
                        'index_name' => $t['index_name'],
                        'trading_type' => $t['trading_type'] ?? 'Intraday',
                        'strategy_name' => $t['strategy_name'],
                        'option_type' => $t['option_type'],
                        'strike_price' => $t['strike_price'] ?? null,
                        'expiry_date' => $t['expiry_date'] ?? null,
                        'entry_premium' => $t['entry_premium'] ?? null,
                        'exit_premium' => $t['exit_premium'] ?? null,
                        'quantity' => $t['quantity'] ?? null,
                        'lots' => $t['lots'] ?? 1,
                        'gross_profit' => $t['gross_profit'] ?? 0,
                        'gross_loss' => $t['gross_loss'] ?? 0,
                        'brokerage' => $t['brokerage'] ?? 0,
                        'stt' => $t['stt'] ?? 0,
                        'exchange_charges' => $t['exchange_charges'] ?? 0,
                        'gst' => $t['gst'] ?? 0,
                        'sebi_charges' => $t['sebi_charges'] ?? 0,
                        'stamp_duty' => $t['stamp_duty'] ?? 0,
                        'other_charges' => $t['other_charges'] ?? 0,
                        'total_charges' => $t['total_charges'] ?? 0,
                        'net_pnl' => $t['net_pnl'] ?? 0,
                        'entry_reason' => $t['entry_reason'] ?? null,
                        'exit_reason' => $t['exit_reason'] ?? null,
                        'notes' => $t['notes'] ?? null,
                    ]);

                    if (isset($t['journal']) && is_array($t['journal'])) {
                        TradeJournal::create([
                            'trade_id' => $newTrade->id,
                            'market_conditions' => $t['journal']['market_conditions'] ?? null,
                            'trade_setup' => $t['journal']['trade_setup'] ?? null,
                            'what_went_right' => $t['journal']['what_went_right'] ?? null,
                            'what_went_wrong' => $t['journal']['what_went_wrong'] ?? null,
                            'mistakes_made' => $t['journal']['mistakes_made'] ?? null,
                            'lessons_learned' => $t['journal']['lessons_learned'] ?? null,
                            'personal_notes' => $t['journal']['personal_notes'] ?? null,
                        ]);
                    }
                }
            }
        });

        return response()->json([
            'message' => 'Backup restored successfully',
        ]);
    }
}
