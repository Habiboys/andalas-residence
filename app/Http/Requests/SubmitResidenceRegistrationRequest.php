<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubmitResidenceRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->mahasiswaProfil !== null;
    }

    public function rules(): array
    {
        return [
            'periode_id' => ['required', 'uuid', Rule::exists('periode', 'id')->where('status', 'aktif')],
            'is_kipk' => ['required', 'boolean'],
            'preferences' => [Rule::requiredIf(! $this->boolean('is_kipk')), Rule::excludeIf($this->boolean('is_kipk')), 'array', 'min:1'],
            'preferences.*.kamar_id' => ['required', 'uuid', 'distinct', Rule::exists('kamar', 'id')->whereIn('status', ['kosong', 'terisi_sebagian'])],
            'preferences.*.notes' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
