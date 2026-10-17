<?php

namespace Database\Seeders;

use App\Services\Residence2026StudentImport;
use Illuminate\Database\Seeder;

class Residence2026StudentSeeder extends Seeder
{
    public function run(): void
    {
        $import = app(Residence2026StudentImport::class);
        $result = $import->apply($import->read(), function (int $processed, int $total): void {
            $this->command?->line('Impor mahasiswa: '.$processed.'/'.$total.' diproses (transaksi belum selesai).');
        });
        $this->command?->info('Transaksi impor mahasiswa selesai.');
        foreach (['room_issues' => 'Penyebab kamar ditunda', 'program_issues' => 'Penyebab prodi belum cocok'] as $key => $title) {
            $this->command?->info($title.': '.json_encode($result[$key], JSON_UNESCAPED_UNICODE));
        }
        foreach ($result['warnings'] as $warning) {
            $this->command?->warn($warning);
        }
        $this->command?->table(['Baru', 'Cocok', 'Ditunda', 'KIP-K', 'Butuh email asli', 'Kamar cocok', 'Kamar ditunda'], [[
            $result['created'], $result['matched'], $result['skipped'], $result['kipk'], $result['pending_email'], $result['placed'], $result['pending_rooms'],
        ]]);
        $this->command?->warn('Tanggal masuk memakai awal periode 2026/2027 sebagai tanggal administratif impor. Penghuni check-in dicatat sudah membayar berdasarkan konfirmasi pengelola dan tidak ditagih ulang. Ledger pembayaran tidak direkayasa: nominal dan tanggal transaksi asli perlu direkonsiliasi. Akun tanpa email memakai @import.invalid, nonaktif, dengan password acak; lengkapi email dan aktivasi melalui admin.');
        $this->command?->warn('Prodi belum cocok unik: '.$result['pending_prodi'].'. Profil tetap diimpor tanpa mengarang prodi. Periksa kolom jurusan kosong, nama tidak dikenal, atau jenjang S1/D3 yang belum jelas.');
    }
}
