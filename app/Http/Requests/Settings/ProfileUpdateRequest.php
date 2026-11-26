<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $user = $this->user();

        return [
            ...$this->profileRules($user->id),
            'nim_nip' => $user->hasPendingNim()
                ? ['nullable', 'string', 'max:50', Rule::unique('users', 'nim_nip')->ignore($user->id)]
                : ['prohibited'],
            'no_hp' => ['nullable', 'string', 'max:20', 'regex:/^\+?[0-9][0-9 ()-]{6,18}[0-9]$/D'],
            'gender' => ['nullable', Rule::in(['laki_laki', 'perempuan'])],
            'email_pribadi' => ['nullable', 'string', 'email', 'max:255'],
            'nik' => ['nullable', 'digits:16'],
            'prodi_id' => ['nullable', 'uuid', 'exists:prodi,id'],
            'is_external_campus' => ['sometimes', 'boolean'],
            'external_campus_name' => ['nullable', 'string', 'max:150'],
            'external_program_name' => ['nullable', 'string', 'max:150'],
            'angkatan' => ['nullable', 'integer', 'min:2000', 'max:'.now()->year],
            'unit_kerja' => ['nullable', 'string', 'max:150'],
            'city_id' => ['nullable', 'uuid', 'exists:cities,id'],
            'alamat' => ['nullable', 'string', 'max:500'],
        ];
    }
}
