<?php

namespace App\Http\Controllers;

use App\Actions\Registration\CompleteResidenceRegistration;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\KipkRecipient;
use App\Models\LegacyResidenceRate;
use App\Models\LegacyResident;
use App\Models\Periode;
use App\Models\ResidenceRate;
use App\Models\ResidenceRegistration;
use App\Services\MasterDataService;
use App\Services\RoomEligibility;
use App\Services\StudentCohort;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ResidenceManagementController extends Controller
{
    public function save(Request $request, string $kind): RedirectResponse
    {
        $this->authorizePermission($request, in_array($kind, ['legacy', 'legacy-rate'], true) ? 'free-residence.review' : 'registration.review');
        if ($kind === 'legacy') {
            $this->saveLegacy($request->all(), $request->user()->id);
        } elseif ($kind === 'legacy-rate') {
            $data = $request->validate(['angkatan' => ['required', 'integer', 'min:1950', 'max:2025'], 'gedung_id' => ['required', 'uuid', 'exists:gedung,id'], 'jumlah' => ['required', 'numeric', 'min:1']]);
            LegacyResidenceRate::updateOrCreate(['angkatan' => $data['angkatan'], 'gedung_id' => $data['gedung_id']], ['jumlah' => $data['jumlah']]);
        } elseif ($kind === 'kipk') {
            $data = $request->validate(['nim' => ['required', 'string', 'max:50'], 'nama' => ['required', 'string', 'max:255']]);
            KipkRecipient::updateOrCreate(['nim' => $data['nim'], 'angkatan' => StudentCohort::fromNim($data['nim'])], ['nama' => $data['nama']]);
        } elseif ($kind === 'rate') {
            $data = $request->validate(['gedung_id' => ['required', 'uuid', 'exists:gedung,id'], 'tipe_kamar' => ['required', 'in:standar,medium,premium'], 'unit' => ['required', 'in:period,day'], 'amount' => ['required', 'numeric', 'min:1']]);
            ResidenceRate::updateOrCreate(array_diff_key($data, ['amount' => null]), ['amount' => $data['amount']]);
        } elseif ($kind === 'building') {
            $data = $request->validate(['gedung_id' => ['required', 'uuid', 'exists:gedung,id'], 'allowed_categories' => ['required', 'array', 'min:1'], 'allowed_categories.*' => ['required', Rule::in(['local_kipk', 'local_non_kipk', 'international_student', 'international_free_facility', 'non_student'])]]);
            Gedung::query()->whereKey($data['gedung_id'])->firstOrFail()->update(['allowed_categories' => $data['allowed_categories']]);
        } elseif ($kind === 'period') {
            $data = $request->validate(['id' => ['nullable', 'uuid', 'exists:periode,id'], 'nama_periode' => ['required', 'string', 'max:150'], 'status' => ['required', 'in:aktif,nonaktif'], 'angkatan_maba' => ['required', 'integer', 'min:2026', 'max:2099'], 'reservation_hours' => ['required', 'integer', 'min:1', 'max:720'], 'tanggal_mulai' => ['required', 'date'], 'tanggal_selesai' => ['required', 'date', 'after_or_equal:tanggal_mulai']]);
            $id = $data['id'] ?? null;
            unset($data['id']);
            $id ? MasterDataService::updatePeriode(Periode::query()->whereKey($id)->firstOrFail(), $data) : MasterDataService::createPeriode($data);
        } else {
            abort(404);
        }

        return back()->with('toast', ['type' => 'success', 'message' => 'Pengaturan layanan disimpan.']);
    }

    /** @param array<string, mixed> $input */
    private function saveLegacy(array $input, string $officer): LegacyResident
    {
        $data = Validator::make($input, [
            'nim' => ['required', 'string', 'max:50'], 'nama' => ['required', 'string', 'max:255'],
            'gedung_id' => ['required', 'uuid', 'exists:gedung,id'], 'checked_out_at' => ['nullable', 'date', 'before_or_equal:today'], 'notes' => ['nullable', 'string', 'max:2000'],
        ])->validate();
        $year = (int) StudentCohort::fromNim($data['nim']);
        if ($year > 2025) {
            throw ValidationException::withMessages(['nim' => 'Arsip alumni lama hanya untuk angkatan 2025 dan sebelumnya.']);
        }

        return LegacyResident::updateOrCreate(['nim' => $data['nim']], [...$data, 'angkatan' => $year, 'recorded_by' => $officer]);
    }

    public function import(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'free-residence.review');
        $request->validate(['file' => ['required', 'file', 'mimes:xlsx,xls,csv,txt', 'max:5120']]);
        try {
            $reader = IOFactory::createReader(IOFactory::identify($request->file('file')->getRealPath(), ['Xlsx', 'Xls', 'Csv']));
            $reader->setReadDataOnly(true);
            $info = $reader->listWorksheetInfo($request->file('file')->getRealPath());
            if (count($info) !== 1 || $info[0]['totalRows'] > 501 || $info[0]['totalColumns'] !== 5) {
                throw new \RuntimeException('Gunakan satu sheet, maksimal 500 baris dengan kolom nim,nama,kode_gedung,checked_out_at,notes.');
            }
            $book = $reader->load($request->file('file')->getRealPath());
            $rows = $book->getSheet(0)->toArray(null, false, false);
            $book->disconnectWorksheets();
        } catch (\Throwable $exception) {
            throw ValidationException::withMessages(['file' => 'Berkas tidak dapat dibaca. Gunakan template lima kolom, satu sheet, maksimal 500 baris.']);
        }
        if (array_shift($rows) !== ['nim', 'nama', 'kode_gedung', 'checked_out_at', 'notes']) {
            throw ValidationException::withMessages(['file' => 'Kolom harus nim,nama,kode_gedung,checked_out_at,notes. Tanggal memakai YYYY-MM-DD.']);
        }
        DB::transaction(function () use ($rows, $request): void {
            $seen = [];
            foreach ($rows as $index => $row) {
                if (! array_filter($row)) {
                    continue;
                }
                $nim = (string) $row[0];
                if (isset($seen[$nim]) || LegacyResident::where('nim', $nim)->exists()) {
                    throw ValidationException::withMessages(['file' => 'Baris '.($index + 2).': NIM duplikat. Perbarui data melalui formulir.']);
                }
                $seen[$nim] = true;
                try {
                    $this->saveLegacy(['nim' => $nim, 'nama' => $row[1], 'gedung_id' => Gedung::where('kode_gedung', $row[2])->value('id'), 'checked_out_at' => $row[3] ?: null, 'notes' => $row[4]], $request->user()->id);
                } catch (ValidationException $exception) {
                    throw ValidationException::withMessages(['file' => 'Baris '.($index + 2).': '.collect($exception->errors())->flatten()->implode(' ')]);
                }
            }
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Arsip alumni berhasil diimpor.']);
    }

    public function approveSponsor(Request $request, ResidenceRegistration $registration): RedirectResponse
    {
        $this->authorizePermission($request, 'registration.review');
        $data = $request->validate(['kamar_id' => ['nullable', 'uuid', 'exists:kamar,id'], 'sponsor_name' => ['required', 'string', 'max:255']]);
        DB::transaction(function () use ($request, $registration, $data): void {
            $registration = ResidenceRegistration::query()->lockForUpdate()->findOrFail($registration->id);
            if ($registration->completed_at || $registration->status->value === 'rejected' || $registration->funding !== 'sponsor') {
                throw ValidationException::withMessages(['sponsor_name' => 'Pendaftaran ini tidak menunggu pengesahan sponsor.']);
            }
            $roomId = $registration->reserved_room_id ?? $data['kamar_id'] ?? null;
            if (! $roomId) {
                throw ValidationException::withMessages(['kamar_id' => 'Pilih kamar untuk penempatan KIP-K.']);
            }
            $room = Kamar::query()->lockForUpdate()->whereKey($roomId)->firstOrFail();
            RoomEligibility::validate($room, $registration->studentProfile->user, 'kamar_id', $registration->id);
            $registration->update(['reserved_room_id' => $roomId, 'sponsor_name' => $data['sponsor_name'], 'sponsor_approved_at' => now(), 'reviewed_by' => $request->user()->id]);
            $invoice = $registration->tagihan;
            if ($registration->is_kipk && ! ($invoice->residence_snapshot['building'] ?? null)) {
                $rate = ResidenceRate::where('gedung_id', $room->lantai->gedung_id)->where('tipe_kamar', $room->tipe_kamar)->where('unit', 'period')->value('amount') ?? $room->tarif_per_periode;
                if ((float) $rate <= 0) {
                    throw ValidationException::withMessages(['kamar_id' => 'Tetapkan tarif kamar sebelum penempatan.']);
                }
                $invoice->update(['subtotal' => $rate, 'total_penyesuaian' => -(float) $rate, 'sponsor_total' => $rate, 'sponsor_name' => $data['sponsor_name'], 'residence_snapshot' => [...($invoice->residence_snapshot ?? []), 'building' => $room->lantai->gedung->nama_gedung, 'room' => $room->nomor_kamar, 'type' => $room->tipe_kamar, 'amount' => $rate]]);
                $invoice->items()->update(['harga_satuan' => $rate, 'jumlah' => $rate]);
                $invoice->penyesuaian()->create(['sumber' => 'kipk_sponsor', 'deskripsi' => 'Ditanggung KIP-K', 'jumlah' => -(float) $rate]);
            }
            app(CompleteResidenceRegistration::class)->handle($registration);
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Penanggung biaya disahkan dan penempatan diselesaikan.']);
    }
}
