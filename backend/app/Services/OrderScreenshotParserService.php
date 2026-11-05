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
            preg_match("/(\d+)\s*\/\s*(\d+)/", $lineText, $qm);
            $quantity = isset($qm[1]) ? (int)$qm[1] : 0;
            if ($quantity <= 0) {
                // Fallback: look for integer preceded or followed by product
                preg_match("/\b(\d{2,6})\b/", $lineText, $anyIntM);
                $quantity = isset($anyIntM[1]) ? (int)$anyIntM[1] : 1;
            }

            // Extract Price (e.g., 152.40, 466.00)
            preg_match("/\b(\d{1,6}\.\d{2})\b/", $lineText, $pm);
            $price = isset($pm[1]) ? (float)$pm[1] : 0.0;
            if ($price <= 0.0) {
                preg_match("/\b(\d{1,6}\.\d{1})\b/", $lineText, $pm1);
                $price = isset($pm1[1]) ? (float)$pm1[1] : 0.0;
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
        string $importMode = 'smart'
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
        $importedOrdersCount = 0;

        DB::beginTransaction();
        try {
            if ($importMode === 'smart') {
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

                    // Match paired BUY + SELL into closed round-trip trades
                    while (!empty($buys) && !empty($sells)) {
                        $buy = array_shift($buys);
                        $sell = array_shift($sells);

                        $trade = $this->createClosedTradeFromPair($user, $account->id, $buy, $sell, $tradeDate, $rates);
                        $importedTradeIds[] = $trade->id;
                        $importedOrdersCount += 2;
                    }

                    // Remaining BUYs become OPEN positions
                    foreach ($buys as $unmatchedBuy) {
                        $trade = $this->createOpenTradeFromOrder($user, $account->id, $unmatchedBuy, $tradeDate, $rates);
                        $importedTradeIds[] = $trade->id;
                        $importedOrdersCount += 1;
                    }

                    // Remaining SELLs become OPEN positions
                    foreach ($sells as $unmatchedSell) {
                        $trade = $this->createOpenTradeFromOrder($user, $account->id, $unmatchedSell, $tradeDate, $rates);
                        $importedTradeIds[] = $trade->id;
                        $importedOrdersCount += 1;
                    }
                }
            } else {
                // Individual mode: each order becomes its own trade/position
                foreach ($selectedOrders as $ord) {
                    $trade = $this->createOpenTradeFromOrder($user, $account->id, $ord, $tradeDate, $rates);
                    $importedTradeIds[] = $trade->id;
                    $importedOrdersCount += 1;
                }
            }

            DB::commit();

            return [
                'success' => true,
                'message' => "Successfully imported " . count($importedTradeIds) . " trades (" . $importedOrdersCount . " executed orders).",
                'imported_trades_count' => count($importedTradeIds),
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
        $quantity = min((int)($buy['quantity'] ?? 1), (int)($sell['quantity'] ?? 1));
        $lots = max(1, (int)($buy['lots'] ?? 1));

        $buyPrice = (float)($buy['price'] ?? 0);
        $sellPrice = (float)($sell['price'] ?? 0);

        // Determine which order was executed first based on time
        $buyTime = $buy['time'] ?? '09:30:00';
        $sellTime = $sell['time'] ?? '15:30:00';
        $isLongEntry = strcmp($buyTime, $sellTime) <= 0;

        $entryPremium = $isLongEntry ? $buyPrice : $sellPrice;
        $exitPremium = $isLongEntry ? $sellPrice : $buyPrice;

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
            'brokerage' => $calc['brokerage'],
            'stt' => $calc['stt'],
            'exchange_charges' => $calc['exchange_charges'],
            'gst' => $calc['gst'],
            'sebi_charges' => $calc['sebi_charges'],
            'stamp_duty' => $calc['stamp_duty'],
            'other_charges' => 0.00,
            'total_charges' => $calc['total_charges'],
            'net_pnl' => $calc['net_pnl'],
            'entry_reason' => 'Imported from Order Book Screenshot',
            'exit_reason' => 'Completed via Screenshot Import',
            'notes' => "Matched pair: BUY @ ₹{$buyPrice} ({$buyTime}) & SELL @ ₹{$sellPrice} ({$sellTime})",
        ]);

        // Order 1: Initial Order
        $firstOrder = $isLongEntry ? $buy : $sell;
        $secondOrder = $isLongEntry ? $sell : $buy;

        $exchange = in_array($indexName, ['SENSEX', 'BANKEX']) ? 'BSE' : 'NSE';
        $firstCharges = $this->calcService->estimateSingleOrderCharges($firstOrder['type'], (float)$firstOrder['price'], $quantity, $exchange, $rates);
        $secondCharges = $this->calcService->estimateSingleOrderCharges($secondOrder['type'], (float)$secondOrder['price'], $quantity, $exchange, $rates);

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
        $quantity = (int)($ord['quantity'] ?? 1);
        $lots = max(1, (int)($ord['lots'] ?? 1));
        $price = (float)($ord['price'] ?? 0);
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

        TradeJournal::create([
            'trade_id' => $trade->id,
            'personal_notes' => 'Open Position from Order Book Screenshot',
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
}
