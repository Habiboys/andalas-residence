<?php

use App\Actions\Registration\SubmitResidenceRegistration;
use App\Enums\ClientProfileCategory;
use App\Models\City;
use App\Models\Departemen;
use App\Models\Faculty;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\PaymentBankAccount;
use App\Models\Pembayaran;
use App\Models\Periode;
use App\Models\Prodi;
use App\Models\Province;
use App\Models\ResidenceApplication;
use App\Models\ResidencePolicy;
use App\Models\ResidenceRate;
use App\Models\ResidenceRegistration;
use App\Models\RoomType;
use App\Models\User;
use App\Services\ResidencePolicyService;
use App\Services\RoomEligibility;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function seedBaseResidenceFixture(): array
{
    foreach (['mahasiswa', 'staff_admin', 'admin_layanan', 'superadmin', 'fasilitator', 'tamu'] as $roleName) {
        Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
    }
    Permission::firstOrCreate(['name' => 'gedung.manage', 'guard_name' => 'web']);
    Permission::firstOrCreate(['name' => 'registration.review', 'guard_name' => 'web']);

    RoomType::firstOrCreate(['code' => 'reguler'], ['name' => 'Reguler', 'active' => true]);

    $period = Periode::create([
        'nama_periode' => '2026/2027',
        'angkatan_maba' => 2026,
        'tanggal_mulai' => now()->subDays(10)->toDateString(),
        'tanggal_selesai' => now()->addYear()->toDateString(),
        'status' => 'aktif',
        'reservation_hours' => 72,
    ]);

    $faculty = Faculty::create(['name' => 'Fakultas Teknologi Informasi']);
    $dept = Departemen::create(['name' => 'Sistem Informasi', 'faculty_id' => $faculty->id]);
    $prodi = Prodi::create(['name' => 'Sistem Informasi', 'jenjang' => 'S1', 'departemen_id' => $dept->id]);
    $province = Province::create(['name' => 'Sumatera Barat']);
    $city = City::create(['name' => 'Kota Padang', 'province_id' => $province->id]);

    $buildingPutra = Gedung::create([
        'kode_gedung' => 'F',
        'nama_gedung' => 'Pupera Putera (F)',
        'gender_peruntukan' => 'laki_laki',
    ]);
    $floorF = Lantai::create([
        'gedung_id' => $buildingPutra->id,
        'nomor_lantai' => 1,
        'nama_lantai' => 'Lantai 1',
        'booking_open' => true,
        'booking_priority' => 1,
    ]);
    $roomF = Kamar::create([
        'lantai_id' => $floorF->id,
        'nomor_kamar' => 'F101',
        'tipe_kamar' => 'reguler',
        'kapasitas' => 4,
        'tarif_per_periode' => 2500000,
        'status' => 'kosong',
    ]);

    $buildingAsn = Gedung::create([
        'kode_gedung' => 'ASN',
        'nama_gedung' => 'Rusun ASN',
        'gender_peruntukan' => 'campur',
        'allowed_categories' => ['asn'],
    ]);
    $floorAsn = Lantai::create([
        'gedung_id' => $buildingAsn->id,
        'nomor_lantai' => 1,
        'nama_lantai' => 'Lantai 1',
        'booking_open' => true,
        'booking_priority' => 1,
    ]);
    $roomAsn = Kamar::create([
        'lantai_id' => $floorAsn->id,
        'nomor_kamar' => 'ASN-101',
        'tipe_kamar' => 'reguler',
        'kapasitas' => 2,
        'tarif_per_periode' => 6000000,
        'status' => 'kosong',
    ]);

    ResidenceRate::create([
        'gedung_id' => $buildingPutra->id,
        'category' => ResidenceRate::DEFAULT_CATEGORY,
        'tipe_kamar' => 'reguler',
        'unit' => 'year',
        'amount' => 2500000,
        'room_amount' => 10000000,
    ]);
    ResidenceRate::create([
        'gedung_id' => $buildingPutra->id,
        'category' => ResidenceRate::DEFAULT_CATEGORY,
        'tipe_kamar' => 'reguler',
        'unit' => 'month',
        'amount' => 300000,
    ]);
    ResidenceRate::create([
        'gedung_id' => $buildingPutra->id,
        'category' => ResidenceRate::DEFAULT_CATEGORY,
        'tipe_kamar' => 'reguler',
        'unit' => 'day',
        'amount' => 100000,
        'student_amount' => 75000,
    ]);
    ResidenceRate::create([
        'gedung_id' => $buildingAsn->id,
        'category' => 'asn',
        'tipe_kamar' => 'reguler',
        'unit' => 'month',
        'amount' => 750000,
    ]);
    ResidenceRate::create([
        'gedung_id' => $buildingAsn->id,
        'category' => 'asn',
        'tipe_kamar' => 'reguler',
        'unit' => 'year',
        'amount' => 8000000,
        'room_amount' => 8000000,
    ]);

    $policyService = app(ResidencePolicyService::class);
    ResidencePolicy::create([
        'category' => 'local_non_kipk',
        'version' => 1,
        'published_at' => now(),
        'settings' => [
            'open' => true,
            'documents' => ['perjanjian'],
            'building_ids' => [$buildingPutra->id],
            'rates' => $policyService->snapshotRates('local_non_kipk', [$buildingPutra->id]),
            'month_days' => 30,
            'day_basis' => 'nights',
            'monthly_allowed' => false,
        ],
    ]);
    ResidencePolicy::create([
        'category' => 'asn',
        'version' => 1,
        'published_at' => now(),
        'settings' => [
            'open' => true,
            'documents' => ['perjanjian'],
            'building_ids' => [$buildingAsn->id],
            'rates' => $policyService->snapshotRates('asn', [$buildingAsn->id]),
            'month_days' => 30,
            'day_basis' => 'nights',
            'monthly_allowed' => true,
        ],
    ]);
    ResidencePolicy::create([
        'category' => 'non_student',
        'version' => 1,
        'published_at' => now(),
        'settings' => [
            'open' => true,
            'documents' => ['perjanjian'],
            'building_ids' => [$buildingPutra->id],
            'rates' => $policyService->snapshotRates('non_student', [$buildingPutra->id]),
            'month_days' => 30,
            'day_basis' => 'nights',
            'monthly_allowed' => true,
        ],
    ]);
    ResidencePolicy::create([
        'category' => 'summer_course',
        'version' => 1,
        'published_at' => now(),
        'settings' => [
            'open' => true,
            'documents' => ['perjanjian'],
            'building_ids' => [$buildingPutra->id],
            'rates' => $policyService->snapshotRates('summer_course', [$buildingPutra->id]),
            'month_days' => 30,
            'day_basis' => 'nights',
            'monthly_allowed' => false,
        ],
    ]);

    return compact('period', 'faculty', 'dept', 'prodi', 'province', 'city', 'buildingPutra', 'roomF', 'buildingAsn', 'roomAsn');
}

