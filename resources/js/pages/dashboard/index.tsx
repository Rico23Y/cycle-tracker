import { useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
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
    predicted_date: string;
    days_left: number;

    ovulation_date: string;
    ovulation_days_left: number;

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

    useEffect(() => {
    console.log('Readings:', readings)
    console.log('nextPeriod:', nextPeriod);
    }, [readings, nextPeriod]);

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
        .reverse()
        .map(r => ({
            date: r.date,
            temp: r.temperature,
        }));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="flex flex-col gap-4 p-4">

                {/* 1st tile */}
                <div className="rounded-xl border p-4 space-y-4">

                    {/* 📈 Graph */}
                    <div className="h-[200px]">
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

                </div>
                

                {/* 2nd tile */}
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="aspect-video border rounded-xl p-4 flex flex-col justify-center">

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
                                    {new Date(nextPeriod.predicted_date)
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

                    {/* 4th tile */}
                    <div className="border rounded-xl p-4 md:row-span-2 flex flex-col justify-between">

                        <h3 className="text-sm font-semibold mb-4">
                            Cycle Calendar
                        </h3>

                        {nextPeriod && (
                            <DayPicker
                                disableNavigation
                                hideNavigation
                                fixedWeeks
                                showOutsideDays

                                month={new Date(nextPeriod.predicted_date)}

                                modifiers={{
                                    period: [
                                        new Date(nextPeriod.predicted_date + 'T00:00:00')
                                    ],

                                    fertile: {
                                        from: new Date(nextPeriod.fertile_window_start),
                                        to: new Date(nextPeriod.fertile_window_end),
                                    },

                                    ovulation: [
                                        new Date(nextPeriod.ovulation_date),
                                    ],

                                    pregnancy: [
                                        new Date(nextPeriod.pregnancy_test_date),
                                    ],
                                }}

                                modifiersClassNames={{
                                    period: 'bg-red-300 text-black rounded-full',
                                    fertile: 'bg-blue-200 text-black rounded-full',
                                    ovulation: 'bg-blue-500 text-white rounded-full',
                                    pregnancy: 'bg-orange-200 text-black rounded-full',
                                }}
                            />
                        )}

                    </div>

                    {/* 3rd tile */}                    
                    <div className="aspect-video border rounded-xl p-4 flex flex-col justify-center">

                        <h3 className="text-sm font-semibold mb-4">
                            Ovulation Window
                        </h3>

                        {nextPeriod ? (
                            <>

                                {/* Days Left */}
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

                                {/* Ovulation Date */}
                                <div className="mt-4 text-sm">
                                    Ovulation Date
                                </div>

                                <div className="font-medium">
                                    {new Date(nextPeriod.ovulation_date)
                                        .toLocaleDateString('en-US', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                </div>

                                {/* Fertile Window */}
                                <div className="mt-4 text-sm">
                                    Fertile Window Starts
                                </div>

                                <div className="font-medium">
                                    {new Date(nextPeriod.fertile_window_start)
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


                </div>

            </div>
        </AppLayout>
    );
}