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
            'settings' => ['required', 'array:open,documents,building_ids,rates,month_days,day_basis,monthly_allowed'],
            'settings.open' => ['required', 'boolean'],
            'settings.documents' => ['required', 'array', 'min:1'],
            'settings.documents.*' => ['required', 'string', 'regex:/^[a-z0-9_]{1,80}$/', 'distinct'],
            'settings.building_ids' => ['required', 'array', 'min:1'],
            'settings.building_ids.*' => ['required', 'uuid', 'exists:gedung,id', 'distinct'],
            'settings.month_days' => ['required', 'integer', 'min:1', 'max:31'],
            'settings.day_basis' => ['required', 'in:nights,inclusive_days'],
            'settings.monthly_allowed' => ['required', 'boolean'],
            'settings.rates' => ['required', 'array', 'min:1'],
            'settings.rates.*' => ['required', 'array:gedung_id,type,unit,amount,room_amount'],
            'settings.rates.*.gedung_id' => ['required', 'uuid', Rule::in($this->input('settings.building_ids', []))],
            'settings.rates.*.type' => ['required', 'string', 'exists:room_types,code'],
            'settings.rates.*.unit' => ['required', 'in:year,semester,month,day'],
            'settings.rates.*.amount' => ['required', 'numeric', 'decimal:0,2', 'min:1', 'max:100000000000'],
            'settings.rates.*.room_amount' => ['nullable', 'numeric', 'decimal:0,2', 'min:1', 'max:100000000000'],
        ];
    }

    /** @return list<\Closure> */
    public function after(): array
    {
        return [function ($validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }
            if ($this->input('category') === 'local_kipk' && ! in_array('perjanjian', $this->input('settings.documents'), true)) {
                $validator->errors()->add('settings.documents', 'KIP-K wajib memiliki dokumen perjanjian pembayaran setelah pencairan.');
            }
            $rates = $this->input('settings.rates');
            if (! is_array($rates)) {
                return;
            }
            $keys = collect($rates)->map(fn ($rate) => $rate['gedung_id'].'/'.$rate['type'].'/'.$rate['unit']);
            if ($keys->unique()->count() !== $keys->count()) {
                $validator->errors()->add('settings.rates', 'Tarif gedung, tipe dan satuan tidak boleh duplikat.');
            }
            foreach ($this->input('settings.building_ids') as $building) {
                if (! collect($rates)->contains('gedung_id', $building)) {
                    $validator->errors()->add('settings.rates', 'Setiap gedung harus memiliki tarif.');
                }
            }
        }];
    }
}
