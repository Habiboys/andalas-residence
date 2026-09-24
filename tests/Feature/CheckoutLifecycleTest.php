<?php

use App\Actions\Checkout\CompleteCheckout;
use App\Actions\Checkout\CreateCheckoutRequest;
use App\Enums\CheckoutRequestStatus;
use App\Enums\RoomInspectionStatus;
use App\Models\Aset;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\User;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;

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
});

it('refuses checkout until the GO inspection is complete', function () {
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

    $completed = (new CompleteCheckout)->handle($request);
    $repeated = (new CompleteCheckout)->handle($completed);

    expect($completed->status)->toBe(CheckoutRequestStatus::Selesai)
        ->and($repeated->id)->toBe($completed->id);
    $this->assertDatabaseHas('penempatan_kamar', ['id' => $fixture['placement']->id, 'status' => 'berakhir']);
    $this->assertDatabaseHas('mahasiswa_profil', ['id' => $fixture['mahasiswa']->id, 'status_huni' => 'keluar']);
    $this->assertDatabaseHas('kamar', ['id' => $fixture['kamar']->id, 'status' => 'kosong']);
});

it('finishes checkout after GO inspection without obsolete manual clearance steps', function () {
    $fixture = checkoutFixture();
    $request = (new CreateCheckoutRequest)->handle($fixture['mahasiswa']);
    $request->inspection->update(['status' => RoomInspectionStatus::Selesai, 'inspected_at' => now()]);

    (new CompleteCheckout)->handle($request);

    expect($fixture['mahasiswa']->fresh()->status_huni)->toBe('keluar');
    $this->assertDatabaseHas('residence_histories', ['mahasiswa_id' => $fixture['mahasiswa']->id, 'event' => 'checked_out']);
});

it('records GO inventory findings as damage tickets and refuses later inspection edits', function () {
    $fixture = checkoutFixture();
    $request = (new CreateCheckoutRequest)->handle($fixture['mahasiswa']);
    $officer = User::factory()->create();
    $officer->givePermissionTo(Permission::findOrCreate('inspection.manage'));
    $asset = Aset::create(['kamar_id' => $fixture['kamar']->id, 'kode_inventaris' => 'GO-ASSET', 'nama_aset' => 'Lemari', 'kategori' => 'Furniture']);

    $this->actingAs($officer)->put(route('andalas.checkout.inspection.update', $request), [
        'status' => 'selesai', 'catatan' => 'Kamar diperiksa',
    ])->assertSessionHasErrors('asset_checks');

    $this->actingAs($officer)->put(route('andalas.checkout.inspection.update', $request), [
        'status' => 'selesai', 'catatan' => 'Kamar diperiksa',
        'asset_checks' => [[
            'aset_id' => $asset->id,
            'actual_quantity' => 1,
            'condition' => 'rusak_ringan',
            'note' => 'Engsel patah',
        ]],
        'findings' => [['aset_id' => $asset->id, 'description' => 'Engsel patah', 'severity' => 'rusak_ringan']],
    ])->assertSessionHasNoErrors();

    $this->assertDatabaseHas('aset', ['id' => $asset->id, 'kondisi' => 'rusak_ringan']);
    $this->assertDatabaseHas('laporan_kerusakan', ['aset_id' => $asset->id, 'kamar_id' => $fixture['kamar']->id]);
    $check = $request->inspection->fresh()->asset_checks[0];
    expect($check['aset_id'])->toBe($asset->id)
        ->and($check['expected_quantity'])->toBe(1)
        ->and($check['actual_quantity'])->toBe(1)
        ->and($check['condition'])->toBe('rusak_ringan');
    $this->actingAs($officer)->put(route('andalas.checkout.inspection.update', $request), ['status' => 'menunggu'])->assertSessionHasErrors('status');
});

it('rejects checkout for a reserved room before resident activation', function () {
    $fixture = checkoutFixture();
    $fixture['mahasiswa']->update(['status_huni' => 'calon']);
    $fixture['user']->givePermissionTo(Permission::findOrCreate('checkout.submit'));

    $this->actingAs($fixture['user'])
        ->post(route('andalas.checkout.store'), ['alasan' => 'Belum masuk'])
        ->assertSessionHasErrors('placement');

    $this->assertDatabaseCount('checkout_requests', 0);
    $this->assertDatabaseHas('penempatan_kamar', ['id' => $fixture['placement']->id, 'status' => 'aktif']);
});
