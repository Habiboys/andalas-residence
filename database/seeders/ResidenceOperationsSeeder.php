<?php

namespace Database\Seeders;

use App\Enums\AttendanceRejectionReason;
use App\Models;
use App\Services\AttendanceRoster;
use App\Services\FreeResidenceLetterFormat;
use App\Services\QuestionnaireScoringService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\CarbonInterface;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ResidenceOperationsSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new \LogicException('Data demonstrasi hanya untuk lingkungan local atau testing.');
        }
        if (Models\AuditLog::where('event', 'demo.operations.seeded.v1')->exists()) {
            $this->refreshDemoLetters();

            return;
        }
        DB::transaction(function (): void {
            $this->damageReports();
            $this->checkouts();
            $this->letters();
            $this->permits();
            $this->attendance();
            $this->financeAndContent();
            Models\ParentStudentLink::create(['parent_user_id' => ResidenceScenarioSeeder::staff('orang_tua')->id, 'student_profile_id' => ResidenceScenarioSeeder::student('binaan-aktif')->id, 'relationship' => 'guardian', 'is_primary_contact' => true]);
            $admin = ResidenceScenarioSeeder::staff('superadmin');
            Models\AuditLog::create(['user_id' => $admin->id, 'event' => 'demo.operations.seeded.v1', 'auditable_type' => Models\User::class, 'auditable_id' => $admin->id, 'new_values' => ['scenario_version' => 1], 'ip_address' => '127.0.0.1', 'user_agent' => 'DatabaseSeeder']);
        });
    }

    private function damageReports(): void
    {
        foreach (['menunggu_triage', 'didisposisikan', 'sedang_dikerjakan', 'selesai', 'dibatalkan'] as $index => $status) {
            $student = ResidenceScenarioSeeder::student(sprintf('penghuni-%02d', $index + 1));
            $room = $student->penempatanKamar()->where('status', 'aktif')->firstOrFail()->kamar;
            $asset = Models\Aset::where('kamar_id', $room->id)->orderBy('kode_inventaris')->firstOrFail();
            $report = $this->report('DEMO-DAMAGE-'.$index, $student->user_id, $asset, $status);
            if ($status === 'selesai') {
                $questionnaire = Models\Kuesioner::where('kode', 'KT-TEKNISI-V1')->firstOrFail();
                $questions = Models\KuesionerPertanyaan::where('kuesioner_id', $questionnaire->id)->get();
                $rating = Models\PenilaianTeknisi::create([
                    'laporan_kerusakan_id' => $report->id, 'kuesioner_id' => $questionnaire->id, 'teknisi_id' => $report->teknisi_id,
                    'dinilai_oleh' => ResidenceScenarioSeeder::staff('pimpinan')->id, 'status' => 'draft',
                    'catatan_umum' => 'DEMO: perbaikan selesai dan bukti terlampir.',
                ]);
                app(QuestionnaireScoringService::class)->finalize($rating, $questions->mapWithKeys(fn ($question) => [
                    $question->id => ['nilai_skor' => min((float) $question->skor_maksimal, max(4, (float) $question->skor_minimal)), 'jawaban_teks' => 'Hasil pemeriksaan demo'],
                ])->all());
            }
        }
        $student = ResidenceScenarioSeeder::student('binaan-aktif');
        $building = $student->penempatanKamar()->where('status', 'aktif')->firstOrFail()->kamar->lantai->gedung_id;
        $asset = Models\Aset::whereHas('fasilitasUmum', fn ($query) => $query->where('gedung_id', $building))->firstOrFail();
        $this->report('DEMO-DAMAGE-UMUM', $student->user_id, $asset, 'menunggu_triage');
    }

    private function report(string $ticket, string $reporter, Models\Aset $asset, string $status): Models\LaporanKerusakan
    {
        $assigned = in_array($status, ['didisposisikan', 'sedang_dikerjakan', 'selesai']);
        $technician = ResidenceScenarioSeeder::staff('teknisi');
        $admin = ResidenceScenarioSeeder::staff('admin_aset');
        $report = Models\LaporanKerusakan::create([
            'nomor_tiket' => $ticket, 'aset_id' => $asset->id, 'kamar_id' => $asset->kamar_id, 'dilaporkan_oleh' => $reporter,
            'teknisi_id' => $assigned ? $technician->id : null, 'deskripsi' => 'DEMO: '.$asset->nama_aset.' memerlukan pemeriksaan.',
            'status' => $status, 'tanggal_lapor' => now()->subDays(7), 'tanggal_selesai' => $status === 'selesai' ? now()->subDays(2) : null,
            'catatan_penyelesaian' => $status === 'selesai' ? 'Komponen diperbaiki dan diuji kembali (demo).' : null,
        ]);
        if (! in_array($status, ['selesai', 'dibatalkan'])) {
            $asset->update(['kondisi' => 'rusak_ringan']);
        }
        Models\LaporanKerusakanPhoto::create(['laporan_kerusakan_id' => $report->id, 'type' => 'before', 'path' => ResidenceScenarioSeeder::fixture('kerusakan-sebelum'), 'uploaded_by' => $reporter]);
        if ($status === 'selesai') {
            Models\LaporanKerusakanPhoto::create(['laporan_kerusakan_id' => $report->id, 'type' => 'after', 'path' => ResidenceScenarioSeeder::fixture('kerusakan-sesudah'), 'uploaded_by' => $technician->id]);
        }
        if ($assigned) {
            Models\LaporanKerusakanAssignment::create(['laporan_kerusakan_id' => $report->id, 'technician_id' => $technician->id, 'assigned_by' => $admin->id, 'assigned_at' => now()->subDays(6), 'ended_at' => $status === 'selesai' ? now()->subDays(2) : null]);
        }
        $steps = match ($status) {
            'selesai' => ['menunggu_triage', 'didisposisikan', 'sedang_dikerjakan', 'selesai'],
            'sedang_dikerjakan' => ['menunggu_triage', 'didisposisikan', 'sedang_dikerjakan'],
            'didisposisikan' => ['menunggu_triage', 'didisposisikan'],
            'dibatalkan' => ['menunggu_triage', 'dibatalkan'],
            default => ['menunggu_triage'],
        };
        $previous = null;
        foreach ($steps as $step) {
            Models\LaporanKerusakanStatusHistory::create(['laporan_kerusakan_id' => $report->id, 'from_status' => $previous, 'to_status' => $step, 'changed_by' => $admin->id, 'description' => 'Riwayat skenario demonstrasi']);
            $previous = $step;
        }

        return $report;
    }

    private function checkouts(): void
    {
        foreach (['checkout-pengajuan' => 'diajukan', 'checkout-siap' => 'siap_checkout', 'checkout-rusak' => 'siap_checkout', 'checkout-selesai' => 'selesai', 'surat-modern' => 'selesai'] as $name => $status) {
            $student = ResidenceScenarioSeeder::student($name);
            $placement = $student->penempatanKamar()->firstOrFail();
            $request = Models\CheckoutRequest::create(['mahasiswa_id' => $student->id, 'penempatan_kamar_id' => $placement->id, 'status' => $status,
                'alasan' => 'DEMO: masa tinggal berakhir.', 'diajukan_at' => now()->subDays(5), 'disetujui_at' => $status !== 'diajukan' ? now()->subDays(3) : null,
                'selesai_at' => $status === 'selesai' ? now()->subDays(2) : null, 'diproses_oleh' => $status === 'selesai' ? ResidenceScenarioSeeder::staff('fasilitator')->id : null]);
            $assets = Models\Aset::where('kamar_id', $placement->kamar_id)->orderBy('kode_inventaris')->get();
            $damaged = $name === 'checkout-rusak';
            $inspection = Models\RoomInspection::create(['checkout_request_id' => $request->id, 'inspector_id' => ResidenceScenarioSeeder::staff('go')->id,
                'status' => $status === 'diajukan' ? 'menunggu' : 'selesai', 'catatan' => $damaged ? 'Satu kursi rusak ringan.' : 'Pemeriksaan kondisi kamar demo.',
                'inspected_at' => $status === 'diajukan' ? null : now()->subDays(3),
                'asset_checks' => $status === 'diajukan' ? null : $assets->map(fn ($asset, $index) => [
                    'aset_id' => $asset->id, 'name' => $asset->nama_aset, 'inventory_code' => $asset->kode_inventaris,
                    'expected_quantity' => $asset->jumlah, 'actual_quantity' => $asset->jumlah,
                    'condition' => $damaged && $index === 0 ? 'rusak_ringan' : 'baik', 'note' => 'Pemeriksaan demo',
                ])->all(),
            ]);
            if ($damaged) {
                $asset = $assets->first();
                $report = $this->report('DEMO-CHECKOUT-DAMAGE', ResidenceScenarioSeeder::staff('go')->id, $asset, 'menunggu_triage');
                Models\RoomInspectionFinding::create(['room_inspection_id' => $inspection->id, 'aset_id' => $asset->id, 'laporan_kerusakan_id' => $report->id, 'description' => 'Kaki kursi longgar (demo).', 'severity' => 'rusak_ringan', 'estimated_cost' => 0]);
            }
        }
    }

    private function letters(): void
    {
        foreach (['legacy-lunas' => ['alumni_paid', 'diajukan'], 'legacy-belum-lunas' => ['alumni_unpaid', 'diverifikasi'],
            'legacy-bukan-alumni' => [null, 'diajukan'], 'legacy-ditolak' => ['alumni_paid', 'ditolak'],
            'legacy-surat-terbit' => ['not_alumni', 'disetujui'], 'surat-modern' => [null, 'disetujui']] as $name => [$path, $status]) {
            $student = ResidenceScenarioSeeder::student($name);
            $modern = $name === 'surat-modern';
            $approved = $status === 'disetujui';
            $file = $approved ? 'demo/documents/surat-bebas-'.$name.'.pdf' : null;
            $invoice = null;
            if ($path === 'alumni_unpaid') {
                $archive = Models\LegacyResident::where('nim', $student->user->nim_nip)->firstOrFail();
                $amount = (int) Models\LegacyResidenceRate::where('angkatan', $student->angkatan)->where('gedung_id', $archive->gedung_id)->firstOrFail()->jumlah;
                $invoice = (new ResidenceScenarioSeeder)->billing($student, $name, 'unpaid', 'local_non_kipk', $amount);
                ResidenceScenarioSeeder::billingDocument($invoice, 'invoice');
            }
            $request = Models\PengajuanBebasAsrama::create([
                'nomor_pengajuan' => 'DEMO-FREE-'.$name, 'nomor_surat_resmi' => $approved ? 'DEMO-SURAT-'.$name : null,
                'mahasiswa_id' => $student->id, 'alasan' => 'DEMO: pengurusan administrasi kelulusan.', 'status' => $status,
                'catatan_penolakan' => $status === 'ditolak' ? 'Bukti pembayaran belum sesuai, unggah ulang bukti yang jelas.' : null,
                'disetujui_oleh' => $approved ? ResidenceScenarioSeeder::staff('admin_layanan')->id : null,
                'file_surat_path' => $file, 'lifecycle_year' => $modern ? max(2026, now()->year) : 2025, 'legacy_verification_path' => $path,
                'checkout_request_id' => $modern ? $student->checkoutRequests()->firstOrFail()->id : null,
                'payment_evidence_path' => $path === 'alumni_paid' ? ResidenceScenarioSeeder::fixture('bukti-transfer') : null,
                'bank_statement_path' => $path === 'alumni_paid' ? ResidenceScenarioSeeder::fixture('rekening-koran', true) : null,
                'tagihan_id' => $invoice?->id, 'verified_at' => in_array($status, ['diverifikasi', 'disetujui']) ? now()->subDay() : null,
                'approved_at' => $approved ? now()->subDay() : null,
            ]);
            foreach (array_unique(['diajukan', $status]) as $step) {
                Models\PengajuanBebasAsramaStatusHistory::create(['pengajuan_id' => $request->id, 'status' => $step, 'changed_by' => ResidenceScenarioSeeder::staff('admin_layanan')->id, 'note' => 'Riwayat pengajuan demo']);
            }
            if ($approved) {
                $contents = Pdf::loadView('pdf.surat-bebas-asrama', ['pengajuan' => $request, 'mahasiswa' => $student, 'documentNumber' => $request->nomor_surat_resmi])->setPaper('a4')->output();
                Storage::disk('local')->put($file, $contents);
                gc_collect_cycles();
                $student->user->update(['status' => 'nonaktif', 'inactive_reason' => 'letter_issued']);
                $student->update(['status_huni' => 'keluar']);
                Models\FreeResidenceLetterDocumentIntent::create(['pengajuan_id' => $request->id, 'status' => 'ready', 'nomor' => $request->nomor_surat_resmi,
                    'path' => $file, 'checksum_sha256' => hash('sha256', $contents), 'template_version' => FreeResidenceLetterFormat::VERSION, 'requested_at' => now()->subDay(), 'generated_at' => now()->subDay()]);
            }
        }
    }

    private function refreshDemoLetters(): void
    {
        foreach (['legacy-surat-terbit', 'surat-modern'] as $name) {
            $path = 'demo/documents/surat-bebas-'.$name.'.pdf';
            $intent = Models\FreeResidenceLetterDocumentIntent::with('pengajuan.mahasiswa.user', 'pengajuan.mahasiswa.prodi')
                ->where('path', $path)->whereIn('template_version', ['free-residence-v1', 'free-residence-dummy-v1'])->where('status', 'ready')->first();
            if (! $intent || $intent->pengajuan->file_surat_path !== $path) {
                continue;
            }
            $contents = Pdf::loadView('pdf.surat-bebas-asrama', [
                'pengajuan' => $intent->pengajuan, 'mahasiswa' => $intent->pengajuan->mahasiswa, 'documentNumber' => $intent->nomor,
            ])->setPaper('a4')->output();
            Storage::disk('local')->put($path, $contents);
            $intent->update(['template_version' => FreeResidenceLetterFormat::VERSION, 'checksum_sha256' => hash('sha256', $contents)]);
        }
    }

    private function permits(): void
    {
        foreach (['izin-otomatis' => 'sedang_izin', 'izin-review' => 'diajukan', 'izin-sampai' => 'sudah_sampai', 'izin-terlambat' => 'sudah_sampai', 'izin-kembali' => 'selesai_kembali'] as $name => $status) {
            $student = ResidenceScenarioSeeder::student($name);
            $building = $student->penempatanKamar()->where('status', 'aktif')->firstOrFail()->kamar->lantai->gedung_id;
            $previousCount = $name === 'izin-otomatis' ? 6 : 7;
            for ($i = 1; $i <= $previousCount; $i++) {
                $this->permit($student, $building, 'selesai_kembali', now()->subDays(28 - $i * 3), now()->subDays(27 - $i * 3), $i);
            }
            $this->permit($student, $building, $status, now()->subDays(2), in_array($name, ['izin-terlambat', 'izin-kembali']) ? now()->subDay() : now()->addDay(), $previousCount + 1);
        }
        $student = ResidenceScenarioSeeder::student('penghuni-06');
        $this->permit($student, $student->penempatanKamar()->firstOrFail()->kamar->lantai->gedung_id, 'ditolak', now()->subDay(), now()->addDay(), 1);
    }

    private function permit(Models\MahasiswaProfil $student, string $building, string $status, CarbonInterface $start, CarbonInterface $end, int $sequence): void
    {
        $departed = in_array($status, ['sedang_izin', 'sudah_sampai', 'selesai_kembali']);
        $arrived = in_array($status, ['sudah_sampai', 'selesai_kembali']);
        Models\PengajuanIzinPulang::create([
            'mahasiswa_id' => $student->id, 'gedung_id' => $building, 'jenis' => $sequence % 2 === 0 ? 'kegiatan' : 'pulkam',
            'tanggal_mulai' => $start, 'tanggal_kembali' => $end, 'rencana_kembali_pada' => $end,
            'berangkat_pada' => $departed ? $start : null, 'kembali_pada' => $status === 'selesai_kembali' ? $end : null,
            'alasan' => 'DEMO: izin nomor '.$sequence, 'tujuan_alamat' => 'Alamat keluarga demo, Padang', 'kontak_darurat' => '080000000000', 'status' => $status,
            'disetujui_oleh' => $sequence > 7 && $departed ? ResidenceScenarioSeeder::staff('fasilitator')->id : null,
            'dokumen_path' => ResidenceScenarioSeeder::fixture('izin-kegiatan', true),
            'catatan_verifikasi' => $status === 'ditolak' ? 'DEMO: dokumen kegiatan belum lengkap.' : null,
            'sampai_pada' => $arrived ? $start->copy()->addHour() : null, 'sampai_foto_path' => $arrived ? ResidenceScenarioSeeder::fixture('tiba-tujuan') : null,
            'sampai_latitude' => $arrived ? -0.914 : null, 'sampai_longitude' => $arrived ? 100.46 : null, 'sampai_accuracy' => $arrived ? 10 : null,
            'kembali_foto_path' => $status === 'selesai_kembali' ? ResidenceScenarioSeeder::fixture('kembali-asrama') : null,
            'kembali_latitude' => $status === 'selesai_kembali' ? -0.914 : null, 'kembali_longitude' => $status === 'selesai_kembali' ? 100.46 : null,
            'kembali_accuracy' => $status === 'selesai_kembali' ? 10 : null,
        ]);
    }

    private function attendance(): void
    {
        $facilitator = ResidenceScenarioSeeder::staff('fasilitator');
        foreach ([1, 2] as $index) {
            $start = now()->subDays(5 - $index)->startOfDay()->addHours(17);
            $activity = Models\Kegiatan::create(['judul' => 'DEMO: Pembinaan pekan '.$index,
                'deskripsi' => 'Riwayat pembinaan dan geofencing demonstrasi.',
                'gedung_id' => Models\Gedung::where('kode_gedung', 'DEMO-W')->value('id'), 'jenis_kegiatan_id' => Models\JenisKegiatan::where('is_other', true)->value('id'), 'tanggal_mulai' => $start, 'tanggal_selesai' => $start->copy()->addMinutes(30),
                'dibuat_oleh' => $facilitator->id]);
            $session = Models\AttendanceSession::create(['kegiatan_id' => $activity->id, 'facilitator_id' => $facilitator->id,
                'qr_token_hash' => hash('sha256', 'DEMO-EXPIRED-'.$index), 'opens_at' => $start, 'expires_at' => $start->copy()->addMinutes(30),
                'closed_at' => $start->copy()->addMinutes($index === 1 ? 30 : 15), 'facilitator_latitude' => -0.914, 'facilitator_longitude' => 100.46,
                'facilitator_accuracy_meters' => 10, 'facilitator_located_at' => $start->copy()->addMinutes(5), 'anchor_latitude' => -0.914, 'anchor_longitude' => 100.46, 'radius_meters' => 100, 'maximum_accuracy_meters' => 50]);
            app(AttendanceRoster::class)->capture($session);
            foreach (['binaan-aktif'] as $name) {
                $student = ResidenceScenarioSeeder::student($name);
                $attempt = Models\AttendanceAttempt::create(['attendance_session_id' => $session->id, 'mahasiswa_id' => $student->id, 'attempted_at' => $start->copy()->addMinutes(5), 'latitude' => -0.914, 'longitude' => 100.46, 'accuracy_meters' => 10, 'distance_meters' => 0]);
                Models\ActivityAttendance::create(['attendance_session_id' => $session->id, 'mahasiswa_id' => $student->id, 'attendance_attempt_id' => $attempt->id, 'attended_at' => $attempt->attempted_at]);
            }
            foreach (AttendanceRejectionReason::cases() as $reason) {
                if ($reason === AttendanceRejectionReason::WrongBuilding) {
                    continue;
                }
                Models\AttendanceAttempt::create(['attendance_session_id' => $session->id, 'mahasiswa_id' => ResidenceScenarioSeeder::student($reason->value === 'ineligible' ? 'penghuni-lama' : 'binaan-aktif')->id,
                    'attempted_at' => $reason->value === 'token_expired' ? $start->copy()->addMinutes(31) : $start->copy()->addMinutes(6),
                    'latitude' => $reason->value === 'outside_radius' ? -0.924 : -0.914, 'longitude' => 100.46,
                    'accuracy_meters' => $reason->value === 'location_inaccurate' ? 200 : 10,
                    'distance_meters' => $reason->value === 'outside_radius' ? 1112 : 0, 'rejection_reason' => $reason]);
            }
        }
    }

    private function financeAndContent(): void
    {
        $attachment = ResidenceScenarioSeeder::fixture('lampiran-informasi', true);
        Storage::disk('public')->put($attachment, Storage::disk('local')->get($attachment));
        foreach (range(0, 11) as $month) {
            Models\TransaksiKeuangan::create(['nomor_bukti' => 'DEMO-EXP-'.$month, 'kategori_id' => Models\KategoriTransaksi::where('tipe', 'pengeluaran')->firstOrFail()->id,
                'tipe' => 'pengeluaran', 'nominal' => 250000 + $month * 25000, 'deskripsi' => 'Operasional gedung demonstrasi bulan '.$month,
                'tanggal_transaksi' => now()->startOfMonth()->subMonths($month), 'dicatat_oleh' => ResidenceScenarioSeeder::staff('staff_admin')->id,
                'lampiran_path' => ResidenceScenarioSeeder::fixture('bukti-operasional', true)]);
        }
        foreach (['regulasi', 'sop', 'panduan', 'pengumuman'] as $category) {
            foreach ([true, false] as $published) {
                Models\Informasi::create(['kategori' => $category, 'judul' => 'DEMO '.$category.($published ? ' terbit' : ' draft'),
                    'konten' => '<h2>Konten pengujian</h2><p>Contoh <strong>teks tebal</strong> dan <em>teks miring</em>.</p><ul><li>Pendaftaran dan tagihan</li><li>Pelayanan penghuni</li></ul>',
                    'tanggal' => now()->toDateString(), 'file' => $attachment, 'published' => $published]);
            }
        }
        Models\Testimoni::create(['nama' => 'DEMO testimoni belum terbit', 'prodi' => 'Informatika', 'teks' => 'Contoh untuk memeriksa penyuntingan dan publikasi konten.', 'urutan' => 99, 'published' => false]);
        $program = Models\Program::create(['nama' => 'DEMO program draft', 'deskripsi' => '<p>Program untuk pengujian rich editor.</p>', 'urutan' => 99, 'published' => false]);
        Models\ProgramSub::create(['program_id' => $program->id, 'judul' => 'DEMO subprogram', 'deskripsi' => '<p>Materi subprogram.</p>', 'urutan' => 1]);
    }
}
