<?php

use App\Models\MahasiswaProfil;
use App\Models\ParentStudentLink;
use App\Models\Pembayaran;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;

it('retires the duplicate workflow tables and columns while retaining the canonical records', function () {
    foreach (['checkin', 'absensi_sholat', 'asset_clearances', 'finance_clearances', 'room_inspection_checklist_items', 'kegiatan_partisipan'] as $table) {
        expect(Schema::hasTable($table))->toBeFalse();
    }
    expect(Schema::hasColumn('pembayaran', 'checkin_id'))->toBeFalse()
        ->and(Schema::hasColumn('kegiatan', 'target_role'))->toBeFalse()
        ->and(Schema::hasColumn('pengajuan_bebas_asrama', 'graduation_evidence_path'))->toBeFalse()
        ->and(Schema::hasColumn('residence_registrations', 'penempatan_kamar_id'))->toBeTrue()
        ->and(Schema::hasTable('residence_histories'))->toBeTrue()
        ->and(Schema::hasTable('activity_attendances'))->toBeTrue()
        ->and(Schema::hasColumn('laporan_kerusakan', 'foto_sebelum'))->toBeFalse();
});

it('removes old workflow endpoints and assigns each remaining step to the proper actor', function () {
    $this->seed(RolePermissionSeeder::class);
    $admin = User::factory()->create()->assignRole('superadmin');
    $this->actingAs($admin)->get('/mahasiswa/checkin')->assertNotFound();
    $this->put('/andalas/checkout/old/asset-clearance')->assertNotFound();
    $this->put('/andalas/checkout/old/finance-clearance')->assertNotFound();
    $this->get('/admin_aset/checkout-clearance')->assertNotFound();
    $this->post('/andalas/penempatan/manual')->assertNotFound();

    $facilitator = User::factory()->create()->assignRole('fasilitator');
    $serviceAdmin = User::factory()->create()->assignRole('admin_layanan');
    $assetAdmin = User::factory()->create()->assignRole('admin_aset');
    expect($facilitator->can('checkout.manage'))->toBeTrue()
        ->and($facilitator->can('free-residence.review'))->toBeFalse()
        ->and($serviceAdmin->can('free-residence.review'))->toBeTrue()
        ->and($serviceAdmin->can('checkout.manage'))->toBeFalse()
        ->and($assetAdmin->can('inspection.manage'))->toBeFalse();
});

it('renders every configured role page from an existing frontend component', function () {
    $this->seed(RolePermissionSeeder::class);
    foreach (Route::getRoutes() as $route) {
        $component = $route->defaults['component'] ?? null;
        if ($component) {
            expect(file_exists(resource_path('js/pages/'.$component.'.tsx')))->toBeTrue("Missing component: {$component}");
        }
    }
    foreach (['admin_layanan' => 'admin/dashboard', 'admin_aset' => 'admin_aset/dashboard', 'go' => 'go/dashboard', 'orang_tua' => 'orang_tua/dashboard'] as $role => $component) {
        $user = User::factory()->create()->assignRole($role);
        $this->actingAs($user)->get(route($role.'.dashboard'))->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component($component));
    }
});

it('does not disclose payment records or unrelated children to a parent dashboard', function () {
    $this->seed(RolePermissionSeeder::class);
    $parent = User::factory()->create()->assignRole('orang_tua');
    $student = MahasiswaProfil::create(['user_id' => User::factory()->student()->create()->id, 'barcode_code' => fake()->uuid()]);
    Pembayaran::create(['mahasiswa_id' => $student->id, 'kode_transaksi' => 'PRIVATE-PAY', 'jenis_pembayaran' => 'sewa_asrama', 'nominal' => 500000]);
    $this->actingAs($parent)->get(route('orang_tua.dashboard'))->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->has('pembayaran', 0)->has('children', 0));

    ParentStudentLink::factory()->create(['parent_user_id' => $parent->id, 'student_profile_id' => $student->id]);
    $this->get(route('orang_tua.dashboard'))->assertInertia(fn (AssertableInertia $page) => $page->has('children', 1)->where('children.0.student_profile.id', $student->id)->has('pembayaran', 0));
});

