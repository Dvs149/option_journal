<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Trade;
use App\Models\TradeJournal;
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

        if ($request->filled('outcome')) {
            if ($request->outcome === 'win') {
                $query->where('net_pnl', '>', 0);
            } elseif ($request->outcome === 'loss') {
                $query->where('net_pnl', '<', 0);
            }
        }

        if ($request->filled('has_mistakes') && $request->has_mistakes == '1') {
            $query->whereHas('journal', function ($q) {
                $q->whereNotNull('mistakes_made')->where('mistakes_made', '!=', '');
            });
        }

        $perPage = min((int) $request->input('per_page', 10), 50);
        $trades = $query->paginate($perPage);

        return response()->json($trades);
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
