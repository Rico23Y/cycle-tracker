import { useMemo, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Cycles',
        href: '/cycles',
    },
];

type Phase = {
    name: string;
    start_day: number;
    end_day: number;
    color: string;
};

type HormoneEstimate = {
    day: number;
    estrogen: number;
    lh: number;
    fsh: number;
    progesterone: number;
};

type TimelineSymptom = {
    id: number;
    date: string;
    cycle_day: number;
    type: string;
    level: number;
    notes: string | null;
};

type Timeline = {
    id: string;
    cycle_id: number;

    label: string;
    is_predicted: boolean;

    cycle_start_date: string;
    cycle_end_date: string;
    next_period_date: string;

    cycle_length: number;
    current_cycle_day: number | null;

    ovulation_date: string;
    ovulation_day: number;

    pregnancy_test_date: string;

    phases: Phase[];

    hormone_estimates: HormoneEstimate[];

    symptoms: TimelineSymptom[];
};

type Props = {
    timelines: Timeline[];
    cycleLocked?: boolean;
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

const PHASE_COLOR_MAP: Record<string, string> = {
    red: 'bg-red-200 border-red-300',
    green: 'bg-green-100 border-green-300',
    blue: 'bg-blue-100 border-blue-300',
    yellow: 'bg-yellow-100 border-yellow-300',
};

export default function Cycle({
    timelines,
    cycleLocked = false,
}: Props) {
    const { dataAccess } = usePage().props as {
        dataAccess?: DataAccess;
    };

    console.log('cycles props', {
        cycleLocked,
        timelines,
        dataAccess,
    });

    const permissions = dataAccess?.permissions;

    const canViewCycles = permissions?.can_view_cycles ?? true;
    const canEditCycles = permissions?.can_edit_cycles ?? true;
    const canViewSymptoms = permissions?.can_view_symptoms ?? true;
    const canViewPredictions = permissions?.can_view_predictions ?? true;

    const [selectedTimelineId, setSelectedTimelineId] = useState(
        timelines.length > 0 ? timelines[timelines.length - 1].id : ''
    );

    const timeline = useMemo(() => {
        return timelines.find(
            item => item.id === selectedTimelineId
        ) ?? null;
    }, [timelines, selectedTimelineId]);

    if (cycleLocked || !canViewCycles) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Cycles" />

                <div className="p-4">
                    <div className="rounded-xl border p-6">
                        <h1 className="text-xl font-semibold">
                            Cycles Locked
                        </h1>

                        <p className="mt-2 text-sm text-muted-foreground">
                            The owner has not allowed access to cycle records.
                        </p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cycles" />

            <div className="space-y-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold">
                        {timeline?.current_cycle_day
                            ? 'Current Cycle'
                            : 'Cycle History'}
                    </h1>

                    <p className="text-sm text-muted-foreground">
                        Viewing {dataAccess?.owner_label ?? 'My Data'}.
                    </p>

                    {!canEditCycles && (
                        <p className="mt-1 text-sm text-muted-foreground">
                            You can view cycle records, but editing is locked by the owner.
                        </p>
                    )}
                </div>

                {!canViewPredictions && (
                    <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                        🔒 Prediction-related details are locked by the owner.
                    </div>
                )}

                {timelines.length === 0 || !timeline ? (
                    <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                        Not enough cycle data yet. Add at least two cycle start dates.
                    </div>
                ) : (
                    <>
                        {timelines.length > 0 && (
                            <div className="rounded-xl border p-4">
                                <div className="mb-2 text-sm font-medium">
                                    Select Cycle Range
                                </div>

                                <select
                                    value={selectedTimelineId}
                                    onChange={(e) => setSelectedTimelineId(e.target.value)}
                                    className="w-full rounded border px-3 py-2 text-sm"
                                >
                                    {timelines.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-xl border p-4">
                                <div className="text-sm text-muted-foreground">
                                    {timeline.current_cycle_day
                                        ? 'Current Cycle Day'
                                        : 'Cycle Length'}
                                </div>

                                <div className="mt-2 text-4xl font-bold">
                                    {timeline.current_cycle_day ?? timeline.cycle_length}
                                </div>

                                <div className="text-sm text-muted-foreground">
                                    {timeline.current_cycle_day
                                        ? `of ${timeline.cycle_length} days`
                                        : 'days total'}
                                </div>
                            </div>

                            <div className="rounded-xl border p-4">
                                <div className="text-sm text-muted-foreground">
                                    Ovulation
                                </div>

                                {canViewPredictions ? (
                                    <>
                                        <div className="mt-2 text-xl font-semibold">
                                            Day {timeline.ovulation_day}
                                        </div>

                                        <div className="text-sm text-muted-foreground">
                                            {new Date(timeline.ovulation_date + 'T00:00:00')
                                                .toLocaleDateString('en-US', {
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                        </div>
                                    </>
                                ) : (
                                    <div className="mt-2 text-sm text-muted-foreground">
                                        🔒 Locked
                                    </div>
                                )}
                            </div>

                            <div className="rounded-xl border p-4">
                                <div className="text-sm text-muted-foreground">
                                    Pregnancy Test
                                </div>

                                {canViewPredictions ? (
                                    <>
                                        <div className="mt-2 text-xl font-semibold">
                                            {new Date(timeline.pregnancy_test_date + 'T00:00:00')
                                                .toLocaleDateString('en-US', {
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                        </div>

                                        <div className="text-sm text-muted-foreground">
                                            If period is missed
                                        </div>
                                    </>
                                ) : (
                                    <div className="mt-2 text-sm text-muted-foreground">
                                        🔒 Locked
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl border p-4 space-y-4">
                            <h2 className="font-semibold">
                                Cycle Phases
                            </h2>

                            <div className="flex overflow-hidden rounded-lg border">
                                {timeline.phases.map((phase) => {
                                    const days =
                                        phase.end_day - phase.start_day + 1;

                                    const width =
                                        (days / timeline.cycle_length) * 100;

                                    return (
                                        <div
                                            key={phase.name}
                                            className={`
                                                border-r
                                                p-3
                                                text-center
                                                text-xs
                                                ${PHASE_COLOR_MAP[phase.color] ?? 'bg-gray-100'}
                                            `}
                                            style={{
                                                width: `${width}%`,
                                            }}
                                            title={`Day ${phase.start_day} to ${phase.end_day}`}
                                        >
                                            <div className="font-medium">
                                                {phase.name}
                                            </div>

                                            <div>
                                                Day {phase.start_day}
                                                {phase.start_day !== phase.end_day &&
                                                    `-${phase.end_day}`}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="text-sm text-muted-foreground">
                                Cycle starts on{' '}
                                {new Date(timeline.cycle_start_date + 'T00:00:00')
                                    .toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                {' '}and is estimated to end before{' '}
                                {new Date(timeline.next_period_date + 'T00:00:00')
                                    .toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                .
                            </div>
                        </div>

                        {canViewPredictions ? (
                            <div className="rounded-xl border p-4 space-y-4">
                                <div>
                                    <h2 className="font-semibold">
                                        Estimated Hormone Pattern
                                    </h2>

                                    <p className="text-sm text-muted-foreground">
                                        Relative visual estimates only. These are not measured hormone levels.
                                    </p>
                                </div>

                                <div className="h-[320px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={timeline.hormone_estimates}>
                                            <XAxis
                                                dataKey="day"
                                                tickFormatter={(day) => `D${day}`}
                                            />

                                            <YAxis
                                                domain={[0, 100]}
                                                tickFormatter={(value) => `${value}`}
                                            />

                                            <Tooltip
                                                labelFormatter={(day) => `Cycle Day ${day}`}
                                            />

                                            {timeline.current_cycle_day && (
                                                <ReferenceLine
                                                    x={timeline.current_cycle_day}
                                                    label="Today"
                                                />
                                            )}

                                            <ReferenceLine
                                                x={timeline.ovulation_day}
                                                label="Ovulation"
                                            />

                                            <Area
                                                type="monotone"
                                                dataKey="estrogen"
                                                name="Estrogen"
                                                stroke="#ec4899"
                                                fill="#ec4899"
                                                fillOpacity={0.18}
                                                dot={false}
                                            />

                                            <Area
                                                type="monotone"
                                                dataKey="lh"
                                                name="LH"
                                                stroke="#f97316"
                                                fill="#f97316"
                                                fillOpacity={0.18}
                                                dot={false}
                                            />

                                            <Area
                                                type="monotone"
                                                dataKey="fsh"
                                                name="FSH"
                                                stroke="#3b82f6"
                                                fill="#3b82f6"
                                                fillOpacity={0.18}
                                                dot={false}
                                            />

                                            <Area
                                                type="monotone"
                                                dataKey="progesterone"
                                                name="Progesterone"
                                                stroke="#22c55e"
                                                fill="#22c55e"
                                                fillOpacity={0.18}
                                                dot={false}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                                🔒 Estimated hormone pattern is locked because prediction access is disabled.
                            </div>
                        )}

                        <div className="rounded-xl border p-4 space-y-4">
                            <h2 className="font-semibold">
                                Symptoms
                            </h2>

                            {!canViewSymptoms ? (
                                <div className="text-sm text-muted-foreground">
                                    🔒 Symptoms are locked by the owner.
                                </div>
                            ) : timeline.symptoms.length > 0 ? (
                                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                                    {timeline.symptoms.map((symptom) => (
                                        <div
                                            key={symptom.id}
                                            className="rounded-lg border p-3 text-sm"
                                        >
                                            <div className="font-medium">
                                                {symptom.type}{' '}
                                                {'★'.repeat(symptom.level)}
                                            </div>

                                            <div className="text-xs text-muted-foreground">
                                                {new Date(symptom.date + 'T00:00:00')
                                                    .toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                            </div>

                                            {symptom.notes && (
                                                <div className="mt-2 text-xs">
                                                    {symptom.notes}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">
                                    No symptoms logged yet.
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}