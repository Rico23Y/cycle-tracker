<?php

namespace App\Http\Controllers;

use App\Models\Insight;
use App\Http\Requests\StoreInsightRequest;
use App\Http\Requests\UpdateInsightRequest;
use App\Services\InsightService;
use Inertia\Inertia;

class InsightController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(InsightService $insightService)
    {
        $user = auth()->user();

        $cycles = $user->cycles()
            ->orderBy('start_date')
            ->get();

        $insights = $insightService
            ->buildInsights($cycles);

        return Inertia::render('insights/index', [
            'insights' => $insights,
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
