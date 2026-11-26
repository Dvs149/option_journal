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
        Schema::table('stories', function (Blueprint $table) {
            $table->string('series_name', 255)->nullable()->after('category')->index();
            $table->unsignedInteger('part_number')->nullable()->after('series_name')->index();
            $table->string('part_title', 255)->nullable()->after('part_number');

            $table->index(['user_id', 'series_name']);
            $table->index(['user_id', 'series_name', 'part_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stories', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'series_name', 'part_number']);
            $table->dropIndex(['user_id', 'series_name']);
            $table->dropColumn(['series_name', 'part_number', 'part_title']);
        });
    }
};
