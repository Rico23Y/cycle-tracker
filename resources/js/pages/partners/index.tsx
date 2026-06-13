import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Partners',
        href: '/partners',
    },
];

type UserSummary = {
    id: number;
    name: string;
    email: string;
};

type PartnerStatus = 'active' | 'pending' | 'paused' | 'declined';

type Partner = {
    id: number;

    owner_user_id: number;
    partner_user_id: number | null;

    name: string;
    email: string | null;
    status: PartnerStatus;

    partner_user?: UserSummary | null;
    owner?: UserSummary | null;

    can_view_cycles: boolean;
    can_edit_cycles: boolean;

    can_view_bbt: boolean;
    can_edit_bbt: boolean;

    can_view_symptoms: boolean;
    can_edit_symptoms: boolean;

    can_view_predictions: boolean;
    can_view_insights: boolean;
};

type Props = {
    partners: Partner[];
    sharedWithMe: Partner[];
};

type PartnerForm = {
    name: string;
    email: string;
    status: PartnerStatus;

    can_view_cycles: boolean;
    can_edit_cycles: boolean;

    can_view_bbt: boolean;
    can_edit_bbt: boolean;

    can_view_symptoms: boolean;
    can_edit_symptoms: boolean;

    can_view_predictions: boolean;
    can_view_insights: boolean;
};

const defaultForm: PartnerForm = {
    name: '',
    email: '',
    status: 'pending',

    can_view_cycles: true,
    can_edit_cycles: false,

    can_view_bbt: false,
    can_edit_bbt: false,

    can_view_symptoms: false,
    can_edit_symptoms: false,

    can_view_predictions: true,
    can_view_insights: false,
};

const permissionGroups = [
    {
        label: 'Cycles',
        description: 'Period dates and cycle history',
        viewKey: 'can_view_cycles',
        editKey: 'can_edit_cycles',
    },
    {
        label: 'BBT',
        description: 'Basal body temperature records',
        viewKey: 'can_view_bbt',
        editKey: 'can_edit_bbt',
    },
    {
        label: 'Symptoms',
        description: 'Logged symptoms and notes',
        viewKey: 'can_view_symptoms',
        editKey: 'can_edit_symptoms',
    },
] as const;

const viewOnlyPermissions = [
    {
        key: 'can_view_predictions',
        label: 'Predictions',
        description: 'Predicted period, ovulation, and safe days',
    },
    {
        key: 'can_view_insights',
        label: 'Insights',
        description: 'Cycle statistics and trend summaries',
    },
] as const;

type EditableViewKey =
    | 'can_view_cycles'
    | 'can_view_bbt'
    | 'can_view_symptoms';

type EditableEditKey =
    | 'can_edit_cycles'
    | 'can_edit_bbt'
    | 'can_edit_symptoms';

type ViewOnlyKey =
    | 'can_view_predictions'
    | 'can_view_insights';

