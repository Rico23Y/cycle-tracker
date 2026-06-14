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

type RequestType = 'share_mine' | 'request_theirs' | 'both';

type Partner = {
    id: number;

    owner_user_id: number;
    partner_user_id: number | null;
    requested_by_user_id: number | null;

    name: string;
    email: string | null;
    status: PartnerStatus;

    partner_user?: UserSummary | null;
    owner?: UserSummary | null;
    requested_by?: UserSummary | null;

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
    request_type: RequestType;

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
    request_type: 'share_mine',

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

    const { errors, auth } = usePage().props as {
        errors?: Record<string, string>;
        auth?: {
            user?: {
                id: number;
                name: string;
                email: string;
            };
        };
    };

    const currentUserId = auth?.user?.id;

    const pendingShareRequestsISent = partners.filter(
        (partner) =>
            partner.status === 'pending' &&
            partner.requested_by_user_id === currentUserId
    );

    const pendingRequestsForMyData = partners.filter(
        (partner) =>
            partner.status === 'pending' &&
            partner.requested_by_user_id !== null &&
            partner.requested_by_user_id !== currentUserId
    );

    const unlinkedPendingRequests = partners.filter(
        (partner) =>
            partner.status === 'pending' &&
            partner.partner_user_id === null
    );

    const activePeopleIShareWith = partners.filter(
        (partner) => partner.status === 'active'
    );

    const inactivePeopleIShareWith = partners.filter(
        (partner) => !['pending', 'active'].includes(partner.status)
    );

    const pendingRequestsISentForTheirData = sharedWithMe.filter(
        (share) =>
            share.status === 'pending' &&
            share.requested_by_user_id === currentUserId
    );

    const pendingInvitationsToViewTheirData = sharedWithMe.filter(
        (share) =>
            share.status === 'pending' &&
            share.requested_by_user_id !== null &&
            share.requested_by_user_id !== currentUserId
    );

    const activeSharesWithMe = sharedWithMe.filter(
        (share) => share.status === 'active'
    );

    const inactiveSharesWithMe = sharedWithMe.filter(
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

    function cancelRequest(share: Partner) {
        if (!confirm('Cancel this request?')) return;

        router.delete(`/partners/${share.id}`, {
            preserveScroll: true,
        });
    }

    const pendingShares = sharedWithMe.filter(
        (share) => share.status === 'pending'
    );

    const activeShares = sharedWithMe.filter(
        (share) => share.status === 'active'
    );

    const inactiveShares = sharedWithMe.filter(
        (share) => !['pending', 'active'].includes(share.status)
    );

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
            request_type: 'share_mine',

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
            const existingOutgoing = partners.find(
                (partner) =>
                    partner.email?.toLowerCase() === form.email.toLowerCase()
            );

            const existingIncoming = sharedWithMe.find(
                (share) =>
                    share.owner?.email?.toLowerCase() === form.email.toLowerCase()
            );

            if (existingOutgoing || existingIncoming) {
                const shouldContinue = confirm(
                    'A sharing request or share already exists for this user. Sending again will update the permissions and set the request back to pending. Continue?'
                );

                if (!shouldContinue) return;
            }

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

    function PermissionBadges({ share }: { share: Partner }) {
        return (
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
        );
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
                                    ? 'The selected permissions apply to the data access being requested or shared.'
                                    : 'If view access is disabled, edit access is also disabled.'}
                            </p>
                        </div>

                        {mode === 'add' && (
                            <div className="rounded-lg border p-3 space-y-3">
                                <div>
                                    <h3 className="text-sm font-medium">
                                        Request Type
                                    </h3>

                                    <p className="text-xs text-muted-foreground">
                                        Choose what kind of sharing request to send.
                                    </p>
                                </div>

                                <div className="grid gap-2">
                                    <label className="flex gap-3 rounded border p-3 text-sm">
                                        <input
                                            type="radio"
                                            name="request_type"
                                            value="share_mine"
                                            checked={form.request_type === 'share_mine'}
                                            onChange={() => {
                                                setForm({
                                                    ...form,
                                                    request_type: 'share_mine',
                                                });
                                            }}
                                            className="mt-1"
                                        />

                                        <div>
                                            <div className="font-medium">
                                                Share my data with this partner
                                            </div>

                                            <div className="text-xs text-muted-foreground">
                                                They can view or edit your data after accepting.
                                            </div>
                                        </div>
                                    </label>

                                    <label className="flex gap-3 rounded border p-3 text-sm">
                                        <input
                                            type="radio"
                                            name="request_type"
                                            value="request_theirs"
                                            checked={form.request_type === 'request_theirs'}
                                            onChange={() => {
                                                setForm({
                                                    ...form,
                                                    request_type: 'request_theirs',
                                                });
                                            }}
                                            className="mt-1"
                                        />

                                        <div>
                                            <div className="font-medium">
                                                Request access to this partner’s data
                                            </div>

                                            <div className="text-xs text-muted-foreground">
                                                You can view or edit their data after they accept.
                                            </div>
                                        </div>
                                    </label>

                                    <label className="flex gap-3 rounded border p-3 text-sm">
                                        <input
                                            type="radio"
                                            name="request_type"
                                            value="both"
                                            checked={form.request_type === 'both'}
                                            onChange={() => {
                                                setForm({
                                                    ...form,
                                                    request_type: 'both',
                                                });
                                            }}
                                            className="mt-1"
                                        />

                                        <div>
                                            <div className="font-medium">
                                                Both share with each other
                                            </div>

                                            <div className="text-xs text-muted-foreground">
                                                Sends two requests: they can access your data, and you request access to theirs.
                                            </div>
                                        </div>
                                    </label>
                                </div>

                                {errors?.request_type && (
                                    <div className="text-sm text-red-500">
                                        {errors.request_type}
                                    </div>
                                )}
                            </div>
                        )}

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
                        Requests For My Data
                    </h2>

                    {pendingRequestsForMyData.length > 0 ? (
                        <div className="grid gap-3">
                            {pendingRequestsForMyData.map((request) => (
                                <div key={request.id} className="rounded-lg border p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="font-medium">
                                                {request.requested_by?.name ?? request.name}
                                            </div>

                                            <div className="text-sm text-muted-foreground">
                                                {request.requested_by?.email ?? request.email}
                                            </div>

                                            <div className="mt-1 text-xs text-blue-600">
                                                This user is requesting access to your data.
                                            </div>
                                        </div>

                                        {request.partner_user_id ? (
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => acceptShare(request)}
                                                    className="rounded bg-green-600 px-3 py-1 text-xs text-white"
                                                >
                                                    Accept
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => declineShare(request)}
                                                    className="rounded border px-3 py-1 text-xs"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => cancelRequest(request)}
                                                className="rounded border px-3 py-1 text-xs"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>

                                    <PermissionBadges share={request} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            No pending requests for your data.
                        </div>
                    )}
                </div>

                <div className="rounded-xl border p-4 space-y-4">
                    <h2 className="font-semibold">
                        Requests I Sent
                    </h2>

                    {[...pendingShareRequestsISent, ...pendingRequestsISentForTheirData].length > 0 ? (
                        <div className="grid gap-3">
                            {[...pendingShareRequestsISent, ...pendingRequestsISentForTheirData].map((request) => {
                                const isMyDataRequest = request.owner_user_id === currentUserId;

                                return (
                                    <div key={request.id} className="rounded-lg border p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <div className="font-medium">
                                                    {isMyDataRequest
                                                        ? request.name
                                                        : request.owner?.name ?? 'Unknown owner'}
                                                </div>

                                                <div className="text-sm text-muted-foreground">
                                                    {isMyDataRequest
                                                        ? request.email
                                                        : request.owner?.email ?? 'No email'}
                                                </div>

                                                <div className="mt-1 text-xs">
                                                    Account:{' '}
                                                    {request.partner_user_id ? (
                                                        <span className="text-green-600">
                                                            Existing account
                                                        </span>
                                                    ) : (
                                                        <span className="text-orange-600">
                                                            Not registered yet
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="mt-1 text-xs text-blue-600">
                                                    {isMyDataRequest
                                                        ? 'Waiting for this partner to accept access to your data.'
                                                        : 'Waiting for this partner to approve your access request.'}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => cancelRequest(request)}
                                                className="rounded border px-3 py-1 text-xs"
                                            >
                                                Cancel
                                            </button>
                                        </div>

                                        <PermissionBadges share={request} />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            No pending requests sent.
                        </div>
                    )}
                </div>

                <div className="rounded-xl border p-4 space-y-4">
                    <h2 className="font-semibold">
                        People I Share With
                    </h2>

                    {activePeopleIShareWith.length > 0 ? (
                        <div className="grid gap-3">
                            {activePeopleIShareWith.map((partner) => (
                                <div key={partner.id} className="rounded-lg border p-4 space-y-3">
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
                                                        Existing account
                                                    </span>
                                                ) : (
                                                    <span className="text-orange-600">
                                                        Not registered yet
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-1 text-xs text-green-600">
                                                This partner can access your data.
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
                                                    if (!confirm('Delete this share?')) return;

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

                                    <PermissionBadges share={partner} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            You are not actively sharing your data with anyone.
                        </div>
                    )}
                </div>

                <div className="rounded-xl border p-4 space-y-4">
                    <h2 className="font-semibold">
                        People Sharing With Me
                    </h2>

                    {[...pendingInvitationsToViewTheirData, ...activeSharesWithMe].length > 0 ? (
                        <div className="grid gap-3">
                            {pendingInvitationsToViewTheirData.map((share) => (
                                <div key={share.id} className="rounded-lg border p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="font-medium">
                                                {share.owner?.name ?? 'Unknown owner'}
                                            </div>

                                            <div className="text-sm text-muted-foreground">
                                                {share.owner?.email ?? 'No email'}
                                            </div>

                                            <div className="mt-1 text-xs text-blue-600">
                                                This user invited you to access their data.
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

                                    <PermissionBadges share={share} />
                                </div>
                            ))}

                            {activeSharesWithMe.map((share) => (
                                <div key={share.id} className="rounded-lg border p-4 space-y-3">
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

                                    <PermissionBadges share={share} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            No one is actively sharing data with you.
                        </div>
                    )}
                </div>

                {[...inactivePeopleIShareWith, ...inactiveSharesWithMe].length > 0 && (
                    <div className="rounded-xl border p-4 space-y-4">
                        <h2 className="font-semibold">
                            Inactive Shares
                        </h2>

                        <div className="grid gap-3">
                            {[...inactivePeopleIShareWith, ...inactiveSharesWithMe].map((share) => (
                                <div key={share.id} className="rounded-lg border p-4">
                                    <div className="font-medium">
                                        {share.owner_user_id === currentUserId
                                            ? share.name
                                            : share.owner?.name ?? 'Unknown owner'}
                                    </div>

                                    <div className="text-sm text-muted-foreground">
                                        {share.owner_user_id === currentUserId
                                            ? share.email ?? 'No email'
                                            : share.owner?.email ?? 'No email'}
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