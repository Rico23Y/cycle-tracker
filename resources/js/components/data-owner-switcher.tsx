import { router, usePage } from '@inertiajs/react';

type AvailableOwner = {
    key: string;
    label: string;
    name: string;
    email: string;
    avatar_url?: string | null;
    is_selected: boolean;
};

type DataAccess = {
    owner_key: string;
    owner_label: string;
    owner_name: string;
    owner_email: string;
    owner_avatar_url?: string | null;
    is_self: boolean;
    available_owners: AvailableOwner[];
    permissions: {
        can_view_cycles: boolean;
        can_edit_cycles: boolean;

        can_view_bbt: boolean;
        can_edit_bbt: boolean;

        can_view_symptoms: boolean;
        can_edit_symptoms: boolean;

        can_view_predictions: boolean;
        can_view_insights: boolean;
    };
};

function OwnerAvatar({
    name,
    avatarUrl,
}: {
    name: string;
    avatarUrl?: string | null;
}) {
    const initials = name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-xs font-medium">
            {avatarUrl ? (
                <img
                    src={avatarUrl}
                    alt={name}
                    className="h-full w-full object-cover"
                />
            ) : (
                <span>{initials || '?'}</span>
            )}
        </div>
    );
}

export default function DataOwnerSwitcher() {
    const { dataAccess } = usePage().props as {
        dataAccess?: DataAccess | null;
    };

    if (!dataAccess) {
        return null;
    }

    function switchOwner(ownerKey: string) {
        localStorage.setItem('cycle-tracker:selected-owner', ownerKey);

        const url = new URL(window.location.href);

        if (ownerKey === 'me') {
            url.searchParams.delete('owner');
        } else {
            url.searchParams.set('owner', ownerKey);
        }

        router.visit(`${url.pathname}${url.search}`, {
            preserveScroll: true,
            preserveState: false,
        });
    }

    if (dataAccess.available_owners.length <= 1) {
        return (
            <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                <OwnerAvatar
                    name={dataAccess.owner_name}
                    avatarUrl={dataAccess.owner_avatar_url}
                />

                <div className="leading-tight">
                    <div className="text-xs text-muted-foreground">
                        Viewing
                    </div>

                    <div className="font-medium">
                        {dataAccess.owner_label}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
                Viewing
            </span>

            <OwnerAvatar
                name={dataAccess.owner_name}
                avatarUrl={dataAccess.owner_avatar_url}
            />

            <select
                value={dataAccess.owner_key}
                onChange={(e) => switchOwner(e.target.value)}
                className="rounded-md border bg-background px-3 py-1.5 text-sm"
            >
                {dataAccess.available_owners.map((owner) => (
                    <option
                        key={owner.key}
                        value={owner.key}
                    >
                        {owner.label}
                    </option>
                ))}
            </select>
        </div>
    );
}