<?php

use App\Enums\FreeResidenceLetterStatus;
use App\Models\MahasiswaProfil;
use App\Models\PengajuanBebasAsrama;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

it('paginates and searches free residence approval records', function () {
    Role::findOrCreate('staff_admin');
    $admin = User::factory()->create()->assignRole('staff_admin');

    foreach (range(1, 12) as $index) {
        $student = User::factory()->create([
            'nama' => $index === 7 ? 'Andi Target Unique' : "Mahasiswa {$index}",
            'nim_nip' => sprintf('220000%04d', $index),
        ]);
        $profile = MahasiswaProfil::create([
            'user_id' => $student->id,
            'angkatan' => 2026,
            'barcode_code' => sprintf('approval-list-%02d', $index),
        ]);
        PengajuanBebasAsrama::create([
            'nomor_pengajuan' => sprintf('BA-%03d', $index),
            'mahasiswa_id' => $profile->id,
            'alasan' => 'Selesai tinggal',
            'status' => FreeResidenceLetterStatus::Diajukan,
            'lifecycle_year' => 2026,
        ]);
    }

    $this->actingAs($admin)
        ->get('/admin/approval-bebas-asrama?status=diajukan&per_page=10&sort_by=nomor_pengajuan&sort_direction=asc')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/approval-bebas-asrama')
            ->where('bebas_asrama.total', 12)
            ->where('bebas_asrama.current_page', 1)
            ->has('bebas_asrama.data', 10)
            ->where('bebas_asrama.data.0.nomor_pengajuan', 'BA-001')
            ->where('table_state.status', 'diajukan')
            ->where('table_state.sort_by', 'nomor_pengajuan'));

    $this->actingAs($admin)
        ->get('/admin/approval-bebas-asrama?status=diajukan&per_page=10&sort_by=nomor_pengajuan&sort_direction=asc&page=2')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('bebas_asrama.current_page', 2)
            ->has('bebas_asrama.data', 2)
            ->where('bebas_asrama.data.0.nomor_pengajuan', 'BA-011'));

    $this->actingAs($admin)
        ->get('/admin/approval-bebas-asrama?search=Andi%20Target%20Unique')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('bebas_asrama.total', 1)
            ->where('bebas_asrama.data.0.mahasiswa.user.nama', 'Andi Target Unique')
            ->where('table_state.search', 'Andi Target Unique'));
});

it('rejects unapproved sort columns and renders a safe default list', function () {
    Role::findOrCreate('staff_admin');
    $admin = User::factory()->create()->assignRole('staff_admin');

    $this->actingAs($admin)
        ->get('/admin/approval-bebas-asrama?sort_by=mahasiswa_id')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('table_state.sort_by', 'created_at')
            ->has('table_state.error')
            ->where('bebas_asrama.total', 0));
});
