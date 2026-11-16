<?php

use App\Models\FasilitatorWilayah;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\MahasiswaProfil;
use App\Models\Pembayaran;
use App\Models\ResidenceCashRefund;
use App\Models\ResidencePolicy;
use App\Models\ResidenceRate;
use App\Models\ResidenceRegistration;
use App\Models\RoomContract;
use App\Models\RoomInvitation;
use App\Models\User;
use App\Services\RoomEligibility;
use App\Services\RoomReservations;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

beforeEach(function () {
    $this->travelTo(now()->setDate(2026, 11, 14)->startOfDay());
    $this->withoutVite();
    Queue::fake();
    Notification::fake();
    Storage::fake('local');
});

it('enforces canonical building gender and category rules and activates KIPK resident once documents are complete without waiting for disbursement or digital checkin', function () {
    $f = toBeFixture('local_kipk', 4);
    $buildingA = Gedung::create(['kode_gedung' => 'A', 'nama_gedung' => 'Gedung A', 'gender_peruntukan' => 'perempuan']);
    $buildingG = Gedung::create(['kode_gedung' => 'G', 'nama_gedung' => 'Gedung G', 'gender_peruntukan' => 'laki_laki']);
    $buildingB = Gedung::create(['kode_gedung' => 'B', 'nama_gedung' => 'Gedung B', 'gender_peruntukan' => 'perempuan']);
    $buildingF = Gedung::create(['kode_gedung' => 'F', 'nama_gedung' => 'Gedung F', 'gender_peruntukan' => 'laki_laki']);

    $eligibility = app(RoomEligibility::class);
    expect($eligibility->allowsCanonicalBuilding('local_kipk', $buildingA, 'perempuan'))->toBeTrue()
        ->and($eligibility->allowsCanonicalBuilding('local_kipk', $buildingG, 'perempuan'))->toBeFalse()
        ->and($eligibility->allowsCanonicalBuilding('local_kipk', $buildingG, 'laki_laki'))->toBeTrue()
        ->and($eligibility->allowsCanonicalBuilding('local_kipk', $buildingB, 'perempuan'))->toBeFalse()
        ->and($eligibility->allowsCanonicalBuilding('international', $buildingB, 'perempuan'))->toBeTrue()
        ->and($eligibility->allowsCanonicalBuilding('international', $buildingF, 'laki_laki'))->toBeTrue()
        ->and($eligibility->allowsCanonicalBuilding('international', $buildingA, 'perempuan'))->toBeFalse();

    $floorA = Lantai::create(['gedung_id' => $buildingA->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);
    $roomA = Kamar::create(['lantai_id' => $floorA->id, 'nomor_kamar' => '101', 'tipe_kamar' => 'standar', 'kapasitas' => 4, 'tarif_per_periode' => 2500000, 'status' => 'kosong']);
    $f['policy']->update([
        'settings' => [
            ...$f['policy']->settings,
            'building_ids' => [$buildingA->id, $buildingG->id],
            'rates' => [
                ['gedung_id' => $buildingA->id, 'type' => 'standar', 'unit' => 'year', 'amount' => '2500000', 'room_amount' => '10000000'],
                ['gedung_id' => $buildingG->id, 'type' => 'standar', 'unit' => 'year', 'amount' => '2500000', 'room_amount' => '10000000'],
            ],
        ],
    ]);

    $registration = toBeSubmit($f);

    expect($registration->reserved_room_id)->toBe($roomA->id)
        ->and($registration->allocation_status)->toBe('admin_occupied')
        ->and($registration->tagihan->receivable_type)->toBe('kipk_scholarship')
        ->and((float) $registration->tagihan->amount_due_now)->toBe(0.0)
        ->and($f['profile']->fresh()->status_huni)->toBe('calon');

    $this->actingAs($f['user'])
        ->post(route('residence.documents.upload', $registration), [
            'kind' => 'perjanjian',
            'file' => UploadedFile::fake()->create('perjanjian-kipk.pdf', 120, 'application/pdf'),
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($f['profile']->fresh()->status_huni)->toBe('aktif')
        ->and($registration->fresh()->ready_at)->not->toBeNull()
        ->and($registration->fresh()->checked_in_at)->toBeNull()
        ->and($registration->fresh()->kipk_disbursed_at)->toBeNull();

    // Check-in is still gated on facilitator document verification when arriving at dorm
    $facilitatorA = toBeFacilitator($buildingA);
    $this->actingAs($facilitatorA)
        ->post(route('residence.checkin', $registration), [
            'identity_checked' => 1,
            'original_documents_checked' => 1,
            'keys_handed' => 1,
        ])
        ->assertSessionHasErrors('checkin');

    $docKipk = $registration->fresh()->documents()->sole();
    $this->actingAs($facilitatorA)
        ->post(route('residence.documents.review', $docKipk), ['status' => 'valid'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->actingAs($facilitatorA)
        ->post(route('residence.checkin', $registration), [
            'identity_checked' => 1,
            'original_documents_checked' => 1,
            'keys_handed' => 1,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($registration->fresh()->completed_at)->not->toBeNull();
});

it('allows payment upload right after uploading documents and verifies documents at physical check-in', function () {
    $f = toBeFixture('local_non_kipk', 4);
    $facilitator = toBeFacilitator($f['building']);
    $registration = toBeSubmit($f, ['billing_basis' => 'person']);

    expect($registration->allocation_status)->toBe('held')
        ->and($registration->reservation_expires_at)->not->toBeNull()
        ->and($f['profile']->fresh()->status_huni)->toBe('calon');

    // Payment upload is locked before required documents are uploaded
    $this->actingAs($f['user'])
        ->post(route('andalas.pembayaran.store'), [
            'tagihan_id' => $registration->tagihan_id,
            'jenis_pembayaran' => 'sewa_asrama',
            'nominal' => (float) $registration->tagihan->total,
            'metode_pembayaran' => 'transfer',
            'bukti_transfer' => UploadedFile::fake()->create('bukti-awal.pdf', 100, 'application/pdf'),
        ])
        ->assertSessionHasErrors();

    $this->actingAs($f['user'])
        ->post(route('residence.documents.upload', $registration), [
            'kind' => 'perjanjian',
            'file' => UploadedFile::fake()->create('perjanjian.pdf', 120, 'application/pdf'),
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    // Student CAN pay immediately after document upload without waiting for facilitator verification
    $this->actingAs($f['user'])
        ->post(route('andalas.pembayaran.store'), [
            'tagihan_id' => $registration->tagihan_id,
            'jenis_pembayaran' => 'sewa_asrama',
            'nominal' => (float) $registration->tagihan->total,
            'metode_pembayaran' => 'transfer',
            'bukti_transfer' => UploadedFile::fake()->create('bukti-bayar.pdf', 100, 'application/pdf'),
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $payment = Pembayaran::where('tagihan_id', $registration->tagihan_id)->sole();
    expect($payment->status)->toBe('menunggu_verifikasi')
        ->and($registration->fresh()->allocation_status)->toBe('admin_occupied')
        ->and($f['profile']->fresh()->status_huni)->toBe('aktif')
        ->and((float) $registration->tagihan->fresh()->total_dibayar)->toBe(0.0);

    // Check-in is blocked until facilitator verifies uploaded document at check-in
    $doc = $registration->fresh()->documents()->sole();
    $this->actingAs($facilitator)
        ->post(route('residence.checkin', $registration), [
            'identity_checked' => 1,
            'original_documents_checked' => 1,
            'keys_handed' => 1,
        ])
        ->assertSessionHasErrors('checkin');

    $this->actingAs($f['manager'])
        ->post(route('residence.documents.review', $doc), ['status' => 'valid'])
        ->assertForbidden();

    $this->actingAs($facilitator)
        ->post(route('residence.documents.review', $doc), ['status' => 'valid'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->actingAs($facilitator)
        ->post(route('residence.checkin', $registration), [
            'identity_checked' => 1,
            'original_documents_checked' => 1,
            'keys_handed' => 1,
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $this->actingAs($f['manager'])
        ->post(route('andalas.pembayaran.verify', $payment), [
            'status' => 'lunas',
            'catatan_verifikasi' => 'Cocok mutasi bank',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($f['profile']->fresh()->status_huni)->toBe('aktif')
        ->and($registration->fresh()->completed_at)->not->toBeNull()
        ->and($payment->fresh()->status)->toBe('lunas')
        ->and((float) $registration->tagihan->fresh()->total_dibayar)->toBe((float) $registration->tagihan->total);
});

it('allows manager to directly configure offline-approved installment, defer 0 DP, and monthly schemes while requiring an approval basis', function () {
    $f = toBeFixture('local_non_kipk', 4);
    $registration = toBeSubmit($f, ['billing_basis' => 'person']);

    $this->actingAs($f['manager'])
        ->post(route('residence.decisions.request', $registration), [
            'kind' => 'defer',
            'offline_approval' => true,
            'reason' => '',
            'initial_amount' => 0,
            'schedule' => [
                ['jatuh_tempo' => today()->addMonth()->toDateString(), 'jumlah' => 1000000],
            ],
        ])
        ->assertSessionHasErrors('reason');

    $this->actingAs($f['manager'])
        ->post(route('residence.decisions.request', $registration), [
            'kind' => 'defer',
            'offline_approval' => true,
            'reason' => 'Surat Persetujuan Wakil Rektor III No. 12/UN16/WR3/2026',
            'initial_amount' => 0,
            'schedule' => [
                ['jatuh_tempo' => today()->addMonth()->toDateString(), 'jumlah' => 1000000],
            ],
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($registration->fresh()->allocation_status)->toBe('admin_occupied');

    $this->actingAs($f['user'])
        ->post(route('residence.documents.upload', $registration), [
            'kind' => 'perjanjian',
            'file' => UploadedFile::fake()->create('perjanjian-defer.pdf', 100, 'application/pdf'),
        ])
        ->assertRedirect();

    $facilitator = toBeFacilitator($f['building']);
    $this->actingAs($facilitator)
        ->post(route('residence.documents.review', $registration->fresh()->documents()->sole()), ['status' => 'valid'])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($f['profile']->fresh()->status_huni)->toBe('aktif');
});

it('handles 3-person exclusive room whole-rupiah split, individual expiry cancellation, exclusive vs sharing repricing, and cash refund lifecycle', function () {
    $f = toBeFixture('local_non_kipk', 4);
    $f['room']->update(['kapasitas' => 4]);

    $student2User = User::factory()->student()->create(['nim_nip' => '2599000002', 'gender' => 'perempuan', 'client_profile_category' => 'local_non_kipk'])->assignRole('mahasiswa');
    $student2 = MahasiswaProfil::create(['user_id' => $student2User->id, 'prodi_id' => $f['program']->id, 'angkatan' => '2025', 'status_huni' => 'calon', 'barcode_code' => fake()->uuid()]);
    withHousingIdentity($student2);

    $student3User = User::factory()->student()->create(['nim_nip' => '2599000003', 'gender' => 'perempuan', 'client_profile_category' => 'local_non_kipk'])->assignRole('mahasiswa');
    $student3 = MahasiswaProfil::create(['user_id' => $student3User->id, 'prodi_id' => $f['program']->id, 'angkatan' => '2025', 'status_huni' => 'calon', 'barcode_code' => fake()->uuid()]);
    withHousingIdentity($student3);

    $reg1 = toBeSubmit($f, [
        'billing_basis' => 'room',
    ]);

    $this->actingAs($f['user'])->post(route('andalas.room-invitations.store'), ['registration_id' => $reg1->id, 'nim' => '2599000002'])->assertSessionHasNoErrors();
    $this->actingAs($f['user'])->post(route('andalas.room-invitations.store'), ['registration_id' => $reg1->id, 'nim' => '2599000003'])->assertSessionHasNoErrors();

    $inv2 = RoomInvitation::where('invitee_id', $student2User->id)->sole();
    $inv3 = RoomInvitation::where('invitee_id', $student3User->id)->sole();

    $this->actingAs($student2User)->put(route('andalas.room-invitations.update', $inv2), ['accept' => true])->assertSessionHasNoErrors();
    $this->actingAs($student3User)->put(route('andalas.room-invitations.update', $inv3), ['accept' => true])->assertSessionHasNoErrors();

    $reg2 = ResidenceRegistration::where('student_profile_id', $student2->id)->sole();
    $reg3 = ResidenceRegistration::where('student_profile_id', $student3->id)->sole();
    $contract = RoomContract::sole();

    $amounts = [
        (int) $reg1->fresh()->tagihan->total,
        (int) $reg2->fresh()->tagihan->total,
        (int) $reg3->fresh()->tagihan->total,
    ];
    sort($amounts);
    expect($amounts)->toBe([3333333, 3333333, 3333334])
        ->and(array_sum($amounts))->toBe(10000000);

    // Member 1 pays via bank verification (3.333.334), Member 2 gets doc valid and uploads transfer proof (3.333.333, unverified), Member 3 does not pay
    $facilitator = toBeFacilitator($f['building']);
    toBeDocument($reg2->fresh(), $facilitator);
    toBePay($reg1->fresh(), $f['manager'], (int) $reg1->fresh()->tagihan->total);
    $this->actingAs($student2User)->post(route('andalas.pembayaran.store'), [
        'tagihan_id' => $reg2->tagihan_id,
        'jenis_pembayaran' => 'sewa_asrama',
        'nominal' => (int) $reg2->tagihan->total,
        'metode_pembayaran' => 'transfer',
        'bukti_transfer' => UploadedFile::fake()->create('bukti-m2.pdf', 100, 'application/pdf'),
    ])->assertRedirect()->assertSessionHasNoErrors();

    ResidenceRegistration::query()->update(['reservation_expires_at' => now()->subMinute()]);
    app(RoomReservations::class)->expire();

    expect($reg3->fresh()->status->value)->toBe('rejected')
        ->and($reg3->fresh()->allocation_status)->toBe('released')
        ->and($reg3->fresh()->reserved_room_id)->toBeNull()
        ->and($reg1->fresh()->status->value)->not->toBe('rejected')
        ->and($reg2->fresh()->status->value)->not->toBe('rejected');

    // Option 1: Reprice remaining 2 members as Exclusive (10.000.000 / 2 = 5.000.000 each)
    $this->actingAs($f['manager'])
        ->post(route('residence.contracts.revise', $contract), [
            'reference' => (string) Str::uuid(),
            'members' => [$reg1->id, $reg2->id],
            'scheme' => 'exclusive',
            'reason' => '1 anggota batal, 2 anggota lanjut eksklusif',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect((int) $reg1->fresh()->tagihan->total)->toBe(5000000)
        ->and((int) $reg2->fresh()->tagihan->total)->toBe(5000000)
        ->and($reg1->fresh()->billing_basis)->toBe('room');

    // Option 2: Switch remaining 2 members to Sharing (1.000.000 each per published policy sharing rate, opens remaining 2 slots, records cash refund only for bank-verified overpayment)
    $this->actingAs($f['manager'])
        ->post(route('residence.contracts.revise', $contract), [
            'reference' => (string) Str::uuid(),
            'members' => [$reg1->id, $reg2->id],
            'scheme' => 'sharing',
            'reason' => 'Beralih ke skema sharing per tempat tidur',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect((int) $reg1->fresh()->tagihan->total)->toBe(1000000)
        ->and((int) $reg2->fresh()->tagihan->total)->toBe(1000000)
        ->and($reg1->fresh()->billing_basis)->toBe('person')
        ->and($reg2->fresh()->billing_basis)->toBe('person')
        ->and(app(RoomReservations::class)->count($f['room']))->toBe(2);

    // Only Member 1 (bank-verified 3.333.334 > 1.000.000) gets a cash refund record (2.333.334); Member 2 (unverified proof) does not
    $refund = ResidenceCashRefund::where('residence_registration_id', $reg1->id)->sole();
    expect((int) $refund->amount)->toBe(2333334)
        ->and($refund->status)->toBe('due')
        ->and(ResidenceCashRefund::where('residence_registration_id', $reg2->id)->count())->toBe(0);

    $this->actingAs($f['manager'])
        ->post(route('residence.refunds.complete', $refund), [
            'recipient_name' => $f['user']->nama,
            'returned_at' => today()->toDateString(),
            'notes' => 'Diserahkan tunai di loket pengelola',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($refund->fresh()->status)->toBe('returned')
        ->and($refund->fresh()->returned_by)->toBe($f['manager']->id);
});

it('places international sponsored and summer course participants as admin_occupied without student document blockers', function () {
    $f = toBeFixture('international', 2);
    $buildingB = Gedung::create(['kode_gedung' => 'B', 'nama_gedung' => 'Gedung B', 'gender_peruntukan' => 'perempuan']);
    $floorB = Lantai::create(['gedung_id' => $buildingB->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);
    $roomB = Kamar::create(['lantai_id' => $floorB->id, 'nomor_kamar' => '201', 'tipe_kamar' => 'standar', 'kapasitas' => 2, 'tarif_per_periode' => 5000000, 'status' => 'kosong']);

    $policySettings = [
        'open' => true,
        'documents' => ['perjanjian'],
        'building_ids' => [$buildingB->id],
        'month_days' => 30,
        'day_basis' => 'nights',
        'monthly_allowed' => true,
        'rates' => array_map(fn ($unit) => ['gedung_id' => $buildingB->id, 'type' => 'standar', 'unit' => $unit, 'amount' => '150000', 'room_amount' => '5000000'], ['year', 'month', 'day', 'semester']),
    ];
    $f['policy']->update(['settings' => $policySettings]);
    ResidencePolicy::factory()->create([
        'category' => 'summer_course',
        'published_at' => now(),
        'created_by' => $f['manager']->id,
        'settings' => $policySettings,
    ]);

    // International sponsored student
    $this->actingAs($f['manager'])
        ->post(route('residence.applications.store'), [
            'number' => 'INT/UNAND/2026/001',
            'kind' => 'international',
            'institution' => 'Kemitraan Internasional UNAND',
            'recipient_email' => 'intl-office@unand.ac.id',
            'letter' => UploadedFile::fake()->create('surat-int.pdf', 100, 'application/pdf'),
            'funding' => 'sponsor',
            'rate_unit' => 'semester',
            'starts_at' => today()->toDateString(),
            'ends_at' => today()->addMonths(6)->toDateString(),
            'participants' => [
                [
                    'nama' => 'Aisha International',
                    'nim_nip' => 'INT-2026-01',
                    'email' => 'aisha.int@example.test',
                    'gender' => 'perempuan',
                    'kamar_id' => $roomB->id,
                ],
            ],
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $intUser = User::where('email', 'aisha.int@example.test')->sole();
    $intReg = ResidenceRegistration::whereHas('studentProfile', fn ($q) => $q->where('user_id', $intUser->id))->sole();
    expect($intUser->hasRole('mahasiswa'))->toBeTrue()
        ->and($intReg->allocation_status)->toBe('admin_occupied')
        ->and($intReg->funding)->toBe('sponsor');

    // Summer course participant (collective sponsor billing, exempt from student document templates)
    $this->actingAs($f['manager'])
        ->post(route('residence.applications.store'), [
            'number' => 'SUM/UNAND/2026/001',
            'kind' => 'summer_course',
            'institution' => 'Panitia Summer Course Fakultas Teknik',
            'recipient_email' => 'summer-ft@unand.ac.id',
            'letter' => UploadedFile::fake()->create('surat-sum.pdf', 100, 'application/pdf'),
            'funding' => 'personal', // normalized to 'sponsor' per BR-SUM-002
            'rate_unit' => 'day',
            'starts_at' => today()->toDateString(),
            'ends_at' => today()->addDays(5)->toDateString(),
            'participants' => [
                [
                    'nama' => 'Kenji Summer',
                    'nim_nip' => 'SUM-2026-01',
                    'email' => 'kenji.sum@example.test',
                    'gender' => 'perempuan',
                    'kamar_id' => $roomB->id,
                ],
            ],
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $sumUser = User::where('email', 'kenji.sum@example.test')->sole();
    $sumReg = ResidenceRegistration::whereHas('studentProfile', fn ($q) => $q->where('user_id', $sumUser->id))->sole();
    expect($sumReg->funding)->toBe('sponsor')
        ->and($sumReg->allocation_status)->toBe('admin_occupied')
        ->and($sumReg->ready_at)->not->toBeNull();
});

it('supports facilitator public stay creation with guest_count, date overlap checks, transfer proof upload without bank verification, and room relocation without digital checkin', function () {
    $f = toBeFixture('non_student', 2);
    $facilitator = toBeOfficer('fasilitator');
    FasilitatorWilayah::create(['user_id' => $facilitator->id, 'gedung_id' => $f['building']->id]);

    $room2 = Kamar::create([
        'lantai_id' => $f['floor']->id,
        'nomor_kamar' => '102',
        'tipe_kamar' => 'standar',
        'kapasitas' => 1,
        'tarif_per_periode' => 150000,
        'status' => 'kosong',
    ]);
    ResidenceRate::create(['gedung_id' => $f['building']->id, 'tipe_kamar' => 'standar', 'unit' => 'day', 'amount' => 150000]);

    $this->actingAs($facilitator)
        ->post(route('andalas.temporary-stays.store'), [
            'nama' => 'Tamu Umum Satu',
            'nim_nip' => '3201010101010001',
            'no_hp' => '081234567890',
            'gender' => 'perempuan',
            'stay_kind' => 'non_student',
            'kamar_id' => $room2->id,
            'guest_count' => 2,
            'starts_at' => '2026-11-15',
            'ends_at' => '2026-11-18',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $stay = ResidenceRegistration::where('stay_kind', 'non_student')->sole();
    expect($stay->guest_count)->toBe(2)
        ->and($stay->allocation_status)->toBe('held')
        ->and($stay->studentProfile->user->no_hp)->toBe('081234567890');

    // Overlapping date range on capacity-1 room must fail
    $this->actingAs($facilitator)
        ->post(route('andalas.temporary-stays.store'), [
            'nama' => 'Tamu Bentrok Tanggal',
            'nim_nip' => '3201010101010002',
            'gender' => 'perempuan',
            'stay_kind' => 'non_student',
            'kamar_id' => $room2->id,
            'starts_at' => '2026-11-16',
            'ends_at' => '2026-11-19',
        ])
        ->assertSessionHasErrors('preferences');

    // Non-overlapping date range on the same room succeeds
    $this->actingAs($facilitator)
        ->post(route('andalas.temporary-stays.store'), [
            'nama' => 'Tamu Beda Tanggal',
            'nim_nip' => '3201010101010003',
            'gender' => 'perempuan',
            'stay_kind' => 'non_student',
            'kamar_id' => $room2->id,
            'starts_at' => '2026-11-20',
            'ends_at' => '2026-11-22',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    // Facilitator uploads transfer proof -> room becomes admin_occupied while bank verification remains menunggu_verifikasi
    $this->actingAs($facilitator)
        ->post(route('residence.transfer-proof', $stay), [
            'nominal' => (int) $stay->tagihan->total,
            'file' => UploadedFile::fake()->create('bukti-umum.pdf', 100, 'application/pdf'),
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    $payment = Pembayaran::where('tagihan_id', $stay->tagihan_id)->sole();
    expect($stay->fresh()->allocation_status)->toBe('admin_occupied')
        ->and($stay->fresh()->ready_at)->not->toBeNull()
        ->and($payment->status)->toBe('menunggu_verifikasi')
        ->and((float) $stay->tagihan->fresh()->total_dibayar)->toBe(0.0);

    // Facilitator relocates resident within their building without requiring prior digital check-in
    $this->actingAs($facilitator)
        ->post(route('residence.move', $stay), [
            'reference' => (string) Str::uuid(),
            'room_id' => $f['room']->id,
            'reason' => 'Perpindahan kamar karena AC kamar 102 diperbaiki',
        ])
        ->assertRedirect()
        ->assertSessionHasNoErrors();

    expect($stay->fresh()->reserved_room_id)->toBe($f['room']->id)
        ->and(DB::table('residence_amendments')->where('subject_id', $stay->id)->where('kind', 'move')->count())->toBe(1);
});
