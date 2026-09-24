<?php

namespace App\Jobs;

use App\Models\DokumenTagihan;
use App\Models\PembayaranTagihan;
use App\Models\Tagihan;
use App\Notifications\DocumentReadyNotification;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;
use Throwable;

class GenerateBillingDocument implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [10, 60];

    public function __construct(
        public readonly string $tagihanId,
        public readonly string $jenis,
        public readonly ?string $pembayaranTagihanId = null,
    ) {
        $this->afterCommit();
    }

    public function uniqueId(): string
    {
        return implode(':', [$this->tagihanId, $this->jenis, $this->pembayaranTagihanId ?? '-']);
    }

    public function handle(): void
    {
        $existing = DokumenTagihan::query()
            ->where('tagihan_id', $this->tagihanId)
            ->where('jenis', $this->jenis)
            ->where('pembayaran_tagihan_id', $this->pembayaranTagihanId)
            ->first();

        if ($existing !== null) {
            return;
        }

        $invoice = Tagihan::with(['mahasiswa.user', 'registration.periode', 'registration.placement.kamar.lantai.gedung'])->findOrFail($this->tagihanId);
        $payment = $this->pembayaranTagihanId ? PembayaranTagihan::findOrFail($this->pembayaranTagihanId) : null;
        $number = match ($this->jenis) {
            'invoice' => $invoice->nomor,
            'residence_receipt' => 'HUNI-'.$invoice->nomor,
            default => 'RCPT-'.$payment->referensi,
        };
        $path = 'documents/billing/'.strtolower($number).'.pdf';
        $contents = Pdf::loadView('pdf.billing-document', [
            'title' => $this->jenis === 'invoice' ? 'TAGIHAN' : 'KWITANSI',
            'number' => $number,
            'invoice' => $invoice,
            'payment' => $payment,
            'student' => $invoice->mahasiswa,
            'registration' => $invoice->registration,
            'placement' => $invoice->registration?->placement,
        ])->setPaper('a4')->output();

        Storage::disk('local')->put($path, $contents);

        $document = DokumenTagihan::create([
            'tagihan_id' => $invoice->id,
            'pembayaran_tagihan_id' => $payment?->id,
            'jenis' => $this->jenis,
            'nomor' => $number,
            'path' => $path,
            'checksum_sha256' => hash('sha256', $contents),
            'template_version' => 'billing-v1',
            'diterbitkan_pada' => now(),
        ]);

        $invoice->mahasiswa->user->notify(new DocumentReadyNotification($document->jenis, $document->nomor, $document->path));
    }

    public function failed(?Throwable $exception): void
    {
        // Billing registry is append-only; failed_jobs is the failure registry until a document exists.
    }
}
