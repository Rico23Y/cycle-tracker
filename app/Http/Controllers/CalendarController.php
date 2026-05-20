<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Request;
use App\Services\CyclePredictionService;
use App\Services\CycleHistoryService;

class CalendarController extends Controller
{
    /**
     * Display the main calendar view.
     * This is what loads when you visit /calendar
     */
    public function index(
        CyclePredictionService $predictionService,
        CycleHistoryService $historyService
    )
    {
        $user = auth()->user();

        $cycles = $user->cycles()
            ->orderBy('start_date')
            ->get();

        $bbtReadings = $user->bbtReadings()->get();

        $symptoms = $user->symptoms()->get();

        /*
        |--------------------------------------------------------------------------
        | Dashboard-style prediction
        |--------------------------------------------------------------------------
        */

        $nextPeriod = $predictionService
            ->predictNextPeriod($cycles);

        /*
        |--------------------------------------------------------------------------
        | Full calendar computed history
        |--------------------------------------------------------------------------
        */

        $calendarData = $historyService
            ->buildCalendarData($cycles);

        // dd($calendarData);

        return Inertia::render('calendar/index', [
            'cycles' => $cycles,
            'bbtReadings' => $bbtReadings,
            'symptoms' => $symptoms,

            // Small summary prediction
            'nextPeriod' => $nextPeriod,

            // Full computed calendar
            'calendarData' => $calendarData,
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