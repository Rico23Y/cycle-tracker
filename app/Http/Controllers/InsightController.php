<?php

namespace App\Http\Controllers;

use App\Models\Insight;
use App\Http\Requests\StoreInsightRequest;
use App\Http\Requests\UpdateInsightRequest;
use App\Services\InsightService;
use App\Services\DataAccessContextService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class InsightController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(
        Request $request,
        InsightService $insightService,
        DataAccessContextService $dataAccessContextService
    ) {
        $context = $dataAccessContextService->resolve(
            $request->query('owner')
        );

        $owner = $context['owner'];
        $permissions = $context['permissions'];

        if (
            !$permissions['can_view_insights'] ||
            !$permissions['can_view_cycles']
        ) {
            return Inertia::render('insights/index', [
                'insights' => [
                    'ranges' => [],
                ],
                'insightsLocked' => true,
                'lockReason' => !$permissions['can_view_insights']
                    ? 'The owner has not allowed access to insights.'
                    : 'Insights require access to cycle records.',
            ]);
        }

        $cycles = $owner->cycles()
            ->orderBy('start_date')
            ->get();

        $insights = $insightService
            ->buildInsights($cycles);

        return Inertia::render('insights/index', [
            'insights' => $insights,
            'insightsLocked' => false,
            'lockReason' => null,
        ]);
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
    public function store(StoreInsightRequest $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(Insight $insight)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Insight $insight)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateInsightRequest $request, Insight $insight)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Insight $insight)
    {
        //
    }
}