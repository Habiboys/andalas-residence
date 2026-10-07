<?php

namespace App\Console\Commands;

use App\Services\ResidenceMasterImport;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('asrama:seed-master {--file= : Berkas XLSX; default Data Asrama.xlsx} {--dry-run : Validasi dan tampilkan ringkasan tanpa mengubah database}')]
#[Description('Sinkronkan master gedung, lantai, kamar, kategori dan tarif dari Excel')]
class SeedResidenceMaster extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(ResidenceMasterImport $import): int
    {
        try {
            $data = $import->read($this->option('file') ?: base_path('Data Asrama.xlsx'));
            $this->table(['Gedung', 'Kamar', 'Tarif'], array_map(fn (array $building): array => [$building['nama_gedung'], count($building['rooms']), count($building['rates'])], $data['buildings']));
            foreach ($data['warnings'] as $warning) {
                $this->warn($warning);
            }
            if (! $this->option('dry-run')) {
                $import->apply($data['buildings']);
            }
            $this->info($this->option('dry-run') ? 'Validasi selesai; database tidak diubah.' : 'Master data berhasil disinkronkan. Data hunian dan kamar di luar sumber dipertahankan.');

            return self::SUCCESS;
        } catch (\Throwable $exception) {
            $this->error($exception->getMessage());

            return self::FAILURE;
        }
    }
}
