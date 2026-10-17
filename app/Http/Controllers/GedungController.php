<?php

namespace App\Http\Controllers;

use App\Models\Gedung;
use App\Services\ResidencePhotoGallery;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class GedungController extends Controller
{
    public function create(Request $request): Response
    {
        $this->authorizePermission($request, 'gedung.manage');
        $user = app(RolePageController::class)->userPayload($request);

        return Inertia::render('admin/building-create', [
            'initialUser' => $user, 'role' => $user['role'], 'page' => 'kelola-bangunan',
        ]);
    }

    public function edit(Request $request, Gedung $gedung): Response
    {
        $this->authorizePermission($request, 'gedung.manage');
        $user = app(RolePageController::class)->userPayload($request);

        return Inertia::render('admin/building-create', [
            'initialUser' => $user, 'role' => $user['role'], 'page' => 'kelola-bangunan',
            'building' => $gedung,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, 'gedung.manage');

        if ($request->boolean('configure_categories') && ! $request->has('allowed_categories')) {
            $request->merge(['allowed_categories' => []]);
        }
        $validated = $request->validate([
            ...app(ResidencePhotoGallery::class)->rules(),
            'kode_gedung' => 'required|string|max:10|unique:gedung,kode_gedung',
            'nama_gedung' => 'required|string|max:150',
            'gender_peruntukan' => 'required|in:laki_laki,perempuan,campur',
            'alamat' => 'nullable|string',
            'deskripsi' => 'nullable|string',
            'allowed_categories' => ['sometimes', 'array'],
            'allowed_categories.*' => ['required', 'distinct', Rule::in(['local_kipk', 'local_non_kipk', 'student', 'international_student', 'international_free_facility', 'non_student', 'summer_course'])],
            'foto' => [
                'nullable',
                Rule::when($request->hasFile('foto'), ['image', 'mimes:jpeg,jpg,png,webp', 'max:2048'], ['string']),
            ],
        ]);

        $gedung = new Gedung;
        app(ResidencePhotoGallery::class)->save($gedung, $request, $validated);

        return ($request->boolean('continue_setup') ? redirect()->route('andalas.gedung.show', $gedung) : redirect()->back())->with('toast', [
            'type' => 'success',
            'message' => "Gedung {$gedung->nama_gedung} berhasil ditambahkan.",
        ]);
    }

    public function update(Request $request, Gedung $gedung): RedirectResponse
    {
        $this->authorizePermission($request, 'gedung.manage');

        if ($request->boolean('configure_categories') && ! $request->has('allowed_categories')) {
            $request->merge(['allowed_categories' => []]);
        }
        $validated = $request->validate([
            ...app(ResidencePhotoGallery::class)->rules(),
            'kode_gedung' => 'sometimes|string|max:10|unique:gedung,kode_gedung,'.$gedung->id,
            'nama_gedung' => 'sometimes|string|max:150',
            'gender_peruntukan' => 'sometimes|in:laki_laki,perempuan,campur',
            'alamat' => 'nullable|string',
            'deskripsi' => 'nullable|string',
            'allowed_categories' => ['sometimes', 'array'],
            'allowed_categories.*' => ['required', 'distinct', Rule::in(['local_kipk', 'local_non_kipk', 'student', 'international_student', 'international_free_facility', 'non_student', 'summer_course'])],
            'foto' => [
                'nullable',
                Rule::when($request->hasFile('foto'), ['image', 'mimes:jpeg,jpg,png,webp', 'max:2048'], ['string']),
            ],
        ]);

        app(ResidencePhotoGallery::class)->save($gedung, $request, $validated);

        return redirect()->route('andalas.gedung.show', $gedung)->with('toast', [
            'type' => 'success',
            'message' => "Gedung {$gedung->nama_gedung} diperbarui.",
        ]);
    }

    public function destroy(Request $request, Gedung $gedung): RedirectResponse
    {
        $this->authorizePermission($request, 'gedung.manage');

        if ($gedung->lantai()->whereHas('kamar.penempatanKamar')->exists()) {
            return redirect()->back()->with('toast', [
                'type' => 'error',
                'message' => "Gedung {$gedung->nama_gedung} tidak dapat dihapus karena ada kamar yang berisi penghuni.",
            ]);
        }

        $gedung->delete();

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Gedung dihapus.',
        ]);
    }
}
