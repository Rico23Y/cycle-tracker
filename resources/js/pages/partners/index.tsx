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

type Partner = {
    id: number;
    name: string;
    email: string | null;
    status: 'active' | 'paused';

    can_view_cycles: boolean;
    can_view_bbt: boolean;
    can_view_symptoms: boolean;
    can_view_predictions: boolean;
    can_view_insights: boolean;
};

type Props = {
    partners: Partner[];
};

type PartnerForm = {
    name: string;
    email: string;
    status: 'active' | 'paused';

    can_view_cycles: boolean;
    can_view_bbt: boolean;
    can_view_symptoms: boolean;
    can_view_predictions: boolean;
    can_view_insights: boolean;
};

const defaultForm: PartnerForm = {
    name: '',
    email: '',
    status: 'active',

    can_view_cycles: true,
    can_view_bbt: false,
    can_view_symptoms: false,
    can_view_predictions: true,
    can_view_insights: false,
};

const permissionLabels = [
    {
        key: 'can_view_cycles',
        label: 'Cycles',
        description: 'Period dates and cycle history',
    },
    {
        key: 'can_view_bbt',
        label: 'BBT',
        description: 'Basal body temperature records',
    },
    {
        key: 'can_view_symptoms',
        label: 'Symptoms',
        description: 'Logged symptoms and notes',
    },
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

export default function Partners({
    partners,
}: Props) {
    const [mode, setMode] = useState<'add' | 'edit' | null>(null);

    const [activePartner, setActivePartner] = useState<Partner | null>(null);

    const [form, setForm] = useState<PartnerForm>(defaultForm);

    const { errors } = usePage().props as {
        errors?: Record<string, string>;
    };

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
            can_view_bbt: partner.can_view_bbt,
            can_view_symptoms: partner.can_view_symptoms,
            can_view_predictions: partner.can_view_predictions,
            can_view_insights: partner.can_view_insights,
        });
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();

        if (mode === 'add') {
            router.post(
                '/partners',
                form,
                {
                    preserveScroll: true,
                    onSuccess: resetForm,
                }
            );

            return;
        }

        if (mode === 'edit') {
            if (!activePartner) return;

            router.put(
                `/partners/${activePartner.id}`,
                form,
                {
                    preserveScroll: true,
                    onSuccess: resetForm,
                }
            );
        }
    }

    function updatePermission(
        key: keyof Pick<
            PartnerForm,
            | 'can_view_cycles'
            | 'can_view_bbt'
            | 'can_view_symptoms'
            | 'can_view_predictions'
            | 'can_view_insights'
        >,
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
                            Manage partner access and choose what cycle data can be shared.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={startAdd}
                        className="rounded bg-blue-500 px-4 py-2 text-sm text-white"
                    >
                        Add Partner
                    </button>
                </div>

                {mode && (
                    <form
                        onSubmit={submit}
                        className="rounded-xl border p-4 space-y-4"
                    >
                        <div>
                            <h2 className="font-semibold">
                                {mode === 'add' ? 'Add Partner' : 'Edit Partner'}
                            </h2>

                            <p className="text-sm text-muted-foreground">
                                Partner sharing is controlled by the permissions below.
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

                        <div>
                            <label className="text-sm font-medium">
                                Status
                            </label>

                            <select
                                value={form.status}
                                onChange={(e) => {
                                    setForm({
                                        ...form,
                                        status: e.target.value as 'active' | 'paused',
                                    });
                                }}
                                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                            >
                                <option value="active">
                                    Active
                                </option>

                                <option value="paused">
                                    Paused
                                </option>
                            </select>

                            {errors?.status && (
                                <div className="mt-1 text-sm text-red-500">
                                    {errors.status}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <div>
                                <h3 className="text-sm font-medium">
                                    Shared Data
                                </h3>

                                <p className="text-sm text-muted-foreground">
                                    Choose what this partner is allowed to view.
                                </p>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                {permissionLabels.map((permission) => (
                                    <label
                                        key={permission.key}
                                        className="flex gap-3 rounded-lg border p-3 text-sm"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={form[permission.key]}
                                            onChange={(e) => {
                                                updatePermission(
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
                        Partner List
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
                                                Status:{' '}
                                                <span className={
                                                    partner.status === 'active'
                                                        ? 'text-green-600'
                                                        : 'text-orange-600'
                                                }>
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
                                        {permissionLabels.map((permission) => {
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
                                                    {allowed ? 'Can view' : 'Hidden'} {permission.label}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            No partners added yet.
                        </div>
                    )}
                </div>

            </div>
        </AppLayout>
    );
}