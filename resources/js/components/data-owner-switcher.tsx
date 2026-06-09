import { router, usePage } from '@inertiajs/react';

type AvailableOwner = {
    key: string;
    label: string;
    is_selected: boolean;
};

type DataAccess = {
    owner_key: string;
    owner_label: string;
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

export default function DataOwnerSwitcher() {
    const { dataAccess } = usePage().props as {
        dataAccess?: DataAccess | null;
    };

    if (!dataAccess) {
        return null;
    }

    if (dataAccess.available_owners.length <= 1) {
        return (
            <div className="rounded-md border px-3 py-1.5 text-sm">
                <span className="text-muted-foreground">
                    Viewing:
                </span>{' '}
                <span className="font-medium">
                    {dataAccess.owner_label}
                </span>
            </div>
        );
    }

    function switchOwner(ownerKey: string) {
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

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
                Viewing
            </span>

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