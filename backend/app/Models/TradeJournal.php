<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TradeJournal extends Model
{
    use HasFactory;

    protected $fillable = [
        'trade_id',
        'market_conditions',
        'trade_setup',
        'what_went_right',
        'what_went_wrong',
        'mistakes_made',
        'lessons_learned',
        'personal_notes',
    ];

    public function trade(): BelongsTo
    {
        return $this->belongsTo(Trade::class);
    }
}
