<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        $retiredTables = ['checkin', 'absensi_sholat', 'asset_clearances', 'finance_clearances', 'room_inspection_checklist_items'];
        $archive = [];
        foreach ($retiredTables as $table) {
            $archive[$table] = DB::table($table)->get()->all();
        }
        $archive['legacy_damage_fields'] = DB::table('laporan_kerusakan')->where(function ($query): void {
            $query->whereNotNull('foto_sebelum')->orWhereNotNull('foto_sesudah')->orWhereNotNull('metode_penanganan')->orWhereNotNull('biaya_riil');
        })->get(['id', 'foto_sebelum', 'foto_sesudah', 'metode_penanganan', 'biaya_riil', 'dilaporkan_oleh', 'teknisi_id'])->all();
        $archive['legacy_placement_methods'] = DB::table('penempatan_kamar')->get(['id', 'metode'])->all();
        $archive['payment_checkin_links'] = DB::table('pembayaran')->whereNotNull('checkin_id')->get(['id', 'checkin_id'])->all();
        $archive['graduation_evidence'] = DB::table('pengajuan_bebas_asrama')->whereNotNull('graduation_evidence_path')->get(['id', 'graduation_evidence_path'])->all();

        if (collect($archive)->contains(fn (array $rows): bool => $rows !== [])) {
            $path = 'backups/retired-residence-workflows-'.now()->format('YmdHis').'-'.Str::uuid().'.json';
            if (! Storage::disk('local')->put($path, json_encode($archive, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR))) {
                throw new RuntimeException('Cadangan data lama gagal dibuat; penghapusan dibatalkan.');
            }
        }

        Schema::table('residence_registrations', function (Blueprint $table): void {
            $table->foreignUuid('penempatan_kamar_id')->nullable()->unique()->constrained('penempatan_kamar')->restrictOnDelete();
        });

        DB::table('residence_registrations')->orderBy('id')->each(function (object $registration): void {
            $placements = DB::table('penempatan_kamar')->where('mahasiswa_id', $registration->student_profile_id)
                ->where('periode_id', $registration->periode_id)->get();
            if ($placements->count() === 1) {
                DB::table('residence_registrations')->where('id', $registration->id)->update(['penempatan_kamar_id' => $placements->first()->id]);
            }
        });

        foreach ($archive['checkin'] as $checkin) {
            if ($checkin->status !== 'selesai_checkin') {
                continue;
            }
            $occurredAt = $checkin->tanggal_aktual_checkin ?? $checkin->tanggal_rencana_masuk;
            if (! DB::table('residence_histories')->where('mahasiswa_id', $checkin->mahasiswa_id)->where('occurred_at', $occurredAt)->whereIn('event', ['entered', 'reentered'])->exists()) {
                $previous = DB::table('residence_histories')->where('mahasiswa_id', $checkin->mahasiswa_id)->where('occurred_at', '<', $occurredAt)->exists();
                DB::table('residence_histories')->insert([
                    'id' => (string) Str::uuid(), 'mahasiswa_id' => $checkin->mahasiswa_id,
                    'event' => $previous ? 'reentered' : 'entered', 'occurred_at' => $occurredAt,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            DB::table('residence_registrations')->where('student_profile_id', $checkin->mahasiswa_id)
                ->where('periode_id', $checkin->periode_id)->where('status', 'accepted')->whereNull('completed_at')
                ->update(['completed_at' => $occurredAt]);
        }

        foreach ($archive['legacy_damage_fields'] as $report) {
            foreach (['before' => $report->foto_sebelum, 'after' => $report->foto_sesudah] as $type => $path) {
                if (! $path || str_contains($path, '..') || str_starts_with($path, '/') || str_starts_with($path, '\\')) {
                    continue;
                }
                if (DB::table('laporan_kerusakan_photos')->where('laporan_kerusakan_id', $report->id)->where('type', $type)->exists()) {
                    continue;
                }
                $privatePath = $path;
                if (! Storage::disk('local')->exists($path) && Storage::disk('public')->exists($path)) {
                    $privatePath = 'laporan-kerusakan/legacy/'.$report->id.'-'.$type.'.'.pathinfo($path, PATHINFO_EXTENSION);
                    if (! Storage::disk('local')->put($privatePath, Storage::disk('public')->get($path))) {
                        throw new RuntimeException('Pemindahan foto lama gagal.');
                    }
                }
                DB::table('laporan_kerusakan_photos')->insert([
                    'id' => (string) Str::uuid(), 'laporan_kerusakan_id' => $report->id,
                    'type' => $type, 'path' => $privatePath, 'uploaded_by' => ($type === 'after' ? $report->teknisi_id : null) ?? $report->dilaporkan_oleh,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
        }
        Schema::table('laporan_kerusakan', function (Blueprint $table): void {
            $table->dropColumn(['foto_sebelum', 'foto_sesudah', 'metode_penanganan', 'biaya_riil']);
        });

        Schema::table('penempatan_kamar', function (Blueprint $table): void {
            $table->dropColumn('metode');
        });

        Schema::table('pembayaran', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('checkin_id');
        });
        Schema::table('pengajuan_bebas_asrama', function (Blueprint $table): void {
            $table->dropColumn('graduation_evidence_path');
        });
        foreach (array_reverse($retiredTables) as $table) {
            Schema::drop($table);
        }

        Schema::table('pengajuan_bebas_asrama', function (Blueprint $table): void {
            $table->string('status', 30)->default('diajukan')->change();
        });
        DB::table('pengajuan_bebas_asrama')->where('status', 'verifikasi_aset_dan_keuangan')->update(['status' => 'diverifikasi']);
        DB::table('pengajuan_bebas_asrama_status_histories')->where('status', 'verifikasi_aset_dan_keuangan')->update(['status' => 'diverifikasi']);

        Schema::table('tagihan', function (Blueprint $table): void {
            $table->timestamp('cicilan_diminta_at')->nullable();
            $table->text('alasan_cicilan')->nullable();
        });

        $permissionIds = DB::table('permissions')->whereIn('name', ['checkin.create', 'checkin.verify', 'clearance.asset', 'clearance.finance', 'penempatan.manage'])->pluck('id');
        DB::table('role_has_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('model_has_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('id', $permissionIds)->delete();
    }

    public function down(): void
    {
        throw new RuntimeException('Penghapusan alur lama tidak dapat di-rollback otomatis. Pulihkan cadangan database sebelum migrasi bila diperlukan.');
    }
};
