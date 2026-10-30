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
        Schema::create('user_module_visibilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('module_key', 50)->index();
            $table->boolean('is_visible')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'module_key']);
            $table->index(['user_id', 'is_visible']);
        });

        // Seed default module visibility for all existing users
        try {
            $users = DB::table('users')->pluck('id');
            $modules = [
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

            foreach ($users as $userId) {
                foreach ($modules as $mod) {
                    DB::table('user_module_visibilities')->insertOrIgnore([
                        'user_id' => $userId,
                        'module_key' => $mod['module_key'],
                        'is_visible' => true,
                        'sort_order' => $mod['sort_order'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        } catch (\Throwable $e) {
            // Ignore if users table empty
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_module_visibilities');
    }
};
