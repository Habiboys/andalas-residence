<?php

namespace App\Services;

use App\Enums\LaporanKerusakanStatus as Status;
use App\Models\Aset;
use App\Models\DamageReportComplaint;
use App\Models\DamageReportItem;
use App\Models\FasilitasUmum;
use App\Models\Kamar;
use App\Models\LaporanKerusakan;
use App\Models\TechnicianLogbook;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DamageReportRevision
{
    /** @param list<array{description:string,aset_id?:string|null,location_label?:string|null,paths?:list<string>}> $items */
    public function submit(User $actor, array $items, ?string $facilityId = null, ?string $key = null, ?string $hash = null): LaporanKerusakan
    {
        Gate::forUser($actor)->authorize('create', LaporanKerusakan::class);
        if ($items === []) {
            throw ValidationException::withMessages(['items' => 'Minimal satu item kerusakan wajib diisi.']);
        }
        $hash ??= hash('sha256', json_encode([$items, $facilityId], JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($actor, $items, $facilityId, $key, $hash): LaporanKerusakan {
            $profile = $actor->mahasiswaProfil;
            if (! $profile || $profile->status_huni !== 'aktif') {
                abort(403);
            }
            $placement = $profile->penempatanKamar()->where('status', 'aktif')->latest('tanggal_mulai')->lockForUpdate()->firstOrFail();
            $room = Kamar::whereKey($placement->kamar_id)->lockForUpdate()->firstOrFail();
            $buildingId = $room->lantai->gedung_id;
            // Common facility is independent from a private room report.
            $facility = $facilityId ? FasilitasUmum::whereKey($facilityId)->where('gedung_id', $buildingId)->lockForUpdate()->first() : null;
            if ($facilityId && ! $facility) {
                throw ValidationException::withMessages(['fasilitas_umum_id' => 'Fasilitas harus berada di gedung hunian Anda.']);
            }
            User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            if ($key) {
                $previous = DB::table('damage_report_submissions')->where('user_id', $actor->id)->where('request_key', $key)->lockForUpdate()->first();
                if ($previous) {
                    if (! hash_equals($previous->request_hash, $hash)) {
                        throw ValidationException::withMessages(['request_key' => 'Kunci pengiriman sudah dipakai dengan isi berbeda.']);
                    }
                    $old = LaporanKerusakan::whereKey($previous->laporan_kerusakan_id)->firstOrFail();
                    Gate::forUser($actor)->authorize('view', $old);

                    return $old->load(['items.photos', 'photos', 'statusHistories']);
                }
            }
            $prepared = [];
            foreach ($items as $index => $item) {
                if (trim($item['description']) === '') {
                    throw ValidationException::withMessages(["items.$index.description" => 'Deskripsi setiap item wajib diisi.']);
                }
                $assetId = $item['aset_id'] ?? null;
                $asset = $assetId ? Aset::reportableFor($room)->whereKey($assetId)->first() : null;
                if ($assetId && (! $asset || ($facilityId ? $asset->fasilitas_umum_id !== $facilityId : $asset->kamar_id !== $room->id))) {
                    throw ValidationException::withMessages(['aset_id' => 'Pilih barang di kamar Anda atau fasilitas umum gedung Anda yang masih digunakan.']);
                }
                $prepared[] = [...$item, 'aset_id' => $assetId, 'location_label' => $asset ? $asset->nama_aset : ($item['location_label'] ?? 'Kamar '.$room->nomor_kamar)];
            }
            $report = LaporanKerusakan::where('kamar_id', $facilityId ? null : $room->id)->where('fasilitas_umum_id', $facilityId)->where('gedung_id', $buildingId)
                ->whereIn('status', [Status::MenungguTriage, Status::Didisposisikan])->orderBy('tanggal_lapor')->lockForUpdate()->first();
            $existing = $report !== null;
            if ($report) {
                Gate::forUser($actor)->authorize('view', $report);
            } else {
                $report = LaporanKerusakan::create([
                    'nomor_tiket' => 'TKT-'.Str::upper(Str::random(12)), 'gedung_id' => $buildingId, 'kamar_id' => $facilityId ? null : $room->id,
                    'fasilitas_umum_id' => $facilityId, 'aset_id' => $prepared[0]['aset_id'], 'dilaporkan_oleh' => $actor->id,
                    'source' => 'resident', 'location_label' => $facility ? $facility->nama_fasilitas : 'Kamar '.$room->nomor_kamar,
                    'deskripsi' => $prepared[0]['description'], 'status' => Status::MenungguTriage, 'tanggal_lapor' => now(),
                ]);
                app(DamageReportWorkflow::class)->history($report, $actor, null, Status::MenungguTriage, 'Laporan penghuni dibuat.');
            }
            foreach ($prepared as $item) {
                $created = $report->items()->create(['aset_id' => $item['aset_id'], 'reported_by' => $actor->id, 'description' => trim($item['description']), 'location_label' => $item['location_label']]);
                foreach ($item['paths'] ?? [] as $path) {
                    $this->privatePath($path);
                    $report->photos()->create(['item_id' => $created->id, 'path' => $path, 'type' => 'before', 'uploaded_by' => $actor->id]);
                }
            }
            if ($existing) {
                app(DamageReportWorkflow::class)->history($report, $actor, $report->status, $report->status, count($prepared).' item kerusakan ditambahkan.');
            }
            if ($key) {
                DB::table('damage_report_submissions')->insert(['user_id' => $actor->id, 'request_key' => $key, 'request_hash' => $hash, 'laporan_kerusakan_id' => $report->id, 'created_at' => now(), 'updated_at' => now()]);
            }

            return $report->load(['items.photos', 'photos', 'statusHistories']);
        }, 3);
    }

    /** @param list<string> $paths */
    public function completeItem(DamageReportItem $item, User $actor, string $note, array $paths): void
    {
        DB::transaction(function () use ($item, $actor, $note, $paths): void {
            $report = app(DamageReportWorkflow::class)->locked($item->report);
            Gate::forUser($actor)->authorize('complete', $report);
            $item = DamageReportItem::whereKey($item->id)->lockForUpdate()->firstOrFail();
            if ($item->completed_at) {
                if ($item->completion_note !== trim($note)) {
                    throw ValidationException::withMessages(['note' => 'Penyelesaian item sudah tercatat dengan catatan berbeda.']);
                }

                return;
            }
            if ($report->status !== Status::SedangDikerjakan || trim($note) === '') {
                throw ValidationException::withMessages(['note' => 'Item hanya dapat diselesaikan saat laporan dikerjakan dengan catatan hasil.']);
            }
            $item->update(['completed_at' => now(), 'completed_by' => $actor->id, 'completion_note' => trim($note)]);
            foreach ($paths as $path) {
                $this->privatePath($path);
                $report->photos()->create(['item_id' => $item->id, 'path' => $path, 'type' => 'after', 'uploaded_by' => $actor->id]);
            }
            app(DamageReportWorkflow::class)->history($report, $actor, $report->status, $report->status, 'Item selesai: '.$item->description.'. '.trim($note));
        }, 3);
    }

    /** @param list<string> $paths */
    public function logbook(User $actor, string $date, string $description, string $source, array $paths, string $key, string $hash): TechnicianLogbook
    {
        abort_unless($actor->status === 'aktif' && $actor->hasRole('teknisi') && $actor->can('tiket.update'), 403);

        return DB::transaction(function () use ($actor, $date, $description, $source, $paths, $key, $hash): TechnicianLogbook {
            User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            $previous = TechnicianLogbook::where('user_id', $actor->id)->where('request_key', $key)->first();
            if ($previous) {
                if (! hash_equals($previous->request_hash, $hash)) {
                    throw ValidationException::withMessages(['request_key' => 'Kunci logbook sudah dipakai dengan isi berbeda.']);
                }

                return $previous->load('photos');
            }
            if ($paths === [] || trim($description) === '') {
                throw ValidationException::withMessages(['photos' => 'Uraian dan foto dokumentasi pekerjaan wajib diisi.']);
            }
            $entry = TechnicianLogbook::create(['user_id' => $actor->id, 'work_date' => $date, 'description' => trim($description), 'source' => $source, 'request_key' => $key, 'request_hash' => $hash]);
            foreach ($paths as $path) {
                $this->privatePath($path);
                $entry->photos()->create(['path' => $path]);
            }

            return $entry->load('photos');
        }, 3);
    }

    public function complain(LaporanKerusakan $report, User $actor, string $reason, ?string $itemId, string $key): DamageReportComplaint
    {
        return DB::transaction(function () use ($report, $actor, $reason, $itemId, $key): DamageReportComplaint {
            $report = app(DamageReportWorkflow::class)->locked($report);
            Gate::forUser($actor)->authorize('view', $report);
            abort_unless($actor->status === 'aktif' && $actor->hasRole('mahasiswa') && $report->status === Status::Selesai, 403);
            if (trim($reason) === '' || ($itemId && ! $report->items()->whereKey($itemId)->exists())) {
                throw ValidationException::withMessages(['reason' => 'Alasan dan referensi item harus sesuai laporan selesai ini.']);
            }
            User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            $previous = DamageReportComplaint::where('user_id', $actor->id)->where('request_key', $key)->first();
            if ($previous) {
                if ($previous->reason !== trim($reason) || $previous->laporan_kerusakan_id !== $report->id || $previous->item_id !== $itemId) {
                    throw ValidationException::withMessages(['request_key' => 'Pengajuan komplain sudah tercatat dengan isi berbeda.']);
                }

                return $previous;
            }
            $complaint = $report->complaints()->create(['user_id' => $actor->id, 'item_id' => $itemId, 'reason' => trim($reason), 'request_key' => $key]);
            app(DamageReportWorkflow::class)->history($report, $actor, $report->status, $report->status, 'Komplain ulang diajukan: '.trim($reason));

            return $complaint;
        }, 3);
    }

    private function privatePath(string $path): void
    {
        if ($path === '' || Str::startsWith($path, ['/', '\\', 'public/', 'http://', 'https://']) || str_contains($path, '..')) {
            throw ValidationException::withMessages(['photos' => 'Foto harus berada pada penyimpanan privat.']);
        }
    }
}
