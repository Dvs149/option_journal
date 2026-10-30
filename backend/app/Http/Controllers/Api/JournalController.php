<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trade;
use App\Models\TradeJournal;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JournalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Trade::where('user_id', $user->id)
            ->with('journal')
            ->orderBy('trade_date', 'desc')
            ->orderBy('id', 'desc');

        if ($request->filled('strategy_name') && $request->strategy_name !== 'ALL') {
            $query->where('strategy_name', $request->strategy_name);
        }

        if ($request->filled('option_type') && $request->option_type !== 'ALL') {
            $query->where('option_type', $request->option_type);
        }

        if ($request->filled('outcome')) {
            if ($request->outcome === 'win') {
                $query->where('net_pnl', '>', 0);
            } elseif ($request->outcome === 'loss') {
                $query->where('net_pnl', '<', 0);
            }
        }

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('index_name', 'like', "%{$search}%")
                    ->orWhere('strategy_name', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%")
                    ->orWhereHas('journal', function ($jq) use ($search) {
                        $jq->where('personal_notes', 'like', "%{$search}%")
                            ->orWhere('trade_setup', 'like', "%{$search}%")
                            ->orWhere('what_went_right', 'like', "%{$search}%")
                            ->orWhere('what_went_wrong', 'like', "%{$search}%")
                            ->orWhere('mistakes_made', 'like', "%{$search}%")
                            ->orWhere('lessons_learned', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('has_mistakes') && $request->has_mistakes == '1') {
            $query->whereHas('journal', function ($q) {
                $q->whereNotNull('mistakes_made')->where('mistakes_made', '!=', '');
            });
        }

        $perPage = min((int) $request->input('per_page', 10), 50);
        $trades = $query->paginate($perPage);

        // Overall summary statistics for top metrics across all trades of this user
        $allTrades = Trade::where('user_id', $user->id);
        $totalAll = $allTrades->count();
        $winsAll = (clone $allTrades)->where('net_pnl', '>', 0)->count();
        $lossesAll = (clone $allTrades)->where('net_pnl', '<', 0)->count();
        $bestTrade = (clone $allTrades)->orderBy('net_pnl', 'desc')->first();
        $worstTrade = (clone $allTrades)->orderBy('net_pnl', 'asc')->first();

        return response()->json([
            'data' => $trades->items(),
            'current_page' => $trades->currentPage(),
            'last_page' => $trades->lastPage(),
            'per_page' => $trades->perPage(),
            'total' => $trades->total(),
            'from' => $trades->firstItem() ?? 0,
            'to' => $trades->lastItem() ?? 0,
            'summary_stats' => [
                'total_entries' => $totalAll,
                'successful_trades' => $winsAll,
                'win_rate' => $totalAll > 0 ? round(($winsAll / $totalAll) * 100, 1) : 0,
                'failed_trades' => $lossesAll,
                'failed_pct' => $totalAll > 0 ? round(($lossesAll / $totalAll) * 100, 1) : 0,
                'best_trade_pnl' => (float) ($bestTrade?->net_pnl ?? 0),
                'best_trade_date' => $bestTrade ? Carbon::parse($bestTrade->trade_date)->format('d M Y') : '-',
                'worst_trade_pnl' => (float) ($worstTrade?->net_pnl ?? 0),
                'worst_trade_date' => $worstTrade ? Carbon::parse($worstTrade->trade_date)->format('d M Y') : '-',
            ],
        ]);
    }

    public function show(Request $request, Trade $trade): JsonResponse
    {
        if ($trade->user_id !== $request->user()->id) {
            abort(403);
        }

        return response()->json($trade->load('journal'));
    }

    public function update(Request $request, Trade $trade): JsonResponse
    {
        if ($trade->user_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'market_conditions' => ['nullable', 'string'],
            'trade_setup' => ['nullable', 'string'],
            'what_went_right' => ['nullable', 'string'],
            'what_went_wrong' => ['nullable', 'string'],
            'mistakes_made' => ['nullable', 'string'],
            'lessons_learned' => ['nullable', 'string'],
            'personal_notes' => ['nullable', 'string'],
        ]);

        if ($trade->journal) {
            $trade->journal->update($validated);
        } else {
            $trade->journal()->create($validated);
        }

        return response()->json([
            'message' => 'Journal entry updated successfully',
            'trade' => $trade->fresh()->load('journal'),
        ]);
    }
}
