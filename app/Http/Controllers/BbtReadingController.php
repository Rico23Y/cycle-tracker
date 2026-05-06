<?php

namespace App\Http\Controllers;

use App\Models\BbtReading;
use App\Models\Cycle;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use App\Http\Requests\StoreBbtReadingRequest;
use App\Http\Requests\UpdateBbtReadingRequest;
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
     * Show the form for creating a new resource.
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
        $request->validate([
            'temperature' => 'required|numeric',
            'date' => 'required|date',
        ]);

        $user = auth()->user();
        $date = Carbon::parse($request->date);

        // ✅ STEP 1: Find correct cycle FIRST
        $cycle = $user->cycles()
            ->where('start_date', '<=', $date)
            ->where(function ($query) use ($date) {
                $query->where('end_date', '>=', $date)
                    ->orWhereNull('end_date');
            })
            ->latest()
            ->first();

        // ❗ Safety check
        if (!$cycle) {
            return back()->withErrors([
                'date' => 'No cycle found for this date.',
            ]);
        }

        // ✅ STEP 2: Check duplicate AFTER cycle exists
        $exists = $cycle->bbtReadings()
            ->whereDate('date', $date) // 🔥 important fix
            ->exists();

        if ($exists) {
            return back()->withErrors([
                'date' => 'Temperature already logged for this date.',
            ]);
        }

        // ✅ STEP 3: Save
        $cycle->bbtReadings()->create([
            'user_id' => $user->id,
            'date' => $date,
            'temperature' => $request->temperature,
            'unit' => 'C',
        ]);

        return back();
    }

    /**
     * Display the specified resource.
     */
    public function show(BbtReading $bbtReading)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(BbtReading $bbtReading)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateBbtReadingRequest $request, BbtReading $bbtReading)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(BbtReading $bbtReading)
    {
        //
    }
}
