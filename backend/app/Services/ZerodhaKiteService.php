<?php

namespace App\Services;

use App\Models\BrokerageSetting;
use App\Models\IndexLotSize;
use App\Models\Trade;
use App\Models\TradeOrder;
use App\Models\User;
use App\Models\ZerodhaIntegration;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * ZerodhaKiteService
 * 
 * STRICTLY READ-ONLY Kite Connect API Service.
 * Implements ONLY portfolio/account/order inspection and reading capabilities.
 * Absolutely NO endpoints or logic for placing, modifying, or cancelling broker orders.
 */
class ZerodhaKiteService
{
    protected string $baseUrl = 'https://api.kite.trade';
    protected string $kiteVersion = '3';
    protected TradingCalculationService $calcService;
    protected OrderScreenshotParserService $screenshotParserService;

    public function __construct(
        ?TradingCalculationService $calcService = null,
        ?OrderScreenshotParserService $screenshotParserService = null
    ) {
        $this->calcService = $calcService ?: app(TradingCalculationService::class);
        $this->screenshotParserService = $screenshotParserService ?: app(OrderScreenshotParserService::class);
    }

    /**
     * Connect or save Zerodha credentials.
     * Supports connecting with Email & Password and/or API Key & Secret Key.
     */
    public function connect(User $user, array $data): array
    {
        $email = trim($data['email'] ?? '');
        $password = trim($data['password'] ?? '');
        $apiKey = trim($data['api_key'] ?? '');
        $apiSecret = trim($data['api_secret'] ?? '');
        $accessToken = trim($data['access_token'] ?? '');
        $requestToken = trim($data['request_token'] ?? '');

        // Fallback default values
        $existing = ZerodhaIntegration::where('user_id', $user->id)->first();

        if (empty($email)) {
            $email = $existing?->email ?: ($existing?->broker_user_id ?: $user->email);
        }

        if (empty($apiKey)) {
            $apiKey = $existing?->api_key && $existing->api_key !== 'DEMO_KITE_KEY' ? $existing->api_key : 'i7nm8563g7p5a2dw';
        }

        if (empty($apiSecret)) {
            $apiSecret = $existing?->api_secret && $existing->api_secret !== 'DEMO_SECRET' ? $existing->api_secret : 'q5q8l2oklgq3d8ahzdutsyqxmbou1c4c';
        }

        // Derive broker_user_id (e.g. from email prefix or user ID if provided)
        $brokerUserId = strtoupper(explode('@', $email)[0]);
        if (strlen($brokerUserId) > 12 || strlen($brokerUserId) < 3) {
            $brokerUserId = $existing?->broker_user_id ?: ('ZR' . strtoupper(substr(hash('crc32b', $email), 0, 6)));
        }

        $userName = $user->name ?: 'Zerodha Trader';
        $avatarUrl = null;

        // If request_token is provided, attempt exchange with Kite Connect
        if (!empty($requestToken)) {
            try {
                $cleanedToken = $this->extractRequestToken($requestToken);
                $session = $this->exchangeRequestToken($apiKey, $apiSecret, $cleanedToken);
                $accessToken = $session['access_token'] ?? '';
                $brokerUserId = $session['user_id'] ?? $brokerUserId;
                $userName = $session['user_name'] ?? $userName;
                $email = $session['email'] ?? $email;
                $avatarUrl = $session['avatar_url'] ?? null;
            } catch (Exception $e) {
                Log::info('Request token exchange note: ' . $e->getMessage());
            }
        }

        // If access token is provided, verify it directly with Kite
        if (!empty($accessToken)) {
            try {
                $profile = $this->fetchProfileFromKite($apiKey, $accessToken);
                $brokerUserId = $profile['user_id'] ?? $brokerUserId;
                $userName = $profile['user_name'] ?? $userName;
                $email = $profile['email'] ?? $email;
                $avatarUrl = $profile['avatar_url'] ?? $avatarUrl;
            } catch (Exception $e) {
                Log::info('Kite live verification note: ' . $e->getMessage());
                // Invalidate invalid token so dummy data is never served
                $accessToken = null;
            }
        } else {
            // Check if user already had a valid live access token in DB
            $existing = ZerodhaIntegration::where('user_id', $user->id)->first();
            if ($existing && !empty($existing->access_token) && !$existing->is_demo) {
                if ($existing->api_key === $apiKey) {
                    try {
                        $profile = $this->fetchProfileFromKite($apiKey, $existing->access_token);
                        $accessToken = $existing->access_token;
                        $brokerUserId = $profile['user_id'] ?? $brokerUserId;
                        $userName = $profile['user_name'] ?? $userName;
                    } catch (Exception $e) {
                        $accessToken = null;
                    }
                }
            }
        }

        $integration = ZerodhaIntegration::updateOrCreate(
            ['user_id' => $user->id],
            [
                'api_key' => $apiKey,
                'api_secret' => $apiSecret,
                'access_token' => $accessToken ?: null,
                'request_token' => $requestToken ? $this->extractRequestToken($requestToken) : null,
                'broker_user_id' => $brokerUserId,
                'user_name' => $userName,
                'user_shortname' => explode(' ', $userName)[0] ?? 'Trader',
                'email' => $email,
                'user_type' => 'individual',
                'broker' => 'ZERODHA',
                'avatar_url' => $avatarUrl,
                'is_connected' => true,
                'is_demo' => false,
                'connected_at' => Carbon::now(),
                'token_generated_at' => !empty($accessToken) ? Carbon::now() : null,
                'token_expires_at' => !empty($accessToken) ? Carbon::tomorrow()->setTime(6, 0, 0) : null,
                'last_synced_at' => Carbon::now(),
                'meta' => [
                    'api_key' => $apiKey,
                    'email' => $email,
                    'has_password' => !empty($password),
                    'exchanges' => ['NSE', 'NFO', 'BSE', 'BFO'],
                    'products' => ['CNC', 'NRML', 'MIS'],
                    'order_types' => ['MARKET', 'LIMIT', 'SL', 'SL-M'],
                ],
            ]
        );

        $hasActiveSession = !empty($accessToken);

        return [
            'status' => 'success',
            'has_active_session' => $hasActiveSession,
            'message' => $hasActiveSession
                ? 'Zerodha Kite Connected & Authenticated with live session!'
                : 'Zerodha credentials saved! Please complete daily 1-Click Kite Login to unlock live data.',
            'login_url' => "https://kite.zerodha.com/connect/login?v=3&api_key={$apiKey}",
            'integration' => $this->formatIntegrationResponse($integration),
        ];
    }

    /**
     * Connect in Realistic Demo / Simulation mode.
     * Useful for zero-cost testing without paid Kite Connect subscription.
     */
    public function connectDemo(User $user): array
    {
        $integration = ZerodhaIntegration::updateOrCreate(
            ['user_id' => $user->id],
            [
                'api_key' => 'DEMO_KITE_KEY',
                'api_secret' => 'DEMO_SECRET',
                'access_token' => 'DEMO_ACCESS_TOKEN_' . bin2hex(random_bytes(8)),
                'request_token' => null,
                'broker_user_id' => 'ZR' . rand(100000, 999999),
                'user_name' => $user->name ?: 'Demo Trader',
                'user_shortname' => explode(' ', $user->name ?: 'Trader')[0],
                'email' => $user->email,
                'user_type' => 'individual',
                'broker' => 'ZERODHA',
                'avatar_url' => null,
                'is_connected' => true,
                'is_demo' => true,
                'connected_at' => Carbon::now(),
                'token_generated_at' => Carbon::now(),
                'token_expires_at' => Carbon::now()->addDays(30),
                'last_synced_at' => Carbon::now(),
                'meta' => [
                    'exchanges' => ['NSE', 'NFO', 'BSE', 'BFO', 'CDS', 'MCX'],
                    'products' => ['CNC', 'NRML', 'MIS'],
                    'order_types' => ['MARKET', 'LIMIT', 'SL', 'SL-M'],
                    'mode' => 'sandbox_simulation',
                ],
            ]
        );

        return [
            'status' => 'success',
            'message' => 'Zerodha Kite Demo connection activated with realistic portfolio and orders.',
            'integration' => $this->formatIntegrationResponse($integration),
        ];
    }

    /**
     * Disconnect Zerodha integration
     */
    public function disconnect(User $user): array
    {
        $integration = ZerodhaIntegration::where('user_id', $user->id)->first();
        if ($integration) {
            $integration->update([
                'is_connected' => false,
                'access_token' => null,
                'request_token' => null,
            ]);
        }

        return [
            'status' => 'success',
            'message' => 'Zerodha Kite Connect has been disconnected.',
        ];
    }

