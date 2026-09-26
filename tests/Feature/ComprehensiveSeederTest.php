<?php

use App\Enums\ClientProfileCategory;
use App\Jobs\GenerateBillingDocument;
use App\Jobs\GenerateFreeResidenceLetter;
use App\Models;
use App\Services\AttendanceEligibility;
use App\Services\FreeResidenceLetterFormat;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\ResidenceScenarioSeeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $this->travelTo(now()->setDate(2026, 9, 23)->setTime(12, 0));
    Storage::fake('local');
    Storage::fake('public');
    $this->withoutVite();
    Notification::fake();
});

test('seeder supplies every domain model with linked and financially consistent demo records', function () {
    $this->seed(DatabaseSeeder::class);

    foreach (File::files(app_path('Models')) as $file) {
        $class = 'App\\Models\\'.$file->getFilenameWithoutExtension();
        if ($class !== Models\BaseModel::class) {
            expect($class::count(), $class)->toBeGreaterThan(0);
        }
    }
    expect(Models\User::where('email', 'like', '%@example.test')->count())->toBe(63);
    foreach (Models\MahasiswaProfil::with('user')->get() as $student) {
        if ($student->user->client_profile_category !== ClientProfileCategory::NonStudent) {
            expect($student->user->nim_nip)->toMatch('/^[0-9]{10}$/')
                ->toStartWith(substr($student->angkatan, -2));
        }
    }
    expect(Models\Kamar::whereHas('lantai.gedung', fn ($query) => $query->where('kode_gedung', 'like', 'DEMO-%'))->count())->toBe(60);
    foreach (Models\Tagihan::all() as $invoice) {
        expect((float) $invoice->total)->toBe((float) $invoice->items()->sum('jumlah') + (float) $invoice->penyesuaian()->sum('jumlah'));
        expect((float) $invoice->total_dibayar)->toBe((float) $invoice->alokasiPembayaran()->sum('jumlah'));
        expect((float) $invoice->total_dibayar)->toBeLessThanOrEqual((float) $invoice->total);
    }
    foreach (Models\Kamar::all() as $room) {
        $occupied = Models\PenempatanKamar::where('kamar_id', $room->id)->where('status', 'aktif')->count();
        expect($occupied)->toBeLessThanOrEqual($room->kapasitas);
        if ($room->status !== 'maintenance') {
            expect($room->status)->toBe($occupied === 0 ? 'kosong' : ($occupied === $room->kapasitas ? 'penuh' : 'terisi_sebagian'));
        }
    }
    foreach (Models\StokAset::all() as $stock) {
        expect((int) $stock->aset()->sum('jumlah'))->toBeLessThanOrEqual($stock->jumlah_total);
    }
    foreach (Models\DokumenTagihan::all() as $document) {
        Storage::disk('local')->assertExists($document->path);
        $contents = Storage::disk('local')->get($document->path);
        expect($contents)->toStartWith('%PDF-');
        expect(hash('sha256', $contents))->toBe($document->checksum_sha256);
    }
    expect(Models\VirtualAccount::where('aktif', true)->count())->toBe(0);
    expect(Models\Periode::where('status', 'aktif')->count())->toBe(1);
    expect(Models\ResidenceRate::where('unit', 'day')->count())->toBe(6);
    expect(Models\LegacyResidenceRate::whereNull('gedung_id')->count())->toBe(0);
    foreach (['kipk-aktif', 'internasional-gratis'] as $name) {
        expect(ResidenceScenarioSeeder::student($name)->residenceRegistrations()->firstOrFail()->tagihan->dokumen()->where('jenis', 'residence_receipt')->exists())->toBeFalse();
    }
    expect(Models\LegacyResident::where('nim', ResidenceScenarioSeeder::student('legacy-surat-terbit')->user->nim_nip)->exists())->toBeFalse();
    expect((float) Models\PenilaianTeknisi::firstOrFail()->total_skor)->toBe(4.0);
    expect((float) Models\PenilaianTeknisi::firstOrFail()->skor_persentase)->toBe(75.0);
    Notification::assertNothingSent();
});

