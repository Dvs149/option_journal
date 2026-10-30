<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserModuleVisibility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ModuleVisibilityController extends Controller
{
    /**
     * Retrieve all module visibility settings for the authenticated user from Database.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Ensure user has seeded defaults in database
        $count = UserModuleVisibility::where('user_id', $user->id)->count();
        if ($count === 0) {
            UserModuleVisibility::seedDefaultsForUser($user->id);
        }

        $records = UserModuleVisibility::where('user_id', $user->id)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        // Key-value map for direct frontend lookup
        $visibilityMap = [];
        foreach ($records as $r) {
            $visibilityMap[$r->module_key] = (bool) $r->is_visible;
        }

        return response()->json([
            'status' => 'success',
            'visibility' => $visibilityMap,
            'data' => $records,
        ]);
    }

    /**
     * Update a single module's visibility in Database.
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'module_key' => ['required', 'string', 'max:50'],
            'is_visible' => ['required', 'boolean'],
        ]);

        $user = $request->user();

        $record = UserModuleVisibility::updateOrCreate(
            [
                'user_id' => $user->id,
                'module_key' => $validated['module_key'],
            ],
            [
                'is_visible' => $validated['is_visible'],
            ]
        );

        // Fetch refreshed visibility map
        $records = UserModuleVisibility::where('user_id', $user->id)->get();
        $visibilityMap = [];
        foreach ($records as $r) {
            $visibilityMap[$r->module_key] = (bool) $r->is_visible;
        }

        $statusStr = $validated['is_visible'] ? 'visible' : 'hidden';

        return response()->json([
            'status' => 'success',
            'message' => "Module '{$validated['module_key']}' is now {$statusStr} in Database.",
            'module' => $record,
            'visibility' => $visibilityMap,
        ]);
    }

    /**
     * Batch update multiple module visibilities in Database.
     */
    public function batchUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'visibility' => ['required', 'array'],
        ]);

        $user = $request->user();

        DB::transaction(function () use ($user, $validated) {
            foreach ($validated['visibility'] as $key => $isVisible) {
                if (empty($key)) continue;
                UserModuleVisibility::updateOrCreate(
                    [
                        'user_id' => $user->id,
                        'module_key' => $key,
                    ],
                    [
                        'is_visible' => (bool) $isVisible,
                    ]
                );
            }
        });

        return $this->index($request);
    }

    /**
     * Reset module visibilities to default (all visible) in Database.
     */
    public function reset(Request $request): JsonResponse
    {
        $user = $request->user();

        DB::transaction(function () use ($user) {
            UserModuleVisibility::where('user_id', $user->id)->delete();
            UserModuleVisibility::seedDefaultsForUser($user->id);
        });

        return $this->index($request);
    }
}
