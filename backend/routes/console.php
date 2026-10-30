<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use App\Models\CapitalTransaction;
use App\Models\IndexLotSize;
use App\Models\Trade;
use App\Models\TradeJournal;
use App\Models\TradeScreenshot;
use App\Models\TradingAccount;
use App\Models\TradingStrategy;
use App\Models\User;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('db:reset-trading-data', function () {
    $this->info('Resetting trading data...');

    TradeScreenshot::query()->delete();
    if (Storage::disk('public')->exists('screenshots')) {
        Storage::disk('public')->deleteDirectory('screenshots');
    }
    Storage::disk('public')->makeDirectory('screenshots');

    TradeJournal::query()->delete();
    Trade::query()->delete();
    CapitalTransaction::query()->delete();

    try {
        DB::statement('ALTER TABLE trades AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE trade_journals AUTO_INCREMENT = 1');
        DB::statement('ALTER TABLE trade_screenshots AUTO_INCREMENT = 1');
    } catch (\Throwable $e) {
        // Ignore if DBMS does not support ALTER AUTO_INCREMENT directly
    }

    $user = User::firstOrCreate(
        ['email' => 'trader@example.com'],
        [
            'name' => 'Trader',
            'password' => Hash::make('password'),
        ]
    );

    $account = TradingAccount::firstOrCreate(
        ['user_id' => $user->id, 'is_default' => true],
        [
            'account_name' => 'Primary Zerodha Account',
            'broker_name' => 'Zerodha',
            'initial_capital' => 500000.00,
            'daily_profit_target' => 20000.00,
            'daily_max_loss' => 25000.00,
            'monthly_profit_target' => 150000.00,
            'monthly_max_loss' => 50000.00,
        ]
    );

    IndexLotSize::seedDefaultsForUser($user->id);

    $defaultStrategies = [
        'Long Straddle' => 'Delta neutral volatility expansion on major expiry and event days',
        'Directional CE' => 'Bullish option buying with high relative volume and EMA 9/21 cross',
        'Directional PE' => 'Bearish breakdown option buying at key resistance / support breach',
        'BTST' => 'Overnight momentum capture on strong day close near day high',
        'Short Strangle' => 'Theta decay capture in rangebound non-trending markets',
        'Other' => 'Discretionary setups and scalp opportunities',
    ];

    foreach ($defaultStrategies as $name => $desc) {
        TradingStrategy::firstOrCreate(
            ['user_id' => $user->id, 'strategy_name' => $name],
            ['description' => $desc]
        );
    }

    $this->info('Trading data has been completely reset. All dummy trades deleted!');
})->purpose('Reset all trade entries and dummy data');
