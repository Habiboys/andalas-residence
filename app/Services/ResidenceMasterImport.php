<?php

namespace App\Services;

use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\ResidenceRate;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ResidenceMasterImport
{
    /** @return array{buildings: list<array<string, mixed>>, warnings: list<string>} */
    public function read(string $path): array
    {
        $reader = IOFactory::createReader('Xlsx');
        $reader->setReadDataOnly(true);
        $book = $reader->load($path);
        $buildings = [];
        $warnings = [];
        try {
            foreach ($book->getWorksheetIterator() as $sheet) {
                $name = trim($sheet->getTitle());
                if ($name === 'Template') {
                    continue;
                }
                $match = [];
                if (! preg_match('/\(([A-Za-z0-9_-]{1,10})\)$/', $name, $match) && ! in_array($name, ['ASN', 'Nakes'], true)) {
                    throw new \InvalidArgumentException('Sheet gedung tidak dikenal: '.$name);
                }
                $code = $match[1] ?? $name;
                $rows = $sheet->toArray(null, false, false, true);
                $categories = [];
                foreach ([2 => 'local_kipk', 3 => 'local_non_kipk', 4 => 'student', 5 => 'international_student', 6 => 'international_free_facility', 7 => 'non_student', 8 => 'summer_course'] as $row => $category) {
                    if ((bool) ($rows[$row]['I'] ?? false)) {
                        $categories[] = $category;
                    }
                }
                $rates = [];
                foreach (range(13, 17) as $row) {
                    $values = $rows[$row] ?? [];
                    if (! ($values['J'] ?? false)) {
                        continue;
                    }
                    $type = strtolower(str_replace(' ', '_', trim((string) ($values['G'] ?? ''))));
                    if (! in_array($type, ['standar', 'medium', 'premium', 'umum', 'umum_vip'], true)) {
                        throw new \InvalidArgumentException($name.' baris '.$row.': tipe tarif tidak dikenal.');
                    }
                    foreach (['year' => ['L', 'K'], 'month' => ['M', null], 'day' => ['O', null]] as $unit => [$column, $roomColumn]) {
                        $amount = $values[$column] ?? null;
                        $studentAmount = $unit === 'day' ? ($values['N'] ?? null) : null;
                        if ($amount === null && $studentAmount === null) {
                            continue;
                        }
                        $roomAmount = $roomColumn ? ($values[$roomColumn] ?? null) : null;
                        foreach ([$amount, $studentAmount, $roomAmount] as $price) {
                            if ($price !== null && (! is_numeric($price) || (float) $price < 0 || floor((float) $price) !== (float) $price)) {
                                throw new \InvalidArgumentException($name.' baris '.$row.': tarif harus angka bulat nonnegatif.');
                            }
                        }
                        $rates[] = ['tipe_kamar' => $type, 'unit' => $unit, 'amount' => $amount ?? 0,
                            'student_amount' => $unit === 'day' ? ($studentAmount ?? 0) : null, 'room_amount' => $roomAmount,
                            'facilities' => trim((string) ($values['H'] ?? ''))];
                    }
                }
                $rooms = [];
                $seen = [];
                foreach ($rows as $row => $values) {
                    if ($row < 3 || ($values['B'] ?? null) === null) {
                        continue;
                    }
                    $number = is_int($values['B']) || is_float($values['B']) ? (string) (int) $values['B'] : trim((string) $values['B']);
                    $floor = (int) ($values['D'] ?? 0);
                    $capacityText = trim((string) ($values['E'] ?? ''));
                    $capacity = preg_match('/^\d+/', $capacityText, $capacityMatch) ? (int) $capacityMatch[0] : 0;
                    $type = strtolower(str_replace(' ', '_', trim((string) ($values['C'] ?? ''))));
                    if ($floor < 1 || ! in_array($type, ['standar', 'medium', 'premium', 'umum', 'umum_vip'], true)) {
                        throw new \InvalidArgumentException($name.' baris '.$row.': lantai, tipe, atau nomor kamar tidak valid/duplikat.');
                    }
                    $roomData = ['nomor_kamar' => $number, 'nomor_lantai' => $floor, 'kapasitas' => $capacity, 'tipe_kamar' => $type];
                    if (isset($seen[$number])) {
                        if ($seen[$number] !== $roomData) {
                            throw new \InvalidArgumentException($name.' baris '.$row.': nomor kamar duplikat dengan data berbeda.');
                        }
                        $warnings[] = $name.' baris '.$row.': kamar '.$number.' duplikat identik, hanya dimasukkan sekali.';

                        continue;
                    }
                    $seen[$number] = $roomData;
                    if ($capacity === 0) {
                        $warnings[] = $name.' / '.$number.': kapasitas belum diisi; kamar diblokir sampai kapasitas dilengkapi.';
                    }
                    $rooms[] = $roomData;
                }
                $buildings[] = ['kode_gedung' => $code, 'nama_gedung' => $name, 'allowed_categories' => $categories, 'rooms' => $rooms, 'rates' => $rates];
            }
        } finally {
            $book->disconnectWorksheets();
        }

        return compact('buildings', 'warnings');
    }

    /** @param list<array<string, mixed>> $buildings */
    public function apply(array $buildings): void
    {
        DB::transaction(function () use ($buildings): void {
            foreach ($buildings as $data) {
                $building = Gedung::updateOrCreate(['kode_gedung' => $data['kode_gedung']], [
                    'nama_gedung' => $data['nama_gedung'], 'allowed_categories' => $data['allowed_categories'], 'alamat' => 'Kampus Limau Manis',
                ]);
                foreach ($data['rates'] as $rate) {
                    ResidenceRate::updateOrCreate(['gedung_id' => $building->id, 'tipe_kamar' => $rate['tipe_kamar'], 'unit' => $rate['unit']], $rate);
                }
                foreach ($data['rooms'] as $roomData) {
                    $floor = Lantai::firstOrCreate(['gedung_id' => $building->id, 'nomor_lantai' => $roomData['nomor_lantai']], ['nama_lantai' => 'Lantai '.$roomData['nomor_lantai']]);
                    $room = Kamar::firstOrNew(['lantai_id' => $floor->id, 'nomor_kamar' => $roomData['nomor_kamar']]);
                    $active = $room->exists ? $room->penempatanKamar()->where('status', 'aktif')->count() : 0;
                    $reserved = $room->exists ? app(RoomReservations::class)->count($room) : 0;
                    if ($roomData['kapasitas'] < $active + $reserved) {
                        throw new \LogicException('Kapasitas '.$building->nama_gedung.' / '.$roomData['nomor_kamar'].' lebih kecil dari penghuni/reservasi aktif. Tidak ada data yang diubah.');
                    }
                    $annual = collect($data['rates'])->first(fn (array $rate): bool => $rate['tipe_kamar'] === $roomData['tipe_kamar'] && $rate['unit'] === 'year');
                    $status = $room->exists && $room->status === 'maintenance' ? 'maintenance' : ($roomData['kapasitas'] === 0 ? 'maintenance' : ($active === 0 ? 'kosong' : ($active >= $roomData['kapasitas'] ? 'penuh' : 'terisi_sebagian')));
                    $room->fill(['kapasitas' => $roomData['kapasitas'], 'tipe_kamar' => $roomData['tipe_kamar'], 'tarif_per_periode' => $annual['amount'] ?? 0, 'status' => $status])->save();
                }
            }
        });
    }
}
