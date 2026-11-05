<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TradeOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'trade_id',
        'user_id',
        'order_type',
        'quantity',
        'lots',
        'price',
        'order_date',
        'order_time',
        'brokerage',
        'stt',
        'exchange_charges',
        'gst',
        'sebi_charges',
        'stamp_duty',
        'other_charges',
        'total_charges',
        'realized_pnl',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'order_date' => 'date:Y-m-d',
            'quantity' => 'integer',
            'lots' => 'integer',
            'price' => 'decimal:2',
            'brokerage' => 'decimal:2',
            'stt' => 'decimal:2',
            'exchange_charges' => 'decimal:2',
            'gst' => 'decimal:2',
            'sebi_charges' => 'decimal:2',
            'stamp_duty' => 'decimal:2',
            'other_charges' => 'decimal:2',
            'total_charges' => 'decimal:2',
            'realized_pnl' => 'decimal:2',
        ];
    }

    public function trade(): BelongsTo
    {
        return $this->belongsTo(Trade::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
