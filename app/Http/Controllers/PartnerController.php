<?php

namespace App\Http\Controllers;

use App\Models\Partner;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class PartnerController extends Controller
{
    public function index()
    {
        $partners = auth()->user()
            ->partners()
            ->with('partnerUser:id,name,email')
            ->orderBy('created_at', 'desc')
            ->get();

        $sharedWithMe = auth()->user()
            ->sharedWithMe()
            ->with('owner:id,name,email')
            ->where('status', 'active')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('partners/index', [
            'partners' => $partners,
            'sharedWithMe' => $sharedWithMe,
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
                    ->where('owner_user_id', auth()->id()),
            ],

            'status' => [
                'nullable',
                'string',
                'in:active,pending,paused,declined',
            ],

            'can_view_cycles' => ['boolean'],
            'can_edit_cycles' => ['boolean'],

            'can_view_bbt' => ['boolean'],
            'can_edit_bbt' => ['boolean'],

            'can_view_symptoms' => ['boolean'],
            'can_edit_symptoms' => ['boolean'],

            'can_view_predictions' => ['boolean'],
            'can_view_insights' => ['boolean'],
        ]);

        $partnerUser = null;

        if (!empty($validated['email'])) {
            $partnerUser = User::where('email', $validated['email'])
                ->first();

            if ($partnerUser && $partnerUser->id === auth()->id()) {
                return back()->withErrors([
                    'email' => 'You cannot add yourself as a partner.',
                ]);
            }
        }

        $canViewCycles = $validated['can_view_cycles'] ?? true;
        $canViewBbt = $validated['can_view_bbt'] ?? false;
        $canViewSymptoms = $validated['can_view_symptoms'] ?? false;

        auth()->user()->partners()->create([
            'owner_user_id' => auth()->id(),
            'partner_user_id' => $partnerUser?->id,

            'name' => $validated['name'],
            'email' => $validated['email'] ?? null,

            'status' => $validated['status'] ?? 'active',

            'can_view_cycles' => $canViewCycles,
            'can_edit_cycles' => $canViewCycles
                ? ($validated['can_edit_cycles'] ?? false)
                : false,

            'can_view_bbt' => $canViewBbt,
            'can_edit_bbt' => $canViewBbt
                ? ($validated['can_edit_bbt'] ?? false)
                : false,

            'can_view_symptoms' => $canViewSymptoms,
            'can_edit_symptoms' => $canViewSymptoms
                ? ($validated['can_edit_symptoms'] ?? false)
                : false,

            'can_view_predictions' => $validated['can_view_predictions'] ?? true,
            'can_view_insights' => $validated['can_view_insights'] ?? false,
        ]);

        return back();
    }

    public function update(Request $request, Partner $partner)
    {
        abort_unless($partner->owner_user_id === auth()->id(), 403);

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
                    ->where('owner_user_id', auth()->id())
                    ->ignore($partner->id),
            ],

            'status' => [
                'required',
                'string',
                'in:active,pending,paused,declined',
            ],

            'can_view_cycles' => ['boolean'],
            'can_edit_cycles' => ['boolean'],

            'can_view_bbt' => ['boolean'],
            'can_edit_bbt' => ['boolean'],

            'can_view_symptoms' => ['boolean'],
            'can_edit_symptoms' => ['boolean'],

            'can_view_predictions' => ['boolean'],
            'can_view_insights' => ['boolean'],
        ]);

        $partnerUser = null;

        if (!empty($validated['email'])) {
            $partnerUser = User::where('email', $validated['email'])
                ->first();

            if ($partnerUser && $partnerUser->id === auth()->id()) {
                return back()->withErrors([
                    'email' => 'You cannot add yourself as a partner.',
                ]);
            }
        }

        $canViewCycles = $validated['can_view_cycles'] ?? false;
        $canViewBbt = $validated['can_view_bbt'] ?? false;
        $canViewSymptoms = $validated['can_view_symptoms'] ?? false;

        $partner->update([
            'partner_user_id' => $partnerUser?->id,

            'name' => $validated['name'],
            'email' => $validated['email'] ?? null,

            'status' => $validated['status'],

            'can_view_cycles' => $canViewCycles,
            'can_edit_cycles' => $canViewCycles
                ? ($validated['can_edit_cycles'] ?? false)
                : false,

            'can_view_bbt' => $canViewBbt,
            'can_edit_bbt' => $canViewBbt
                ? ($validated['can_edit_bbt'] ?? false)
                : false,

            'can_view_symptoms' => $canViewSymptoms,
            'can_edit_symptoms' => $canViewSymptoms
                ? ($validated['can_edit_symptoms'] ?? false)
                : false,

            'can_view_predictions' => $validated['can_view_predictions'] ?? false,
            'can_view_insights' => $validated['can_view_insights'] ?? false,
        ]);

        return back();
    }

    public function destroy(Partner $partner)
    {
        abort_unless($partner->owner_user_id === auth()->id(), 403);

        $partner->delete();

        return back();
    }
}