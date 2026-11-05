<?php

namespace App\Http\Controllers;

use App\Actions\Registration\CreateTemporaryStay;
use App\Http\Requests\StoreResidenceApplicationRequest;
use App\Jobs\SendInstitutionInvoice;
use App\Models\InvoiceGroup;
use App\Models\ResidenceApplication;
use App\Services\AuditLogService;
use App\Services\ResidenceWorkflow;
use App\Services\ResidenceWorkflowAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ResidenceApplicationController extends Controller
{
    public function store(StoreResidenceApplicationRequest $request, CreateTemporaryStay $create): RedirectResponse
    {
        $data = $request->validated();
        DB::transaction(function () use ($request, $data, $create): void {
            $application = ResidenceApplication::create([
                'number' => $data['number'], 'kind' => $data['kind'], 'institution' => $data['institution'], 'recipient_email' => $data['recipient_email'],
                'letter_path' => $request->file('letter')->store('documents/institutions', 'local'), 'starts_at' => $data['starts_at'], 'ends_at' => $data['ends_at'],
                'funding' => $data['funding'], 'created_by' => $request->user()->id,
            ]);
            foreach ($data['participants'] as $participant) {
                $create->handle([...$participant, 'residence_application_id' => $application->id,
                    'stay_kind' => $data['kind'] === 'summer_course' ? 'summer_course' : 'regular',
                    'client_profile_category' => $data['kind'] === 'summer_course' ? 'non_student' : 'international_student',
                    'starts_at' => $data['starts_at'], 'ends_at' => $data['ends_at'],
                    'rate_unit' => $data['kind'] === 'summer_course' ? 'day' : $data['rate_unit'],
                    'funding' => $data['funding'], 'sponsor_name' => $data['funding'] === 'sponsor' ? $data['institution'] : null,
                ], $request->user());
            }
            AuditLogService::log($request->user(), 'residence_application_created', $application, null, ['participants' => count($data['participants'])]);
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Permohonan dan alokasi peserta tercatat. Sahkan pembiayaan serta dokumen sebelum check-in.']);
    }

    public function approve(Request $request, ResidenceApplication $application): RedirectResponse
    {
        abort_unless(ResidenceWorkflowAccess::manager($request->user()), 403);
        $request->validate(['support_verified' => ['accepted']]);
        DB::transaction(function () use ($request, $application): void {
            $application = ResidenceApplication::whereKey($application->id)->lockForUpdate()->firstOrFail();
            if ($application->approved_at) {
                return;
            }
            $application->update(['approved_at' => now(), 'approved_by' => $request->user()->id]);
            foreach ($application->registrations()->orderBy('id')->lockForUpdate()->get() as $r) {
                if ($r->funding === 'sponsor') {
                    $r->update(['sponsor_approved_at' => now()]);
                }
                app(ResidenceWorkflow::class)->evaluate($r->fresh());
            }
            AuditLogService::log($request->user(), 'institution_support_approved', $application);
        });

        return back();
    }

    public function letter(Request $request, ResidenceApplication $application): StreamedResponse
    {
        abort_unless(ResidenceWorkflowAccess::manager($request->user()), 403);

        return Storage::disk('local')->download($application->letter_path);
    }

    public function sendInvoice(Request $request, InvoiceGroup $group): RedirectResponse
    {
        abort_unless($request->user()->can('pembayaran.verify'), 403);
        DB::transaction(function () use ($request, $group): void {
            $group = InvoiceGroup::whereKey($group->id)->lockForUpdate()->firstOrFail();
            if (in_array($group->delivery_status, ['queued', 'sent'], true)) {
                return;
            }
            $application = ResidenceApplication::findOrFail($group->residence_application_id);
            if (! $group->path || ! Storage::disk('local')->exists($group->path)) {
                throw ValidationException::withMessages(['invoice' => 'Dokumen invoice belum tersedia.']);
            }
            $group->update(['sent_at' => now(), 'delivery_status' => 'queued', 'delivery_failed_at' => null]);
            SendInstitutionInvoice::dispatch($group->id)->afterCommit();
            AuditLogService::log($request->user(), 'institution_invoice_queued', $group, null, ['recipient' => $application->recipient_email]);
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Invoice masuk antrean pengiriman email.']);
    }
}
