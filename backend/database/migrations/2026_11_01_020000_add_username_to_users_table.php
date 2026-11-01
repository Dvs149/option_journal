<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 50)->nullable()->unique()->after('name');
        });

        // Backfill existing users with a username derived from their name or email prefix
        $users = DB::table('users')->whereNull('username')->get();
        foreach ($users as $user) {
            $baseUsername = Str::slug($user->name ?: explode('@', $user->email)[0], '');
            if (empty($baseUsername)) {
                $baseUsername = 'user';
            }
            
            $candidate = $baseUsername;
            $counter = 1;
            while (DB::table('users')->where('username', $candidate)->where('id', '!=', $user->id)->exists()) {
                $candidate = $baseUsername . $counter;
                $counter++;
            }

            DB::table('users')->where('id', $user->id)->update([
                'username' => strtolower($candidate),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('username');
        });
    }
};
