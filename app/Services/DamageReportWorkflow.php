<?php

namespace App\Services;

use App\Enums\LaporanKerusakanStatus as Status;
use App\Jobs\SendDamageReportNotification;
use App\Models\Aset;
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
    public function resident(User $actor, string $description, array $paths, ?string $assetId, array $options = []): LaporanKerusakan
    {
        Gate::forUser($actor)->authorize('create', LaporanKerusakan::class);
        return DB::transaction(function () use ($actor, $description, $paths, $assetId, $options): LaporanKerusakan {
            $placement = $actor->mahasiswaProfil->penempatanKamar()->where('status', 'aktif')->latest('tanggal_mulai')->lockForUpdate()->first();
            if (! $placement) {
                $this->fail('deskripsi', 'Penempatan aktif wajib tersedia.');
            }
            $room = $placement->kamar;
            Kamar::whereKey($room->id)->lockForUpdate()->firstOrFail();
            $asset = $assetId ? Aset::reportableFor($room)->find($assetId) : null;
            if ($assetId && ! $asset) {
                $this->fail('aset_id', 'Pilih barang di kamar Anda atau fasilitas umum gedung Anda yang masih digunakan.');
            }
            $facilityId = $asset?->fasilitas_umum_id ?? ($options['fasilitas_umum_id'] ?? null);
            if ($facilityId && ! FasilitasUmum::whereKey($facilityId)->where('gedung_id', $room->lantai->gedung_id)->exists()) {
                $this->fail('fasilitas_umum_id', 'Fasilitas harus berada di gedung hunian Anda.');
            }
            return $this->insert($actor, $description, $paths, [
                'gedung_id' => $room->lantai->gedung_id, 'kamar_id' => $facilityId ? null : $room->id,
                'fasilitas_umum_id' => $facilityId, 'aset_id' => $assetId, 'source' => 'resident',
                'location_label' => $asset?->nama_aset ?? trim($options['location_label'] ?? 'Kamar '.$room->nomor_kamar),
            ], $options);
        }, 3);
    }

    public function order(User $actor, array $data, array $paths = []): LaporanKerusakan
    {
        abort_unless($actor->status === 'aktif' && $actor->hasAnyRole(['pimpinan', 'superadmin']), 403);
        return DB::transaction(function () use ($actor, $data, $paths): LaporanKerusakan {
            $room = empty($data['kamar_id']) ? null : Kamar::with('lantai')->findOrFail($data['kamar_id']);
            $facility = empty($data['fasilitas_umum_id']) ? null : FasilitasUmum::findOrFail($data['fasilitas_umum_id']);
            $building = Gedung::findOrFail($data['gedung_id']);
            if (($room && $room->lantai->gedung_id !== $building->id) || ($facility && $facility->gedung_id !== $building->id) || ($room && $facility)) {
                $this->fail('gedung_id', 'Lokasi pekerjaan tidak cocok dengan gedung.');
            }
            $asset = empty($data['aset_id']) ? null : Aset::findOrFail($data['aset_id']);
            if ($asset && ($asset->kamar_id !== $room?->id || $asset->fasilitas_umum_id !== $facility?->id)) {
                $this->fail('aset_id', 'Aset harus sesuai lokasi pekerjaan.');
            }
            return $this->insert($actor, $data['deskripsi'], $paths, [
                'gedung_id' => $building->id, 'kamar_id' => $room?->id, 'fasilitas_umum_id' => $facility?->id,
                'aset_id' => $asset?->id, 'source' => 'leader', 'location_label' => trim($data['location_label']), 'priority' => $data['priority'],
            ], $data);
        }, 3);
    }

    public function insert(User $actor, string $description, array $paths, array $location, array $options = []): LaporanKerusakan
    {
        if (trim($description) === '') {
            $this->fail('deskripsi', 'Deskripsi wajib diisi.');
        }
        $this->lockLocation($location);
        $key = $options['request_key'] ?? null;
        if ($key) {
            User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
        }
        $hash = $options['request_hash'] ?? hash('sha256', json_encode([$description, $location, $options['different_incident_reason'] ?? null]));
        if ($key && ($previous = LaporanKerusakan::where('dilaporkan_oleh', $actor->id)->where('request_key', $key)->lockForUpdate()->first())) {
            if (! hash_equals((string) $previous->request_hash, $hash)) {
                $this->fail('request_key', 'Kunci pengiriman sudah digunakan dengan isi berbeda.');
            }
            return $previous->load('photos');
        }
        $candidate = LaporanKerusakan::whereNotIn('status', [Status::Selesai, Status::Dibatalkan])
            ->where('kamar_id', $location['kamar_id'] ?? null)->where('fasilitas_umum_id', $location['fasilitas_umum_id'] ?? null)
            ->where('gedung_id', $location['gedung_id'])->where('aset_id', $location['aset_id'] ?? null)
            ->when(empty($location['aset_id']), fn ($q) => $q->where(fn ($label) => $label->where('location_label', $location['location_label'])->orWhereNull('location_label')))->lockForUpdate()->first();
        if ($candidate && trim($options['different_incident_reason'] ?? '') === '') {
            $this->fail('different_incident_reason', 'Kejadian aktif sudah tercatat. Tautkan laporan yang ada atau jelaskan kerusakan yang berbeda.');
        }
        $report = LaporanKerusakan::create([
            ...$location, 'nomor_tiket' => 'TKT-'.Str::upper(Str::random(12)), 'dilaporkan_oleh' => $actor->id,
            'deskripsi' => trim($description), 'status' => Status::MenungguTriage, 'tanggal_lapor' => now(),
            'request_key' => $key, 'request_hash' => $hash, 'different_incident_reason' => $options['different_incident_reason'] ?? null,
        ]);
        $this->photos($report, $actor, $paths, 'before');
        $this->history($report, $actor, null, Status::MenungguTriage, 'Laporan dibuat ('.$report->source.').');
        return $report->load(['photos', 'statusHistories']);
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

    public function complete(LaporanKerusakan $report, User $actor, string $description, array $paths, ?string $hash = null): LaporanKerusakan
    {
        $hash ??= hash('sha256', json_encode([trim($description), $paths]));
        return DB::transaction(function () use ($report, $actor, $description, $paths, $hash): LaporanKerusakan {
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
            $this->photos($report, $actor, $paths, 'after');
            $report->update(['status' => Status::Selesai, 'catatan_penyelesaian' => trim($description), 'tanggal_selesai' => now(), 'completion_hash' => $hash, 'is_blocked' => false]);
            if ($report->aset_id && ! LaporanKerusakan::where('aset_id', $report->aset_id)->whereKeyNot($report->id)->whereNotIn('status', [Status::Selesai, Status::Dibatalkan])->exists()) {
                $report->aset()->update(['kondisi' => 'baik']);
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

    public function progress(LaporanKerusakan $report, User $actor, array $data): DamageReportProgress
    {
        return DB::transaction(function () use ($report, $actor, $data): DamageReportProgress {
            $report = $this->locked($report);
            Gate::forUser($actor)->authorize('progress', $report);
            User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            $hash = hash('sha256', json_encode([$report->id, $data['description'], $data['work_date'], (bool) ($data['is_blocked'] ?? false)]));
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
            sort($ids); sort($active);
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

    public function linkAsset(LaporanKerusakan $report, User $actor, string $assetId, string $reason): void
    {
        DB::transaction(function () use ($report, $actor, $assetId, $reason): void {
            $report = $this->locked($report);
            Gate::forUser($actor)->authorize('linkAsset', $report);
            $asset = Aset::whereKey($assetId)->lockForUpdate()->firstOrFail();
            if ($asset->kamar_id !== $report->kamar_id || $asset->fasilitas_umum_id !== $report->fasilitas_umum_id || (! $asset->kamar_id && ! $asset->fasilitas_umum_id)) {
                $this->fail('aset_id', 'Aset harus sesuai lokasi awal laporan.');
            }
            if ($report->aset_id === $assetId) {
                return;
            }
            if (LaporanKerusakan::where('aset_id', $assetId)->whereKeyNot($report->id)->whereNotIn('status', [Status::Selesai, Status::Dibatalkan])->exists()) {
                $this->fail('aset_id', 'Aset mempunyai kejadian aktif lain. Tinjau keterkaitan kejadian sebelum mengubah inventaris.');
            }
            $old = $report->aset_id ?? 'tanpa inventaris';
            $report->update(['aset_id' => $assetId]);
            $this->history($report, $actor, $report->status, $report->status, 'Pengaitan aset '.$old.' -> '.$assetId.': '.trim($reason));
        }, 3);
    }

    public function locked(LaporanKerusakan $report): LaporanKerusakan
    {
        $this->lockLocation($report->only(['kamar_id', 'fasilitas_umum_id', 'gedung_id', 'aset_id']));
        return LaporanKerusakan::whereKey($report->id)->lockForUpdate()->firstOrFail();
    }

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
