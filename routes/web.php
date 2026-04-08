<?php

use App\Http\Controllers\CycleController;
use App\Http\Controllers\BbtReadingController;
use App\Http\Controllers\PartnerController;
use App\Http\Controllers\InsightController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('/dashboard', 'dashboard/index')->name('dashboard');
    Route::inertia('calendar', 'calendar/index')->name('calendar');

    Route::resource('cycles', CycleController::class);
    Route::resource('bbt', BbtReadingController::class);
    Route::resource('partners', PartnerController::class);
    Route::resource('insights', InsightController::class);
    
});

require __DIR__.'/settings.php';

