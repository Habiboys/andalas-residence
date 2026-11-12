<?php

namespace App\Http\Controllers;

use App\Actions\DamageReports\ClaimDamageReport;
use App\Actions\DamageReports\CompleteDamageReport;
use App\Actions\DamageReports\CreateDamageReport;
use App\Actions\DamageReports\TriageDamageReport;
use App\Models\LaporanKerusakan;
use App\Models\LaporanKerusakanPhoto;
use App\Services\DamageReportRevision;
use App\Services\DamageReportWorkflow;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class TiketController extends Controller
{
    public function store(Request $request, CreateDamageReport $create): RedirectResponse
    {
        $this->authorizePermission($request, 'tiket.create');

        Gate::authorize('create', LaporanKerusakan::class);

        $validated = $request->validate([
            'aset_id' => 'nullable|uuid|exists:aset,id',
            'deskripsi' => 'required_without:items|nullable|string|max:5000',
            'items' => 'nullable|array|min:1|max:30',
            'items.*.description' => 'required|string|max:5000',
            'items.*.aset_id' => 'nullable|uuid|exists:aset,id',
            'items.*.location_label' => 'nullable|string|max:255',
            'items.*.photos' => 'nullable|array|max:5',
            'items.*.photos.*' => 'file|mimes:jpg,jpeg,png|max:5120',
            'fasilitas_umum_id' => 'nullable|uuid|exists:fasilitas_umum,id',
            'location_label' => 'nullable|string|max:255',
            'different_incident_reason' => 'nullable|string|max:2000',
            'request_key' => 'nullable|uuid',
            'foto_awal' => 'nullable|array|max:5',
            'foto_awal.*' => 'file|mimes:jpg,jpeg,png|max:5120',
        ]);

        $paths = array_map(fn ($file): string => $file->store('laporan-kerusakan/before', 'local') ?: throw new \RuntimeException('Foto gagal disimpan.'), $this->uploads($request, 'foto_awal'));
        try {
            $validated['request_hash'] = $this->payloadHash($validated, $this->uploads($request, 'foto_awal'));
            if (! empty($validated['items'])) {
                $items = [];
                $hashItems = [];
                foreach ($validated['items'] as $index => $item) {
                    $files = $this->uploads($request, 'items.'.$index.'.photos');
                    unset($item['photos']);
                    $itemPaths = array_map(fn ($file): string => $file->store('laporan-kerusakan/before', 'local') ?: throw new \RuntimeException('Foto gagal disimpan.'), $files);
                    $paths = array_merge($paths, $itemPaths);
                    $items[] = ['description' => $item['description'], 'aset_id' => $item['aset_id'] ?? null, 'location_label' => $item['location_label'] ?? null, 'paths' => $itemPaths];
                    $hashItems[] = [...$item, 'photos' => array_map(fn ($file) => hash_file('sha256', $file->getRealPath()), $files)];
                }
                $hash = hash('sha256', json_encode([$hashItems, $validated['fasilitas_umum_id'] ?? null], JSON_THROW_ON_ERROR));
                $laporan = app(DamageReportRevision::class)->submit($request->user(), $items, $validated['fasilitas_umum_id'] ?? null, $validated['request_key'] ?? null, $hash);
            } else {
                $laporan = $create->handle($request->user(), $validated['deskripsi'], $paths, $validated['aset_id'] ?? null, $validated);
            }
            Storage::disk('local')->delete(array_diff($paths, $laporan->photos()->pluck('path')->all()));
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
            'reason' => 'required_if:status,dibatalkan|nullable|string|max:2000',
            'request_key' => 'nullable|uuid',
            'participant_ids' => 'nullable|array|max:30',
            'participant_ids.*' => 'required|uuid|distinct',
        ]);

        $user = $request->user();
        if ($validated['status'] === 'didisposisikan') {
            $triage->handle($laporan, $user, null, $validated['catatan_penyelesaian'] ?? null);
        } elseif ($validated['status'] === 'sedang_dikerjakan') {
            $started = $claim->handle($laporan, $user);
            if (trim($validated['catatan_penyelesaian'] ?? '') !== '') {
                app(DamageReportWorkflow::class)->progress($started, $user, [
                    'description' => trim($validated['catatan_penyelesaian']), 'work_date' => today()->toDateString(),
                    'is_blocked' => false, 'request_key' => $validated['request_key'] ?? (string) Str::uuid(),
                ]);
            }
        } elseif ($validated['status'] === 'selesai') {
            Gate::authorize('complete', $laporan);
            $paths = collect($request->file('bukti_penyelesaian', []))
                ->map(fn ($file) => $file->store('laporan-kerusakan/after', 'local'))
                ->all();
            try {
                $participants = $validated['participant_ids'] ?? null;
                if ($participants !== null) {
                    sort($participants);
                }
                $hash = $this->payloadHash(['catatan_penyelesaian' => trim($validated['catatan_penyelesaian']), 'participant_ids' => $participants], $this->uploads($request, 'bukti_penyelesaian'));
                $result = $complete->handle($laporan, $user, $validated['catatan_penyelesaian'] ?? '', $paths, $hash, $participants);
                Storage::disk('local')->delete(array_diff($paths, $result->photos()->pluck('path')->all()));
            } catch (Throwable $exception) {
                Storage::disk('local')->delete($paths);
                throw $exception;
            }
        } else {
            app(DamageReportWorkflow::class)->cancel($laporan, $user, $validated['reason']);
        }

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Tiket {$laporan->nomor_tiket} diperbarui.",
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  list<UploadedFile>  $files
     */
    public function payloadHash(array $data, array $files): string
    {
        unset($data['request_key'], $data['foto_awal'], $data['bukti_penyelesaian'], $data['photos'], $data['items']);
        ksort($data);

        return hash('sha256', json_encode([$data, array_map(fn ($file) => hash_file('sha256', $file->getRealPath()), $files)], JSON_THROW_ON_ERROR));
    }

    /** @return list<UploadedFile> */
    public function uploads(Request $request, string $key): array
    {
        $files = $request->file($key, []);
        if (! is_array($files)) {
            throw ValidationException::withMessages([$key => 'Unggahan harus berupa daftar berkas.']);
        }

        return array_values($files);
    }
}