    /**
     * Get integration status
     */
    public function getStatus(User $user): array
    {
        $integration = ZerodhaIntegration::where('user_id', $user->id)->first();
        $apiKey = $integration?->api_key ?: config('services.zerodha.api_key', '44x8vhyiv5gyizqt');
        $loginUrl = "https://kite.zerodha.com/connect/login?v=3&api_key={$apiKey}";

        if (!$integration || !$integration->is_connected) {
            return [
                'is_connected' => false,
                'is_authenticated' => false,
                'login_url' => $loginUrl,
                'api_key' => $apiKey,
                'message' => 'Zerodha Kite Connect is not connected.',
                'integration' => $integration ? $this->formatIntegrationResponse($integration) : null,
            ];
        }

        $isAuthenticated = $integration->is_demo || !empty($integration->access_token);

        return [
            'is_connected' => true,
            'is_demo' => (bool)$integration->is_demo,
            'is_authenticated' => $isAuthenticated,
            'login_url' => $loginUrl,
            'api_key' => $apiKey,
            'integration' => $this->formatIntegrationResponse($integration),
        ];
    }

    /**
     * Fetch all portfolio & account details (READ-ONLY)
     */
    public function getAllDetails(User $user): array
    {
        $integration = ZerodhaIntegration::where('user_id', $user->id)->first();

        if (!$integration || !$integration->is_connected) {
            throw new Exception('Zerodha is not connected. Please connect your Kite account in Settings -> Integrations.');
        }

        if ($integration->is_demo) {
            return $this->getMockDetails($integration);
        }

        // Check if access_token exists
        if (empty($integration->access_token)) {
            return [
                'status' => 'needs_auth',
                'is_demo' => false,
                'is_authenticated' => false,
                'login_url' => "https://kite.zerodha.com/connect/login?v=3&api_key={$integration->api_key}",
                'message' => 'Zerodha Kite daily session login required. Please click the login button to authorize your session.',
                'profile' => $this->formatIntegrationResponse($integration),
                'margins' => [],
                'orders' => [],
                'all_orders' => [],
                'positions' => ['net' => [], 'day' => []],
                'holdings' => [],
                'mf_holdings' => [],
                'summary' => [
                    'available_margin' => 0,
                    'used_margin' => 0,
                    'positions_mtm' => 0,
                    'closed_positions_pnl' => 0,
                    'open_positions_pnl' => 0,
                    'overall_gross_pnl' => 0,
                    'overall_net_pnl' => 0,
                    'contract_note_charges' => 0,
                    'net_pnl' => 0,
                    'unrealized_pnl' => 0,
                    'realized_pnl' => 0,
                    'holdings_value' => 0,
                    'holdings_pnl' => 0,
                    'total_portfolio_pnl' => 0,
                    'executed_orders_count' => 0,
                    'total_orders_count' => 0,
                ],
            ];
        }

        // Live API calls (READ-ONLY ONLY)
        $headers = [
            'X-Kite-Version' => $this->kiteVersion,
            'Authorization' => "token {$integration->api_key}:{$integration->access_token}",
            'Accept' => 'application/json',
        ];

        try {
            // 1. Margins
            $marginsRes = Http::withHeaders($headers)->timeout(6)->get("{$this->baseUrl}/user/margins");

            if (!$marginsRes->successful()) {
                $err = $marginsRes->json('message') ?? 'Session requires daily Kite login';
                // Token invalid or expired - clear it so user is prompted to re-login
                $integration->update(['access_token' => null]);

                return [
                    'status' => 'needs_auth',
                    'is_demo' => false,
                    'is_authenticated' => false,
                    'login_url' => "https://kite.zerodha.com/connect/login?v=3&api_key={$integration->api_key}",
                    'message' => "Zerodha session authentication required: {$err}",
                    'profile' => $this->formatIntegrationResponse($integration),
                    'margins' => [],
                    'orders' => [],
                    'all_orders' => [],
                    'positions' => ['net' => [], 'day' => []],
                    'holdings' => [],
                    'summary' => [
                        'available_margin' => 0,
                        'used_margin' => 0,
                        'positions_mtm' => 0,
                        'unrealized_pnl' => 0,
                        'realized_pnl' => 0,
                        'holdings_value' => 0,
                        'holdings_pnl' => 0,
                        'total_portfolio_pnl' => 0,
                        'executed_orders_count' => 0,
                        'total_orders_count' => 0,
                    ],
                ];
            }

            $margins = $marginsRes->json('data') ?? [];

            // 2. Orders (executed & open today)
            $ordersRes = Http::withHeaders($headers)->timeout(6)->get("{$this->baseUrl}/orders");
            $orders = $ordersRes->successful() ? ($ordersRes->json('data') ?? []) : [];

            // 3. Positions (Net & Day)
            $positionsRes = Http::withHeaders($headers)->timeout(6)->get("{$this->baseUrl}/portfolio/positions");
            $positions = $positionsRes->successful() ? ($positionsRes->json('data') ?? ['net' => [], 'day' => []]) : ['net' => [], 'day' => []];

            // 4. Holdings (Equity)
            $holdingsRes = Http::withHeaders($headers)->timeout(6)->get("{$this->baseUrl}/portfolio/holdings");
            $holdings = $holdingsRes->successful() ? ($holdingsRes->json('data') ?? []) : [];

            // 5. Mutual Funds Holdings
            $mfHoldings = [];
            try {
                $mfHoldingsRes = Http::withHeaders($headers)->timeout(6)->get("{$this->baseUrl}/mf/holdings");
                if ($mfHoldingsRes->successful()) {
                    $rawMf = $mfHoldingsRes->json('data') ?? [];
                    $mfHoldings = array_map(function ($mf) {
                        $qty = (float)($mf['quantity'] ?? 0);
                        $avgPrice = (float)($mf['average_price'] ?? 0);
                        $lastPrice = (float)($mf['last_price'] ?? 0);
                        $invested = round($qty * $avgPrice, 2);
                        $curValue = round($qty * $lastPrice, 2);
                        $pnl = round($curValue - $invested, 2);
                        $pnlPercentage = $invested > 0 ? round(($pnl / $invested) * 100, 2) : 0.0;

                        return array_merge($mf, [
                            'invested' => $invested,
                            'current_value' => $curValue,
                            'pnl' => $pnl,
                            'pnl_percentage' => $pnlPercentage,
                        ]);
                    }, $rawMf);
                }
            } catch (Exception $mfEx) {
                Log::info('Failed to fetch MF holdings: ' . $mfEx->getMessage());
            }

            $integration->update(['last_synced_at' => Carbon::now()]);

            return [
                'status' => 'success',
                'is_demo' => false,
                'is_authenticated' => true,
                'last_synced_at' => Carbon::now()->toIso8601String(),
                'profile' => $this->formatIntegrationResponse($integration),
                'margins' => $margins,
                'orders' => $this->filterExecutedOrders($orders),
                'all_orders' => $this->sortOrdersDescending($orders),
                'positions' => $positions,
                'holdings' => $holdings,
                'mf_holdings' => $mfHoldings,
                'summary' => $this->calculateSummary($margins, $positions, $holdings, $orders, $user, $mfHoldings),
            ];
        } catch (Exception $e) {
            Log::info('Kite API live fetch exception: ' . $e->getMessage());
            $integration->update(['access_token' => null]);

            return [
                'status' => 'needs_auth',
                'is_demo' => false,
                'is_authenticated' => false,
                'login_url' => "https://kite.zerodha.com/connect/login?v=3&api_key={$integration->api_key}",
                'message' => "Zerodha session authentication required: {$e->getMessage()}",
                'profile' => $this->formatIntegrationResponse($integration),
                'margins' => [],
                'orders' => [],
                'all_orders' => [],
                'positions' => ['net' => [], 'day' => []],
                'holdings' => [],
                'mf_holdings' => [],
                'summary' => [
                    'available_margin' => 0,
                    'used_margin' => 0,
                    'positions_mtm' => 0,
                    'closed_positions_pnl' => 0,
                    'open_positions_pnl' => 0,
                    'overall_gross_pnl' => 0,
                    'overall_net_pnl' => 0,
                    'contract_note_charges' => 0,
                    'net_pnl' => 0,
                    'unrealized_pnl' => 0,
                    'realized_pnl' => 0,
                    'holdings_value' => 0,
                    'holdings_pnl' => 0,
                    'total_portfolio_pnl' => 0,
                    'executed_orders_count' => 0,
                    'total_orders_count' => 0,
                ],
            ];
        }
    }

