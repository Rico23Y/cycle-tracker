<?php

namespace App\Services;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class InsightService
{
    public function __construct(
        protected BbtTimelineService $bbtTimelineService
    ) {}

    public function buildInsights(
        Collection $cycles,
        Collection $bbtReadings,
        Collection $symptoms,
        array $permissions = []
    ): array {
        $permissions = array_merge([
            'can_view_cycles' => true,
            'can_view_bbt' => true,
            'can_view_symptoms' => true,
            'can_view_predictions' => true,
            'can_view_insights' => true,
        ], $permissions);

        $sortedCycles = $cycles
            ->sortBy('start_date')
            ->values();

        $cycleIntervals = $this->calculateCycleIntervals($sortedCycles);

        $ranges = $this->buildRanges(
            cycles: $sortedCycles,
            cycleIntervals: $cycleIntervals,
            bbtReadings: $bbtReadings,
            symptoms: $symptoms,
            permissions: $permissions
        );

        $defaultRangeKey = $this->defaultRangeKey($ranges);

        $defaultRange = collect($ranges)
            ->firstWhere('key', $defaultRangeKey);

        return [
            'default_range_key' => $defaultRangeKey,
            'ranges' => $ranges,
            'regularity' => $this->buildRegularity($defaultRange),
            'recommendations' => $this->buildRecommendations($defaultRange),
        ];
    }

    private function buildRanges(
        Collection $cycles,
        Collection $cycleIntervals,
        Collection $bbtReadings,
        Collection $symptoms,
        array $permissions
    ): array {
        $rangeDefinitions = [
            [
                'key' => 'current_cycle',
                'label' => 'Current cycle',
                'type' => 'current_cycle',
                'cycle_limit' => null,
            ],
            [
                'key' => 'last_3_cycles',
                'label' => 'Last 3 cycles',
                'type' => 'cycle_limit',
                'cycle_limit' => 3,
            ],
            [
                'key' => 'last_6_cycles',
                'label' => 'Last 6 cycles',
                'type' => 'cycle_limit',
                'cycle_limit' => 6,
            ],
            [
                'key' => 'last_12_cycles',
                'label' => 'Last 12 cycles',
                'type' => 'cycle_limit',
                'cycle_limit' => 12,
            ],
            [
                'key' => 'entire_history',
                'label' => 'Entire history',
                'type' => 'entire_history',
                'cycle_limit' => null,
            ],
        ];

        return collect($rangeDefinitions)
            ->map(function ($definition) use (
                $cycles,
                $cycleIntervals,
                $bbtReadings,
                $symptoms,
                $permissions
            ) {
                $rangeData = $this->resolveRangeData(
                    definition: $definition,
                    cycles: $cycles,
                    cycleIntervals: $cycleIntervals
                );

                return [
                    'key' => $definition['key'],
                    'label' => $definition['label'],
                    'is_selectable' => $rangeData['is_selectable'],
                    'cycle_count' => $rangeData['cycle_intervals']->count(),

                    'cycle' => $this->buildCycleStats(
                        $rangeData['cycle_intervals']
                    ),

                    'bbt' => $permissions['can_view_bbt']
                        ? $this->buildBbtStats(
                            bbtReadings: $bbtReadings,
                            startDate: $rangeData['start_date'],
                            endDate: $rangeData['end_date'],
                            includeEndDate: $rangeData['include_end_date']
                        )
                        : $this->lockedStats('BBT data is locked.'),

                    'symptoms' => $permissions['can_view_symptoms']
                        ? $this->buildSymptomStats(
                            symptoms: $symptoms,
                            startDate: $rangeData['start_date'],
                            endDate: $rangeData['end_date'],
                            includeEndDate: $rangeData['include_end_date']
                        )
                        : $this->lockedStats('Symptom data is locked.'),

                    'ovulation_correlation' => (
                        $permissions['can_view_bbt'] &&
                        $permissions['can_view_predictions']
                    )
                        ? $this->buildOvulationCorrelation(
                            cycles: $cycles,
                            bbtReadings: $bbtReadings,
                            startDate: $rangeData['start_date'],
                            endDate: $rangeData['end_date'],
                            includeEndDate: $rangeData['include_end_date']
                        )
                        : $this->lockedStats('Ovulation correlation requires BBT and prediction access.'),
                ];
            })
            ->values()
            ->all();
    }

