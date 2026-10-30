<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TradingAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'account_name',
        'broker_name',
        'initial_capital',
        'daily_profit_target',
        'daily_max_loss',
        'monthly_profit_target',
        'monthly_max_loss',
        'is_default',
    ];

    protected function casts(): array
    {
        return [
            'initial_capital' => 'decimal:2',
            'daily_profit_target' => 'decimal:2',
            'daily_max_loss' => 'decimal:2',
            'monthly_profit_target' => 'decimal:2',
            'monthly_max_loss' => 'decimal:2',
            'is_default' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function trades(): HasMany
    {
        return $this->hasMany(Trade::class);
    }

    public function capitalTransactions(): HasMany
    {
        return $this->hasMany(CapitalTransaction::class);
    }
}
