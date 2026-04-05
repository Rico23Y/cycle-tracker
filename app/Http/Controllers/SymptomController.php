<?php

namespace App\Http\Controllers;

use App\Models\Symptom;
use App\Http\Requests\StoreSymptomRequest;
use App\Http\Requests\UpdateSymptomRequest;

class SymptomController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        //
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
    public function store(StoreSymptomRequest $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(Symptom $symptom)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Symptom $symptom)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateSymptomRequest $request, Symptom $symptom)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Symptom $symptom)
    {
        //
    }
}
