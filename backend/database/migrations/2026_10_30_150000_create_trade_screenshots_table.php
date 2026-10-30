<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('trade_screenshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trade_id')->constrained('trades')->cascadeOnDelete();
            $table->string('path', 500);
            $table->string('filename', 255)->nullable();
            $table->string('caption', 255)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['trade_id', 'sort_order']);
        });

        // Migrate any existing screenshot_path in trades table to trade_screenshots
        try {
            $existingTrades = DB::table('trades')
                ->whereNotNull('screenshot_path')
                ->where('screenshot_path', '!=', '')
                ->get();

            foreach ($existingTrades as $trade) {
                DB::table('trade_screenshots')->insert([
                    'trade_id' => $trade->id,
                    'path' => $trade->screenshot_path,
                    'filename' => basename($trade->screenshot_path),
                    'caption' => 'Chart Screenshot',
                    'sort_order' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        } catch (\Throwable $e) {
            // Ignore if trades table is empty or any column issue
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trade_screenshots');
    }
};
