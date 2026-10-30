<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TradingAnalyticsService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalendarController extends Controller
{
    public function __construct(
        protected TradingAnalyticsService $analyticsService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $accountId = $request->input('trading_account_id');
        $now = Carbon::today('Asia/Kolkata');

        $year = (int) $request->input('year', $now->year);
        $month = (int) $request->input('month', $now->month);

        $calendarData = $this->analyticsService->getTradingCalendar($user, $accountId, $year, $month);

        return response()->json($calendarData);
    }
}
