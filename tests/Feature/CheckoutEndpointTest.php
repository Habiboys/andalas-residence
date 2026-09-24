<?php

use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

it('allows a resident to submit checkout through the HTTP endpoint', function () {
    $user = User::factory()->create();
    $user->assignRole('mahasiswa');
    $student = MahasiswaProfil::create(['user_id' => $user->id, 'barcode_code' => 'CO-'.$user->id, 'status_huni' => 'aktif']);
    $building = Gedung::create(['kode_gedung' => 'CO-001', 'nama_gedung' => 'Gedung Checkout']);
    $floor = Lantai::create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);
    $room = Kamar::create(['lantai_id' => $floor->id, 'nomor_kamar' => 'CO-001', 'kapasitas' => 1, 'status' => 'penuh']);
    $placement = PenempatanKamar::create(['mahasiswa_id' => $student->id, 'kamar_id' => $room->id, 'tanggal_mulai' => now()->toDateString(), 'status' => 'aktif']);

    $response = $this->actingAs($user)->post(route('andalas.checkout.store'), ['alasan' => 'Pindah domisili']);

    $response->assertRedirect();
    $this->assertDatabaseHas('checkout_requests', ['mahasiswa_id' => $student->id, 'penempatan_kamar_id' => $placement->id, 'status' => 'diajukan']);
});

it('rejects checkout submission without an active placement', function () {
    $user = User::factory()->create();
    $user->assignRole('mahasiswa');
    MahasiswaProfil::create(['user_id' => $user->id, 'barcode_code' => 'CO-'.$user->id, 'status_huni' => 'aktif']);

    $response = $this->actingAs($user)->post(route('andalas.checkout.store'));

    $response->assertSessionHasErrors('placement');
});
