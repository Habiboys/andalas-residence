<?php

use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\KipkRecipient;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\User;
use Database\Seeders\ResidenceMasterSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Http\UploadedFile;

it('imports actual buildings rooms and separate tariffs without duplicates on repeat', function () {
    $this->seed(ResidenceMasterSeeder::class);
    $this->seed(ResidenceMasterSeeder::class);
    $this->assertDatabaseCount('gedung', 10);
    $this->assertDatabaseCount('kamar', 799);
    $building = Gedung::where('kode_gedung', 'A')->sole();
    expect(Kamar::whereHas('lantai', fn ($query) => $query->where('gedung_id', $building->id))->count())->toBe(132);
    $this->assertDatabaseHas('residence_rates', ['gedung_id' => $building->id, 'tipe_kamar' => 'standar', 'unit' => 'year', 'amount' => 2500000, 'room_amount' => 5000000]);
    $this->assertDatabaseHas('residence_rates', ['gedung_id' => $building->id, 'tipe_kamar' => 'umum', 'unit' => 'day', 'amount' => 100000, 'student_amount' => 75000]);
    $asn = Gedung::where('kode_gedung', 'ASN')->sole();
    expect(Kamar::whereHas('lantai', fn ($query) => $query->where('gedung_id', $asn->id))->where('kapasitas', 2)->where('status', 'kosong')->count())->toBe(44);
    foreach (['2A.17' => 4, '3A.17' => 4, '4A.17' => 4, '1B.16' => 2] as $number => $capacity) {
        $room = Kamar::whereHas('lantai', fn ($query) => $query->where('gedung_id', $building->id))->where('nomor_kamar', $number)->sole();
        expect($room->kapasitas)->toBe($capacity);
        expect($room->status)->toBe('kosong');
    }
});

it('fills previously blocked zero capacity ASN rooms while preserving configured capacities and maintenance', function () {
    $this->seed(ResidenceMasterSeeder::class);
    $rooms = Kamar::whereHas('lantai.gedung', fn ($query) => $query->where('kode_gedung', 'ASN'))->limit(3)->get();
    $rooms[0]->update(['kapasitas' => 0, 'status' => 'maintenance']);
    $rooms[1]->update(['kapasitas' => 4]);
    $rooms[2]->update(['status' => 'maintenance']);

    $this->seed(ResidenceMasterSeeder::class);

    expect($rooms[0]->fresh()->kapasitas)->toBe(2);
    expect($rooms[0]->fresh()->status)->toBe('kosong');
    expect($rooms[1]->fresh()->kapasitas)->toBe(4);
    $building = $rooms[1]->lantai->gedung;
    expect(collect($building->room_types)->firstWhere('type', $rooms[1]->tipe_kamar)['max_capacity'])->toBeGreaterThanOrEqual(4);
    expect($rooms[2]->fresh()->status)->toBe('maintenance');
});

it('validates the workbook without writing data in dry run', function () {
    $this->artisan('asrama:seed-master', ['--dry-run' => true])->assertSuccessful();
    $this->assertDatabaseCount('gedung', 0);
    $this->assertDatabaseCount('kamar', 0);
});

it('keeps an existing maintenance room and unrelated rooms when syncing', function () {
    $this->seed(ResidenceMasterSeeder::class);
    $room = Kamar::where('nomor_kamar', '1A.01')->firstOrFail();
    $room->update(['status' => 'maintenance']);
    $unrelated = Kamar::create(['lantai_id' => $room->lantai_id, 'nomor_kamar' => 'CUSTOM', 'kapasitas' => 1, 'status' => 'kosong']);
    $this->seed(ResidenceMasterSeeder::class);
    expect($room->fresh()->status)->toBe('maintenance');
    expect($unrelated->fresh())->not->toBeNull();
});

