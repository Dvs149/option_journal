<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BrokerageSetting extends Model
{
    use HasFactory;

    protected $table = 'brokerage_settings';

    protected $fillable = [
        'user_id',
        'broker_name',
        'brokerage_per_order',
        'stt_rate_percent',
        'nse_txn_rate_percent',
        'bse_txn_rate_percent',
        'gst_rate_percent',
        'sebi_per_crore',
        'stamp_duty_rate_percent',
        'default_exchange',
    ];

    protected $casts = [
        'brokerage_per_order' => 'float',
        'stt_rate_percent' => 'float',
        'nse_txn_rate_percent' => 'float',
        'bse_txn_rate_percent' => 'float',
        'gst_rate_percent' => 'float',
        'sebi_per_crore' => 'float',
        'stamp_duty_rate_percent' => 'float',
    ];

    /**
     * Official Zerodha / Regulatory default rates
     */
    public const DEFAULTS = [
        'broker_name' => 'Zerodha',
        'brokerage_per_order' => 20.00,       // Flat ₹20 per executed order
        'stt_rate_percent' => 0.15000,         // 0.15% on sell side (on premium)
        'nse_txn_rate_percent' => 0.03553,     // NSE: 0.03553% on premium
        'bse_txn_rate_percent' => 0.03250,     // BSE: 0.0325% on premium
        'gst_rate_percent' => 18.00,           // 18% on (brokerage + SEBI + txn)
        'sebi_per_crore' => 10.00,             // ₹10 per crore (plus GST)
        'stamp_duty_rate_percent' => 0.00300,  // 0.003% or ₹300 per crore on buy side
        'default_exchange' => 'NSE',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get setting for a specific user, or default model if none exists yet
     */
    public static function forUser(?int $userId): array
    {
        if ($userId) {
            $record = static::where('user_id', $userId)->first();
            if ($record) {
                return [
                    'id' => $record->id,
                    'user_id' => $record->user_id,
                    'broker_name' => $record->broker_name,
                    'brokerage_per_order' => (float) $record->brokerage_per_order,
                    'stt_rate_percent' => (float) $record->stt_rate_percent,
                    'nse_txn_rate_percent' => (float) $record->nse_txn_rate_percent,
                    'bse_txn_rate_percent' => (float) $record->bse_txn_rate_percent,
                    'gst_rate_percent' => (float) $record->gst_rate_percent,
                    'sebi_per_crore' => (float) $record->sebi_per_crore,
                    'stamp_duty_rate_percent' => (float) $record->stamp_duty_rate_percent,
                    'default_exchange' => $record->default_exchange ?: 'NSE',
                    'is_custom' => true,
                ];
            }
        }

        return array_merge(self::DEFAULTS, [
            'id' => null,
            'user_id' => $userId,
            'is_custom' => false,
        ]);
    }
}
