<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTradeRequest;
use App\Http\Requests\UpdateTradeRequest;
use App\Models\Trade;
use App\Models\TradeJournal;
use App\Models\TradeOrder;
use App\Models\TradeScreenshot;
use App\Services\TradingCalculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TradeController extends Controller
{
    public function __construct(
        protected TradingCalculationService $calcService,
        protected \App\Services\OrderScreenshotParserService $screenshotParserService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $account = $user->defaultAccount;

        $query = Trade::where('user_id', $user->id)
            ->with(['journal', 'screenshots', 'orders']);

        if ($request->filled('trading_account_id')) {
            $query->where('trading_account_id', $request->trading_account_id);
        } elseif ($account) {
            $query->where('trading_account_id', $account->id);
        }

        // Filters
        if ($request->filled('status') && $request->status !== 'ALL') {
            if ($request->status === 'OPEN_OR_PARTIAL') {
                $query->whereIn('status', ['OPEN', 'PARTIALLY_CLOSED']);
            } else {
                $query->where('status', $request->status);
            }
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

        $isAll = $request->boolean('all') || $request->input('per_page') === 'all' || (int) $request->input('per_page') === -1;

        if ($isAll) {
            $totalCount = (clone $query)->count();
            $trades = $query->with('journal')->paginate(max(1, $totalCount));
        } else {
            $rawPerPage = (int) $request->input('per_page', 15);
            $perPage = $rawPerPage > 0 ? min($rawPerPage, 100000) : 15;
            $trades = $query->with('journal')->paginate($perPage);
        }

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

        $status = $data['status'] ?? null;
        $isOpen = ($status === 'OPEN') || (
            empty($data['exit_premium']) &&
            empty($data['ce_exit_price']) &&
            empty($data['pe_exit_price']) &&
            empty($data['net_pnl_manual']) &&
            empty($data['gross_profit']) &&
            empty($data['gross_loss'])
        );

        $rates = \App\Models\BrokerageSetting::forUser($user->id);
        $exchange = in_array(strtoupper($data['index_name']), ['SENSEX', 'BANKEX']) ? 'BSE' : ($rates['default_exchange'] ?? 'NSE');

        $quantity = (int) ($data['quantity'] ?? 0);
        $lots = (int) ($data['lots'] ?? 1);
        $entryPremium = isset($data['entry_premium']) && is_numeric($data['entry_premium']) ? (float) $data['entry_premium'] : null;
        $exitPremium = isset($data['exit_premium']) && is_numeric($data['exit_premium']) ? (float) $data['exit_premium'] : null;

        if ($isOpen) {
            $status = 'OPEN';
            $openQuantity = $quantity;
            $avgEntryPrice = $entryPremium;
            $avgExitPrice = null;
            $exitDate = null;
            $exitPremium = null;
            $grossProfit = 0.00;
            $grossLoss = 0.00;

            if (empty($data['brokerage']) && empty($data['total_charges'])) {
                $orderCharges = $this->calcService->estimateSingleOrderCharges('BUY', (float) $avgEntryPrice, $openQuantity, $exchange, $rates);
                $brokerage = $orderCharges['brokerage'];
                $stt = $orderCharges['stt'];
                $exchangeCharges = $orderCharges['exchange_charges'];
                $gst = $orderCharges['gst'];
                $sebiCharges = $orderCharges['sebi_charges'];
                $stampDuty = $orderCharges['stamp_duty'];
                $otherCharges = (float) ($data['other_charges'] ?? 0);
                $totalCharges = round($brokerage + $stt + $exchangeCharges + $gst + $sebiCharges + $stampDuty + $otherCharges, 2);
            } else {
                $brokerage = (float) ($data['brokerage'] ?? 0);
                $stt = (float) ($data['stt'] ?? 0);
                $exchangeCharges = (float) ($data['exchange_charges'] ?? 0);
                $gst = (float) ($data['gst'] ?? 0);
                $sebiCharges = (float) ($data['sebi_charges'] ?? 0);
                $stampDuty = (float) ($data['stamp_duty'] ?? 0);
                $otherCharges = (float) ($data['other_charges'] ?? 0);
                $totalCharges = (float) ($data['total_charges'] ?? 0);
            }
            $netPnl = round(-$totalCharges, 2);
        } else {
            $status = $status ?: 'CLOSED';
            $openQuantity = 0;
            $avgEntryPrice = $entryPremium;
            $avgExitPrice = $exitPremium;
            $exitDate = $data['exit_date'] ?? $data['trade_date'];
            $calculated = $this->calcService->calculate($data);
            $grossProfit = $calculated['gross_profit'];
            $grossLoss = $calculated['gross_loss'];
            $brokerage = $calculated['brokerage'];
            $stt = $calculated['stt'];
            $exchangeCharges = $calculated['exchange_charges'];
            $gst = $calculated['gst'];
            $sebiCharges = $calculated['sebi_charges'];
            $stampDuty = $calculated['stamp_duty'];
            $otherCharges = $calculated['other_charges'];
            $totalCharges = $calculated['total_charges'];
            $netPnl = $calculated['net_pnl'];
        }

        $trade = DB::transaction(function () use (
            $user, $accountId, $data, $status, $openQuantity, $avgEntryPrice, $avgExitPrice,
            $exitDate, $exitPremium, $grossProfit, $grossLoss, $brokerage, $stt, $exchangeCharges,
            $gst, $sebiCharges, $stampDuty, $otherCharges, $totalCharges, $netPnl, $isOpen, $exchange, $rates
        ) {
            $trade = Trade::create([
                'user_id' => $user->id,
                'trading_account_id' => $accountId,
                'trade_date' => $data['trade_date'],
                'exit_date' => $exitDate,
                'status' => $status,
                'index_name' => $data['index_name'],
                'trading_type' => $data['trading_type'],
                'strategy_name' => $data['strategy_name'],
                'option_type' => $data['option_type'],
                'strike_price' => $data['strike_price'] ?? null,
                'expiry_date' => $data['expiry_date'] ?? null,
                'ce_entry_price' => $data['ce_entry_price'] ?? null,
                'pe_entry_price' => $data['pe_entry_price'] ?? null,
                'entry_premium' => $avgEntryPrice,
                'ce_exit_price' => $data['ce_exit_price'] ?? null,
                'pe_exit_price' => $data['pe_exit_price'] ?? null,
                'exit_premium' => $exitPremium,
                'avg_entry_price' => $avgEntryPrice,
                'avg_exit_price' => $avgExitPrice,
                'quantity' => $data['quantity'] ?? null,
                'open_quantity' => $openQuantity,
                'lots' => $data['lots'] ?? 1,
                'gross_profit' => $grossProfit,
                'gross_loss' => $grossLoss,
                'brokerage' => $brokerage,
                'stt' => $stt,
                'exchange_charges' => $exchangeCharges,
                'gst' => $gst,
                'sebi_charges' => $sebiCharges,
                'stamp_duty' => $stampDuty,
                'other_charges' => $otherCharges,
                'total_charges' => $totalCharges,
                'net_pnl' => $netPnl,
                'entry_reason' => $data['entry_reason'] ?? null,
                'exit_reason' => $data['exit_reason'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            // Create initial order executions
            if ($isOpen) {
                $trade->orders()->create([
                    'user_id' => $user->id,
                    'order_type' => 'BUY',
                    'quantity' => $trade->quantity,
                    'lots' => $trade->lots ?? 1,
                    'price' => $trade->avg_entry_price ?? $trade->entry_premium ?? 0,
                    'order_date' => $trade->trade_date,
                    'order_time' => now()->format('H:i:s'),
                    'brokerage' => $trade->brokerage,
                    'stt' => $trade->stt,
                    'exchange_charges' => $trade->exchange_charges,
                    'gst' => $trade->gst,
                    'sebi_charges' => $trade->sebi_charges,
                    'stamp_duty' => $trade->stamp_duty,
                    'other_charges' => $trade->other_charges,
                    'total_charges' => $trade->total_charges,
                    'realized_pnl' => 0.00,
                    'notes' => $trade->entry_reason ?: 'Initial Buy Order',
                ]);
            } else {
                $buyCharges = $this->calcService->estimateSingleOrderCharges('BUY', (float) ($trade->entry_premium ?? 0), (int) ($trade->quantity ?? 0), $exchange, $rates);
                $trade->orders()->create([
                    'user_id' => $user->id,
                    'order_type' => 'BUY',
                    'quantity' => $trade->quantity,
                    'lots' => $trade->lots ?? 1,
                    'price' => $trade->entry_premium ?? 0,
                    'order_date' => $trade->trade_date,
                    'order_time' => '09:15:00',
                    'brokerage' => $buyCharges['brokerage'],
                    'stt' => $buyCharges['stt'],
                    'exchange_charges' => $buyCharges['exchange_charges'],
                    'gst' => $buyCharges['gst'],
                    'sebi_charges' => $buyCharges['sebi_charges'],
                    'stamp_duty' => $buyCharges['stamp_duty'],
                    'other_charges' => 0.00,
                    'total_charges' => $buyCharges['total_charges'],
                    'realized_pnl' => 0.00,
                    'notes' => $trade->entry_reason ?: 'Buy Order',
                ]);

                $sellCharges = $this->calcService->estimateSingleOrderCharges('SELL', (float) ($trade->exit_premium ?? 0), (int) ($trade->quantity ?? 0), $exchange, $rates);
                $trade->orders()->create([
                    'user_id' => $user->id,
                    'order_type' => 'SELL',
                    'quantity' => $trade->quantity,
                    'lots' => $trade->lots ?? 1,
                    'price' => $trade->exit_premium ?? 0,
                    'order_date' => $trade->exit_date ?? $trade->trade_date,
                    'order_time' => '15:20:00',
                    'brokerage' => $sellCharges['brokerage'],
                    'stt' => $sellCharges['stt'],
                    'exchange_charges' => $sellCharges['exchange_charges'],
                    'gst' => $sellCharges['gst'],
                    'sebi_charges' => $sellCharges['sebi_charges'],
                    'stamp_duty' => $sellCharges['stamp_duty'],
                    'other_charges' => 0.00,
                    'total_charges' => $sellCharges['total_charges'],
                    'realized_pnl' => round(((float) $trade->exit_premium - (float) $trade->entry_premium) * (int) $trade->quantity, 2),
                    'notes' => $trade->exit_reason ?: 'Exit Order',
                ]);
            }

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
            'trade' => $trade->fresh()->load(['journal', 'screenshots', 'orders']),
        ], 201);
    }

    public function show(Request $request, Trade $trade): JsonResponse
    {
        $this->authorizeTrade($request->user(), $trade);

        return response()->json($trade->load(['journal', 'screenshots', 'orders']));
    }

    public function update(UpdateTradeRequest $request, Trade $trade): JsonResponse
    {
        $this->authorizeTrade($request->user(), $trade);

        $data = $request->validated();

        // Merge current attributes with updated data for calculation
        $mergedForCalc = array_merge($trade->toArray(), $data);

        $isOpen = (($data['status'] ?? $trade->status) === 'OPEN') || (
            empty($data['exit_premium']) &&
            empty($trade->exit_premium) &&
            empty($data['ce_exit_price']) &&
            empty($trade->ce_exit_price) &&
            empty($data['pe_exit_price']) &&
            empty($trade->pe_exit_price)
        );

        if ($isOpen) {
            $mergedForCalc['status'] = 'OPEN';
            $mergedForCalc['exit_premium'] = null;
            $data['status'] = 'OPEN';
            $data['exit_date'] = null;
            $data['exit_premium'] = null;
            $data['open_quantity'] = (int) ($data['quantity'] ?? $trade->quantity);
        }

        $calculated = $this->calcService->calculate($mergedForCalc);

        DB::transaction(function () use ($trade, $data, $calculated, $isOpen) {
            $trade->update(array_merge($data, [
                'status' => $isOpen ? 'OPEN' : ($data['status'] ?? $trade->status),
                'open_quantity' => $isOpen ? ((int) ($data['quantity'] ?? $trade->quantity)) : ($data['open_quantity'] ?? $trade->open_quantity),
                'gross_profit' => $isOpen ? 0.00 : $calculated['gross_profit'],
                'gross_loss' => $isOpen ? 0.00 : $calculated['gross_loss'],
                'brokerage' => $calculated['brokerage'],
                'stt' => $calculated['stt'],
                'exchange_charges' => $calculated['exchange_charges'],
                'gst' => $calculated['gst'],
                'sebi_charges' => $calculated['sebi_charges'],
                'stamp_duty' => $calculated['stamp_duty'],
                'other_charges' => $calculated['other_charges'],
                'total_charges' => $calculated['total_charges'],
                'net_pnl' => $isOpen ? round(-$calculated['total_charges'], 2) : $calculated['net_pnl'],
            ]));

            // If trade has orders and is OPEN, sync the initial BUY order
            if ($isOpen && $trade->orders()->count() === 1) {
                $firstOrder = $trade->orders()->first();
                if ($firstOrder && $firstOrder->order_type === 'BUY') {
                    $firstOrder->update([
                        'quantity' => $trade->quantity,
                        'price' => $trade->entry_premium ?? $firstOrder->price,
                        'lots' => $trade->lots ?? 1,
                        'brokerage' => $trade->brokerage,
                        'stt' => $trade->stt,
                        'exchange_charges' => $trade->exchange_charges,
                        'gst' => $trade->gst,
                        'sebi_charges' => $trade->sebi_charges,
                        'stamp_duty' => $trade->stamp_duty,
                        'total_charges' => $trade->total_charges,
                    ]);
                }
            }

            if ($trade->orders()->exists()) {
                $this->recalculateTradeFromOrders($trade);
            }

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
        $totalNetPnl = (float) $query->sum('net_pnl');

        return response()->json([
            'ids' => $ids,
            'count' => count($ids),
            'total_net_pnl' => round($totalNetPnl, 2),
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

        // Check if position is open (pending exit)
        $status = $request->input('status');
        $isOpen = $request->boolean('isOpen') || $status === 'OPEN' || ($entry > 0 && empty($exit) && empty($request->input('ce_exit_price')) && empty($request->input('pe_exit_price')));

        if ($isOpen) {
            $exit = 0.0;
        }

        // Executed orders:
        // Open position: 1 order for single leg (Buy only); 2 orders for Both (CE buy + PE buy)
        // Closed position: 2 orders for single leg (Buy + Sell); 4 orders for Both (CE buy/sell + PE buy/sell)
        $defaultOrders = $isOpen ? ($optionType === 'Both' ? 2 : 1) : ($optionType === 'Both' ? 4 : 2);
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
            $rates,
            $isOpen
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

    public function addOrder(Request $request, Trade $trade): JsonResponse
    {
        $this->authorizeTrade($request->user(), $trade);

        $validated = $request->validate([
            'order_type' => ['required', 'string', 'in:BUY,SELL'],
            'quantity' => ['required', 'integer', 'min:1'],
            'price' => ['required', 'numeric', 'min:0'],
            'order_date' => ['nullable', 'date'],
            'order_time' => ['nullable', 'string', 'max:20'],
            'lots' => ['nullable', 'integer', 'min:1'],
            'notes' => ['nullable', 'string', 'max:500'],
            'total_charges' => ['nullable', 'numeric', 'min:0'],
            'brokerage' => ['nullable', 'numeric', 'min:0'],
            'stt' => ['nullable', 'numeric', 'min:0'],
            'exchange_charges' => ['nullable', 'numeric', 'min:0'],
            'gst' => ['nullable', 'numeric', 'min:0'],
            'sebi_charges' => ['nullable', 'numeric', 'min:0'],
            'stamp_duty' => ['nullable', 'numeric', 'min:0'],
            'other_charges' => ['nullable', 'numeric', 'min:0'],
        ]);

        $side = strtoupper($validated['order_type']);
        $quantity = (int) $validated['quantity'];
        $price = (float) $validated['price'];

        // If SELL: check that quantity doesn't exceed open_quantity
        if ($side === 'SELL') {
            $currentOpen = (int) ($trade->open_quantity ?? $trade->quantity);
            if ($quantity > $currentOpen) {
                return response()->json([
                    'message' => "Exit quantity ({$quantity}) exceeds currently open position ({$currentOpen} Qty).",
                ], 422);
            }
        }

        $user = $request->user();
        $rates = \App\Models\BrokerageSetting::forUser($user->id);
        $exchange = in_array(strtoupper($trade->index_name), ['SENSEX', 'BANKEX']) ? 'BSE' : ($rates['default_exchange'] ?? 'NSE');

        $autoCharges = $this->calcService->estimateSingleOrderCharges($side, $price, $quantity, $exchange, $rates);

        if ($request->has('total_charges') || $request->has('brokerage')) {
            $brokerage = $request->has('brokerage') ? (float) $validated['brokerage'] : (float) ($autoCharges['brokerage'] ?? 20.0);
            $stt = $request->has('stt') ? (float) $validated['stt'] : (float) ($autoCharges['stt'] ?? 0.0);
            $exchangeCharges = $request->has('exchange_charges') ? (float) $validated['exchange_charges'] : (float) ($autoCharges['exchange_charges'] ?? 0.0);
            $gst = $request->has('gst') ? (float) $validated['gst'] : (float) ($autoCharges['gst'] ?? 0.0);
            $sebiCharges = $request->has('sebi_charges') ? (float) $validated['sebi_charges'] : (float) ($autoCharges['sebi_charges'] ?? 0.0);
            $stampDuty = $request->has('stamp_duty') ? (float) $validated['stamp_duty'] : (float) ($autoCharges['stamp_duty'] ?? 0.0);
            $otherCharges = $request->has('other_charges') ? (float) $validated['other_charges'] : 0.0;

            if ($request->has('total_charges')) {
                $totalCharges = (float) $validated['total_charges'];
                $sumOfParts = round($brokerage + $stt + $exchangeCharges + $gst + $sebiCharges + $stampDuty + $otherCharges, 2);
                if (abs($totalCharges - $sumOfParts) > 0.01) {
                    $otherCharges = round($otherCharges + ($totalCharges - $sumOfParts), 2);
                }
            } else {
                $totalCharges = round($brokerage + $stt + $exchangeCharges + $gst + $sebiCharges + $stampDuty + $otherCharges, 2);
            }

            $charges = [
                'brokerage' => $brokerage,
                'stt' => $stt,
                'exchange_charges' => $exchangeCharges,
                'gst' => $gst,
                'sebi_charges' => $sebiCharges,
                'stamp_duty' => $stampDuty,
                'other_charges' => $otherCharges,
                'total_charges' => $totalCharges,
            ];
        } else {
            $charges = $autoCharges;
            $charges['other_charges'] = 0.0;
        }

        $order = DB::transaction(function () use ($user, $trade, $side, $quantity, $price, $validated, $charges) {
            $orderDate = $validated['order_date'] ?? now()->format('Y-m-d');
            $orderTime = $validated['order_time'] ?? now()->format('H:i:s');

            $costPrice = (float) ($trade->avg_entry_price ?: $trade->entry_premium ?: 0);
            $realizedPnl = $side === 'SELL' ? round(($price - $costPrice) * $quantity, 2) : 0.00;

            $createdOrder = $trade->orders()->create([
                'user_id' => $user->id,
                'order_type' => $side,
                'quantity' => $quantity,
                'lots' => $validated['lots'] ?? max(1, (int) round($quantity / max(1, $trade->lots > 0 ? ($trade->quantity / $trade->lots) : 1))),
                'price' => $price,
                'order_date' => $orderDate,
                'order_time' => $orderTime,
                'brokerage' => $charges['brokerage'],
                'stt' => $charges['stt'],
                'exchange_charges' => $charges['exchange_charges'],
                'gst' => $charges['gst'],
                'sebi_charges' => $charges['sebi_charges'],
                'stamp_duty' => $charges['stamp_duty'],
                'other_charges' => $charges['other_charges'] ?? 0.00,
                'total_charges' => $charges['total_charges'],
                'realized_pnl' => $realizedPnl,
                'notes' => $validated['notes'] ?? null,
            ]);

            $this->recalculateTradeFromOrders($trade);

            return $createdOrder;
        });

        return response()->json([
            'message' => 'Order executed successfully',
            'order' => $order,
            'trade' => $trade->fresh()->load(['journal', 'screenshots', 'orders']),
        ], 201);
    }

    public function updateOrder(Request $request, Trade $trade, TradeOrder $order): JsonResponse
    {
        $this->authorizeTrade($request->user(), $trade);

        if ($order->trade_id !== $trade->id) {
            return response()->json(['message' => 'Order does not belong to this trade.'], 404);
        }

        $validated = $request->validate([
            'quantity' => ['required', 'integer', 'min:1'],
            'price' => ['required', 'numeric', 'min:0'],
            'order_date' => ['nullable', 'date'],
            'order_time' => ['nullable', 'string', 'max:20'],
            'notes' => ['nullable', 'string', 'max:500'],
            'total_charges' => ['nullable', 'numeric', 'min:0'],
            'brokerage' => ['nullable', 'numeric', 'min:0'],
            'stt' => ['nullable', 'numeric', 'min:0'],
            'exchange_charges' => ['nullable', 'numeric', 'min:0'],
            'gst' => ['nullable', 'numeric', 'min:0'],
            'sebi_charges' => ['nullable', 'numeric', 'min:0'],
            'stamp_duty' => ['nullable', 'numeric', 'min:0'],
            'other_charges' => ['nullable', 'numeric', 'min:0'],
        ]);

        $quantity = (int) $validated['quantity'];
        $price = (float) $validated['price'];

        // If SELL: verify that new quantity doesn't exceed open_quantity + this order's quantity
        if ($order->order_type === 'SELL') {
            $maxSellable = (int) ($trade->open_quantity ?? 0) + (int) $order->quantity;
            if ($quantity > $maxSellable) {
                return response()->json([
                    'message' => "Exit quantity ({$quantity}) exceeds max permissible quantity ({$maxSellable} Qty).",
                ], 422);
            }
        } else {
            // BUY order: ensure reducing buy quantity doesn't drop below already sold quantity
            $soldQty = (int) $trade->orders()->where('order_type', 'SELL')->sum('quantity');
            $otherBuyQty = (int) $trade->orders()->where('order_type', 'BUY')->where('id', '!=', $order->id)->sum('quantity');
            $newTotalBuyQty = $otherBuyQty + $quantity;
            if ($newTotalBuyQty < $soldQty) {
                return response()->json([
                    'message' => "Total buy quantity ({$newTotalBuyQty}) cannot be less than already executed exits ({$soldQty} Qty).",
                ], 422);
            }
        }

        $user = $request->user();
        $rates = \App\Models\BrokerageSetting::forUser($user->id);
        $exchange = in_array(strtoupper($trade->index_name), ['SENSEX', 'BANKEX']) ? 'BSE' : ($rates['default_exchange'] ?? 'NSE');

        $autoCharges = $this->calcService->estimateSingleOrderCharges($order->order_type, $price, $quantity, $exchange, $rates);

        if ($request->has('total_charges') || $request->has('brokerage')) {
            $brokerage = $request->has('brokerage') ? (float) $validated['brokerage'] : (float) ($autoCharges['brokerage'] ?? 20.0);
            $stt = $request->has('stt') ? (float) $validated['stt'] : (float) ($autoCharges['stt'] ?? 0.0);
            $exchangeCharges = $request->has('exchange_charges') ? (float) $validated['exchange_charges'] : (float) ($autoCharges['exchange_charges'] ?? 0.0);
            $gst = $request->has('gst') ? (float) $validated['gst'] : (float) ($autoCharges['gst'] ?? 0.0);
            $sebiCharges = $request->has('sebi_charges') ? (float) $validated['sebi_charges'] : (float) ($autoCharges['sebi_charges'] ?? 0.0);
            $stampDuty = $request->has('stamp_duty') ? (float) $validated['stamp_duty'] : (float) ($autoCharges['stamp_duty'] ?? 0.0);
            $otherCharges = $request->has('other_charges') ? (float) $validated['other_charges'] : (float) ($order->other_charges ?? 0.0);

            if ($request->has('total_charges')) {
                $totalCharges = (float) $validated['total_charges'];
                $sumOfParts = round($brokerage + $stt + $exchangeCharges + $gst + $sebiCharges + $stampDuty + $otherCharges, 2);
                if (abs($totalCharges - $sumOfParts) > 0.01) {
                    $otherCharges = round($otherCharges + ($totalCharges - $sumOfParts), 2);
                }
            } else {
                $totalCharges = round($brokerage + $stt + $exchangeCharges + $gst + $sebiCharges + $stampDuty + $otherCharges, 2);
            }

            $charges = [
                'brokerage' => $brokerage,
                'stt' => $stt,
                'exchange_charges' => $exchangeCharges,
                'gst' => $gst,
                'sebi_charges' => $sebiCharges,
                'stamp_duty' => $stampDuty,
                'other_charges' => $otherCharges,
                'total_charges' => $totalCharges,
            ];
        } else {
            $charges = $autoCharges;
            $charges['other_charges'] = (float) ($order->other_charges ?? 0.0);
        }

        DB::transaction(function () use ($trade, $order, $quantity, $price, $validated, $charges) {
            $lotSize = max(1, $trade->lots > 0 ? (int) round($trade->quantity / $trade->lots) : 1);
            $lots = max(1, (int) round($quantity / $lotSize));

            $order->update([
                'quantity' => $quantity,
                'lots' => $lots,
                'price' => $price,
                'order_date' => $validated['order_date'] ?? $order->order_date,
                'order_time' => $validated['order_time'] ?? $order->order_time,
                'brokerage' => $charges['brokerage'],
                'stt' => $charges['stt'],
                'exchange_charges' => $charges['exchange_charges'],
                'gst' => $charges['gst'],
                'sebi_charges' => $charges['sebi_charges'],
                'stamp_duty' => $charges['stamp_duty'],
                'other_charges' => $charges['other_charges'] ?? 0.00,
                'total_charges' => $charges['total_charges'],
                'notes' => array_key_exists('notes', $validated) ? $validated['notes'] : $order->notes,
            ]);

            $this->recalculateTradeFromOrders($trade);
        });

        return response()->json([
            'message' => 'Order updated successfully',
            'order' => $order->fresh(),
            'trade' => $trade->fresh()->load(['journal', 'screenshots', 'orders']),
        ]);
    }

    public function destroyOrder(Request $request, Trade $trade, TradeOrder $order): JsonResponse
    {
        $this->authorizeTrade($request->user(), $trade);

        if ($order->trade_id !== $trade->id) {
            return response()->json(['message' => 'Order does not belong to this trade.'], 404);
        }

        // Don't allow deleting the only order of an open trade if it leaves 0 orders
        if ($trade->orders()->count() <= 1) {
            return response()->json(['message' => 'Cannot delete the initial order. You can delete the entire trade instead.'], 422);
        }

        DB::transaction(function () use ($trade, $order) {
            $order->delete();
            $this->recalculateTradeFromOrders($trade);
        });

        return response()->json([
            'message' => 'Order deleted successfully',
            'trade' => $trade->fresh()->load(['journal', 'screenshots', 'orders']),
        ]);
    }

    public function recalculateTradeFromOrders(Trade $trade): Trade
    {
        $allOrders = $trade->orders()->orderBy('order_date', 'asc')->orderBy('id', 'asc')->get();
        if ($allOrders->isEmpty()) {
            return $trade;
        }

        $buyOrders = $allOrders->where('order_type', 'BUY');
        $sellOrders = $allOrders->where('order_type', 'SELL');

        $totalBuyQty = (int) $buyOrders->sum('quantity');
        $totalBuyCost = 0.0;
        foreach ($buyOrders as $bo) {
            $totalBuyCost += (float) $bo->price * (int) $bo->quantity;
        }
        $avgEntryPrice = $totalBuyQty > 0 ? round($totalBuyCost / $totalBuyQty, 2) : (float) ($trade->entry_premium ?? 0);

        $totalSellQty = (int) $sellOrders->sum('quantity');
        $totalSellProceeds = 0.0;
        foreach ($sellOrders as $so) {
            $totalSellProceeds += (float) $so->price * (int) $so->quantity;
        }
        $avgExitPrice = $totalSellQty > 0 ? round($totalSellProceeds / $totalSellQty, 2) : null;

        $openQty = max(0, $totalBuyQty - $totalSellQty);

        if ($totalSellQty === 0) {
            $status = 'OPEN';
        } elseif ($openQty === 0) {
            $status = 'CLOSED';
        } else {
            $status = 'PARTIALLY_CLOSED';
        }

        // Realized P&L from sell orders against avg entry
        $totalRealizedPnl = 0.0;
        foreach ($sellOrders as $so) {
            $pnl = round(((float) $so->price - $avgEntryPrice) * (int) $so->quantity, 2);
            $totalRealizedPnl += $pnl;
            if ((float) $so->realized_pnl !== $pnl) {
                $so->update(['realized_pnl' => $pnl]);
            }
        }
        $totalRealizedPnl = round($totalRealizedPnl, 2);
        $grossProfit = $totalRealizedPnl >= 0 ? $totalRealizedPnl : 0.00;
        $grossLoss = $totalRealizedPnl < 0 ? abs($totalRealizedPnl) : 0.00;

        $brokerage = round((float) $allOrders->sum('brokerage'), 2);
        $stt = round((float) $allOrders->sum('stt'), 2);
        $exchangeCharges = round((float) $allOrders->sum('exchange_charges'), 2);
        $gst = round((float) $allOrders->sum('gst'), 2);
        $sebiCharges = round((float) $allOrders->sum('sebi_charges'), 2);
        $stampDuty = round((float) $allOrders->sum('stamp_duty'), 2);
        $otherCharges = round((float) $allOrders->sum('other_charges'), 2);
        $sumOfParts = round($brokerage + $stt + $exchangeCharges + $gst + $sebiCharges + $stampDuty + $otherCharges, 2);
        $sumOfTotals = round((float) $allOrders->sum('total_charges'), 2);
        $totalCharges = $sumOfTotals > 0 ? $sumOfTotals : $sumOfParts;
        if (abs($totalCharges - $sumOfParts) > 0.01) {
            $otherCharges = round($otherCharges + ($totalCharges - $sumOfParts), 2);
        }

        $netPnl = round($grossProfit - $grossLoss - $totalCharges, 2);

        $latestSell = $sellOrders->sortByDesc('order_date')->first();

        $trade->update([
            'status' => $status,
            'quantity' => $totalBuyQty > 0 ? $totalBuyQty : $trade->quantity,
            'open_quantity' => $openQty,
            'avg_entry_price' => $avgEntryPrice,
            'avg_exit_price' => $avgExitPrice,
            'entry_premium' => $avgEntryPrice,
            'exit_premium' => $avgExitPrice,
            'exit_date' => $status === 'CLOSED' ? ($latestSell?->order_date ?? now()->format('Y-m-d')) : null,
            'gross_profit' => $grossProfit,
            'gross_loss' => $grossLoss,
            'brokerage' => $brokerage,
            'stt' => $stt,
            'exchange_charges' => $exchangeCharges,
            'gst' => $gst,
            'sebi_charges' => $sebiCharges,
            'stamp_duty' => $stampDuty,
            'other_charges' => $otherCharges,
            'total_charges' => $totalCharges,
            'net_pnl' => $netPnl,
        ]);

        return $trade;
    }

    protected function authorizeTrade($user, Trade $trade): void
    {
        if ($trade->user_id !== $user->id) {
            abort(403, 'Unauthorized access to trade record.');
        }
    }

    public function parseScreenshot(Request $request): JsonResponse
    {
        $request->validate([
            'screenshot' => 'required|file|image|max:10240',
        ]);

        try {
            $result = $this->screenshotParserService->parseScreenshot(
                $request->file('screenshot'),
                $request->user()
            );

            return response()->json($result);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to parse screenshot: ' . $e->getMessage(),
            ], 422);
        }
    }

    public function importScreenshotOrders(Request $request): JsonResponse
    {
        $request->validate([
            'orders' => 'required|array|min:1',
            'trade_date' => 'required|date',
            'import_mode' => 'nullable|string|in:smart,individual',
            'trading_account_id' => 'nullable|integer',
        ]);

        try {
            $result = $this->screenshotParserService->importOrders(
                $request->user(),
                $request->input('orders'),
                $request->input('trade_date'),
                $request->input('trading_account_id'),
                $request->input('import_mode', 'smart')
            );

            return response()->json($result);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to import orders: ' . $e->getMessage(),
            ], 422);
        }
    }
}
