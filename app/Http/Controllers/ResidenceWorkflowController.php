<?php

namespace App\Http\Controllers;

use App\Actions\Checkout\CreateCheckoutRequest;
use App\Actions\Checkout\ReturnResidenceKeys;
use App\Actions\Registration\AllocateResidenceRoom;
use App\Actions\Registration\ConfirmResidenceCheckIn;
use App\Actions\Registration\CreateResidenceBilling;
use App\Enums\TagihanStatus;
use App\Http\Requests\PublishResidencePolicyRequest;
use App\Models\CheckoutRequest;
use App\Models\Departemen;
use App\Models\Faculty;
use App\Models\Gedung;
use App\Models\InvoiceGroup;
use App\Models\Kamar;
use App\Models\PaymentBankAccount;
use App\Models\Pembayaran;
use App\Models\Periode;
use App\Models\Prodi;
use App\Models\RegistrationDocument;
use App\Models\ResidenceApplication;
use App\Models\ResidenceCashRefund;
use App\Models\ResidenceDecision;
use App\Models\ResidenceDocumentTemplate;
use App\Models\ResidencePaymentReference;
use App\Models\ResidencePolicy;
use App\Models\ResidenceRegistration;
use App\Models\RoomContract;
use App\Models\RoomInvitation;
use App\Models\Tagihan;
use App\Models\User;
use App\Models\VirtualAccount;
use App\Notifications\ResidenceWorkflowNotification;
use App\Services\AuditLogService;
use App\Services\ResidenceBuildingAccess;
use App\Services\ResidenceLifecycle;
use App\Services\ResidencePolicyService;
use App\Services\ResidenceWorkflow;
use App\Services\ResidenceWorkflowAccess;
use App\Services\RoomEligibility;
use App\Services\RoomReservations;
use App\Services\StudentCohort;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ResidenceWorkflowController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $studentView = $request->routeIs('mahasiswa.registration.status');
        $manager = ! $studentView && ResidenceWorkflowAccess::manager($user);
        $finance = ! $studentView && $user->can('pembayaran.verify');
        $section = $studentView ? 'registrations' : $request->query('section', 'registrations');
        $allowedSections = ['registrations', ...($manager ? ['opening', 'applications', 'public', 'contracts'] : []), ...($finance ? ['finance'] : [])];
        abort_unless(in_array($section, $allowedSections, true), 404);
        if (! $studentView && ! $manager && $user->hasRole('mahasiswa')) {
            return redirect()->route('mahasiswa.registration');
        }
        abort_unless($manager || $finance || $user->hasAnyRole(['mahasiswa', 'fasilitator', 'pimpinan']), 403);
        $registrations = ResidenceRegistration::with(['studentProfile.user', 'reservedRoom.lantai.gedung', 'placement.kamar.lantai.gedung', 'policy', 'documents.reviewer:id,nama', 'decisions', 'tagihan.items', 'tagihan.dokumen', 'tagihan.jadwalCicilan', 'tagihan.pembayaran' => fn ($q) => $q->latest(), 'application', 'roomContract'])
            ->when($studentView, fn ($q) => $q->where('student_profile_id', $user->mahasiswaProfil?->id))
            ->when(! $studentView && ! $manager && ! $finance && ! $user->hasRole('pimpinan'), function ($q) use ($user): void {
                if ($user->hasRole('fasilitator')) {
                    $ids = ResidenceBuildingAccess::ids($user);
                    $q->where(fn ($q) => $q->whereHas('reservedRoom.lantai', fn ($q) => $q->whereIn('gedung_id', $ids))->orWhereHas('placement.kamar.lantai', fn ($q) => $q->whereIn('gedung_id', $ids)));
                } else {
                    $q->where('student_profile_id', $user->mahasiswaProfil?->id);
                }
            });
        $summary = [
            'applicants' => (clone $registrations)->whereNull('completed_at')->whereNotIn('status', ['draft', 'rejected', 'cancelled'])->count(),
            'allocated' => (clone $registrations)->whereNull('completed_at')->whereNotNull('reserved_room_id')->whereNotIn('status', ['draft', 'rejected', 'cancelled'])->count(),
            'ready' => (clone $registrations)->whereNull('completed_at')->whereNotNull('ready_at')->count(),
            'occupants' => (clone $registrations)->whereHas('placement', fn ($q) => $q->where('status', 'aktif'))->count(),
            'historical' => (clone $registrations)->whereNull('workflow_version')->whereNotNull('completed_at')->whereNull('historical_confirmed_at')->count(),
        ];
        $summary['physical'] = (clone $registrations)->whereNotNull('checked_in_at')->whereNull('keys_returned_at')->whereHas('placement', fn ($q) => $q->where('status', 'aktif'))->count();
        $summary['receivables'] = (float) Tagihan::whereIn('id', (clone $registrations)->select('tagihan_id'))->where('status', '!=', 'batal')->sum(DB::raw('CASE WHEN total > total_dibayar THEN total - total_dibayar ELSE 0 END + CASE WHEN sponsor_total > sponsor_paid THEN sponsor_total - sponsor_paid ELSE 0 END'));
        $summary['credits'] = (float) Tagihan::whereIn('id', (clone $registrations)->select('tagihan_id'))->where('status', '!=', 'batal')->whereColumn('total_dibayar', '>', 'total')->sum(DB::raw('total_dibayar - total'));
        $searchFilter = ! $studentView ? trim((string) $request->query('search', '')) : '';
        $statusFilter = ! $studentView ? trim((string) $request->query('status', '')) : '';
        $categoryFilter = ! $studentView ? trim((string) $request->query('category', '')) : '';
        $filteredRegistrations = (clone $registrations)
            ->when($searchFilter !== '', function ($q) use ($searchFilter): void {
                $q->where(function ($sub) use ($searchFilter): void {
                    $sub->whereHas('studentProfile.user', fn ($u) => $u->where('nama', 'like', "%{$searchFilter}%")->orWhere('nim_nip', 'like', "%{$searchFilter}%"))
                        ->orWhereHas('reservedRoom', fn ($r) => $r->where('nomor_kamar', 'like', "%{$searchFilter}%")
                            ->orWhereHas('lantai.gedung', fn ($g) => $g->where('nama_gedung', 'like', "%{$searchFilter}%")));
                });
            })
            ->when($statusFilter !== '', function ($q) use ($statusFilter): void {
                if ($statusFilter === 'checked_in') {
                    $q->whereNotNull('checked_in_at')->whereNull('keys_returned_at');
                } elseif ($statusFilter === 'keys_returned') {
                    $q->whereNotNull('keys_returned_at');
                } else {
                    $q->where('status', $statusFilter);
                }
            })
            ->when($categoryFilter !== '', fn ($q) => $q->whereHas('policy', fn ($p) => $p->where('category', $categoryFilter)));
        $page = $filteredRegistrations->latest()->paginate(30)->withQueryString();
        $page->getCollection()->transform(fn (ResidenceRegistration $r): ResidenceRegistration => $this->decorateRegistration($r, $user));

        return Inertia::render($studentView ? 'mahasiswa/registration-status' : 'admin/residence-workflow', [
            'role' => $user->getRoleNames()->first(), 'page' => $studentView ? 'registration' : ($section === 'registrations' ? 'residence-workflow' : 'residence-workflow/'.$section), 'initialUser' => app(RolePageController::class)->userPayload($request),
            'section' => $section,
            'detailMode' => false,
            'filters' => ['search' => $searchFilter, 'status' => $statusFilter, 'category' => $categoryFilter],
            'pendingRoomContracts' => $manager && in_array($section, ['registrations', 'contracts'], true) ? (clone $registrations)
                ->with(['studentProfile.user', 'reservedRoom.lantai.gedung'])
                ->where('billing_basis', 'room')->whereNull('room_contract_id')->whereNull('completed_at')
                ->whereNotNull('reserved_room_id')->whereNotIn('status', ['draft', 'rejected', 'cancelled'])->get() : [],
            'registrations' => $page, 'summary' => $summary,
            'studentView' => $studentView,
            'payment_accounts' => $studentView ? PaymentBankAccount::where('is_active', true)->orderBy('bank_name')->orderBy('account_number')->get() : [],
            'virtual_accounts' => $studentView ? VirtualAccount::where('mahasiswa_id', $user->mahasiswaProfil?->id)->where('aktif', true)->get() : [],
            'manager' => $manager, 'finance' => $finance, 'leader' => ! $studentView && $user->hasRole('pimpinan'),
            'profile' => $user->mahasiswaProfil?->load('prodi.departemen'), 'gender' => $user->gender,
            'no_hp' => $user->no_hp,
            'client_profile_category' => $user->getRawOriginal('client_profile_category'),
            'fakultas' => Faculty::orderBy('name')->get(['id', 'name']),
            'departemen' => Departemen::orderBy('name')->get(['id', 'name', 'faculty_id']),
            'programs' => Prodi::orderBy('name')->get(['id', 'name', 'jenjang', 'departemen_id']),
            'policies' => $manager ? ResidencePolicy::orderBy('category')->orderByDesc('version')->get() : [],
            'templates' => ResidenceDocumentTemplate::orderBy('category')->orderBy('kind')->get(['id', 'category', 'kind', 'original_name', 'updated_at']),
            'buildings' => $manager ? Gedung::orderBy('kode_gedung')->get(['id', 'kode_gedung', 'nama_gedung'])
                ->map(fn (Gedung $building): array => [
                    ...$building->toArray(),
                    'settings_url' => $user->can('gedung.manage') && $user->can('gedung.view')
                        ? route('andalas.gedung.show', $building)
                        : null,
                ]) : [],
            'policyCatalog' => $manager ? collect(ResidencePolicyService::CATEGORIES)
                ->mapWithKeys(fn (string $category): array => [$category => app(ResidencePolicyService::class)->masterCatalog($category)]) : [],
            'masterHousingUrl' => $user->hasAnyRole(['staff_admin', 'superadmin']) ? route('admin.kelola-bangunan') : null,
            'rooms' => ($manager || $user->hasRole('fasilitator')) ? $this->availableRoomsForOfficer($user, $manager) : [],
            'applications' => ($manager || $finance) ? ResidenceApplication::with('registrations.tagihan')->latest()->limit(100)->get() : [],
            'paymentProofs' => $finance ? Pembayaran::with(['mahasiswa.user', 'tagihan:id,nomor,total,total_dibayar,status'])->where('status', 'menunggu_verifikasi')->latest()->limit(200)->get() : [],
            'invoiceGroups' => $finance ? InvoiceGroup::latest()->limit(100)->get() : [],
            'reconciliations' => $finance ? ResidencePaymentReference::latest()->limit(100)->get() : [],
            'invoices' => $finance ? Tagihan::with(['mahasiswa.user', 'registration:id,tagihan_id,residence_application_id'])->where('status', '!=', 'batal')->where(fn ($q) => $q->whereColumn('total', '>', 'total_dibayar')->orWhereColumn('sponsor_total', '>', 'sponsor_paid'))->latest()->limit(200)->get() : [],
            'publicStays' => $manager && $section === 'public' ? ResidenceRegistration::with(['studentProfile.user', 'reservedRoom.lantai.gedung', 'tagihan', 'placement'])->where('stay_kind', 'non_student')->latest()->limit(50)->get() : [],
        ]);
    }

    public function show(Request $request, ResidenceRegistration $registration): Response
    {
        $user = $request->user();
        $manager = ResidenceWorkflowAccess::manager($user);
        $finance = $user->can('pembayaran.verify');
        abort_unless($manager || $finance || $user->hasAnyRole(['fasilitator', 'pimpinan']), 403);
        if (! $manager && ! $finance && ! $user->hasRole('pimpinan') && $user->hasRole('fasilitator')) {
            abort_unless(ResidenceWorkflowAccess::officer($user, $registration), 403);
        }

        $registration->load(['studentProfile.user', 'reservedRoom.lantai.gedung', 'placement.kamar.lantai.gedung', 'policy', 'documents.reviewer:id,nama', 'decisions', 'tagihan.items', 'tagihan.dokumen', 'tagihan.jadwalCicilan', 'tagihan.pembayaran' => fn ($q) => $q->latest(), 'application', 'roomContract']);
        $registration = $this->decorateRegistration($registration, $user);

        return Inertia::render('admin/residence-workflow', [
            'role' => $user->getRoleNames()->first(),
            'page' => 'residence-workflow',
            'initialUser' => app(RolePageController::class)->userPayload($request),
            'section' => 'registrations',
            'detailMode' => true,
            'filters' => ['search' => '', 'status' => '', 'category' => ''],
            'pendingRoomContracts' => [],
            'registrations' => ['data' => [$registration], 'last_page' => 1, 'links' => []],
            'summary' => [],
            'studentView' => false,
            'manager' => $manager,
            'finance' => $finance,
            'leader' => $user->hasRole('pimpinan'),
            'programs' => Prodi::orderBy('name')->get(['id', 'name', 'jenjang', 'departemen_id']),
            'policies' => [],
            'templates' => ResidenceDocumentTemplate::orderBy('category')->orderBy('kind')->get(['id', 'category', 'kind', 'original_name', 'updated_at']),
            'buildings' => [],
            'policyCatalog' => [],
            'masterHousingUrl' => null,
            'rooms' => ($manager || $user->hasRole('fasilitator')) ? $this->availableRoomsForOfficer($user, $manager, $registration) : [],
            'applications' => [],
            'paymentProofs' => [],
            'invoiceGroups' => [],
            'reconciliations' => [],
            'invoices' => [],
            'publicStays' => [],
        ]);
    }

    public function decorateRegistration(ResidenceRegistration $r, User $user): ResidenceRegistration
    {
        $workflow = app(ResidenceWorkflow::class);
        $r->loadMissing('cashRefunds.officer:id,nama');
        $r->setAttribute('blockers', $r->completed_at ? [] : $workflow->blockers($r));
        $r->setAttribute('check_in_blockers', $r->completed_at ? [] : $workflow->checkInBlockers($r));
        $r->setAttribute('can_submit', ResidenceWorkflowAccess::manager($user) || $r->studentProfile->user_id === $user->id);
        $r->setAttribute('can_cancel', $workflow->canStudentCancel($r, $user));
        $r->setAttribute('payment_unlocked', $workflow->paymentUnlocked($r));
        $r->setAttribute('has_pending_group_invitations', $workflow->hasPendingGroupInvitations($r));
        $r->setAttribute('checkout_request', $r->penempatan_kamar_id ? CheckoutRequest::with('inspection')->where('penempatan_kamar_id', $r->penempatan_kamar_id)->where('status', '!=', 'ditolak')->latest()->first() : null);
        if (ResidenceWorkflowAccess::manager($user) && $r->room_contract_id) {
            $r->setAttribute('contract_candidates', ResidenceRegistration::with('studentProfile.user')->where(function ($q) use ($r): void {
                $q->where('room_contract_id', $r->room_contract_id)->orWhere(fn ($q) => $q->whereNull('room_contract_id')->whereNull('tagihan_id')->whereNull('completed_at')->whereNotIn('status', ['draft', 'rejected', 'cancelled'])->where('reserved_room_id', $r->reserved_room_id)->whereIn('billing_basis', ['room', 'group'])->where('residence_policy_id', $r->residence_policy_id)->whereDate('starts_at', $r->starts_at)->whereDate('ends_at', $r->ends_at));
            })->whereNotIn('status', ['draft', 'rejected', 'cancelled'])->get()->map(fn ($candidate) => ['id' => $candidate->id, 'name' => $candidate->studentProfile->user->nama]));
        }
        $r->setAttribute('amendments', DB::table('residence_amendments')->where(function ($q) use ($r): void {
            $q->where('subject_id', $r->id)->orWhereJsonContains('after->registration_ids', $r->id);
            if ($r->room_contract_id) {
                $q->orWhere('subject_id', $r->room_contract_id);
            }
        })->orderByDesc('created_at')->get()->map(fn ($a) => ['id' => $a->id, 'kind' => $a->kind, 'reason' => $a->reason, 'created_at' => $a->created_at]));
        $r->setAttribute('can_operate', ResidenceWorkflowAccess::officer($user, $r));
        $r->setAttribute('can_review_documents', ResidenceWorkflowAccess::documentReviewer($user, $r));

        return $r;
    }

    /** @return Collection<int, Kamar> */
    private function availableRoomsForOfficer(User $user, bool $manager, ?ResidenceRegistration $registration = null): Collection
    {
        $policyService = app(ResidencePolicyService::class);
        $reservations = app(RoomReservations::class);
        $currentRoomId = $registration?->placement?->kamar_id ?? $registration?->reserved_room_id;

        return Kamar::with('lantai.gedung')
            ->where('status', '!=', 'maintenance')
            ->whereHas('lantai', function ($q) use ($user, $manager): void {
                $q->where('booking_open', true)
                    ->when(! $manager, fn ($floors) => $floors->whereIn('gedung_id', ResidenceBuildingAccess::ids($user)));
            })
            ->orderBy('nomor_kamar')
            ->get()
            ->filter(function (Kamar $room) use ($registration, $currentRoomId, $policyService, $reservations): bool {
                if ($currentRoomId && $room->id === $currentRoomId) {
                    return false;
                }
                if (! RoomEligibility::allowsType($room->lantai->gedung, $room->tipe_kamar, $room->kapasitas)) {
                    return false;
                }
                if ($registration) {
                    try {
                        $policyService->validateRoom($registration->policy, $room, $registration->studentProfile);
                        $policyService->rate($registration, $room);
                    } catch (ValidationException) {
                        return false;
                    }
                }
                $occupied = $room->penempatanKamar()->where('status', 'aktif')->count();
                $held = $reservations->count($room, $registration?->id);
                $availablePlaces = max(0, (int) $room->kapasitas - $occupied - $held);
                if ($availablePlaces <= 0) {
                    return false;
                }
                $room->setAttribute('available_places', $availablePlaces);

                return true;
            })
            ->values();
    }

    public function profile(Request $request): RedirectResponse
    {
        abort_unless($request->user()->hasRole('mahasiswa') && $request->user()->mahasiswaProfil, 403);
        $housing = $request->routeIs('residence.housing-profile');
        $user = $request->user();
        $isSso = filled($user->sso_id);
        $needsNim = $user->hasPendingNim();
        $data = $request->validate([
            'nim_nip' => $needsNim ? ['required', 'string', 'max:50', Rule::unique('users', 'nim_nip')->ignore($user->id)] : ['nullable', 'string', 'max:50'],
            'gender' => ['required', 'in:laki_laki,perempuan'],
            'prodi_id' => ['required', 'uuid', 'exists:prodi,id'],
            'no_hp' => [$housing ? 'required' : 'nullable', 'string', 'max:20', ...($housing ? ['regex:/^\+?[0-9][0-9 ()-]{6,18}[0-9]$/D'] : [])],
            'client_profile_category' => ['nullable', 'in:local_student,local_kipk,local_non_kipk,international_student'],
            'email_pribadi' => [$housing && $isSso ? 'required' : 'nullable', 'string', 'email', 'max:255'],
            ...($housing ? [
                'nama' => ['required', 'string', 'max:255'],
                'nik' => ['required', 'digits:16'],
                'city_id' => ['required', 'uuid', 'exists:cities,id'],
                'alamat' => ['required', 'string', 'max:500'],
            ] : []),
        ]);
        DB::transaction(function () use ($request, $data, $isSso, $needsNim): void {
            $user = $request->user();
            $profile = $user->mahasiswaProfil()->lockForUpdate()->firstOrFail();
            if ($profile->residenceRegistrations()->whereNull('completed_at')->whereNotIn('status', ['draft', 'rejected', 'cancelled'])->exists() || $profile->penempatanKamar()->where('status', 'aktif')->exists()) {
                throw ValidationException::withMessages(['profile' => 'Data kategori penghuni berjalan hanya dapat dikoreksi pengelola.']);
            }
            $nim = $needsNim ? trim((string) $data['nim_nip']) : $user->nim_nip;
            $year = StudentCohort::fromNim($nim);
            $categoryInput = $data['client_profile_category'] ?? ($user->getRawOriginal('client_profile_category') ?? 'local_student');
            if ($categoryInput === 'international_student') {
                $resolvedCategory = 'international_student';
            } else {
                $resolvedCategory = app(ResidenceLifecycle::class)->resolveLocalCategory($nim, $data['prodi_id'], $year);
            }

            $user->update([
                'nim_nip' => $nim,
                'nama' => isset($data['nama']) ? mb_strtoupper(trim($data['nama']), 'UTF-8') : $user->nama,
                'gender' => $data['gender'],
                'no_hp' => array_key_exists('no_hp', $data) ? $data['no_hp'] : $user->no_hp,
                'client_profile_category' => $resolvedCategory,
            ]);
            $profile->update([
                'prodi_id' => $data['prodi_id'],
                'angkatan' => $year,
                'email_pribadi' => $data['email_pribadi'] ?? $profile->email_pribadi ?? (! $isSso ? $user->email : null),
                ...Arr::only($data, ['nik', 'city_id', 'alamat']),
            ]);
            AuditLogService::log($user, 'residence_profile_completed', $profile, null, Arr::except($data, ['nik', 'alamat', 'no_hp', 'email_pribadi']));
        });

        if ($housing) {
            return redirect()->route('mahasiswa.registration')->with('toast', ['type' => 'success', 'message' => 'Data pendaftaran tersimpan.']);
        }

        $hasRegistration = $request->user()->mahasiswaProfil->residenceRegistrations()->exists();
        if (! $hasRegistration) {
            return redirect()->route('dashboard.redirect')->with('toast', ['type' => 'success', 'message' => 'Profil pendaftaran dilengkapi.']);
        }

        return back()->with('toast', ['type' => 'success', 'message' => 'Profil pendaftaran dilengkapi.']);
    }

    public function policy(PublishResidencePolicyRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request): void {
            Gedung::query()->orderBy('id')->lockForUpdate()->get();
            $version = (int) ResidencePolicy::where('category', $request->validated('category'))->max('version') + 1;
            $settings = $request->validated('settings');
            $service = app(ResidencePolicyService::class);
            $category = $request->validated('category');
            if (! isset($settings['building_ids'])) {
                $settings['building_ids'] = $service->masterCatalog($category)->whereNull('issue')->pluck('id')->all();
            }
            if ($settings['open'] && $settings['building_ids'] === []) {
                throw ValidationException::withMessages(['settings.building_ids' => 'Belum ada gedung dengan konfigurasi siap untuk kategori ini. Lengkapi Gedung & Kamar.']);
            }
            if ($settings['open'] && ! Periode::where('status', 'aktif')->exists()) {
                $year = (int) now()->format('Y');
                $period = Periode::firstOrCreate(
                    ['nama_periode' => $year.'/'.($year + 1)],
                    [
                        'status' => 'aktif',
                        'angkatan_maba' => $year,
                        'tanggal_mulai' => today()->toDateString(),
                        'tanggal_selesai' => today()->addYear()->toDateString(),
                    ],
                );
                if ($period->status !== 'aktif') {
                    $period->update(['status' => 'aktif']);
                }
            }
            $settings['registration_deadline'] = isset($settings['registration_deadline']) && is_string($settings['registration_deadline'])
                ? $service->parseDeadline($settings['registration_deadline'])?->timezone(config('residence.timezone', 'Asia/Jakarta'))->toIso8601String()
                : null;
            $settings['rates'] = $settings['open'] ? $service->snapshotRates($category, $settings['building_ids']) : [];
            $policy = ResidencePolicy::create(['category' => $request->validated('category'), 'version' => $version, 'settings' => $settings, 'published_at' => now(), 'created_by' => $request->user()->id]);
            AuditLogService::log($request->user(), 'residence_policy_published', $policy, null, $policy->toArray());
        });

        return back()->with('toast', ['type' => 'success', 'message' => $request->validated('settings.open') ? 'Pendaftaran kategori dibuka.' : 'Pendaftaran kategori ditutup.']);
    }

    public function uploadTemplate(Request $request): RedirectResponse
    {
        abort_unless(ResidenceWorkflowAccess::manager($request->user()), 403);
        $data = $request->validate([
            'category' => ['required', Rule::in(ResidencePolicyService::CATEGORIES)],
            'kind' => ['required', 'string', 'regex:/^[a-z0-9_]{1,80}$/'],
            'file' => ['required', 'file', 'mimes:doc,docx,pdf,odt,rtf', 'max:5120'],
        ]);

        $file = $request->file('file');
        $existing = ResidenceDocumentTemplate::where('category', $data['category'])->where('kind', $data['kind'])->first();
        if ($existing && Storage::disk('local')->exists($existing->path)) {
            Storage::disk('local')->delete($existing->path);
        }

        $extension = $file->getClientOriginalExtension() ?: 'docx';
        $path = $file->storeAs('templates/residence/'.$data['category'], $data['kind'].'.'.$extension, 'local');

        $template = ResidenceDocumentTemplate::updateOrCreate(
            ['category' => $data['category'], 'kind' => $data['kind']],
            [
                'original_name' => $file->getClientOriginalName(),
                'path' => $path,
                'mime_type' => $file->getMimeType(),
                'uploaded_by' => $request->user()->id,
            ],
        );

        AuditLogService::log($request->user(), 'residence_template_uploaded', $template, null, $template->toArray());

        return back()->with('toast', ['type' => 'success', 'message' => 'Template dokumen '.$data['kind'].' berhasil disimpan.']);
    }

    public function deleteTemplate(Request $request, ResidenceDocumentTemplate $template): RedirectResponse
    {
        abort_unless(ResidenceWorkflowAccess::manager($request->user()), 403);
        if (Storage::disk('local')->exists($template->path)) {
            Storage::disk('local')->delete($template->path);
        }
        AuditLogService::log($request->user(), 'residence_template_deleted', $template, $template->toArray(), null);
        $template->delete();

        return back()->with('toast', ['type' => 'success', 'message' => 'Template dokumen dihapus.']);
    }

    public function downloadTemplate(Request $request, string $category, string $kind): StreamedResponse|RedirectResponse
    {
        abort_unless(
            in_array($category, ResidencePolicyService::CATEGORIES, true)
            && preg_match('/^[a-z0-9_]{1,80}$/', $kind) === 1,
            404,
        );
        abort_unless(
            $request->user()->hasAnyRole(['mahasiswa', 'fasilitator', 'pimpinan'])
            || ResidenceWorkflowAccess::manager($request->user()),
            403,
        );

        $template = ResidenceDocumentTemplate::where('category', $category)->where('kind', $kind)->first();
        if (! $template || Storage::disk('local')->missing($template->path)) {
            return back()->with('toast', ['type' => 'error', 'message' => 'Template belum tersedia, hubungi pengelola.']);
        }

        return Storage::disk('local')->download($template->path, $template->original_name);
    }

    public function upload(Request $request, ResidenceRegistration $registration): RedirectResponse
    {
        abort_unless(ResidenceWorkflowAccess::manager($request->user()) || $registration->studentProfile->user_id === $request->user()->id, 403);
        $data = $request->validate(['kind' => ['required', 'string', 'max:80'], 'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120']]);
        DB::transaction(function () use ($request, $registration, $data): void {
            $r = ResidenceRegistration::whereKey($registration->id)->lockForUpdate()->firstOrFail();
            if (($r->completed_at && ! $r->decisions()->where('status', 'approved')->get()->contains(fn ($d) => ! empty($d->terms['amendment_id']) && ($d->terms['agreement_kind'] ?? null) === $data['kind'])) || $r->keys_returned_at || $r->isClosed() || ! in_array($data['kind'], array_unique([...($r->policy?->settings['documents'] ?? []), ...$r->decisions()->where('status', 'approved')->get()->filter(fn ($decision) => ! ($decision->terms['requires_configuration'] ?? false))->pluck('terms.agreement_kind')->filter()->all(), 'perjanjian']), true)) {
                throw ValidationException::withMessages(['kind' => 'Jenis dokumen tidak berlaku atau pendaftaran sudah selesai.']);
            }
            $document = $r->documents()->create(['kind' => $data['kind'], 'version' => 1 + (int) $r->documents()->where('kind', $data['kind'])->max('version'),
                'path' => $request->file('file')->store('documents/registration', 'local'), 'checksum' => hash_file('sha256', $request->file('file')->getRealPath()), 'uploaded_by' => $request->user()->id, 'status' => 'uploaded']);
            app(ResidenceWorkflow::class)->evaluate($r->fresh());
            AuditLogService::log($request->user(), 'registration_document_uploaded', $document, null, ['kind' => $document->kind, 'version' => $document->version]);
        });

        return back();
    }

    public function submitPackage(Request $request, ResidenceRegistration $registration): RedirectResponse
    {
        abort_unless(ResidenceWorkflowAccess::manager($request->user()) || $registration->studentProfile->user_id === $request->user()->id, 403);

        $data = $request->validate([
            'files' => ['nullable', 'array'],
            'files.*' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
            'decision_kind' => ['nullable', 'in:full,installment,defer,monthly,transfer_permission'],
            'decision_reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $uploadedFiles = $request->file('files', []);
        if ($uploadedFiles === [] && empty($data['decision_kind'])) {
            throw ValidationException::withMessages([
                'package' => 'Pilih minimal satu dokumen atau pilihan pembiayaan untuk disimpan.',
            ]);
        }

        app(ResidenceWorkflow::class)->storeSubmittedPackage(
            $registration,
            $request->user(),
            $uploadedFiles,
            $data['decision_kind'] ?? null,
            $data['decision_reason'] ?? null,
        );

        return back()->with('toast', ['type' => 'success', 'message' => 'Dokumen kelengkapan dan pilihan pembiayaan tersimpan permanen.']);
    }

    public function document(Request $request, RegistrationDocument $document): StreamedResponse
    {
        abort_unless(ResidenceWorkflowAccess::view($request->user(), $document->registration), 403);

        if ($request->boolean('inline')) {
            return Storage::disk('local')->response($document->path);
        }

        return Storage::disk('local')->download($document->path);
    }

    public function cancel(Request $request, ResidenceRegistration $registration): RedirectResponse
    {
        abort_unless($registration->studentProfile->user_id === $request->user()->id, 403);

        DB::transaction(function () use ($request, $registration): void {
            $r = ResidenceRegistration::whereKey($registration->id)->lockForUpdate()->firstOrFail();
            $invoice = $r->tagihan_id ? Tagihan::whereKey($r->tagihan_id)->lockForUpdate()->first() : null;

            if ($r->completed_at || $r->keys_returned_at || $r->isClosed()) {
                throw ValidationException::withMessages(['registration' => 'Pendaftaran yang sudah aktif atau selesai tidak dapat dibatalkan sendiri.']);
            }
            if ($invoice && ((float) $invoice->total_dibayar > 0 || (float) $invoice->sponsor_paid > 0
                || Pembayaran::where('tagihan_id', $invoice->id)->whereIn('status', ['menunggu_verifikasi', 'lunas'])->exists())) {
                throw ValidationException::withMessages(['registration' => 'Pendaftaran dengan pembayaran yang sudah masuk atau menunggu verifikasi tidak dapat dibatalkan.']);
            }
            if ($r->room_contract_id) {
                $contract = RoomContract::whereKey($r->room_contract_id)->lockForUpdate()->first();
                $members = ResidenceRegistration::where('room_contract_id', $r->room_contract_id)->lockForUpdate()->get();
                $otherPaid = $members->where('id', '!=', $r->id)->contains(function (ResidenceRegistration $member): bool {
                    return $member->completed_at !== null
                        || ($member->tagihan && ((float) $member->tagihan->total_dibayar > 0 || (float) $member->tagihan->sponsor_paid > 0
                            || Pembayaran::where('tagihan_id', $member->tagihan->id)->whereIn('status', ['menunggu_verifikasi', 'lunas'])->exists()));
                });
                if ($otherPaid) {
                    throw ValidationException::withMessages(['registration' => 'Kontrak kamar bersama sudah memiliki pembayaran anggota lain. Hubungi pengelola untuk penyesuaian.']);
                }
                if ($contract) {
                    $remainingMembers = $members->where('id', '!=', $r->id)->pluck('id')->values()->all();
                    $contract->update([
                        'members' => $remainingMembers,
                        'occupants' => count($remainingMembers),
                    ]);
                }
            }

            $fromStatus = $r->status;
            $r->update([
                'status' => 'cancelled',
                'allocation_status' => 'released',
                'reserved_room_id' => null,
                'reservation_expires_at' => null,
                'ready_at' => null,
                'room_contract_id' => null,
                'notes' => 'Dibatalkan oleh pendaftar sebelum pembayaran untuk mengganti pilihan kamar/gedung.',
            ]);
            $r->statusHistories()->create([
                'from_status' => $fromStatus,
                'to_status' => 'cancelled',
                'changed_by' => $request->user()->id,
                'notes' => 'Pembatalan mandiri oleh pendaftar sebelum pembayaran.',
            ]);
            $invoice?->update(['status' => TagihanStatus::Batal]);
            RoomInvitation::where('residence_registration_id', $r->id)
                ->where('status', 'pending')
                ->update(['status' => 'cancelled', 'responded_at' => now()]);

            AuditLogService::log($request->user(), 'residence_registration_cancelled_by_student', $r);
        });

        return redirect()->route('mahasiswa.registration')->with('toast', [
            'type' => 'success',
            'message' => 'Pengajuan dibatalkan. Silakan pilih ulang gedung dan kamar sesuai kebutuhan Anda.',
        ]);
    }

    public function reviewDocument(Request $request, RegistrationDocument $document): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', 'in:valid,revision'], 'notes' => ['required_if:status,revision', 'nullable', 'string', 'max:2000']]);
        $this->applyDocumentReviews($document->registration, $request->user(), [[
            'document_id' => $document->id,
            'status' => $data['status'],
            'notes' => $data['notes'] ?? null,
        ]]);

        return back()->with('toast', ['type' => 'success', 'message' => 'Hasil pemeriksaan dokumen tersimpan.']);
    }

    public function reviewDocuments(Request $request, ResidenceRegistration $registration): RedirectResponse
    {
        abort_unless(ResidenceWorkflowAccess::documentReviewer($request->user(), $registration), 403);

        $data = $request->validate([
            'reviews' => ['required', 'array', 'min:1'],
            'reviews.*.document_id' => ['required', 'uuid', 'distinct'],
            'reviews.*.status' => ['required', 'in:valid,revision'],
            'reviews.*.notes' => ['nullable', 'string', 'max:2000'],
        ]);

        foreach ($data['reviews'] as $index => $review) {
            if ($review['status'] === 'revision' && trim((string) ($review['notes'] ?? '')) === '') {
                throw ValidationException::withMessages(["reviews.{$index}.notes" => 'Catatan revisi wajib diisi bila dokumen perlu revisi.']);
            }
        }

        $this->applyDocumentReviews($registration, $request->user(), $data['reviews']);

        return back()->with('toast', ['type' => 'success', 'message' => 'Seluruh hasil pemeriksaan dokumen berhasil disimpan.']);
    }

    /**
     * @param  list<array{document_id: string, status: string, notes?: string|null}>  $reviews
     */
    private function applyDocumentReviews(ResidenceRegistration $registration, User $reviewer, array $reviews): void
    {
        abort_unless(ResidenceWorkflowAccess::documentReviewer($reviewer, $registration), 403);

        DB::transaction(function () use ($registration, $reviewer, $reviews): void {
            $r = ResidenceRegistration::whereKey($registration->id)->lockForUpdate()->firstOrFail();
            $revisionNotes = [];
            $changed = false;

            foreach ($reviews as $entry) {
                $document = RegistrationDocument::where('residence_registration_id', $r->id)
                    ->whereKey($entry['document_id'])
                    ->lockForUpdate()
                    ->first();

                if (! $document) {
                    throw ValidationException::withMessages(['document' => 'Dokumen tidak ditemukan pada pendaftaran ini.']);
                }

                $amendmentAllowed = $r->decisions()->where('status', 'approved')->get()
                    ->contains(fn ($d) => ! empty($d->terms['amendment_id']) && ($d->terms['agreement_kind'] ?? null) === $document->kind);

                if (($r->completed_at && ! $amendmentAllowed)
                    || $r->keys_returned_at
                    || $r->isClosed()
                    || $document->version !== $r->documents()->where('kind', $document->kind)->max('version')) {
                    throw ValidationException::withMessages(['document' => 'Hanya versi dokumen terbaru pada pendaftaran berjalan yang dapat diperiksa.']);
                }

                $notes = isset($entry['notes']) && trim((string) $entry['notes']) !== ''
                    ? trim((string) $entry['notes'])
                    : null;

                if ($document->status === $entry['status'] && $document->notes === $notes) {
                    continue;
                }

                $old = $document->toArray();
                $document->update([
                    'status' => $entry['status'],
                    'notes' => $notes,
                    'reviewed_by' => $reviewer->id,
                    'reviewed_at' => now(),
                ]);
                AuditLogService::log($reviewer, 'registration_document_reviewed', $document, $old, $document->toArray());
                $changed = true;

                if ($entry['status'] === 'revision') {
                    $revisionNotes[] = $document->kind.': '.($notes ?? 'Perlu perbaikan.');
                }
            }

            if (! $changed) {
                return;
            }

            $workflow = app(ResidenceWorkflow::class);
            $fresh = $r->fresh();
            if ($revisionNotes !== []) {
                $workflow->notify($fresh, 'Dokumen perlu revisi', implode(' | ', $revisionNotes));
            } elseif ($workflow->documentsApproved($fresh)) {
                $workflow->notify($fresh, 'Berkas diverifikasi valid', 'Seluruh berkas pendaftaran Anda telah diverifikasi valid oleh fasilitator gedung dan siap untuk serah kunci.');
            }
            $workflow->evaluate($fresh);
        });
    }

    public function requestDecision(Request $request, ResidenceRegistration $registration): RedirectResponse
    {
        $isManager = ResidenceWorkflowAccess::manager($request->user());
        abort_unless($isManager || $registration->studentProfile->user_id === $request->user()->id, 403);
        $data = $request->validate([
            'kind' => ['required', 'in:installment,defer,monthly,transfer_permission,scholarship_receivable,period_scheme'],
            'reason' => ['required_without:approval_basis', 'nullable', 'string', 'max:2000'],
            'approval_basis' => ['nullable', 'string', 'max:2000'],
        ]);
        if (in_array($data['kind'], ['installment', 'defer', 'scholarship_receivable', 'period_scheme'], true) && ! $isManager) {
            abort(403, 'Pengajuan cicilan atau penundaan pembayaran dilakukan langsung kepada Pimpinan dan dicatat oleh Pengelola setelah disetujui.');
        }
        $reason = trim((string) ($data['reason'] ?? $data['approval_basis'] ?? ''));
        if ($reason === '') {
            throw ValidationException::withMessages(['reason' => 'Alasan atau dasar persetujuan wajib diisi.']);
        }
        $decision = DB::transaction(function () use ($request, $registration, $data, $reason, $isManager): ResidenceDecision {
            $r = ResidenceRegistration::whereKey($registration->id)->lockForUpdate()->firstOrFail();
            if ($r->completed_at || ! $r->tagihan_id || $r->isClosed()) {
                throw ValidationException::withMessages(['decision' => 'Keputusan membutuhkan pendaftaran berjalan dan tagihan.']);
            }
            if ($data['kind'] === 'monthly' && $r->rate_unit !== 'month' && ! $isManager) {
                throw ValidationException::withMessages(['kind' => 'Pendaftaran ini bukan skema bulanan.']);
            }
            if ($data['kind'] === 'transfer_permission' && $r->stay_kind !== 'non_student') {
                throw ValidationException::withMessages(['kind' => 'Izin berbasis bukti transfer hanya untuk umum.']);
            }
            $existing = $r->decisions()->where('kind', $data['kind'])->where('status', 'pending')->first();
            if ($existing && $isManager && ($request->input('status') === 'approved' || $request->boolean('offline_approval'))) {
                return $existing;
            }
            if ($isManager && ($request->boolean('offline_approval') || $request->input('status') === 'approved')) {
                $r->decisions()->whereIn('status', ['pending', 'approved'])->update(['status' => 'superseded']);
            } elseif ($r->decisions()->where('kind', $data['kind'])->whereIn('status', ['pending', 'approved'])->exists()) {
                throw ValidationException::withMessages(['decision' => 'Keputusan yang sama sudah diajukan atau disetujui.']);
            }
            $decision = $r->decisions()->create(['kind' => $data['kind'], 'reason' => $reason, 'requested_by' => $request->user()->id, 'status' => 'pending']);
            AuditLogService::log($request->user(), 'residence_decision_requested', $decision, null, ['kind' => $data['kind'], 'reason' => $reason]);

            return $decision;
        });

        if ($isManager && ($request->input('status') === 'approved' || $request->boolean('offline_approval') || $request->filled('approval_basis') || $request->has('schedule') || $request->filled('monthly_amount') || $request->filled('remaining_due_date') || $request->filled('period_amount') || $data['kind'] === 'scholarship_receivable')) {
            $request->merge([
                'status' => $request->input('status') ?: 'approved',
                'offline_approval' => true,
                'notes' => $request->input('notes') ?: $reason,
            ]);

            return $this->decide($request, $decision);
        }

        return back();
    }

    public function decide(Request $request, ResidenceDecision $decision): RedirectResponse
    {
        $configuring = $decision->status === 'approved' && ($decision->terms['requires_configuration'] ?? false);
        $offlineApproval = ResidenceWorkflowAccess::manager($request->user())
            && ($request->boolean('offline_approval') || $request->filled('approval_basis'));
        $leader = ! $configuring && ! $offlineApproval && in_array($decision->kind, ['installment', 'defer'], true);
        if ($configuring && $request->input('status') !== 'approved') {
            abort(422);
        }
        abort_unless($leader ? $request->user()->hasRole('pimpinan') : ResidenceWorkflowAccess::manager($request->user()), 403);
        if ($leader) {
            $data = $request->validate(['status' => ['required', 'in:approved,rejected'], 'notes' => ['required', 'string', 'max:2000']]);
            DB::transaction(function () use ($request, $decision, $data): void {
                $r = ResidenceRegistration::whereKey($decision->residence_registration_id)->lockForUpdate()->firstOrFail();
                $decision = ResidenceDecision::whereKey($decision->id)->lockForUpdate()->firstOrFail();
                if (($r->completed_at && empty($decision->terms['amendment_id'])) || $r->keys_returned_at || $r->isClosed() || $decision->status !== 'pending') {
                    throw ValidationException::withMessages(['decision' => 'Keputusan sudah final.']);
                }
                $decision->update(['status' => $data['status'], 'decided_by' => $request->user()->id, 'decided_at' => now(), 'terms' => [...($decision->terms ?? []), 'requires_configuration' => true, 'agreement_kind' => 'pembiayaan_'.$decision->id, 'notes' => $data['notes']]]);
                AuditLogService::log($request->user(), 'financing_conditional_decision', $decision);
                app(ResidenceWorkflow::class)->evaluate($r->fresh());
                app(ResidenceWorkflow::class)->notify($r, 'Keputusan pembiayaan', 'Keputusan pimpinan: '.$data['status'].'. Lengkapi skema dan perjanjian sebelum check-in.');
            });

            return back();
        }
        $data = $request->validate([
            'status' => ['required', 'in:approved,rejected'],
            'notes' => ['required_without:approval_basis', 'nullable', 'string', 'max:2000'],
            'approval_basis' => ['nullable', 'string', 'max:2000'],
            'initial_amount' => ['nullable', 'numeric', 'decimal:0,2', 'min:0'],
            'remaining_due_date' => ['nullable', 'date', 'after_or_equal:today'],
            'monthly_amount' => ['nullable', 'numeric', 'decimal:0,2', 'min:1'],
            'months_count' => ['nullable', 'integer', 'min:1', 'max:36'],
            'period_unit' => ['nullable', 'in:month,semester,year'],
            'period_amount' => ['nullable', 'numeric', 'decimal:0,2', 'min:1'],
            'sponsor_name' => ['nullable', 'string', 'max:255'],
            'schedule' => ['nullable', 'array'],
            'schedule.*.jatuh_tempo' => ['required', 'date', 'after_or_equal:today'],
            'schedule.*.jumlah' => ['required', 'numeric', 'decimal:0,2', 'min:1'],
        ]);
        $notes = trim((string) ($data['approval_basis'] ?? $data['notes'] ?? ''));
        if ($notes === '') {
            throw ValidationException::withMessages(['notes' => 'Catatan atau dasar persetujuan wajib diisi.']);
        }
        DB::transaction(function () use ($request, $decision, $data, $notes, $configuring, $offlineApproval): void {
            $r = ResidenceRegistration::whereKey($decision->residence_registration_id)->lockForUpdate()->firstOrFail();
            $decision = ResidenceDecision::whereKey($decision->id)->lockForUpdate()->firstOrFail();
            if (($configuring && ! ($decision->status === 'approved' && ($decision->terms['requires_configuration'] ?? false))) || (! $configuring && $decision->status !== 'pending')) {
                throw ValidationException::withMessages(['decision' => 'Keputusan sudah final.']);
            }
            if (($r->completed_at && empty($decision->terms['amendment_id'])) || $r->keys_returned_at || $r->isClosed()) {
                throw ValidationException::withMessages(['decision' => 'Pendaftaran sudah selesai atau dibatalkan.']);
            }
            $invoice = $r->tagihan()->lockForUpdate()->firstOrFail();
            $schedule = $data['schedule'] ?? [];
            if (! is_array($schedule)) {
                throw ValidationException::withMessages(['schedule' => 'Jadwal termin tidak valid.']);
            }
            if ($data['status'] === 'approved' && $decision->kind === 'scholarship_receivable') {
                $sponsorName = trim((string) ($data['sponsor_name'] ?? '')) ?: 'Beasiswa / Rektorat UNAND';
                $r->update([
                    'funding' => 'sponsor',
                    'sponsor_name' => $sponsorName,
                    'sponsor_approved_at' => now(),
                ]);
                $invoice->jadwalCicilan()->delete();
                $invoice->update([
                    'sponsor_total' => $invoice->subtotal,
                    'total_penyesuaian' => -(float) $invoice->subtotal,
                    'total' => 0,
                    'amount_due_now' => 0,
                    'sponsor_name' => $sponsorName,
                ]);
                $r->decisions()->where('id', '!=', $decision->id)->where('status', 'approved')->update(['status' => 'superseded']);
            } elseif ($data['status'] === 'approved' && $decision->kind === 'period_scheme') {
                $periodUnit = (string) ($data['period_unit'] ?? 'month');
                $periodAmount = (float) ($data['period_amount'] ?? 0);
                if ($periodAmount <= 0) {
                    throw ValidationException::withMessages(['period_amount' => 'Masukkan harga per periode pembayaran.']);
                }
                $periodCount = max(1, (int) ($data['months_count'] ?? 1));
                $periodTotal = $periodAmount * $periodCount;
                $unitLabel = match ($periodUnit) {
                    'semester' => 'Per 6 Bulan (Semester)',
                    'year' => 'Per Tahun',
                    default => 'Per Bulan',
                };
                $r->update(['rate_unit' => $periodUnit, 'funding' => 'personal']);
                $roomLabel = $r->reservedRoom
                    ? 'Hunian '.$r->reservedRoom->lantai->gedung->nama_gedung.' / '.$r->reservedRoom->nomor_kamar." ({$unitLabel})"
                    : "Hunian Asrama ({$unitLabel})";
                $invoice->items()->delete();
                $invoice->items()->create([
                    'deskripsi' => $roomLabel,
                    'kuantitas' => $periodCount,
                    'harga_satuan' => $periodAmount,
                    'jumlah' => $periodTotal,
                ]);
                $invoice->jadwalCicilan()->delete();
                $schedule = [];
                $monthsStep = $periodUnit === 'semester' ? 6 : ($periodUnit === 'year' ? 12 : 1);
                for ($i = 0; $i < $periodCount; $i++) {
                    $term = [
                        'jatuh_tempo' => today()->addMonths($i * $monthsStep)->toDateString(),
                        'jumlah' => $periodAmount,
                    ];
                    $schedule[] = $term;
                    $invoice->jadwalCicilan()->create([...$term, 'termin_ke' => $i + 1]);
                }
                $data['initial_amount'] = $periodAmount;
                $invoice->update([
                    'subtotal' => $periodTotal,
                    'total' => max(0, $periodTotal - (float) $invoice->sponsor_total),
                    'amount_due_now' => $periodAmount,
                ]);
                $r->decisions()->where('id', '!=', $decision->id)->where('status', 'approved')->update(['status' => 'superseded']);
            } elseif ($data['status'] === 'approved' && $decision->kind !== 'transfer_permission') {
                if ($decision->kind === 'monthly' && $offlineApproval && ! empty($data['monthly_amount'])) {
                    $monthlyAmount = (float) $data['monthly_amount'];
                    $monthsCount = max(1, (int) ($data['months_count'] ?? 1));
                    $newTotal = $monthlyAmount * $monthsCount;
                    $r->update(['rate_unit' => 'month']);
                    $roomLabel = $r->reservedRoom
                        ? 'Hunian '.$r->reservedRoom->lantai->gedung->nama_gedung.' / '.$r->reservedRoom->nomor_kamar.' (Skema Bulanan)'
                        : 'Hunian Asrama (Skema Bulanan)';
                    $invoice->items()->delete();
                    $invoice->items()->create([
                        'deskripsi' => $roomLabel,
                        'kuantitas' => $monthsCount,
                        'harga_satuan' => $monthlyAmount,
                        'jumlah' => $newTotal,
                    ]);
                    $invoice->update([
                        'subtotal' => $newTotal,
                        'total' => max(0, $newTotal - (float) $invoice->sponsor_total),
                    ]);
                    if ($schedule === []) {
                        for ($i = 0; $i < $monthsCount; $i++) {
                            $schedule[] = [
                                'jatuh_tempo' => today()->addMonths($i)->toDateString(),
                                'jumlah' => $monthlyAmount,
                            ];
                        }
                    }
                    $data['initial_amount'] = $monthlyAmount;
                } elseif ($decision->kind === 'monthly' && ! $offlineApproval && ($r->rate_unit !== 'month' || (int) $r->studentProfile->angkatan === (int) $r->periode->angkatan_maba || ! ($r->policy->settings['monthly_allowed'] ?? false))) {
                    throw ValidationException::withMessages(['decision' => 'Pendaftar tidak berhak menggunakan skema bulanan.']);
                }

                $targetBalance = max(0, (float) $invoice->total - (! empty($decision->terms['amendment_id']) ? (float) $invoice->total_dibayar : 0));
                if ($schedule === [] && ! empty($data['remaining_due_date'])) {
                    $initial = (float) ($data['initial_amount'] ?? 0);
                    $remaining = max(0, $targetBalance - $initial);
                    if ($decision->kind === 'defer' || $initial <= 0) {
                        $data['initial_amount'] = 0;
                        $schedule = [
                            ['jatuh_tempo' => (string) $data['remaining_due_date'], 'jumlah' => $targetBalance],
                        ];
                    } elseif ($remaining > 0) {
                        $schedule = [
                            ['jatuh_tempo' => today()->toDateString(), 'jumlah' => $initial],
                            ['jatuh_tempo' => (string) $data['remaining_due_date'], 'jumlah' => $remaining],
                        ];
                    } else {
                        $schedule = [
                            ['jatuh_tempo' => today()->toDateString(), 'jumlah' => $initial],
                        ];
                    }
                }

                if (! isset($data['initial_amount'])) {
                    throw ValidationException::withMessages(['initial_amount' => 'Pembayaran awal wajib diisi.']);
                }

                $sum = collect($schedule)->sum(fn ($term) => (int) round((float) $term['jumlah'] * 100));
                if ($schedule === [] || $sum !== (int) round($targetBalance * 100) || (float) $data['initial_amount'] > $targetBalance) {
                    throw ValidationException::withMessages(['schedule' => 'Jumlah seluruh termin harus sama dengan tagihan dan uang awal tidak boleh melebihi total.']);
                }
                $hasApprovedDefer = $r->decisions()->where('kind', 'defer')->where('status', 'approved')->where('id', '!=', $decision->id)->exists();
                if ($decision->kind !== 'defer' && ! ($decision->kind === 'monthly' && $hasApprovedDefer) && (float) $data['initial_amount'] !== (float) $schedule[0]['jumlah']) {
                    throw ValidationException::withMessages(['initial_amount' => 'Pembayaran awal harus sama dengan termin pertama.']);
                }
                if ($decision->kind === 'monthly' && ! $hasApprovedDefer && (float) $data['initial_amount'] <= 0) {
                    throw ValidationException::withMessages(['initial_amount' => 'Bulanan wajib membayar bulan awal. Ajukan penundaan kepada pimpinan bila tanpa uang awal.']);
                }
                $conflictingKinds = match ($decision->kind) {
                    'monthly' => ['monthly', 'installment'],
                    'defer' => ['installment', 'defer'],
                    default => ['monthly', 'installment', 'defer'],
                };
                if (! $offlineApproval && $r->decisions()->whereIn('kind', $conflictingKinds)->where('status', 'approved')->where('id', '!=', $decision->id)->exists()) {
                    throw ValidationException::withMessages(['decision' => 'Skema pembiayaan sudah disetujui.']);
                }
                if (empty($decision->terms['amendment_id']) && (float) $invoice->total_dibayar > 0 && $invoice->jadwalCicilan()->exists()) {
                    throw ValidationException::withMessages(['schedule' => 'Termin sudah menerima pembayaran; lakukan koreksi keuangan sebelum mengganti skema.']);
                }
                $lastTerm = 0;
                if (! empty($decision->terms['amendment_id'])) {
                    $lastTerm = (int) $invoice->jadwalCicilan()->max('termin_ke');
                } else {
                    $invoice->jadwalCicilan()->delete();
                }
                foreach ($schedule as $i => $term) {
                    $invoice->jadwalCicilan()->create([...$term, 'termin_ke' => $lastTerm + $i + 1]);
                }
                $invoice->update([
                    'amount_due_now' => $data['initial_amount'],
                    'jatuh_tempo' => $decision->kind === 'defer' && isset($schedule[0]['jatuh_tempo']) ? $schedule[0]['jatuh_tempo'] : $invoice->jatuh_tempo,
                ]);
                $r->decisions()->where('kind', 'full')->where('status', 'approved')->where('id', '!=', $decision->id)->update(['status' => 'superseded']);
            }
            if ($data['status'] === 'approved' && $decision->kind === 'transfer_permission' && ! Pembayaran::where('tagihan_id', $invoice->id)->where('status', 'menunggu_verifikasi')->whereNotNull('bukti_transfer_path')->where('nominal', '>=', (float) $invoice->total - (float) $invoice->total_dibayar)->exists()) {
                throw ValidationException::withMessages(['decision' => 'Bukti transfer belum tersedia.']);
            }
            $decision->update([
                'status' => $data['status'],
                'decided_by' => $configuring ? $decision->decided_by : $request->user()->id,
                'decided_at' => $configuring ? $decision->decided_at : now(),
                'terms' => [
                    ...($decision->terms ?? []),
                    'requires_configuration' => false,
                    'configured_by' => $request->user()->id,
                    'offline_approval' => $offlineApproval,
                    'approval_basis' => $notes,
                    'agreement_kind' => $decision->terms['agreement_kind'] ?? (! $offlineApproval && ! empty($decision->terms['amendment_id']) ? 'pembiayaan_'.$decision->id : null),
                    'initial_amount' => isset($data['initial_amount']) ? (float) $data['initial_amount'] + (! empty($decision->terms['amendment_id']) ? (float) $invoice->total_dibayar : 0) : null,
                    'schedule' => $schedule,
                    'notes' => $notes,
                ],
            ]);
            AuditLogService::log($request->user(), 'residence_decision_'.$data['status'], $decision, null, $decision->toArray());
            app(ResidenceWorkflow::class)->notify($r, 'Keputusan pembiayaan', $decision->kind.' '.$data['status'].': '.$notes);
            app(ResidenceWorkflow::class)->evaluate($r->fresh());
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Keputusan pembiayaan tersimpan.']);
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

        return back()->with('toast', ['type' => 'success', 'message' => 'Permohonan pemeriksaan kamar dikirim ke GO.']);
    }

    public function returnKeys(Request $request, ResidenceRegistration $registration, ReturnResidenceKeys $return): RedirectResponse
    {
        $data = $request->validate(['keys_received' => ['accepted'], 'room_vacated' => ['accepted'], 'condition' => ['required', 'in:ready,damaged'], 'notes' => ['required', 'string', 'max:2000']]);
        $return->handle($registration, $request->user(), $data['condition'], $data['notes']);

        return back()->with('toast', ['type' => 'success', 'message' => 'Pengembalian kunci tercatat.']);
    }

    public function allocate(Request $request, ResidenceRegistration $registration, AllocateResidenceRoom $allocate): RedirectResponse
    {
        abort_unless(ResidenceWorkflowAccess::manager($request->user()) && $registration->is_kipk && $registration->workflow_version === 2, 403);
        $allocate->handle($registration);

        return back()->with('toast', ['type' => 'success', 'message' => 'Pemeriksaan antrean alokasi KIP-K dijalankan.']);
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

        return back()->with('toast', ['type' => 'success', 'message' => 'Pencairan KIP-K tercatat.']);
    }

    public function contract(Request $request): RedirectResponse
    {
        abort_unless(ResidenceWorkflowAccess::manager($request->user()), 403);
        $data = $request->validate(['registration_ids' => ['required', 'array', 'min:1'], 'registration_ids.*' => ['required', 'uuid', 'distinct', 'exists:residence_registrations,id']]);
        DB::transaction(function () use ($request, $data): void {
            $members = ResidenceRegistration::whereIn('id', $data['registration_ids'])->orderBy('id')->lockForUpdate()->get();
            $first = $members->first();
            $room = Kamar::whereKey($first->reserved_room_id)->lockForUpdate()->firstOrFail();
            $existingContractIds = $members->pluck('room_contract_id')->filter()->unique()->values();
            foreach ($members as $r) {
                if ($r->workflow_version !== 2 || $r->is_kipk || $r->billing_basis !== 'room' || $r->reserved_room_id !== $room->id || $r->completed_at || ($r->room_contract_id && ! $existingContractIds->contains($r->room_contract_id)) || $r->isClosed() || $r->residence_policy_id !== $first->residence_policy_id || ! $r->starts_at->equalTo($first->starts_at) || ! $r->ends_at->equalTo($first->ends_at)) {
                    throw ValidationException::withMessages(['contract' => 'Anggota harus memiliki alokasi kamar, periode, dan kebijakan yang sama serta belum ditagih.']);
                }
            }
            $allocated = ResidenceRegistration::where('reserved_room_id', $room->id)->whereNull('completed_at')->whereNotIn('status', ['draft', 'rejected', 'cancelled'])->pluck('id')->sort()->values()->all();
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
            $contract = $existingContractIds->isNotEmpty()
                ? RoomContract::whereKey($existingContractIds->first())->lockForUpdate()->first()
                : null;
            if ($contract) {
                if ($existingContractIds->count() > 1) {
                    ResidenceRegistration::whereIn('room_contract_id', $existingContractIds->slice(1))->update(['room_contract_id' => $contract->id]);
                    RoomContract::whereIn('id', $existingContractIds->slice(1))->delete();
                }
                $contract->update([
                    'occupants' => $members->count(),
                    'total' => $rate['room_amount'],
                    'members' => $members->modelKeys(),
                    'approved_by' => $request->user()->id,
                    'approved_at' => now(),
                ]);
            } else {
                $contract = RoomContract::create([
                    'kamar_id' => $room->id,
                    'occupants' => $members->count(),
                    'total' => $rate['room_amount'],
                    'members' => $members->modelKeys(),
                    'approved_by' => $request->user()->id,
                    'approved_at' => now(),
                ]);
            }
            $totalRupiah = (int) round((float) $contract->total);
            $count = $members->count();
            foreach ($members->values() as $index => $r) {
                $r->update(['room_contract_id' => $contract->id]);
                if (! $r->tagihan_id) {
                    app(CreateResidenceBilling::class)->handle($r->fresh());
                } else {
                    $shareRupiah = intdiv($totalRupiah, $count) + ($index < $totalRupiah % $count ? 1 : 0);
                    $r->tagihan->items()->update([
                        'kuantitas' => 1,
                        'harga_satuan' => $shareRupiah,
                        'jumlah' => $shareRupiah,
                    ]);
                    $r->tagihan->update([
                        'subtotal' => $shareRupiah,
                        'total' => max(0, $shareRupiah - (float) $r->tagihan->sponsor_total),
                    ]);
                }
                app(ResidenceWorkflow::class)->evaluate($r->fresh());
            }
            AuditLogService::log($request->user(), 'room_contract_approved', $contract, null, $contract->toArray());
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Kontrak kamar bersama disahkan dan tagihan diterbitkan.']);
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
        $data = $request->validate([
            'reference' => ['required', 'string', 'max:150', 'unique:residence_payment_references,reference'],
            'source' => ['required', 'string', 'max:100'],
            'paid_at' => ['required', 'date', 'before_or_equal:today'],
            'evidence' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,csv,txt,xlsx,xls', 'max:10240'],
        ]);
        $reference = ResidencePaymentReference::create([
            'reference' => trim($data['reference']),
            'source' => $data['source'],
            'paid_at' => $data['paid_at'],
            'amount' => 0,
            'payer_type' => 'statement',
            'evidence_path' => $request->file('evidence')->store('documents/dpub', 'local'),
            'recorded_by' => $request->user()->id,
            'status' => 'uploaded',
        ]);
        AuditLogService::log($request->user(), 'dpub_statement_uploaded', $reference, null, ['reference' => $reference->reference, 'source' => $reference->source]);

        return back()->with('toast', ['type' => 'success', 'message' => 'Rekening koran DPUB diunggah untuk referensi pencocokan manual admin.']);
    }

    public function paymentEvidence(Request $request, ResidencePaymentReference $reference): StreamedResponse
    {
        abort_unless($request->user()->can('pembayaran.verify'), 403);
        abort_unless(Storage::disk('local')->exists($reference->evidence_path), 404);

        if ($request->boolean('inline')) {
            return Storage::disk('local')->response($reference->evidence_path);
        }

        return Storage::disk('local')->download($reference->evidence_path);
    }

    public function destroyPaymentEvidence(Request $request, ResidencePaymentReference $reference): RedirectResponse
    {
        abort_unless($request->user()->can('pembayaran.verify'), 403);
        if ($reference->evidence_path && Storage::disk('local')->exists($reference->evidence_path)) {
            Storage::disk('local')->delete($reference->evidence_path);
        }
        AuditLogService::log($request->user(), 'dpub_statement_deleted', $reference, $reference->toArray());
        $reference->delete();

        return back()->with('toast', ['type' => 'success', 'message' => 'Arsip rekening koran DPUB dihapus.']);
    }

    public function transferProof(Request $request, ResidenceRegistration $registration): RedirectResponse
    {
        abort_unless(ResidenceWorkflowAccess::officer($request->user(), $registration) && $registration->stay_kind === 'non_student', 403);
        $data = $request->validate(['nominal' => ['required', 'numeric', 'decimal:0,2', 'min:1'], 'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120']]);
        DB::transaction(function () use ($request, $registration, $data): void {
            $r = ResidenceRegistration::whereKey($registration->id)->lockForUpdate()->firstOrFail();
            $invoice = $r->tagihan()->lockForUpdate()->firstOrFail();
            if ($r->isClosed() || (float) $data['nominal'] > (float) $invoice->total - (float) $invoice->total_dibayar || Pembayaran::where('tagihan_id', $invoice->id)->where('status', 'menunggu_verifikasi')->exists()) {
                throw ValidationException::withMessages(['nominal' => 'Periksa sisa tagihan dan bukti yang masih menunggu rekonsiliasi.']);
            }
            $proof = Pembayaran::create(['kode_transaksi' => 'PUB-'.Str::uuid(), 'mahasiswa_id' => $r->student_profile_id,
                'tagihan_id' => $invoice->id, 'jenis_pembayaran' => 'sewa_asrama', 'nominal' => $data['nominal'], 'termin_ke' => 1,
                'metode_pembayaran' => 'transfer_bank', 'bukti_transfer_path' => $request->file('file')->store('bukti-pembayaran', 'local'), 'status' => 'menunggu_verifikasi']);
            AuditLogService::log($request->user(), 'public_transfer_proof_recorded', $proof);
            app(ResidenceWorkflow::class)->evaluate($r->fresh());
        });

        return back();
    }

    public function completeRefund(Request $request, ResidenceCashRefund $refund): RedirectResponse
    {
        abort_unless(ResidenceWorkflowAccess::manager($request->user()) || $request->user()->can('pembayaran.verify'), 403);
        $data = $request->validate([
            'recipient_name' => ['required', 'string', 'max:255'],
            'returned_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);
        DB::transaction(function () use ($request, $refund, $data): void {
            $locked = ResidenceCashRefund::whereKey($refund->id)->lockForUpdate()->firstOrFail();
            if ($locked->status === 'returned') {
                return;
            }
            $old = $locked->toArray();
            $locked->update([
                'status' => 'returned',
                'recipient_name' => $data['recipient_name'],
                'returned_at' => isset($data['returned_at']) ? $data['returned_at'] : now(),
                'returned_by' => $request->user()->id,
                'notes' => $data['notes'] ?? $locked->notes,
            ]);
            AuditLogService::log($request->user(), 'residence_cash_refund_completed', $locked, $old, $locked->toArray());
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Pengembalian dana tunai (refund) telah dicatat.']);
    }
}
