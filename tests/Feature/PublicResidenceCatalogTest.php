<?php

use App\Models\ResidencePolicy;
use App\Services\PublicResidenceCatalog;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Queue::fake();
    Notification::fake();
    $this->withoutVite();
});

it('publishes policy tariffs and subtracts pending allocations without exposing residents', function () {
    $f = toBeFixture(capacity: 2);
    toBeSubmit($f);
    $catalog = app(PublicResidenceCatalog::class)->buildings();
    expect($catalog[0]['offers'][0]['amount'])->toBe(1000000.0);
    expect($catalog[0]['offers'][0]['places'])->toBe(1);
    expect(json_encode($catalog))->not->toContain($f['user']->email)->not->toContain($f['user']->nim_nip);
    $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page->component('landing/beranda')->has('residenceCatalog', 1));
    $this->get('/unit')->assertOk()->assertInertia(fn (Assert $page) => $page->component('landing/unit')->has('residenceCatalog', 1));
});

it('keeps buildings visible without selling closed policies or maintenance rooms', function () {
    $f = toBeFixture();
    $f['room']->update(['status' => 'maintenance']);
    $catalog = app(PublicResidenceCatalog::class)->buildings();
    expect($catalog[0]['offers'][0]['places'])->toBe(0);
    ResidencePolicy::factory()->create(['category' => 'local_non_kipk', 'version' => 2, 'published_at' => now(), 'settings' => [...$f['policy']->settings, 'open' => false]]);
    $catalog = app(PublicResidenceCatalog::class)->buildings();
    expect($catalog)->toHaveCount(1);
    expect($catalog[0]['offers'])->toBe([]);
});
