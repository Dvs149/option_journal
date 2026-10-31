<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PineScript;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PineScriptController extends Controller
{
    /**
     * Display a listing of pine scripts for the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = PineScript::where('user_id', $user->id);

        // Search text
        if ($request->filled('search')) {
            $search = '%' . $request->search . '%';
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', $search)
                  ->orWhere('description', 'like', $search)
                  ->orWhere('code', 'like', $search)
                  ->orWhere('category', 'like', $search)
                  ->orWhere('target_market', 'like', $search);
            });
        }

        // Filter by script type
        if ($request->filled('script_type') && $request->script_type !== 'ALL') {
            $query->where('script_type', $request->script_type);
        }

        // Filter by category
        if ($request->filled('category') && $request->category !== 'ALL') {
            $query->where('category', $request->category);
        }

        // Filter by target market
        if ($request->filled('target_market') && $request->target_market !== 'ALL') {
            $query->where('target_market', $request->target_market);
        }

        // Filter favorites only
        if ($request->boolean('is_favorite') || $request->input('favorite') === 'true') {
            $query->where('is_favorite', true);
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'newest');
        switch ($sortBy) {
            case 'oldest':
                $query->orderBy('created_at', 'asc');
                break;
            case 'title_asc':
                $query->orderBy('title', 'asc');
                break;
            case 'title_desc':
                $query->orderBy('title', 'desc');
                break;
            case 'updated':
                $query->orderBy('updated_at', 'desc');
                break;
            case 'newest':
            default:
                $query->orderBy('is_favorite', 'desc')->orderBy('created_at', 'desc');
                break;
        }

        $scripts = $query->get();

        // Calculate aggregate statistics for the header
        $allUserScripts = PineScript::where('user_id', $user->id)->get();
        $stats = [
            'total' => $allUserScripts->count(),
            'strategies' => $allUserScripts->where('script_type', 'strategy')->count(),
            'indicators' => $allUserScripts->where('script_type', 'indicator')->count(),
            'libraries' => $allUserScripts->where('script_type', 'library')->count(),
            'alerts' => $allUserScripts->where('script_type', 'alert')->count(),
            'favorites' => $allUserScripts->where('is_favorite', true)->count(),
            'categories' => $allUserScripts->pluck('category')->filter()->unique()->values(),
            'markets' => $allUserScripts->pluck('target_market')->filter()->unique()->values(),
        ];

        return response()->json([
            'scripts' => $scripts,
            'stats' => $stats,
        ]);
    }

    /**
     * Store a newly created pine script.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'script_type' => 'required|in:indicator,strategy,library,alert',
            'version' => 'nullable|string|max:10',
            'category' => 'nullable|string|max:50',
            'target_market' => 'nullable|string|max:50',
            'timeframe' => 'nullable|string|max:30',
            'description' => 'nullable|string',
            'code' => 'required|string',
            'tradingview_url' => 'nullable|string|max:500',
            'is_favorite' => 'nullable|boolean',
            'tags' => 'nullable|array',
        ]);

        $validated['user_id'] = $request->user()->id;
        $validated['version'] = $validated['version'] ?: 'v5';
        $validated['category'] = $validated['category'] ?: 'Options';
        $validated['target_market'] = $validated['target_market'] ?: 'All';
        $validated['timeframe'] = $validated['timeframe'] ?: '5m';
        $validated['is_favorite'] = $request->boolean('is_favorite');

        $script = PineScript::create($validated);

        return response()->json([
            'message' => 'Pine Script created successfully.',
            'script' => $script,
        ], 201);
    }

    /**
     * Display the specified pine script.
     */
    public function show(Request $request, PineScript $pineScript): JsonResponse
    {
        if ($pineScript->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        return response()->json(['script' => $pineScript]);
    }

    /**
     * Update the specified pine script.
     */
    public function update(Request $request, PineScript $pineScript): JsonResponse
    {
        if ($pineScript->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'script_type' => 'required|in:indicator,strategy,library,alert',
            'version' => 'nullable|string|max:10',
            'category' => 'nullable|string|max:50',
            'target_market' => 'nullable|string|max:50',
            'timeframe' => 'nullable|string|max:30',
            'description' => 'nullable|string',
            'code' => 'required|string',
            'tradingview_url' => 'nullable|string|max:500',
            'is_favorite' => 'nullable|boolean',
            'tags' => 'nullable|array',
        ]);

        $pineScript->update($validated);

        return response()->json([
            'message' => 'Pine Script updated successfully.',
            'script' => $pineScript,
        ]);
    }

    /**
     * Remove the specified pine script.
     */
    public function destroy(Request $request, PineScript $pineScript): JsonResponse
    {
        if ($pineScript->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $pineScript->delete();

        return response()->json([
            'message' => 'Pine Script deleted successfully.',
        ]);
    }

    /**
     * Toggle favorite bookmark status.
     */
    public function toggleFavorite(Request $request, PineScript $pineScript): JsonResponse
    {
        if ($pineScript->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $pineScript->is_favorite = !$pineScript->is_favorite;
        $pineScript->save();

        return response()->json([
            'message' => $pineScript->is_favorite ? 'Added to favorites.' : 'Removed from favorites.',
            'script' => $pineScript,
        ]);
    }

    /**
     * Duplicate / clone an existing script.
     */
    public function duplicate(Request $request, PineScript $pineScript): JsonResponse
    {
        if ($pineScript->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $clone = $pineScript->replicate();
        $clone->title = 'Copy of ' . $pineScript->title;
        $clone->is_favorite = false;
        $clone->save();

        return response()->json([
            'message' => 'Script cloned successfully.',
            'script' => $clone,
        ], 201);
    }

    /**
     * Export all scripts as JSON backup.
     */
    public function exportJson(Request $request): JsonResponse
    {
        $scripts = PineScript::where('user_id', $request->user()->id)->get();
        return response()->json([
            'exported_at' => now()->toIso8601String(),
            'app' => 'TradeJournal Options Pro',
            'scripts' => $scripts,
        ]);
    }

    /**
     * Import scripts from JSON backup.
     */
    public function importJson(Request $request): JsonResponse
    {
        $request->validate([
            'scripts' => 'required|array',
            'scripts.*.title' => 'required|string',
            'scripts.*.code' => 'required|string',
        ]);

        $userId = $request->user()->id;
        $importedCount = 0;

        foreach ($request->scripts as $item) {
            PineScript::create([
                'user_id' => $userId,
                'title' => $item['title'] ?? 'Imported Script',
                'script_type' => $item['script_type'] ?? 'indicator',
                'version' => $item['version'] ?? 'v5',
                'category' => $item['category'] ?? 'Options',
                'target_market' => $item['target_market'] ?? 'All',
                'timeframe' => $item['timeframe'] ?? '5m',
                'description' => $item['description'] ?? null,
                'code' => $item['code'] ?? '',
                'tradingview_url' => $item['tradingview_url'] ?? null,
                'is_favorite' => !empty($item['is_favorite']),
                'tags' => $item['tags'] ?? [],
            ]);
            $importedCount++;
        }

        return response()->json([
            'message' => "Successfully imported {$importedCount} scripts.",
            'scripts' => PineScript::where('user_id', $userId)->get(),
        ]);
    }
}
