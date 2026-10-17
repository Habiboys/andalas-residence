<?php

namespace App\Services;

use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\ResidenceRate;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
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
                $roomTypes = [];
                foreach (range(13, 17) as $row) {
                    $values = $rows[$row] ?? [];
                    if (! ($values['G'] ?? null)) {
                        continue;
                    }
                    $type = strtolower(str_replace(' ', '_', trim((string) ($values['G'] ?? ''))));
                    if (! in_array($type, ['standar', 'medium', 'premium', 'umum', 'umum_vip'], true)) {
                        throw new \InvalidArgumentException($name.' baris '.$row.': tipe tarif tidak dikenal.');
                    }
                    $capacityText = trim((string) ($values['I'] ?? ''));
                    $maxCapacity = preg_match('/^([1-9]\d*)(?:\s+orang)?$/i', $capacityText, $capacityMatch) ? (int) $capacityMatch[1] : null;
                    if ($capacityText !== '' && $maxCapacity === null) {
                        throw new \InvalidArgumentException($name.' baris '.$row.': kapasitas maksimal tidak valid.');
                    }
                    $roomTypes[] = ['type' => $type, 'enabled' => (bool) ($values['J'] ?? false), 'max_capacity' => $maxCapacity, 'facilities' => trim((string) ($values['H'] ?? ''))];
                    if (! ($values['J'] ?? false)) {
                        continue;
                    }
                    foreach (['year' => ['L', 'K'], 'month' => ['M', null], 'day' => ['O', null]] as $unit => [$column, $roomColumn]) {
                        $amount = $values[$column] ?? null;
                        $studentAmount = $unit === 'day' ? ($values['N'] ?? null) : null;
                        $roomAmount = $roomColumn ? ($values[$roomColumn] ?? null) : null;
                        if ($amount === null && $studentAmount === null && $roomAmount === null) {
                            continue;
                        }
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
                    $assumedCapacity = $code === 'ASN' && $capacityText === '';
                    if ($assumedCapacity) {
                        $capacity = 2;
                    }
                    $type = strtolower(str_replace(' ', '_', trim((string) ($values['C'] ?? ''))));
                    if ($floor < 1 || ! in_array($type, ['standar', 'medium', 'premium', 'umum', 'umum_vip'], true)) {
                        throw new \InvalidArgumentException($name.' baris '.$row.': lantai, tipe, atau nomor kamar tidak valid/duplikat.');
                    }
                    $roomData = ['nomor_kamar' => $number, 'nomor_lantai' => $floor, 'kapasitas' => $capacity, 'tipe_kamar' => $type];
                    if ($assumedCapacity) {
                        $roomData['assumed_capacity'] = true;
                    }
                    $definition = collect($roomTypes)->firstWhere('type', $type);
                    if (! ($definition['enabled'] ?? false)) {
                        $warnings[] = $name.' / '.$number.': tipe tidak aktif; kamar diblokir sampai data diperbaiki.';
                        $roomData['blocked'] = true;
                    }
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
                foreach ($roomTypes as &$roomType) {
                    $roomType['max_capacity'] = max($roomType['max_capacity'] ?? 0, collect($rooms)->where('tipe_kamar', $roomType['type'])->max('kapasitas') ?? 0) ?: null;
                }
                unset($roomType);
                if (collect($rooms)->contains('assumed_capacity', true)) {
                    $warnings[] = $name.': kapasitas kosong memakai asumsi sementara 2 orang per unit; kapasitas yang sudah diatur tetap dipertahankan.';
                }
                $buildings[] = ['kode_gedung' => $code, 'nama_gedung' => $name, 'allowed_categories' => $categories, 'room_types' => $roomTypes, 'rooms' => $rooms, 'rates' => $rates];
            }
        } finally {
            $book->disconnectWorksheets();
        }

        return compact('buildings', 'warnings');
    }

    /**
     * Check-in rows establish a minimum observed occupancy, not a guessed capacity for empty rooms.
     *
     * @param  list<array<string, mixed>>  $buildings
     * @param  array<string, mixed>  $students
     * @return list<array<string, mixed>>
     */
    public function withCheckinOccupancy(array $buildings, array $students): array
    {
        $matching = app(Residence2026StudentMatching::class);
        $rows = collect($students['students'])->flatMap(fn (array $student): array => $student['checkins'])
            ->concat(collect($students['unresolved'])->where('source', 'checkins'));
        foreach ($buildings as &$building) {
            $counts = [];
            $lookup = [];
            foreach ($building['rooms'] as $index => $room) {
                $lookup[$matching->roomKey($building['kode_gedung'], $room['nomor_kamar'])][] = $index;
            }
            foreach ($rows as $row) {
                if ($matching->buildingCode($row['sheet']) !== $building['kode_gedung']) {
                    continue;
                }
                $aliases = array_map(fn (string $alias): string => $matching->roomKey($building['kode_gedung'], $alias), explode('/', $row['room']));
                $exact = $lookup[$matching->roomKey($building['kode_gedung'], $row['room'])] ?? [];
                $indices = $exact ?: array_values(array_unique(array_merge([], ...array_map(fn (string $alias): array => $lookup[$alias] ?? [], $aliases))));
                if ($indices === [] && preg_match('/^(\d+)[AB]\.\d+$/', $row['room'], $floor)) {
                    $indices[] = count($building['rooms']);
                    $building['rooms'][] = ['nomor_kamar' => $row['room'], 'nomor_lantai' => (int) $floor[1], 'kapasitas' => 0, 'tipe_kamar' => 'standar'];
                    $lookup[$matching->roomKey($building['kode_gedung'], $row['room'])] = $indices;
                }
                if (count($indices) !== 1) {
                    continue;
                }
                $identity = preg_match('/^2[456]\d{8}$/D', $row['nim'])
                    ? $row['nim'].'|'.preg_replace('/[^a-z0-9]/', '', Str::lower(Str::ascii($row['nama'] ?? '')))
                    : $row['sheet'].':'.$row['row'];
                $counts[$indices[0]][$identity] = true;
            }
            foreach ($counts as $index => $occupants) {
                $building['rooms'][$index]['kapasitas'] = max($building['rooms'][$index]['kapasitas'], count($occupants));
            }
            foreach ($building['room_types'] as &$type) {
                $type['max_capacity'] = max($type['max_capacity'] ?? 0, collect($building['rooms'])->where('tipe_kamar', $type['type'])->max('kapasitas') ?? 0) ?: null;
            }
            unset($type);
        }
        unset($building);

        return $buildings;
    }

    /** @param list<array<string, mixed>> $buildings */
    public function apply(array $buildings): void
    {
        DB::transaction(function () use ($buildings): void {
            foreach ($buildings as $data) {
                $building = Gedung::updateOrCreate(['kode_gedung' => $data['kode_gedung']], [
                    'nama_gedung' => $data['nama_gedung'], 'allowed_categories' => $data['allowed_categories'], 'room_types' => $data['room_types'], 'alamat' => 'Kampus Limau Manis',
                ]);
                ResidenceRate::where('gedung_id', $building->id)->when($data['rates'] !== [], function ($query) use ($data): void {
                    $query->whereNot(function ($query) use ($data): void {
                        foreach ($data['rates'] as $rate) {
                            $query->orWhere(fn ($query) => $query->where('tipe_kamar', $rate['tipe_kamar'])->where('unit', $rate['unit']));
                        }
                    });
                })->delete();
                foreach ($data['rates'] as $rate) {
                    ResidenceRate::updateOrCreate(['gedung_id' => $building->id, 'tipe_kamar' => $rate['tipe_kamar'], 'unit' => $rate['unit']], $rate);
                }
                foreach ($data['rooms'] as $roomData) {
                    $floor = Lantai::firstOrCreate(['gedung_id' => $building->id, 'nomor_lantai' => $roomData['nomor_lantai']], ['nama_lantai' => 'Lantai '.$roomData['nomor_lantai']]);
                    $room = Kamar::firstOrNew(['lantai_id' => $floor->id, 'nomor_kamar' => $roomData['nomor_kamar']]);
                    $wasMissingCapacity = $room->exists && $room->kapasitas === 0;
                    if (($roomData['assumed_capacity'] ?? false) && $room->exists && $room->kapasitas > 0) {
                        $roomData['kapasitas'] = $room->kapasitas;
                    }
                    $active = $room->exists ? $room->penempatanKamar()->where('status', 'aktif')->count() : 0;
                    $reserved = $room->exists ? app(RoomReservations::class)->count($room) : 0;
                    if (($roomData['blocked'] ?? false) && $active + $reserved > 0) {
                        throw new \LogicException('Master tipe '.$building->nama_gedung.' / '.$roomData['nomor_kamar'].' bertentangan dengan kamar berpenghuni atau direservasi. Tidak ada data yang diubah.');
                    }
                    if ($roomData['kapasitas'] < $active + $reserved) {
                        throw new \LogicException('Kapasitas '.$building->nama_gedung.' / '.$roomData['nomor_kamar'].' lebih kecil dari penghuni/reservasi aktif. Tidak ada data yang diubah.');
                    }
                    $annual = collect($data['rates'])->first(fn (array $rate): bool => $rate['tipe_kamar'] === $roomData['tipe_kamar'] && $rate['unit'] === 'year');
                    $keepMaintenance = $room->exists && $room->status === 'maintenance' && ! ($wasMissingCapacity && ($roomData['assumed_capacity'] ?? false));
                    $status = $keepMaintenance || ($roomData['blocked'] ?? false) || $roomData['kapasitas'] === 0 ? 'maintenance' : ($active === 0 ? 'kosong' : ($active + $reserved >= $roomData['kapasitas'] ? 'penuh' : 'terisi_sebagian'));
                    $room->fill(['kapasitas' => $roomData['kapasitas'], 'tipe_kamar' => $roomData['tipe_kamar'], 'tarif_per_periode' => $annual['amount'] ?? 0, 'status' => $status])->save();
                }
                if (collect($data['rooms'])->contains('assumed_capacity', true)) {
                    $types = $building->room_types;
                    foreach ($types as &$type) {
                        $capacity = Kamar::whereHas('lantai', fn ($query) => $query->where('gedung_id', $building->id))
                            ->where('tipe_kamar', $type['type'])->max('kapasitas');
                        $type['max_capacity'] = max($type['max_capacity'] ?? 0, $capacity ?? 0) ?: null;
                    }
                    unset($type);
                    $building->update(['room_types' => $types]);
                }
            }
        });
    }
}
