<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTradeRequest;
use App\Http\Requests\UpdateTradeRequest;
use App\Models\Trade;
use App\Models\TradeJournal;
use App\Services\TradingCalculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
            ->with('journal');

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

        // Sorting
        $sortBy = $request->input('sort_by', 'trade_date');
        $sortOrder = $request->input('sort_order', 'desc');

        $allowedSorts = ['trade_date', 'net_pnl', 'gross_profit', 'gross_loss', 'total_charges', 'strike_price', 'quantity'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('trade_date', 'desc');
        }

        $query->orderBy('id', 'desc');

        $perPage = min((int) $request->input('per_page', 15), 100);
        $trades = $query->paginate($perPage);

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
                'entry_premium' => $data['entry_premium'] ?? null,
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

        return response()->json([
            'message' => 'Trade recorded successfully',
            'trade' => $trade->load('journal'),
        ], 201);
    }

    public function show(Request $request, Trade $trade): JsonResponse
    {
        $this->authorizeTrade($request->user(), $trade);

        return response()->json($trade->load('journal'));
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

        return response()->json([
            'message' => 'Trade updated successfully',
            'trade' => $trade->fresh()->load('journal'),
        ]);
    }

    public function destroy(Request $request, Trade $trade): JsonResponse
    {
        $this->authorizeTrade($request->user(), $trade);

        $trade->delete();

        return response()->json([
            'message' => 'Trade deleted successfully',
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
        $entry = (float) $request->input('entry_premium', 0);
        $exit = (float) $request->input('exit_premium', 0);
        $qty = (int) $request->input('quantity', 0);

        $estimated = $this->calcService->estimateIndianCharges($entry, $exit, $qty);

        return response()->json($estimated);
    }

    protected function authorizeTrade($user, Trade $trade): void
    {
        if ($trade->user_id !== $user->id) {
            abort(403, 'Unauthorized access to trade record.');
        }
    }
}
