<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use App\Services\CycleHistoryService;
use App\Services\CyclePredictionService;
use App\Services\DataAccessContextService;

class CalendarController extends Controller
{
    /**
     * Display the main calendar view.
     */
    public function index(
        Request $request,
        CycleHistoryService $historyService,
        CyclePredictionService $predictionService,
        DataAccessContextService $dataAccessContextService
    ) {
        $context = $dataAccessContextService->resolve(
            $request->query('owner')
        );

        $owner = $context['owner'];
        $permissions = $context['permissions'];

        $cycles = $owner->cycles()
            ->with([
                'createdBy:id,name,email',
                'updatedBy:id,name,email',
            ])
            ->orderBy('start_date')
            ->get();

        $bbtReadings = $owner->bbtReadings()
            ->with([
                'createdBy:id,name,email',
                'updatedBy:id,name,email',
            ])
            ->orderBy('date')
            ->get();

        $symptoms = $owner->symptoms()
            ->with([
                'createdBy:id,name,email',
                'updatedBy:id,name,email',
            ])
            ->orderBy('date')
            ->get();

        $calendarData = $historyService
            ->buildCalendarData(
                $cycles,
                $bbtReadings,
                $symptoms,
                $permissions
            );

        $prediction = $predictionService
            ->predictNextPeriod($cycles);

        return Inertia::render('calendar/index', [
            'cycles' => $permissions['can_view_cycles'] ? $cycles : [],
            'bbtReadings' => $permissions['can_view_bbt'] ? $bbtReadings : [],
            'symptoms' => $permissions['can_view_symptoms'] ? $symptoms : [],
            'calendarData' => $calendarData,
            'defaultMonth' => $prediction['predicted_period_date'] ?? now()->toDateString(),

            'cycleCount' => $cycles->count(),
            'canEditCycles' => $permissions['can_edit_cycles'],
        ]);
    }

    public function create()
    {
        //
    }

    public function store(Request $request)
    {
        //
    }

    public function update(Request $request, $id)
    {
        //
    }

    public function destroy($id)
    {
        //
    }
}