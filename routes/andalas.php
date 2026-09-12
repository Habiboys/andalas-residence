<?php

use App\Http\Controllers\AbsensiController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AsetController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\CheckinController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DepartemenController;
use App\Http\Controllers\FakultasController;
use App\Http\Controllers\GedungController;
use App\Http\Controllers\KamarController;
use App\Http\Controllers\KategoriTransaksiController;
use App\Http\Controllers\KegiatanController;
use App\Http\Controllers\KeuanganController;
use App\Http\Controllers\KotaController;
use App\Http\Controllers\KuesionerController;
use App\Http\Controllers\LandingContentController;
use App\Http\Controllers\LandingController;
use App\Http\Controllers\MahasiswaController;
use App\Http\Controllers\PanelController;
use App\Http\Controllers\PembayaranController;
use App\Http\Controllers\PengajuanController;
use App\Http\Controllers\PeriodeController;
use App\Http\Controllers\PlacementController;
use App\Http\Controllers\ProdiController;
use App\Http\Controllers\ProvinsiController;
use App\Http\Controllers\RoleController;
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
    Route::get('/app', [PanelController::class, 'panel'])->name('andalas.app');
    Route::get('/app/{role}', [PanelController::class, 'panel'])->whereIn('role', ['mahasiswa', 'fasilitator', 'staff_admin', 'superadmin', 'teknisi', 'pimpinan'])->name('andalas.role');
    Route::get('/app/{role}/{page}', [PanelController::class, 'panel'])->whereIn('role', ['mahasiswa', 'fasilitator', 'staff_admin', 'superadmin', 'teknisi', 'pimpinan'])->name('andalas.panel');

    Route::prefix('api/andalas')->name('api.andalas.')->group(function () {
        // Landing content management (admin)
        Route::get('/landing/contents', [LandingContentController::class, 'listContents'])->name('landing.contents');
        Route::put('/landing/contents/{content}', [LandingContentController::class, 'updateContent'])->name('landing.contents.update');

        Route::get('/landing/informasi', [LandingContentController::class, 'listInformasi'])->name('landing.informasi');
        Route::post('/landing/informasi', [LandingContentController::class, 'storeInformasi'])->name('landing.informasi.store');
        Route::put('/landing/informasi/{informasi}', [LandingContentController::class, 'updateInformasi'])->name('landing.informasi.update');
        Route::delete('/landing/informasi/{informasi}', [LandingContentController::class, 'destroyInformasi'])->name('landing.informasi.destroy');

        Route::get('/landing/program', [LandingContentController::class, 'listPrograms'])->name('landing.program');
        Route::post('/landing/program', [LandingContentController::class, 'storeProgram'])->name('landing.program.store');
        Route::put('/landing/program/{program}', [LandingContentController::class, 'updateProgram'])->name('landing.program.update');
        Route::delete('/landing/program/{program}', [LandingContentController::class, 'destroyProgram'])->name('landing.program.destroy');
        Route::post('/landing/program-sub', [LandingContentController::class, 'storeProgramSub'])->name('landing.program-sub.store');
        Route::put('/landing/program-sub/{programSub}', [LandingContentController::class, 'updateProgramSub'])->name('landing.program-sub.update');
        Route::delete('/landing/program-sub/{programSub}', [LandingContentController::class, 'destroyProgramSub'])->name('landing.program-sub.destroy');

        Route::get('/landing/testimoni', [LandingContentController::class, 'listTestimoni'])->name('landing.testimoni');
        Route::post('/landing/testimoni', [LandingContentController::class, 'storeTestimoni'])->name('landing.testimoni.store');
        Route::put('/landing/testimoni/{testimoni}', [LandingContentController::class, 'updateTestimoni'])->name('landing.testimoni.update');
        Route::delete('/landing/testimoni/{testimoni}', [LandingContentController::class, 'destroyTestimoni'])->name('landing.testimoni.destroy');

        // ── Reads (fitur) ──
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('/gedung', [GedungController::class, 'index'])->name('gedung');
        Route::get('/mahasiswa', [MahasiswaController::class, 'index'])->name('mahasiswa');
        Route::get('/pembayaran', [PembayaranController::class, 'index'])->name('pembayaran');
        Route::get('/aset', [AsetController::class, 'index'])->name('aset');
        Route::get('/tiket', [TiketController::class, 'index'])->name('tiket');
        Route::get('/keuangan', [KeuanganController::class, 'index'])->name('keuangan');
        Route::get('/kegiatan', [KegiatanController::class, 'index'])->name('kegiatan');
        Route::get('/kuesioner', [KuesionerController::class, 'index'])->name('kuesioner');
        Route::get('/penempatan', [PlacementController::class, 'index'])->name('penempatan');
        Route::get('/pengajuan', [PengajuanController::class, 'index'])->name('pengajuan');
        Route::get('/absensi', [AbsensiController::class, 'index'])->name('absensi');
        Route::get('/kategori-transaksi', [KategoriTransaksiController::class, 'index'])->name('kategori');
        Route::get('/teknisi/performance', [TeknisiController::class, 'performance'])->name('teknisi.performance');
        Route::get('/audit-logs', [AuditLogController::class, 'recent'])->name('audit');

        // Master data
        Route::get('/master/prodi', [ProdiController::class, 'options'])->name('master.prodi');
        Route::get('/master/periode', [PeriodeController::class, 'options'])->name('master.periode');

        // Fakultas
        Route::get('/master/fakultas', [FakultasController::class, 'index'])->name('master.fakultas');
        Route::post('/master/fakultas', [FakultasController::class, 'store'])->name('master.fakultas.store');
        Route::put('/master/fakultas/{faculty}', [FakultasController::class, 'update'])->name('master.fakultas.update');
        Route::delete('/master/fakultas/{faculty}', [FakultasController::class, 'destroy'])->name('master.fakultas.destroy');

        // Departemen
        Route::get('/master/departemen', [DepartemenController::class, 'index'])->name('master.departemen');
        Route::post('/master/departemen', [DepartemenController::class, 'store'])->name('master.departemen.store');
        Route::put('/master/departemen/{departemen}', [DepartemenController::class, 'update'])->name('master.departemen.update');
        Route::delete('/master/departemen/{departemen}', [DepartemenController::class, 'destroy'])->name('master.departemen.destroy');

        // Prodi
        Route::get('/master/all-prodi', [ProdiController::class, 'index'])->name('master.all-prodi');
        Route::post('/master/all-prodi', [ProdiController::class, 'store'])->name('master.prodi.store');
        Route::put('/master/all-prodi/{prodi}', [ProdiController::class, 'update'])->name('master.prodi.update');
        Route::delete('/master/all-prodi/{prodi}', [ProdiController::class, 'destroy'])->name('master.prodi.destroy');

        // Periode
        Route::post('/master/periode', [PeriodeController::class, 'store'])->name('master.periode.store');
        Route::put('/master/periode/{periode}', [PeriodeController::class, 'update'])->name('master.periode.update');
        Route::delete('/master/periode/{periode}', [PeriodeController::class, 'destroy'])->name('master.periode.destroy');

        // Provinsi & Kota
        Route::get('/master/provinsi', [ProvinsiController::class, 'index'])->name('master.provinsi');
        Route::post('/master/provinsi', [ProvinsiController::class, 'store'])->name('master.provinsi.store');
        Route::put('/master/provinsi/{province}', [ProvinsiController::class, 'update'])->name('master.provinsi.update');
        Route::delete('/master/provinsi/{province}', [ProvinsiController::class, 'destroy'])->name('master.provinsi.destroy');
        Route::get('/master/kota', [KotaController::class, 'index'])->name('master.kota');
        Route::post('/master/kota', [KotaController::class, 'store'])->name('master.kota.store');
        Route::put('/master/kota/{city}', [KotaController::class, 'update'])->name('master.kota.update');
        Route::delete('/master/kota/{city}', [KotaController::class, 'destroy'])->name('master.kota.destroy');

        // Kategori transaksi
        Route::get('/master/kategori', [KategoriTransaksiController::class, 'masterList'])->name('master.kategori');
        Route::post('/master/kategori', [KategoriTransaksiController::class, 'store'])->name('master.kategori.store');
        Route::put('/master/kategori/{kategori}', [KategoriTransaksiController::class, 'update'])->name('master.kategori.update');
        Route::delete('/master/kategori/{kategori}', [KategoriTransaksiController::class, 'destroy'])->name('master.kategori.destroy');

        // Keuangan
        Route::get('/keuangan/dashboard', [KeuanganController::class, 'dashboard'])->name('keuangan.dashboard');
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
        Route::get('/admin/users', [AdminUserController::class, 'index'])->name('admin.users');
        Route::post('/admin/users', [AdminUserController::class, 'store'])->name('admin.users.store');
        Route::put('/admin/users/{user}', [AdminUserController::class, 'update'])->name('admin.users.update');
        Route::delete('/admin/users/{user}', [AdminUserController::class, 'destroy'])->name('admin.users.destroy');
        Route::get('/admin/roles', [RoleController::class, 'index'])->name('admin.roles');
        Route::get('/admin/audit-logs', [AuditLogController::class, 'index'])->name('admin.audit');

        // Placement, checkin, payment, tiket, absensi, pengajuan
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
