<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('stories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('author')->nullable();
            $table->string('category', 50)->default('General')->index();
            $table->text('summary')->nullable();
            $table->longText('content');
            $table->string('cover_color', 30)->nullable();
            $table->json('tags')->nullable();
            $table->unsignedInteger('word_count')->default(0);
            $table->unsignedInteger('estimated_reading_time')->default(1); // in minutes
            $table->unsignedTinyInteger('reading_progress')->default(0); // 0-100 percentage
            $table->string('status', 20)->default('unread')->index(); // unread, reading, completed
            $table->boolean('is_favorite')->default(false)->index();
            $table->timestamp('last_read_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['user_id', 'is_favorite']);
            $table->index(['user_id', 'category']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stories');
    }
};
