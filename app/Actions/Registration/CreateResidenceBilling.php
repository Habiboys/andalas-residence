<?php

namespace App\Actions\Registration;

use App\Actions\Billing\CreateTagihan;
use App\Enums\ClientProfileCategory;
use App\Enums\SumberPenyesuaianTagihan;
use App\Enums\TagihanStatus;
use App\Models\ResidenceRegistration;
use App\Models\Tagihan;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CreateResidenceBilling
{
    public function __construct(private CreateTagihan $createTagihan) {}

    public function handle(ResidenceRegistration $registration): Tagihan
    {
        return DB::transaction(function () use ($registration): Tagihan {
            $registration = ResidenceRegistration::query()->lockForUpdate()->findOrFail($registration->id);
            if ($registration->tagihan_id) {
                return $registration->tagihan;
            }

            $student = $registration->studentProfile()->with('user')->firstOrFail();
            $isKipk = $registration->is_kipk;
            $isInternationalFree = $student->user->client_profile_category === ClientProfileCategory::InternationalFreeFacility;
            $room = $registration->roomPreferences()->with('kamar')->orderBy('priority')->first()?->kamar;
            $amount = (float) ($room?->tarif_per_periode ?? config('residence.registration_fee', 0));

            if (! $isKipk && ! $isInternationalFree && $amount <= 0) {
                throw ValidationException::withMessages(['preferences' => 'Tarif kamar belum ditetapkan. Hubungi admin layanan.']);
            }

            $attempt = $registration->statusHistories()->where('to_status', 'submitted')->count();
            $invoice = $this->createTagihan->handle(
                $student,
                'REG-'.$registration->id.($attempt > 1 ? '-'.$attempt : ''),
                [['deskripsi' => 'Hunian asrama '.$registration->periode->nama_periode, 'kuantitas' => 1, 'harga_satuan' => $amount]],
                $isKipk || $isInternationalFree ? [[
                    'sumber' => $isKipk ? SumberPenyesuaianTagihan::KipkSponsor->value : SumberPenyesuaianTagihan::SubsidiInternasionalGratis->value,
                    'deskripsi' => $isKipk ? 'Ditanggung KIPK; tagihan penghuni sementara nol' : 'Fasilitas asrama gratis internasional',
                    'jumlah' => -$amount,
                ]] : [],
            );
            $invoice->update(['status' => (float) $invoice->total === 0.0 ? TagihanStatus::Lunas : TagihanStatus::Terbit, 'tanggal_terbit' => now()]);
            $registration->update(['tagihan_id' => $invoice->id]);

            return $invoice;
        });
    }
}
