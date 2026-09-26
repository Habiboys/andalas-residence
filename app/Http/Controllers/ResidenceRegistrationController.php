<?php

namespace App\Http\Controllers;

use App\Actions\Registration\ReviewResidenceRegistration;
use App\Actions\Registration\SubmitResidenceRegistration;
use App\Enums\ResidenceRegistrationStatus;
use App\Http\Requests\ReviewResidenceRegistrationRequest;
use App\Http\Requests\SubmitResidenceRegistrationRequest;
use App\Models\ResidenceRegistration;
use Illuminate\Http\RedirectResponse;

class ResidenceRegistrationController extends Controller
{
    public function store(SubmitResidenceRegistrationRequest $request, SubmitResidenceRegistration $submit): RedirectResponse
    {
        $submit->handle($request->user()->mahasiswaProfil, $request->validated());

        return back()->with('toast', ['type' => 'success', 'message' => 'Pendaftaran asrama berhasil diajukan.']);
    }

    public function update(ReviewResidenceRegistrationRequest $request, ResidenceRegistration $registration, ReviewResidenceRegistration $review): RedirectResponse
    {
        $validated = $request->validated();
        $review->handle(
            $registration,
            $request->user(),
            ResidenceRegistrationStatus::from($validated['status']),
            $validated['notes'] ?? null,
        );

        return back()->with('toast', ['type' => 'success', 'message' => 'Status pendaftaran berhasil diperbarui.']);
    }
}