    /**
     * Generate Virtual Contract Note for executed orders
     */
    public function getContractNote(User $user): array
    {
        $details = $this->getAllDetails($user);
        $orders = $details['orders'] ?? [];

        // Load rates dynamically from database
        $rates = BrokerageSetting::forUser($user->id);
        $brokeragePerOrder = (float)($rates['brokerage_per_order'] ?? 20.00);
        $sttRatePercent = ((float)($rates['stt_rate_percent'] ?? 0.15000)) / 100.0;
        $nseTxnRatePercent = ((float)($rates['nse_txn_rate_percent'] ?? 0.03553)) / 100.0;
        $bseTxnRatePercent = ((float)($rates['bse_txn_rate_percent'] ?? 0.03250)) / 100.0;
        $gstRatePercent = ((float)($rates['gst_rate_percent'] ?? 18.00)) / 100.0;
        $sebiRatePercent = ((float)($rates['sebi_per_crore'] ?? 10.00)) / 10000000.0;
        $stampDutyRatePercent = ((float)($rates['stamp_duty_rate_percent'] ?? 0.00300)) / 100.0;

        $totalBuyTurnover = 0.0;
        $totalSellTurnover = 0.0;
        $totalTurnover = 0.0;
        $executedCount = 0;

        $totalRawExchange = 0.0;
        $totalRawSebi = 0.0;
        $totalStampDuty = 0.0;
        $totalRawStt = 0.0;

        $orderItems = [];

        foreach ($orders as $order) {
            $isBuy = strtoupper($order['transaction_type'] ?? '') === 'BUY';
            $qty = abs((int)($order['filled_quantity'] ?? $order['quantity'] ?? 0));
            $price = (float)($order['average_price'] ?? $order['price'] ?? 0);
            $turnover = round($qty * $price, 2);

            if ($turnover <= 0 && $qty <= 0) continue;

            $executedCount++;
            if ($isBuy) {
                $totalBuyTurnover += $turnover;
            } else {
                $totalSellTurnover += $turnover;
            }
            $totalTurnover += $turnover;

            $sym = strtoupper($order['tradingsymbol'] ?? '');
            $exch = strtoupper($order['exchange'] ?? '');
            $isBse = in_array($exch, ['BSE', 'BFO']) || str_starts_with($sym, 'SENSEX') || str_starts_with($sym, 'BANKEX');
            $txnRate = $isBse ? $bseTxnRatePercent : $nseTxnRatePercent;

            // Per-order charges matching Zerodha Kite virtual contract note
            $ordBrokerage = $brokeragePerOrder;
            $ordExchangeFee = $turnover * $txnRate;
            $ordSebiFee = $turnover * $sebiRatePercent;
            $ordStampDuty = $isBuy ? round($turnover * $stampDutyRatePercent) : 0.00;
            $ordStt = $isBuy ? 0.00 : ($turnover * $sttRatePercent);
            $ordGst = ($ordBrokerage + $ordExchangeFee + $ordSebiFee) * $gstRatePercent;
            $orderCharges = round($ordBrokerage + $ordExchangeFee + $ordSebiFee + $ordStampDuty + $ordStt + $ordGst, 2);

            $totalRawExchange += $ordExchangeFee;
            $totalRawSebi += $ordSebiFee;
            $totalStampDuty += $ordStampDuty;
            $totalRawStt += $ordStt;

            $orderItems[] = [
                'order_id' => $order['order_id'] ?? null,
                'order_timestamp' => $order['order_timestamp'] ?? null,
                'transaction_type' => $order['transaction_type'] ?? 'BUY',
                'tradingsymbol' => $order['tradingsymbol'] ?? '',
                'exchange' => $order['exchange'] ?? ($isBse ? 'BFO' : 'NFO'),
                'product' => $order['product'] ?? 'NRML',
                'quantity' => $qty,
                'average_price' => $price,
                'turnover' => $turnover,
                'charges' => $orderCharges,
                'breakdown' => [
                    'brokerage' => $ordBrokerage,
                    'stt' => round($ordStt, 2),
                    'exchange_fee' => round($ordExchangeFee, 2),
                    'sebi_fee' => round($ordSebiFee, 2),
                    'stamp_duty' => (float)$ordStampDuty,
                    'gst' => round($ordGst, 2),
                ],
            ];
        }

        // Sort newest first
        usort($orderItems, function ($a, $b) {
            return strcmp($b['order_timestamp'] ?? '', $a['order_timestamp'] ?? '');
        });

        $brokerage = round($executedCount * $brokeragePerOrder, 2);
        $rawExchange = $totalRawExchange;
        $rawSebi = $totalRawSebi;
        $stampDuty = (float)$totalStampDuty;
        $rawStt = $totalRawStt;
        $rawGst = ($brokerage + $rawExchange + $rawSebi) * $gstRatePercent;

        $exchangeFee = round($rawExchange, 2);
        $sebiFee = round($rawSebi, 2);
        $stt = round($rawStt, 2);
        $gst = round($rawGst, 2);

        // Kite computes total from unrounded statutory rates, matching 3553.36 exactly
        $totalCharges = round($brokerage + $rawExchange + $rawSebi + $stampDuty + $rawStt + $rawGst, 2);

        return [
            'status' => 'success',
            'trade_date' => Carbon::now()->toDateString(),
            'executed_orders_count' => $executedCount,
            'statutory_charges' => [
                'sebi_turnover_fee' => $sebiFee,
                'exchange_turnover_fee' => $exchangeFee,
                'stamp_duty' => $stampDuty,
                'stt' => $stt,
                'gst' => $gst,
            ],
            'zerodha_charges' => [
                'brokerage' => $brokerage,
            ],
            'total_charges' => $totalCharges,
            'turnover' => [
                'buy' => $totalBuyTurnover,
                'sell' => $totalSellTurnover,
                'total' => $totalTurnover,
            ],
            'orders' => $orderItems,
        ];
    }

    /**
     * Import executed Kite orders to TradeJournal as closed/executed trades.
     * Purely READ-ONLY import: no orders are sent to broker.
     */
    public function importOrdersToJournal(User $user, array $orderIds = []): array
    {
        $details = $this->getAllDetails($user);
        $orders = $details['orders'] ?? [];

        if (empty($orders)) {
            return [
                'status' => 'info',
                'imported_count' => 0,
                'message' => 'No executed orders found to import.',
            ];
        }

        // Filter if specific order IDs given
        if (!empty($orderIds)) {
            $orders = array_filter($orders, function ($o) use ($orderIds) {
                return in_array($o['order_id'] ?? '', $orderIds);
            });
        }

        // Sort orders in ascending order of execution time (whichever order was created first is added first)
        usort($orders, function ($a, $b) {
            $ta = $a['order_timestamp'] ?? $a['exchange_timestamp'] ?? '';
            $tb = $b['order_timestamp'] ?? $b['exchange_timestamp'] ?? '';
            return strcmp($ta, $tb);
        });

        $importedCount = 0;
        $rates = BrokerageSetting::forUser($user->id);

        foreach ($orders as $order) {
            $orderId = $order['order_id'] ?? '';
            $symbol = $order['tradingsymbol'] ?? 'UNKNOWN';
            $transactionType = strtoupper($order['transaction_type'] ?? 'BUY');
            $quantity = abs((int)($order['filled_quantity'] ?? $order['quantity'] ?? 0));
            $price = (float)($order['average_price'] ?? $order['price'] ?? 0);
            $orderTimestamp = $order['order_timestamp'] ?? Carbon::now()->toDateTimeString();

            if ($quantity <= 0 || $price <= 0) {
                continue;
            }

            // Check if already imported
            $exists = TradeOrder::where('notes', 'LIKE', "%[Zerodha:{$orderId}]%")->exists();
            if ($exists) {
                continue;
            }

            // Parse instrument symbol (e.g., NIFTY26NOV25200CE or SENSEX26NOV81700PE or INFY)
            $parsed = $this->parseTradingSymbol($symbol);
            $indexName = strtoupper($parsed['index_name'] ?? 'NIFTY');
            $exchange = in_array($indexName, ['SENSEX', 'BANKEX']) ? 'BSE' : 'NSE';

            $orderCharges = $this->calcService->estimateSingleOrderCharges(
                $transactionType,
                $price,
                $quantity,
                $exchange,
                $rates
            );

            // Create Trade record matching option_journal schema
            $tradeDate = Carbon::parse($orderTimestamp)->toDateString();
            $trade = Trade::create([
                'user_id' => $user->id,
                'trading_account_id' => $user->defaultAccount?->id ?? $user->tradingAccounts()->first()?->id,
                'trade_date' => $tradeDate,
                'exit_date' => $tradeDate,
                'status' => 'CLOSED',
                'index_name' => $parsed['index_name'],
                'trading_type' => $parsed['trading_type'],
                'strategy_name' => 'Zerodha Import',
                'option_type' => $parsed['option_type'],
                'strike_price' => $parsed['strike_price'],
                'expiry_date' => $parsed['expiry_date'],
                'quantity' => $quantity,
                'open_quantity' => 0,
                'lots' => max(1, (int)round($quantity / ($parsed['lot_size'] ?: 25))),
                'entry_premium' => $price,
                'avg_entry_price' => $price,
                'exit_premium' => $price,
                'avg_exit_price' => $price,
                'gross_profit' => 0,
                'gross_loss' => 0,
                'brokerage' => $orderCharges['brokerage'],
                'stt' => $orderCharges['stt'],
                'exchange_charges' => $orderCharges['exchange_charges'],
                'gst' => $orderCharges['gst'],
                'sebi_charges' => $orderCharges['sebi_charges'],
                'stamp_duty' => $orderCharges['stamp_duty'],
                'other_charges' => 0.00,
                'total_charges' => $orderCharges['total_charges'],
                'net_pnl' => -$orderCharges['total_charges'],
                'notes' => "Imported from Zerodha Kite (Order #{$orderId})",
            ]);

            // Create corresponding TradeOrder
            TradeOrder::create([
                'trade_id' => $trade->id,
                'user_id' => $user->id,
                'order_type' => in_array($transactionType, ['BUY', 'SELL']) ? $transactionType : 'BUY',
                'quantity' => $quantity,
                'lots' => max(1, (int)round($quantity / ($parsed['lot_size'] ?: 25))),
                'price' => $price,
                'order_date' => $tradeDate,
                'order_time' => Carbon::parse($orderTimestamp)->format('H:i'),
                'brokerage' => $orderCharges['brokerage'],
                'stt' => $orderCharges['stt'],
                'exchange_charges' => $orderCharges['exchange_charges'],
                'gst' => $orderCharges['gst'],
                'sebi_charges' => $orderCharges['sebi_charges'],
                'stamp_duty' => $orderCharges['stamp_duty'],
                'other_charges' => 0.00,
                'total_charges' => $orderCharges['total_charges'],
                'notes' => "[Zerodha:{$orderId}] " . ($order['tradingsymbol'] ?? '') . " ({$order['product']})",
            ]);

            $this->calcService->recalculateTradeFromOrders($trade);

            $importedCount++;
        }

        return [
            'status' => 'success',
            'imported_count' => $importedCount,
            'message' => "Successfully imported {$importedCount} executed Zerodha order(s) into your TradeJournal.",
        ];
    }

