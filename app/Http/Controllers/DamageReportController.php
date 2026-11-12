<?php

namespace App\Http\Controllers;

use App\Enums\LaporanKerusakanStatus as Status;
use App\Jobs\SendDamageReportNotification;
use App\Models\Aset;
use App\Models\DamageReportItem;
use App\Models\DamageReportProgress;
use App\Models\FasilitasUmum;
use App\Models\Gedung;
use App\Models\LaporanKerusakan;
use App\Models\TechnicianLogbook;
use App\Models\TechnicianLogbookPhoto;
use App\Models\User;
use App\Services\DamageReportAccess;
use App\Services\DamageReportRevision;
use App\Services\DamageReportWorkflow;
use App\Services\ResidenceBuildingAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
        $reports = (clone $query)->with(['aset', 'kamar.lantai.gedung', 'gedung', 'fasilitasUmum', 'teknisi', 'photos', 'statusHistories', 'assignments.technician', 'progress.user', 'items.photos', 'complaints'])->latest('tanggal_lapor')->paginate(15)->withQueryString();
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
            'initialUser' => app(RolePageController::class)->userPayload($request), 'role' => $user->getRoleNames()->first(), 'page' => 'pelaporan',
            'reports' => $reports, 'filters' => [...$filters, 'date' => $date], 'summary' => $summary, 'today' => today()->toDateString(),
            'blocked_count' => (clone $query)->where('status', Status::SedangDikerjakan)->where('is_blocked', true)->count(),
            'daily' => DamageReportProgress::with(['user:id,nama', 'report:id,nomor_tiket,location_label'])->whereDate('work_date', $date)->whereIn('laporan_kerusakan_id', (clone $query)->select('id'))->latest()->paginate(20, ['*'], 'daily_page')->withQueryString(),
            'technicians' => $staff ? User::whereHas('roles', fn ($q) => $q->where('name', 'teknisi')->where('guard_name', 'web'))->where('status', 'aktif')->orderBy('nama')->get(['id', 'nama']) : [],
            'buildings' => $staff ? Gedung::query()->when(! DamageReportAccess::global($user) && $user->hasRole('fasilitator'), fn ($q) => $q->whereIn('id', ResidenceBuildingAccess::ids($user)))->get(['id', 'nama_gedung']) : [],
            'can_order' => $user->hasAnyRole(['pimpinan', 'superadmin']), 'can_report' => $user->can('create', LaporanKerusakan::class),
            'notifications' => $user->unreadNotifications()->where('type', SendDamageReportNotification::class)->latest()->limit(10)->get(['id', 'data']),
            'room' => $placement?->kamar,
            'resident_name' => $user->nama,
            'can_logbook' => $user->hasRole('teknisi') && $user->can('tiket.update'),
            'can_complain' => $user->hasRole('mahasiswa'),
            'logbooks' => TechnicianLogbook::with(['photos', 'user:id,nama'])->whereDate('work_date', $date)->when(! $user->hasAnyRole(['pimpinan', 'superadmin']), fn ($q) => $q->where('user_id', $user->id))
                ->when($filters['technician_id'] ?? null, fn ($q, $id) => $q->where('user_id', $id))->latest()->paginate(15, ['*'], 'logbook_page')->withQueryString(),
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

    public function completeItem(Request $request, DamageReportItem $item, DamageReportRevision $revision): RedirectResponse
    {
        $this->authorizePermission($request, 'tiket.update');
        Gate::authorize('complete', $item->report);
        $data = $request->validate(['note' => 'required|string|max:5000', 'photos' => 'nullable|array|max:5', 'photos.*' => 'file|mimes:jpg,jpeg,png|max:5120']);
        $paths = array_map(fn ($file): string => $file->store('laporan-kerusakan/after', 'local') ?: throw new \RuntimeException('Bukti gagal disimpan.'), app(TiketController::class)->uploads($request, 'photos'));
        try {
            $revision->completeItem($item, $request->user(), $data['note'], $paths);
            Storage::disk('local')->delete(array_diff($paths, $item->report->photos()->pluck('path')->all()));
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($paths);
            throw $exception;
        }

        return back()->with('toast', ['type' => 'success', 'message' => 'Item selesai dicatat. Laporan tetap dikerjakan sampai semua item dan bukti final terpenuhi.']);
    }

    public function logbook(Request $request, DamageReportRevision $revision): RedirectResponse
    {
        abort_unless($request->user()->hasRole('teknisi') && $request->user()->status === 'aktif', 403);
        $data = $request->validate(['work_date' => 'required|date_format:Y-m-d|before_or_equal:today', 'description' => 'required|string|max:5000', 'source' => 'required|in:other_work,leader_instruction', 'request_key' => 'required|uuid', 'photos' => 'required|array|min:1|max:5', 'photos.*' => 'file|mimes:jpg,jpeg,png|max:5120']);
        $files = app(TiketController::class)->uploads($request, 'photos');
        $paths = array_map(fn ($file): string => $file->store('technician-logbook', 'local') ?: throw new \RuntimeException('Foto logbook gagal disimpan.'), $files);
        try {
            $entry = $revision->logbook($request->user(), $data['work_date'], $data['description'], $data['source'], $paths, $data['request_key'], app(TiketController::class)->payloadHash($data, $files));
            Storage::disk('local')->delete(array_diff($paths, $entry->photos()->pluck('path')->all()));
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($paths);
            throw $exception;
        }

        return back()->with('toast', ['type' => 'success', 'message' => 'Logbook harian tersimpan tanpa membuat tiket kerusakan.']);
    }

    public function logbookPhoto(Request $request, TechnicianLogbookPhoto $photo): StreamedResponse
    {
        $user = $request->user();
        abort_unless($user->status === 'aktif' && ($photo->logbook->user_id === $user->id || $user->hasAnyRole(['pimpinan', 'superadmin'])), 403);
        abort_unless(Storage::disk('local')->exists($photo->path), 404);

        return Storage::disk('local')->response($photo->path);
    }

    public function complain(Request $request, LaporanKerusakan $laporan, DamageReportRevision $revision): RedirectResponse
    {
        Gate::authorize('view', $laporan);
        $data = $request->validate(['reason' => 'required|string|max:5000', 'item_id' => 'nullable|uuid', 'request_key' => 'required|uuid']);
        $revision->complain($laporan, $request->user(), $data['reason'], $data['item_id'] ?? null, $data['request_key']);

        return back()->with('toast', ['type' => 'success', 'message' => 'Komplain tercatat dan merujuk laporan sebelumnya. Status selesai lama tetap dipertahankan.']);
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
        $data = $request->validate(['aset_id' => 'required|uuid|exists:aset,id', 'reason' => 'required|string|max:2000', 'item_id' => 'nullable|uuid']);
        $workflow->linkAsset($laporan, $request->user(), $data['aset_id'], $data['reason'], $data['item_id'] ?? null);

        return back()->with('toast', ['type' => 'success', 'message' => 'Aset ditautkan dengan histori.']);
    }

    public function order(Request $request, DamageReportWorkflow $workflow): RedirectResponse
    {
        throw ValidationException::withMessages(['logbook' => 'Pekerjaan non-laporan dicatat teknisi melalui logbook, tanpa membuat tiket kerusakan.']);
    }
}
