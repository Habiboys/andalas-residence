<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['faculty', 'departemen', 'prodi'] as $name) {
            Schema::table($name, function (Blueprint $table): void {
                $table->string('code', 30)->nullable()->unique();
            });
        }
        DB::table('users')->where('client_profile_category', 'local_resident')->update(['client_profile_category' => 'local_non_kipk']);
        DB::table('gedung')->whereIn('kode_gedung', ['A', 'B', 'C', 'D', 'E'])->update(['gender_peruntukan' => 'perempuan']);
        DB::table('gedung')->whereIn('kode_gedung', ['F', 'G', 'H'])->update(['gender_peruntukan' => 'laki_laki']);
        DB::table('gedung')->whereIn('kode_gedung', ['NAKES', 'Nakes', 'ASN'])->update(['gender_peruntukan' => 'campur']);
        DB::table('gedung')->where('kode_gedung', 'A')->where('nama_gedung', 'Asrama Putra A')->update(['nama_gedung' => 'Asrama Putri A']);
    }

    public function down(): void
    {
        foreach (['faculty', 'departemen', 'prodi'] as $name) {
            Schema::table($name, function (Blueprint $table): void {
                $table->dropUnique(['code']);
                $table->dropColumn('code');
            });
        }
    }
};
