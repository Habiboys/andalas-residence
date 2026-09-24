<?php

use App\Providers\AppServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\URL;

it('accepts forwarded HTTPS only from configured reverse proxies', function (string $remoteAddress, string $scheme) {
    config(['app.trusted_proxies' => ['10.10.0.2'], 'app.url' => 'http://localhost']);
    $this->app->getProvider(AppServiceProvider::class)->boot();
    Route::get('/_test/proxy', fn (Request $request) => ['scheme' => $request->getScheme()]);

    $this->withServerVariables(['REMOTE_ADDR' => $remoteAddress])
        ->withHeaders(['X-Forwarded-Proto' => 'https'])
        ->getJson('/_test/proxy')->assertOk()->assertJsonPath('scheme', $scheme);
})->with([['10.10.0.2', 'https'], ['10.10.0.3', 'http']]);

it('generates HTTPS links when the public application URL uses HTTPS', function () {
    config(['app.url' => 'https://residence.example.test']);
    $this->app->getProvider(AppServiceProvider::class)->boot();

    expect(URL::to('/register'))->toStartWith('https://');
});

it('preserves the public port on routes and Vite assets even when the container sees port 80', function () {
    config(['app.url' => 'http://10.250.30.14:8003']);
    $this->app->getProvider(AppServiceProvider::class)->boot();
    Route::get('/_test/public-urls', fn () => [
        'register' => route('register'),
        'stylesheet' => asset('build/assets/app-example.css'),
    ]);

    $this->withServerVariables(['HTTP_HOST' => '10.250.30.14', 'SERVER_PORT' => 80])
        ->getJson('/_test/public-urls')->assertOk()
        ->assertJsonPath('register', 'http://10.250.30.14:8003/register')
        ->assertJsonPath('stylesheet', 'http://10.250.30.14:8003/build/assets/app-example.css');
});