    private function resolveRangeData(
        array $definition,
        Collection $cycles,
        Collection $cycleIntervals
    ): array {
        if ($definition['type'] === 'current_cycle') {
            $latestCycle = $cycles->last();

            if (!$latestCycle) {
                return [
                    'is_selectable' => false,
                    'cycle_intervals' => collect(),
                    'start_date' => null,
                    'end_date' => null,
                    'include_end_date' => true,
                ];
            }

            return [
                'is_selectable' => true,
                'cycle_intervals' => collect(),
                'start_date' => Carbon::parse($latestCycle->start_date),
                'end_date' => now()->startOfDay(),
                'include_end_date' => true,
            ];
        }

        if ($definition['type'] === 'entire_history') {
            if ($cycleIntervals->count() === 0) {
                return [
                    'is_selectable' => false,
                    'cycle_intervals' => collect(),
                    'start_date' => null,
                    'end_date' => null,
                    'include_end_date' => false,
                ];
            }

            return [
                'is_selectable' => true,
                'cycle_intervals' => $cycleIntervals,
                'start_date' => Carbon::parse($cycleIntervals->first()['start_date']),
                'end_date' => Carbon::parse($cycleIntervals->last()['end_date']),
                'include_end_date' => false,
            ];
        }

        $limit = $definition['cycle_limit'];

        if ($cycleIntervals->count() < $limit) {
            return [
                'is_selectable' => false,
                'cycle_intervals' => collect(),
                'start_date' => null,
                'end_date' => null,
                'include_end_date' => false,
            ];
        }

        $limitedIntervals = $cycleIntervals
            ->take(-$limit)
            ->values();

        return [
            'is_selectable' => true,
            'cycle_intervals' => $limitedIntervals,
            'start_date' => Carbon::parse($limitedIntervals->first()['start_date']),
            'end_date' => Carbon::parse($limitedIntervals->last()['end_date']),
            'include_end_date' => false,
        ];
    }

    private function buildCycleStats(Collection $cycleIntervals): array
    {
        $cycleLengths = $cycleIntervals
            ->pluck('length')
            ->values();

        $periodLengths = $cycleIntervals
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

        $averagePeriodLength = $periodLengths->count() > 0
            ? round($periodLengths->average(), 1)
            : null;

        $shortestPeriod = $periodLengths->count() > 0
            ? $periodLengths->min()
            : null;

        $longestPeriod = $periodLengths->count() > 0
            ? $periodLengths->max()
            : null;

        return [
            'average_cycle_length' => $averageCycleLength,
            'shortest_cycle' => $shortestCycle,
            'longest_cycle' => $longestCycle,
            'cycle_variation' => $this->calculateVariation(
                $shortestCycle,
                $longestCycle
            ),

            'average_period_length' => $averagePeriodLength,
            'shortest_period' => $shortestPeriod,
            'longest_period' => $longestPeriod,
            'period_variation' => $this->calculateVariation(
                $shortestPeriod,
                $longestPeriod
            ),
        ];
    }

    private function buildBbtStats(
        Collection $bbtReadings,
        ?CarbonInterface $startDate,
        ?CarbonInterface $endDate,
        bool $includeEndDate
    ): array {
        $filtered = $this->filterByDateRange(
            records: $bbtReadings,
            dateKey: 'date',
            startDate: $startDate,
            endDate: $endDate,
            includeEndDate: $includeEndDate
        );

        $temperatures = $filtered
            ->pluck('temperature')
            ->filter(fn ($temperature) => $temperature !== null)
            ->map(fn ($temperature) => (float) $temperature)
            ->values();

        $averageTemp = $temperatures->count() > 0
            ? round($temperatures->average(), 3)
            : null;

        $coldestTemp = $temperatures->count() > 0
            ? round($temperatures->min(), 3)
            : null;

        $hottestTemp = $temperatures->count() > 0
            ? round($temperatures->max(), 3)
            : null;

        return [
            'locked' => false,
            'reading_count' => $temperatures->count(),
            'average_temperature' => $averageTemp,
            'coldest_temperature' => $coldestTemp,
            'hottest_temperature' => $hottestTemp,
            'temperature_variation' => $this->calculateVariation(
                $coldestTemp,
                $hottestTemp
            ),
        ];
    }

