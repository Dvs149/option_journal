<?php

namespace Tests\Feature;

use App\Models\CapitalTransaction;
use App\Models\Trade;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CapitalApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_capital_endpoint_filters_by_timeframe_and_dates(): void
    {
        $user = User::factory()->create();
        $account = $user->tradingAccounts()->create([
            'account_name' => 'Capital Test Account',
            'initial_capital' => 500000.00,
            'is_default' => true,
        ]);

        $token = $user->createToken('test_token')->plainTextToken;

        // Trade in 2023 (earlier history)
        Trade::create([
            'user_id' => $user->id,
            'trading_account_id' => $account->id,
            'strategy_name' => 'Trend Following',
            'trade_date' => '2023-05-10',
            'effective_date' => '2023-05-10',
            'index_name' => 'NIFTY',
            'strike_price' => 18000,
            'option_type' => 'CE',
            'trading_type' => 'INTRADAY',
            'entry_time' => '09:30:00',
            'exit_time' => '10:00:00',
            'lots' => 1,
            'quantity' => 50,
            'entry_price' => 100,
            'exit_price' => 120,
            'gross_profit' => 1000,
            'total_charges' => 50,
            'net_pnl' => 950,
            'status' => 'CLOSED',
        ]);

        // Transaction in current month
        $today = Carbon::today('Asia/Kolkata');
        $thisMonthDate = $today->toDateString();

        Trade::create([
            'user_id' => $user->id,
            'trading_account_id' => $account->id,
            'strategy_name' => 'Reversal',
            'trade_date' => $thisMonthDate,
            'effective_date' => $thisMonthDate,
            'index_name' => 'BANKNIFTY',
            'strike_price' => 45000,
            'option_type' => 'PE',
            'trading_type' => 'INTRADAY',
            'entry_time' => '11:00:00',
            'exit_time' => '12:00:00',
            'lots' => 1,
            'quantity' => 15,
            'entry_price' => 200,
            'exit_price' => 250,
            'gross_profit' => 750,
            'total_charges' => 50,
            'net_pnl' => 700,
            'status' => 'CLOSED',
        ]);

        CapitalTransaction::create([
            'user_id' => $user->id,
            'trading_account_id' => $account->id,
            'transaction_type' => 'withdrawal',
            'amount' => 5000,
            'transaction_date' => $thisMonthDate,
            'notes' => 'Partial profit withdrawal',
        ]);

        // 1. Request with filter=1m
        $response1m = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/capital?filter=1m');

        $response1m->assertStatus(200)
            ->assertJsonStructure([
                'initial_capital',
                'current_capital',
                'opening_capital',
                'total_profit',
                'growth_chart',
                'date_range',
            ]);

        $data1m = $response1m->json();
        // The growth chart for 1m should NOT contain the 2023 trade
        $chartDates = collect($data1m['growth_chart'])->pluck('date')->toArray();
        $this->assertNotContains('2023-05-10', $chartDates);
        $this->assertEquals(700, $data1m['period_profit']);

        // 2. Request with filter=all
        $responseAll = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/capital?filter=all');

        $responseAll->assertStatus(200);
        $dataAll = $responseAll->json();
        $allChartDates = collect($dataAll['growth_chart'])->pluck('date')->toArray();
        $this->assertContains('2023-05-10', $allChartDates);
        $this->assertEquals(1650, $dataAll['total_profit']);
    }
}
