<?php

use App\Actions\Billing\ReconcileResidencePayment;
use App\Actions\Registration\SubmitResidenceRegistration;
use App\Models\Departemen;
use App\Models\Faculty;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\KipkRecipient;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\Periode;
use App\Models\Prodi;
use App\Models\RegistrationDocument;
use App\Models\ResidencePaymentReference;
use App\Models\ResidencePolicy;
use App\Models\ResidenceRegistration;
use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

function toBeOfficer(string $role = 'admin_layanan'): User
{
    foreach (['mahasiswa', 'admin_layanan', 'staff_admin', 'superadmin', 'fasilitator', 'pimpinan', 'tamu'] as $name) {
        Role::findOrCreate($name);
    }
    $user = User::factory()->create()->assignRole($role);
    if ($role === 'admin_layanan') {
        $user->givePermissionTo(Permission::findOrCreate('pembayaran.verify'));
    }

    return $user;
}

function toBeFixture(string $category = 'local_non_kipk', int $capacity = 2): array
{
    $manager = toBeOfficer();
    $user = User::factory()->student()->create(['nim_nip' => fake()->unique()->numerify('2599######'), 'gender' => 'perempuan'])->assignRole('mahasiswa');
    $faculty = Faculty::create(['name' => 'Fakultas Uji']);
    $department = Departemen::create(['name' => 'Departemen Uji', 'faculty_id' => $faculty->id]);
    $program = Prodi::create(['name' => 'Prodi Uji', 'jenjang' => 'S1', 'departemen_id' => $department->id]);
    $profile = MahasiswaProfil::create(['user_id' => $user->id, 'prodi_id' => $program->id, 'angkatan' => '2025', 'status_huni' => 'calon', 'barcode_code' => fake()->uuid()]);
    $period = Periode::create(['nama_periode' => '2026/2027', 'status' => 'aktif', 'angkatan_maba' => 2026, 'tanggal_mulai' => today(), 'tanggal_selesai' => today()->addYear()]);
    $building = Gedung::create(['kode_gedung' => 'A-'.fake()->unique()->numerify('######'), 'nama_gedung' => 'Gedung Uji', 'gender_peruntukan' => 'perempuan']);
    $floor = Lantai::create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);
    $room = Kamar::create(['lantai_id' => $floor->id, 'nomor_kamar' => '101', 'tipe_kamar' => 'standar', 'kapasitas' => $capacity, 'tarif_per_periode' => 1000000, 'status' => 'kosong']);
    $policy = ResidencePolicy::factory()->create(['category' => $category, 'published_at' => now(), 'created_by' => $manager->id, 'settings' => [
        'open' => true, 'documents' => ['perjanjian'], 'building_ids' => [$building->id], 'month_days' => 30, 'day_basis' => 'nights', 'monthly_allowed' => true,
        'rates' => array_map(fn ($unit) => ['gedung_id' => $building->id, 'type' => 'standar', 'unit' => $unit, 'amount' => $unit === 'year' ? '1000000' : '100000', 'room_amount' => '10000000'], ['year', 'month', 'day', 'semester']),
    ]]);
    if ($category === 'local_kipk') {
        $profile->update(['angkatan' => '2026']);
        $user->update(['nim_nip' => fake()->unique()->numerify('2699######')]);
        KipkRecipient::create(['nim' => $user->nim_nip, 'nama' => $user->nama, 'angkatan' => 2026]);
    }

    return compact('manager', 'user', 'profile', 'period', 'building', 'floor', 'room', 'policy', 'program');
}

function toBeSubmit(array $f, array $extra = []): ResidenceRegistration
{
    return app(SubmitResidenceRegistration::class)->handle($f['profile'], [...['periode_id' => $f['period']->id, 'is_kipk' => false, 'preferences' => [['kamar_id' => $f['room']->id]]], ...$extra]);
}

function toBeDocument(ResidenceRegistration $r, User $manager): RegistrationDocument
{
    return RegistrationDocument::factory()->create(['residence_registration_id' => $r->id, 'status' => 'valid', 'reviewed_by' => $manager->id, 'reviewed_at' => now()]);
}

function toBePay(ResidenceRegistration $r, User $manager, ?int $amount = null): ResidencePaymentReference
{
    $reference = ResidencePaymentReference::factory()->create(['recorded_by' => $manager->id, 'amount' => $amount ?? $r->tagihan->total]);
    app(ReconcileResidencePayment::class)->handle($reference, [['tagihan_id' => $r->tagihan_id, 'jumlah' => $reference->amount]], $manager);

    return $reference;
}
