<?php

namespace Database\Seeders;

use App\Models\CapitalTransaction;
use App\Models\IndexLotSize;
use App\Models\TradingAccount;
use App\Models\TradingStrategy;
use App\Models\User;
use App\Models\UserModuleVisibility;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Clean existing records if any for clean idempotent re-seeding
        User::where('email', 'trader@example.com')->delete();

        // Create demo Trader user
        $user = User::create([
            'name' => 'Trader',
            'email' => 'trader@example.com',
            'password' => Hash::make('password'),
        ]);

        // Create primary trading account
        $account = TradingAccount::create([
            'user_id' => $user->id,
            'account_name' => 'Primary Zerodha Account',
            'broker_name' => 'Zerodha',
            'initial_capital' => 500000.00,
            'daily_profit_target' => 20000.00,
            'daily_max_loss' => 25000.00,
            'monthly_profit_target' => 150000.00,
            'monthly_max_loss' => 50000.00,
            'is_default' => true,
        ]);

        // Default strategies
        $strategies = [
            'Long Straddle' => 'Delta neutral volatility expansion on major expiry and event days',
            'Directional CE' => 'Bullish option buying with high relative volume and EMA 9/21 cross',
            'Directional PE' => 'Bearish breakdown option buying at key resistance / support breach',
            'BTST' => 'Overnight momentum capture on strong day close near day high',
            'Short Strangle' => 'Theta decay capture in rangebound non-trending markets',
            'Other' => 'Discretionary setups and scalp opportunities',
        ];

        foreach ($strategies as $name => $desc) {
            TradingStrategy::create([
                'user_id' => $user->id,
                'strategy_name' => $name,
                'description' => $desc,
            ]);
        }

        // Seed default index lot sizes for the user in DB
        IndexLotSize::seedDefaultsForUser($user->id);

        // Clean slate: No dummy trades or extra transactions seeded.
        // User starts with a completely clean database ready for manual testing.
    }
}
