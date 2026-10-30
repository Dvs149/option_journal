<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Trade extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'trading_account_id',
        'trade_date',
        'index_name',
        'trading_type',
        'strategy_name',
        'option_type',
        'strike_price',
        'expiry_date',
        'ce_entry_price',
        'pe_entry_price',
        'entry_premium',
        'ce_exit_price',
        'pe_exit_price',
        'exit_premium',
        'quantity',
        'lots',
        'gross_profit',
        'gross_loss',
        'brokerage',
        'stt',
        'exchange_charges',
        'gst',
        'sebi_charges',
        'stamp_duty',
        'other_charges',
        'total_charges',
        'net_pnl',
        'entry_reason',
        'exit_reason',
        'notes',
        'screenshot_path',
    ];

    protected function casts(): array
    {
        return [
            'trade_date' => 'date:Y-m-d',
            'expiry_date' => 'date:Y-m-d',
            'strike_price' => 'decimal:2',
            'ce_entry_price' => 'decimal:2',
            'pe_entry_price' => 'decimal:2',
            'entry_premium' => 'decimal:2',
            'ce_exit_price' => 'decimal:2',
            'pe_exit_price' => 'decimal:2',
            'exit_premium' => 'decimal:2',
            'quantity' => 'integer',
            'lots' => 'integer',
            'gross_profit' => 'decimal:2',
            'gross_loss' => 'decimal:2',
            'brokerage' => 'decimal:2',
            'stt' => 'decimal:2',
            'exchange_charges' => 'decimal:2',
            'gst' => 'decimal:2',
            'sebi_charges' => 'decimal:2',
            'stamp_duty' => 'decimal:2',
            'other_charges' => 'decimal:2',
            'total_charges' => 'decimal:2',
            'net_pnl' => 'decimal:2',
        ];
    }

    protected $appends = ['screenshot_url', 'screenshots_list'];

    public function getScreenshotUrlAttribute(): ?string
    {
        if ($this->relationLoaded('screenshots') && $this->screenshots->isNotEmpty()) {
            return $this->screenshots->first()->url;
        }

        if (!$this->screenshot_path) {
            return null;
        }

        if (filter_var($this->screenshot_path, FILTER_VALIDATE_URL)) {
            return $this->screenshot_path;
        }

        return url('storage/' . ltrim($this->screenshot_path, '/'));
    }

    public function getScreenshotsListAttribute(): array
    {
        $collection = $this->relationLoaded('screenshots') ? $this->screenshots : $this->screenshots()->get();
        if ($collection && $collection->isNotEmpty()) {
            return $collection->map(function ($s) {
                return [
                    'id' => $s->id,
                    'url' => $s->url,
                    'path' => $s->path,
                    'filename' => $s->filename ?: basename($s->path),
                    'caption' => $s->caption,
                ];
            })->values()->toArray();
        }

        if ($this->screenshot_path) {
            return [[
                'id' => null,
                'url' => $this->screenshot_url,
                'path' => $this->screenshot_path,
                'filename' => basename($this->screenshot_path),
                'caption' => 'Chart Screenshot',
            ]];
        }

        return [];
    }

    public function screenshots(): HasMany
    {
        return $this->hasMany(TradeScreenshot::class)->orderBy('sort_order')->orderBy('id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tradingAccount(): BelongsTo
    {
        return $this->belongsTo(TradingAccount::class);
    }

    public function journal(): HasOne
    {
        return $this->hasOne(TradeJournal::class);
    }

    protected function serializeDate(\DateTimeInterface $date): string
    {
        return $date->format('Y-m-d');
    }
}
