<?php

namespace App\Services;

use App\Models\PengajuanBebasAsrama;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;

class SuratPdfService
{
    public function generateBebasAsrama(PengajuanBebasAsrama $pengajuan): string
    {
        $pengajuan->load(['mahasiswa.user', 'mahasiswa.prodi', 'mahasiswa.penempatanKamar.kamar.lantai.gedung']);

        $pdf = Pdf::loadView('pdf.surat-bebas-asrama', [
            'pengajuan' => $pengajuan,
            'mahasiswa' => $pengajuan->mahasiswa,
        ])->setPaper('a4');

        $path = 'surat/bebas-asrama/'.$pengajuan->nomor_pengajuan.'.pdf';
        Storage::disk('local')->put($path, $pdf->output());

        $pengajuan->update(['file_surat_path' => $path]);

        return $path;
    }
}
