<?php

namespace App\Http\Controllers;

use App\Models\Aset;
use App\Models\FasilitasUmum;
use App\Models\Kamar;
use App\Models\RoomInspectionFinding;
use App\Models\StokAset;
use App\Models\User;
use App\Services\ResidenceBuildingAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AsetController extends Controller
{
    private const IMPORT_COLUMNS = ['kode_gedung', 'nomor_lantai', 'nomor_kamar', 'kode_stok', 'jumlah', 'kode_inventaris', 'kondisi'];

    public function store(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'aset.create');
        $this->saveAsset($request->user(), $request->all());

        return back()->with('toast', ['type' => 'success', 'message' => 'Aset berhasil ditempatkan.']);
    }

    public function update(Request $request, Aset $aset): RedirectResponse
    {
        $this->authorizePermission($request, 'aset.update');
        $this->saveAsset($request->user(), $request->all(), $aset);

        return back()->with('toast', ['type' => 'success', 'message' => 'Pendataan aset diperbarui.']);
    }

    private function saveAsset(User $user, array $input, ?Aset $asset = null): Aset
    {
        $data = Validator::make($input, [
            'stok_aset_id' => ['required', 'uuid', 'exists:stok_aset,id'],
            'jumlah' => ['required', 'integer', 'min:1', 'max:1000000'],
            'kamar_id' => ['nullable', 'required_without:fasilitas_umum_id', 'prohibits:fasilitas_umum_id', 'uuid', 'exists:kamar,id'],
            'fasilitas_umum_id' => ['nullable', 'required_without:kamar_id', 'prohibits:kamar_id', 'uuid', 'exists:fasilitas_umum,id'],
            'kode_inventaris' => ['required', 'string', 'max:50', Rule::unique('aset', 'kode_inventaris')->ignore($asset)],
            'kondisi' => ['required', 'in:baik,rusak_ringan,rusak_berat,hilang'],
            'nilai_aset' => ['nullable', 'numeric', 'min:0'],
        ])->validate();
        $this->authorizeLocation($user, $data['kamar_id'] ?? null, $data['fasilitas_umum_id'] ?? null);
        if ($asset) {
            $this->authorizeLocation($user, $asset->kamar_id, $asset->fasilitas_umum_id);
            if ($asset->stok_aset_id && $asset->stok_aset_id !== $data['stok_aset_id']) {
                throw ValidationException::withMessages(['stok_aset_id' => 'Jenis stok pada pendataan yang sudah tersimpan tidak dapat diganti.']);
            }
        }

        return DB::transaction(function () use ($asset, $data): Aset {
            $stock = StokAset::lockForUpdate()->findOrFail($data['stok_aset_id']);
            $asset = $asset ? Aset::lockForUpdate()->findOrFail($asset->id) : new Aset;
            $allocated = (int) $stock->aset()->when($asset->exists, fn ($query) => $query->where('id', '!=', $asset->id))->sum('jumlah');
            if ($allocated + $data['jumlah'] > $stock->jumlah_total) {
                throw ValidationException::withMessages(['jumlah' => 'Jumlah melebihi stok tersedia ('.max(0, $stock->jumlah_total - $allocated).').']);
            }
            $asset->fill([...$data, 'nama_aset' => $stock->nama, 'kategori' => $stock->kategori])->save();

            return $asset;
        });
    }

    private function authorizeLocation(User $user, ?string $roomId, ?string $facilityId): void
    {
        if (! $user->hasRole('fasilitator') || $user->hasRole('superadmin')) {
            return;
        }
        $buildingId = $roomId ? Kamar::with('lantai')->findOrFail($roomId)->lantai->gedung_id : FasilitasUmum::findOrFail($facilityId)->gedung_id;
        abort_unless(ResidenceBuildingAccess::allows($user, $buildingId), 403);
    }

    public function destroy(Request $request, Aset $aset): RedirectResponse
    {
        $this->authorizePermission($request, 'aset.delete');
        $this->authorizeLocation($request->user(), $aset->kamar_id, $aset->fasilitas_umum_id);
        DB::transaction(function () use ($aset): void {
            StokAset::whereKey($aset->stok_aset_id)->lockForUpdate()->first();
            $asset = Aset::lockForUpdate()->findOrFail($aset->id);
            if ($asset->laporanKerusakan()->exists() || RoomInspectionFinding::where('aset_id', $asset->id)->exists()) {
                throw ValidationException::withMessages(['aset' => 'Aset memiliki riwayat kerusakan atau inspeksi dan tidak dapat dihapus.']);
            }
            $asset->delete();
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Pendataan aset dihapus; jumlah tersedia kembali ke stok.']);
    }

    public function template(Request $request): StreamedResponse
    {
        $this->authorizePermission($request, 'aset.create');

        return response()->streamDownload(function (): void {
            $output = fopen('php://output', 'w');
            fputcsv($output, self::IMPORT_COLUMNS, ',', '"', '');
            fclose($output);
        }, 'template-aset-kamar.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    public function import(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'aset.create');
        $request->validate(['file' => ['required', 'file', 'mimes:xlsx,xls,csv,txt', 'max:5120']]);
        try {
            $type = IOFactory::identify($request->file('file')->getRealPath(), ['Xlsx', 'Xls', 'Csv']);
            $reader = IOFactory::createReader($type);
            $reader->setReadDataOnly(true);
            $sheets = $reader->listWorksheetInfo($request->file('file')->getRealPath());
            if (count($sheets) !== 1 || $sheets[0]['totalRows'] > 501 || $sheets[0]['totalColumns'] > 7) {
                throw ValidationException::withMessages(['file' => 'Gunakan satu sheet dengan maksimal 500 baris data dan 7 kolom sesuai template.']);
            }
            $book = $reader->load($request->file('file')->getRealPath());
            $rows = $book->getSheet(0)->toArray(null, false, false);
            $book->disconnectWorksheets();
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (\Throwable $exception) {
            throw ValidationException::withMessages(['file' => 'Berkas tidak dapat dibaca. Gunakan Excel atau CSV sesuai template.']);
        }
        if (array_map(fn ($value): string => trim((string) $value), array_shift($rows) ?? []) !== self::IMPORT_COLUMNS) {
            throw ValidationException::withMessages(['file' => 'Judul dan urutan kolom harus sesuai template.']);
        }
        $count = DB::transaction(function () use ($rows, $request): int {
            $count = 0;
            foreach ($rows as $index => $row) {
                if (! array_filter($row, fn ($value): bool => $value !== null && $value !== '')) {
                    continue;
                }
                $values = array_combine(self::IMPORT_COLUMNS, array_pad($row, 7, null));
                $room = Kamar::where('nomor_kamar', (string) $values['nomor_kamar'])
                    ->whereHas('lantai', fn ($query) => $query->where('nomor_lantai', $values['nomor_lantai'])->whereHas('gedung', fn ($building) => $building->where('kode_gedung', $values['kode_gedung'])))->first();
                $stock = StokAset::where('kode', $values['kode_stok'])->first();
                if (! $room || ! $stock) {
                    throw ValidationException::withMessages(['file' => 'Baris '.($index + 2).': kamar atau kode stok tidak ditemukan.']);
                }
                try {
                    $this->saveAsset($request->user(), ['kamar_id' => $room->id, 'stok_aset_id' => $stock->id, 'jumlah' => $values['jumlah'], 'kode_inventaris' => (string) $values['kode_inventaris'], 'kondisi' => $values['kondisi'] ?: 'baik']);
                } catch (ValidationException $exception) {
                    throw ValidationException::withMessages(['file' => 'Baris '.($index + 2).': '.collect($exception->errors())->flatten()->implode(' ')]);
                }
                $count++;
            }
            if ($count === 0) {
                throw ValidationException::withMessages(['file' => 'Berkas tidak berisi data aset.']);
            }

            return $count;
        });

        return back()->with('toast', ['type' => 'success', 'message' => $count.' pendataan aset berhasil diimpor.']);
    }
}
