<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;

class BbtTimelineService
{
    public function __construct(
        protected CyclePredictionService $predictionService,
        protected BbtOvulationAnalysisService $bbtOvulationAnalysisService
    ) {}

    public function buildTimelines(
        Collection $cycles,
        Collection $bbtReadings
    ): array {
        if ($cycles->count() < 2) {
            return [];
        }

        $sorted = $cycles->sortBy('start_date')->values();

        $timelines = [];

        /*
        |--------------------------------------------------------------------------
        | Previous actual cycle ranges
        |--------------------------------------------------------------------------
        */

        for ($i = 0; $i < $sorted->count() - 1; $i++) {
            $currentCycle = $sorted[$i];
            $nextCycle = $sorted[$i + 1];

            $cycleStart = Carbon::parse($currentCycle->start_date);
            $nextCycleStart = Carbon::parse($nextCycle->start_date);
            $cycleEnd = $nextCycleStart->copy()->subDay();

            $timelines[] = $this->buildSingleTimeline(
                cycleId: $currentCycle->id,
                cycleStart: $cycleStart,
                cycleEnd: $cycleEnd,
                nextPeriodDate: $nextCycleStart,
                bbtReadings: $bbtReadings,
                isPredicted: false
            );
        }

        /*
        |--------------------------------------------------------------------------
        | Latest actual-to-predicted cycle range
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

            /*
            |--------------------------------------------------------------------------
            | Latest actual-to-predicted range
            |--------------------------------------------------------------------------
            */

            $timelines[] = $this->buildSingleTimeline(
                cycleId: $latestCycle->id,
                cycleStart: $latestStart,
                cycleEnd: $predictedNextStart->copy()->subDay(),
                nextPeriodDate: $predictedNextStart,
                bbtReadings: $bbtReadings,
                isPredicted: true
            );

            /*
            |--------------------------------------------------------------------------
            | Extra BBT range after predicted Day One
            |--------------------------------------------------------------------------
            */

            $latestBbtDate = $bbtReadings
                ->map(fn ($reading) => Carbon::parse($reading->date))
                ->filter(fn ($date) => $date->gte($predictedNextStart))
                ->sort()
                ->last();

            if ($latestBbtDate) {
                $timelines[] = $this->buildSingleTimeline(
                    cycleId: $latestCycle->id,
                    cycleStart: $predictedNextStart->copy(),
                    cycleEnd: $latestBbtDate->copy(),
                    nextPeriodDate: $latestBbtDate->copy()->addDay(),
                    bbtReadings: $bbtReadings,
                    isPredicted: true,
                    labelSuffix: 'BBT after predicted Day One'
                );
            }
        }

        return $timelines;
    }

    private function buildSingleTimeline(
        int $cycleId,
        Carbon $cycleStart,
        Carbon $cycleEnd,
        Carbon $nextPeriodDate,
        Collection $bbtReadings,
        bool $isPredicted,
        ?string $labelSuffix = null
    ): array {
        $cycleLength = $cycleStart->diffInDays($nextPeriodDate);

        /*
        |--------------------------------------------------------------------------
        | Calendar-based ovulation estimate
        |--------------------------------------------------------------------------
        |
        | This is the existing calendar/prediction approximation:
        | ovulation is about 14 days before the next period.
        |
        */

        $calendarOvulationDay = max(1, $cycleLength - 14);

        $readingsByDate = $bbtReadings
            ->filter(function ($reading) use ($cycleStart, $cycleEnd) {
                $date = Carbon::parse($reading->date);

                return $date->betweenIncluded($cycleStart, $cycleEnd);
            })
            ->keyBy(function ($reading) {
                return Carbon::parse($reading->date)->toDateString();
            });

        $readings = collect();

        for (
            $date = $cycleStart->copy();
            $date->lte($cycleEnd);
            $date->addDay()
        ) {
            $key = $date->toDateString();

            $reading = $readingsByDate->get($key);

            $readings->push([
                'id' => $reading?->id,
                'date' => $key,
                'cycle_day' => $cycleStart->diffInDays($date) + 1,
                'temperature' => $reading
                    ? (float) $reading->temperature
                    : null,
            ]);
        }

        $analysis = $this->bbtOvulationAnalysisService->analyze(
            readings: $readings,
            calendarOvulationDay: $calendarOvulationDay
        );

        return [
            'id' => $cycleId . '-' . $cycleStart->toDateString(),
            'cycle_id' => $cycleId,

            'label' =>
                $cycleStart->format('M d, Y') .
                ' - ' .
                $cycleEnd->format('M d, Y') .
                ($labelSuffix
                    ? ' (' . $labelSuffix . ')'
                    : ($isPredicted ? ' (Predicted)' : '')
                ),

            'is_predicted' => $isPredicted,

            'cycle_start_date' => $cycleStart->toDateString(),
            'cycle_end_date' => $cycleEnd->toDateString(),
            'next_period_date' => $nextPeriodDate->toDateString(),

            'cycle_length' => $cycleLength,
            'calendar_ovulation_day' => $calendarOvulationDay,

            'readings' => $readings,
            'analysis' => $analysis,
        ];
    }
}