    private function buildSymptomStats(
        Collection $symptoms,
        ?CarbonInterface $startDate,
        ?CarbonInterface $endDate,
        bool $includeEndDate
    ): array {
        $filtered = $this->filterByDateRange(
            records: $symptoms,
            dateKey: 'date',
            startDate: $startDate,
            endDate: $endDate,
            includeEndDate: $includeEndDate
        );

        $total = $filtered->count();

        $byType = $filtered
            ->groupBy('type')
            ->map(function ($items, $type) use ($total) {
                return [
                    'type' => $type,
                    'count' => $items->count(),
                    'percentage' => $total > 0
                        ? round(($items->count() / $total) * 100, 1)
                        : 0,
                    'average_level' => round($items->avg('level'), 1),
                    'max_level' => (int) $items->max('level'),
                ];
            })
            ->sortByDesc('count')
            ->values();

        $topCommon = $byType
            ->take(5)
            ->values();

        $topHighestRated = $byType
            ->sortByDesc('max_level')
            ->sortByDesc('average_level')
            ->take(5)
            ->values();

        $levelCounts = collect(range(1, 5))
            ->map(function ($level) use ($filtered) {
                return [
                    'level' => $level,
                    'label' => $level . ' star',
                    'count' => $filtered
                        ->where('level', $level)
                        ->count(),
                ];
            })
            ->values();

        return [
            'locked' => false,
            'symptom_count' => $total,
            'top_common' => $topCommon,
            'top_highest_rated' => $topHighestRated,
            'level_counts' => $levelCounts,
            'type_distribution' => $byType,
        ];
    }

    private function buildOvulationCorrelation(
        Collection $cycles,
        Collection $bbtReadings,
        ?CarbonInterface $startDate,
        ?CarbonInterface $endDate,
        bool $includeEndDate
    ): array {
        if ($cycles->count() < 2 || $bbtReadings->count() === 0) {
            return [
                'locked' => false,
                'match_count' => 0,
                'average_difference_days' => null,
                'closest_difference_days' => null,
                'largest_difference_days' => null,
                'items' => [],
            ];
        }

        $timelines = collect(
            $this->bbtTimelineService->buildTimelines(
                cycles: $cycles,
                bbtReadings: $bbtReadings
            )
        );

        $items = $timelines
            ->filter(function ($timeline) {
                return !empty($timeline['calendar_ovulation_date']) &&
                    !empty($timeline['bbt_ovulation_date']);
            })
            ->filter(function ($timeline) use ($startDate, $endDate, $includeEndDate) {
                if (!$startDate || !$endDate) {
                    return false;
                }

                $date = Carbon::parse($timeline['calendar_ovulation_date']);

                if ($includeEndDate) {
                    return $date->betweenIncluded($startDate, $endDate);
                }

                return $date->gte($startDate) && $date->lt($endDate);
            })
            ->map(function ($timeline) {
                $calendarDate = Carbon::parse($timeline['calendar_ovulation_date']);
                $bbtDate = Carbon::parse($timeline['bbt_ovulation_date']);

                $difference = abs($calendarDate->diffInDays($bbtDate, false));

                return [
                    'label' => $timeline['label'],
                    'cycle_start_date' => $timeline['cycle_start_date'],
                    'calendar_ovulation_date' => $calendarDate->toDateString(),
                    'bbt_ovulation_date' => $bbtDate->toDateString(),
                    'difference_days' => $difference,
                    'confidence' => $timeline['analysis']['confidence'] ?? 'none',
                ];
            })
            ->values();

        $differences = $items
            ->pluck('difference_days')
            ->values();

        return [
            'locked' => false,
            'match_count' => $items->count(),
            'average_difference_days' => $differences->count() > 0
                ? round($differences->average(), 1)
                : null,
            'closest_difference_days' => $differences->count() > 0
                ? $differences->min()
                : null,
            'largest_difference_days' => $differences->count() > 0
                ? $differences->max()
                : null,
            'items' => $items,
        ];
    }

    private function filterByDateRange(
        Collection $records,
        string $dateKey,
        ?CarbonInterface $startDate,
        ?CarbonInterface $endDate,
        bool $includeEndDate
    ): Collection {
        if (!$startDate || !$endDate) {
            return collect();
        }

        return $records
            ->filter(function ($record) use (
                $dateKey,
                $startDate,
                $endDate,
                $includeEndDate
            ) {
                $date = Carbon::parse(data_get($record, $dateKey));

                if ($includeEndDate) {
                    return $date->betweenIncluded($startDate, $endDate);
                }

                return $date->gte($startDate) && $date->lt($endDate);
            })
            ->values();
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
            $previousCycle = $sorted[$i - 1];
            $currentCycle = $sorted[$i];

            $previous = Carbon::parse($previousCycle->start_date);
            $current = Carbon::parse($currentCycle->start_date);

            $intervals->push([
                'start_date' => $previous->toDateString(),
                'end_date' => $current->toDateString(),
                'length' => $previous->diffInDays($current),
                'period_length' => $previousCycle->period_length,
            ]);
        }

