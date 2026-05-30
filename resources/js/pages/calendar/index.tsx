import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
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
    cycle_id?: number;
    is_prediction?: boolean;
    is_latest_cycle?: boolean;
    is_estimated?: boolean;

    temperature?: number;
    symptom_type?: string;
    level?: number;
    notes?: string | null;
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

const COLOR_MAP = {
    light_green: 'bg-green-100 text-black',
    light_orange: 'bg-orange-200 text-black',
    light_red: 'bg-red-300 text-black',
    light_pink: 'bg-pink-100 text-black',
    red: 'bg-red-500 text-white',
    pink: 'bg-red-200',
    blue: 'bg-blue-500 text-white',
    sky: 'bg-sky-200',
    green: 'bg-green-200',
    gray: 'bg-gray-200 text-black',
    purple: 'bg-purple-200 text-black',
} as const;

type EventColor = keyof typeof COLOR_MAP;

const getBgColor = (color: EventColor | string): string => {
    return COLOR_MAP[color as EventColor] || 'bg-gray-200';
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

    const calendarDates = Object.keys(calendarData).sort();

    const firstCalendarMonth = calendarDates.length
        ? new Date(calendarDates[0] + 'T00:00:00')
        : new Date();

    const lastCalendarMonth = calendarDates.length
        ? new Date(calendarDates[calendarDates.length - 1] + 'T00:00:00')
        : new Date();

    const [selectedDate, setSelectedDate] = useState<Date | undefined>(
        new Date()
    );

    const [month, setMonth] = useState<Date>(
        nextPeriod
            ? new Date(nextPeriod.predicted_period_date + 'T00:00:00')
            : new Date()
    );

    const [activeAction, setActiveAction] = useState<
        | 'move_day_one'
        | 'update_period_end'
        | 'add_actual_period'
        | null
    >(null);

    const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);

    const [actionDate, setActionDate] = useState('');

    const { errors } = usePage().props as {
        errors?: Record<string, string>;
    };

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
                            month={month}
                            onMonthChange={setMonth}
                            startMonth={firstCalendarMonth}
                            endMonth={lastCalendarMonth}
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

                                    const bbtEvent = events.find(event => event.type === 'bbt');

                                    const nonBbtEvents = events.filter(event => event.type !== 'bbt');

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
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold">
                                                    {date.getDate()}
                                                </span>

                                                {bbtEvent?.temperature && (
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {Number(bbtEvent.temperature).toFixed(2)}°C
                                                    </span>
                                                )}
                                            </div>

                                            {/* EVENT BARS */}
                                            <div className="flex flex-col gap-1">

                                                {nonBbtEvents.map((event, index) => {

                                                    let bgColor = getBgColor(event.color);

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

                                                let bgColor = getBgColor(event.color);

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

                                                        {event.type === 'day_one_actual_period' && event.cycle_id && (
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
                                                                onClick={() => {
                                                                    setActiveAction('move_day_one');
                                                                    setActiveEvent(event);
                                                                    setActionDate(selectedKey);
                                                                }}
                                                            >
                                                                Move Day One
                                                            </button>
                                                        )}

                                                        {['actual_period', 'ongoing_actual_period'].includes(event.type) && event.cycle_id && (
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
                                                                onClick={() => {
                                                                    setActiveAction('update_period_end');
                                                                    setActiveEvent(event);
                                                                    setActionDate(selectedKey);
                                                                }}
                                                            >
                                                                Update Period End
                                                            </button>
                                                        )}

                                                        {event.type === 'day_one_predicted_period' && (
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
                                                                onClick={() => {
                                                                    setActiveAction('add_actual_period');
                                                                    setActiveEvent(event);
                                                                    setActionDate(selectedKey);
                                                                }}
                                                            >
                                                                Add Actual Period
                                                            </button>
                                                        )}

                                                        {event.type === 'predicted_period' && (
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
                                                                Add End Period Data
                                                            </button>
                                                        )}

                                                        {event.type === 'actual_period' &&
                                                            event.cycle_id &&
                                                            event.is_latest_cycle && (
                                                                <button
                                                                    className="
                                                                        mt-2
                                                                        ml-2
                                                                        rounded
                                                                        border
                                                                        px-2
                                                                        py-1
                                                                        text-xs
                                                                        bg-white/20
                                                                    "
                                                                    onClick={() => {
                                                                        if (!confirm('Remove the confirmed period end date? Day One will remain.')) return;

                                                                        router.put(
                                                                            `/cycles/${event.cycle_id}`,
                                                                            {
                                                                                clear_period_length: true,
                                                                            },
                                                                            {
                                                                                preserveScroll: true,
                                                                            }
                                                                        );
                                                                    }}
                                                                >
                                                                    Delete Period End
                                                                </button>
                                                            )}

                                                        {event.type === 'day_one_actual_period' &&
                                                            event.cycle_id &&
                                                            event.is_latest_cycle && (
                                                                <button
                                                                    className="
                                                                        mt-2
                                                                        ml-2
                                                                        rounded
                                                                        border
                                                                        px-2
                                                                        py-1
                                                                        text-xs
                                                                        bg-white/20
                                                                    "
                                                                    onClick={() => {
                                                                        if (!confirm('Delete this Day One record? This removes the entire period entry.')) return;

                                                                        router.delete(`/cycles/${event.cycle_id}`, {
                                                                            preserveScroll: true,
                                                                        });
                                                                    }}
                                                                >
                                                                    Delete Day One
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

                                    {activeAction && activeEvent && (
                                        <form
                                            className="border-t pt-4 space-y-2"
                                            onSubmit={(e) => {
                                                e.preventDefault();

                                                if (activeAction === 'move_day_one') {
                                                    if (!activeEvent.cycle_id) return;

                                                    router.put(
                                                        `/cycles/${activeEvent.cycle_id}`,
                                                        {
                                                            start_date: actionDate,
                                                        },
                                                        {
                                                            preserveScroll: true,
                                                            onSuccess: () => {
                                                                setActiveAction(null);
                                                                setActiveEvent(null);
                                                                setActionDate('');
                                                            },
                                                        }
                                                    );

                                                    return;
                                                }

                                                if (activeAction === 'update_period_end') {
                                                    if (!activeEvent.cycle_id) return;

                                                    router.put(
                                                        `/cycles/${activeEvent.cycle_id}`,
                                                        {
                                                            period_end_date: actionDate,
                                                        },
                                                        {
                                                            preserveScroll: true,
                                                            onSuccess: () => {
                                                                setActiveAction(null);
                                                                setActiveEvent(null);
                                                                setActionDate('');
                                                            },
                                                        }
                                                    );

                                                    return;
                                                }

                                                if (activeAction === 'add_actual_period') {
                                                    router.post(
                                                        '/cycles',
                                                        {
                                                            start_date: actionDate,
                                                        },
                                                        {
                                                            preserveScroll: true,
                                                            onSuccess: () => {
                                                                setActiveAction(null);
                                                                setActiveEvent(null);
                                                                setActionDate('');
                                                            },
                                                        }
                                                    );

                                                    return;
                                                }
                                            }}
                                        >
                                            <div className="text-sm font-medium">
                                                {activeAction === 'move_day_one' && 'Move Day One'}
                                                {activeAction === 'update_period_end' && 'Update Period End'}
                                                {activeAction === 'add_actual_period' && 'Add Actual Period'}
                                            </div>

                                            <input
                                                type="date"
                                                value={actionDate}
                                                onChange={(e) => setActionDate(e.target.value)}
                                                className="w-full rounded border px-2 py-1 text-sm"
                                            />

                                            {errors?.start_date && (
                                                <div className="text-sm text-red-500">
                                                    {errors.start_date}
                                                </div>
                                            )}

                                            {errors?.period_end_date && (
                                                <div className="text-sm text-red-500">
                                                    {errors.period_end_date}
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                <button
                                                    type="submit"
                                                    className="rounded bg-blue-500 px-3 py-1 text-sm text-white"
                                                >
                                                    Save
                                                </button>

                                                <button
                                                    type="button"
                                                    className="rounded border px-3 py-1 text-sm"
                                                    onClick={() => {
                                                        setActiveAction(null);
                                                        setActiveEvent(null);
                                                        setActionDate('');
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                
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