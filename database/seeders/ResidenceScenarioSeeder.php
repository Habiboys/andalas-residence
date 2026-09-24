<?php

namespace Database\Seeders;

use App\Models;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ResidenceScenarioSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new \LogicException('Data demonstrasi hanya untuk lingkungan local atau testing.');
        }

        DB::transaction(function (): void {
            $this->masterData();
            foreach (self::scenarios() as $index => $scenario) {
                $this->resident($index + 1, ...$scenario);
            }
        });

        $this->command?->info('Akun skenario: <nama-skenario>@example.test; password: password. VA DEMO tidak dapat digunakan membayar.');
    }

    /** @return list<array{string, string, string}> */
    public static function scenarios(): array
    {
        $scenarios = [
            ['daftar-draft', 'local_non_kipk', 'draft'],
            ['daftar-review', 'local_non_kipk', 'submitted'],
            ['daftar-ditolak', 'local_non_kipk', 'rejected'],
            ['tagihan-belum-bayar', 'local_non_kipk', 'unpaid'],
            ['bayar-verifikasi', 'local_non_kipk', 'pending'],
            ['bayar-ditolak', 'local_non_kipk', 'payment_rejected'],
            ['cicilan-pengajuan', 'local_non_kipk', 'installment_requested'],
            ['cicilan-aktif', 'local_non_kipk', 'partial'],
            ['binaan-aktif', 'local_non_kipk', 'active'],
            ['kipk-penempatan', 'local_kipk', 'subsidy_waiting'],
            ['kipk-aktif', 'local_kipk', 'active'],
            ['internasional-gratis', 'international_free_facility', 'active'],
            ['internasional-bayar', 'international_student', 'active'],
            ['nonmahasiswa-aktif', 'non_student', 'active'],
            ['penghuni-lama', 'local_non_kipk', 'returning'],
            ['checkout-pengajuan', 'local_non_kipk', 'active'],
            ['checkout-siap', 'local_non_kipk', 'active'],
            ['checkout-rusak', 'local_non_kipk', 'active'],
            ['checkout-selesai', 'local_non_kipk', 'departed'],
            ['surat-modern', 'local_non_kipk', 'departed'],
            ['legacy-lunas', 'local_non_kipk', 'legacy'],
            ['legacy-belum-lunas', 'local_non_kipk', 'legacy'],
            ['legacy-bukan-alumni', 'student', 'legacy'],
            ['legacy-ditolak', 'local_non_kipk', 'legacy'],
            ['legacy-surat-terbit', 'local_non_kipk', 'legacy'],
            ['izin-otomatis', 'local_non_kipk', 'active'],
            ['izin-review', 'local_non_kipk', 'active'],
            ['izin-sampai', 'local_non_kipk', 'active'],
            ['izin-terlambat', 'local_non_kipk', 'active'],
            ['izin-kembali', 'local_non_kipk', 'active'],
        ];
        for ($i = 1; $i <= 24; $i++) {
            $scenarios[] = [sprintf('penghuni-%02d', $i), 'local_non_kipk', 'active'];
        }

        return $scenarios;
    }

    public static function student(string $scenario): Models\MahasiswaProfil
    {
        return Models\MahasiswaProfil::whereHas('user', fn ($query) => $query->where('email', $scenario.'@example.test'))->firstOrFail();
    }

    public static function staff(string $role): Models\User
    {
        return Models\User::where('email', $role.'@example.test')->firstOrFail();
    }

    public static function fixture(string $name, bool $pdf = false): string
    {
        $path = 'demo/fixtures/'.$name.($pdf ? '.pdf' : '.png');
        if (! Storage::disk('local')->exists($path)) {
            if ($pdf) {
                $contents = Pdf::loadHTML('<h1>DOKUMEN DEMO</h1><p>'.e($name).'</p><p>Data sintetis untuk pengujian Andalas Residence, bukan bukti transaksi asli.</p>')->output();
            } else {
                $image = imagecreatetruecolor(640, 360);
                imagefill($image, 0, 0, imagecolorallocate($image, 225, 235, 240));
                imagestring($image, 5, 30, 140, 'DEMO - '.substr($name, 0, 55), imagecolorallocate($image, 30, 55, 80));
                ob_start();
                imagepng($image);
                $contents = ob_get_clean();
                imagedestroy($image);
            }
            Storage::disk('local')->put($path, $contents);
        }

        return $path;
    }

    private function masterData(): void
    {
        foreach (['Indonesia', 'Malaysia', 'Jepang'] as $country) {
            Models\Country::firstOrCreate(['name' => $country]);
        }
        $province = Models\Province::firstOrCreate(['name' => 'Sumatera Barat']);
        foreach (['Padang', 'Bukittinggi', 'Payakumbuh'] as $city) {
            Models\City::firstOrCreate(['province_id' => $province->id, 'name' => $city]);
        }
        $year = max(2026, now()->year);
        Models\Periode::firstOrCreate(['nama_periode' => 'DEMO '.$year.'/'.($year + 1)], [
            'status' => 'aktif', 'tanggal_mulai' => now()->subMonths(2)->toDateString(), 'tanggal_selesai' => now()->addMonths(10)->toDateString(),
        ]);
        foreach (['superadmin', 'pimpinan', 'staff_admin', 'admin_layanan', 'admin_aset', 'fasilitator', 'teknisi', 'go', 'orang_tua'] as $index => $role) {
            $user = Models\User::firstOrCreate(['email' => $role.'@example.test'], [
                'nim_nip' => 'DEMO-STAFF-'.$index, 'nama' => 'Demo '.str_replace('_', ' ', $role),
                'password' => 'password', 'email_verified_at' => now(), 'no_hp' => '080000000000', 'gender' => 'laki_laki', 'status' => 'aktif',
                'client_profile_category' => $role === 'orang_tua' ? 'parent' : null,
            ]);
            if ($user->wasRecentlyCreated) {
                $user->assignRole($role);
            }
        }
        foreach (['KURSI' => 'Kursi belajar', 'MEJA' => 'Meja belajar', 'LAMPU' => 'Lampu ruangan'] as $code => $name) {
            Models\StokAset::firstOrCreate(['kode' => 'DEMO-'.$code], ['nama' => $name, 'kategori' => $code === 'LAMPU' ? 'elektronik' : 'furnitur', 'satuan' => 'unit', 'jumlah_total' => 150]);
        }
        foreach (['P' => 'laki_laki', 'W' => 'perempuan', 'T' => 'laki_laki'] as $code => $gender) {
            $image = self::fixture('gedung-'.$code);
            if (! Storage::disk('public')->exists($image)) {
                Storage::disk('public')->put($image, Storage::disk('local')->get($image));
            }
            $building = Models\Gedung::firstOrCreate(['kode_gedung' => 'DEMO-'.$code], ['nama_gedung' => 'Gedung Demo '.$code, 'gender_peruntukan' => $gender, 'alamat' => 'Kampus Limau Manis, Padang', 'foto' => $image]);
            for ($level = 1; $level <= 2; $level++) {
                $floor = Models\Lantai::firstOrCreate(['gedung_id' => $building->id, 'nomor_lantai' => $level], ['nama_lantai' => 'Lantai '.$level]);
                for ($number = 1; $number <= 10; $number++) {
                    $room = Models\Kamar::firstOrCreate(['lantai_id' => $floor->id, 'nomor_kamar' => $level.sprintf('%02d', $number)], [
                        'kapasitas' => 2, 'status' => $number === 10 ? 'maintenance' : 'kosong', 'tipe_kamar' => $level === 1 ? 'reguler' : 'premium', 'tarif_per_periode' => $level === 1 ? 1500000 : 2000000,
                    ]);
                    foreach (['KURSI', 'MEJA'] as $stockCode) {
                        $stock = Models\StokAset::where('kode', 'DEMO-'.$stockCode)->firstOrFail();
                        Models\Aset::firstOrCreate(['kode_inventaris' => 'DEMO-'.$code.'-'.$room->nomor_kamar.'-'.$stockCode], [
                            'stok_aset_id' => $stock->id, 'jumlah' => 2, 'kamar_id' => $room->id, 'nama_aset' => $stock->nama, 'kategori' => 'furnitur', 'kondisi' => 'baik', 'nilai_aset' => 300000,
                        ]);
                    }
                }
                $facility = Models\FasilitasUmum::firstOrCreate(['gedung_id' => $building->id, 'lantai_id' => $floor->id, 'nama_fasilitas' => 'Ruang belajar demo'], ['kategori' => 'ruang_bersama', 'kondisi' => 'baik']);
                Models\Aset::firstOrCreate(['kode_inventaris' => 'DEMO-'.$code.'-'.$level.'-LAMPU'], [
                    'stok_aset_id' => Models\StokAset::where('kode', 'DEMO-LAMPU')->firstOrFail()->id,
                    'jumlah' => 4, 'fasilitas_umum_id' => $facility->id, 'nama_aset' => 'Lampu ruang belajar', 'kategori' => 'elektronik', 'kondisi' => 'baik', 'nilai_aset' => 100000,
                ]);
            }
            if ($code === 'W') {
                Models\FasilitatorWilayah::firstOrCreate(['user_id' => self::staff('fasilitator')->id], ['gedung_id' => $building->id]);
            } elseif ($code === 'P') {
                $facilitator = Models\User::where('email', 'fasilitator@unand.ac.id')->firstOrFail();
                Models\FasilitatorWilayah::firstOrCreate(['user_id' => $facilitator->id], ['gedung_id' => $building->id]);
            }
        }
        foreach ([2023 => 1200000, 2024 => 1350000, 2025 => 1500000] as $year => $amount) {
            Models\LegacyResidenceRate::firstOrCreate(['angkatan' => $year], ['jumlah' => $amount]);
        }
    }

    private function resident(int $index, string $name, string $category, string $state): void
    {
        $cohort = in_array($state, ['legacy', 'returning']) ? '2025' : (string) max(2026, now()->year);
        $existing = Models\User::with('mahasiswaProfil')->where('email', $name.'@example.test')->first();
        if ($existing) {
            if ($category !== 'non_student' && $existing->nim_nip === 'DEMO-'.sprintf('%04d', $index)) {
                $existing->update(['nim_nip' => substr($existing->mahasiswaProfil?->angkatan ?? $cohort, -2).'9900'.sprintf('%04d', $index)]);
            }

            return;
        }
        $year = max(2026, now()->year);
        $period = Models\Periode::where('nama_periode', 'DEMO '.$year.'/'.($year + 1))->firstOrFail();
        $active = in_array($state, ['active', 'partial', 'returning', 'departed']);
        $buildingCode = $index % 3 === 0 ? 'W' : ($index % 7 === 0 ? 'T' : 'P');
        $user = Models\User::create([
            'email' => $name.'@example.test', 'nim_nip' => $category === 'non_student' ? 'DEMO-'.sprintf('%04d', $index) : substr($cohort, -2).'9900'.sprintf('%04d', $index), 'nama' => 'Demo '.ucwords(str_replace('-', ' ', $name)),
            'password' => 'password', 'email_verified_at' => now(), 'no_hp' => '080000'.sprintf('%06d', $index),
            'gender' => $buildingCode === 'W' ? 'perempuan' : 'laki_laki', 'status' => 'aktif', 'client_profile_category' => $category,
        ]);
        $user->assignRole('mahasiswa');
        $student = Models\MahasiswaProfil::create([
            'user_id' => $user->id, 'prodi_id' => $category === 'non_student' ? null : Models\Prodi::orderBy('name')->get()->get($index % 3)->id,
            'periode_id' => $period->id, 'city_id' => Models\City::where('name', 'Padang')->firstOrFail()->id,
            'angkatan' => $category === 'non_student' ? null : $cohort,
            'barcode_code' => 'DEMO-BC-'.$index, 'nik' => '00000000'.sprintf('%08d', $index),
            'status_huni' => $state === 'departed' ? 'keluar' : ($active ? 'aktif' : 'calon'),
            'tanggal_masuk' => $active ? now()->subMonth()->toDateString() : null,
            'bpjs_path' => self::fixture('bpjs', true), 'bukti_lulus_path' => self::fixture('bukti-lulus', true), 'riwayat_penyakit_path' => self::fixture('riwayat-kesehatan', true),
        ]);
        if ($state === 'legacy') {
            return;
        }
        $room = Models\Kamar::whereHas('lantai.gedung', fn ($query) => $query->where('kode_gedung', 'DEMO-'.$buildingCode))
            ->whereNotIn('id', Models\RoomPreference::select('kamar_id')->whereHas('residenceRegistration', fn ($query) => $query->whereIn('status', ['draft', 'submitted', 'verified'])))
            ->whereIn('status', ['kosong', 'terisi_sebagian'])->orderBy('nomor_kamar')->get()
            ->first(fn ($candidate) => Models\PenempatanKamar::where('kamar_id', $candidate->id)->where('status', 'aktif')->count() < $candidate->kapasitas);
        if (! $room) {
            throw new \LogicException('Kapasitas kamar demo tidak mencukupi.');
        }
        $status = in_array($state, ['draft', 'submitted', 'rejected']) ? $state : ($active ? 'accepted' : 'verified');
        $registration = Models\ResidenceRegistration::create([
            'student_profile_id' => $student->id, 'periode_id' => $period->id, 'status' => $status, 'is_kipk' => $category === 'local_kipk',
            'submitted_at' => $status !== 'draft' ? now()->subDays(35) : null,
            'reviewed_by' => in_array($status, ['verified', 'accepted', 'rejected']) ? self::staff('admin_layanan')->id : null,
            'reviewed_at' => in_array($status, ['verified', 'accepted', 'rejected']) ? now()->subDays(34) : null,
            'notes' => $status === 'rejected' ? 'DEMO: bukti kelulusan tidak terbaca, silakan lengkapi dokumen.' : 'Skenario pengujian '.$name,
        ]);
        if ($category !== 'local_kipk') {
            Models\RoomPreference::create(['residence_registration_id' => $registration->id, 'kamar_id' => $room->id, 'priority' => 1, 'room_type' => $room->tipe_kamar]);
        }
        $previous = null;
        foreach (match ($status) {
            'draft' => ['draft'], 'submitted' => ['draft', 'submitted'], 'rejected' => ['draft', 'submitted', 'rejected'],
            'verified' => ['draft', 'submitted', 'verified'], default => ['draft', 'submitted', 'verified', 'accepted'],
        } as $step) {
            Models\ResidenceRegistrationStatusHistory::create(['residence_registration_id' => $registration->id, 'from_status' => $previous, 'to_status' => $step, 'changed_by' => self::staff('admin_layanan')->id, 'notes' => 'Data demonstrasi']);
            $previous = $step;
        }
        if ($status === 'draft') {
            return;
        }
        $invoice = $this->billing($student, $name, $state, $category, (int) $room->tarif_per_periode);
        if ($status === 'rejected') {
            $invoice->update(['status' => 'batal']);
        }
        $registration->update(['tagihan_id' => $invoice->id]);
        if ($active) {
            $placement = Models\PenempatanKamar::create([
                'mahasiswa_id' => $student->id, 'kamar_id' => $room->id, 'periode_id' => $period->id,
                'tanggal_mulai' => now()->subMonth()->toDateString(), 'tanggal_selesai' => $state === 'departed' ? now()->subDays(2)->toDateString() : $period->tanggal_selesai,
                'status' => $state === 'departed' ? 'berakhir' : 'aktif', 'diproses_oleh' => self::staff('admin_layanan')->id, 'catatan' => 'Penempatan demonstrasi',
            ]);
            $registration->update(['penempatan_kamar_id' => $placement->id, 'completed_at' => now()->subMonth()]);
            Models\ResidenceHistory::create(['mahasiswa_id' => $student->id, 'event' => 'entered', 'occurred_at' => $state === 'returning' ? now()->subMonths(15) : now()->subMonth()]);
            if ($state === 'returning') {
                Models\PenempatanKamar::create([
                    'mahasiswa_id' => $student->id, 'kamar_id' => $room->id,
                    'periode_id' => Models\Periode::where('nama_periode', '2025/2026 Ganjil')->firstOrFail()->id,
                    'tanggal_mulai' => now()->subMonths(15)->toDateString(), 'tanggal_selesai' => now()->subMonths(3)->toDateString(),
                    'status' => 'berakhir', 'diproses_oleh' => self::staff('admin_layanan')->id, 'catatan' => 'Riwayat hunian pertama demo',
                ]);
                Models\ResidenceHistory::create(['mahasiswa_id' => $student->id, 'event' => 'checked_out', 'occurred_at' => now()->subMonths(3)]);
                Models\ResidenceHistory::create(['mahasiswa_id' => $student->id, 'event' => 'reentered', 'occurred_at' => now()->subMonth()]);
            }
            if ($state === 'departed') {
                Models\ResidenceHistory::create(['mahasiswa_id' => $student->id, 'event' => 'checked_out', 'occurred_at' => now()->subDays(2)]);
            } else {
                $occupied = Models\PenempatanKamar::where('kamar_id', $room->id)->where('status', 'aktif')->count();
                $room->update(['status' => $occupied >= $room->kapasitas ? 'penuh' : 'terisi_sebagian']);
            }
        }
        self::billingDocument($invoice, 'invoice');
        foreach (Models\PembayaranTagihan::where('mahasiswa_id', $student->id)->get() as $payment) {
            self::billingDocument($invoice, 'receipt', $payment);
        }
        if ($active) {
            self::billingDocument($invoice, 'residence_receipt');
        }
    }

    public function billing(Models\MahasiswaProfil $student, string $name, string $state, string $category, int $amount): Models\Tagihan
    {
        $subsidized = in_array($category, ['local_kipk', 'international_free_facility']);
        $total = $subsidized ? 0 : $amount;
        $paid = in_array($state, ['active', 'departed', 'returning']) ? $total : ($state === 'partial' ? (int) ($total / 2) : 0);
        $invoice = Models\Tagihan::create([
            'nomor' => 'DEMO-INV-'.$name, 'mahasiswa_id' => $student->id, 'status' => $total === $paid ? 'lunas' : ($paid > 0 ? 'sebagian' : 'terbit'),
            'mata_uang' => 'IDR', 'tanggal_terbit' => now()->subDays(34), 'jatuh_tempo' => $state === 'unpaid' ? now()->subDays(3) : now()->addMonth(),
            'subtotal' => $amount, 'total_penyesuaian' => $subsidized ? -$amount : 0, 'total' => $total, 'total_dibayar' => $paid,
            'cicilan_diminta_at' => in_array($state, ['partial', 'installment_requested']) ? now()->subDays(32) : null,
            'alasan_cicilan' => in_array($state, ['partial', 'installment_requested']) ? 'DEMO: permohonan pembayaran dua termin.' : null,
        ]);
        Models\TagihanItem::create(['tagihan_id' => $invoice->id, 'deskripsi' => 'Biaya hunian satu periode (demo)', 'kuantitas' => 1, 'harga_satuan' => $amount, 'jumlah' => $amount]);
        if ($subsidized) {
            Models\TagihanPenyesuaian::create(['tagihan_id' => $invoice->id, 'sumber' => $category === 'local_kipk' ? 'kipk_sponsor' : 'subsidi_internasional_gratis', 'deskripsi' => 'Tanggungan penghuni nol; subsidi demo', 'jumlah' => -$amount]);
        }
        $installment = null;
        if ($state === 'partial') {
            foreach ([1, 2] as $term) {
                $item = Models\JadwalCicilan::create(['tagihan_id' => $invoice->id, 'termin_ke' => $term, 'jatuh_tempo' => $term === 1 ? now()->subDays(28) : now()->addMonth(), 'jumlah' => $amount / 2, 'status' => $term === 1 ? 'lunas' : 'belum_bayar']);
                if ($term === 1) {
                    $installment = $item;
                }
            }
        }
        $va = Models\VirtualAccount::create(['mahasiswa_id' => $student->id, 'bank' => 'DEMO-NONAKTIF', 'nomor' => 'DEMO-'.$student->user->nim_nip, 'atas_nama' => $student->user->nama, 'aktif' => false]);
        if ($paid > 0 || in_array($state, ['pending', 'payment_rejected'])) {
            $manual = Models\Pembayaran::create([
                'kode_transaksi' => 'DEMO-PAY-'.$name, 'tagihan_id' => $invoice->id, 'mahasiswa_id' => $student->id,
                'jenis_pembayaran' => $state === 'partial' ? 'cicilan' : 'sewa_asrama', 'nominal' => $paid ?: $total, 'termin_ke' => 1,
                'metode_pembayaran' => 'transfer_bank', 'nama_bank' => 'BANK DEMO', 'nomor_rekening_pengirim' => '0000000000', 'atas_nama_pengirim' => $student->user->nama,
                'bukti_transfer_path' => self::fixture('bukti-transfer'), 'status' => $paid > 0 ? 'lunas' : ($state === 'pending' ? 'menunggu_verifikasi' : 'ditolak'),
                'diverifikasi_oleh' => $state === 'pending' ? null : self::staff('admin_layanan')->id,
                'catatan_verifikasi' => $state === 'payment_rejected' ? 'DEMO: nominal bukti tidak sesuai tagihan.' : null, 'tanggal_bayar' => now()->subDays(31),
            ]);
            if ($paid > 0) {
                $payment = Models\PembayaranTagihan::create(['referensi' => 'DEMO-POST-'.$name, 'mahasiswa_id' => $student->id, 'virtual_account_id' => $va->id, 'jumlah' => $paid, 'dibayar_pada' => now()->subDays(31), 'status' => 'posted', 'metadata' => ['demo' => true, 'pembayaran_id' => $manual->id]]);
                Models\AlokasiPembayaran::create(['pembayaran_tagihan_id' => $payment->id, 'tagihan_id' => $invoice->id, 'jadwal_cicilan_id' => $installment?->id, 'jumlah' => $paid]);
                Models\TransaksiKeuangan::create(['nomor_bukti' => 'DEMO-FIN-'.$name, 'kategori_id' => Models\KategoriTransaksi::where('tipe', 'pemasukan')->firstOrFail()->id, 'pembayaran_mahasiswa_id' => $manual->id, 'tipe' => 'pemasukan', 'nominal' => $paid, 'deskripsi' => 'Pembayaran hunian demo '.$name, 'tanggal_transaksi' => now()->subDays(31), 'dicatat_oleh' => self::staff('staff_admin')->id]);
            }
        }

        return $invoice;
    }

    public static function billingDocument(Models\Tagihan $invoice, string $kind, ?Models\PembayaranTagihan $payment = null): void
    {
        $invoice->load('mahasiswa.user', 'registration.periode', 'registration.placement.kamar.lantai.gedung');
        $number = $kind.'-'.$invoice->nomor;
        $path = 'demo/documents/'.$number.'.pdf';
        $html = view('pdf.billing-document', [
            'title' => $kind === 'invoice' ? 'TAGIHAN DEMO' : 'KWITANSI DEMO', 'number' => $number,
            'invoice' => $invoice, 'payment' => $payment, 'student' => $invoice->mahasiswa,
            'registration' => $invoice->registration, 'placement' => $invoice->registration?->placement,
        ])->render();
        $contents = Pdf::loadHTML(str_replace('DejaVu Sans', 'Helvetica', $html))->setPaper('a4')->output();
        Storage::disk('local')->put($path, $contents);
        Models\DokumenTagihan::create(['tagihan_id' => $invoice->id, 'pembayaran_tagihan_id' => $payment?->id, 'jenis' => $kind, 'nomor' => $number, 'path' => $path, 'checksum_sha256' => hash('sha256', $contents), 'template_version' => 'billing-v1', 'diterbitkan_pada' => now()]);
        gc_collect_cycles();
    }
}
