<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trades', function (Blueprint $table) {
            $table->decimal('ce_entry_price', 15, 2)->nullable()->after('expiry_date');
            $table->decimal('pe_entry_price', 15, 2)->nullable()->after('ce_entry_price');
            $table->decimal('ce_exit_price', 15, 2)->nullable()->after('entry_premium');
            $table->decimal('pe_exit_price', 15, 2)->nullable()->after('ce_exit_price');
        });
    }

    public function down(): void
    {
        Schema::table('trades', function (Blueprint $table) {
            $table->dropColumn([
                'ce_entry_price',
                'pe_entry_price',
                'ce_exit_price',
                'pe_exit_price',
            ]);
        });
    }
};
