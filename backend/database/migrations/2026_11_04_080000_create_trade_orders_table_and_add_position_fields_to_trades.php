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
        Schema::table('trades', function (Blueprint $table) {
            $table->string('status', 20)->default('CLOSED')->after('trading_type')->index();
            $table->integer('open_quantity')->default(0)->after('quantity');
            $table->decimal('avg_entry_price', 15, 2)->nullable()->after('entry_premium');
            $table->decimal('avg_exit_price', 15, 2)->nullable()->after('exit_premium');
            $table->date('exit_date')->nullable()->after('trade_date')->index();

            $table->index(['user_id', 'status']);
        });

        Schema::create('trade_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trade_id')->constrained('trades')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('order_type', 10); // BUY, SELL
            $table->integer('quantity');
            $table->integer('lots')->default(1);
            $table->decimal('price', 15, 2);
            $table->date('order_date')->index();
            $table->string('order_time', 20)->nullable();
            $table->decimal('brokerage', 15, 2)->default(0.00);
            $table->decimal('stt', 15, 2)->default(0.00);
            $table->decimal('exchange_charges', 15, 2)->default(0.00);
            $table->decimal('gst', 15, 2)->default(0.00);
            $table->decimal('sebi_charges', 15, 2)->default(0.00);
            $table->decimal('stamp_duty', 15, 2)->default(0.00);
            $table->decimal('other_charges', 15, 2)->default(0.00);
            $table->decimal('total_charges', 15, 2)->default(0.00);
            $table->decimal('realized_pnl', 15, 2)->default(0.00);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['trade_id', 'order_date']);
            $table->index(['user_id', 'order_date']);
            $table->index(['user_id', 'order_type']);
        });

        // Backfill existing trades so avg prices, exit dates, and orders exist
        $now = now();
        $trades = DB::table('trades')->get();
        foreach ($trades as $t) {
            DB::table('trades')->where('id', $t->id)->update([
                'status' => 'CLOSED',
                'open_quantity' => 0,
                'avg_entry_price' => $t->entry_premium,
                'avg_exit_price' => $t->exit_premium,
                'exit_date' => $t->trade_date,
            ]);

            $qty = $t->quantity ?? (($t->lots ?? 1) * 25);

            // BUY order
            if ($t->entry_premium !== null) {
                DB::table('trade_orders')->insert([
                    'trade_id' => $t->id,
                    'user_id' => $t->user_id,
                    'order_type' => 'BUY',
                    'quantity' => $qty,
                    'lots' => $t->lots ?? 1,
                    'price' => $t->entry_premium,
                    'order_date' => $t->trade_date,
                    'order_time' => '09:15',
                    'brokerage' => round(($t->brokerage ?? 0) / 2, 2),
                    'stt' => 0.00,
                    'exchange_charges' => round(($t->exchange_charges ?? 0) / 2, 2),
                    'gst' => round(($t->gst ?? 0) / 2, 2),
                    'sebi_charges' => round(($t->sebi_charges ?? 0) / 2, 2),
                    'stamp_duty' => $t->stamp_duty ?? 0.00,
                    'other_charges' => 0.00,
                    'total_charges' => round(($t->stamp_duty ?? 0) + (($t->brokerage ?? 0) / 2) + (($t->exchange_charges ?? 0) / 2) + (($t->gst ?? 0) / 2) + (($t->sebi_charges ?? 0) / 2), 2),
                    'realized_pnl' => 0.00,
                    'notes' => $t->entry_reason ?? null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            // SELL order
            if ($t->exit_premium !== null) {
                DB::table('trade_orders')->insert([
                    'trade_id' => $t->id,
                    'user_id' => $t->user_id,
                    'order_type' => 'SELL',
                    'quantity' => $qty,
                    'lots' => $t->lots ?? 1,
                    'price' => $t->exit_premium,
                    'order_date' => $t->trade_date,
                    'order_time' => '15:20',
                    'brokerage' => round(($t->brokerage ?? 0) / 2, 2),
                    'stt' => $t->stt ?? 0.00,
                    'exchange_charges' => round(($t->exchange_charges ?? 0) / 2, 2),
                    'gst' => round(($t->gst ?? 0) / 2, 2),
                    'sebi_charges' => round(($t->sebi_charges ?? 0) / 2, 2),
                    'stamp_duty' => 0.00,
                    'other_charges' => $t->other_charges ?? 0.00,
                    'total_charges' => round(($t->stt ?? 0) + ($t->other_charges ?? 0) + (($t->brokerage ?? 0) / 2) + (($t->exchange_charges ?? 0) / 2) + (($t->gst ?? 0) / 2) + (($t->sebi_charges ?? 0) / 2), 2),
                    'realized_pnl' => $t->net_pnl ?? 0.00,
                    'notes' => $t->exit_reason ?? null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('trade_orders');

        Schema::table('trades', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'status']);
            $table->dropIndex(['status']);
            $table->dropIndex(['exit_date']);

            $table->dropColumn([
                'status',
                'open_quantity',
                'avg_entry_price',
                'avg_exit_price',
                'exit_date',
            ]);
        });
    }
};
