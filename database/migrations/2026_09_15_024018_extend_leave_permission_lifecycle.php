<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pengajuan_izin_pulang', function (Blueprint $table) {
            $table->timestamp('rencana_berangkat_pada')->nullable()->after('tanggal_kembali');
            $table->timestamp('rencana_kembali_pada')->nullable()->after('rencana_berangkat_pada');
            $table->timestamp('berangkat_pada')->nullable()->after('rencana_kembali_pada');
            $table->timestamp('kembali_pada')->nullable()->after('berangkat_pada');
            $table->timestamp('ditandai_terlambat_pada')->nullable()->after('kembali_pada');
            $table->foreignUuid('keberangkatan_dicatat_oleh')->nullable()->after('ditandai_terlambat_pada')->constrained('users')->nullOnDelete();
            $table->foreignUuid('kepulangan_dicatat_oleh')->nullable()->after('keberangkatan_dicatat_oleh')->constrained('users')->nullOnDelete();
            $table->index(['status', 'rencana_kembali_pada']);
        });
    }

    public function down(): void
    {
        Schema::table('pengajuan_izin_pulang', function (Blueprint $table) {
            $table->dropIndex(['status', 'rencana_kembali_pada']);
            $table->dropConstrainedForeignId('kepulangan_dicatat_oleh');
            $table->dropConstrainedForeignId('keberangkatan_dicatat_oleh');
            $table->dropColumn([
                'rencana_berangkat_pada', 'rencana_kembali_pada', 'berangkat_pada',
                'kembali_pada', 'ditandai_terlambat_pada',
            ]);
        });
    }
};