it('calculates 6-month semester price as half of yearly tariff for non-maba and blocks maba', function () {
    $fx = seedBaseResidenceFixture();

    $nonMabaUser = User::factory()->create([
        'nim_nip' => '2411521001',
        'gender' => 'laki_laki',
        'client_profile_category' => ClientProfileCategory::LocalNonKipk,
    ]);
    $nonMabaUser->assignRole('mahasiswa');
    $nonMaba = MahasiswaProfil::create([
        'user_id' => $nonMabaUser->id,
        'prodi_id' => $fx['prodi']->id,
        'angkatan' => 2024,
        'barcode_code' => 'BC-NONMABA',
        'status_huni' => 'calon',
    ]);

    $reg = app(SubmitResidenceRegistration::class)->handle($nonMaba, [
        'periode_id' => $fx['period']->id,
        'rate_unit' => 'semester',
        'billing_basis' => 'person',
        'preferences' => [['kamar_id' => $fx['roomF']->id]],
    ]);

    expect($reg->rate_unit)->toBe('semester')
        ->and((float) $reg->tagihan->total)->toBe(1250000.0);

    $mabaUser = User::factory()->create([
        'nim_nip' => '2611521001',
        'gender' => 'laki_laki',
        'client_profile_category' => ClientProfileCategory::LocalNonKipk,
    ]);
    $mabaUser->assignRole('mahasiswa');
    $maba = MahasiswaProfil::create([
        'user_id' => $mabaUser->id,
        'prodi_id' => $fx['prodi']->id,
        'angkatan' => 2026,
        'barcode_code' => 'BC-MABA',
        'status_huni' => 'calon',
    ]);

    expect(fn () => app(SubmitResidenceRegistration::class)->handle($maba, [
        'periode_id' => $fx['period']->id,
        'rate_unit' => 'semester',
        'billing_basis' => 'person',
        'preferences' => [['kamar_id' => $fx['roomF']->id]],
    ]))->toThrow(ValidationException::class, 'Skema per 6 bulan hanya tersedia untuk mahasiswa hunian (non-maba).');
});

