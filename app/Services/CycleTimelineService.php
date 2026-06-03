<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;

class CycleTimelineService
{
    public function __construct(
        protected CyclePredictionService $predictionService
    ) {}

    public function buildTimelines(
        Collection $cycles,
        Collection $symptoms
    ): array {
        if ($cycles->count() < 2) {
            return [];
        }

        $sorted = $cycles->sortBy('start_date')->values();

        $timelines = [];

        /*
        |--------------------------------------------------------------------------
        | Build previous actual cycle ranges
        |--------------------------------------------------------------------------
        | Example:
        | Feb 23 to Mar 20
        | because Mar 21 is the next Day One.
        |--------------------------------------------------------------------------
        */

        for ($i = 0; $i < $sorted->count() - 1; $i++) {
            $currentCycle = $sorted[$i];
            $nextCycle = $sorted[$i + 1];

            $cycleStart = Carbon::parse($currentCycle->start_date);
            $nextCycleStart = Carbon::parse($nextCycle->start_date);

            $cycleEnd = $nextCycleStart->copy()->subDay();

            $cycleLength = $cycleStart->diffInDays($nextCycleStart);

            $timeline = $this->buildSingleTimeline(
                cycle: $currentCycle,
                cycleStart: $cycleStart,
                cycleEnd: $cycleEnd,
                cycleLength: $cycleLength,
                symptoms: $symptoms,
                isPredicted: false
            );

            $timelines[] = $timeline;
        }

        /*
        |--------------------------------------------------------------------------
        | Build latest actual-to-predicted cycle range
        |--------------------------------------------------------------------------
        | Example:
        | Mar 21 to Apr 17
        | because Apr 18 is predicted Day One.
        |--------------------------------------------------------------------------
        */

        $latestCycle = $sorted->last();

        $latestStart = Carbon::parse($latestCycle->start_date);

        $prediction = $this->predictionService
            ->buildPredictionFromCycle(
                $sorted,
                $latestStart
            );

        if ($prediction) {
            $predictedNextStart = $prediction['predicted_period_start'];

            $cycleEnd = $predictedNextStart->copy()->subDay();

            $cycleLength = $latestStart->diffInDays($predictedNextStart);

            $timeline = $this->buildSingleTimeline(
                cycle: $latestCycle,
                cycleStart: $latestStart,
                cycleEnd: $cycleEnd,
                cycleLength: $cycleLength,
                symptoms: $symptoms,
                isPredicted: true,
                predictedNextPeriod: $predictedNextStart
            );

            $timelines[] = $timeline;
        }

        return $timelines;
    }

    private function buildSingleTimeline(
        mixed $cycle,
        Carbon $cycleStart,
        Carbon $cycleEnd,
        int $cycleLength,
        Collection $symptoms,
        bool $isPredicted,
        ?Carbon $predictedNextPeriod = null
    ): array {
        $today = now()->startOfDay();

        $currentCycleDay = null;

        if ($today->betweenIncluded($cycleStart, $cycleEnd)) {
            $currentCycleDay = $cycleStart->diffInDays($today) + 1;
        }

        $periodLength = $cycle->period_length ?? 5;

        $ovulationDay = max(1, $cycleLength - 14);

        $ovulationDate = $cycleStart
            ->copy()
            ->addDays($ovulationDay - 1);

        $pregnancyTestDate = ($predictedNextPeriod ?? $cycleEnd->copy()->addDay())
            ->copy()
            ->addDays(1);

        $mensesEndDay = min($periodLength, $cycleLength);

        $follicularStartDay = min($cycleLength, $mensesEndDay + 1);

        $follicularEndDay = max(
            $follicularStartDay,
            $ovulationDay - 1
        );

        $lutealStartDay = min($cycleLength, $ovulationDay + 1);

        $lutealEndDay = $cycleLength;

        $rangeSymptoms = $symptoms
            ->filter(function ($symptom) use ($cycleStart, $cycleEnd) {
                $date = Carbon::parse($symptom->date);

                return $date->betweenIncluded($cycleStart, $cycleEnd);
            })
            ->values()
            ->map(function ($symptom) use ($cycleStart) {
                $date = Carbon::parse($symptom->date);

                return [
                    'id' => $symptom->id,
                    'date' => $date->toDateString(),
                    'cycle_day' => $cycleStart->diffInDays($date) + 1,
                    'type' => $symptom->type,
                    'level' => $symptom->level,
                    'notes' => $symptom->notes,
                ];
            });

        return [
            'id' => $cycle->id . '-' . $cycleStart->toDateString(),
            'cycle_id' => $cycle->id,

            'label' =>
                $cycleStart->format('M d, Y') .
                ' - ' .
                $cycleEnd->format('M d, Y') .
                ($isPredicted ? ' (Predicted)' : ''),

            'is_predicted' => $isPredicted,

            'cycle_start_date' => $cycleStart->toDateString(),
            'cycle_end_date' => $cycleEnd->toDateString(),

            'next_period_date' => $predictedNextPeriod
                ? $predictedNextPeriod->toDateString()
                : $cycleEnd->copy()->addDay()->toDateString(),

            'cycle_length' => $cycleLength,

            'current_cycle_day' => $currentCycleDay,

            'ovulation_date' => $ovulationDate->toDateString(),
            'ovulation_day' => $ovulationDay,

            'pregnancy_test_date' => $pregnancyTestDate->toDateString(),

            'phases' => [
                [
                    'name' => 'Menses',
                    'start_day' => 1,
                    'end_day' => $mensesEndDay,
                    'color' => 'red',
                ],
                [
                    'name' => 'Follicular',
                    'start_day' => $follicularStartDay,
                    'end_day' => $follicularEndDay,
                    'color' => 'green',
                ],
                [
                    'name' => 'Ovulation',
                    'start_day' => $ovulationDay,
                    'end_day' => $ovulationDay,
                    'color' => 'blue',
                ],
                [
                    'name' => 'Luteal',
                    'start_day' => $lutealStartDay,
                    'end_day' => $lutealEndDay,
                    'color' => 'yellow',
                ],
            ],

            'hormone_estimates' => $this->buildHormoneEstimates(
                $cycleLength,
                $ovulationDay
            ),

            'symptoms' => $rangeSymptoms,
        ];
    }

