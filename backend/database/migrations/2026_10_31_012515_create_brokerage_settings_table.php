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
        Schema::create('brokerage_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('broker_name', 50)->default('Zerodha');
            $table->decimal('brokerage_per_order', 10, 2)->default(20.00); // Flat ₹20 per executed order
            $table->decimal('stt_rate_percent', 10, 5)->default(0.15000);   // 0.15% on sell side premium
            $table->decimal('nse_txn_rate_percent', 10, 5)->default(0.03553); // NSE: 0.03553% on premium
            $table->decimal('bse_txn_rate_percent', 10, 5)->default(0.03250); // BSE: 0.0325% on premium
            $table->decimal('gst_rate_percent', 10, 2)->default(18.00);     // 18% on (brokerage + SEBI + txn)
            $table->decimal('sebi_per_crore', 10, 2)->default(10.00);        // ₹10 per crore (plus GST)
            $table->decimal('stamp_duty_rate_percent', 10, 5)->default(0.00300); // 0.003% on buy side
            $table->string('default_exchange', 10)->default('NSE');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('brokerage_settings');
    }
};
