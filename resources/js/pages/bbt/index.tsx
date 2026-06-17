import { useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

import {
    displayTemperatureValue,
    formatTemperature,
    normalizeTemperatureForStorage,
    temperatureInputValue,
    temperatureUnitLabel,
} from '@/lib/temperature';

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

type BbtAnalysis = {
    usable: boolean;
    status: 'usable' | 'not_usable';
    reason: string | null;

    cover_line: number | null;

    calendar_ovulation_day: number | null;
    bbt_ovulation_day: number | null;
    shift_start_day: number | null;

    rule_used: 'standard' | 'slow_rise' | 'fallback' | null;

    ignored_dates: string[];
    outlier_dates: string[];

    valid_temp_count: number;
    missing_temp_count: number;

    confidence: 'high' | 'medium' | 'low' | 'none';
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

    calendar_ovulation_day: number | null;
    analysis: BbtAnalysis;

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
    const { auth, errors, dataAccess } = usePage().props as {
        auth: {
            user: {
                temperature_unit?: 'celsius' | 'fahrenheit';
            };
        };
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

    const temperatureUnit = auth.user.temperature_unit ?? 'celsius';

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

    const selectedTimelineIndex = useMemo(() => {
        return timelines.findIndex((item) => item.id === selectedTimelineId);
    }, [timelines, selectedTimelineId]);

    const canGoPreviousTimeline = selectedTimelineIndex > 0;
    const canGoNextTimeline =
        selectedTimelineIndex >= 0 &&
        selectedTimelineIndex < timelines.length - 1;

    function goToPreviousTimeline() {
        if (!canGoPreviousTimeline) return;

        setSelectedTimelineId(timelines[selectedTimelineIndex - 1].id);
        resetInlineEdit();
    }

    function goToNextTimeline() {
        if (!canGoNextTimeline) return;

        setSelectedTimelineId(timelines[selectedTimelineIndex + 1].id);
        resetInlineEdit();
    }

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

    const rawChartData = timeline
        ? timeline.readings
        : [];

    const hasTemperatureData = rawChartData.some(
        (reading) => reading.temperature !== null
    );

    const chartData = rawChartData.map((reading) => {
        const displayTemperature = displayTemperatureValue(
            reading.temperature,
            temperatureUnit
        );

        return {
            ...reading,
            temperature: displayTemperature,
            raw_temperature: reading.temperature,
            tooltip_anchor:
                displayTemperature ??
                (temperatureUnit === 'fahrenheit' ? 97.7 : 36.5),
        };
    });

    const simpleChartData = [...readings]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((reading) => ({
            date: reading.date,
            temp: displayTemperatureValue(reading.temperature, temperatureUnit),
        }));

    const useSimpleBbtMode =
        timelines.length === 0 || !timeline;

    const analysis = timeline?.analysis ?? null;

    function formatRule(rule: BbtAnalysis['rule_used']) {
        if (rule === 'standard') return 'Standard rise';
        if (rule === 'slow_rise') return 'Slow rise';
        if (rule === 'fallback') return 'Fall-back rise';

        return '—';
    }

    function formatConfidence(confidence: BbtAnalysis['confidence']) {
        if (confidence === 'high') return 'High';
        if (confidence === 'medium') return 'Medium';
        if (confidence === 'low') return 'Low';

        return 'None';
    }

    function isOutlierDate(date: string) {
        return analysis?.outlier_dates.includes(date) ?? false;
    }

    function isIgnoredDate(date: string) {
        return analysis?.ignored_dates.includes(date) ?? false;
    }        

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
                    temperature: normalizeTemperatureForStorage(
                        quickTemperature,
                        temperatureUnit
                    ).toFixed(3),
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
                temperature: normalizeTemperatureForStorage(
                    quickTemperature,
                    temperatureUnit
                ).toFixed(3),
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

        const normalizedTemperature = normalizeTemperatureForStorage(
            value,
            temperatureUnit
        ).toFixed(3);

        if (reading.id) {
            router.put(
                `/bbt/${reading.id}${ownerQuery}`,
                {
                    temperature: normalizedTemperature,
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

    function BbtChartTooltip({
        active,
        payload,
        label,
    }: {
        active?: boolean;
        payload?: {
            value: number | null;
            dataKey?: string;
            payload: BbtReading & {
                tooltip_anchor?: number;
                raw_temperature?: number | null;
            };
        }[];
        label?: number | string;
    }) {
        if (!active || label === undefined || label === null) {
            return null;
        }

        const cycleDay = Number(label);

        const reading =
            timeline?.readings.find((item) => item.cycle_day === cycleDay) ??
            payload?.[0]?.payload;

        if (!reading) {
            return null;
        }

        const isCalendarOvulation =
            timeline?.calendar_ovulation_day === cycleDay;

        const isBbtOvulation =
            analysis?.usable &&
            analysis.bbt_ovulation_day === cycleDay;

        return (
            <div className="rounded-lg border bg-background p-3 text-sm shadow">
                <div className="font-medium">
                    Cycle Day {cycleDay}
                </div>

                <div className="text-muted-foreground">
                    {new Date(reading.date + 'T00:00:00').toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                    })}
                </div>

                <div className="mt-2">
                    Temperature:{' '}
                    {reading.temperature !== null
                        ? `${formatTemperature(reading.temperature, temperatureUnit)}`
                        : 'No BBT reading'}
                </div>

                {reading.temperature !== null && isOutlierDate(reading.date) && (
                    <div className="mt-1 text-orange-600">
                        This reading is marked as an outlier and ignored in BBT analysis.
                    </div>
                )}

                {reading.temperature !== null &&
                    isIgnoredDate(reading.date) &&
                    !isOutlierDate(reading.date) && (
                        <div className="mt-1 text-muted-foreground">
                            This reading was ignored in BBT analysis.
                        </div>
                    )}

                {(isCalendarOvulation || isBbtOvulation) && (
                    <div className="mt-3 space-y-2 border-t pt-2">
                        {isCalendarOvulation && (
                            <div>
                                <div className="font-medium">
                                    Calendar Ovulation
                                </div>

                                <div className="text-muted-foreground">
                                    Estimated from the cycle length / calendar prediction.
                                </div>
                            </div>
                        )}

                        {isBbtOvulation && (
                            <div>
                                <div className="font-medium">
                                    BBT Ovulation
                                </div>

                                <div className="text-muted-foreground">
                                    Estimated from a confirmed BBT temperature shift.
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {analysis?.usable && analysis.cover_line !== null && (
                    <div className="mt-2 text-muted-foreground">
                        Cover line: {formatTemperature(analysis.cover_line, temperatureUnit, 1)}
                    </div>
                )}
            </div>
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
                                        placeholder={`Temperature ${temperatureUnitLabel(temperatureUnit)}`}
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
                                                domain={
                                                    hasTemperatureData
                                                        ? [
                                                            (dataMin: number) =>
                                                                Math.floor((dataMin - 0.2) * 100) / 100,
                                                            (dataMax: number) =>
                                                                Math.ceil((dataMax + 0.2) * 100) / 100,
                                                        ]
                                                        : [36, 37]
                                                }
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
                                                    `${Number(value).toFixed(2)}${temperatureUnitLabel(temperatureUnit)}`,
                                                    'Temperature',
                                                ]}
                                            />

                                            <Line
                                                type="monotone"
                                                dataKey="tooltip_anchor"
                                                name="Tooltip Anchor"
                                                stroke="transparent"
                                                dot={false}
                                                activeDot={false}
                                                legendType="none"
                                                isAnimationActive={false}
                                            />

                                            <Line
                                                type="monotone"
                                                dataKey="temp"
                                                name="Temperature"
                                                connectNulls={true}
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
                                                                        placeholder={`Temp ${temperatureUnitLabel(temperatureUnit)}`}
                                                                        className="w-32 rounded border px-2 py-1 text-sm"
                                                                    />
                                                                ) : (
                                                                    <span>
                                                                        {formatTemperature(reading.temperature, temperatureUnit)}
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
                                                                                        setTableTemperature(
                                                                                                temperatureInputValue(reading.temperature, temperatureUnit)
                                                                                            );
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
                        <div className="rounded-xl border p-4 space-y-2">
                            <div className="text-sm font-medium">
                                Select Cycle Range
                            </div>

                            <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                                <select
                                    value={selectedTimelineId}
                                    onChange={(e) => {
                                        setSelectedTimelineId(e.target.value);
                                        resetInlineEdit();
                                    }}
                                    className="min-w-0 w-full rounded border px-3 py-2 text-sm"
                                >
                                    {timelines.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    type="button"
                                    onClick={goToPreviousTimeline}
                                    disabled={!canGoPreviousTimeline}
                                    aria-label="Previous cycle range"
                                    title="Previous cycle range"
                                    className="
                                        flex
                                        h-11
                                        w-11
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded
                                        border
                                        text-3xl
                                        disabled:cursor-not-allowed
                                        disabled:opacity-50
                                    "
                                >
                                    <span className="-mt-1.5 leading-none">
                                        ‹
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={goToNextTimeline}
                                    disabled={!canGoNextTimeline}
                                    aria-label="Next cycle range"
                                    title="Next cycle range"
                                    className="
                                        flex
                                        h-11
                                        w-11
                                        shrink-0
                                        items-center
                                        justify-center
                                        rounded
                                        border
                                        text-3xl
                                        disabled:cursor-not-allowed
                                        disabled:opacity-50
                                    "
                                >
                                    <span className="-mt-1.5 leading-none">
                                        ›
                                    </span>
                                </button>
                            </div>

                            {timeline && (
                                <div className="text-xs text-muted-foreground">
                                    Showing {selectedTimelineIndex + 1} of {timelines.length}
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
                                        placeholder={`Temperature ${temperatureUnitLabel(temperatureUnit)}`}
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

                            {analysis && (
                                <div className="grid gap-3 md:grid-cols-4">
                                    <div className="rounded-lg border p-3">
                                        <div className="text-xs text-muted-foreground">
                                            BBT Status
                                        </div>

                                        <div
                                            className={
                                                analysis.usable
                                                    ? 'mt-1 font-semibold text-green-600'
                                                    : 'mt-1 font-semibold text-orange-600'
                                            }
                                        >
                                            {analysis.usable ? 'Usable' : 'Not usable'}
                                        </div>
                                    </div>

                                    <div className="rounded-lg border p-3">
                                        <div className="text-xs text-muted-foreground">
                                            Confidence
                                        </div>

                                        <div className="mt-1 font-semibold">
                                            {formatConfidence(analysis.confidence)}
                                        </div>
                                    </div>

                                    <div className="rounded-lg border p-3">
                                        <div className="text-xs text-muted-foreground">
                                            Rule
                                        </div>

                                        <div className="mt-1 font-semibold">
                                            {formatRule(analysis.rule_used)}
                                        </div>
                                    </div>

                                    <div className="rounded-lg border p-3">
                                        <div className="text-xs text-muted-foreground">
                                            Cover Line
                                        </div>

                                        <div className="mt-1 font-semibold">
                                            {analysis.cover_line !== null
                                                ? formatTemperature(analysis.cover_line, temperatureUnit, 1)
                                                : '—'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {analysis && !analysis.usable && (
                                <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                                    {analysis.reason}
                                </div>
                            )}

                            {analysis && (
                                <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                                    <div>
                                        Calendar ovulation estimate:{' '}
                                        {analysis.calendar_ovulation_day
                                            ? `Day ${analysis.calendar_ovulation_day}`
                                            : '—'}
                                    </div>

                                    <div>
                                        BBT-based ovulation:{' '}
                                        {analysis.bbt_ovulation_day
                                            ? `Day ${analysis.bbt_ovulation_day}`
                                            : '—'}
                                    </div>

                                    <div>
                                        Ignored / unusual readings:{' '}
                                        {analysis.ignored_dates.length}
                                    </div>
                                </div>
                            )}

                            {!hasTemperatureData && (
                                <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                                    No BBT temperatures are recorded for this cycle range yet, but cycle markers are still shown.
                                </div>
                            )}                       

                            {chartData.length > 0 ? (                  
                                <div className="h-[360px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={chartData}
                                            margin={{
                                                top: 48,
                                                right: 24,
                                                bottom: 32,
                                                left: 12,
                                            }}
                                        >
                                            <XAxis
                                                dataKey="cycle_day"
                                                label={{
                                                    value: 'Cycle Day',
                                                    position: 'insideBottom',
                                                    offset: -5,
                                                }}
                                            />

                                            <YAxis
                                                domain={
                                                    hasTemperatureData
                                                        ? [
                                                            (dataMin: number) =>
                                                                Math.floor((dataMin - 0.2) * 100) / 100,
                                                            (dataMax: number) =>
                                                                Math.ceil((dataMax + 0.2) * 100) / 100,
                                                        ]
                                                        : [36, 37]
                                                }
                                                tickFormatter={(value: number) => value.toFixed(2)}
                                            />

                                            <Tooltip
                                                content={<BbtChartTooltip />}
                                                filterNull={false}
                                            />

                                            {timeline?.calendar_ovulation_day && (
                                                <ReferenceLine
                                                    x={timeline.calendar_ovulation_day}
                                                    strokeDasharray="3 3"
                                                    label={{
                                                        value: 'Calendar Ovulation',
                                                        position: 'insideTop',
                                                        dy: 12,
                                                        fontSize: 12,
                                                    }}
                                                />
                                            )}

                                            {analysis?.usable && analysis.cover_line !== null && (
                                                <ReferenceLine
                                                    y={analysis.cover_line}
                                                    strokeDasharray="4 4"
                                                    label="Cover Line"
                                                />
                                            )}

                                            {analysis?.usable && analysis.bbt_ovulation_day !== null && (
                                                <ReferenceLine
                                                    x={analysis.bbt_ovulation_day}
                                                    strokeDasharray="4 4"
                                                    label={{
                                                        value: 'BBT Ovulation',
                                                        position: 'insideTop',
                                                        dy: 30,
                                                        fontSize: 12,
                                                    }}
                                                />
                                            )}

                                            <Line
                                                type="monotone"
                                                dataKey="tooltip_anchor"
                                                name="Tooltip Anchor"
                                                stroke="rgba(0,0,0,0.01)"
                                                strokeWidth={12}
                                                dot={false}
                                                activeDot={false}
                                                legendType="none"
                                                isAnimationActive={false}
                                            />

                                            <Line
                                                type="monotone"
                                                dataKey="temperature"
                                                name="Temperature"
                                                connectNulls={true}
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
                                                                    {formatTemperature(reading.temperature, temperatureUnit)}

                                                                    {isOutlierDate(reading.date) && (
                                                                        <span className="ml-2 rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
                                                                            outlier
                                                                        </span>
                                                                    )}

                                                                    {isIgnoredDate(reading.date) && !isOutlierDate(reading.date) && (
                                                                        <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                                                            ignored
                                                                        </span>
                                                                    )}
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
                                                                    placeholder={`Temp ${temperatureUnitLabel(temperatureUnit)}`}
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
                                                                                        setTableTemperature(
                                                                                            temperatureInputValue(reading.temperature, temperatureUnit)
                                                                                        );
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