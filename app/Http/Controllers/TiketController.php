<?php

namespace App\Http\Controllers;

use App\Actions\DamageReports\ClaimDamageReport;
use App\Actions\DamageReports\CompleteDamageReport;
use App\Actions\DamageReports\CreateDamageReport;
use App\Actions\DamageReports\TriageDamageReport;
use App\Models\LaporanKerusakan;
use App\Models\LaporanKerusakanPhoto;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class TiketController extends Controller
{
    public function store(Request $request, CreateDamageReport $create): RedirectResponse
    {
        $this->authorizePermission($request, 'tiket.create');

        Gate::authorize('create', LaporanKerusakan::class);

        $validated = $request->validate([
            'aset_id' => 'required|uuid|exists:aset,id',
            'deskripsi' => 'required|string',
            'foto_awal' => 'required|array|min:1|max:5',
            'foto_awal.*' => 'file|mimes:jpg,jpeg,png|max:5120',
        ]);

        $paths = collect($request->file('foto_awal', []))
            ->map(fn ($file) => $file->store('laporan-kerusakan/before', 'local'))
            ->all();
        try {
            $laporan = $create->handle($request->user(), $validated['deskripsi'], $paths, $validated['aset_id']);
        } catch (Throwable $exception) {
            Storage::disk('local')->delete($paths);
            throw $exception;
        }

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Tiket {$laporan->nomor_tiket} berhasil dibuat.",
        ]);
    }

    public function photo(Request $request, LaporanKerusakanPhoto $photo): StreamedResponse
    {
        Gate::authorize('view', $photo->report);
        abort_unless(Storage::disk('local')->exists($photo->path), 404);

        return Storage::disk('local')->response($photo->path);
    }

    public function update(
        Request $request,
        LaporanKerusakan $laporan,
        TriageDamageReport $triage,
        ClaimDamageReport $claim,
        CompleteDamageReport $complete,
    ): RedirectResponse {
        $this->authorizePermission($request, 'tiket.update');

        $validated = $request->validate([
            'status' => 'required|in:didisposisikan,sedang_dikerjakan,selesai,dibatalkan',
            'catatan_penyelesaian' => 'required_if:status,selesai|nullable|string|max:5000',
            'bukti_penyelesaian' => 'exclude_unless:status,selesai|required|array|min:1|max:5',
            'bukti_penyelesaian.*' => 'file|mimes:jpg,jpeg,png|max:5120',
        ]);

        $user = $request->user();
        if ($validated['status'] === 'didisposisikan') {
            $triage->handle($laporan, $user, null, $validated['catatan_penyelesaian'] ?? null);
        } elseif ($validated['status'] === 'sedang_dikerjakan') {
            $claim->handle($laporan, $user);
        } elseif ($validated['status'] === 'selesai') {
            Gate::authorize('complete', $laporan);
            $paths = collect($request->file('bukti_penyelesaian', []))
                ->map(fn ($file) => $file->store('laporan-kerusakan/after', 'local'))
                ->all();
            try {
                $complete->handle($laporan, $user, $validated['catatan_penyelesaian'] ?? '', $paths);
            } catch (Throwable $exception) {
                Storage::disk('local')->delete($paths);
                throw $exception;
            }
        } else {
            abort_unless($user->hasAnyRole(['superadmin', 'staff_admin', 'fasilitator']), 403);
            $laporan->update(['status' => 'dibatalkan']);
        }

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Tiket {$laporan->nomor_tiket} diperbarui.",
        ]);
    }
}
