<?php

namespace App\Actions\Checkout;

use App\Models\CheckoutRequest;
use App\Models\Kamar;
use App\Models\MahasiswaProfil;
use App\Models\ResidenceRegistration;
use App\Models\User;
use App\Notifications\TemporaryStayEnded;
use Illuminate\Support\Facades\DB;

class EndTemporaryStays
{
    public function handle(): void
    {
        ResidenceRegistration::whereIn('stay_kind', ['summer_course', 'non_student'])
            ->whereNotNull('completed_at')->whereNull('ended_at')->whereDate('ends_at', '<=', today())
            ->eachById(function (ResidenceRegistration $candidate): void {
                DB::transaction(function () use ($candidate): void {
                    $registration = ResidenceRegistration::whereKey($candidate->id)->lockForUpdate()->firstOrFail();
                    if ($registration->ended_at) {
                        return;
                    }
                    $student = MahasiswaProfil::whereKey($registration->student_profile_id)->lockForUpdate()->firstOrFail();
                    $placement = $registration->placement()->lockForUpdate()->first();
                    if (! $placement || $placement->status !== 'aktif') {
                        $registration->update(['ended_at' => now()]);

                        return;
                    }
                    $room = Kamar::whereKey($placement->kamar_id)->lockForUpdate()->firstOrFail();
                    $placement->update(['status' => 'berakhir', 'tanggal_selesai' => $registration->ends_at]);
                    $student->update(['status_huni' => 'keluar']);
                    $student->residenceHistories()->create(['event' => 'checked_out', 'occurred_at' => now()]);
                    CheckoutRequest::updateOrCreate(['penempatan_kamar_id' => $placement->id], [
                        'mahasiswa_id' => $student->id, 'status' => 'selesai', 'diajukan_at' => now(), 'selesai_at' => now(),
                        'alasan' => 'Masa hunian sementara berakhir otomatis sesuai tanggal keluar.',
                    ]);
                    $occupancy = $room->penempatanKamar()->where('status', 'aktif')->count();
                    if ($room->status !== 'maintenance') {
                        $room->update(['status' => $occupancy === 0 ? 'kosong' : ($occupancy >= $room->kapasitas ? 'penuh' : 'terisi_sebagian')]);
                    }
                    $registration->update(['ended_at' => now()]);
                    User::role('fasilitator')->whereHas('fasilitatorWilayah', fn ($query) => $query->where('gedung_id', $room->lantai->gedung_id))
                        ->each(fn (User $user) => $user->notify(new TemporaryStayEnded($registration->id, $student->user->nama, $room->nomor_kamar, $registration->ends_at->toDateString())));
                });
            });
    }
}
