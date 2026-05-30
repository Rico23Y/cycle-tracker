<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;

class CycleHistoryService
{

    public function __construct(
        protected CyclePredictionService $predictionService
    ) {}

    public function buildCalendarData(
        Collection $cycles,
        Collection $bbtReadings,
        Collection $symptoms
    ): array
    {
        if ($cycles->count() < 2) {
            return [];
        }

        $sorted = $cycles->sortBy('start_date')->values();

        $calendarDays = [];

        $latestCycle = $sorted->last();

        $currentPeriodStart = Carbon::parse(
            $latestCycle->start_date
        );

        $prediction = $this->predictionService
            ->buildPredictionFromCycle(
                $sorted,
                $currentPeriodStart,
            );

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

        $latestCycleId = $sorted->last()->id;

        foreach ($sorted as $cycle) {

            $start = Carbon::parse($cycle->start_date);

            $isLatestCycle = $cycle->id === $latestCycleId;

            /*
            |--------------------------------------------------------------------------
            | If period_length is null, the period is still ongoing.
            |--------------------------------------------------------------------------
            */

            if ($cycle->period_length === null) {

                $estimatedPeriodLength = $isLatestCycle && $prediction
                    ? $prediction['average_period_length']
                    : 1;

                for ($d = 0; $d < $estimatedPeriodLength; $d++) {

                    $date = $start->copy()->addDays($d);

                    $key = $date->toDateString();

                    if (!isset($calendarDays[$key])) {
                        $calendarDays[$key] = [];
                    }

                    /*
                    |--------------------------------------------------------------------------
                    | Estimated ongoing actual period
                    |--------------------------------------------------------------------------
                    | This is only visual. It does NOT update the database.
                    |--------------------------------------------------------------------------
                    */

                    $calendarDays[$key][] = [
                        'type' => 'ongoing_actual_period',
                        'label' => 'Ongoing Period',
                        'color' => 'pink',
                        'editable' => true,
                        'cycle_id' => $cycle->id,
                        'is_latest_cycle' => $isLatestCycle,
                        'is_estimated' => true,
                    ];

                    if ($d === 0) {
                        $calendarDays[$key][] = [
                            'type' => 'day_one_actual_period',
                            'label' => 'Day One',
                            'color' => 'red',
                            'editable' => true,
                            'cycle_id' => $cycle->id,
                            'is_latest_cycle' => $isLatestCycle,
                        ];
                    }
                }

                continue;
            }

            /*
            |--------------------------------------------------------------------------
            | Confirmed actual period.
            |--------------------------------------------------------------------------
            */

            $periodLength = $cycle->period_length;

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
                    'cycle_id' => $cycle->id,
                    'is_latest_cycle' => $isLatestCycle,
                ];

                if ($d === 0) {
                    $calendarDays[$key][] = [
                        'type' => 'day_one_actual_period',
                        'label' => 'Day One',
                        'color' => 'red',
                        'editable' => true,
                        'cycle_id' => $cycle->id,
                        'is_latest_cycle' => $isLatestCycle,
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
                'is_prediction' => true,
            ];

            if ($d === 0) {
                $calendarDays[$key][] = [
                    'type' => 'day_one_predicted_period',
                    'label' => 'Predicted Day One',
                    'color' => 'light_red',
                    'editable' => true,
                    'is_prediction' => true,
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
            'type' => 'predicted_ovulation',
            'label' => 'Predicted Ovulation',
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
                'type' => 'predicted_fertile_window',
                'label' => 'Predicted Ovulation Window',
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

        /*
        |--------------------------------------------------------------------------
        | Historical Ovulation + Fertile Windows
        |--------------------------------------------------------------------------
        */

        for ($i = 1; $i < $sorted->count(); $i++) {

            $nextCycleStart = Carbon::parse($sorted[$i]->start_date);

            $historicalOvulationDate = $nextCycleStart
                ->copy()
                ->subDays(14);

            /*
            |--------------------------------------------------------------------------
            | Historical Fertile Window
            |--------------------------------------------------------------------------
            */

            $historicalFertileStart = $historicalOvulationDate
                ->copy()
                ->subDays(5);

            for ($d = 0; $d <= 5; $d++) {

                $date = $historicalFertileStart
                    ->copy()
                    ->addDays($d);

                $key = $date->toDateString();

                if (!isset($calendarDays[$key])) {
                    $calendarDays[$key] = [];
                }

                $calendarDays[$key][] = [
                    'type' => 'fertile_window',
                    'label' => 'Ovulation Window',
                    'color' => 'sky',
                ];
            }

            /*
            |--------------------------------------------------------------------------
            | Historical Ovulation
            |--------------------------------------------------------------------------
            */

            $key = $historicalOvulationDate->toDateString();

            if (!isset($calendarDays[$key])) {
                $calendarDays[$key] = [];
            }

            $calendarDays[$key][] = [
                'type' => 'ovulation',
                'label' => 'Ovulation',
                'color' => 'blue',
            ];
        }

        /*
        |--------------------------------------------------------------------------
        | BBT Readings
        |--------------------------------------------------------------------------
        */

        foreach ($bbtReadings as $reading) {
            $key = Carbon::parse($reading->date)->toDateString();

            if (!isset($calendarDays[$key])) {
                $calendarDays[$key] = [];
            }

            $calendarDays[$key][] = [
                'type' => 'bbt',
                'label' => $reading->temperature . '°C',
                'color' => 'gray',
                'temperature' => $reading->temperature,
            ];
        }

        /*
        |--------------------------------------------------------------------------
        | Symptoms
        |--------------------------------------------------------------------------
        */

        foreach ($symptoms as $symptom) {
            $key = Carbon::parse($symptom->date)->toDateString();

            if (!isset($calendarDays[$key])) {
                $calendarDays[$key] = [];
            }

            $calendarDays[$key][] = [
                'type' => 'symptom',
                'label' => $symptom->type . ' ' . str_repeat('★', $symptom->level),
                'color' => 'purple',
                'symptom_type' => $symptom->type,
                'level' => $symptom->level,
                'notes' => $symptom->notes,
            ];
        }

        // dd($calendarDays);
        return $calendarDays;
    }
}