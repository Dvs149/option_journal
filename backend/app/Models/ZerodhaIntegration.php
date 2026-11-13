<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ZerodhaIntegration extends Model
{
    use HasFactory;

    protected $table = 'zerodha_integrations';

    protected $fillable = [
        'user_id',
        'api_key',
        'api_secret',
        'access_token',
        'request_token',
        'public_token',
        'broker_user_id',
        'user_name',
        'user_shortname',
        'email',
        'user_type',
        'broker',
        'avatar_url',
        'is_connected',
        'is_demo',
        'connected_at',
        'token_generated_at',
        'token_expires_at',
        'last_synced_at',
        'meta',
    ];

    protected $casts = [
        'is_connected' => 'boolean',
        'is_demo' => 'boolean',
        'connected_at' => 'datetime',
        'token_generated_at' => 'datetime',
        'token_expires_at' => 'datetime',
        'last_synced_at' => 'datetime',
        'meta' => 'array',
    ];

    protected $hidden = [
        'api_secret',
        'access_token',
        'request_token',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