    /**
     * Clean and extract request_token from raw input or full redirect URL
     */
    public function extractRequestToken(string $raw): string
    {
        $raw = trim($raw);
        if (str_contains($raw, 'request_token=')) {
            if (preg_match('/request_token=([a-zA-Z0-9_\-]+)/', $raw, $matches)) {
                return $matches[1];
            }
        }
        return $raw;
    }

    /**
     * Exchange request_token for live access_token and activate integration
     */
    public function exchangeAndSaveToken(User $user, string $requestToken): array
    {
        $integration = ZerodhaIntegration::firstOrNew(['user_id' => $user->id]);

        $apiKey = $integration->api_key ?: config('services.zerodha.api_key', '44x8vhyiv5gyizqt');
        $apiSecret = $integration->api_secret ?: config('services.zerodha.api_secret', 'prue1z5p6u1t04f72mzz26jijhv7y0y9');

        $cleanedToken = $this->extractRequestToken($requestToken);
        if (empty($cleanedToken)) {
            throw new Exception('Request token cannot be empty.');
        }

        if (empty($apiKey) || empty($apiSecret)) {
            throw new Exception('API Key and Secret Key are required to exchange request token.');
        }

        $session = $this->exchangeRequestToken($apiKey, $apiSecret, $cleanedToken);

        $accessToken = $session['access_token'] ?? '';
        if (empty($accessToken)) {
            throw new Exception('No access_token returned by Zerodha Kite.');
        }

        $brokerUserId = $session['user_id'] ?? $integration->broker_user_id ?? 'ZERODHA';
        $userName = $session['user_name'] ?? $integration->user_name ?? $user->name ?? 'Trader';
        $email = $session['email'] ?? $integration->email ?? $user->email;
        $avatarUrl = $session['avatar_url'] ?? $integration->avatar_url;

        $integration->fill([
            'api_key' => $apiKey,
            'api_secret' => $apiSecret,
            'access_token' => $accessToken,
            'request_token' => $cleanedToken,
            'public_token' => $session['public_token'] ?? null,
            'broker_user_id' => $brokerUserId,
            'user_name' => $userName,
            'user_shortname' => $session['user_shortname'] ?? explode(' ', $userName)[0],
            'email' => $email,
            'user_type' => 'individual',
            'broker' => 'ZERODHA',
            'avatar_url' => $avatarUrl,
            'is_connected' => true,
            'is_demo' => false,
            'connected_at' => $integration->connected_at ?: Carbon::now(),
            'token_generated_at' => Carbon::now(),
            'token_expires_at' => Carbon::tomorrow()->setTime(6, 0, 0),
            'last_synced_at' => Carbon::now(),
        ]);
        $integration->save();

        return [
            'status' => 'success',
            'message' => 'Zerodha Kite daily session authenticated successfully! Real portfolio & orders unlocked.',
            'integration' => $this->formatIntegrationResponse($integration),
        ];
    }

    /**
     * Save an active Kite access_token directly (e.g. if generated externally)
     */
    public function saveAccessTokenDirect(User $user, string $accessToken): array
    {
        $integration = ZerodhaIntegration::where('user_id', $user->id)->first();
        if (!$integration) {
            throw new Exception('Zerodha credentials not found. Please connect in Settings first.');
        }

        $accessToken = trim($accessToken);
        if (empty($accessToken)) {
            throw new Exception('Access token cannot be empty.');
        }

        // Verify token with live Kite API
        $profile = $this->fetchProfileFromKite($integration->api_key, $accessToken);

        $brokerUserId = $profile['user_id'] ?? $integration->broker_user_id;
        $userName = $profile['user_name'] ?? $integration->user_name;
        $email = $profile['email'] ?? $integration->email;
        $avatarUrl = $profile['avatar_url'] ?? $integration->avatar_url;

        $integration->update([
            'access_token' => $accessToken,
            'broker_user_id' => $brokerUserId,
            'user_name' => $userName,
            'email' => $email,
            'avatar_url' => $avatarUrl,
            'is_connected' => true,
            'is_demo' => false,
            'token_generated_at' => Carbon::now(),
            'token_expires_at' => Carbon::tomorrow()->setTime(6, 0, 0),
            'last_synced_at' => Carbon::now(),
        ]);

        return [
            'status' => 'success',
            'message' => 'Zerodha Kite Access Token verified and active for today!',
            'integration' => $this->formatIntegrationResponse($integration),
        ];
    }

    /**
     * Exchange request_token for access_token (RFC / Kite v3 standard)
     */
    protected function exchangeRequestToken(string $apiKey, string $apiSecret, string $requestToken): array
    {
        $checksum = hash('sha256', $apiKey . $requestToken . $apiSecret);

        $res = Http::asForm()->timeout(10)->post("{$this->baseUrl}/session/token", [
            'api_key' => $apiKey,
            'request_token' => $requestToken,
            'checksum' => $checksum,
        ]);

        if (!$res->successful()) {
            $msg = $res->json('message') ?? 'Invalid request token or API secret.';
            throw new Exception("Zerodha authentication failed: {$msg}");
        }

        return $res->json('data') ?? [];
    }

    /**
     * Fetch user profile from Kite Connect (READ-ONLY)
     */
    protected function fetchProfileFromKite(string $apiKey, string $accessToken): array
    {
        $res = Http::withHeaders([
            'X-Kite-Version' => $this->kiteVersion,
            'Authorization' => "token {$apiKey}:{$accessToken}",
            'Accept' => 'application/json',
        ])->timeout(10)->get("{$this->baseUrl}/user/profile");

        if (!$res->successful()) {
            $msg = $res->json('message') ?? 'Unable to connect with provided credentials.';
            throw new Exception("Zerodha verification failed: {$msg}");
        }

        return $res->json('data') ?? [];
    }

    /**
     * Sort orders descending (latest order first)
     */
    protected function sortOrdersDescending(array $orders): array
    {
        usort($orders, function ($a, $b) {
            $tA = (string)($a['order_timestamp'] ?? $a['exchange_timestamp'] ?? $a['fill_timestamp'] ?? $a['order_time'] ?? '');
            $tB = (string)($b['order_timestamp'] ?? $b['exchange_timestamp'] ?? $b['fill_timestamp'] ?? $b['order_time'] ?? '');
            if ($tA !== '' && $tB !== '' && $tA !== $tB) {
                return strcmp($tB, $tA);
            }
            $idA = (string)($a['order_id'] ?? '');
            $idB = (string)($b['order_id'] ?? '');
            return strcmp($idB, $idA);
        });
        return $orders;
    }

    /**
     * Filter executed orders
     */
    protected function filterExecutedOrders(array $orders): array
    {
        $filtered = array_values(array_filter($orders, function ($o) {
            $status = strtoupper($o['status'] ?? '');
            return in_array($status, ['COMPLETE', 'TRADED', 'EXECUTED']);
        }));
        return $this->sortOrdersDescending($filtered);
    }

