<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('pengajuan_izin_pulang', function (Blueprint $table) {
            $table->string('status', 30)->default('diajukan')->change();
            $table->string('jenis', 20)->default('pulkam');
            $table->foreignUuid('gedung_id')->nullable()->constrained('gedung')->nullOnDelete();
            $table->string('dokumen_path')->nullable();
            $table->text('catatan_verifikasi')->nullable();
            $table->timestamp('sampai_pada')->nullable();
            foreach (['sampai', 'kembali'] as $kind) {
                $table->string($kind.'_foto_path')->nullable();
                $table->decimal($kind.'_latitude', 10, 7)->nullable();
                $table->decimal($kind.'_longitude', 10, 7)->nullable();
                $table->decimal($kind.'_accuracy', 10, 2)->nullable();
            }
        });
        DB::table('pengajuan_izin_pulang')->orderBy('id')->each(function (object $leave): void {
            $placement = DB::table('penempatan_kamar')->join('kamar', 'kamar.id', '=', 'penempatan_kamar.kamar_id')->join('lantai', 'lantai.id', '=', 'kamar.lantai_id')
                ->where('mahasiswa_id', $leave->mahasiswa_id)->orderByDesc('tanggal_mulai')->first(['lantai.gedung_id']);
            DB::table('pengajuan_izin_pulang')->where('id', $leave->id)->update(['gedung_id' => $placement?->gedung_id]);
        });

        Schema::create('stok_aset', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('kode', 50)->unique();
            $table->string('nama', 150);
            $table->string('kategori', 100);
            $table->string('satuan', 30)->default('unit');
            $table->unsignedInteger('jumlah_total')->default(0);
            $table->timestamps();
        });
        Schema::table('aset', function (Blueprint $table) {
            $table->foreignUuid('stok_aset_id')->nullable()->constrained('stok_aset')->restrictOnDelete();
            $table->unsignedInteger('jumlah')->default(1);
        });
        Schema::table('room_inspections', function (Blueprint $table) {
            $table->json('asset_checks')->nullable();
        });
        DB::table('aset')->orderBy('id')->each(function (object $asset): void {
            $stock = DB::table('stok_aset')->where('nama', $asset->nama_aset)->where('kategori', $asset->kategori ?? 'Lainnya')->first();
            $id = $stock?->id ?? (string) Str::uuid();
            if (! $stock) {
                DB::table('stok_aset')->insert(['id' => $id, 'kode' => 'STK-'.strtoupper(Str::random(12)), 'nama' => $asset->nama_aset, 'kategori' => $asset->kategori ?? 'Lainnya', 'jumlah_total' => 0, 'satuan' => 'unit', 'created_at' => now(), 'updated_at' => now()]);
            }
            DB::table('stok_aset')->where('id', $id)->increment('jumlah_total');
            DB::table('aset')->where('id', $asset->id)->update(['stok_aset_id' => $id]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('room_inspections', function (Blueprint $table) {
            $table->dropColumn('asset_checks');
        });
        Schema::table('aset', function (Blueprint $table) {
            $table->dropConstrainedForeignId('stok_aset_id');
            $table->dropColumn('jumlah');
        });
        Schema::dropIfExists('stok_aset');
        Schema::table('pengajuan_izin_pulang', function (Blueprint $table) {
            $table->dropConstrainedForeignId('gedung_id');
            $table->dropColumn(['jenis', 'dokumen_path', 'catatan_verifikasi', 'sampai_pada', 'sampai_foto_path', 'sampai_latitude', 'sampai_longitude', 'sampai_accuracy', 'kembali_foto_path', 'kembali_latitude', 'kembali_longitude', 'kembali_accuracy']);
        });
    }
};
