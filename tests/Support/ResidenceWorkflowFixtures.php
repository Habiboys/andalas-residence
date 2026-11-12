<?php

use App\Actions\Checkout\CreateCheckoutRequest;
use App\Actions\Registration\ConfirmResidenceCheckIn;
use App\Models\Departemen;
use App\Models\Faculty;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Prodi;
use App\Models\RegistrationDocument;
use App\Models\ResidencePolicy;
use App\Models\ResidenceRate;
use App\Models\ResidenceRegistration;
use App\Models\User;
use Spatie\Permission\Models\Role;

function withHousingIdentity(\App\Models\MahasiswaProfil $profile): \App\Models\MahasiswaProfil
{
    $province = \App\Models\Province::firstOrCreate(['wilayah_code' => '99'], ['name' => 'Provinsi pengujian']);
    $city = \App\Models\City::firstOrCreate(['wilayah_code' => '99.99'], ['name' => 'Kota pengujian', 'province_id' => $province->id]);
    $profile->user->update(['no_hp' => '080000000001']);
    $profile->update(['nik' => fake()->unique()->numerify('99##############'), 'city_id' => $city->id, 'alamat' => 'Alamat pengujian']);

    return $profile;
}

function workflowTestProgram(): string
{
    $faculty = Faculty::firstOrCreate(['name' => 'Fakultas pengujian']);
    $department = Departemen::firstOrCreate(['name' => 'Departemen pengujian', 'faculty_id' => $faculty->id]);

    return Prodi::firstOrCreate(['name' => 'Program pengujian', 'departemen_id' => $department->id, 'jenjang' => 'S1'])->id;
}

/** Translate the explicitly configured legacy test tariffs into a published test policy. */
function workflowTestPolicies(array $categories = ['local_non_kipk', 'local_kipk', 'international', 'summer_course', 'non_student']): void
{
    foreach (['mahasiswa', 'admin_layanan', 'staff_admin', 'fasilitator', 'pimpinan', 'tamu'] as $role) {
        Role::findOrCreate($role);
    }
    $rates = [];
    foreach (Kamar::with('lantai')->get()->unique(fn ($room) => $room->lantai->gedung_id.'-'.$room->tipe_kamar) as $room) {
        $configured = ResidenceRate::where('gedung_id', $room->lantai->gedung_id)->where('tipe_kamar', $room->tipe_kamar)->get();
        foreach ($configured as $rate) {
            $rates[] = ['gedung_id' => $rate->gedung_id, 'type' => $rate->tipe_kamar, 'unit' => $rate->unit, 'amount' => $rate->amount, 'room_amount' => $rate->room_amount];
        }
        if (! $configured->contains('unit', 'year') && (float) $room->tarif_per_periode > 0) {
            $rates[] = ['gedung_id' => $room->lantai->gedung_id, 'type' => $room->tipe_kamar, 'unit' => 'year', 'amount' => $room->tarif_per_periode, 'room_amount' => null];
        }
    }
    foreach ($categories as $category) {
        ResidencePolicy::updateOrCreate(['category' => $category, 'version' => 1], ['published_at' => now(), 'settings' => ['open' => true, 'building_ids' => Gedung::pluck('id')->all(), 'documents' => ['perjanjian'], 'rates' => $rates, 'month_days' => 30, 'day_basis' => 'nights', 'monthly_allowed' => true]]);
    }
}

function workflowTestInspection(ResidenceRegistration $registration): void
{
    if ($registration->fresh()->keys_returned_at) {
        return;
    }
    $checkout = app(CreateCheckoutRequest::class)->handle($registration->fresh()->studentProfile, 'Pengembalian kunci');
    $checkout->inspection->update(['status' => 'selesai', 'inspected_at' => now(), 'inspector_id' => $registration->fresh()->checked_in_by]);
}

function workflowTestCheckin(ResidenceRegistration $registration): void
{
    Role::findOrCreate('admin_layanan');
    $officer = User::factory()->create()->assignRole('admin_layanan');
    RegistrationDocument::factory()->create(['residence_registration_id' => $registration->id, 'status' => 'valid', 'reviewed_by' => $officer->id, 'reviewed_at' => now()]);
    app(ConfirmResidenceCheckIn::class)->handle($registration->fresh(), $officer);
}