    /**
     * Compute aggregated portfolio summary with net P&L after contract note charges
     */
    protected function calculateSummary(array $margins, array $positions, array $holdings, array $orders, ?User $user = null, array $mfHoldings = []): array
    {
        $equityMargin = $margins['equity'] ?? [];
        $availableMargin = isset($equityMargin['net'])
            ? (float)$equityMargin['net']
            : (float)($equityMargin['available']['live_balance'] ?? $equityMargin['available']['cash'] ?? $equityMargin['available']['opening_balance'] ?? 0);
        $usedMargin = (float)($equityMargin['utilised']['debits'] ?? 0);

        $netPositions = $positions['net'] ?? [];
        $positionsMtm = 0;
        $unrealizedPnl = 0;
        $realizedPnl = 0;
        $closedPositionsPnl = 0.0;
        $openPositionsPnl = 0.0;

        foreach ($netPositions as $p) {
            $qty = (int)($p['quantity'] ?? 0);
            $dayVal = (float)($p['m2m'] ?? $p['pnl'] ?? 0);
            $totalVal = (float)($p['pnl'] ?? 0);
            $positionsMtm += $dayVal;
            $unrealizedPnl += (float)($p['unrealised'] ?? 0);
            $realizedPnl += (float)($p['realised'] ?? 0);

            if ($qty === 0) {
                $closedPositionsPnl += $totalVal;
            } else {
                $openPositionsPnl += $totalVal;
            }
        }

        $holdingsValue = 0;
        $holdingsPnl = 0;
        foreach ($holdings as $h) {
            $qty = (float)($h['quantity'] ?? 0);
            $ltp = (float)($h['last_price'] ?? 0);
            $pnl = (float)($h['pnl'] ?? 0);
            $holdingsValue += ($qty * $ltp);
            $holdingsPnl += $pnl;
        }

        // Mutual Funds holdings aggregation
        $mfInvested = 0;
        $mfValue = 0;
        $mfPnl = 0;
        foreach ($mfHoldings as $mf) {
            $mfInvested += (float)($mf['invested'] ?? 0);
            $mfValue += (float)($mf['current_value'] ?? 0);
            $mfPnl += (float)($mf['pnl'] ?? 0);
        }

        $totalHoldingsValue = $holdingsValue + $mfValue;
        $totalHoldingsPnl = $holdingsPnl + $mfPnl;

        $executedOrders = $this->filterExecutedOrders($orders);
        $executedOrdersCount = count($executedOrders);

        // Calculate contract note charges for today's executed orders
        $contractChargesTotal = 0.0;
        if ($executedOrdersCount > 0) {
            $rates = $user ? BrokerageSetting::forUser($user->id) : BrokerageSetting::DEFAULTS;
            $brokeragePerOrder = (float)($rates['brokerage_per_order'] ?? 20.00);
            $nseTxnRatePercent = ((float)($rates['nse_txn_rate_percent'] ?? 0.03553)) / 100.0;
            $bseTxnRatePercent = ((float)($rates['bse_txn_rate_percent'] ?? 0.03250)) / 100.0;
            $sebiRatePercent = ((float)($rates['sebi_per_crore'] ?? 10.00)) / 10000000.0;
            $stampDutyRatePercent = ((float)($rates['stamp_duty_rate_percent'] ?? 0.00300)) / 100.0;
            $sttRatePercent = ((float)($rates['stt_rate_percent'] ?? 0.15000)) / 100.0;
            $gstRatePercent = ((float)($rates['gst_rate_percent'] ?? 18.00)) / 100.0;

            $totalBuyTurnover = 0.0;
            $totalSellTurnover = 0.0;
            $totalTurnover = 0.0;
            $rawExchange = 0.0;
            $rawSebi = 0.0;
            $stampDuty = 0.0;
            $rawStt = 0.0;

            foreach ($executedOrders as $o) {
                $isBuy = strtoupper($o['transaction_type'] ?? '') === 'BUY';
                $qty = abs((int)($o['filled_quantity'] ?? $o['quantity'] ?? 0));
                $price = (float)($o['average_price'] ?? $o['price'] ?? 0);
                $turnover = round($qty * $price, 2);
                if ($turnover <= 0) continue;
                if ($isBuy) $totalBuyTurnover += $turnover;
                else $totalSellTurnover += $turnover;
                $totalTurnover += $turnover;

                $sym = strtoupper($o['tradingsymbol'] ?? '');
                $exch = strtoupper($o['exchange'] ?? '');
                $isBse = in_array($exch, ['BSE', 'BFO']) || str_starts_with($sym, 'SENSEX') || str_starts_with($sym, 'BANKEX');
                $txnRate = $isBse ? $bseTxnRatePercent : $nseTxnRatePercent;

                $rawExchange += $turnover * $txnRate;
                $rawSebi += $turnover * $sebiRatePercent;
                if ($isBuy) {
                    $stampDuty += round($turnover * $stampDutyRatePercent);
                } else {
                    $rawStt += $turnover * $sttRatePercent;
                }
            }

            $brokerage = round($executedOrdersCount * $brokeragePerOrder, 2);
            $rawGst = ($brokerage + $rawExchange + $rawSebi) * $gstRatePercent;

            $contractChargesTotal = round($brokerage + $rawExchange + $rawSebi + $stampDuty + $rawStt + $rawGst, 2);
        }

        // Net P&L (Today) includes only closed positions minus contract note charges
        $netPnl = round($closedPositionsPnl - $contractChargesTotal, 2);

        // Overall Net P&L includes BOTH closed and open positions minus contract note charges
        $overallGrossPnl = round($closedPositionsPnl + $openPositionsPnl, 2);
        $overallNetPnl = round($overallGrossPnl - $contractChargesTotal, 2);

        return [
            'available_margin' => $availableMargin,
            'used_margin' => $usedMargin,
            'positions_mtm' => $positionsMtm,
            'closed_positions_pnl' => round($closedPositionsPnl, 2),
            'open_positions_pnl' => round($openPositionsPnl, 2),
            'overall_gross_pnl' => $overallGrossPnl,
            'overall_net_pnl' => $overallNetPnl,
            'unrealized_pnl' => $unrealizedPnl,
            'realized_pnl' => $realizedPnl,
            'holdings_value' => $holdingsValue,
            'holdings_pnl' => $holdingsPnl,
            'mf_holdings_count' => count($mfHoldings),
            'mf_invested' => round($mfInvested, 2),
            'mf_value' => round($mfValue, 2),
            'mf_pnl' => round($mfPnl, 2),
            'total_holdings_value' => round($totalHoldingsValue, 2),
            'total_holdings_pnl' => round($totalHoldingsPnl, 2),
            'total_portfolio_pnl' => $positionsMtm + $totalHoldingsPnl,
            'executed_orders_count' => $executedOrdersCount,
            'total_orders_count' => count($orders),
            'contract_note_charges' => $contractChargesTotal,
            'net_pnl' => $netPnl,
        ];
    }

    /**
     * Parse trading symbol into option journal attributes
     */
    /**
     * Parse trading symbol to extract underlying, strike, option type, lot size, expiry
     */
    public function parseTradingSymbol(string $symbol): array
    {
        $sym = strtoupper(trim($symbol));
        $indexName = 'NIFTY';
        $lotSize = 65;

        if (str_contains($sym, 'SENSEX')) {
            $indexName = 'SENSEX';
            $lotSize = 20;
        } elseif (str_contains($sym, 'BANKNIFTY')) {
            $indexName = 'BANKNIFTY';
            $lotSize = 30;
        } elseif (str_contains($sym, 'FINNIFTY')) {
            $indexName = 'FINNIFTY';
            $lotSize = 65;
        } elseif (str_contains($sym, 'MIDCPNIFTY')) {
            $indexName = 'MIDCPNIFTY';
            $lotSize = 120;
        } elseif (str_contains($sym, 'BANKEX')) {
            $indexName = 'BANKEX';
            $lotSize = 30;
        }

        $optType = 'CE';
        if (str_ends_with($sym, 'PE')) {
            $optType = 'PE';
        } elseif (str_ends_with($sym, 'CE')) {
            $optType = 'CE';
        }

        $strikePrice = 25000.0;
        if (preg_match('/^(?:NIFTY|SENSEX|BANKNIFTY|FINNIFTY|MIDCPNIFTY|BANKEX)\d{2}(?:[1-9OND]\d{2}|[A-Z]{3})(\d+)(CE|PE)$/i', $sym, $matches)) {
            $strikePrice = (float)$matches[1];
        } elseif (preg_match('/(\d{4,6})(CE|PE)$/i', $sym, $matches)) {
            $strikePrice = (float)$matches[1];
        }

        if ($indexName === 'NIFTY' && $strikePrice > 50000) {
            $strikePrice = (float)($strikePrice % 100000);
        }

        $expiryDate = Carbon::today()->toDateString();
        $expiryText = '';
        if (preg_match('/^(?:NIFTY|SENSEX|BANKNIFTY|FINNIFTY|MIDCPNIFTY|BANKEX)(\d{2})(?:([1-9OND])(\d{2})|([A-Z]{3}))/i', $sym, $expMatches)) {
            $monthMap = [
                '1' => 'JAN', '2' => 'FEB', '3' => 'MAR', '4' => 'APR', '5' => 'MAY', '6' => 'JUN',
                '7' => 'JUL', '8' => 'AUG', '9' => 'SEP', 'O' => 'OCT', 'N' => 'NOV', 'D' => 'DEC',
                'JAN' => 'JAN', 'FEB' => 'FEB', 'MAR' => 'MAR', 'APR' => 'APR', 'MAY' => 'MAY', 'JUN' => 'JUN',
                'JUL' => 'JUL', 'AUG' => 'AUG', 'SEP' => 'SEP', 'OCT' => 'OCT', 'NOV' => 'NOV', 'DEC' => 'DEC'
            ];
            $weeklyMonthChar = $expMatches[2] ?? '';
            $day = $expMatches[3] ?? '';
            $monthlyStr = $expMatches[4] ?? '';
            if (!empty($weeklyMonthChar) && !empty($day)) {
                $m = $monthMap[strtoupper($weeklyMonthChar)] ?? $weeklyMonthChar;
                $expiryText = ((int)$day) . " {$m}";
            } elseif (!empty($monthlyStr)) {
                $expiryText = $monthMap[strtoupper($monthlyStr)] ?? $monthlyStr;
            }
        }

        return [
            'index_name' => $indexName,
            'trading_type' => 'Intraday',
            'option_type' => $optType,
            'strike_price' => $strikePrice,
            'expiry_date' => $expiryDate,
            'expiry_text' => $expiryText,
            'lot_size' => $lotSize,
        ];
    }

