<?php

namespace App\Services;

use Illuminate\Support\Collection;

class BbtOvulationAnalysisService
{
    public function analyze(Collection|array $readings, ?int $calendarOvulationDay = null): array
    {
        $readings = collect($readings)
            ->map(function ($reading) {
                return [
                    'date' => data_get($reading, 'date'),
                    'cycle_day' => (int) data_get($reading, 'cycle_day'),
                    'temperature' => data_get($reading, 'temperature'),
                ];
            })
            ->filter(fn ($reading) => $reading['cycle_day'] > 0)
            ->sortBy('cycle_day')
            ->values();

        $validReadings = $this->prepareValidReadings($readings);

        if ($validReadings->count() < 10) {
            return $this->notUsable(
                reason: 'Not enough valid BBT readings to analyze temperature shift.',
                calendarOvulationDay: $calendarOvulationDay,
                validReadings: $validReadings,
                ignoredDates: $this->ignoredDates($readings, $validReadings),
            );
        }

        $outlierDates = $this->detectOutlierDates($validReadings);

        $analysisReadings = $validReadings
            ->reject(fn ($reading) => in_array($reading['date'], $outlierDates, true))
            ->values();

        if ($analysisReadings->count() < 10) {
            return $this->notUsable(
                reason: 'Too many unusual BBT values were ignored.',
                calendarOvulationDay: $calendarOvulationDay,
                validReadings: $analysisReadings,
                ignoredDates: [
                    ...$this->ignoredDates($readings, $validReadings),
                    ...$outlierDates,
                ],
                outlierDates: $outlierDates,
            );
        }

        $shift = $this->findTemperatureShift($analysisReadings);

        if (!$shift) {
            return $this->notUsable(
                reason: 'No confirmed temperature shift was found.',
                calendarOvulationDay: $calendarOvulationDay,
                validReadings: $analysisReadings,
                ignoredDates: [
                    ...$this->ignoredDates($readings, $validReadings),
                    ...$outlierDates,
                ],
                outlierDates: $outlierDates,
            );
        }

        return [
            'usable' => true,
            'status' => 'usable',
            'reason' => null,

            'cover_line' => $shift['cover_line'],

            'calendar_ovulation_day' => $calendarOvulationDay,
            'bbt_ovulation_day' => $shift['bbt_ovulation_day'],
            'shift_start_day' => $shift['shift_start_day'],
            'rule_used' => $shift['rule_used'],

            'ignored_dates' => [
                ...$this->ignoredDates($readings, $validReadings),
                ...$outlierDates,
            ],
            'outlier_dates' => $outlierDates,

            'valid_temp_count' => $analysisReadings->count(),
            'missing_temp_count' => $readings->whereNull('temperature')->count(),

            'confidence' => $this->confidence(
                analysisReadings: $analysisReadings,
                outlierCount: count($outlierDates),
                ruleUsed: $shift['rule_used'],
            ),
        ];
    }

    private function prepareValidReadings(Collection $readings): Collection
    {
        return $readings
            ->filter(function ($reading) {
                if ($reading['temperature'] === null) {
                    return false;
                }

                $temperature = (float) $reading['temperature'];

                return $temperature >= 35.5 && $temperature <= 38.0;
            })
            ->map(function ($reading) {
                return [
                    ...$reading,
                    // Round first before applying cover-line rules.
                    'temperature' => round((float) $reading['temperature'], 1),
                ];
            })
            ->values();
    }

    private function detectOutlierDates(Collection $readings): array
    {
        $outlierDates = [];

        foreach ($readings as $index => $reading) {
            $neighbors = collect();

            for ($offset = -2; $offset <= 2; $offset++) {
                if ($offset === 0) {
                    continue;
                }

                $neighbor = $readings->get($index + $offset);

                if ($neighbor) {
                    $neighbors->push($neighbor['temperature']);
                }
            }

            if ($neighbors->count() < 3) {
                continue;
            }

            $median = $this->median($neighbors);

            if (abs($reading['temperature'] - $median) > 0.35) {
                $outlierDates[] = $reading['date'];
            }
        }

        return $outlierDates;
    }

