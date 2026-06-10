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

type CalendarEvent = {
    type: string;
    label: string;
    color: string;
    editable?: boolean;
    cycle_id?: number;
    is_prediction?: boolean;
    is_latest_cycle?: boolean;
    is_estimated?: boolean;

    bbt_id?: number;
    temperature?: number;

    symptom_id?: number;
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
    calendarData: CalendarData;
    defaultMonth: string;
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
    calendarData,
    defaultMonth,
}: Props) {

    console.log("Calendar Data:", calendarData);
    console.log("Data Access:", usePage().props.dataAccess);

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

    const initialMonth = defaultMonth
        ? new Date(defaultMonth + 'T00:00:00')
        : new Date();

    const [month, setMonth] = useState<Date>(initialMonth);

    const [activeAction, setActiveAction] = useState<
        | 'move_day_one'
        | 'update_period_end'
        | 'add_actual_period'
        | 'add_bbt'
        | 'edit_bbt'
        | 'add_symptom'
        | 'edit_symptom'
        | null
    >(null);

    const [symptomType, setSymptomType] = useState('');
    const [customSymptomType, setCustomSymptomType] = useState('');
    const [symptomLevel, setSymptomLevel] = useState('1');
    const [symptomNotes, setSymptomNotes] = useState('');

    const SYMPTOM_OPTIONS = [
        'Cramps',
        'Headache',
        'Bloating',
        'Fatigue',
        'Acne',
        'Mood Swings',
        'Breast Tenderness',
        'Back Pain',
        'Nausea',
        'Other',
    ];

    const [temperature, setTemperature] = useState('');
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

                            const selectedBbt = selectedEvents.find(
                                event => event.type === 'bbt'
                            );

                            const selectedSymptoms = selectedEvents.filter(
                                event => event.type === 'symptom'
                            );

                            const selectedMainEvents = selectedEvents.filter(
                                event => event.type !== 'bbt' && event.type !== 'symptom'
                            );

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

                                        {selectedMainEvents.length > 0 ? (

                                            selectedMainEvents.map((event, index) => {

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

                                    <div className="border-t pt-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm font-medium">
                                                Symptoms
                                            </div>

                                            {selectedSymptoms.length === 0 && (
                                                <button
                                                    className="rounded border px-2 py-1 text-xs"
                                                    onClick={() => {
                                                        setActiveAction('add_symptom');
                                                        setActiveEvent(null);
                                                        setSymptomType('');
                                                        setCustomSymptomType('');
                                                        setSymptomLevel('1');
                                                        setSymptomNotes('');
                                                    }}
                                                >
                                                    Add Symptom
                                                </button>
                                            )}
                                        </div>

                                    </div>

                                    {selectedSymptoms.length > 0 ? (
                                            <div className="space-y-2">
                                                {selectedSymptoms.map((symptom, index) => (
                                                    <div
                                                        key={index}
                                                        className={`
                                                            rounded-lg
                                                            px-3
                                                            py-2
                                                            text-sm
                                                            ${getBgColor(symptom.color)}
                                                        `}
                                                    >
                                                        <div className="font-medium">
                                                            {symptom.symptom_type} {'★'.repeat(symptom.level ?? 0)}
                                                        </div>

                                                        <div className="text-xs opacity-80">
                                                            symptom
                                                        </div>

                                                        {symptom.notes && (
                                                            <div className="mt-2 rounded bg-white/30 px-2 py-1 text-xs">
                                                                {symptom.notes}
                                                            </div>
                                                        )}

                                                        <div className="mt-2 flex gap-2">
                                                            <button
                                                                className="
                                                                    rounded
                                                                    border
                                                                    px-2
                                                                    py-1
                                                                    text-xs
                                                                    bg-white/20
                                                                "
                                                                onClick={() => {
                                                                    setActiveAction('edit_symptom');
                                                                    setActiveEvent(symptom);

                                                                    setSymptomType(
                                                                        SYMPTOM_OPTIONS.includes(symptom.symptom_type ?? '')
                                                                            ? symptom.symptom_type ?? ''
                                                                            : 'Other'
                                                                    );

                                                                    setCustomSymptomType(
                                                                        SYMPTOM_OPTIONS.includes(symptom.symptom_type ?? '')
                                                                            ? ''
                                                                            : symptom.symptom_type ?? ''
                                                                    );

                                                                    setSymptomLevel(String(symptom.level ?? 1));
                                                                    setSymptomNotes(symptom.notes ?? '');
                                                                }}
                                                            >
                                                                Edit
                                                            </button>

                                                            {symptom.symptom_id && (
                                                                <button
                                                                    className="
                                                                        rounded
                                                                        border
                                                                        px-2
                                                                        py-1
                                                                        text-xs
                                                                        bg-white/20
                                                                    "
                                                                    onClick={() => {
                                                                        if (!confirm('Delete this symptom?')) return;

                                                                        router.delete(`/symptoms/${symptom.symptom_id}`, {
                                                                            preserveScroll: true,
                                                                        });
                                                                    }}
                                                                >
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-muted-foreground">
                                                No symptoms logged
                                            </div>
                                        )}

                                    <div className="border-t pt-4 space-y-2">
                                        <div className="text-sm font-medium">
                                            BBT
                                        </div>

                                        {selectedBbt ? (
                                            <div className="text-sm">
                                                <div>
                                                    Temperature: {Number(selectedBbt.temperature).toFixed(2)}°C
                                                </div>

                                                <div className="mt-2 flex gap-2">
                                                    <button
                                                        className="rounded border px-2 py-1 text-xs"
                                                        onClick={() => {
                                                            setActiveAction('edit_bbt');
                                                            setActiveEvent(selectedBbt);
                                                            setTemperature(String(selectedBbt.temperature ?? ''));
                                                        }}
                                                    >
                                                        Edit BBT
                                                    </button>

                                                    {selectedBbt.bbt_id && (
                                                        <button
                                                            className="rounded border px-2 py-1 text-xs"
                                                            onClick={() => {
                                                                if (!confirm('Delete this BBT reading?')) return;

                                                                router.delete(`/bbt/${selectedBbt.bbt_id}`, {
                                                                    preserveScroll: true,
                                                                });
                                                            }}
                                                        >
                                                            Delete BBT
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                className="rounded border px-2 py-1 text-xs"
                                                onClick={() => {
                                                    setActiveAction('add_bbt');
                                                    setActiveEvent(null);
                                                    setTemperature('');
                                                }}
                                            >
                                                Add BBT
                                            </button>
                                        )}
                                    </div>

                                    {activeAction && (
                                        <form
                                            className="border-t pt-4 space-y-2"
                                            onSubmit={(e) => {
                                                e.preventDefault();

                                                if (activeAction === 'move_day_one') {
                                                    const cycleId = activeEvent?.cycle_id;

                                                    if (!cycleId) return;

                                                    router.put(
                                                        `/cycles/${cycleId}`,
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
                                                    const cycleId = activeEvent?.cycle_id;

                                                    if (!cycleId) return;

                                                    router.put(
                                                        `/cycles/${cycleId}`,
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

                                                if (activeAction === 'add_bbt') {
                                                    router.post(
                                                        '/bbt',
                                                        {
                                                            date: selectedKey,
                                                            temperature,
                                                        },
                                                        {
                                                            preserveScroll: true,
                                                            onSuccess: () => {
                                                                setActiveAction(null);
                                                                setActiveEvent(null);
                                                                setTemperature('');
                                                            },
                                                        }
                                                    );

                                                    return;
                                                }

                                                if (activeAction === 'edit_bbt') {
                                                    if (!activeEvent?.bbt_id) return;

                                                    router.put(
                                                        `/bbt/${activeEvent.bbt_id}`,
                                                        {
                                                            temperature,
                                                        },
                                                        {
                                                            preserveScroll: true,
                                                            onSuccess: () => {
                                                                setActiveAction(null);
                                                                setActiveEvent(null);
                                                                setTemperature('');
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

                                                if (activeAction === 'add_symptom') {
                                                    const finalType =
                                                        symptomType === 'Other'
                                                            ? customSymptomType
                                                            : symptomType;

                                                    router.post(
                                                        '/symptoms',
                                                        {
                                                            date: selectedKey,
                                                            type: finalType,
                                                            level: symptomLevel,
                                                            notes: symptomNotes,
                                                        },
                                                        {
                                                            preserveScroll: true,
                                                            onSuccess: () => {
                                                                setActiveAction(null);
                                                                setActiveEvent(null);
                                                                setSymptomType('');
                                                                setCustomSymptomType('');
                                                                setSymptomLevel('1');
                                                                setSymptomNotes('');
                                                            },
                                                        }
                                                    );

                                                    return;
                                                }

                                                if (activeAction === 'edit_symptom') {
                                                    if (!activeEvent?.symptom_id) return;

                                                    const finalType =
                                                        symptomType === 'Other'
                                                            ? customSymptomType
                                                            : symptomType;

                                                    router.put(
                                                        `/symptoms/${activeEvent.symptom_id}`,
                                                        {
                                                            type: finalType,
                                                            level: symptomLevel,
                                                            notes: symptomNotes,
                                                        },
                                                        {
                                                            preserveScroll: true,
                                                            onSuccess: () => {
                                                                setActiveAction(null);
                                                                setActiveEvent(null);
                                                                setSymptomType('');
                                                                setCustomSymptomType('');
                                                                setSymptomLevel('1');
                                                                setSymptomNotes('');
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
                                                {activeAction === 'add_bbt' && 'Add BBT'}
                                                {activeAction === 'edit_bbt' && 'Edit BBT'}
                                                {activeAction === 'add_symptom' && 'Add Symptom'}
                                                {activeAction === 'edit_symptom' && 'Edit Symptom'}
                                            </div>

                                            {![
                                                'add_bbt',
                                                'edit_bbt',
                                                'add_symptom',
                                                'edit_symptom',
                                            ].includes(activeAction) && (
                                                <input
                                                    type="date"
                                                    value={actionDate}
                                                    onChange={(e) => setActionDate(e.target.value)}
                                                    className="w-full rounded border px-2 py-1 text-sm"
                                                />
                                            )}

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

                                            {['add_bbt', 'edit_bbt'].includes(activeAction) && (
                                                <>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={temperature}
                                                        onChange={(e) => setTemperature(e.target.value)}
                                                        placeholder="Temperature °C"
                                                        className="w-full rounded border px-2 py-1 text-sm"
                                                    />

                                                    {errors?.temperature && (
                                                        <div className="text-sm text-red-500">
                                                            {errors.temperature}
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            {['add_symptom', 'edit_symptom'].includes(activeAction) && (
                                                <div className="space-y-2">
                                                    <select
                                                        value={symptomType}
                                                        onChange={(e) => setSymptomType(e.target.value)}
                                                        className="w-full rounded border px-2 py-1 text-sm"
                                                    >
                                                        <option value="">
                                                            Select symptom
                                                        </option>

                                                        {SYMPTOM_OPTIONS.map((option) => (
                                                            <option key={option} value={option}>
                                                                {option}
                                                            </option>
                                                        ))}
                                                    </select>

                                                    {symptomType === 'Other' && (
                                                        <input
                                                            type="text"
                                                            value={customSymptomType}
                                                            onChange={(e) => setCustomSymptomType(e.target.value)}
                                                            placeholder="Custom symptom"
                                                            className="w-full rounded border px-2 py-1 text-sm"
                                                        />
                                                    )}

                                                    <select
                                                        value={symptomLevel}
                                                        onChange={(e) => setSymptomLevel(e.target.value)}
                                                        className="w-full rounded border px-2 py-1 text-sm"
                                                    >
                                                        {[1, 2, 3, 4, 5].map((level) => (
                                                            <option key={level} value={level}>
                                                                {'★'.repeat(level)}
                                                            </option>
                                                        ))}
                                                    </select>

                                                    <textarea
                                                        value={symptomNotes}
                                                        onChange={(e) => setSymptomNotes(e.target.value)}
                                                        placeholder="Notes"
                                                        className="w-full rounded border px-2 py-1 text-sm"
                                                    />

                                                    {errors?.type && (
                                                        <div className="text-sm text-red-500">
                                                            {errors.type}
                                                        </div>
                                                    )}

                                                    {errors?.level && (
                                                        <div className="text-sm text-red-500">
                                                            {errors.level}
                                                        </div>
                                                    )}

                                                    {errors?.notes && (
                                                        <div className="text-sm text-red-500">
                                                            {errors.notes}
                                                        </div>
                                                    )}
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