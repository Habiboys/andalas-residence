<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MahasiswaProfil extends BaseModel
{
    protected $table = 'mahasiswa_profil';

    protected $fillable = [
        'user_id', 'prodi_id', 'periode_id', 'city_id', 'angkatan',
        'barcode_code', 'nik', 'bpjs_path', 'riwayat_penyakit_path',
        'bukti_lulus_path', 'status_huni', 'tanggal_masuk',
    ];

    protected function casts(): array
    {
        return ['tanggal_masuk' => 'date'];
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
