<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;

class CycleHistoryService
{

    public function __construct(
        protected CyclePredictionService $predictionService,
        protected BbtTimelineService $bbtTimelineService
    ) {}

    public function buildCalendarData(
        Collection $cycles,
        Collection $bbtReadings,
        Collection $symptoms,
        array $permissions = []
    ): array
    {
        $permissions = array_merge([
            'can_view_cycles' => true,
            'can_edit_cycles' => true,

            'can_view_bbt' => true,
            'can_edit_bbt' => true,

            'can_view_symptoms' => true,
            'can_edit_symptoms' => true,

            'can_view_predictions' => true,
            'can_view_insights' => true,
        ], $permissions);

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

                    $calendarDays[$key][] = $permissions['can_view_cycles']
                        ? [
                            'type' => 'ongoing_actual_period',
                            'label' => 'Ongoing Period',
                            'color' => 'pink',
                            'editable' => $permissions['can_edit_cycles'],
                            'cycle_id' => $cycle->id,
                            'is_latest_cycle' => $isLatestCycle,
                            'is_estimated' => true,
                        ]
                        : [
                            'type' => 'locked_cycles',
                            'label' => 'Cycle data locked',
                            'color' => 'gray',
                            'locked' => true,
                            'data_group' => 'cycles',
                        ];

                    if ($d === 0) {
                        if ($permissions['can_view_cycles']) {
                            $calendarDays[$key][] = [
                                'type' => 'day_one_actual_period',
                                'label' => 'Day One',
                                'color' => 'red',
                                'editable' => $permissions['can_edit_cycles'],
                                'cycle_id' => $cycle->id,
                                'is_latest_cycle' => $isLatestCycle,
                            ];
                        }
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

                $calendarDays[$key][] = $permissions['can_view_cycles']
                    ? [
                        'type' => 'actual_period',
                        'label' => 'Actual Period',
                        'color' => 'pink',
                        'editable' => $permissions['can_edit_cycles'],
                        'cycle_id' => $cycle->id,
                        'is_latest_cycle' => $isLatestCycle,
                        'created_by_name' => $cycle->createdBy?->name,
                        'updated_by_name' => $cycle->updatedBy?->name,
                        'created_at' => $cycle->created_at?->toISOString(),
                        'updated_at' => $cycle->updated_at?->toISOString(),                       
                    ]
                    : [
                        'type' => 'locked_cycles',
                        'label' => 'Cycle data locked',
                        'color' => 'gray',
                        'locked' => true,
                        'data_group' => 'cycles',
                    ];

                if ($d === 0) {
                    if ($permissions['can_view_cycles']) {
                        $calendarDays[$key][] = [
                            'type' => 'day_one_actual_period',
                            'label' => 'Day One',
                            'color' => 'red',
                            'editable' => $permissions['can_edit_cycles'],
                            'cycle_id' => $cycle->id,
                            'is_latest_cycle' => $isLatestCycle,
                            'created_by_name' => $cycle->createdBy?->name,
                            'updated_by_name' => $cycle->updatedBy?->name,
                            'created_at' => $cycle->created_at?->toISOString(),
                            'updated_at' => $cycle->updated_at?->toISOString(),
                        ];
                    }
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

            $calendarDays[$key][] = $permissions['can_view_predictions']
                ? [
                    'type' => 'predicted_period',
                    'label' => 'Predicted Period',
                    'color' => 'light_pink',
                    'editable' => $permissions['can_edit_cycles'],
                    'is_prediction' => true,
                ]
                : [
                    'type' => 'locked_predictions',
                    'label' => 'Prediction locked',
                    'color' => 'gray',
                    'locked' => true,
                    'data_group' => 'predictions',
                ];

            if ($d === 0) {
                if ($permissions['can_view_predictions']) {
                    $calendarDays[$key][] = [
                        'type' => 'day_one_predicted_period',
                        'label' => 'Predicted Day One',
                        'color' => 'light_red',
                        'editable' => $permissions['can_edit_cycles'],
                        'is_prediction' => true,
                    ];
                }
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

        $calendarDays[$key][] = $permissions['can_view_predictions']
            ? [
                'type' => 'predicted_ovulation',
                'label' => 'Predicted Ovulation',
                'color' => 'blue',
            ]
            : [
                'type' => 'locked_predictions',
                'label' => 'Prediction locked',
                'color' => 'gray',
                'locked' => true,
                'data_group' => 'predictions',
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

            $calendarDays[$key][] = $permissions['can_view_predictions']
                ? [
                    'type' => 'predicted_fertile_window',
                    'label' => 'Predicted Ovulation Window',
                    'color' => 'sky',
                ]
                : [
                    'type' => 'locked_predictions',
                    'label' => 'Prediction locked',
                    'color' => 'gray',
                    'locked' => true,
                    'data_group' => 'predictions',
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

                $calendarDays[$key][] = $permissions['can_view_predictions']
                    ? [
                        'type' => 'predicted_safe_day',
                        'label' => 'Potential Safe Day',
                        'color' => 'light_green',
                    ]
                    : [
                        'type' => 'locked_predictions',
                        'label' => 'Prediction locked',
                        'color' => 'gray',
                        'locked' => true,
                        'data_group' => 'predictions',
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

        $calendarDays[$key][] = $permissions['can_view_predictions']
            ? [
                'type' => 'pregnancy_test',
                'label' => 'Take PPT when missed period',
                'color' => 'light_orange',
            ]
            : [
                'type' => 'locked_predictions',
                'label' => 'Prediction locked',
                'color' => 'gray',
                'locked' => true,
                'data_group' => 'predictions',
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

                $calendarDays[$key][] = $permissions['can_view_predictions']
                    ? [
                        'type' => 'fertile_window',
                        'label' => 'Ovulation Window',
                        'color' => 'sky',
                    ]
                    : [
                        'type' => 'locked_predictions',
                        'label' => 'Prediction locked',
                        'color' => 'gray',
                        'locked' => true,
                        'data_group' => 'predictions',
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

            $calendarDays[$key][] = $permissions['can_view_predictions']
                ? [
                    'type' => 'ovulation',
                    'label' => 'Ovulation',
                    'color' => 'blue',
                ]
                : [
                    'type' => 'locked_predictions',
                    'label' => 'Prediction locked',
                    'color' => 'gray',
                    'locked' => true,
                    'data_group' => 'predictions',
                ];
        }

        /*
        |--------------------------------------------------------------------------
        | BBT Based Ovulation
        |--------------------------------------------------------------------------
        |
        | This is calculated from BBT temperature shift analysis.
        | It only appears when BBT permission is allowed and the BBT pattern is usable.
        |
        */

        if ($permissions['can_view_bbt']) {
            $bbtTimelines = $this->bbtTimelineService->buildTimelines(
                cycles: $sorted,
                bbtReadings: $bbtReadings
            );

            foreach ($bbtTimelines as $timeline) {
                $analysis = $timeline['analysis'] ?? null;

                if (!$analysis || !($analysis['usable'] ?? false)) {
                    continue;
                }

               $bbtOvulationDate = $timeline['bbt_ovulation_date'] ?? null;

                if (!$bbtOvulationDate) {
                    continue;
                }

                $key = Carbon::parse($bbtOvulationDate)->toDateString();

                if (!isset($calendarDays[$key])) {
                    $calendarDays[$key] = [];
                }

                $calendarDays[$key][] = [
                    'type' => 'bbt_based_ovulation',
                    'label' => 'BBT ovulation',
                    'color' => 'teal',
                    'editable' => false,
                    'data_group' => 'bbt',
                ];
            }
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

            $calendarDays[$key][] = $permissions['can_view_bbt']
                ? [
                    'type' => 'bbt',
                    'label' => $reading->temperature . '°C',
                    'color' => 'gray',
                    'bbt_id' => $reading->id,
                    'temperature' => $reading->temperature,
                    'created_by_name' => $reading->createdBy?->name,
                    'updated_by_name' => $reading->updatedBy?->name,
                    'created_at' => $reading->created_at?->toISOString(),
                    'updated_at' => $reading->updated_at?->toISOString(),
                ]
                : [
                    'type' => 'locked_bbt',
                    'label' => 'BBT locked',
                    'color' => 'gray',
                    'locked' => true,
                    'data_group' => 'bbt',
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

            $calendarDays[$key][] = $permissions['can_view_symptoms']
                ? [
                    'type' => 'symptom',
                    'label' => $symptom->type . ' ' . str_repeat('★', $symptom->level),
                    'color' => 'purple',
                    'symptom_id' => $symptom->id,
                    'symptom_type' => $symptom->type,
                    'level' => $symptom->level,
                    'notes' => $symptom->notes,
                    'created_by_name' => $symptom->createdBy?->name,
                    'updated_by_name' => $symptom->updatedBy?->name,
                    'created_at' => $symptom->created_at?->toISOString(),
                    'updated_at' => $symptom->updated_at?->toISOString(),               
                ]
                : [
                    'type' => 'locked_symptom',
                    'label' => 'Symptoms locked',
                    'color' => 'gray',
                    'locked' => true,
                    'data_group' => 'symptoms',
                ];
        }

        // dd($calendarDays);
        return $calendarDays;
    }
}