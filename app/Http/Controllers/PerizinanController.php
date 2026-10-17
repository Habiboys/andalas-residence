<?php

namespace App\Http\Controllers;

use App\Enums\StatusIzinPulang;
use App\Models\MahasiswaProfil;
use App\Models\PengajuanIzinPulang;
use App\Services\MonthlyLeaveAllowance;
use App\Services\ResidenceBuildingAccess;
use App\Services\ResidenceLifecycle;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PerizinanController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'pengajuan.submit');
        $validated = $request->validate([
            'jenis' => ['required', 'in:pulkam,kegiatan,sakit'],
            'tanggal_mulai' => ['required', 'date', 'after_or_equal:'.now(config('residence.timezone'))->toDateString()],
            'tanggal_kembali' => ['required', 'date', 'after_or_equal:tanggal_mulai'],
            'alasan' => ['required', 'string', 'max:2000'],
            'tujuan_alamat' => ['required_unless:jenis,sakit', 'nullable', 'string', 'max:255'],
            'kontak_darurat' => ['nullable', 'string', 'max:50'],
            'dokumen' => ['required_if:jenis,sakit', 'nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:5120'],
        ]);
        $student = $request->user()->mahasiswaProfil;
        abort_unless($student !== null, 403);
        DB::transaction(function () use ($student, $request, $validated): void {
            $student = MahasiswaProfil::query()->lockForUpdate()->findOrFail($student->id);
            $placement = $student->penempatanKamar()->with('kamar.lantai')->where('status', 'aktif')->latest('tanggal_mulai')->first();
            if (! $placement || $student->status_huni !== 'aktif' || ! app(ResidenceLifecycle::class)->isBinaan($student)) {
                throw ValidationException::withMessages(['jenis' => 'Perizinan hanya tersedia bagi mahasiswa penghuni aktif.']);
            }
            if (PengajuanIzinPulang::where('mahasiswa_id', $student->id)->whereNotIn('status', ['ditolak', 'selesai_kembali'])
                ->where(fn ($query) => $query->where('jenis', '!=', 'sakit')->orWhere('status', '!=', 'disetujui')->orWhereDate('tanggal_kembali', '>=', now(config('residence.timezone'))->toDateString()))->exists()) {
                throw ValidationException::withMessages(['jenis' => 'Selesaikan izin sebelumnya sebelum mengajukan izin baru.']);
            }
            $sick = $validated['jenis'] === 'sakit';
            if (! $sick) {
                app(MonthlyLeaveAllowance::class)->validate($student, $validated['tanggal_mulai'], $validated['tanggal_kembali']);
            }
            unset($validated['dokumen']);
            PengajuanIzinPulang::create([
                ...$validated,
                'mahasiswa_id' => $student->id,
                'gedung_id' => $placement->kamar->lantai->gedung_id,
                'status' => $sick ? StatusIzinPulang::Diajukan : StatusIzinPulang::SedangIzin,
                'berangkat_pada' => $sick ? null : now(),
                'rencana_kembali_pada' => $sick ? null : Carbon::parse($validated['tanggal_kembali'].' 23:59:59', config('residence.timezone'))->utc(),
                'dokumen_path' => $request->file('dokumen')?->store('perizinan/dokumen', 'local'),
            ]);
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Pengajuan tersimpan. Periksa status izin pada daftar perizinan.']);
    }

    public function review(Request $request, PengajuanIzinPulang $perizinan): RedirectResponse
    {
        $this->authorizePermission($request, 'perizinan.review');
        abort_unless(ResidenceBuildingAccess::allows($request->user(), $perizinan->gedung_id), 403);
        $validated = $request->validate(['status' => ['required', 'in:disetujui,ditolak'], 'catatan_verifikasi' => ['required_if:status,ditolak', 'nullable', 'string', 'max:2000']]);
        DB::transaction(function () use ($request, $perizinan, $validated): void {
            $perizinan = PengajuanIzinPulang::query()->lockForUpdate()->findOrFail($perizinan->id);
            if ($perizinan->status !== StatusIzinPulang::Diajukan) {
                throw ValidationException::withMessages(['status' => 'Hanya izin yang menunggu verifikasi yang dapat diputuskan.']);
            }
            if ($validated['status'] === 'disetujui') {
                if ($perizinan->jenis === 'sakit' && (! $perizinan->dokumen_path || ! Storage::disk('local')->exists($perizinan->dokumen_path))) {
                    throw ValidationException::withMessages(['status' => 'Bukti sakit wajib tersedia sebelum disetujui.']);
                }
                if ($perizinan->jenis !== 'sakit') {
                    MahasiswaProfil::whereKey($perizinan->mahasiswa_id)->lockForUpdate()->firstOrFail();
                    app(MonthlyLeaveAllowance::class)->validate($perizinan->mahasiswa, $perizinan->tanggal_mulai->toDateString(), $perizinan->tanggal_kembali->toDateString(), $perizinan->id);
                }
            }
            $perizinan->update([
                'status' => $validated['status'] === 'disetujui' ? ($perizinan->jenis === 'sakit' ? StatusIzinPulang::Disetujui : StatusIzinPulang::SedangIzin) : StatusIzinPulang::Ditolak,
                'disetujui_oleh' => $request->user()->id,
                'berangkat_pada' => $validated['status'] === 'disetujui' && $perizinan->jenis !== 'sakit' ? now() : null,
                'catatan_verifikasi' => $validated['catatan_verifikasi'] ?? null,
            ]);
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Keputusan izin tersimpan.']);
    }

    public function proof(Request $request, PengajuanIzinPulang $perizinan, string $kind): RedirectResponse
    {
        $this->authorizePermission($request, 'pengajuan.submit');
        abort_unless($request->user()->mahasiswaProfil?->id === $perizinan->mahasiswa_id, 403);
        abort_unless(in_array($kind, ['sampai', 'kembali'], true), 404);
        abort_if($perizinan->jenis === 'sakit', 422, 'Izin sakit menggunakan bukti pendukung dan persetujuan fasilitator.');
        $validated = $request->validate([
            'foto' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'accuracy' => ['required', 'numeric', 'min:0', 'max:100000'],
        ]);
        DB::transaction(function () use ($request, $perizinan, $kind, $validated): void {
            $perizinan = PengajuanIzinPulang::query()->lockForUpdate()->findOrFail($perizinan->id);
            $allowed = $kind === 'sampai' ? StatusIzinPulang::SedangIzin : StatusIzinPulang::SudahSampai;
            $alreadyUploaded = $kind === 'sampai' ? $perizinan->sampai_foto_path !== null : $perizinan->kembali_foto_path !== null;
            if ($perizinan->status !== $allowed || $alreadyUploaded) {
                throw ValidationException::withMessages(['foto' => 'Bukti tidak dapat diunggah pada status izin ini. Unggah bukti sampai sebelum bukti kembali.']);
            }
            if ($perizinan->tanggal_mulai->toDateString() > now(config('residence.timezone'))->toDateString()) {
                throw ValidationException::withMessages(['foto' => 'Tanggal mulai izin belum tiba.']);
            }
            $perizinan->update([
                $kind.'_foto_path' => $request->file('foto')->store('perizinan/bukti', 'local'),
                $kind.'_pada' => now(),
                $kind.'_latitude' => $validated['latitude'],
                $kind.'_longitude' => $validated['longitude'],
                $kind.'_accuracy' => $validated['accuracy'],
                'status' => $kind === 'sampai' ? StatusIzinPulang::SudahSampai : StatusIzinPulang::SelesaiKembali,
            ]);
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Foto, waktu, dan lokasi bukti berhasil dicatat.']);
    }

    public function evidence(Request $request, PengajuanIzinPulang $perizinan, string $kind): StreamedResponse
    {
        $owner = $request->user()->mahasiswaProfil?->id === $perizinan->mahasiswa_id;
        $reviewer = $request->user()->can('perizinan.review') && ResidenceBuildingAccess::allows($request->user(), $perizinan->gedung_id);
        abort_unless($owner || $reviewer, 403);
        $path = match ($kind) {
            'dokumen' => $perizinan->dokumen_path,
            'sampai' => $perizinan->sampai_foto_path,
            'kembali' => $perizinan->kembali_foto_path,
            default => null,
        };
        abort_unless($path && Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path);
    }
}
