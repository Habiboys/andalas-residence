<?php

namespace App\Http\Controllers;

use App\Models\PengajuanBebasAsrama;
use App\Models\PengajuanIzinPulang;
use App\Services\AuditLogService;
use App\Services\SuratPdfService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PengajuanController extends Controller
{
    public function storeBebas(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'pengajuan.submit');

        $mhs = $request->user()->mahasiswaProfil;
        abort_unless($mhs, 403);

        $validated = $request->validate(['alasan' => 'required|string']);

        $pengajuan = PengajuanBebasAsrama::create([
            'nomor_pengajuan' => 'BA-'.now()->format('Ymd').'-'.strtoupper(Str::random(4)),
            'mahasiswa_id' => $mhs->id,
            'alasan' => $validated['alasan'],
            'status' => 'diajukan',
        ]);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Pengajuan berhasil: {$pengajuan->nomor_pengajuan}",
        ]);
    }

    public function storeIzin(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'pengajuan.submit');

        $mhs = $request->user()->mahasiswaProfil;
        abort_unless($mhs, 403);

        $validated = $request->validate([
            'tanggal_mulai' => 'required|date',
            'tanggal_kembali' => 'required|date|after_or_equal:tanggal_mulai',
            'alasan' => 'required|string',
            'tujuan_alamat' => 'nullable|string',
            'kontak_darurat' => 'nullable|string',
        ]);

        $pengajuan = PengajuanIzinPulang::create([
            ...$validated,
            'mahasiswa_id' => $mhs->id,
            'status' => 'diajukan',
        ]);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Pengajuan izin pulang berhasil dikirim.',
        ]);
    }

    public function approveBebas(Request $request, PengajuanBebasAsrama $pengajuan, SuratPdfService $pdf): RedirectResponse
    {
        $this->authorizePermission($request, 'pengajuan.approve');

        $validated = $request->validate([
            'status' => 'required|in:disetujui,ditolak',
            'catatan_penolakan' => 'nullable|string',
            'nomor_surat_resmi' => 'nullable|string|max:100',
        ]);

        $pengajuan->update([
            'status' => $validated['status'],
            'catatan_penolakan' => $validated['catatan_penolakan'] ?? null,
            'disetujui_oleh' => $request->user()->id,
            'nomor_surat_resmi' => $validated['nomor_surat_resmi'] ?? $pengajuan->nomor_surat_resmi,
        ]);

        if ($validated['status'] === 'disetujui') {
            $pdf->generateBebasAsrama($pengajuan);
        }

        AuditLogService::log($request->user(), 'approve_pengajuan_bebas', $pengajuan, null, $pengajuan->fresh()->toArray(), $request);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Pengajuan bebas asrama berhasil '.($validated['status'] === 'disetujui' ? 'disetujui' : 'ditolak').'.',
        ]);
    }

    public function approveIzin(Request $request, PengajuanIzinPulang $pengajuan): RedirectResponse
    {
        $this->authorizePermission($request, 'pengajuan.approve');

        $validated = $request->validate([
            'status' => 'required|in:disetujui,ditolak',
        ]);

        $pengajuan->update([
            'status' => $validated['status'],
            'disetujui_oleh' => $request->user()->id,
        ]);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Pengajuan izin pulang berhasil '.($validated['status'] === 'disetujui' ? 'disetujui' : 'ditolak').'.',
        ]);
    }

    public function downloadSuratBebas(Request $request, PengajuanBebasAsrama $pengajuan)
    {
        $this->authorizePermission($request, 'pengajuan.download_surat');

        abort_unless($pengajuan->file_surat_path && Storage::disk('local')->exists($pengajuan->file_surat_path), 404);

        return Storage::disk('local')->download($pengajuan->file_surat_path, $pengajuan->nomor_pengajuan.'.pdf');
    }
}
