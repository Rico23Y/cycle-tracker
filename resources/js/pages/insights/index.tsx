import { Head, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import AppLayout from '@/layouts/app-layout';
import {
    displayTemperatureValue,
    formatTemperature,
    temperatureUnitLabel,
} from '@/lib/temperature';
import type { BreadcrumbItem, TemperatureUnit } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Insights',
        href: '/insights',
    },
];

type CycleStats = {
    average_cycle_length: number | null;
    shortest_cycle: number | null;
    longest_cycle: number | null;
    cycle_variation: number | null;

    average_period_length: number | null;
    shortest_period: number | null;
    longest_period: number | null;
    period_variation: number | null;
};

type BbtStats = {
    locked?: boolean;
    reason?: string;

    reading_count?: number;
    average_temperature?: number | null;
    coldest_temperature?: number | null;
    hottest_temperature?: number | null;
    temperature_variation?: number | null;
};

type SymptomTypeDistribution = {
    type: string;
    count: number;
    percentage: number;
    average_level: number;
    max_level: number;
};

type SymptomLevelCount = {
    level: number;
    label: string;
    count: number;
};

type SymptomStats = {
    locked?: boolean;
    reason?: string;

    symptom_count?: number;
    top_common?: SymptomTypeDistribution[];
    top_highest_rated?: SymptomTypeDistribution[];
    level_counts?: SymptomLevelCount[];
    type_distribution?: SymptomTypeDistribution[];
};

type OvulationCorrelationItem = {
    label: string;
    cycle_start_date: string;
    calendar_ovulation_date: string;
    bbt_ovulation_date: string;
    difference_days: number;
    confidence: string;
};

type OvulationCorrelation = {
    locked?: boolean;
    reason?: string;

    match_count?: number;
    average_difference_days?: number | null;
    closest_difference_days?: number | null;
    largest_difference_days?: number | null;
    items?: OvulationCorrelationItem[];
};

type InsightRange = {
    key: string;
    label: string;
    is_selectable: boolean;
    cycle_count: number;

    cycle: CycleStats;
    bbt: BbtStats;
    symptoms: SymptomStats;
    ovulation_correlation: OvulationCorrelation;
};

type Regularity = {
    status: 'regular' | 'irregular' | 'not_enough_data';
    label: string;
    description: string;
    cycle_variation: number | null;
};

type Insights = {
    default_range_key: string | null;
    ranges: InsightRange[];
    regularity: Regularity | null;
    recommendations: string[];
};

