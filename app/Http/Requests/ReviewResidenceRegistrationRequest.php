<?php

namespace App\Http\Requests;

use App\Enums\ResidenceRegistrationStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReviewResidenceRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('registration.review') ?? false;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(ResidenceRegistrationStatus::class)->only([
                ResidenceRegistrationStatus::Verified,
                ResidenceRegistrationStatus::Accepted,
                ResidenceRegistrationStatus::Rejected,
            ])],
            'notes' => ['nullable', 'string', 'max:2000'],
            'kamar_id' => ['nullable', 'required_if:status,accepted', 'uuid', 'exists:kamar,id'],
        ];
    }
}
