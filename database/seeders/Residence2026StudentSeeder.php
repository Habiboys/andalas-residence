<?php

namespace Database\Seeders;

use App\Services\Residence2026StudentImport;
use Illuminate\Database\Seeder;

class Residence2026StudentSeeder extends Seeder
{
    public function run(): void
    {
        $import = app(Residence2026StudentImport::class);
        $result = $import->apply($import->read());
        foreach ($result['warnings'] as $warning) {
            $this->command?->warn($warning);
        }
        $this->command?->table(['Baru', 'Cocok', 'Ditunda', 'KIP-K', 'Butuh email asli', 'Kamar cocok', 'Kamar ditunda'], [[
            $result['created'], $result['matched'], $result['skipped'], $result['kipk'], $result['pending_email'], $result['placed'], $result['pending_rooms'],
        ]]);
        $this->command?->warn('Tanggal masuk memakai awal periode 2026/2027 sebagai tanggal administratif impor. Pembayaran tidak dibuat dari catatan Excel. Akun tanpa email memakai @import.invalid, nonaktif, dengan password acak; lengkapi email dan aktivasi melalui admin.');
        $this->command?->warn('Prodi belum cocok unik: '.$result['pending_prodi'].'. Master prodi dan kamar harus tersedia terlebih dahulu; impor tidak mengubah master yang sudah ada.');
    }
}