    private function findTemperatureShift(Collection $readings): ?array
    {
        for ($index = 6; $index < $readings->count(); $index++) {
            $previousSix = $readings
                ->slice($index - 6, 6)
                ->pluck('temperature');

            if ($previousSix->count() < 6) {
                continue;
            }

            $coverLine = round($previousSix->max(), 1);

            $t1 = $readings->get($index);
            $t2 = $readings->get($index + 1);
            $t3 = $readings->get($index + 2);
            $t4 = $readings->get($index + 3);

            if (!$t1 || !$t2 || !$t3) {
                continue;
            }

            /*
            |--------------------------------------------------------------------------
            | Standard rise
            |--------------------------------------------------------------------------
            |
            | 3 temps above cover line.
            | 3rd temp must be at least 0.2°C above cover line.
            |
            */

            if (
                $t1['temperature'] > $coverLine &&
                $t2['temperature'] > $coverLine &&
                $t3['temperature'] > $coverLine &&
                $t3['temperature'] >= round($coverLine + 0.2, 1)
            ) {
                return [
                    'cover_line' => $coverLine,
                    'shift_start_day' => $t1['cycle_day'],
                    'bbt_ovulation_day' => max(1, $t1['cycle_day'] - 1),
                    'rule_used' => 'standard',
                ];
            }

            /*
            |--------------------------------------------------------------------------
            | Slow rise
            |--------------------------------------------------------------------------
            |
            | First 3 are above cover line, but 3rd is not high enough.
            | 4th temp confirms if it reaches cover line + 0.2°C.
            |
            */

            if (
                $t4 &&
                $t1['temperature'] > $coverLine &&
                $t2['temperature'] > $coverLine &&
                $t3['temperature'] > $coverLine &&
                $t3['temperature'] < round($coverLine + 0.2, 1) &&
                $t4['temperature'] > $coverLine &&
                $t4['temperature'] >= round($coverLine + 0.2, 1)
            ) {
                return [
                    'cover_line' => $coverLine,
                    'shift_start_day' => $t1['cycle_day'],
                    'bbt_ovulation_day' => max(1, $t1['cycle_day'] - 1),
                    'rule_used' => 'slow_rise',
                ];
            }

            /*
            |--------------------------------------------------------------------------
            | Fall-back rise
            |--------------------------------------------------------------------------
            |
            | First temp is above cover line.
            | 2nd or 3rd drops to/below cover line.
            | 4th temp confirms if it reaches cover line + 0.2°C.
            |
            */

            if (
                $t4 &&
                $t1['temperature'] > $coverLine &&
                (
                    $t2['temperature'] <= $coverLine ||
                    $t3['temperature'] <= $coverLine
                ) &&
                $t4['temperature'] >= round($coverLine + 0.2, 1)
            ) {
                return [
                    'cover_line' => $coverLine,
                    'shift_start_day' => $t1['cycle_day'],
                    'bbt_ovulation_day' => max(1, $t1['cycle_day'] - 1),
                    'rule_used' => 'fallback',
                ];
            }
        }

        return null;
    }

    private function notUsable(
        string $reason,
        ?int $calendarOvulationDay,
        Collection $validReadings,
        array $ignoredDates = [],
        array $outlierDates = [],
    ): array {
        return [
            'usable' => false,
            'status' => 'not_usable',
            'reason' => $reason,

            'cover_line' => null,

            'calendar_ovulation_day' => $calendarOvulationDay,
            'bbt_ovulation_day' => null,
            'shift_start_day' => null,
            'rule_used' => null,

            'ignored_dates' => $ignoredDates,
            'outlier_dates' => $outlierDates,

            'valid_temp_count' => $validReadings->count(),
            'missing_temp_count' => 0,

            'confidence' => 'none',
        ];
    }

    private function ignoredDates(Collection $allReadings, Collection $validReadings): array
    {
        $validDates = $validReadings
            ->pluck('date')
            ->all();

        return $allReadings
            ->filter(function ($reading) use ($validDates) {
                return $reading['temperature'] !== null &&
                    !in_array($reading['date'], $validDates, true);
            })
            ->pluck('date')
            ->values()
            ->all();
    }

    private function confidence(
        Collection $analysisReadings,
        int $outlierCount,
        string $ruleUsed
    ): string {
        if ($analysisReadings->count() >= 20 && $outlierCount <= 1 && $ruleUsed === 'standard') {
            return 'high';
        }

        if ($analysisReadings->count() >= 14 && $outlierCount <= 3) {
            return 'medium';
        }

        return 'low';
    }

    private function median(Collection $values): float
    {
        $sorted = $values
            ->sort()
            ->values();

        $count = $sorted->count();

        $middle = intdiv($count, 2);

        if ($count % 2 === 0) {
            return ($sorted[$middle - 1] + $sorted[$middle]) / 2;
        }

        return $sorted[$middle];
    }
}