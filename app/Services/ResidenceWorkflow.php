<?php

namespace App\Services;

use App\Models\Pembayaran;
use App\Models\ResidenceRegistration;
use App\Models\User;
use App\Notifications\ResidenceWorkflowNotification;

class ResidenceWorkflow
{
    /** @return list<string> */
    public function blockers(ResidenceRegistration $r): array
    {
        $issues = [];
        if (in_array($r->status->value, ['draft', 'rejected'], true)) {
            $issues[] = 'Permohonan belum diterima atau telah ditolak.';
        }
        if (! $r->reserved_room_id) {
            $issues[] = 'Belum mendapat alokasi kamar.';
        }
        if ($r->workflow_version === 2 && ! in_array($r->stay_kind, ['summer_course', 'non_student'], true)) {
            if (empty($r->studentProfile->nik) || empty($r->studentProfile->alamat)) {
                $issues[] = 'Data diri penghuni belum lengkap.';
            }
            $latest = $r->documents()->orderByDesc('version')->get()->unique('kind');
            foreach ($r->policy?->settings['documents'] ?? [] as $kind) {
                if (! in_array($latest->firstWhere('kind', $kind)?->status, ['valid', 'uploaded'], true)) {
                    $issues[] = 'Dokumen '.$kind.' belum valid.';
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
        if ($r->decisions()->where('status', 'pending')->get()->contains(fn ($d) => ! empty($d->terms['amendment_id']))) {
            $issues[] = 'Koreksi pembiayaan menunggu keputusan baru.';
        }
        if (! $this->financiallyReady($r)) {
            $issues[] = 'Pembayaran awal atau persetujuan pembiayaan belum memenuhi syarat.';
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

        $proofAmount = (float) Pembayaran::where('tagihan_id', $invoice->id)
            ->whereIn('status', ['menunggu_verifikasi', 'lunas'])
            ->whereNotNull('bukti_transfer_path')
            ->sum('nominal');

        return max((float) $invoice->total_dibayar, $proofAmount) >= $requiredAmount && $requiredAmount > 0;
    }

    public function evaluate(ResidenceRegistration $r): void
    {
        if ($r->completed_at) {
            return;
        }
        $financiallyReady = $this->financiallyReady($r);
        $allocationStatus = $r->allocation_status;
        if ($r->reserved_room_id && $r->status->value !== 'rejected') {
            if ($financiallyReady && in_array($allocationStatus, ['waiting', 'held', 'allocated'], true)) {
                $allocationStatus = 'admin_occupied';
            } elseif (! $financiallyReady && $allocationStatus === 'allocated') {
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
