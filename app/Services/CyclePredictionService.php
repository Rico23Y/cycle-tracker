<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;

class CyclePredictionService
{
    public function predictNextPeriod(Collection $cycles): ?array
    {
        if ($cycles->count() < 2) {
            return null;
        }

        $sorted = $cycles->sortBy('start_date')->values();

        $latestCycle = $sorted->last();

        $currentPeriodStartDate = Carbon::parse(
            $latestCycle->start_date
        );

        $currentPeriodLength = $latestCycle->period_length ?? 5;

        $currentPeriodEndDate = $currentPeriodStartDate
            ->copy()
            ->addDays($currentPeriodLength - 1);

        /*
        |--------------------------------------------------------------------------
        | Centralized Prediction Engine
        |--------------------------------------------------------------------------
        */

        $prediction = $this->buildPredictionFromCycle(
            $sorted,
            $currentPeriodStartDate,
            $currentPeriodLength
        );

        if (!$prediction) {
            return null;
        }

        /*
        |--------------------------------------------------------------------------
        | Days Left
        |--------------------------------------------------------------------------
        */

        $daysLeft = now()
            ->startOfDay()
            ->diffInDays(
                $prediction['predicted_period_start'],
                false
            );

        $ovulationDaysLeft = now()
            ->startOfDay()
            ->diffInDays(
                $prediction['ovulation_date'],
                false
            );

        /*
        |--------------------------------------------------------------------------
        | Pregnancy Test
        |--------------------------------------------------------------------------
        */

        $pregnancyTestDate = $prediction[
            'predicted_period_start'
        ]
            ->copy()
            ->addDays(1);

        /*
        |--------------------------------------------------------------------------
        | Recent Cycle Statistics
        |--------------------------------------------------------------------------
        */

        $lengths = [];

        for ($i = 1; $i < $sorted->count(); $i++) {

            $previous = Carbon::parse(
                $sorted[$i - 1]->start_date
            );

            $current = Carbon::parse(
                $sorted[$i]->start_date
            );

            $lengths[] = $previous->diffInDays($current);
        }

        $sliceLength =
            count($lengths) >= 6
                ? -6
                : -count($lengths);

        $recentLengths = array_slice(
            $lengths,
            $sliceLength
        );

        $periodLengths = $sorted
            ->pluck('period_length')
            ->filter()
            ->toArray();

        $recentPeriodLengths = array_slice(
            $periodLengths,
            $sliceLength
        );

        $averageCycleLength = round(
            array_sum($recentLengths) /
            count($recentLengths)
        );

        $averagePeriodLength = round(
            array_sum($recentPeriodLengths) /
            count($recentPeriodLengths)
        );


        return [

            /*
            |--------------------------------------------------------------------------
            | Current Period
            |--------------------------------------------------------------------------
            */

            'current_period_start_date' =>
                $currentPeriodStartDate->toDateString(),

            'current_period_end_date' =>
                $currentPeriodEndDate->toDateString(),

            /*
            |--------------------------------------------------------------------------
            | Predicted Period
            |--------------------------------------------------------------------------
            */

            'predicted_period_date' =>
                $prediction['predicted_period_start']
                    ->toDateString(),

            'predicted_last_period_date' =>
                $prediction['predicted_period_end']
                    ->toDateString(),

            'days_left' =>
                $daysLeft,

            /*
            |--------------------------------------------------------------------------
            | Ovulation
            |--------------------------------------------------------------------------
            */

            'ovulation_date' =>
                $prediction['ovulation_date']
                    ->toDateString(),

            'ovulation_days_left' =>
                $ovulationDaysLeft,

            /*
            |--------------------------------------------------------------------------
            | Fertile Window
            |--------------------------------------------------------------------------
            */

            'fertile_window_start' =>
                $prediction['fertile_start']
                    ->toDateString(),

            'fertile_window_end' =>
                $prediction['fertile_end']
                    ->toDateString(),

            /*
            |--------------------------------------------------------------------------
            | Safe Days
            |--------------------------------------------------------------------------
            */

            'post_safe_start' =>
                $prediction['post_safe_start']
                    ->toDateString(),

            'post_safe_end' =>
                $prediction['post_safe_end']
                    ->toDateString(),

            'pre_safe_start' =>
                $prediction['pre_safe_start']
                    ->toDateString(),

            'pre_safe_end' =>
                $prediction['pre_safe_end']
                    ->toDateString(),

            /*
            |--------------------------------------------------------------------------
            | Meta
            |--------------------------------------------------------------------------
            */

            'average_cycle_length' =>
                $averageCycleLength,

            'average_period_length' =>
                $averagePeriodLength,

            'shortest_cycle' =>
                min($recentLengths),

            'longest_cycle' =>
                max($recentLengths),

            /*
            |--------------------------------------------------------------------------
            | Pregnancy Test
            |--------------------------------------------------------------------------
            */

            'pregnancy_test_date' =>
                $pregnancyTestDate->toDateString(),
        ];
    }

