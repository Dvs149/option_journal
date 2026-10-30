<?php

use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CalendarController;
use App\Http\Controllers\Api\CapitalController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\Api\JournalController;
use App\Http\Controllers\Api\RiskController;
use App\Http\Controllers\Api\StrategyController;
use App\Http\Controllers\Api\TradeController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Authentication Routes
|--------------------------------------------------------------------------
*/
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login'])->name('login');

Route::get('/ping', function () {
    return response()->json(['status' => 'ok', 'app' => 'TradeJournal API']);
});

/*
|--------------------------------------------------------------------------
| Protected Application Routes (Sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    // Current User & Profile
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/user/profile', [AuthController::class, 'updateProfile']);
    Route::put('/user/password', [AuthController::class, 'changePassword']);

    // Dashboard Overview
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Trades Management
    Route::post('/trades/estimate-charges', [TradeController::class, 'estimateCharges']);
    Route::post('/trades/{trade}/duplicate', [TradeController::class, 'duplicate']);
    Route::apiResource('trades', TradeController::class);

    // Trading Calendar & Heatmap
    Route::get('/calendar', [CalendarController::class, 'index']);

    // Risk Management
    Route::get('/risk', [RiskController::class, 'index']);
    Route::put('/risk/limits', [RiskController::class, 'updateLimits']);

    // Trading Journal
    Route::get('/journal', [JournalController::class, 'index']);
    Route::get('/journal/{trade}', [JournalController::class, 'show']);
    Route::put('/journal/{trade}', [JournalController::class, 'update']);

    // Strategies
    Route::get('/strategies', [StrategyController::class, 'index']);
    Route::post('/strategies', [StrategyController::class, 'store']);
    Route::delete('/strategies/{strategy}', [StrategyController::class, 'destroy']);

    // Capital & Targets
    Route::get('/capital', [CapitalController::class, 'index']);
    Route::post('/capital/transactions', [CapitalController::class, 'storeTransaction']);
    Route::delete('/capital/transactions/{transaction}', [CapitalController::class, 'destroyTransaction']);
    Route::put('/capital/initial', [CapitalController::class, 'updateInitialCapital']);

    // Analytics & Comparison Reports
    Route::get('/analytics', [AnalyticsController::class, 'index']);

    // Export, Reports, Backup & Restore
    Route::get('/export/csv', [ExportController::class, 'csv']);
    Route::get('/export/excel', [ExportController::class, 'excel']);
    Route::get('/export/pdf', [ExportController::class, 'pdf']);
    Route::get('/export/backup', [ExportController::class, 'backup']);
    Route::post('/export/restore', [ExportController::class, 'restore']);
});
