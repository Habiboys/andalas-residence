<?php

use App\Models\Aset;
use App\Models\FasilitatorWilayah;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\StokAset;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    $this->seed(RolePermissionSeeder::class);
});

function inventoryRoom(string $buildingCode): Kamar
{
    $building = Gedung::create([
        'kode_gedung' => $buildingCode,
        'nama_gedung' => 'Gedung '.$buildingCode,
    ]);
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

test('asset admin manages total stock while allocations cannot exceed it', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin_aset');

    $this->actingAs($admin)->post(route('andalas.stok-aset.store'), [
        'kode' => 'STK-MJR',
        'nama' => 'Meja Belajar',
        'kategori' => 'Furniture',
        'satuan' => 'unit',
        'jumlah_total' => 5,
    ])->assertSessionHasNoErrors();

    $stock = StokAset::firstOrFail();
    $room = inventoryRoom('AST-01');
    $this->post(route('andalas.aset.store'), [
        'stok_aset_id' => $stock->id,
        'jumlah' => 4,
        'kamar_id' => $room->id,
        'kode_inventaris' => 'INV-MJR-01',
        'kondisi' => 'baik',
    ])->assertSessionHasNoErrors();

    $this->post(route('andalas.aset.store'), [
        'stok_aset_id' => $stock->id,
        'jumlah' => 2,
        'kamar_id' => $room->id,
        'kode_inventaris' => 'INV-MJR-02',
        'kondisi' => 'baik',
    ])->assertSessionHasErrors('jumlah');

    $this->put(route('andalas.stok-aset.update', $stock), [
        'kode' => 'STK-MJR',
        'nama' => 'Meja Belajar',
        'kategori' => 'Furniture',
        'satuan' => 'unit',
        'jumlah_total' => 3,
    ])->assertSessionHasErrors('jumlah_total');

    $this->assertDatabaseHas('aset', [
        'stok_aset_id' => $stock->id,
        'jumlah' => 4,
        'nama_aset' => 'Meja Belajar',
    ]);
});

test('facilitator can only allocate and view assets in assigned buildings', function () {
    $assignedRoom = inventoryRoom('FAC-01');
    $outsideRoom = inventoryRoom('FAC-02');
    $stock = StokAset::create([
        'kode' => 'STK-KSR',
        'nama' => 'Kasur',
        'kategori' => 'Furniture',
        'satuan' => 'unit',
        'jumlah_total' => 10,
    ]);
    $facilitator = User::factory()->create();
    $facilitator->assignRole('fasilitator');
    FasilitatorWilayah::create([
        'user_id' => $facilitator->id,
        'gedung_id' => $assignedRoom->lantai->gedung_id,
    ]);

    $this->actingAs($facilitator)->post(route('andalas.aset.store'), [
        'stok_aset_id' => $stock->id,
        'jumlah' => 2,
        'kamar_id' => $assignedRoom->id,
        'kode_inventaris' => 'INV-KSR-01',
        'kondisi' => 'baik',
    ])->assertSessionHasNoErrors();

    $this->post(route('andalas.aset.store'), [
        'stok_aset_id' => $stock->id,
        'jumlah' => 1,
        'kamar_id' => $outsideRoom->id,
        'kode_inventaris' => 'INV-KSR-02',
        'kondisi' => 'baik',
    ])->assertForbidden();

    Aset::create([
        'stok_aset_id' => $stock->id,
        'jumlah' => 1,
        'kamar_id' => $outsideRoom->id,
        'kode_inventaris' => 'INV-KSR-OUT',
        'nama_aset' => $stock->nama,
        'kategori' => $stock->kategori,
        'kondisi' => 'baik',
    ]);

    $this->get('/fasilitator/kelola-aset')->assertInertia(
        fn (Assert $page) => $page
            ->has('aset', 1)
            ->where('aset.0.kode_inventaris', 'INV-KSR-01')
            ->has('gedung', 1)
    );
});

test('asset spreadsheet import is atomic when any row is invalid', function () {
    $admin = User::factory()->create();
    $admin->assignRole('admin_aset');
    $room = inventoryRoom('IMP-01');
    $stock = StokAset::create([
        'kode' => 'STK-LMR',
        'nama' => 'Lemari',
        'kategori' => 'Furniture',
        'satuan' => 'unit',
        'jumlah_total' => 5,
    ]);
    $csv = implode("\n", [
        'kode_gedung,nomor_lantai,nomor_kamar,kode_stok,jumlah,kode_inventaris,kondisi',
        'IMP-01,1,101,STK-LMR,2,INV-LMR-01,baik',
        'IMP-01,1,999,STK-LMR,1,INV-LMR-02,baik',
    ]);

    $this->actingAs($admin)->post(route('andalas.aset.import'), [
        'file' => UploadedFile::fake()->createWithContent('aset.csv', $csv),
    ])->assertSessionHasErrors('file');

    expect($room->id)->not->toBeNull();
    $this->assertDatabaseCount('aset', 0);
});

test('undefined service and unused asset prototype structures are retired', function () {
    foreach ([
        'pesanan_laundry',
        'pesanan_galon',
        'kategori_aset',
        'lokasi_aset',
        'pergerakan_aset',
        'penanggung_jawab_aset',
        'inspeksi_aset',
        'pemeliharaan_aset',
        'penghapusan_aset',
    ] as $table) {
        expect(Schema::hasTable($table))->toBeFalse();
    }

    foreach (['kode_gudang', 'kategori_aset_id', 'tanggal_pengadaan', 'garansi_sampai', 'status_siklus_hidup', 'dihapuskan_pada'] as $column) {
        expect(Schema::hasColumn('aset', $column))->toBeFalse();
    }
});
