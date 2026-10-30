<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserModuleVisibility extends Model
{
    use HasFactory;

    protected $table = 'user_module_visibilities';

    protected $fillable = [
        'user_id',
        'module_key',
        'is_visible',
        'sort_order',
    ];

    protected $casts = [
        'is_visible' => 'boolean',
        'sort_order' => 'integer',
    ];

    public static array $defaultModules = [
        ['module_key' => 'add-trade', 'sort_order' => 1],
        ['module_key' => 'trades', 'sort_order' => 2],
        ['module_key' => 'calendar', 'sort_order' => 3],
        ['module_key' => 'equity-curve', 'sort_order' => 4],
        ['module_key' => 'risk-management', 'sort_order' => 5],
        ['module_key' => 'journal', 'sort_order' => 6],
        ['module_key' => 'strategy-analysis', 'sort_order' => 7],
        ['module_key' => 'analytics', 'sort_order' => 8],
        ['module_key' => 'capital-management', 'sort_order' => 9],
    ];

    public static function seedDefaultsForUser(int $userId): void
    {
        foreach (self::$defaultModules as $mod) {
            self::firstOrCreate(
                [
                    'user_id' => $userId,
                    'module_key' => $mod['module_key'],
                ],
                [
                    'is_visible' => true,
                    'sort_order' => $mod['sort_order'],
                ]
            );
        }
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
