<?php

namespace App\Http\Controllers;

use App\Actions\Registration\ReviewResidenceRegistration;
use App\Actions\Registration\SubmitResidenceRegistration;
use App\Enums\ResidenceRegistrationStatus;
use App\Http\Requests\ReviewResidenceRegistrationRequest;
use App\Http\Requests\SubmitResidenceRegistrationRequest;
use App\Models\ResidenceRegistration;
use App\Services\ResidenceWorkflow;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ResidenceRegistrationController extends Controller
{
    public function store(SubmitResidenceRegistrationRequest $request, SubmitResidenceRegistration $submit): RedirectResponse
    {
        $student = $request->user()->mahasiswaProfil;
        if (! $student->hasCompleteHousingIdentity()) {
            throw ValidationException::withMessages(['profile' => 'Lengkapi Data Hunian sebelum mengajukan pendaftaran.']);
        }

        $validated = $request->validated();
        $uploadedFiles = $request->file('files', []);

        DB::transaction(function () use ($request, $submit, $student, $validated, $uploadedFiles): void {
            $registration = $submit->handle($student, $validated);
            if ($uploadedFiles !== [] || ! empty($validated['decision_kind'])) {
                app(ResidenceWorkflow::class)->storeSubmittedPackage(
                    $registration,
                    $request->user(),
                    $uploadedFiles,
                    $validated['decision_kind'] ?? null,
                    $validated['decision_reason'] ?? null,
                );
            }
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Pendaftaran asrama dan berkas berhasil diajukan.']);
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
