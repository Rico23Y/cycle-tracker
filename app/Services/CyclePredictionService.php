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
        $periodLength = $sorted->skip(1)->pluck('period_length')->toArray();

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
        $periodRecentLengths = array_slice($periodLength, $sliceLength);

        // dd($sorted->toArray());
        // dd($periodLength, $lengths, $recentLengths, $periodRecentLengths);


        // calculate the average cycle days safely
        $averageLength = $totalCycles > 0 
            ? round(array_sum($recentLengths) / count($recentLengths)) 
            : 0;

        // calculate the period length cycle days safely
        $averagePeriodLength = $totalCycles > 0 
            ? round(array_sum($periodRecentLengths) / count($periodRecentLengths)) 
            : 0;

        // dd($averageLength, $averagePeriodLength);

        // Latest cycle start
        $latestCycle = $sorted->last();

        $predictedDate = Carbon::parse($latestCycle->start_date)
            ->addDays($averageLength);

        $predictedLastPeriodDate = $predictedDate
            ->copy()
            ->addDays($averagePeriodLength > 0 ? $averagePeriodLength - 1 : 0);
        
        // dd($averagePeriodLength, $averagePeriodLength > 0 ? $averagePeriodLength - 1 : 0);

        // dd($predictedDate, $predictedLastPeriodDate);

        // Ovulation
        $ovulationDate = $predictedDate->copy()->subDays(14);

        $fertileWindowStart = $ovulationDate->copy()->subDays(5);

        $fertileWindowEnd = $ovulationDate->copy();

        $pregnancyTestDate = $predictedDate->copy()->addDays(1);

        $ovulationDaysLeft = now()->startOfDay()
            ->diffInDays($ovulationDate, false);

        $daysLeft = now()->startOfDay()
            ->diffInDays($predictedDate, false);

        return [
            // Next Period
            'predicted_date' => $predictedDate->toDateString(),
            'predicted_last_period_date' => $predictedLastPeriodDate->toDateString(),
            'days_left' => $daysLeft,

            // Ovulation
            'ovulation_date' => $ovulationDate->toDateString(),
            'ovulation_days_left' => $ovulationDaysLeft,

            // Fertile Window
            'fertile_window_start' => $fertileWindowStart->toDateString(),
            'fertile_window_end' => $fertileWindowEnd->toDateString(),            

            // Meta
            'average_cycle_length' => $averageLength,

            // Pregnancy test
            'pregnancy_test_date' => $pregnancyTestDate->toDateString(),
        ];
    }
}