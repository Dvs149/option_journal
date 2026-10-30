<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BrokerageSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BrokerageSettingController extends Controller
{
    /**
     * Get user brokerage & regulatory charges configuration
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $settings = BrokerageSetting::forUser($user->id);

        return response()->json([
            'success' => true,
            'data' => $settings,
            'official_defaults' => BrokerageSetting::DEFAULTS,
        ]);
    }

    /**
     * Update user brokerage & regulatory charges configuration
     */
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'broker_name' => 'nullable|string|max:50',
            'brokerage_per_order' => 'required|numeric|min:0|max:1000',
            'stt_rate_percent' => 'required|numeric|min:0|max:10',
            'nse_txn_rate_percent' => 'required|numeric|min:0|max:10',
            'bse_txn_rate_percent' => 'required|numeric|min:0|max:10',
            'gst_rate_percent' => 'required|numeric|min:0|max:100',
            'sebi_per_crore' => 'required|numeric|min:0|max:1000',
            'stamp_duty_rate_percent' => 'required|numeric|min:0|max:10',
            'default_exchange' => 'required|string|in:NSE,BSE',
        ]);

        $setting = BrokerageSetting::updateOrCreate(
            ['user_id' => $user->id],
            $validated
        );

        return response()->json([
            'success' => true,
            'message' => 'Brokerage & regulatory charges updated successfully',
            'data' => BrokerageSetting::forUser($user->id),
        ]);
    }

    /**
     * Reset configuration to official Zerodha / SEBI defaults
     */
    public function reset(Request $request): JsonResponse
    {
        $user = $request->user();

        BrokerageSetting::where('user_id', $user->id)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Reset to official Zerodha regulatory defaults',
            'data' => BrokerageSetting::forUser($user->id),
        ]);
    }
}