it('unlocks monthly option automatically for students above 5 years of study even when policy monthly_allowed is false', function () {
    $fx = seedBaseResidenceFixture();

    $seniorUser = User::factory()->create([
        'nim_nip' => '2111521001',
        'gender' => 'laki_laki',
        'client_profile_category' => ClientProfileCategory::LocalNonKipk,
    ]);
    $seniorUser->assignRole('mahasiswa');
    $senior = MahasiswaProfil::create([
        'user_id' => $seniorUser->id,
        'prodi_id' => $fx['prodi']->id,
        'angkatan' => 2021, // 2026 - 2021 = 5 (> 5 tahun studi)
        'barcode_code' => 'BC-SENIOR',
        'status_huni' => 'calon',
    ]);

    $reg = app(SubmitResidenceRegistration::class)->handle($senior, [
        'periode_id' => $fx['period']->id,
        'rate_unit' => 'month',
        'billing_basis' => 'person',
        'starts_at' => now()->addDay()->toDateString(),
        'ends_at' => now()->addDays(61)->toDateString(),
        'preferences' => [['kamar_id' => $fx['roomF']->id]],
    ]);

    expect($reg->rate_unit)->toBe('month')
        ->and((float) $reg->tagihan->total)->toBe(600000.0);

    $juniorNonMabaUser = User::factory()->create([
        'nim_nip' => '2311521001',
        'gender' => 'laki_laki',
        'client_profile_category' => ClientProfileCategory::LocalNonKipk,
    ]);
    $juniorNonMabaUser->assignRole('mahasiswa');
    $juniorNonMaba = MahasiswaProfil::create([
        'user_id' => $juniorNonMabaUser->id,
        'prodi_id' => $fx['prodi']->id,
        'angkatan' => 2023, // 2026 - 2023 = 3 (< 5)
        'barcode_code' => 'BC-JUNIOR',
        'status_huni' => 'calon',
    ]);

    expect(fn () => app(SubmitResidenceRegistration::class)->handle($juniorNonMaba, [
        'periode_id' => $fx['period']->id,
        'rate_unit' => 'month',
        'billing_basis' => 'person',
        'starts_at' => now()->addDay()->toDateString(),
        'ends_at' => now()->addDays(31)->toDateString(),
        'preferences' => [['kamar_id' => $fx['roomF']->id]],
    ]))->toThrow(ValidationException::class, 'tahun studi > 5');
});

