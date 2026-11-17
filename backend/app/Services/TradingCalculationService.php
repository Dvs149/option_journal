<?php

namespace App\Services;

use App\Models\IndexLotSize;
use App\Models\Trade;
use App\Models\TradeOrder;

class TradingCalculationService
{
    /**
     * Compute charges and Net P&L accurately.
     */
    public function calculate(array $data): array
    {
        $brokerage = round(max(0.0, abs((float) ($data['brokerage'] ?? 0))), 2);
        $stt = round(max(0.0, abs((float) ($data['stt'] ?? 0))), 2);
        $exchangeCharges = round(max(0.0, abs((float) ($data['exchange_charges'] ?? 0))), 2);
        $gst = round(max(0.0, abs((float) ($data['gst'] ?? 0))), 2);
        $sebiCharges = round(max(0.0, abs((float) ($data['sebi_charges'] ?? 0))), 2);
        $stampDuty = round(max(0.0, abs((float) ($data['stamp_duty'] ?? 0))), 2);
        $otherCharges = round(max(0.0, abs((float) ($data['other_charges'] ?? 0))), 2);

        $totalCharges = round($brokerage + $stt + $exchangeCharges + $gst + $sebiCharges + $stampDuty + $otherCharges, 2);

        $status = $data['status'] ?? null;
        $entryPremium = isset($data['entry_premium']) && $data['entry_premium'] !== '' ? max(0.0, abs((float) $data['entry_premium'])) : null;
        $exitPremium = isset($data['exit_premium']) && $data['exit_premium'] !== '' ? max(0.0, abs((float) $data['exit_premium'])) : null;
        $quantity = isset($data['quantity']) && $data['quantity'] !== '' ? max(1, abs((int) $data['quantity'])) : null;

        $isOpen = ($status === 'OPEN') || (
            empty($exitPremium) &&
            empty($data['ce_exit_price']) &&
            empty($data['pe_exit_price']) &&
            empty($data['net_pnl_manual'])
        );

        if ($isOpen) {
            $grossProfit = 0.00;
            $grossLoss = 0.00;
            $netPnl = round(-$totalCharges, 2);

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
        ?array $rates = null,
        bool $isOpen = false
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
        $turnoverSell = $isOpen ? 0.0 : ($exitPremium * $quantity);
        $totalTurnover = $turnoverBuy + $turnoverSell;

        // 1. Brokerage: Flat ₹20 per executed order (1 order for open buy position, 2 for round-trip)
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

    /**
     * Helper to compute regulatory charges for an individual BUY or SELL order execution.
     */
    public function estimateSingleOrderCharges(
        string $side,
        float $price,
        int $quantity,
        string $exchange = 'NSE',
        ?array $rates = null
    ): array {
        $brokeragePerOrder = (float) ($rates['brokerage_per_order'] ?? 20.00);
        $sttRatePercent = (float) ($rates['stt_rate_percent'] ?? 0.15000);
        $nseRatePercent = (float) ($rates['nse_txn_rate_percent'] ?? 0.03553);
        $bseRatePercent = (float) ($rates['bse_txn_rate_percent'] ?? 0.03250);
        $gstRatePercent = (float) ($rates['gst_rate_percent'] ?? 18.00);
        $sebiPerCrore = (float) ($rates['sebi_per_crore'] ?? 10.00);
        $stampDutyRatePercent = (float) ($rates['stamp_duty_rate_percent'] ?? 0.00300);

        $turnover = round($price * $quantity, 2);
        $isBuy = strtoupper(trim($side)) === 'BUY';
        $isBse = strtoupper(trim($exchange)) === 'BSE';
        $exchangeRatePercent = $isBse ? $bseRatePercent : $nseRatePercent;

        $brokerage = round($brokeragePerOrder, 2);
        $stt = $isBuy ? 0.00 : round($turnover * ($sttRatePercent / 100), 2);
        $stampDuty = $isBuy ? round($turnover * ($stampDutyRatePercent / 100), 2) : 0.00;
        $exchangeCharges = round($turnover * ($exchangeRatePercent / 100), 2);
        $sebiCharges = round($turnover * ($sebiPerCrore / 10000000), 2);
        $gst = round(($brokerage + $exchangeCharges + $sebiCharges) * ($gstRatePercent / 100), 2);

        $totalCharges = round($brokerage + $stt + $exchangeCharges + $sebiCharges + $stampDuty + $gst, 2);

        return [
            'order_type' => $isBuy ? 'BUY' : 'SELL',
            'turnover' => $turnover,
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

    /**
     * Recalculate a trade's quantities, status, average prices, realized P&L, charges, and net P&L
     * strictly based on its associated executed TradeOrders.
     */
    public function recalculateTradeFromOrders(Trade $trade): Trade
    {
        $allOrders = $trade->orders()->orderBy('order_date', 'asc')->orderBy('id', 'asc')->get();
        if ($allOrders->isEmpty()) {
            return $trade;
        }

        $buyOrders = $allOrders->where('order_type', 'BUY');
        $sellOrders = $allOrders->where('order_type', 'SELL');

        // STT is strictly 0.00 for all BUY orders in Indian Options trading (only charged on SELL)
        foreach ($buyOrders as $bo) {
            if ((float) $bo->stt !== 0.0) {
                $prevStt = (float) $bo->stt;
                $newTotal = max(0.0, round((float) $bo->total_charges - $prevStt, 2));
                $bo->update([
                    'stt' => 0.00,
                    'total_charges' => $newTotal,
                ]);
            }
        }

        $isBoth = $trade->option_type === 'Both';
        $ceBuyOrders = $buyOrders->filter(fn($o) => preg_match('/\bCE\b/i', (string) $o->notes));
        $peBuyOrders = $buyOrders->filter(fn($o) => preg_match('/\bPE\b/i', (string) $o->notes));
        $ceSellOrders = $sellOrders->filter(fn($o) => preg_match('/\bCE\b/i', (string) $o->notes));
        $peSellOrders = $sellOrders->filter(fn($o) => preg_match('/\bPE\b/i', (string) $o->notes));

        $hasSplitLegs = $isBoth && (
            $ceBuyOrders->isNotEmpty() || $peBuyOrders->isNotEmpty() ||
            $ceSellOrders->isNotEmpty() || $peSellOrders->isNotEmpty()
        );

        // Determine if initial entry was Short or Long
        $firstOrder = $allOrders->first();
        $isShortInitial = $firstOrder && strtoupper($firstOrder->order_type) === 'SELL';

        if ($hasSplitLegs) {
            // BUY LEG CALCULATIONS
            if ($ceBuyOrders->isNotEmpty()) {
                $ceBuyQty = (int) $ceBuyOrders->sum('quantity');
                $ceBuyCost = 0.0;
                foreach ($ceBuyOrders as $bo) {
                    $ceBuyCost += (float) $bo->price * (int) $bo->quantity;
                }
                $ceEntryPrice = $ceBuyQty > 0 ? round($ceBuyCost / $ceBuyQty, 2) : (float) ($trade->ce_entry_price ?: 0);
            } else {
                $ceBuyQty = (int) $buyOrders->sum('quantity');
                $ceEntryPrice = (float) ($trade->ce_entry_price ?: 0);
                $ceBuyCost = $ceEntryPrice * $ceBuyQty;
            }

            if ($peBuyOrders->isNotEmpty()) {
                $peBuyQty = (int) $peBuyOrders->sum('quantity');
                $peBuyCost = 0.0;
                foreach ($peBuyOrders as $bo) {
                    $peBuyCost += (float) $bo->price * (int) $bo->quantity;
                }
                $peEntryPrice = $peBuyQty > 0 ? round($peBuyCost / $peBuyQty, 2) : (float) ($trade->pe_entry_price ?: 0);
            } else {
                $peBuyQty = (int) $buyOrders->sum('quantity');
                $peEntryPrice = (float) ($trade->pe_entry_price ?: 0);
                $peBuyCost = $peEntryPrice * $peBuyQty;
            }

            $totalBuyQty = max($ceBuyQty, $peBuyQty);
            $avgEntryPrice = round($ceEntryPrice + $peEntryPrice, 2);

            // SELL LEG CALCULATIONS
            if ($ceSellOrders->isNotEmpty()) {
                $ceSellQty = (int) $ceSellOrders->sum('quantity');
                $ceSellProceeds = 0.0;
                foreach ($ceSellOrders as $so) {
                    $ceSellProceeds += (float) $so->price * (int) $so->quantity;
                }
                $ceExitPrice = $ceSellQty > 0 ? round($ceSellProceeds / $ceSellQty, 2) : null;
            } else {
                $ceSellQty = 0;
                $ceExitPrice = null;
            }

            if ($peSellOrders->isNotEmpty()) {
                $peSellQty = (int) $peSellOrders->sum('quantity');
                $peSellProceeds = 0.0;
                foreach ($peSellOrders as $so) {
                    $peSellProceeds += (float) $so->price * (int) $so->quantity;
                }
                $peExitPrice = $peSellQty > 0 ? round($peSellProceeds / $peSellQty, 2) : null;
            } else {
                $peSellQty = 0;
                $peExitPrice = null;
            }

            if ($ceSellOrders->isNotEmpty() || $peSellOrders->isNotEmpty()) {
                $totalSellQty = max($ceSellQty, $peSellQty);
                $avgExitPrice = ($ceExitPrice !== null || $peExitPrice !== null)
                    ? round((float) ($ceExitPrice ?? 0) + (float) ($peExitPrice ?? 0), 2)
                    : null;
            } else {
                $totalSellQty = (int) $sellOrders->sum('quantity');
                $totalSellProceeds = 0.0;
                foreach ($sellOrders as $so) {
                    $totalSellProceeds += (float) $so->price * (int) $so->quantity;
                }
                $avgExitPrice = $totalSellQty > 0 ? round($totalSellProceeds / $totalSellQty, 2) : null;
            }

            // Realized PnL per order (for Long straddle: SELL is exit; for Short straddle: BUY is exit)
            if (!$isShortInitial) {
                // Long Straddle: BUY entry, SELL exit
                foreach ($ceSellOrders as $so) {
                    $pnl = round(((float) $so->price - $ceEntryPrice) * (int) $so->quantity, 2);
                    if ((float) $so->realized_pnl !== $pnl) {
                        $so->update(['realized_pnl' => $pnl]);
                    }
                }
                foreach ($peSellOrders as $so) {
                    $pnl = round(((float) $so->price - $peEntryPrice) * (int) $so->quantity, 2);
                    if ((float) $so->realized_pnl !== $pnl) {
                        $so->update(['realized_pnl' => $pnl]);
                    }
                }
                $otherSellOrders = $sellOrders->reject(fn($o) => preg_match('/\b(CE|PE)\b/i', (string) $o->notes));
                foreach ($otherSellOrders as $so) {
                    $pnl = round(((float) $so->price - $avgEntryPrice) * (int) $so->quantity, 2);
                    if ((float) $so->realized_pnl !== $pnl) {
                        $so->update(['realized_pnl' => $pnl]);
                    }
                }
                $openQty = max(0, $totalBuyQty - $totalSellQty);
                $totalExitQty = $totalSellQty;
            } else {
                // Short Straddle: SELL entry, BUY exit
                $ceSellPrice = $ceSellQty > 0 ? round($ceSellProceeds / $ceSellQty, 2) : (float) ($trade->ce_entry_price ?: 0);
                $peSellPrice = $peSellQty > 0 ? round($peSellProceeds / $peSellQty, 2) : (float) ($trade->pe_entry_price ?: 0);
                foreach ($ceBuyOrders as $bo) {
                    $pnl = round(($ceSellPrice - (float) $bo->price) * (int) $bo->quantity, 2);
                    if ((float) $bo->realized_pnl !== $pnl) {
                        $bo->update(['realized_pnl' => $pnl]);
                    }
                }
                foreach ($peBuyOrders as $bo) {
                    $pnl = round(($peSellPrice - (float) $bo->price) * (int) $bo->quantity, 2);
                    if ((float) $bo->realized_pnl !== $pnl) {
                        $bo->update(['realized_pnl' => $pnl]);
                    }
                }
                $openQty = max(0, $totalSellQty - $totalBuyQty);
                $totalExitQty = $totalBuyQty;
            }
        } else {
            // Standard single-leg or combined Both trade
            if (!$isShortInitial) {
                // Long position (BUY to open, SELL to exit)
                $totalBuyQty = (int) $buyOrders->sum('quantity');
                $totalBuyCost = 0.0;
                foreach ($buyOrders as $bo) {
                    $totalBuyCost += (float) $bo->price * (int) $bo->quantity;
                }
                $avgEntryPrice = $totalBuyQty > 0 ? round($totalBuyCost / $totalBuyQty, 2) : (float) ($trade->entry_premium ?? 0);

                $totalSellQty = (int) $sellOrders->sum('quantity');
                $totalSellProceeds = 0.0;
                foreach ($sellOrders as $so) {
                    $totalSellProceeds += (float) $so->price * (int) $so->quantity;
                }
                $avgExitPrice = $totalSellQty > 0 ? round($totalSellProceeds / $totalSellQty, 2) : null;
                $ceEntryPrice = null;
                $peEntryPrice = null;
                $ceExitPrice = null;
                $peExitPrice = null;

                foreach ($sellOrders as $so) {
                    $pnl = round(((float) $so->price - $avgEntryPrice) * (int) $so->quantity, 2);
                    if ((float) $so->realized_pnl !== $pnl) {
                        $so->update(['realized_pnl' => $pnl]);
                    }
                }
                $openQty = max(0, $totalBuyQty - $totalSellQty);
                $totalExitQty = $totalSellQty;
            } else {
                // Short position (SELL to open, BUY to exit)
                $totalSellQty = (int) $sellOrders->sum('quantity');
                $totalSellProceeds = 0.0;
                foreach ($sellOrders as $so) {
                    $totalSellProceeds += (float) $so->price * (int) $so->quantity;
                }
                $avgEntryPrice = $totalSellQty > 0 ? round($totalSellProceeds / $totalSellQty, 2) : (float) ($trade->entry_premium ?? 0);

                $totalBuyQty = (int) $buyOrders->sum('quantity');
                $totalBuyCost = 0.0;
                foreach ($buyOrders as $bo) {
                    $totalBuyCost += (float) $bo->price * (int) $bo->quantity;
                }
                $avgExitPrice = $totalBuyQty > 0 ? round($totalBuyCost / $totalBuyQty, 2) : null;
                $ceEntryPrice = null;
                $peEntryPrice = null;
                $ceExitPrice = null;
                $peExitPrice = null;

                foreach ($buyOrders as $bo) {
                    $pnl = round(($avgEntryPrice - (float) $bo->price) * (int) $bo->quantity, 2);
                    if ((float) $bo->realized_pnl !== $pnl) {
                        $bo->update(['realized_pnl' => $pnl]);
                    }
                }
                $openQty = max(0, $totalSellQty - $totalBuyQty);
                $totalExitQty = $totalBuyQty;
            }
        }

        if ($totalExitQty === 0) {
            $status = 'OPEN';
        } elseif ($openQty === 0) {
            $status = 'CLOSED';
        } else {
            $status = 'PARTIALLY_CLOSED';
        }

        // Sum realized PnL across exit orders
        $exitOrders = $isShortInitial ? $buyOrders : $sellOrders;
        $totalRealizedPnl = round((float) $exitOrders->sum('realized_pnl'), 2);
        $grossProfit = $totalRealizedPnl >= 0 ? $totalRealizedPnl : 0.00;
        $grossLoss = $totalRealizedPnl < 0 ? abs($totalRealizedPnl) : 0.00;

        $brokerage = round((float) $allOrders->sum('brokerage'), 2);
        $stt = round((float) $allOrders->sum('stt'), 2);
        $exchangeCharges = round((float) $allOrders->sum('exchange_charges'), 2);
        $gst = round((float) $allOrders->sum('gst'), 2);
        $sebiCharges = round((float) $allOrders->sum('sebi_charges'), 2);
        $stampDuty = round((float) $allOrders->sum('stamp_duty'), 2);
        $otherCharges = round((float) $allOrders->sum('other_charges'), 2);
        $sumOfParts = round($brokerage + $stt + $exchangeCharges + $gst + $sebiCharges + $stampDuty + $otherCharges, 2);
        $sumOfTotals = round((float) $allOrders->sum('total_charges'), 2);
        $totalCharges = $sumOfTotals > 0 ? $sumOfTotals : $sumOfParts;
        if (abs($totalCharges - $sumOfParts) > 0.01) {
            $otherCharges = round($otherCharges + ($totalCharges - $sumOfParts), 2);
        }

        $netPnl = round($grossProfit - $grossLoss - $totalCharges, 2);

        $latestExit = $exitOrders->sortByDesc('order_date')->first();

        $userLotSize = IndexLotSize::where('user_id', $trade->user_id)
            ->where('index_name', strtoupper($trade->index_name))
            ->value('lot_size');
        if (!$userLotSize) {
            $defaults = IndexLotSize::getExchangeDefaults();
            $userLotSize = $defaults[strtoupper($trade->index_name)]['lot_size'] ?? null;
        }
        if (!$userLotSize && $trade->lots > 0 && $trade->quantity > 0) {
            $userLotSize = (int) round($trade->quantity / $trade->lots);
        }
        $lotSize = max(1, (int) ($userLotSize ?: 1));
        $baseTotalQty = !$isShortInitial ? $totalBuyQty : $totalSellQty;
        $totalLots = max(1, (int) round($baseTotalQty / $lotSize));

        $updateData = [
            'status' => $status,
            'quantity' => $baseTotalQty > 0 ? $baseTotalQty : $trade->quantity,
            'lots' => $totalLots,
            'open_quantity' => $openQty,
            'avg_entry_price' => $avgEntryPrice,
            'avg_exit_price' => $avgExitPrice,
            'entry_premium' => $avgEntryPrice,
            'exit_premium' => $avgExitPrice,
            'exit_date' => $status === 'CLOSED' ? ($latestExit?->order_date ?? now()->format('Y-m-d')) : null,
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

        if ($hasSplitLegs) {
            if (!empty($ceEntryPrice)) $updateData['ce_entry_price'] = $ceEntryPrice;
            if (!empty($peEntryPrice)) $updateData['pe_entry_price'] = $peEntryPrice;
            if ($ceExitPrice !== null) $updateData['ce_exit_price'] = $ceExitPrice;
            if ($peExitPrice !== null) $updateData['pe_exit_price'] = $peExitPrice;
        }

        $trade->update($updateData);

        return $trade;
    }
}
