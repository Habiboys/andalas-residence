<?php

use App\Http\Controllers\SsoAuthController;
use Illuminate\Support\Facades\Route;

require __DIR__.'/andalas.php';

require __DIR__.'/settings.php';

Route::middleware(['guest', 'throttle:10,1'])->group(function (): void {
    Route::get('/api/auth/sso/redirect', [SsoAuthController::class, 'redirect'])->name('sso.redirect');
    Route::get('/api/auth/callback', [SsoAuthController::class, 'callback'])->name('sso.callback');
});

Route::post('/api/auth/sso/logout', [SsoAuthController::class, 'logout'])->middleware('auth')->name('sso.logout');
