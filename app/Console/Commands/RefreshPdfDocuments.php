<?php

namespace App\Console\Commands;

use App\Models\DokumenTagihan;
use App\Models\FreeResidenceLetterDocumentIntent;
use App\Models\InvoiceGroup;
use App\Services\DocumentVerificationQr;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class RefreshPdfDocuments extends Command
{
    protected $signature = 'documents:refresh-pdfs';

    protected $description = 'Merender ulang berkas PDF (Surat Bebas Asrama, Tagihan/Kwitansi, dan Invoice Kelompok) menggunakan template kop surat DOCX terbaru';

    public function handle(): int
    {
        $refreshedLetters = $this->refreshFreeResidenceLetters();
        $refreshedBilling = $this->refreshBillingDocuments();
        $refreshedGroups = $this->refreshInvoiceGroups();

        $this->components->info(
            "Selesai merender ulang PDF: {$refreshedLetters} surat bebas asrama, {$refreshedBilling} dokumen tagihan/kwitansi, {$refreshedGroups} invoice kelompok."
        );

        return self::SUCCESS;
    }

    private function refreshFreeResidenceLetters(): int
    {
        $count = 0;
        $intents = FreeResidenceLetterDocumentIntent::query()
            ->where('status', 'ready')
            ->with(['pengajuan.mahasiswa.user', 'pengajuan.mahasiswa.prodi.departemen.faculty'])
            ->get();

        foreach ($intents as $intent) {
            $application = $intent->pengajuan;
            if ($application === null || $application->mahasiswa === null || empty($intent->path)) {
                continue;
            }

            $qr = $intent->verification_token
                ? app(DocumentVerificationQr::class)->make($intent->verification_token)
                : null;

            $contents = Pdf::loadView('pdf.surat-bebas-asrama', [
                'pengajuan' => $application,
                'mahasiswa' => $application->mahasiswa,
                'documentNumber' => $intent->nomor ?? $application->nomor_surat_resmi ?? $application->nomor_pengajuan,
                'verificationQr' => $qr['data_uri'] ?? null,
                'verificationUrl' => $qr['url'] ?? null,
            ])->setPaper('a4')->output();

            Storage::disk('local')->put($intent->path, $contents);
            $intent->update(['checksum_sha256' => hash('sha256', $contents)]);
            $count++;
        }

        return $count;
    }

    private function refreshBillingDocuments(): int
    {
        $count = 0;
        $documents = DokumenTagihan::query()
            ->with(['tagihan.mahasiswa.user', 'tagihan.registration.periode', 'tagihan.registration.placement.kamar.lantai.gedung', 'pembayaran'])
            ->get();

        foreach ($documents as $document) {
            $invoice = $document->tagihan;
            if ($invoice === null || $invoice->mahasiswa === null || empty($document->path)) {
                continue;
            }

            $contents = Pdf::loadView('pdf.billing-document', [
                'title' => $document->jenis === 'invoice' ? 'TAGIHAN' : 'KWITANSI',
                'number' => $document->nomor,
                'invoice' => $invoice,
                'payment' => $document->pembayaran,
                'student' => $invoice->mahasiswa,
                'registration' => $invoice->registration,
                'placement' => $invoice->registration?->placement,
            ])->setPaper('a4')->output();

            Storage::disk('local')->put($document->path, $contents);
            DB::table('dokumen_tagihan')
                ->where('id', $document->id)
                ->update(['checksum_sha256' => hash('sha256', $contents)]);
            $count++;
        }

        return $count;
    }

    private function refreshInvoiceGroups(): int
    {
        $count = 0;
        $groups = InvoiceGroup::query()->whereNotNull('path')->get();

        foreach ($groups as $group) {
            $snapshot = $group->snapshot;
            if ($snapshot === [] || empty($group->path)) {
                continue;
            }

            $contents = Pdf::loadView('pdf.invoice-group', [
                'invoice' => $snapshot,
            ])->setPaper('a4')->output();

            Storage::disk('local')->put($group->path, $contents);
            $count++;
        }

        return $count;
    }
}
