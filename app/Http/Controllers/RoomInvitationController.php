<?php

namespace App\Http\Controllers;

use App\Actions\Registration\SubmitResidenceRegistration;
use App\Enums\ResidenceRegistrationStatus;
use App\Models\Kamar;
use App\Models\ResidenceRegistration;
use App\Models\RoomInvitation;
use App\Models\User;
use App\Services\ResidenceLifecycle;
use App\Services\RoomEligibility;
use App\Services\RoomReservations;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RoomInvitationController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $this->requireNonKipk($request->user());
        $data = $request->validate(['registration_id' => ['required', 'uuid'], 'nim' => ['required', 'string', 'max:50']]);
        DB::transaction(function () use ($request, $data): void {
            $registration = ResidenceRegistration::where('student_profile_id', $request->user()->mahasiswaProfil->id)->lockForUpdate()->findOrFail($data['registration_id']);
            $this->requireHost($registration);
            $invitee = User::where('nim_nip', trim($data['nim']))->first();
            if (! $invitee || $invitee->id === $request->user()->id || ! $this->eligibleStudent($invitee)) {
                throw ValidationException::withMessages(['nim' => 'NIM harus milik mahasiswa non-KIP-K lain dengan akun aktif.']);
            }
            if ($invitee->mahasiswaProfil->penempatanKamar()->where('status', 'aktif')->exists()
                || ResidenceRegistration::where('student_profile_id', $invitee->mahasiswaProfil->id)->whereNull('completed_at')->whereNotIn('status', ['draft', 'rejected'])->exists()) {
                throw ValidationException::withMessages(['nim' => 'Calon penghuni sudah memiliki hunian atau pendaftaran berjalan.']);
            }
            $room = Kamar::query()->lockForUpdate()->findOrFail($registration->reserved_room_id ?? $registration->placement?->kamar_id);
            RoomEligibility::validate($room, $invitee, 'nim');
            $existing = RoomInvitation::where('residence_registration_id', $registration->id)->where('invitee_id', $invitee->id)->first();
            if ($existing && ($existing->status === 'accepted' || ($existing->status === 'pending' && $existing->expires_at->isFuture()))) {
                throw ValidationException::withMessages(['nim' => 'Undangan untuk teman ini sudah ada.']);
            }
            RoomInvitation::updateOrCreate(['residence_registration_id' => $registration->id, 'invitee_id' => $invitee->id], [
                'sender_id' => $request->user()->id, 'kamar_id' => $room->id, 'status' => 'pending', 'responded_at' => null,
                'expires_at' => ($registration->reservation_expires_at?->isFuture() ? $registration->reservation_expires_at : now()->addDay())->min($registration->ends_at ?? now()->addDay()),
            ]);
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Undangan teman sekamar dikirim. Tempat diperiksa kembali saat undangan diterima.']);
    }

    public function update(Request $request, RoomInvitation $invitation, SubmitResidenceRegistration $submit): RedirectResponse
    {
        abort_unless($invitation->invitee_id === $request->user()->id, 404);
        $this->requireNonKipk($request->user());
        $data = $request->validate(['accept' => ['required', 'boolean']]);
        DB::transaction(function () use ($request, $invitation, $submit, $data): void {
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
            $this->requireHost($host);
            $this->requireNonKipk($invitation->sender);
            if (($host->reserved_room_id ?? $host->placement?->kamar_id) !== $invitation->kamar_id) {
                throw ValidationException::withMessages(['invitation' => 'Kamar pengundang sudah berubah. Minta undangan baru.']);
            }
            $registration = $submit->handle($request->user()->mahasiswaProfil, [
                'periode_id' => $host->periode_id, 'is_kipk' => false,
                'preferences' => [['kamar_id' => $invitation->kamar_id]], 'billing_basis' => 'person',
                'rate_unit' => $host->rate_unit, 'starts_at' => $host->starts_at?->max(today())->toDateString() ?? today()->toDateString(), 'ends_at' => $host->ends_at?->toDateString(),
                'funding' => 'personal',
            ]);
            $invitation->update(['status' => 'accepted', 'responded_at' => now(), 'accepted_registration_id' => $registration->id]);
        });

        return back()->with('toast', ['type' => 'success', 'message' => $data['accept'] ? 'Undangan diterima. Kamar ditahan dan tagihan dibuat; hunian otomatis aktif setelah persyaratan pembayaran terpenuhi.' : 'Undangan ditolak.']);
    }

    public function destroy(Request $request, RoomInvitation $invitation): RedirectResponse
    {
        abort_unless($invitation->sender_id === $request->user()->id, 404);
        RoomInvitation::whereKey($invitation->id)->where('status', 'pending')->update(['status' => 'cancelled', 'responded_at' => now()]);

        return back()->with('toast', ['type' => 'success', 'message' => 'Undangan dibatalkan.']);
    }

    private function eligibleStudent(User $user): bool
    {
        return $user->status === 'aktif' && $user->mahasiswaProfil
            && app(ResidenceLifecycle::class)->isLocal($user->mahasiswaProfil)
            && ! app(ResidenceLifecycle::class)->isKipk($user->mahasiswaProfil);
    }

    private function requireNonKipk(User $user): void
    {
        abort_unless($this->eligibleStudent($user), 403);
    }

    private function requireHost(ResidenceRegistration $registration): void
    {
        $hasPlace = $registration->completed_at ? $registration->placement?->status === 'aktif' : app(RoomReservations::class)->held()->whereKey($registration->id)->exists();
        if ($registration->is_kipk || $registration->billing_basis === 'room' || ! $hasPlace
            || $registration->ended_at || $registration->status === ResidenceRegistrationStatus::Rejected
            || $registration->periode?->status !== 'aktif' || $registration->ends_at?->isPast()) {
            throw ValidationException::withMessages(['invitation' => 'Undangan membutuhkan pilihan kamar non-KIP-K per orang yang masih berlaku.']);
        }
    }
}
