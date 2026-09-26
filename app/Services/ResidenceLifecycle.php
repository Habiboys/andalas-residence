<?php

namespace App\Services;

use App\Enums\ClientProfileCategory;
use App\Models\KipkRecipient;
use App\Models\LegacyResident;
use App\Models\MahasiswaProfil;
use App\Models\Periode;
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
            || $student->penempatanKamar()->where('status', 'berakhir')->exists();
    }

    public function isLocal(MahasiswaProfil $student): bool
    {
        return in_array($student->user->client_profile_category, [ClientProfileCategory::Student, ClientProfileCategory::LocalKipk, ClientProfileCategory::LocalNonKipk], true)
            && ! in_array($student->prodi?->jenjang, ['S2', 'S3'], true);
    }

    public function isBinaan(MahasiswaProfil $student): bool
    {
        $year = Periode::where('status', 'aktif')->value('angkatan_maba');

        return $year !== null && (int) $student->angkatan === (int) $year && $this->isLocal($student)
            && ! $student->residenceRegistrations()->whereIn('stay_kind', ['summer_course', 'non_student'])->whereNull('ended_at')->where('status', 'accepted')->exists()
            && ! $this->hasEndedStay($student);
    }

    public function isKipk(MahasiswaProfil $student): bool
    {
        return $this->isBinaan($student) && KipkRecipient::where('nim', $student->user->nim_nip)
            ->where('angkatan', $student->angkatan)->exists();
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
