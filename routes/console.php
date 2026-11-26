<?php

use App\Actions\Checkout\AutoApproveExpiredCheckouts;
use App\Actions\Checkout\EndTemporaryStays;
use App\Jobs\SendDamageReportNotification;
use App\Services\RoomReservations;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(fn () => app(RoomReservations::class)->expire())->name('expire-residence-reservations')->everyMinute()->withoutOverlapping();
Schedule::call(fn () => app(EndTemporaryStays::class)->handle())->name('end-temporary-stays')->everyMinute()->withoutOverlapping();
Schedule::call(fn () => app(AutoApproveExpiredCheckouts::class)->handle())->name('auto-approve-expired-checkouts')->hourly()->withoutOverlapping();

Artisan::command('damage-reports:retry-notifications', function (): void {
    DB::table('damage_report_notifications')->where('status', 'pending')->orderBy('created_at')->limit(100)->pluck('id')->each(fn ($id) => SendDamageReportNotification::dispatch($id));
})->purpose('Retry durable damage report completion notifications');
Schedule::command('damage-reports:retry-notifications')->everyMinute()->withoutOverlapping();
