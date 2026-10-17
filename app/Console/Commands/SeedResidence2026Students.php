<?php

namespace App\Console\Commands;

use App\Services\Residence2026StudentImport;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('asrama:seed-students-2026 {--dry-run : Tampilkan rekonsiliasi sumber tanpa mengubah database} {--force : Jalankan impor di production}')]
#[Description('Impor mahasiswa dan penerima KIP-K dari rekonsiliasi Excel asrama 2026/2027')]
class SeedResidence2026Students extends Command
{
    public function handle(Residence2026StudentImport $import): int
    {
        $data = $import->read();
        $students = collect($data['students']);
        $this->table(['Kategori sumber', 'NIM unik'], $students->groupBy(fn (array $row): string => $row['category'] ?? 'Belum terkonfirmasi')->map(fn ($rows, $category): array => [$category, $rows->count()])->values()->all());
        $this->info('NIM valid: '.$students->count().'; siap impor: '.$students->filter(fn (array $row): bool => $row['issues'] === [])->count().'; baris NIM perlu diperbaiki: '.count($data['unresolved']).'.');
        if ($this->option('dry-run')) {
            $this->warn('Ini pemeriksaan dataset; kecocokan akun/email/prodi database diperiksa saat impor. Referensi masalah: database/seeders/data/residents-2026.json.');

            return self::SUCCESS;
        }

        return $this->call('db:seed', ['--class' => 'Database\\Seeders\\Residence2026StudentSeeder', '--force' => (bool) $this->option('force')]);
    }
}
