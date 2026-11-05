<?php

namespace App\Actions\Checkout;

use App\Models\ResidenceRegistration;
use App\Services\ResidenceWorkflow;
use Illuminate\Support\Facades\DB;

class EndTemporaryStays
{
    public function handle(): void
    {
        ResidenceRegistration::whereNotNull('completed_at')->whereNull('ended_at')->whereNull('end_notified_at')->whereDate('ends_at', '<=', today())
            ->eachById(function (ResidenceRegistration $candidate): void {
                DB::transaction(function () use ($candidate): void {
                    $r = ResidenceRegistration::whereKey($candidate->id)->lockForUpdate()->firstOrFail();
                    if ($r->end_notified_at || $r->ended_at) {
                        return;
                    }
                    if ($r->workflow_version === 2 && $r->placement?->status === 'aktif') {
                        app(CreateCheckoutRequest::class)->handle($r->studentProfile, 'Masa kontrak berakhir; menunggu inspeksi dan pengembalian kunci');
                    }
                    $r->update(['end_notified_at' => now()]);
                    app(ResidenceWorkflow::class)->notify($r, 'Masa tinggal berakhir', 'Jadwalkan pemeriksaan kondisi dan pengembalian kunci. Kamar tetap terisi sampai pengosongan fisik dikonfirmasi.', true);
                });
            });
    }
}
