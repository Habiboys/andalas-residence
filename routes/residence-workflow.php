<?php

use App\Http\Controllers\ResidenceAmendmentController;
use App\Http\Controllers\ResidenceApplicationController as Applications;
use App\Http\Controllers\ResidenceWorkflowController as Workflow;
use Illuminate\Support\Facades\Route;

Route::get('/mahasiswa/registration/status', [Workflow::class, 'index'])
    ->middleware('role:mahasiswa')->name('mahasiswa.registration.status');

Route::prefix('residence-process')->name('residence.')->group(function (): void {
    Route::get('/amendments/{amendment}/document', [ResidenceAmendmentController::class, 'document'])->name('amendments.document');
    Route::get('/amendments/{amendment}/evidence', [ResidenceAmendmentController::class, 'evidence'])->name('amendments.evidence');
    Route::post('/registrations/{registration}/move', [ResidenceAmendmentController::class, 'move'])->name('move');
    Route::post('/contracts/{contract}/revise', [ResidenceAmendmentController::class, 'contract'])->name('contracts.revise');
    Route::get('/', [Workflow::class, 'index'])->name('workflow');
    Route::get('/registrations/{registration}', [Workflow::class, 'show'])->name('registrations.show');
    Route::post('/profile', [Workflow::class, 'profile'])->name('profile');
    Route::post('/housing-profile', [Workflow::class, 'profile'])->name('housing-profile');
    Route::post('/policies', [Workflow::class, 'policy'])->name('policies');
    Route::post('/templates', [Workflow::class, 'uploadTemplate'])->name('templates.store');
    Route::delete('/templates/{template}', [Workflow::class, 'deleteTemplate'])->name('templates.destroy');
    Route::get('/templates/{category}/{kind}', [Workflow::class, 'downloadTemplate'])->name('templates.download');
    Route::post('/contracts', [Workflow::class, 'contract'])->name('contracts');
    Route::post('/payments', [Workflow::class, 'recordPayment'])->name('payments.record');
    Route::post('/payments/{reference}/match', [Workflow::class, 'reconcile'])->name('payments.match');
    Route::get('/payments/{reference}/evidence', [Workflow::class, 'paymentEvidence'])->name('payments.evidence');
    Route::post('/applications', [Applications::class, 'store'])->name('applications.store');
    Route::post('/applications/{application}/approve', [Applications::class, 'approve'])->name('applications.approve');
    Route::get('/applications/{application}/letter', [Applications::class, 'letter'])->name('applications.letter');
    Route::post('/invoices/{group}/send', [Applications::class, 'sendInvoice'])->name('invoices.send');
    Route::post('/registrations/{registration}/transfer-proof', [Workflow::class, 'transferProof'])->name('transfer-proof');
    Route::post('/registrations/{registration}/documents', [Workflow::class, 'upload'])->name('documents.upload');
    Route::post('/registrations/{registration}/submit-package', [Workflow::class, 'submitPackage'])->name('package.submit');
    Route::get('/documents/{document}', [Workflow::class, 'document'])->name('documents.download');
    Route::post('/documents/{document}/review', [Workflow::class, 'reviewDocument'])->name('documents.review');
    Route::post('/registrations/{registration}/decisions', [Workflow::class, 'requestDecision'])->name('decisions.request');
    Route::post('/decisions/{decision}', [Workflow::class, 'decide'])->name('decisions.review');
    Route::post('/registrations/{registration}/checkin', [Workflow::class, 'checkIn'])->name('checkin');
    Route::post('/registrations/{registration}/inspection', [Workflow::class, 'requestInspection'])->name('inspection');
    Route::post('/registrations/{registration}/keys', [Workflow::class, 'returnKeys'])->name('keys');
    Route::post('/registrations/{registration}/allocate', [Workflow::class, 'allocate'])->name('allocate');
    Route::post('/registrations/{registration}/disburse', [Workflow::class, 'disburse'])->name('disburse');
    Route::post('/registrations/{registration}/history', [Workflow::class, 'historical'])->name('historical');
});
