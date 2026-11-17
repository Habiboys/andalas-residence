<?php

namespace App\Http\Controllers\Settings;

use App\Enums\ClientProfileCategory;
use App\Http\Controllers\Controller;
use App\Http\Controllers\RolePageController;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\City;
use App\Models\Departemen;
use App\Models\Faculty;
use App\Models\MahasiswaProfil;
use App\Models\Prodi;
use App\Models\Province;
use App\Services\AuditLogService;
use App\Services\ResidenceLifecycle;
use App\Services\UserProfileSummary;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user()->load('mahasiswaProfil.prodi.departemen.faculty', 'mahasiswaProfil.city.province');
        $student = $user->mahasiswaProfil;

        return Inertia::render('settings/profile', [
            'profileSummary' => app(UserProfileSummary::class)->forUser($user),
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            'role' => $user->roles->first()?->name ?? 'mahasiswa',
            'page' => 'settings-profile',
            'initialUser' => app(RolePageController::class)->userPayload($request),
            'hasStudentProfile' => $student !== null,
            'academicLocked' => $student ? $this->hasLockedAcademicProfile($student) : false,
            'editableProfile' => [
                'name' => $user->nama,
                'email' => $user->email,
                'no_hp' => $user->no_hp ?? '',
                'gender' => $user->gender ?? '',
                ...($student ? [
                    'email_pribadi' => $student->email_pribadi ?? '',
                    'nik' => $student->nik ?? '',
                    'faculty_id' => $student->prodi?->departemen?->faculty_id ?? '',
                    'departemen_id' => $student->prodi?->departemen_id ?? '',
                    'prodi_id' => $student->prodi_id ?? '',
                    'province_id' => $student->city?->province_id ?? '',
                    'city_id' => $student->city_id ?? '',
                    'alamat' => $student->alamat ?? '',
                ] : []),
            ],
            'academicOptions' => $student ? [
                'fakultas' => Faculty::orderBy('name')->get(['id', 'name']),
                'departemen' => Departemen::orderBy('name')->get(['id', 'name', 'faculty_id']),
                'prodi' => Prodi::orderBy('name')->get(['id', 'name', 'jenjang', 'departemen_id']),
            ] : null,
            'locationOptions' => $student ? [
                'provinces' => Province::orderBy('name')->get(['id', 'name']),
                'cities' => City::orderBy('name')->get(['id', 'name', 'province_id']),
            ] : null,
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($request, $validated): void {
            $user = $request->user();
            $student = $user->mahasiswaProfil()->lockForUpdate()->first();
            $academicLocked = $student ? $this->hasLockedAcademicProfile($student) : false;

            if ($academicLocked && $student) {
                $lockErrors = [];
                if (array_key_exists('gender', $validated) && $validated['gender'] !== null && $validated['gender'] !== $user->gender) {
                    $lockErrors['gender'] = 'Jenis kelamin tidak dapat diubah selama pendaftaran atau hunian aktif berjalan.';
                }
                if (array_key_exists('prodi_id', $validated) && $validated['prodi_id'] !== null && $validated['prodi_id'] !== $student->prodi_id) {
                    $lockErrors['prodi_id'] = 'Program studi tidak dapat diubah selama pendaftaran atau hunian aktif berjalan.';
                }
                if ($lockErrors !== []) {
                    throw ValidationException::withMessages($lockErrors);
                }
            }

            $userUpdates = [
                'nama' => $validated['name'],
                'email' => $validated['email'],
            ];
            if (array_key_exists('no_hp', $validated)) {
                $userUpdates['no_hp'] = $validated['no_hp'];
            }
            if (! $academicLocked && array_key_exists('gender', $validated) && $validated['gender'] !== null) {
                $userUpdates['gender'] = $validated['gender'];
            }

            if ($student) {
                $studentUpdates = Arr::only($validated, array_filter([
                    'email_pribadi',
                    'nik',
                    'city_id',
                    'alamat',
                    $academicLocked ? null : 'prodi_id',
                ]));

                if ($studentUpdates !== []) {
                    $student->update($studentUpdates);
                }

                if (! $academicLocked && array_key_exists('prodi_id', $validated) && $validated['prodi_id'] !== null
                    && in_array($user->client_profile_category, [ClientProfileCategory::Student, ClientProfileCategory::LocalKipk, ClientProfileCategory::LocalNonKipk], true)) {
                    $userUpdates['client_profile_category'] = app(ResidenceLifecycle::class)->resolveLocalCategory(
                        $user->nim_nip,
                        $validated['prodi_id'],
                        $student->angkatan !== null ? (int) $student->angkatan : null,
                    );
                }
            }

            $user->fill($userUpdates);

            if ($user->isDirty('email')) {
                $user->email_verified_at = null;
            }

            $user->save();

            AuditLogService::log($user, 'profile_updated', $student ?? $user, null, Arr::except($validated, ['nik', 'alamat', 'no_hp', 'email_pribadi']));
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Profile updated.')]);

        return to_route('profile.edit');
    }

    private function hasLockedAcademicProfile(MahasiswaProfil $student): bool
    {
        return $student->residenceRegistrations()->whereNull('completed_at')->whereNotIn('status', ['draft', 'rejected', 'cancelled'])->exists()
            || $student->penempatanKamar()->where('status', 'aktif')->exists();
    }
}
