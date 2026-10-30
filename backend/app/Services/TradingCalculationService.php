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
     * Helper to estimate standard Indian option trade charges
     */
    public function estimateIndianCharges(float $entryPremium, float $exitPremium, int $quantity, int $trades = 1): array
    {
        $turnoverBuy = $entryPremium * $quantity;
        $turnoverSell = $exitPremium * $quantity;
        $totalTurnover = $turnoverBuy + $turnoverSell;

        // Brokerage: ₹20 per order (buy + sell = ₹40 per completed trade)
        $brokerage = 20.00 * 2 * $trades;

        // STT: 0.0625% on sell side premium turnover
        $stt = round($turnoverSell * 0.000625, 2);

        // Exchange transaction charges: ~0.05% on total premium turnover
        $exchangeCharges = round($totalTurnover * 0.0005, 2);

        // SEBI turnover charges: ₹10 per crore (0.0001%)
        $sebiCharges = round($totalTurnover * 0.000001, 2);

        // Stamp Duty: 0.003% on buy premium turnover
        $stampDuty = round($turnoverBuy * 0.00003, 2);

        // GST: 18% on (brokerage + exchange charges + sebi charges)
        $gst = round(($brokerage + $exchangeCharges + $sebiCharges) * 0.18, 2);

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
        ];
    }
}
