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
        Schema::create('strategy_drafts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('portfolio_name')->default('Default Portfolio')->index();
            $table->string('strategy_name');
            $table->string('underlying')->default('NIFTY')->index();
            $table->decimal('target_price', 12, 2)->nullable();
            $table->string('target_date')->nullable();
            $table->decimal('iv_adjustment', 5, 2)->default(0);
            $table->json('legs');
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('strategy_drafts');
    }
};
