<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTradeRequest;
use App\Http\Requests\UpdateTradeRequest;
use App\Models\Trade;
use App\Models\TradeJournal;
use App\Models\TradeScreenshot;
use App\Services\TradingCalculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TradeController extends Controller
{
    public function __construct(
        protected TradingCalculationService $calcService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $account = $user->defaultAccount;

        $query = Trade::where('user_id', $user->id)
            ->with(['journal', 'screenshots']);

        if ($request->filled('trading_account_id')) {
            $query->where('trading_account_id', $request->trading_account_id);
        } elseif ($account) {
            $query->where('trading_account_id', $account->id);
        }

        // Filters
        if ($request->filled('index_name') && $request->index_name !== 'ALL') {
            $query->where('index_name', $request->index_name);
        }

        if ($request->filled('strategy_name') && $request->strategy_name !== 'ALL') {
            $query->where('strategy_name', $request->strategy_name);
        }

        if ($request->filled('option_type') && $request->option_type !== 'ALL') {
            $query->where('option_type', $request->option_type);
        }

        if ($request->filled('trading_type') && $request->trading_type !== 'ALL') {
            $query->where('trading_type', $request->trading_type);
        }

        if ($request->filled('from_date')) {
            $query->where('trade_date', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->where('trade_date', '<=', $request->to_date);
        }

        if (!$request->filled('from_date') && !$request->filled('to_date') && $request->filled('filter')) {
            [$start, $end] = app(\App\Services\TradingAnalyticsService::class)->resolveDateRange($request->filter);
            if ($start) $query->where('trade_date', '>=', $start);
            if ($end) $query->where('trade_date', '<=', $end);
        }

        // Search text
        if ($request->filled('search')) {
            $search = '%' . $request->search . '%';
            $query->where(function ($q) use ($search) {
                $q->where('strategy_name', 'like', $search)
                  ->orWhere('index_name', 'like', $search)
                  ->orWhere('entry_reason', 'like', $search)
                  ->orWhere('exit_reason', 'like', $search)
                  ->orWhere('notes', 'like', $search)
                  ->orWhere('strike_price', 'like', $search);
            });
        }

        // Sorting: default to latest trade date first (newest trade_date first, secondary sort by id desc)
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

        $perPage = min((int) $request->input('per_page', 15), 100);
        $trades = $query->with('journal')->paginate($perPage);

        return response()->json($trades);
    }

    public function store(StoreTradeRequest $request): JsonResponse
    {
        $user = $request->user();
        $account = $user->defaultAccount;

        $accountId = $request->input('trading_account_id', $account ? $account->id : null);
        if (!$accountId) {
            $account = $user->tradingAccounts()->first();
            $accountId = $account->id;
        }

        $data = $request->validated();
        $calculated = $this->calcService->calculate($data);

        $trade = DB::transaction(function () use ($user, $accountId, $data, $calculated) {
            $trade = Trade::create([
                'user_id' => $user->id,
                'trading_account_id' => $accountId,
                'trade_date' => $data['trade_date'],
                'index_name' => $data['index_name'],
                'trading_type' => $data['trading_type'],
                'strategy_name' => $data['strategy_name'],
                'option_type' => $data['option_type'],
                'strike_price' => $data['strike_price'] ?? null,
                'expiry_date' => $data['expiry_date'] ?? null,
                'ce_entry_price' => $data['ce_entry_price'] ?? null,
                'pe_entry_price' => $data['pe_entry_price'] ?? null,
                'entry_premium' => $data['entry_premium'] ?? null,
                'ce_exit_price' => $data['ce_exit_price'] ?? null,
                'pe_exit_price' => $data['pe_exit_price'] ?? null,
                'exit_premium' => $data['exit_premium'] ?? null,
                'quantity' => $data['quantity'] ?? null,
                'lots' => $data['lots'] ?? 1,
                'gross_profit' => $calculated['gross_profit'],
                'gross_loss' => $calculated['gross_loss'],
                'brokerage' => $calculated['brokerage'],
                'stt' => $calculated['stt'],
                'exchange_charges' => $calculated['exchange_charges'],
                'gst' => $calculated['gst'],
                'sebi_charges' => $calculated['sebi_charges'],
                'stamp_duty' => $calculated['stamp_duty'],
                'other_charges' => $calculated['other_charges'],
                'total_charges' => $calculated['total_charges'],
                'net_pnl' => $calculated['net_pnl'],
                'entry_reason' => $data['entry_reason'] ?? null,
                'exit_reason' => $data['exit_reason'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            // Save trade journal entry if any journal reflection was provided
            if (
                !empty($data['market_conditions']) ||
                !empty($data['trade_setup']) ||
                !empty($data['what_went_right']) ||
                !empty($data['what_went_wrong']) ||
                !empty($data['mistakes_made']) ||
                !empty($data['lessons_learned']) ||
                !empty($data['personal_notes'])
            ) {
                TradeJournal::create([
                    'trade_id' => $trade->id,
                    'market_conditions' => $data['market_conditions'] ?? null,
                    'trade_setup' => $data['trade_setup'] ?? null,
                    'what_went_right' => $data['what_went_right'] ?? null,
                    'what_went_wrong' => $data['what_went_wrong'] ?? null,
                    'mistakes_made' => $data['mistakes_made'] ?? null,
                    'lessons_learned' => $data['lessons_learned'] ?? null,
                    'personal_notes' => $data['personal_notes'] ?? null,
                ]);
            }

            return $trade;
        });

        if ($request->hasFile('screenshots')) {
            $files = $request->file('screenshots');
            if (!is_array($files)) {
                $files = [$files];
            }
            $captions = $request->input('captions', []);
            foreach ($files as $idx => $file) {
                if ($file && $file->isValid()) {
                    $path = $file->store('screenshots', 'public');
                    $caption = is_array($captions) && isset($captions[$idx]) ? $captions[$idx] : null;
                    $trade->screenshots()->create([
                        'path' => $path,
                        'filename' => $file->getClientOriginalName(),
                        'caption' => $caption,
                        'sort_order' => $idx,
                    ]);
                    if (!$trade->screenshot_path) {
                        $trade->screenshot_path = $path;
                        $trade->save();
                    }
                }
            }
        } elseif ($request->hasFile('screenshot')) {
            $file = $request->file('screenshot');
            $path = $file->store('screenshots', 'public');
            $trade->screenshot_path = $path;
            $trade->save();
            $trade->screenshots()->create([
                'path' => $path,
                'filename' => $file->getClientOriginalName(),
                'caption' => $request->input('caption'),
                'sort_order' => 0,
            ]);
        }

        return response()->json([
            'message' => 'Trade recorded successfully',
            'trade' => $trade->fresh()->load(['journal', 'screenshots']),
        ], 201);
    }

    public function show(Request $request, Trade $trade): JsonResponse
    {
        $this->authorizeTrade($request->user(), $trade);

        return response()->json($trade->load(['journal', 'screenshots']));
    }

    public function update(UpdateTradeRequest $request, Trade $trade): JsonResponse
    {
        $this->authorizeTrade($request->user(), $trade);

        $data = $request->validated();

        // Merge current attributes with updated data for calculation
        $mergedForCalc = array_merge($trade->toArray(), $data);
        $calculated = $this->calcService->calculate($mergedForCalc);

        DB::transaction(function () use ($trade, $data, $calculated) {
            $trade->update(array_merge($data, [
                'gross_profit' => $calculated['gross_profit'],
                'gross_loss' => $calculated['gross_loss'],
                'brokerage' => $calculated['brokerage'],
                'stt' => $calculated['stt'],
                'exchange_charges' => $calculated['exchange_charges'],
                'gst' => $calculated['gst'],
                'sebi_charges' => $calculated['sebi_charges'],
                'stamp_duty' => $calculated['stamp_duty'],
                'other_charges' => $calculated['other_charges'],
                'total_charges' => $calculated['total_charges'],
                'net_pnl' => $calculated['net_pnl'],
            ]));

            // Update or create journal
            $journalData = [
                'market_conditions' => $data['market_conditions'] ?? $trade->journal?->market_conditions,
                'trade_setup' => $data['trade_setup'] ?? $trade->journal?->trade_setup,
                'what_went_right' => $data['what_went_right'] ?? $trade->journal?->what_went_right,
                'what_went_wrong' => $data['what_went_wrong'] ?? $trade->journal?->what_went_wrong,
                'mistakes_made' => $data['mistakes_made'] ?? $trade->journal?->mistakes_made,
                'lessons_learned' => $data['lessons_learned'] ?? $trade->journal?->lessons_learned,
                'personal_notes' => $data['personal_notes'] ?? $trade->journal?->personal_notes,
            ];

            if ($trade->journal) {
                $trade->journal->update($journalData);
            } elseif (array_filter($journalData)) {
                $trade->journal()->create($journalData);
            }
        });

        // Handle deletion of specific screenshots
        if ($request->has('deleted_screenshot_ids')) {
            $ids = (array) $request->input('deleted_screenshot_ids');
            $toDelete = $trade->screenshots()->whereIn('id', $ids)->get();
            foreach ($toDelete as $s) {
                if ($s->path && Storage::disk('public')->exists($s->path)) {
                    Storage::disk('public')->delete($s->path);
                }
                $s->delete();
            }
        }

        // Handle newly uploaded screenshots
        if ($request->hasFile('screenshots')) {
            $files = $request->file('screenshots');
            if (!is_array($files)) {
                $files = [$files];
            }
            $captions = $request->input('captions', []);
            $currentMaxOrder = (int) $trade->screenshots()->max('sort_order');
            foreach ($files as $idx => $file) {
                if ($file && $file->isValid()) {
                    $path = $file->store('screenshots', 'public');
                    $caption = is_array($captions) && isset($captions[$idx]) ? $captions[$idx] : null;
                    $trade->screenshots()->create([
                        'path' => $path,
                        'filename' => $file->getClientOriginalName(),
                        'caption' => $caption,
                        'sort_order' => $currentMaxOrder + $idx + 1,
                    ]);
                    if (!$trade->screenshot_path) {
                        $trade->screenshot_path = $path;
                        $trade->save();
                    }
                }
            }
        } elseif ($request->hasFile('screenshot')) {
            $file = $request->file('screenshot');
            $path = $file->store('screenshots', 'public');
            $trade->screenshot_path = $path;
            $trade->save();
            $trade->screenshots()->create([
                'path' => $path,
                'filename' => $file->getClientOriginalName(),
                'caption' => $request->input('caption'),
                'sort_order' => ((int) $trade->screenshots()->max('sort_order')) + 1,
            ]);
        } elseif ($request->boolean('remove_screenshot')) {
            foreach ($trade->screenshots as $s) {
                if ($s->path && Storage::disk('public')->exists($s->path)) {
                    Storage::disk('public')->delete($s->path);
                }
                $s->delete();
            }
            $trade->screenshot_path = null;
            $trade->save();
        }

        // Synchronize primary screenshot_path with first available screenshot
        $first = $trade->screenshots()->first();
        $trade->screenshot_path = $first ? $first->path : null;
        $trade->save();

        return response()->json([
            'message' => 'Trade updated successfully',
            'trade' => $trade->fresh()->load(['journal', 'screenshots']),
        ]);
    }

    public function uploadScreenshots(Request $request, Trade $trade): JsonResponse
    {
        $this->authorizeTrade($request->user(), $trade);

        $request->validate([
            'screenshots' => ['nullable', 'array'],
            'screenshots.*' => ['file', 'image', 'max:10240'],
            'screenshot' => ['nullable', 'file', 'image', 'max:10240'],
            'captions' => ['nullable', 'array'],
        ]);

        $files = [];
        if ($request->hasFile('screenshots')) {
            $files = $request->file('screenshots');
            if (!is_array($files)) {
                $files = [$files];
            }
        } elseif ($request->hasFile('screenshot')) {
            $files = [$request->file('screenshot')];
        }

        $captions = $request->input('captions', []);
        $currentMaxOrder = (int) $trade->screenshots()->max('sort_order');
        $createdList = [];

        foreach ($files as $idx => $file) {
            if ($file && $file->isValid()) {
                $path = $file->store('screenshots', 'public');
                $caption = is_array($captions) && isset($captions[$idx]) ? $captions[$idx] : null;
                $item = $trade->screenshots()->create([
                    'path' => $path,
                    'filename' => $file->getClientOriginalName(),
                    'caption' => $caption,
                    'sort_order' => $currentMaxOrder + $idx + 1,
                ]);
                $createdList[] = $item;

                if (!$trade->screenshot_path) {
                    $trade->screenshot_path = $path;
                    $trade->save();
                }
            }
        }

        return response()->json([
            'message' => count($createdList) . ' screenshot(s) uploaded successfully',
            'trade' => $trade->fresh()->load(['journal', 'screenshots']),
            'screenshots' => $trade->fresh()->screenshots,
        ]);
    }

    public function uploadScreenshot(Request $request, Trade $trade): JsonResponse
    {
        return $this->uploadScreenshots($request, $trade);
    }

    public function deleteSingleScreenshot(Request $request, Trade $trade, TradeScreenshot $screenshot): JsonResponse
    {
        $this->authorizeTrade($request->user(), $trade);

        if ($screenshot->trade_id !== $trade->id) {
            return response()->json(['message' => 'Unauthorized screenshot access'], 403);
        }

        if ($screenshot->path && Storage::disk('public')->exists($screenshot->path)) {
            Storage::disk('public')->delete($screenshot->path);
        }

        $wasMain = ($trade->screenshot_path === $screenshot->path);
        $screenshot->delete();

        if ($wasMain) {
            $next = $trade->screenshots()->first();
            $trade->screenshot_path = $next ? $next->path : null;
            $trade->save();
        }

        return response()->json([
            'message' => 'Screenshot deleted successfully',
            'trade' => $trade->fresh()->load(['journal', 'screenshots']),
        ]);
    }

    public function deleteScreenshot(Request $request, Trade $trade): JsonResponse
    {
        $this->authorizeTrade($request->user(), $trade);

        foreach ($trade->screenshots as $s) {
            if ($s->path && Storage::disk('public')->exists($s->path)) {
                Storage::disk('public')->delete($s->path);
            }
            $s->delete();
        }

        if ($trade->screenshot_path && Storage::disk('public')->exists($trade->screenshot_path)) {
            Storage::disk('public')->delete($trade->screenshot_path);
        }

        $trade->screenshot_path = null;
        $trade->save();

        return response()->json([
            'message' => 'Screenshots removed successfully',
            'trade' => $trade->fresh()->load(['journal', 'screenshots']),
        ]);
    }

    public function destroy(Request $request, Trade $trade): JsonResponse
    {
        $this->authorizeTrade($request->user(), $trade);

        DB::transaction(function () use ($trade) {
            foreach ($trade->screenshots as $s) {
                if ($s->path && Storage::disk('public')->exists($s->path)) {
                    Storage::disk('public')->delete($s->path);
                }
                $s->delete();
            }

            if ($trade->screenshot_path && Storage::disk('public')->exists($trade->screenshot_path)) {
                Storage::disk('public')->delete($trade->screenshot_path);
            }

            if ($trade->journal) {
                $trade->journal->delete();
            }

            $trade->delete();
        });

        return response()->json([
            'message' => 'Trade deleted successfully',
        ]);
    }

    public function allIds(Request $request): JsonResponse
    {
        $user = $request->user();
        $account = $user->defaultAccount;

        $query = Trade::where('user_id', $user->id);

        if ($request->filled('trading_account_id')) {
            $query->where('trading_account_id', $request->trading_account_id);
        } elseif ($account) {
            $query->where('trading_account_id', $account->id);
        }

        if ($request->filled('index_name') && $request->index_name !== 'ALL') {
            $query->where('index_name', $request->index_name);
        }

        if ($request->filled('strategy_name') && $request->strategy_name !== 'ALL') {
            $query->where('strategy_name', $request->strategy_name);
        }

        if ($request->filled('option_type') && $request->option_type !== 'ALL') {
            $query->where('option_type', $request->option_type);
        }

        if ($request->filled('trading_type') && $request->trading_type !== 'ALL') {
            $query->where('trading_type', $request->trading_type);
        }

        if ($request->filled('from_date')) {
            $query->where('trade_date', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->where('trade_date', '<=', $request->to_date);
        }

        if (!$request->filled('from_date') && !$request->filled('to_date') && $request->filled('filter')) {
            [$start, $end] = app(\App\Services\TradingAnalyticsService::class)->resolveDateRange($request->filter);
            if ($start) $query->where('trade_date', '>=', $start);
            if ($end) $query->where('trade_date', '<=', $end);
        }

        if ($request->filled('search')) {
            $search = '%' . $request->search . '%';
            $query->where(function ($q) use ($search) {
                $q->where('strategy_name', 'like', $search)
                  ->orWhere('index_name', 'like', $search)
                  ->orWhere('entry_reason', 'like', $search)
                  ->orWhere('exit_reason', 'like', $search)
                  ->orWhere('notes', 'like', $search)
                  ->orWhere('strike_price', 'like', $search);
            });
        }

        $ids = $query->pluck('id');

        return response()->json([
            'ids' => $ids,
            'count' => count($ids),
        ]);
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        $request->validate([
            'trade_ids' => ['required', 'array', 'min:1'],
            'trade_ids.*' => ['integer'],
        ]);

        $user = $request->user();
        $tradeIds = $request->input('trade_ids');

        $trades = Trade::where('user_id', $user->id)
            ->whereIn('id', $tradeIds)
            ->with(['screenshots', 'journal'])
            ->get();

        if ($trades->isEmpty()) {
            return response()->json([
                'message' => 'No matching trades found to delete',
                'deleted_count' => 0,
            ], 404);
        }

        $deletedCount = 0;

        DB::transaction(function () use ($trades, &$deletedCount) {
            foreach ($trades as $trade) {
                foreach ($trade->screenshots as $s) {
                    if ($s->path && Storage::disk('public')->exists($s->path)) {
                        Storage::disk('public')->delete($s->path);
                    }
                    $s->delete();
                }

                if ($trade->screenshot_path && Storage::disk('public')->exists($trade->screenshot_path)) {
                    Storage::disk('public')->delete($trade->screenshot_path);
                }

                if ($trade->journal) {
                    $trade->journal->delete();
                }

                $trade->delete();
                $deletedCount++;
            }
        });

        return response()->json([
            'message' => "Successfully deleted {$deletedCount} trade(s)",
            'deleted_count' => $deletedCount,
        ]);
    }

    public function duplicate(Request $request, Trade $trade): JsonResponse
    {
        $this->authorizeTrade($request->user(), $trade);

        $newTrade = DB::transaction(function () use ($trade) {
            $clone = $trade->replicate([
                'created_at',
                'updated_at',
                'deleted_at',
            ]);
            $clone->trade_date = now('Asia/Kolkata')->toDateString();
            $clone->notes = ($clone->notes ? $clone->notes . ' ' : '') . '(Cloned Trade)';
            $clone->save();

            if ($trade->journal) {
                $journalClone = $trade->journal->replicate(['created_at', 'updated_at']);
                $journalClone->trade_id = $clone->id;
                $journalClone->save();
            }

            return $clone;
        });

        return response()->json([
            'message' => 'Trade duplicated successfully',
            'trade' => $newTrade->load('journal'),
        ], 201);
    }

    public function estimateCharges(Request $request): JsonResponse
    {
        $user = $request->user();
        $rates = \App\Models\BrokerageSetting::forUser($user?->id);

        $entry = (float) $request->input('entry_premium', 0);
        $exit = (float) $request->input('exit_premium', 0);
        $qty = (int) $request->input('quantity', 0);
        $optionType = $request->input('option_type', 'CE');
        $indexName = strtoupper((string) $request->input('index_name', ''));

        // If legs for Both are provided, combine them
        if ($optionType === 'Both') {
            $ceEntry = (float) $request->input('ce_entry_price', 0);
            $peEntry = (float) $request->input('pe_entry_price', 0);
            $ceExit = (float) $request->input('ce_exit_price', 0);
            $peExit = (float) $request->input('pe_exit_price', 0);

            if (($ceEntry > 0 || $peEntry > 0) && ($ceExit > 0 || $peExit > 0)) {
                $entry = $ceEntry + $peEntry;
                $exit = $ceExit + $peExit;
            }
        }

        // Executed orders: Default 2 orders for single leg (Buy + Sell); 4 orders for Both (CE buy/sell + PE buy/sell)
        $defaultOrders = ($optionType === 'Both') ? 4 : 2;
        $orders = (int) $request->input('executed_orders', $defaultOrders);

        // Exchange: SENSEX & BANKEX are BSE; NIFTY, BANKNIFTY, FINNIFTY, etc. are NSE
        $exchange = $request->input('exchange');
        if (!$exchange) {
            if (in_array($indexName, ['SENSEX', 'BANKEX'])) {
                $exchange = 'BSE';
            } else {
                $exchange = $rates['default_exchange'] ?? 'NSE';
            }
        }

        $estimated = $this->calcService->estimateIndianCharges(
            $entry,
            $exit,
            $qty,
            $orders,
            $exchange,
            $rates
        );

        return response()->json($estimated);
    }

    public function resetAllData(Request $request): JsonResponse
    {
        $user = $request->user();

        DB::transaction(function () use ($user) {
            // Delete user screenshots from disk
            $trades = Trade::where('user_id', $user->id)->with('screenshots')->get();
            foreach ($trades as $trade) {
                foreach ($trade->screenshots as $s) {
                    if ($s->path && Storage::disk('public')->exists($s->path)) {
                        Storage::disk('public')->delete($s->path);
                    }
                }
                if ($trade->screenshot_path && Storage::disk('public')->exists($trade->screenshot_path)) {
                    Storage::disk('public')->delete($trade->screenshot_path);
                }
            }

            TradeScreenshot::whereHas('trade', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            })->delete();

            TradeJournal::whereHas('trade', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            })->delete();

            Trade::where('user_id', $user->id)->delete();

            \App\Models\CapitalTransaction::where('user_id', $user->id)->delete();

            $account = $user->defaultAccount ?: $user->tradingAccounts()->first();
            if ($account) {
                \App\Models\CapitalTransaction::create([
                    'user_id' => $user->id,
                    'trading_account_id' => $account->id,
                    'transaction_type' => 'deposit',
                    'amount' => $account->initial_capital ?: 500000.00,
                    'transaction_date' => now('Asia/Kolkata')->toDateString(),
                    'notes' => 'Initial capital funding',
                ]);
            }
        });

        return response()->json([
            'message' => 'All trade entries and dummy data deleted successfully. Ready for manual testing.',
        ]);
    }

    public function bulkImport(Request $request): JsonResponse
    {
        $user = $request->user();
        $account = $user->defaultAccount ?: $user->tradingAccounts()->first();
        $accountId = $request->input('trading_account_id', $account ? $account->id : null);

        $tradesData = $request->input('trades', []);
        if (!is_array($tradesData) || empty($tradesData)) {
            return response()->json([
                'success' => false,
                'message' => 'No valid trades provided for bulk import',
            ], 422);
        }

        $importedTrades = [];
        $errors = [];

        DB::beginTransaction();
        try {
            foreach ($tradesData as $index => $row) {
                $rowNum = $index + 1;
                if (empty($row['index_name'])) {
                    $errors[] = ['row' => $rowNum, 'error' => 'Missing Index / Symbol'];
                    continue;
                }
                if (empty($row['trade_date'])) {
                    $errors[] = ['row' => $rowNum, 'error' => 'Missing Trade Date'];
                    continue;
                }
                if (!isset($row['quantity']) || (int)$row['quantity'] <= 0) {
                    $errors[] = ['row' => $rowNum, 'error' => 'Invalid quantity (must be > 0)'];
                    continue;
                }

                $calculated = $this->calcService->calculate($row);

                $trade = Trade::create([
                    'user_id' => $user->id,
                    'trading_account_id' => $accountId,
                    'trade_date' => $row['trade_date'],
                    'index_name' => strtoupper($row['index_name']),
                    'trading_type' => $row['trading_type'] ?? 'Intraday',
                    'strategy_name' => $row['strategy_name'] ?? 'Long Straddle',
                    'option_type' => strtoupper($row['option_type'] ?? 'CE'),
                    'strike_price' => isset($row['strike_price']) && is_numeric($row['strike_price']) ? $row['strike_price'] : null,
                    'expiry_date' => !empty($row['expiry_date']) ? $row['expiry_date'] : null,
                    'ce_entry_price' => $row['ce_entry_price'] ?? null,
                    'pe_entry_price' => $row['pe_entry_price'] ?? null,
                    'entry_premium' => isset($row['entry_premium']) && is_numeric($row['entry_premium']) ? $row['entry_premium'] : null,
                    'ce_exit_price' => $row['ce_exit_price'] ?? null,
                    'pe_exit_price' => $row['pe_exit_price'] ?? null,
                    'exit_premium' => isset($row['exit_premium']) && is_numeric($row['exit_premium']) ? $row['exit_premium'] : null,
                    'quantity' => (int) $row['quantity'],
                    'lots' => max(1, (int) ($row['lots'] ?? 1)),
                    'gross_profit' => $calculated['gross_profit'],
                    'gross_loss' => $calculated['gross_loss'],
                    'brokerage' => $calculated['brokerage'],
                    'stt' => $calculated['stt'],
                    'exchange_charges' => $calculated['exchange_charges'],
                    'gst' => $calculated['gst'],
                    'sebi_charges' => $calculated['sebi_charges'],
                    'stamp_duty' => $calculated['stamp_duty'],
                    'other_charges' => $calculated['other_charges'],
                    'total_charges' => $calculated['total_charges'],
                    'net_pnl' => $calculated['net_pnl'],
                    'entry_reason' => $row['entry_reason'] ?? ('Bulk Import: ' . ($row['source_broker'] ?? 'Excel')),
                    'exit_reason' => $row['exit_reason'] ?? null,
                    'notes' => $row['notes'] ?? ('Imported from ' . ($row['source_broker'] ?? 'Excel')),
                ]);

                if (!empty($row['market_conditions']) || !empty($row['notes'])) {
                    TradeJournal::create([
                        'trade_id' => $trade->id,
                        'market_conditions' => $row['market_conditions'] ?? null,
                        'personal_notes' => $row['notes'] ?? null,
                    ]);
                }

                $importedTrades[] = $trade->id;
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Successfully imported " . count($importedTrades) . " trades.",
                'imported_count' => count($importedTrades),
                'errors' => $errors,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Bulk import failed: ' . $e->getMessage(),
                'errors' => $errors,
            ], 500);
        }
    }

    protected function authorizeTrade($user, Trade $trade): void
    {
        if ($trade->user_id !== $user->id) {
            abort(403, 'Unauthorized access to trade record.');
        }
    }
}
