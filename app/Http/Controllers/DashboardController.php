<?php

namespace App\Http\Controllers;

use App\Services\CyclePredictionService;
use App\Services\DataAccessContextService;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(
        Request $request,
        CyclePredictionService $predictionService,
        DataAccessContextService $dataAccessContextService
    ) {
        $context = $dataAccessContextService->resolve(
            $request->query('owner')
        );

        $owner = $context['owner'];
        $permissions = $context['permissions'];

        $readings = $permissions['can_view_bbt']
            ? $owner->bbtReadings()
                ->orderBy('date', 'desc')
                ->take(60)
                ->get()
            : collect();

        $symptoms = $permissions['can_view_symptoms']
            ? $owner->symptoms()
                ->orderBy('date', 'desc')
                ->take(60)
                ->get()
            : collect();

        $cycles = $owner->cycles()
            ->orderBy('start_date')
            ->get();

        $nextPeriod = $permissions['can_view_predictions']
            ? $predictionService->predictNextPeriod($cycles)
            : null;

        return Inertia::render('dashboard/index', [
            'readings' => $readings,
            'nextPeriod' => $nextPeriod,

            'dashboardSummary' => $this->buildDashboardSummary(
                cycles: $cycles,
                readings: $readings,
                symptoms: $symptoms,
                nextPeriod: $nextPeriod,
                permissions: $permissions
            ),

            'recentActivity' => $this->buildRecentActivity(
                cycles: $cycles,
                readings: $readings,
                symptoms: $symptoms,
                permissions: $permissions
            ),

            'cycleCount' => $cycles->count(),
            'canEditCycles' => $permissions['can_edit_cycles'],

            'bbtLocked' => ! $permissions['can_view_bbt'],
            'predictionsLocked' => ! $permissions['can_view_predictions'],
            'canEditBbt' => $permissions['can_edit_bbt'],
        ]);
    }

    private function buildDashboardSummary(
        Collection $cycles,
        Collection $readings,
        Collection $symptoms,
        ?array $nextPeriod,
        array $permissions
    ): array {
        $latestCycle = $cycles->last();

        $latestCycleStartDate = $latestCycle
            ? Carbon::parse($latestCycle->start_date)
            : null;

        $today = now()->startOfDay();

        $currentCycleDay = null;

        if ($latestCycleStartDate && $today->gte($latestCycleStartDate)) {
            $currentCycleDay = $latestCycleStartDate->diffInDays($today) + 1;
        }

        $estimatedCycleLength = $nextPeriod['average_cycle_length']
            ?? $this->averageCycleLength($cycles);

        $cycleProgressPercent = null;

        if ($currentCycleDay && $estimatedCycleLength) {
            $cycleProgressPercent = min(
                100,
                round(($currentCycleDay / $estimatedCycleLength) * 100)
            );
        }

        $latestBbt = $permissions['can_view_bbt']
            ? $readings->first()
            : null;

        $latestSymptom = $permissions['can_view_symptoms']
            ? $symptoms->first()
            : null;

        return [
            'current_cycle_day' => $currentCycleDay,
            'estimated_cycle_length' => $estimatedCycleLength,
            'cycle_progress_percent' => $cycleProgressPercent,
            'current_phase' => $this->currentPhase(
                nextPeriod: $nextPeriod,
                permissions: $permissions
            ),
            'latest_cycle_start_date' => $latestCycle
                ? Carbon::parse($latestCycle->start_date)->toDateString()
                : null,

            'latest_bbt' => $latestBbt
                ? [
                    'date' => Carbon::parse($latestBbt->date)->toDateString(),
                    'temperature' => (float) $latestBbt->temperature,
                ]
                : null,

            'latest_symptom' => $latestSymptom
                ? [
                    'date' => Carbon::parse($latestSymptom->date)->toDateString(),
                    'type' => $latestSymptom->type,
                    'level' => (int) $latestSymptom->level,
                ]
                : null,
        ];
    }

    private function buildRecentActivity(
        Collection $cycles,
        Collection $readings,
        Collection $symptoms,
        array $permissions
    ): array {
        $items = collect();

        $cycles
            ->sortByDesc('start_date')
            ->take(5)
            ->each(function ($cycle) use ($items) {
                $items->push([
                    'type' => 'cycle',
                    'label' => 'Day One logged',
                    'date' => Carbon::parse($cycle->start_date)->toDateString(),
                ]);
            });

        if ($permissions['can_view_bbt']) {
            $readings
                ->take(5)
                ->each(function ($reading) use ($items) {
                    $items->push([
                        'type' => 'bbt',
                        'label' => 'BBT logged',
                        'date' => Carbon::parse($reading->date)->toDateString(),
                    ]);
                });
        }

        if ($permissions['can_view_symptoms']) {
            $symptoms
                ->take(5)
                ->each(function ($symptom) use ($items) {
                    $items->push([
                        'type' => 'symptom',
                        'label' => $symptom->type . ' ' . str_repeat('★', (int) $symptom->level),
                        'date' => Carbon::parse($symptom->date)->toDateString(),
                    ]);
                });
        }

        return $items
            ->sortByDesc('date')
            ->take(6)
            ->values()
            ->all();
    }

    private function averageCycleLength(Collection $cycles): ?int
    {
        if ($cycles->count() < 2) {
            return null;
        }

        $sorted = $cycles
            ->sortBy('start_date')
            ->values();

        $lengths = [];

        for ($i = 1; $i < $sorted->count(); $i++) {
            $previous = Carbon::parse($sorted[$i - 1]->start_date);
            $current = Carbon::parse($sorted[$i]->start_date);

            $lengths[] = $previous->diffInDays($current);
        }

        if (count($lengths) === 0) {
            return null;
        }

        $recentLengths = array_slice(
            $lengths,
            count($lengths) >= 6 ? -6 : -count($lengths)
        );

        return (int) round(
            array_sum($recentLengths) / count($recentLengths)
        );
    }

    private function currentPhase(
        ?array $nextPeriod,
        array $permissions
    ): string {
        if (! $permissions['can_view_predictions']) {
            return 'Predictions locked';
        }

        if (! $nextPeriod) {
            return 'Tracking started';
        }

        $today = now()->startOfDay();

        if (
            $this->dateBetween(
                today: $today,
                start: $nextPeriod['current_period_start_date'],
                end: $nextPeriod['current_period_end_date']
            )
        ) {
            return 'Period';
        }

        if (
            $today->isSameDay(
                Carbon::parse($nextPeriod['ovulation_date'])
            )
        ) {
            return 'Ovulation';
        }

        if (
            $this->dateBetween(
                today: $today,
                start: $nextPeriod['fertile_window_start'],
                end: $nextPeriod['fertile_window_end']
            )
        ) {
            return 'Fertile window';
        }

        if (
            isset($nextPeriod['days_left']) &&
            $nextPeriod['days_left'] >= 0 &&
            $nextPeriod['days_left'] <= 3
        ) {
            return 'Period soon';
        }

        if (
            isset($nextPeriod['ovulation_days_left']) &&
            $nextPeriod['ovulation_days_left'] < 0
        ) {
            return 'Luteal phase';
        }

        return 'Cycle tracking';
    }

    private function dateBetween(
        CarbonInterface $today,
        string $start,
        string $end
    ): bool {
        return $today->betweenIncluded(
            Carbon::parse($start),
            Carbon::parse($end)
        );
    }
}