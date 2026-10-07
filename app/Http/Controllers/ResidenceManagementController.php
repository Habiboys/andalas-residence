<?php

namespace App\Http\Controllers;

use App\Actions\Registration\CompleteResidenceRegistration;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\KipkRecipient;
use App\Models\Lantai;
use App\Models\LegacyResidenceRate;
use App\Models\LegacyResident;
use App\Models\Periode;
use App\Models\ResidenceRate;
use App\Models\ResidenceRegistration;
use App\Services\MasterDataService;
use App\Services\RoomEligibility;
use App\Services\RoomReservations;
use App\Services\StudentCohort;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ResidenceManagementController extends Controller
{
    public function save(Request $request, string $kind): RedirectResponse
    {
        $this->authorizePermission($request, in_array($kind, ['legacy', 'legacy-rate'], true) ? 'free-residence.review' : 'registration.review');
        if (in_array($kind, ['legacy', 'legacy-rate', 'rate'], true) && $request->filled('gedung_id') && ! Str::isUuid((string) $request->input('gedung_id'))) {
            $buildingValue = trim((string) $request->input('gedung_id'));
            $buildingId = Gedung::query()
                ->where('kode_gedung', $buildingValue)
                ->orWhere('nama_gedung', $buildingValue)
                ->value('id');
            $request->merge(['gedung_id' => $buildingId ?? $buildingValue]);
        }
        if ($kind === 'legacy') {
            $this->saveLegacy($request->all(), $request->user()->id);
        } elseif ($kind === 'legacy-rate') {
            $data = $request->validate(['angkatan' => ['required', 'integer', 'min:1950', 'max:2100'], 'gedung_id' => ['required', 'uuid', 'exists:gedung,id'], 'jumlah' => ['required', 'integer', 'min:1']]);
            LegacyResidenceRate::updateOrCreate(['angkatan' => $data['angkatan'], 'gedung_id' => $data['gedung_id']], ['jumlah' => $data['jumlah']]);
        } elseif ($kind === 'kipk') {
            $data = $request->validate(['nim' => ['required', 'string', 'max:50'], 'nama' => ['required', 'string', 'max:255']]);
            KipkRecipient::updateOrCreate(['nim' => $data['nim'], 'angkatan' => StudentCohort::fromNim($data['nim'])], ['nama' => $data['nama']]);
        } elseif ($kind === 'rate') {
            $data = $request->validate(['gedung_id' => ['required', 'uuid', 'exists:gedung,id'], 'tipe_kamar' => ['required', 'in:standar,medium,premium,umum,umum_vip'], 'unit' => ['required', 'in:year,month,day'], 'amount' => ['required', 'integer', 'min:0'], 'student_amount' => ['nullable', 'integer', 'min:0'], 'room_amount' => ['nullable', 'integer', 'min:0'], 'facilities' => ['nullable', 'string', 'max:2000']]);
            ResidenceRate::updateOrCreate(
                ['gedung_id' => $data['gedung_id'], 'tipe_kamar' => $data['tipe_kamar'], 'unit' => $data['unit']],
                ['amount' => $data['amount'], 'facilities' => $data['facilities'] ?? null, ...array_intersect_key($data, ['student_amount' => true, 'room_amount' => true])],
            );
            ResidenceRate::query()
                ->where('gedung_id', $data['gedung_id'])
                ->where('tipe_kamar', $data['tipe_kamar'])
                ->update(['facilities' => $data['facilities'] ?? null]);
        } elseif ($kind === 'building') {
            $data = $request->validate([
                'gedung_id' => ['nullable', 'uuid', 'exists:gedung,id'],
                'kode_gedung' => ['required_without:gedung_id', 'nullable', 'string', 'max:10', Rule::unique('gedung', 'kode_gedung')->ignore($request->input('gedung_id'))],
                'nama_gedung' => ['nullable', 'required_without:gedung_id', 'string', 'max:150'],
                'gender_peruntukan' => ['nullable', 'in:laki_laki,perempuan,campur'],
                'allowed_categories' => ['required', 'array', 'min:1'],
                'allowed_categories.*' => ['required', Rule::in(['local_kipk', 'local_non_kipk', 'student', 'international_student', 'international_free_facility', 'non_student', 'summer_course'])],
            ]);
            $building = ! empty($data['gedung_id']) ? Gedung::findOrFail($data['gedung_id']) : new Gedung;
            $building->fill(array_filter(array_diff_key($data, ['gedung_id' => true]), fn (mixed $value): bool => $value !== null))->save();
        } elseif ($kind === 'room') {
            $data = $request->validate([
                'id' => ['nullable', 'uuid', 'exists:kamar,id'], 'gedung_id' => ['required', 'uuid', 'exists:gedung,id'],
                'nomor_lantai' => ['required', 'integer', 'min:1', 'max:100'], 'nomor_kamar' => ['required', 'string', 'max:50'],
                'tipe_kamar' => ['required', 'in:standar,medium,premium,umum,umum_vip'], 'kapasitas' => ['required', 'integer', 'min:1', 'max:100'],
                'status' => ['required', 'in:kosong,terisi_sebagian,penuh,maintenance'],
            ]);
            DB::transaction(function () use ($data): void {
                $building = Gedung::query()->lockForUpdate()->findOrFail($data['gedung_id']);
                $floor = Lantai::firstOrCreate(['gedung_id' => $building->id, 'nomor_lantai' => $data['nomor_lantai']], ['nama_lantai' => 'Lantai '.$data['nomor_lantai']]);
                $room = ! empty($data['id']) ? Kamar::query()->lockForUpdate()->findOrFail($data['id']) : new Kamar;
                if (Kamar::where('lantai_id', $floor->id)->where('nomor_kamar', $data['nomor_kamar'])->when($room->exists, fn ($query) => $query->whereKeyNot($room->id))->exists()) {
                    throw ValidationException::withMessages(['nomor_kamar' => 'Nomor kamar sudah digunakan di lantai ini.']);
                }
                $active = $room->exists ? $room->penempatanKamar()->where('status', 'aktif')->count() : 0;
                $reserved = $room->exists ? app(RoomReservations::class)->count($room) : 0;
                if ($room->exists && $room->lantai_id !== $floor->id && $active + $reserved > 0) {
                    throw ValidationException::withMessages(['gedung_id' => 'Kamar berpenghuni atau direservasi tidak dapat dipindahkan ke lantai/gedung lain.']);
                }
                if ($active + $reserved > (int) $data['kapasitas']) {
                    throw ValidationException::withMessages(['kapasitas' => 'Kapasitas tidak boleh kurang dari penghuni dan reservasi aktif.']);
                }
                $status = $data['status'] === 'maintenance' ? 'maintenance' : ($active === 0 ? 'kosong' : ($active >= (int) $data['kapasitas'] ? 'penuh' : 'terisi_sebagian'));
                $room->fill(['lantai_id' => $floor->id, 'nomor_kamar' => $data['nomor_kamar'], 'tipe_kamar' => $data['tipe_kamar'], 'kapasitas' => $data['kapasitas'], 'status' => $status])->save();
            });
        } elseif ($kind === 'period') {
            $data = $request->validate(['id' => ['nullable', 'uuid', 'exists:periode,id'], 'nama_periode' => ['required', 'regex:/^20\d{2}\/(?:20\d{2}|2100)$/', 'max:10'], 'status' => ['required', 'in:aktif,nonaktif'], 'reservation_hours' => ['required', 'integer', 'min:1', 'max:720'], 'tanggal_mulai' => ['required', 'date'], 'tanggal_selesai' => ['required', 'date', 'after_or_equal:tanggal_mulai']]);
            if ((int) substr($data['nama_periode'], 5, 4) !== (int) substr($data['nama_periode'], 0, 4) + 1) {
                throw ValidationException::withMessages(['nama_periode' => 'Pilih rentang tahun ajaran yang berurutan.']);
            }
            $data['angkatan_maba'] = (int) substr($data['nama_periode'], 0, 4);
            $id = $data['id'] ?? null;
            unset($data['id']);
            $id ? MasterDataService::updatePeriode(Periode::query()->whereKey($id)->firstOrFail(), $data) : MasterDataService::createPeriode($data);
        } else {
            abort(404);
        }

        return back()->with('toast', ['type' => 'success', 'message' => 'Pengaturan layanan disimpan.']);
    }

    public function destroy(Request $request, string $kind): RedirectResponse
    {
        $this->authorizePermission($request, in_array($kind, ['legacy', 'legacy-rate'], true) ? 'free-residence.review' : 'registration.review');

        if ($kind === 'legacy') {
            $data = $request->validate(['nim' => ['required', 'string', 'max:50']]);
            LegacyResident::query()->where('nim', $data['nim'])->firstOrFail()->delete();
        } elseif ($kind === 'legacy-rate') {
            $data = $request->validate(['angkatan' => ['required', 'integer'], 'gedung_id' => ['required', 'uuid', 'exists:gedung,id']]);
            LegacyResidenceRate::query()->where($data)->firstOrFail()->delete();
        } elseif ($kind === 'kipk') {
            $data = $request->validate(['nim' => ['required', 'string', 'max:50']]);
            KipkRecipient::query()->where('nim', $data['nim'])->firstOrFail()->delete();
        } elseif ($kind === 'rate') {
            $data = $request->validate([
                'gedung_id' => ['required', 'uuid', 'exists:gedung,id'],
                'tipe_kamar' => ['required', 'in:standar,medium,premium,umum,umum_vip'],
                'unit' => ['required', 'in:year,month,day'],
            ]);
            ResidenceRate::query()->where($data)->firstOrFail()->delete();
        } elseif ($kind === 'building') {
            $data = $request->validate(['gedung_id' => ['required', 'uuid', 'exists:gedung,id']]);
            Gedung::query()->whereKey($data['gedung_id'])->firstOrFail()->update(['allowed_categories' => null]);
        } elseif ($kind === 'period') {
            $data = $request->validate(['id' => ['required', 'uuid', 'exists:periode,id']]);
            MasterDataService::deletePeriode(Periode::query()->whereKey($data['id'])->firstOrFail());
        } else {
            abort(404);
        }

        return back()->with('toast', ['type' => 'success', 'message' => 'Data pengaturan dihapus.']);
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
            if (count($info) !== 1 || $info[0]['totalRows'] > 501 || $info[0]['totalColumns'] !== 3) {
                throw new \RuntimeException('Gunakan satu sheet, maksimal 500 baris dengan kolom nim,nama,gedung.');
            }
            $book = $reader->load($request->file('file')->getRealPath());
            $rows = $book->getSheet(0)->toArray(null, false, false);
            $book->disconnectWorksheets();
        } catch (\Throwable $exception) {
            throw ValidationException::withMessages(['file' => 'Berkas tidak dapat dibaca. Gunakan template tiga kolom, satu sheet, maksimal 500 baris.']);
        }
        if (array_shift($rows) !== ['nama', 'nim', 'gedung']) {
            throw ValidationException::withMessages(['file' => 'Kolom harus nama,nim,gedung.']);
        }
        DB::transaction(function () use ($rows, $request): void {
            $seen = [];
            foreach ($rows as $index => $row) {
                if (! array_filter($row)) {
                    continue;
                }
                $nim = (string) $row[1];
                if (isset($seen[$nim]) || LegacyResident::where('nim', $nim)->exists()) {
                    throw ValidationException::withMessages(['file' => 'Baris '.($index + 2).': NIM duplikat. Perbarui data melalui formulir.']);
                }
                $seen[$nim] = true;
                try {
                    $building = Gedung::query()->where('kode_gedung', trim((string) $row[2]))
                        ->orWhere('nama_gedung', trim((string) $row[2]))
                        ->first();
                    if (! $building) {
                        throw ValidationException::withMessages(['gedung_id' => 'Gedung tidak ditemukan.']);
                    }
                    $this->saveLegacy(['nim' => $nim, 'nama' => $row[0], 'gedung_id' => $building->id], $request->user()->id);
                } catch (ValidationException $exception) {
                    throw ValidationException::withMessages(['file' => 'Baris '.($index + 2).': '.collect($exception->errors())->flatten()->implode(' ')]);
                }
            }
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Arsip alumni berhasil diimpor.']);
    }

    public function importKipk(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'registration.review');
        $request->validate(['file' => ['required', 'file', 'mimes:xlsx,xls,csv,txt', 'max:5120']]);
        try {
            $path = $request->file('file')->getRealPath();
            $reader = IOFactory::createReader(IOFactory::identify($path, ['Xlsx', 'Xls', 'Csv']));
            $reader->setReadDataOnly(true);
            $info = $reader->listWorksheetInfo($path);
            if (count($info) !== 1 || $info[0]['totalRows'] > 501 || $info[0]['totalColumns'] !== 2) {
                throw new \RuntimeException;
            }
            $book = $reader->load($path);
            try {
                $rows = $book->getSheet(0)->toArray(null, false, false);
            } finally {
                $book->disconnectWorksheets();
            }
        } catch (\Throwable $exception) {
            throw ValidationException::withMessages(['file' => 'Gunakan Excel/CSV dua kolom nama,nim, satu sheet, maksimal 500 baris.']);
        }
        if (array_map(fn (mixed $value): string => strtolower(trim((string) $value)), array_shift($rows) ?? []) !== ['nama', 'nim']) {
            throw ValidationException::withMessages(['file' => 'Kolom harus nama,nim.']);
        }
        DB::transaction(function () use ($rows): void {
            $seen = [];
            foreach ($rows as $index => $row) {
                if (! array_filter($row, fn (mixed $value): bool => $value !== null && $value !== '')) {
                    continue;
                }
                try {
                    $data = Validator::make(['nama' => $row[0], 'nim' => (string) $row[1]], ['nama' => ['required', 'string', 'max:255'], 'nim' => ['required', 'string', 'max:50']])->validate();
                    $year = StudentCohort::fromNim($data['nim']);
                    if (isset($seen[$data['nim']])) {
                        throw ValidationException::withMessages(['nim' => 'NIM duplikat dalam berkas.']);
                    }
                    $seen[$data['nim']] = true;
                    KipkRecipient::updateOrCreate(['nim' => $data['nim'], 'angkatan' => $year], ['nama' => $data['nama']]);
                } catch (ValidationException $exception) {
                    throw ValidationException::withMessages(['file' => 'Baris '.($index + 2).': '.collect($exception->errors())->flatten()->implode(' ')]);
                }
            }
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Penerima KIP-K berhasil diimpor.']);
    }

    public function kipkTemplate(Request $request): StreamedResponse
    {
        $this->authorizePermission($request, 'registration.review');

        return response()->streamDownload(function (): void {
            $book = new Spreadsheet;
            $book->getActiveSheet()->fromArray([['nama', 'nim']]);
            $book->getActiveSheet()->getStyle('B:B')->getNumberFormat()->setFormatCode('@');
            (new Xlsx($book))->save('php://output');
            $book->disconnectWorksheets();
        }, 'template-penerima-kipk.xlsx', ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
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
                $rate = ResidenceRate::where('gedung_id', $room->lantai->gedung_id)->where('tipe_kamar', $room->tipe_kamar)->where('unit', 'year')->value('amount') ?? $room->tarif_per_periode;
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
