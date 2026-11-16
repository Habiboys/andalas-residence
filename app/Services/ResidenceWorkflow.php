<?php

namespace App\Services;

use App\Models\Pembayaran;
use App\Models\ResidenceRegistration;
use App\Models\User;
use App\Notifications\ResidenceWorkflowNotification;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ResidenceWorkflow
{
    public function canStudentCancel(ResidenceRegistration $r, ?User $user = null): bool
    {
        if ($user && $r->studentProfile->user_id !== $user->id) {
            return false;
        }
        if ($r->completed_at || $r->keys_returned_at || in_array($r->status->value, ['draft', 'rejected', 'cancelled'], true)) {
            return false;
        }
        if ($r->tagihan) {
            if ((float) $r->tagihan->total_dibayar > 0 || (float) $r->tagihan->sponsor_paid > 0) {
                return false;
            }
            if (Pembayaran::where('tagihan_id', $r->tagihan->id)->whereIn('status', ['menunggu_verifikasi', 'lunas'])->exists()) {
                return false;
            }
        }
        if ($r->room_contract_id) {
            $otherPaid = ResidenceRegistration::where('room_contract_id', $r->room_contract_id)
                ->whereKeyNot($r->id)
                ->where(function ($q): void {
                    $q->whereNotNull('completed_at')
                        ->orWhereHas('tagihan', function ($inv): void {
                            $inv->where('total_dibayar', '>', 0)
                                ->orWhere('sponsor_paid', '>', 0)
                                ->orWhereHas('pembayaran', fn ($p) => $p->whereIn('status', ['menunggu_verifikasi', 'lunas']));
                        });
                })
                ->exists();
            if ($otherPaid) {
                return false;
            }
        }

        return true;
    }

    public function documentsApproved(ResidenceRegistration $r): bool
    {
        if (in_array($r->status->value, ['draft', 'rejected', 'cancelled'], true) || ! $r->reserved_room_id) {
            return false;
        }
        if ($r->workflow_version === 2 && ! in_array($r->stay_kind, ['summer_course', 'non_student'], true)) {
            if (! $r->residence_application_id && $r->policy?->category !== 'international' && (empty($r->studentProfile->nik) || empty($r->studentProfile->alamat))) {
                return false;
            }
            $latest = $r->documents()->orderByDesc('version')->get()->unique('kind');
            foreach ($r->policy?->settings['documents'] ?? [] as $kind) {
                if ($latest->firstWhere('kind', $kind)?->status !== 'valid') {
                    return false;
                }
            }
            if ($r->decisions()->where('status', 'pending')->exists()) {
                return false;
            }
            foreach ($r->decisions()->where('status', 'approved')->get() as $decision) {
                if ($decision->terms['requires_configuration'] ?? false) {
                    return false;
                }
                $kind = $decision->terms['agreement_kind'] ?? null;
                if ($kind && $latest->firstWhere('kind', $kind)?->status !== 'valid') {
                    return false;
                }
            }
            if ($r->billing_basis === 'room' && ! $r->room_contract_id) {
                return false;
            }
            if ($r->rate_unit === 'month' && ! $r->decisions()->where('kind', 'monthly')->where('status', 'approved')->exists()) {
                return false;
            }
        }

        return true;
    }

    public function paymentUnlocked(ResidenceRegistration $r): bool
    {
        if (in_array($r->status->value, ['draft', 'rejected', 'cancelled'], true) || ! $r->reserved_room_id || ! $r->tagihan || $r->tagihan->status->value === 'batal') {
            return false;
        }
        if ($r->is_kipk) {
            return false;
        }

        return $this->documentsApproved($r);
    }

    /** @return list<string> */
    public function blockers(ResidenceRegistration $r): array
    {
        $issues = [];
        if (in_array($r->status->value, ['draft', 'rejected', 'cancelled'], true)) {
            $issues[] = 'Permohonan belum diterima, dibatalkan, atau telah ditolak.';
        }
        if (! $r->reserved_room_id) {
            $issues[] = 'Belum mendapat alokasi kamar.';
        }
        if ($r->workflow_version === 2 && ! in_array($r->stay_kind, ['summer_course', 'non_student'], true)) {
            if (! $r->residence_application_id && $r->policy?->category !== 'international' && (empty($r->studentProfile->nik) || empty($r->studentProfile->alamat))) {
                $issues[] = 'Data diri penghuni belum lengkap.';
            }
            $latest = $r->documents()->orderByDesc('version')->get()->unique('kind');
            foreach ($r->policy?->settings['documents'] ?? [] as $kind) {
                if ($latest->firstWhere('kind', $kind)?->status !== 'valid') {
                    $issues[] = 'Dokumen '.$kind.' belum disetujui fasilitator gedung.';
                }
            }
        }
        foreach ($r->decisions()->where('status', 'approved')->get() as $decision) {
            if ($decision->terms['requires_configuration'] ?? false) {
                $issues[] = 'Skema pembiayaan belum ditetapkan pengelola.';
            }
            $kind = $decision->terms['agreement_kind'] ?? null;
            if ($kind && $r->documents()->where('kind', $kind)->latest('version')->first()?->status !== 'valid') {
                $issues[] = 'Perjanjian pembiayaan sesuai keputusan belum valid.';
            }
        }
        if ($r->billing_basis === 'room' && ! $r->room_contract_id && $r->workflow_version === 2) {
            $issues[] = 'Kontrak kamar bersama belum disahkan.';
        }
        if ($r->rate_unit === 'month' && $r->workflow_version === 2 && ! $r->decisions()->where('kind', 'monthly')->where('status', 'approved')->exists()) {
            $issues[] = 'Skema bulanan belum disetujui pengelola.';
        }
        if ($r->decisions()->where('status', 'pending')->exists()) {
            $issues[] = $r->decisions()->where('status', 'pending')->get()->contains(fn ($d) => ! empty($d->terms['amendment_id']))
                ? 'Koreksi pembiayaan menunggu keputusan baru.'
                : 'Pengajuan skema pembiayaan masih menunggu persetujuan pengelola.';
        }
        if (! $this->financiallyReady($r)) {
            $issues[] = 'Pembayaran awal atau verifikasi pembayaran oleh pengelola belum memenuhi syarat.';
        }
        if ($r->studentProfile->user->status !== 'aktif' && $r->studentProfile->user->inactive_reason !== 'letter_issued') {
            $issues[] = 'Akun diblokir administrator.';
        }

        return $issues;
    }

    public function financiallyReady(ResidenceRegistration $r): bool
    {
        $invoice = $r->tagihan;
        if (! $invoice || $invoice->status->value === 'batal') {
            return false;
        }
        if ($r->workflow_version !== 2) {
            return $invoice->status->value === 'lunas' && ($r->funding !== 'sponsor' || $r->sponsor_approved_at !== null);
        }
        if ($r->is_kipk) {
            return $r->policy?->category === 'local_kipk';
        }
        if ($r->stay_kind === 'summer_course') {
            return (bool) ($r->application?->approved_at || $r->sponsor_approved_at);
        }
        if ($r->funding === 'sponsor') {
            if (! $r->sponsor_approved_at && ! $r->application?->approved_at) {
                return false;
            }
            if ((float) $invoice->total === 0.0 || $invoice->status->value === 'lunas') {
                return true;
            }
        }
        if ($invoice->status->value === 'lunas') {
            return true;
        }
        $decision = $r->decisions()->whereIn('kind', ['installment', 'defer', 'monthly'])->where('status', 'approved')->latest('decided_at')->first();
        if ($decision) {
            if ($decision->terms['requires_configuration'] ?? false) {
                return false;
            }
            $requiredAmount = (float) ($decision->terms['initial_amount'] ?? $invoice->amount_due_now ?? $invoice->total);
            if ($decision->kind === 'defer' && $requiredAmount <= 0) {
                return true;
            }
        } else {
            $requiredAmount = (float) ($invoice->amount_due_now ?? $invoice->total);
        }

        $proofAmount = $r->workflow_version === 2
            ? (float) Pembayaran::where('tagihan_id', $invoice->id)
                ->whereIn('status', ['menunggu_verifikasi', 'lunas'])
                ->whereNotNull('bukti_transfer_path')
                ->sum('nominal')
            : 0.0;

        return max((float) $invoice->total_dibayar, $proofAmount) >= $requiredAmount && $requiredAmount > 0;
    }

    public function evaluate(ResidenceRegistration $r): void
    {
        if ($r->completed_at || in_array($r->status->value, ['rejected', 'cancelled'], true)) {
            return;
        }
        $financiallyReady = $this->financiallyReady($r);
        $hasSubmittedProof = $r->tagihan
            && $r->tagihan->status->value !== 'batal'
            && Pembayaran::where('tagihan_id', $r->tagihan_id)
                ->whereIn('status', ['menunggu_verifikasi', 'lunas'])
                ->whereNotNull('bukti_transfer_path')
                ->exists();
        $allocationStatus = $r->allocation_status;
        if ($r->reserved_room_id) {
            if (($financiallyReady || $hasSubmittedProof) && in_array($allocationStatus, ['waiting', 'held', 'allocated'], true)) {
                $allocationStatus = 'admin_occupied';
            } elseif (! $financiallyReady && ! $hasSubmittedProof && ! $r->is_kipk && $r->funding === 'personal' && $r->stay_kind === 'regular' && in_array($allocationStatus, ['allocated', 'admin_occupied'], true)) {
                $allocationStatus = 'held';
            }
        }
        $ready = $this->blockers($r) === [];
        $wasReady = $r->ready_at !== null;
        $updates = [
            'ready_at' => $ready ? ($r->ready_at ?? now()) : null,
            'allocation_status' => $allocationStatus,
        ];
        if ($ready && $r->stay_kind === 'regular' && $r->residence_policy_id !== null) {
            $updates['checkin_classification'] = $r->checkin_classification
                ?? (app(ResidenceLifecycle::class)->isBinaan($r->studentProfile) ? 'binaan' : 'non_binaan');
            if ($r->studentProfile->status_huni !== 'aktif') {
                $r->studentProfile->update([
                    'status_huni' => 'aktif',
                    'tanggal_masuk' => $r->studentProfile->tanggal_masuk ?? today(),
                ]);
            }
        } elseif (! $ready
            && ! $hasSubmittedProof
            && ! $r->completed_at
            && ! $r->penempatan_kamar_id
            && ! $r->is_kipk
            && $r->funding === 'personal'
            && $r->stay_kind === 'regular'
            && $r->residence_policy_id !== null
            && $r->studentProfile->status_huni === 'aktif') {
            // Suspend active resident status back to calon when unverified proof is rejected
            $r->studentProfile->update([
                'status_huni' => 'calon',
            ]);
        }
        $r->update($updates);
        if ($ready && ! $wasReady) {
            $this->notify($r, 'Siap check-in', 'Administrasi telah memenuhi syarat. Datang ke pengelola gedung dengan identitas dan berkas asli untuk pemeriksaan serta serah kunci.');
        }
    }

    /**
     * @param  array<string, UploadedFile>  $uploadedFiles
     */
    public function storeSubmittedPackage(
        ResidenceRegistration $registration,
        User $actor,
        array $uploadedFiles,
        ?string $decisionKind = null,
        ?string $decisionReason = null,
    ): void {
        if ($uploadedFiles === [] && empty($decisionKind)) {
            return;
        }

        DB::transaction(function () use ($registration, $actor, $uploadedFiles, $decisionKind, $decisionReason): void {
            $r = ResidenceRegistration::whereKey($registration->id)->lockForUpdate()->firstOrFail();
            $approvedDecisions = $r->decisions()->where('status', 'approved')->get();
            $allowedKinds = array_unique([
                ...($r->policy?->settings['documents'] ?? []),
                ...$approvedDecisions->filter(fn ($decision) => ! ($decision->terms['requires_configuration'] ?? false))->pluck('terms.agreement_kind')->filter()->all(),
                'perjanjian',
            ]);

            foreach ($uploadedFiles as $kind => $file) {
                $kind = (string) $kind;
                $amendmentAllowed = $approvedDecisions->contains(
                    fn ($d) => ! empty($d->terms['amendment_id']) && ($d->terms['agreement_kind'] ?? null) === $kind
                );
                if (($r->completed_at && ! $amendmentAllowed) || $r->keys_returned_at || $r->isClosed() || ! in_array($kind, $allowedKinds, true)) {
                    throw ValidationException::withMessages(["files.{$kind}" => 'Jenis dokumen tidak berlaku atau pendaftaran sudah selesai.']);
                }

                $latest = $r->documents()->where('kind', $kind)->orderByDesc('version')->first();
                if ($latest && $latest->status !== 'revision') {
                    throw ValidationException::withMessages(["files.{$kind}" => "Dokumen {$kind} sudah tersimpan dan tidak dapat diubah."]);
                }

                $document = $r->documents()->create([
                    'kind' => $kind,
                    'version' => 1 + (int) ($latest?->version ?? 0),
                    'path' => $file->store('documents/registration', 'local'),
                    'checksum' => hash_file('sha256', $file->getRealPath()),
                    'uploaded_by' => $actor->id,
                    'status' => 'uploaded',
                ]);
                AuditLogService::log($actor, 'registration_document_uploaded', $document, null, ['kind' => $document->kind, 'version' => $document->version]);
            }

            if (! empty($decisionKind)) {
                if ($r->completed_at || ! $r->tagihan_id || $r->isClosed()) {
                    throw ValidationException::withMessages(['decision_kind' => 'Keputusan membutuhkan pendaftaran berjalan dan tagihan.']);
                }
                if ($r->decisions()->whereIn('status', ['pending', 'approved'])->exists()) {
                    throw ValidationException::withMessages(['decision_kind' => 'Pilihan pembiayaan sudah tersimpan dan tidak dapat diubah.']);
                }

                if ($decisionKind === 'full') {
                    $decision = $r->decisions()->create([
                        'kind' => 'full',
                        'reason' => 'Pembayaran penuh sesuai tagihan.',
                        'requested_by' => $actor->id,
                        'decided_by' => $actor->id,
                        'decided_at' => now(),
                        'status' => 'approved',
                    ]);
                    AuditLogService::log($actor, 'residence_decision_requested', $decision, null, ['kind' => 'full']);
                } else {
                    $reason = trim((string) ($decisionReason ?? ''));
                    if ($reason === '') {
                        throw ValidationException::withMessages(['decision_reason' => 'Alasan permohonan wajib diisi.']);
                    }
                    if ($decisionKind === 'monthly' && $r->rate_unit !== 'month') {
                        throw ValidationException::withMessages(['decision_kind' => 'Pendaftaran ini bukan skema bulanan.']);
                    }
                    if ($decisionKind === 'transfer_permission' && $r->stay_kind !== 'non_student') {
                        throw ValidationException::withMessages(['decision_kind' => 'Izin berbasis bukti transfer hanya untuk umum.']);
                    }
                    $decision = $r->decisions()->create([
                        'kind' => $decisionKind,
                        'reason' => $reason,
                        'requested_by' => $actor->id,
                        'status' => 'pending',
                    ]);
                    AuditLogService::log($actor, 'residence_decision_requested', $decision, null, ['kind' => $decisionKind, 'reason' => $reason]);
                }
            }

            $fresh = $r->fresh();
            $this->evaluate($fresh);
            if ($uploadedFiles !== []) {
                $this->notify($fresh, 'Dokumen pendaftaran baru diterima', 'Berkas pendaftaran baru telah diunggah dan menunggu pemeriksaan fasilitator gedung.', true);
            }
        });
    }

    public function notify(ResidenceRegistration $r, string $subject, string $message, bool $officers = false): void
    {
        $recipients = collect([$r->studentProfile->user]);
        if ($officers) {
            $building = $r->reservedRoom?->lantai->gedung_id ?? $r->placement?->kamar->lantai->gedung_id;
            $recipients = $recipients->merge(User::role(['staff_admin', 'admin_layanan'])->get())
                ->merge(User::role('fasilitator')->whereHas('fasilitatorWilayah', fn ($q) => $q->where('gedung_id', $building))->get());
        }
        foreach ($recipients->unique('id') as $user) {
            $user->notify(new ResidenceWorkflowNotification($subject, $message, $r->id));
        }
    }
}
