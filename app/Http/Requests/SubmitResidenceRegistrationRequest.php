<?php

namespace App\Http\Requests;

use App\Services\ResidenceLifecycle;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubmitResidenceRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->mahasiswaProfil !== null;
    }

    protected function prepareForValidation(): void
    {
        $student = $this->user()?->mahasiswaProfil;
        $this->merge(['is_kipk' => $student && app(ResidenceLifecycle::class)->isKipk($student)]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'periode_id' => ['required', 'uuid', Rule::exists('periode', 'id')->where('status', 'aktif')],
            'is_kipk' => ['required', 'boolean'],
            'preferences' => [Rule::requiredIf(! $this->boolean('is_kipk')), Rule::excludeIf($this->boolean('is_kipk')), 'array', 'size:1'],
            'preferences.*.kamar_id' => ['required', 'uuid', 'distinct', Rule::exists('kamar', 'id')->whereIn('status', ['kosong', 'terisi_sebagian'])],
            'preferences.*.notes' => ['nullable', 'string', 'max:1000'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'rate_unit' => ['sometimes', 'in:period,day'],
            'starts_at' => ['required_if:rate_unit,day', 'nullable', 'date', 'after_or_equal:today'],
            'ends_at' => ['required_if:rate_unit,day', 'nullable', 'date', 'after:starts_at'],
            'funding' => ['sometimes', 'in:personal,sponsor'],
            'sponsor_name' => ['required_if:funding,sponsor', 'nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array{periode_id: string, is_kipk: bool, notes?: string|null, rate_unit?: string, starts_at?: string|null, ends_at?: string|null, funding?: string, sponsor_name?: string|null, preferences?: list<array{kamar_id: string, notes?: string|null}>}
     */
    public function validated($key = null, $default = null): array
    {
        return parent::validated($key, $default);
    }
}
