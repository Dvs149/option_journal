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
        Schema::create('zerodha_integrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('api_key')->nullable();
            $table->text('api_secret')->nullable();
            $table->text('access_token')->nullable();
            $table->string('request_token')->nullable();
            $table->string('public_token')->nullable();
            $table->string('broker_user_id', 50)->nullable();
            $table->string('user_name')->nullable();
            $table->string('user_shortname')->nullable();
            $table->string('email')->nullable();
            $table->string('user_type')->nullable()->default('individual');
            $table->string('broker', 50)->nullable()->default('ZERODHA');
            $table->string('avatar_url')->nullable();
            $table->boolean('is_connected')->default(false);
            $table->boolean('is_demo')->default(false);
            $table->timestamp('connected_at')->nullable();
            $table->timestamp('token_generated_at')->nullable();
            $table->timestamp('token_expires_at')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->unique('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('zerodha_integrations');
    }
};
