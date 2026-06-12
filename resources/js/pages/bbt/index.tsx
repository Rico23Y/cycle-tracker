import { useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'BBT',
        href: '/bbt',
    },
];

type BbtReading = {
    id: number | null;
    date: string;
    cycle_day: number;
    temperature: number | null;
};

type BbtTimeline = {
    id: string;
    cycle_id: number;
    label: string;
    is_predicted: boolean;
    cycle_start_date: string;
    cycle_end_date: string;
    next_period_date: string;
    cycle_length: number;
    readings: BbtReading[];
};

type Props = {
    timelines: BbtTimeline[];
    readings: {
        id: number;
        date: string;
        temperature: number;
    }[];
    cycleCount: number;
    bbtLocked?: boolean;
};

export default function Bbt({
    timelines,
    readings,
    cycleCount,
    bbtLocked = false,
}: Props) {
    const { errors, dataAccess } = usePage().props as {
        errors?: Record<string, string>;
        dataAccess?: {
            owner_key: string;
            owner_label: string;
            permissions: {
                can_view_bbt: boolean;
                can_edit_bbt: boolean;
            };
        };
    };

    const canViewBbt = dataAccess?.permissions.can_view_bbt ?? true;
    const canEditBbt = dataAccess?.permissions.can_edit_bbt ?? true;

    const ownerQuery =
        dataAccess?.owner_key && dataAccess.owner_key !== 'me'
            ? `?owner=${encodeURIComponent(dataAccess.owner_key)}`
            : '';

    const todayKey = new Date().toISOString().slice(0, 10);

    const [quickDate, setQuickDate] = useState(todayKey);
    const [quickTemperature, setQuickTemperature] = useState('');

    const [selectedTimelineId, setSelectedTimelineId] = useState(
        timelines.length > 0 ? timelines[timelines.length - 1].id : ''
    );

    const [editingDate, setEditingDate] = useState<string | null>(null);
    const [tableTemperature, setTableTemperature] = useState('');
    const [temperatureDrafts, setTemperatureDrafts] = useState<Record<string, string>>({});

    const timeline = useMemo(() => {
        return timelines.find((item) => item.id === selectedTimelineId) ?? null;
    }, [timelines, selectedTimelineId]);

    const allVisibleReadings = [
        ...timelines.flatMap((item) => item.readings),
        ...readings.map((reading) => ({
            id: reading.id,
            date: reading.date,
            cycle_day: 0,
            temperature: reading.temperature,
        })),
    ];

    const existingReadingForQuickDate = allVisibleReadings.find((reading) => {
        return reading.date === quickDate && reading.id !== null;
    });

    const chartData = timeline
        ? timeline.readings.filter(
            (reading): reading is BbtReading & { temperature: number } =>
                reading.temperature !== null
        )
        : [];

    const simpleChartData = [...readings]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((reading) => ({
            date: reading.date,
            temp: Number(reading.temperature),
        }));

    const useSimpleBbtMode =
        timelines.length === 0 || !timeline;

    function resetInlineEdit() {
        setEditingDate(null);
        setTableTemperature('');
        setTemperatureDrafts({});
    }

    function submitQuickAdd(e: React.FormEvent) {
        e.preventDefault();

        if (!canEditBbt) return;
        if (!quickDate || !quickTemperature) return;

        if (existingReadingForQuickDate) {
            const shouldUpdate = confirm(
                'A BBT reading already exists for this date. Do you want to update it instead?'
            );

            if (!shouldUpdate) return;

            router.put(
                `/bbt/${existingReadingForQuickDate.id}${ownerQuery}`,
                {
                    temperature: quickTemperature,
                },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        setQuickTemperature('');
                    },
                }
            );

            return;
        }

        router.post(
            `/bbt${ownerQuery}`,
            {
                date: quickDate,
                temperature: quickTemperature,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setQuickTemperature('');
                },
            }
        );
    }

    function saveReading(reading: BbtReading) {
        if (!canEditBbt) return;

        const value = reading.id
            ? tableTemperature
            : temperatureDrafts[reading.date];

        if (!value) return;

        if (reading.id) {
            router.put(
                `/bbt/${reading.id}${ownerQuery}`,
                {
                    temperature: value,
                },
                {
                    preserveScroll: true,
                    onSuccess: resetInlineEdit,
                }
            );

            return;
        }

        router.post(
            `/bbt${ownerQuery}`,
            {
                date: reading.date,
                temperature: value,
            },
            {
                preserveScroll: true,
                onSuccess: resetInlineEdit,
            }
        );
    }

    if (bbtLocked || !canViewBbt) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="BBT" />

                <div className="p-4">
                    <div className="rounded-xl border p-6">
                        <h1 className="text-xl font-semibold">
                            BBT Locked
                        </h1>

                        <p className="mt-2 text-sm text-muted-foreground">
                            The owner has not allowed access to BBT records.
                        </p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="BBT" />

            <div className="space-y-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold">
                        Basal Body Temperature
                    </h1>

                    <p className="text-sm text-muted-foreground">
                        Viewing {dataAccess?.owner_label ?? 'My Data'}.
                    </p>
                </div>

                {!canEditBbt && (
                    <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                        You can view BBT records, but editing is locked by the owner.
                    </div>
                )}

                {useSimpleBbtMode ? (
                    <>
                        <div className="rounded-xl border p-4 space-y-3">
                            <div>
                                <h2 className="font-semibold">
                                    BBT Records
                                </h2>

                                <p className="text-sm text-muted-foreground">
                                    You can log BBT even before there are enough cycle records for cycle-day tracking.
                                </p>
                            </div>

                            {cycleCount < 2 && (
                                <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                                    Cycle-day timeline will appear after at least two cycle start dates are added.
                                </div>
                            )}
                        </div>

                        {canEditBbt && (
                            <form
                                onSubmit={submitQuickAdd}
                                className="rounded-xl border p-4 space-y-3"
                            >
                                <div>
                                    <h2 className="font-semibold">
                                        Add BBT
                                    </h2>

                                    <p className="text-sm text-muted-foreground">
                                        Add a temperature reading by date.
                                    </p>
                                </div>

                                <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                                    <input
                                        type="date"
                                        value={quickDate}
                                        onChange={(e) => setQuickDate(e.target.value)}
                                        className="rounded border px-3 py-2 text-sm"
                                    />

                                    <input
                                        type="number"
                                        step="0.01"
                                        value={quickTemperature}
                                        onChange={(e) => setQuickTemperature(e.target.value)}
                                        placeholder="Temperature °C"
                                        className="rounded border px-3 py-2 text-sm"
                                    />

                                    <button
                                        type="submit"
                                        className="rounded bg-blue-500 px-4 py-2 text-sm text-white"
                                    >
                                        {existingReadingForQuickDate ? 'Update' : 'Add'}
                                    </button>
                                </div>

                                {existingReadingForQuickDate && (
                                    <div className="text-sm text-orange-600">
                                        A BBT reading already exists for this date. Submitting will ask if you want to update it.
                                    </div>
                                )}

                                {errors?.date && (
                                    <div className="text-sm text-red-500">
                                        {errors.date}
                                    </div>
                                )}

                                {errors?.temperature && (
                                    <div className="text-sm text-red-500">
                                        {errors.temperature}
                                    </div>
                                )}
                            </form>
                        )}

                        {simpleChartData.length > 0 ? (
                            <div className="rounded-xl border p-4 space-y-4">
                                <div>
                                    <h2 className="font-semibold">
                                        BBT Chart
                                    </h2>

                                    <p className="text-sm text-muted-foreground">
                                        Date-based temperature trend.
                                    </p>
                                </div>

                                <div className="h-[320px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={simpleChartData}>
                                            <XAxis
                                                dataKey="date"
                                                tickFormatter={(date) => {
                                                    const parsed = new Date(date + 'T00:00:00');

                                                    return parsed.toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    });
                                                }}
                                            />

                                            <YAxis
                                                domain={[
                                                    (dataMin: number) =>
                                                        Math.floor((dataMin - 0.2) * 100) / 100,
                                                    (dataMax: number) =>
                                                        Math.ceil((dataMax + 0.2) * 100) / 100,
                                                ]}
                                                tickFormatter={(value: number) => value.toFixed(2)}
                                            />

                                            <Tooltip
                                                labelFormatter={(date) => {
                                                    const parsed = new Date(String(date) + 'T00:00:00');

                                                    return parsed.toLocaleDateString('en-US', {
                                                        month: 'long',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    });
                                                }}
                                                formatter={(value) => [
                                                    `${Number(value).toFixed(2)}°C`,
                                                    'Temperature',
                                                ]}
                                            />

                                            <Line
                                                type="monotone"
                                                dataKey="temp"
                                                name="Temperature"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                                No BBT readings yet.
                            </div>
                        )}

                        <div className="rounded-xl border p-4 space-y-4">
                            <h2 className="font-semibold">
                                BBT Readings
                            </h2>

                            {readings.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left">
                                                <th className="py-2">
                                                    Date
                                                </th>

                                                <th className="py-2">
                                                    Temperature
                                                </th>

                                                {canEditBbt && (
                                                    <th className="py-2">
                                                        Actions
                                                    </th>
                                                )}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {[...readings]
                                                .sort((a, b) => b.date.localeCompare(a.date))
                                                .map((reading) => {
                                                    const isEditing = editingDate === reading.date;

                                                    return (
                                                        <tr
                                                            key={reading.date}
                                                            className="border-b"
                                                        >
                                                            <td className="py-2">
                                                                {new Date(reading.date + 'T00:00:00')
                                                                    .toLocaleDateString('en-US', {
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        year: 'numeric',
                                                                    })}
                                                            </td>

                                                            <td className="py-2">
                                                                {isEditing && canEditBbt ? (
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        value={tableTemperature}
                                                                        onChange={(e) => setTableTemperature(e.target.value)}
                                                                        placeholder="Temp °C"
                                                                        className="w-32 rounded border px-2 py-1 text-sm"
                                                                    />
                                                                ) : (
                                                                    <span>
                                                                        {Number(reading.temperature).toFixed(2)}°C
                                                                    </span>
                                                                )}
                                                            </td>

                                                            {canEditBbt && (
                                                                <td className="py-2">
                                                                    <div className="flex gap-2">
                                                                        {isEditing ? (
                                                                            <>
                                                                                <button
                                                                                    type="button"
                                                                                    className="rounded bg-blue-500 px-2 py-1 text-xs text-white"
                                                                                    onClick={() => {
                                                                                        router.put(
                                                                                            `/bbt/${reading.id}${ownerQuery}`,
                                                                                            {
                                                                                                temperature: tableTemperature,
                                                                                            },
                                                                                            {
                                                                                                preserveScroll: true,
                                                                                                onSuccess: resetInlineEdit,
                                                                                            }
                                                                                        );
                                                                                    }}
                                                                                >
                                                                                    Save
                                                                                </button>

                                                                                <button
                                                                                    type="button"
                                                                                    className="rounded border px-2 py-1 text-xs"
                                                                                    onClick={resetInlineEdit}
                                                                                >
                                                                                    Cancel
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <button
                                                                                    type="button"
                                                                                    className="rounded border px-2 py-1 text-xs"
                                                                                    onClick={() => {
                                                                                        setEditingDate(reading.date);
                                                                                        setTableTemperature(String(reading.temperature ?? ''));
                                                                                    }}
                                                                                >
                                                                                    Edit
                                                                                </button>

                                                                                <button
                                                                                    type="button"
                                                                                    className="rounded border px-2 py-1 text-xs"
                                                                                    onClick={() => {
                                                                                        if (!confirm('Delete this BBT reading?')) return;

                                                                                        router.delete(`/bbt/${reading.id}${ownerQuery}`, {
                                                                                            preserveScroll: true,
                                                                                            onSuccess: resetInlineEdit,
                                                                                        });
                                                                                    }}
                                                                                >
                                                                                    Delete
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">
                                    No BBT readings yet.
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="rounded-xl border p-4">
                            <div className="mb-2 text-sm font-medium">
                                Select Cycle Range
                            </div>

                            <select
                                value={selectedTimelineId}
                                onChange={(e) => {
                                    setSelectedTimelineId(e.target.value);
                                    resetInlineEdit();
                                }}
                                className="w-full rounded border px-3 py-2 text-sm"
                            >
                                {timelines.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {canEditBbt && (
                            <form
                                onSubmit={submitQuickAdd}
                                className="rounded-xl border p-4 space-y-3"
                            >
                                <div>
                                    <h2 className="font-semibold">
                                        Add BBT
                                    </h2>

                                    <p className="text-sm text-muted-foreground">
                                        Add or update a temperature reading by date.
                                    </p>
                                </div>

                                <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                                    <input
                                        type="date"
                                        value={quickDate}
                                        onChange={(e) => setQuickDate(e.target.value)}
                                        className="rounded border px-3 py-2 text-sm"
                                    />

                                    <input
                                        type="number"
                                        step="0.01"
                                        value={quickTemperature}
                                        onChange={(e) => setQuickTemperature(e.target.value)}
                                        placeholder="Temperature °C"
                                        className="rounded border px-3 py-2 text-sm"
                                    />

                                    <button
                                        type="submit"
                                        className="rounded bg-blue-500 px-4 py-2 text-sm text-white"
                                    >
                                        {existingReadingForQuickDate ? 'Update' : 'Add'}
                                    </button>
                                </div>

                                {existingReadingForQuickDate && (
                                    <div className="text-sm text-orange-600">
                                        A BBT reading already exists for this date. Submitting will ask if you want to update it.
                                    </div>
                                )}

                                {errors?.date && (
                                    <div className="text-sm text-red-500">
                                        {errors.date}
                                    </div>
                                )}

                                {errors?.temperature && (
                                    <div className="text-sm text-red-500">
                                        {errors.temperature}
                                    </div>
                                )}
                            </form>
                        )}

                        <div className="rounded-xl border p-4 space-y-4">
                            <div>
                                <h2 className="font-semibold">
                                    BBT Chart
                                </h2>

                                <p className="text-sm text-muted-foreground">
                                    Cycle-day temperature trend for the selected range.
                                </p>
                            </div>

                            {chartData.length > 0 ? (
                                <div className="h-[320px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData}>
                                            <XAxis
                                                dataKey="cycle_day"
                                                label={{
                                                    value: 'Cycle Day',
                                                    position: 'insideBottom',
                                                    offset: -5,
                                                }}
                                            />

                                            <YAxis
                                                domain={[
                                                    (dataMin: number) =>
                                                        Math.floor((dataMin - 0.2) * 100) / 100,
                                                    (dataMax: number) =>
                                                        Math.ceil((dataMax + 0.2) * 100) / 100,
                                                ]}
                                                tickFormatter={(value: number) => value.toFixed(2)}
                                            />

                                            <Tooltip
                                                labelFormatter={(cycleDay) => `Cycle Day ${cycleDay}`}
                                                formatter={(value) => [
                                                    `${Number(value).toFixed(2)}°C`,
                                                    'Temperature',
                                                ]}
                                            />

                                            {timeline && !timeline.is_predicted && (
                                                <ReferenceLine
                                                    x={14}
                                                    strokeDasharray="3 3"
                                                    label="Approx. ovulation"
                                                />
                                            )}

                                            <Line
                                                type="monotone"
                                                dataKey="temperature"
                                                name="Temperature"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">
                                    No BBT readings for this selected range.
                                </div>
                            )}
                        </div>

                        <div className="rounded-xl border p-4 space-y-4">
                            <h2 className="font-semibold">
                                Cycle-Day BBT Readings
                            </h2>

                            {timeline ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left">
                                                <th className="py-2">
                                                    Date
                                                </th>

                                                <th className="py-2">
                                                    Cycle Day
                                                </th>

                                                <th className="py-2">
                                                    Temperature
                                                </th>

                                                {canEditBbt && (
                                                    <th className="py-2">
                                                        Actions
                                                    </th>
                                                )}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {timeline.readings.map((reading) => {
                                                const isEditing = editingDate === reading.date;
                                                const draftValue = temperatureDrafts[reading.date] ?? '';

                                                return (
                                                    <tr
                                                        key={reading.date}
                                                        className="border-b"
                                                    >
                                                        <td className="py-2">
                                                            {new Date(reading.date + 'T00:00:00')
                                                                .toLocaleDateString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    year: 'numeric',
                                                                })}
                                                        </td>

                                                        <td className="py-2">
                                                            Day {reading.cycle_day}
                                                        </td>

                                                        <td className="py-2">
                                                            {reading.id && !isEditing ? (
                                                                <span>
                                                                    {Number(reading.temperature).toFixed(2)}°C
                                                                </span>
                                                            ) : canEditBbt && (isEditing || !reading.id) ? (
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={reading.id ? tableTemperature : draftValue}
                                                                    onChange={(e) => {
                                                                        if (reading.id) {
                                                                            setTableTemperature(e.target.value);
                                                                        } else {
                                                                            setTemperatureDrafts((current) => ({
                                                                                ...current,
                                                                                [reading.date]: e.target.value,
                                                                            }));
                                                                        }
                                                                    }}
                                                                    placeholder="Temp °C"
                                                                    className="w-32 rounded border px-2 py-1 text-sm"
                                                                />
                                                            ) : (
                                                                <span className="text-muted-foreground">
                                                                    —
                                                                </span>
                                                            )}
                                                        </td>

                                                        {canEditBbt && (
                                                            <td className="py-2">
                                                                <div className="flex gap-2">
                                                                    {reading.id ? (
                                                                        isEditing ? (
                                                                            <>
                                                                                <button
                                                                                    type="button"
                                                                                    className="rounded bg-blue-500 px-2 py-1 text-xs text-white"
                                                                                    onClick={() => saveReading(reading)}
                                                                                >
                                                                                    Save
                                                                                </button>

                                                                                <button
                                                                                    type="button"
                                                                                    className="rounded border px-2 py-1 text-xs"
                                                                                    onClick={resetInlineEdit}
                                                                                >
                                                                                    Cancel
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <button
                                                                                    type="button"
                                                                                    className="rounded border px-2 py-1 text-xs"
                                                                                    onClick={() => {
                                                                                        setEditingDate(reading.date);
                                                                                        setTableTemperature(String(reading.temperature ?? ''));
                                                                                    }}
                                                                                >
                                                                                    Edit
                                                                                </button>

                                                                                <button
                                                                                    type="button"
                                                                                    className="rounded border px-2 py-1 text-xs"
                                                                                    onClick={() => {
                                                                                        if (!reading.id) return;
                                                                                        if (!confirm('Delete this BBT reading?')) return;

                                                                                        router.delete(`/bbt/${reading.id}${ownerQuery}`, {
                                                                                            preserveScroll: true,
                                                                                            onSuccess: resetInlineEdit,
                                                                                        });
                                                                                    }}
                                                                                >
                                                                                    Delete
                                                                                </button>
                                                                            </>
                                                                        )
                                                                    ) : (
                                                                        <button
                                                                            type="button"
                                                                            className="rounded bg-blue-500 px-2 py-1 text-xs text-white"
                                                                            onClick={() => saveReading(reading)}
                                                                        >
                                                                            Add
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">
                                    No selected timeline.
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );

}