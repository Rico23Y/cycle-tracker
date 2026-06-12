<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Services\CyclePredictionService;
use App\Services\DataAccessContextService;

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

        $cycles = $owner->cycles()
            ->orderBy('start_date')
            ->get();

        $nextPeriod = $permissions['can_view_predictions']
            ? $predictionService->predictNextPeriod($cycles)
            : null;

        return Inertia::render('dashboard/index', [
            'readings' => $readings,
            'nextPeriod' => $nextPeriod,

            'bbtLocked' => ! $permissions['can_view_bbt'],
            'predictionsLocked' => ! $permissions['can_view_predictions'],
            'canEditBbt' => $permissions['can_edit_bbt'],
        ]);
    }
}