it('supports ASN via SSO Dosen and manual NIP registration restricted strictly to Rusun ASN', function () {
    $fx = seedBaseResidenceFixture();

    config()->set('services.unand_sso', [
        'base_url' => 'https://sso.unand.ac.id/auth',
        'realm' => 'unand',
        'client_id' => 'test-client',
        'client_secret' => 'test-secret',
        'redirect' => 'http://localhost/api/auth/callback',
    ]);

    Http::fake([
        'https://sso.unand.ac.id/auth/realms/unand/protocol/openid-connect/token' => Http::response(['access_token' => 'tok-123']),
        'https://sso.unand.ac.id/auth/realms/unand/protocol/openid-connect/userinfo' => Http::response([
            'sub' => 'dosen-sub-1',
            'UID' => '198501012015041001',
            'name' => 'Dr. Budi Dosen',
            'email' => 'budi.dosen@unand.ac.id',
        ]),
    ]);

    $this->withSession([
        'unand_sso' => [
            'state' => 'state-asn',
            'verifier' => 'verifier-asn',
            'intent' => 'asn',
            'expires_at' => now()->addMinutes(5)->timestamp,
        ],
    ])->get('/api/auth/callback?state=state-asn&code=code-123')
        ->assertRedirect(route('mahasiswa.data-hunian'));

    $dosen = User::where('nim_nip', '198501012015041001')->firstOrFail();
    expect($dosen->client_profile_category)->toBe(ClientProfileCategory::Asn)
        ->and($dosen->mahasiswaProfil)->not->toBeNull();

    $dosen->update(['gender' => 'laki_laki']);

    // ASN cannot choose non-ASN building
    expect(RoomEligibility::allowsCanonicalBuilding('asn', $fx['buildingPutra']))->toBeFalse()
        ->and(RoomEligibility::allowsCanonicalBuilding('asn', $fx['buildingAsn']))->toBeTrue()
        ->and(RoomEligibility::allowsCanonicalBuilding('local_non_kipk', $fx['buildingAsn']))->toBeFalse();

    $asnReg = app(SubmitResidenceRegistration::class)->handle($dosen->mahasiswaProfil, [
        'periode_id' => $fx['period']->id,
        'rate_unit' => 'month',
        'billing_basis' => 'person',
        'starts_at' => now()->addDay()->toDateString(),
        'ends_at' => now()->addDays(31)->toDateString(),
        'preferences' => [['kamar_id' => $fx['roomAsn']->id]],
    ]);

    expect($asnReg->reserved_room_id)->toBe($fx['roomAsn']->id)
        ->and((float) $asnReg->tagihan->total)->toBe(750000.0);

    // Manual NIP registration for ASN without UNAND faculty/department/prodi
    auth()->logout();
    $this->post(route('register.store'), [
        'client_profile_category' => 'asn',
        'nama' => 'Dr. Siti ASN',
        'nim_nip' => '198702022016042001',
        'unit_kerja' => 'Fakultas Teknik UNAND',
        'gender' => 'perempuan',
        'email' => 'siti.asn@unand.ac.id',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ])->assertSessionHasNoErrors();

    $manualAsn = User::where('nim_nip', '198702022016042001')->firstOrFail();
    expect($manualAsn->client_profile_category)->toBe(ClientProfileCategory::Asn)
        ->and($manualAsn->mahasiswaProfil->unit_kerja)->toBe('Fakultas Teknik UNAND')
        ->and($manualAsn->mahasiswaProfil->prodi_id)->toBeNull();
});

