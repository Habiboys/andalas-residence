<?php

namespace App\Services;

use App\Enums\ClientProfileCategory;
use App\Enums\LegacyFreeResidenceVerificationPath;
use App\Models\PengajuanBebasAsrama;
use App\Models\Tagihan;

class FreeResidenceLetterFormat
{
    public const VERSION = 'free-residence-categories-v2';

    /** @return array<string, mixed> */
    public function data(PengajuanBebasAsrama $application): array
    {
        $student = $application->mahasiswa;
        $student->loadMissing(['user', 'prodi.departemen.faculty']);
        $category = $student->user->client_profile_category;
        $notResident = $application->legacy_verification_path === LegacyFreeResidenceVerificationPath::NotAlumni;
        $subsidized = in_array($category, [ClientProfileCategory::LocalKipk, ClientProfileCategory::InternationalFreeFacility], true);
        $variant = $notResident ? 'not_resident' : ($subsidized ? 'general' : 'paid');
        $placement = $notResident ? null : ($application->checkoutRequest?->placement
            ?? $student->penempatanKamar()->with('kamar.lantai.gedung')->latest('tanggal_mulai')->first());
        $paid = (float) Tagihan::where('mahasiswa_id', $student->id)->where('status', '!=', 'batal')->sum('total_dibayar');

        return [
            'variant' => $variant,
            'title' => match ($variant) {
                'not_resident' => 'SURAT KETERANGAN TIDAK TINGGAL DI ASRAMA',
                'paid' => 'SURAT KETERANGAN TELAH MEMBAYAR UANG ASRAMA',
                default => 'SURAT KETERANGAN BEBAS ASRAMA',
            },
            'categoryLabel' => match ($category) {
                ClientProfileCategory::LocalKipk => 'KIPK',
                ClientProfileCategory::LocalNonKipk => 'Non KIPK',
                ClientProfileCategory::InternationalStudent => 'Mahasiswa Internasional',
                ClientProfileCategory::InternationalFreeFacility => 'Internasional / Fasilitas Gratis',
                ClientProfileCategory::NonStudent => 'Non-mahasiswa',
                default => 'Mahasiswa',
            },
            'faculty' => $student->prodi?->departemen?->faculty?->name ?? '-',
            'program' => $student->prodi?->name ?? '-',
            'room' => $placement?->kamar ? $placement->kamar->lantai->gedung->nama_gedung.' / '.$placement->kamar->nomor_kamar : '-',
            'amount' => $paid > 0 ? 'Rp '.number_format($paid, 0, ',', '.') : '-',
            'issuedAt' => ($application->approved_at ?? now())->copy()->timezone('Asia/Jakarta')->locale('id'),
        ];
    }
}
