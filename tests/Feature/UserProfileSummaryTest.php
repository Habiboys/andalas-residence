<?php

use App\Models\KipkRecipient;
use App\Models\MahasiswaProfil;
use App\Models\Periode;
use App\Models\ResidenceHistory;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Inertia\Testing\AssertableInertia as Assert;

function profileStudent(string $category = 'local_non_kipk'): User
{
    $user = User::factory()->create(['client_profile_category' => $category, 'nim_nip' => '2610123456']);
    $user->assignRole('mahasiswa');
    MahasiswaProfil::create(['user_id' => $user->id, 'angkatan' => 2026, 'barcode_code' => $user->id, 'status_huni' => 'calon']);

    return $user;
}

it('shows the authenticated account category without exposing another user', function (string $category, string $label) {
    $this->seed(RolePermissionSeeder::class);
    $user = profileStudent($category);
    User::factory()->create();
    $this->actingAs($user)->get(route('profile.edit'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('profileSummary.category', $label)
        ->where('profileSummary.residence', 'Belum pernah tinggal')
        ->where('profileSummary.sections.0.fields.Email', $user->email)
        ->missing('profileSummary.password')
    );
})->with([
    ['local_non_kipk', 'Mahasiswa lokal non-KIP-K'],
    ['local_kipk', 'Mahasiswa lokal KIP-K'],
    ['international_student', 'Mahasiswa internasional berbayar'],
    ['international_free_facility', 'Mahasiswa internasional fasilitas gratis'],
    ['non_student', 'Nonmahasiswa'],
]);

it('distinguishes declared KIPK category from admission eligibility and alumni history', function () {
    $this->seed(RolePermissionSeeder::class);
    $user = profileStudent('local_kipk');
    Periode::create(['nama_periode' => '2026 Ganjil', 'status' => 'aktif', 'angkatan_maba' => 2026, 'tanggal_mulai' => '2026-08-01', 'tanggal_selesai' => '2027-01-31']);
    $this->actingAs($user)->get(route('profile.edit'))->assertInertia(fn (Assert $page) => $page
        ->where('profileSummary.sections.2.fields.KIP-K untuk penerimaan aktif', 'Tidak memenuhi syarat KIP-K pada penerimaan aktif'));
    KipkRecipient::create(['nim' => $user->nim_nip, 'angkatan' => 2026, 'nama' => $user->nama]);
    $this->get(route('profile.edit'))->assertInertia(fn (Assert $page) => $page
        ->where('profileSummary.sections.2.fields.KIP-K untuk penerimaan aktif', 'Memenuhi syarat KIP-K'));
    ResidenceHistory::create(['mahasiswa_id' => $user->mahasiswaProfil->id, 'event' => 'checked_out', 'occurred_at' => now()]);
    $this->get(route('profile.edit'))->assertInertia(fn (Assert $page) => $page
        ->where('profileSummary.residence', 'Alumni asrama'));
});

it('shows profile details consistently to admin and rejects student access to the directory', function () {
    $this->seed(RolePermissionSeeder::class);
    $student = profileStudent('international_student');
    $admin = User::factory()->create();
    $admin->assignRole('admin_layanan');
    $this->actingAs($admin)->get(route('admin_layanan.mahasiswa'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('mahasiswa', 1)
        ->where('mahasiswa.0.profile_summary.category', 'Mahasiswa internasional berbayar')
        ->where('mahasiswa.0.profile_summary.account', 'Aktif')
        ->where('mahasiswa.0.profile_summary.sections.0.fields.Email', $student->email));
    $this->actingAs($student)->get(route('admin_layanan.mahasiswa'))->assertForbidden();
});

it('only supplies the active admission period and rejects inactive submissions', function () {
    $this->seed(RolePermissionSeeder::class);
    $user = profileStudent();
    $active = Periode::create(['nama_periode' => '2026 Ganjil', 'status' => 'aktif', 'angkatan_maba' => 2026, 'tanggal_mulai' => '2026-08-01', 'tanggal_selesai' => '2027-01-31']);
    $inactive = Periode::create(['nama_periode' => '2025 Genap', 'status' => 'nonaktif', 'tanggal_mulai' => '2025-02-01', 'tanggal_selesai' => '2025-07-31']);
    $this->actingAs($user)->get(route('mahasiswa.registration'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('periode', 1)->where('periode.0.id', $active->id));
    $this->post(route('andalas.registrations.store'), ['periode_id' => $inactive->id])->assertSessionHasErrors('periode_id');
    $this->assertDatabaseCount('residence_registrations', 0);
    $active->update(['status' => 'nonaktif']);
    $this->get(route('mahasiswa.registration'))->assertInertia(fn (Assert $page) => $page->has('periode', 0));
});

it('requires login to read a profile', function () {
    $this->get(route('profile.edit'))->assertRedirect(route('login'));
});

it('shows internal account details to superadmin', function () {
    $this->seed(RolePermissionSeeder::class);
    $admin = User::factory()->create(['client_profile_category' => null]);
    $admin->assignRole('superadmin');
    $this->actingAs($admin)->get(route('admin.akun-internal'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('users.0.profile_summary.category', 'Petugas internal')
        ->where('users.0.profile_summary.residence', 'Tidak berlaku')
        ->where('users.0.profile_summary.sections.0.fields.Email', $admin->email));
});

it('explains why a residence account is inactive', function (?string $reason, string $label) {
    $this->seed(RolePermissionSeeder::class);
    $user = profileStudent();
    $user->update(['status' => 'nonaktif', 'inactive_reason' => $reason]);
    $this->actingAs($user)->get(route('profile.edit'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('profileSummary.account', $label));
})->with([
    ['letter_issued', 'Nonaktif setelah surat terbit — dapat daftar kembali'],
    ['admin_blocked', 'Nonaktif oleh admin'],
    [null, 'Nonaktif'],
]);
