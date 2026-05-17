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
        try {

            $this->command->info('--- SEEDER IS RUNNING ---');

            // Create/Get User
            $user = User::first() ?? User::factory()->create([
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

            $symptomTypes = [
                'Cramps',
                'Headache',
                'Bloating',
                'Fatigue',
                'Acne',
                'Mood Swings',
            ];

            /*

            |--------------------------------------------------------------------------
            | Generate realistic cycle starts
            |--------------------------------------------------------------------------
            */

            $cycleStarts = [];

            $start = Carbon::today()
                ->subMonths(6)
                ->startOfMonth();

            for ($i = 0; $i < 6; $i++) {
                $cycleLength = rand(26, 31);

                $cycleStarts[] = $start->copy();

                $start->addDays($cycleLength);
            }

            /*

            |--------------------------------------------------------------------------
            | Store cycles
            |--------------------------------------------------------------------------
            */

            foreach ($cycleStarts as $cycleStart) {
                
                
                $periodLength = rand(3, 7); 

                Cycle::create([
                    'user_id' => $user->id,
                    'start_date' => $cycleStart,
                    'period_length' => $periodLength 
                ]);
            }


            /*
            |--------------------------------------------------------------------------
            | Generate continuous daily BBT timeline
            |--------------------------------------------------------------------------
            */

            $timelineStart = $cycleStarts[0]->copy();

            $timelineEnd = Carbon::now();

            for (
                $date = $timelineStart->copy();
                $date->lte($timelineEnd);
                $date->addDay()
            ) {

                /*
                |--------------------------------------------------------------------------
                | Generate realistic BBT
                |--------------------------------------------------------------------------
                |
                | Follicular phase:
                | 36.1 - 36.4
                |
                | Luteal phase:
                | 36.5 - 37.0
                |
                */

                $temperature = rand(3610, 3700) / 100;

                BbtReading::create([
                    'user_id' => $user->id,
                    'date' => $date->copy(),
                    'temperature' => $temperature,
                ]);

                /*
                |--------------------------------------------------------------------------
                | Random symptoms
                |--------------------------------------------------------------------------
                */

                if (rand(0, 100) < 35) {

                    Symptom::create([
                        'user_id' => $user->id,
                        'date' => $date->copy(),
                        'type' => $symptomTypes[array_rand($symptomTypes)],
                        'level' => rand(1, 5),
                        'notes' => 'Auto-generated symptom',
                    ]);
                }
            }

            $this->command->info('--- SEEDING FINISHED ---');

        } catch (\Exception $e) {

            $this->command->error(
                'CRASHED: ' . $e->getMessage()
            );
        }
    }
}
