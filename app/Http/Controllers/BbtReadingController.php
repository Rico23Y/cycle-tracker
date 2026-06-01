<?php

namespace App\Http\Controllers;

use App\Models\BbtReading;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BbtReadingController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Inertia::render('bbt/index');
    }

    /**
     * Store a newly created BBT reading.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'date' => [
                'required',
                'date',
            ],
            'temperature' => [
                'required',
                'numeric',
                'between:30,45',
            ],
        ]);

        $exists = auth()->user()
            ->bbtReadings()
            ->whereDate('date', $validated['date'])
            ->exists();

        if ($exists) {
            return back()->withErrors([
                'temperature' => 'Temperature already logged for this date.',
            ]);
        }

        auth()->user()->bbtReadings()->create([
            'date' => $validated['date'],
            'temperature' => $validated['temperature'],
        ]);

        return back();
    }

    /**
     * Update an existing BBT reading.
     */
    public function update(Request $request, BbtReading $bbt)
    {
        abort_unless($bbt->user_id === auth()->id(), 403);

        $validated = $request->validate([
            'temperature' => [
                'required',
                'numeric',
                'between:30,45',
            ],
        ]);

        $bbt->update([
            'temperature' => $validated['temperature'],
        ]);

        return back();
    }

    /**
     * Remove an existing BBT reading.
     */
    public function destroy(BbtReading $bbt)
    {
        abort_unless($bbt->user_id === auth()->id(), 403);

        $bbt->delete();

        return back();
    }
}