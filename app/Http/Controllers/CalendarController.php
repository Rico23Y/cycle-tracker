<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Request;
use App\Services\CycleHistoryService;
use App\Services\CyclePredictionService;

class CalendarController extends Controller
{
    /**
     * Display the main calendar view.
     * This is what loads when you visit /calendar
     */
    public function index(
        CycleHistoryService $historyService,
        CyclePredictionService $predictionService
    )
    {
        $user = auth()->user();

        $cycles = $user->cycles()
            ->orderBy('start_date')
            ->get();

        $bbtReadings = $user->bbtReadings()->get();

        $symptoms = $user->symptoms()->get();

        $calendarData = $historyService
            ->buildCalendarData(
                $cycles,
                $bbtReadings,
                $symptoms
            );

        $prediction = $predictionService
            ->predictNextPeriod($cycles);

        return Inertia::render('calendar/index', [
            'cycles' => $cycles,
            'bbtReadings' => $bbtReadings,
            'symptoms' => $symptoms,
            'calendarData' => $calendarData,

            // Used only for initial calendar month
            'defaultMonth' => $prediction['predicted_period_date'] ?? now()->toDateString(),
        ]);
    }

    /** 
     * Show the form for creating a new calendar event.
     */
    public function create() 
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        //
    }
}