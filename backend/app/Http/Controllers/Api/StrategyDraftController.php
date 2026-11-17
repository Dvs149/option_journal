<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StrategyDraft;
use App\Models\Trade;
use App\Models\TradeOrder;
use App\Services\TradingCalculationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StrategyDraftController extends Controller
{
    public function __construct(
        protected TradingCalculationService $calculationService
    ) {}

    /**
     * List all strategy drafts for authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $query = StrategyDraft::where('user_id', $userId);

        if ($request->has('portfolio')) {
            $query->where('portfolio_name', $request->query('portfolio'));
        }

        if ($request->has('underlying')) {
            $query->where('underlying', $request->query('underlying'));
        }

        $drafts = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $drafts,
        ]);
    }

    /**
     * Get Portfolios summary list (Total P&L, Unbooked P&L, Booked P&L, Strategies Count).
     */
    public function portfolios(Request $request): JsonResponse
    {
        $userId = $request->user()->id;
        $drafts = StrategyDraft::where('user_id', $userId)->get();

        $portfolios = [];
        foreach ($drafts as $draft) {
            $pName = $draft->portfolio_name ?: 'Default Portfolio';
            if (!isset($portfolios[$pName])) {
                $portfolios[$pName] = [
                    'name' => $pName,
                    'strategy_count' => 0,
                    'legs_count' => 0,
                    'underlyings' => [],
                    'total_pnl' => 0.0,
                    'booked_pnl' => 0.0,
                    'unbooked_pnl' => 0.0,
                    'created_at' => $draft->created_at,
                    'updated_at' => $draft->updated_at,
                ];
            }

            $portfolios[$pName]['strategy_count']++;
            if (!in_array($draft->underlying, $portfolios[$pName]['underlyings'])) {
                $portfolios[$pName]['underlyings'][] = $draft->underlying;
            }

            $legs = is_array($draft->legs) ? $draft->legs : [];
            $portfolios[$pName]['legs_count'] += count($legs);

            foreach ($legs as $leg) {
                $isBuy = strtoupper($leg['side'] ?? 'BUY') === 'BUY';
                $qty = (int) (($leg['lots'] ?? 1) * ($leg['lotSize'] ?? 25));
                $entry = (float) ($leg['entryPrice'] ?? $leg['ltp'] ?? 0);
                $ltp = (float) ($leg['ltp'] ?? $entry);
                $pnl = $isBuy ? ($ltp - $entry) * $qty : ($entry - $ltp) * $qty;
                $booked = (float) ($leg['bookedPnL'] ?? 0);

                $portfolios[$pName]['unbooked_pnl'] += $pnl;
                $portfolios[$pName]['booked_pnl'] += $booked;
                $portfolios[$pName]['total_pnl'] += ($pnl + $booked);
            }
        }

        return response()->json([
            'success' => true,
            'data' => array_values($portfolios),
        ]);
    }

    /**
     * Store new strategy draft.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'portfolio_name' => 'nullable|string|max:255',
            'strategy_name' => 'required|string|max:255',
            'underlying' => 'required|string|max:100',
            'target_price' => 'nullable|numeric',
            'target_date' => 'nullable|string|max:50',
            'iv_adjustment' => 'nullable|numeric',
            'legs' => 'required|array|min:1',
            'notes' => 'nullable|string',
        ]);

        $draft = StrategyDraft::create([
            'user_id' => $request->user()->id,
            'portfolio_name' => $validated['portfolio_name'] ?? 'Default Portfolio',
            'strategy_name' => $validated['strategy_name'],
            'underlying' => strtoupper($validated['underlying']),
            'target_price' => $validated['target_price'] ?? null,
            'target_date' => $validated['target_date'] ?? null,
            'iv_adjustment' => $validated['iv_adjustment'] ?? 0.0,
            'legs' => $validated['legs'],
            'notes' => $validated['notes'] ?? null,
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Strategy draft saved successfully',
            'data' => $draft,
        ], 201);
    }

    /**
     * Show single strategy draft.
     */
    public function show(Request $request, StrategyDraft $strategyDraft): JsonResponse
    {
        if ($strategyDraft->user_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $strategyDraft,
        ]);
    }

    /**
     * Update existing strategy draft.
     */
    public function update(Request $request, StrategyDraft $strategyDraft): JsonResponse
    {
        if ($strategyDraft->user_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'portfolio_name' => 'nullable|string|max:255',
            'strategy_name' => 'sometimes|required|string|max:255',
            'underlying' => 'sometimes|required|string|max:100',
            'target_price' => 'nullable|numeric',
            'target_date' => 'nullable|string|max:50',
            'iv_adjustment' => 'nullable|numeric',
            'legs' => 'sometimes|required|array|min:1',
            'notes' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $strategyDraft->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Strategy draft updated successfully',
            'data' => $strategyDraft,
        ]);
    }

    /**
     * Delete strategy draft.
     */
    public function destroy(Request $request, StrategyDraft $strategyDraft): JsonResponse
    {
        if ($strategyDraft->user_id !== $request->user()->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $strategyDraft->delete();

        return response()->json([
            'success' => true,
            'message' => 'Strategy draft deleted successfully',
        ]);
    }

    /**
     * Convert strategy draft legs to real executed trades in TradeJournal.
     */
    public function convertToTrade(Request $request, StrategyDraft $strategyDraft): JsonResponse
    {
        $user = $request->user();
        if ($strategyDraft->user_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $legs = is_array($strategyDraft->legs) ? $strategyDraft->legs : [];
        if (empty($legs)) {
            return response()->json(['success' => false, 'message' => 'No legs found in this strategy to convert'], 422);
        }

        $today = Carbon::today()->toDateString();
        $nowTime = Carbon::now()->toTimeString();
        $createdTrades = [];

        DB::beginTransaction();
        try {
            foreach ($legs as $leg) {
                if (isset($leg['isActive']) && $leg['isActive'] === false) {
                    continue;
                }

                $side = strtoupper($leg['side'] ?? 'BUY');
                $type = strtoupper($leg['type'] ?? 'CE');
                $strike = (float) ($leg['strike'] ?? 0);
                $lots = (int) ($leg['lots'] ?? 1);
                $lotSize = (int) ($leg['lotSize'] ?? 25);
                $quantity = $lots * $lotSize;
                $entryPrice = (float) ($leg['entryPrice'] ?? $leg['ltp'] ?? 100);
                $expiryDate = !empty($leg['expiry']) ? Carbon::parse($leg['expiry'])->toDateString() : $today;

                // Create main trade
                $trade = Trade::create([
                    'user_id' => $user->id,
                    'trade_date' => $today,
                    'index_name' => $strategyDraft->underlying,
                    'trading_type' => 'Options',
                    'status' => 'OPEN',
                    'strategy_name' => $strategyDraft->strategy_name ?: 'Strategy Builder',
                    'option_type' => $type === 'FUT' ? 'Both' : $type,
                    'strike_price' => $strike,
                    'expiry_date' => $expiryDate,
                    'avg_entry_price' => $entryPrice,
                    'quantity' => $quantity,
                    'lots' => $lots,
                    'open_quantity' => $quantity,
                    'notes' => 'Converted from Strategy Builder Draft: ' . $strategyDraft->strategy_name,
                ]);

                // Create order record for this leg
                $orderType = $side; // BUY or SELL
                $turnover = $quantity * $entryPrice;
                // Calculate charges using TradingCalculationService
                $charges = $this->calculationService->calculateOrderCharges(
                    orderType: $orderType,
                    quantity: $quantity,
                    price: $entryPrice,
                    indexName: $strategyDraft->underlying
                );

                TradeOrder::create([
                    'trade_id' => $trade->id,
                    'user_id' => $user->id,
                    'order_type' => $orderType,
                    'quantity' => $quantity,
                    'lots' => $lots,
                    'price' => $entryPrice,
                    'order_date' => $today,
                    'order_time' => $nowTime,
                    'brokerage' => $charges['brokerage'] ?? 20.0,
                    'stt' => $charges['stt'] ?? 0.0,
                    'exchange_charges' => $charges['exchange_charges'] ?? 0.0,
                    'gst' => $charges['gst'] ?? 0.0,
                    'sebi_charges' => $charges['sebi_charges'] ?? 0.0,
                    'stamp_duty' => $charges['stamp_duty'] ?? 0.0,
                    'other_charges' => 0.0,
                    'total_charges' => $charges['total_charges'] ?? 20.0,
                    'realized_pnl' => 0.0,
                    'notes' => 'Initial execution from Strategy Builder leg: ' . $side . ' ' . $strike . ' ' . $type,
                ]);

                // Recalculate trade totals
                $this->calculationService->recalculateTradePositions($trade);

                $createdTrades[] = $trade->id;
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => count($createdTrades) . ' orders converted to real trades in TradeJournal!',
                'trade_ids' => $createdTrades,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error('Failed to convert strategy draft to trade: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to convert strategy to real trade: ' . $e->getMessage(),
            ], 500);
        }
    }
}