    private function buildHormoneEstimates(
        int $cycleLength,
        int $ovulationDay
    ): array {
        $days = [];

        for ($day = 1; $day <= $cycleLength; $day++) {
            $estrogen = 20;
            $lh = 5;
            $fsh = 15;
            $progesterone = 5;

            /*
            |--------------------------------------------------------------------------
            | FSH
            |--------------------------------------------------------------------------
            */

            $fsh = 14;

            // Early follicular modest level, slowly decreasing
            if ($day <= 5) {
                $fsh = 30 - ($day * 2);
            }

            // Smaller ovulatory bump, narrower than LH
            $distanceFromOvulation = abs($day - $ovulationDay);

            if ($distanceFromOvulation === 0) {
                $fsh = max($fsh, 34);
            } elseif ($distanceFromOvulation === 1) {
                $fsh = max($fsh, 26);
            } elseif ($distanceFromOvulation === 2) {
                $fsh = max($fsh, 18);
            }

            /*
            |--------------------------------------------------------------------------
            | Estrogen
            |--------------------------------------------------------------------------
            | Main rise before ovulation, small second rise in luteal phase.
            |--------------------------------------------------------------------------
            */

            if ($day < $ovulationDay) {
                $distance = abs($ovulationDay - $day);

                $estrogen = max(
                    20,
                    90 - ($distance * 8)
                );
            }

            if ($day > $ovulationDay + 3) {
                $daysAfterOvulation = $day - $ovulationDay;

                $lutealEstrogen = max(
                    20,
                    60 - abs($daysAfterOvulation - 7) * 6
                );

                $estrogen = max($estrogen, $lutealEstrogen);
            }

            /*
            |--------------------------------------------------------------------------
            | LH
            |--------------------------------------------------------------------------
            | Sharp peak around ovulation.
            |--------------------------------------------------------------------------
            */

            if ($day === $ovulationDay) {
                $lh = 100;
            } elseif (abs($day - $ovulationDay) === 1) {
                $lh = 45;
            } elseif (abs($day - $ovulationDay) === 2) {
                $lh = 15;
            }

            /*
            |--------------------------------------------------------------------------
            | Progesterone
            |--------------------------------------------------------------------------
            | Rises after ovulation and peaks mid-luteal.
            |--------------------------------------------------------------------------
            */

            if ($day > $ovulationDay) {
                $daysAfterOvulation = $day - $ovulationDay;

                if ($daysAfterOvulation <= 7) {
                    $progesterone = min(
                        85,
                        10 + ($daysAfterOvulation * 11)
                    );
                } else {
                    $progesterone = max(
                        25,
                        85 - (($daysAfterOvulation - 7) * 8)
                    );
                }
            }

            $days[] = [
                'day' => $day,
                'estrogen' => round($estrogen),
                'lh' => round($lh),
                'fsh' => round($fsh),
                'progesterone' => round($progesterone),
            ];
        }

        return $days;
    }
}