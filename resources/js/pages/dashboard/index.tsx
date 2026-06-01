import { useEffect, useMemo, useRef, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { DayPicker } from 'react-day-picker';
import { dashboard } from '@/routes';

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
};

export default function Dashboard({ readings, nextPeriod }: Props) {

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

    const { data, setData, post, processing, reset } = useForm({
        temperature: '',
        date: new Date().toISOString().slice(0, 10),
    });

    function submit(e: React.FormEvent) {
        e.preventDefault();
        post('/bbt', {
            onSuccess: () => reset('temperature'),
        });
    }

    const chartData = [...readings]
        .slice(0, visiblePointCount)
        .reverse()
        .map((r) => ({
            date: r.date,
            temp: Number(r.temperature),
        }));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="grid gap-4 p-4">

                {/* 1st tile */}
                <div className="rounded-xl border p-4 space-y-4">

                    {/* 📈 Graph */}
                    <div ref={chartRef} className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(tickItem) => {
                                        const date = new Date(tickItem);
                                        const month = date.toLocaleString('default', { month: 'short' });
                                        const day = date.getDate();
                                        return `${month}-${day}`;
                                    }}
                                />

                                <YAxis 
                                    domain={[
                                        (dataMin) => Math.floor((dataMin - 0.2) * 100) / 100, 
                                        (dataMax) => Math.ceil((dataMax + 0.2) * 100) / 100
                                    ]} 
                                    tickFormatter={(value: number) => value.toFixed(2)}
                                />

                                <Tooltip />
                                <Line type="monotone" dataKey="temp" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* 📝 Quick Log Form */}
                    <form onSubmit={submit} className="flex gap-2">
                        <input
                            type="date"
                            value={data.date}
                            onChange={e => setData('date', e.target.value)}
                            className="border rounded px-2"
                        />

                        <input
                            type="number"
                            step="0.01"
                            placeholder="Temp"
                            value={data.temperature}
                            onChange={e => setData('temperature', e.target.value)}
                            className="border rounded px-2"
                        />

                        <button
                            type="submit"
                            disabled={processing}
                            className="bg-blue-500 text-white px-3 rounded disabled:opacity-50"
                        >
                            {processing ? 'Saving...' : 'Add'}
                        </button>
                    </form>

                    <h3 className="text-sm font-semibold">
                        Temperature Trend
                    </h3>

                    <p className="text-xs text-muted-foreground">
                        Showing last {chartData.length} readings
                    </p>

                </div>
                

                {/* Lower tiles */}
                <div className="mx-auto grid w-full max-w-5xl gap-4 md:grid-cols-2 xl:grid-cols-3">

                    {/* 2nd tile: Next Period */}
                    <div className="min-h-[220px] rounded-xl border p-4 flex flex-col justify-center">
                        <h3 className="text-sm font-semibold mb-4">
                            Next Period
                        </h3>

                        {nextPeriod ? (
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

                    {/* 3rd tile: Ovulation Window */}
                    <div className="min-h-[220px] rounded-xl border p-4 flex flex-col justify-center">
                        <h3 className="text-sm font-semibold mb-4">
                            Ovulation Window
                        </h3>

                        {nextPeriod ? (
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

                    {/* 4th tile: Small Calendar */}
                    <div className="min-h-[220px] rounded-xl border p-4">
                        <h3 className="text-sm font-semibold mb-4">
                            Cycle Calendar
                        </h3>

                        {nextPeriod && (
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
                        )}
                    </div>

                </div>

            </div>
        </AppLayout>
    );
}