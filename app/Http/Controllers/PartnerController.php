<?php

namespace App\Http\Controllers;

use App\Models\Partner;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Validation\Rule;

class PartnerController extends Controller
{
    public function index()
    {
        $partners = auth()->user()
            ->partners()
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('partners/index', [
            'partners' => $partners,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
            ],
            'email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('partners', 'email')
                    ->where('user_id', auth()->id()),
            ],
            'can_view_cycles' => [
                'boolean',
            ],
            'can_view_bbt' => [
                'boolean',
            ],
            'can_view_symptoms' => [
                'boolean',
            ],
            'can_view_predictions' => [
                'boolean',
            ],
            'can_view_insights' => [
                'boolean',
            ],
        ]);

        auth()->user()->partners()->create([
            'name' => $validated['name'],
            'email' => $validated['email'] ?? null,
            'status' => 'active',
            'can_view_cycles' => $validated['can_view_cycles'] ?? true,
            'can_view_bbt' => $validated['can_view_bbt'] ?? false,
            'can_view_symptoms' => $validated['can_view_symptoms'] ?? false,
            'can_view_predictions' => $validated['can_view_predictions'] ?? true,
            'can_view_insights' => $validated['can_view_insights'] ?? false,
        ]);

        return back();
    }

    public function update(Request $request, Partner $partner)
    {
        abort_unless($partner->user_id === auth()->id(), 403);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
            ],
            'email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('partners', 'email')
                    ->where('user_id', auth()->id())
                    ->ignore($partner->id),
            ],
            'status' => [
                'required',
                'string',
                'in:active,paused',
            ],
            'can_view_cycles' => [
                'boolean',
            ],
            'can_view_bbt' => [
                'boolean',
            ],
            'can_view_symptoms' => [
                'boolean',
            ],
            'can_view_predictions' => [
                'boolean',
            ],
            'can_view_insights' => [
                'boolean',
            ],
        ]);

        $partner->update([
            'name' => $validated['name'],
            'email' => $validated['email'] ?? null,
            'status' => $validated['status'],
            'can_view_cycles' => $validated['can_view_cycles'] ?? false,
            'can_view_bbt' => $validated['can_view_bbt'] ?? false,
            'can_view_symptoms' => $validated['can_view_symptoms'] ?? false,
            'can_view_predictions' => $validated['can_view_predictions'] ?? false,
            'can_view_insights' => $validated['can_view_insights'] ?? false,
        ]);

        return back();
    }

    public function destroy(Partner $partner)
    {
        abort_unless($partner->user_id === auth()->id(), 403);

        $partner->delete();

        return back();
    }
}