<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TradeScreenshot extends Model
{
    use HasFactory;

    protected $fillable = [
        'trade_id',
        'path',
        'filename',
        'caption',
        'sort_order',
    ];

    protected $appends = ['url'];

    public function getUrlAttribute(): ?string
    {
        if (!$this->path) {
            return null;
        }

        if (filter_var($this->path, FILTER_VALIDATE_URL)) {
            return $this->path;
        }

        return url('storage/' . ltrim($this->path, '/'));
    }

    public function trade(): BelongsTo
    {
        return $this->belongsTo(Trade::class);
    }
}
