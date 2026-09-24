<?php

namespace App\Http\Controllers;

use App\Models\AttendanceSession;
use App\Models\FasilitatorWilayah;
use App\Models\JenisKegiatan;
use App\Models\Kegiatan;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ActivityMasterController extends Controller
{
    public function storeType(Request $request): RedirectResponse
    {
        $data = $request->validate(['nama' => ['required', 'string', 'max:100', 'unique:jenis_kegiatan,nama']]);
        JenisKegiatan::create($data);

        return back()->with('toast', ['type' => 'success', 'message' => 'Jenis kegiatan ditambahkan.']);
    }

    public function updateType(Request $request, JenisKegiatan $type): RedirectResponse
    {
        if ($type->is_other) {
            throw ValidationException::withMessages(['nama' => 'Jenis Lainnya tetap tersedia untuk nama kegiatan bebas.']);
        }
        $type->update($request->validate(['nama' => ['required', 'string', 'max:100', Rule::unique('jenis_kegiatan', 'nama')->ignore($type->id)]]));

        return back();
    }

    public function destroyType(JenisKegiatan $type): RedirectResponse
    {
        if ($type->is_other || Kegiatan::where('jenis_kegiatan_id', $type->id)->exists()) {
            throw ValidationException::withMessages(['nama' => 'Jenis Lainnya atau jenis yang sudah digunakan tidak dapat dihapus.']);
        }
        $type->delete();

        return back();
    }

    public function storeAssignment(Request $request): RedirectResponse
    {
        $data = $this->assignmentData($request);
        DB::transaction(function () use ($data): void {
            User::whereKey($data['user_id'])->lockForUpdate()->firstOrFail();
            $existing = FasilitatorWilayah::where('user_id', $data['user_id'])->first();
            if ($existing && $existing->gedung_id !== $data['gedung_id']) {
                $this->closeSessions($existing);
            }
            FasilitatorWilayah::updateOrCreate(['user_id' => $data['user_id']], ['gedung_id' => $data['gedung_id']]);
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Penugasan gedung tersimpan.']);
    }

    public function updateAssignment(Request $request, FasilitatorWilayah $assignment): RedirectResponse
    {
        $data = $this->assignmentData($request);
        if ($data['user_id'] !== $assignment->user_id) {
            throw ValidationException::withMessages(['user_id' => 'Fasilitator tidak dapat diganti pada penugasan ini. Tambahkan penugasan lain.']);
        }

        return $this->storeAssignment($request);
    }

    public function destroyAssignment(FasilitatorWilayah $assignment): RedirectResponse
    {
        DB::transaction(function () use ($assignment): void {
            $this->closeSessions($assignment);
            $assignment->delete();
        });

        return back();
    }

    private function assignmentData(Request $request): array
    {
        $data = $request->validate(['user_id' => 'required|uuid|exists:users,id', 'gedung_id' => 'required|uuid|exists:gedung,id']);
        if (! User::findOrFail($data['user_id'])->hasRole('fasilitator')) {
            throw ValidationException::withMessages(['user_id' => 'Pilih akun fasilitator.']);
        }

        return $data;
    }

    private function closeSessions(FasilitatorWilayah $assignment): void
    {
        AttendanceSession::where('facilitator_id', $assignment->user_id)->whereNull('closed_at')->update(['closed_at' => now()]);
    }
}
