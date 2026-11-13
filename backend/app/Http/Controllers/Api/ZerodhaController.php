<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ZerodhaKiteService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ZerodhaController extends Controller
{
    protected ZerodhaKiteService $kiteService;

    public function __construct(ZerodhaKiteService $kiteService)
    {
        $this->kiteService = $kiteService;
    }

    /**
     * Get Zerodha connection status
     */
    public function status(Request $request): JsonResponse
    {
        try {
            $status = $this->kiteService->getStatus($request->user());
            return response()->json($status);
        } catch (Exception $e) {
            return response()->json([
                'is_connected' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Connect Zerodha credentials (Email, Password, API Key, API Secret)
     */
    public function connect(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'nullable|string|max:255',
            'password' => 'nullable|string|max:255',
            'api_key' => 'nullable|string|max:100',
            'api_secret' => 'nullable|string|max:255',
            'access_token' => 'nullable|string|max:255',
            'request_token' => 'nullable|string|max:255',
        ]);

        try {
            $result = $this->kiteService->connect($request->user(), $validated);
            return response()->json($result);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Connect in Instant Realistic Demo / Sandbox mode
     */
    public function connectDemo(Request $request): JsonResponse
    {
        try {
            $result = $this->kiteService->connectDemo($request->user());
            return response()->json($result);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Disconnect Zerodha integration
     */
    public function disconnect(Request $request): JsonResponse
    {
        try {
            $result = $this->kiteService->disconnect($request->user());
            return response()->json($result);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get all Zerodha portfolio details (READ-ONLY)
     * Funds, executed orders, positions, holdings, profile & summary.
     */
    public function details(Request $request): JsonResponse
    {
        try {
            $details = $this->kiteService->getAllDetails($request->user());
            return response()->json($details);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Exchange Kite request_token for active access_token
     */
    public function exchangeToken(Request $request): JsonResponse
    {
        $request->validate([
            'request_token' => 'required|string',
        ]);

        try {
            $result = $this->kiteService->exchangeAndSaveToken($request->user(), $request->input('request_token'));
            return response()->json($result);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Save an active Kite access_token directly
     */
    public function setToken(Request $request): JsonResponse
    {
        $request->validate([
            'access_token' => 'required|string',
        ]);

        try {
            $result = $this->kiteService->saveAccessTokenDirect($request->user(), $request->input('access_token'));
            return response()->json($result);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Get Virtual Contract Note with itemized regulatory & broker charges
     */
    public function contractNote(Request $request): JsonResponse
    {
        try {
            $contractNote = $this->kiteService->getContractNote($request->user());
            return response()->json($contractNote);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Import executed Zerodha orders to TradeJournal (READ-ONLY IMPORT)
     */
    public function importOrders(Request $request): JsonResponse
    {
        $orderIds = $request->input('order_ids', []);

        try {
            $result = $this->kiteService->importOrdersToJournal($request->user(), is_array($orderIds) ? $orderIds : []);
            return response()->json($result);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 400);
        }
    }
}
