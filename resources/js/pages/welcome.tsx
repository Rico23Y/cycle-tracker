import { Head, Link, usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { dashboard, login, register } from '@/routes';

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage().props as {
        auth: {
            user?: unknown;
        };
    };

    const features = [
        {
            title: 'Cycle calendar',
            description:
                'Visualize Day One, period days, fertile windows, ovulation, safe days, and pregnancy test reminders.',
        },
        {
            title: 'BBT tracking',
            description:
                'Log basal body temperature and view trends that support ovulation pattern analysis.',
        },
        {
            title: 'Symptom logging',
            description:
                'Track multiple symptoms per day with severity levels and notes.',
        },
        {
            title: 'Cycle insights',
            description:
                'Review cycle regularity, BBT summaries, symptom patterns, and ovulation correlation.',
        },
        {
            title: 'Partner access',
            description:
                'Share selected cycle data with a trusted partner using permission-based access.',
        },
        {
            title: 'Privacy-focused',
            description:
                'Built around personal tracking, controlled sharing, and clear data ownership.',
        },
    ];

    return (
        <>
            <Head title="CycleWise">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700"
                    rel="stylesheet"
                />
            </Head>

            <div className="min-h-screen bg-background text-foreground">
                <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200">
                            <AppLogoIcon className="size-6" />
                        </div>

                        <div>
                            <div className="font-semibold leading-none">
                                CycleWise
                            </div>

                            <div className="mt-1 text-xs text-muted-foreground">
                                Cycle tracking with clarity
                            </div>
                        </div>
                    </Link>

                    <nav className="flex items-center gap-3 text-sm">
                        {auth.user ? (
                            <Link
                                href={dashboard()}
                                className="rounded-lg border px-4 py-2 font-medium transition hover:bg-muted"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="rounded-lg px-4 py-2 font-medium transition hover:bg-muted"
                                >
                                    Log in
                                </Link>

                                {canRegister && (
                                    <Link
                                        href={register()}
                                        className="rounded-lg bg-foreground px-4 py-2 font-medium text-background transition hover:opacity-90"
                                    >
                                        Get started
                                    </Link>
                                )}
                            </>
                        )}
                    </nav>
                </header>

                <main>
                    {/* HERO */}
                    <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-20">
                        <div>
                            <div className="mb-4 inline-flex rounded-full border bg-card px-3 py-1 text-sm text-muted-foreground">
                                Calendar, BBT, symptoms, and insights in one place
                            </div>

                            <h1 className="max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
                                Understand your cycle with clearer daily tracking.
                            </h1>

                            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                                CycleWise helps you track Day One, basal body temperature,
                                symptoms, fertile windows, ovulation estimates, and cycle
                                patterns through a simple Laravel and React web app.
                            </p>

                            <div className="mt-8 flex flex-wrap gap-3">
                                {auth.user ? (
                                    <Link
                                        href={dashboard()}
                                        className="rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:opacity-90"
                                    >
                                        Open dashboard
                                    </Link>
                                ) : (
                                    <>
                                        {canRegister && (
                                            <Link
                                                href={register()}
                                                className="rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background transition hover:opacity-90"
                                            >
                                                Start tracking
                                            </Link>
                                        )}

                                        <Link
                                            href={login()}
                                            className="rounded-xl border px-5 py-3 text-sm font-medium transition hover:bg-muted"
                                        >
                                            Log in
                                        </Link>
                                    </>
                                )}
                            </div>

                            <div className="mt-8 grid max-w-xl gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                                <div className="rounded-xl border bg-card p-3">
                                    <div className="font-semibold text-foreground">
                                        Cycle
                                    </div>
                                    <div>Period and phase tracking</div>
                                </div>

                                <div className="rounded-xl border bg-card p-3">
                                    <div className="font-semibold text-foreground">
                                        BBT
                                    </div>
                                    <div>Temperature trend logging</div>
                                </div>

                                <div className="rounded-xl border bg-card p-3">
                                    <div className="font-semibold text-foreground">
                                        Insights
                                    </div>
                                    <div>Patterns and summaries</div>
                                </div>
                            </div>
                        </div>

                        {/* PRODUCT PREVIEW */}
                        <div className="rounded-3xl border bg-card p-4 shadow-sm">
                            <div className="rounded-2xl border bg-background p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm text-muted-foreground">
                                            Today
                                        </div>

                                        <div className="text-2xl font-bold">
                                            Cycle Day 18
                                        </div>
                                    </div>

                                    <div className="rounded-full bg-rose-100 px-3 py-1 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">
                                        Fertile window
                                    </div>
                                </div>

                                <div className="mt-5">
                                    <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                                        <span>Cycle progress</span>
                                        <span>18 / 28 days</span>
                                    </div>

                                    <div className="h-3 overflow-hidden rounded-full bg-muted">
                                        <div className="h-full w-[64%] rounded-full bg-foreground" />
                                    </div>
                                </div>

                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-xl border p-3">
                                        <div className="text-xs text-muted-foreground">
                                            Next period
                                        </div>
                                        <div className="mt-1 text-xl font-semibold">
                                            10 days
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Estimated date
                                        </div>
                                    </div>

                                    <div className="rounded-xl border p-3">
                                        <div className="text-xs text-muted-foreground">
                                            Latest BBT
                                        </div>
                                        <div className="mt-1 text-xl font-semibold">
                                            36.62°C
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Logged today
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 rounded-xl border p-3">
                                    <div className="mb-3 flex items-center justify-between">
                                        <div className="text-sm font-medium">
                                            Temperature trend
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Last 7 readings
                                        </div>
                                    </div>

                                    <div className="flex h-28 items-end gap-2">
                                        {[35, 42, 38, 48, 53, 58, 61].map(
                                            (height, index) => (
                                                <div
                                                    key={index}
                                                    className="flex flex-1 items-end rounded-full bg-muted"
                                                >
                                                    <div
                                                        className="w-full rounded-full bg-rose-300 dark:bg-rose-700"
                                                        style={{
                                                            height: `${height}%`,
                                                        }}
                                                    />
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* FEATURES */}
                    <section className="border-t bg-muted/30">
                        <div className="mx-auto max-w-6xl px-6 py-16">
                            <div className="max-w-2xl">
                                <h2 className="text-3xl font-bold tracking-tight">
                                    Built for practical cycle tracking.
                                </h2>

                                <p className="mt-3 text-muted-foreground">
                                    CycleWise combines daily logs with readable summaries,
                                    making it easier to see patterns across cycles.
                                </p>
                            </div>

                            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {features.map((feature) => (
                                    <div
                                        key={feature.title}
                                        className="rounded-2xl border bg-card p-5"
                                    >
                                        <div className="font-semibold">
                                            {feature.title}
                                        </div>

                                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                            {feature.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* PORTFOLIO SECTION */}
                    <section className="mx-auto max-w-6xl px-6 py-16">
                        <div className="rounded-3xl border bg-card p-6 md:p-8">
                            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight">
                                        A full-stack portfolio project.
                                    </h2>

                                    <p className="mt-3 text-muted-foreground">
                                        This app was built with Laravel, Inertia, React,
                                        TypeScript, Tailwind CSS, Recharts, and React
                                        DayPicker. It includes authentication, profile
                                        settings, partner permissions, data ownership, and
                                        cycle insight calculations.
                                    </p>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    {[
                                        'Laravel 12',
                                        'Inertia.js',
                                        'React + TypeScript',
                                        'Tailwind CSS',
                                        'Recharts',
                                        'React DayPicker',
                                    ].map((item) => (
                                        <div
                                            key={item}
                                            className="rounded-xl border bg-background px-4 py-3 text-sm font-medium"
                                        >
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                </main>

                <footer className="border-t">
                    <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                        <div>
                            CycleWise — cycle tracking with calendar, BBT, symptoms, and insights.
                        </div>

                        <div>
                            Built with Laravel and React.
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}