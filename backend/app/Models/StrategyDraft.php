<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StrategyDraft extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'portfolio_name',
        'strategy_name',
        'underlying',
        'target_price',
        'target_date',
        'iv_adjustment',
        'legs',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'target_price' => 'decimal:2',
        'iv_adjustment' => 'decimal:2',
        'legs' => 'array',
        'is_active' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
