<?php

namespace App\Http\Controllers;

use App\Models\StokAset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class StokAsetController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'stok.manage');
        StokAset::create($this->validated($request));

        return back()->with('toast', ['type' => 'success', 'message' => 'Jenis dan stok aset ditambahkan.']);
    }

    public function update(Request $request, StokAset $stokAset): RedirectResponse
    {
        $this->authorizePermission($request, 'stok.manage');
        $data = $this->validated($request, $stokAset);
        DB::transaction(function () use ($stokAset, $data): void {
            $stock = StokAset::lockForUpdate()->findOrFail($stokAset->id);
            if ($data['jumlah_total'] < $stock->aset()->sum('jumlah')) {
                throw ValidationException::withMessages(['jumlah_total' => 'Jumlah keseluruhan tidak boleh kurang dari jumlah yang sudah ditempatkan.']);
            }
            $stock->update($data);
            $stock->aset()->update(['nama_aset' => $stock->nama, 'kategori' => $stock->kategori]);
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Stok aset diperbarui.']);
    }

    public function destroy(Request $request, StokAset $stokAset): RedirectResponse
    {
        $this->authorizePermission($request, 'stok.manage');
        DB::transaction(function () use ($stokAset): void {
            $stock = StokAset::lockForUpdate()->findOrFail($stokAset->id);
            if ($stock->aset()->exists()) {
                throw ValidationException::withMessages(['stok' => 'Jenis aset masih digunakan dalam pendataan kamar atau fasilitas.']);
            }
            $stock->delete();
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Stok aset dihapus.']);
    }

    private function validated(Request $request, ?StokAset $stock = null): array
    {
        return $request->validate([
            'kode' => ['required', 'string', 'max:50', Rule::unique('stok_aset', 'kode')->ignore($stock)],
            'nama' => ['required', 'string', 'max:150'],
            'kategori' => ['required', 'string', 'max:50'],
            'satuan' => ['required', 'string', 'max:30'],
            'jumlah_total' => ['required', 'integer', 'min:0', 'max:1000000'],
        ]);
    }
}
