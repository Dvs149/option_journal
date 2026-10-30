<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function tradingAccounts(): HasMany
    {
        return $this->hasMany(TradingAccount::class);
    }

    public function defaultAccount(): HasOne
    {
        return $this->hasOne(TradingAccount::class)->where('is_default', true);
    }

    public function trades(): HasMany
    {
        return $this->hasMany(Trade::class);
    }

    public function strategies(): HasMany
    {
        return $this->hasMany(TradingStrategy::class);
    }

    public function capitalTransactions(): HasMany
    {
        return $this->hasMany(CapitalTransaction::class);
    }

    public function brokerageSetting(): HasOne
    {
        return $this->hasOne(BrokerageSetting::class);
    }

    public function indexLotSizes(): HasMany
    {
        return $this->hasMany(IndexLotSize::class);
    }

    public function dropdownOptions(): HasMany
    {
        return $this->hasMany(DropdownOption::class);
    }
}
