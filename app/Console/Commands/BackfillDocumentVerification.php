<?php

namespace App\Console\Commands;

use App\Models\DocumentSigner;
use App\Models\FreeResidenceLetterDocumentIntent;
use App\Services\DocumentNumber;
use App\Services\DocumentVerificationQr;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BackfillDocumentVerification extends Command
{
    protected $signature = 'documents:backfill-verification';

    protected $description = 'Melengkapi token, penandatangan, nomor surat, dan QR verifikasi pada surat lama yang sudah terbit';

    public function handle(): int
    {
        $intents = FreeResidenceLetterDocumentIntent::query()
            ->where('status', 'ready')
            ->with('pengajuan.mahasiswa.user')
            ->get();

        $signer = DocumentSigner::aktif();
        $signerName = $signer?->nama ?? (string) config('residence.letter_signer');
        $signerNip = $signer?->nip;

        foreach ($intents as $intent) {
            $application = $intent->pengajuan;
            if ($application === null) {
                continue;
            }

            $number = $application->nomor_surat_resmi
                ?? ($intent->nomor !== null && str_starts_with($intent->nomor, 'SBA/') ? $intent->nomor : null);
            if ($number === null) {
                $number = app(DocumentNumber::class)->next('surat_bebas_asrama', 'SBA');
            }

            $token = $intent->verification_token ?? (string) Str::uuid();
            $qr = app(DocumentVerificationQr::class)->make($token);
            $contents = Pdf::loadView('pdf.surat-bebas-asrama', [
                'pengajuan' => $application,
                'mahasiswa' => $application->mahasiswa,
                'documentNumber' => $number,
                'verificationQr' => $qr['data_uri'],
                'verificationUrl' => $qr['url'],
            ])->setPaper('a4')->output();

            $path = $intent->path ?? 'documents/free-residence/'.$intent->id.'.pdf';
            Storage::disk('local')->put($path, $contents);
            $intent->update([
                'nomor' => $number,
                'verification_token' => $token,
                'signer_name' => $intent->signer_name ?? $signerName,
                'signer_nip' => $intent->signer_nip ?? $signerNip,
                'path' => $path,
                'checksum_sha256' => hash('sha256', $contents),
                'generated_at' => now(),
            ]);
            $application->update(['file_surat_path' => $path]);

            $this->info("Surat {$intent->id} diperbarui: nomor {$number}, token {$token}.");
        }

        $this->components->info("Selesai: {$intents->count()} surat diperiksa.");

        return self::SUCCESS;
    }
}
