<?php

namespace App\Http\Controllers;

use App\Models\BbtReading;
use App\Services\BbtTimelineService;
use App\Services\DataAccessContextService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class BbtReadingController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(
        Request $request,
        BbtTimelineService $timelineService,
        DataAccessContextService $dataAccessContextService
    ) {
        $context = $dataAccessContextService->resolve($request->query('owner'));

        $owner = $context['owner'];
        $permissions = $context['permissions'];

        $cycles = $owner->cycles()
            ->orderBy('start_date')
            ->get();

        if (!$permissions['can_view_bbt']) {
            return Inertia::render('bbt/index', [
                'timelines' => [],
                'readings' => [],
                'cycleCount' => $cycles->count(),
                'bbtLocked' => true,
            ]);
        }

        $bbtReadings = $owner->bbtReadings()
            ->orderBy('date')
            ->get();

        $timelines = $timelineService->buildTimelines(
            $cycles,
            $bbtReadings
        );

        return Inertia::render('bbt/index', [
            'timelines' => $timelines,
            'readings' => $bbtReadings,
            'cycleCount' => $cycles->count(),
            'bbtLocked' => false,
        ]);
    }

    /**
     * Store a newly created BBT reading.
     */
    public function store(
        Request $request,
        DataAccessContextService $dataAccessContextService
    ) {
        $context = $dataAccessContextService->resolve($request->query('owner'));

        $owner = $context['owner'];
        $permissions = $context['permissions'];

        abort_unless($permissions['can_edit_bbt'], 403);

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

        $exists = $owner
            ->bbtReadings()
            ->whereDate('date', $validated['date'])
            ->exists();

        if ($exists) {
            return back()->withErrors([
                'temperature' => 'Temperature already logged for this date.',
            ]);
        }

        BbtReading::create([
            'user_id' => $owner->id,
            'created_by_user_id' => auth()->id(),
            'updated_by_user_id' => auth()->id(),
            'date' => $validated['date'],
            'temperature' => $validated['temperature'],
        ]);

        return back();
    }

    /**
     * Update an existing BBT reading.
     */
    public function update(
        Request $request,
        BbtReading $bbt,
        DataAccessContextService $dataAccessContextService
    ) {
        $context = $dataAccessContextService->resolve($request->query('owner'));

        $owner = $context['owner'];
        $permissions = $context['permissions'];

        abort_unless($permissions['can_edit_bbt'], 403);
        abort_unless($bbt->user_id === $owner->id, 403);

        $validated = $request->validate([
            'temperature' => [
                'required',
                'numeric',
                'between:30,45',
            ],
        ]);

        $bbt->update([
            'temperature' => $validated['temperature'],
            'updated_by_user_id' => auth()->id(),
        ]);

        return back();
    }

    /**
     * Remove an existing BBT reading.
     */
    public function destroy(
        Request $request,
        BbtReading $bbt,
        DataAccessContextService $dataAccessContextService
    ) {
        $context = $dataAccessContextService->resolve($request->query('owner'));

        $owner = $context['owner'];
        $permissions = $context['permissions'];

        abort_unless($permissions['can_edit_bbt'], 403);
        abort_unless($bbt->user_id === $owner->id, 403);

        $bbt->delete();

        return back();
    }
}