    /**
     * Get user-defined or default lot sizes
     */
    protected function getUserLotSizes(User $user): array
    {
        $defaults = IndexLotSize::getExchangeDefaults();
        $userLotSizes = [];
        foreach ($defaults as $idx => $item) {
            $userLotSizes[$idx] = $item['lot_size'];
        }

        try {
            $records = IndexLotSize::where('user_id', $user->id)->get();
            foreach ($records as $r) {
                $userLotSizes[strtoupper($r->index_name)] = (int)$r->lot_size;
            }
        } catch (\Throwable $e) {
            // fallback to defaults
        }

        return $userLotSizes;
    }

    /**
     * Auto-sync today's executed Zerodha orders to TradeJournal.
     * Checks which orders from today's date are NOT yet added in All Trades.
     * Skips already added orders to prevent duplicate entries.
     */
    public function syncTodayOrdersToJournal(User $user): array
    {
        $integration = ZerodhaIntegration::where('user_id', $user->id)->first();
        if (!$integration || !$integration->is_connected) {
            return [
                'status' => 'error',
                'message' => 'Zerodha Kite is not connected. Please connect Kite first.',
                'synced_count' => 0,
            ];
        }

        $details = $this->getAllDetails($user);
        $allOrders = $details['orders'] ?? [];

        // Filter COMPLETE / EXECUTED orders only
        $executedOrders = array_values(array_filter($allOrders, function ($o) {
            $st = strtoupper($o['status'] ?? '');
            return in_array($st, ['COMPLETE']);
        }));

        $todayDate = Carbon::today()->toDateString();

        // Filter orders for today's date
        $todayOrders = array_values(array_filter($executedOrders, function ($o) use ($todayDate) {
            $ts = $o['order_timestamp'] ?? $o['exchange_timestamp'] ?? null;
            if (!$ts) return true;
            return Carbon::parse($ts)->toDateString() === $todayDate;
        }));

        // Sort today orders in ascending order of execution time (whichever was created first is processed first)
        usort($todayOrders, function ($a, $b) {
            $ta = $a['order_timestamp'] ?? $a['exchange_timestamp'] ?? '';
            $tb = $b['order_timestamp'] ?? $b['exchange_timestamp'] ?? '';
            return strcmp($ta, $tb);
        });

        if (empty($todayOrders)) {
            return [
                'status' => 'info',
                'synced_count' => 0,
                'already_added_count' => 0,
                'total_zerodha_orders' => 0,
                'message' => "No executed orders found in Zerodha for today ({$todayDate}).",
            ];
        }

        // Clean up any orphaned trade orders whose trade was deleted
        TradeOrder::where('user_id', $user->id)->whereDoesntHave('trade')->delete();

        // Fetch existing trade orders for today that belong to active (non-deleted) trades
        $existingTradeOrders = TradeOrder::where('user_id', $user->id)
            ->where('order_date', $todayDate)
            ->whereHas('trade')
            ->with('trade')
            ->get();

        $matchedTradeOrderIds = [];
        $addedOrders = [];
        $unaddedOrders = [];

        foreach ($todayOrders as $ord) {
            $orderId = (string)($ord['order_id'] ?? '');
            $sym = $ord['tradingsymbol'] ?? '';
            $type = strtoupper($ord['transaction_type'] ?? 'BUY');
            $qty = abs((int)($ord['filled_quantity'] ?? $ord['quantity'] ?? 0));
            $price = (float)($ord['average_price'] ?? $ord['price'] ?? 0);
            $parsed = $this->parseTradingSymbol($sym);
            $orderTime = Carbon::parse($ord['order_timestamp'] ?? now())->format('H:i');

            $isMatched = false;

            // 1. Check if order_id stamped in TradeOrder.notes or Trade.notes of an active trade
            if (!empty($orderId)) {
                foreach ($existingTradeOrders as $to) {
                    if (!in_array($to->id, $matchedTradeOrderIds) && $to->trade) {
                        if (str_contains($to->notes ?? '', "[Zerodha:{$orderId}]") ||
                            str_contains($to->trade->notes ?? '', "Order #{$orderId}") ||
                            str_contains($to->trade->notes ?? '', "[Zerodha:{$orderId}]")) {
                            $matchedTradeOrderIds[] = $to->id;
                            $isMatched = true;
                            break;
                        }
                    }
                }
            }

            // 2. Parametric matching for orders imported previously via screenshot or manual
            if (!$isMatched) {
                foreach ($existingTradeOrders as $to) {
                    if (!in_array($to->id, $matchedTradeOrderIds)) {
                        $trade = $to->trade;
                        if (!$trade) continue;

                        $toType = strtoupper($to->order_type);
                        $toQty = (int)$to->quantity;
                        $toPrice = (float)$to->price;
                        $toTime = Carbon::parse($to->order_time)->format('H:i');

                        $typeMatch = ($toType === $type);
                        $qtyMatch = ($toQty === $qty);
                        $priceMatch = (abs($toPrice - $price) < 0.50);
                        $indexMatch = (strtoupper($trade->index_name) === strtoupper($parsed['index_name']));
                        $strikeMatch = (abs((float)$trade->strike_price - (float)$parsed['strike_price']) < 0.01);
                        $optMatch = ($trade->option_type === 'Both' || strtoupper($trade->option_type) === strtoupper($parsed['option_type']));

                        $tDiff = abs(strtotime("{$todayDate} {$orderTime}") - strtotime("{$todayDate} {$toTime}"));
                        $timeMatch = ($tDiff <= 300); // within 5 minutes

                        if ($typeMatch && $qtyMatch && $priceMatch && $indexMatch && $strikeMatch && $optMatch && $timeMatch) {
                            $matchedTradeOrderIds[] = $to->id;
                            $isMatched = true;

                            // Retroactively stamp order_id into notes so next checks are instant
                            if (!empty($orderId) && !str_contains($to->notes ?? '', "[Zerodha:{$orderId}]")) {
                                try {
                                    $to->notes = "[Zerodha:{$orderId}] " . ($to->notes ?? '');
                                    $to->save();
                                } catch (\Throwable $e) {
                                    // ignore save errors
                                }
                            }
                            break;
                        }
                    }
                }
            }

            if ($isMatched) {
                $addedOrders[] = $ord;
            } else {
                $unaddedOrders[] = $ord;
            }
        }

        // If no unadded orders, all are already added
        if (empty($unaddedOrders)) {
            return [
                'status' => 'success',
                'synced_count' => 0,
                'already_added_count' => count($addedOrders),
                'total_zerodha_orders' => count($todayOrders),
                'message' => 'All ' . count($todayOrders) . " executed order(s) for today ({$todayDate}) are already added in All Trades. Zero duplicates found.",
            ];
        }

        // Format unadded orders for OrderScreenshotParserService::importOrders
        $userLotSizes = $this->getUserLotSizes($user);
        $formattedOrders = [];

        foreach ($unaddedOrders as $idx => $ord) {
            $sym = $ord['tradingsymbol'] ?? '';
            $parsed = $this->parseTradingSymbol($sym);
            $indexName = $parsed['index_name'];
            $lotSize = $userLotSizes[$indexName] ?? $parsed['lot_size'] ?? 50;
            $qty = abs((int)($ord['filled_quantity'] ?? $ord['quantity'] ?? $lotSize));
            $price = max(0.0, (float)($ord['average_price'] ?? $ord['price'] ?? 0));
            $orderTimestamp = $ord['order_timestamp'] ?? now()->toDateTimeString();
            $time = Carbon::parse($orderTimestamp)->format('H:i:s');
            $orderId = (string)($ord['order_id'] ?? ($idx + 1));

            $formattedOrders[] = [
                'id' => $orderId,
                'order_id' => $orderId,
                'selected' => true,
                'time' => $time,
                'raw_timestamp' => $orderTimestamp,
                'type' => strtoupper($ord['transaction_type'] ?? 'BUY'),
                'index_name' => $indexName,
                'strike_price' => (string)$parsed['strike_price'],
                'option_type' => $parsed['option_type'],
                'expiry_text' => $parsed['expiry_text'] ?: '19 NOV',
                'expiry_date' => $parsed['expiry_date'] ?: $todayDate,
                'quantity' => $qty,
                'lots' => max(1, (int)round($qty / $lotSize)),
                'lot_size' => $lotSize,
                'price' => $price,
                'turnover' => round($qty * $price, 2),
                'product' => $ord['product'] ?? 'NRML',
                'status' => 'COMPLETE',
            ];
        }

        // Ensure formatted orders are in strict ascending order of execution time
        usort($formattedOrders, function ($a, $b) {
            $ta = $a['raw_timestamp'] ?? ($a['time'] ?? '');
            $tb = $b['raw_timestamp'] ?? ($b['time'] ?? '');
            return strcmp($ta, $tb);
        });

        $accountId = $user->defaultAccount?->id ?? $user->tradingAccounts()->first()?->id ?? null;

        $importResult = $this->screenshotParserService->importOrders(
            $user,
            $formattedOrders,
            $todayDate,
            $accountId,
            'smart',
            'auto'
        );

        $syncedCount = count($formattedOrders);

        return [
            'status' => 'success',
            'synced_count' => $syncedCount,
            'already_added_count' => count($addedOrders),
            'total_zerodha_orders' => count($todayOrders),
            'message' => "Successfully synced {$syncedCount} new order(s) from Zerodha into All Trades!",
            'import_result' => $importResult,
        ];
    }

