<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\OptionChainService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OptionChainController extends Controller
{
    public function __construct(
        protected OptionChainService $optionChainService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $symbol = $request->query('symbol', 'NIFTY');
        $expiry = $request->query('expiry', null);

        $data = $this->optionChainService->getOptionChain($symbol, $expiry);

        return response()->json($data);
    }
}
