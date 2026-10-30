<?php

namespace Tests\Unit;

use App\Services\TradingAnalyticsService;
use App\Services\TradingCalculationService;
use PHPUnit\Framework\TestCase;

class FinancialCalculationTest extends TestCase
{
    protected TradingCalculationService $calcService;
    protected TradingAnalyticsService $analyticsService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->calcService = new TradingCalculationService();
        $this->analyticsService = new TradingAnalyticsService();
    }

    public function test_automatic_pnl_and_charges_calculation(): void
    {
        $input = [
            'entry_premium' => 150.00,
            'exit_premium' => 200.00,
            'quantity' => 100,
            'brokerage' => 40.00,
            'stt' => 12.50,
            'exchange_charges' => 17.50,
            'gst' => 10.35,
            'sebi_charges' => 0.50,
            'stamp_duty' => 0.45,
            'other_charges' => 0.00,
        ];

        $result = $this->calcService->calculate($input);

        // Expected gross profit: (200 - 150) * 100 = 5000.00
        $this->assertEquals(5000.00, $result['gross_profit']);
        $this->assertEquals(0.00, $result['gross_loss']);

        // Expected total charges: 40 + 12.50 + 17.50 + 10.35 + 0.50 + 0.45 = 81.30
        $this->assertEquals(81.30, $result['total_charges']);

        // Expected net P&L: 5000 - 0 - 81.30 = 4918.70
        $this->assertEquals(4918.70, $result['net_pnl']);
    }

    public function test_losing_trade_pnl_calculation(): void
    {
        $input = [
            'entry_premium' => 250.00,
            'exit_premium' => 180.00,
            'quantity' => 50,
            'brokerage' => 40.00,
            'stt' => 10.00,
            'exchange_charges' => 10.00,
            'gst' => 9.00,
            'sebi_charges' => 0.50,
            'stamp_duty' => 0.50,
            'other_charges' => 0.00,
        ];

        $result = $this->calcService->calculate($input);

        // Gross loss: (250 - 180) * 50 = 3500.00
        $this->assertEquals(0.00, $result['gross_profit']);
        $this->assertEquals(3500.00, $result['gross_loss']);
        $this->assertEquals(70.00, $result['total_charges']);

        // Net P&L: 0 - 3500 - 70 = -3570.00
        $this->assertEquals(-3570.00, $result['net_pnl']);
    }

    public function test_drawdown_calculation(): void
    {
        $initialCapital = 500000.00;
        
        // Mock trades: Day 1: +50k (Peak 550k)
        //              Day 2: -30k (Cap 520k -> DD 30k)
        //              Day 3: -20k (Cap 500k -> DD 50k)
        //              Day 4: +60k (Cap 560k -> New Peak 560k)
        //              Day 5: -10k (Cap 550k -> Current DD 10k)
        $trades = collect([
            (object)['trade_date' => '2025-08-01', 'net_pnl' => 50000.00],
            (object)['trade_date' => '2025-08-02', 'net_pnl' => -30000.00],
            (object)['trade_date' => '2025-08-03', 'net_pnl' => -20000.00],
            (object)['trade_date' => '2025-08-04', 'net_pnl' => 60000.00],
            (object)['trade_date' => '2025-08-05', 'net_pnl' => -10000.00],
        ]);

        $res = $this->analyticsService->calculateDrawdown($initialCapital, collect(), $trades);

        $this->assertEquals(560000.00, $res['highest_capital']);
        $this->assertEquals(50000.00, $res['max_drawdown']);
        $this->assertEquals(10000.00, $res['current_drawdown']);
    }
}
