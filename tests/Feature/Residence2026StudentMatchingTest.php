<?php

use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Lantai;
use App\Models\Prodi;
use App\Services\Residence2026StudentImport;
use App\Services\Residence2026StudentMatching;
use Database\Seeders\ResidenceMasterSeeder;
use Database\Seeders\UnandAcademicSeeder;
use Illuminate\Support\Facades\Storage;

function matchingRoom(string $number = '2A.03', int $capacity = 4, string $code = 'D'): Kamar
{
    $building = Gedung::firstOrCreate(['kode_gedung' => $code], ['nama_gedung' => 'Gedung '.$code]);
    $floor = Lantai::firstOrCreate(['gedung_id' => $building->id, 'nomor_lantai' => 2], ['nama_lantai' => 'Lantai 2']);

    return Kamar::create(['lantai_id' => $floor->id, 'nomor_kamar' => $number, 'kapasitas' => $capacity, 'status' => 'kosong', 'tipe_kamar' => 'standar']);
}

function matchingStudent(string $nim = '2610441035', string $room = '2A.03/D203'): array
{
    return [
        'nim' => $nim, 'nama' => 'Mahasiswa '.$nim, 'angkatan' => 2026,
        'category' => 'local_non_kipk', 'is_kipk' => false, 'email' => null,
        'gender' => 'perempuan', 'prodi_names' => [], 'issues' => [],
        'checkins' => [['sheet' => 'MENPERA', 'row' => 3, 'room' => $room, 'nim' => $nim]],
        'kipk_deductions' => [],
    ];
}

it('places a source room with two codes into the unique matching master room', function () {
    $room = matchingRoom();
    $progress = [];

    $result = app(Residence2026StudentImport::class)->apply(
        ['students' => [matchingStudent()], 'unresolved' => []],
        function (int $processed, int $total) use (&$progress): void {
            $progress[] = [$processed, $total];
        },
    );

    expect($result['placed'])->toBe(1);
    expect($progress)->toBe([[0, 1], [1, 1]]);
    $this->assertDatabaseHas('penempatan_kamar', ['kamar_id' => $room->id, 'status' => 'aktif']);
});

it('combines occupant counts for different aliases of the same physical room', function () {
    matchingRoom(capacity: 1);
    $records = [matchingStudent('2610441035', '2A.03'), matchingStudent('2610441036', '2A.03/D203')];

    $result = app(Residence2026StudentImport::class)->apply(['students' => $records, 'unresolved' => []]);

    expect($result['room_issues'])->toBe(['over_capacity' => 2]);
    expect($result['room_diagnostics'][0]['source_occupants'])->toBe(2);
    expect($result['room_diagnostics'][0]['capacity'])->toBe(1);
    $this->assertDatabaseCount('penempatan_kamar', 0);
});

it('does not guess when both aliases point to different master rooms', function () {
    matchingRoom();
    matchingRoom('D203');

    $result = app(Residence2026StudentImport::class)->apply(['students' => [matchingStudent()], 'unresolved' => []]);

    expect($result['room_issues'])->toBe(['ambiguous_alias' => 1]);
    $this->assertDatabaseCount('penempatan_kamar', 0);
});

it('tolerates trailing annotation brackets without changing the actual room number', function () {
    $room = matchingRoom('MS 2. 12', code: 'E');
    $matcher = app(Residence2026StudentMatching::class);
    $lookup = collect(['E|MS2.12' => collect([$room])]);

    $matches = $matcher->rooms(['sheet' => 'RMS', 'room' => 'MS 2.12)'], $lookup);

    expect($matches->pluck('id')->all())->toBe([$room->id]);
});

it('matches optional wing separators but preserves numeric separators and leading zeros', function () {
    $room = matchingRoom('2B13');
    $matcher = app(Residence2026StudentMatching::class);
    $lookup = collect([$matcher->roomKey('D', $room->nomor_kamar) => collect([$room])]);

    expect($matcher->rooms(['sheet' => 'MENPERA', 'room' => '2B.13/D213'], $lookup)->pluck('id')->all())->toBe([$room->id]);
    expect($matcher->roomKey('E', 'MS 2.12'))->not->toBe($matcher->roomKey('E', 'MS 21.2'));
    expect($matcher->roomKey('D', '2B.03'))->not->toBe($matcher->roomKey('D', '2B.3'));
});

