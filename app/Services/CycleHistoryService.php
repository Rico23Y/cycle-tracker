<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;

class CycleHistoryService
{

    public function __construct(
        protected CyclePredictionService $predictionService
    ) {}

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
                    'color' => 'pink',
                    'editable' => true,
                ];

                if ($d === 0) {
                    $calendarDays[$key][] = [
                        'type' => 'day_one_actual_period',
                        'label' => 'Day One',
                        'color' => 'red',
                        'editable' => true,
                    ];
                }
            }
        }
        

        /*
        |--------------------------------------------------------------------------
        | STEP 3
        | Build FUTURE PREDICTIONS
        |--------------------------------------------------------------------------
        */

        $latestCycle = $sorted->last();

        $currentPeriodStart = Carbon::parse(
            $latestCycle->start_date
        );

        $currentPeriodLength =
            $latestCycle->period_length ?? 5;

        $prediction = $this->predictionService
            ->buildPredictionFromCycle(
                $sorted,
                $currentPeriodStart,
                $currentPeriodLength
            );

        if (!$prediction) {
            return $calendarDays;
        }

        /*
        |--------------------------------------------------------------------------
        | Predicted Period
        |--------------------------------------------------------------------------
        */

        for ($d = 0; $d < $prediction['average_period_length']; $d++) {

            $date = $prediction['predicted_period_start']
                ->copy()
                ->addDays($d);

            $key = $date->toDateString();

            if (!isset($calendarDays[$key])) {
                $calendarDays[$key] = [];
            }

            $calendarDays[$key][] = [
                'type' => 'predicted_period',
                'label' => 'Predicted Period',
                'color' => 'light_pink',
                'editable' => true,
            ];

            if ($d === 0) {
                $calendarDays[$key][] = [
                    'type' => 'day_one_predicted_period',
                    'label' => 'Predicted Day One',
                    'color' => 'light_red',
                    'editable' => true,
                ];
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Ovulation
        |--------------------------------------------------------------------------
        */

        $ovulationDate = $prediction['ovulation_date'];

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


        for ($d = 0; $d <= 5; $d++) {

            $date = $prediction['fertile_start']
                ->copy()
                ->addDays($d);

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

        /*
        |--------------------------------------------------------------------------
        | Predicted Safe Days
        |--------------------------------------------------------------------------
        */

        $safeRanges = [
            [
                'start' => $prediction['post_safe_start'],
                'end' => $prediction['post_safe_end'],
            ],
            [
                'start' => $prediction['pre_safe_start'],
                'end' => $prediction['pre_safe_end'],
            ],
        ];

        foreach ($safeRanges as $range) {
            for (
                $date = $range['start']->copy();
                $date->lte($range['end']);
                $date->addDay()
            ) {
                $key = $date->toDateString();

                if (!isset($calendarDays[$key])) {
                    $calendarDays[$key] = [];
                }

                $calendarDays[$key][] = [
                    'type' => 'predicted_safe_day',
                    'label' => 'Potential Safe Day',
                    'color' => 'light_green',
                ];
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Pregnancy Test Reminder
        |--------------------------------------------------------------------------
        */

        $pregnancyTestDate = $prediction['predicted_period_start']
            ->copy()
            ->addDays(1);

        $key = $pregnancyTestDate->toDateString();

        if (!isset($calendarDays[$key])) {
            $calendarDays[$key] = [];
        }

        $calendarDays[$key][] = [
            'type' => 'pregnancy_test',
            'label' => 'Take PPT when missed period',
            'color' => 'light_orange',
        ];

        // dd($calendarDays);
        return $calendarDays;
    }
}