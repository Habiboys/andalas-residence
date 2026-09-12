<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    /**
     * Daftar permission yang dibutuhkan aplikasi, dikelompokkan per modul.
     *
     * Pola penamaan: `<modul>.<aksi>`
     * Saat menambah fitur baru, tambahkan permission baru di sini lalu
     * lampirkan ke role yang relevan (biasanya juga ke role 'superadmin').
     */
    private const PERMISSIONS = [
        // ── Umum ──
        'dashboard.view' => 'Melihat dashboard',

        // ── Data Master ──
        'master.view' => 'Melihat data master (prodi, periode, fakultas, dll)',
        'master.manage' => 'Kelola data master (tambah/ubah/hapus)',

        // ── Mahasiswa ──
        'mahasiswa.view' => 'Melihat data mahasiswa',
        'mahasiswa.create' => 'Menambah mahasiswa',
        'mahasiswa.update' => 'Mengubah mahasiswa',
        'mahasiswa.delete' => 'Menghapus mahasiswa',

        // ── Gedung, Lantai & Kamar ──
        'gedung.view' => 'Melihat gedung/lantai/kamar',
        'gedung.manage' => 'Kelola gedung, lantai & kamar',

        // ── Aset & Fasilitas ──
        'aset.view' => 'Melihat aset',
        'aset.create' => 'Menambah aset',
        'aset.update' => 'Mengubah aset',
        'aset.delete' => 'Menghapus aset',

        // ── Pembayaran ──
        'pembayaran.view' => 'Melihat pembayaran',
        'pembayaran.create' => 'Melakukan pembayaran (mahasiswa)',
        'pembayaran.verify' => 'Memverifikasi pembayaran',
        'pembayaran.download_bukti' => 'Mengunduh bukti pembayaran',

        // ── Keuangan ──
        'keuangan.view' => 'Melihat buku besar keuangan',
        'keuangan.create' => 'Mencatat transaksi keuangan',
        'keuangan.update' => 'Mengubah transaksi keuangan',
        'keuangan.delete' => 'Menghapus transaksi keuangan',

        // ── Penempatan Kamar ──
        'penempatan.view' => 'Melihat pemetaan/penempatan',
        'penempatan.manage' => 'Kelola penempatan (otomatis & manual)',

        // ── Tiket / Laporan Kerusakan ──
        'tiket.view' => 'Melihat laporan kerusakan',
        'tiket.create' => 'Membuat laporan kerusakan',
        'tiket.update' => 'Memperbarui status laporan kerusakan',
        'tiket.rate' => 'Memberi penilaian teknisi',

        // ── Absensi ──
        'absensi.view' => 'Melihat rekap kehadiran',
        'absensi.scan' => 'Melakukan scan barcode absensi',

        // ── Pengajuan ──
        'pengajuan.submit' => 'Mengajukan bebas asrama / izin pulang',
        'pengajuan.approve' => 'Menyetujui pengajuan',
        'pengajuan.download_surat' => 'Mengunduh surat bebas asrama',

        // ── Check-in ──
        'checkin.create' => 'Melakukan check-in kamar',

        // ── Kuesioner ──
        'kuesioner.view' => 'Melihat hasil kuesioner',

        // ── Kegiatan ──
        'kegiatan.view' => 'Melihat jadwal kegiatan',
        'kegiatan.manage' => 'Kelola jadwal kegiatan',

        // ── Landing Content ──
        'landing.manage' => 'Kelola konten landing (profil/informasi/program/testimoni)',

        // ── Teknisi ──
        'teknisi.performance.view' => 'Melihat performa teknisi',

        // ── Khusus Superadmin ──
        'users.manage' => 'Kelola akun pengguna internal',
        'roles.manage' => 'Kelola role & permission',
        'audit.view' => 'Melihat log audit',
    ];

    /**
     * Pemetaan awal permission ke role.
     * 'superadmin' otomatis mendapat semua permission.
     */
    private const ROLE_PERMISSIONS = [
        'pimpinan' => [
            'dashboard.view',
            'keuangan.view',
            'aset.view',
            'mahasiswa.view',
            'kegiatan.view',
            'teknisi.performance.view',
        ],
        'staff_admin' => [
            'dashboard.view',
            'master.view',
            'master.manage',
            'mahasiswa.view',
            'mahasiswa.create',
            'mahasiswa.update',
            'mahasiswa.delete',
            'gedung.view',
            'gedung.manage',
            'aset.view',
            'aset.create',
            'aset.update',
            'aset.delete',
            'pembayaran.view',
            'pembayaran.verify',
            'pembayaran.download_bukti',
            'keuangan.view',
            'keuangan.create',
            'keuangan.update',
            'keuangan.delete',
            'penempatan.view',
            'penempatan.manage',
            'tiket.view',
            'tiket.update',
            'tiket.rate',
            'absensi.view',
            'pengajuan.approve',
            'pengajuan.download_surat',
            'kuesioner.view',
            'kegiatan.view',
            'kegiatan.manage',
            'landing.manage',
            'teknisi.performance.view',
        ],
        'fasilitator' => [
            'dashboard.view',
            'gedung.view',
            'mahasiswa.view',
            'absensi.view',
            'absensi.scan',
            'pengajuan.approve',
            'kegiatan.view',
        ],
        'teknisi' => [
            'dashboard.view',
            'tiket.view',
            'tiket.update',
            'teknisi.performance.view',
        ],
        'mahasiswa' => [
            'dashboard.view',
            'pembayaran.view',
            'pembayaran.create',
            'checkin.create',
            'tiket.create',
            'pengajuan.submit',
            'pengajuan.download_surat',
            'absensi.view',
            'kegiatan.view',
        ],
    ];

    public function run(): void
    {
        $superadmin = Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'web']);

        foreach (array_keys(self::PERMISSIONS) as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }

        // Superadmin: semua permission.
        $superadmin->syncPermissions(array_keys(self::PERMISSIONS));

        foreach (self::ROLE_PERMISSIONS as $roleName => $permissions) {
            $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web']);
            $role->syncPermissions($permissions);
        }
    }
}
