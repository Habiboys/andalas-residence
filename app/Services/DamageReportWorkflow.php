<?php

namespace App\Services;

use App\Enums\LaporanKerusakanStatus as Status;
use App\Jobs\SendDamageReportNotification;
use App\Models\Aset;
use App\Models\DamageReportItem;
use App\Models\DamageReportProgress;
use App\Models\FasilitasUmum;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\LaporanKerusakan;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DamageReportWorkflow
{
    /**
     * @param  list<string>  $paths
     * @param  array<string, mixed>  $options
     */
    public function resident(User $actor, string $description, array $paths, ?string $assetId, array $options = []): LaporanKerusakan
    {
        $facilityId = $options['fasilitas_umum_id'] ?? null;
        if ($assetId) {
            $asset = Aset::whereKey($assetId)->first();
            $facilityId = $asset ? ($asset->fasilitas_umum_id ?? $facilityId) : $facilityId;
        }

        return app(DamageReportRevision::class)->submit($actor, [[
            'description' => $description, 'aset_id' => $assetId,
            'location_label' => $options['location_label'] ?? null, 'paths' => $paths,
        ]], $facilityId, $options['request_key'] ?? null, $options['request_hash'] ?? null);
    }

    public function claim(LaporanKerusakan $report, User $actor): LaporanKerusakan
    {
        return DB::transaction(function () use ($report, $actor): LaporanKerusakan {
            $report = $this->locked($report);
            Gate::forUser($actor)->authorize('claim', $report);
            if ($report->status === Status::SedangDikerjakan && $report->teknisi_id === $actor->id) {
                return $report->load(['assignments', 'statusHistories']);
            }
            $from = $report->status;
            $report->update(['teknisi_id' => $actor->id, 'status' => Status::SedangDikerjakan]);
            $report->assignments()->firstOrCreate(['technician_id' => $actor->id, 'ended_at' => null], ['assigned_by' => $actor->id, 'assigned_at' => now(), 'role' => 'lead']);
            $this->history($report, $actor, $from, Status::SedangDikerjakan, 'Diklaim teknisi.');

            return $report->load(['assignments', 'statusHistories']);
        }, 3);
    }

    /**
     * @param  list<string>  $paths
     * @param  list<string>|null  $participants
     */
    public function complete(LaporanKerusakan $report, User $actor, string $description, array $paths, ?string $hash = null, ?array $participants = null): LaporanKerusakan
    {
        $hash ??= hash('sha256', json_encode([trim($description), $paths], JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($report, $actor, $description, $paths, $hash, $participants): LaporanKerusakan {
            $report = $this->locked($report);
            Gate::forUser($actor)->authorize('complete', $report);
            if ($report->status === Status::Selesai) {
                if (! $report->completion_hash || ! hash_equals($report->completion_hash, $hash)) {
                    $this->fail('status', 'Penyelesaian sudah tercatat dengan isi berbeda.');
                }

                return $report->load(['photos', 'assignments', 'statusHistories']);
            }
            if (trim($description) === '' || $paths === []) {
                $this->fail('completion', 'Deskripsi dan minimal satu bukti penyelesaian wajib diisi.');
            }
            if ($participants !== null) {
                $this->team($report, $actor, $participants, 'Partisipan saat penyelesaian.');
            }
            $items = $report->items()->lockForUpdate()->get();
            // The single-item legacy endpoint's final action also declares its one item repaired.
            if ($items->count() === 1 && $items->first()->completed_at === null) {
                $items->first()->update(['completed_at' => now(), 'completed_by' => $actor->id, 'completion_note' => trim($description)]);
            } elseif ($items->contains(fn ($item) => $item->completed_at === null)) {
                $this->fail('items', 'Seluruh item kerusakan harus selesai sebelum laporan ditutup.');
            }
            $this->photos($report, $actor, $paths, 'after');
            if ($items->count() === 1) {
                $report->photos()->where('type', 'after')->whereNull('item_id')->update(['item_id' => $items->first()->id]);
            }
            $report->progress()->firstOrCreate(['request_key' => $report->id, 'user_id' => $actor->id], [
                'work_date' => today()->toDateString(), 'description' => 'Penyelesaian: '.trim($description),
                'is_blocked' => false, 'request_hash' => hash('sha256', 'completion:'.$report->id),
            ]);
            $report->update(['status' => Status::Selesai, 'catatan_penyelesaian' => trim($description), 'tanggal_selesai' => now(), 'completion_hash' => $hash, 'is_blocked' => false]);
            foreach ($items->pluck('aset_id')->filter()->unique()->sort()->values() as $assetId) {
                $asset = Aset::whereKey($assetId)->lockForUpdate()->first();
                $active = DamageReportItem::join('laporan_kerusakan', 'laporan_kerusakan.id', '=', 'damage_report_items.laporan_kerusakan_id')
                    ->where('damage_report_items.aset_id', $assetId)->where('laporan_kerusakan.id', '!=', $report->id)
                    ->whereNotIn('laporan_kerusakan.status', [Status::Selesai, Status::Dibatalkan])
                    ->select('damage_report_items.id')->lockForUpdate()->first() !== null;
                if ($asset && ! $active) {
                    $asset->update(['kondisi' => 'baik']);
                }
            }
            $report->assignments()->whereNull('ended_at')->update(['ended_at' => now()]);
            $this->history($report, $actor, Status::SedangDikerjakan, Status::Selesai, trim($description));
            $this->notifyCompletion($report);

            return $report->load(['photos', 'assignments', 'statusHistories']);
        }, 3);
    }

    public function cancel(LaporanKerusakan $report, User $actor, string $reason): LaporanKerusakan
    {
        return DB::transaction(function () use ($report, $actor, $reason): LaporanKerusakan {
            $report = $this->locked($report);
            Gate::forUser($actor)->authorize('cancel', $report);
            if (trim($reason) === '') {
                $this->fail('reason', 'Alasan pembatalan wajib diisi.');
            }
            if ($report->status === Status::Dibatalkan) {
                if ($report->cancelled_by !== $actor->id || $report->cancellation_reason !== trim($reason)) {
                    $this->fail('status', 'Pembatalan sudah tercatat dengan keputusan berbeda.');
                }

                return $report;
            }
            $from = $report->status;
            $report->update(['status' => Status::Dibatalkan, 'cancellation_reason' => trim($reason), 'cancelled_by' => $actor->id, 'is_blocked' => false]);
            $report->assignments()->whereNull('ended_at')->update(['ended_at' => now()]);
            $this->history($report, $actor, $from, Status::Dibatalkan, trim($reason));

            return $report;
        }, 3);
    }

    /** @param array{description:string,work_date:string,is_blocked?:bool,request_key:string} $data */
    public function progress(LaporanKerusakan $report, User $actor, array $data): DamageReportProgress
    {
        return DB::transaction(function () use ($report, $actor, $data): DamageReportProgress {
            $report = $this->locked($report);
            Gate::forUser($actor)->authorize('progress', $report);
            User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            $hash = hash('sha256', json_encode([$report->id, $data['description'], $data['work_date'], (bool) ($data['is_blocked'] ?? false)], JSON_THROW_ON_ERROR));
            $existing = DamageReportProgress::where('user_id', $actor->id)->where('request_key', $data['request_key'])->first();
            if ($existing) {
                if (! hash_equals($existing->request_hash, $hash)) {
                    $this->fail('request_key', 'Kunci progres sudah digunakan dengan isi berbeda.');
                }

                return $existing;
            }
            $progress = $report->progress()->create([...$data, 'user_id' => $actor->id, 'request_hash' => $hash]);
            $report->update(['is_blocked' => (bool) ($data['is_blocked'] ?? false)]);

            return $progress;
        }, 3);
    }

    /** @param list<string> $ids */
    public function team(LaporanKerusakan $report, User $actor, array $ids, string $reason): LaporanKerusakan
    {
        return DB::transaction(function () use ($report, $actor, $ids, $reason): LaporanKerusakan {
            $report = $this->locked($report);
            Gate::forUser($actor)->authorize('team', $report);
            $ids = array_values(array_diff(array_unique($ids), [$report->teknisi_id]));
            if (User::whereIn('id', $ids)->where('status', 'aktif')->whereHas('roles', fn ($q) => $q->where('name', 'teknisi')->where('guard_name', 'web'))->count() !== count($ids)) {
                $this->fail('technician_ids', 'Seluruh anggota harus teknisi aktif.');
            }
            $active = $report->assignments()->where('role', 'member')->whereNull('ended_at')->pluck('technician_id')->all();
            sort($ids);
            sort($active);
            if ($ids === $active) {
                return $report->load('assignments.technician');
            }
            $report->assignments()->where('role', 'member')->whereNull('ended_at')->whereNotIn('technician_id', $ids)->update(['ended_at' => now()]);
            foreach (array_diff($ids, $active) as $id) {
                $report->assignments()->create(['technician_id' => $id, 'assigned_by' => $actor->id, 'assigned_at' => now(), 'role' => 'member']);
            }
            $this->history($report, $actor, $report->status, $report->status, 'Anggota tim diperbarui: '.trim($reason));

            return $report->load('assignments.technician');
        }, 3);
    }

    public function confirm(LaporanKerusakan $report, User $actor): void
    {
        DB::transaction(function () use ($report, $actor): void {
            $report = $this->locked($report);
            Gate::forUser($actor)->authorize('confirm', $report);
            DB::table('damage_report_confirmations')->insertOrIgnore(['laporan_kerusakan_id' => $report->id, 'user_id' => $actor->id, 'created_at' => now(), 'updated_at' => now()]);
        }, 3);
    }

    public function linkAsset(LaporanKerusakan $report, User $actor, string $assetId, string $reason, ?string $itemId = null): void
    {
        DB::transaction(function () use ($report, $actor, $assetId, $reason, $itemId): void {
            $report = $this->locked($report);
            Gate::forUser($actor)->authorize('linkAsset', $report);
            $asset = Aset::whereKey($assetId)->lockForUpdate()->firstOrFail();
            if ($asset->kamar_id !== $report->kamar_id || $asset->fasilitas_umum_id !== $report->fasilitas_umum_id || (! $asset->kamar_id && ! $asset->fasilitas_umum_id)) {
                $this->fail('aset_id', 'Aset harus sesuai lokasi awal laporan.');
            }
            $items = $report->items()->lockForUpdate()->get();
            $item = $itemId ? $items->firstWhere('id', $itemId) : ($items->count() === 1 ? $items->first() : null);
            if (! $item) {
                $this->fail('item_id', 'Pilih item laporan yang akan dihubungkan dengan inventaris.');
            }
            if ($item->aset_id === $assetId) {
                return;
            }
            if (LaporanKerusakan::where('aset_id', $assetId)->whereKeyNot($report->id)->whereNotIn('status', [Status::Selesai, Status::Dibatalkan])->exists()) {
                $this->fail('aset_id', 'Aset mempunyai kejadian aktif lain. Tinjau keterkaitan kejadian sebelum mengubah inventaris.');
            }
            $old = $item->aset_id ?? 'tanpa inventaris';
            $item->update(['aset_id' => $assetId]);
            if ($items->count() === 1) { $report->update(['aset_id' => $assetId]); }
            $this->history($report, $actor, $report->status, $report->status, 'Pengaitan aset '.$old.' -> '.$assetId.': '.trim($reason));
        }, 3);
    }

    public function locked(LaporanKerusakan $report): LaporanKerusakan
    {
        $this->lockLocation($report->only(['kamar_id', 'fasilitas_umum_id', 'gedung_id', 'aset_id']));

        return LaporanKerusakan::whereKey($report->id)->lockForUpdate()->firstOrFail();
    }

    /** @param array<string, mixed> $location */
    private function lockLocation(array $location): void
    {
        if (! empty($location['kamar_id'])) {
            Kamar::whereKey($location['kamar_id'])->lockForUpdate()->firstOrFail();
        } elseif (! empty($location['fasilitas_umum_id'])) {
            FasilitasUmum::whereKey($location['fasilitas_umum_id'])->lockForUpdate()->firstOrFail();
        } elseif (! empty($location['gedung_id'])) {
            Gedung::whereKey($location['gedung_id'])->lockForUpdate()->firstOrFail();
        }
        if (! empty($location['aset_id'])) {
            Aset::whereKey($location['aset_id'])->lockForUpdate()->firstOrFail();
        }
    }

    /** @param list<string> $paths */
    private function photos(LaporanKerusakan $report, User $actor, array $paths, string $type): void
    {
        foreach ($paths as $path) {
            if ($path === '' || Str::startsWith($path, ['/', '\\', 'public/', 'http://', 'https://']) || str_contains($path, '..')) {
                $this->fail('photos', 'Path foto harus relatif pada penyimpanan privat.');
            }
            $report->photos()->create(['type' => $type, 'path' => $path, 'uploaded_by' => $actor->id]);
        }
    }

    public function history(LaporanKerusakan $report, User $actor, ?Status $from, Status $to, string $description): void
    {
        $report->statusHistories()->create(['from_status' => $from, 'to_status' => $to, 'changed_by' => $actor->id, 'description' => $description]);
    }

    private function notifyCompletion(LaporanKerusakan $report): void
    {
        $ids = [$report->dilaporkan_oleh];
        if ($report->kamar_id) {
            $ids = array_merge($ids, User::whereHas('mahasiswaProfil.penempatanKamar', fn ($q) => $q->where('kamar_id', $report->kamar_id)->where('status', 'aktif')->whereDate('tanggal_mulai', '<=', $report->tanggal_lapor))->pluck('id')->all());
        }
        foreach (array_unique($ids) as $id) {
            $eventId = (string) Str::uuid();
            DB::table('damage_report_notifications')->insertOrIgnore(['id' => $eventId, 'laporan_kerusakan_id' => $report->id, 'user_id' => $id, 'event' => 'completed', 'created_at' => now(), 'updated_at' => now()]);
            DB::afterCommit(function () use ($eventId): void {
                try {
                    SendDamageReportNotification::dispatch($eventId);
                } catch (\Throwable $exception) {
                    report($exception);
                }
            });
        }
    }

    private function fail(string $key, string $message): never
    {
        throw ValidationException::withMessages([$key => $message]);
    }
}
