import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Insights',
        href: '/insights',
    },
];

type InsightRange = {
    label: string;
    cycle_count: number;

    average_cycle_length: number | null;
    shortest_cycle: number | null;
    longest_cycle: number | null;
    cycle_variation: number | null;

    average_period_length: number | null;
    shortest_period: number | null;
    longest_period: number | null;
    period_variation: number | null;

    recommendation: string;
};

type Insights = {
    ranges: InsightRange[];
};

type Props = {
    insights: Insights;
};

const formatDays = (value: number | null) => {
    if (value === null) {
        return '—';
    }

    return `${value} days`;
};

const formatCount = (value: number) => {
    return value.toString();
};

export default function Insights({
    insights,
}: Props) {
    const primaryRange = insights.ranges[0];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Insights" />

            <div className="space-y-4 p-4">

                <div>
                    <h1 className="text-xl font-semibold">
                        Cycle Insights
                    </h1>

                    <p className="text-sm text-muted-foreground">
                        Compare cycle and period patterns across different time ranges.
                    </p>
                </div>

                {/* SUMMARY CARDS */}
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border p-4">
                        <div className="text-sm text-muted-foreground">
                            Average Cycle
                        </div>

                        <div className="mt-2 text-3xl font-bold">
                            {formatDays(primaryRange.average_cycle_length)}
                        </div>

                        <div className="text-sm text-muted-foreground">
                            Entire history
                        </div>
                    </div>

                    <div className="rounded-xl border p-4">
                        <div className="text-sm text-muted-foreground">
                            Average Period
                        </div>

                        <div className="mt-2 text-3xl font-bold">
                            {formatDays(primaryRange.average_period_length)}
                        </div>

                        <div className="text-sm text-muted-foreground">
                            Entire history
                        </div>
                    </div>

                    <div className="rounded-xl border p-4">
                        <div className="text-sm text-muted-foreground">
                            Cycle Variation
                        </div>

                        <div className="mt-2 text-3xl font-bold">
                            {formatDays(primaryRange.cycle_variation)}
                        </div>

                        <div className="text-sm text-muted-foreground">
                            Longest minus shortest
                        </div>
                    </div>
                </div>

                {/* INSIGHTS TABLE */}
                <div className="rounded-xl border p-4 space-y-4">
                    <div>
                        <h2 className="font-semibold">
                            Range Comparison
                        </h2>

                        <p className="text-sm text-muted-foreground">
                            Use shorter ranges when recent cycles are different from older records.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left">
                                    <th className="py-2 pr-4">
                                        Range
                                    </th>

                                    <th className="py-2 pr-4">
                                        Cycles
                                    </th>

                                    <th className="py-2 pr-4">
                                        Avg Cycle
                                    </th>

                                    <th className="py-2 pr-4">
                                        Shortest Cycle
                                    </th>

                                    <th className="py-2 pr-4">
                                        Longest Cycle
                                    </th>

                                    <th className="py-2 pr-4">
                                        Cycle Variation
                                    </th>

                                    <th className="py-2 pr-4">
                                        Avg Period
                                    </th>

                                    <th className="py-2 pr-4">
                                        Shortest Period
                                    </th>

                                    <th className="py-2 pr-4">
                                        Longest Period
                                    </th>

                                    <th className="py-2 pr-4">
                                        Period Variation
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {insights.ranges.map((range) => (
                                    <tr
                                        key={range.label}
                                        className="border-b"
                                    >
                                        <td className="py-3 pr-4 font-medium">
                                            {range.label}
                                        </td>

                                        <td className="py-3 pr-4">
                                            {formatCount(range.cycle_count)}
                                        </td>

                                        <td className="py-3 pr-4">
                                            {formatDays(range.average_cycle_length)}
                                        </td>

                                        <td className="py-3 pr-4">
                                            {formatDays(range.shortest_cycle)}
                                        </td>

                                        <td className="py-3 pr-4">
                                            {formatDays(range.longest_cycle)}
                                        </td>

                                        <td className="py-3 pr-4">
                                            {formatDays(range.cycle_variation)}
                                        </td>

                                        <td className="py-3 pr-4">
                                            {formatDays(range.average_period_length)}
                                        </td>

                                        <td className="py-3 pr-4">
                                            {formatDays(range.shortest_period)}
                                        </td>

                                        <td className="py-3 pr-4">
                                            {formatDays(range.longest_period)}
                                        </td>

                                        <td className="py-3 pr-4">
                                            {formatDays(range.period_variation)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* RECOMMENDATIONS */}
                <div className="rounded-xl border p-4 space-y-4">
                    <h2 className="font-semibold">
                        Recommendations
                    </h2>

                    <div className="grid gap-3 md:grid-cols-2">
                        {insights.ranges.map((range) => (
                            <div
                                key={range.label}
                                className="rounded-lg border p-3"
                            >
                                <div className="font-medium">
                                    {range.label}
                                </div>

                                <div className="mt-1 text-sm text-muted-foreground">
                                    {range.recommendation}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </AppLayout>
    );
}