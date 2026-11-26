<?php

namespace App\Http\Requests;

use App\Models\Periode;
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
        $merge = ['is_kipk' => $student && app(ResidenceLifecycle::class)->isKipk($student)];
        if (! $this->filled('periode_id')) {
            $activePeriodId = Periode::where('status', 'aktif')->value('id');
            if ($activePeriodId) {
                $merge['periode_id'] = $activePeriodId;
            }
        }
        if (! $this->filled('rate_unit')) {
            $merge['rate_unit'] = 'period';
        }
        $this->merge($merge);
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
            'rate_unit' => ['sometimes', 'in:period,year,semester,month,day'],
            'billing_basis' => ['sometimes', 'in:person,room,group', Rule::when(in_array($this->input('billing_basis'), ['room', 'group'], true), ['prohibited_unless:rate_unit,period,year,semester', Rule::prohibitedIf($this->boolean('is_kipk'))])],
            'starts_at' => ['required_if:rate_unit,month,day', 'nullable', 'date', 'after_or_equal:today'],
            'ends_at' => ['required_if:rate_unit,month,day', 'nullable', 'date', 'after:starts_at'],
            'funding' => ['sometimes', 'in:personal,sponsor'],
            'sponsor_name' => ['required_if:funding,sponsor', 'nullable', 'string', 'max:255'],
            'invitee_nims' => [Rule::requiredIf($this->input('billing_basis') === 'group'), 'nullable', 'array', ...($this->input('billing_basis') === 'group' ? ['min:1'] : []), 'max:10'],
            'invitee_nims.*' => ['required', 'string', 'max:50', 'distinct'],
            'files' => ['nullable', 'array'],
            'files.*' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            'decision_kind' => ['nullable', 'in:full,monthly'],
            'decision_reason' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'invitee_nims.required' => 'Kategori Per Grup wajib mengundang minimal 1 teman sekamar.',
            'invitee_nims.min' => 'Kategori Per Grup wajib mengundang minimal 1 teman sekamar.',
        ];
    }

    /**
     * @return array{periode_id: string, is_kipk: bool, notes?: string|null, rate_unit?: string, billing_basis?: 'person'|'room'|'group', starts_at?: string|null, ends_at?: string|null, funding?: string, sponsor_name?: string|null, preferences?: list<array{kamar_id: string, notes?: string|null}>, invitee_nims?: list<string>}
     */
    public function validated($key = null, $default = null): array
    {
        return parent::validated($key, $default);
    }
}
