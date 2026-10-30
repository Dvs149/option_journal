<?php

namespace App\Services;

class TradingCalculationService
{
    /**
     * Compute charges and Net P&L accurately.
     */
    public function calculate(array $data): array
    {
        $brokerage = round((float) ($data['brokerage'] ?? 0), 2);
        $stt = round((float) ($data['stt'] ?? 0), 2);
        $exchangeCharges = round((float) ($data['exchange_charges'] ?? 0), 2);
        $gst = round((float) ($data['gst'] ?? 0), 2);
        $sebiCharges = round((float) ($data['sebi_charges'] ?? 0), 2);
        $stampDuty = round((float) ($data['stamp_duty'] ?? 0), 2);
        $otherCharges = round((float) ($data['other_charges'] ?? 0), 2);

        $totalCharges = round($brokerage + $stt + $exchangeCharges + $gst + $sebiCharges + $stampDuty + $otherCharges, 2);

        $entryPremium = isset($data['entry_premium']) && $data['entry_premium'] !== '' ? (float) $data['entry_premium'] : null;
        $exitPremium = isset($data['exit_premium']) && $data['exit_premium'] !== '' ? (float) $data['exit_premium'] : null;
        $quantity = isset($data['quantity']) && $data['quantity'] !== '' ? (int) $data['quantity'] : null;

        $grossProfit = round((float) ($data['gross_profit'] ?? 0), 2);
        $grossLoss = round((float) ($data['gross_loss'] ?? 0), 2);

        // If premiums and quantity are specified, compute gross profit / loss automatically
        if ($entryPremium !== null && $exitPremium !== null && $quantity !== null && $quantity > 0) {
            $diff = round(($exitPremium - $entryPremium) * $quantity, 2);
            if ($diff >= 0) {
                $grossProfit = $diff;
                $grossLoss = 0.00;
            } else {
                $grossProfit = 0.00;
                $grossLoss = abs($diff);
            }
        } elseif (isset($data['net_pnl_manual']) && $data['net_pnl_manual'] !== '') {
            // Manual net P&L input provided
            $manualNet = round((float) $data['net_pnl_manual'], 2);
            if ($manualNet >= 0) {
                $grossProfit = round($manualNet + $totalCharges, 2);
                $grossLoss = 0.00;
            } else {
                $grossProfit = 0.00;
                $grossLoss = round(abs($manualNet) - $totalCharges > 0 ? abs($manualNet) - $totalCharges : abs($manualNet), 2);
            }
        }

        $netPnl = round($grossProfit - $grossLoss - $totalCharges, 2);

        return [
            'gross_profit' => $grossProfit,
            'gross_loss' => $grossLoss,
            'brokerage' => $brokerage,
            'stt' => $stt,
            'exchange_charges' => $exchangeCharges,
            'gst' => $gst,
            'sebi_charges' => $sebiCharges,
            'stamp_duty' => $stampDuty,
            'other_charges' => $otherCharges,
            'total_charges' => $totalCharges,
            'net_pnl' => $netPnl,
        ];
    }

    /**
     * Helper to estimate standard Indian option trade charges dynamically based on Zerodha / SEBI regulatory schedule
     *
     * @param float $entryPremium Buy premium per share
     * @param float $exitPremium Sell premium per share
     * @param int $quantity Total quantity (lots * lot_size)
     * @param int $orders Number of executed orders (default 2 for round-trip buy + sell; 4 for Both CE+PE)
     * @param string $exchange Exchange: 'NSE' or 'BSE'
     * @param array|null $rates Custom or user-configured rates
     * @return array Breakdown of charges and turnovers
     */
    public function estimateIndianCharges(
        float $entryPremium,
        float $exitPremium,
        int $quantity,
        int $orders = 2,
        string $exchange = 'NSE',
        ?array $rates = null
    ): array {
        // Fallback to official defaults
        $brokeragePerOrder = (float) ($rates['brokerage_per_order'] ?? 20.00);
        $sttRatePercent = (float) ($rates['stt_rate_percent'] ?? 0.15000);
        $nseRatePercent = (float) ($rates['nse_txn_rate_percent'] ?? 0.03553);
        $bseRatePercent = (float) ($rates['bse_txn_rate_percent'] ?? 0.03250);
        $gstRatePercent = (float) ($rates['gst_rate_percent'] ?? 18.00);
        $sebiPerCrore = (float) ($rates['sebi_per_crore'] ?? 10.00);
        $stampDutyRatePercent = (float) ($rates['stamp_duty_rate_percent'] ?? 0.00300);

        $turnoverBuy = $entryPremium * $quantity;
        $turnoverSell = $exitPremium * $quantity;
        $totalTurnover = $turnoverBuy + $turnoverSell;

        // 1. Brokerage: Flat ₹20 per executed order (default 2 orders for round-trip)
        $numOrders = max(1, $orders);
        $brokerage = round($brokeragePerOrder * $numOrders, 2);

        // 2. STT: 0.15% on sell side premium turnover
        $stt = round($turnoverSell * ($sttRatePercent / 100), 2);

        // 3. Exchange transaction charges: NSE 0.03553% or BSE 0.0325% on total premium turnover
        $isBse = strtoupper(trim($exchange)) === 'BSE';
        $exchangeRatePercent = $isBse ? $bseRatePercent : $nseRatePercent;
        $exchangeCharges = round($totalTurnover * ($exchangeRatePercent / 100), 2);

        // 4. SEBI turnover charges: ₹10 per crore (0.0001%)
        $sebiCharges = round($totalTurnover * ($sebiPerCrore / 10000000), 2);

        // 5. Stamp Duty: 0.003% (₹300/crore) on buy premium turnover
        $stampDuty = round($turnoverBuy * ($stampDutyRatePercent / 100), 2);

        // 6. GST: 18% on (brokerage + SEBI charges + exchange transaction charges)
        $gst = round(($brokerage + $exchangeCharges + $sebiCharges) * ($gstRatePercent / 100), 2);

        $totalCharges = round($brokerage + $stt + $exchangeCharges + $sebiCharges + $stampDuty + $gst, 2);

        return [
            'brokerage' => $brokerage,
            'stt' => $stt,
            'exchange_charges' => $exchangeCharges,
            'gst' => $gst,
            'sebi_charges' => $sebiCharges,
            'stamp_duty' => $stampDuty,
            'other_charges' => 0.00,
            'total_charges' => $totalCharges,
            'turnover_buy' => round($turnoverBuy, 2),
            'turnover_sell' => round($turnoverSell, 2),
            'total_turnover' => round($totalTurnover, 2),
            'exchange' => $isBse ? 'BSE' : 'NSE',
            'orders' => $numOrders,
            'rates' => [
                'brokerage_per_order' => $brokeragePerOrder,
                'stt_rate_percent' => $sttRatePercent,
                'exchange_rate_percent' => $exchangeRatePercent,
                'gst_rate_percent' => $gstRatePercent,
                'sebi_per_crore' => $sebiPerCrore,
                'stamp_duty_rate_percent' => $stampDutyRatePercent,
            ],
        ];
    }
}
