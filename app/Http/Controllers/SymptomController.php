<?php

namespace App\Http\Controllers;

use App\Models\Symptom;
use App\Services\DataAccessContextService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SymptomController extends Controller
{
    public function index()
    {
        return Inertia::render('symptoms/index');
    }

    public function store(
        Request $request,
        DataAccessContextService $dataAccessContextService
    ) {
        $context = $dataAccessContextService->resolve(
            $request->query('owner')
        );

        $owner = $context['owner'];
        $permissions = $context['permissions'];

        abort_unless($permissions['can_edit_symptoms'], 403);

        $validated = $request->validate([
            'date' => [
                'required',
                'date',
            ],
            'type' => [
                'required',
                'string',
                'max:100',
            ],
            'level' => [
                'required',
                'integer',
                'min:1',
                'max:5',
            ],
            'notes' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ]);

        Symptom::create([
            'user_id' => $owner->id,
            'created_by_user_id' => auth()->id(),
            'updated_by_user_id' => auth()->id(),
            'date' => $validated['date'],
            'type' => $validated['type'],
            'level' => $validated['level'],
            'notes' => $validated['notes'] ?? null,
        ]);

        return back();
    }

    public function update(
        Request $request,
        Symptom $symptom,
        DataAccessContextService $dataAccessContextService
    ) {
        $context = $dataAccessContextService->resolve(
            $request->query('owner')
        );

        $owner = $context['owner'];
        $permissions = $context['permissions'];

        abort_unless($permissions['can_edit_symptoms'], 403);
        abort_unless($symptom->user_id === $owner->id, 403);

        $validated = $request->validate([
            'type' => [
                'required',
                'string',
                'max:100',
            ],
            'level' => [
                'required',
                'integer',
                'min:1',
                'max:5',
            ],
            'notes' => [
                'nullable',
                'string',
                'max:1000',
            ],
        ]);

        $symptom->update([
            'type' => $validated['type'],
            'level' => $validated['level'],
            'notes' => $validated['notes'] ?? null,
            'updated_by_user_id' => auth()->id(),
        ]);

        return back();
    }

    public function destroy(
        Request $request,
        Symptom $symptom,
        DataAccessContextService $dataAccessContextService
    ) {
        $context = $dataAccessContextService->resolve(
            $request->query('owner')
        );

        $owner = $context['owner'];
        $permissions = $context['permissions'];

        abort_unless($permissions['can_edit_symptoms'], 403);
        abort_unless($symptom->user_id === $owner->id, 403);

        $symptom->delete();

        return back();
    }
}