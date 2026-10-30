<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Requests\RegisterRequest;
use App\Models\TradingAccount;
use App\Models\TradingStrategy;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $initialCapital = $request->input('initial_capital', 500000.00);

        // Create default trading account
        $account = TradingAccount::create([
            'user_id' => $user->id,
            'account_name' => 'Primary Trading Account',
            'broker_name' => 'Zerodha',
            'initial_capital' => $initialCapital,
            'daily_profit_target' => 20000.00,
            'daily_max_loss' => 25000.00,
            'monthly_profit_target' => 150000.00,
            'monthly_max_loss' => 100000.00,
            'is_default' => true,
        ]);

        // Seed common default strategies
        $defaultStrategies = [
            'Long Straddle' => 'Delta neutral volatility expansion strategy',
            'Directional CE' => 'Momentum bullish call option buying',
            'Directional PE' => 'Bearish put option buying with strong trend continuation',
            'BTST' => 'Buy today sell tomorrow overnight momentum play',
            'Short Strangle' => 'Delta neutral premium decay range bound strategy',
            'Bull Call Spread' => 'Defined risk vertical call spread',
            'Bear Put Spread' => 'Defined risk vertical put spread',
            'Iron Condor' => 'Range bound non-directional income strategy',
        ];

        foreach ($defaultStrategies as $name => $desc) {
            TradingStrategy::create([
                'user_id' => $user->id,
                'strategy_name' => $name,
                'description' => $desc,
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'User registered successfully',
            'user' => $user->load('defaultAccount'),
            'token' => $token,
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Logged in successfully',
            'user' => $user->load('defaultAccount'),
            'token' => $token,
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user()->load('defaultAccount'),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email,' . $user->id],
        ]);

        $user->update($validated);

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user->fresh()->load('defaultAccount'),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password does not match.'],
            ]);
        }

        $user->update([
            'password' => Hash::make($request->new_password),
        ]);

        return response()->json([
            'message' => 'Password changed successfully',
        ]);
    }
}
