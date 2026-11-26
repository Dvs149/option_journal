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
        'series_name',
        'part_number',
        'part_title',
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
        'part_number' => 'integer',
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

    public function scopeSeries($query, ?string $seriesName)
    {
        if ($seriesName && $seriesName !== 'all') {
            return $query->where('series_name', $seriesName);
        }
        return $query;
    }

    public function scopeSeriesFilter($query, ?string $filter)
    {
        if ($filter === 'series_only') {
            return $query->whereNotNull('series_name')->where('series_name', '!=', '');
        }
        if ($filter === 'standalone_only') {
            return $query->where(function ($q) {
                $q->whereNull('series_name')->orWhere('series_name', '');
            });
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
              ->orWhere('summary', 'like', "%{$term}%")
              ->orWhere('series_name', 'like', "%{$term}%")
              ->orWhere('part_title', 'like', "%{$term}%");
        });
    }

    /**
     * Get all sibling parts in the same series for this user, ordered by part_number.
     */
    public function getSiblingParts()
    {
        if (empty($this->series_name)) {
            return collect();
        }

        return static::where('user_id', $this->user_id)
            ->where('series_name', $this->series_name)
            ->orderBy('part_number', 'asc')
            ->orderBy('id', 'asc')
            ->get([
                'id',
                'title',
                'series_name',
                'part_number',
                'part_title',
                'status',
                'reading_progress',
                'last_read_paragraph',
                'word_count',
                'estimated_reading_time',
            ]);
    }
}
