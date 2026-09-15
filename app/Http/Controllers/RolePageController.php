<?php

namespace App\Http\Controllers;

use App\Models\AbsensiSholat;
use App\Models\Aset;
use App\Models\AuditLog;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\KategoriTransaksi;
use App\Models\Kegiatan;
use App\Models\Kuesioner;
use App\Models\LaporanKerusakan;
use App\Models\MahasiswaProfil;
use App\Models\Pembayaran;
use App\Models\PenempatanKamar;
use App\Models\PengajuanBebasAsrama;
use App\Models\PengajuanIzinPulang;
use App\Models\PenilaianTeknisi;
use App\Models\TransaksiKeuangan;
use App\Models\User;
use App\Services\LandingContentService;
use App\Services\MasterDataService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class RolePageController extends Controller
{
    public function show(Request $request): Response
    {
        $component = (string) $request->route()->defaults['component'];
        $role = (string) $request->route()->defaults['role'];
        $page = (string) $request->route()->defaults['page'];

        return Inertia::render($component, [
            'initialUser' => $this->userPayload($request),
            'role' => $role,
            'page' => $page,
            ...$this->pagePayload($request, $page),
        ]);
    }

    private function pagePayload(Request $request, string $page): array
    {
        return match ($page) {
            'dashboard' => [
                'stats' => $this->dashboardStats(),
                'pembayaran' => $this->payments($request),
                ...($request->user()->hasRole('pimpinan') ? ['keuangan' => TransaksiKeuangan::query()->latest()->get()] : []),
            ],
            'data-mahasiswa' => [
                'mahasiswa' => MahasiswaProfil::with(['user', 'prodi', 'periode', 'penempatanKamar.kamar.lantai.gedung'])->get(),
                'prodi' => MasterDataService::prodiList(),
                'periode' => MasterDataService::periodeList(),
            ],
            'tagihan', 'verifikasi-pembayaran' => ['pembayaran' => $this->payments($request)],
            'detail-kamar' => ['penempatan' => PenempatanKamar::with('kamar.lantai.gedung')->whereHas('mahasiswa', fn ($q) => $q->where('user_id', $request->user()->id))->get()],
            'tiket-masuk', 'update-tiket' => ['tiket' => $this->tickets($request)],
            'scan-barcode', 'rekap-kehadiran', 'absensi' => [
                'absensi' => AbsensiSholat::with(['mahasiswa.user', 'scanner'])->latest('waktu_scan')->get(),
                'scan_result' => $request->session()->get('scan_result'),
            ],
            'monitoring-kamar' => ['gedung' => $this->gedungTree()],
            'penempatan-kamar' => [
                'mahasiswa' => MahasiswaProfil::with(['user', 'prodi', 'periode', 'penempatanKamar.kamar.lantai.gedung'])->get(),
                'penempatan' => PenempatanKamar::with(['mahasiswa.user', 'kamar.lantai.gedung'])->latest()->get(),
                'gedung' => $this->gedungTree(),
                'auto_preview' => $request->session()->get('auto_preview'),
            ],
            'pemetaan-kamar', 'kelola-bangunan' => ['gedung' => $this->gedungTree()],
            'kelola-aset' => ['aset' => Aset::with(['kamar', 'fasilitasUmum'])->get(), 'gedung' => $this->gedungTree()],
            'kelola-profil' => ['contents' => LandingContentService::contents()],
            'kelola-informasi' => ['informasi' => LandingContentService::informasi()],
            'kelola-program' => ['program' => LandingContentService::programs()],
            'kelola-testimoni' => ['testimoni' => LandingContentService::testimonials()],
            'jadwal', 'jadwal-kegiatan' => ['kegiatan' => Kegiatan::with('partisipan')->latest('tanggal_mulai')->get()],
            'laporan-keuangan', 'keuangan' => [
                'transaksi' => TransaksiKeuangan::with(['kategori', 'pencatat'])->latest('tanggal_transaksi')->get(),
                'kategori' => KategoriTransaksi::all(),
                'stats' => $this->keuanganStats(),
            ],
            'laporan-aset' => [
                'aset' => Aset::with(['kamar', 'fasilitasUmum'])->get(),
                'tiket' => $this->tickets($request),
            ],
            'riwayat-penilaian', 'penilaian-teknisi' => [
                'performance' => $this->teknisiPerformance(),
                ...($page === 'penilaian-teknisi' ? [
                    'tiket' => $this->tickets($request),
                    'kuesioner' => Kuesioner::with('pertanyaan.opsi')->get(),
                ] : []),
            ],
            'approval-bebas-asrama' => ['bebas_asrama' => PengajuanBebasAsrama::with(['mahasiswa.user'])->latest()->get()],
            'approval-izin-pulang' => ['izin_pulang' => PengajuanIzinPulang::with(['mahasiswa.user'])->latest()->get()],
            'akun-internal' => ['users' => $this->internalUsers(), 'roles' => $this->internalRoles()],
            'audit-log' => ['audit_logs' => AuditLog::with('user')->latest()->limit(200)->get()],
            default => [],
        };
    }

    private function dashboardStats(): array
    {
        return [
            'okupansi' => [
                'total_kamar' => Kamar::count(),
                'penuh' => Kamar::where('status', 'penuh')->count(),
                'kosong' => Kamar::where('status', 'kosong')->count(),
            ],
            'pembayaran_pending' => Pembayaran::where('status', 'menunggu_verifikasi')->count(),
            'tiket_aktif' => LaporanKerusakan::whereNotIn('status', ['selesai', 'dibatalkan'])->count(),
            'pengajuan_pending' => PengajuanBebasAsrama::where('status', 'diajukan')->count() + PengajuanIzinPulang::where('status', 'diajukan')->count(),
            'penghuni_aktif' => MahasiswaProfil::where('status_huni', 'aktif')->count(),
        ];
    }

    private function keuanganStats(): array
    {
        $pemasukan = (float) TransaksiKeuangan::where('tipe', 'pemasukan')->sum('nominal');
        $pengeluaran = (float) TransaksiKeuangan::where('tipe', 'pengeluaran')->sum('nominal');

        return [
            'saldo' => $pemasukan - $pengeluaran,
            'pemasukan' => $pemasukan,
            'pengeluaran' => $pengeluaran,
            'pembayaran_pending' => (float) Pembayaran::where('status', 'menunggu_verifikasi')->sum('nominal'),
            'pembayaran_lunas' => (float) Pembayaran::where('status', 'lunas')->sum('nominal'),
            'jumlah_transaksi' => TransaksiKeuangan::count(),
        ];
    }

    private function teknisiPerformance(): array
    {
        $results = [];
        foreach (User::role('teknisi')->get() as $user) {
            $penilaian = PenilaianTeknisi::where('teknisi_id', $user->id)->where('status', 'final')->get();
            $tiketSelesai = LaporanKerusakan::where('teknisi_id', $user->id)->where('status', 'selesai')->count();
            $results[] = [
                'teknisi_id' => $user->id,
                'nama' => $user->nama,
                'nim_nip' => $user->nim_nip,
                'rata_skor' => $penilaian->avg('total_skor'),
                'total_tiket' => $tiketSelesai,
                'total_penilaian' => $penilaian->count(),
            ];
        }

        return $results;
    }

    private function gedungTree(): array
    {
        return Gedung::with(['lantai.kamar.penempatanKamar.mahasiswa.user'])->get()->toArray();
    }

    private function internalUsers(): ?array
    {
        if (! $this->isSuperadmin(request())) {
            return null;
        }

        return User::role(['superadmin', 'pimpinan', 'staff_admin', 'fasilitator', 'teknisi'])
            ->with('roles')
            ->orderBy('nama')
            ->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'nim_nip' => $u->nim_nip,
                'nama' => $u->nama,
                'email' => $u->email,
                'no_hp' => $u->no_hp,
                'status' => $u->status,
                'roles' => $u->roles->pluck('name'),
            ])
            ->values()
            ->all();
    }

    private function internalRoles(): ?array
    {
        if (! $this->isSuperadmin(request())) {
            return null;
        }

        return Role::where('guard_name', 'web')
            ->whereNotIn('name', ['mahasiswa'])
            ->orderBy('name')
            ->get()
            ->map(fn (Role $r) => [
                'name' => $r->name,
                'users_count' => User::role($r->name)->count(),
            ])
            ->values()
            ->all();
    }

    private function isSuperadmin(Request $request): bool
    {
        return $request->user()?->hasRole('superadmin') ?? false;
    }

    private function payments(Request $request)
    {
        return Pembayaran::with(['mahasiswa.user', 'verifikator'])
            ->when(
                $request->user()->hasRole('mahasiswa'),
                fn ($q) => $q->where('mahasiswa_id', $request->user()->mahasiswaProfil?->id)
            )
            ->latest()
            ->get();
    }

    private function tickets(Request $request)
    {
        return LaporanKerusakan::with(['aset', 'kamar', 'pelapor', 'teknisi', 'penilaian'])
            ->when($request->user()->hasRole('teknisi'), fn ($q) => $q->where(fn ($b) => $b->whereNull('teknisi_id')->orWhere('teknisi_id', $request->user()->id)))
            ->latest('tanggal_lapor')
            ->get();
    }

    public function userPayload(Request $request): array
    {
        /** @var User $user */
        $user = $request->user()->load('roles', 'mahasiswaProfil.prodi');
        $role = $user->roles->first()?->name ?? 'mahasiswa';

        return [
            'id' => $user->id,
            'nim' => $user->nim_nip,
            'nama' => $user->nama,
            'email' => $user->email,
            'role' => $role,
            'raw_role' => $role,
            'no_hp' => $user->no_hp,
            'prodi' => $user->mahasiswaProfil?->prodi?->name,
            'angkatan' => $user->mahasiswaProfil?->angkatan,
            'barcode_code' => $user->mahasiswaProfil?->barcode_code,
            'status_huni' => $user->mahasiswaProfil?->status_huni,
        ];
    }
}
