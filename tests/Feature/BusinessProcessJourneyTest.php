<?php

use App\Enums\CheckoutRequestStatus;
use App\Enums\FreeResidenceLetterStatus;
use App\Enums\LaporanKerusakanStatus;
use App\Jobs\GenerateBillingDocument;
use App\Jobs\GenerateFreeResidenceLetter;
use App\Models\Aset;
use App\Models\CheckoutRequest;
use App\Models\Departemen;
use App\Models\Faculty;
use App\Models\FasilitatorWilayah;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\LaporanKerusakan;
use App\Models\Pembayaran;
use App\Models\PengajuanBebasAsrama;
use App\Models\Periode;
use App\Models\Prodi;
use App\Models\ResidenceRegistration;
use App\Models\User;
use App\Notifications\DocumentReadyNotification;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

it('connects account registration payment damage reporting checkout and the modern residence letter', function () {
    $this->seed(RolePermissionSeeder::class);
    Queue::fake([GenerateBillingDocument::class, GenerateFreeResidenceLetter::class]);
    Notification::fake();
    Storage::fake('local');
    $admin = User::factory()->create()->assignRole('admin_layanan');
    $inspector = User::factory()->create()->assignRole('go');
    $facilitator = User::factory()->create()->assignRole('fasilitator');
    $technician = User::factory()->create()->assignRole('teknisi');
    $period = Periode::create(['nama_periode' => '2026/2027', 'tanggal_mulai' => '2026-08-01', 'tanggal_selesai' => '2027-07-31', 'status' => 'aktif']);
    $building = Gedung::create(['kode_gedung' => 'JOURNEY', 'nama_gedung' => 'Gedung Perjalanan']);
    FasilitatorWilayah::create(['user_id' => $facilitator->id, 'gedung_id' => $building->id]);
    $floor = Lantai::create(['gedung_id' => $building->id, 'nomor_lantai' => 1, 'nama_lantai' => 'Lantai 1']);
    $room = Kamar::create(['lantai_id' => $floor->id, 'nomor_kamar' => '101', 'kapasitas' => 1, 'status' => 'kosong', 'tipe_kamar' => 'single', 'tarif_per_periode' => 1500000]);
    $asset = Aset::create(['kamar_id' => $room->id, 'kode_inventaris' => 'JOURNEY-ASSET', 'nama_aset' => 'Lampu belajar', 'kategori' => 'Elektronik', 'kondisi' => 'baik']);
    $faculty = Faculty::create(['name' => 'Teknologi Informasi']);
    $department = Departemen::create(['name' => 'Informatika', 'faculty_id' => $faculty->id]);
    $program = Prodi::create(['name' => 'Informatika', 'jenjang' => 'S1', 'departemen_id' => $department->id]);

    $this->post(route('register.store'), [
        'nama' => 'Penghuni Perjalanan', 'nim_nip' => '2699009999', 'email' => 'journey@example.test',
        'password' => 'password123', 'password_confirmation' => 'password123',
        'client_profile_category' => 'local_non_kipk', 'gender' => 'perempuan',
        'faculty_id' => $faculty->id, 'departemen_id' => $department->id, 'prodi_id' => $program->id,
    ])->assertSessionHasNoErrors();
    $resident = User::where('email', 'journey@example.test')->sole();
    $student = $resident->mahasiswaProfil;
    $this->actingAs($resident)->post(route('andalas.registrations.store'), [
        'periode_id' => $period->id, 'is_kipk' => false, 'preferences' => [['kamar_id' => $room->id]],
    ])->assertSessionHasNoErrors();
    $registration = ResidenceRegistration::where('student_profile_id', $student->id)->sole();
    $invoice = $registration->tagihan;
    Queue::assertPushed(GenerateBillingDocument::class, fn ($job) => $job->jenis === 'invoice');

    expect($student->fresh()->status_huni)->toBe('calon');
    $this->actingAs($resident)->post(route('andalas.pembayaran.store'), [
        'tagihan_id' => $invoice->id, 'jenis_pembayaran' => 'sewa_asrama', 'nominal' => 1500000,
        'bukti_transfer' => UploadedFile::fake()->image('bukti.jpg'),
    ])->assertSessionHasNoErrors();
    $payment = Pembayaran::where('tagihan_id', $invoice->id)->sole();
    $this->actingAs($admin)->post(route('andalas.pembayaran.verify', $payment), ['status' => 'lunas'])->assertSessionHasNoErrors();
    expect($student->fresh()->status_huni)->toBe('aktif')
        ->and($registration->fresh()->completed_at)->not->toBeNull();
    Queue::assertPushed(GenerateBillingDocument::class, fn ($job) => $job->jenis === 'residence_receipt');
    (new GenerateBillingDocument($invoice->id, 'residence_receipt'))->handle();
    $receipt = $invoice->dokumen()->where('jenis', 'residence_receipt')->sole();
    $this->actingAs($resident)->get(route('andalas.tagihan.document', $receipt))->assertDownload();

    $this->post(route('andalas.laporan.store'), [
        'aset_id' => $asset->id, 'deskripsi' => 'Lampu tidak menyala', 'foto_awal' => [UploadedFile::fake()->image('lampu.jpg')],
    ])->assertSessionHasNoErrors();
    $report = LaporanKerusakan::where('dilaporkan_oleh', $resident->id)->sole();
    $this->actingAs($technician)->put(route('andalas.tiket.update', $report), ['status' => 'sedang_dikerjakan'])->assertSessionHasNoErrors();
    $this->post(route('andalas.tiket.update', $report), [
        '_method' => 'PUT', 'status' => 'selesai', 'catatan_penyelesaian' => 'Lampu sudah diganti',
        'bukti_penyelesaian' => [UploadedFile::fake()->image('lampu-selesai.jpg')],
    ])->assertSessionHasNoErrors();
    expect($report->fresh()->status)->toBe(LaporanKerusakanStatus::Selesai);

    $this->actingAs($resident)->post(route('andalas.checkout.store'), ['alasan' => 'Selesai masa huni'])->assertSessionHasNoErrors();
    $checkout = CheckoutRequest::where('mahasiswa_id', $student->id)->sole();
    $this->actingAs($facilitator)->post(route('andalas.checkout.complete', $checkout))->assertSessionHasErrors('checkout');
    $this->actingAs($inspector)->put(route('andalas.checkout.inspection.update', $checkout), [
        'status' => 'selesai',
        'catatan' => 'Kamar diperiksa dan baik',
        'asset_checks' => [[
            'aset_id' => $asset->id,
            'actual_quantity' => 1,
            'condition' => 'baik',
            'note' => null,
        ]],
    ])->assertSessionHasNoErrors();
    $outsideFacilitator = User::factory()->create()->assignRole('fasilitator');
    $this->actingAs($outsideFacilitator)->post(route('andalas.checkout.complete', $checkout))->assertForbidden();
    $this->actingAs($facilitator)->post(route('andalas.checkout.complete', $checkout))->assertSessionHasNoErrors();
    expect($checkout->fresh()->status)->toBe(CheckoutRequestStatus::Selesai)
        ->and($checkout->fresh()->diproses_oleh)->toBe($facilitator->id)
        ->and($room->fresh()->status)->toBe('kosong');

    $this->actingAs($resident)->post(route('andalas.pengajuan.bebas'), [
        'alasan' => 'Bebas kewajiban asrama', 'legacy_verification_path' => 'alumni_unpaid',
    ])->assertSessionHasNoErrors();
    $application = PengajuanBebasAsrama::where('mahasiswa_id', $student->id)->sole();
    expect($application->status)->toBe(FreeResidenceLetterStatus::Disetujui)
        ->and($resident->fresh()->status)->toBe('nonaktif');
    Queue::assertPushed(GenerateFreeResidenceLetter::class);
    (new GenerateFreeResidenceLetter($application->documentIntent->id))->handle();
    $this->get(route('andalas.pengajuan.bebas.surat', $application))->assertDownload();
    Notification::assertSentTo($resident, DocumentReadyNotification::class, fn ($notification) => $notification->documentType === 'free_residence');
});
