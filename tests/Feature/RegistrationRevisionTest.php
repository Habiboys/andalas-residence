<?php

use App\Enums\ClientProfileCategory;
use App\Models\Departemen;
use App\Models\Faculty;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\Periode;
use App\Models\Prodi;
use App\Models\User;
use Database\Seeders\ResidenceBuildingSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\UnandAcademicSeeder;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;

function revisionAccountInput(): array
{
    $faculty = Faculty::create(['name' => 'Teknologi Informasi']);
    $department = Departemen::create(['name' => 'Informatika', 'faculty_id' => $faculty->id]);
    $program = Prodi::create(['name' => 'Informatika', 'jenjang' => 'S1', 'departemen_id' => $department->id]);

    return [
        'nama' => 'Mahasiswa Revisi', 'nim_nip' => '2599001111', 'email' => 'revision@example.test',
        'password' => 'password123', 'password_confirmation' => 'password123',
        'client_profile_category' => 'local_non_kipk', 'gender' => 'perempuan',
        'faculty_id' => $faculty->id, 'departemen_id' => $department->id, 'prodi_id' => $program->id,
    ];
}

it('rejects invalid and future NIM without trusting a submitted cohort', function (string $nim) {
    $this->travelTo(now()->setDate(2026, 9, 25));
    $input = revisionAccountInput();
    $this->post(route('register.store'), [...$input, 'nim_nip' => $nim, 'angkatan' => 2025])
        ->assertSessionHasErrors('nim_nip');
    $this->assertDatabaseCount('users', 0);
})->with(['BAD-NIM', '1', '2799001111']);

it('rejects a department from another faculty and a program from another department', function (string $field) {
    $input = revisionAccountInput();
    $otherFaculty = Faculty::create(['name' => 'Hukum']);
    $otherDepartment = Departemen::create(['name' => 'Hukum', 'faculty_id' => $otherFaculty->id]);
    $otherProgram = Prodi::create(['name' => 'Hukum', 'jenjang' => 'S1', 'departemen_id' => $otherDepartment->id]);
    $input[$field] = $field === 'departemen_id' ? $otherDepartment->id : $otherProgram->id;

    $this->post(route('register.store'), $input)->assertSessionHasErrors($field);
    $this->assertDatabaseCount('users', 0);
})->with(['departemen_id', 'prodi_id']);

it('retires the distinct local resident registration category', function () {
    $input = revisionAccountInput();
    $this->post(route('register.store'), [...$input, 'client_profile_category' => 'local_resident'])
        ->assertSessionHasErrors('client_profile_category');
    $this->assertDatabaseCount('users', 0);
});

it('derives the cohort on admin create and update while preserving academic relationships', function () {
    $this->seed(RolePermissionSeeder::class);
    $admin = User::factory()->create()->assignRole('admin_layanan');
    $input = revisionAccountInput();
    $this->actingAs($admin)->post(route('andalas.mahasiswa.store'), [...$input, 'angkatan' => 2000])
        ->assertSessionHasNoErrors();
    $student = User::where('email', $input['email'])->sole()->mahasiswaProfil;
    expect($student->angkatan)->toBe('2025');
    $this->put(route('andalas.mahasiswa.update', $student), [...$input, 'nim_nip' => '2499001111', 'angkatan' => 2000])
        ->assertSessionHasNoErrors();
    expect($student->fresh()->angkatan)->toBe('2024');
    $this->put(route('andalas.mahasiswa.update', $student), [
        'client_profile_category' => 'non_student', 'nim_nip' => 'PASPOR123',
    ])->assertSessionHasNoErrors();
    expect($student->fresh()->angkatan)->toBeNull()->and($student->fresh()->prodi_id)->toBeNull();
});

it('seeds fixed building allocations without replacing existing building details', function () {
    Gedung::create(['kode_gedung' => 'A', 'nama_gedung' => 'Nama dipertahankan', 'gender_peruntukan' => 'laki_laki']);
    $this->seed(ResidenceBuildingSeeder::class);
    $this->seed(ResidenceBuildingSeeder::class);
    $this->assertDatabaseCount('gedung', 10);
    $this->assertDatabaseHas('gedung', ['kode_gedung' => 'A', 'nama_gedung' => 'Nama dipertahankan', 'gender_peruntukan' => 'perempuan']);
    $this->assertDatabaseHas('gedung', ['kode_gedung' => 'H', 'gender_peruntukan' => 'laki_laki']);
    $this->assertDatabaseHas('gedung', ['kode_gedung' => 'Nakes', 'gender_peruntukan' => 'campur']);
});