it('registers and updates external campus students (e.g. PNP) without UNAND academic fields', function () {
    $fx = seedBaseResidenceFixture();

    $this->post(route('register.store'), [
        'client_profile_category' => 'local_student',
        'is_external_campus' => true,
        'external_campus_name' => 'Politeknik Negeri Padang (PNP)',
        'external_program_name' => 'D4 Teknologi Rekayasa Perangkat Lunak',
        'angkatan' => 2024,
        'nama' => 'Andi Mahasiswa PNP',
        'nim_nip' => '2411082001',
        'gender' => 'laki_laki',
        'email' => 'andi@pnp.ac.id',
        'no_hp' => '081234567890',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
    ])->assertSessionHasNoErrors();

    $pnpUser = User::where('email', 'andi@pnp.ac.id')->firstOrFail();
    expect($pnpUser->client_profile_category)->toBe(ClientProfileCategory::LocalNonKipk)
        ->and($pnpUser->mahasiswaProfil->is_external_campus)->toBeTrue()
        ->and($pnpUser->mahasiswaProfil->external_campus_name)->toBe('Politeknik Negeri Padang (PNP)')
        ->and($pnpUser->mahasiswaProfil->prodi_id)->toBeNull();

    $this->actingAs($pnpUser)
        ->post(route('residence.housing-profile'), [
            'nama' => 'ANDI MAHASISWA PNP',
            'nik' => '1371010101040001',
            'no_hp' => '081234567890',
            'email_pribadi' => 'andi@pnp.ac.id',
            'gender' => 'laki_laki',
            'is_external_campus' => true,
            'external_campus_name' => 'Politeknik Negeri Padang (PNP)',
            'external_program_name' => 'D4 Teknologi Rekayasa Perangkat Lunak',
            'angkatan' => 2024,
            'city_id' => $fx['city']->id,
            'alamat' => 'Jl. Limau Manis Padang',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('mahasiswa.registration'));

    expect($pnpUser->mahasiswaProfil->fresh()->hasCompleteHousingIdentity())->toBeTrue();

    $reg = app(SubmitResidenceRegistration::class)->handle($pnpUser->mahasiswaProfil->fresh(), [
        'periode_id' => $fx['period']->id,
        'rate_unit' => 'year',
        'billing_basis' => 'person',
        'preferences' => [['kamar_id' => $fx['roomF']->id]],
    ]);

    expect((float) $reg->tagihan->total)->toBe(2500000.0);
});

it('allows admin to manage prices per category, building, and scheme in the unified pricing menu', function () {
    $fx = seedBaseResidenceFixture();
    $admin = User::factory()->create();
    $admin->assignRole('staff_admin');
    $admin->givePermissionTo(['gedung.manage', 'registration.review']);

    $this->actingAs($admin)
        ->get(route('admin.pengaturan-harga'))
        ->assertOk();

    $this->actingAs($admin)
        ->post(route('admin.pengaturan-harga.store'), [
            'gedung_id' => $fx['buildingPutra']->id,
            'category' => 'local_non_kipk',
            'tipe_kamar' => 'reguler',
            'unit' => 'year',
            'amount' => 3000000,
            'room_amount' => 12000000,
            'auto_fill_semester' => true,
            'sync_policies' => true,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $yearRate = ResidenceRate::where([
        'gedung_id' => $fx['buildingPutra']->id,
        'category' => 'local_non_kipk',
        'tipe_kamar' => 'reguler',
        'unit' => 'year',
    ])->firstOrFail();
    $semesterRate = ResidenceRate::where([
        'gedung_id' => $fx['buildingPutra']->id,
        'category' => 'local_non_kipk',
        'tipe_kamar' => 'reguler',
        'unit' => 'semester',
    ])->firstOrFail();

    expect((int) $yearRate->amount)->toBe(3000000)
        ->and((int) $semesterRate->amount)->toBe(1500000)
        ->and((int) $semesterRate->room_amount)->toBe(6000000);

    $latestPolicy = ResidencePolicy::where('category', 'local_non_kipk')->latest('version')->firstOrFail();
    $syncedSemester = collect($latestPolicy->settings['rates'])->first(
        fn (array $r): bool => $r['gedung_id'] === $fx['buildingPutra']->id && $r['unit'] === 'semester'
    );
    expect((int) $syncedSemester['amount'])->toBe(1500000);

    $this->actingAs($admin)
        ->delete(route('admin.pengaturan-harga.destroy', $semesterRate))
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    expect(ResidenceRate::whereKey($semesterRate->id)->exists())->toBeFalse();
});

it('lets staff_admin and admin_aset batch-save all 4 building rate units directly from Harga Gedung without opening Master Gedung', function () {
    $fx = seedBaseResidenceFixture();
    Role::firstOrCreate(['name' => 'admin_aset', 'guard_name' => 'web']);
    $assetAdmin = User::factory()->create();
    $assetAdmin->assignRole('admin_aset');
    $assetAdmin->givePermissionTo('gedung.manage');

    $this->actingAs($assetAdmin)
        ->get(route('admin.pengaturan-harga'))
        ->assertOk();

    $this->actingAs($assetAdmin)
        ->post(route('admin.pengaturan-harga.batch'), [
            'gedung_id' => $fx['buildingPutra']->id,
            'category' => ResidenceRate::DEFAULT_CATEGORY,
            'tipe_kamar' => 'reguler',
            'day_amount' => 120000,
            'day_student_amount' => 80000,
            'month_amount' => 350000,
            'year_amount' => 3200000,
            'year_room_amount' => 12800000,
            'auto_fill_semester' => true,
            'sync_policies' => true,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect();

    $saved = ResidenceRate::where([
        'gedung_id' => $fx['buildingPutra']->id,
        'category' => ResidenceRate::DEFAULT_CATEGORY,
        'tipe_kamar' => 'reguler',
    ])->get()->keyBy('unit');

    expect((int) $saved['day']->amount)->toBe(120000)
        ->and((int) $saved['day']->student_amount)->toBe(80000)
        ->and((int) $saved['month']->amount)->toBe(350000)
        ->and((int) $saved['semester']->amount)->toBe(1600000)
        ->and((int) $saved['semester']->room_amount)->toBe(6400000)
        ->and((int) $saved['year']->amount)->toBe(3200000)
        ->and((int) $saved['year']->room_amount)->toBe(12800000);
});

it('lets public visitors directly book Umum & Summer Course rooms from Home, auto-holds room, issues invoice, and accepts payment proof', function () {
    Storage::fake('local');
    $fx = seedBaseResidenceFixture();
    $bank = PaymentBankAccount::create([
        'bank_name' => 'Bank Nagari',
        'account_number' => '111222333444',
        'account_name' => 'Rektor UNAND',
        'is_active' => true,
    ]);

    $response = $this->post(route('public-booking.store'), [
        'kind' => 'non_student',
        'nama' => 'Budi Tamu Umum',
        'identity_number' => '1371999900010001',
        'email' => 'budi.tamu@gmail.com',
        'no_hp' => '081299998888',
        'gender' => 'laki_laki',
        'institution' => 'Tamu Akademik',
        'kamar_id' => $fx['roomF']->id,
        'rate_unit' => 'day',
        'starts_at' => now()->addDays(2)->toDateString(),
        'ends_at' => now()->addDays(5)->toDateString(),
    ])->assertSessionHasNoErrors();

    $application = ResidenceApplication::where('recipient_email', 'budi.tamu@gmail.com')->firstOrFail();
    $response->assertRedirect(route('public-booking.show', ['token' => $application->booking_token]));

    $registration = ResidenceRegistration::where('residence_application_id', $application->id)->firstOrFail();
    expect($registration->reserved_room_id)->toBe($fx['roomF']->id)
        ->and($registration->allocation_status)->toBe('held')
        ->and($registration->tagihan)->not->toBeNull()
        ->and((float) $registration->tagihan->total)->toBe(300000.0);

    $this->get(route('public-booking.show', ['token' => $application->booking_token]))
        ->assertOk();

    $this->post(route('public-booking.proof', ['token' => $application->booking_token]), [
        'payment_bank_account_id' => $bank->id,
        'nama_bank' => 'BNI',
        'nomor_rekening_pengirim' => '9876543210',
        'atas_nama_pengirim' => 'Budi Tamu Umum',
        'tanggal_bayar' => now()->format('Y-m-d H:i'),
        'bukti_transfer' => UploadedFile::fake()->image('bukti.jpg'),
    ])->assertSessionHasNoErrors()->assertRedirect();

    expect($registration->fresh()->allocation_status)->toBe('admin_occupied')
        ->and(Pembayaran::where('tagihan_id', $registration->tagihan_id)->where('status', 'menunggu_verifikasi')->exists())->toBeTrue();
});
