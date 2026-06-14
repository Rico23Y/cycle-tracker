<?php

namespace App\Http\Controllers;

use App\Models\Partner;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class PartnerController extends Controller
{
    public function index()
    {
        $partners = auth()->user()
            ->partners()
            ->with([
                'partnerUser:id,name,email',
                'requestedBy:id,name,email',
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        $sharedWithMe = auth()->user()
            ->sharedWithMe()
            ->with([
                'owner:id,name,email',
                'requestedBy:id,name,email',
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('partners/index', [
            'partners' => $partners,
            'sharedWithMe' => $sharedWithMe,
        ]);
    }

    public function create()
    {
        //
    }

    public function store(Request $request)
    {
        $requester = auth()->user();

        $validated = $request->validate([
            'request_type' => ['required', Rule::in([
                'share_mine',
                'request_theirs',
                'both',
            ])],

            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],

            'can_view_cycles' => ['nullable', 'boolean'],
            'can_edit_cycles' => ['nullable', 'boolean'],

            'can_view_bbt' => ['nullable', 'boolean'],
            'can_edit_bbt' => ['nullable', 'boolean'],

            'can_view_symptoms' => ['nullable', 'boolean'],
            'can_edit_symptoms' => ['nullable', 'boolean'],

            'can_view_predictions' => ['nullable', 'boolean'],
            'can_view_insights' => ['nullable', 'boolean'],
        ]);

        $targetUser = User::query()
            ->where('email', $validated['email'])
            ->first();

        if ($targetUser && $targetUser->id === $requester->id) {
            return back()->withErrors([
                'email' => 'You cannot create a sharing request with yourself.',
            ]);
        }

        if (
            in_array($validated['request_type'], ['request_theirs', 'both'], true) &&
            !$targetUser
        ) {
            return back()->withErrors([
                'email' => 'This user must have an account before you can request access to their data.',
            ]);
        }

        $permissions = $this->normalizePermissions($validated);

        DB::transaction(function () use ($validated, $requester, $targetUser, $permissions) {
            if (in_array($validated['request_type'], ['share_mine', 'both'], true)) {
                $this->createOrRenewPendingShare(
                    owner: $requester,
                    partnerUser: $targetUser,
                    partnerName: $validated['name'],
                    partnerEmail: $validated['email'],
                    requestedBy: $requester,
                    permissions: $permissions
                );
            }

            if (in_array($validated['request_type'], ['request_theirs', 'both'], true)) {
                $this->createOrRenewPendingShare(
                    owner: $targetUser,
                    partnerUser: $requester,
                    partnerName: $requester->name,
                    partnerEmail: $requester->email,
                    requestedBy: $requester,
                    permissions: $permissions
                );
            }
        });

        return back();
    }

    public function show(Partner $partner)
    {
        //
    }

    public function edit(Partner $partner)
    {
        //
    }

    public function update(Request $request, Partner $partner)
    {
        abort_unless($partner->owner_user_id === auth()->id(), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],

            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('partners', 'email')
                    ->where('owner_user_id', auth()->id())
                    ->ignore($partner->id),
            ],

            'status' => ['required', Rule::in([
                'pending',
                'active',
                'paused',
                'declined',
            ])],

            'can_view_cycles' => ['nullable', 'boolean'],
            'can_edit_cycles' => ['nullable', 'boolean'],

            'can_view_bbt' => ['nullable', 'boolean'],
            'can_edit_bbt' => ['nullable', 'boolean'],

            'can_view_symptoms' => ['nullable', 'boolean'],
            'can_edit_symptoms' => ['nullable', 'boolean'],

            'can_view_predictions' => ['nullable', 'boolean'],
            'can_view_insights' => ['nullable', 'boolean'],
        ]);

        $partnerUser = User::query()
            ->where('email', $validated['email'])
            ->first();

        if ($partnerUser && $partnerUser->id === auth()->id()) {
            return back()->withErrors([
                'email' => 'You cannot share cycle data with yourself.',
            ]);
        }

        $permissions = $this->normalizePermissions($validated);

        $partner->update([
            'partner_user_id' => $partnerUser?->id,

            'name' => $validated['name'],
            'email' => $validated['email'],
            'status' => $validated['status'],

            ...$permissions,
        ]);

        return back();
    }

    public function destroy(Partner $partner)
    {
        $userId = auth()->id();

        abort_unless(
            $partner->owner_user_id === $userId ||
            $partner->partner_user_id === $userId ||
            $partner->requested_by_user_id === $userId,
            403
        );

        $partner->delete();

        return back();
    }

    public function accept(Partner $partner)
    {
        abort_unless($this->canRespondToRequest($partner), 403);

        if ($partner->status !== 'pending') {
            return back();
        }

        $partner->update([
            'status' => 'active',
        ]);

        return back();
    }

    public function decline(Partner $partner)
    {
        $userId = auth()->id();

        if ($partner->status === 'pending') {
            abort_unless($this->canRespondToRequest($partner), 403);
        } else {
            abort_unless($partner->partner_user_id === $userId, 403);
        }

        if (!in_array($partner->status, ['pending', 'active'], true)) {
            return back();
        }

        $partner->update([
            'status' => 'declined',
        ]);

        return back();
    }

    private function createOrRenewPendingShare(
        User $owner,
        ?User $partnerUser,
        string $partnerName,
        string $partnerEmail,
        User $requestedBy,
        array $permissions
    ): Partner {
        $existing = Partner::query()
            ->where('owner_user_id', $owner->id)
            ->when(
                $partnerUser,
                fn ($query) => $query->where('partner_user_id', $partnerUser->id),
                fn ($query) => $query->where('email', $partnerEmail)
            )
            ->first();

        if ($existing) {
            $existing->update([
                'partner_user_id' => $partnerUser?->id,
                'requested_by_user_id' => $requestedBy->id,

                'name' => $partnerName,
                'email' => $partnerEmail,

                // Re-send request with updated permissions.
                'status' => 'pending',

                ...$permissions,
            ]);

            return $existing;
        }

        return Partner::create([
            'owner_user_id' => $owner->id,
            'partner_user_id' => $partnerUser?->id,
            'requested_by_user_id' => $requestedBy->id,

            'name' => $partnerName,
            'email' => $partnerEmail,
            'status' => 'pending',

            ...$permissions,
        ]);
    }

    private function canRespondToRequest(Partner $partner): bool
    {
        $userId = auth()->id();

        if (!$partner->requested_by_user_id) {
            return $partner->partner_user_id === $userId;
        }

        if ($partner->requested_by_user_id === $userId) {
            return false;
        }

        return $partner->owner_user_id === $userId ||
            $partner->partner_user_id === $userId;
    }

    private function normalizePermissions(array $validated): array
    {
        $canViewCycles = (bool) ($validated['can_view_cycles'] ?? false);
        $canViewBbt = (bool) ($validated['can_view_bbt'] ?? false);
        $canViewSymptoms = (bool) ($validated['can_view_symptoms'] ?? false);

        return [
            'can_view_cycles' => $canViewCycles,
            'can_edit_cycles' => $canViewCycles
                ? (bool) ($validated['can_edit_cycles'] ?? false)
                : false,

            'can_view_bbt' => $canViewBbt,
            'can_edit_bbt' => $canViewBbt
                ? (bool) ($validated['can_edit_bbt'] ?? false)
                : false,

            'can_view_symptoms' => $canViewSymptoms,
            'can_edit_symptoms' => $canViewSymptoms
                ? (bool) ($validated['can_edit_symptoms'] ?? false)
                : false,

            'can_view_predictions' => (bool) ($validated['can_view_predictions'] ?? false),
            'can_view_insights' => (bool) ($validated['can_view_insights'] ?? false),
        ];
    }
}