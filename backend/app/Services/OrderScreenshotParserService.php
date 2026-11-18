<?php

namespace App\Services;

use App\Models\IndexLotSize;
use App\Models\Trade;
use App\Models\TradeJournal;
use App\Models\TradeOrder;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrderScreenshotParserService
{
    public function __construct(
        protected TradingCalculationService $calcService
    ) {}

    /**
     * Parse order book screenshot using Tesseract OCR and image badge color analysis.
     */
    public function parseScreenshot(UploadedFile $file, User $user): array
    {
        $mime = $file->getMimeType();
        $ext = strtolower($file->getClientOriginalExtension());
        $tempPath = $file->getPathname();

        // 1. Check if Tesseract is available
        $tesseractBin = $this->findTesseractBinary();
        if (!$tesseractBin) {
            throw new \RuntimeException("OCR engine (tesseract) is not configured on the server.");
        }

        // 2. Load image with GD for color sampling (BUY=blue badge, SELL=red badge)
        $gdImg = null;
        if (extension_loaded('gd')) {
            try {
                if ($ext === 'png' || str_contains($mime, 'png')) {
                    $gdImg = @imagecreatefrompng($tempPath);
                } elseif (in_array($ext, ['jpg', 'jpeg']) || str_contains($mime, 'jpeg')) {
                    $gdImg = @imagecreatefromjpeg($tempPath);
                } elseif ($ext === 'webp' || str_contains($mime, 'webp')) {
                    $gdImg = @imagecreatefromwebp($tempPath);
                }
            } catch (\Throwable $e) {
                Log::warning("GD could not load image for color badge analysis: " . $e->getMessage());
            }
        }

        $imgW = $gdImg ? imagesx($gdImg) : 0;
        $imgH = $gdImg ? imagesy($gdImg) : 0;

        // 3. Run Tesseract OCR with TSV output to get positional words
        $escapedPath = escapeshellarg($tempPath);
        $command = "{$tesseractBin} {$escapedPath} stdout --psm 6 tsv 2>&1";
        $tsvOutput = shell_exec($command);

        if (!$tsvOutput) {
            throw new \RuntimeException("Failed to read text from screenshot.");
        }

        // 4. Parse TSV into word lines
        $tsvLines = explode("\n", trim($tsvOutput));
        array_shift($tsvLines); // Remove TSV header

        $wordRows = [];
        foreach ($tsvLines as $line) {
            $p = explode("\t", $line);
            if (count($p) < 12 || (int)$p[0] !== 5) continue;
            $lNum = (int)$p[4];
            $text = trim($p[11]);
            if ($text === "") continue;

            $wordRows[$lNum][] = [
                'left' => (int)$p[6],
                'top' => (int)$p[7],
                'width' => (int)$p[8],
                'height' => (int)$p[9],
                'conf' => (float)$p[10],
                'text' => $text,
            ];
        }

        // 5. Fetch lot sizes for this user
        $userLotSizes = $this->getUserLotSizes($user);

        $orders = [];
        $orderId = 1;

        foreach ($wordRows as $lNum => $words) {
            $lineText = implode(" ", array_column($words, 'text'));

            // Filter out table headers
            if (
                preg_match("/(Instrument|Product|Status|Time|Type)/i", $lineText) &&
                preg_match("/(Status|Price|Qty|Time|Product)/i", $lineText)
            ) {
                continue;
            }

            // Extract Index Name (e.g., NIFTY, SENSEX, BANKNIFTY)
            if (!preg_match("/\b(NIFTY|SENSEX|BANKNIFTY|FINNIFTY|MIDCPNIFTY|BANKEX|SENSEX50|NIFTYNXT50)\b/i", $lineText, $im)) {
                continue; // Skip lines that do not have an instrument index
            }
            $indexName = strtoupper($im[1]);

            // Vertical center of the row
            $avgTop = array_sum(array_column($words, 'top')) / count($words);
            $avgH = array_sum(array_column($words, 'height')) / count($words);
            $yCenter = (int)($avgTop + $avgH / 2);

            // Determine Type: BUY vs SELL
            $type = $this->detectOrderType($lineText, $gdImg, $imgW, $imgH, $yCenter);

            // Extract Time
            preg_match("/(\d{1,2}:\d{2}(?::\d{2})?)/", $lineText, $tm);
            $time = $tm[1] ?? '09:30:00';

            // Extract Strike and Option Type (e.g., 23900 PE, 77200 CE)
            preg_match("/\b(\d{4,6})\s+(CE|PE)\b/i", $lineText, $sm);
            $strike = $sm[1] ?? null;
            $optType = strtoupper($sm[2] ?? 'CE');

            // If not found in combined form, look separately
            if (!$strike) {
                preg_match("/\b(\d{4,6})\b/", $lineText, $strikeM);
                $strike = $strikeM[1] ?? null;
            }

            // Extract Expiry Day and Month (e.g. 9th NOV, 5th NOV, 12 NOV)
            preg_match("/(\d{1,2})[^\d\n]*?\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\b/i", $lineText, $em);
            $expDay = $em[1] ?? "";
            $expMon = strtoupper($em[2] ?? "");
            $expiryText = ($expDay && $expMon) ? "{$expDay} {$expMon}" : "";
            $expiryDate = $this->resolveExpiryDate($expDay, $expMon);

            // Extract Quantity (e.g., 845 / 845 or 340 / 340)
            preg_match("/-?(\d+)\s*\/\s*(\d+)/", $lineText, $qm);
            $quantity = isset($qm[1]) ? abs((int)$qm[1]) : 0;
            if ($quantity <= 0) {
                // Fallback: look for integer preceded or followed by product
                preg_match("/\b-?(\d{2,6})\b/", $lineText, $anyIntM);
                $quantity = isset($anyIntM[1]) ? abs((int)$anyIntM[1]) : 1;
            }
            $quantity = max(1, $quantity);

            // Extract Price (e.g., 152.40, 466.00)
            preg_match("/\b(\d{1,6}\.\d{2})\b/", $lineText, $pm);
            $price = isset($pm[1]) ? abs((float)$pm[1]) : 0.0;
            if ($price <= 0.0) {
                preg_match("/\b(\d{1,6}\.\d{1})\b/", $lineText, $pm1);
                $price = isset($pm1[1]) ? abs((float)$pm1[1]) : 0.0;
            }

            // Extract Product (NRML, MIS, CNC)
            preg_match("/\b(NRML|MIS|CNC)\b/i", $lineText, $pdm);
            $product = strtoupper($pdm[1] ?? 'NRML');

            // Calculate lots based on index
            $lotSize = $userLotSizes[$indexName] ?? 50;
            $lots = max(1, (int) round($quantity / $lotSize));

            // Estimate charges for single order
            $turnover = round($quantity * $price, 2);
            $exchange = in_array($indexName, ['SENSEX', 'BANKEX']) ? 'BSE' : 'NSE';
            $charges = $this->calcService->estimateSingleOrderCharges($type, $price, $quantity, $exchange);

            $orders[] = [
                'id' => $orderId++,
                'selected' => true,
                'time' => $time,
                'type' => $type,
                'index_name' => $indexName,
                'expiry_text' => $expiryText,
                'expiry_date' => $expiryDate,
                'strike_price' => $strike,
                'option_type' => $optType,
                'quantity' => $quantity,
                'lots' => $lots,
                'lot_size' => $lotSize,
                'price' => $price,
                'product' => $product,
                'turnover' => $turnover,
                'est_charges' => $charges['total_charges'] ?? 20.00,
                'status' => 'COMPLETE',
                'raw_line' => $lineText,
            ];
        }

        if ($gdImg) {
            imagedestroy($gdImg);
        }

        return [
            'success' => true,
            'orders' => $orders,
            'detected_count' => count($orders),
        ];
    }

    /**
     * Import selected orders into the database as trades and trade orders.
     */
    public function importOrders(
        User $user,
        array $selectedOrders,
        string $tradeDate,
        ?int $accountId = null,
        string $importMode = 'smart',
        string $optionType = 'auto'
    ): array {
        if (empty($selectedOrders)) {
            return [
                'success' => false,
                'message' => 'No orders selected for import.',
                'imported_trades_count' => 0,
                'imported_orders_count' => 0,
            ];
        }

        $account = $accountId
            ? $user->tradingAccounts()->find($accountId)
            : ($user->defaultAccount ?: $user->tradingAccounts()->first());

        if (!$account) {
            throw new \RuntimeException("No trading account found.");
        }

        $rates = \App\Models\BrokerageSetting::forUser($user->id);
        $importedTradeIds = [];
        $squaredOffTradeIds = [];
        $importedOrdersCount = 0;

        // Fetch user's active open positions to allow automatic square-off
        $openTrades = Trade::where('user_id', $user->id)
            ->whereIn('status', ['OPEN', 'PARTIALLY_CLOSED'])
            ->with(['orders', 'journal'])
            ->orderBy('trade_date', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        DB::beginTransaction();
        try {
            if ($optionType === 'Both') {
                // Group orders by instrument: index_name + strike_price + expiry_date (merging same-strike CE & PE)
                $grouped = [];
                foreach ($selectedOrders as $ord) {
                    $key = sprintf(
                        '%s_%s_%s',
                        strtoupper($ord['index_name']),
                        $ord['strike_price'] ?? '0',
                        $ord['expiry_date'] ?? $tradeDate
                    );
                    $grouped[$key][] = $ord;
                }

                foreach ($grouped as $key => $items) {
                    $ceOrders = array_values(array_filter($items, fn($o) => strtoupper($o['option_type'] ?? '') === 'CE'));
                    $peOrders = array_values(array_filter($items, fn($o) => strtoupper($o['option_type'] ?? '') === 'PE'));

                    // If neither or only one is tagged CE/PE but we have 2 items, treat first as CE and second as PE
                    if ((empty($ceOrders) || empty($peOrders)) && count($items) === 2) {
                        $items[0]['option_type'] = 'CE';
                        $items[1]['option_type'] = 'PE';
                        $ceOrders = [$items[0]];
                        $peOrders = [$items[1]];
                    }

                    // Check for 4-order closed straddle (CE Buy + CE Sell + PE Buy + PE Sell)
                    $ceBuys = array_values(array_filter($ceOrders, fn($o) => strtoupper($o['type']) === 'BUY'));
                    $ceSells = array_values(array_filter($ceOrders, fn($o) => strtoupper($o['type']) === 'SELL'));
                    $peBuys = array_values(array_filter($peOrders, fn($o) => strtoupper($o['type']) === 'BUY'));
                    $peSells = array_values(array_filter($peOrders, fn($o) => strtoupper($o['type']) === 'SELL'));

                    while (!empty($ceBuys) && !empty($ceSells) && !empty($peBuys) && !empty($peSells)) {
                        $ceB = array_shift($ceBuys);
                        $ceS = array_shift($ceSells);
                        $peB = array_shift($peBuys);
                        $peS = array_shift($peSells);

                        $trade = $this->createClosedBothTrade($user, $account->id, $ceB, $ceS, $peB, $peS, $tradeDate, $rates);
                        $importedTradeIds[] = $trade->id;
                        $importedOrdersCount += 4;
                    }

                    // For remaining legs (e.g. 1 CE SELL + 1 PE SELL or 1 CE BUY + 1 PE BUY)
                    $remCe = array_merge($ceBuys, $ceSells);
                    $remPe = array_merge($peBuys, $peSells);

                    while (!empty($remCe) && !empty($remPe)) {
                        $c = array_shift($remCe);
                        $p = array_shift($remPe);

                        // If both legs have same order type (e.g. both SELL to exit open position)
                        if (strtoupper($c['type'] ?? '') === strtoupper($p['type'] ?? '')) {
                            // 1. Try matching an open "Both" trade to square off
                            $matchedBoth = $this->findMatchingOpenBothTrade($openTrades, $c['index_name'], $c['strike_price'], $c['type']);
                            if ($matchedBoth) {
                                $this->squareOffBothTrade($user, $matchedBoth, $c, $p, $tradeDate, $rates);
                                $importedTradeIds[] = $matchedBoth->id;
                                $squaredOffTradeIds[] = $matchedBoth->id;
                                $importedOrdersCount += 2;
                                $matchedBoth->open_quantity = 0;
                                continue;
                            }

                            // 2. Try matching separate open CE and PE trades to square off
                            $matchedCe = $this->findMatchingOpenSingleTrade($openTrades, $c['index_name'], $c['strike_price'], 'CE', $c['type']);
                            $matchedPe = $this->findMatchingOpenSingleTrade($openTrades, $p['index_name'], $p['strike_price'], 'PE', $p['type']);

                            if ($matchedCe && $matchedPe) {
                                $this->squareOffSingleTrade($user, $matchedCe, $c, $tradeDate, $rates, 'CE');
                                $this->squareOffSingleTrade($user, $matchedPe, $p, $tradeDate, $rates, 'PE');
                                $importedTradeIds[] = $matchedCe->id;
                                $importedTradeIds[] = $matchedPe->id;
                                $squaredOffTradeIds[] = $matchedCe->id;
                                $squaredOffTradeIds[] = $matchedPe->id;
                                $importedOrdersCount += 2;
                                $matchedCe->open_quantity = 0;
                                $matchedPe->open_quantity = 0;
                                continue;
                            } elseif ($matchedCe) {
                                $this->squareOffSingleTrade($user, $matchedCe, $c, $tradeDate, $rates, 'CE');
                                $importedTradeIds[] = $matchedCe->id;
                                $squaredOffTradeIds[] = $matchedCe->id;
                                $importedOrdersCount += 1;
                                $matchedCe->open_quantity = 0;
                                $remPe[] = $p;
                                continue;
                            } elseif ($matchedPe) {
                                $this->squareOffSingleTrade($user, $matchedPe, $p, $tradeDate, $rates, 'PE');
                                $importedTradeIds[] = $matchedPe->id;
                                $squaredOffTradeIds[] = $matchedPe->id;
                                $importedOrdersCount += 1;
                                $matchedPe->open_quantity = 0;
                                $remCe[] = $c;
                                continue;
                            }
                        }

                        // No open trade to square off -> create new Both trade
                        $trade = $this->createBothTradeFromLegs($user, $account->id, $c, $p, $tradeDate, $rates);
                        $importedTradeIds[] = $trade->id;
                        $importedOrdersCount += 2;
                    }

                    // If any single unmatched order remains, check square-off before creating new open trade
                    foreach (array_merge($remCe, $remPe) as $unmatched) {
                        $matched = $this->findMatchingOpenSingleTrade(
                            $openTrades,
                            $unmatched['index_name'],
                            $unmatched['strike_price'],
                            strtoupper($unmatched['option_type'] ?? 'CE'),
                            $unmatched['type']
                        );

                        if ($matched) {
                            $this->squareOffSingleTrade($user, $matched, $unmatched, $tradeDate, $rates, $unmatched['option_type'] ?? 'CE');
                            $importedTradeIds[] = $matched->id;
                            $squaredOffTradeIds[] = $matched->id;
                            $importedOrdersCount += 1;
                            $matched->open_quantity = 0;
                            continue;
                        }

                        $matchedBoth = $this->findMatchingOpenBothTrade(
                            $openTrades,
                            $unmatched['index_name'],
                            $unmatched['strike_price'],
                            $unmatched['type']
                        );

                        if ($matchedBoth) {
                            $this->squareOffSingleTrade($user, $matchedBoth, $unmatched, $tradeDate, $rates, $unmatched['option_type'] ?? 'CE');
                            $importedTradeIds[] = $matchedBoth->id;
                            $squaredOffTradeIds[] = $matchedBoth->id;
                            $importedOrdersCount += 1;
                            $matchedBoth->open_quantity = 0;
                            continue;
                        }

                        $trade = $this->createOpenTradeFromOrder($user, $account->id, $unmatched, $tradeDate, $rates);
                        $importedTradeIds[] = $trade->id;
                        $importedOrdersCount += 1;
                    }
                }
            } else if ($importMode === 'smart') {
                // Group orders by instrument key: index_name + strike_price + option_type + expiry_date
                $grouped = [];
                foreach ($selectedOrders as $ord) {
                    $key = sprintf(
                        '%s_%s_%s_%s',
                        strtoupper($ord['index_name']),
                        $ord['strike_price'] ?? '0',
                        strtoupper($ord['option_type'] ?? 'CE'),
                        $ord['expiry_date'] ?? $tradeDate
                    );
                    $grouped[$key][] = $ord;
                }

                foreach ($grouped as $key => $items) {
                    $buys = array_values(array_filter($items, fn($o) => strtoupper($o['type']) === 'BUY'));
                    $sells = array_values(array_filter($items, fn($o) => strtoupper($o['type']) === 'SELL'));

                    // Match paired BUY + SELL into closed round-trip trades within incoming batch
                    while (!empty($buys) && !empty($sells)) {
                        $buy = array_shift($buys);
                        $sell = array_shift($sells);

                        $trade = $this->createClosedTradeFromPair($user, $account->id, $buy, $sell, $tradeDate, $rates);
                        $importedTradeIds[] = $trade->id;
                        $importedOrdersCount += 2;
                    }

                    // Remaining BUYs or SELLs: check if they square off existing open positions
                    $remainingOrders = array_merge($buys, $sells);
                    foreach ($remainingOrders as $ord) {
                        $matchedSingle = $this->findMatchingOpenSingleTrade(
                            $openTrades,
                            $ord['index_name'],
                            $ord['strike_price'],
                            strtoupper($ord['option_type'] ?? 'CE'),
                            $ord['type']
                        );

                        if ($matchedSingle) {
                            $this->squareOffSingleTrade($user, $matchedSingle, $ord, $tradeDate, $rates, $ord['option_type'] ?? 'CE');
                            $importedTradeIds[] = $matchedSingle->id;
                            $squaredOffTradeIds[] = $matchedSingle->id;
                            $importedOrdersCount += 1;
                            $matchedSingle->open_quantity = 0;
                            continue;
                        }

                        $matchedBoth = $this->findMatchingOpenBothTrade(
                            $openTrades,
                            $ord['index_name'],
                            $ord['strike_price'],
                            $ord['type']
                        );

                        if ($matchedBoth) {
                            $this->squareOffSingleTrade($user, $matchedBoth, $ord, $tradeDate, $rates, $ord['option_type'] ?? 'CE');
                            $importedTradeIds[] = $matchedBoth->id;
                            $squaredOffTradeIds[] = $matchedBoth->id;
                            $importedOrdersCount += 1;
                            $matchedBoth->open_quantity = 0;
                            continue;
                        }

                        // No open trade found -> create new open trade
                        $trade = $this->createOpenTradeFromOrder($user, $account->id, $ord, $tradeDate, $rates);
                        $importedTradeIds[] = $trade->id;
                        $importedOrdersCount += 1;
                    }
                }
            } else {
                // Individual mode: check square-off first; otherwise create individual open position
                foreach ($selectedOrders as $ord) {
                    $matchedSingle = $this->findMatchingOpenSingleTrade(
                        $openTrades,
                        $ord['index_name'],
                        $ord['strike_price'],
                        strtoupper($ord['option_type'] ?? 'CE'),
                        $ord['type']
                    );

                    if ($matchedSingle) {
                        $this->squareOffSingleTrade($user, $matchedSingle, $ord, $tradeDate, $rates, $ord['option_type'] ?? 'CE');
                        $importedTradeIds[] = $matchedSingle->id;
                        $squaredOffTradeIds[] = $matchedSingle->id;
                        $importedOrdersCount += 1;
                        $matchedSingle->open_quantity = 0;
                        continue;
                    }

                    $matchedBoth = $this->findMatchingOpenBothTrade(
                        $openTrades,
                        $ord['index_name'],
                        $ord['strike_price'],
                        $ord['type']
                    );

                    if ($matchedBoth) {
                        $this->squareOffSingleTrade($user, $matchedBoth, $ord, $tradeDate, $rates, $ord['option_type'] ?? 'CE');
                        $importedTradeIds[] = $matchedBoth->id;
                        $squaredOffTradeIds[] = $matchedBoth->id;
                        $importedOrdersCount += 1;
                        $matchedBoth->open_quantity = 0;
                        continue;
                    }

                    $trade = $this->createOpenTradeFromOrder($user, $account->id, $ord, $tradeDate, $rates);
                    $importedTradeIds[] = $trade->id;
                    $importedOrdersCount += 1;
                }
            }

            DB::commit();

            $uniqueSquaredOff = array_values(array_unique($squaredOffTradeIds));
            $createdCount = count($importedTradeIds) - count($uniqueSquaredOff);

            if (!empty($uniqueSquaredOff)) {
                $message = "Successfully squared off " . count($uniqueSquaredOff) . " open trade(s) (#" . implode(', #', $uniqueSquaredOff) . ")" .
                    ($createdCount > 0 ? " and created {$createdCount} new trade(s)" : "") .
                    " ({$importedOrdersCount} orders executed).";
            } else {
                $message = "Successfully imported " . count($importedTradeIds) . " trades (" . $importedOrdersCount . " executed orders).";
            }

            return [
                'success' => true,
                'message' => $message,
                'imported_trades_count' => count($importedTradeIds),
                'squared_off_trades_count' => count($uniqueSquaredOff),
                'squared_off_trade_ids' => $uniqueSquaredOff,
                'imported_orders_count' => $importedOrdersCount,
                'trade_ids' => $importedTradeIds,
            ];
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error("Failed to import screenshot orders: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            throw $e;
        }
    }

    /**
     * Create a completed round-trip trade from a matched BUY and SELL order.
     */
    protected function createClosedTradeFromPair(
        User $user,
        int $accountId,
        array $buy,
        array $sell,
        string $tradeDate,
        array $rates
    ): Trade {
        $indexName = strtoupper($buy['index_name']);
        $strike = $buy['strike_price'] ?? null;
        $optType = strtoupper($buy['option_type'] ?? 'CE');
        $expiryDate = $buy['expiry_date'] ?? null;
        $quantity = max(1, min(abs((int)($buy['quantity'] ?? 1)), abs((int)($sell['quantity'] ?? 1))));
        $lots = max(1, abs((int)($buy['lots'] ?? 1)));

        $buyPrice = max(0.0, abs((float)($buy['price'] ?? 0)));
        $sellPrice = max(0.0, abs((float)($sell['price'] ?? 0)));

        // Determine which order was executed first based on time
        $buyTime = $buy['time'] ?? '09:30:00';
        $sellTime = $sell['time'] ?? '15:30:00';
        $isLongEntry = strcmp($buyTime, $sellTime) <= 0;

        $entryPremium = $isLongEntry ? $buyPrice : $sellPrice;
        $exitPremium = $isLongEntry ? $sellPrice : $buyPrice;

        // Order 1: Initial Order, Order 2: Exit Order
        $firstOrder = $isLongEntry ? $buy : $sell;
        $secondOrder = $isLongEntry ? $sell : $buy;

        $exchange = in_array($indexName, ['SENSEX', 'BANKEX']) ? 'BSE' : 'NSE';
        $firstCharges = $this->calcService->estimateSingleOrderCharges($firstOrder['type'], (float)$firstOrder['price'], $quantity, $exchange, $rates);
        $secondCharges = $this->calcService->estimateSingleOrderCharges($secondOrder['type'], (float)$secondOrder['price'], $quantity, $exchange, $rates);

        $totBrokerage = round($firstCharges['brokerage'] + $secondCharges['brokerage'], 2);
        $totStt = round($firstCharges['stt'] + $secondCharges['stt'], 2);
        $totExchange = round($firstCharges['exchange_charges'] + $secondCharges['exchange_charges'], 2);
        $totGst = round($firstCharges['gst'] + $secondCharges['gst'], 2);
        $totSebi = round($firstCharges['sebi_charges'] + $secondCharges['sebi_charges'], 2);
        $totStamp = round($firstCharges['stamp_duty'] + $secondCharges['stamp_duty'], 2);
        $totCharges = round($firstCharges['total_charges'] + $secondCharges['total_charges'], 2);

        $tradeData = [
            'index_name' => $indexName,
            'trading_type' => 'Intraday',
            'strategy_name' => 'Screenshot Import',
            'option_type' => $optType,
            'strike_price' => $strike,
            'expiry_date' => $expiryDate,
            'entry_premium' => $entryPremium,
            'exit_premium' => $exitPremium,
            'quantity' => $quantity,
            'lots' => $lots,
            'trade_date' => $tradeDate,
            'brokerage' => $totBrokerage,
            'stt' => $totStt,
            'exchange_charges' => $totExchange,
            'gst' => $totGst,
            'sebi_charges' => $totSebi,
            'stamp_duty' => $totStamp,
            'total_charges' => $totCharges,
        ];

        $calc = $this->calcService->calculate($tradeData);

        $trade = Trade::create([
            'user_id' => $user->id,
            'trading_account_id' => $accountId,
            'trade_date' => $tradeDate,
            'exit_date' => $tradeDate,
            'status' => 'CLOSED',
            'index_name' => $indexName,
            'trading_type' => 'Intraday',
            'strategy_name' => 'Screenshot Import',
            'option_type' => $optType,
            'strike_price' => $strike,
            'expiry_date' => $expiryDate,
            'entry_premium' => $entryPremium,
            'exit_premium' => $exitPremium,
            'quantity' => $quantity,
            'open_quantity' => 0,
            'lots' => $lots,
            'gross_profit' => $calc['gross_profit'],
            'gross_loss' => $calc['gross_loss'],
            'brokerage' => $totBrokerage,
            'stt' => $totStt,
            'exchange_charges' => $totExchange,
            'gst' => $totGst,
            'sebi_charges' => $totSebi,
            'stamp_duty' => $totStamp,
            'other_charges' => 0.00,
            'total_charges' => $totCharges,
            'net_pnl' => $calc['net_pnl'],
            'entry_reason' => 'Imported from Order Book Screenshot',
            'exit_reason' => 'Completed via Screenshot Import',
            'notes' => "Matched pair: BUY @ ₹{$buyPrice} ({$buyTime}) & SELL @ ₹{$sellPrice} ({$sellTime})",
        ]);

        TradeOrder::create([
            'trade_id' => $trade->id,
            'user_id' => $user->id,
            'order_type' => strtoupper($firstOrder['type']),
            'order_date' => $tradeDate,
            'order_time' => $firstOrder['time'] ?? '09:30:00',
            'quantity' => $quantity,
            'lots' => $lots,
            'price' => (float)$firstOrder['price'],
            'brokerage' => $firstCharges['brokerage'],
            'stt' => $firstCharges['stt'],
            'exchange_charges' => $firstCharges['exchange_charges'],
            'gst' => $firstCharges['gst'],
            'sebi_charges' => $firstCharges['sebi_charges'],
            'stamp_duty' => $firstCharges['stamp_duty'],
            'other_charges' => 0.00,
            'total_charges' => $firstCharges['total_charges'],
            'notes' => 'Imported Order (Leg 1)',
        ]);

        TradeOrder::create([
            'trade_id' => $trade->id,
            'user_id' => $user->id,
            'order_type' => strtoupper($secondOrder['type']),
            'order_date' => $tradeDate,
            'order_time' => $secondOrder['time'] ?? '15:30:00',
            'quantity' => $quantity,
            'lots' => $lots,
            'price' => (float)$secondOrder['price'],
            'brokerage' => $secondCharges['brokerage'],
            'stt' => $secondCharges['stt'],
            'exchange_charges' => $secondCharges['exchange_charges'],
            'gst' => $secondCharges['gst'],
            'sebi_charges' => $secondCharges['sebi_charges'],
            'stamp_duty' => $secondCharges['stamp_duty'],
            'other_charges' => 0.00,
            'total_charges' => $secondCharges['total_charges'],
            'notes' => 'Imported Order (Leg 2)',
        ]);

        $this->calcService->recalculateTradeFromOrders($trade);

        TradeJournal::create([
            'trade_id' => $trade->id,
            'personal_notes' => 'Imported from Order Book Screenshot',
        ]);

        return $trade;
    }

    /**
     * Create an OPEN trade from a single order.
     */
    protected function createOpenTradeFromOrder(
        User $user,
        int $accountId,
        array $ord,
        string $tradeDate,
        array $rates
    ): Trade {
        $indexName = strtoupper($ord['index_name']);
        $strike = $ord['strike_price'] ?? null;
        $optType = strtoupper($ord['option_type'] ?? 'CE');
        $expiryDate = $ord['expiry_date'] ?? null;
        $quantity = max(1, abs((int)($ord['quantity'] ?? 1)));
        $lots = max(1, abs((int)($ord['lots'] ?? 1)));
        $price = max(0.0, abs((float)($ord['price'] ?? 0)));
        $type = strtoupper($ord['type'] ?? 'BUY');
        $orderTime = $ord['time'] ?? '09:30:00';

        $exchange = in_array($indexName, ['SENSEX', 'BANKEX']) ? 'BSE' : 'NSE';
        $charges = $this->calcService->estimateSingleOrderCharges($type, $price, $quantity, $exchange, $rates);
        $totalCharges = $charges['total_charges'];

        $trade = Trade::create([
            'user_id' => $user->id,
            'trading_account_id' => $accountId,
            'trade_date' => $tradeDate,
            'exit_date' => null,
            'status' => 'OPEN',
            'index_name' => $indexName,
            'trading_type' => ($ord['product'] === 'NRML' ? 'BTST' : 'Intraday'),
            'strategy_name' => 'Screenshot Import',
            'option_type' => $optType,
            'strike_price' => $strike,
            'expiry_date' => $expiryDate,
            'entry_premium' => $price,
            'exit_premium' => null,
            'quantity' => $quantity,
            'open_quantity' => $quantity,
            'lots' => $lots,
            'gross_profit' => 0.00,
            'gross_loss' => 0.00,
            'brokerage' => $charges['brokerage'],
            'stt' => $charges['stt'],
            'exchange_charges' => $charges['exchange_charges'],
            'gst' => $charges['gst'],
            'sebi_charges' => $charges['sebi_charges'],
            'stamp_duty' => $charges['stamp_duty'],
            'other_charges' => 0.00,
            'total_charges' => $totalCharges,
            'net_pnl' => -$totalCharges,
            'entry_reason' => 'Imported from Order Book Screenshot',
            'notes' => "Open Position from Screenshot ({$type} @ ₹{$price})",
        ]);

        TradeOrder::create([
            'trade_id' => $trade->id,
            'user_id' => $user->id,
            'order_type' => $type,
            'order_date' => $tradeDate,
            'order_time' => $orderTime,
            'quantity' => $quantity,
            'lots' => $lots,
            'price' => $price,
            'brokerage' => $charges['brokerage'],
            'stt' => $charges['stt'],
            'exchange_charges' => $charges['exchange_charges'],
            'gst' => $charges['gst'],
            'sebi_charges' => $charges['sebi_charges'],
            'stamp_duty' => $charges['stamp_duty'],
            'other_charges' => 0.00,
            'total_charges' => $totalCharges,
            'notes' => 'Initial Order from Screenshot',
        ]);

        $this->calcService->recalculateTradeFromOrders($trade);

        TradeJournal::create([
            'trade_id' => $trade->id,
            'personal_notes' => 'Open Position from Order Book Screenshot',
        ]);

        return $trade;
    }

    /**
     * Create an OPEN single "Both" trade combining CE and PE legs of the same strike.
     */
    protected function createBothTradeFromLegs(
        User $user,
        int $accountId,
        array $ce,
        array $pe,
        string $tradeDate,
        array $rates
    ): Trade {
        $indexName = strtoupper($ce['index_name'] ?? $pe['index_name'] ?? 'NIFTY');
        $strike = $ce['strike_price'] ?? $pe['strike_price'] ?? null;
        $expiryDate = $ce['expiry_date'] ?? $pe['expiry_date'] ?? null;
        $quantity = max(1, min(abs((int)($ce['quantity'] ?? 1)), abs((int)($pe['quantity'] ?? 1))));
        $lots = max(1, abs((int)($ce['lots'] ?? $pe['lots'] ?? 1)));

        $cePrice = max(0.0, abs((float)($ce['price'] ?? 0)));
        $pePrice = max(0.0, abs((float)($pe['price'] ?? 0)));
        $entryPremium = $cePrice + $pePrice;

        $ceType = strtoupper($ce['type'] ?? 'BUY');
        $peType = strtoupper($pe['type'] ?? 'BUY');
        $ceTime = $ce['time'] ?? '09:30:00';
        $peTime = $pe['time'] ?? '09:30:00';

        $exchange = in_array($indexName, ['SENSEX', 'BANKEX']) ? 'BSE' : 'NSE';

        $ceCharges = $this->calcService->estimateSingleOrderCharges($ceType, $cePrice, $quantity, $exchange, $rates);
        $peCharges = $this->calcService->estimateSingleOrderCharges($peType, $pePrice, $quantity, $exchange, $rates);

        $brokerage = $ceCharges['brokerage'] + $peCharges['brokerage'];
        $stt = $ceCharges['stt'] + $peCharges['stt'];
        $exchangeCharges = $ceCharges['exchange_charges'] + $peCharges['exchange_charges'];
        $gst = $ceCharges['gst'] + $peCharges['gst'];
        $sebiCharges = $ceCharges['sebi_charges'] + $peCharges['sebi_charges'];
        $stampDuty = $ceCharges['stamp_duty'] + $peCharges['stamp_duty'];
        $totalCharges = $ceCharges['total_charges'] + $peCharges['total_charges'];

        $trade = Trade::create([
            'user_id' => $user->id,
            'trading_account_id' => $accountId,
            'trade_date' => $tradeDate,
            'exit_date' => null,
            'status' => 'OPEN',
            'index_name' => $indexName,
            'trading_type' => (($ce['product'] ?? '') === 'NRML' || ($pe['product'] ?? '') === 'NRML') ? 'BTST' : 'Intraday',
            'strategy_name' => ($ceType === 'SELL' && $peType === 'SELL') ? 'Short Straddle' : 'Long Straddle',
            'option_type' => 'Both',
            'strike_price' => $strike,
            'expiry_date' => $expiryDate,
            'ce_entry_price' => $cePrice,
            'pe_entry_price' => $pePrice,
            'entry_premium' => $entryPremium,
            'ce_exit_price' => null,
            'pe_exit_price' => null,
            'exit_premium' => null,
            'quantity' => $quantity,
            'open_quantity' => $quantity,
            'lots' => $lots,
            'gross_profit' => 0.00,
            'gross_loss' => 0.00,
            'brokerage' => $brokerage,
            'stt' => $stt,
            'exchange_charges' => $exchangeCharges,
            'gst' => $gst,
            'sebi_charges' => $sebiCharges,
            'stamp_duty' => $stampDuty,
            'other_charges' => 0.00,
            'total_charges' => $totalCharges,
            'net_pnl' => -$totalCharges,
            'entry_reason' => 'Imported Straddle from Order Book Screenshot',
            'notes' => "Straddle Both entry: CE @ ₹{$cePrice} ({$ceTime}) & PE @ ₹{$pePrice} ({$peTime})",
        ]);

        TradeOrder::create([
            'trade_id' => $trade->id,
            'user_id' => $user->id,
            'order_type' => $ceType,
            'order_date' => $tradeDate,
            'order_time' => $ceTime,
            'quantity' => $quantity,
            'lots' => $lots,
            'price' => $cePrice,
            'brokerage' => $ceCharges['brokerage'],
            'stt' => $ceCharges['stt'],
            'exchange_charges' => $ceCharges['exchange_charges'],
            'gst' => $ceCharges['gst'],
            'sebi_charges' => $ceCharges['sebi_charges'],
            'stamp_duty' => $ceCharges['stamp_duty'],
            'other_charges' => 0.00,
            'total_charges' => $ceCharges['total_charges'],
            'notes' => "CE Leg ({$strike} CE)",
        ]);

        TradeOrder::create([
            'trade_id' => $trade->id,
            'user_id' => $user->id,
            'order_type' => $peType,
            'order_date' => $tradeDate,
            'order_time' => $peTime,
            'quantity' => $quantity,
            'lots' => $lots,
            'price' => $pePrice,
            'brokerage' => $peCharges['brokerage'],
            'stt' => $peCharges['stt'],
            'exchange_charges' => $peCharges['exchange_charges'],
            'gst' => $peCharges['gst'],
            'sebi_charges' => $peCharges['sebi_charges'],
            'stamp_duty' => $peCharges['stamp_duty'],
            'other_charges' => 0.00,
            'total_charges' => $peCharges['total_charges'],
            'notes' => "PE Leg ({$strike} PE)",
        ]);

        $this->calcService->recalculateTradeFromOrders($trade);

        TradeJournal::create([
            'trade_id' => $trade->id,
            'personal_notes' => "Imported Straddle (Both: {$strike} CE & PE) from Order Book Screenshot",
        ]);

        return $trade;
    }

    /**
     * Create a CLOSED single "Both" trade combining CE (Buy+Sell) and PE (Buy+Sell) of same strike.
     */
    protected function createClosedBothTrade(
        User $user,
        int $accountId,
        array $ceBuy,
        array $ceSell,
        array $peBuy,
        array $peSell,
        string $tradeDate,
        array $rates
    ): Trade {
        $indexName = strtoupper($ceBuy['index_name'] ?? $peBuy['index_name'] ?? 'NIFTY');
        $strike = $ceBuy['strike_price'] ?? $peBuy['strike_price'] ?? null;
        $expiryDate = $ceBuy['expiry_date'] ?? $peBuy['expiry_date'] ?? null;
        $quantity = max(1, min(
            abs((int)($ceBuy['quantity'] ?? 1)),
            abs((int)($ceSell['quantity'] ?? 1)),
            abs((int)($peBuy['quantity'] ?? 1)),
            abs((int)($peSell['quantity'] ?? 1))
        ));
        $lots = max(1, abs((int)($ceBuy['lots'] ?? 1)));

        $ceEntry = max(0.0, abs((float)($ceBuy['price'] ?? 0)));
        $ceExit = max(0.0, abs((float)($ceSell['price'] ?? 0)));
        $peEntry = max(0.0, abs((float)($peBuy['price'] ?? 0)));
        $peExit = max(0.0, abs((float)($peSell['price'] ?? 0)));

        $entryPremium = $ceEntry + $peEntry;
        $exitPremium = $ceExit + $peExit;

        $exchange = in_array($indexName, ['SENSEX', 'BANKEX']) ? 'BSE' : 'NSE';
        $ceBuyCharges = $this->calcService->estimateSingleOrderCharges('BUY', $ceEntry, $quantity, $exchange, $rates);
        $ceSellCharges = $this->calcService->estimateSingleOrderCharges('SELL', $ceExit, $quantity, $exchange, $rates);
        $peBuyCharges = $this->calcService->estimateSingleOrderCharges('BUY', $peEntry, $quantity, $exchange, $rates);
        $peSellCharges = $this->calcService->estimateSingleOrderCharges('SELL', $peExit, $quantity, $exchange, $rates);

        $totBrokerage = round($ceBuyCharges['brokerage'] + $ceSellCharges['brokerage'] + $peBuyCharges['brokerage'] + $peSellCharges['brokerage'], 2);
        $totStt = round($ceBuyCharges['stt'] + $ceSellCharges['stt'] + $peBuyCharges['stt'] + $peSellCharges['stt'], 2);
        $totExchange = round($ceBuyCharges['exchange_charges'] + $ceSellCharges['exchange_charges'] + $peBuyCharges['exchange_charges'] + $peSellCharges['exchange_charges'], 2);
        $totGst = round($ceBuyCharges['gst'] + $ceSellCharges['gst'] + $peBuyCharges['gst'] + $peSellCharges['gst'], 2);
        $totSebi = round($ceBuyCharges['sebi_charges'] + $ceSellCharges['sebi_charges'] + $peBuyCharges['sebi_charges'] + $peSellCharges['sebi_charges'], 2);
        $totStamp = round($ceBuyCharges['stamp_duty'] + $ceSellCharges['stamp_duty'] + $peBuyCharges['stamp_duty'] + $peSellCharges['stamp_duty'], 2);
        $totCharges = round($ceBuyCharges['total_charges'] + $ceSellCharges['total_charges'] + $peBuyCharges['total_charges'] + $peSellCharges['total_charges'], 2);

        $tradeData = [
            'index_name' => $indexName,
            'trading_type' => 'Intraday',
            'strategy_name' => 'Long Straddle',
            'option_type' => 'Both',
            'strike_price' => $strike,
            'expiry_date' => $expiryDate,
            'ce_entry_price' => $ceEntry,
            'pe_entry_price' => $peEntry,
            'entry_premium' => $entryPremium,
            'ce_exit_price' => $ceExit,
            'pe_exit_price' => $peExit,
            'exit_premium' => $exitPremium,
            'quantity' => $quantity,
            'lots' => $lots,
            'trade_date' => $tradeDate,
            'brokerage' => $totBrokerage,
            'stt' => $totStt,
            'exchange_charges' => $totExchange,
            'gst' => $totGst,
            'sebi_charges' => $totSebi,
            'stamp_duty' => $totStamp,
            'total_charges' => $totCharges,
        ];

        $calc = $this->calcService->calculate($tradeData);

        $trade = Trade::create([
            'user_id' => $user->id,
            'trading_account_id' => $accountId,
            'trade_date' => $tradeDate,
            'exit_date' => $tradeDate,
            'status' => 'CLOSED',
            'index_name' => $indexName,
            'trading_type' => 'Intraday',
            'strategy_name' => 'Long Straddle',
            'option_type' => 'Both',
            'strike_price' => $strike,
            'expiry_date' => $expiryDate,
            'ce_entry_price' => $ceEntry,
            'pe_entry_price' => $peEntry,
            'entry_premium' => $entryPremium,
            'ce_exit_price' => $ceExit,
            'pe_exit_price' => $peExit,
            'exit_premium' => $exitPremium,
            'quantity' => $quantity,
            'open_quantity' => 0,
            'lots' => $lots,
            'gross_profit' => $calc['gross_profit'],
            'gross_loss' => $calc['gross_loss'],
            'brokerage' => $totBrokerage,
            'stt' => $totStt,
            'exchange_charges' => $totExchange,
            'gst' => $totGst,
            'sebi_charges' => $totSebi,
            'stamp_duty' => $totStamp,
            'other_charges' => 0.00,
            'total_charges' => $totCharges,
            'net_pnl' => $calc['net_pnl'],
            'entry_reason' => 'Imported Closed Straddle from Order Book Screenshot',
            'notes' => "Closed Straddle (Both: {$strike} CE & PE)",
        ]);

        foreach ([$ceBuy, $ceSell, $peBuy, $peSell] as $ord) {
            $type = strtoupper($ord['type'] ?? 'BUY');
            $price = (float)($ord['price'] ?? 0);
            $chg = $this->calcService->estimateSingleOrderCharges($type, $price, $quantity, $exchange, $rates);
            TradeOrder::create([
                'trade_id' => $trade->id,
                'user_id' => $user->id,
                'order_type' => $type,
                'order_date' => $tradeDate,
                'order_time' => $ord['time'] ?? '09:30:00',
                'quantity' => $quantity,
                'lots' => $lots,
                'price' => $price,
                'brokerage' => $chg['brokerage'],
                'stt' => $chg['stt'],
                'exchange_charges' => $chg['exchange_charges'],
                'gst' => $chg['gst'],
                'sebi_charges' => $chg['sebi_charges'],
                'stamp_duty' => $chg['stamp_duty'],
                'other_charges' => 0.00,
                'total_charges' => $chg['total_charges'],
                'notes' => ($ord['option_type'] ?? '') . " " . $type,
            ]);
        }

        $this->calcService->recalculateTradeFromOrders($trade);

        TradeJournal::create([
            'trade_id' => $trade->id,
            'personal_notes' => "Imported Closed Straddle (Both: {$strike} CE & PE) from Order Book Screenshot",
        ]);

        return $trade;
    }

    /**
     * Detect order type (BUY vs SELL) using color badge sampling and text fallback.
     */
    protected function detectOrderType(string $lineText, $gdImg, int $imgW, int $imgH, int $yCenter): string
    {
        // Color badge sampling if GD is active
        if ($gdImg && $imgW > 200 && $imgH > $yCenter) {
            $rTot = 0; $bTot = 0; $samples = 0;
            // Scan across Type column region (x: 140 - 170)
            for ($dx = 145; $dx <= 165; $dx += 5) {
                for ($dy = -2; $dy <= 2; $dy += 2) {
                    $sy = max(0, min($imgH - 1, $yCenter + $dy));
                    $sx = max(0, min($imgW - 1, $dx));
                    $rgb = imagecolorat($gdImg, $sx, $sy);
                    $rTot += ($rgb >> 16) & 0xFF;
                    $bTot += $rgb & 0xFF;
                    $samples++;
                }
            }
            if ($samples > 0) {
                $avgR = $rTot / $samples;
                $avgB = $bTot / $samples;
                if ($avgB > $avgR + 8) {
                    return 'BUY';
                }
                if ($avgR > $avgB + 8) {
                    return 'SELL';
                }
            }
        }

        // Text fallback
        if (preg_match("/\b(SELL|seu|SL)\b/i", $lineText)) {
            return 'SELL';
        }
        if (preg_match("/\b(BUY|uy|suv|su|eu|BY)\b/i", $lineText)) {
            return 'BUY';
        }

        return 'BUY';
    }

    /**
     * Resolve expiry date into YYYY-MM-DD.
     */
    protected function resolveExpiryDate(string $day, string $month): ?string
    {
        if (!$day || !$month) {
            return null;
        }

        $months = [
            'JAN' => 1, 'FEB' => 2, 'MAR' => 3, 'APR' => 4,
            'MAY' => 5, 'JUN' => 6, 'JUL' => 7, 'AUG' => 8,
            'SEP' => 9, 'OCT' => 10, 'NOV' => 11, 'DEC' => 12,
        ];

        $mNum = $months[strtoupper($month)] ?? null;
        if (!$mNum) return null;

        $year = (int) date('Y');
        $dNum = (int) $day;

        try {
            return Carbon::createFromDate($year, $mNum, $dNum)->toDateString();
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Get lot sizes mapping for the user.
     */
    protected function getUserLotSizes(User $user): array
    {
        $defaults = [
            'NIFTY' => 65,
            'BANKNIFTY' => 30,
            'FINNIFTY' => 60,
            'MIDCPNIFTY' => 120,
            'SENSEX' => 20,
            'BANKEX' => 30,
            'NIFTYNXT50' => 25,
            'SENSEX50' => 75,
        ];

        try {
            $userLots = IndexLotSize::where('user_id', $user->id)
                ->where('is_active', true)
                ->pluck('lot_size', 'index_name')
                ->toArray();

            return array_merge($defaults, array_change_key_case($userLots, CASE_UPPER));
        } catch (\Throwable $e) {
            return $defaults;
        }
    }

    /**
     * Locate tesseract binary on the host.
     */
    protected function findTesseractBinary(): ?string
    {
        $candidates = [
            '/opt/homebrew/bin/tesseract',
            '/usr/local/bin/tesseract',
            '/usr/bin/tesseract',
            'tesseract',
        ];

        foreach ($candidates as $bin) {
            $check = @shell_exec("which {$bin} 2>/dev/null") ?: (file_exists($bin) ? $bin : null);
            if ($check) {
                return trim($check);
            }
        }

        return null;
    }

    /**
     * Check if two strikes match, accounting for floating points and NSE weekly options prefixes (e.g. 725150 vs 25150)
     */
    public function strikesMatch($strikeA, $strikeB): bool
    {
        if (empty($strikeA) || empty($strikeB)) {
            return false;
        }
        $fA = (float)$strikeA;
        $fB = (float)$strikeB;
        if (abs($fA - $fB) < 0.01) {
            return true;
        }
        $mA = (int)$fA % 100000;
        $mB = (int)$fB % 100000;
        if ($mA > 0 && $mA === $mB) {
            return true;
        }
        return false;
    }

    /**
     * Find matching open "Both" (Straddle) trade that opposes the incoming order direction.
     */
    protected function findMatchingOpenBothTrade($openTrades, string $indexName, $strikePrice, string $incomingSide): ?Trade
    {
        $matches = $openTrades->filter(function ($t) use ($indexName, $strikePrice, $incomingSide) {
            if ($t->option_type !== 'Both' || (int)$t->open_quantity <= 0) {
                return false;
            }
            if (strtoupper(trim($t->index_name)) !== strtoupper(trim($indexName))) {
                return false;
            }
            if (!$this->strikesMatch($t->strike_price, $strikePrice)) {
                return false;
            }

            $buyOrders = $t->orders->where('order_type', 'BUY');
            $sellOrders = $t->orders->where('order_type', 'SELL');
            $firstOrder = $t->orders->sortBy('id')->first();
            $isLong = $firstOrder ? (strtoupper($firstOrder->order_type) === 'BUY') : (!str_contains((string)$t->strategy_name, 'Short'));

            if (strtoupper($incomingSide) === 'SELL') {
                return $isLong && ($buyOrders->sum('quantity') > $sellOrders->sum('quantity'));
            } else {
                return !$isLong && ($sellOrders->sum('quantity') > $buyOrders->sum('quantity'));
            }
        });

        return $matches->sortByDesc('id')->first();
    }

    /**
     * Find matching open single-leg (CE or PE) trade that opposes the incoming order direction.
     */
    protected function findMatchingOpenSingleTrade($openTrades, string $indexName, $strikePrice, string $optionType, string $incomingSide): ?Trade
    {
        $matches = $openTrades->filter(function ($t) use ($indexName, $strikePrice, $optionType, $incomingSide) {
            if ($t->option_type !== $optionType || (int)$t->open_quantity <= 0) {
                return false;
            }
            if (strtoupper(trim($t->index_name)) !== strtoupper(trim($indexName))) {
                return false;
            }
            if (!$this->strikesMatch($t->strike_price, $strikePrice)) {
                return false;
            }

            $buyOrders = $t->orders->where('order_type', 'BUY');
            $sellOrders = $t->orders->where('order_type', 'SELL');
            $firstOrder = $t->orders->sortBy('id')->first();
            $isLong = $firstOrder ? (strtoupper($firstOrder->order_type) === 'BUY') : (!str_contains((string)$t->strategy_name, 'Short'));

            if (strtoupper($incomingSide) === 'SELL') {
                return $isLong && ($buyOrders->sum('quantity') > $sellOrders->sum('quantity'));
            } else {
                return !$isLong && ($sellOrders->sum('quantity') > $buyOrders->sum('quantity'));
            }
        });

        return $matches->sortByDesc('id')->first();
    }

    /**
     * Square off both CE and PE legs of an existing "Both" trade.
     */
    protected function squareOffBothTrade(
        User $user,
        Trade $trade,
        array $ceOrder,
        array $peOrder,
        string $tradeDate,
        array $rates
    ): Trade {
        $indexName = strtoupper($trade->index_name);
        $exchange = in_array($indexName, ['SENSEX', 'BANKEX']) ? 'BSE' : 'NSE';

        $cQty = max(1, abs((int)($ceOrder['quantity'] ?? 1)));
        $cLots = max(1, abs((int)($ceOrder['lots'] ?? 1)));
        $cPrice = max(0.0, abs((float)($ceOrder['price'] ?? 0)));
        $cType = strtoupper($ceOrder['type'] ?? 'SELL');
        $cTime = $ceOrder['time'] ?? '15:30:00';
        $cCharges = $this->calcService->estimateSingleOrderCharges($cType, $cPrice, $cQty, $exchange, $rates);

        $pQty = max(1, abs((int)($peOrder['quantity'] ?? 1)));
        $pLots = max(1, abs((int)($peOrder['lots'] ?? 1)));
        $pPrice = max(0.0, abs((float)($peOrder['price'] ?? 0)));
        $pType = strtoupper($peOrder['type'] ?? 'SELL');
        $pTime = $peOrder['time'] ?? '15:30:00';
        $pCharges = $this->calcService->estimateSingleOrderCharges($pType, $pPrice, $pQty, $exchange, $rates);

        TradeOrder::create([
            'trade_id' => $trade->id,
            'user_id' => $user->id,
            'order_type' => $cType,
            'order_date' => $tradeDate,
            'order_time' => $cTime,
            'quantity' => $cQty,
            'lots' => $cLots,
            'price' => $cPrice,
            'brokerage' => $cCharges['brokerage'],
            'stt' => $cCharges['stt'],
            'exchange_charges' => $cCharges['exchange_charges'],
            'gst' => $cCharges['gst'],
            'sebi_charges' => $cCharges['sebi_charges'],
            'stamp_duty' => $cCharges['stamp_duty'],
            'other_charges' => 0.00,
            'total_charges' => $cCharges['total_charges'],
            'notes' => "CE Exit / Square Off ({$trade->strike_price} CE)",
        ]);

        TradeOrder::create([
            'trade_id' => $trade->id,
            'user_id' => $user->id,
            'order_type' => $pType,
            'order_date' => $tradeDate,
            'order_time' => $pTime,
            'quantity' => $pQty,
            'lots' => $pLots,
            'price' => $pPrice,
            'brokerage' => $pCharges['brokerage'],
            'stt' => $pCharges['stt'],
            'exchange_charges' => $pCharges['exchange_charges'],
            'gst' => $pCharges['gst'],
            'sebi_charges' => $pCharges['sebi_charges'],
            'stamp_duty' => $pCharges['stamp_duty'],
            'other_charges' => 0.00,
            'total_charges' => $pCharges['total_charges'],
            'notes' => "PE Exit / Square Off ({$trade->strike_price} PE)",
        ]);

        $this->calcService->recalculateTradeFromOrders($trade);

        if ($trade->status === 'CLOSED') {
            $trade->update([
                'exit_reason' => 'Square Off via Order Import',
            ]);
        }

        if ($trade->journal) {
            $existing = $trade->journal->personal_notes ?? '';
            $trade->journal->update([
                'personal_notes' => trim($existing . "\n" . "Squared off on {$tradeDate} via Order Import (CE @ ₹{$cPrice}, PE @ ₹{$pPrice})"),
            ]);
        }

        return $trade;
    }

    /**
     * Square off an individual leg / single trade.
     */
    protected function squareOffSingleTrade(
        User $user,
        Trade $trade,
        array $ord,
        string $tradeDate,
        array $rates,
        ?string $leg = null
    ): Trade {
        $indexName = strtoupper($trade->index_name);
        $exchange = in_array($indexName, ['SENSEX', 'BANKEX']) ? 'BSE' : 'NSE';

        $qty = max(1, abs((int)($ord['quantity'] ?? 1)));
        $lots = max(1, abs((int)($ord['lots'] ?? 1)));
        $price = max(0.0, abs((float)($ord['price'] ?? 0)));
        $type = strtoupper($ord['type'] ?? 'SELL');
        $time = $ord['time'] ?? '15:30:00';
        $charges = $this->calcService->estimateSingleOrderCharges($type, $price, $qty, $exchange, $rates);

        $optType = strtoupper($leg ?: ($ord['option_type'] ?? $trade->option_type ?? 'CE'));
        $notes = $trade->option_type === 'Both'
            ? "{$optType} Exit / Square Off ({$trade->strike_price} {$optType})"
            : "Exit / Square Off Order ({$type} @ ₹{$price})";

        TradeOrder::create([
            'trade_id' => $trade->id,
            'user_id' => $user->id,
            'order_type' => $type,
            'order_date' => $tradeDate,
            'order_time' => $time,
            'quantity' => $qty,
            'lots' => $lots,
            'price' => $price,
            'brokerage' => $charges['brokerage'],
            'stt' => $charges['stt'],
            'exchange_charges' => $charges['exchange_charges'],
            'gst' => $charges['gst'],
            'sebi_charges' => $charges['sebi_charges'],
            'stamp_duty' => $charges['stamp_duty'],
            'other_charges' => 0.00,
            'total_charges' => $charges['total_charges'],
            'notes' => $notes,
        ]);

        $this->calcService->recalculateTradeFromOrders($trade);

        if ($trade->status === 'CLOSED') {
            $trade->update([
                'exit_reason' => 'Square Off via Order Import',
            ]);
        }

        if ($trade->journal) {
            $existing = $trade->journal->personal_notes ?? '';
            $trade->journal->update([
                'personal_notes' => trim($existing . "\n" . "Squared off {$optType} leg on {$tradeDate} via Order Import (@ ₹{$price})"),
            ]);
        }

        return $trade;
    }
}
