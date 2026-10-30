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
        return $this->exportService->exportCsv($request->user(), $request->input('trading_account_id'));
    }

    public function excel(Request $request): StreamedResponse
    {
        return $this->exportService->exportExcel($request->user(), $request->input('trading_account_id'));
    }

    public function pdf(Request $request)
    {
        $user = $request->user();
        $analytics = $this->analyticsService->getDashboardData(
            $user,
            $request->input('trading_account_id'),
            $request->input('filter', 'this_month')
        );

        return $this->exportService->exportPdf($user, $analytics);
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
