<?php

namespace App\Http\Controllers;

use App\Models\RoomType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RoomTypeController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'gedung.manage');
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', 'regex:/^[a-z][a-z0-9_]*$/D', Rule::unique('room_types', 'code')],
            'name' => ['required', 'string', 'max:100'],
            'active' => ['required', 'boolean'],
        ]);
        RoomType::create($data);

        return back()->with('toast', ['type' => 'success', 'message' => 'Tipe kamar ditambahkan. Pilih penggunaannya pada detail gedung.']);
    }

    public function update(Request $request, RoomType $roomType): RedirectResponse
    {
        $this->authorizePermission($request, 'gedung.manage');
        $data = $request->validate([
            'code' => ['prohibited'],
            'name' => ['required', 'string', 'max:100'],
            'active' => ['required', 'boolean'],
        ]);
        $roomType->update($data);

        return back()->with('toast', ['type' => 'success', 'message' => 'Master tipe kamar diperbarui. Data kamar dan tarif sebelumnya tetap tersimpan.']);
    }
}
