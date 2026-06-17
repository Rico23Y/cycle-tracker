import { useEffect, useMemo, useRef, useState } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { DayPicker } from 'react-day-picker';
import { dashboard } from '@/routes';

import {
    displayTemperatureValue,
    normalizeTemperatureForStorage,
    temperatureUnitLabel,
} from '@/lib/temperature';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

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

type Props = {
    readings: BbtReading[];
    nextPeriod: NextPeriod | null;

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

export default function Dashboard({
    readings,
    nextPeriod,
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
    const canLogBbt = canViewBbt && canEditBbt && (permissions?.can_edit_bbt ?? true);

    const canViewPredictions =
        !predictionsLocked &&
        (permissions?.can_view_predictions ?? true);

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

    function submitCycle(e: React.FormEvent) {
        e.preventDefault();

        if (!canEditCycles) return;

        cycleForm.post(`/cycles${ownerQuery}`, {
            preserveScroll: true,
            onSuccess: () => {
                cycleForm.reset('period_length');
            },
        });
    }

    function submit(e: React.FormEvent) {
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
        .map((r) => ({
            date: r.date,
            temp: displayTemperatureValue(r.temperature, temperatureUnit),
        }));

    if (cycleCount === 0) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Dashboard" />

                <div className="p-4">
                    <form
                        onSubmit={submitCycle}
                        className="mx-auto max-w-xl rounded-xl border p-6 space-y-4"
                    >
                        <div>
                            <h1 className="text-xl font-semibold">
                                Start tracking your cycle
                            </h1>

                            <p className="mt-2 text-sm text-muted-foreground">
                                Add your first Day One to begin. Period length and BBT can be added later.
                            </p>
                        </div>

                        {canEditCycles ? (
                            <>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-sm font-medium">
                                            Day One
                                        </label>

                                        <input
                                            type="date"
                                            value={cycleForm.data.start_date}
                                            onChange={(e) => cycleForm.setData('start_date', e.target.value)}
                                            className="mt-1 w-full rounded border px-3 py-2 text-sm"
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
                                            onChange={(e) => cycleForm.setData('period_length', e.target.value)}
                                            placeholder="Example: 5"
                                            className="mt-1 w-full rounded border px-3 py-2 text-sm"
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
                                    {cycleForm.processing ? 'Saving...' : 'Add Day One'}
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

            <div className="grid gap-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold">
                        Dashboard
                    </h1>

                    <p className="text-sm text-muted-foreground">
                        Viewing {dataAccess?.owner_label ?? 'My Data'}.
                    </p>
                </div>

                {/* BBT TILE */}
                <div className="rounded-xl border p-4 space-y-4">
                    <div>
                        <h3 className="text-sm font-semibold">
                            Temperature Trend
                        </h3>

                        <p className="text-xs text-muted-foreground">
                            Basal body temperature records
                        </p>
                    </div>

                    {!canViewBbt ? (
                        <div className="rounded-lg bg-gray-100 p-4 text-sm text-muted-foreground">
                            🔒 BBT is locked by the owner.
                        </div>
                    ) : (
                        <>
                            <div ref={chartRef} className="h-[240px]">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData}>
                                            <XAxis
                                                dataKey="date"
                                                tickFormatter={(tickItem) => {
                                                    const date = new Date(tickItem + 'T00:00:00');
                                                    const month = date.toLocaleString('default', {
                                                        month: 'short',
                                                    });
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
                                                tickFormatter={(value: number) => value.toFixed(2)}
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
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                        No BBT readings yet.
                                    </div>
                                )}
                            </div>

                            {canLogBbt ? (
                                <form onSubmit={submit} className="flex flex-wrap gap-2">
                                    <input
                                        type="date"
                                        value={data.date}
                                        onChange={e => setData('date', e.target.value)}
                                        className="rounded border px-2 py-1 text-sm"
                                    />

                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder={`Temp ${temperatureUnitLabel(temperatureUnit)}`}
                                        value={data.temperature}
                                        onChange={e => setData('temperature', e.target.value)}
                                        className="rounded border px-2 py-1 text-sm"
                                    />

                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="rounded bg-blue-500 px-3 py-1 text-sm text-white disabled:opacity-50"
                                    >
                                        {processing ? 'Saving...' : 'Add'}
                                    </button>
                                </form>
                            ) : (
                                <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                                    You can view BBT records, but editing is locked by the owner.
                                </div>
                            )}

                            <p className="text-xs text-muted-foreground">
                                Showing last {chartData.length} readings
                            </p>
                        </>
                    )}
                </div>

                {/* LOWER TILES */}
                <div className="mx-auto grid w-full max-w-5xl gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {/* NEXT PERIOD */}
                    <div className="flex min-h-[220px] flex-col justify-center rounded-xl border p-4">
                        <h3 className="mb-4 text-sm font-semibold">
                            Next Period
                        </h3>

                        {!canViewPredictions ? (
                            <div className="text-sm text-muted-foreground">
                                🔒 Predictions are locked by the owner.
                            </div>
                        ) : nextPeriod ? (
                            <>
                                <div className="text-4xl font-bold">
                                    {nextPeriod.days_left >= 0
                                        ? nextPeriod.days_left
                                        : Math.abs(nextPeriod.days_left)}
                                </div>

                                <div className="text-sm text-muted-foreground">
                                    {nextPeriod.days_left >= 0
                                        ? 'days left'
                                        : 'days late'}
                                </div>

                                <div className="mt-4 text-sm">
                                    Predicted Date
                                </div>

                                <div className="font-medium">
                                    {new Date(nextPeriod.predicted_period_date + 'T00:00:00')
                                        .toLocaleDateString('en-US', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                </div>
                            </>
                        ) : (
                            <div className="text-sm text-muted-foreground">
                                No cycle prediction available
                            </div>
                        )}
                    </div>

                    {/* OVULATION */}
                    <div className="flex min-h-[220px] flex-col justify-center rounded-xl border p-4">
                        <h3 className="mb-4 text-sm font-semibold">
                            Ovulation Window
                        </h3>

                        {!canViewPredictions ? (
                            <div className="text-sm text-muted-foreground">
                                🔒 Predictions are locked by the owner.
                            </div>
                        ) : nextPeriod ? (
                            <>
                                <div className="text-4xl font-bold">
                                    {nextPeriod.ovulation_days_left >= 0
                                        ? nextPeriod.ovulation_days_left
                                        : Math.abs(nextPeriod.ovulation_days_left)}
                                </div>

                                <div className="text-sm text-muted-foreground">
                                    {nextPeriod.ovulation_days_left >= 0
                                        ? 'days until ovulation'
                                        : 'days past ovulation'}
                                </div>

                                <div className="mt-4 text-sm">
                                    Ovulation Date
                                </div>

                                <div className="font-medium">
                                    {new Date(nextPeriod.ovulation_date + 'T00:00:00')
                                        .toLocaleDateString('en-US', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                </div>

                                <div className="mt-4 text-sm">
                                    Fertile Window Starts
                                </div>

                                <div className="font-medium">
                                    {new Date(nextPeriod.fertile_window_start + 'T00:00:00')
                                        .toLocaleDateString('en-US', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                </div>
                            </>
                        ) : (
                            <div className="text-sm text-muted-foreground">
                                No ovulation prediction available
                            </div>
                        )}
                    </div>

                    {/* SMALL CALENDAR */}
                    <div className="min-h-[220px] rounded-xl border p-4">
                        <h3 className="mb-4 text-sm font-semibold">
                            Cycle Calendar
                        </h3>

                        {!canViewPredictions ? (
                            <div className="text-sm text-muted-foreground">
                                🔒 Calendar predictions are locked by the owner.
                            </div>
                        ) : nextPeriod ? (
                            <DayPicker
                                disableNavigation
                                hideNavigation
                                fixedWeeks
                                showOutsideDays
                                month={new Date(nextPeriod.predicted_period_date + 'T00:00:00')}
                                modifiers={{
                                    predictedPeriod: [
                                        new Date(nextPeriod.predicted_period_date + 'T00:00:00'),
                                    ],

                                    predictedPeriodLength: {
                                        from: new Date(nextPeriod.predicted_period_date + 'T00:00:00'),
                                        to: new Date(nextPeriod.predicted_last_period_date + 'T00:00:00'),
                                    },

                                    currentPredictedPeriod: [
                                        new Date(nextPeriod.current_period_start_date + 'T00:00:00'),
                                    ],

                                    currentPredictedPeriodLength: {
                                        from: new Date(nextPeriod.current_period_start_date + 'T00:00:00'),
                                        to: new Date(nextPeriod.current_period_end_date + 'T00:00:00'),
                                    },

                                    fertile: {
                                        from: new Date(nextPeriod.fertile_window_start + 'T00:00:00'),
                                        to: new Date(nextPeriod.fertile_window_end + 'T00:00:00'),
                                    },

                                    postSafeDay: {
                                        from: new Date(nextPeriod.post_safe_start + 'T00:00:00'),
                                        to: new Date(nextPeriod.post_safe_end + 'T00:00:00'),
                                    },

                                    preSafeDay: {
                                        from: new Date(nextPeriod.pre_safe_start + 'T00:00:00'),
                                        to: new Date(nextPeriod.pre_safe_end + 'T00:00:00'),
                                    },

                                    ovulation: [
                                        new Date(nextPeriod.ovulation_date + 'T00:00:00'),
                                    ],

                                    pregnancy: [
                                        new Date(nextPeriod.pregnancy_test_date + 'T00:00:00'),
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
                        ) : (
                            <div className="text-sm text-muted-foreground">
                                No calendar prediction available
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}