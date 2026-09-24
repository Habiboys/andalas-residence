<?php

namespace App\Jobs;

use App\Models\FreeResidenceLetterDocumentIntent;
use App\Notifications\DocumentReadyNotification;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;
use Throwable;

class GenerateFreeResidenceLetter implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [10, 60];

    public function __construct(public readonly string $intentId)
    {
        $this->afterCommit();
    }

    public function uniqueId(): string
    {
        return $this->intentId;
    }

    public function handle(): void
    {
        $intent = FreeResidenceLetterDocumentIntent::with(['pengajuan.mahasiswa.user', 'pengajuan.mahasiswa.prodi'])->findOrFail($this->intentId);

        if ($intent->status === 'ready') {
            return;
        }

        $application = $intent->pengajuan;
        $number = $application->nomor_surat_resmi ?: 'SBA-'.$application->nomor_pengajuan;
        $path = 'documents/free-residence/'.strtolower($number).'.pdf';
        $contents = Pdf::loadView('pdf.surat-bebas-asrama', [
            'pengajuan' => $application,
            'mahasiswa' => $application->mahasiswa,
            'documentNumber' => $number,
        ])->setPaper('a4')->output();

        Storage::disk('local')->put($path, $contents);
        $intent->update([
            'status' => 'ready',
            'nomor' => $number,
            'path' => $path,
            'checksum_sha256' => hash('sha256', $contents),
            'template_version' => 'free-residence-dummy-v1',
            'generated_at' => now(),
            'failure_reason' => null,
        ]);
        $application->update(['file_surat_path' => $path]);
        $application->mahasiswa->update(['status_huni' => 'keluar']);
        $application->mahasiswa->user->update(['status' => 'nonaktif']);

        $application->mahasiswa->user->notify(new DocumentReadyNotification('surat_bebas_asrama', $number, $path));
    }

    public function failed(?Throwable $exception): void
    {
        FreeResidenceLetterDocumentIntent::whereKey($this->intentId)->update([
            'status' => 'failed',
            'failure_reason' => mb_substr($exception?->getMessage() ?? 'Document generation failed.', 0, 2000),
        ]);
    }
}
