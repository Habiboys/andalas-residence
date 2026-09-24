<?php

namespace App\Http\Controllers;

use App\Models\ActivityAttendance;
use App\Models\Aset;
use App\Models\AuditLog;
use App\Models\CheckoutRequest;
use App\Models\FasilitasUmum;
use App\Models\Gedung;
use App\Models\JenisKegiatan;
use App\Models\Kamar;
use App\Models\KategoriTransaksi;
use App\Models\Kegiatan;
use App\Models\Kuesioner;
use App\Models\LaporanKerusakan;
use App\Models\LegacyResidenceRate;
use App\Models\MahasiswaProfil;
use App\Models\Pembayaran;
use App\Models\PenempatanKamar;
use App\Models\PengajuanBebasAsrama;
use App\Models\PengajuanIzinPulang;
use App\Models\PenilaianTeknisi;
use App\Models\ResidenceRegistration;
use App\Models\StokAset;
use App\Models\Tagihan;
use App\Models\TransaksiKeuangan;
use App\Models\User;
use App\Services\AttendanceEligibility;
use App\Services\LandingContentService;
use App\Services\MasterDataService;
use App\Services\ResidenceBuildingAccess;
use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
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
            'assigned_building' => $request->user()->hasRole('fasilitator') ? Gedung::whereIn('id', ResidenceBuildingAccess::ids($request->user()))->first(['id', 'kode_gedung', 'nama_gedung']) : null,
            'page' => $page,
            ...$this->pagePayload($request, $page),
        ]);
    }

    private function pagePayload(Request $request, string $page): array
    {
        return match ($page) {
            'dashboard' => [
                'stats' => $this->dashboardStats($request),
                'billing' => $request->user()->hasRole('mahasiswa')
                    ? Tagihan::where('mahasiswa_id', $request->user()->mahasiswaProfil?->id)->where('status', '!=', 'batal')->get()
                    : [],
                'absensi' => $request->user()->hasRole('fasilitator')
                    ? ActivityAttendance::where('is_present', true)->whereHas('session.kegiatan', fn ($query) => $query->whereIn('gedung_id', ResidenceBuildingAccess::ids($request->user())))->whereDate('attended_at', today())->get()
                    : [],
                'inspection_pending' => $request->user()->hasRole('go')
                    ? CheckoutRequest::whereNotIn('status', ['selesai', 'ditolak'])->whereHas('inspection', fn ($query) => $query->where('status', '!=', 'selesai'))->count()
                    : 0,
                'children' => $request->user()->hasRole('orang_tua')
                    ? $request->user()->parentStudentLinks()->with(['studentProfile.user', 'studentProfile.penempatanKamar.kamar.lantai.gedung'])->get()
                    : [],
                'pembayaran' => $this->payments($request),
                ...($request->user()->hasRole('pimpinan') ? ['keuangan' => TransaksiKeuangan::query()->latest()->get(), 'tiket' => $this->tickets($request)] : []),
            ],
            'registration' => [
                'periode' => MasterDataService::periodeList(),
                'billing' => Tagihan::with(['items', 'jadwalCicilan', 'dokumen'])->where('mahasiswa_id', $request->user()->mahasiswaProfil?->id)->latest()->get(),
                'rooms' => \App\Services\RoomEligibility::available()->get()->filter(fn ($room) => \App\Services\RoomEligibility::allows($room->lantai->gedung, $request->user()))->values(),
                'gedung' => Gedung::orderBy('kode_gedung')->get()->filter(fn ($building) => \App\Services\RoomEligibility::allows($building, $request->user()))->values(),
                'registration' => ResidenceRegistration::with(['roomPreferences.kamar', 'periode', 'tagihan'])->where('student_profile_id', $request->user()->mahasiswaProfil?->id)->latest()->get(),
            ],
            'registration-review' => [
                'registrations' => ResidenceRegistration::with(['studentProfile.user', 'studentProfile.prodi', 'roomPreferences.kamar.lantai.gedung', 'periode', 'tagihan'])->latest()->get(),
                'rooms' => \App\Services\RoomEligibility::available()->get(),
            ],
            'checkout-approval', 'checkout-inspection' => [
                'checkout' => CheckoutRequest::with(['inspection.findings.aset', 'placement.kamar.lantai.gedung', 'placement.kamar.aset', 'mahasiswa.user'])
                    ->when(
                        $page === 'checkout-approval' && $request->user()->hasRole('fasilitator'),
                        fn ($query) => $query->whereHas('placement.kamar.lantai', fn ($floors) => $floors->whereIn('gedung_id', ResidenceBuildingAccess::ids($request->user())))
                    )
                    ->latest()
                    ->get(),
            ],
            'data-mahasiswa' => [
                'mahasiswa' => MahasiswaProfil::with(['user', 'prodi', 'periode', 'penempatanKamar.kamar.lantai.gedung'])->get(),
                'fakultas' => \App\Models\Faculty::orderBy('name')->get(['id', 'name']),
                'departemen' => \App\Models\Departemen::orderBy('name')->get(['id', 'name', 'faculty_id']),
                'prodi' => \App\Models\Prodi::orderBy('name')->get(['id', 'name', 'jenjang', 'departemen_id']),
                'periode' => MasterDataService::periodeList(),
            ],
            'tagihan', 'verifikasi-pembayaran' => [
                'pembayaran' => $this->payments($request),
                'billing' => Tagihan::with(['mahasiswa.user', 'mahasiswa.prodi', 'jadwalCicilan', 'dokumen'])
                    ->when($request->user()->hasRole('mahasiswa'), fn ($query) => $query->where('mahasiswa_id', $request->user()->mahasiswaProfil?->id))
                    ->latest()->get(),
            ],
            'detail-kamar' => ['penempatan' => PenempatanKamar::with('kamar.lantai.gedung')->whereHas('mahasiswa', fn ($q) => $q->where('user_id', $request->user()->id))->get()],
            'checkout' => ['checkout' => CheckoutRequest::with(['inspection', 'placement.kamar.lantai.gedung'])->where('mahasiswa_id', $request->user()->mahasiswaProfil?->id)->latest()->get()],
            'bebas-asrama' => ['bebas_asrama' => PengajuanBebasAsrama::with(['mahasiswa.user', 'tagihan'])->where('mahasiswa_id', $request->user()->mahasiswaProfil?->id)->latest()->get()],
            'lapor-kerusakan' => $this->damageReportPayload($request),
            'tiket-masuk', 'update-tiket' => ['tiket' => $this->tickets($request)],
            'jadwal-kegiatan' => $this->activitiesPayload($request),
            'absensi' => [
                'absensi' => ActivityAttendance::with(['mahasiswa.user', 'session.kegiatan'])
                    ->when($request->user()->hasRole('mahasiswa'), fn ($query) => $query->where('mahasiswa_id', $request->user()->mahasiswaProfil?->id))
                    ->when($request->user()->hasRole('fasilitator'), fn ($query) => $query->whereHas('session', fn ($sessions) => $sessions->where('facilitator_id', $request->user()->id)))
                    ->latest('attended_at')->get(),
                'attendance_attempt' => $request->session()->get('attendance_attempt'),
            ],
            'monitoring-kamar' => ['gedung' => $this->gedungTree($request->user())],
            'penempatan-kamar' => [
                'mahasiswa' => MahasiswaProfil::with(['user', 'prodi', 'periode', 'penempatanKamar.kamar.lantai.gedung'])->get(),
                'penempatan' => PenempatanKamar::with([
                    'mahasiswa.user',
                    'mahasiswa.prodi',
                    'mahasiswa.pembayaran' => fn ($query) => $query->latest('tanggal_bayar'),
                    'kamar.lantai.gedung',
                ])->latest()->get(),
                'gedung' => $this->gedungTree($request->user()),
            ],
            'pemetaan-kamar' => ['gedung' => $this->gedungTree($request->user())],
            'kelola-bangunan' => ['gedung' => $this->buildingManagementTree()],
            'kelola-aset' => $this->assetPayload($request),
            'stok-aset' => $this->stockPayload($request),
            'kelola-profil' => ['contents' => LandingContentService::contents()],
            'kelola-informasi' => ['informasi' => LandingContentService::informasi()],
            'kelola-program' => ['program' => LandingContentService::programs()],
            'kelola-testimoni' => ['testimoni' => LandingContentService::testimonials()],
            'jadwal' => ['kegiatan' => $this->activityQuery($request)->with('gedung')->latest('tanggal_mulai')->get()],
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
            'approval-bebas-asrama' => ['bebas_asrama' => PengajuanBebasAsrama::with(['mahasiswa.user', 'tagihan'])->latest()->get(), 'legacy_rates' => LegacyResidenceRate::orderBy('angkatan')->get()],
            'perizinan' => $this->leavePayload($request),
            'akun-internal' => ['users' => $this->internalUsers(), 'roles' => $this->internalRoles()],
            'audit-log' => ['audit_logs' => AuditLog::with('user')->latest()->limit(200)->get()],
            default => [],
        };
    }

    private function activityQuery(Request $request): EloquentBuilder
    {
        $user = $request->user();
        $query = Kegiatan::query();
        if ($user->hasRole('fasilitator')) {
            $query->whereIn('gedung_id', ResidenceBuildingAccess::ids($user));
        } elseif ($user->hasRole('mahasiswa')) {
            $buildingIds = Gedung::whereHas('lantai.kamar.penempatanKamar', fn ($placements) => $placements
                ->where('mahasiswa_id', $user->mahasiswaProfil?->id)->where('status', 'aktif'))->pluck('id');
            $query->whereIn('gedung_id', $buildingIds);
        }

        return $query;
    }

    private function activitiesPayload(Request $request): array
    {
        return [
            'kegiatan' => $this->activityQuery($request)->with(['gedung', 'attendanceSession'])->latest('tanggal_mulai')->get(),
            'jenis_kegiatan' => JenisKegiatan::orderBy('is_other')->orderBy('nama')->get(),
            'gedung' => Gedung::query()->when($request->user()->hasRole('fasilitator'), fn ($query) => $query->whereIn('id', ResidenceBuildingAccess::ids($request->user())))->orderBy('nama_gedung')->get(['id', 'nama_gedung']),
            'activity_session_id' => $request->session()->get('activity_session_id'),
            'can_manage' => $request->user()->can('kegiatan.manage'),
        ];
    }

    private function dashboardStats(Request $request): array
    {
        if ($request->user()->hasRole('fasilitator')) {
            $ids = ResidenceBuildingAccess::ids($request->user());
            $rooms = Kamar::whereHas('lantai', fn ($query) => $query->whereIn('gedung_id', $ids));

            return [
                'okupansi' => ['total_kamar' => (clone $rooms)->count(), 'penuh' => (clone $rooms)->where('status', 'penuh')->count(), 'kosong' => (clone $rooms)->where('status', 'kosong')->count()],
                'penghuni_aktif' => MahasiswaProfil::where('status_huni', 'aktif')->whereHas('penempatanKamar', fn ($query) => $query->where('status', 'aktif')->whereHas('kamar.lantai', fn ($floors) => $floors->whereIn('gedung_id', $ids)))->count(),
            ];
        }

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

    private function gedungTree(?User $user = null): array
    {
        $detailed = $user === null || ! $user->hasRole('mahasiswa');

        return Gedung::with([
            'lantai.kamar.penempatanKamar.mahasiswa.user',
            ...$detailed ? [
                'lantai.kamar.aset',
                'lantai.kamar.penempatanKamar.mahasiswa.prodi',
                'lantai.kamar.penempatanKamar.mahasiswa.pembayaran' => fn ($query) => $query->latest('tanggal_bayar'),
            ] : [],
        ])->get()->toArray();
    }

    private function leavePayload(Request $request): array
    {
        $student = $request->user()->mahasiswaProfil;
        $reviewer = $request->user()->hasAnyRole(['fasilitator', 'superadmin']);
        if ($reviewer) {
            $this->authorizePermission($request, 'perizinan.review');
        }
        $query = PengajuanIzinPulang::with(['mahasiswa.user', 'gedung', 'penyetuju']);
        if ($reviewer && ! $request->user()->hasRole('superadmin')) {
            $query->whereIn('gedung_id', ResidenceBuildingAccess::ids($request->user()));
        } elseif (! $reviewer) {
            $query->where('mahasiswa_id', $student?->id);
        }

        return [
            'perizinan' => $query->latest()->get(),
            'reviewer' => $reviewer,
            'canSubmit' => ! $reviewer && $student?->status_huni === 'aktif' && $student->penempatanKamar()->where('status', 'aktif')->exists(),
        ];
    }

    private function stockPayload(Request $request): array
    {
        $this->authorizePermission($request, 'stok.manage');

        return ['stok' => StokAset::withSum('aset as jumlah_ditempatkan', 'jumlah')->orderBy('nama')->get()];
    }

    private function assetPayload(Request $request): array
    {
        $this->authorizePermission($request, 'aset.view');
        $scoped = $request->user()->hasRole('fasilitator') && ! $request->user()->hasRole('superadmin');
        $ids = ResidenceBuildingAccess::ids($request->user());

        return [
            'aset' => Aset::with(['stokAset', 'kamar.lantai.gedung', 'fasilitasUmum.gedung'])
                ->when($scoped, fn ($query) => $query->where(fn ($locations) => $locations->whereHas('kamar.lantai', fn ($rooms) => $rooms->whereIn('gedung_id', $ids))->orWhereHas('fasilitasUmum', fn ($facilities) => $facilities->whereIn('gedung_id', $ids))))->get(),
            'gedung' => array_values(array_filter($this->buildingManagementTree(), fn (array $building): bool => ! $scoped || in_array($building['id'], $ids, true))),
            'fasilitas_umum' => FasilitasUmum::with('gedung')->when($scoped, fn ($query) => $query->whereIn('gedung_id', $ids))->orderBy('nama_fasilitas')->get(),
            'stok' => StokAset::withSum('aset as jumlah_ditempatkan', 'jumlah')->orderBy('nama')->get(),
        ];
    }

    private function buildingManagementTree(): array
    {
        return Gedung::query()
            ->select(['id', 'kode_gedung', 'nama_gedung', 'gender_peruntukan', 'alamat', 'deskripsi', 'foto'])
            ->with([
                'lantai:id,gedung_id,nomor_lantai,nama_lantai',
                'lantai.kamar:id,lantai_id,nomor_kamar,kapasitas,status,tipe_kamar,tarif_per_periode',
            ])
            ->orderBy('kode_gedung')
            ->get()
            ->toArray();
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
        if (! $request->user()->hasAnyRole(['mahasiswa', 'admin_layanan', 'staff_admin', 'superadmin', 'pimpinan'])) {
            return collect();
        }

        return Pembayaran::with(['mahasiswa.user', 'mahasiswa.prodi', 'tagihan', 'verifikator'])
            ->when(
                $request->user()->hasRole('mahasiswa'),
                fn ($q) => $q->where('mahasiswa_id', $request->user()->mahasiswaProfil?->id)
            )
            ->latest()
            ->get();
    }

    /** @return array<string, mixed> */
    private function damageReportPayload(Request $request): array
    {
        $placement = $request->user()->mahasiswaProfil?->penempatanKamar()
            ->where('status', 'aktif')->with('kamar.lantai.gedung')->first();
        $canReport = $request->user()->can('create', LaporanKerusakan::class);

        return [
            'can_report' => $canReport,
            'room' => $placement?->kamar,
            'assets' => $canReport && $placement
                ? Aset::query()->reportableFor($placement->kamar)->with(['kamar.lantai.gedung', 'fasilitasUmum.gedung'])->orderBy('nama_aset')->get()
                : [],
            'reports' => LaporanKerusakan::query()->where('dilaporkan_oleh', $request->user()->id)
                ->with(['aset.fasilitasUmum', 'kamar'])->latest('tanggal_lapor')->get(),
        ];
    }

    private function tickets(Request $request)
    {
        return LaporanKerusakan::with(['aset.fasilitasUmum.gedung', 'kamar.lantai.gedung', 'pelapor', 'teknisi', 'penilaian', 'photos'])
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
            'student_stage' => $user->mahasiswaProfil?->angkatan ? ((int) $user->mahasiswaProfil->angkatan === now()->year ? 'Mahasiswa baru' : 'Mahasiswa angkatan lama') : null,
            'needs_service_selection' => $user->status === 'aktif' && $user->mahasiswaProfil?->status_huni === 'calon',
            'barcode_code' => $user->mahasiswaProfil?->barcode_code,
            'status_huni' => $user->mahasiswaProfil?->status_huni,
            'client_profile_category' => $user->client_profile_category?->value,
            'attendance_eligible' => $user->mahasiswaProfil && app(AttendanceEligibility::class)->isEligible($user->mahasiswaProfil, now()),
        ];
    }
}
