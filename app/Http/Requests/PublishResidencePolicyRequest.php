<?php

namespace App\Http\Requests;

use App\Services\ResidencePolicyService;
use App\Services\ResidenceWorkflowAccess;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PublishResidencePolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return ResidenceWorkflowAccess::manager($this->user());
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'category' => ['required', Rule::in(ResidencePolicyService::CATEGORIES)],
            'settings' => ['required', 'array:open,documents,building_ids,month_days,day_basis,monthly_allowed'],
            'settings.open' => ['required', 'boolean'],
            'settings.documents' => ['required', 'array', 'min:1'],
            'settings.documents.*' => ['required', 'string', 'regex:/^[a-z0-9_]{1,80}$/', 'distinct'],
            'settings.building_ids' => ['sometimes', 'array', 'min:1'],
            'settings.building_ids.*' => ['required', 'uuid', 'exists:gedung,id', 'distinct'],
            'settings.month_days' => ['required', 'integer', 'min:1', 'max:31'],
            'settings.day_basis' => ['required', 'in:nights,inclusive_days'],
            'settings.monthly_allowed' => ['required', 'boolean'],
        ];
    }

    /** @return list<\Closure> */
    public function after(): array
    {
        return [function ($validator): void {
            if ($validator->errors()->isEmpty() && $this->input('category') === 'local_kipk'
                && ! in_array('perjanjian', $this->input('settings.documents'), true)) {
                $validator->errors()->add('settings.documents', 'KIP-K wajib memiliki dokumen perjanjian pembayaran setelah pencairan.');
            }
        }];
    }
}
