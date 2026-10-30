<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IndexLotSize;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LotSizeController extends Controller
{
    /**
     * Retrieve all lot sizes configured for the user in DB.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Check if user has lot sizes seeded in DB
        $count = IndexLotSize::where('user_id', $user->id)->count();
        if ($count === 0) {
            IndexLotSize::seedDefaultsForUser($user->id);
        }

        $records = IndexLotSize::where('user_id', $user->id)
            ->where('is_active', true)
            ->orderBy('id')
            ->get();

        // Also build key-value map for quick frontend access
        $map = [];
        foreach ($records as $r) {
            $map[$r->index_name] = $r->lot_size;
            // Provide alias if BANKNIFTY
            if ($r->index_name === 'BANKNIFTY') {
                $map['BANK NIFTY'] = $r->lot_size;
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => $records,
            'lot_sizes' => $map,
        ]);
    }

    /**
     * Store or update lot size for an index in DB.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'index_name' => ['required', 'string', 'max:50'],
            'lot_size' => ['required', 'integer', 'min:1'],
            'exchange' => ['nullable', 'string', 'max:20'],
            'display_name' => ['nullable', 'string', 'max:100'],
        ]);

        $user = $request->user();
        $cleanIndex = strtoupper(trim($validated['index_name']));

        $record = IndexLotSize::updateOrCreate(
            [
                'user_id' => $user->id,
                'index_name' => $cleanIndex,
            ],
            [
                'lot_size' => $validated['lot_size'],
                'exchange' => $validated['exchange'] ?? 'NSE',
                'display_name' => $validated['display_name'] ?? $cleanIndex,
                'is_active' => true,
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => "Lot size for {$cleanIndex} saved to database successfully.",
            'data' => $record,
        ]);
    }

    /**
     * Batch update multiple lot sizes in DB.
     */
    public function batchUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lot_sizes' => ['required', 'array'],
        ]);

        $user = $request->user();

        DB::transaction(function () use ($user, $validated) {
            foreach ($validated['lot_sizes'] as $index => $size) {
                if (empty($index) || !is_numeric($size)) continue;
                $clean = strtoupper(trim($index));
                if ($clean === 'BANK NIFTY') $clean = 'BANKNIFTY';

                IndexLotSize::updateOrCreate(
                    [
                        'user_id' => $user->id,
                        'index_name' => $clean,
                    ],
                    [
                        'lot_size' => (int) $size,
                        'is_active' => true,
                    ]
                );
            }
        });

        // Return refreshed list
        return $this->index($request);
    }

    /**
     * Delete custom index lot size from DB.
     */
    public function destroy(Request $request, string $index_name): JsonResponse
    {
        $user = $request->user();
        $cleanIndex = strtoupper(trim($index_name));

        IndexLotSize::where('user_id', $user->id)
            ->where(function ($q) use ($cleanIndex) {
                $q->where('index_name', $cleanIndex);
                if ($cleanIndex === 'BANKNIFTY' || $cleanIndex === 'BANK NIFTY') {
                    $q->orWhere('index_name', 'BANKNIFTY')->orWhere('index_name', 'BANK NIFTY');
                }
            })
            ->delete();

        return response()->json([
            'status' => 'success',
            'message' => "Index {$cleanIndex} deleted from database.",
        ]);
    }

    /**
     * Reset user lot sizes in DB to official exchange defaults.
     */
    public function reset(Request $request): JsonResponse
    {
        $user = $request->user();

        DB::transaction(function () use ($user) {
            IndexLotSize::where('user_id', $user->id)->delete();
            IndexLotSize::seedDefaultsForUser($user->id);
        });

        return $this->index($request);
    }
}
