<?php

use App\Actions\Checkout\EndTemporaryStays;
use App\Services\RoomReservations;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(fn () => app(RoomReservations::class)->expire())->name('expire-residence-reservations')->everyMinute()->withoutOverlapping();
Schedule::call(fn () => app(EndTemporaryStays::class)->handle())->name('end-temporary-stays')->everyMinute()->withoutOverlapping();
