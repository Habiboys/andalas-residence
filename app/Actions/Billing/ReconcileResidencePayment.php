<?php

namespace App\Actions\Billing;

use App\Models\KategoriTransaksi;
use App\Models\Pembayaran;
use App\Models\ResidencePaymentReference;
use App\Models\Tagihan;
use App\Models\TransaksiKeuangan;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\ResidenceWorkflow;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ReconcileResidencePayment
{
    /** @param list<array{tagihan_id: string, jumlah: numeric-string|int|float, payment_proof_id?: string|null}> $allocations */
    public function handle(ResidencePaymentReference $reference, array $allocations, User $officer): void
    {
        abort_unless($officer->can('pembayaran.verify'), 403);
        DB::transaction(function () use ($reference, $allocations, $officer): void {
            $reference = ResidencePaymentReference::whereKey($reference->id)->lockForUpdate()->firstOrFail();
            $normalized = collect($allocations)->map(fn ($a) => ['tagihan_id' => $a['tagihan_id'], 'jumlah' => number_format((float) $a['jumlah'], 2, '.', ''), 'payment_proof_id' => $a['payment_proof_id'] ?? null])->sortBy('tagihan_id')->values()->all();
            if ($reference->status === 'matched') {
                if ($reference->allocations !== $normalized) {
                    throw ValidationException::withMessages(['reference' => 'Transaksi sudah dicocokkan ke alokasi berbeda.']);
                }

                return;
            }
            $sum = collect($normalized)->sum(fn ($a) => (int) round((float) $a['jumlah'] * 100));
            if ($sum <= 0 || $sum !== (int) round((float) $reference->amount * 100) || count(array_unique(array_column($normalized, 'tagihan_id'))) !== count($normalized)) {
                throw ValidationException::withMessages(['allocations' => 'Alokasi harus unik dan totalnya tepat sama dengan transaksi resmi DPUB.']);
            }
            foreach ($normalized as $a) {
                $invoice = Tagihan::whereKey($a['tagihan_id'])->lockForUpdate()->firstOrFail();
                $remaining = $reference->payer_type === 'sponsor' ? (float) $invoice->sponsor_total - (float) $invoice->sponsor_paid : (float) $invoice->total - (float) $invoice->total_dibayar;
                if ($invoice->status->value === 'batal' || (float) $a['jumlah'] <= 0 || (float) $a['jumlah'] > $remaining) {
                    throw ValidationException::withMessages(['allocations' => 'Alokasi melebihi saldo atau tagihan dibatalkan.']);
                }
                $proof = null;
                if (! empty($a['payment_proof_id'])) {
                    $proof = Pembayaran::whereKey($a['payment_proof_id'])->where('tagihan_id', $invoice->id)->lockForUpdate()->firstOrFail();
                    if ($reference->payer_type !== 'personal' || $proof->status !== 'menunggu_verifikasi' || (float) $proof->nominal !== (float) $a['jumlah']) {
                        throw ValidationException::withMessages(['allocations' => 'Bukti transfer harus sesuai tagihan dan nominal alokasi yang diperiksa.']);
                    }
                }
                if ($reference->payer_type === 'sponsor') {
                    $invoice->update(['sponsor_paid' => (float) $invoice->sponsor_paid + (float) $a['jumlah']]);
                } else {
                    app(PostPayment::class)->handle('DPUB-'.hash('sha256', $reference->id.$invoice->id), $invoice->mahasiswa_id, $reference->paid_at->toDateTimeString(), [['tagihan_id' => $a['tagihan_id'], 'jumlah' => $a['jumlah']]], metadata: ['dpub_reference_id' => $reference->id]);
                }
                $proof?->update(['status' => 'lunas', 'diverifikasi_oleh' => $officer->id, 'tanggal_bayar' => $reference->paid_at, 'catatan_verifikasi' => 'DPUB: '.$reference->reference]);
                if ($invoice->registration) {
                    app(ResidenceWorkflow::class)->evaluate($invoice->registration->fresh());
                }
            }
            $category = KategoriTransaksi::firstOrCreate(['nama_kategori' => 'Penerimaan Sewa Asrama', 'tipe' => 'pemasukan']);
            TransaksiKeuangan::create(['nomor_bukti' => 'DPUB-'.$reference->id, 'kategori_id' => $category->id,
                'tipe' => 'pemasukan', 'nominal' => $reference->amount, 'tanggal_transaksi' => $reference->paid_at,
                'deskripsi' => 'Rekonsiliasi '.$reference->source.' / '.$reference->reference, 'lampiran_path' => $reference->evidence_path, 'dicatat_oleh' => $officer->id]);
            $reference->update(['status' => 'matched', 'allocations' => $normalized, 'matched_at' => now()]);
            AuditLogService::log($officer, 'dpub_payment_reconciled', $reference, null, ['allocations' => $normalized]);
        });
    }
}
