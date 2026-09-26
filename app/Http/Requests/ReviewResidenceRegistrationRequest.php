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

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(ResidenceRegistrationStatus::class)->only([
                ResidenceRegistrationStatus::Rejected,
            ])],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
