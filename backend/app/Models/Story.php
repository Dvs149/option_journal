<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Story extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'stories';

    protected $fillable = [
        'user_id',
        'title',
        'author',
        'category',
        'summary',
        'content',
        'cover_color',
        'tags',
        'word_count',
        'estimated_reading_time',
        'reading_progress',
        'last_read_paragraph',
        'status',
        'is_favorite',
        'last_read_at',
    ];

    protected $casts = [
        'tags' => 'array',
        'word_count' => 'integer',
        'estimated_reading_time' => 'integer',
        'reading_progress' => 'integer',
        'last_read_paragraph' => 'integer',
        'is_favorite' => 'boolean',
        'last_read_at' => 'datetime',
    ];

    /**
     * Boot the model and calculate word count and reading time on save if needed.
     */
    protected static function boot()
    {
        parent::boot();

        static::saving(function (Story $story) {
            if ($story->isDirty('content') || empty($story->word_count)) {
                $rawText = strip_tags($story->content ?? '');
                $words = str_word_count($rawText);
                $story->word_count = $words;
                // Average reading speed is ~200-220 wpm
                $story->estimated_reading_time = max(1, (int) ceil($words / 200));
            }

            if (empty($story->summary) && !empty($story->content)) {
                $plain = trim(strip_tags($story->content));
                $story->summary = mb_substr($plain, 0, 180) . (mb_strlen($plain) > 180 ? '...' : '');
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeFavorites($query)
    {
        return $query->where('is_favorite', true);
    }

    public function scopeStatus($query, ?string $status)
    {
        if ($status && $status !== 'all') {
            return $query->where('status', $status);
        }
        return $query;
    }

    public function scopeCategory($query, ?string $category)
    {
        if ($category && $category !== 'all') {
            return $query->where('category', $category);
        }
        return $query;
    }

    public function scopeSearch($query, ?string $term)
    {
        if (!$term) {
            return $query;
        }

        return $query->where(function ($q) use ($term) {
            $q->where('title', 'like', "%{$term}%")
              ->orWhere('author', 'like', "%{$term}%")
              ->orWhere('category', 'like', "%{$term}%")
              ->orWhere('summary', 'like', "%{$term}%");
        });
    }
}