it('imports a two column kipk workbook and updates existing names on repeat', function () {
    $this->seed(RolePermissionSeeder::class);
    $admin = User::factory()->create()->assignRole('admin_layanan');
    $file = UploadedFile::fake()->createWithContent('kipk.csv', "nama,nim\nMahasiswa Baru,2612345678\n");
    $this->actingAs($admin)->post(route('andalas.kipk-recipients.import'), ['file' => $file])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('kipk_recipients', ['nama' => 'Mahasiswa Baru', 'nim' => '2612345678', 'angkatan' => 2026]);
    $file = UploadedFile::fake()->createWithContent('kipk.csv', "nama,nim\nNama Diperbarui,2612345678\n");
    $this->post(route('andalas.kipk-recipients.import'), ['file' => $file])->assertSessionHasNoErrors();
    expect(KipkRecipient::sole()->nama)->toBe('Nama Diperbarui');
    $this->get(route('andalas.kipk-recipients.template'))->assertDownload('template-penerima-kipk.xlsx');
});

it('rolls back all kipk rows on duplicate or invalid nim', function (string $lastNim) {
    $this->seed(RolePermissionSeeder::class);
    $admin = User::factory()->create()->assignRole('admin_layanan');
    $file = UploadedFile::fake()->createWithContent('kipk.csv', "nama,nim\nSatu,2612345678\nDua,".$lastNim."\n");
    $this->actingAs($admin)->post(route('andalas.kipk-recipients.import'), ['file' => $file])->assertSessionHasErrors('file');
    $this->assertDatabaseCount('kipk_recipients', 0);
})->with(['duplicate' => '2612345678', 'invalid' => 'ABC']);

it('refuses kipk import and template access without registration permission', function () {
    $this->seed(RolePermissionSeeder::class);
    $user = User::factory()->create()->assignRole('mahasiswa');
    $this->actingAs($user)->get(route('andalas.kipk-recipients.template'))->assertForbidden();
    $this->post(route('andalas.kipk-recipients.import'), ['file' => UploadedFile::fake()->createWithContent('kipk.csv', "nama,nim\n")])->assertForbidden();
});

it('creates and renames buildings with editable occupant categories', function () {
    $this->seed(RolePermissionSeeder::class);
    $admin = User::factory()->create()->assignRole('admin_layanan');
    $data = ['kode_gedung' => 'NEW', 'nama_gedung' => 'Gedung Baru', 'gender_peruntukan' => 'campur', 'allowed_categories' => ['non_student', 'summer_course']];
    $this->actingAs($admin)->post(route('andalas.residence-management.save', 'building'), $data)->assertSessionHasNoErrors();
    $building = Gedung::sole();
    $this->post(route('andalas.residence-management.save', 'building'), [...$data, 'gedung_id' => $building->id, 'nama_gedung' => 'Gedung Diperbarui'])->assertSessionHasNoErrors();
    expect($building->fresh()->nama_gedung)->toBe('Gedung Diperbarui');
    expect($building->fresh()->allowed_categories)->toBe(['non_student', 'summer_course']);
});

it('creates custom room numbers and marks damaged rooms unavailable', function () {
    $this->seed(RolePermissionSeeder::class);
    $admin = User::factory()->create()->assignRole('admin_layanan');
    $building = Gedung::create(['kode_gedung' => 'ROOM', 'nama_gedung' => 'Gedung Kamar']);
    $data = ['gedung_id' => $building->id, 'nomor_lantai' => 2, 'nomor_kamar' => 'MS 2.10', 'kapasitas' => 4, 'tipe_kamar' => 'umum', 'status' => 'kosong'];
    $this->actingAs($admin)->post(route('andalas.residence-management.save', 'room'), $data)->assertSessionHasNoErrors();
    $room = Kamar::sole();
    expect($room->nomor_kamar)->toBe('MS 2.10')->and($room->lantai->nomor_lantai)->toBe(2);
    $this->post(route('andalas.residence-management.save', 'room'), [...$data, 'id' => $room->id, 'status' => 'maintenance'])->assertSessionHasNoErrors();
    expect($room->fresh()->status)->toBe('maintenance');
    $this->post(route('andalas.residence-management.save', 'room'), $data)->assertSessionHasErrors('nomor_kamar');
});

