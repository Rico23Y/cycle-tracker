<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;

class InsightService
{
    public function buildInsights(Collection $cycles): array
    {
        $sorted = $cycles
            ->sortBy('start_date')
            ->values();

        return [
            'ranges' => [
                $this->buildRangeInsight(
                    label: 'Entire history',
                    cycles: $sorted,
                    months: null
                ),
                $this->buildRangeInsight(
                    label: 'Last 1 year',
                    cycles: $sorted,
                    months: 12
                ),
                $this->buildRangeInsight(
                    label: 'Last 6 months',
                    cycles: $sorted,
                    months: 6
                ),
                $this->buildRangeInsight(
                    label: 'Last 3 months',
                    cycles: $sorted,
                    months: 3
                ),
            ],
        ];
    }

    private function buildRangeInsight(
        string $label,
        Collection $cycles,
        ?int $months
    ): array {
        $fromDate = $months !== null
            ? now()->startOfDay()->subMonths($months)
            : null;

        /*
        |--------------------------------------------------------------------------
        | Cycle Lengths
        |--------------------------------------------------------------------------
        | Use actual cycle intervals only.
        | Example: Feb 23 → Mar 21 = 26 days.
        |--------------------------------------------------------------------------
        */

        $cycleIntervals = $this->calculateCycleIntervals($cycles);

        if ($fromDate !== null) {
            $cycleIntervals = $cycleIntervals
                ->filter(function ($interval) use ($fromDate) {
                    return Carbon::parse($interval['end_date'])
                        ->greaterThanOrEqualTo($fromDate);
                })
                ->values();
        }

        $cycleLengths = $cycleIntervals
            ->pluck('length')
            ->values();

        /*
        |--------------------------------------------------------------------------
        | Period Lengths
        |--------------------------------------------------------------------------
        | Use actual logged period_length only.
        |--------------------------------------------------------------------------
        */

        $periodCycles = $cycles;

        if ($fromDate !== null) {
            $periodCycles = $periodCycles
                ->filter(function ($cycle) use ($fromDate) {
                    return Carbon::parse($cycle->start_date)
                        ->greaterThanOrEqualTo($fromDate);
                })
                ->values();
        }

        $periodLengths = $periodCycles
            ->pluck('period_length')
            ->filter(fn ($length) => $length !== null)
            ->map(fn ($length) => (int) $length)
            ->values();

        $averageCycleLength = $cycleLengths->count() > 0
            ? round($cycleLengths->average(), 1)
            : null;

        $shortestCycle = $cycleLengths->count() > 0
            ? $cycleLengths->min()
            : null;

        $longestCycle = $cycleLengths->count() > 0
            ? $cycleLengths->max()
            : null;

        $cycleVariation = $this->calculateVariation(
            $shortestCycle,
            $longestCycle
        );

        $averagePeriodLength = $periodLengths->count() > 0
            ? round($periodLengths->average(), 1)
            : null;

        $shortestPeriod = $periodLengths->count() > 0
            ? $periodLengths->min()
            : null;

        $longestPeriod = $periodLengths->count() > 0
            ? $periodLengths->max()
            : null;

        $periodVariation = $this->calculateVariation(
            $shortestPeriod,
            $longestPeriod
        );

        return [
            'label' => $label,

            // completed actual cycle intervals
            'cycle_count' => $cycleIntervals->count(),

            'average_cycle_length' => $averageCycleLength,
            'shortest_cycle' => $shortestCycle,
            'longest_cycle' => $longestCycle,
            'cycle_variation' => $cycleVariation,

            'average_period_length' => $averagePeriodLength,
            'shortest_period' => $shortestPeriod,
            'longest_period' => $longestPeriod,
            'period_variation' => $periodVariation,

            'recommendation' => $this->buildRecommendation(
                cycleCount: $cycleIntervals->count(),
                averageCycleLength: $averageCycleLength,
                cycleVariation: $cycleVariation,
                averagePeriodLength: $averagePeriodLength,
                periodVariation: $periodVariation
            ),
        ];
    }

    private function calculateCycleIntervals(Collection $cycles): Collection
    {
        if ($cycles->count() < 2) {
            return collect();
        }

        $sorted = $cycles
            ->sortBy('start_date')
            ->values();

        $intervals = collect();

        for ($i = 1; $i < $sorted->count(); $i++) {
            $previous = Carbon::parse(
                $sorted[$i - 1]->start_date
            );

            $current = Carbon::parse(
                $sorted[$i]->start_date
            );

            $intervals->push([
                'start_date' => $previous->toDateString(),
                'end_date' => $current->toDateString(),
                'length' => $previous->diffInDays($current),
            ]);
        }

        return $intervals;
    }

    private function calculateVariation(
        ?float $shortest,
        ?float $longest
    ): ?float {
        if ($shortest === null || $longest === null) {
            return null;
        }

        return round($longest - $shortest, 1);
    }

    private function buildRecommendation(
        int $cycleCount,
        ?float $averageCycleLength,
        ?float $cycleVariation,
        ?float $averagePeriodLength,
        ?float $periodVariation
    ): string {
        if ($cycleCount < 2) {
            return 'Add more cycle records to generate useful insights.';
        }

        if ($cycleCount < 4) {
            return 'Insights are available, but predictions may improve after more logged cycles.';
        }

        if (
            $averageCycleLength !== null &&
            ($averageCycleLength < 21 || $averageCycleLength > 35)
        ) {
            return 'Average cycle length is outside the common 21–35 day range. Consider monitoring this pattern.';
        }

        if (
            $cycleVariation !== null &&
            $cycleVariation >= 8
        ) {
            return 'Cycle length varies noticeably. Recent-cycle averages may be more useful than entire-history averages.';
        }

        if (
            $averagePeriodLength !== null &&
            ($averagePeriodLength < 2 || $averagePeriodLength > 8)
        ) {
            return 'Average period length is outside the common 2–8 day range. Consider checking if this pattern continues.';
        }

        if (
            $periodVariation !== null &&
            $periodVariation >= 4
        ) {
            return 'Period length varies. Continue logging end dates to improve future predictions.';
        }

        return 'Cycle and period patterns look consistent based on the available records.';
    }
}