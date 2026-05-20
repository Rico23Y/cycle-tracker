<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;

class CyclePredictionService
{
    public function predictNextPeriod(Collection $cycles): ?array
    {
        // Need at least 2 cycles to calculate length
        if ($cycles->count() < 2) {
            return null;
        }

        // Sort by start_date ascending
        $sorted = $cycles->sortBy('start_date')->values();

        $lengths = [];
        $periodLengths = $sorted->pluck('period_length')->filter()->toArray();
        
        $currentPeriodEndLengths = $sorted->last()->period_length;
        $currentPeriodStartDate = Carbon::parse($sorted->last()->start_date);
        $currentPeriodEndDate = $currentPeriodStartDate->copy()
            ->addDays($currentPeriodEndLengths > 0 ? $currentPeriodEndLengths - 1 : 0);

        // Calculate cycle lengths
        for ($i = 1; $i < $sorted->count(); $i++) {

            $previous = Carbon::parse($sorted[$i - 1]->start_date);
            $current = Carbon::parse($sorted[$i]->start_date);

            $lengths[] = $previous->diffInDays($current);
        }

        // counts the total lengts
        $totalCycles = count($lengths);

        // Use last 6 cycle lengths, if not, use what available
        $sliceLength = $totalCycles >= 6 ? -6 : -$totalCycles;
        $recentLengths = array_slice($lengths, $sliceLength);
        $periodRecentLengths = array_slice($periodLengths, $sliceLength);

        // calculate the average cycle days safely
        $averageLength = $totalCycles > 0 
            ? round(array_sum($recentLengths) / count($recentLengths)) 
            : 0;

        // calculate the period length cycle days safely
        $averagePeriodLength = $totalCycles > 0 
            ? round(array_sum($periodRecentLengths) / count($periodRecentLengths)) 
            : 0;

        // Latest cycle start
        $latestCycle = $sorted->last();

        $predictedDate = Carbon::parse($latestCycle->start_date)
            ->addDays($averageLength);

        $predictedLastPeriodDate = $predictedDate
            ->copy()
            ->addDays($averagePeriodLength > 0 ? $averagePeriodLength - 1 : 0);

        // Ovulation
        $ovulationDate = $predictedDate->copy()->subDays(14);

        $fertileWindowStart = $ovulationDate->copy()->subDays(5);

        $fertileWindowEnd = $ovulationDate->copy();

        // Pregnancy test
        $recommendedPregnancyTestDate = $predictedDate->copy()->addDays(1);

        // =======================================
        // SAFE DAY CALCULATIONS
        // =======================================

        // Use actual cycle history
        $shortestCycle = min($recentLengths);
        $longestCycle = max($recentLengths);

        // POST-MENSTRUAL SAFE DAYS
        // Formula:
        // shortest cycle - 14 ovulation - 5 fertile window - 1 buffer
        $postSafeEndOffset = $shortestCycle - 20;

        // Safe day starts AFTER period ends
        $currentPostPeriodSafeStart = $currentPeriodStartDate->copy();

        // PRE-MENSTRUAL SAFE DAYS
        // Continues until the estimated safe window
        // of the next predicted cycle.
        //
        // This is temporary and will be recalculated
        // once the next real period is logged.
        $postSafeEnd = $currentPeriodStartDate
            ->copy()
            ->addDays($postSafeEndOffset - 1);

        // PRE-MENSTRUAL SAFE DAYS
        // Formula:
        // longest cycle - 14 + 4 buffer
        $preSafeStartOffset = $longestCycle - 10;

        // Start after ovulation buffer
        $preSafeStart = $currentPeriodStartDate
            ->copy()
            ->addDays($preSafeStartOffset);

        // End after the predicted period
        $preSafeEnd = $predictedDate
        ->copy()
        ->addDays($postSafeEndOffset - 1);

        // =======================================

        $ovulationDaysLeft = now()->startOfDay()
            ->diffInDays($ovulationDate, false);

        $daysLeft = now()->startOfDay()
            ->diffInDays($predictedDate, false);

        return [
            // Current Period
            'current_period_start_date' => $currentPeriodStartDate->toDateString(),
            'current_period_end_date' => $currentPeriodEndDate->toDateString(),

            // Next Period
            'predicted_period_date' => $predictedDate->toDateString(),
            'predicted_last_period_date' => $predictedLastPeriodDate->toDateString(),
            'days_left' => $daysLeft,

            // Ovulation
            'ovulation_date' => $ovulationDate->toDateString(),
            'ovulation_days_left' => $ovulationDaysLeft,

            // Fertile Window
            'fertile_window_start' => $fertileWindowStart->toDateString(),
            'fertile_window_end' => $fertileWindowEnd->toDateString(),

            // Safe Days
            'post_safe_start' => $currentPostPeriodSafeStart->toDateString(),
            'post_safe_end' => $postSafeEnd->toDateString(),

            'pre_safe_start' => $preSafeStart->toDateString(),
            'pre_safe_end' => $preSafeEnd->toDateString(),

            // Meta
            'average_cycle_length' => $averageLength,
            'average_period_length' => $averagePeriodLength,
            'shortest_cycle' => $shortestCycle,
            'longest_cycle' => $longestCycle,

            // Pregnancy test
            'pregnancy_test_date' => $recommendedPregnancyTestDate->toDateString(),
        ];
    }
}