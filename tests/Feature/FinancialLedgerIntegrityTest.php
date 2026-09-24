<?php

use App\Models\KategoriTransaksi;
use App\Models\MahasiswaProfil;
use App\Models\Pembayaran;
use App\Models\TransaksiKeuangan;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

it('protects payment ledger entries while allowing manual transactions to be corrected', function () {
    $this->seed(RolePermissionSeeder::class);
    $admin = User::factory()->create()->assignRole('superadmin');
    $student = MahasiswaProfil::create(['user_id' => User::factory()->student()->create()->id, 'barcode_code' => fake()->uuid()]);
    $payment = Pembayaran::create(['mahasiswa_id' => $student->id, 'kode_transaksi' => 'LEDGER-PAY', 'jenis_pembayaran' => 'sewa_asrama', 'nominal' => 500000, 'status' => 'lunas']);
    $category = KategoriTransaksi::create(['nama_kategori' => 'Sewa Asrama', 'tipe' => 'pemasukan']);
    $attributes = ['kategori_id' => $category->id, 'tipe' => 'pemasukan', 'nominal' => 500000, 'tanggal_transaksi' => now()->toDateString(), 'dicatat_oleh' => $admin->id];
    $automatic = TransaksiKeuangan::create([...$attributes, 'nomor_bukti' => 'AUTO-PAY', 'pembayaran_mahasiswa_id' => $payment->id]);
    $manual = TransaksiKeuangan::create([...$attributes, 'nomor_bukti' => 'MANUAL-PAY']);

    $this->actingAs($admin)->put(route('andalas.keuangan.update', $automatic), ['nominal' => 1])->assertForbidden();
    $this->delete(route('andalas.keuangan.destroy', $automatic))->assertForbidden();
    $this->assertDatabaseHas('transaksi_keuangan', ['id' => $automatic->id, 'nominal' => 500000, 'pembayaran_mahasiswa_id' => $payment->id]);

    $this->put(route('andalas.keuangan.update', $manual), ['nominal' => 250000])->assertSessionHasNoErrors()->assertRedirect();
    $this->assertDatabaseHas('transaksi_keuangan', ['id' => $manual->id, 'nominal' => 250000]);
    $this->delete(route('andalas.keuangan.destroy', $manual))->assertRedirect();
    $this->assertDatabaseMissing('transaksi_keuangan', ['id' => $manual->id]);
});
