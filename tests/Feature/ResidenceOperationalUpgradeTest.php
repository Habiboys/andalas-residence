<?php

use App\Actions\Checkout\AutoApproveExpiredCheckouts;
use App\Actions\Checkout\CreateCheckoutRequest;
use App\Actions\Registration\SubmitResidenceRegistration;
use App\Enums\CheckoutRequestStatus;
use App\Enums\ClientProfileCategory;
use App\Enums\RoomInspectionStatus;
use App\Models\CheckoutRequest;
use App\Models\Departemen;
use App\Models\Faculty;
use App\Models\FasilitatorWilayah;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\LaporanKerusakan;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\Periode;
use App\Models\Prodi;
use App\Models\RegistrationDocument;
use App\Models\ResidencePolicy;
use App\Models\ResidenceRate;
use App\Models\ResidenceRegistration;
use App\Models\RoomType;
use App\Models\Tagihan;
use App\Models\User;
use App\Notifications\ResidenceWorkflowNotification;
use App\Services\LandingContentService;
use App\Services\ResidencePolicyService;
use App\Services\ResidenceWorkflow;
use Database\Seeders\BuildingStaffAccountSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function opsFixture(): array
{
    foreach (['mahasiswa', 'staff_admin', 'admin_layanan', 'superadmin', 'fasilitator', 'go', 'pimpinan'] as $r) {
        Role::firstOrCreate(['name' => $r, 'guard_name' => 'web']);
    }
    foreach (['checkout.submit', 'checkout.manage', 'inspection.manage', 'gedung.view', 'landing.manage'] as $perm) {
        Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
    }
    Role::findByName('fasilitator')->givePermissionTo(['checkout.manage', 'gedung.view']);
    Role::findByName('go')->givePermissionTo(['inspection.manage', 'gedung.view']);
    Role::findByName('mahasiswa')->givePermissionTo(['checkout.submit']);
    Role::findByName('superadmin')->givePermissionTo(['landing.manage', 'gedung.view', 'checkout.manage', 'inspection.manage']);

    RoomType::firstOrCreate(['code' => 'reguler'], ['name' => 'Reguler', 'active' => true]);

    $period = Periode::create([
        'nama_periode' => '2026/2027',
        'angkatan_maba' => 2026,
        'tanggal_mulai' => now()->subDays(5)->toDateString(),
        'tanggal_selesai' => now()->addYear()->toDateString(),
        'status' => 'aktif',
        'reservation_hours' => 72,
    ]);

    $faculty = Faculty::create(['name' => 'FTI']);
    $dept = Departemen::create(['name' => 'SI', 'faculty_id' => $faculty->id]);
    $prodi = Prodi::create(['name' => 'SI', 'jenjang' => 'S1', 'departemen_id' => $dept->id]);

    $buildingF = Gedung::create(['kode_gedung' => 'F', 'nama_gedung' => 'Oren (F)', 'gender_peruntukan' => 'laki_laki']);
    $floorF = Lantai::create(['gedung_id' => $buildingF->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1', 'booking_open' => true, 'booking_priority' => 1]);
    $roomF = Kamar::create(['lantai_id' => $floorF->id, 'nomor_kamar' => 'F101', 'tipe_kamar' => 'reguler', 'kapasitas' => 2, 'tarif_per_periode' => 2400000, 'status' => 'kosong']);

    $buildingG = Gedung::create(['kode_gedung' => 'G', 'nama_gedung' => 'Hijau (G)', 'gender_peruntukan' => 'laki_laki']);
    $floorG = Lantai::create(['gedung_id' => $buildingG->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1', 'booking_open' => true, 'booking_priority' => 1]);
    $roomG = Kamar::create(['lantai_id' => $floorG->id, 'nomor_kamar' => 'G101', 'tipe_kamar' => 'reguler', 'kapasitas' => 2, 'tarif_per_periode' => 2400000, 'status' => 'kosong']);

    foreach ([$buildingF, $buildingG] as $b) {
        ResidenceRate::create(['gedung_id' => $b->id, 'category' => 'default', 'tipe_kamar' => 'reguler', 'unit' => 'year', 'amount' => 2400000, 'room_amount' => 4800000]);
        ResidenceRate::create(['gedung_id' => $b->id, 'category' => 'default', 'tipe_kamar' => 'reguler', 'unit' => 'month', 'amount' => 250000]);
        ResidenceRate::create(['gedung_id' => $b->id, 'category' => 'default', 'tipe_kamar' => 'reguler', 'unit' => 'day', 'amount' => 100000, 'student_amount' => 75000]);
    }

    $policyService = app(ResidencePolicyService::class);
    $policy = ResidencePolicy::create([
        'category' => 'local_non_kipk',
        'version' => 1,
        'published_at' => now(),
        'settings' => [
            'open' => true,
            'documents' => ['perjanjian'],
            'building_ids' => [$buildingF->id, $buildingG->id],
            'rates' => $policyService->snapshotRates('local_non_kipk', [$buildingF->id, $buildingG->id]),
            'month_days' => 30,
            'day_basis' => 'nights',
            'monthly_allowed' => false,
        ],
    ]);

    return compact('period', 'prodi', 'buildingF', 'roomF', 'buildingG', 'roomG', 'policy');
}

it('enforces study-year tariff tiers (maba year/day, sem 3-8 +semester, sem 9+ +month) and auto-approves uploaded documents', function () {
    Storage::fake('local');
    $fx = opsFixture();

    // Semester 9+ (angkatan 2022 on angkatan_maba 2026 => diff = 4) unlocks monthly automatically
    $sem9User = User::factory()->create(['nim_nip' => '2211521001', 'gender' => 'laki_laki', 'client_profile_category' => ClientProfileCategory::LocalNonKipk])->assignRole('mahasiswa');
    $sem9 = MahasiswaProfil::create(['user_id' => $sem9User->id, 'prodi_id' => $fx['prodi']->id, 'angkatan' => 2022, 'nik' => '1371010101020001', 'alamat' => 'Padang', 'barcode_code' => 'BC-SEM9', 'status_huni' => 'calon']);

    $reg = app(SubmitResidenceRegistration::class)->handle($sem9, [
        'periode_id' => $fx['period']->id,
        'rate_unit' => 'month',
        'billing_basis' => 'person',
        'starts_at' => now()->addDay()->toDateString(),
        'ends_at' => now()->addDays(31)->toDateString(),
        'preferences' => [['kamar_id' => $fx['roomF']->id]],
    ]);

    expect($reg->rate_unit)->toBe('month');

    // Uploading document auto-approves to 'valid' (no manual review gate)
    app(ResidenceWorkflow::class)->storeSubmittedPackage($reg, $sem9User, [
        'perjanjian' => UploadedFile::fake()->create('perjanjian.pdf', 100, 'application/pdf'),
    ]);

    $doc = RegistrationDocument::where('residence_registration_id', $reg->id)->firstOrFail();
    expect($doc->status)->toBe('valid')
        ->and($doc->reviewed_at)->not->toBeNull();

    // Semester 7-8 (angkatan 2023 => diff = 3) can use semester (year/2) but NOT month when monthly_allowed=false
    $sem7User = User::factory()->create(['nim_nip' => '2311521002', 'gender' => 'laki_laki', 'client_profile_category' => ClientProfileCategory::LocalNonKipk])->assignRole('mahasiswa');
    $sem7 = MahasiswaProfil::create(['user_id' => $sem7User->id, 'prodi_id' => $fx['prodi']->id, 'angkatan' => 2023, 'barcode_code' => 'BC-SEM7', 'status_huni' => 'calon']);

    expect(fn () => app(SubmitResidenceRegistration::class)->handle($sem7, [
        'periode_id' => $fx['period']->id,
        'rate_unit' => 'month',
        'billing_basis' => 'person',
        'starts_at' => now()->addDay()->toDateString(),
        'ends_at' => now()->addDays(31)->toDateString(),
        'preferences' => [['kamar_id' => $fx['roomG']->id]],
    ]))->toThrow(ValidationException::class);

    $sem7Reg = app(SubmitResidenceRegistration::class)->handle($sem7, [
        'periode_id' => $fx['period']->id,
        'rate_unit' => 'semester',
        'billing_basis' => 'person',
        'preferences' => [['kamar_id' => $fx['roomG']->id]],
    ]);
    expect((float) $sem7Reg->tagihan->total)->toBe(1200000.0);
});

it('seeds per-building Fasilitator & GO accounts and lets admin assign GO to a building with strict building scoping', function () {
    $fx = opsFixture();

    (new BuildingStaffAccountSeeder)->run();

    $fasF = User::where('email', 'oren.fasilitator@unand.ac.id')->firstOrFail();
    $goF = User::where('email', 'oren.go@unand.ac.id')->firstOrFail();
    $goG = User::where('email', 'hijau.go@unand.ac.id')->firstOrFail();

    expect($fasF->hasRole('fasilitator'))->toBeTrue()
        ->and($goF->hasRole('go'))->toBeTrue()
        ->and(FasilitatorWilayah::where('user_id', $goF->id)->value('gedung_id'))->toBe($fx['buildingF']->id)
        ->and(FasilitatorWilayah::where('user_id', $goG->id)->value('gedung_id'))->toBe($fx['buildingG']->id);

    // Admin can reassign GO to another building via penugasan endpoint
    $admin = User::factory()->create()->assignRole('superadmin');
    $this->actingAs($admin)
        ->post(route('admin.master-data.penugasan.store'), [
            'user_id' => $goG->id,
            'gedung_id' => $fx['buildingF']->id,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect(FasilitatorWilayah::where('user_id', $goG->id)->value('gedung_id'))->toBe($fx['buildingF']->id);

    // GO & Fasilitator see only their assigned building on Pemetaan Kamar
    $this->withoutVite()
        ->actingAs($goF)
        ->get(route('go.pemetaan-kamar'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('gedung', 1)->where('gedung.0.id', $fx['buildingF']->id));

    $this->withoutVite()
        ->actingAs($fasF)
        ->get(route('fasilitator.pemetaan-kamar'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('gedung', 1)->where('gedung.0.id', $fx['buildingF']->id));
});

it('notifies Fasilitator & Pimpinan on GO damage finding, lets Fasilitator checkout & move cross-building, and auto-approves 14-day expired checkouts', function () {
    Notification::fake();
    $fx = opsFixture();
    (new BuildingStaffAccountSeeder)->run();

    $fasF = User::where('email', 'oren.fasilitator@unand.ac.id')->firstOrFail();
    $goF = User::where('email', 'oren.go@unand.ac.id')->firstOrFail();
    $pimpinan = User::factory()->create()->assignRole('pimpinan');

    $studentUser = User::factory()->create(['nim_nip' => '2411529001', 'gender' => 'laki_laki', 'client_profile_category' => ClientProfileCategory::LocalNonKipk])->assignRole('mahasiswa');
    $student = MahasiswaProfil::create(['user_id' => $studentUser->id, 'prodi_id' => $fx['prodi']->id, 'angkatan' => 2024, 'nik' => '1371010101040099', 'alamat' => 'Padang', 'barcode_code' => 'BC-CO1', 'status_huni' => 'aktif']);
    $placement = PenempatanKamar::create([
        'mahasiswa_id' => $student->id,
        'kamar_id' => $fx['roomF']->id,
        'periode_id' => $fx['period']->id,
        'tanggal_mulai' => now()->subMonth()->toDateString(),
        'status' => 'aktif',
    ]);
    $fx['roomF']->update(['status' => 'terisi_sebagian']);

    // Fasilitator initiates checkout directly for resident in their building
    $this->actingAs($fasF)
        ->post(route('andalas.checkout.initiate', $placement), ['alasan' => 'Selesai semester'])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $checkout = CheckoutRequest::where('penempatan_kamar_id', $placement->id)->firstOrFail();
    Notification::assertSentTo($goF, ResidenceWorkflowNotification::class);

    // GO records general (non-asset) damage during inspection -> notifies Fasilitator & Pimpinan
    $this->actingAs($goF)
        ->put(route('andalas.checkout.inspection.update', $checkout), [
            'status' => 'selesai',
            'catatan' => 'Engsel pintu lepas',
            'asset_checks' => [],
            'findings' => [
                ['aset_id' => null, 'description' => 'Engsel pintu kamar rusak parah', 'severity' => 'rusak_berat'],
            ],
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect(LaporanKerusakan::where('kamar_id', $fx['roomF']->id)->whereNull('aset_id')->exists())->toBeTrue();
    Notification::assertSentTo($fasF, ResidenceWorkflowNotification::class);
    Notification::assertSentTo($pimpinan, ResidenceWorkflowNotification::class);

    // Second resident tests 14-day auto-approve checkout scheduler
    $student2User = User::factory()->create(['nim_nip' => '2411529002', 'gender' => 'laki_laki'])->assignRole('mahasiswa');
    $student2 = MahasiswaProfil::create(['user_id' => $student2User->id, 'prodi_id' => $fx['prodi']->id, 'angkatan' => 2024, 'barcode_code' => 'BC-CO2', 'status_huni' => 'aktif']);
    $placement2 = PenempatanKamar::create([
        'mahasiswa_id' => $student2->id,
        'kamar_id' => $fx['roomG']->id,
        'periode_id' => $fx['period']->id,
        'tanggal_mulai' => now()->subMonth()->toDateString(),
        'status' => 'aktif',
    ]);
    $fx['roomG']->update(['status' => 'terisi_sebagian']);
    $oldCheckout = app(CreateCheckoutRequest::class)->handle($student2, 'Pindah rumah');
    $oldCheckout->update(['diajukan_at' => now()->subDays(15)]);

    $count = app(AutoApproveExpiredCheckouts::class)->handle();
    expect($count)->toBe(1)
        ->and($oldCheckout->fresh()->status)->toBe(CheckoutRequestStatus::Selesai)
        ->and($oldCheckout->fresh()->inspection->status)->toBe(RoomInspectionStatus::Selesai)
        ->and($student2->fresh()->status_huni)->toBe('keluar')
        ->and($fx['roomG']->fresh()->status)->toBe('kosong');

    // Fasilitator can move an active resident CROSS-BUILDING (F -> G)
    $moverUser = User::factory()->create(['nim_nip' => '2411529003', 'gender' => 'laki_laki', 'client_profile_category' => ClientProfileCategory::LocalNonKipk])->assignRole('mahasiswa');
    $mover = MahasiswaProfil::create(['user_id' => $moverUser->id, 'prodi_id' => $fx['prodi']->id, 'angkatan' => 2024, 'nik' => '1371010101040088', 'alamat' => 'Padang', 'barcode_code' => 'BC-MOVE', 'status_huni' => 'aktif']);
    $invoice = Tagihan::create(['nomor' => 'INV-MOVE-1', 'mahasiswa_id' => $mover->id, 'status' => 'terbit', 'total' => 2400000, 'total_dibayar' => 0]);
    $invoice->items()->create(['deskripsi' => 'Sewa tahunan', 'kuantitas' => 1, 'harga_satuan' => 2400000, 'jumlah' => 2400000]);
    $movePlacement = PenempatanKamar::create(['mahasiswa_id' => $mover->id, 'kamar_id' => $fx['roomF']->id, 'periode_id' => $fx['period']->id, 'tanggal_mulai' => today()->toDateString(), 'status' => 'aktif']);
    $moveReg = ResidenceRegistration::create([
        'student_profile_id' => $mover->id,
        'periode_id' => $fx['period']->id,
        'residence_policy_id' => $fx['policy']->id,
        'reserved_room_id' => $fx['roomF']->id,
        'penempatan_kamar_id' => $movePlacement->id,
        'tagihan_id' => $invoice->id,
        'status' => 'accepted',
        'workflow_version' => 2,
        'stay_kind' => 'regular',
        'rate_unit' => 'year',
        'billing_basis' => 'person',
        'starts_at' => today(),
        'ends_at' => today()->addMonths(10),
        'completed_at' => now(),
    ]);

    $this->actingAs($fasF)
        ->post(route('residence.move', $moveReg), [
            'reference' => (string) Str::uuid(),
            'room_id' => $fx['roomG']->id,
            'reason' => 'Pindah gedung karena kebutuhan kamar',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect($moveReg->fresh()->reserved_room_id)->toBe($fx['roomG']->id);
});

it('forces full document reload with no-store headers on Inertia logout and supports Landing Gallery direct upload + ASN category', function () {
    Storage::fake('public');
    $fx = opsFixture();
    $admin = User::factory()->create()->assignRole('superadmin');

    // Inertia logout returns 409 X-Inertia-Location so SPA history cannot replay authenticated state on Back
    $logoutResp = $this->actingAs($admin)
        ->withHeader('X-Inertia', 'true')
        ->post(route('logout'));

    $logoutResp->assertStatus(409)
        ->assertHeader('X-Inertia-Location', route('landing'));
    expect((string) $logoutResp->headers->get('Cache-Control'))->toContain('no-store');
    $this->assertGuest();

    // Direct gallery photo upload & ASN in categories
    $this->actingAs($admin)
        ->post(route('andalas.landing.gallery.upload'), [
            'title' => 'Suasana Asrama Pagi',
            'category' => 'Kehidupan Asrama',
            'file' => UploadedFile::fake()->image('asrama.jpg', 800, 600),
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $settings = LandingContentService::settings();
    expect(collect($settings['gallery'])->pluck('title')->all())->toContain('Suasana Asrama Pagi')
        ->and(collect($settings['categories'])->contains(fn (array $c): bool => str_contains(strtolower($c['title']), 'asn')))->toBeTrue();
});
