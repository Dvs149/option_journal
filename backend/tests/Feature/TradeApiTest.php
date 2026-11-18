<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TradeApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_registration_and_login(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Amit Sharma',
            'email' => 'amit@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'initial_capital' => 300000.00,
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['message', 'user', 'token']);

        $loginResponse = $this->postJson('/api/login', [
            'email' => 'amit@example.com',
            'password' => 'password123',
        ]);

        $loginResponse->assertStatus(200)
            ->assertJsonStructure(['message', 'user', 'token']);
    }

    public function test_create_and_manage_trade(): void
    {
        $user = User::factory()->create();
        $account = $user->tradingAccounts()->create([
            'account_name' => 'Primary Test Account',
            'initial_capital' => 500000.00,
            'is_default' => true,
        ]);

        $token = $user->createToken('test_token')->plainTextToken;

        // Create trade
        $tradeResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/trades', [
                'trading_account_id' => $account->id,
                'trade_date' => '2025-08-31',
                'index_name' => 'NIFTY',
                'trading_type' => 'Intraday',
                'strategy_name' => 'Directional CE',
                'option_type' => 'CE',
                'strike_price' => 24800,
                'entry_premium' => 140.00,
                'exit_premium' => 265.00,
                'quantity' => 100,
                'lots' => 2,
                'brokerage' => 40.00,
                'stt' => 16.50,
                'exchange_charges' => 13.20,
                'gst' => 9.80,
                'sebi_charges' => 0.50,
                'stamp_duty' => 0.00,
                'other_charges' => 70.00,
                'entry_reason' => '15m VWAP breakout',
                'exit_reason' => '1:2 target reached',
                'market_conditions' => 'Bullish trend',
            ]);

        $tradeResponse->assertStatus(201)
            ->assertJsonPath('trade.net_pnl', '12350.00');

        $tradeId = $tradeResponse->json('trade.id');

        // Fetch dashboard
        $dashResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/dashboard?filter=all');

        $dashResponse->assertStatus(200)
            ->assertJsonStructure([
                'account',
                'stats' => ['total_net_profit', 'win_rate', 'current_capital'],
                'charts' => ['daily_pnl', 'equity_curve'],
            ]);

        // Duplicate trade
        $duplicateResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson("/api/trades/{$tradeId}/duplicate");

        $duplicateResponse->assertStatus(201);

        // Delete trade
        $deleteResponse = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->deleteJson("/api/trades/{$tradeId}");

        $deleteResponse->assertStatus(200);
    }

    public function test_sync_and_import_orders_in_ascending_creation_order(): void
    {
        $user = User::factory()->create();
        $account = $user->tradingAccounts()->create([
            'account_name' => 'Ascending Test Account',
            'initial_capital' => 500000.00,
            'is_default' => true,
        ]);

        $token = $user->createToken('test_token')->plainTextToken;

        // Provide orders intentionally in reverse / descending order (latest first):
        // Trade 2: 14:44 BUY, 14:47 SELL
        // Trade 1: 09:40 BUY, 09:41 SELL
        $reverseOrders = [
            [
                'id' => 'ord_4',
                'order_id' => 'ord_4',
                'raw_timestamp' => '2026-11-18 14:47:24',
                'time' => '14:47:24',
                'type' => 'SELL',
                'index_name' => 'SENSEX',
                'strike_price' => '82100',
                'option_type' => 'CE',
                'quantity' => 300,
                'price' => 323.83,
            ],
            [
                'id' => 'ord_3',
                'order_id' => 'ord_3',
                'raw_timestamp' => '2026-11-18 14:44:50',
                'time' => '14:44:50',
                'type' => 'BUY',
                'index_name' => 'SENSEX',
                'strike_price' => '82100',
                'option_type' => 'CE',
                'quantity' => 300,
                'price' => 317.55,
            ],
            [
                'id' => 'ord_2',
                'order_id' => 'ord_2',
                'raw_timestamp' => '2026-11-18 09:41:08',
                'time' => '09:41:08',
                'type' => 'SELL',
                'index_name' => 'SENSEX',
                'strike_price' => '82200',
                'option_type' => 'CE',
                'quantity' => 100,
                'price' => 349.01,
            ],
            [
                'id' => 'ord_1',
                'order_id' => 'ord_1',
                'raw_timestamp' => '2026-11-18 09:40:38',
                'time' => '09:40:38',
                'type' => 'BUY',
                'index_name' => 'SENSEX',
                'strike_price' => '82200',
                'option_type' => 'CE',
                'quantity' => 100,
                'price' => 341.32,
            ],
        ];

        $res = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/trades/import-screenshot-orders', [
                'orders' => $reverseOrders,
                'trade_date' => '2026-11-18',
                'import_mode' => 'smart',
                'option_type' => 'auto',
            ]);

        $res->assertStatus(200);
        $tradeIds = $res->json('trade_ids');
        $this->assertCount(2, $tradeIds);

        // Verify that Trade 1 (09:40) was created FIRST and has a LOWER ID than Trade 2 (14:44)
        $firstCreatedTrade = \App\Models\Trade::find($tradeIds[0]);
        $secondCreatedTrade = \App\Models\Trade::find($tradeIds[1]);

        $this->assertEquals(82200, (int)$firstCreatedTrade->strike_price);
        $this->assertEquals(82100, (int)$secondCreatedTrade->strike_price);
        $this->assertLessThan($secondCreatedTrade->id, $firstCreatedTrade->id);

        // Verify that within Trade 1, Leg 1 (BUY 09:40) is order #1 and Leg 2 (SELL 09:41) is order #2
        $ordersT1 = $firstCreatedTrade->orders;
        $this->assertEquals('BUY', $ordersT1[0]->order_type);
        $this->assertEquals('SELL', $ordersT1[1]->order_type);
        $this->assertLessThan($ordersT1[1]->id, $ordersT1[0]->id);
    }
}
