<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    public function up(): void
    {
        $retiredTables = [
            'pesanan_laundry',
            'pesanan_galon',
            'artisan_command_logs',
            'pergerakan_aset',
            'penghapusan_aset',
            'pemeliharaan_aset',
            'inspeksi_aset',
            'penanggung_jawab_aset',
            'lokasi_aset',
            'kategori_aset',
        ];

        if (! app()->runningUnitTests()) {
            $archive = [];
            foreach ($retiredTables as $table) {
                $archive[$table] = Schema::hasTable($table)
                    ? DB::table($table)->orderBy('id')->get()->all()
                    : [];
            }
            $archive['aset_legacy_columns'] = DB::table('aset')
                ->select(['id', 'kode_gudang', 'kategori_aset_id', 'tanggal_pengadaan', 'garansi_sampai'])
                ->orderBy('id')
                ->get()
                ->all();
            $archive['perizinan_legacy_columns'] = DB::table('pengajuan_izin_pulang')
                ->select(['id', 'rencana_berangkat_pada', 'ditandai_terlambat_pada', 'keberangkatan_dicatat_oleh', 'kepulangan_dicatat_oleh'])
                ->orderBy('id')
                ->get()
                ->all();

            $path = 'backups/retired-prototypes-'.now()->format('Ymd-His').'.json';
            if (! Storage::disk('local')->put($path, json_encode($archive, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR))) {
                throw new RuntimeException('Cadangan prototipe lama gagal dibuat; penghapusan dibatalkan.');
            }
        }

        Schema::dropIfExists('pesanan_laundry');
        Schema::dropIfExists('pesanan_galon');
        Schema::dropIfExists('artisan_command_logs');
        Schema::dropIfExists('pergerakan_aset');
        Schema::dropIfExists('penghapusan_aset');
        Schema::dropIfExists('pemeliharaan_aset');
        Schema::dropIfExists('inspeksi_aset');
        Schema::dropIfExists('penanggung_jawab_aset');
        Schema::dropIfExists('lokasi_aset');

        Schema::table('aset', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('kategori_aset_id');
            $table->dropColumn(['kode_gudang', 'tanggal_pengadaan', 'garansi_sampai']);
        });
        Schema::dropIfExists('kategori_aset');

        Schema::table('pengajuan_izin_pulang', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('keberangkatan_dicatat_oleh');
            $table->dropConstrainedForeignId('kepulangan_dicatat_oleh');
            $table->dropColumn(['rencana_berangkat_pada', 'ditandai_terlambat_pada']);
        });
        DB::table('pengajuan_izin_pulang')
            ->whereIn('status', ['disetujui', 'terlambat'])
            ->update(['status' => 'sedang_izin']);

        DB::table('mahasiswa_profil')
            ->whereIn('status_huni', ['izin_pulang', 'bebas_asrama'])
            ->update(['status_huni' => 'aktif']);
        Schema::table('mahasiswa_profil', function (Blueprint $table): void {
            $table->enum('status_huni', ['calon', 'aktif', 'keluar'])->default('calon')->change();
        });

        $permissionIds = DB::table('permissions')
            ->whereIn('name', ['layanan.create', 'layanan.manage', 'pengajuan.approve'])
            ->pluck('id');
        DB::table('role_has_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('model_has_permissions')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('id', $permissionIds)->delete();
    }

    public function down(): void
    {
        throw new RuntimeException('Penghapusan prototipe yang belum memiliki proses bisnis tidak dapat di-rollback otomatis. Pulihkan cadangan database bila diperlukan.');
    }
};
