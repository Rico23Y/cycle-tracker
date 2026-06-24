import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { DayPicker } from 'react-day-picker';
import {
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import {
    displayTemperatureValue,
    formatTemperature,
    normalizeTemperatureForStorage,
    temperatureUnitLabel,
} from '@/lib/temperature';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
    },
];

type BbtReading = {
    date: string;
    temperature: number;
};

type NextPeriod = {
    current_period_start_date: string;
    current_period_end_date: string;

    predicted_period_date: string;
    predicted_last_period_date: string;
    days_left: number;

    ovulation_date: string;
    ovulation_days_left: number;

    post_safe_start: string;
    post_safe_end: string;

    pre_safe_start: string;
    pre_safe_end: string;

    fertile_window_start: string;
    fertile_window_end: string;

    average_cycle_length: number;

    pregnancy_test_date: string;
};

type DashboardSummary = {
    current_cycle_day: number | null;
    estimated_cycle_length: number | null;
    cycle_progress_percent: number | null;
    current_phase: string;
    latest_cycle_start_date: string | null;
    latest_bbt: BbtReading | null;
    latest_symptom: {
        date: string;
        type: string;
        level: number;
    } | null;
};

type RecentActivityItem = {
    type: 'cycle' | 'bbt' | 'symptom';
    label: string;
    date: string;
};

type Props = {
    readings: BbtReading[];
    nextPeriod: NextPeriod | null;

    dashboardSummary: DashboardSummary;
    recentActivity: RecentActivityItem[];

    cycleCount?: number;
    canEditCycles?: boolean;

    bbtLocked?: boolean;
    predictionsLocked?: boolean;
    canEditBbt?: boolean;
};

