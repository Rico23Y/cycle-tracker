<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;

class CycleHistoryService
{
    public function buildCalendarData(Collection $cycles): array
    {
        if ($cycles->count() < 2) {
            return [];
        }

        $sorted = $cycles->sortBy('start_date')->values();

        $calendarDays = [];

        /*
        |--------------------------------------------------------------------------
        | STEP 1
        | Build cycle lengths
        |--------------------------------------------------------------------------
        */

        $cycleLengths = [];

        for ($i = 1; $i < $sorted->count(); $i++) {

            $previous = Carbon::parse($sorted[$i - 1]->start_date);
            $current = Carbon::parse($sorted[$i]->start_date);

            $cycleLengths[] = $previous->diffInDays($current);
        }

        $averageCycleLength = round(
            array_sum($cycleLengths) / count($cycleLengths)
        );

        /*
        |--------------------------------------------------------------------------
        | STEP 2
        | Build REAL RECORDED PERIODS
        |--------------------------------------------------------------------------
        */

        foreach ($sorted as $cycle) {

            $start = Carbon::parse($cycle->start_date);

            $periodLength = $cycle->period_length ?? 5;

            for ($d = 0; $d < $periodLength; $d++) {

                $date = $start->copy()->addDays($d);

                $key = $date->toDateString();

                if (!isset($calendarDays[$key])) {
                    $calendarDays[$key] = [];
                }

                $calendarDays[$key][] = [
                    'type' => 'actual_period',
                    'label' => 'Actual Period',
                    'color' => 'red',
                    'editable' => true,
                ];
            }
        }

        /*
        |--------------------------------------------------------------------------
        | STEP 3
        | Build FUTURE PREDICTIONS
        |--------------------------------------------------------------------------
        */

        $latestCycle = $sorted->last();

        $latestStart = Carbon::parse($latestCycle->start_date);

        $predictedStart = $latestStart
            ->copy()
            ->addDays($averageCycleLength);

        $predictedPeriodLength = $latestCycle->period_length ?? 5;

        /*
        |--------------------------------------------------------------------------
        | Predicted Period
        |--------------------------------------------------------------------------
        */

        for ($d = 0; $d < $predictedPeriodLength; $d++) {

            $date = $predictedStart->copy()->addDays($d);

            $key = $date->toDateString();

            if (!isset($calendarDays[$key])) {
                $calendarDays[$key] = [];
            }

            $calendarDays[$key][] = [
                'type' => 'predicted_period',
                'label' => 'Predicted Period',
                'color' => 'pink',
                'editable' => true,
            ];
        }

        /*
        |--------------------------------------------------------------------------
        | Ovulation
        |--------------------------------------------------------------------------
        */

        $ovulationDate = $predictedStart
            ->copy()
            ->subDays(14);

        $key = $ovulationDate->toDateString();

        if (!isset($calendarDays[$key])) {
            $calendarDays[$key] = [];
        }

        $calendarDays[$key][] = [
            'type' => 'ovulation',
            'label' => 'Ovulation',
            'color' => 'blue',
        ];

        /*
        |--------------------------------------------------------------------------
        | Fertile Window
        |--------------------------------------------------------------------------
        */

        $fertileStart = $ovulationDate->copy()->subDays(5);

        for ($d = 0; $d <= 5; $d++) {

            $date = $fertileStart->copy()->addDays($d);

            $key = $date->toDateString();

            if (!isset($calendarDays[$key])) {
                $calendarDays[$key] = [];
            }

            $calendarDays[$key][] = [
                'type' => 'fertile',
                'label' => 'Fertile Window',
                'color' => 'sky',
            ];
        }

        return $calendarDays;
    }
}