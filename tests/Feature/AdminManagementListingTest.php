<?php

use App\Enums\ResidenceRegistrationStatus;
use App\Models\MahasiswaProfil;
use App\Models\Pembayaran;
use App\Models\Periode;
use App\Models\ResidenceRegistration;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

it('searches and paginates registration review records', function () {
    Role::findOrCreate('staff_admin');
    $admin = User::factory()->create()->assignRole('staff_admin');
    $period = Periode::create([
        'nama_periode' => 'Tahun Akademik Uji',
        'status' => 'aktif',
        'tanggal_mulai' => '2026-01-01',
        'tanggal_selesai' => '2026-12-31',
    ]);

    foreach (range(1, 12) as $index) {
        $user = User::factory()->create([
            'nama' => $index === 11 ? 'Target Pendaftaran' : "Mahasiswa {$index}",
            'nim_nip' => sprintf('230000%04d', $index),
        ]);
        $profile = MahasiswaProfil::create([
            'user_id' => $user->id,
            'angkatan' => '2026',
            'barcode_code' => sprintf('registration-list-%02d', $index),
        ]);
        ResidenceRegistration::create([
            'student_profile_id' => $profile->id,
            'periode_id' => $period->id,
            'status' => ResidenceRegistrationStatus::Submitted,
        ]);
    }

    $this->actingAs($admin)
        ->get('/admin/registration-review?status=submitted&per_page=10&sort_by=status&sort_direction=asc')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('registrations.total', 12)
            ->where('registrations.current_page', 1)
            ->has('registrations.data', 10)
            ->where('table_state.status', 'submitted'));

    $this->actingAs($admin)
        ->get('/admin/registration-review?search=Target%20Pendaftaran')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('registrations.total', 1)
            ->where('registrations.data.0.student_profile.user.nama', 'Target Pendaftaran'));
});

it('searches and filters payment verification records', function () {
    Role::findOrCreate('staff_admin');
    $admin = User::factory()->create()->assignRole('staff_admin');

    foreach (range(1, 12) as $index) {
        $user = User::factory()->create([
            'nama' => $index === 12 ? 'Target Pembayaran' : "Pembayar {$index}",
            'nim_nip' => sprintf('240000%04d', $index),
        ]);
        $profile = MahasiswaProfil::create([
            'user_id' => $user->id,
            'angkatan' => '2026',
            'barcode_code' => sprintf('payment-list-%02d', $index),
        ]);
        Pembayaran::create([
            'kode_transaksi' => sprintf('TRX-%03d', $index),
            'mahasiswa_id' => $profile->id,
            'jenis_pembayaran' => 'sewa_asrama',
            'nominal' => 100000,
            'status' => $index === 12 ? 'lunas' : 'menunggu_verifikasi',
        ]);
    }

    $this->actingAs($admin)
        ->get('/admin/verifikasi-pembayaran?status=menunggu_verifikasi&per_page=10')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('pembayaran.total', 11)
            ->has('pembayaran.data', 10)
            ->where('table_state.status', 'menunggu_verifikasi'));

    $this->actingAs($admin)
        ->get('/admin/verifikasi-pembayaran?search=Target%20Pembayaran')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('pembayaran.total', 1)
            ->where('pembayaran.data.0.mahasiswa.user.nama', 'Target Pembayaran'));
});
