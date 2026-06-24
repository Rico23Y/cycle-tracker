<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\CycleController;
use App\Http\Controllers\BbtReadingController;
use App\Http\Controllers\PartnerController;
use App\Http\Controllers\InsightController;
use App\Http\Controllers\SymptomController;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\App;
use Laravel\Fortify\Features;

Route::get('/demo-reset/{key}', function (string $key) {
    abort_unless(App::environment('production'), 404);

    abort_unless(
        hash_equals((string) config('app.demo_reset_key'), $key),
        403
    );

    DB::statement('TRUNCATE TABLE users RESTART IDENTITY CASCADE');

    Artisan::call('db:seed', [
        '--force' => true,
    ]);

    return response()->json([
        'message' => 'Demo database has been reset and seeded.',
        'output' => Artisan::output(),
    ]);
})->name('demo-reset');

Route::get('/health', function () {
    return response('OK', 200);
})->name('health');

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/calendar', [CalendarController::class, 'index'])->name('calendar');
    Route::resource('symptoms', SymptomController::class);
    Route::resource('cycles', CycleController::class);
    Route::resource('bbt', BbtReadingController::class);

    Route::post('/partners/{partner}/accept', [PartnerController::class, 'accept'])
        ->name('partners.accept');

    Route::post('/partners/{partner}/decline', [PartnerController::class, 'decline'])
        ->name('partners.decline');
    Route::resource('partners', PartnerController::class);

    Route::resource('insights', InsightController::class);
    
});

require __DIR__.'/settings.php';

