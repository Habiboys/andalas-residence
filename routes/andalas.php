<?php

use App\Http\Controllers\AbsensiController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AsetController;
use App\Http\Controllers\CheckinController;
use App\Http\Controllers\DepartemenController;
use App\Http\Controllers\FakultasController;
use App\Http\Controllers\GedungController;
use App\Http\Controllers\KamarController;
use App\Http\Controllers\KategoriTransaksiController;
use App\Http\Controllers\KegiatanController;
use App\Http\Controllers\KeuanganController;
use App\Http\Controllers\KotaController;
use App\Http\Controllers\LandingContentController;
use App\Http\Controllers\LandingController;
use App\Http\Controllers\MahasiswaController;
use App\Http\Controllers\PembayaranController;
use App\Http\Controllers\PengajuanController;
use App\Http\Controllers\PeriodeController;
use App\Http\Controllers\PlacementController;
use App\Http\Controllers\ProdiController;
use App\Http\Controllers\ProvinsiController;
use App\Http\Controllers\ResidenceRegistrationController;
use App\Http\Controllers\TeknisiController;
use App\Http\Controllers\TiketController;
use Illuminate\Support\Facades\Route;

// ─── Public landing pages ────────────────────────────────────────────────────
Route::get('/', [LandingController::class, 'beranda'])->name('landing');
Route::get('/profil/{section}', [LandingController::class, 'profil'])->name('landing.profil');
Route::get('/unit', [LandingController::class, 'unit'])->name('landing.unit');
Route::get('/informasi/{kategori}', [LandingController::class, 'informasi'])->name('landing.informasi');
Route::get('/program', [LandingController::class, 'programIndex'])->name('landing.program');
Route::get('/program/{program}', [LandingController::class, 'programDetail'])->name('landing.program.detail');
Route::get('/kontak', [LandingController::class, 'kontak'])->name('landing.kontak');

