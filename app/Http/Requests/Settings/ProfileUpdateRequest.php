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
        return [
            ...$this->profileRules($this->user()->id),
            'no_hp' => ['nullable', 'string', 'max:20', 'regex:/^\+?[0-9][0-9 ()-]{6,18}[0-9]$/D'],
            'gender' => ['nullable', Rule::in(['laki_laki', 'perempuan'])],
            'email_pribadi' => ['nullable', 'string', 'email', 'max:255'],
            'nik' => ['nullable', 'digits:16'],
            'prodi_id' => ['nullable', 'uuid', 'exists:prodi,id'],
            'city_id' => ['nullable', 'uuid', 'exists:cities,id'],
            'alamat' => ['nullable', 'string', 'max:500'],
        ];
    }
}