it('does not choose a room when punctuation variants exist as two separate master records', function () {
    $first = matchingRoom('2B13');
    $second = matchingRoom('2B.13');
    $matcher = app(Residence2026StudentMatching::class);
    $lookup = collect([$matcher->roomKey('D', $first->nomor_kamar) => collect([$first, $second])]);

    expect($matcher->rooms(['sheet' => 'MENPERA', 'room' => '2B.13'], $lookup))->toHaveCount(2);
});

it('matches diploma degrees and documented source abbreviations against the academic catalog', function (string $source, string $name, string $degree) {
    $this->seed(UnandAcademicSeeder::class);
    $programs = Prodi::whereIn('jenjang', ['S1', 'D3', 'D4'])->get();

    $matches = app(Residence2026StudentMatching::class)->programs([$source], $programs);

    expect($matches)->toHaveCount(1);
    expect($matches->first()->name)->toBe($name);
    expect($matches->first()->jenjang)->toBe($degree);
})->with([
    ['Akuntansi D3', 'Akuntansi', 'D3'],
    ['DIII Akuntansi', 'Akuntansi', 'D3'],
    ['S1 Akuntansi', 'Akuntansi', 'S1'],
    ['Manajeman Pemasaran', 'Manajemen Pemasaran', 'D3'],
    ['Administrasi Perkantoran', 'Administrasi Perkantoran', 'D3'],
    ['Ilmu Sejarah', 'Sejarah', 'S1'],
    ['Kesmas', 'Kesehatan Masyarakat', 'S1'],
    ['TPHP', 'Teknologi Pangan dan Hasil Pertanian', 'S1'],
    ['Protan', 'Proteksi Tanaman', 'S1'],
    ['TPB', 'Teknik Pertanian dan Biosistem', 'S1'],
    ['Imu Tanah', 'Ilmu Tanah', 'S1'],
    ['D3 Perbankan', 'Perbankan dan Keuangan', 'D3'],
    ['sastra inggria', 'Sastra Inggris', 'S1'],
    ['Antropologi', 'Antropologi Sosial', 'S1'],
]);

it('leaves an unqualified accounting program ambiguous and never treats an asrama name as a program', function () {
    $this->seed(UnandAcademicSeeder::class);
    $matcher = app(Residence2026StudentMatching::class);
    $programs = Prodi::whereIn('jenjang', ['S1', 'D3', 'D4'])->get();

    expect($matcher->programs(['Akuntansi'], $programs))->toHaveCount(2);
    expect($matcher->programs(['HIJAU', 'MENPERA', 'FKM', 'Agroeteknologi', 'D4 Akuntansi'], $programs))->toHaveCount(0);
});

it('keeps the different column layouts of the three kipk source sections distinct', function () {
    $data = app(Residence2026StudentImport::class)->read();
    $rows = collect($data['students'])->flatMap(fn ($record) => $record['kipk_deductions']);
    $older = $rows->firstWhere('row', 937);
    $previous = $rows->firstWhere('row', 840);

    expect($older['building_name'])->toBe('MENPERA');
    expect($older['prodi'])->toBe('');
    expect($older['deduction_1'])->toBe('2300000');
    expect($previous['building_name'])->toBe('RPX');
    expect($previous['prodi'])->toBe('peternakan');
    expect($previous['deduction_1'])->toBe('1400000');
    expect($previous['deduction_2'])->toBe('');
});

it('simulates the full source data against real masters without creating resident data', function () {
    Storage::fake('local');
    $this->seed([ResidenceMasterSeeder::class, UnandAcademicSeeder::class]);

    $this->artisan('asrama:seed-students-2026', ['--dry-run' => true, '--report' => true])->assertSuccessful();

    $report = json_decode(Storage::disk('local')->get('import-reports/residents-2026-dry-run.json'), true, flags: JSON_THROW_ON_ERROR);
    expect($report['ready'])->toBe(1464);
    expect($report['skipped'])->toBe(10);
    expect($report['room_matches'])->toBe(1200);
    expect($report['room_issues'])->toBe([]);
    expect($report['program_matches'] + array_sum($report['program_issues']))->toBe(1464);
    $this->assertDatabaseCount('users', 0);
    $this->assertDatabaseCount('mahasiswa_profil', 0);
    $this->assertDatabaseCount('penempatan_kamar', 0);
    $this->assertDatabaseCount('periode', 0);
});