test('seeded accounts can continue payment checkout permit and attendance journeys', function () {
    $this->seed(DatabaseSeeder::class);
    Queue::fake([GenerateBillingDocument::class, GenerateFreeResidenceLetter::class]);
    $admin = ResidenceScenarioSeeder::staff('admin_layanan');
    $facilitator = ResidenceScenarioSeeder::staff('fasilitator');
    $eligibility = app(AttendanceEligibility::class);
    expect($eligibility->isEligible(ResidenceScenarioSeeder::student('binaan-aktif'), now()))->toBeTrue();
    foreach (['penghuni-lama', 'nonmahasiswa-aktif', 'internasional-gratis', 'checkout-selesai'] as $name) {
        expect($eligibility->isEligible(ResidenceScenarioSeeder::student($name), now()))->toBeFalse();
    }

    $student = ResidenceScenarioSeeder::student('bayar-verifikasi');
    $registration = $student->residenceRegistrations()->firstOrFail();
    $payment = Models\Pembayaran::where('mahasiswa_id', $student->id)->firstOrFail();
    $this->actingAs($admin)->post(route('andalas.pembayaran.verify', $payment), ['status' => 'lunas'])->assertSessionHasNoErrors();
    expect($student->fresh()->status_huni)->toBe('aktif');
    expect($registration->fresh()->completed_at)->not->toBeNull();
    Queue::assertPushed(GenerateBillingDocument::class);

    $checkoutStudent = ResidenceScenarioSeeder::student('checkout-siap');
    $checkout = $checkoutStudent->checkoutRequests()->firstOrFail();
    $checkoutFacilitator = Models\FasilitatorWilayah::where('gedung_id', $checkout->placement->kamar->lantai->gedung_id)->firstOrFail()->user;
    $this->actingAs($checkoutFacilitator)->post(route('andalas.checkout.complete', $checkout))->assertRedirect()->assertSessionHasNoErrors();
    expect($checkoutStudent->fresh()->status_huni)->toBe('keluar');
    $this->actingAs($checkoutStudent->user)->post(route('andalas.pengajuan.bebas'), [
        'alasan' => 'Pengujian surat setelah checkout', 'legacy_verification_path' => 'alumni_unpaid',
    ])->assertSessionHasNoErrors();
    expect($checkoutStudent->user->fresh()->status)->toBe('nonaktif');
    Queue::assertPushed(GenerateFreeResidenceLetter::class);

    $permit = Models\PengajuanIzinPulang::where('mahasiswa_id', ResidenceScenarioSeeder::student('izin-review')->id)->where('status', 'diajukan')->firstOrFail();
    $permitFacilitator = Models\FasilitatorWilayah::where('gedung_id', $permit->gedung_id)->firstOrFail()->user;
    $this->actingAs($permitFacilitator)->post(route('andalas.perizinan.review', $permit), ['status' => 'disetujui'])->assertRedirect()->assertSessionHasNoErrors();
    expect($permit->fresh()->status->value)->toBe('sedang_izin');
    $overdue = Models\PengajuanIzinPulang::where('mahasiswa_id', ResidenceScenarioSeeder::student('izin-terlambat')->id)->where('status', 'sudah_sampai')->firstOrFail();
    expect($overdue->isOverdue())->toBeTrue();

    $this->actingAs($facilitator)->post(route('andalas.kegiatan.store'), [
        'jenis_kegiatan_id' => Models\JenisKegiatan::where('nama', 'Sholat Subuh')->value('id'),
        'duration_minutes' => 10, 'latitude' => -0.914, 'longitude' => 100.46,
        'accuracy_meters' => 10, 'radius_meters' => 100,
    ])->assertSessionHasNoErrors();
    $session = Models\AttendanceSession::findOrFail(session('activity_session_id'));
    $binaan = ResidenceScenarioSeeder::student('binaan-aktif');
    $this->actingAs($binaan->user)->post(route('andalas.absensi.sesi.record', $session), [
        'token' => $session->qr_token, 'latitude' => -0.914, 'longitude' => 100.46, 'accuracy_meters' => 10,
    ])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('activity_attendances', ['attendance_session_id' => $session->id, 'mahasiswa_id' => $binaan->id]);

    $document = $binaan->residenceRegistrations()->firstOrFail()->tagihan->dokumen()->where('jenis', 'residence_receipt')->firstOrFail();
    $this->get(route('andalas.tagihan.document', $document))->assertDownload();
    $this->actingAs(ResidenceScenarioSeeder::student('penghuni-01')->user)->get(route('andalas.tagihan.document', $document))->assertForbidden();
    $letter = Models\PengajuanBebasAsrama::where('mahasiswa_id', ResidenceScenarioSeeder::student('surat-modern')->id)->firstOrFail();
    $this->actingAs($letter->mahasiswa->user)->get(route('andalas.pengajuan.bebas.surat', $letter))->assertDownload();
    Notification::assertNothingSent();
});

