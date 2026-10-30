<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trade;
use App\Models\TradingStrategy;
use App\Services\TradingAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StrategyController extends Controller
{
    public function __construct(
        protected TradingAnalyticsService $analyticsService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $strategies = TradingStrategy::where('user_id', $user->id)->get();

        $trades = Trade::where('user_id', $user->id)->get();
        $performance = $this->analyticsService->buildStrategyPerformance($trades);

        $bestStrategy = collect($performance)->first();
        $worstStrategy = collect($performance)->last();

        return response()->json([
            'strategies' => $strategies,
            'performance' => $performance,
            'best_performing' => $bestStrategy,
            'worst_performing' => $worstStrategy,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'strategy_name' => ['required', 'string', 'max:100', 'unique:trading_strategies,strategy_name,NULL,id,user_id,' . $request->user()->id],
            'description' => ['nullable', 'string'],
        ]);

        $strategy = TradingStrategy::create([
            'user_id' => $request->user()->id,
            'strategy_name' => $validated['strategy_name'],
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json([
            'message' => 'Strategy created successfully',
            'strategy' => $strategy,
        ], 201);
    }

    public function destroy(Request $request, TradingStrategy $strategy): JsonResponse
    {
        if ($strategy->user_id !== $request->user()->id) {
            abort(403);
        }

        $strategy->delete();

        return response()->json([
            'message' => 'Strategy deleted successfully',
        ]);
    }
}
