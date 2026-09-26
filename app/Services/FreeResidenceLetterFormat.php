<?php

namespace App\Services;

use App\Enums\ClientProfileCategory;
use App\Enums\LegacyFreeResidenceVerificationPath;
use App\Models\Gedung;
use App\Models\PengajuanBebasAsrama;
use Illuminate\Support\Carbon;

class FreeResidenceLetterFormat
{
    public const VERSION = 'residence-snapshot-v3';

    /** @return array<string, mixed> */
    public function data(PengajuanBebasAsrama $application): array
    {
        if ($application->document_snapshot) {
            return [...$application->document_snapshot, 'issuedAt' => Carbon::parse($application->document_snapshot['issuedAt'])->timezone('Asia/Jakarta')->locale('id')];
        }
        $student = $application->mahasiswa;
        $student->loadMissing(['user', 'prodi.departemen.faculty']);
        $category = $student->user->client_profile_category;
        $notResident = $application->legacy_verification_path === LegacyFreeResidenceVerificationPath::NotAlumni;
        $checkoutPlacement = $application->checkoutRequest?->placement;
        $registrationTagihan = $checkoutPlacement?->registration?->tagihan;
        $subsidized = $checkoutPlacement?->registration?->funding === 'sponsor'
            || in_array($category, [ClientProfileCategory::LocalKipk, ClientProfileCategory::InternationalFreeFacility], true);
        $variant = $notResident ? 'not_resident' : ($subsidized ? 'general' : 'paid');
        $placement = $notResident ? null : ($checkoutPlacement
            ?? $student->penempatanKamar()->with('kamar.lantai.gedung')->latest('tanggal_mulai')->first());
        $legacy = app(ResidenceLifecycle::class)->legacy($student);
        $paidSource = $application->tagihan ?? $registrationTagihan;
        $paid = $paidSource === null ? 0.0 : (float) $paidSource->total_dibayar;
        $faculty = $student->prodi?->departemen?->faculty;
        $prodi = $student->prodi;

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
            'faculty' => $faculty === null ? '-' : $faculty->name,
            'program' => $prodi === null ? '-' : $prodi->name,
            'room' => $placement?->kamar ? $placement->kamar->lantai->gedung->nama_gedung.' / '.$placement->kamar->nomor_kamar : ($legacy ? Gedung::find($legacy->gedung_id)?->nama_gedung : '-'),
            'amount' => $paid > 0 ? 'Rp '.number_format($paid, 0, ',', '.') : '-',
            'issuedAt' => Carbon::parse($application->approved_at ?? now())->timezone('Asia/Jakarta')->locale('id'),
        ];
    }
}