test('seeded role dashboards and populated resident pages render successfully', function () {
    $this->seed(DatabaseSeeder::class);
    foreach (['superadmin' => 'admin', 'staff_admin' => 'admin', 'admin_layanan' => 'admin_layanan', 'admin_aset' => 'admin_aset',
        'fasilitator' => 'fasilitator', 'teknisi' => 'teknisi', 'go' => 'go', 'pimpinan' => 'pimpinan', 'orang_tua' => 'orang_tua'] as $role => $prefix) {
        $this->actingAs(ResidenceScenarioSeeder::staff($role))->get('/'.$prefix.'/dashboard')->assertOk();
    }
    $this->actingAs(ResidenceScenarioSeeder::student('binaan-aktif')->user);
    foreach (['dashboard', 'registration', 'detail-kamar', 'tagihan', 'checkout', 'bebas-asrama', 'perizinan', 'jadwal', 'absensi', 'lapor-kerusakan'] as $page) {
        $this->get('/mahasiswa/'.$page)->assertOk();
    }
    Notification::assertNothingSent();
});

test('demo seeding refuses a production environment before creating accounts', function () {
    app()->instance('env', 'production');
    try {
        expect(fn () => $this->seed(DatabaseSeeder::class))->toThrow(LogicException::class);
        expect(Models\User::count())->toBe(0);
    } finally {
        app()->instance('env', 'testing');
    }
});

test('reseeding preserves user changes and does not duplicate demo relationships', function () {
    $this->seed(DatabaseSeeder::class);
    $unverified = Models\User::factory()->create(['nim_nip' => '2612345678', 'client_profile_category' => 'local_kipk']);
    Models\MahasiswaProfil::create(['user_id' => $unverified->id, 'angkatan' => '2026', 'barcode_code' => 'UNVERIFIED', 'status_huni' => 'calon']);
    $counts = collect(File::files(app_path('Models')))->mapWithKeys(function ($file) {
        $class = 'App\\Models\\'.$file->getFilenameWithoutExtension();

        return $class === Models\BaseModel::class ? [] : [$class => $class::count()];
    });
    $student = ResidenceScenarioSeeder::student('binaan-aktif');
    $student->user->update(['nama' => 'Nama diubah penguji', 'password' => 'password-baru']);
    $hash = $student->user->fresh()->password;
    $content = Models\LandingContent::where('key', 'sejarah')->firstOrFail();
    $content->update(['content' => 'Konten hasil penyuntingan']);
    $baseline = Models\User::where('email', 'mahasiswa.kipk@unand.ac.id')->firstOrFail();
    $baseline->update(['status' => 'nonaktif']);
    $baseline->update(['nim_nip' => '2211521001']);
    $international = Models\User::where('email', 'international@unand.ac.id')->firstOrFail();
    $international->update(['nim_nip' => 'INT001']);
    $letter = Models\FreeResidenceLetterDocumentIntent::where('path', 'demo/documents/surat-bebas-surat-modern.pdf')->firstOrFail();
    $letter->update(['template_version' => 'free-residence-v1']);
    $student->user->update(['nim_nip' => 'DEMO-0009']);
    $custom = ResidenceScenarioSeeder::student('penghuni-01')->user;
    $custom->update(['nim_nip' => '2699999999']);
    Models\Kamar::where('nomor_kamar', '101')->firstOrFail()->update(['status' => 'maintenance']);

    $this->seed(DatabaseSeeder::class);

    expect(Models\KipkRecipient::where('nim', $unverified->nim_nip)->exists())->toBeFalse();
    foreach ($counts as $class => $count) {
        expect($class::count(), $class)->toBe($count);
    }
    expect($student->user->fresh()->nama)->toBe('Nama diubah penguji');
    expect($student->user->fresh()->password)->toBe($hash);
    expect($content->fresh()->content)->toBe('Konten hasil penyuntingan');
    expect($baseline->fresh()->status)->toBe('nonaktif');
    expect($baseline->fresh()->nim_nip)->toBe('2611521001');
    expect($student->user->fresh()->nim_nip)->toBe('2699000009');
    expect($custom->fresh()->nim_nip)->toBe('2699999999');
    expect($international->fresh()->nim_nip)->toBe('2699001001');
    expect($letter->fresh()->template_version)->toBe(FreeResidenceLetterFormat::VERSION);
    expect($letter->fresh()->checksum_sha256)->toBe(hash('sha256', Storage::disk('local')->get($letter->path)));
    expect(Models\Kamar::where('nomor_kamar', '101')->firstOrFail()->status)->toBe('maintenance');
    Notification::assertNothingSent();
});

test('first demo seed preserves an admission period already activated by admin', function () {
    $period = Models\Periode::create(['nama_periode' => 'Penerimaan admin', 'status' => 'aktif', 'angkatan_maba' => 2026, 'tanggal_mulai' => '2026-08-01', 'tanggal_selesai' => '2027-07-31']);
    $this->seed(DatabaseSeeder::class);
    expect(Models\Periode::where('status', 'aktif')->sole()->id)->toBe($period->id);
    expect(Models\Periode::where('nama_periode', 'DEMO 2026/2027')->sole()->status)->toBe('nonaktif');
});