    public function buildPredictionFromCycle(
        Collection $cycles,
        Carbon $cycleStartDate
    ): ?array
    {
        if ($cycles->count() < 2) {
            return null;
        }

        $sorted = $cycles->sortBy('start_date')->values();

        $lengths = [];

        for ($i = 1; $i < $sorted->count(); $i++) {

            $previous = Carbon::parse($sorted[$i - 1]->start_date);
            $current = Carbon::parse($sorted[$i]->start_date);

            $lengths[] = $previous->diffInDays($current);
        }

        $totalCycles = count($lengths);

        $sliceLength = $totalCycles >= 6 ? -6 : -$totalCycles;

        $recentLengths = array_slice($lengths, $sliceLength);

        $periodLengths = $sorted
            ->pluck('period_length')
            ->filter()
            ->toArray();

        $recentPeriodLengths = array_slice($periodLengths, $sliceLength);

        $averagePeriodLength = count($recentPeriodLengths) > 0
            ? round(array_sum($recentPeriodLengths) / count($recentPeriodLengths))
            : 5;

        $averageLength = round(
            array_sum($recentLengths) / count($recentLengths)
        );

        $shortestCycle = min($recentLengths);

        $longestCycle = max($recentLengths);

        /*
        |--------------------------------------------------------------------------
        | Predicted Period
        |--------------------------------------------------------------------------
        */

        $predictedPeriodStart = $cycleStartDate
            ->copy()
            ->addDays($averageLength);

        $predictedPeriodEnd = $predictedPeriodStart
            ->copy()
            ->addDays($averagePeriodLength - 1);
        
        /*
        |--------------------------------------------------------------------------
        | Ovulation
        |--------------------------------------------------------------------------
        */

        $ovulationDate = $predictedPeriodStart
            ->copy()
            ->subDays(14);

        /*
        |--------------------------------------------------------------------------
        | Fertile Window
        |--------------------------------------------------------------------------
        */

        $fertileStart = $ovulationDate
            ->copy()
            ->subDays(5);

        $fertileEnd = $ovulationDate->copy();

        /*
        |--------------------------------------------------------------------------
        | Safe Days
        |--------------------------------------------------------------------------
        */

        $postSafeEndOffset = $shortestCycle - 20;

        $postSafeStart = $cycleStartDate->copy();

        $postSafeEnd = $cycleStartDate
            ->copy()
            ->addDays($postSafeEndOffset - 1);

        $preSafeStartOffset = $longestCycle - 10;

        $preSafeStart = $cycleStartDate
            ->copy()
            ->addDays($preSafeStartOffset);

        $preSafeEnd = $predictedPeriodStart
            ->copy()
            ->addDays($postSafeEndOffset - 1);

        return [
            'predicted_period_start' => $predictedPeriodStart,
            'predicted_period_end' => $predictedPeriodEnd,

            'ovulation_date' => $ovulationDate,

            'fertile_start' => $fertileStart,
            'fertile_end' => $fertileEnd,

            'post_safe_start' => $postSafeStart,
            'post_safe_end' => $postSafeEnd,

            'pre_safe_start' => $preSafeStart,
            'pre_safe_end' => $preSafeEnd,

            'average_period_length' => $averagePeriodLength,
        ];
    }
}