it('rejects negative and fractional tariffs', function (mixed $amount) {
    $this->seed(RolePermissionSeeder::class);
    $admin = User::factory()->create()->assignRole('admin_layanan');
    $building = Gedung::create(['kode_gedung' => 'RATE', 'nama_gedung' => 'Tarif']);
    $this->actingAs($admin)->post(route('andalas.residence-management.save', 'rate'), ['gedung_id' => $building->id, 'tipe_kamar' => 'umum_vip', 'unit' => 'day', 'amount' => $amount])->assertSessionHasErrors('amount');
    $this->assertDatabaseCount('residence_rates', 0);
})->with([-1, '12.5', '1.000']);

it('saves general VIP prices and the separate source tariffs through service settings', function () {
    $this->seed(RolePermissionSeeder::class);
    $admin = User::factory()->create()->assignRole('admin_layanan');
    $building = Gedung::create(['kode_gedung' => 'VIP', 'nama_gedung' => 'Gedung VIP']);
    $this->actingAs($admin)->post(route('andalas.residence-management.save', 'rate'), [
        'gedung_id' => $building->id, 'tipe_kamar' => 'umum_vip', 'unit' => 'day',
        'amount' => 300000, 'student_amount' => 200000, 'room_amount' => null,
    ])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('residence_rates', ['gedung_id' => $building->id, 'tipe_kamar' => 'umum_vip', 'unit' => 'day', 'amount' => 300000, 'student_amount' => 200000]);
});

it('preserves placements when a room move or capacity reduction would invalidate occupants', function () {
    $this->seed(RolePermissionSeeder::class);
    $admin = User::factory()->create()->assignRole('admin_layanan');
    $building = Gedung::create(['kode_gedung' => 'SAFE', 'nama_gedung' => 'Gedung Aman']);
    $floor = Lantai::create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);
    $room = Kamar::create(['lantai_id' => $floor->id, 'nomor_kamar' => 'SAFE-1', 'kapasitas' => 2, 'status' => 'penuh']);
    foreach (range(1, 2) as $index) {
        $user = User::factory()->student()->create();
        $student = MahasiswaProfil::create(['user_id' => $user->id, 'barcode_code' => $user->id, 'angkatan' => '2026']);
        PenempatanKamar::create(['mahasiswa_id' => $student->id, 'kamar_id' => $room->id, 'tanggal_mulai' => now(), 'status' => 'aktif']);
    }
    $data = ['id' => $room->id, 'gedung_id' => $building->id, 'nomor_lantai' => 1, 'nomor_kamar' => 'SAFE-1', 'kapasitas' => 1, 'tipe_kamar' => 'standar', 'status' => 'kosong'];
    $this->actingAs($admin)->post(route('andalas.residence-management.save', 'room'), $data)->assertSessionHasErrors('kapasitas');
    $this->post(route('andalas.residence-management.save', 'room'), [...$data, 'kapasitas' => 2, 'nomor_lantai' => 2])->assertSessionHasErrors('gedung_id');
    expect($room->fresh()->kapasitas)->toBe(2)->and($room->fresh()->lantai_id)->toBe($floor->id);
    $this->assertDatabaseCount('lantai', 1);
});

it('prints the residence letterhead right aligned date and both signatures without empty residence placeholders', function () {
    $invoice = ['nomor' => 'INV-1', 'date' => '2026-10-07', 'recipient' => 'Rektor', 'institution' => 'Universitas Andalas', 'subject' => 'Tagihan', 'bank' => 'BSI', 'account_number' => '123', 'account_name' => 'AR', 'due_date' => '2026-10-14', 'signer' => 'Pimpinan', 'administration_signer' => 'Petugas Administrasi', 'total' => 100000, 'rows' => [['nama' => 'Peserta', 'nim' => '123', 'nomor' => 'INV-1', 'residence' => null, 'amount' => 100000]]];
    $html = view('pdf.invoice-group', compact('invoice'))->render();
    expect($html)->toContain('Times New Roman', 'class="date"', 'Alamat: Gedung Asrama', 'Demikian kami sampaikan tagihan', 'Petugas Administrasi', 'Administrasi Andalas Residence')->not->toContain('- / - / -');
});
