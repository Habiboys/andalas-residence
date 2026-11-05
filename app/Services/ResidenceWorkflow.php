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
        if ($r->workflow_version === 2) {
            $latest = $r->documents()->orderByDesc('version')->get()->unique('kind');
            foreach ($r->policy->settings['documents'] as $kind) {
                if ($latest->firstWhere('kind', $kind)?->status !== 'valid') {
                    $issues[] = 'Dokumen '.$kind.' belum valid.';
                }
            }
        }
        if ($r->billing_basis === 'room' && ! $r->room_contract_id && $r->workflow_version === 2) {
            $issues[] = 'Kontrak kamar bersama belum disahkan.';
        }
        if ($r->rate_unit === 'month' && $r->workflow_version === 2 && ! $r->decisions()->where('kind', 'monthly')->where('status', 'approved')->exists()) {
            $issues[] = 'Skema bulanan belum disetujui pengelola.';
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
        if ($r->is_kipk && ! $r->kipk_disbursed_at) {
            return $r->policy?->category === 'local_kipk';
        }
        if ($r->stay_kind === 'summer_course' && $r->application?->approved_at) {
            return true;
        }
        if ($r->funding === 'sponsor' && ! $r->sponsor_approved_at) {
            return false;
        }
        if ($invoice->status->value === 'lunas') {
            return true;
        }
        if ($r->stay_kind === 'non_student' && $r->decisions()->where('kind', 'transfer_permission')->where('status', 'approved')->exists()
            && Pembayaran::where('tagihan_id', $invoice->id)->whereIn('status', ['menunggu_verifikasi', 'lunas'])->whereNotNull('bukti_transfer_path')->where('nominal', '>=', (float) $invoice->total - (float) $invoice->total_dibayar)->exists()) {
            return true;
        }
        $decision = $r->decisions()->whereIn('kind', ['installment', 'defer', 'monthly'])->where('status', 'approved')->latest('decided_at')->first();

        return $decision && (float) $invoice->total_dibayar >= (float) ($decision->terms['initial_amount'] ?? $invoice->total);
    }

    public function evaluate(ResidenceRegistration $r): void
    {
        if ($r->completed_at) {
            return;
        }
        $ready = $this->blockers($r) === [];
        $wasReady = $r->ready_at !== null;
        $r->update(['ready_at' => $ready ? ($r->ready_at ?? now()) : null]);
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
