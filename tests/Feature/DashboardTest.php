<?php

use App\Models\Aset;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\LaporanKerusakan;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\StokAset;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected to the login page from the redirect route', function () {
    $response = $this->get('/dashboard/redirect');
    $response->assertRedirect(route('login'));
});

test('authenticated users are redirected to their role dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get('/dashboard/redirect');
    $response->assertRedirect(route('mahasiswa.dashboard'));
});

function executiveRoom(): Kamar
{
    $building = Gedung::create(['kode_gedung' => 'EXE', 'nama_gedung' => 'Gedung Eksekutif']);
    $floor = Lantai::create([
        'gedung_id' => $building->id,
        'nomor_lantai' => 1,
        'nama_lantai' => 'Lantai 1',
    ]);

    return Kamar::create([
        'lantai_id' => $floor->id,
        'nomor_kamar' => '101',
        'kapasitas' => 2,
        'status' => 'kosong',
    ]);
}

test('pimpinan dashboard includes technician performance and per-building report', function () {
    $this->seed(RolePermissionSeeder::class);
    $kamar = executiveRoom();

    $teknisi = User::factory()->create()->assignRole('teknisi');
    LaporanKerusakan::create([
        'nomor_tiket' => 'TKT-EXE-1',
        'kamar_id' => $kamar->id,
        'dilaporkan_oleh' => User::factory()->create()->id,
        'teknisi_id' => $teknisi->id,
        'deskripsi' => 'Kerusakan uji',
        'status' => 'selesai',
        'tanggal_lapor' => now(),
    ]);

    $stock = StokAset::create([
        'kode' => 'STK-EXE',
        'nama' => 'Kursi',
        'kategori' => 'Furniture',
        'satuan' => 'unit',
        'jumlah_total' => 2,
    ]);
    Aset::create([
        'stok_aset_id' => $stock->id,
        'jumlah' => 1,
        'kamar_id' => $kamar->id,
        'kode_inventaris' => 'INV-EXE-1',
        'nama_aset' => 'Kursi',
        'kategori' => 'Furniture',
        'kondisi' => 'rusak_ringan',
    ]);

    $mahasiswa = User::factory()->create()->assignRole('mahasiswa');
    $profil = MahasiswaProfil::create([
        'user_id' => $mahasiswa->id,
        'angkatan' => 2026,
        'status_huni' => 'aktif',
        'barcode_code' => fake()->uuid(),
    ]);
    PenempatanKamar::create([
        'mahasiswa_id' => $profil->id,
        'kamar_id' => $kamar->id,
        'status' => 'aktif',
        'tanggal_mulai' => now(),
    ]);

    $this->actingAs(User::factory()->create()->assignRole('pimpinan'))
        ->get('/pimpinan/dashboard')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('performance', 1, fn (Assert $row) => $row
                ->where('nama', $teknisi->nama)
                ->where('total_tiket', 1)
                ->where('total_penilaian', 0)
                ->where('rata_skor', null)
                ->etc()
            )
            ->has('gedung_report', 1, fn (Assert $row) => $row
                ->where('kode_gedung', 'EXE')
                ->where('penghuni_aktif', 1)
                ->where('kamar_total', 1)
                ->where('kamar_terisi', 1)
                ->where('aset_rusak', 1)
                ->etc()
            )
        );
});
