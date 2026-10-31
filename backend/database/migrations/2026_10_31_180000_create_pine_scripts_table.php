<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pine_scripts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('script_type')->default('indicator'); // indicator, strategy, library, alert
            $table->string('version')->default('v5'); // v5, v6, v4
            $table->string('category')->default('Options');
            $table->string('target_market')->default('All');
            $table->string('timeframe')->default('5m');
            $table->text('description')->nullable();
            $table->longText('code');
            $table->string('tradingview_url')->nullable();
            $table->boolean('is_favorite')->default(false);
            $table->json('tags')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'script_type']);
            $table->index(['user_id', 'is_favorite']);
            $table->index(['user_id', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pine_scripts');
    }
};
