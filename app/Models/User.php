<?php

namespace App\Models;

use App\Enums\ClientProfileCategory;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property string $id
 * @property string $nim_nip
 * @property string $nama
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $no_hp
 * @property string|null $gender
 * @property string $status
 * @property string|null $foto_profil
 * @property-read MahasiswaProfil|null $mahasiswaProfil
 */
#[Fillable(['nim_nip', 'nama', 'email', 'password', 'no_hp', 'gender', 'status', 'client_profile_category', 'foto_profil'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable;

    use HasUuids;

    protected $keyType = 'string';

    public $incrementing = false;

    public function getNameAttribute(): string
    {
        return $this->nama;
    }

    public function setNameAttribute(string $value): void
    {
        $this->attributes['nama'] = $value;
    }

    /** @return HasOne<MahasiswaProfil, $this> */
    public function mahasiswaProfil(): HasOne
    {
        return $this->hasOne(MahasiswaProfil::class);
    }

    /** @return HasMany<FasilitatorWilayah, $this> */
    public function fasilitatorWilayah(): HasMany
    {
        return $this->hasMany(FasilitatorWilayah::class);
    }

    /** @return HasMany<ParentStudentLink, $this> */
    public function parentStudentLinks(): HasMany
    {
        return $this->hasMany(ParentStudentLink::class, 'parent_user_id');
    }

    /** @return HasMany<ResidenceRegistration, $this> */
    public function reviewedResidenceRegistrations(): HasMany
    {
        return $this->hasMany(ResidenceRegistration::class, 'reviewed_by');
    }

    /** @return HasMany<ResidenceRegistrationStatusHistory, $this> */
    public function residenceRegistrationStatusChanges(): HasMany
    {
        return $this->hasMany(ResidenceRegistrationStatusHistory::class, 'changed_by');
    }

    public function primaryRole(): ?string
    {
        return $this->getRoleNames()->first();
    }

    protected function casts(): array
    {
        return [
            'client_profile_category' => ClientProfileCategory::class,
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }
}
