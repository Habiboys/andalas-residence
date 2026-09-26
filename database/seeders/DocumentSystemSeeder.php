<?php

namespace Database\Seeders;

use App\Models\DocumentNumberSequence;
use App\Models\DocumentSigner;
use Illuminate\Database\Seeder;

class DocumentSystemSeeder extends Seeder
{
    public function run(): void
    {
        DocumentSigner::firstOrCreate(
            ['nama' => (string) config('residence.letter_signer')],
            ['jabatan' => 'Pengelola Asrama', 'unit' => 'Universitas Andalas', 'aktif' => true],
        );

        DocumentNumberSequence::firstOrCreate(
            ['tipe' => 'surat_bebas_asrama', 'tahun' => (int) now()->year],
            ['nomor_terakhir' => 0],
        );
    }
}
