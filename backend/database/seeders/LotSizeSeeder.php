<?php

namespace Database\Seeders;

use App\Models\IndexLotSize;
use App\Models\User;
use Illuminate\Database\Seeder;

class LotSizeSeeder extends Seeder
{
    public function run(): void
    {
        $users = User::all();
        foreach ($users as $user) {
            IndexLotSize::seedDefaultsForUser($user->id);
            $this->command->info("Seeded latest F&O lot sizes for user: {$user->email}");
        }
    }
}
