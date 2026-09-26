<?php

namespace App\Services;

use App\Enums\ClientProfileCategory;
use App\Models\User;

class UserProfileSummary
{
    /** @return array{category: string, residence: string, account: string, sections: list<array{title: string, fields: array<string, string|null>}>} */
    public function forUser(User $user): array
    {
        $user->loadMissing('roles', 'mahasiswaProfil.prodi.departemen.faculty', 'mahasiswaProfil.city.province', 'mahasiswaProfil.periode', 'mahasiswaProfil.penempatanKamar.kamar.lantai.gedung');
        $student = $user->mahasiswaProfil;
        $life = app(ResidenceLifecycle::class);
        $category = match ($user->client_profile_category) {
            ClientProfileCategory::Student => 'Mahasiswa lokal',
            ClientProfileCategory::LocalKipk => 'Mahasiswa lokal KIP-K',
            ClientProfileCategory::LocalNonKipk => 'Mahasiswa lokal non-KIP-K',
            ClientProfileCategory::InternationalStudent => 'Mahasiswa internasional berbayar',
            ClientProfileCategory::InternationalFreeFacility => 'Mahasiswa internasional fasilitas gratis',
            ClientProfileCategory::NonStudent => 'Nonmahasiswa',
            ClientProfileCategory::Parent => 'Orang tua',
            default => 'Petugas internal',
        };
        $residence = $student ? match ($life->state($student)) {
            'binaan' => 'Penghuni aktif — binaan',
            'hunian' => 'Penghuni aktif — hunian biasa',
            'alumni' => 'Alumni asrama',
            'riwayat_perlu_verifikasi' => 'Riwayat hunian perlu verifikasi',
            default => 'Belum pernah tinggal',
        } : 'Tidak berlaku';
        $account = $user->status === 'aktif' ? 'Aktif' : match ($user->inactive_reason) {
            'letter_issued' => 'Nonaktif setelah surat terbit — dapat daftar kembali',
            'admin_blocked' => 'Nonaktif oleh admin',
            default => 'Nonaktif',
        };
        $sections = [
            ['title' => 'Identitas dan akun', 'fields' => [
                'Nama lengkap' => $user->nama,
                'NIM / NIP / Nomor identitas' => $user->nim_nip,
                'Email' => $user->email,
                'Nomor telepon' => $user->no_hp,
                'Jenis kelamin' => $user->gender ? ucfirst(str_replace('_', ' ', $user->gender)) : null,
                'Peran akses' => $user->roles->pluck('name')->map(fn (string $role): string => ucfirst(str_replace('_', ' ', $role)))->implode(', '),
                'Status akun' => $account,
                'Kategori akun' => $category,
            ]],
        ];
        if ($student) {
            $placement = $student->penempatanKamar->firstWhere('status', 'aktif');
            $legacy = $life->legacy($student);
            $sections[] = ['title' => 'Data akademik dan asal', 'fields' => [
                'Angkatan' => $student->angkatan === null ? null : (string) $student->angkatan,
                'Fakultas' => $student->prodi?->departemen?->faculty?->name,
                'Departemen' => $student->prodi?->departemen?->name,
                'Program studi' => $student->prodi?->name,
                'Jenjang' => $student->prodi?->jenjang,
                'NIK' => $student->nik,
                'Kota / kabupaten' => $student->city?->name,
                'Provinsi' => $student->city?->province?->name,
            ]];
            $sections[] = ['title' => 'Status dan riwayat hunian', 'fields' => [
                'Status hunian' => $residence,
                'Status administrasi hunian' => ucfirst(str_replace('_', ' ', $student->status_huni)),
                'KIP-K untuk penerimaan aktif' => $life->isKipk($student) ? 'Memenuhi syarat KIP-K' : 'Tidak memenuhi syarat KIP-K pada penerimaan aktif',
                'Periode hunian tercatat' => $student->periode?->nama_periode,
                'Gedung saat ini' => $placement?->kamar?->lantai?->gedung?->nama_gedung,
                'Lantai' => $placement ? (string) $placement->kamar?->lantai?->nomor_lantai : null,
                'Nomor kamar' => $placement?->kamar?->nomor_kamar,
                'Tipe kamar' => $placement?->kamar?->tipe_kamar,
                'Mulai hunian aktif' => $placement?->tanggal_mulai?->format('d-m-Y'),
                'Selesai hunian aktif' => $placement?->tanggal_selesai?->format('d-m-Y'),
                'Arsip alumni lama' => $legacy ? 'Terdata dalam arsip alumni' : 'Tidak terdata dalam arsip alumni lama',
                'Riwayat masa tinggal berakhir' => $life->hasEndedStay($student) ? 'Ada' : 'Belum ada',
            ]];
        }

        return compact('category', 'residence', 'account', 'sections');
    }
}
