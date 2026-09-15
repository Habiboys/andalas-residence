<?php

use App\Http\Controllers\Admin\MasterDataPageController;
use App\Http\Controllers\RolePageController;
use Illuminate\Support\Facades\Route;

$pages = [
    'mahasiswa' => ['dashboard', 'detail-kamar', 'pemetaan-kamar', 'tagihan', 'checkin', 'bebas-asrama', 'izin-pulang', 'jadwal', 'absensi', 'lapor-kerusakan'],
    'fasilitator' => ['dashboard', 'scan-barcode', 'rekap-kehadiran', 'monitoring-kamar'],
    'admin' => ['dashboard', 'mahasiswa', 'verifikasi-pembayaran', 'penempatan-kamar', 'pemetaan-kamar', 'kelola-bangunan', 'kelola-aset', 'approval-bebas-asrama', 'approval-izin-pulang', 'keuangan', 'kelola-profil', 'kelola-informasi', 'kelola-program', 'kelola-testimoni', 'jadwal-kegiatan', 'penilaian-teknisi'],
    'teknisi' => ['dashboard', 'tiket', 'update-tiket', 'riwayat-penilaian'],
    'pimpinan' => ['dashboard', 'laporan-keuangan', 'laporan-aset'],
];

Route::middleware('role:superadmin')->group(function () {
    Route::get('admin/akun-internal', [RolePageController::class, 'show'])
        ->defaults('component', 'admin/akun-internal')
        ->defaults('role', 'superadmin')
        ->defaults('page', 'akun-internal')
        ->name('admin.akun-internal');
    Route::get('admin/audit-log', [RolePageController::class, 'show'])
        ->defaults('component', 'admin/audit-log')
        ->defaults('role', 'superadmin')
        ->defaults('page', 'audit-log')
        ->name('admin.audit-log');
});

Route::get('admin/master-data', MasterDataPageController::class)
    ->middleware('role:staff_admin|superadmin')
    ->name('admin.master-data');

$componentAliases = [
    'admin.mahasiswa' => 'admin/data-mahasiswa',
    'teknisi.tiket' => 'teknisi/tiket-masuk',
];

foreach ($pages as $role => $rolePages) {
    $middlewareRole = $role === 'admin' ? 'staff_admin|superadmin' : $role;

    Route::prefix($role)->name($role.'.')->middleware('role:'.$middlewareRole)->group(function () use ($role, $rolePages, $componentAliases) {
        foreach ($rolePages as $page) {
            $key = $role.'.'.$page;
            $component = $componentAliases[$key] ?? str_replace('.', '/', $key);
            $pageKey = match ($key) {
                'admin.mahasiswa' => 'data-mahasiswa',
                'teknisi.tiket' => 'tiket-masuk',
                default => $page,
            };

            Route::get($page, [RolePageController::class, 'show'])
                ->defaults('component', $component)
                ->defaults('role', $role === 'admin' ? 'staff_admin' : $role)
                ->defaults('page', $pageKey)
                ->name($page);
        }
    });
}
