<?php

namespace App\Actions\Checkin;

use App\Models\Checkin;
use App\Models\PenempatanKamar;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CompleteCheckin
{
    public function handle(Checkin $checkin, string $officerId): Checkin
    {
        return DB::transaction(function () use ($checkin, $officerId) {
            $lockedCheckin = Checkin::query()->lockForUpdate()->findOrFail($checkin->id);

            if ($lockedCheckin->status === 'selesai_checkin') {
                return $lockedCheckin;
            }

            if ($lockedCheckin->status !== 'siap_checkin') {
                throw ValidationException::withMessages(['checkin' => 'Check-in belum siap diselesaikan.']);
            }

            $placement = PenempatanKamar::query()
                ->where('mahasiswa_id', $lockedCheckin->mahasiswa_id)
                ->where('status', 'aktif')
                ->lockForUpdate()
                ->first();

            if (! $placement) {
                throw ValidationException::withMessages(['placement' => 'Penempatan aktif diperlukan untuk check-in.']);
            }

            $lockedCheckin->update([
                'penempatan_kamar_id' => $placement->id,
                'tanggal_aktual_checkin' => now(),
                'status' => 'selesai_checkin',
                'petugas_checkin_id' => $officerId,
            ]);

            $lockedCheckin->mahasiswa()->update(['status_huni' => 'aktif', 'tanggal_masuk' => now()->toDateString()]);

            return $lockedCheckin->fresh('placement');
        });
    }
}
