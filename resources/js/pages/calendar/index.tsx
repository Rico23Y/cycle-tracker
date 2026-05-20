import { useMemo, useState } from 'react';
import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { calendar } from '@/routes';

import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Calendar',
        href: calendar(),
    },
];

type Cycle = {
    id: number;
    start_date: string;
    period_length: number;
};

type BbtReading = {
    id: number;
    date: string;
    temperature: number;
};

type Symptom = {
    id: number;
    date: string;
    type: string;
    level: number;
    notes: string | null;
};

type NextPeriod = {
    current_period_start_date: string;
    current_period_end_date: string;

    predicted_period_date: string;
    predicted_last_period_date: string;
    days_left: number;

    ovulation_date: string;
    ovulation_days_left: number;

    post_safe_start: number;
    post_safe_end: number;

    pre_safe_start: number;
    pre_safe_end: number;

    fertile_window_start: string;
    fertile_window_end: string;

    pregnancy_test_date: string;
};

type Props = {
    cycles: Cycle[];
    bbtReadings: BbtReading[];
    symptoms: Symptom[];
    nextPeriod: NextPeriod | null;
};

export default function Calendar({
    nextPeriod,
}: Props) {

    const [selectedDate, setSelectedDate] = useState<Date | undefined>(
        new Date()
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Calendar" />

            <div className="grid gap-4 p-4 lg:grid-cols-4">

                {/* LEFT: CALENDAR */}
                <div className="lg:col-span-3 rounded-xl border p-4">

                    <h2 className="mb-4 text-lg font-semibold">
                        Cycle Calendar
                    </h2>

                    {nextPeriod && (

                        <DayPicker

                            mode="single"

                            selected={selectedDate}

                            onSelect={setSelectedDate}

                            month={
                                new Date(
                                    nextPeriod.predicted_period_date + 'T00:00:00'
                                )
                            }

                            showOutsideDays

                            fixedWeeks

                            className="w-full"

                            modifiers={{

                                PredictedPeriod: [
                                    new Date(nextPeriod.predicted_period_date + 'T00:00:00'),
                                ],

                                PredictedPeriodLength: {
                                    from: new Date(nextPeriod.predicted_period_date + 'T00:00:00'),
                                    to: new Date(nextPeriod.predicted_last_period_date + 'T00:00:00'),
                                },

                                currentPredictedPeriod: [
                                    new Date(nextPeriod.current_period_start_date + 'T00:00:00')
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

                                pretSafeDay: {
                                    from: new Date(nextPeriod.pre_safe_start + 'T00:00:00'),
                                    to: new Date(nextPeriod.pre_safe_end + 'T00:00:00'),
                                },

                                ovulation: [new Date(nextPeriod.ovulation_date + 'T00:00:00'),],
                                pregnancy: [new Date(nextPeriod.pregnancy_test_date + 'T00:00:00'),],


                            }}

                            modifiersClassNames={{
                                PredictedPeriod: 'bg-red-400 text-black rounded-full',
                                PredictedPeriodLength: 'bg-red-200 text-black rounded-full',
                                currentPredictedPeriod: 'bg-red-400 text-black rounded-full',
                                currentPredictedPeriodLength: 'bg-red-200 text-black rounded-full',
                                fertile: 'bg-sky-200 text-black rounded-full',
                                ovulation: '!bg-blue-500 text-white rounded-full',
                                pregnancy: '!bg-orange-200 text-black rounded-full',
                                postSafeDay: 'bg-green-200 text-black rounded-full',
                                pretSafeDay: 'bg-green-200 text-black rounded-full',
                            }}
                        />
                    )}
                </div>

                {/* RIGHT: SIDE PANEL */}
                <div className="rounded-xl border p-4 space-y-4">

                    <h2 className="text-lg font-semibold">
                        Details
                    </h2>

                    {selectedDate ? (
                        <div>

                            <div className="text-sm text-muted-foreground">
                                Selected Date
                            </div>

                            <div className="font-medium">
                                {selectedDate.toLocaleDateString(
                                    'en-US',
                                    {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                    }
                                )}
                            </div>

                        </div>
                    ) : (

                        <div className="text-sm text-muted-foreground">
                            Select a date
                        </div>

                    )}

                    <div className="border-t pt-4">

                        <div className="text-sm text-muted-foreground">
                            Future Features
                        </div>

                        <ul className="mt-2 text-sm space-y-1">
                            <li>• Edit cycle start</li>
                            <li>• Show symptoms</li>
                            <li>• Show BBT</li>
                            <li>• Fertility insights</li>
                        </ul>

                    </div>

                </div>

            </div>
        </AppLayout>
    );
}