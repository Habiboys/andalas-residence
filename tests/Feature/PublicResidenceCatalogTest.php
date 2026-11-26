<?php

use App\Models\ResidencePolicy;
use App\Models\ResidenceRate;
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
    $this->get('/')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('landing/beranda')
        ->has('residenceCatalog', 1)
        ->has('paymentAccounts')
        ->has('regulationDocs'));
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

it('exposes day, month, auto-derived 6-month semester, and year tariffs in the public home catalog', function () {
    $f = toBeFixture();
    $f['policy']->update([
        'settings' => [
            ...$f['policy']->settings,
            'rates' => [
                ['gedung_id' => $f['building']->id, 'type' => 'standar', 'unit' => 'year', 'amount' => '1000000', 'room_amount' => '4000000'],
            ],
        ],
    ]);

    ResidenceRate::create([
        'gedung_id' => $f['building']->id,
        'category' => ResidenceRate::DEFAULT_CATEGORY,
        'tipe_kamar' => 'standar',
        'unit' => 'day',
        'amount' => 100000,
        'student_amount' => 75000,
    ]);
    ResidenceRate::create([
        'gedung_id' => $f['building']->id,
        'category' => ResidenceRate::DEFAULT_CATEGORY,
        'tipe_kamar' => 'standar',
        'unit' => 'month',
        'amount' => 250000,
    ]);

    $catalog = app(PublicResidenceCatalog::class)->buildings();
    $byUnit = collect($catalog[0]['offers'])
        ->where('category', 'local_non_kipk')
        ->keyBy('unit');

    expect($byUnit->keys()->all())->toContain('year', 'semester', 'month', 'day')
        ->and($byUnit['year']['amount'])->toBe(1000000.0)
        ->and($byUnit['semester']['amount'])->toBe(500000.0)
        ->and($byUnit['semester']['room_amount'])->toBe(2000000.0)
        ->and($byUnit['month']['amount'])->toBe(250000.0)
        ->and($byUnit['day']['amount'])->toBe(75000.0);
});
