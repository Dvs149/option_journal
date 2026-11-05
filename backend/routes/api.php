<?php

use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BrokerageSettingController;
use App\Http\Controllers\Api\CalendarController;
use App\Http\Controllers\Api\CapitalController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DropdownOptionController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\Api\JournalController;
use App\Http\Controllers\Api\LotSizeController;
use App\Http\Controllers\Api\ModuleVisibilityController;
use App\Http\Controllers\Api\OptionChainController;
use App\Http\Controllers\Api\PineScriptController;
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
    Route::get('/trades/all-ids', [TradeController::class, 'allIds']);
    Route::post('/trades/bulk-delete', [TradeController::class, 'bulkDestroy']);
    Route::post('/trades/bulk-import', [TradeController::class, 'bulkImport']);
    Route::post('/trades/parse-screenshot', [TradeController::class, 'parseScreenshot']);
    Route::post('/trades/import-screenshot-orders', [TradeController::class, 'importScreenshotOrders']);
    Route::post('/trades/reset-all-data', [TradeController::class, 'resetAllData']);
    Route::post('/trades/estimate-charges', [TradeController::class, 'estimateCharges']);
    Route::post('/trades/{trade}/duplicate', [TradeController::class, 'duplicate']);
    Route::post('/trades/{trade}/orders', [TradeController::class, 'addOrder']);
    Route::put('/trades/{trade}/orders/{order}', [TradeController::class, 'updateOrder']);
    Route::delete('/trades/{trade}/orders/{order}', [TradeController::class, 'destroyOrder']);
    Route::post('/trades/{trade}/screenshot', [TradeController::class, 'uploadScreenshot']);
    Route::delete('/trades/{trade}/screenshot', [TradeController::class, 'deleteScreenshot']);
    Route::post('/trades/{trade}/screenshots', [TradeController::class, 'uploadScreenshots']);
    Route::delete('/trades/{trade}/screenshots/{screenshot}', [TradeController::class, 'deleteSingleScreenshot']);
    Route::apiResource('trades', TradeController::class);

    // Trading Calendar & Heatmap
    Route::get('/calendar', [CalendarController::class, 'index']);

    // Real-Time Option Chain (NSE & BSE)
    Route::get('/option-chain/atm-strikes', [OptionChainController::class, 'atmStrikes']);
    Route::get('/option-chain', [OptionChainController::class, 'index']);

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

    // Pine Script Management
    Route::get('/pine-scripts/export-json', [PineScriptController::class, 'exportJson']);
    Route::post('/pine-scripts/import-json', [PineScriptController::class, 'importJson']);
    Route::post('/pine-scripts/{pine_script}/favorite', [PineScriptController::class, 'toggleFavorite']);
    Route::post('/pine-scripts/{pine_script}/duplicate', [PineScriptController::class, 'duplicate']);
    Route::apiResource('pine-scripts', PineScriptController::class);

    // Capital & Targets
    Route::get('/capital', [CapitalController::class, 'index']);
    Route::post('/capital/transactions', [CapitalController::class, 'storeTransaction']);
    Route::delete('/capital/transactions/{transaction}', [CapitalController::class, 'destroyTransaction']);
    Route::put('/capital/initial', [CapitalController::class, 'updateInitialCapital']);

    // Analytics & Comparison Reports
    Route::get('/analytics', [AnalyticsController::class, 'index']);

    // Dynamic Lot Size Management
    Route::get('/lot-sizes', [LotSizeController::class, 'index']);
    Route::post('/lot-sizes', [LotSizeController::class, 'store']);
    Route::put('/lot-sizes/batch', [LotSizeController::class, 'batchUpdate']);
    Route::post('/lot-sizes/reset', [LotSizeController::class, 'reset']);
    Route::delete('/lot-sizes/{index_name}', [LotSizeController::class, 'destroy']);

    // Dynamic Module Visibility Management (Database Stored)
    Route::get('/module-visibility', [ModuleVisibilityController::class, 'index']);
    Route::post('/module-visibility', [ModuleVisibilityController::class, 'update']);
    Route::put('/module-visibility/batch', [ModuleVisibilityController::class, 'batchUpdate']);
    Route::post('/module-visibility/reset', [ModuleVisibilityController::class, 'reset']);

    // Dynamic Brokerage & Regulatory Charges Management
    Route::get('/brokerage-settings', [BrokerageSettingController::class, 'show']);
    Route::put('/brokerage-settings', [BrokerageSettingController::class, 'update']);
    Route::post('/brokerage-settings/reset', [BrokerageSettingController::class, 'reset']);

    // Module-wise Dropdown & Options Management
    Route::get('/dropdown-options', [DropdownOptionController::class, 'index']);
    Route::post('/dropdown-options', [DropdownOptionController::class, 'store']);
    Route::put('/dropdown-options/{id}/status', [DropdownOptionController::class, 'toggleStatus']);
    Route::put('/dropdown-options/{id}', [DropdownOptionController::class, 'update']);
    Route::delete('/dropdown-options/{id}', [DropdownOptionController::class, 'destroy']);
    Route::post('/dropdown-options/bulk-status', [DropdownOptionController::class, 'bulkStatus']);
    Route::post('/dropdown-options/reset', [DropdownOptionController::class, 'reset']);

    // Export, Reports, Backup & Restore
    Route::get('/export/csv', [ExportController::class, 'csv']);
    Route::get('/export/excel', [ExportController::class, 'excel']);
    Route::get('/export/pdf', [ExportController::class, 'pdf']);
    Route::get('/export/backup', [ExportController::class, 'backup']);
    Route::post('/export/restore', [ExportController::class, 'restore']);
});
