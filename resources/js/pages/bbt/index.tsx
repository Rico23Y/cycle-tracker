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
};

export default function Bbt({
    timelines,
}: Props) {

    const todayKey = new Date().toISOString().slice(0, 10);
    const [quickDate, setQuickDate] = useState(todayKey);
    const [quickTemperature, setQuickTemperature] = useState('');

    const existingReadingForQuickDate = timelines
        .flatMap((item) => item.readings)
        .find((reading) => {
            return reading.date === quickDate && reading.id !== null;
        });

    const [selectedTimelineId, setSelectedTimelineId] = useState(
        timelines.length > 0 ? timelines[timelines.length - 1].id : ''
    );

    const timeline = useMemo(() => {
        return timelines.find(
            item => item.id === selectedTimelineId
        ) ?? null;
    }, [timelines, selectedTimelineId]);

    const { errors } = usePage().props as {
        errors?: Record<string, string>;
    };

    const [editingDate, setEditingDate] = useState<string | null>(null);
    const [tableTemperature, setTableTemperature] = useState('');
    const [temperatureDrafts, setTemperatureDrafts] = useState<Record<string, string>>({});

    function resetInlineEdit() {
        setEditingDate(null);
        setTableTemperature('');
        setTemperatureDrafts({});
    }

    function submitQuickAdd(e: React.FormEvent) {
        e.preventDefault();

        if (!quickDate || !quickTemperature) return;

        if (existingReadingForQuickDate) {
            const shouldUpdate = confirm(
                'A BBT reading already exists for this date. Do you want to update it instead?'
            );

            if (!shouldUpdate) return;

            router.put(
                `/bbt/${existingReadingForQuickDate.id}`,
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
            '/bbt',
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
        const value = reading.id
            ? tableTemperature
            : temperatureDrafts[reading.date];

        if (!value) return;

        if (reading.id) {
            router.put(
                `/bbt/${reading.id}`,
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
            '/bbt',
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

    const chartData = timeline
        ? timeline.readings.filter(
            (reading): reading is BbtReading & { temperature: number } =>
                reading.temperature !== null
        )
        : [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="BBT" />

            <div className="space-y-4 p-4">

                <div>
                    <h1 className="text-xl font-semibold">
                        Basal Body Temperature
                    </h1>

                    <p className="text-sm text-muted-foreground">
                        Track BBT by cycle day, starting from Day One.
                    </p>
                </div>

                {timelines.length === 0 || !timeline ? (
                    <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                        Not enough cycle data yet. Add at least two cycle start dates.
                    </div>
                ) : (
                    <>
                        {/* SELECT RANGE */}
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

                        {/* CHART */}
                        <div className="rounded-xl border p-4 space-y-4">
                            <div>
                                <h2 className="font-semibold">
                                    BBT Chart
                                </h2>

                                <p className="text-sm text-muted-foreground">
                                    Cycle Day 1 to Day {timeline.cycle_length}
                                </p>
                            </div>

                            <div className="h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <XAxis
                                            dataKey="cycle_day"
                                            tickFormatter={(day) => `D${day}`}
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
                                            labelFormatter={(day) => `Cycle Day ${day}`}
                                            formatter={(value) => [
                                                `${Number(value).toFixed(2)}°C`,
                                                'Temperature',
                                            ]}
                                        />

                                        <ReferenceLine
                                            x={1}
                                            label="Day One"
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="temperature"
                                            name="Temperature"
                                            stroke="#3b82f6"
                                            strokeWidth={2}
                                            dot
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="text-sm text-muted-foreground">
                                Cycle starts on{' '}
                                {new Date(timeline.cycle_start_date + 'T00:00:00')
                                    .toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                {' '}and ends before{' '}
                                {new Date(timeline.next_period_date + 'T00:00:00')
                                    .toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                .
                            </div>
                        </div>

                        {/* QUICK ADD */}
                        <form
                            onSubmit={submitQuickAdd}
                            className="rounded-xl border p-4 space-y-3"
                        >
                            <div>
                                <h2 className="font-semibold">
                                    Quick Add BBT
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


                        {/* TABLE */}
                        <div className="rounded-xl border p-4 space-y-4">
                            <h2 className="font-semibold">
                                BBT Readings
                            </h2>

                            {timeline.readings.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left">
                                                <th className="py-2">
                                                    Cycle Day
                                                </th>
                                                <th className="py-2">
                                                    Date
                                                </th>
                                                <th className="py-2">
                                                    Temperature
                                                </th>
                                                <th className="py-2">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {timeline.readings.map((reading) => {
                                                const isEditing = editingDate === reading.date;

                                                return (
                                                    <tr
                                                        key={reading.date}
                                                        className="border-b"
                                                    >
                                                        <td className="py-2">
                                                            Day {reading.cycle_day}
                                                        </td>

                                                        <td className="py-2">
                                                            {new Date(reading.date + 'T00:00:00')
                                                                .toLocaleDateString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    year: 'numeric',
                                                                })}
                                                        </td>

                                                        <td className="py-2">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={tableTemperature}
                                                                    onChange={(e) => setTableTemperature(e.target.value)}
                                                                    placeholder="Temp °C"
                                                                    className="w-32 rounded border px-2 py-1 text-sm"
                                                                />
                                                            ) : !reading.id ? (
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    value={temperatureDrafts[reading.date] ?? ''}
                                                                    onChange={(e) => {
                                                                        setTemperatureDrafts({
                                                                            ...temperatureDrafts,
                                                                            [reading.date]: e.target.value,
                                                                        });
                                                                    }}
                                                                    placeholder="Temp °C"
                                                                    className="w-32 rounded border px-2 py-1 text-sm"
                                                                />
                                                            ) : (
                                                                <span>
                                                                    {Number(reading.temperature).toFixed(2)}°C
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td className="py-2">
                                                            <div className="flex gap-2">
                                                                {isEditing || !reading.id ? (
                                                                    <>
                                                                        <button 
                                                                            type="button"
                                                                            className="rounded bg-blue-500 px-2 py-1 text-xs text-white"
                                                                            onClick={() => saveReading(reading)}
                                                                        >
                                                                            {reading.id ? 'Save' : 'Add'}
                                                                        </button>

                                                                        {isEditing && (
                                                                            <button
                                                                                type="button"
                                                                                className="rounded border px-2 py-1 text-xs"
                                                                                onClick={resetInlineEdit}
                                                                            >
                                                                                Cancel
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <button
                                                                            type="button"
                                                                            className="rounded border px-2 py-1 text-xs"
                                                                            onClick={() => {
                                                                                setEditingDate(reading.date);
                                                                                setTableTemperature(
                                                                                    String(reading.temperature ?? '')
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

                                                                                router.delete(`/bbt/${reading.id}`, {
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
                                                    </tr>
                                                );
                                            })}
                                        </tbody>


                                    </table>

                                    {errors?.temperature && (
                                        <div className="mt-2 text-sm text-red-500">
                                            {errors.temperature}
                                        </div>
                                    )}

                                    {errors?.date && (
                                        <div className="mt-2 text-sm text-red-500">
                                            {errors.date}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-sm text-muted-foreground">
                                    No BBT readings in this cycle range.
                                </div>
                            )}
                        </div>
                    </>
                )}

            </div>
        </AppLayout>
    );
}