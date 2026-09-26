<?php

namespace App\Http\Controllers;

use App\Models\DocumentSigner;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DocumentSignerController extends Controller
{
    private const PERMISSION = 'documents.manage';

    public function index(Request $request): Response
    {
        $this->authorizePermission($request, self::PERMISSION);

        return Inertia::render('admin/kelola-penandatangan', [
            'role' => $request->user()->roles->first()?->name ?? 'staff_admin',
            'page' => 'kelola-penandatangan',
            'initialUser' => app(RolePageController::class)->userPayload($request),
            'signers' => DocumentSigner::query()->latest('id')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $this->authorizePermission($request, self::PERMISSION);

        $data = $this->validated($request);
        DB::transaction(function () use ($data): void {
            DocumentSigner::query()->update(['aktif' => false]);
            DocumentSigner::create([...$data, 'aktif' => true]);
        });

        return back()->with('success', 'Penandatangan disimpan dan diaktifkan. Penandatangan sebelumnya otomatis menjadi cadangan.');
    }

    public function update(Request $request, DocumentSigner $signer): RedirectResponse
    {
        $this->authorizePermission($request, self::PERMISSION);

        $signer->update($this->validated($request));

        return back()->with('success', 'Penandatangan diperbarui.');
    }

    public function activate(Request $request, DocumentSigner $signer): RedirectResponse
    {
        $this->authorizePermission($request, self::PERMISSION);

        DB::transaction(function () use ($signer): void {
            DocumentSigner::query()->whereKey($signer->getKey())->update(['aktif' => true]);
            DocumentSigner::query()->whereKeyNot($signer->getKey())->update(['aktif' => false]);
        });

        return back()->with('success', 'Penandatangan ini dipakai untuk surat yang diterbitkan berikutnya.');
    }

    public function destroy(Request $request, DocumentSigner $signer): RedirectResponse
    {
        $this->authorizePermission($request, self::PERMISSION);

        abort_if($signer->aktif, 422, 'Penandatangan aktif tidak dapat dihapus. Aktifkan penandatangan lain terlebih dahulu.');

        $signer->delete();

        return back()->with('success', 'Penandatangan dihapus.');
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        return $request->validate([
            'nama' => ['required', 'string', 'max:120'],
            'nip' => ['nullable', 'string', 'max:30'],
            'jabatan' => ['required', 'string', 'max:120'],
            'unit' => ['required', 'string', 'max:120'],
        ]);
    }
}
