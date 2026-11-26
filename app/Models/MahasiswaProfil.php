<?php

namespace App\Models;

use App\Enums\ClientProfileCategory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MahasiswaProfil extends BaseModel
{
    protected $table = 'mahasiswa_profil';

    protected $fillable = [
        'user_id', 'prodi_id', 'periode_id', 'city_id', 'angkatan',
        'is_external_campus', 'external_campus_name', 'external_program_name', 'unit_kerja',
        'barcode_code', 'nik', 'email_pribadi', 'alamat', 'bpjs_path', 'riwayat_penyakit_path',
        'bukti_lulus_path', 'status_huni', 'tanggal_masuk',
    ];

    protected function casts(): array
    {
        return [
            'tanggal_masuk' => 'date',
            'is_external_campus' => 'boolean',
        ];
    }

    public function hasCompleteHousingIdentity(): bool
    {
        $hasPersonalEmail = filled($this->email_pribadi)
            || (! filled($this->user->sso_id) && filled($this->user->email));
        $isAsn = $this->user->client_profile_category === ClientProfileCategory::Asn;
        $hasAcademicData = $isAsn
            ? true
            : ($this->is_external_campus
                ? filled($this->external_campus_name) && filled($this->external_program_name) && filled($this->angkatan)
                : filled($this->prodi_id) && filled($this->angkatan));

        return filled($this->user->nama)
            && filled($this->user->nim_nip)
            && ! $this->user->hasPendingNim()
            && filled($this->user->email)
            && $hasPersonalEmail
            && filled($this->user->no_hp)
            && in_array($this->user->gender, ['laki_laki', 'perempuan'], true)
            && $hasAcademicData
            && preg_match('/^\d{16}$/D', (string) $this->nik) === 1
            && filled($this->city_id)
            && filled($this->alamat);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Prodi, $this> */
    public function prodi(): BelongsTo
    {
        return $this->belongsTo(Prodi::class);
    }

    /** @return BelongsTo<Periode, $this> */
    public function periode(): BelongsTo
    {
        return $this->belongsTo(Periode::class);
    }

    /** @return BelongsTo<City, $this> */
    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    /** @return HasMany<PenempatanKamar, $this> */
    public function penempatanKamar(): HasMany
    {
        return $this->hasMany(PenempatanKamar::class, 'mahasiswa_id');
    }

    /** @return HasMany<ParentStudentLink, $this> */
    public function parentStudentLinks(): HasMany
    {
        return $this->hasMany(ParentStudentLink::class, 'student_profile_id');
    }

    /** @return HasMany<ResidenceRegistration, $this> */
    public function residenceRegistrations(): HasMany
    {
        return $this->hasMany(ResidenceRegistration::class, 'student_profile_id');
    }

    /** @return HasMany<Pembayaran, $this> */
    public function pembayaran(): HasMany
    {
        return $this->hasMany(Pembayaran::class, 'mahasiswa_id');
    }

    /** @return HasMany<CheckoutRequest, $this> */
    public function checkoutRequests(): HasMany
    {
        return $this->hasMany(CheckoutRequest::class, 'mahasiswa_id');
    }

    /** @return HasMany<ResidenceHistory, $this> */
    public function residenceHistories(): HasMany
    {
        return $this->hasMany(ResidenceHistory::class, 'mahasiswa_id');
    }

    /** @return HasMany<ActivityAttendance, $this> */
    public function activityAttendances(): HasMany
    {
        return $this->hasMany(ActivityAttendance::class, 'mahasiswa_id');
    }
}
