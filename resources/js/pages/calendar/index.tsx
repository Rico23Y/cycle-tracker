import { useState, useEffect } from 'react';
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

    post_safe_start: string;
    post_safe_end: string;

    pre_safe_start: string;
    pre_safe_end: string;

    fertile_window_start: string;
    fertile_window_end: string;

    pregnancy_test_date: string;
};

type CalendarEvent = {
    type: string;
    label: string;
    color: string;
    editable?: boolean;
};

type CalendarData = {
    [date: string]: CalendarEvent[];
};

type Props = {
    cycles: Cycle[];
    bbtReadings: BbtReading[];
    symptoms: Symptom[];
    nextPeriod: NextPeriod | null;
    calendarData: CalendarData;
};

export default function Calendar({
    nextPeriod,
    calendarData,
}: Props) {

    const formatDateKey = (date: Date) => {

        const year = date.getFullYear();

        const month = String(date.getMonth() + 1)
            .padStart(2, '0');

        const day = String(date.getDate())
            .padStart(2, '0');

        return `${year}-${month}-${day}`;
    };

    // useEffect(() => {
    // console.log('calendarData:', calendarData)
    // console.log('nextPeriod:', nextPeriod);
    // }, [calendarData, nextPeriod]);

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

                            classNames={{
                                months: 'w-full',
                                month: 'w-full',
                                month_grid: 'w-full border-collapse',
                                weekdays: 'grid grid-cols-7',
                                week: 'grid grid-cols-7',
                                day: 'p-1 align-top',
                            }}
                            components={{
                                Day: (props) => {

                                    const date = props.day.date;

                                    const key = formatDateKey(date);

                                    const events = calendarData[key] || [];
                                    console.log( key, date, events);

                                    return (

                                        <div
                                            className="
                                                h-24
                                                border
                                                p-1
                                                flex
                                                flex-col
                                                gap-1
                                                overflow-hidden
                                                rounded-md
                                                text-xs
                                                hover:bg-muted/50
                                                transition
                                            "
                                            onClick={() => setSelectedDate(date)}
                                        >

                                            {/* DAY NUMBER */}
                                            <div className="font-semibold">
                                                {date.getDate()}
                                            </div>

                                            {/* EVENT BARS */}
                                            <div className="flex flex-col gap-1">

                                                {events.map((event, index) => {

                                                    let bgColor = '';

                                                    switch (event.color) {

                                                        case 'light_green':
                                                            bgColor = 'bg-green-100 text-black';
                                                            break;

                                                        case 'light_orange':
                                                            bgColor = 'bg-orange-200 text-black';
                                                            break;

                                                        case 'light_red':
                                                            bgColor = 'bg-red-300 text-black';
                                                            break;

                                                        case 'light_pink':
                                                            bgColor = 'bg-pink-100 text-black';
                                                            break;

                                                        case 'red':
                                                            bgColor = 'bg-red-500 text-white';
                                                            break;

                                                        case 'pink':
                                                            bgColor = 'bg-red-200';
                                                            break;

                                                        case 'blue':
                                                            bgColor = 'bg-blue-500 text-white';
                                                            break;

                                                        case 'sky':
                                                            bgColor = 'bg-sky-200';
                                                            break;

                                                        case 'green':
                                                            bgColor = 'bg-green-200';
                                                            break;

                                                        default:
                                                            bgColor = 'bg-gray-200';
                                                    }

                                                    return (
                                                        <div
                                                            key={index}
                                                            title={event.label}
                                                            className={`
                                                                px-1
                                                                py-0.5
                                                                rounded
                                                                truncate
                                                                text-[10px]
                                                                ${bgColor}
                                                            `}
                                                        >
                                                            {event.label}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                }
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

                        (() => {

                            const selectedKey = formatDateKey(selectedDate);

                            const selectedEvents =
                                calendarData[selectedKey] || [];

                            return (

                                <>

                                    {/* DATE */}
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

                                    {/* EVENTS */}
                                    <div className="space-y-2">

                                        <div className="text-sm text-muted-foreground">
                                            Events
                                        </div>

                                        {selectedEvents.length > 0 ? (

                                            selectedEvents.map((event, index) => {

                                                let bgColor = '';

                                                switch (event.color) {

                                                    case 'light_green':
                                                        bgColor = 'bg-green-100 text-black';
                                                        break;

                                                    case 'light_orange':
                                                        bgColor = 'bg-orange-200 text-black';
                                                        break;

                                                    case 'light_red':
                                                        bgColor = 'bg-red-300 text-black';
                                                        break;

                                                    case 'light_pink':
                                                        bgColor = 'bg-pink-100 text-black';
                                                        break;

                                                    case 'red':
                                                        bgColor = 'bg-red-500 text-white';
                                                        break;

                                                    case 'pink':
                                                        bgColor = 'bg-red-200';
                                                        break;

                                                    case 'blue':
                                                        bgColor = 'bg-blue-500 text-white';
                                                        break;

                                                    case 'sky':
                                                        bgColor = 'bg-sky-200';
                                                        break;

                                                    case 'green':
                                                        bgColor = 'bg-green-200';
                                                        break;

                                                    default:
                                                        bgColor = 'bg-gray-200';
                                                }

                                                return (

                                                    <div
                                                        key={index}
                                                        className={`
                                                            rounded-lg
                                                            px-3
                                                            py-2
                                                            text-sm
                                                            ${bgColor}
                                                        `}
                                                    >

                                                        <div className="font-medium">
                                                            {event.label}
                                                        </div>

                                                        <div className="text-xs opacity-80">
                                                            {event.type}
                                                        </div>

                                                        {event.editable && (

                                                            <button
                                                                className="
                                                                    mt-2
                                                                    rounded
                                                                    border
                                                                    px-2
                                                                    py-1
                                                                    text-xs
                                                                    bg-white/20
                                                                "
                                                            >
                                                                Edit
                                                            </button>

                                                        )}

                                                    </div>

                                                );
                                            })

                                        ) : (

                                            <div className="text-sm text-muted-foreground">
                                                No events for this day
                                            </div>

                                        )}

                                    </div>

                                </>

                            );

                        })()

                    ) : (

                        <div className="text-sm text-muted-foreground">
                            Select a date
                        </div>

                    )}

                </div>

            </div>
        </AppLayout>
    );
}