export default function Partners({
    partners,
    sharedWithMe,
}: Props) {
    const [mode, setMode] = useState<'add' | 'edit' | null>(null);

    const [activePartner, setActivePartner] = useState<Partner | null>(null);

    const [form, setForm] = useState<PartnerForm>(defaultForm);

    const { errors } = usePage().props as {
        errors?: Record<string, string>;
    };

    const pendingShares = sharedWithMe.filter(
        (share) => share.status === 'pending'
    );

    const activeShares = sharedWithMe.filter(
        (share) => share.status === 'active'
    );

    const inactiveShares = sharedWithMe.filter(
        (share) => !['pending', 'active'].includes(share.status)
    );

    function acceptShare(share: Partner) {
        router.post(
            `/partners/${share.id}/accept`,
            {},
            {
                preserveScroll: true,
            }
        );
    }

    function declineShare(share: Partner) {
        router.post(
            `/partners/${share.id}/decline`,
            {},
            {
                preserveScroll: true,
            }
        );
    }

    function resetForm() {
        setMode(null);
        setActivePartner(null);
        setForm(defaultForm);
    }

    function startAdd() {
        setMode('add');
        setActivePartner(null);
        setForm(defaultForm);
    }

    function startEdit(partner: Partner) {
        setMode('edit');
        setActivePartner(partner);

        setForm({
            name: partner.name,
            email: partner.email ?? '',
            status: partner.status,

            can_view_cycles: partner.can_view_cycles,
            can_edit_cycles: partner.can_edit_cycles,

            can_view_bbt: partner.can_view_bbt,
            can_edit_bbt: partner.can_edit_bbt,

            can_view_symptoms: partner.can_view_symptoms,
            can_edit_symptoms: partner.can_edit_symptoms,

            can_view_predictions: partner.can_view_predictions,
            can_view_insights: partner.can_view_insights,
        });
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();

        if (mode === 'add') {
            router.post('/partners', form, {
                preserveScroll: true,
                onSuccess: resetForm,
            });

            return;
        }

        if (mode === 'edit') {
            if (!activePartner) return;

            router.put(`/partners/${activePartner.id}`, form, {
                preserveScroll: true,
                onSuccess: resetForm,
            });
        }
    }

    function updateViewPermission(
        viewKey: EditableViewKey,
        editKey: EditableEditKey,
        value: boolean
    ) {
        setForm({
            ...form,
            [viewKey]: value,
            [editKey]: value ? form[editKey] : false,
        });
    }

    function updateEditPermission(
        editKey: EditableEditKey,
        value: boolean
    ) {
        setForm({
            ...form,
            [editKey]: value,
        });
    }

    function updateViewOnlyPermission(
        key: ViewOnlyKey,
        value: boolean
    ) {
        setForm({
            ...form,
            [key]: value,
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Partners" />

            <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-semibold">
                            Partners
                        </h1>

                        <p className="text-sm text-muted-foreground">
                            Manage who can view or edit your cycle data.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={startAdd}
                        className="rounded bg-blue-500 px-4 py-2 text-sm text-white"
                    >
                        Send Request
                    </button>
                </div>

                {mode && (
                    <form
                        onSubmit={submit}
                        className="rounded-xl border p-4 space-y-4"
                    >
                        <div>
                            <h2 className="font-semibold">
                                {mode === 'add' ? 'Send Partner Request' : 'Edit Partner'}
                            </h2>

                            <p className="text-sm text-muted-foreground">
                                {mode === 'add'
                                    ? 'This will send a pending sharing request. The partner must accept before they can access your data.'
                                    : 'If view access is disabled, edit access is also disabled.'}
                            </p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            <div>
                                <label className="text-sm font-medium">
                                    Name
                                </label>

                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => {
                                        setForm({
                                            ...form,
                                            name: e.target.value,
                                        });
                                    }}
                                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                                    placeholder="Partner name"
                                />

                                {errors?.name && (
                                    <div className="mt-1 text-sm text-red-500">
                                        {errors.name}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-sm font-medium">
                                    Email
                                </label>

                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => {
                                        setForm({
                                            ...form,
                                            email: e.target.value,
                                        });
                                    }}
                                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                                    placeholder="partner@example.com"
                                />

                                {errors?.email && (
                                    <div className="mt-1 text-sm text-red-500">
                                        {errors.email}
                                    </div>
                                )}
                            </div>
                        </div>

                        {mode === 'edit' && (
                            <div>
                                <label className="text-sm font-medium">
                                    Status
                                </label>

                                <select
                                    value={form.status}
                                    onChange={(e) => {
                                        setForm({
                                            ...form,
                                            status: e.target.value as PartnerStatus,
                                        });
                                    }}
                                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                                >
                                    <option value="active">
                                        Active
                                    </option>

                                    <option value="pending">
                                        Pending
                                    </option>

                                    <option value="paused">
                                        Paused
                                    </option>

                                    <option value="declined">
                                        Declined
                                    </option>
                                </select>

                                {errors?.status && (
                                    <div className="mt-1 text-sm text-red-500">
                                        {errors.status}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-3">
                            <div>
                                <h3 className="text-sm font-medium">
                                    View and Edit Access
                                </h3>

                                <p className="text-sm text-muted-foreground">
                                    Choose which data this partner can see and modify.
                                </p>
                            </div>

                            <div className="grid gap-3">
                                {permissionGroups.map((permission) => (
                                    <div
                                        key={permission.viewKey}
                                        className="rounded-lg border p-3 text-sm space-y-3"
                                    >
                                        <div>
                                            <div className="font-medium">
                                                {permission.label}
                                            </div>

                                            <div className="text-xs text-muted-foreground">
                                                {permission.description}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-4">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={form[permission.viewKey]}
                                                    onChange={(e) => {
                                                        updateViewPermission(
                                                            permission.viewKey,
                                                            permission.editKey,
                                                            e.target.checked
                                                        );
                                                    }}
                                                />

                                                <span>
                                                    Can view
                                                </span>
                                            </label>

                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={form[permission.editKey]}
                                                    disabled={!form[permission.viewKey]}
                                                    onChange={(e) => {
                                                        updateEditPermission(
                                                            permission.editKey,
                                                            e.target.checked
                                                        );
                                                    }}
                                                />

                                                <span className={!form[permission.viewKey] ? 'text-muted-foreground' : ''}>
                                                    Can edit
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <h3 className="text-sm font-medium">
                                    View Only Data
                                </h3>

                                <p className="text-sm text-muted-foreground">
                                    These sections can be viewed but not directly edited.
                                </p>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                {viewOnlyPermissions.map((permission) => (
                                    <label
                                        key={permission.key}
                                        className="flex gap-3 rounded-lg border p-3 text-sm"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={form[permission.key]}
                                            onChange={(e) => {
                                                updateViewOnlyPermission(
                                                    permission.key,
                                                    e.target.checked
                                                );
                                            }}
                                            className="mt-1"
                                        />

                                        <div>
                                            <div className="font-medium">
                                                {permission.label}
                                            </div>

                                            <div className="text-xs text-muted-foreground">
                                                {permission.description}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="rounded bg-blue-500 px-4 py-2 text-sm text-white"
                            >
                                Save
                            </button>

                            <button
                                type="button"
                                onClick={resetForm}
                                className="rounded border px-4 py-2 text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                <div className="rounded-xl border p-4 space-y-4">
                    <h2 className="font-semibold">
                        People I Share With
                    </h2>

                    {partners.length > 0 ? (
                        <div className="grid gap-3">
                            {partners.map((partner) => (
                                <div
                                    key={partner.id}
                                    className="rounded-lg border p-4 space-y-3"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="font-medium">
                                                {partner.name}
                                            </div>

                                            <div className="text-sm text-muted-foreground">
                                                {partner.email || 'No email'}
                                            </div>

                                            <div className="mt-1 text-xs">
                                                Account:{' '}
                                                {partner.partner_user_id ? (
                                                    <span className="text-green-600">
                                                        Linked user
                                                    </span>
                                                ) : (
                                                    <span className="text-orange-600">
                                                        Not registered / not linked
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-1 text-xs">
                                                Status:{' '}
                                                <span
                                                    className={
                                                        partner.status === 'active'
                                                            ? 'text-green-600'
                                                            : partner.status === 'pending'
                                                                ? 'text-blue-600'
                                                                : partner.status === 'paused'
                                                                    ? 'text-orange-600'
                                                                    : 'text-red-600'
                                                    }
                                                >
                                                    {partner.status}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => startEdit(partner)}
                                                className="rounded border px-3 py-1 text-xs"
                                            >
                                                Edit
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!confirm('Delete this partner?')) return;

                                                    router.delete(`/partners/${partner.id}`, {
                                                        preserveScroll: true,
                                                    });
                                                }}
                                                className="rounded border px-3 py-1 text-xs"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {permissionGroups.map((permission) => {
                                            const canView = partner[permission.viewKey];
                                            const canEdit = partner[permission.editKey];

                                            return (
                                                <span
                                                    key={permission.viewKey}
                                                    className={`
                                                        rounded-full
                                                        border
                                                        px-2
                                                        py-1
                                                        text-xs
                                                        ${canView
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-gray-100 text-gray-500'}
                                                    `}
                                                >
                                                    {permission.label}: {canView ? 'View' : 'Locked'}
                                                    {canView && canEdit ? ' + Edit' : ''}
                                                </span>
                                            );
                                        })}

                                        {viewOnlyPermissions.map((permission) => {
                                            const allowed = partner[permission.key];

                                            return (
                                                <span
                                                    key={permission.key}
                                                    className={`
                                                        rounded-full
                                                        border
                                                        px-2
                                                        py-1
                                                        text-xs
                                                        ${allowed
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-gray-100 text-gray-500'}
                                                    `}
                                                >
                                                    {permission.label}: {allowed ? 'View' : 'Locked'}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            You are not sharing your data with anyone yet.
                        </div>
                    )}
                </div>

                <div className="rounded-xl border p-4 space-y-4">
                    <h2 className="font-semibold">
                        Pending Invitations
                    </h2>

                    {pendingShares.length > 0 ? (
                        <div className="grid gap-3">
                            {pendingShares.map((share) => (
                                <div
                                    key={share.id}
                                    className="rounded-lg border p-4 space-y-3"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="font-medium">
                                                {share.owner?.name ?? 'Unknown owner'}
                                            </div>

                                            <div className="text-sm text-muted-foreground">
                                                {share.owner?.email ?? 'No email'}
                                            </div>

                                            <div className="mt-1 text-xs text-blue-600">
                                                This user wants to share cycle data with you.
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => acceptShare(share)}
                                                className="rounded bg-green-600 px-3 py-1 text-xs text-white"
                                            >
                                                Accept
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => declineShare(share)}
                                                className="rounded border px-3 py-1 text-xs"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {permissionGroups.map((permission) => {
                                            const canView = share[permission.viewKey];
                                            const canEdit = share[permission.editKey];

                                            return (
                                                <span
                                                    key={permission.viewKey}
                                                    className={`
                                                        rounded-full
                                                        border
                                                        px-2
                                                        py-1
                                                        text-xs
                                                        ${canView
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-gray-100 text-gray-500'}
                                                    `}
                                                >
                                                    {permission.label}: {canView ? 'View' : 'Locked'}
                                                    {canView && canEdit ? ' + Edit' : ''}
                                                </span>
                                            );
                                        })}

                                        {viewOnlyPermissions.map((permission) => {
                                            const allowed = share[permission.key];

                                            return (
                                                <span
                                                    key={permission.key}
                                                    className={`
                                                        rounded-full
                                                        border
                                                        px-2
                                                        py-1
                                                        text-xs
                                                        ${allowed
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-gray-100 text-gray-500'}
                                                    `}
                                                >
                                                    {permission.label}: {allowed ? 'View' : 'Locked'}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            No pending invitations.
                        </div>
                    )}
                </div>

                <div className="rounded-xl border p-4 space-y-4">
                    <h2 className="font-semibold">
                        Active Shares With Me
                    </h2>

                    {activeShares.length > 0 ? (
                        <div className="grid gap-3">
                            {activeShares.map((share) => (
                                <div
                                    key={share.id}
                                    className="rounded-lg border p-4 space-y-3"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="font-medium">
                                                {share.owner?.name ?? 'Unknown owner'}
                                            </div>

                                            <div className="text-sm text-muted-foreground">
                                                {share.owner?.email ?? 'No email'}
                                            </div>

                                            <div className="mt-1 text-xs text-green-600">
                                                This share is active and appears in your data owner switcher.
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!confirm('Decline this share? You will lose access to this owner’s data.')) return;

                                                declineShare(share);
                                            }}
                                            className="rounded border px-3 py-1 text-xs"
                                        >
                                            Decline
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {permissionGroups.map((permission) => {
                                            const canView = share[permission.viewKey];
                                            const canEdit = share[permission.editKey];

                                            return (
                                                <span
                                                    key={permission.viewKey}
                                                    className={`
                                                        rounded-full
                                                        border
                                                        px-2
                                                        py-1
                                                        text-xs
                                                        ${canView
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-gray-100 text-gray-500'}
                                                    `}
                                                >
                                                    {permission.label}: {canView ? 'View' : 'Locked'}
                                                    {canView && canEdit ? ' + Edit' : ''}
                                                </span>
                                            );
                                        })}

                                        {viewOnlyPermissions.map((permission) => {
                                            const allowed = share[permission.key];

                                            return (
                                                <span
                                                    key={permission.key}
                                                    className={`
                                                        rounded-full
                                                        border
                                                        px-2
                                                        py-1
                                                        text-xs
                                                        ${allowed
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-gray-100 text-gray-500'}
                                                    `}
                                                >
                                                    {permission.label}: {allowed ? 'View' : 'Locked'}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            No active shares yet.
                        </div>
                    )}
                </div>

                {inactiveShares.length > 0 && (
                    <div className="rounded-xl border p-4 space-y-4">
                        <h2 className="font-semibold">
                            Inactive Shares
                        </h2>

                        <div className="grid gap-3">
                            {inactiveShares.map((share) => (
                                <div
                                    key={share.id}
                                    className="rounded-lg border p-4"
                                >
                                    <div className="font-medium">
                                        {share.owner?.name ?? 'Unknown owner'}
                                    </div>

                                    <div className="text-sm text-muted-foreground">
                                        {share.owner?.email ?? 'No email'}
                                    </div>

                                    <div className="mt-1 text-xs">
                                        Status:{' '}
                                        <span
                                            className={
                                                share.status === 'paused'
                                                    ? 'text-orange-600'
                                                    : 'text-red-600'
                                            }
                                        >
                                            {share.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}