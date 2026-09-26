<?php

use App\Http\Controllers\Admin\MasterDataPageController;
use App\Http\Controllers\RolePageController;
use Illuminate\Support\Facades\Route;

$pages = [
    'mahasiswa' => ['dashboard', 'registration', 'detail-kamar', 'tagihan', 'checkout', 'bebas-asrama', 'perizinan', 'jadwal', 'absensi', 'lapor-kerusakan'],
    'admin' => ['residence-management', 'invoices', 'dashboard', 'registration-review', 'mahasiswa', 'verifikasi-pembayaran', 'penempatan-kamar', 'pemetaan-kamar', 'kelola-bangunan', 'kelola-aset', 'approval-bebas-asrama', 'keuangan', 'kelola-profil', 'kelola-informasi', 'kelola-program', 'kelola-testimoni', 'jadwal-kegiatan', 'penilaian-teknisi', 'stok-aset', 'perizinan'],
    'admin_layanan' => ['residence-management', 'invoices', 'dashboard', 'mahasiswa', 'registration-review', 'verifikasi-pembayaran', 'penempatan-kamar', 'approval-bebas-asrama', 'keuangan', 'jadwal-kegiatan'],
    'fasilitator' => ['dashboard', 'jadwal-kegiatan', 'monitoring-kamar', 'checkout-approval', 'perizinan', 'kelola-aset'],
    'go' => ['dashboard', 'monitoring-kamar', 'checkout-inspection'],
    'admin_aset' => ['dashboard', 'pemetaan-kamar', 'kelola-bangunan', 'kelola-aset', 'stok-aset'],
    'orang_tua' => ['dashboard'],
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
    'admin_layanan.temporary-stays' => 'admin/temporary-stays',
    'fasilitator.temporary-stays' => 'admin/temporary-stays',
    'admin_layanan.residence-management' => 'admin/residence-management',
    'admin_layanan.invoices' => 'admin/invoices',
    'fasilitator.kelola-aset' => 'admin/kelola-aset',
    'admin_aset.stok-aset' => 'admin/stok-aset',
    'admin_layanan.dashboard' => 'admin/dashboard',
    'admin_layanan.keuangan' => 'admin/keuangan',
    'admin_layanan.jadwal-kegiatan' => 'admin/jadwal-kegiatan',
    'fasilitator.jadwal-kegiatan' => 'admin/jadwal-kegiatan',
    'admin.mahasiswa' => 'admin/data-mahasiswa',
    'admin_layanan.mahasiswa' => 'admin/data-mahasiswa',
    'admin_layanan.verifikasi-pembayaran' => 'admin/verifikasi-pembayaran',
    'admin_layanan.penempatan-kamar' => 'admin/penempatan-kamar',
    'admin_layanan.approval-bebas-asrama' => 'admin/approval-bebas-asrama',
    'admin_aset.pemetaan-kamar' => 'admin/pemetaan-kamar',
    'admin_aset.kelola-bangunan' => 'admin/kelola-bangunan',
    'admin_aset.kelola-aset' => 'admin/kelola-aset',
    'go.monitoring-kamar' => 'fasilitator/monitoring-kamar',
    'fasilitator.checkout-approval' => 'fasilitator/checkout-approval',
    'go.checkout-inspection' => 'go/checkout-inspection',
    'admin_layanan.registration-review' => 'admin/registration-review',
    'teknisi.tiket' => 'teknisi/tiket-masuk',
];

foreach ($pages as $role => $rolePages) {
    if (in_array($role, ['admin', 'admin_layanan', 'fasilitator'], true)) {
        $rolePages[] = 'temporary-stays';
    }
    $middlewareRole = $role === 'admin' ? 'staff_admin|superadmin' : $role;

    Route::prefix($role)->name($role.'.')->middleware('role:'.$middlewareRole)->group(function () use ($role, $rolePages, $componentAliases) {
        foreach ($rolePages as $page) {
            $key = $role.'.'.$page;
            $component = $componentAliases[$key] ?? str_replace('.', '/', $key);
            $pageKey = match ($key) {
                'fasilitator.jadwal-kegiatan' => 'jadwal-kegiatan',
                'admin.mahasiswa' => 'data-mahasiswa',
                'admin_layanan.mahasiswa' => 'data-mahasiswa',
                'admin_layanan.verifikasi-pembayaran' => 'verifikasi-pembayaran',
                'admin_layanan.penempatan-kamar' => 'penempatan-kamar',
                'admin_layanan.approval-bebas-asrama' => 'approval-bebas-asrama',
                'admin_aset.pemetaan-kamar' => 'pemetaan-kamar',
                'admin_aset.kelola-bangunan' => 'kelola-bangunan',
                'admin_aset.kelola-aset' => 'kelola-aset',
                'go.monitoring-kamar' => 'monitoring-kamar',
                'fasilitator.checkout-approval' => 'checkout-approval',
                'go.checkout-inspection' => 'checkout-inspection',
                'admin_layanan.registration-review' => 'registration-review',
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