it('loads the supplied academic catalog idempotently and repairs the former Informatika placeholder', function () {
    $faculty = Faculty::create(['name' => 'Fakultas Teknik']);
    $department = Departemen::create(['name' => 'Teknik Informatika', 'faculty_id' => $faculty->id]);
    $oldProgram = Prodi::create(['name' => 'Informatika', 'jenjang' => 'S1', 'departemen_id' => $department->id]);
    $student = MahasiswaProfil::create(['user_id' => User::factory()->student()->create()->id, 'barcode_code' => fake()->uuid(), 'prodi_id' => $oldProgram->id]);
    $lawFaculty = Faculty::create(['name' => 'Fakultas Hukum']);
    $lawDepartment = Departemen::create(['name' => 'Ilmu Hukum', 'faculty_id' => $lawFaculty->id]);
    Prodi::create(['name' => 'Ilmu Hukum', 'jenjang' => 'S1', 'departemen_id' => $lawDepartment->id]);
    $this->seed(UnandAcademicSeeder::class);
    $this->seed(UnandAcademicSeeder::class);

    $this->assertDatabaseCount('faculty', 16);
    $this->assertDatabaseCount('departemen', 67);
    $this->assertDatabaseCount('prodi', 153);
    expect($student->fresh()->prodi->code)->toBe('15-03-01')
        ->and($student->fresh()->prodi->departemen->faculty->name)->toBe('Teknologi Informasi');
    $this->assertDatabaseMissing('prodi', ['id' => $oldProgram->id]);
});

it('enforces building gender on room submission and filters the available choices', function (string $code, string $gender, bool $allowed) {
    Queue::fake();
    $this->seed(RolePermissionSeeder::class);
    $user = User::factory()->student()->create(['gender' => $gender, 'client_profile_category' => ClientProfileCategory::LocalNonKipk])->assignRole('mahasiswa');
    $profile = MahasiswaProfil::create(['user_id' => $user->id, 'barcode_code' => fake()->uuid(), 'status_huni' => 'calon']);
    $period = Periode::create(['nama_periode' => 'Periode uji', 'status' => 'aktif', 'tanggal_mulai' => now(), 'tanggal_selesai' => now()->addYear()]);
    $building = Gedung::create(['kode_gedung' => $code, 'nama_gedung' => 'Asrama '.$code, 'gender_peruntukan' => 'campur']);
    $floor = Lantai::create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);
    $room = Kamar::create(['lantai_id' => $floor->id, 'nomor_kamar' => '101', 'kapasitas' => 2, 'status' => 'kosong', 'tipe_kamar' => 'medium', 'tarif_per_periode' => 1800000]);

    $this->actingAs($user)->get(route('mahasiswa.registration'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('rooms', $allowed ? 1 : 0));
    $response = $this->post(route('andalas.registrations.store'), ['periode_id' => $period->id, 'is_kipk' => false, 'preferences' => [['kamar_id' => $room->id]]]);
    if ($allowed) {
        $response->assertSessionHasNoErrors();
        $this->assertDatabaseHas('residence_registrations', ['student_profile_id' => $profile->id, 'status' => 'submitted']);
    } else {
        $response->assertSessionHasErrors('preferences');
        $this->assertDatabaseCount('residence_registrations', 0);
    }
})->with([
    ['A', 'laki_laki', false], ['E', 'perempuan', true],
    ['F', 'perempuan', false], ['H', 'laki_laki', true],
    ['Nakes', 'laki_laki', true], ['ASN', 'perempuan', true],
]);

it('offers welcome service selection only to active accounts that are still candidates', function (string $status, string $housing, bool $expected) {
    $this->seed(RolePermissionSeeder::class);
    $user = User::factory()->student()->create([
        'status' => $status,
        'inactive_reason' => $status === 'nonaktif' ? 'letter_issued' : null,
    ])->assignRole('mahasiswa');
    MahasiswaProfil::create(['user_id' => $user->id, 'barcode_code' => fake()->uuid(), 'status_huni' => $housing]);

    $this->actingAs($user)->get(route('mahasiswa.dashboard'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('initialUser.needs_service_selection', $expected));
})->with([['aktif', 'calon', true], ['aktif', 'aktif', false], ['nonaktif', 'calon', false]]);

it('blocks administrator deactivated accounts from the resident dashboard', function () {
    $this->seed(RolePermissionSeeder::class);
    $user = User::factory()->student()->create(['status' => 'nonaktif', 'inactive_reason' => 'admin_blocked'])->assignRole('mahasiswa');
    MahasiswaProfil::create(['user_id' => $user->id, 'barcode_code' => fake()->uuid(), 'status_huni' => 'calon']);

    $this->actingAs($user)->get(route('mahasiswa.dashboard'))->assertForbidden();
});
