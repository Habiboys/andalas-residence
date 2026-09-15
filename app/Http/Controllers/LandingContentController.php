<?php

namespace App\Http\Controllers;

use App\Models\Informasi;
use App\Models\LandingContent;
use App\Models\Program;
use App\Models\ProgramSub;
use App\Models\Testimoni;
use App\Services\LandingContentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LandingContentController extends Controller
{
    // ─── Profil sections (landing_contents) ───────────────────────────────

    public function updateContent(Request $request, LandingContent $content): RedirectResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $request->validate([
            'title' => 'sometimes|string|max:200',
            'content' => 'nullable|string',
            'image' => 'nullable|string|max:255',
            'urutan' => 'sometimes|integer|min:0',
            'published' => 'sometimes|boolean',
        ]);

        $result = LandingContentService::updateContent($content, $validated);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Konten profil berhasil diperbarui.',
        ]);
    }

    // ─── Informasi (regulasi / sop / panduan / pengumuman) ────────────────

    public function storeInformasi(Request $request): RedirectResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $this->validateInformasi($request);

        $informasi = LandingContentService::storeInformasi($validated, $request->file('file'));

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Informasi {$informasi->judul} berhasil ditambahkan.",
        ]);
    }

    public function updateInformasi(Request $request, Informasi $informasi): RedirectResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $this->validateInformasi($request, true);

        $result = LandingContentService::updateInformasi($informasi, $validated, $request->file('file'));

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Informasi {$informasi->judul} diperbarui.",
        ]);
    }

    public function destroyInformasi(Request $request, Informasi $informasi): RedirectResponse
    {
        $this->authorizePermission(request(), 'landing.manage');
        LandingContentService::destroyInformasi($informasi);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Informasi dihapus.',
        ]);
    }

    private function validateInformasi(Request $request, bool $update = false): array
    {
        $kategori = $update ? 'sometimes' : 'required';

        return $request->validate([
            'kategori' => "{$kategori}|in:".implode(',', Informasi::KATEGORI),
            'judul' => $update ? 'sometimes|string|max:200' : 'required|string|max:200',
            'konten' => 'nullable|string',
            'tanggal' => 'nullable|date',
            'published' => 'sometimes|boolean',
        ]);
    }

    // ─── Program + sub-program ────────────────────────────────────────────

    public function storeProgram(Request $request): RedirectResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $this->validateProgram($request);

        $program = LandingContentService::storeProgram($validated);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Program {$program->nama} berhasil ditambahkan.",
        ]);
    }

    public function updateProgram(Request $request, Program $program): RedirectResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $this->validateProgram($request);

        $result = LandingContentService::updateProgram($program, $validated);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Program {$program->nama} diperbarui.",
        ]);
    }

    public function destroyProgram(Request $request, Program $program): RedirectResponse
    {
        $this->authorizePermission(request(), 'landing.manage');
        LandingContentService::destroyProgram($program);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Program dihapus.',
        ]);
    }

    private function validateProgram(Request $request): array
    {
        return $request->validate([
            'nama' => 'required|string|max:150',
            'deskripsi' => 'nullable|string',
            'ikon' => 'nullable|string|max:50',
            'urutan' => 'sometimes|integer|min:0',
            'published' => 'sometimes|boolean',
        ]);
    }

    public function storeProgramSub(Request $request): RedirectResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $this->validateProgramSub($request);

        $programSub = LandingContentService::storeProgramSub($validated, $request->file('gambar'));

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Sub-program {$programSub->judul} berhasil ditambahkan.",
        ]);
    }

    public function updateProgramSub(Request $request, ProgramSub $programSub): RedirectResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $this->validateProgramSub($request);

        $result = LandingContentService::updateProgramSub($programSub, $validated, $request->file('gambar'));

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Sub-program {$programSub->judul} diperbarui.",
        ]);
    }

    public function destroyProgramSub(Request $request, ProgramSub $programSub): RedirectResponse
    {
        $this->authorizePermission(request(), 'landing.manage');
        LandingContentService::destroyProgramSub($programSub);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Sub-program dihapus.',
        ]);
    }

    private function validateProgramSub(Request $request): array
    {
        $rules = [
            'judul' => 'sometimes|string|max:200',
            'deskripsi' => 'nullable|string',
            'urutan' => 'sometimes|integer|min:0',
        ];

        if ($request->isMethod('post')) {
            $rules['program_id'] = 'required|uuid|exists:programs,id';
            $rules['judul'] = 'required|string|max:200';
        }

        return $request->validate($rules);
    }

    // ─── Testimoni ────────────────────────────────────────────────────────

    public function storeTestimoni(Request $request): RedirectResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $this->validateTestimoni($request);

        $testimoni = LandingContentService::storeTestimoni($validated, $request->file('foto'));

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Testimoni {$testimoni->nama} berhasil ditambahkan.",
        ]);
    }

    public function updateTestimoni(Request $request, Testimoni $testimoni): RedirectResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $this->validateTestimoni($request);

        $result = LandingContentService::updateTestimoni($testimoni, $validated, $request->file('foto'));

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => "Testimoni {$testimoni->nama} diperbarui.",
        ]);
    }

    public function destroyTestimoni(Request $request, Testimoni $testimoni): RedirectResponse
    {
        $this->authorizePermission(request(), 'landing.manage');
        LandingContentService::destroyTestimoni($testimoni);

        return redirect()->back()->with('toast', [
            'type' => 'success',
            'message' => 'Testimoni dihapus.',
        ]);
    }

    private function validateTestimoni(Request $request): array
    {
        $rules = [
            'nama' => 'sometimes|string|max:150',
            'prodi' => 'nullable|string|max:150',
            'teks' => 'sometimes|string',
            'urutan' => 'sometimes|integer|min:0',
            'published' => 'sometimes|boolean',
        ];

        if ($request->isMethod('post')) {
            $rules['nama'] = 'required|string|max:150';
            $rules['teks'] = 'required|string';
        }

        return $request->validate($rules);
    }
}
