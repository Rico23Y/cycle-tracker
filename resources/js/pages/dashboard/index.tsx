import { useEffect } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import type { BreadcrumbItem } from '@/types';

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
        href: '/dashboard',
    },
];

type BbtReading = {
    date: string;
    temperature: number;
};

type Props = {
    readings: BbtReading[];
};

export default function Dashboard({ readings }: Props) {

    useEffect(() => {
    console.log('Readings:', readings);
    }, [readings]);

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

                {/* 🔹 TILE 1 */}
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

                {/* Other tiles (keep your placeholders for now) */}
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="aspect-video border rounded-xl">
                        <PlaceholderPattern />
                    </div>
                    <div className="aspect-video border rounded-xl">
                        <PlaceholderPattern />
                    </div>
                    <div className="aspect-video border rounded-xl">
                        <PlaceholderPattern />
                    </div>
                </div>

            </div>
        </AppLayout>
    );
}