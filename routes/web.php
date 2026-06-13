<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\CycleController;
use App\Http\Controllers\BbtReadingController;
use App\Http\Controllers\PartnerController;
use App\Http\Controllers\InsightController;
use App\Http\Controllers\SymptomController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

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

