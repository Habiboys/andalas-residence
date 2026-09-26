<?php

namespace App\Http\Controllers;

use App\Models\FreeResidenceLetterDocumentIntent;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DocumentVerificationController extends Controller
{
    public function show(Request $request, string $token): Response
    {
        $intent = FreeResidenceLetterDocumentIntent::query()
            ->with(['pengajuan.mahasiswa.user', 'pengajuan.mahasiswa.prodi.departemen.faculty'])
            ->where('verification_token', $token)
            ->first();

        $student = $intent?->pengajuan?->mahasiswa;
        $document = $intent?->pengajuan?->document_snapshot;
        $published = $intent !== null && $intent->status === 'ready' && $intent->nomor !== null;

        return Inertia::render('landing/verifikasi-dokumen', [
            'valid' => $published,
            'document' => $published ? [
                'nomor' => $intent->nomor,
                'jenis' => $this->title($intent->pengajuan?->document_kind, $document),
                'nama' => $student?->user->nama,
                'nim' => $student?->user->nim_nip,
                'fakultas' => $document['faculty'] ?? $student?->prodi?->departemen?->faculty?->name,
                'program' => $document['program'] ?? $student?->prodi?->name,
                'status' => $document['variant'] ?? null,
                'tanggal_terbit' => $intent->generated_at?->timezone('Asia/Jakarta')->translatedFormat('d F Y'),
                'penandatangan' => $intent->signer_name,
                'nip_penandatangan' => $intent->signer_nip,
                'template' => $intent->template_version,
                'checksum' => $intent->checksum_sha256 ? substr($intent->checksum_sha256, 0, 16) : null,
            ] : null,
            'reason' => $published ? null : ($intent === null
                ? 'Token verifikasi tidak dikenal. Pastikan surat berasal dari penerbit resmi.'
                : 'Surat ini belum selesai diterbitkan atau telah dibatalkan.'),
        ]);
    }

    private function title(?string $kind, ?array $document): ?string
    {
        if ($document && isset($document['title'])) {
            return $document['title'];
        }

        return $kind === 'not_resident' ? 'SURAT KETERANGAN TIDAK TINGGAL DI ASRAMA' : 'SURAT KETERANGAN BEBAS ASRAMA';
    }
}