    /**
     * Format integration entity for API responses
     */
    protected function formatIntegrationResponse(ZerodhaIntegration $integration): array
    {
        return [
            'id' => $integration->id,
            'broker_user_id' => $integration->broker_user_id,
            'user_name' => $integration->user_name,
            'user_shortname' => $integration->user_shortname,
            'email' => $integration->email,
            'user_type' => $integration->user_type,
            'broker' => $integration->broker,
            'avatar_url' => $integration->avatar_url,
            'is_connected' => (bool)$integration->is_connected,
            'is_demo' => (bool)$integration->is_demo,
            'connected_at' => $integration->connected_at?->toIso8601String(),
            'last_synced_at' => $integration->last_synced_at?->toIso8601String(),
            'token_expires_at' => $integration->token_expires_at?->toIso8601String(),
            'meta' => $integration->meta ?? [],
        ];
    }

    /**
     * Generate rich mock details for Demo / Sandbox mode
     */
    protected function getMockDetails(ZerodhaIntegration $integration): array
    {
        $today = Carbon::today()->format('Y-m-d');

        $margins = [
            'equity' => [
                'enabled' => true,
                'net' => 482650.00,
                'available' => [
                    'cash' => 342150.50,
                    'collateral' => 140500.00,
                    'intraday_payin' => 0.00,
                ],
                'utilised' => [
                    'debits' => 140499.50,
                    'exposure' => 38200.00,
                    'm2m_realised' => 18450.00,
                    'm2m_unrealised' => 8620.00,
                    'option_premium' => 83679.50,
                    'span' => 0.00,
                ],
            ],
            'commodity' => [
                'enabled' => true,
                'net' => 75000.00,
                'available' => [
                    'cash' => 75000.00,
                ],
                'utilised' => [
                    'debits' => 0.00,
                ],
            ],
        ];

        $orders = [
            [
                'order_id' => '26111300049281',
                'exchange_order_id' => '13000000049281',
                'placed_by' => $integration->broker_user_id,
                'status' => 'COMPLETE',
                'status_message' => null,
                'tradingsymbol' => 'NIFTY 26NOV 25200 CE',
                'exchange' => 'NFO',
                'instrument_token' => 12948226,
                'transaction_type' => 'BUY',
                'order_type' => 'LIMIT',
                'product' => 'NRML',
                'validity' => 'DAY',
                'price' => 216.80,
                'quantity' => 250,
                'filled_quantity' => 250,
                'pending_quantity' => 0,
                'cancelled_quantity' => 0,
                'average_price' => 216.80,
                'order_timestamp' => "{$today} 09:20:14",
                'exchange_timestamp' => "{$today} 09:20:15",
                'variety' => 'regular',
                'tag' => 'STRADDLE_LEG',
            ],
            [
                'order_id' => '26111300049282',
                'exchange_order_id' => '13000000049282',
                'placed_by' => $integration->broker_user_id,
                'status' => 'COMPLETE',
                'status_message' => null,
                'tradingsymbol' => 'NIFTY 26NOV 25200 PE',
                'exchange' => 'NFO',
                'instrument_token' => 12948482,
                'transaction_type' => 'BUY',
                'order_type' => 'LIMIT',
                'product' => 'NRML',
                'validity' => 'DAY',
                'price' => 220.55,
                'quantity' => 250,
                'filled_quantity' => 250,
                'pending_quantity' => 0,
                'cancelled_quantity' => 0,
                'average_price' => 220.55,
                'order_timestamp' => "{$today} 09:20:18",
                'exchange_timestamp' => "{$today} 09:20:19",
                'variety' => 'regular',
                'tag' => 'STRADDLE_LEG',
            ],
            [
                'order_id' => '26111300078193',
                'exchange_order_id' => '13000000078193',
                'placed_by' => $integration->broker_user_id,
                'status' => 'COMPLETE',
                'status_message' => null,
                'tradingsymbol' => 'SENSEX 26NOV 81800 CE',
                'exchange' => 'BFO',
                'instrument_token' => 1482910,
                'transaction_type' => 'BUY',
                'order_type' => 'MARKET',
                'product' => 'MIS',
                'validity' => 'DAY',
                'price' => 0,
                'quantity' => 30,
                'filled_quantity' => 30,
                'pending_quantity' => 0,
                'cancelled_quantity' => 0,
                'average_price' => 168.80,
                'order_timestamp' => "{$today} 11:45:22",
                'exchange_timestamp' => "{$today} 11:45:23",
                'variety' => 'regular',
                'tag' => 'SCALP',
            ],
            [
                'order_id' => '26111300091204',
                'exchange_order_id' => '13000000091204',
                'placed_by' => $integration->broker_user_id,
                'status' => 'COMPLETE',
                'status_message' => null,
                'tradingsymbol' => 'SENSEX 26NOV 81800 CE',
                'exchange' => 'BFO',
                'instrument_token' => 1482910,
                'transaction_type' => 'SELL',
                'order_type' => 'LIMIT',
                'product' => 'MIS',
                'validity' => 'DAY',
                'price' => 182.30,
                'quantity' => 30,
                'filled_quantity' => 30,
                'pending_quantity' => 0,
                'cancelled_quantity' => 0,
                'average_price' => 182.30,
                'order_timestamp' => "{$today} 13:10:45",
                'exchange_timestamp' => "{$today} 13:10:46",
                'variety' => 'regular',
                'tag' => 'SCALP_EXIT',
            ],
            [
                'order_id' => '26111300114590',
                'exchange_order_id' => '13000000114590',
                'placed_by' => $integration->broker_user_id,
                'status' => 'COMPLETE',
                'status_message' => null,
                'tradingsymbol' => 'NIFTY 26NOV 25400 CE',
                'exchange' => 'NFO',
                'instrument_token' => 12950018,
                'transaction_type' => 'BUY',
                'order_type' => 'LIMIT',
                'product' => 'NRML',
                'validity' => 'DAY',
                'price' => 105.20,
                'quantity' => 150,
                'filled_quantity' => 150,
                'pending_quantity' => 0,
                'cancelled_quantity' => 0,
                'average_price' => 105.20,
                'order_timestamp' => "{$today} 14:02:10",
                'exchange_timestamp' => "{$today} 14:02:11",
                'variety' => 'regular',
                'tag' => 'BTST',
            ],
            [
                'order_id' => '26111300129031',
                'exchange_order_id' => null,
                'placed_by' => $integration->broker_user_id,
                'status' => 'CANCELLED',
                'status_message' => 'Cancelled by user',
                'tradingsymbol' => 'BANKNIFTY 26NOV 51500 PE',
                'exchange' => 'NFO',
                'instrument_token' => 1184920,
                'transaction_type' => 'BUY',
                'order_type' => 'LIMIT',
                'product' => 'NRML',
                'validity' => 'DAY',
                'price' => 280.00,
                'quantity' => 60,
                'filled_quantity' => 0,
                'pending_quantity' => 0,
                'cancelled_quantity' => 60,
                'average_price' => 0,
                'order_timestamp' => "{$today} 14:45:00",
                'exchange_timestamp' => null,
                'variety' => 'regular',
                'tag' => null,
            ],
        ];

        $positions = [
            'net' => [
                [
                    'tradingsymbol' => 'NIFTY 26NOV 25200 CE',
                    'exchange' => 'NFO',
                    'instrument_token' => 12948226,
                    'product' => 'NRML',
                    'quantity' => 250,
                    'overnight_quantity' => 0,
                    'multiplier' => 1,
                    'average_price' => 216.80,
                    'close_price' => 210.00,
                    'last_price' => 237.85,
                    'value' => 59462.50,
                    'pnl' => 5262.50,
                    'm2m' => 5262.50,
                    'unrealised' => 5262.50,
                    'realised' => 0.00,
                    'buy_quantity' => 250,
                    'buy_price' => 216.80,
                    'buy_value' => 54200.00,
                    'sell_quantity' => 0,
                    'sell_price' => 0,
                    'sell_value' => 0,
                    'day_buy_quantity' => 250,
                    'day_buy_price' => 216.80,
                    'day_buy_value' => 54200.00,
                    'day_sell_quantity' => 0,
                    'day_sell_price' => 0,
                    'day_sell_value' => 0,
                ],
                [
                    'tradingsymbol' => 'NIFTY 26NOV 25200 PE',
                    'exchange' => 'NFO',
                    'instrument_token' => 12948482,
                    'product' => 'NRML',
                    'quantity' => 250,
                    'overnight_quantity' => 0,
                    'multiplier' => 1,
                    'average_price' => 220.55,
                    'close_price' => 225.00,
                    'last_price' => 195.40,
                    'value' => 48850.00,
                    'pnl' => -6287.50,
                    'm2m' => -6287.50,
                    'unrealised' => -6287.50,
                    'realised' => 0.00,
                    'buy_quantity' => 250,
                    'buy_price' => 220.55,
                    'buy_value' => 55137.50,
                    'sell_quantity' => 0,
                    'sell_price' => 0,
                    'sell_value' => 0,
                    'day_buy_quantity' => 250,
                    'day_buy_price' => 220.55,
                    'day_buy_value' => 55137.50,
                    'day_sell_quantity' => 0,
                    'day_sell_price' => 0,
                    'day_sell_value' => 0,
                ],
                [
                    'tradingsymbol' => 'NIFTY 26NOV 25400 CE',
                    'exchange' => 'NFO',
                    'instrument_token' => 12950018,
                    'product' => 'NRML',
                    'quantity' => 150,
                    'overnight_quantity' => 0,
                    'multiplier' => 1,
                    'average_price' => 105.20,
                    'close_price' => 100.00,
                    'last_price' => 118.60,
                    'value' => 17790.00,
                    'pnl' => 2010.00,
                    'm2m' => 2010.00,
                    'unrealised' => 2010.00,
                    'realised' => 0.00,
                    'buy_quantity' => 150,
                    'buy_price' => 105.20,
                    'buy_value' => 15780.00,
                    'sell_quantity' => 0,
                    'sell_price' => 0,
                    'sell_value' => 0,
                    'day_buy_quantity' => 150,
                    'day_buy_price' => 105.20,
                    'day_buy_value' => 15780.00,
                    'day_sell_quantity' => 0,
                    'day_sell_price' => 0,
                    'day_sell_value' => 0,
                ],
                [
                    'tradingsymbol' => 'SENSEX 26NOV 81800 CE',
                    'exchange' => 'BFO',
                    'instrument_token' => 1482910,
                    'product' => 'MIS',
                    'quantity' => 0,
                    'overnight_quantity' => 0,
                    'multiplier' => 1,
                    'average_price' => 0,
                    'close_price' => 170.00,
                    'last_price' => 184.10,
                    'value' => 0,
                    'pnl' => 405.00,
                    'm2m' => 405.00,
                    'unrealised' => 0.00,
                    'realised' => 405.00,
                    'buy_quantity' => 30,
                    'buy_price' => 168.80,
                    'buy_value' => 5064.00,
                    'sell_quantity' => 30,
                    'sell_price' => 182.30,
                    'sell_value' => 5469.00,
                    'day_buy_quantity' => 30,
                    'day_buy_price' => 168.80,
                    'day_buy_value' => 5064.00,
                    'day_sell_quantity' => 30,
                    'day_sell_price' => 182.30,
                    'day_sell_value' => 5469.00,
                ],
            ],
            'day' => [
                [
                    'tradingsymbol' => 'NIFTY 26NOV 25200 CE',
                    'exchange' => 'NFO',
                    'instrument_token' => 12948226,
                    'product' => 'NRML',
                    'quantity' => 250,
                    'average_price' => 216.80,
                    'last_price' => 237.85,
                    'pnl' => 5262.50,
                    'm2m' => 5262.50,
                ],
                [
                    'tradingsymbol' => 'NIFTY 26NOV 25200 PE',
                    'exchange' => 'NFO',
                    'instrument_token' => 12948482,
                    'product' => 'NRML',
                    'quantity' => 250,
                    'average_price' => 220.55,
                    'last_price' => 195.40,
                    'pnl' => -6287.50,
                    'm2m' => -6287.50,
                ],
                [
                    'tradingsymbol' => 'NIFTY 26NOV 25400 CE',
                    'exchange' => 'NFO',
                    'instrument_token' => 12950018,
                    'product' => 'NRML',
                    'quantity' => 150,
                    'average_price' => 105.20,
                    'last_price' => 118.60,
                    'pnl' => 2010.00,
                    'm2m' => 2010.00,
                ],
                [
                    'tradingsymbol' => 'SENSEX 26NOV 81800 CE',
                    'exchange' => 'BFO',
                    'instrument_token' => 1482910,
                    'product' => 'MIS',
                    'quantity' => 0,
                    'average_price' => 0,
                    'last_price' => 184.10,
                    'pnl' => 405.00,
                    'm2m' => 405.00,
                ],
            ],
        ];

        $holdings = [
            [
                'tradingsymbol' => 'INFY',
                'exchange' => 'NSE',
                'isin' => 'INE009A01021',
                'quantity' => 75,
                'authorised_quantity' => 75,
                'average_price' => 1785.40,
                'last_price' => 1862.15,
                'close_price' => 1850.00,
                'pnl' => 5756.25,
                'day_change' => 12.15,
                'day_change_percentage' => 0.66,
            ],
            [
                'tradingsymbol' => 'HDFCBANK',
                'exchange' => 'NSE',
                'isin' => 'INE040A01034',
                'quantity' => 120,
                'authorised_quantity' => 120,
                'average_price' => 1640.20,
                'last_price' => 1715.80,
                'close_price' => 1708.00,
                'pnl' => 9072.00,
                'day_change' => 7.80,
                'day_change_percentage' => 0.46,
            ],
            [
                'tradingsymbol' => 'RELIANCE',
                'exchange' => 'NSE',
                'isin' => 'INE002A01018',
                'quantity' => 50,
                'authorised_quantity' => 50,
                'average_price' => 1320.00,
                'last_price' => 1298.50,
                'close_price' => 1305.00,
                'pnl' => -1075.00,
                'day_change' => -6.50,
                'day_change_percentage' => -0.50,
            ],
            [
                'tradingsymbol' => 'TCS',
                'exchange' => 'NSE',
                'isin' => 'INE467B01029',
                'quantity' => 30,
                'authorised_quantity' => 30,
                'average_price' => 3950.00,
                'last_price' => 4125.00,
                'close_price' => 4090.00,
                'pnl' => 5250.00,
                'day_change' => 35.00,
                'day_change_percentage' => 0.86,
            ],
        ];

        $mfHoldings = [
            [
                'tradingsymbol' => 'INF966L01648',
                'fund' => 'Quant Large & Mid Cap Fund',
                'folio' => '51057320952',
                'quantity' => 1113.241,
                'average_price' => 125.75,
                'last_price' => 141.93,
                'invested' => 139992.73,
                'current_value' => 158002.41,
                'pnl' => 18009.68,
                'pnl_percentage' => 12.86,
                'day_change' => -664.60,
                'day_change_percentage' => -0.42,
            ],
        ];

        return [
            'status' => 'success',
            'is_demo' => (bool)$integration->is_demo,
            'last_synced_at' => Carbon::now()->toIso8601String(),
            'profile' => $this->formatIntegrationResponse($integration),
            'margins' => $margins,
            'orders' => $this->filterExecutedOrders($orders),
            'all_orders' => $this->sortOrdersDescending($orders),
            'positions' => $positions,
            'holdings' => $holdings,
            'mf_holdings' => $mfHoldings,
            'summary' => $this->calculateSummary($margins, $positions, $holdings, $orders, $integration->user, $mfHoldings),
        ];
    }
}
