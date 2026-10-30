<?php

namespace Database\Seeders;

use App\Models\CapitalTransaction;
use App\Models\IndexLotSize;
use App\Models\Trade;
use App\Models\TradeJournal;
use App\Models\TradingAccount;
use App\Models\TradingStrategy;
use App\Models\User;
use Carbon\Carbon;
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

        // Add initial deposit capital transaction
        CapitalTransaction::create([
            'user_id' => $user->id,
            'trading_account_id' => $account->id,
            'transaction_type' => 'deposit',
            'amount' => 500000.00,
            'transaction_date' => '2025-01-01',
            'notes' => 'Initial capital funding',
        ]);

        // Seed realistic trade data matching the reference dashboard
        $seedTrades = [
            // Recent dashboard trades shown
            [
                'date' => '2025-08-31',
                'index' => 'NIFTY',
                'type' => 'Intraday',
                'strategy' => 'Directional CE',
                'option' => 'CE',
                'strike' => 24800,
                'expiry' => '2025-09-04',
                'entry' => 140.00,
                'exit' => 265.00,
                'qty' => 100,
                'lots' => 2,
                'gross_p' => 12500.00,
                'gross_l' => 0.00,
                'brokerage' => 40.00,
                'stt' => 16.50,
                'exchange' => 13.20,
                'gst' => 9.80,
                'sebi' => 0.50,
                'stamp' => 0.00,
                'other' => 70.00,
                'charges' => 150.00,
                'net' => 12350.00,
                'entry_r' => '15m VWAP breakout above previous day high',
                'exit_r' => 'Target 1:2 R:R achieved at 24900 resistance',
                'notes' => 'Disciplined execution. Trailed stop loss effectively.',
                'journal' => [
                    'market_conditions' => 'Bullish trending day with high institutional participation',
                    'trade_setup' => 'Opening Range Breakout + Volume expansion',
                    'what_went_right' => 'Waited for candle close above resistance before entering',
                    'what_went_wrong' => 'Could have held 1 lot for runner into the close',
                    'mistakes_made' => 'None, followed trading plan',
                    'lessons_learned' => 'Patience pays during morning volatility',
                    'personal_notes' => 'Calm mindset, no revenge urge',
                ]
            ],
            [
                'date' => '2025-08-31',
                'index' => 'BANKNIFTY',
                'type' => 'Intraday',
                'strategy' => 'Directional PE',
                'option' => 'PE',
                'strike' => 51200,
                'expiry' => '2025-09-03',
                'entry' => 220.00,
                'exit' => 135.00,
                'qty' => 90,
                'lots' => 3,
                'gross_p' => 0.00,
                'gross_l' => 8250.00,
                'brokerage' => 40.00,
                'stt' => 12.00,
                'exchange' => 11.50,
                'gst' => 9.20,
                'sebi' => 0.30,
                'stamp' => 0.00,
                'other' => 97.00,
                'charges' => 170.00,
                'net' => -8420.00,
                'entry_r' => 'Anticipated reversal at HDFC bank resistance',
                'exit_r' => 'Stop loss hit as BankNifty bounced sharply',
                'notes' => 'Cut loss immediately without hesitation.',
                'journal' => [
                    'market_conditions' => 'Rangebound chop in private banking sector',
                    'trade_setup' => 'Counter-trend fade',
                    'what_went_right' => 'Respected hard stop loss',
                    'what_went_wrong' => 'Faded strong morning trend against overall market momentum',
                    'mistakes_made' => 'Fighting the trend',
                    'lessons_learned' => 'Do not take counter-trend trades unless clear double top forms',
                    'personal_notes' => 'Accepted loss easily, proud of stop execution',
                ]
            ],
            [
                'date' => '2025-08-30',
                'index' => 'NIFTY',
                'type' => 'BTST',
                'strategy' => 'BTST',
                'option' => 'CE',
                'strike' => 24750,
                'expiry' => '2025-09-04',
                'entry' => 165.00,
                'exit' => 235.00,
                'qty' => 100,
                'lots' => 1,
                'gross_p' => 7000.00,
                'gross_l' => 0.00,
                'brokerage' => 40.00,
                'stt' => 14.60,
                'exchange' => 12.00,
                'gst' => 9.40,
                'sebi' => 0.40,
                'stamp' => 0.00,
                'other' => 143.60,
                'charges' => 220.00,
                'net' => 6780.00,
                'entry_r' => 'Strong day close with heavy call OI unwinding',
                'exit_r' => 'Gap up open profit booked in first 5 minutes',
                'notes' => 'Clean overnight gap capture.',
            ],
            [
                'date' => '2025-08-30',
                'index' => 'SENSEX',
                'type' => 'Intraday',
                'strategy' => 'Long Straddle',
                'option' => 'Both',
                'strike' => 81500,
                'expiry' => '2025-09-05',
                'entry' => 310.00,
                'exit' => 355.00,
                'qty' => 100,
                'lots' => 2,
                'gross_p' => 4500.00,
                'gross_l' => 0.00,
                'brokerage' => 80.00,
                'stt' => 22.00,
                'exchange' => 18.00,
                'gst' => 17.60,
                'sebi' => 0.80,
                'stamp' => 0.00,
                'other' => 151.60,
                'charges' => 290.00,
                'net' => 4210.00,
                'entry_r' => 'Pre-RBI policy statement volatility expansion',
                'exit_r' => 'IV spike booked before IV crush',
                'notes' => 'Quick 25 minute scalp',
            ],
            [
                'date' => '2025-08-29',
                'index' => 'BANKNIFTY',
                'type' => 'Intraday',
                'strategy' => 'Directional CE',
                'option' => 'CE',
                'strike' => 51000,
                'expiry' => '2025-09-03',
                'entry' => 280.00,
                'exit' => 225.00,
                'qty' => 90,
                'lots' => 2,
                'gross_p' => 0.00,
                'gross_l' => 4950.00,
                'brokerage' => 40.00,
                'stt' => 12.00,
                'exchange' => 11.00,
                'gst' => 9.20,
                'sebi' => 0.30,
                'stamp' => 0.00,
                'other' => 367.50,
                'charges' => 440.00,
                'net' => -5390.00,
                'entry_r' => 'Break of day high',
                'exit_r' => 'False breakout trap, stopped out',
                'notes' => 'Fakeout at round number level 51000',
            ],
            // Additional August trades matching the calendar in the image
            ['date' => '2025-08-01', 'index' => 'NIFTY', 'type' => 'Intraday', 'strategy' => 'Long Straddle', 'option' => 'Both', 'net' => 12300.00, 'gross_p' => 12600.00, 'gross_l' => 0.00, 'charges' => 300.00, 'lots' => 2],
            ['date' => '2025-08-04', 'index' => 'BANKNIFTY', 'type' => 'Intraday', 'strategy' => 'Directional PE', 'option' => 'PE', 'net' => -8200.00, 'gross_p' => 0.00, 'gross_l' => 8000.00, 'charges' => 200.00, 'lots' => 3],
            ['date' => '2025-08-05', 'index' => 'NIFTY', 'type' => 'Intraday', 'strategy' => 'Directional CE', 'option' => 'CE', 'net' => 15400.00, 'gross_p' => 15700.00, 'gross_l' => 0.00, 'charges' => 300.00, 'lots' => 2],
            ['date' => '2025-08-06', 'index' => 'SENSEX', 'type' => 'Intraday', 'strategy' => 'Long Straddle', 'option' => 'Both', 'net' => 6800.00, 'gross_p' => 7050.00, 'gross_l' => 0.00, 'charges' => 250.00, 'lots' => 2],
            ['date' => '2025-08-07', 'index' => 'BANKNIFTY', 'type' => 'Intraday', 'strategy' => 'Directional CE', 'option' => 'CE', 'net' => -12100.00, 'gross_p' => 0.00, 'gross_l' => 11800.00, 'charges' => 300.00, 'lots' => 4],
            ['date' => '2025-08-08', 'index' => 'NIFTY', 'type' => 'BTST', 'strategy' => 'BTST', 'option' => 'CE', 'net' => 18600.00, 'gross_p' => 18950.00, 'gross_l' => 0.00, 'charges' => 350.00, 'lots' => 3],
            ['date' => '2025-08-11', 'index' => 'BANKEX', 'type' => 'Intraday', 'strategy' => 'Directional PE', 'option' => 'PE', 'net' => 9300.00, 'gross_p' => 9550.00, 'gross_l' => 0.00, 'charges' => 250.00, 'lots' => 2],
            ['date' => '2025-08-12', 'index' => 'STOCKS', 'type' => 'Intraday', 'strategy' => 'Other', 'option' => 'CE', 'net' => 4100.00, 'gross_p' => 4300.00, 'gross_l' => 0.00, 'charges' => 200.00, 'lots' => 1],
            ['date' => '2025-08-13', 'index' => 'NIFTY', 'type' => 'Intraday', 'strategy' => 'Directional PE', 'option' => 'PE', 'net' => -5700.00, 'gross_p' => 0.00, 'gross_l' => 5500.00, 'charges' => 200.00, 'lots' => 2],
            ['date' => '2025-08-14', 'index' => 'BANKNIFTY', 'type' => 'Intraday', 'strategy' => 'Long Straddle', 'option' => 'Both', 'net' => 11200.00, 'gross_p' => 11500.00, 'gross_l' => 0.00, 'charges' => 300.00, 'lots' => 3],
            ['date' => '2025-08-15', 'index' => 'SENSEX', 'type' => 'BTST', 'strategy' => 'BTST', 'option' => 'CE', 'net' => 7600.00, 'gross_p' => 7850.00, 'gross_l' => 0.00, 'charges' => 250.00, 'lots' => 2],
            ['date' => '2025-08-18', 'index' => 'NIFTY', 'type' => 'Intraday', 'strategy' => 'Directional PE', 'option' => 'PE', 'net' => -14800.00, 'gross_p' => 0.00, 'gross_l' => 14450.00, 'charges' => 350.00, 'lots' => 4],
            ['date' => '2025-08-19', 'index' => 'BANKNIFTY', 'type' => 'Intraday', 'strategy' => 'Long Straddle', 'option' => 'Both', 'net' => 13200.00, 'gross_p' => 13500.00, 'gross_l' => 0.00, 'charges' => 300.00, 'lots' => 3],
            ['date' => '2025-08-20', 'index' => 'NIFTY', 'type' => 'Intraday', 'strategy' => 'Directional CE', 'option' => 'CE', 'net' => 8900.00, 'gross_p' => 9150.00, 'gross_l' => 0.00, 'charges' => 250.00, 'lots' => 2],
            ['date' => '2025-08-21', 'index' => 'SENSEX', 'type' => 'Intraday', 'strategy' => 'Directional PE', 'option' => 'PE', 'net' => -9100.00, 'gross_p' => 0.00, 'gross_l' => 8850.00, 'charges' => 250.00, 'lots' => 2],
            ['date' => '2025-08-22', 'index' => 'BANKEX', 'type' => 'Intraday', 'strategy' => 'Long Straddle', 'option' => 'Both', 'net' => 6400.00, 'gross_p' => 6650.00, 'gross_l' => 0.00, 'charges' => 250.00, 'lots' => 2],
            ['date' => '2025-08-25', 'index' => 'NIFTY', 'type' => 'Intraday', 'strategy' => 'Directional CE', 'option' => 'CE', 'net' => 10700.00, 'gross_p' => 10950.00, 'gross_l' => 0.00, 'charges' => 250.00, 'lots' => 2],
            ['date' => '2025-08-26', 'index' => 'BANKNIFTY', 'type' => 'Intraday', 'strategy' => 'Directional PE', 'option' => 'PE', 'net' => -6200.00, 'gross_p' => 0.00, 'gross_l' => 6000.00, 'charges' => 200.00, 'lots' => 2],
            ['date' => '2025-08-27', 'index' => 'NIFTY', 'type' => 'Intraday', 'strategy' => 'Long Straddle', 'option' => 'Both', 'net' => 12300.00, 'gross_p' => 12600.00, 'gross_l' => 0.00, 'charges' => 300.00, 'lots' => 3],
            ['date' => '2025-08-28', 'index' => 'STOCKS', 'type' => 'Intraday', 'strategy' => 'Other', 'option' => 'CE', 'net' => 9800.00, 'gross_p' => 10050.00, 'gross_l' => 0.00, 'charges' => 250.00, 'lots' => 2],
        ];

        foreach ($seedTrades as $st) {
            $trade = Trade::create([
                'user_id' => $user->id,
                'trading_account_id' => $account->id,
                'trade_date' => $st['date'],
                'index_name' => $st['index'],
                'trading_type' => $st['type'],
                'strategy_name' => $st['strategy'],
                'option_type' => $st['option'],
                'strike_price' => $st['strike'] ?? 24500,
                'expiry_date' => $st['expiry'] ?? '2025-09-04',
                'entry_premium' => $st['entry'] ?? 150.00,
                'exit_premium' => $st['exit'] ?? ($st['net'] > 0 ? 220.00 : 90.00),
                'quantity' => $st['qty'] ?? 100,
                'lots' => $st['lots'] ?? 2,
                'gross_profit' => $st['gross_p'],
                'gross_loss' => $st['gross_l'],
                'brokerage' => $st['brokerage'] ?? 40.00,
                'stt' => $st['stt'] ?? 15.00,
                'exchange_charges' => $st['exchange'] ?? 12.00,
                'gst' => $st['gst'] ?? 9.50,
                'sebi_charges' => $st['sebi'] ?? 0.50,
                'stamp_duty' => $st['stamp'] ?? 0.00,
                'other_charges' => $st['other'] ?? 133.00,
                'total_charges' => $st['charges'],
                'net_pnl' => $st['net'],
                'entry_reason' => $st['entry_r'] ?? 'Technical breakout on 5m chart',
                'exit_reason' => $st['exit_r'] ?? 'Hit take-profit target',
                'notes' => $st['notes'] ?? 'Standard setup execution',
            ]);

            if (isset($st['journal'])) {
                TradeJournal::create(array_merge(['trade_id' => $trade->id], $st['journal']));
            } else {
                TradeJournal::create([
                    'trade_id' => $trade->id,
                    'market_conditions' => $st['net'] > 0 ? 'Favorable trending market with clear directional bias' : 'Choppy consolidative price action',
                    'trade_setup' => 'Multi-timeframe confirmation with volume spike',
                    'what_went_right' => $st['net'] > 0 ? 'Followed predefined risk:reward rules' : 'Controlled position size',
                    'what_went_wrong' => $st['net'] < 0 ? 'Late entry chasing price momentum' : 'Exited slightly before optimal peak',
                    'mistakes_made' => $st['net'] < 0 ? 'Felt FOMO after first 15m candle' : 'None',
                    'lessons_learned' => 'Always wait for retest before entering breakouts',
                    'personal_notes' => 'Mental discipline improving steadily',
                ]);
            }
        }

        // Also add trades for Today and current week / current month so real-time viewing has live data!
        $today = Carbon::today('Asia/Kolkata');
        $liveTrades = [
            [
                'date' => $today->toDateString(),
                'index' => 'NIFTY',
                'type' => 'Intraday',
                'strategy' => 'Directional CE',
                'option' => 'CE',
                'strike' => 25200,
                'net' => 12350.00,
                'gross_p' => 12550.00,
                'gross_l' => 0.00,
                'charges' => 200.00,
                'lots' => 2,
            ],
            [
                'date' => $today->copy()->subDay()->toDateString(),
                'index' => 'BANKNIFTY',
                'type' => 'Intraday',
                'strategy' => 'Long Straddle',
                'option' => 'Both',
                'strike' => 52000,
                'net' => 15400.00,
                'gross_p' => 15700.00,
                'gross_l' => 0.00,
                'charges' => 300.00,
                'lots' => 3,
            ],
            [
                'date' => $today->copy()->subDays(2)->toDateString(),
                'index' => 'SENSEX',
                'type' => 'Intraday',
                'strategy' => 'Directional PE',
                'option' => 'PE',
                'strike' => 82500,
                'net' => -6200.00,
                'gross_p' => 0.00,
                'gross_l' => 6000.00,
                'charges' => 200.00,
                'lots' => 2,
            ],
            [
                'date' => $today->copy()->subDays(3)->toDateString(),
                'index' => 'NIFTY',
                'type' => 'BTST',
                'strategy' => 'BTST',
                'option' => 'CE',
                'strike' => 25150,
                'net' => 8900.00,
                'gross_p' => 9150.00,
                'gross_l' => 0.00,
                'charges' => 250.00,
                'lots' => 2,
            ],
            [
                'date' => $today->copy()->subDays(4)->toDateString(),
                'index' => 'BANKNIFTY',
                'type' => 'Intraday',
                'strategy' => 'Directional CE',
                'option' => 'CE',
                'strike' => 51800,
                'net' => 11200.00,
                'gross_p' => 11500.00,
                'gross_l' => 0.00,
                'charges' => 300.00,
                'lots' => 3,
            ]
        ];

        foreach ($liveTrades as $lt) {
            $tr = Trade::create([
                'user_id' => $user->id,
                'trading_account_id' => $account->id,
                'trade_date' => $lt['date'],
                'index_name' => $lt['index'],
                'trading_type' => $lt['type'],
                'strategy_name' => $lt['strategy'],
                'option_type' => $lt['option'],
                'strike_price' => $lt['strike'],
                'expiry_date' => $today->copy()->endOfWeek()->toDateString(),
                'entry_premium' => 160.00,
                'exit_premium' => $lt['net'] > 0 ? 240.00 : 100.00,
                'quantity' => 100,
                'lots' => $lt['lots'],
                'gross_profit' => $lt['gross_p'],
                'gross_loss' => $lt['gross_l'],
                'brokerage' => 40.00,
                'stt' => 15.00,
                'exchange_charges' => 12.00,
                'gst' => 9.50,
                'sebi_charges' => 0.50,
                'stamp_duty' => 0.00,
                'other_charges' => 123.00,
                'total_charges' => $lt['charges'],
                'net_pnl' => $lt['net'],
                'entry_reason' => 'Trend following momentum setup',
                'exit_reason' => 'Standard target exit',
                'notes' => 'Execution on live chart',
            ]);

            TradeJournal::create([
                'trade_id' => $tr->id,
                'market_conditions' => 'Current market volatility',
                'trade_setup' => 'EMA cross + RSI divergence',
                'what_went_right' => 'Timely stop adjustment',
                'what_went_wrong' => 'None',
                'mistakes_made' => 'None',
                'lessons_learned' => 'Stay calm and stick to rules',
                'personal_notes' => 'Good discipline',
            ]);
        }
    }
}
