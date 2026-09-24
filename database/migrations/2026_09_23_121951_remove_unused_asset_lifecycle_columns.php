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
        if (! app()->runningUnitTests()) {
            $archive = DB::table('aset')
                ->select(['id', 'status_siklus_hidup', 'dihapuskan_pada'])
                ->orderBy('id')
                ->get();
            $path = 'backups/retired-asset-lifecycle-'.now()->format('Ymd-His').'.json';
            if (! Storage::disk('local')->put($path, json_encode($archive, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR))) {
                throw new RuntimeException('Cadangan status siklus aset gagal dibuat; penghapusan dibatalkan.');
            }
        }

        Schema::table('aset', function (Blueprint $table): void {
            $table->dropIndex(['status_siklus_hidup', 'kondisi']);
            $table->dropColumn(['status_siklus_hidup', 'dihapuskan_pada']);
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Kolom siklus aset lama tidak dapat dipulihkan otomatis. Gunakan berkas cadangan.');
    }
};
