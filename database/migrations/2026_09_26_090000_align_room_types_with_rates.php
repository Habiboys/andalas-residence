<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Menyatukan kosakata tipe kamar dengan tarif hunian: standar, medium, premium.
     * Kamar lama memakai reguler/vip sehingga tarif "standar" tidak pernah cocok.
     */
    public function up(): void
    {
        DB::table('kamar')->where('tipe_kamar', 'reguler')->update(['tipe_kamar' => 'standar']);
        DB::table('kamar')->where('tipe_kamar', 'vip')->update(['tipe_kamar' => 'premium']);
    }

    public function down(): void
    {
        DB::table('kamar')->where('tipe_kamar', 'standar')->update(['tipe_kamar' => 'reguler']);
    }
};
