<?php

namespace Database\Seeders;

use App\Models\BbtReading;
use App\Models\Cycle;
use App\Models\Symptom;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class CycleSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('--- SEEDER IS RUNNING ---');

        $testUser1 = User::updateOrCreate(
            ['email' => 'test@example.com'],
            [
                'name' => 'Test User',
                'password' => 'password',
                'email_verified_at' => now(),
            ]
        );

        $testUser2 = User::updateOrCreate(
            ['email' => 'test2@example.com'],
            [
                'name' => 'Test User 2',
                'password' => 'password',
                'email_verified_at' => now(),
            ]
        );

        $testUser3 = User::updateOrCreate(
            ['email' => 'test3@example.com'],
            [
                'name' => 'Test User 3',
                'password' => 'password',
                'email_verified_at' => now(),
            ]
        );

        $testUsers = collect([
            $testUser1,
            $testUser2,
            $testUser3,
        ]);

        /*
        |--------------------------------------------------------------------------
        | Reset generated tracking data for test users
        |--------------------------------------------------------------------------
        |
        | User 3 should remain empty.
        |
        */

        Symptom::whereIn('user_id', $testUsers->pluck('id'))->delete();
        BbtReading::whereIn('user_id', $testUsers->pluck('id'))->delete();
        Cycle::whereIn('user_id', $testUsers->pluck('id'))->delete();

        /*
        |--------------------------------------------------------------------------
        | Seed User 1
        |--------------------------------------------------------------------------
        |
        | User 1 has clear biphasic BBT:
        | - lower follicular temperatures
        | - possible ovulation dip
        | - sustained luteal temperature rise after ovulation
        |
        */

        $user1Cycles = $this->generateCycleStarts(
            firstStartDate: Carbon::today()->subMonths(24)->startOfMonth(),
            cycleCount: 24,
            minLength: 27,
            maxLength: 31
        );

        $this->seedCyclesAndTrackingData(
            user: $testUser1,
            cycleStarts: $user1Cycles,
            bbtMode: 'clear_biphasic'
        );

        /*
        |--------------------------------------------------------------------------
        | Seed User 2
        |--------------------------------------------------------------------------
        |
        | User 2 has noisy/random BBT:
        | - less reliable pattern
        | - more missing readings
        | - no strong sustained post-ovulation rise
        |
        */

        $user2Cycles = $this->generateCycleStarts(
            firstStartDate: Carbon::today()->subMonths(24)->startOfMonth()->addDays(4),
            cycleCount: 24,
            minLength: 24,
            maxLength: 35
        );

        $this->seedCyclesAndTrackingData(
            user: $testUser2,
            cycleStarts: $user2Cycles,
            bbtMode: 'random_noisy'
        );

        /*
        |--------------------------------------------------------------------------
        | User 3 intentionally has no cycle, BBT, or symptom data.
        |--------------------------------------------------------------------------
        */

        $this->command->info('Seeded: test@example.com / password');
        $this->command->info('Seeded: test2@example.com / password');
        $this->command->info('Seeded empty account: test3@example.com / password');
        $this->command->info('--- SEEDING FINISHED ---');
    }

    private function generateCycleStarts(
        Carbon $firstStartDate,
        int $cycleCount,
        int $minLength,
        int $maxLength
    ): array {
        $cycleStarts = [];

        $start = $firstStartDate->copy();

        for ($i = 0; $i < $cycleCount; $i++) {
            $cycleStarts[] = $start->copy();

            $start->addDays(rand($minLength, $maxLength));
        }

        return $cycleStarts;
    }

    private function seedCyclesAndTrackingData(
        User $user,
        array $cycleStarts,
        string $bbtMode
    ): void {
        $symptomTypes = [
            'Cramps',
            'Headache',
            'Bloating',
            'Fatigue',
            'Acne',
            'Mood Swings',
            'Breast Tenderness',
            'Back Pain',
        ];

        /*
        |--------------------------------------------------------------------------
        | Create cycle rows
        |--------------------------------------------------------------------------
        */

        foreach ($cycleStarts as $cycleStart) {
            Cycle::create([
                'user_id' => $user->id,
                'created_by_user_id' => $user->id,
                'updated_by_user_id' => $user->id,
                'start_date' => $cycleStart->toDateString(),
                'period_length' => rand(3, 7),
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Generate daily BBT and symptoms
        |--------------------------------------------------------------------------
        */

        $timelineStart = $cycleStarts[0]->copy();
        $timelineEnd = Carbon::today();

        for (
            $date = $timelineStart->copy();
            $date->lte($timelineEnd);
            $date->addDay()
        ) {
            $cycleInfo = $this->findCycleInfoForDate($date, $cycleStarts);

            if (!$cycleInfo) {
                continue;
            }

            $cycleDay = $cycleInfo['cycle_day'];
            $cycleLength = $cycleInfo['cycle_length'];
            $ovulationDay = $cycleInfo['ovulation_day'];

            $temperature = $bbtMode === 'clear_biphasic'
                ? $this->generateClearBiphasicTemperature(
                    cycleDay: $cycleDay,
                    cycleLength: $cycleLength,
                    ovulationDay: $ovulationDay
                )
                : $this->generateRandomNoisyTemperature();

            /*
            |--------------------------------------------------------------------------
            | Missing data simulation
            |--------------------------------------------------------------------------
            |
            | User 1 has mostly complete BBT.
            | User 2 has more missing BBT data.
            |
            */

            $missingChance = $bbtMode === 'clear_biphasic'
                ? 6
                : 22;

            if (rand(1, 100) > $missingChance) {
                BbtReading::create([
                    'user_id' => $user->id,
                    'created_by_user_id' => $user->id,
                    'updated_by_user_id' => $user->id,
                    'date' => $date->toDateString(),
                    'temperature' => $temperature,
                ]);
            }

            /*
            |--------------------------------------------------------------------------
            | Symptoms
            |--------------------------------------------------------------------------
            |
            | More symptoms during period days, fewer symptoms outside period.
            |
            */

            $symptomChance = $cycleDay <= 5
                ? 45
                : rand(1, 100) <= 12;

            if (is_int($symptomChance)) {
                $shouldCreateSymptom = rand(1, 100) <= $symptomChance;
            } else {
                $shouldCreateSymptom = (bool) $symptomChance;
            }

            if ($shouldCreateSymptom) {
                Symptom::create([
                    'user_id' => $user->id,
                    'created_by_user_id' => $user->id,
                    'updated_by_user_id' => $user->id,
                    'date' => $date->toDateString(),
                    'type' => $symptomTypes[array_rand($symptomTypes)],
                    'level' => rand(1, 5),
                    'notes' => 'Auto-generated symptom',
                ]);
            }
        }
    }

    private function findCycleInfoForDate(Carbon $date, array $cycleStarts): ?array
    {
        foreach ($cycleStarts as $index => $cycleStart) {
            $nextCycleStart = $cycleStarts[$index + 1] ?? null;

            if ($nextCycleStart && $date->gte($cycleStart) && $date->lt($nextCycleStart)) {
                $cycleLength = $cycleStart->diffInDays($nextCycleStart);
                $cycleDay = $cycleStart->diffInDays($date) + 1;

                return [
                    'cycle_day' => $cycleDay,
                    'cycle_length' => $cycleLength,
                    'ovulation_day' => max(10, $cycleLength - 14),
                ];
            }

            /*
            |--------------------------------------------------------------------------
            | Last known cycle
            |--------------------------------------------------------------------------
            */

            if (!$nextCycleStart && $date->gte($cycleStart)) {
                $cycleLength = 28;
                $cycleDay = $cycleStart->diffInDays($date) + 1;

                if ($cycleDay > 40) {
                    return null;
                }

                return [
                    'cycle_day' => $cycleDay,
                    'cycle_length' => $cycleLength,
                    'ovulation_day' => 14,
                ];
            }
        }

        return null;
    }

    private function generateClearBiphasicTemperature(
        int $cycleDay,
        int $cycleLength,
        int $ovulationDay
    ): float {
        /*
        |--------------------------------------------------------------------------
        | Clear biphasic BBT pattern
        |--------------------------------------------------------------------------
        |
        | Follicular phase:
        |   around 36.20–36.40°C
        |
        | Ovulation dip:
        |   small dip around ovulation
        |
        | Luteal phase:
        |   sustained rise around 36.55–36.85°C
        |
        | Last 2 days before period:
        |   slight drop
        |
        */

        if ($cycleDay < $ovulationDay) {
            $base = 36.28;
            $noise = rand(-7, 7) / 100;

            return round($base + $noise, 2);
        }

        if (in_array($cycleDay, [$ovulationDay, $ovulationDay + 1], true)) {
            $base = 36.18;
            $noise = rand(-5, 5) / 100;

            return round($base + $noise, 2);
        }

        if ($cycleDay >= $cycleLength - 2) {
            $base = 36.42;
            $noise = rand(-6, 6) / 100;

            return round($base + $noise, 2);
        }

        $base = 36.68;
        $noise = rand(-8, 8) / 100;

        return round($base + $noise, 2);
    }

    private function generateRandomNoisyTemperature(): float
    {
        /*
        |--------------------------------------------------------------------------
        | Noisy/random BBT
        |--------------------------------------------------------------------------
        |
        | No clear phase-based sustained rise.
        |
        */

        $base = rand(3615, 3695) / 100;
        $noise = rand(-12, 12) / 100;

        return round($base + $noise, 2);
    }
}