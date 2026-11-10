<?php

namespace App\Http\Requests;

use App\Services\ResidenceWorkflowAccess;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreResidenceApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return ResidenceWorkflowAccess::manager($this->user());
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'number' => ['required', 'string', 'max:100', 'unique:residence_applications,number'],
            'kind' => ['required', 'in:international,postgraduate,summer_course'], 'institution' => ['required_unless:kind,postgraduate', 'nullable', 'string', 'max:255'],
            'recipient_email' => ['required', 'email', 'max:255'], 'letter' => ['required_unless:kind,postgraduate', 'nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            'starts_at' => ['required', 'date', 'after_or_equal:today'], 'ends_at' => ['required', 'date', 'after:starts_at'],
            'funding' => ['required', 'in:personal,sponsor', Rule::when($this->input('kind') === 'postgraduate', ['in:personal'])], 'rate_unit' => ['required', 'in:year,semester,month,day'],
            'participants' => ['required', 'array', 'min:1', 'max:200'],
            'participants.*.nama' => ['required', 'string', 'max:150'], 'participants.*.nim_nip' => ['required', 'string', 'max:50', 'distinct'],
            'participants.*.email' => ['required', 'email', 'max:255', 'distinct'], 'participants.*.gender' => ['required', 'in:laki_laki,perempuan'],
            'participants.*.kamar_id' => ['required', 'uuid', 'exists:kamar,id'],
            'participants.*.prodi_id' => ['required_if:kind,postgraduate', 'nullable', 'uuid', Rule::exists('prodi', 'id')->when($this->input('kind') === 'postgraduate', fn ($rule) => $rule->whereIn('jenjang', ['S2', 'S3']))],
            'participants.*.sponsor_limit' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:100000000000'],
        ];
    }
}
