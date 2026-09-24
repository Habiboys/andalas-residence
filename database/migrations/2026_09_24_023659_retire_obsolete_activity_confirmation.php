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
        $archive = [
            'kegiatan_partisipan' => Schema::hasTable('kegiatan_partisipan') ? DB::table('kegiatan_partisipan')->orderBy('id')->get()->all() : [],
            'kegiatan_target_role' => Schema::hasColumn('kegiatan', 'target_role') ? DB::table('kegiatan')->select(['id', 'target_role'])->orderBy('id')->get()->all() : [],
        ];
        $path = 'backups/retired-activity-confirmation-'.now()->format('Ymd-His-u').'.json';
        if (! Storage::disk('local')->put($path, json_encode($archive, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR))) {
            throw new RuntimeException('Cadangan konfirmasi kegiatan gagal dibuat; penghapusan dibatalkan.');
        }

        Schema::dropIfExists('kegiatan_partisipan');
        if (Schema::hasColumn('kegiatan', 'target_role')) {
            Schema::table('kegiatan', function (Blueprint $table): void {
                $table->dropColumn('target_role');
            });
        }
    }

    public function down(): void
    {
        throw new RuntimeException('Pulihkan cadangan database untuk mengembalikan konfirmasi kegiatan lama.');
    }
};
