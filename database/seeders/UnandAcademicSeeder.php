<?php

namespace Database\Seeders;

use App\Models\Departemen;
use App\Models\Faculty;
use App\Models\MahasiswaProfil;
use App\Models\Prodi;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UnandAcademicSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function (): void {
            foreach ($this->catalog() as $facultyData) {
                $aliases = [$facultyData['name'], 'Fakultas '.$facultyData['name']];
                if ($facultyData['code'] === '05') {
                    $aliases[] = 'Fakultas Ekonomi';
                }
                $faculty = Faculty::where('code', $facultyData['code'])->first()
                    ?? Faculty::whereIn('name', $aliases)->first() ?? new Faculty;
                $faculty->fill(['code' => $facultyData['code'], 'name' => $facultyData['name']])->save();
                foreach ($facultyData['departments'] as $index => $departmentData) {
                    $departmentCode = $facultyData['code'].'-'.sprintf('%02d', $index + 1);
                    $department = Departemen::firstOrNew(['faculty_id' => $faculty->id, 'name' => $departmentData['name']]);
                    $department->fill(['code' => $departmentCode])->save();
                    foreach ($departmentData['programs'] as $programIndex => [$name, $degree]) {
                        Prodi::updateOrCreate(['departemen_id' => $department->id, 'name' => $name, 'jenjang' => $degree], [
                            'code' => $departmentCode.'-'.sprintf('%02d', $programIndex + 1),
                        ]);
                    }
                }
            }
            foreach ([
                ['Informatika', 'Teknik Informatika', ['Teknik', 'Fakultas Teknik'], '15-03-01'],
                ['Ilmu Hukum', 'Ilmu Hukum', ['Hukum', 'Fakultas Hukum'], '01-01-01'],
                ['Akuntansi', 'Akuntansi', ['Fakultas Ekonomi'], '05-03-01'],
            ] as [$programName, $departmentName, $facultyNames, $code]) {
                $canonical = Prodi::where('code', $code)->firstOrFail();
                $oldPrograms = Prodi::where('name', $programName)->whereNull('code')
                    ->whereHas('departemen', fn ($query) => $query->where('name', $departmentName)
                        ->whereHas('faculty', fn ($faculty) => $faculty->whereIn('name', $facultyNames)))->get();
                foreach ($oldPrograms as $old) {
                    MahasiswaProfil::where('prodi_id', $old->id)->update(['prodi_id' => $canonical->id]);
                    $department = $old->departemen;
                    $faculty = $department->faculty;
                    $old->delete();
                    if (! $department->prodi()->exists()) {
                        $department->delete();
                    }
                    if (! $faculty->code && ! $faculty->departemen()->exists()) {
                        $faculty->delete();
                    }
                }
            }
        });
    }

    /** Codes below faculty level are stable internal catalog identifiers, not official university codes.
     * @return list<array{code: string, name: string, departments: list<array{name: string, programs: list<array{string, string}>}>}>
     */
    public function catalog(): array
    {
        return [
            ['code' => '01', 'name' => 'Hukum', 'departments' => [
                ['name' => 'Hukum', 'programs' => [['Hukum', 'S1'], ['Hukum', 'S2'], ['Kenotariatan', 'S2'], ['Hukum', 'S3']]],
            ]],
            ['code' => '02', 'name' => 'Pertanian', 'departments' => [
                ['name' => 'Agroteknologi', 'programs' => [['Agroteknologi', 'S1'], ['Agronomi', 'S2']]],
                ['name' => 'Agribisnis', 'programs' => [['Agribisnis', 'S1'], ['Ekonomi Pertanian', 'S2']]],
                ['name' => 'Ilmu Tanah', 'programs' => [['Ilmu Tanah', 'S1'], ['Ilmu Tanah', 'S2']]],
                ['name' => 'Proteksi Tanaman', 'programs' => [['Proteksi Tanaman', 'S1'], ['Proteksi Tanaman', 'S2']]],
                ['name' => 'Penyuluhan Pertanian', 'programs' => [['Penyuluhan Pertanian', 'S1']]],
                ['name' => 'Agroekoteknologi', 'programs' => [['Agroekoteknologi', 'S1']]],
                ['name' => 'Ilmu Pertanian', 'programs' => [['Ilmu Pertanian', 'S3']]],
            ]],
            ['code' => '03', 'name' => 'Kedokteran', 'departments' => [
                ['name' => 'Kedokteran', 'programs' => [['Kedokteran', 'S1'], ['Pendidikan Profesi Dokter', 'Profesi'], ['Ilmu Kesehatan Mata', 'Sp-1'], ['Penyakit Dalam', 'Sp-1'], ['Bedah', 'Sp-1'], ['Kesehatan Anak', 'Sp-1'], ['Obstetrik dan Ginekologi', 'Sp-1'], ['Pulmonologi dan Ilmu Kedokteran Respirasi', 'Sp-1'], ['Patologi Klinis', 'Sp-1'], ['Dermatologi Venereologi Dan Estetika', 'Sp-1'], ['Neurologi', 'Sp-1'], ['Kesehatan Telinga Hidung Tenggorok, Bedah Kepala Leher', 'Sp-1'], ['Jantung dan Pembuluh Darah', 'Sp-1'], ['Patologi Anatomi', 'Sp-1'], ['Anestesiologi dan Terapi Intensif', 'Sp-1'], ['Orthopaedi dan Traumatologi', 'Sp-1'], ['Urologi', 'Sp-1'], ['Obstetri Dan Ginekologi', 'Sp-2'], ['Penyakit Dalam', 'Sp-2'], ['Bedah', 'Sp-2']]],
                ['name' => 'Psikologi', 'programs' => [['Psikologi', 'S1'], ['Pendidikan Profesi Psikolog', 'Profesi']]],
                ['name' => 'Kebidanan', 'programs' => [['Kebidanan', 'S1'], ['Pendidikan Profesi Bidan', 'Profesi'], ['Kebidanan', 'S2']]],
                ['name' => 'Ilmu Biomedis', 'programs' => [['Ilmu Biomedis', 'S1'], ['Ilmu Biomedis', 'S2'], ['Ilmu Biomedis', 'S3'], ['Kesehatan Masyarakat', 'S2'], ['Kesehatan Masyarakat', 'S3']]],
                ['name' => 'Administrasi Rumah Sakit', 'programs' => [['Administrasi Rumah Sakit', 'S2']]],
            ]],
            ['code' => '04', 'name' => 'Matematika dan Ilmu Pengetahuan Alam', 'departments' => [
                ['name' => 'Kimia', 'programs' => [['Kimia', 'S1'], ['Kimia', 'S2'], ['Kimia', 'S3']]],
                ['name' => 'Biologi', 'programs' => [['Biologi', 'S1'], ['Biologi', 'S2'], ['Biologi', 'S3']]],
                ['name' => 'Matematika', 'programs' => [['Matematika', 'S1'], ['Matematika', 'S2'], ['Matematika', 'S3']]],
                ['name' => 'Fisika', 'programs' => [['Fisika', 'S1'], ['Fisika', 'S2']]],
                ['name' => 'Statistika dan Sains Data', 'programs' => [['Statistik dan Sains Data', 'S1']]],
            ]],
            ['code' => '05', 'name' => 'Ekonomi dan Bisnis', 'departments' => [
                ['name' => 'Ekonomi', 'programs' => [['Ekonomi', 'S1'], ['Ekonomi', 'S2'], ['Ekonomi', 'S3']]],
                ['name' => 'Manajemen', 'programs' => [['Manajemen', 'S1'], ['Manajemen', 'S2'], ['Manajemen', 'S3']]],
                ['name' => 'Akuntansi', 'programs' => [['Akuntansi', 'S1'], ['Akuntansi', 'S2'], ['Ilmu Akuntansi', 'S3'], ['Pendidikan Profesi Akuntan', 'Profesi']]],
                ['name' => 'Ekonomi Islam', 'programs' => [['Ekonomi Islam', 'S1']]],
                ['name' => 'Kewirausahaan', 'programs' => [['Kewirausahaan', 'S1']]],
                ['name' => 'Ekonomi Pembangunan', 'programs' => [['Ekonomi Pembangunan (Kampus Payakumbuh)', 'S1']]],
                ['name' => 'Manajemen Kampus Payakumbuh', 'programs' => [['Manajemen (Kampus Payakumbuh)', 'S1']]],
                ['name' => 'Vokasi', 'programs' => [['Manajemen Pemasaran', 'D3'], ['Akuntansi', 'D3'], ['Administrasi Perkantoran', 'D3'], ['Perbankan dan Keuangan', 'D3']]],
            ]],
            ['code' => '06', 'name' => 'Peternakan', 'departments' => [
                ['name' => 'Peternakan', 'programs' => [['Peternakan', 'S1'], ['Ilmu Peternakan', 'S2'], ['Ilmu Peternakan', 'S3']]],
                ['name' => 'Peternakan (Kampus Payakumbuh)', 'programs' => [['Peternakan, Kampus Payakumbuh', 'S1']]],
                ['name' => 'Nutrisi dan Teknologi Pakan Ternak', 'programs' => [['Nutrisi dan Teknologi Pakan Ternak', 'S1']]],
            ]],
            ['code' => '07', 'name' => 'Ilmu Budaya', 'departments' => [
                ['name' => 'Sejarah', 'programs' => [['Sejarah', 'S1'], ['Kajian Sejarah', 'S2']]],
                ['name' => 'Sastra Indonesia', 'programs' => [['Sastra Indonesia', 'S1']]],
                ['name' => 'Sastra Inggris', 'programs' => [['Sastra Inggris', 'S1']]],
                ['name' => 'Sastra Minangkabau', 'programs' => [['Sastra Minangkabau', 'S1']]],
                ['name' => 'Sastra Jepang', 'programs' => [['Sastra Jepang', 'S1']]],
                ['name' => 'Arkeologi', 'programs' => [['Arkeologi', 'S1']]],
                ['name' => 'Linguistik', 'programs' => [['Linguistik', 'S2'], ['Linguistik', 'S3']]],
                ['name' => 'Kajian Budaya', 'programs' => [['Susastra', 'S2'], ['Kajian Budaya', 'S2']]],
            ]],
            ['code' => '08', 'name' => 'Ilmu Sosial dan Ilmu Politik', 'departments' => [
                ['name' => 'Sosiologi', 'programs' => [['Sosiologi', 'S1'], ['Sosiologi', 'S2'], ['Sosiologi', 'S3']]],
                ['name' => 'Ilmu Politik', 'programs' => [['Ilmu Politik', 'S1'], ['Ilmu Politik', 'S2']]],
                ['name' => 'Antropologi Sosial', 'programs' => [['Antropologi Sosial', 'S1'], ['Antropologi', 'S2']]],
                ['name' => 'Hubungan Internasional', 'programs' => [['Hubungan Internasional', 'S1']]],
                ['name' => 'Ilmu Komunikasi', 'programs' => [['Ilmu Komunikasi', 'S1'], ['Ilmu Komunikasi', 'S2']]],
                ['name' => 'Administrasi Publik', 'programs' => [['Administrasi Publik', 'S1'], ['Administrasi Publik', 'S2']]],
                ['name' => 'Kajian Kebijakan', 'programs' => [['Studi Kebijakan', 'S3']]],
            ]],
            ['code' => '09', 'name' => 'Teknik', 'departments' => [
                ['name' => 'Teknik Sipil', 'programs' => [['Teknik Sipil', 'S1'], ['Teknik Sipil', 'S2'], ['Teknik Sipil', 'S3']]],
                ['name' => 'Teknik Mesin', 'programs' => [['Teknik Mesin', 'S1'], ['Teknik Mesin', 'S2'], ['Teknik Mesin', 'S3']]],
                ['name' => 'Teknik Industri', 'programs' => [['Teknik Industri', 'S1'], ['Teknik Industri', 'S2'], ['Teknik Industri', 'S3']]],
                ['name' => 'Teknik Elektro', 'programs' => [['Teknik Elektro', 'S1'], ['Teknik Elektro', 'S2'], ['Teknik Elektro', 'S3']]],
                ['name' => 'Teknik Lingkungan', 'programs' => [['Teknik Lingkungan', 'S1'], ['Teknik Lingkungan', 'S2'], ['Teknik Lingkungan', 'S3']]],
                ['name' => 'Arsitektur', 'programs' => [['Arsitektur', 'S1']]],
            ]],
            ['code' => '10', 'name' => 'Farmasi', 'departments' => [
                ['name' => 'Farmasi', 'programs' => [['Farmasi', 'S1'], ['Farmasi', 'S2'], ['Farmasi', 'S3'], ['Pendidikan Profesi Apoteker', 'Profesi']]],
            ]],
            ['code' => '11', 'name' => 'Teknologi Pertanian', 'departments' => [
                ['name' => 'Teknologi Pangan dan Hasil Pertanian', 'programs' => [['Teknologi Pangan dan Hasil Pertanian', 'S1'], ['Teknologi Pangan dan Hasil Pertanian', 'S2']]],
                ['name' => 'Teknik Pertanian dan Biosistem', 'programs' => [['Teknik Pertanian dan Biosistem', 'S1'], ['Teknik Pertanian dan Biosistem', 'S2']]],
                ['name' => 'Teknologi Industri Pertanian', 'programs' => [['Teknologi Industri Pertanian', 'S1'], ['Teknologi Industri Pertanian', 'S2']]],
            ]],
            ['code' => '12', 'name' => 'Kesehatan Masyarakat', 'departments' => [
                ['name' => 'Kesehatan Masyarakat', 'programs' => [['Kesehatan Masyarakat', 'S1'], ['Epidemiologi', 'S2']]],
                ['name' => 'Gizi', 'programs' => [['Gizi', 'S1'], ['Ilmu Gizi', 'S2']]],
            ]],
            ['code' => '13', 'name' => 'Keperawatan', 'departments' => [
                ['name' => 'Keperawatan', 'programs' => [['Keperawatan', 'S1'], ['Keperawatan', 'S2'], ['Pendidikan Profesi Ners', 'Profesi']]],
            ]],
            ['code' => '14', 'name' => 'Kedokteran Gigi', 'departments' => [
                ['name' => 'Kedokteran Gigi', 'programs' => [['Kedokteran Gigi', 'S1'], ['Pendidikan Profesi Dokter Gigi', 'Profesi'], ['Bedah Mulut dan Maksilofasial', 'Sp-1']]],
            ]],
            ['code' => '15', 'name' => 'Teknologi Informasi', 'departments' => [
                ['name' => 'Teknik Komputer', 'programs' => [['Teknik Komputer', 'S1']]],
                ['name' => 'Sistem Informasi', 'programs' => [['Sistem Informasi', 'S1']]],
                ['name' => 'Informatika', 'programs' => [['Informatika', 'S1']]],
            ]],
            ['code' => '16', 'name' => 'Sekolah Pascasarjana', 'departments' => [
                ['name' => 'Studi Pembangunan', 'programs' => [['Studi Pembangunan', 'S3'], ['Pembangunan Wilayah Dan Pedesaan', 'S2']]],
                ['name' => 'Ilmu Lingkungan', 'programs' => [['Ilmu Lingkungan', 'S2'], ['Pengelolaan Sumber Daya Alam', 'S2']]],
                ['name' => 'Bioteknologi', 'programs' => [['Bioteknologi', 'S2']]],
                ['name' => 'Penyuluhan dan Komunikasi Pembangunan', 'programs' => [['Ilmu Penyuluhan dan Komunikasi Pembangunan', 'S2']]],
                ['name' => 'Manajemen Bencana', 'programs' => [['Manajemen Bencana', 'S2'], ['Perumahan dan Pemukiman', 'S2']]],
                ['name' => 'Profesi Insinyur', 'programs' => [['Pendidikan Profesi Insinyur', 'Profesi']]],
            ]],
        ];
    }
}
