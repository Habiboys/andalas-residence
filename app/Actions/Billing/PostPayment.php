<?php

namespace App\Actions\Billing;

use App\Actions\ApproveFreeResidenceLetter;
use App\Actions\Registration\CompleteResidenceRegistration;
use App\Enums\FreeResidenceLetterStatus;
use App\Enums\TagihanStatus;
use App\Jobs\GenerateBillingDocument;
use App\Models\MahasiswaProfil;
use App\Models\PembayaranTagihan;
use App\Models\PengajuanBebasAsrama;
use App\Models\Tagihan;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PostPayment
{
    public function __construct(private CompleteResidenceRegistration $completeRegistration, private ApproveFreeResidenceLetter $approveLetter) {}

    /**
     * @param  list<array{tagihan_id: string, jadwal_cicilan_id?: string|null, jumlah: int|float|string}>  $allocations
     * @param  array<string, mixed>|null  $metadata
     */
    public function handle(string $referensi, string $mahasiswaId, string $dibayarPada, array $allocations, ?string $virtualAccountId = null, ?array $metadata = null): PembayaranTagihan
    {
        return DB::transaction(function () use ($referensi, $mahasiswaId, $dibayarPada, $allocations, $virtualAccountId, $metadata): PembayaranTagihan {
            MahasiswaProfil::whereKey($mahasiswaId)->lockForUpdate()->firstOrFail();
            $existing = PembayaranTagihan::where('referensi', $referensi)->first();

            if ($existing !== null) {
                if ($existing->mahasiswa_id !== $mahasiswaId) {
                    throw new InvalidArgumentException('Referensi pembayaran sudah digunakan oleh penghuni lain.');
                }

                return $existing->load('alokasi');
            }

            $jumlah = collect($allocations)->sum(fn (array $allocation): float => (float) $allocation['jumlah']);

            if ($jumlah <= 0) {
                throw new InvalidArgumentException('Jumlah pembayaran harus lebih dari nol.');
            }

            $payment = PembayaranTagihan::create([
                'referensi' => $referensi,
                'mahasiswa_id' => $mahasiswaId,
                'virtual_account_id' => $virtualAccountId,
                'jumlah' => $jumlah,
                'dibayar_pada' => $dibayarPada,
                'metadata' => $metadata,
            ]);

            $firstTagihanId = null;

            foreach ($allocations as $allocation) {
                $tagihan = Tagihan::whereKey($allocation['tagihan_id'])->where('mahasiswa_id', $mahasiswaId)->lockForUpdate()->firstOrFail();
                $firstTagihanId ??= $tagihan->id;
                $amount = (float) $allocation['jumlah'];
                $remaining = (float) $tagihan->total - (float) $tagihan->total_dibayar;

                if ($tagihan->status === TagihanStatus::Batal || $amount <= 0 || $amount - $remaining > 0.005) {
                    throw new InvalidArgumentException('Alokasi pembayaran tidak valid.');
                }

                $payment->alokasi()->create($allocation);
                $tagihan->total_dibayar = (float) $tagihan->total_dibayar + $amount;
                $tagihan->status = abs((float) $tagihan->total - (float) $tagihan->total_dibayar) <= 0.005
                    ? TagihanStatus::Lunas
                    : TagihanStatus::Sebagian;
                $tagihan->save();
                if ($tagihan->registration) {
                    $this->completeRegistration->handle($tagihan->registration);
                }
                $tagihan->update(['amount_due_now' => null]);
            }

            $hasOutstandingDebt = Tagihan::where('mahasiswa_id', $mahasiswaId)->where('status', '!=', TagihanStatus::Batal)->whereColumn('total', '>', 'total_dibayar')->exists();
            if (! $hasOutstandingDebt) {
                $application = PengajuanBebasAsrama::where('mahasiswa_id', $mahasiswaId)
                    ->whereIn('status', [FreeResidenceLetterStatus::Diverifikasi, FreeResidenceLetterStatus::Ditolak])
                    ->where('legacy_verification_path', 'alumni_unpaid')
                    ->whereHas('tagihan', fn ($query) => $query->where('status', TagihanStatus::Lunas))
                    ->whereDoesntHave('mahasiswa.penempatanKamar', fn ($query) => $query->where('status', 'aktif'))
                    ->latest()->first();
                if ($application) {
                    $this->approveLetter->handle($application, null);
                }
            }

            if ($firstTagihanId !== null) {
                GenerateBillingDocument::dispatch($firstTagihanId, 'receipt', $payment->id)->afterCommit();
            }

            return $payment->load('alokasi');
        });
    }
}