        return $intervals;
    }

    private function defaultRangeKey(array $ranges): ?string
    {
        $selectable = collect($ranges)
            ->where('is_selectable', true)
            ->values();

        if ($selectable->isEmpty()) {
            return null;
        }

        if ($selectable->contains('key', 'last_6_cycles')) {
            return 'last_6_cycles';
        }

        if ($selectable->contains('key', 'last_3_cycles')) {
            return 'last_3_cycles';
        }

        if ($selectable->contains('key', 'current_cycle')) {
            return 'current_cycle';
        }

        return $selectable->first()['key'];
    }

    private function buildRegularity(?array $range): ?array
    {
        if (!$range) {
            return null;
        }

        $cycleCount = $range['cycle_count'] ?? 0;
        $variation = $range['cycle']['cycle_variation'] ?? null;

        if ($cycleCount < 3 || $variation === null) {
            return [
                'status' => 'not_enough_data',
                'label' => 'Not enough data',
                'description' => 'Log at least 3 completed cycles to estimate whether the pattern is regular.',
                'cycle_variation' => $variation,
            ];
        }

        if ($variation <= 7) {
            return [
                'status' => 'regular',
                'label' => 'Likely regular',
                'description' => 'Your selected cycle range varies by 7 days or less.',
                'cycle_variation' => $variation,
            ];
        }

        return [
            'status' => 'irregular',
            'label' => 'Possibly irregular',
            'description' => 'Your selected cycle range varies by more than 7 days.',
            'cycle_variation' => $variation,
        ];
    }

    private function buildRecommendations(?array $range): array
    {
        if (!$range) {
            return [
                'Add more cycle records to generate useful insights.',
            ];
        }

        $recommendations = [];

        $cycleCount = $range['cycle_count'];
        $cycle = $range['cycle'];
        $bbt = $range['bbt'];
        $symptoms = $range['symptoms'];
        $correlation = $range['ovulation_correlation'];

        if ($cycleCount < 3) {
            $recommendations[] = 'Add more completed cycles to improve cycle regularity insights.';
        }

        if (
            ($cycle['cycle_variation'] ?? null) !== null &&
            $cycle['cycle_variation'] > 7
        ) {
            $recommendations[] = 'Cycle length variation is above 7 days. Recent cycle ranges may be more useful than entire history.';
        }

        if (
            ($cycle['average_period_length'] ?? null) !== null &&
            (
                $cycle['average_period_length'] < 2 ||
                $cycle['average_period_length'] > 8
            )
        ) {
            $recommendations[] = 'Average period length is outside the common 2–8 day range. Continue monitoring this pattern.';
        }

        if (
            !($bbt['locked'] ?? false) &&
            ($bbt['reading_count'] ?? 0) < 10
        ) {
            $recommendations[] = 'Add more BBT readings to improve temperature and ovulation insights.';
        }

        if (
            !($symptoms['locked'] ?? false) &&
            ($symptoms['symptom_count'] ?? 0) === 0
        ) {
            $recommendations[] = 'Log symptoms to discover common patterns across cycles.';
        }

        if (
            !($correlation['locked'] ?? false) &&
            ($correlation['match_count'] ?? 0) > 0 &&
            ($correlation['average_difference_days'] ?? null) !== null
        ) {
            if ($correlation['average_difference_days'] <= 2) {
                $recommendations[] = 'Calendar and BBT ovulation estimates are close in the selected range.';
            } else {
                $recommendations[] = 'Calendar and BBT ovulation estimates differ by more than 2 days on average. BBT may help refine ovulation timing.';
            }
        }

        if (count($recommendations) === 0) {
            $recommendations[] = 'Patterns look consistent based on the selected range.';
        }

        return $recommendations;
    }

    private function lockedStats(string $reason): array
    {
        return [
            'locked' => true,
            'reason' => $reason,
        ];
    }

    private function calculateVariation(
        ?float $shortest,
        ?float $longest
    ): ?float {
        if ($shortest === null || $longest === null) {
            return null;
        }

        return round($longest - $shortest, 3);
    }
}