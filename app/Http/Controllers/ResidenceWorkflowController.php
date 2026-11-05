<?php

namespace App\Http\Controllers;

use App\Actions\Billing\ReconcileResidencePayment;
use App\Actions\Checkout\CreateCheckoutRequest;
use App\Actions\Checkout\ReturnResidenceKeys;
use App\Actions\Registration\AllocateResidenceRoom;
use App\Actions\Registration\ConfirmResidenceCheckIn;
use App\Actions\Registration\CreateResidenceBilling;
use App\Http\Requests\PublishResidencePolicyRequest;
use App\Models\CheckoutRequest;
use App\Models\Gedung;
use App\Models\InvoiceGroup;
use App\Models\Kamar;
use App\Models\Pembayaran;
use App\Models\Prodi;
use App\Models\RegistrationDocument;
use App\Models\ResidenceApplication;
use App\Models\ResidenceDecision;
use App\Models\ResidencePaymentReference;
use App\Models\ResidencePolicy;
use App\Models\ResidenceRegistration;
use App\Models\RoomContract;
use App\Models\RoomType;
use App\Models\Tagihan;
use App\Models\User;
use App\Notifications\ResidenceWorkflowNotification;
use App\Services\AuditLogService;
use App\Services\ResidenceBuildingAccess;
use App\Services\ResidencePolicyService;
use App\Services\ResidenceWorkflow;
use App\Services\ResidenceWorkflowAccess;
use App\Services\StudentCohort;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ResidenceWorkflowController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $manager = ResidenceWorkflowAccess::manager($user);
        $finance = $user->can('pembayaran.verify');
        abort_unless($manager || $finance || $user->hasAnyRole(['mahasiswa', 'fasilitator', 'pimpinan']), 403);
        $registrations = ResidenceRegistration::with(['studentProfile.user', 'reservedRoom.lantai.gedung', 'placement.kamar.lantai.gedung', 'policy', 'documents.reviewer:id,nama', 'decisions', 'tagihan', 'application', 'roomContract'])
            ->when(! $manager && ! $finance && ! $user->hasRole('pimpinan'), function ($q) use ($user): void {
                if ($user->hasRole('fasilitator')) {
                    $ids = ResidenceBuildingAccess::ids($user);
                    $q->where(fn ($q) => $q->whereHas('reservedRoom.lantai', fn ($q) => $q->whereIn('gedung_id', $ids))->orWhereHas('placement.kamar.lantai', fn ($q) => $q->whereIn('gedung_id', $ids)));
                } else {
                    $q->where('student_profile_id', $user->mahasiswaProfil?->id);
                }
            });
        $summary = [
            'applicants' => (clone $registrations)->whereNull('completed_at')->whereNotIn('status', ['draft', 'rejected'])->count(),
            'allocated' => (clone $registrations)->whereNull('completed_at')->whereNotNull('reserved_room_id')->whereNotIn('status', ['draft', 'rejected'])->count(),
            'ready' => (clone $registrations)->whereNull('completed_at')->whereNotNull('ready_at')->count(),
            'occupants' => (clone $registrations)->whereHas('placement', fn ($q) => $q->where('status', 'aktif'))->count(),
            'historical' => (clone $registrations)->whereNull('workflow_version')->whereNotNull('completed_at')->whereNull('historical_confirmed_at')->count(),
        ];
        $summary['physical'] = (clone $registrations)->whereNotNull('checked_in_at')->whereNull('keys_returned_at')->whereHas('placement', fn ($q) => $q->where('status', 'aktif'))->count();
        $summary['receivables'] = (float) Tagihan::whereIn('id', (clone $registrations)->select('tagihan_id'))->where('status', '!=', 'batal')->sum(DB::raw('total - total_dibayar + sponsor_total - sponsor_paid'));
        $page = $registrations->latest()->paginate(30)->withQueryString();
        $page->getCollection()->transform(function ($r) use ($user) {
            $r->setAttribute('blockers', $r->completed_at ? [] : app(ResidenceWorkflow::class)->blockers($r));
            $r->setAttribute('can_submit', ResidenceWorkflowAccess::manager($user) || $r->studentProfile->user_id === $user->id);
            $r->setAttribute('checkout_request', $r->penempatan_kamar_id ? CheckoutRequest::with('inspection')->where('penempatan_kamar_id', $r->penempatan_kamar_id)->where('status', '!=', 'ditolak')->latest()->first() : null);
            $r->setAttribute('can_operate', ResidenceWorkflowAccess::officer($user, $r));

            return $r;
        });

        return Inertia::render('admin/residence-workflow', [
            'role' => $user->getRoleNames()->first(), 'page' => 'residence-workflow', 'initialUser' => app(RolePageController::class)->userPayload($request),
            'registrations' => $page, 'summary' => $summary,
            'manager' => $manager, 'finance' => $finance, 'leader' => $user->hasRole('pimpinan'),
            'profile' => $user->mahasiswaProfil?->load('prodi'), 'gender' => $user->gender,
            'programs' => Prodi::orderBy('name')->get(['id', 'name', 'jenjang']),
            'policies' => $manager ? ResidencePolicy::orderBy('category')->orderByDesc('version')->get() : [],
            'buildings' => $manager ? Gedung::orderBy('kode_gedung')->get(['id', 'kode_gedung', 'nama_gedung']) : [],
            'roomTypes' => $manager ? RoomType::where('active', true)->get(['code', 'name']) : [],
            'rooms' => $manager ? Kamar::with('lantai.gedung')->where('status', '!=', 'maintenance')->get() : [],
            'applications' => ($manager || $finance) ? ResidenceApplication::with('registrations.tagihan')->latest()->limit(100)->get() : [],
            'paymentProofs' => $finance ? Pembayaran::with('mahasiswa.user')->where('status', 'menunggu_verifikasi')->latest()->limit(200)->get() : [],
            'invoiceGroups' => $finance ? InvoiceGroup::latest()->limit(100)->get() : [],
            'reconciliations' => $finance ? ResidencePaymentReference::latest()->limit(100)->get() : [],
            'invoices' => $finance ? Tagihan::with('mahasiswa.user')->where('status', '!=', 'batal')->where(fn ($q) => $q->whereColumn('total', '>', 'total_dibayar')->orWhereColumn('sponsor_total', '>', 'sponsor_paid'))->latest()->limit(200)->get() : [],
        ]);
    }

    public function profile(Request $request): RedirectResponse
    {
        abort_unless($request->user()->hasRole('mahasiswa') && $request->user()->mahasiswaProfil, 403);
        $data = $request->validate(['gender' => ['required', 'in:laki_laki,perempuan'], 'prodi_id' => ['required', 'uuid', 'exists:prodi,id']]);
        DB::transaction(function () use ($request, $data): void {
            $profile = $request->user()->mahasiswaProfil()->lockForUpdate()->firstOrFail();
            if ($profile->residenceRegistrations()->whereNotIn('status', ['draft', 'rejected'])->exists() || $profile->penempatanKamar()->where('status', 'aktif')->exists()) {
                throw ValidationException::withMessages(['profile' => 'Data kategori penghuni berjalan hanya dapat dikoreksi pengelola.']);
            }
            $year = StudentCohort::fromNim($request->user()->nim_nip);
            $request->user()->update(['gender' => $data['gender']]);
            $profile->update(['prodi_id' => $data['prodi_id'], 'angkatan' => $year]);
            AuditLogService::log($request->user(), 'residence_profile_completed', $profile, null, $data);
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Profil pendaftaran dilengkapi.']);
    }

    public function policy(PublishResidencePolicyRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            Gedung::query()->orderBy('id')->lockForUpdate()->get();
            $version = (int) ResidencePolicy::where('category', $request->validated('category'))->max('version') + 1;
            $policy = ResidencePolicy::create(['category' => $request->validated('category'), 'version' => $version, 'settings' => $request->validated('settings'), 'published_at' => now(), 'created_by' => $request->user()->id]);
            AuditLogService::log($request->user(), 'residence_policy_published', $policy, null, $policy->toArray());
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Versi kebijakan diterbitkan. Pendaftaran lama tetap menggunakan versi sebelumnya.']);
    }

    public function upload(Request $request, ResidenceRegistration $registration): RedirectResponse
    {
        abort_unless(ResidenceWorkflowAccess::manager($request->user()) || $registration->studentProfile->user_id === $request->user()->id, 403);
        $data = $request->validate(['kind' => ['required', 'string', 'max:80'], 'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120']]);
        DB::transaction(function () use ($request, $registration, $data): void {
            $r = ResidenceRegistration::whereKey($registration->id)->lockForUpdate()->firstOrFail();
            if ($r->completed_at || $r->status->value === 'rejected' || ! in_array($data['kind'], array_unique([...($r->policy?->settings['documents'] ?? []), 'perjanjian']), true)) {
                throw ValidationException::withMessages(['kind' => 'Jenis dokumen tidak berlaku atau pendaftaran sudah selesai.']);
            }
            $document = $r->documents()->create(['kind' => $data['kind'], 'version' => 1 + (int) $r->documents()->where('kind', $data['kind'])->max('version'),
                'path' => $request->file('file')->store('documents/registration', 'local'), 'checksum' => hash_file('sha256', $request->file('file')->getRealPath()), 'uploaded_by' => $request->user()->id, 'status' => 'uploaded']);
            app(ResidenceWorkflow::class)->evaluate($r->fresh());
            AuditLogService::log($request->user(), 'registration_document_uploaded', $document, null, ['kind' => $document->kind, 'version' => $document->version]);
        });

        return back();
    }

    public function document(Request $request, RegistrationDocument $document): StreamedResponse
    {
        abort_unless(ResidenceWorkflowAccess::view($request->user(), $document->registration), 403);

        return Storage::disk('local')->download($document->path);
    }

    public function reviewDocument(Request $request, RegistrationDocument $document): RedirectResponse
    {
        abort_unless(ResidenceWorkflowAccess::officer($request->user(), $document->registration), 403);
        $data = $request->validate(['status' => ['required', 'in:valid,revision'], 'notes' => ['required_if:status,revision', 'nullable', 'string', 'max:2000']]);
        DB::transaction(function () use ($request, $document, $data): void {
            $r = ResidenceRegistration::whereKey($document->residence_registration_id)->lockForUpdate()->firstOrFail();
            $document->refresh();
            if ($r->completed_at || $document->version !== $r->documents()->where('kind', $document->kind)->max('version')) {
                throw ValidationException::withMessages(['document' => 'Hanya versi dokumen terbaru pada pendaftaran berjalan yang dapat diperiksa.']);
            }
            if ($document->status === $data['status'] && $document->notes === ($data['notes'] ?? null)) {
                return;
            }
            $old = $document->toArray();
            $document->update([...$data, 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);
            AuditLogService::log($request->user(), 'registration_document_reviewed', $document, $old, $document->toArray());
            if ($data['status'] === 'revision') {
                app(ResidenceWorkflow::class)->notify($r, 'Dokumen perlu revisi', $document->kind.': '.$data['notes']);
            }
            app(ResidenceWorkflow::class)->evaluate($r->fresh());
        });

        return back();
    }

    public function requestDecision(Request $request, ResidenceRegistration $registration): RedirectResponse
    {
        abort_unless(ResidenceWorkflowAccess::manager($request->user()) || $registration->studentProfile->user_id === $request->user()->id, 403);
        $data = $request->validate(['kind' => ['required', 'in:installment,defer,monthly,transfer_permission'], 'reason' => ['required', 'string', 'max:2000']]);
        DB::transaction(function () use ($request, $registration, $data): void {
            $r = ResidenceRegistration::whereKey($registration->id)->lockForUpdate()->firstOrFail();
            if ($r->completed_at || ! $r->tagihan_id || $r->status->value === 'rejected') {
                throw ValidationException::withMessages(['decision' => 'Keputusan membutuhkan pendaftaran berjalan dan tagihan.']);
            }
            if ($data['kind'] === 'monthly' && $r->rate_unit !== 'month') {
                throw ValidationException::withMessages(['kind' => 'Pendaftaran ini bukan skema bulanan.']);
            }
            if ($data['kind'] === 'transfer_permission' && $r->stay_kind !== 'non_student') {
                throw ValidationException::withMessages(['kind' => 'Izin berbasis bukti transfer hanya untuk umum.']);
            }
            if ($r->decisions()->where('kind', $data['kind'])->whereIn('status', ['pending', 'approved'])->exists()) {
                throw ValidationException::withMessages(['decision' => 'Keputusan yang sama sudah diajukan atau disetujui.']);
            }
            $decision = $r->decisions()->create([...$data, 'requested_by' => $request->user()->id, 'status' => 'pending']);
            AuditLogService::log($request->user(), 'residence_decision_requested', $decision, null, $data);
        });

        return back();
    }

    public function decide(Request $request, ResidenceDecision $decision): RedirectResponse
    {
        $leader = in_array($decision->kind, ['installment', 'defer'], true);
        abort_unless($leader ? $request->user()->hasRole('pimpinan') : ResidenceWorkflowAccess::manager($request->user()), 403);
        $data = $request->validate(['status' => ['required', 'in:approved,rejected'], 'notes' => ['required', 'string', 'max:2000'],
            'initial_amount' => ['required_if:status,approved', 'nullable', 'numeric', 'decimal:0,2', 'min:0'],
            'schedule' => ['nullable', 'array'], 'schedule.*.jatuh_tempo' => ['required', 'date', 'after_or_equal:today'], 'schedule.*.jumlah' => ['required', 'numeric', 'decimal:0,2', 'min:1']]);
        DB::transaction(function () use ($request, $decision, $data): void {
            $r = ResidenceRegistration::whereKey($decision->residence_registration_id)->lockForUpdate()->firstOrFail();
            $decision = ResidenceDecision::whereKey($decision->id)->lockForUpdate()->firstOrFail();
            if ($decision->status !== 'pending') {
                throw ValidationException::withMessages(['decision' => 'Keputusan sudah final.']);
            }
            if ($r->completed_at || $r->status->value === 'rejected') {
                throw ValidationException::withMessages(['decision' => 'Pendaftaran sudah selesai atau dibatalkan.']);
            }
            $invoice = $r->tagihan()->lockForUpdate()->firstOrFail();
            $schedule = $data['schedule'] ?? [];
            if (! is_array($schedule)) {
                throw ValidationException::withMessages(['schedule' => 'Jadwal termin tidak valid.']);
            }
            if ($data['status'] === 'approved' && $decision->kind !== 'transfer_permission') {
                if ($decision->kind === 'monthly' && ($r->rate_unit !== 'month' || (int) $r->studentProfile->angkatan === (int) $r->periode->angkatan_maba || ! ($r->policy->settings['monthly_allowed'] ?? false))) {
                    throw ValidationException::withMessages(['decision' => 'Pendaftar tidak berhak menggunakan skema bulanan.']);
                }
                $agreement = $r->documents()->where('kind', 'perjanjian')->orderByDesc('version')->first();
                if ($agreement?->status !== 'valid') {
                    throw ValidationException::withMessages(['decision' => 'Perjanjian harus diperiksa dan valid sebelum persetujuan pembiayaan.']);
                }
                $sum = collect($schedule)->sum(fn ($term) => (int) round((float) $term['jumlah'] * 100));
                if ($schedule === [] || $sum !== (int) round((float) $invoice->total * 100) || (float) $data['initial_amount'] > (float) $invoice->total) {
                    throw ValidationException::withMessages(['schedule' => 'Jumlah seluruh termin harus sama dengan tagihan dan uang awal tidak boleh melebihi total.']);
                }
                if ($decision->kind !== 'defer' && (float) $data['initial_amount'] !== (float) $schedule[0]['jumlah']) {
                    throw ValidationException::withMessages(['initial_amount' => 'Pembayaran awal harus sama dengan termin pertama.']);
                }
                if ($decision->kind === 'monthly' && (float) $data['initial_amount'] <= 0) {
                    throw ValidationException::withMessages(['initial_amount' => 'Bulanan wajib membayar bulan awal. Ajukan penundaan kepada pimpinan bila tanpa uang awal.']);
                }
                if ($r->decisions()->whereIn('kind', ['monthly', 'installment', 'defer'])->where('status', 'approved')->where('kind', '!=', 'monthly')->exists()) {
                    throw ValidationException::withMessages(['decision' => 'Skema pembiayaan sudah disetujui.']);
                }
                $invoice->jadwalCicilan()->delete();
                foreach ($schedule as $i => $term) {
                    $invoice->jadwalCicilan()->create([...$term, 'termin_ke' => $i + 1]);
                }
                $invoice->update(['amount_due_now' => $data['initial_amount']]);
            }
            if ($data['status'] === 'approved' && $decision->kind === 'transfer_permission' && ! Pembayaran::where('tagihan_id', $invoice->id)->where('status', 'menunggu_verifikasi')->whereNotNull('bukti_transfer_path')->where('nominal', '>=', (float) $invoice->total - (float) $invoice->total_dibayar)->exists()) {
                throw ValidationException::withMessages(['decision' => 'Bukti transfer belum tersedia.']);
            }
            $decision->update(['status' => $data['status'], 'decided_by' => $request->user()->id, 'decided_at' => now(), 'terms' => ['initial_amount' => $data['initial_amount'] ?? null, 'schedule' => $schedule, 'notes' => $data['notes']]]);
            AuditLogService::log($request->user(), 'residence_decision_'.$data['status'], $decision, null, $decision->toArray());
            app(ResidenceWorkflow::class)->notify($r, 'Keputusan pembiayaan', $decision->kind.' '.$data['status'].': '.$data['notes']);
            app(ResidenceWorkflow::class)->evaluate($r->fresh());
        });

        return back();
    }

    public function checkIn(Request $request, ResidenceRegistration $registration, ConfirmResidenceCheckIn $confirm): RedirectResponse
    {
        $request->validate(['identity_checked' => ['accepted'], 'original_documents_checked' => ['accepted'], 'keys_handed' => ['accepted']]);
        $confirm->handle($registration, $request->user());

        return back()->with('toast', ['type' => 'success', 'message' => 'Check-in fisik dan serah kunci tercatat.']);
    }

    public function requestInspection(Request $request, ResidenceRegistration $registration): RedirectResponse
    {
        abort_unless(ResidenceWorkflowAccess::officer($request->user(), $registration), 403);
        DB::transaction(function () use ($registration, $request): void {
            $r = ResidenceRegistration::whereKey($registration->id)->lockForUpdate()->firstOrFail();
            if (! $r->completed_at || $r->keys_returned_at) {
                throw ValidationException::withMessages(['inspection' => 'Penghuni belum check-in atau kunci sudah kembali.']);
            }
            $checkout = app(CreateCheckoutRequest::class)->handle($r->studentProfile, 'Pemeriksaan sebelum pengembalian kunci');
            if ($checkout->wasRecentlyCreated) {
                User::permission('inspection.manage')->get()->each(fn ($officer) => $officer->notify(new ResidenceWorkflowNotification('Pemeriksaan kamar diperlukan', 'Permohonan pemeriksaan kamar tersedia pada antrean inspeksi.', $r->id)));
                AuditLogService::log($request->user(), 'residence_inspection_requested', $checkout);
            }
        });

        return back();
    }

    public function returnKeys(Request $request, ResidenceRegistration $registration, ReturnResidenceKeys $return): RedirectResponse
    {
        $data = $request->validate(['keys_received' => ['accepted'], 'room_vacated' => ['accepted'], 'condition' => ['required', 'in:ready,damaged'], 'notes' => ['required', 'string', 'max:2000']]);
        $return->handle($registration, $request->user(), $data['condition'], $data['notes']);

        return back();
    }

    public function allocate(Request $request, ResidenceRegistration $registration, AllocateResidenceRoom $allocate): RedirectResponse
    {
        abort_unless(ResidenceWorkflowAccess::manager($request->user()) && $registration->is_kipk && $registration->workflow_version === 2, 403);
        $allocate->handle($registration);

        return back();
    }

    public function disburse(Request $request, ResidenceRegistration $registration): RedirectResponse
    {
        abort_unless(ResidenceWorkflowAccess::manager($request->user()) && $registration->is_kipk, 403);
        $data = $request->validate(['disbursed_at' => ['required', 'date', 'before_or_equal:today'], 'due_at' => ['required', 'date', 'after_or_equal:disbursed_at'], 'reference' => ['required', 'string', 'max:255']]);
        DB::transaction(function () use ($request, $registration, $data): void {
            $r = ResidenceRegistration::whereKey($registration->id)->lockForUpdate()->firstOrFail();
            if ($r->kipk_disbursed_at) {
                throw ValidationException::withMessages(['reference' => 'Pencairan sudah tercatat.']);
            }
            $r->update(['kipk_disbursed_at' => $data['disbursed_at'], 'kipk_due_at' => $data['due_at']]);
            $r->tagihan?->update(['jatuh_tempo' => $data['due_at']]);
            AuditLogService::log($request->user(), 'kipk_disbursement_recorded', $r, null, $data);
            app(ResidenceWorkflow::class)->evaluate($r->fresh());
        });

        return back();
    }

    public function contract(Request $request): RedirectResponse
    {
        abort_unless(ResidenceWorkflowAccess::manager($request->user()), 403);
        $data = $request->validate(['registration_ids' => ['required', 'array', 'min:1'], 'registration_ids.*' => ['required', 'uuid', 'distinct', 'exists:residence_registrations,id']]);
        DB::transaction(function () use ($request, $data): void {
            $members = ResidenceRegistration::whereIn('id', $data['registration_ids'])->orderBy('id')->lockForUpdate()->get();
            $first = $members->first();
            $room = Kamar::whereKey($first->reserved_room_id)->lockForUpdate()->firstOrFail();
            foreach ($members as $r) {
                if ($r->workflow_version !== 2 || $r->is_kipk || $r->billing_basis !== 'room' || $r->reserved_room_id !== $room->id || $r->tagihan_id || $r->completed_at || $r->room_contract_id || $r->status->value === 'rejected' || $r->residence_policy_id !== $first->residence_policy_id || ! $r->starts_at->equalTo($first->starts_at) || ! $r->ends_at->equalTo($first->ends_at)) {
                    throw ValidationException::withMessages(['contract' => 'Anggota harus memiliki alokasi kamar, periode, dan kebijakan yang sama serta belum ditagih.']);
                }
            }
            $allocated = ResidenceRegistration::where('reserved_room_id', $room->id)->whereNull('completed_at')->whereNotIn('status', ['draft', 'rejected'])->pluck('id')->sort()->values()->all();
            if ($allocated !== $members->modelKeys()) {
                throw ValidationException::withMessages(['contract' => 'Sertakan seluruh anggota yang sudah menerima alokasi kamar.']);
            }
            if ($members->count() > $room->kapasitas) {
                throw ValidationException::withMessages(['contract' => 'Jumlah anggota melebihi kapasitas.']);
            }
            $rate = app(ResidencePolicyService::class)->rate($first, $room);
            if (empty($rate['room_amount']) || $first->rate_unit !== 'year') {
                throw ValidationException::withMessages(['contract' => 'Tarif tahunan kamar belum tersedia.']);
            }
            $contract = RoomContract::create(['kamar_id' => $room->id, 'occupants' => $members->count(), 'total' => $rate['room_amount'], 'members' => $members->modelKeys(), 'approved_by' => $request->user()->id, 'approved_at' => now()]);
            foreach ($members as $r) {
                $r->update(['room_contract_id' => $contract->id]);
                app(CreateResidenceBilling::class)->handle($r->fresh());
            }
            AuditLogService::log($request->user(), 'room_contract_approved', $contract, null, $contract->toArray());
        });

        return back();
    }

    public function historical(Request $request, ResidenceRegistration $registration): RedirectResponse
    {
        abort_unless(ResidenceWorkflowAccess::manager($request->user()), 403);
        $data = $request->validate(['evidence' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'], 'notes' => ['required', 'string', 'max:2000']]);
        DB::transaction(function () use ($request, $registration, $data): void {
            $r = ResidenceRegistration::whereKey($registration->id)->lockForUpdate()->firstOrFail();
            if ($r->workflow_version === 2 || ! $r->completed_at || $r->historical_confirmed_at) {
                throw ValidationException::withMessages(['history' => 'Catatan bukan histori yang menunggu konfirmasi.']);
            }
            $r->update(['historical_evidence' => $request->file('evidence')->store('documents/historical', 'local'), 'historical_confirmed_by' => $request->user()->id, 'historical_confirmed_at' => now()]);
            AuditLogService::log($request->user(), 'historical_occupancy_confirmed', $r, null, ['notes' => $data['notes']]);
        });

        return back();
    }

    public function recordPayment(Request $request): RedirectResponse
    {
        abort_unless($request->user()->can('pembayaran.verify'), 403);
        $request->merge(['reference' => trim((string) $request->input('reference'))]);
        $data = $request->validate(['reference' => ['required', 'string', 'max:150', 'unique:residence_payment_references,reference'],
            'source' => ['required', 'string', 'max:100'], 'paid_at' => ['required', 'date', 'before_or_equal:today'],
            'amount' => ['required', 'numeric', 'decimal:0,2', 'min:1', 'max:100000000000'], 'payer_type' => ['required', 'in:personal,sponsor'],
            'evidence' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,csv,txt,xlsx', 'max:10240'], 'official_source_confirmed' => ['accepted']]);
        $reference = ResidencePaymentReference::create([
            'reference' => trim($data['reference']), 'source' => $data['source'], 'paid_at' => $data['paid_at'], 'amount' => $data['amount'],
            'payer_type' => $data['payer_type'], 'evidence_path' => $request->file('evidence')->store('documents/dpub', 'local'),
            'recorded_by' => $request->user()->id, 'status' => 'unmatched',
        ]);
        AuditLogService::log($request->user(), 'dpub_transaction_recorded', $reference, null, ['reference' => $reference->reference, 'source' => $reference->source]);

        return back();
    }

    public function reconcile(Request $request, ResidencePaymentReference $reference, ReconcileResidencePayment $reconcile): RedirectResponse
    {
        $data = $request->validate(['allocations' => ['required', 'array', 'min:1', 'max:200'], 'allocations.*.tagihan_id' => ['required', 'uuid', 'distinct', 'exists:tagihan,id'], 'allocations.*.payment_proof_id' => ['nullable', 'uuid', 'distinct', 'exists:pembayaran,id'], 'allocations.*.jumlah' => ['required', 'numeric', 'decimal:0,2', 'min:1']]);
        $reconcile->handle($reference, $data['allocations'], $request->user());

        return back()->with('toast', ['type' => 'success', 'message' => 'Dana dicocokkan dan dibukukan satu kali.']);
    }

    public function paymentEvidence(Request $request, ResidencePaymentReference $reference): StreamedResponse
    {
        abort_unless($request->user()->can('pembayaran.verify'), 403);

        return Storage::disk('local')->download($reference->evidence_path);
    }

    public function transferProof(Request $request, ResidenceRegistration $registration): RedirectResponse
    {
        abort_unless(ResidenceWorkflowAccess::manager($request->user()) && $registration->stay_kind === 'non_student', 403);
        $data = $request->validate(['nominal' => ['required', 'numeric', 'decimal:0,2', 'min:1'], 'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120']]);
        DB::transaction(function () use ($request, $registration, $data): void {
            $r = ResidenceRegistration::whereKey($registration->id)->lockForUpdate()->firstOrFail();
            $invoice = $r->tagihan()->lockForUpdate()->firstOrFail();
            if ($r->status->value === 'rejected' || (float) $data['nominal'] > (float) $invoice->total - (float) $invoice->total_dibayar || Pembayaran::where('tagihan_id', $invoice->id)->where('status', 'menunggu_verifikasi')->exists()) {
                throw ValidationException::withMessages(['nominal' => 'Periksa sisa tagihan dan bukti yang masih menunggu rekonsiliasi.']);
            }
            $proof = Pembayaran::create(['kode_transaksi' => 'PUB-'.Str::uuid(), 'mahasiswa_id' => $r->student_profile_id,
                'tagihan_id' => $invoice->id, 'jenis_pembayaran' => 'sewa_asrama', 'nominal' => $data['nominal'], 'termin_ke' => 1,
                'metode_pembayaran' => 'transfer_bank', 'bukti_transfer_path' => $request->file('file')->store('bukti-pembayaran', 'local'), 'status' => 'menunggu_verifikasi']);
            AuditLogService::log($request->user(), 'public_transfer_proof_recorded', $proof);
        });

        return back();
    }
}