Route::middleware(['auth', 'verified'])->group(function () {
    require __DIR__.'/role-pages.php';

    Route::get('/dashboard/redirect', function () {
        $role = request()->user()->roles->first()?->name ?? 'mahasiswa';
        $prefix = in_array($role, ['staff_admin', 'superadmin'], true) ? 'admin' : $role;

        return redirect()->route($prefix.'.dashboard');
    })->name('dashboard.redirect');

    Route::prefix('admin/master-data')->name('admin.master-data.')->middleware('role:staff_admin|superadmin')->group(function () {
        Route::post('/fakultas', [FakultasController::class, 'store'])->name('fakultas.store');
        Route::put('/fakultas/{faculty}', [FakultasController::class, 'update'])->name('fakultas.update');
        Route::delete('/fakultas/{faculty}', [FakultasController::class, 'destroy'])->name('fakultas.destroy');
        Route::post('/departemen', [DepartemenController::class, 'store'])->name('departemen.store');
        Route::put('/departemen/{departemen}', [DepartemenController::class, 'update'])->name('departemen.update');
        Route::delete('/departemen/{departemen}', [DepartemenController::class, 'destroy'])->name('departemen.destroy');
        Route::post('/prodi', [ProdiController::class, 'store'])->name('prodi.store');
        Route::put('/prodi/{prodi}', [ProdiController::class, 'update'])->name('prodi.update');
        Route::delete('/prodi/{prodi}', [ProdiController::class, 'destroy'])->name('prodi.destroy');
        Route::post('/periode', [PeriodeController::class, 'store'])->name('periode.store');
        Route::put('/periode/{periode}', [PeriodeController::class, 'update'])->name('periode.update');
        Route::delete('/periode/{periode}', [PeriodeController::class, 'destroy'])->name('periode.destroy');
        Route::post('/provinsi', [ProvinsiController::class, 'store'])->name('provinsi.store');
        Route::put('/provinsi/{province}', [ProvinsiController::class, 'update'])->name('provinsi.update');
        Route::delete('/provinsi/{province}', [ProvinsiController::class, 'destroy'])->name('provinsi.destroy');
        Route::post('/kota', [KotaController::class, 'store'])->name('kota.store');
        Route::put('/kota/{city}', [KotaController::class, 'update'])->name('kota.update');
        Route::delete('/kota/{city}', [KotaController::class, 'destroy'])->name('kota.destroy');
        Route::post('/kategori', [KategoriTransaksiController::class, 'store'])->name('kategori.store');
        Route::put('/kategori/{kategori}', [KategoriTransaksiController::class, 'update'])->name('kategori.update');
        Route::delete('/kategori/{kategori}', [KategoriTransaksiController::class, 'destroy'])->name('kategori.destroy');
    });

    Route::prefix('andalas')->name('andalas.')->group(function () {
        // Landing content management (admin)
        Route::put('/landing/contents/{content}', [LandingContentController::class, 'updateContent'])->name('landing.contents.update');

        Route::post('/landing/informasi', [LandingContentController::class, 'storeInformasi'])->name('landing.informasi.store');
        Route::put('/landing/informasi/{informasi}', [LandingContentController::class, 'updateInformasi'])->name('landing.informasi.update');
        Route::delete('/landing/informasi/{informasi}', [LandingContentController::class, 'destroyInformasi'])->name('landing.informasi.destroy');

        Route::post('/landing/program', [LandingContentController::class, 'storeProgram'])->name('landing.program.store');
        Route::put('/landing/program/{program}', [LandingContentController::class, 'updateProgram'])->name('landing.program.update');
        Route::delete('/landing/program/{program}', [LandingContentController::class, 'destroyProgram'])->name('landing.program.destroy');
        Route::post('/landing/program-sub', [LandingContentController::class, 'storeProgramSub'])->name('landing.program-sub.store');
        Route::put('/landing/program-sub/{programSub}', [LandingContentController::class, 'updateProgramSub'])->name('landing.program-sub.update');
        Route::delete('/landing/program-sub/{programSub}', [LandingContentController::class, 'destroyProgramSub'])->name('landing.program-sub.destroy');

        Route::post('/landing/testimoni', [LandingContentController::class, 'storeTestimoni'])->name('landing.testimoni.store');
        Route::put('/landing/testimoni/{testimoni}', [LandingContentController::class, 'updateTestimoni'])->name('landing.testimoni.update');
        Route::delete('/landing/testimoni/{testimoni}', [LandingContentController::class, 'destroyTestimoni'])->name('landing.testimoni.destroy');

        // Keuangan
        Route::post('/transaksi-keuangan', [KeuanganController::class, 'store'])->name('keuangan.store');
        Route::put('/transaksi-keuangan/{transaksi}', [KeuanganController::class, 'update'])->name('keuangan.update');
        Route::delete('/transaksi-keuangan/{transaksi}', [KeuanganController::class, 'destroy'])->name('keuangan.destroy');

        // Mahasiswa CRUD
        Route::post('/mahasiswa', [MahasiswaController::class, 'store'])->name('mahasiswa.store');
        Route::put('/mahasiswa/{mahasiswa}', [MahasiswaController::class, 'update'])->name('mahasiswa.update');
        Route::delete('/mahasiswa/{mahasiswa}', [MahasiswaController::class, 'destroy'])->name('mahasiswa.destroy');

        // Gedung / lantai / kamar
        Route::post('/gedung', [GedungController::class, 'store'])->name('gedung.store');
        Route::put('/gedung/{gedung}', [GedungController::class, 'update'])->name('gedung.update');
        Route::delete('/gedung/{gedung}', [GedungController::class, 'destroy'])->name('gedung.destroy');
        Route::post('/lantai', [KamarController::class, 'storeLantai'])->name('lantai.store');
        Route::post('/kamar', [KamarController::class, 'store'])->name('kamar.store');
        Route::put('/kamar/{kamar}', [KamarController::class, 'update'])->name('kamar.update');
        Route::delete('/kamar/{kamar}', [KamarController::class, 'destroy'])->name('kamar.destroy');

        // Aset
        Route::post('/aset', [AsetController::class, 'store'])->name('aset.store');
        Route::put('/aset/{aset}', [AsetController::class, 'update'])->name('aset.update');
        Route::delete('/aset/{aset}', [AsetController::class, 'destroy'])->name('aset.destroy');

        // Kegiatan
        Route::post('/kegiatan', [KegiatanController::class, 'store'])->name('kegiatan.store');
        Route::put('/kegiatan/{kegiatan}', [KegiatanController::class, 'update'])->name('kegiatan.update');
        Route::delete('/kegiatan/{kegiatan}', [KegiatanController::class, 'destroy'])->name('kegiatan.destroy');

        // Superadmin
        Route::post('/admin/users', [AdminUserController::class, 'store'])->name('admin.users.store');
        Route::put('/admin/users/{user}', [AdminUserController::class, 'update'])->name('admin.users.update');
        Route::delete('/admin/users/{user}', [AdminUserController::class, 'destroy'])->name('admin.users.destroy');

        // Registration, placement, checkin, payment, tiket, absensi, pengajuan
        Route::post('/registrations', [ResidenceRegistrationController::class, 'store'])->name('registrations.store');
        Route::patch('/registrations/{registration}', [ResidenceRegistrationController::class, 'update'])->name('registrations.update');
        Route::post('/auto-placement/preview', [PlacementController::class, 'autoPreview'])->name('auto-placement.preview');
        Route::post('/auto-placement/commit', [PlacementController::class, 'autoCommit'])->name('auto-placement.commit');
        Route::post('/penempatan/manual', [PlacementController::class, 'manual'])->name('penempatan.manual');
        Route::post('/checkin', [CheckinController::class, 'store'])->name('checkin.store');
        Route::post('/pembayaran', [PembayaranController::class, 'store'])->name('pembayaran.store');
        Route::post('/pembayaran/{pembayaran}/verify', [PembayaranController::class, 'verify'])->name('pembayaran.verify');
        Route::get('/pembayaran/{pembayaran}/bukti', [PembayaranController::class, 'downloadBukti'])->name('pembayaran.bukti');
        Route::post('/laporan-kerusakan', [TiketController::class, 'store'])->name('laporan.store');
        Route::put('/tiket/{laporan}', [TiketController::class, 'update'])->name('tiket.update');
        Route::post('/absensi/scan', [AbsensiController::class, 'scan'])->name('absensi.scan');
        Route::post('/penilaian/{laporan}', [TeknisiController::class, 'storePenilaian'])->name('penilaian.store');
        Route::post('/pengajuan/bebas-asrama', [PengajuanController::class, 'storeBebas'])->name('pengajuan.bebas');
        Route::post('/pengajuan/izin-pulang', [PengajuanController::class, 'storeIzin'])->name('pengajuan.izin');
        Route::post('/pengajuan/bebas-asrama/{pengajuan}/approve', [PengajuanController::class, 'approveBebas'])->name('pengajuan.bebas.approve');
        Route::post('/pengajuan/izin-pulang/{pengajuan}/approve', [PengajuanController::class, 'approveIzin'])->name('pengajuan.izin.approve');
        Route::get('/pengajuan/bebas-asrama/{pengajuan}/surat', [PengajuanController::class, 'downloadSuratBebas'])->name('pengajuan.bebas.surat');
    });
});
