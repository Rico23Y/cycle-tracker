<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Request;

class CalendarController extends Controller
{
    /**
     * Display the main calendar view.
     * This is what loads when you visit /calendar
     */
    public function index()
    {
        $user = auth()->user();

        $cycles = $user->cycles()
            ->with(['bbtReadings', 'symptoms'])
            ->get();

        dd($cycles->toArray());

        return Inertia::render('calendar/index', [
            'cycles' => $cycles,
        ]);
    }

    /** 
     * Show the form for creating a new calendar event.
     */
    public function create() 
    {
        // For Inertia, you usually handle this with a Modal on the index page,
        // but the method needs to exist if you're using resource.
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Logic to save a new cycle/event
    }

    /**
     * Update the specified resource in storage (e.g., changing a date).
     */
    public function update(Request $request, $id)
    {
        // Logic to update the cycle dates
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        // Logic to delete a cycle
    }
}
