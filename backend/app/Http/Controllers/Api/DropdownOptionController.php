<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DropdownOption;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DropdownOptionController extends Controller
{
    /**
     * Get all dropdown options for the authenticated user (seeds defaults if empty).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Ensure user has default options seeded, including newly added dropdown keys like date_period
        $hasDatePeriod = DropdownOption::where('user_id', $user->id)
            ->where('dropdown_key', 'date_period')
            ->exists();
        if (!$hasDatePeriod) {
            DropdownOption::seedDefaultsForUser($user->id);
        }

        $query = DropdownOption::where('user_id', $user->id);

        if ($request->filled('module_key')) {
            $query->where('module_key', $request->query('module_key'));
        }

        if ($request->filled('dropdown_key')) {
            $query->where('dropdown_key', $request->query('dropdown_key'));
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $options = $query->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        // Build convenient grouped map
        $grouped = [];
        foreach ($options as $opt) {
            $m = $opt->module_key;
            $d = $opt->dropdown_key;
            if (!isset($grouped[$m])) {
                $grouped[$m] = [];
            }
            if (!isset($grouped[$m][$d])) {
                $grouped[$m][$d] = [
                    'module_key' => $m,
                    'dropdown_key' => $d,
                    'dropdown_label' => $opt->dropdown_label,
                    'total_count' => 0,
                    'active_count' => 0,
                    'options' => [],
                ];
            }
            $grouped[$m][$d]['options'][] = $opt;
            $grouped[$m][$d]['total_count']++;
            if ($opt->is_active) {
                $grouped[$m][$d]['active_count']++;
            }
        }

        return response()->json([
            'success' => true,
            'options' => $options,
            'grouped' => $grouped,
            'total' => $options->count(),
            'active_total' => $options->where('is_active', true)->count(),
        ]);
    }

    /**
     * Create a new custom option.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'module_key' => 'required|string|max:50',
            'dropdown_key' => 'required|string|max:50',
            'dropdown_label' => 'nullable|string|max:100',
            'option_value' => 'required|string|max:100',
            'option_label' => 'required|string|max:150',
            'color' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
            'apply_to_all_modules' => 'nullable|boolean',
        ]);

        $moduleKey = $validated['module_key'];
        $dropdownKey = $validated['dropdown_key'];
        $dropdownLabel = $validated['dropdown_label'] ?? ucwords(str_replace('_', ' ', $dropdownKey));
        $optionValue = trim($validated['option_value']);
        $optionLabel = trim($validated['option_label']);
        $color = $validated['color'] ?? 'blue';
        $isActive = $validated['is_active'] ?? true;

        $modulesToApply = [$moduleKey];

        // If apply_to_all_modules is true, find all other modules having this dropdown_key
        if ($request->boolean('apply_to_all_modules')) {
            $otherModules = DropdownOption::where('user_id', $user->id)
                ->where('dropdown_key', $dropdownKey)
                ->pluck('module_key')
                ->unique()
                ->toArray();
            $modulesToApply = array_unique(array_merge($modulesToApply, $otherModules));
        }

        $created = [];

        foreach ($modulesToApply as $mod) {
            $maxOrder = (int) DropdownOption::where('user_id', $user->id)
                ->where('module_key', $mod)
                ->where('dropdown_key', $dropdownKey)
                ->max('sort_order');

            $opt = DropdownOption::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'module_key' => $mod,
                    'dropdown_key' => $dropdownKey,
                    'option_value' => $optionValue,
                ],
                [
                    'dropdown_label' => $dropdownLabel,
                    'option_label' => $optionLabel,
                    'is_active' => $isActive,
                    'is_system' => false,
                    'sort_order' => $maxOrder + 1,
                    'color' => $color,
                ]
            );
            $created[] = $opt;
        }

        return response()->json([
            'success' => true,
            'message' => 'Dropdown option created successfully',
            'option' => $created[0] ?? null,
            'created' => $created,
        ], 201);
    }

    /**
     * Toggle or update active status of a specific option.
     */
    public function toggleStatus(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $option = DropdownOption::where('user_id', $user->id)->findOrFail($id);

        if ($request->has('is_active')) {
            $option->is_active = $request->boolean('is_active');
        } else {
            $option->is_active = !$option->is_active;
        }

        $option->save();

        return response()->json([
            'success' => true,
            'message' => 'Status updated to ' . ($option->is_active ? 'Active' : 'Inactive'),
            'option' => $option,
        ]);
    }

    /**
     * Update an existing option.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $option = DropdownOption::where('user_id', $user->id)->findOrFail($id);

        $validated = $request->validate([
            'option_label' => 'nullable|string|max:150',
            'option_value' => 'nullable|string|max:100',
            'is_active' => 'nullable|boolean',
            'color' => 'nullable|string|max:50',
            'sort_order' => 'nullable|integer',
        ]);

        if (isset($validated['option_label'])) {
            $option->option_label = trim($validated['option_label']);
        }
        if (isset($validated['option_value'])) {
            $option->option_value = trim($validated['option_value']);
        }
        if (isset($validated['is_active'])) {
            $option->is_active = $validated['is_active'];
        }
        if (isset($validated['color'])) {
            $option->color = $validated['color'];
        }
        if (isset($validated['sort_order'])) {
            $option->sort_order = $validated['sort_order'];
        }

        $option->save();

        return response()->json([
            'success' => true,
            'message' => 'Dropdown option updated successfully',
            'option' => $option,
        ]);
    }

    /**
     * Bulk update active status for an entire dropdown in a module.
     */
    public function bulkStatus(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'module_key' => 'required|string|max:50',
            'dropdown_key' => 'required|string|max:50',
            'is_active' => 'required|boolean',
        ]);

        DropdownOption::where('user_id', $user->id)
            ->where('module_key', $validated['module_key'])
            ->where('dropdown_key', $validated['dropdown_key'])
            ->update(['is_active' => $validated['is_active']]);

        return response()->json([
            'success' => true,
            'message' => 'All options set to ' . ($validated['is_active'] ? 'Active' : 'Inactive'),
        ]);
    }

    /**
     * Delete a custom option.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $option = DropdownOption::where('user_id', $user->id)->findOrFail($id);
        $option->delete();

        return response()->json([
            'success' => true,
            'message' => 'Option removed successfully',
        ]);
    }

    /**
     * Reset options to system defaults.
     */
    public function reset(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($request->filled('module_key')) {
            DropdownOption::where('user_id', $user->id)
                ->where('module_key', $request->input('module_key'))
                ->delete();

            $defaults = DropdownOption::getDefaultOptions();
            foreach ($defaults as $opt) {
                if ($opt['module_key'] === $request->input('module_key')) {
                    DropdownOption::create([
                        'user_id' => $user->id,
                        'module_key' => $opt['module_key'],
                        'dropdown_key' => $opt['dropdown_key'],
                        'dropdown_label' => $opt['dropdown_label'],
                        'option_value' => $opt['option_value'],
                        'option_label' => $opt['option_label'],
                        'is_active' => true,
                        'sort_order' => $opt['sort_order'],
                        'is_system' => true,
                        'color' => $opt['color'] ?? 'blue',
                    ]);
                }
            }
        } else {
            DropdownOption::where('user_id', $user->id)->delete();
            DropdownOption::seedDefaultsForUser($user->id);
        }

        return $this->index($request);
    }
}
