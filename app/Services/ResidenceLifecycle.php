<?php

namespace App\Services;

use App\Enums\ClientProfileCategory;
use App\Models\KipkRecipient;
use App\Models\LegacyResident;
use App\Models\MahasiswaProfil;
use App\Models\Periode;
use App\Models\Prodi;
use App\Models\Tagihan;

class ResidenceLifecycle
{
    public function legacy(MahasiswaProfil $student): ?LegacyResident
    {
        return LegacyResident::where('nim', $student->user->nim_nip)->first();
    }

    public function hasStayed(MahasiswaProfil $student): bool
    {
        return $this->legacy($student) !== null || $student->residenceHistories()->exists()
            || $student->penempatanKamar()->exists();
    }

    public function hasEndedStay(MahasiswaProfil $student): bool
    {
        return $this->legacy($student) !== null
            || $student->residenceHistories()->whereIn('event', ['checked_out', 'reentered'])->exists()
            || $student->penempatanKamar()->where('status', 'berakhir')->whereNull('relocated_at')->exists();
    }

    public function isLocal(MahasiswaProfil $student): bool
    {
        return in_array($student->user->client_profile_category, [ClientProfileCategory::Student, ClientProfileCategory::LocalKipk, ClientProfileCategory::LocalNonKipk], true)
            && ! in_array($student->prodi?->jenjang, ['S2', 'S3'], true);
    }

    public function resolveLocalCategory(string $nim, ?string $prodiId, ?int $cohort): string
    {
        $activeMabaYear = Periode::where('status', 'aktif')->value('angkatan_maba') ?? (int) now()->format('Y');
        $isKipk = $cohort !== null
            && KipkRecipient::where('nim', $nim)->where('angkatan', $cohort)->exists()
            && (int) $activeMabaYear === (int) $cohort
            && ! LegacyResident::where('nim', $nim)->exists()
            && ! in_array(Prodi::whereKey($prodiId)->value('jenjang'), ['S2', 'S3'], true);

        return $isKipk ? ClientProfileCategory::LocalKipk->value : ClientProfileCategory::LocalNonKipk->value;
    }

    public function isBinaan(MahasiswaProfil $student): bool
    {
        if ($student->is_external_campus || $student->user->client_profile_category === ClientProfileCategory::Asn) {
            return false;
        }
        $year = Periode::where('status', 'aktif')->value('angkatan_maba') ?? (int) now()->format('Y');

        return (int) $student->angkatan === (int) $year && $this->isLocal($student)
            && ! $student->residenceRegistrations()->whereIn('stay_kind', ['summer_course', 'non_student'])->whereNull('ended_at')->where('status', 'accepted')->exists()
            && ! $this->hasEndedStay($student);
    }

    public function isMaba(MahasiswaProfil $student, ?Periode $period = null): bool
    {
        if ($student->is_external_campus || $student->user->client_profile_category === ClientProfileCategory::Asn || ! $student->angkatan) {
            return false;
        }
        $year = $period !== null && $period->angkatan_maba !== null
            ? (int) $period->angkatan_maba
            : (int) (Periode::where('status', 'aktif')->value('angkatan_maba') ?? now()->format('Y'));

        return (int) $student->angkatan === $year;
    }

    public function isSeniorOverFiveYears(MahasiswaProfil $student, ?Periode $period = null): bool
    {
        if ($student->user->client_profile_category === ClientProfileCategory::Asn || ! $student->angkatan) {
            return false;
        }
        $year = $period !== null && $period->angkatan_maba !== null
            ? (int) $period->angkatan_maba
            : (int) (Periode::where('status', 'aktif')->value('angkatan_maba') ?? now()->format('Y'));

        // Semester 9 ke atas (tahun studi ke-5 s.d. ke-7): selisih tahun ajaran >= 4.
        return ($year - (int) $student->angkatan) >= 4;
    }

    public function isKipk(MahasiswaProfil $student): bool
    {
        if ($student->is_external_campus) {
            return false;
        }

        return $this->isBinaan($student) && KipkRecipient::where('nim', $student->user->nim_nip)
            ->where('angkatan', $student->angkatan)->exists();
    }

    public function requiresKipkPersonalPayment(MahasiswaProfil $student): bool
    {
        return $this->isKipk($student);
    }

    public function state(MahasiswaProfil $student): string
    {
        if ($student->penempatanKamar()->where('status', 'aktif')->exists()) {
            return $this->isBinaan($student) ? 'binaan' : 'hunian';
        }

        return $this->hasEndedStay($student) ? 'alumni' : ($this->hasStayed($student) ? 'riwayat_perlu_verifikasi' : 'belum_pernah_tinggal');
    }

    public function hasDebt(MahasiswaProfil $student): bool
    {
        return Tagihan::where('mahasiswa_id', $student->id)->where('status', '!=', 'batal')
            ->whereColumn('total', '>', 'total_dibayar')->exists();
    }
}