type Props = {
    insights: Insights;
    insightsLocked?: boolean;
    lockReason?: string | null;
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

function formatDays(value: number | null | undefined) {
    if (value === null || value === undefined) {
        return '—';
    }

    return `${value} days`;
}

function formatCount(value: number | null | undefined) {
    if (value === null || value === undefined) {
        return '0';
    }

    return value.toString();
}

function formatPercent(value: number | null | undefined) {
    if (value === null || value === undefined) {
        return '—';
    }

    return `${value}%`;
}

function buildRegularity(range: InsightRange | undefined): Regularity | null {
    if (!range) {
        return null;
    }

    const cycleCount = range.cycle_count;
    const variation = range.cycle.cycle_variation;

    if (cycleCount < 3 || variation === null) {
        return {
            status: 'not_enough_data',
            label: 'Not enough data',
            description:
                'Log at least 3 completed cycles to estimate whether the selected range is regular.',
            cycle_variation: variation,
        };
    }

    if (variation <= 7) {
        return {
            status: 'regular',
            label: 'Likely regular',
            description:
                'The selected cycle range varies by 7 days or less.',
            cycle_variation: variation,
        };
    }

    return {
        status: 'irregular',
        label: 'Possibly irregular',
        description:
            'The selected cycle range varies by more than 7 days.',
        cycle_variation: variation,
    };
}

function regularityClass(status: Regularity['status']) {
    if (status === 'regular') {
        return 'border-green-200 bg-green-50 text-green-800';
    }

    if (status === 'irregular') {
        return 'border-orange-200 bg-orange-50 text-orange-800';
    }

    return 'border-muted bg-muted/40 text-muted-foreground';
}

function StatCard({
    label,
    value,
    helper,
}: {
    label: string;
    value: string;
    helper?: string;
}) {
    return (
        <div className="rounded-xl border p-4">
            <div className="text-sm text-muted-foreground">
                {label}
            </div>

            <div className="mt-2 text-2xl font-bold">
                {value}
            </div>

            {helper && (
                <div className="text-sm text-muted-foreground">
                    {helper}
                </div>
            )}
        </div>
    );
}

export default function Insights({
    insights,
    insightsLocked = false,
    lockReason = null,
}: Props) {
    const { dataAccess, auth } = usePage().props as {
        dataAccess?: DataAccess;
        auth?: {
            user?: {
                temperature_unit?: TemperatureUnit;
            };
        };
    };

    const temperatureUnit = auth?.user?.temperature_unit ?? 'celsius';

    const permissions = dataAccess?.permissions;

    const canViewInsights = permissions?.can_view_insights ?? true;
    const canViewCycles = permissions?.can_view_cycles ?? true;

    const isLocked =
        insightsLocked ||
        !canViewInsights ||
        !canViewCycles;

    const reason =
        lockReason ||
        (!canViewInsights
            ? 'The owner has not allowed access to insights.'
            : !canViewCycles
                ? 'Insights require access to cycle records.'
                : 'Insights are locked.');

    const selectableRanges = useMemo(() => {
        return insights.ranges.filter((range) => range.is_selectable);
    }, [insights.ranges]);

    const initialRangeKey =
        insights.default_range_key ??
        selectableRanges[0]?.key ??
        null;

    const [selectedRangeKey, setSelectedRangeKey] = useState<string | null>(
        initialRangeKey
    );

    const selectedRange = useMemo(() => {
        return (
            selectableRanges.find((range) => range.key === selectedRangeKey) ??
            selectableRanges[0]
        );
    }, [selectableRanges, selectedRangeKey]);

    const selectedIndex = selectableRanges.findIndex(
        (range) => range.key === selectedRange?.key
    );

    const selectedRegularity = buildRegularity(selectedRange);

    if (isLocked) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Insights" />

                <div className="p-4">
                    <div className="rounded-xl border p-6">
                        <h1 className="text-xl font-semibold">
                            Insights Locked
                        </h1>

                        <p className="mt-2 text-sm text-muted-foreground">
                            {reason}
                        </p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (!selectedRange) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Insights" />

                <div className="space-y-4 p-4">
                    <div>
                        <h1 className="text-xl font-semibold">
                            Cycle Insights
                        </h1>

                        <p className="text-sm text-muted-foreground">
                            Viewing {dataAccess?.owner_label ?? 'My Data'}.
                        </p>
                    </div>

                    <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                        Not enough cycle data yet. Add at least two cycle start dates to generate completed cycle insights.
                    </div>
                </div>
            </AppLayout>
        );
    }

    const cycle = selectedRange.cycle;
    const bbt = selectedRange.bbt;
    const symptoms = selectedRange.symptoms;
    const ovulationCorrelation = selectedRange.ovulation_correlation;

    const bbtAverage = displayTemperatureValue(
        bbt.average_temperature,
        temperatureUnit
    );

    const bbtColdest = displayTemperatureValue(
        bbt.coldest_temperature,
        temperatureUnit
    );

    const bbtHottest = displayTemperatureValue(
        bbt.hottest_temperature,
        temperatureUnit
    );

    const bbtVariation =
        bbtColdest !== null && bbtHottest !== null
            ? bbtHottest - bbtColdest
            : null;

    const symptomPieData =
        symptoms.type_distribution?.map((item) => ({
            name: item.type,
            value: item.count,
            percentage: item.percentage,
        })) ?? [];

    const symptomLevelData =
        symptoms.level_counts?.map((item) => ({
            level: `${item.level}★`,
            count: item.count,
        })) ?? [];

    const ovulationChartData =
        ovulationCorrelation.items?.map((item) => ({
            cycle: item.cycle_start_date,
            difference: item.difference_days,
        })) ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Insights" />

            <div className="space-y-6 p-4">
                <div className="space-y-1">
                    <h1 className="text-xl font-semibold">
                        Cycle Insights
                    </h1>

                    <p className="text-sm text-muted-foreground">
                        Viewing {dataAccess?.owner_label ?? 'My Data'}.
                    </p>

                    <p className="text-sm text-muted-foreground">
                        Compare cycle, BBT, symptom, and ovulation patterns across recent completed cycles.
                    </p>
                </div>

                {/* REGULARITY SUMMARY */}
                {selectedRegularity && (
                    <div
                        className={`
                            rounded-xl
                            border
                            p-4
                            ${regularityClass(selectedRegularity.status)}
                        `}
                    >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div>
                                <div className="text-sm font-medium">
                                    Menstrual cycle regularity
                                </div>

                                <div className="mt-1 text-2xl font-bold">
                                    {selectedRegularity.label}
                                </div>

                                <p className="mt-1 text-sm">
                                    {selectedRegularity.description}
                                </p>
                            </div>

                            <div className="rounded-lg border bg-background/60 px-4 py-3 text-sm">
                                <div className="text-muted-foreground">
                                    Cycle variation
                                </div>

                                <div className="text-xl font-semibold">
                                    {formatDays(selectedRegularity.cycle_variation)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* RANGE SELECTOR */}
                <div className="rounded-xl border p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="font-semibold">
                                Selected range
                            </h2>

                            <p className="text-sm text-muted-foreground">
                                Default is Last 6 cycles when available. Unavailable ranges are hidden.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                disabled={selectedIndex <= 0}
                                onClick={() => {
                                    const previous =
                                        selectableRanges[selectedIndex - 1];

                                    if (previous) {
                                        setSelectedRangeKey(previous.key);
                                    }
                                }}
                                className="rounded border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Back
                            </button>

                            <select
                                value={selectedRange.key}
                                onChange={(e) => {
                                    setSelectedRangeKey(e.target.value);
                                }}
                                className="rounded-md border bg-background px-3 py-2 text-sm"
                            >
                                {selectableRanges.map((range) => (
                                    <option
                                        key={range.key}
                                        value={range.key}
                                    >
                                        {range.label}
                                    </option>
                                ))}
                            </select>

                            <button
                                type="button"
                                disabled={
                                    selectedIndex === -1 ||
                                    selectedIndex >= selectableRanges.length - 1
                                }
                                onClick={() => {
                                    const next =
                                        selectableRanges[selectedIndex + 1];

                                    if (next) {
                                        setSelectedRangeKey(next.key);
                                    }
                                }}
                                className="rounded border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                {/* CYCLE INSIGHTS */}
                <div className="space-y-4 rounded-xl border p-4">
                    <div>
                        <h2 className="font-semibold">
                            Cycle insights
                        </h2>

                        <p className="text-sm text-muted-foreground">
                            Based on {formatCount(selectedRange.cycle_count)} completed cycle interval(s) in {selectedRange.label}.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                        <StatCard
                            label="Avg cycle"
                            value={formatDays(cycle.average_cycle_length)}
                            helper="Start date to next start date"
                        />

                        <StatCard
                            label="Shortest cycle"
                            value={formatDays(cycle.shortest_cycle)}
                        />

                        <StatCard
                            label="Longest cycle"
                            value={formatDays(cycle.longest_cycle)}
                        />

                        <StatCard
                            label="Cycle variation"
                            value={formatDays(cycle.cycle_variation)}
                            helper="Longest minus shortest"
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                        <StatCard
                            label="Avg period"
                            value={formatDays(cycle.average_period_length)}
                        />

                        <StatCard
                            label="Shortest period"
                            value={formatDays(cycle.shortest_period)}
                        />

                        <StatCard
                            label="Longest period"
                            value={formatDays(cycle.longest_period)}
                        />

                        <StatCard
                            label="Period variation"
                            value={formatDays(cycle.period_variation)}
                        />
                    </div>
                </div>

                {/* BBT INSIGHTS */}
                <div className="space-y-4 rounded-xl border p-4">
                    <div>
                        <h2 className="font-semibold">
                            BBT insights
                        </h2>

                        <p className="text-sm text-muted-foreground">
                            Temperature values are displayed in {temperatureUnitLabel(temperatureUnit)} based on profile settings.
                        </p>
                    </div>

                    {bbt.locked ? (
                        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                            {bbt.reason ?? 'BBT data is locked.'}
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-5">
                            <StatCard
                                label="Readings"
                                value={formatCount(bbt.reading_count)}
                            />

                            <StatCard
                                label="Avg temp"
                                value={
                                    bbt.average_temperature !== null &&
                                    bbt.average_temperature !== undefined
                                        ? formatTemperature(
                                            bbt.average_temperature,
                                            temperatureUnit
                                        )
                                        : '—'
                                }
                            />

                            <StatCard
                                label="Coldest temp"
                                value={
                                    bbt.coldest_temperature !== null &&
                                    bbt.coldest_temperature !== undefined
                                        ? formatTemperature(
                                            bbt.coldest_temperature,
                                            temperatureUnit
                                        )
                                        : '—'
                                }
                            />

                            <StatCard
                                label="Hottest temp"
                                value={
                                    bbt.hottest_temperature !== null &&
                                    bbt.hottest_temperature !== undefined
                                        ? formatTemperature(
                                            bbt.hottest_temperature,
                                            temperatureUnit
                                        )
                                        : '—'
                                }
                            />

                            <StatCard
                                label="Temp variation"
                                value={
                                    bbtVariation !== null
                                        ? `${bbtVariation.toFixed(2)}${temperatureUnitLabel(temperatureUnit)}`
                                        : '—'
                                }
                            />
                        </div>
                    )}
                </div>

                {/* SYMPTOM INSIGHTS */}
                <div className="space-y-4 rounded-xl border p-4">
                    <div>
                        <h2 className="font-semibold">
                            Symptom insights
                        </h2>

                        <p className="text-sm text-muted-foreground">
                            Most common symptoms, strongest symptoms, and star-level distribution.
                        </p>
                    </div>

                    {symptoms.locked ? (
                        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                            {symptoms.reason ?? 'Symptom data is locked.'}
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-4 md:grid-cols-3">
                                <StatCard
                                    label="Logged symptoms"
                                    value={formatCount(symptoms.symptom_count)}
                                />

                                <StatCard
                                    label="Symptom types"
                                    value={formatCount(symptoms.type_distribution?.length ?? 0)}
                                />

                                <StatCard
                                    label="Most common"
                                    value={symptoms.top_common?.[0]?.type ?? '—'}
                                    helper={
                                        symptoms.top_common?.[0]
                                            ? `${symptoms.top_common[0].count} time(s)`
                                            : undefined
                                    }
                                />
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="rounded-lg border p-4">
                                    <h3 className="font-medium">
                                        Top 5 common symptoms
                                    </h3>

                                    <div className="mt-3 space-y-2">
                                        {(symptoms.top_common ?? []).length > 0 ? (
                                            symptoms.top_common?.map((item) => (
                                                <div
                                                    key={item.type}
                                                    className="flex items-center justify-between gap-3 rounded border px-3 py-2 text-sm"
                                                >
                                                    <div>
                                                        <div className="font-medium">
                                                            {item.type}
                                                        </div>

                                                        <div className="text-xs text-muted-foreground">
                                                            Avg level {item.average_level}★
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        <div className="font-medium">
                                                            {item.count}
                                                        </div>

                                                        <div className="text-xs text-muted-foreground">
                                                            {formatPercent(item.percentage)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-sm text-muted-foreground">
                                                No symptom records in this range.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-lg border p-4">
                                    <h3 className="font-medium">
                                        Top 5 highest-rated symptoms
                                    </h3>

                                    <div className="mt-3 space-y-2">
                                        {(symptoms.top_highest_rated ?? []).length > 0 ? (
                                            symptoms.top_highest_rated?.map((item) => (
                                                <div
                                                    key={item.type}
                                                    className="flex items-center justify-between gap-3 rounded border px-3 py-2 text-sm"
                                                >
                                                    <div>
                                                        <div className="font-medium">
                                                            {item.type}
                                                        </div>

                                                        <div className="text-xs text-muted-foreground">
                                                            {item.count} record(s)
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        <div className="font-medium">
                                                            Max {item.max_level}★
                                                        </div>

                                                        <div className="text-xs text-muted-foreground">
                                                            Avg {item.average_level}★
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-sm text-muted-foreground">
                                                No symptom records in this range.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <div className="rounded-lg border p-4">
                                    <h3 className="font-medium">
                                        Symptom type percentage
                                    </h3>

                                    <div className="mt-4 h-[280px] min-h-[280px] min-w-0">
                                        {symptomPieData.length > 0 ? (
                                            <ResponsiveContainer
                                                width="100%"
                                                height="100%"
                                                minWidth={0}
                                            >
                                                <PieChart>
                                                    <Pie
                                                        data={symptomPieData}
                                                        dataKey="value"
                                                        nameKey="name"
                                                        outerRadius={90}
                                                        label={(entry) => {
                                                            const payload = entry.payload as {
                                                                name: string;
                                                                percentage: number;
                                                            };

                                                            return `${payload.name} ${payload.percentage}%`;
                                                        }}
                                                    >
                                                        {symptomPieData.map((entry, index) => (
                                                            <Cell
                                                                key={`${entry.name}-${index}`}
                                                                fill={`hsl(${(index * 55) % 360}, 70%, 60%)`}
                                                            />
                                                        ))}
                                                    </Pie>

                                                    <Tooltip
                                                        formatter={(value, name, props) => [
                                                            `${value} record(s), ${props.payload.percentage}%`,
                                                            name,
                                                        ]}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                                No symptom distribution available.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-lg border p-4">
                                    <h3 className="font-medium">
                                        Symptom level quantity
                                    </h3>

                                    <div className="mt-4 h-[280px] min-h-[280px] min-w-0">
                                        {symptomLevelData.length > 0 ? (
                                            <ResponsiveContainer
                                                width="100%"
                                                height="100%"
                                                minWidth={0}
                                            >
                                                <BarChart data={symptomLevelData}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="level" />
                                                    <YAxis allowDecimals={false} />
                                                    <Tooltip
                                                        formatter={(value) => [
                                                            `${value} symptom(s)`,
                                                            'Count',
                                                        ]}
                                                    />
                                                    <Bar dataKey="count" name="Count" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                                No symptom level data available.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* OVULATION CORRELATION */}
                <div className="space-y-4 rounded-xl border p-4">
                    <div>
                        <h2 className="font-semibold">
                            Ovulation correlation
                        </h2>

                        <p className="text-sm text-muted-foreground">
                            Compares calendar-based ovulation estimates with BBT-based ovulation estimates.
                        </p>
                    </div>

                    {ovulationCorrelation.locked ? (
                        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                            {ovulationCorrelation.reason ??
                                'Ovulation correlation is locked.'}
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-4 md:grid-cols-4">
                                <StatCard
                                    label="Matched cycles"
                                    value={formatCount(ovulationCorrelation.match_count)}
                                />

                                <StatCard
                                    label="Avg difference"
                                    value={formatDays(ovulationCorrelation.average_difference_days)}
                                />

                                <StatCard
                                    label="Closest difference"
                                    value={formatDays(ovulationCorrelation.closest_difference_days)}
                                />

                                <StatCard
                                    label="Largest difference"
                                    value={formatDays(ovulationCorrelation.largest_difference_days)}
                                />
                            </div>

                            <div className="rounded-lg border p-4">
                                <h3 className="font-medium">
                                    Difference by cycle
                                </h3>

                                <div className="mt-4 h-[280px] min-h-[280px] min-w-0">
                                    {ovulationChartData.length > 0 ? (
                                        <ResponsiveContainer
                                            width="100%"
                                            height="100%"
                                            minWidth={0}
                                        >
                                            <LineChart data={ovulationChartData}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="cycle" />
                                                <YAxis allowDecimals={false} />
                                                <Tooltip
                                                    formatter={(value) => [
                                                        `${value} day(s)`,
                                                        'Difference',
                                                    ]}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="difference"
                                                    name="Difference"
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                            No matched calendar and BBT ovulation records in this range.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="px-3 py-2">
                                                Cycle start
                                            </th>

                                            <th className="px-3 py-2">
                                                Calendar ovulation
                                            </th>

                                            <th className="px-3 py-2">
                                                BBT ovulation
                                            </th>

                                            <th className="px-3 py-2">
                                                Difference
                                            </th>

                                            <th className="px-3 py-2">
                                                Confidence
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {(ovulationCorrelation.items ?? []).length > 0 ? (
                                            ovulationCorrelation.items?.map((item) => (
                                                <tr
                                                    key={`${item.cycle_start_date}-${item.bbt_ovulation_date}`}
                                                    className="border-b"
                                                >
                                                    <td className="px-3 py-2">
                                                        {item.cycle_start_date}
                                                    </td>

                                                    <td className="px-3 py-2">
                                                        {item.calendar_ovulation_date}
                                                    </td>

                                                    <td className="px-3 py-2">
                                                        {item.bbt_ovulation_date}
                                                    </td>

                                                    <td className="px-3 py-2">
                                                        {formatDays(item.difference_days)}
                                                    </td>

                                                    <td className="px-3 py-2 capitalize">
                                                        {item.confidence}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="px-3 py-4 text-sm text-muted-foreground"
                                                >
                                                    No matched ovulation records in this range.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                {/* RECOMMENDATIONS */}
                <div className="space-y-4 rounded-xl border p-4">
                    <h2 className="font-semibold">
                        Recommendations
                    </h2>

                    <div className="grid gap-3">
                        {(insights.recommendations ?? []).map((recommendation, index) => (
                            <div
                                key={index}
                                className="rounded-lg border p-3 text-sm text-muted-foreground"
                            >
                                {recommendation}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}