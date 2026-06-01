<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Services\CyclePredictionService;

class DashboardController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        $readings = $user->bbtReadings()
            ->orderBy('date', 'desc')
            ->take(60)
            ->get();

        $cycles = $user->cycles()
            ->orderBy('start_date')
            ->get();

        $predictionService = new CyclePredictionService();

        $nextPeriod = $predictionService
            ->predictNextPeriod($cycles);

        return Inertia::render('dashboard/index', [
            'readings' => $readings,
            'nextPeriod' => $nextPeriod,
        ]);
    }
}