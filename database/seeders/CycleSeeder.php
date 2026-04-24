<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Cycle;
use App\Models\BbtReading;
use App\Models\Symptom;
use Carbon\Carbon;

class CycleSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Get or Create a test user
        $user = User::first() ?? User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        // 2. Define some possible symptoms to pick from
        $symptomTypes = ['Cramps', 'Headache', 'Bloating', 'Fatigue', 'Acne', 'Mood Swings'];

        // 3. Create 3 cycles (Current month, last month, 2 months ago)
        for ($i = 0; $i < 3; $i++) {
            $start = Carbon::now()->subMonths(3 - $i)->startOfMonth();
            $cycleLength = 28;

            $cycle = Cycle::create([
                'user_id'    => $user->id,
                'start_date' => $start,
                'end_date'   => $start->copy()->addDays($cycleLength - 1),
                'length'     => $cycleLength,
            ]);

            // 4. Loop through every day of the cycle
            for ($d = 0; $d < $cycleLength; $d++) {
                $currentDate = $start->copy()->addDays($d);

                // Add BBT Reading
                BbtReading::create([
                    'user_id'     => $user->id,
                    'cycle_id'    => $cycle->id,
                    'date'        => $currentDate,
                    'temperature' => rand(36200, 37200) / 1000, // Generates 36.xxx format for your (5,3) decimal
                    'unit'        => 'C',
                ]);

                // Add a random Symptom 50% of the time
                if (rand(0, 1)) {
                    Symptom::create([
                        'user_id'  => $user->id,
                        'cycle_id' => $cycle->id,
                        'date'     => $currentDate,
                        'type'     => $symptomTypes[array_rand($symptomTypes)],
                        'level'    => rand(1, 5),
                        'notes'    => 'Auto-generated test symptom',
                    ]);
                }
            }
        }
    }
}
