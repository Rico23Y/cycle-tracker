<?php

namespace App\Http\Controllers;

use App\Models\Cycle;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Services\CycleTimelineService;
use App\Services\DataAccessContextService;
use Inertia\Inertia;
use Carbon\Carbon;

class CycleController extends Controller
{
    public function index(
        Request $request,
        CycleTimelineService $timelineService,
        DataAccessContextService $dataAccessContextService
    ) {
        $context = $dataAccessContextService->resolve(
            $request->query('owner')
        );

        $owner = $context['owner'];
        $permissions = $context['permissions'];

        if (!$permissions['can_view_cycles']) {
            return Inertia::render('cycles/index', [
                'timelines' => [],
                'cycleLocked' => true,
            ]);
        }

        $cycles = $owner->cycles()
            ->orderBy('start_date')
            ->get();

        $symptoms = $permissions['can_view_symptoms']
            ? $owner->symptoms()->orderBy('date')->get()
            : collect();

        $timelines = $timelineService
            ->buildTimelines(
                $cycles,
                $symptoms
            );

        return Inertia::render('cycles/index', [
            'timelines' => $timelines,
            'cycleLocked' => false,
        ]);
    }

    public function create()
    {
        //
    }

    /**
     * Store a newly created cycle.
     *
     * Used when converting predicted Day One into an actual period.
     */
    public function store(
        Request $request,
        DataAccessContextService $dataAccessContextService
    ) {
        $context = $dataAccessContextService->resolve(
            $request->query('owner')
        );

        $owner = $context['owner'];
        $permissions = $context['permissions'];

        abort_unless($permissions['can_edit_cycles'], 403);

        $validated = $request->validate([
            'start_date' => [
                'required',
                'date',
                Rule::unique('cycles', 'start_date')
                    ->where('user_id', $owner->id),
            ],
            'period_length' => [
                'nullable',
                'integer',
                'min:1',
                'max:15',
            ],
        ], [
            'start_date.unique' => 'This date already has an existing period start.',
        ]);

        Cycle::create([
            'user_id' => $owner->id,
            'created_by_user_id' => auth()->id(),
            'updated_by_user_id' => auth()->id(),
            'start_date' => $validated['start_date'],
            'period_length' => $validated['period_length'] ?? null,
        ]);

        return back();
    }

    public function show(Cycle $cycle)
    {
        //
    }

    public function edit(Cycle $cycle)
    {
        //
    }

    /**
     * Update an existing cycle.
     *
     * Used for:
     * - moving Day One
     * - updating period end / period_length
     */
    public function update(
        Request $request,
        Cycle $cycle,
        DataAccessContextService $dataAccessContextService
    ) {
        $context = $dataAccessContextService->resolve(
            $request->query('owner')
        );

        $owner = $context['owner'];
        $permissions = $context['permissions'];

        abort_unless($permissions['can_edit_cycles'], 403);
        abort_unless($cycle->user_id === $owner->id, 403);

        $validated = $request->validate([
            'start_date' => [
                'nullable',
                'date',
                Rule::unique('cycles', 'start_date')
                    ->where('user_id', $owner->id)
                    ->ignore($cycle->id),
            ],
            'period_end_date' => [
                'nullable',
                'date',
            ],
            'clear_period_length' => [
                'nullable',
                'boolean',
            ],
        ], [
            'start_date.unique' => 'This date already has an existing period start.',
        ]);

        /*
        |--------------------------------------------------------------------------
        | Move Day One
        |--------------------------------------------------------------------------
        */
        if (!empty($validated['start_date'])) {
            $cycle->update([
                'start_date' => $validated['start_date'],
                'updated_by_user_id' => auth()->id(),
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Clear Period Length
        |--------------------------------------------------------------------------
        | This removes the confirmed period end date but keeps Day One.
        |--------------------------------------------------------------------------
        */
        if (!empty($validated['clear_period_length'])) {
            $cycle->update([
                'period_length' => null,
                'updated_by_user_id' => auth()->id(),
            ]);

            return back();
        }

        /*
        |--------------------------------------------------------------------------
        | Update Period Length
        |--------------------------------------------------------------------------
        */
        if (!empty($validated['period_end_date'])) {
            $startDate = Carbon::parse($cycle->start_date);
            $endDate = Carbon::parse($validated['period_end_date']);

            if ($endDate->lt($startDate)) {
                return back()->withErrors([
                    'period_end_date' => 'Period end date cannot be before Day One.',
                ]);
            }

            $periodLength = $startDate->diffInDays($endDate) + 1;

            if ($periodLength > 15) {
                return back()->withErrors([
                    'period_end_date' => 'Period length looks too long. Please check the selected date.',
                ]);
            }

            $cycle->update([
                'period_length' => $periodLength,
                'updated_by_user_id' => auth()->id(),
            ]);
        }

        return back();
    }

    public function destroy(
        Request $request,
        Cycle $cycle,
        DataAccessContextService $dataAccessContextService
    ) {
        $context = $dataAccessContextService->resolve(
            $request->query('owner')
        );

        $owner = $context['owner'];
        $permissions = $context['permissions'];

        abort_unless($permissions['can_edit_cycles'], 403);
        abort_unless($cycle->user_id === $owner->id, 403);

        $latestCycle = $owner->cycles()
            ->orderBy('start_date', 'desc')
            ->first();

        if (!$latestCycle || $latestCycle->id !== $cycle->id) {
            return back()->withErrors([
                'cycle' => 'Only the latest period record can be deleted.',
            ]);
        }

        $cycle->delete();

        return back();
    }
}