type DataAccess = {
    owner_key: string;
    owner_label: string;
    is_self: boolean;
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

function parseDate(date: string) {
    return new Date(`${date}T00:00:00`);
}

function formatDate(date: string | null | undefined) {
    if (!date) {
        return '—';
    }

    return parseDate(date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}

function formatShortDate(date: string | null | undefined) {
    if (!date) {
        return '—';
    }

    return parseDate(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

function isBetween(date: Date, start: string, end: string) {
    const from = parseDate(start);
    const to = parseDate(end);

    return date >= from && date <= to;
}

function getCycleDay(nextPeriod: NextPeriod | null) {
    if (!nextPeriod) {
        return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = parseDate(nextPeriod.current_period_start_date);

    const diff = Math.floor(
        (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diff < 0) {
        return null;
    }

    return diff + 1;
}

function getCurrentPhase(nextPeriod: NextPeriod | null) {
    if (!nextPeriod) {
        return 'Tracking started';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (
        isBetween(
            today,
            nextPeriod.current_period_start_date,
            nextPeriod.current_period_end_date
        )
    ) {
        return 'Period';
    }

    if (
        isBetween(
            today,
            nextPeriod.fertile_window_start,
            nextPeriod.fertile_window_end
        )
    ) {
        return 'Fertile window';
    }

    if (
        today.toDateString() ===
        parseDate(nextPeriod.ovulation_date).toDateString()
    ) {
        return 'Ovulation';
    }

    if (nextPeriod.days_left >= 0 && nextPeriod.days_left <= 3) {
        return 'Period soon';
    }

    if (nextPeriod.ovulation_days_left < 0) {
        return 'Luteal phase';
    }

    return 'Cycle tracking';
}

function StatCard({
    title,
    value,
    helper,
    locked = false,
}: {
    title: string;
    value: string;
    helper?: string;
    locked?: boolean;
}) {
    return (
        <div className="rounded-xl border bg-card p-4">
            <div className="text-sm text-muted-foreground">
                {title}
            </div>

            <div className="mt-2 text-2xl font-bold">
                {locked ? '🔒' : value}
            </div>

            {helper && (
                <div className="mt-1 text-sm text-muted-foreground">
                    {helper}
                </div>
            )}
        </div>
    );
}

export default function Dashboard({
    readings,
    nextPeriod,
    dashboardSummary,
    recentActivity,
    cycleCount = 0,
    canEditCycles = true,
    bbtLocked = false,
    predictionsLocked = false,
    canEditBbt = true,
}: Props) {
    const { auth, dataAccess } = usePage().props as {
        auth: {
            user: {
                temperature_unit?: 'celsius' | 'fahrenheit';
            };
        };
        dataAccess?: DataAccess;
    };

    const temperatureUnit = auth.user.temperature_unit ?? 'celsius';

    const permissions = dataAccess?.permissions;

    const canViewBbt = !bbtLocked && (permissions?.can_view_bbt ?? true);
    const canLogBbt =
        canViewBbt &&
        canEditBbt &&
        (permissions?.can_edit_bbt ?? true);

    const canViewPredictions =
        !predictionsLocked &&
        (permissions?.can_view_predictions ?? true);

    const canActuallyEditCycles =
        canEditCycles &&
        (permissions?.can_edit_cycles ?? true);

    const ownerQuery =
        dataAccess?.owner_key && dataAccess.owner_key !== 'me'
            ? `?owner=${encodeURIComponent(dataAccess.owner_key)}`
            : '';

    const chartRef = useRef<HTMLDivElement | null>(null);

    const [chartWidth, setChartWidth] = useState(0);

    useEffect(() => {
        if (!chartRef.current) return;

        const observer = new ResizeObserver((entries) => {
            setChartWidth(entries[0].contentRect.width);
        });

        observer.observe(chartRef.current);

        return () => observer.disconnect();
    }, []);

    const visiblePointCount = useMemo(() => {
        if (chartWidth >= 1200) return 30;
        if (chartWidth >= 900) return 21;
        if (chartWidth >= 600) return 14;
        return 7;
    }, [chartWidth]);

    const { data, setData, post, processing, reset, transform } = useForm({
        temperature: '',
        date: new Date().toISOString().slice(0, 10),
    });

    const cycleForm = useForm({
        start_date: new Date().toISOString().slice(0, 10),
        period_length: '',
    });

    function submitCycle(e: FormEvent) {
        e.preventDefault();

        if (!canActuallyEditCycles) return;

        cycleForm.post(`/cycles${ownerQuery}`, {
            preserveScroll: true,
            onSuccess: () => {
                cycleForm.reset('period_length');
            },
        });
    }

    function submit(e: FormEvent) {
        e.preventDefault();

        if (!canLogBbt) return;

        transform((currentData) => ({
            ...currentData,
            temperature: normalizeTemperatureForStorage(
                currentData.temperature,
                temperatureUnit
            ).toFixed(3),
        }));

        post(`/bbt${ownerQuery}`, {
            preserveScroll: true,
            onSuccess: () => reset('temperature'),
        });
    }

    const chartData = [...readings]
        .slice(0, visiblePointCount)
        .reverse()
        .map((reading) => ({
            date: reading.date,
            temp: displayTemperatureValue(
                reading.temperature,
                temperatureUnit
            ),
        }));

    const latestBbt = dashboardSummary.latest_bbt ?? readings[0] ?? null;

    const latestSymptom = dashboardSummary.latest_symptom;

    const cycleDay =
        dashboardSummary.current_cycle_day ?? getCycleDay(nextPeriod);

    const phase =
        dashboardSummary.current_phase ?? getCurrentPhase(nextPeriod);

    const estimatedCycleLength =
        dashboardSummary.estimated_cycle_length ??
        nextPeriod?.average_cycle_length ??
        null;

    const cycleProgress =
        dashboardSummary.cycle_progress_percent ??
        (
            cycleDay && estimatedCycleLength
                ? Math.min(100, Math.round((cycleDay / estimatedCycleLength) * 100))
                : 0
        );

    if (cycleCount === 0) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Dashboard" />

                <div className="p-4">
                    <form
                        onSubmit={submitCycle}
                        className="mx-auto max-w-xl space-y-4 rounded-xl border bg-card p-6"
                    >
                        <div>
                            <h1 className="text-xl font-semibold">
                                Start tracking your cycle
                            </h1>

                            <p className="mt-2 text-sm text-muted-foreground">
                                Add your first Day One to begin. Period length and BBT can be added later.
                            </p>
                        </div>

                        {canActuallyEditCycles ? (
                            <>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm font-medium">
                                            Day One
                                        </label>

                                        <input
                                            type="date"
                                            value={cycleForm.data.start_date}
                                            onChange={(e) =>
                                                cycleForm.setData(
                                                    'start_date',
                                                    e.target.value
                                                )
                                            }
                                            className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
                                        />

                                        {cycleForm.errors.start_date && (
                                            <div className="mt-1 text-sm text-red-500">
                                                {cycleForm.errors.start_date}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium">
                                            Period length optional
                                        </label>

                                        <input
                                            type="number"
                                            min="1"
                                            max="15"
                                            value={cycleForm.data.period_length}
                                            onChange={(e) =>
                                                cycleForm.setData(
                                                    'period_length',
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Example: 5"
                                            className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
                                        />

                                        {cycleForm.errors.period_length && (
                                            <div className="mt-1 text-sm text-red-500">
                                                {cycleForm.errors.period_length}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={cycleForm.processing}
                                    className="rounded bg-blue-500 px-4 py-2 text-sm text-white disabled:opacity-50"
                                >
                                    {cycleForm.processing
                                        ? 'Saving...'
                                        : 'Add Day One'}
                                </button>
                            </>
                        ) : (
                            <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                                Cycle editing is locked by the owner.
                            </div>
                        )}
                    </form>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="space-y-6 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">
                            Dashboard
                        </h1>

                        <p className="text-sm text-muted-foreground">
                            Viewing {dataAccess?.owner_label ?? 'My Data'}.
                        </p>
                    </div>

                    <div className="text-sm text-muted-foreground">
                        {new Date().toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                        })}
                    </div>
                </div>

                {/* HERO */}
                <div className="rounded-2xl border bg-card p-6">
                    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                        <div>
                            <div className="text-sm text-muted-foreground">
                                Current cycle status
                            </div>

                            <div className="mt-2 flex flex-wrap items-end gap-3">
                                <div className="text-4xl font-bold">
                                    {cycleDay ? `Day ${cycleDay}` : 'Tracking'}
                                </div>

                                <div className="rounded-full border px-3 py-1 text-sm">
                                    {phase}
                                </div>
                            </div>

                            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
                                {canViewPredictions && nextPeriod
                                    ? `Your average cycle is ${nextPeriod.average_cycle_length} days. The next predicted period is ${formatDate(nextPeriod.predicted_period_date)}.`
                                    : 'Add at least two Day One records to unlock cycle predictions.'}
                            </p>

                            <div className="mt-5">
                                <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                                    <span>
                                        Cycle progress
                                    </span>

                                    <span>
                                        {cycleDay && estimatedCycleLength
                                            ? `${cycleDay} / ${estimatedCycleLength} days`
                                            : '—'}
                                    </span>
                                </div>

                                <div className="h-3 overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full rounded-full bg-foreground"
                                        style={{
                                            width: `${cycleProgress}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
                            <Link
                                href={`/calendar${ownerQuery}`}
                                className="rounded-xl border p-4 text-sm transition hover:bg-muted/50"
                            >
                                <div className="font-medium">
                                    Open calendar
                                </div>

                                <div className="text-muted-foreground">
                                    View periods, BBT, symptoms, and predictions.
                                </div>
                            </Link>

                            <Link
                                href={`/insights${ownerQuery}`}
                                className="rounded-xl border p-4 text-sm transition hover:bg-muted/50"
                            >
                                <div className="font-medium">
                                    View insights
                                </div>

                                <div className="text-muted-foreground">
                                    Check cycle regularity and trends.
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* SUMMARY CARDS */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <StatCard
                        title="Next period"
                        locked={!canViewPredictions}
                        value={
                            nextPeriod
                                ? nextPeriod.days_left >= 0
                                    ? `${nextPeriod.days_left} days`
                                    : `${Math.abs(nextPeriod.days_left)} days late`
                                : '—'
                        }
                        helper={
                            nextPeriod
                                ? formatDate(nextPeriod.predicted_period_date)
                                : 'No prediction yet'
                        }
                    />

                    <StatCard
                        title="Ovulation"
                        locked={!canViewPredictions}
                        value={
                            nextPeriod
                                ? nextPeriod.ovulation_days_left >= 0
                                    ? `${nextPeriod.ovulation_days_left} days`
                                    : `${Math.abs(nextPeriod.ovulation_days_left)} days ago`
                                : '—'
                        }
                        helper={
                            nextPeriod
                                ? formatDate(nextPeriod.ovulation_date)
                                : 'No prediction yet'
                        }
                    />

                    <StatCard
                        title="Fertile window"
                        locked={!canViewPredictions}
                        value={
                            nextPeriod
                                ? `${formatShortDate(nextPeriod.fertile_window_start)} - ${formatShortDate(nextPeriod.fertile_window_end)}`
                                : '—'
                        }
                        helper="Estimated window"
                    />

                    <StatCard
                        title="Latest BBT"
                        locked={!canViewBbt}
                        value={
                            latestBbt
                                ? formatTemperature(
                                    latestBbt.temperature,
                                    temperatureUnit
                                )
                                : '—'
                        }
                        helper={
                            latestBbt
                                ? formatDate(latestBbt.date)
                                : 'No reading yet'
                        }
                    />

                    <StatCard
                        title="Latest symptom"
                        value={
                            latestSymptom
                                ? `${latestSymptom.type} ${'★'.repeat(latestSymptom.level)}`
                                : '—'
                        }
                        helper={
                            latestSymptom
                                ? formatDate(latestSymptom.date)
                                : 'No symptom logged'
                        }
                    />
                </div>

                {/* CHART + QUICK LOG */}
                <div className="grid gap-4 xl:grid-cols-3">
                    <div className="space-y-4 rounded-xl border bg-card p-4 xl:col-span-2">
                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h2 className="font-semibold">
                                    Temperature trend
                                </h2>

                                <p className="text-sm text-muted-foreground">
                                    Showing last {chartData.length} BBT reading(s).
                                </p>
                            </div>

                            <div className="text-sm text-muted-foreground">
                                {temperatureUnitLabel(temperatureUnit)}
                            </div>
                        </div>

                        {!canViewBbt ? (
                            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                                🔒 BBT is locked by the owner.
                            </div>
                        ) : (
                            <div
                                ref={chartRef}
                                className="h-[300px] min-h-[300px] min-w-0"
                            >
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                        minWidth={0}
                                    >
                                        <LineChart data={chartData}>
                                            <XAxis
                                                dataKey="date"
                                                tickFormatter={(tickItem) => {
                                                    const date = parseDate(tickItem);
                                                    const month = date.toLocaleString(
                                                        'default',
                                                        {
                                                            month: 'short',
                                                        }
                                                    );
                                                    const day = date.getDate();

                                                    return `${month}-${day}`;
                                                }}
                                            />

                                            <YAxis
                                                domain={[
                                                    (dataMin: number) =>
                                                        Math.floor((dataMin - 0.2) * 100) / 100,
                                                    (dataMax: number) =>
                                                        Math.ceil((dataMax + 0.2) * 100) / 100,
                                                ]}
                                                tickFormatter={(value: number) =>
                                                    value.toFixed(2)
                                                }
                                            />

                                            <Tooltip
                                                formatter={(value) => [
                                                    `${Number(value).toFixed(2)}${temperatureUnitLabel(temperatureUnit)}`,
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
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                        No BBT readings yet.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 rounded-xl border bg-card p-4">
                        <div>
                            <h2 className="font-semibold">
                                Quick log
                            </h2>

                            <p className="text-sm text-muted-foreground">
                                Add today’s BBT or start a new cycle.
                            </p>
                        </div>

                        {canLogBbt ? (
                            <form onSubmit={submit} className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium">
                                        Date
                                    </label>

                                    <input
                                        type="date"
                                        value={data.date}
                                        onChange={(e) =>
                                            setData('date', e.target.value)
                                        }
                                        className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium">
                                        Temperature
                                    </label>

                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder={`Temp ${temperatureUnitLabel(temperatureUnit)}`}
                                        value={data.temperature}
                                        onChange={(e) =>
                                            setData('temperature', e.target.value)
                                        }
                                        className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full rounded bg-blue-500 px-3 py-2 text-sm text-white disabled:opacity-50"
                                >
                                    {processing ? 'Saving...' : 'Add BBT'}
                                </button>
                            </form>
                        ) : (
                            <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                                BBT editing is locked by the owner.
                            </div>
                        )}

                        <div className="border-t pt-4">
                            <form onSubmit={submitCycle} className="space-y-3">
                                <div>
                                    <label className="text-sm font-medium">
                                        New Day One
                                    </label>

                                    <input
                                        type="date"
                                        value={cycleForm.data.start_date}
                                        onChange={(e) =>
                                            cycleForm.setData(
                                                'start_date',
                                                e.target.value
                                            )
                                        }
                                        className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
                                    />

                                    {cycleForm.errors.start_date && (
                                        <div className="mt-1 text-sm text-red-500">
                                            {cycleForm.errors.start_date}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-sm font-medium">
                                        Period length optional
                                    </label>

                                    <input
                                        type="number"
                                        min="1"
                                        max="15"
                                        value={cycleForm.data.period_length}
                                        onChange={(e) =>
                                            cycleForm.setData(
                                                'period_length',
                                                e.target.value
                                            )
                                        }
                                        placeholder="Example: 5"
                                        className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={
                                        cycleForm.processing ||
                                        !canActuallyEditCycles
                                    }
                                    className="w-full rounded border px-3 py-2 text-sm disabled:opacity-50"
                                >
                                    {cycleForm.processing
                                        ? 'Saving...'
                                        : 'Add Day One'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* CALENDAR + LEGEND */}
                <div className="grid gap-4 xl:grid-cols-3">
                    <div className="space-y-4 rounded-xl border bg-card p-4 xl:col-span-2">
                        <div>
                            <h2 className="font-semibold">
                                Cycle calendar
                            </h2>

                            <p className="text-sm text-muted-foreground">
                                A quick visual view of predicted period, fertile window, ovulation, and safe days.
                            </p>
                        </div>

                        {!canViewPredictions ? (
                            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                                🔒 Calendar predictions are locked by the owner.
                            </div>
                        ) : nextPeriod ? (
                            <div className="overflow-x-auto">
                                <DayPicker
                                    disableNavigation
                                    hideNavigation
                                    fixedWeeks
                                    showOutsideDays
                                    month={parseDate(nextPeriod.predicted_period_date)}
                                    modifiers={{
                                        predictedPeriod: [
                                            parseDate(nextPeriod.predicted_period_date),
                                        ],

                                        predictedPeriodLength: {
                                            from: parseDate(nextPeriod.predicted_period_date),
                                            to: parseDate(nextPeriod.predicted_last_period_date),
                                        },

                                        currentPredictedPeriod: [
                                            parseDate(nextPeriod.current_period_start_date),
                                        ],

                                        currentPredictedPeriodLength: {
                                            from: parseDate(nextPeriod.current_period_start_date),
                                            to: parseDate(nextPeriod.current_period_end_date),
                                        },

                                        fertile: {
                                            from: parseDate(nextPeriod.fertile_window_start),
                                            to: parseDate(nextPeriod.fertile_window_end),
                                        },

                                        postSafeDay: {
                                            from: parseDate(nextPeriod.post_safe_start),
                                            to: parseDate(nextPeriod.post_safe_end),
                                        },

                                        preSafeDay: {
                                            from: parseDate(nextPeriod.pre_safe_start),
                                            to: parseDate(nextPeriod.pre_safe_end),
                                        },

                                        ovulation: [
                                            parseDate(nextPeriod.ovulation_date),
                                        ],

                                        pregnancy: [
                                            parseDate(nextPeriod.pregnancy_test_date),
                                        ],
                                    }}
                                    modifiersClassNames={{
                                        predictedPeriod: 'bg-red-400 text-black rounded-full',
                                        predictedPeriodLength: 'bg-red-200 text-black rounded-full',
                                        currentPredictedPeriod: 'bg-red-400 text-black rounded-full',
                                        currentPredictedPeriodLength: 'bg-red-200 text-black rounded-full',
                                        fertile: 'bg-sky-200 text-black rounded-full',
                                        ovulation: '!bg-blue-500 text-white rounded-full',
                                        pregnancy: '!bg-orange-200 text-black rounded-full',
                                        postSafeDay: 'bg-green-100 text-black rounded-full',
                                        preSafeDay: 'bg-green-100 text-black rounded-full',
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                                No calendar prediction available.
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 rounded-xl border bg-card p-4">
                        <div>
                            <h2 className="font-semibold">
                                Legend
                            </h2>

                            <p className="text-sm text-muted-foreground">
                                Color guide for the mini calendar.
                            </p>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-red-400" />
                                <span>Day One</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-red-200" />
                                <span>Period days</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-sky-200" />
                                <span>Fertile window</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-blue-500" />
                                <span>Ovulation</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-green-100" />
                                <span>Potential safe day</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-orange-200" />
                                <span>Pregnancy test reminder</span>
                            </div>
                        </div>
                    </div>

                    {/* RECENT ACTIVITY */}
                    <div className="rounded-xl border bg-card p-4 xl:col-span-3">
                        <div>
                            <h2 className="font-semibold">
                                Recent activity
                            </h2>

                            <p className="text-sm text-muted-foreground">
                                Latest cycle, BBT, and symptom records.
                            </p>
                        </div>

                        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-3">
                            {recentActivity.length > 0 ? (
                                recentActivity.map((item, index) => (
                                    <div
                                        key={`${item.type}-${item.date}-${index}`}
                                        className="min-w-0 rounded-lg border p-3 text-sm"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 break-words font-medium">
                                                {item.label}
                                            </div>

                                            <div className="shrink-0 rounded-full border px-2 py-0.5 text-xs capitalize text-muted-foreground">
                                                {item.type}
                                            </div>
                                        </div>

                                        <div className="mt-1 break-words text-muted-foreground">
                                            {formatDate(item.date)}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                                    No recent activity yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}