<?php

use App\Actions\Checkout\CompleteCheckout;
use App\Actions\Checkout\CreateCheckoutRequest;
use App\Enums\CheckoutRequestStatus;
use App\Enums\ClearanceStatus;
use App\Enums\RoomInspectionStatus;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\User;
use Illuminate\Validation\ValidationException;

function checkoutFixture(int $capacity = 1): array
{
    $user = User::factory()->create();
    $mahasiswa = MahasiswaProfil::create([
        'user_id' => $user->id,
        'barcode_code' => 'BC-'.$user->id,
        'status_huni' => 'aktif',
    ]);
    $gedung = Gedung::create(['kode_gedung' => 'G-'.fake()->unique()->numerify('###'), 'nama_gedung' => 'Gedung Uji']);
    $lantai = Lantai::create(['gedung_id' => $gedung->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);
    $kamar = Kamar::create([
        'lantai_id' => $lantai->id,
        'nomor_kamar' => fake()->unique()->numerify('R-###'),
        'kapasitas' => $capacity,
        'status' => 'penuh',
    ]);
    $placement = PenempatanKamar::create([
        'mahasiswa_id' => $mahasiswa->id,
        'kamar_id' => $kamar->id,
        'tanggal_mulai' => now()->toDateString(),
        'status' => 'aktif',
    ]);

    return compact('user', 'mahasiswa', 'kamar', 'placement');
}

it('creates one checkout request and required reviews idempotently', function () {
    $fixture = checkoutFixture();
    $action = new CreateCheckoutRequest;

    $first = $action->handle($fixture['mahasiswa'], 'Selesai masa huni');
    $second = $action->handle($fixture['mahasiswa'], 'Permintaan duplikat');

    expect($second->id)->toBe($first->id)
        ->and($first->status)->toBe(CheckoutRequestStatus::Diajukan);
    $this->assertDatabaseCount('checkout_requests', 1);
    $this->assertDatabaseHas('room_inspections', ['checkout_request_id' => $first->id]);
    $this->assertDatabaseHas('asset_clearances', ['checkout_request_id' => $first->id]);
    $this->assertDatabaseHas('finance_clearances', ['checkout_request_id' => $first->id]);
});

it('refuses checkout until all reviews pass', function () {
    $fixture = checkoutFixture();
    $request = (new CreateCheckoutRequest)->handle($fixture['mahasiswa']);

    expect(fn () => (new CompleteCheckout)->handle($request))
        ->toThrow(ValidationException::class);

    $this->assertDatabaseHas('penempatan_kamar', ['id' => $fixture['placement']->id, 'status' => 'aktif']);
    $this->assertDatabaseHas('checkout_requests', ['id' => $request->id, 'status' => 'diajukan']);
});

it('atomically completes checkout and recalculates room occupancy', function () {
    $fixture = checkoutFixture();
    $request = (new CreateCheckoutRequest)->handle($fixture['mahasiswa']);
    $request->inspection->update(['status' => RoomInspectionStatus::Selesai, 'inspected_at' => now()]);
    $request->assetClearance->update(['status' => ClearanceStatus::Disetujui, 'cleared_at' => now()]);
    $request->financeClearance->update([
        'status' => ClearanceStatus::Disetujui,
        'outstanding_amount' => 0,
        'cleared_at' => now(),
    ]);

    $completed = (new CompleteCheckout)->handle($request);
    $repeated = (new CompleteCheckout)->handle($completed);

    expect($completed->status)->toBe(CheckoutRequestStatus::Selesai)
        ->and($repeated->id)->toBe($completed->id);
    $this->assertDatabaseHas('penempatan_kamar', ['id' => $fixture['placement']->id, 'status' => 'berakhir']);
    $this->assertDatabaseHas('mahasiswa_profil', ['id' => $fixture['mahasiswa']->id, 'status_huni' => 'keluar']);
    $this->assertDatabaseHas('kamar', ['id' => $fixture['kamar']->id, 'status' => 'kosong']);
});
