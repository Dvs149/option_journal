<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trading_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('account_name')->default('Primary Account');
            $table->string('broker_name')->nullable()->default('Zerodha');
            $table->decimal('initial_capital', 15, 2)->default(500000.00);
            $table->decimal('daily_profit_target', 15, 2)->default(20000.00);
            $table->decimal('daily_max_loss', 15, 2)->default(25000.00);
            $table->decimal('monthly_profit_target', 15, 2)->default(150000.00);
            $table->decimal('monthly_max_loss', 15, 2)->default(100000.00);
            $table->boolean('is_default')->default(true);
            $table->timestamps();

            $table->index(['user_id', 'is_default']);
        });

        Schema::create('trading_strategies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('strategy_name');
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'strategy_name']);
        });

        Schema::create('trades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('trading_account_id')->constrained('trading_accounts')->cascadeOnDelete();
            $table->date('trade_date')->index();
            $table->string('index_name', 50)->index(); // NIFTY, BANKNIFTY, SENSEX, BANKEX, STOCKS
            $table->string('trading_type', 30)->index(); // Intraday, BTST, Overnight
            $table->string('strategy_name', 100)->index();
            $table->string('option_type', 20)->index(); // CE, PE, Both
            $table->decimal('strike_price', 15, 2)->nullable();
            $table->date('expiry_date')->nullable();
            $table->decimal('entry_premium', 15, 2)->nullable();
            $table->decimal('exit_premium', 15, 2)->nullable();
            $table->integer('quantity')->nullable();
            $table->integer('lots')->nullable()->default(1);
            $table->decimal('gross_profit', 15, 2)->default(0.00);
            $table->decimal('gross_loss', 15, 2)->default(0.00);
            $table->decimal('brokerage', 15, 2)->default(0.00);
            $table->decimal('stt', 15, 2)->default(0.00);
            $table->decimal('exchange_charges', 15, 2)->default(0.00);
            $table->decimal('gst', 15, 2)->default(0.00);
            $table->decimal('sebi_charges', 15, 2)->default(0.00);
            $table->decimal('stamp_duty', 15, 2)->default(0.00);
            $table->decimal('other_charges', 15, 2)->default(0.00);
            $table->decimal('total_charges', 15, 2)->default(0.00);
            $table->decimal('net_pnl', 15, 2)->default(0.00)->index();
            $table->text('entry_reason')->nullable();
            $table->text('exit_reason')->nullable();
            $table->text('notes')->nullable();
            $table->string('screenshot_path')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'trade_date']);
            $table->index(['user_id', 'index_name']);
            $table->index(['user_id', 'strategy_name']);
            $table->index(['user_id', 'net_pnl']);
        });

        Schema::create('trade_journals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('trade_id')->constrained('trades')->cascadeOnDelete();
            $table->text('market_conditions')->nullable();
            $table->text('trade_setup')->nullable();
            $table->text('what_went_right')->nullable();
            $table->text('what_went_wrong')->nullable();
            $table->text('mistakes_made')->nullable();
            $table->text('lessons_learned')->nullable();
            $table->text('personal_notes')->nullable();
            $table->timestamps();
        });

        Schema::create('capital_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('trading_account_id')->constrained('trading_accounts')->cascadeOnDelete();
            $table->string('transaction_type', 20); // deposit, withdrawal
            $table->decimal('amount', 15, 2);
            $table->date('transaction_date')->index();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'transaction_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('capital_transactions');
        Schema::dropIfExists('trade_journals');
        Schema::dropIfExists('trades');
        Schema::dropIfExists('trading_strategies');
        Schema::dropIfExists('trading_accounts');
    }
};
