<?php

use App\Enums\KondisiAset;
use App\Enums\StatusIzinPulang;
use App\Models\Aset;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\PengajuanIzinPulang;
use App\Models\User;
use Illuminate\Support\Facades\Schema;

function activeResidentPlacement(): PenempatanKamar
{
    $user = User::factory()->create();
    $mahasiswa = MahasiswaProfil::create([
        'user_id' => $user->id,
        'barcode_code' => 'BC-'.$user->id,
        'status_huni' => 'aktif',
    ]);
    $gedung = Gedung::create(['kode_gedung' => fake()->unique()->numerify('G-###'), 'nama_gedung' => 'Gedung Uji']);
    $lantai = Lantai::create(['gedung_id' => $gedung->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);
    $kamar = Kamar::create([
        'lantai_id' => $lantai->id,
        'nomor_kamar' => fake()->unique()->numerify('R-###'),
        'kapasitas' => 1,
        'status' => 'penuh',
    ]);

    return PenempatanKamar::create([
        'mahasiswa_id' => $mahasiswa->id,
        'kamar_id' => $kamar->id,
        'tanggal_mulai' => now()->toDateString(),
        'status' => 'aktif',
    ]);
}

it('detects an overdue departed resident until actual return', function () {
    $placement = activeResidentPlacement();
    $leave = PengajuanIzinPulang::create([
        'mahasiswa_id' => $placement->mahasiswa_id,
        'tanggal_mulai' => today()->subDays(2),
        'tanggal_kembali' => today()->subDay(),
        'rencana_kembali_pada' => now()->subDay(),
        'berangkat_pada' => now()->subDays(2),
        'alasan' => 'Urusan keluarga',
        'status' => StatusIzinPulang::SedangIzin,
    ]);

    expect($leave->isOverdue())->toBeTrue()
        ->and($leave->status)->toBe(StatusIzinPulang::SedangIzin);

    $leave->update(['kembali_pada' => now(), 'status' => StatusIzinPulang::SelesaiKembali]);

    expect($leave->fresh()->isOverdue())->toBeFalse();
});

it('stores the operational condition used by reporting and checkout', function () {
    $aset = Aset::create([
        'kode_inventaris' => fake()->unique()->numerify('AST-###'),
        'nama_aset' => 'Pompa Air',
        'kondisi' => KondisiAset::RusakRingan,
    ]);

    expect($aset->kondisi)->toBe(KondisiAset::RusakRingan);
});

it('leaves laundry and gallon services inactive until their business process is defined', function () {
    expect(Schema::hasTable('pesanan_laundry'))->toBeFalse()
        ->and(Schema::hasTable('pesanan_galon'))->toBeFalse();

    $this->post('/andalas/layanan/laundry')->assertNotFound();
    $this->post('/andalas/layanan/galon')->assertNotFound();
});
