<?php

namespace App\Http\Controllers;

use App\Actions\Registration\CreateResidenceBilling;
use App\Actions\Registration\SubmitResidenceRegistration;
use App\Models\Kamar;
use App\Models\ResidenceRegistration;
use App\Models\RoomContract;
use App\Models\RoomInvitation;
use App\Models\Tagihan;
use App\Models\User;
use App\Services\ResidencePolicyService;
use App\Services\ResidenceWorkflow;
use App\Services\RoomInvitationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RoomInvitationController extends Controller
{
    public function store(Request $request, RoomInvitationService $invitations): RedirectResponse
    {
        $this->requireNonKipk($request->user(), $invitations);
        $data = $request->validate(['registration_id' => ['required', 'uuid'], 'nim' => ['required', 'string', 'max:50']]);
        DB::transaction(function () use ($request, $data, $invitations): void {
            $registration = ResidenceRegistration::where('student_profile_id', $request->user()->mahasiswaProfil->id)->lockForUpdate()->whereKey($data['registration_id'])->firstOrFail();
            $invitations->invite($registration, $request->user(), $data['nim'], 'nim');
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Undangan teman sekamar dikirim. Tempat diperiksa kembali saat undangan diterima.']);
    }

    public function update(Request $request, RoomInvitation $invitation, SubmitResidenceRegistration $submit, RoomInvitationService $invitations): RedirectResponse
    {
        abort_unless($invitation->invitee_id === $request->user()->id, 404);
        $this->requireNonKipk($request->user(), $invitations);
        $data = $request->validate(['accept' => ['required', 'boolean']]);
        DB::transaction(function () use ($request, $invitation, $submit, $data, $invitations): void {
            $invitation = RoomInvitation::query()->lockForUpdate()->findOrFail($invitation->id);
            if ($invitation->status === 'accepted' && $data['accept']) {
                return;
            }
            if ($invitation->status !== 'pending' || $invitation->expires_at->isPast()) {
                throw ValidationException::withMessages(['invitation' => 'Undangan sudah ditanggapi, dibatalkan, atau kedaluwarsa.']);
            }
            if (! $data['accept']) {
                $invitation->update(['status' => 'declined', 'responded_at' => now()]);

                return;
            }
            $host = ResidenceRegistration::query()->lockForUpdate()->findOrFail($invitation->residence_registration_id);
            $invitations->assertCanInvite($host);
            $this->requireNonKipk($invitation->sender, $invitations);
            if (($host->reserved_room_id ?? $host->placement?->kamar_id) !== $invitation->kamar_id) {
                throw ValidationException::withMessages(['invitation' => 'Kamar pengundang sudah berubah. Minta undangan baru.']);
            }
            if ($host->workflow_version === 2 && in_array($host->billing_basis, ['room', 'group'], true)) {
                $registration = $this->joinRoomContract($host, $request->user());
            } else {
                $registration = $submit->handle($request->user()->mahasiswaProfil, [
                    'periode_id' => $host->periode_id, 'is_kipk' => false,
                    'preferences' => [['kamar_id' => $invitation->kamar_id]], 'billing_basis' => 'person',
                    'rate_unit' => $host->rate_unit, 'starts_at' => $host->starts_at?->max(today())->toDateString() ?? today()->toDateString(), 'ends_at' => $host->ends_at?->toDateString(),
                    'funding' => 'personal',
                ]);
            }
            $invitation->update(['status' => 'accepted', 'responded_at' => now(), 'accepted_registration_id' => $registration->id]);

            if ($host->room_contract_id) {
                $contractMemberIds = RoomContract::whereKey($host->room_contract_id)->value('members') ?? [$host->id];
                foreach (ResidenceRegistration::whereIn('id', $contractMemberIds)->get() as $memberRegistration) {
                    app(ResidenceWorkflow::class)->evaluate($memberRegistration);
                }
            }
        });

        return back()->with('toast', ['type' => 'success', 'message' => $data['accept'] ? 'Undangan diterima. Kamar ditahan dan tagihan dibuat; lengkapi unggah berkas pendaftaran Anda pada Tahap 3.' : 'Undangan ditolak.']);
    }

    public function destroy(Request $request, RoomInvitation $invitation): RedirectResponse
    {
        abort_unless($invitation->sender_id === $request->user()->id, 404);
        RoomInvitation::whereKey($invitation->id)->where('status', 'pending')->update(['status' => 'cancelled', 'responded_at' => now()]);

        return back()->with('toast', ['type' => 'success', 'message' => 'Undangan dibatalkan.']);
    }

    private function requireNonKipk(User $user, RoomInvitationService $invitations): void
    {
        abort_unless($invitations->isEligibleStudent($user), 403);
    }

    private function joinRoomContract(ResidenceRegistration $host, User $user): ResidenceRegistration
    {
        $student = $user->mahasiswaProfil()->lockForUpdate()->firstOrFail();
        app(ResidencePolicyService::class)->assertProfile($student);
        $room = Kamar::whereKey($host->reserved_room_id)->lockForUpdate()->firstOrFail();
        app(ResidencePolicyService::class)->validateRoom($host->policy, $room, $student);
        if ($student->penempatanKamar()->where('status', 'aktif')->exists() || $student->residenceRegistrations()->whereNull('completed_at')->whereNotIn('status', ['draft', 'rejected', 'cancelled'])->exists()) {
            throw ValidationException::withMessages(['invitation' => 'Sudah memiliki hunian atau pendaftaran.']);
        }
        $held = ResidenceRegistration::where('reserved_room_id', $room->id)->whereNull('completed_at')->whereNotIn('status', ['draft', 'rejected', 'cancelled'])->lockForUpdate()->get(['id'])->count() + $room->penempatanKamar()->where('status', 'aktif')->lockForUpdate()->get(['id'])->count();
        if ($held >= $room->kapasitas || $room->status === 'maintenance') {
            throw ValidationException::withMessages(['invitation' => 'Kamar sudah penuh atau tidak siap.']);
        }
        $policyDeadline = $host->policy ? app(ResidencePolicyService::class)->registrationDeadline($host->policy) : null;
        $r = ResidenceRegistration::create([
            ...$host->only(['workflow_version', 'residence_policy_id', 'periode_id', 'reserved_room_id', 'starts_at', 'ends_at', 'rate_unit', 'billing_basis', 'funding']),
            'student_profile_id' => $student->id,
            'status' => 'submitted',
            'is_kipk' => false,
            'submitted_at' => now(),
            'allocation_status' => 'held',
            'reservation_expires_at' => $host->reservation_expires_at ?? $policyDeadline ?? now()->addHours(max(1, (int) ($host->policy->settings['reservation_hours'] ?? $host->periode?->reservation_hours ?? 168))),
        ]);
        $r->roomPreferences()->create(['kamar_id' => $room->id, 'priority' => 1]);
        $r->statusHistories()->create(['from_status' => 'draft', 'to_status' => 'submitted', 'changed_by' => $user->id]);
        $r->decisions()->create([
            'kind' => 'full',
            'reason' => 'Pembayaran penuh sesuai tagihan.',
            'requested_by' => $user->id,
            'decided_by' => $user->id,
            'decided_at' => now(),
            'status' => 'approved',
        ]);

        if ($host->room_contract_id) {
            $contract = RoomContract::whereKey($host->room_contract_id)->lockForUpdate()->first();
            $invoiceIds = ResidenceRegistration::where('room_contract_id', $host->room_contract_id)
                ->whereNotNull('tagihan_id')
                ->pluck('tagihan_id');
            $hasPaidMember = $invoiceIds->isNotEmpty()
                && Tagihan::whereIn('id', $invoiceIds)->where('total_dibayar', '>', 0)->exists();

            if ($contract && ! $hasPaidMember) {
                $members = array_values(array_unique([...($contract->members ?? []), $r->id]));
                $contract->update([
                    'occupants' => count($members),
                    'members' => $members,
                ]);
                $r->update(['room_contract_id' => $contract->id]);
                app(CreateResidenceBilling::class)->handle($r->fresh());

                $totalRupiah = (int) round((float) $contract->total);
                $count = count($members);
                foreach ($members as $index => $memberId) {
                    $memberReg = ResidenceRegistration::with('tagihan.items')->find($memberId);
                    if (! $memberReg?->tagihan) {
                        continue;
                    }
                    $shareRupiah = intdiv($totalRupiah, $count) + ($index < $totalRupiah % $count ? 1 : 0);
                    $memberReg->tagihan->items()->update([
                        'kuantitas' => 1,
                        'harga_satuan' => $shareRupiah,
                        'jumlah' => $shareRupiah,
                    ]);
                    $memberReg->tagihan->update([
                        'subtotal' => $shareRupiah,
                        'total' => max(0, $shareRupiah - (float) $memberReg->tagihan->sponsor_total),
                    ]);
                }
            }
        }

        return $r;
    }
}
