<?php

namespace App\Services;

use App\Models\Kamar;
use App\Models\ResidenceRegistration;
use App\Models\RoomInvitation;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class RoomInvitationService
{
    public function isEligibleStudent(User $user): bool
    {
        return $user->status === 'aktif' && $user->mahasiswaProfil
            && app(ResidenceLifecycle::class)->isLocal($user->mahasiswaProfil)
            && ! app(ResidenceLifecycle::class)->isKipk($user->mahasiswaProfil);
    }

    public function assertCanInvite(ResidenceRegistration $registration): void
    {
        $hasPlace = $registration->completed_at
            ? $registration->placement?->status === 'aktif'
            : app(RoomReservations::class)->held()->whereKey($registration->id)->exists();

        if (
            $registration->is_kipk
            || (in_array($registration->billing_basis, ['room', 'group'], true) && $registration->workflow_version !== 2)
            || ! $hasPlace
            || $registration->ended_at
            || $registration->isClosed()
            || $registration->periode?->status !== 'aktif'
            || $registration->ends_at?->isPast()
        ) {
            throw ValidationException::withMessages(['invitation' => 'Undangan membutuhkan alokasi kamar non-KIP-K yang masih berlaku.']);
        }
    }

    public function invite(ResidenceRegistration $registration, User $sender, string $nim, string $errorKey = 'nim'): RoomInvitation
    {
        $this->assertCanInvite($registration);
        $trimmedNim = trim($nim);
        $invitee = User::with('mahasiswaProfil.prodi')->where('nim_nip', $trimmedNim)->first();
        if (! $invitee || $invitee->id === $sender->id || $invitee->status !== 'aktif' || ! $invitee->mahasiswaProfil) {
            throw ValidationException::withMessages([$errorKey => 'NIM harus milik mahasiswa non-KIP-K lain dengan akun aktif.']);
        }
        if (
            app(ResidenceLifecycle::class)->isKipk($invitee->mahasiswaProfil)
            || $invitee->client_profile_category?->value === 'local_kipk'
        ) {
            throw ValidationException::withMessages([$errorKey => "Teman yang diundang ({$trimmedNim}) tidak boleh mahasiswa KIP-K. NIM harus milik mahasiswa non-KIP-K lain dengan akun aktif."]);
        }
        if ($sender->gender && $invitee->gender && $invitee->gender !== $sender->gender) {
            throw ValidationException::withMessages([$errorKey => "Teman yang diundang ({$trimmedNim}) harus berjenis kelamin sama dengan Anda."]);
        }
        $sender->loadMissing('mahasiswaProfil.prodi');
        $senderJenjang = $sender->mahasiswaProfil?->prodi?->jenjang;
        $inviteeJenjang = $invitee->mahasiswaProfil?->prodi?->jenjang;
        if ($senderJenjang && $inviteeJenjang && strtoupper($senderJenjang) !== strtoupper($inviteeJenjang)) {
            throw ValidationException::withMessages([$errorKey => "Teman yang diundang ({$trimmedNim}) harus memiliki jenjang pendidikan yang sama ({$senderJenjang})."]);
        }
        if (! app(ResidenceLifecycle::class)->isLocal($invitee->mahasiswaProfil) && app(ResidenceLifecycle::class)->isLocal($sender->mahasiswaProfil)) {
            throw ValidationException::withMessages([$errorKey => 'NIM harus milik mahasiswa non-KIP-K lain dengan akun aktif.']);
        }
        if (
            $invitee->mahasiswaProfil->penempatanKamar()->where('status', 'aktif')->exists()
            || ResidenceRegistration::where('student_profile_id', $invitee->mahasiswaProfil->id)->whereNull('completed_at')->whereNotIn('status', ['draft', 'rejected', 'cancelled'])->exists()
        ) {
            throw ValidationException::withMessages([$errorKey => "Teman yang diundang ({$trimmedNim}) sudah memilih kamar (sudah memiliki hunian atau pendaftaran berjalan)."]);
        }

        $room = Kamar::query()->lockForUpdate()->findOrFail($registration->reserved_room_id ?? $registration->placement?->kamar_id);
        if ($registration->workflow_version === 2 && in_array($registration->billing_basis, ['room', 'group'], true)) {
            try {
                app(ResidencePolicyService::class)->assertProfile($invitee->mahasiswaProfil);
                app(ResidencePolicyService::class)->validateRoom($registration->policy, $room, $invitee->mahasiswaProfil);
            } catch (ValidationException $exception) {
                $firstMessage = collect($exception->errors())->flatten()->first() ?? 'Calon penghuni tidak memenuhi syarat kamar.';
                throw ValidationException::withMessages([$errorKey => (string) $firstMessage]);
            }
        } else {
            RoomEligibility::validate($room, $invitee, $errorKey);
        }

        $existing = RoomInvitation::where('residence_registration_id', $registration->id)->where('invitee_id', $invitee->id)->first();
        if ($existing && ($existing->status === 'accepted' || ($existing->status === 'pending' && $existing->expires_at->isFuture()))) {
            throw ValidationException::withMessages([$errorKey => 'Undangan untuk teman ini sudah ada.']);
        }

        return RoomInvitation::updateOrCreate(
            ['residence_registration_id' => $registration->id, 'invitee_id' => $invitee->id],
            [
                'sender_id' => $sender->id,
                'kamar_id' => $room->id,
                'status' => 'pending',
                'responded_at' => null,
                'expires_at' => ($registration->reservation_expires_at?->isFuture() ? $registration->reservation_expires_at : now()->addDay())->min($registration->ends_at ?? now()->addDay()),
            ],
        );
    }
}
