<?php

namespace App\Http\Controllers;

use App\Enums\LaporanKerusakanStatus as Status;
use App\Models\Aset;
use App\Models\DamageReportProgress;
use App\Models\FasilitasUmum;
use App\Models\Gedung;
use App\Models\LaporanKerusakan;
use App\Models\User;
use App\Services\DamageReportAccess;
use App\Services\DamageReportWorkflow;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DamageReportController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->status === 'aktif' && $user->hasAnyRole(['superadmin', 'staff_admin', 'admin_layanan', 'admin_aset', 'pimpinan', 'fasilitator', 'teknisi', 'mahasiswa', 'go']), 403);
        $filters = $request->validate([
            'status' => ['nullable', Rule::in(array_column(Status::cases(), 'value'))],
            'gedung_id' => 'nullable|uuid', 'technician_id' => 'nullable|uuid', 'date' => 'nullable|date_format:Y-m-d',
        ]);
        $base = DamageReportAccess::query($user);
        $query = (clone $base)->when($filters['status'] ?? null, fn ($q, $value) => $q->where('status', $value))
            ->when($filters['gedung_id'] ?? null, fn ($q, $value) => $q->where('gedung_id', $value))
            ->when($filters['technician_id'] ?? null, fn ($q, $value) => $q->where(fn ($assigned) => $assigned->where('teknisi_id', $value)->orWhereHas('assignments', fn ($a) => $a->where('technician_id', $value)->whereNull('ended_at'))));
        $reports = (clone $query)->with(['aset', 'kamar.lantai.gedung', 'gedung', 'fasilitasUmum', 'teknisi', 'photos', 'statusHistories', 'assignments.technician', 'progress.user'])->latest('tanggal_lapor')->paginate(15)->withQueryString();
        $reports->through(fn (LaporanKerusakan $report): array => [
            ...$report->toArray(),
            'abilities' => collect(['claim', 'complete', 'progress', 'team', 'cancel', 'confirm', 'linkAsset'])->mapWithKeys(fn ($ability) => [$ability => $user->can($ability, $report) && (! in_array($ability, ['claim', 'complete', 'progress', 'team', 'cancel'], true) || $user->can('tiket.update'))])->all(),
            'linkable_assets' => $user->can('linkAsset', $report) ? Aset::where('kamar_id', $report->kamar_id)->where('fasilitas_umum_id', $report->fasilitas_umum_id)->get(['id', 'nama_aset']) : [],
        ]);
        $date = $filters['date'] ?? today()->toDateString();
        $summary = (clone $query)->selectRaw('status, COUNT(*) AS aggregate')->groupBy('status')->pluck('aggregate', 'status');
        $placement = $user->mahasiswaProfil?->penempatanKamar()->where('status', 'aktif')->with('kamar.lantai.gedung')->first();
        $staff = ! $user->hasRole('mahasiswa') || DamageReportAccess::global($user);
        return Inertia::render('teknisi/pelaporan', [
            'initialUser' => app(RolePageController::class)->userPayload($request), 'role' => $user->roles->first()?->name, 'page' => 'pelaporan',
            'reports' => $reports, 'filters' => [...$filters, 'date' => $date], 'summary' => $summary, 'today' => today()->toDateString(),
            'blocked_count' => (clone $query)->where('status', Status::SedangDikerjakan)->where('is_blocked', true)->count(),
            'daily' => DamageReportProgress::with(['user:id,nama', 'report:id,nomor_tiket,location_label'])->whereDate('work_date', $date)->whereIn('laporan_kerusakan_id', (clone $query)->select('id'))->latest()->paginate(20, ['*'], 'daily_page')->withQueryString(),
            'technicians' => $staff ? User::whereHas('roles', fn ($q) => $q->where('name', 'teknisi')->where('guard_name', 'web'))->where('status', 'aktif')->orderBy('nama')->get(['id', 'nama']) : [],
            'buildings' => $staff ? Gedung::query()->when(! DamageReportAccess::global($user) && $user->hasRole('fasilitator'), fn ($q) => $q->whereIn('id', \App\Services\ResidenceBuildingAccess::ids($user)))->get(['id', 'nama_gedung']) : [],
            'can_order' => $user->hasAnyRole(['pimpinan', 'superadmin']), 'can_report' => $user->can('create', LaporanKerusakan::class),
            'notifications' => $user->unreadNotifications()->where('type', \App\Jobs\SendDamageReportNotification::class)->latest()->limit(10)->get(['id', 'data']),
            'room' => $placement?->kamar,
            'assets' => $placement ? Aset::reportableFor($placement->kamar)->get(['id', 'nama_aset', 'fasilitas_umum_id']) : [],
            'facilities' => $placement ? FasilitasUmum::where('gedung_id', $placement->kamar->lantai->gedung_id)->get(['id', 'nama_fasilitas']) : [],
        ]);
    }

    public function claim(Request $request, LaporanKerusakan $laporan, DamageReportWorkflow $workflow): RedirectResponse
    {
        $this->authorizePermission($request, 'tiket.update');
        $workflow->claim($laporan, $request->user());
        return back()->with('toast', ['type' => 'success', 'message' => 'Tiket diambil.']);
    }

    public function readNotification(Request $request, string $notification): RedirectResponse
    {
        $request->user()->notifications()->whereKey($notification)->firstOrFail()->markAsRead();
        return back();
    }

    public function progress(Request $request, LaporanKerusakan $laporan, DamageReportWorkflow $workflow): RedirectResponse
    {
        $this->authorizePermission($request, 'tiket.update');
        Gate::authorize('progress', $laporan);
        $data = $request->validate(['description' => 'required|string|max:5000', 'work_date' => 'required|date_format:Y-m-d|before_or_equal:today|after_or_equal:'.$laporan->tanggal_lapor->toDateString(), 'is_blocked' => 'required|boolean', 'request_key' => 'required|uuid']);
        $workflow->progress($laporan, $request->user(), $data);
        return back()->with('toast', ['type' => 'success', 'message' => 'Progres harian tersimpan.']);
    }

    public function team(Request $request, LaporanKerusakan $laporan, DamageReportWorkflow $workflow): RedirectResponse
    {
        $this->authorizePermission($request, 'tiket.update');
        Gate::authorize('team', $laporan);
        $data = $request->validate(['technician_ids' => 'present|array|max:30', 'technician_ids.*' => 'required|uuid|distinct', 'reason' => 'required|string|max:2000']);
        $workflow->team($laporan, $request->user(), $data['technician_ids'], $data['reason']);
        return back()->with('toast', ['type' => 'success', 'message' => 'Anggota tim diperbarui.']);
    }

    public function cancel(Request $request, LaporanKerusakan $laporan, DamageReportWorkflow $workflow): RedirectResponse
    {
        $this->authorizePermission($request, 'tiket.update');
        $data = $request->validate(['reason' => 'required|string|max:2000']);
        $workflow->cancel($laporan, $request->user(), $data['reason']);
        return back()->with('toast', ['type' => 'success', 'message' => 'Pembatalan tercatat.']);
    }

    public function confirm(Request $request, LaporanKerusakan $laporan, DamageReportWorkflow $workflow): RedirectResponse
    {
        $workflow->confirm($laporan, $request->user());
        return back()->with('toast', ['type' => 'success', 'message' => 'Konfirmasi kejadian ditautkan ke tiket ini.']);
    }

    public function linkAsset(Request $request, LaporanKerusakan $laporan, DamageReportWorkflow $workflow): RedirectResponse
    {
        Gate::authorize('linkAsset', $laporan);
        $data = $request->validate(['aset_id' => 'required|uuid|exists:aset,id', 'reason' => 'required|string|max:2000']);
        $workflow->linkAsset($laporan, $request->user(), $data['aset_id'], $data['reason']);
        return back()->with('toast', ['type' => 'success', 'message' => 'Aset ditautkan dengan histori.']);
    }

    public function order(Request $request, DamageReportWorkflow $workflow): RedirectResponse
    {
        abort_unless($request->user()->hasAnyRole(['pimpinan', 'superadmin']), 403);
        $data = $request->validate([
            'gedung_id' => 'required|uuid|exists:gedung,id', 'kamar_id' => 'nullable|uuid|exists:kamar,id', 'fasilitas_umum_id' => 'nullable|uuid|exists:fasilitas_umum,id',
            'aset_id' => 'nullable|uuid|exists:aset,id', 'location_label' => 'required|string|max:255', 'deskripsi' => 'required|string|max:5000',
            'priority' => 'required|in:normal,high,urgent', 'different_incident_reason' => 'nullable|string|max:2000', 'request_key' => 'required|uuid',
            'foto_awal' => 'nullable|array|max:5', 'foto_awal.*' => 'file|mimes:jpg,jpeg,png|max:5120',
        ]);
        $paths = collect($request->file('foto_awal', []))->map(fn ($file) => $file->store('laporan-kerusakan/before', 'local'))->all();
        try {
            $data['request_hash'] = app(TiketController::class)->payloadHash($data, $request->file('foto_awal', []));
            $report = $workflow->order($request->user(), $data, $paths);
            Storage::disk('local')->delete(array_diff($paths, $report->photos()->pluck('path')->all()));
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($paths);
            throw $exception;
        }
        return back()->with('toast', ['type' => 'success', 'message' => 'Perintah pekerjaan tercatat.']);
    }
}
