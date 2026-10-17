<?php

use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\Periode;
use App\Models\ResidenceRegistration;
use App\Models\Tagihan;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function importedPaymentPlacement(string $periodName = '2026/2027', string $notes = 'Impor check-in Excel 2026. Tanggal administratif.'): PenempatanKamar
{
    $user = User::factory()->student()->create();
    $student = MahasiswaProfil::create(['user_id' => $user->id, 'barcode_code' => Str::uuid(), 'angkatan' => '2026', 'status_huni' => 'aktif']);
    $period = Periode::firstOrCreate(['nama_periode' => $periodName], ['status' => 'aktif', 'tanggal_mulai' => '2026-08-01', 'tanggal_selesai' => '2027-07-31']);
    $building = Gedung::create(['kode_gedung' => Str::random(8), 'nama_gedung' => 'Gedung Pembayaran']);
    $floor = Lantai::create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);
    $room = Kamar::create(['lantai_id' => $floor->id, 'nomor_kamar' => '101', 'kapasitas' => 2, 'tipe_kamar' => 'standar', 'status' => 'terisi_sebagian']);

    return PenempatanKamar::create(['mahasiswa_id' => $student->id, 'periode_id' => $period->id, 'kamar_id' => $room->id, 'status' => 'aktif', 'tanggal_mulai' => '2026-08-01', 'catatan' => $notes]);
}

it('upgrades only historical import placements without inventing invoices or receipt transactions', function () {
    $imported = importedPaymentPlacement();
    $manual = importedPaymentPlacement(notes: 'Penempatan manual');
    $future = importedPaymentPlacement('2027/2028');
    $migration = require database_path('migrations/2026_10_17_123655_add_import_payment_confirmation_to_penempatan_kamar.php');
    $migration->down();
    $migration->up();

    expect($imported->fresh()->import_payment_confirmation)->toMatchArray([
        'status' => 'confirmed_paid', 'source' => 'checkin_excel_2026', 'reconciliation_status' => 'pending', 'amount' => null, 'paid_at' => null,
    ]);
    expect($manual->fresh()->import_payment_confirmation)->toBeNull();
    expect($future->fresh()->import_payment_confirmation)->toBeNull();
    $this->assertDatabaseCount('tagihan', 0);
    $this->assertDatabaseCount('pembayaran', 0);
    $this->assertDatabaseCount('pembayaran_tagihan', 0);
    $this->assertDatabaseCount('transaksi_keuangan', 0);
});

it('exposes the invoice for each stay alongside its imported payment provenance', function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
    $placement = importedPaymentPlacement();
    $placement->update(['import_payment_confirmation' => PenempatanKamar::IMPORT_PAYMENT_CONFIRMATION_2026]);
    $invoice = Tagihan::create(['mahasiswa_id' => $placement->mahasiswa_id, 'nomor' => 'INV-TEST', 'status' => 'sebagian', 'subtotal' => 2500000, 'total' => 2500000, 'total_dibayar' => 1000000]);
    ResidenceRegistration::create(['student_profile_id' => $placement->mahasiswa_id, 'periode_id' => $placement->periode_id, 'penempatan_kamar_id' => $placement->id, 'tagihan_id' => $invoice->id, 'status' => 'accepted', 'is_kipk' => false, 'funding' => 'personal']);
    $admin = User::factory()->create()->assignRole('superadmin');
    $this->actingAs($admin)->get(route('admin.penempatan-kamar'))->assertInertia(fn (Assert $page) => $page
        ->where('penempatan.0.import_payment_confirmation.status', 'confirmed_paid')
        ->where('penempatan.0.registration.tagihan.total', '2500000.00')
        ->where('penempatan.0.registration.tagihan.total_dibayar', '1000000.00'));
    $this->get(route('admin.pemetaan-kamar'))->assertInertia(fn (Assert $page) => $page
        ->where('gedung.0.lantai.0.kamar.0.penempatan_kamar.0.import_payment_confirmation.status', 'confirmed_paid')
        ->where('gedung.0.lantai.0.kamar.0.penempatan_kamar.0.registration.tagihan.id', $invoice->id));
});
