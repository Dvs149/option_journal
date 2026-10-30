<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IndexLotSize extends Model
{
    use HasFactory;

    protected $table = 'index_lot_sizes';

    protected $fillable = [
        'user_id',
        'index_name',
        'lot_size',
        'exchange',
        'display_name',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'lot_size' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Standard Exchange Default Lot Sizes
     */
    public static function getExchangeDefaults(): array
    {
        return [
            'NIFTY' => ['lot_size' => 50, 'exchange' => 'NSE', 'display_name' => 'Nifty 50'],
            'BANKNIFTY' => ['lot_size' => 15, 'exchange' => 'NSE', 'display_name' => 'Bank Nifty'],
            'SENSEX' => ['lot_size' => 10, 'exchange' => 'BSE', 'display_name' => 'BSE Sensex'],
            'FINNIFTY' => ['lot_size' => 25, 'exchange' => 'NSE', 'display_name' => 'Nifty Financial'],
            'MIDCPNIFTY' => ['lot_size' => 50, 'exchange' => 'NSE', 'display_name' => 'Nifty Midcap'],
            'BANKEX' => ['lot_size' => 15, 'exchange' => 'BSE', 'display_name' => 'BSE Bankex'],
            'STOCK' => ['lot_size' => 1, 'exchange' => 'NSE', 'display_name' => 'Individual Stocks'],
        ];
    }

    /**
     * Seed user lot sizes with defaults if empty
     */
    public static function seedDefaultsForUser(int $userId): void
    {
        $defaults = self::getExchangeDefaults();
        foreach ($defaults as $name => $meta) {
            self::updateOrCreate(
                ['user_id' => $userId, 'index_name' => $name],
                [
                    'lot_size' => $meta['lot_size'],
                    'exchange' => $meta['exchange'],
                    'display_name' => $meta['display_name'],
                    'is_active' => true,
                ]
            );
        }
    }
}
