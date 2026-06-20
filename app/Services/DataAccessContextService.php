<?php

namespace App\Services;

use App\Models\Partner;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class DataAccessContextService
{
    public function resolve(?string $ownerKey = null): array
    {
        /** @var User $viewer */
        $viewer = Auth::user();

        $ownerKey = $ownerKey ?: 'me';

        if ($ownerKey === 'me') {
            return $this->selfContext($viewer);
        }

        if (!str_starts_with($ownerKey, 'partner:')) {
            return $this->selfContext($viewer);
        }

        $shareId = (int) str_replace('partner:', '', $ownerKey);

        $share = Partner::query()
            ->with('owner:id,name,email,avatar')
            ->where('id', $shareId)
            ->where('partner_user_id', $viewer->id)
            ->where('status', 'active')
            ->first();

        if (!$share || !$share->owner) {
            return $this->selfContext($viewer);
        }

        return [
            'owner' => $share->owner,
            'owner_key' => 'partner:' . $share->id,
            'owner_label' => $share->owner->name . "'s Data",
            'owner_name' => $share->owner->name,
            'owner_email' => $share->owner->email,
            'owner_avatar_url' => $share->owner->avatar_url,
            'is_self' => false,
            'share' => $share,
            'permissions' => $this->permissionsFromShare($share),
            'available_owners' => $this->availableOwners($viewer, 'partner:' . $share->id),
        ];
    }

    public function sharedProps(?string $ownerKey = null): array
    {
        $context = $this->resolve($ownerKey);

        return [
            'owner_key' => $context['owner_key'],
            'owner_label' => $context['owner_label'],
            'owner_name' => $context['owner_name'],
            'owner_email' => $context['owner_email'],
            'owner_avatar_url' => $context['owner_avatar_url'],
            'is_self' => $context['is_self'],
            'permissions' => $context['permissions'],
            'available_owners' => $context['available_owners'],
        ];
    }

    private function selfContext(User $viewer): array
    {
        return [
            'owner' => $viewer,
            'owner_key' => 'me',
            'owner_label' => 'My Data',
            'owner_name' => $viewer->name,
            'owner_email' => $viewer->email,
            'owner_avatar_url' => $viewer->avatar_url,
            'is_self' => true,
            'share' => null,
            'permissions' => $this->selfPermissions(),
            'available_owners' => $this->availableOwners($viewer, 'me'),
        ];
    }

    private function availableOwners(User $viewer, string $selectedKey): array
    {
        $owners = [
            [
                'key' => 'me',
                'label' => 'My Data',
                'name' => $viewer->name,
                'email' => $viewer->email,
                'avatar_url' => $viewer->avatar_url,
                'is_selected' => $selectedKey === 'me',
            ],
        ];

        $sharedWithMe = $viewer->sharedWithMe()
            ->with('owner:id,name,email,avatar')
            ->where('status', 'active')
            ->orderBy('created_at', 'desc')
            ->get();

        foreach ($sharedWithMe as $share) {
            if (!$share->owner) {
                continue;
            }

            $key = 'partner:' . $share->id;

            $owners[] = [
                'key' => $key,
                'label' => $share->owner->name . "'s Data",
                'name' => $share->owner->name,
                'email' => $share->owner->email,
                'avatar_url' => $share->owner->avatar_url,
                'is_selected' => $selectedKey === $key,
            ];
        }

        return $owners;
    }

    private function selfPermissions(): array
    {
        return [
            'can_view_cycles' => true,
            'can_edit_cycles' => true,

            'can_view_bbt' => true,
            'can_edit_bbt' => true,

            'can_view_symptoms' => true,
            'can_edit_symptoms' => true,

            'can_view_predictions' => true,
            'can_view_insights' => true,
        ];
    }

    private function permissionsFromShare(Partner $share): array
    {
        return [
            'can_view_cycles' => (bool) $share->can_view_cycles,
            'can_edit_cycles' => (bool) $share->can_view_cycles && (bool) $share->can_edit_cycles,

            'can_view_bbt' => (bool) $share->can_view_bbt,
            'can_edit_bbt' => (bool) $share->can_view_bbt && (bool) $share->can_edit_bbt,

            'can_view_symptoms' => (bool) $share->can_view_symptoms,
            'can_edit_symptoms' => (bool) $share->can_view_symptoms && (bool) $share->can_edit_symptoms,

            'can_view_predictions' => (bool) $share->can_view_predictions,
            'can_view_insights' => (bool) $share->can_view_insights,
        ];
    }
}