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
}