it('archives old checkins and preserves completed stays when upgrading the database', function () {
    Storage::fake('local');
    $original = DB::getDefaultConnection();
    config(['database.connections.upgrade_audit' => ['driver' => 'sqlite', 'database' => ':memory:', 'foreign_key_constraints' => true]]);
    DB::setDefaultConnection('upgrade_audit');
    try {
        $cleanup = database_path('migrations/2026_09_22_223406_retire_obsolete_residence_workflows.php');
        foreach (glob(database_path('migrations/*.php')) as $path) {
            if ($path === $cleanup) {
                continue;
            }
            (require $path)->up();
        }
        $user = User::factory()->create();
        $student = MahasiswaProfil::create(['user_id' => $user->id, 'barcode_code' => 'UPGRADE', 'status_huni' => 'aktif']);
        DB::table('checkin')->insert([
            'id' => fake()->uuid(), 'mahasiswa_id' => $student->id,
            'tanggal_rencana_masuk' => '2026-08-01', 'tanggal_aktual_checkin' => '2026-08-01 09:00:00', 'status' => 'selesai_checkin',
        ]);

        $reportId = fake()->uuid();
        DB::table('laporan_kerusakan')->insert([
            'id' => $reportId, 'nomor_tiket' => 'LEGACY-PHOTO', 'dilaporkan_oleh' => $user->id,
            'deskripsi' => 'Foto lama', 'foto_sebelum' => 'legacy/photo.jpg', 'status' => 'menunggu_triage', 'tanggal_lapor' => now(),
        ]);

        (require $cleanup)->up();

        expect(DB::table('laporan_kerusakan_photos')->where('laporan_kerusakan_id', $reportId)->value('path'))->toBe('legacy/photo.jpg');

        expect(Schema::hasTable('checkin'))->toBeFalse();
        expect(DB::table('residence_histories')->where('mahasiswa_id', $student->id)->value('event'))->toBe('entered');
        $files = array_values(array_filter(Storage::disk('local')->files('backups'), fn (string $path): bool => ! str_contains($path, 'retired-activity-confirmation') && ! str_contains($path, 'activity-unification')));
        expect($files)->toHaveCount(1);
        $archived = json_decode(Storage::disk('local')->get($files[0]), true);
        expect($archived['checkin'][0]['mahasiswa_id'])->toBe($student->id);
    } finally {
        DB::setDefaultConnection($original);
        DB::purge('upgrade_audit');
    }
});

it('prevents identity editing from bypassing registration or checkout', function () {
    $this->seed(RolePermissionSeeder::class);
    $admin = User::factory()->create()->assignRole('admin_layanan');
    $student = MahasiswaProfil::create(['user_id' => User::factory()->student()->create()->id, 'barcode_code' => fake()->uuid(), 'status_huni' => 'calon']);
    $this->actingAs($admin)->put(route('andalas.mahasiswa.update', $student), ['status_huni' => 'aktif'])->assertSessionHasErrors('status_huni');
    expect($student->fresh()->status_huni)->toBe('calon');
});

it('archives obsolete activity confirmations before removing their table and targeting column', function () {
    Storage::fake('local');
    $original = DB::getDefaultConnection();
    config(['database.connections.activity_upgrade' => ['driver' => 'sqlite', 'database' => ':memory:', 'foreign_key_constraints' => true]]);
    DB::setDefaultConnection('activity_upgrade');
    try {
        $cleanup = database_path('migrations/2026_09_24_023659_retire_obsolete_activity_confirmation.php');
        foreach (glob(database_path('migrations/*.php')) as $path) {
            if ($path !== $cleanup) {
                (require $path)->up();
            }
        }
        $user = User::factory()->create();
        $activityId = fake()->uuid();
        DB::table('kegiatan')->insert(['id' => $activityId, 'judul' => 'Konfirmasi lama', 'tanggal_mulai' => now(), 'tanggal_selesai' => now()->addHour(), 'dibuat_oleh' => $user->id, 'target_role' => '["mahasiswa"]']);
        DB::table('kegiatan_partisipan')->insert(['id' => fake()->uuid(), 'kegiatan_id' => $activityId, 'user_id' => $user->id, 'status_konfirmasi' => 'hadir']);

        (require $cleanup)->up();

        expect(Schema::hasTable('kegiatan_partisipan'))->toBeFalse()
            ->and(Schema::hasColumn('kegiatan', 'target_role'))->toBeFalse()
            ->and(DB::table('kegiatan')->where('id', $activityId)->exists())->toBeTrue();
        $files = array_values(array_filter(Storage::disk('local')->files('backups'), fn (string $path): bool => str_contains($path, 'retired-activity-confirmation')));
        expect($files)->toHaveCount(1);
        $archive = json_decode(Storage::disk('local')->get($files[0]), true);
        expect($archive['kegiatan_partisipan'][0]['user_id'])->toBe($user->id)
            ->and($archive['kegiatan_target_role'][0]['target_role'])->toBe('["mahasiswa"]');
    } finally {
        DB::setDefaultConnection($original);
        DB::purge('activity_upgrade');
    }
});
