<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TradingAnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function __construct(
        protected TradingAnalyticsService $analyticsService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $accountId = $request->input('trading_account_id');
        $filter = $request->input('filter', 'all');
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');

        $data = $this->analyticsService->getAdvancedAnalytics($user, $accountId, $filter, $fromDate, $toDate);

        return response()->json($data);
    }
}
