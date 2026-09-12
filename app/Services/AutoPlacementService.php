<?php

namespace App\Services;

use App\Models\Kamar;
use App\Models\MahasiswaProfil;
use App\Models\PenempatanKamar;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AutoPlacementService
{
    /**
     * @return array{assigned: int, skipped: array<int, string>, preview: Collection}
     */
    public function runBatch(User $petugas, bool $commit = false): array
    {
        $mahasiswa = MahasiswaProfil::query()
            ->where('status_huni', 'calon')
            ->whereDoesntHave('penempatanKamar', fn ($q) => $q->where('status', 'aktif'))
            ->with(['user', 'prodi'])
            ->get();

        $assigned = 0;
        $skipped = [];
        $preview = collect();

        foreach ($mahasiswa as $mhs) {
            $gender = $mhs->user->gender;
            $kamar = Kamar::query()
                ->whereIn('status', ['kosong', 'terisi_sebagian'])
                ->whereHas('lantai.gedung', function ($q) use ($gender) {
                    $q->where('gender_peruntukan', $gender)
                        ->orWhere('gender_peruntukan', 'campur');
                })
                ->withCount(['penempatanKamar as okupansi' => fn ($q) => $q->where('status', 'aktif')])
                ->get()
                ->filter(fn (Kamar $k) => $k->okupansi < $k->kapasitas)
                ->sortBy('okupansi')
                ->first();

            if (! $kamar) {
                $skipped[] = "Mahasiswa {$mhs->user->nama}: tidak ada kamar tersedia";

                continue;
            }

            $preview->push([
                'mahasiswa_id' => $mhs->id,
                'mahasiswa_nama' => $mhs->user->nama,
                'kamar_id' => $kamar->id,
                'nomor_kamar' => $kamar->nomor_kamar,
            ]);

            if ($commit) {
                DB::transaction(function () use ($mhs, $kamar, $petugas) {
                    PenempatanKamar::create([
                        'mahasiswa_id' => $mhs->id,
                        'kamar_id' => $kamar->id,
                        'periode_id' => $mhs->periode_id,
                        'tanggal_mulai' => now()->toDateString(),
                        'metode' => 'auto_assign',
                        'status' => 'aktif',
                        'diproses_oleh' => $petugas->id,
                    ]);

                    $okupansi = $kamar->penempatanKamar()->where('status', 'aktif')->count() + 1;
                    $kamar->update([
                        'status' => $okupansi >= $kamar->kapasitas ? 'penuh' : 'terisi_sebagian',
                    ]);

                    $mhs->update(['status_huni' => 'aktif', 'tanggal_masuk' => now()]);
                });
                $assigned++;
            }
        }

        return compact('assigned', 'skipped', 'preview');
    }
}
