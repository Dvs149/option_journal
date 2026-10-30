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
        Schema::create('dropdown_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('module_key', 50); // 'add-trade', 'trades', 'journal', 'global'
            $table->string('dropdown_key', 50); // 'index_name', 'trading_type', 'strategy_name', 'market_conditions', 'option_type', 'mood'
            $table->string('dropdown_label', 100); // e.g. 'Index', 'Trading Type', 'Strategy Name', 'Market Condition'
            $table->string('option_value', 100);
            $table->string('option_label', 150);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->boolean('is_system')->default(true);
            $table->string('color', 50)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'module_key', 'dropdown_key', 'option_value'], 'uniq_user_mod_dd_opt');
            $table->index(['user_id', 'module_key', 'dropdown_key'], 'idx_user_mod_dd');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dropdown_options');
    }
};
