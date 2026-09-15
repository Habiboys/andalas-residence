<?php

namespace App\Actions\Billing;

use App\Enums\TagihanStatus;
use App\Jobs\GenerateBillingDocument;
use App\Models\MahasiswaProfil;
use App\Models\Tagihan;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CreateTagihan
{
    /**
     * @param  list<array{deskripsi: string, kuantitas: int, harga_satuan: int|float|string}>  $items
     * @param  list<array{sumber: string, deskripsi: string, jumlah: int|float|string, metadata?: array<string, mixed>|null}>  $penyesuaian
     * @param  list<array{jatuh_tempo: string, jumlah: int|float|string}>  $cicilan
     */
    public function handle(MahasiswaProfil $mahasiswa, string $nomor, array $items = [], array $penyesuaian = [], array $cicilan = []): Tagihan
    {
        return DB::transaction(function () use ($mahasiswa, $nomor, $items, $penyesuaian, $cicilan): Tagihan {
            $subtotal = collect($items)->sum(fn (array $item): float => $item['kuantitas'] * (float) $item['harga_satuan']);
            $totalPenyesuaian = collect($penyesuaian)->sum(fn (array $adjustment): float => (float) $adjustment['jumlah']);
            $total = max(0, $subtotal + $totalPenyesuaian);

            if ($cicilan !== [] && abs(collect($cicilan)->sum(fn (array $term): float => (float) $term['jumlah']) - $total) > 0.005) {
                throw new InvalidArgumentException('Total cicilan harus sama dengan total tagihan.');
            }

            $tagihan = Tagihan::create([
                'nomor' => $nomor,
                'mahasiswa_id' => $mahasiswa->id,
                'status' => TagihanStatus::Draft,
                'subtotal' => $subtotal,
                'total_penyesuaian' => $totalPenyesuaian,
                'total' => $total,
            ]);

            foreach ($items as $item) {
                $tagihan->items()->create([...$item, 'jumlah' => $item['kuantitas'] * (float) $item['harga_satuan']]);
            }

            foreach ($penyesuaian as $adjustment) {
                $tagihan->penyesuaian()->create($adjustment);
            }

            foreach ($cicilan as $index => $term) {
                $tagihan->jadwalCicilan()->create([...$term, 'termin_ke' => $index + 1]);
            }

            GenerateBillingDocument::dispatch($tagihan->id, 'invoice')->afterCommit();

            return $tagihan->load(['items', 'penyesuaian', 'jadwalCicilan']);
        });
    }
}
