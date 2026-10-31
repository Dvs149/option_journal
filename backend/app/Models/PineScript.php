<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PineScript extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'script_type',
        'version',
        'category',
        'target_market',
        'timeframe',
        'description',
        'code',
        'tradingview_url',
        'is_favorite',
        'tags',
    ];

    protected $casts = [
        'is_favorite' => 'boolean',
        'tags' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
