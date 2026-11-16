<?php

namespace App\Services;

use App\Models\Pembayaran;
use App\Models\ResidenceRegistration;
use App\Models\User;
use App\Notifications\ResidenceWorkflowNotification;

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

        $proofAmount = $r->stay_kind === 'non_student'
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
            } elseif (! $financiallyReady && ! $hasSubmittedProof && $allocationStatus === 'allocated') {
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
        }
        $r->update($updates);
        if ($ready && ! $wasReady) {
            $this->notify($r, 'Siap check-in', 'Administrasi telah memenuhi syarat. Datang ke pengelola gedung dengan identitas dan berkas asli untuk pemeriksaan serta serah kunci.');
        }
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
