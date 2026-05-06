<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        // ✅ Get latest 7 readings across ALL cycles
        $readings = $user->bbtReadings()
            ->orderBy('date', 'desc')
            ->take(7)
            ->get();

        // (optional) still get latest cycle if you need it later
        $latestCycle = $user->cycles()->latest()->first();

        return Inertia::render('dashboard/index', [
            'readings' => $readings,
            'cycle' => $latestCycle, // optional
        ]);
    }
}