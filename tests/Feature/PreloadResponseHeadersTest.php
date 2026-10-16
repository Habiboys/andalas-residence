<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Vite;

it('limits preload response headers on direct HTML requests with many assets', function () {
    $assets = [];

    for ($index = 0; $index < 60; $index++) {
        $assets['https://residence.example.test/build/assets/page-'.$index.'.js'] = [
            'rel' => 'modulepreload',
            'as' => 'script',
        ];
    }

    Vite::partialMock()->shouldReceive('preloadedAssets')->andReturn($assets);
    Route::middleware('web')->get('/_test/preload-headers', fn () => response('<html></html>'));

    $response = $this->get('/_test/preload-headers');

    $response->assertOk()->assertHeader('Link');
    expect(substr_count($response->headers->get('Link'), 'rel="modulepreload"'))->toBe(10);
    expect(strlen((string) $response->headers))->toBeLessThan(4096);
});
