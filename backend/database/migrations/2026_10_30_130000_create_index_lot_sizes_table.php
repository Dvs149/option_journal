<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('index_lot_sizes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('index_name', 50)->index();
            $table->integer('lot_size')->default(50);
            $table->string('exchange', 20)->default('NSE');
            $table->string('display_name', 100)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'index_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('index_lot_sizes');
    }
};
