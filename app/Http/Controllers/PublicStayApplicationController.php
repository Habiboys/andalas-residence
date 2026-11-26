<?php

namespace App\Http\Controllers;

use App\Actions\Registration\AllocateResidenceRoom;
use App\Actions\Registration\CreateTemporaryStay;
use App\Enums\TagihanStatus;
use App\Models\Kamar;
use App\Models\MahasiswaProfil;
use App\Models\PaymentBankAccount;
use App\Models\Pembayaran;
use App\Models\Periode;
use App\Models\ResidenceApplication;
use App\Models\ResidencePolicy;
use App\Models\ResidenceRegistration;
use App\Models\Tagihan;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\LandingContentService;
use App\Services\ResidencePolicyService;
use App\Services\ResidenceWorkflow;
use App\Services\RoomEligibility;
use App\Services\RoomReservations;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class PublicStayApplicationController extends Controller
{
    /**
     * Build public available rooms & active tariff payload for Umum ('non_student')
     * and Summer Course ('summer_course') booking directly from the Home page.
     *
     * @return array<string, array{
     *     open: bool,
     *     month_days: int,
     *     day_basis: string,
     *     rooms: list<array<string, mixed>>
     * }>
     */
    public static function availableCatalog(): array
    {
        $policyService = app(ResidencePolicyService::class);
        $reservations = app(RoomReservations::class);
        $holds = $reservations->held()->get(['reserved_room_id', 'billing_basis'])->groupBy('reserved_room_id');
        $result = [];

        foreach (['non_student', 'summer_course'] as $category) {
            $policy = ResidencePolicy::where('category', $category)
                ->whereNotNull('published_at')
                ->latest('version')
                ->first();

            $deadline = $policy ? $policyService->registrationDeadline($policy) : null;
            $isOpen = $policy !== null && (bool) ($policy->settings['open'] ?? false) && ! ($deadline?->isPast() ?? false);

            if (! $isOpen) {
                $result[$category] = [
                    'open' => false,
                    'month_days' => 30,
                    'day_basis' => 'nights',
                    'rooms' => [],
                ];

                continue;
            }

            $buildingIds = $policy->settings['building_ids'] ?? [];
            $policyRates = collect($policy->settings['rates'] ?? []);

            $rooms = Kamar::with([
                'lantai.gedung',
                'penempatanKamar' => fn ($q) => $q->where('status', 'aktif')->with('registration:id,billing_basis'),
            ])
                ->where('status', '!=', 'maintenance')
                ->whereHas('lantai', fn ($q) => $q->whereIn('gedung_id', $buildingIds)->where('booking_open', true))
                ->get()
                ->filter(function (Kamar $room) use ($category, $policyRates, $holds): bool {
                    $building = $room->lantai->gedung;
                    if (! RoomEligibility::allowsCanonicalBuilding($category, $building)
                        || ! RoomEligibility::allowsType($building, $room->tipe_kamar, $room->kapasitas)) {
                        return false;
                    }

                    $roomHolds = $holds->get($room->id);
                    if ($roomHolds?->contains('billing_basis', 'room')
                        || $room->penempatanKamar->contains(fn ($p) => $p->registration?->billing_basis === 'room')) {
                        return false;
                    }

                    $available = max(0, (int) $room->kapasitas - $room->penempatanKamar->count() - ($roomHolds?->count() ?? 0));
                    if ($available <= 0) {
                        return false;
                    }

                    return $policyRates->contains(fn (array $r): bool => $r['gedung_id'] === $building->id && $r['type'] === $room->tipe_kamar && (float) $r['amount'] > 0);
                })
                ->sortBy(fn (Kamar $room): array => [
                    $room->lantai->gedung->kode_gedung,
                    $room->lantai->nomor_lantai,
                    $room->nomor_kamar,
                ])
                ->map(function (Kamar $room) use ($policyRates, $holds): array {
                    $building = $room->lantai->gedung;
                    $roomHolds = $holds->get($room->id);
                    $available = max(0, (int) $room->kapasitas - $room->penempatanKamar->count() - ($roomHolds?->count() ?? 0));
                    $unitRates = $policyRates
                        ->filter(fn (array $r): bool => $r['gedung_id'] === $building->id && $r['type'] === $room->tipe_kamar && (float) $r['amount'] > 0)
                        ->mapWithKeys(fn (array $r): array => [$r['unit'] => (int) round((float) $r['amount'])])
                        ->all();

                    return [
                        'id' => $room->id,
                        'nomor_kamar' => $room->nomor_kamar,
                        'tipe_kamar' => $room->tipe_kamar,
                        'kapasitas' => (int) $room->kapasitas,
                        'available_places' => $available,
                        'building_id' => $building->id,
                        'building_name' => $building->nama_gedung,
                        'building_code' => $building->kode_gedung,
                        'gender' => RoomEligibility::buildingGender($building),
                        'floor_name' => $room->lantai->nama_lantai ?? ('Lantai '.$room->lantai->nomor_lantai),
                        'rates' => $unitRates,
                    ];
                })
                ->values()
                ->all();

            $result[$category] = [
                'open' => true,
                'month_days' => (int) ($policy->settings['month_days'] ?? 30),
                'day_basis' => (string) ($policy->settings['day_basis'] ?? 'nights'),
                'rooms' => array_values($rooms),
            ];
        }

        return $result;
    }

    public function store(Request $request, ResidencePolicyService $policyService, AllocateResidenceRoom $allocate): RedirectResponse
    {
        $data = $request->validate([
            'kind' => ['required', 'in:non_student,summer_course'],
            'nama' => ['required', 'string', 'max:255'],
            'identity_number' => ['required', 'string', 'max:50'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'no_hp' => ['required', 'string', 'max:30'],
            'gender' => ['required', 'in:laki_laki,perempuan'],
            'institution' => ['nullable', 'required_if:kind,summer_course', 'string', 'max:255'],
            'kamar_id' => ['required', 'uuid', 'exists:kamar,id'],
            'rate_unit' => ['required', 'in:day,month,semester,year'],
            'starts_at' => ['required', 'date', 'after_or_equal:today'],
            'ends_at' => ['required', 'date', 'after:starts_at'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ], [
            'institution.required_if' => 'Nama instansi / kampus penyelenggara wajib diisi untuk Summer Course.',
            'ends_at.after' => 'Tanggal keluar harus setelah tanggal masuk.',
        ]);

        $token = DB::transaction(function () use ($data, $policyService, $allocate): string {
            app(RoomReservations::class)->expire();

            $period = Periode::where('status', 'aktif')->lockForUpdate()->first();
            if (! $period) {
                throw ValidationException::withMessages(['periode' => 'Belum ada periode hunian aktif yang dibuka oleh pengelola.']);
            }

            $policy = $policyService->current($data['kind']);
            $identity = trim((string) $data['identity_number']);
            $email = strtolower(trim((string) $data['email']));

            $user = User::where('nim_nip', $identity)->lockForUpdate()->first();
            if ($user) {
                if (! $user->hasAnyRole(['mahasiswa', CreateTemporaryStay::OCCUPANT_ROLE]) || ! $user->mahasiswaProfil || $user->status !== 'aktif') {
                    throw ValidationException::withMessages(['identity_number' => 'Nomor identitas sudah terdaftar pada akun yang tidak dapat dipakai pengajuan umum.']);
                }
                $student = $user->mahasiswaProfil()->lockForUpdate()->firstOrFail();
                if ($student->penempatanKamar()->where('status', 'aktif')->exists()
                    || $student->residenceRegistrations()->whereNull('completed_at')->whereNotIn('status', ['draft', 'rejected', 'cancelled'])->exists()) {
                    throw ValidationException::withMessages(['identity_number' => 'Nomor identitas tersebut masih memiliki reservasi atau hunian aktif yang berjalan.']);
                }
                $user->update([
                    'nama' => trim((string) $data['nama']),
                    'no_hp' => trim((string) $data['no_hp']),
                    'gender' => $data['gender'],
                ]);
            } else {
                $existingEmailUser = User::where('email', $email)->exists();
                $storedEmail = $existingEmailUser
                    ? 'guest-'.Str::uuid().'@guest.invalid'
                    : $email;

                Role::firstOrCreate(['name' => CreateTemporaryStay::OCCUPANT_ROLE, 'guard_name' => 'web']);
                $user = User::create([
                    'nama' => trim((string) $data['nama']),
                    'nim_nip' => $identity,
                    'email' => $storedEmail,
                    'no_hp' => trim((string) $data['no_hp']),
                    'password' => Str::password(32),
                    'gender' => $data['gender'],
                    'status' => 'aktif',
                    'client_profile_category' => 'non_student',
                ]);
                $user->assignRole(CreateTemporaryStay::OCCUPANT_ROLE);
                $student = MahasiswaProfil::create([
                    'user_id' => $user->id,
                    'barcode_code' => 'BC-'.Str::uuid(),
                    'email_pribadi' => $email,
                    'status_huni' => 'calon',
                ]);
            }

            $bookingToken = Str::random(40);
            $application = ResidenceApplication::create([
                'number' => 'PUB-'.now()->format('Ymd').'-'.strtoupper(Str::random(5)),
                'kind' => $data['kind'],
                'institution' => filled($data['institution'] ?? null) ? trim((string) $data['institution']) : 'Perorangan / Umum',
                'recipient_email' => $email,
                'applicant_phone' => trim((string) $data['no_hp']),
                'booking_token' => $bookingToken,
                'letter_path' => '',
                'starts_at' => $data['starts_at'],
                'ends_at' => $data['ends_at'],
                'funding' => 'personal',
                'approved_at' => now(),
                'approved_by' => null,
                'created_by' => $user->id,
            ]);

            $tz = config('residence.timezone', 'Asia/Jakarta');
            $appTz = config('app.timezone', 'UTC');
            $startsAt = Carbon::parse($data['starts_at'], $tz)->startOfDay();
            $hMinusOne = $startsAt->copy()->subDay()->endOfDay()->timezone($appTz);
            $expiresAt = $hMinusOne->isFuture() ? $hMinusOne : now()->addHours(24);

            $registration = ResidenceRegistration::create([
                'workflow_version' => 2,
                'residence_policy_id' => $policy->id,
                'residence_application_id' => $application->id,
                'student_profile_id' => $student->id,
                'periode_id' => $period->id,
                'stay_kind' => $data['kind'],
                'status' => 'accepted',
                'is_kipk' => false,
                'guest_count' => 1,
                'submitted_at' => now(),
                'reviewed_at' => now(),
                'starts_at' => $data['starts_at'],
                'ends_at' => $data['ends_at'],
                'rate_unit' => $data['rate_unit'],
                'funding' => 'personal',
                'allocation_status' => 'waiting',
                'reservation_expires_at' => $expiresAt,
                'notes' => $data['notes'] ?? null,
            ]);

            $registration->roomPreferences()->create(['kamar_id' => $data['kamar_id'], 'priority' => 1]);
            $allocate->handle($registration, $data['kamar_id']);
            $registration->statusHistories()->create(['from_status' => 'draft', 'to_status' => 'accepted', 'changed_by' => $user->id]);

            AuditLogService::log($user, 'public_stay_booking_created', $application, null, [
                'kind' => $data['kind'],
                'kamar_id' => $data['kamar_id'],
                'registration_id' => $registration->id,
            ]);

            return $bookingToken;
        }, 3);

        return redirect()
            ->route('public-booking.show', ['token' => $token])
            ->with('toast', ['type' => 'success', 'message' => 'Kamar berhasil ditahan dan tagihan telah diterbitkan. Silakan selesaikan pembayaran sebelum batas waktu.']);
    }

    public function show(string $token): Response
    {
        $application = ResidenceApplication::where('booking_token', $token)->firstOrFail();
        $registration = $application->registrations()
            ->with([
                'studentProfile.user',
                'reservedRoom.lantai.gedung',
                'placement.kamar.lantai.gedung',
                'tagihan.items',
                'tagihan.pembayaran' => fn ($q) => $q->latest(),
            ])
            ->firstOrFail();

        $invoice = $registration->tagihan;

        return Inertia::render('landing/pengajuan-hunian-status', [
            'landingSettings' => LandingContentService::settings(),
            'booking' => [
                'token' => $application->booking_token,
                'number' => $application->number,
                'kind' => $application->kind,
                'institution' => $application->institution,
                'email' => $application->recipient_email,
                'phone' => $application->applicant_phone,
                'applicant_name' => $registration->studentProfile->user->nama,
                'identity_number' => $registration->studentProfile->user->nim_nip,
                'starts_at' => $registration->starts_at?->toDateString(),
                'ends_at' => $registration->ends_at?->toDateString(),
                'rate_unit' => $registration->rate_unit,
                'allocation_status' => $registration->allocation_status,
                'status' => $registration->status,
                'reservation_expires_at' => $registration->reservation_expires_at?->toIso8601String(),
                'expired' => ! $registration->completed_at && $registration->allocation_status === 'held' && ($registration->reservation_expires_at?->isPast() ?? false),
                'room' => $registration->reservedRoom ? [
                    'nomor_kamar' => $registration->reservedRoom->nomor_kamar,
                    'tipe_kamar' => $registration->reservedRoom->tipe_kamar,
                    'gedung' => $registration->reservedRoom->lantai->gedung->nama_gedung,
                    'lantai' => $registration->reservedRoom->lantai->nama_lantai ?? ('Lantai '.$registration->reservedRoom->lantai->nomor_lantai),
                ] : null,
                'invoice' => $invoice ? [
                    'id' => $invoice->id,
                    'nomor' => $invoice->nomor,
                    'total' => (float) $invoice->total,
                    'total_dibayar' => (float) $invoice->total_dibayar,
                    'remaining' => max(0.0, (float) $invoice->total - (float) $invoice->total_dibayar),
                    'status' => $invoice->status->value,
                    'items' => $invoice->items->map(fn ($item): array => [
                        'deskripsi' => $item->deskripsi,
                        'kuantitas' => (int) $item->kuantitas,
                        'harga_satuan' => (float) $item->harga_satuan,
                        'subtotal' => (float) $item->kuantitas * (float) $item->harga_satuan,
                    ])->values()->all(),
                    'payments' => $invoice->pembayaran->map(fn (Pembayaran $p): array => [
                        'id' => $p->id,
                        'kode_transaksi' => $p->kode_transaksi,
                        'nominal' => (float) $p->nominal,
                        'status' => $p->status,
                        'rekening_tujuan' => $p->rekening_tujuan,
                        'created_at' => $p->created_at?->toIso8601String(),
                    ])->values()->all(),
                ] : null,
            ],
            'paymentAccounts' => PaymentBankAccount::where('is_active', true)
                ->orderBy('bank_name')
                ->orderBy('account_number')
                ->get(['id', 'bank_name', 'account_number', 'account_name', 'instructions']),
        ]);
    }

    public function uploadProof(Request $request, string $token): RedirectResponse
    {
        $application = ResidenceApplication::where('booking_token', $token)->firstOrFail();

        $validated = $request->validate([
            'payment_bank_account_id' => ['required', 'uuid', Rule::exists('payment_bank_accounts', 'id')->where('is_active', true)],
            'nama_bank' => ['required', 'string', 'max:50'],
            'nomor_rekening_pengirim' => ['required', 'string', 'max:50'],
            'atas_nama_pengirim' => ['required', 'string', 'max:150'],
            'tanggal_bayar' => ['required', 'date'],
            'bukti_transfer' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:5120'],
        ]);

        DB::transaction(function () use ($request, $application, $validated): void {
            $registration = $application->registrations()->lockForUpdate()->firstOrFail();
            if ($registration->isClosed()) {
                throw ValidationException::withMessages(['bukti_transfer' => 'Reservasi ini telah dibatalkan atau kedaluwarsa.']);
            }
            if (! $registration->completed_at && $registration->allocation_status === 'held' && $registration->reservation_expires_at?->isPast()) {
                throw ValidationException::withMessages(['bukti_transfer' => 'Batas waktu reservasi sudah lewat. Silakan ajukan ulang dari halaman Beranda.']);
            }

            $invoice = Tagihan::whereKey($registration->tagihan_id)->lockForUpdate()->firstOrFail();
            $remaining = max(0.0, (float) $invoice->total - (float) $invoice->total_dibayar);
            if ($remaining <= 0 || $invoice->status === TagihanStatus::Lunas) {
                throw ValidationException::withMessages(['bukti_transfer' => 'Tagihan ini sudah lunas.']);
            }
            if (Pembayaran::where('tagihan_id', $invoice->id)->where('status', 'menunggu_verifikasi')->exists()) {
                throw ValidationException::withMessages(['bukti_transfer' => 'Bukti pembayaran sebelumnya sedang menunggu verifikasi bagian keuangan.']);
            }

            $account = PaymentBankAccount::whereKey($validated['payment_bank_account_id'])->where('is_active', true)->firstOrFail();
            $targetLabel = "{$account->bank_name} · {$account->account_number} · a.n. {$account->account_name}";
            $path = $request->file('bukti_transfer')->store('bukti_pembayaran', 'local');

            $payment = Pembayaran::create([
                'kode_transaksi' => 'PUB-PAY-'.strtoupper(Str::random(10)),
                'mahasiswa_id' => $registration->student_profile_id,
                'tagihan_id' => $invoice->id,
                'jenis_pembayaran' => 'sewa_asrama',
                'nominal' => $remaining,
                'metode_pembayaran' => 'transfer_bank',
                'rekening_tujuan' => $targetLabel,
                'nama_bank' => $validated['nama_bank'],
                'nomor_rekening_pengirim' => $validated['nomor_rekening_pengirim'],
                'atas_nama_pengirim' => $validated['atas_nama_pengirim'],
                'tanggal_bayar' => Carbon::parse($validated['tanggal_bayar']),
                'bukti_transfer_path' => $path,
                'status' => 'menunggu_verifikasi',
            ]);

            if ($registration->allocation_status === 'held') {
                $registration->update(['allocation_status' => 'admin_occupied']);
            }

            app(ResidenceWorkflow::class)->evaluate($registration->fresh());
            AuditLogService::log($registration->studentProfile->user, 'public_stay_payment_proof_uploaded', $payment, null, [
                'application_id' => $application->id,
                'nominal' => $remaining,
            ]);
        });

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Bukti pembayaran diterima. Kamar Anda diamankan secara administratif sambil menunggu verifikasi lunas oleh bagian keuangan.',
        ]);
    }
}
