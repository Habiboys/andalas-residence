<?php

namespace App\Console\Commands;

use App\Services\Residence2026StudentImport;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

#[Signature('asrama:seed-students-2026 {--dry-run : Tampilkan rekonsiliasi sumber tanpa mengubah database} {--force : Jalankan impor di production} {--report : Simpan laporan JSON diagnostik saat dry-run}')]
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
            $report = $import->simulate($data);
            $this->table(['Simulasi master', 'Jumlah'], [
                ['Kamar cocok', $report['room_matches']],
                ['Kamar ditunda', array_sum($report['room_issues'])],
                ['Prodi cocok unik', $report['program_matches']],
                ['Prodi belum cocok', array_sum($report['program_issues'])],
            ]);
            $this->info('Penyebab kamar: '.json_encode($report['room_issues'], JSON_UNESCAPED_UNICODE));
            $this->info('Penyebab prodi: '.json_encode($report['program_issues'], JSON_UNESCAPED_UNICODE));
            $this->warn('Simulasi memakai master database saat ini, tanpa menulis database. Akun, reservasi dan riwayat hunian diperiksa saat impor.');
            if ($this->option('report')) {
                $path = 'import-reports/residents-2026-dry-run.json';
                Storage::disk('local')->put($path, json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
                $this->info('Laporan: '.Storage::disk('local')->path($path));
            }

            return self::SUCCESS;
        }

        return $this->call('db:seed', ['--class' => 'Database\\Seeders\\Residence2026StudentSeeder', '--force' => (bool) $this->option('force')]);
    }
}
