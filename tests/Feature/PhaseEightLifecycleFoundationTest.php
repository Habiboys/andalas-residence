<?php

use App\Enums\KondisiAset;
use App\Enums\StatusIzinPulang;
use App\Enums\StatusPesananLayanan;
use App\Enums\StatusSiklusHidupAset;
use App\Models\Aset;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\PengajuanIzinPulang;
use App\Models\PesananGalon;
use App\Models\PesananLaundry;
use App\Models\User;
use Illuminate\Database\QueryException;

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
        'rencana_berangkat_pada' => now()->subDays(2),
        'rencana_kembali_pada' => now()->subDay(),
        'berangkat_pada' => now()->subDays(2),
        'alasan' => 'Urusan keluarga',
        'status' => StatusIzinPulang::Terlambat,
    ]);

    expect($leave->isOverdue())->toBeTrue()
        ->and($leave->status)->toBe(StatusIzinPulang::Terlambat);

    $leave->update(['kembali_pada' => now(), 'status' => StatusIzinPulang::SelesaiKembali]);

    expect($leave->fresh()->isOverdue())->toBeFalse();
});

it('keeps asset condition separate from lifecycle state', function () {
    $aset = Aset::create([
        'kode_inventaris' => fake()->unique()->numerify('AST-###'),
        'nama_aset' => 'Pompa Air',
        'kondisi' => KondisiAset::RusakRingan,
        'status_siklus_hidup' => StatusSiklusHidupAset::DalamPemeliharaan,
    ]);

    expect($aset->kondisi)->toBe(KondisiAset::RusakRingan)
        ->and($aset->status_siklus_hidup)->toBe(StatusSiklusHidupAset::DalamPemeliharaan);
});

it('ties service orders to a resident placement without requiring billing', function () {
    $placement = activeResidentPlacement();

    $laundry = PesananLaundry::create([
        'nomor' => 'LND-001',
        'penempatan_kamar_id' => $placement->id,
        'status' => StatusPesananLayanan::Diajukan,
    ]);
    $galon = PesananGalon::create([
        'nomor' => 'GLN-001',
        'penempatan_kamar_id' => $placement->id,
        'status' => StatusPesananLayanan::Diajukan,
        'jumlah' => 2,
    ]);

    expect($laundry->tagihan_item_id)->toBeNull()
        ->and($galon->tagihan_item_id)->toBeNull()
        ->and($laundry->penempatanKamar->status)->toBe('aktif');
});

it('prevents duplicate disposal and billing links', function () {
    $placement = activeResidentPlacement();
    $laundry = PesananLaundry::create([
        'nomor' => 'LND-UNIQUE-1',
        'penempatan_kamar_id' => $placement->id,
        'status' => StatusPesananLayanan::Diajukan,
    ]);

    expect(fn () => PesananLaundry::create([
        'nomor' => $laundry->nomor,
        'penempatan_kamar_id' => $placement->id,
        'status' => StatusPesananLayanan::Diajukan,
    ]))->toThrow(QueryException::class);
});
