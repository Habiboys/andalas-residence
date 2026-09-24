<?php

namespace App\Http\Controllers;

use App\Models\Informasi;
use App\Models\LandingContent;
use App\Models\Program;
use App\Models\ProgramSub;
use App\Models\Testimoni;
use App\Services\LandingContentService;
use App\Services\LandingRichText;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class LandingContentController extends Controller
{
    private const SECTIONS = [
        'profil' => LandingContent::class,
        'informasi' => Informasi::class,
        'program' => Program::class,
        'program-sub' => ProgramSub::class,
        'testimoni' => Testimoni::class,
    ];

    public function create(Request $request, string $section): Response
    {
        $this->authorizePermission($request, 'landing.manage');
        abort_unless(isset(self::SECTIONS[$section]) && $section !== 'profil', 404);

        return $this->editor($request, $section);
    }

    public function edit(Request $request, string $section, string $id): Response
    {
        $this->authorizePermission($request, 'landing.manage');
        $model = self::SECTIONS[$section] ?? abort(404);

        return $this->editor($request, $section, $model::findOrFail($id)->toArray());
    }

    private function editor(Request $request, string $section, ?array $record = null): Response
    {
        $program = $section === 'program-sub'
            ? Program::findOrFail($record['program_id'] ?? $request->query('program_id'))
            : null;
        foreach (['content', 'konten', 'deskripsi'] as $field) {
            if (isset($record[$field])) {
                $record[$field] = LandingRichText::html($record[$field]);
            }
        }

        return Inertia::render('admin/landing-editor', [
            'initialUser' => app(RolePageController::class)->userPayload($request),
            'role' => $request->user()->hasRole('superadmin') ? 'superadmin' : 'staff_admin',
            'page' => 'kelola-'.($section === 'program-sub' ? 'program' : $section),
            'section' => $section,
            'record' => $record,
            'parentProgram' => $program?->only(['id', 'nama']),
            'returnUrl' => route('admin.kelola-'.($section === 'program-sub' ? 'program' : $section)),
        ]);
    }

    public function uploadImage(Request $request): JsonResponse
    {
        $this->authorizePermission($request, 'landing.manage');
        $request->validate(['image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048']]);
        $path = $request->file('image')->store('landing/editor', 'public');

        return response()->json(['url' => Storage::disk('public')->url($path)]);
    }

    // ─── Profil sections (landing_contents) ───────────────────────────────

    public function updateContent(Request $request, LandingContent $content): RedirectResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $request->validate([
            'title' => 'sometimes|string|max:200',
            'content' => 'nullable|string|max:2000000',
            'image' => 'nullable|string|max:255',
            'urutan' => 'sometimes|integer|min:0',
            'published' => 'sometimes|boolean',
        ]);

        $result = LandingContentService::updateContent($content, $validated);

        return redirect()->route('admin.kelola-profil')->with('toast', [
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

        return redirect()->route('admin.kelola-informasi')->with('toast', [
            'type' => 'success',
            'message' => "Informasi {$informasi->judul} berhasil ditambahkan.",
        ]);
    }

    public function updateInformasi(Request $request, Informasi $informasi): RedirectResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $this->validateInformasi($request, true);

        $result = LandingContentService::updateInformasi($informasi, $validated, $request->file('file'));

        return redirect()->route('admin.kelola-informasi')->with('toast', [
            'type' => 'success',
            'message' => "Informasi {$informasi->judul} diperbarui.",
        ]);
    }

    public function destroyInformasi(Request $request, Informasi $informasi): RedirectResponse
    {
        $this->authorizePermission(request(), 'landing.manage');
        LandingContentService::destroyInformasi($informasi);

        return redirect()->route('admin.kelola-informasi')->with('toast', [
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
            'konten' => 'nullable|string|max:2000000',
            'file' => 'nullable|file|mimes:pdf,doc,docx|max:10240',
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

        return redirect()->route('admin.kelola-program')->with('toast', [
            'type' => 'success',
            'message' => "Program {$program->nama} berhasil ditambahkan.",
        ]);
    }

    public function updateProgram(Request $request, Program $program): RedirectResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $this->validateProgram($request);

        $result = LandingContentService::updateProgram($program, $validated);

        return redirect()->route('admin.kelola-program')->with('toast', [
            'type' => 'success',
            'message' => "Program {$program->nama} diperbarui.",
        ]);
    }

    public function destroyProgram(Request $request, Program $program): RedirectResponse
    {
        $this->authorizePermission(request(), 'landing.manage');
        LandingContentService::destroyProgram($program);

        return redirect()->route('admin.kelola-program')->with('toast', [
            'type' => 'success',
            'message' => 'Program dihapus.',
        ]);
    }

    private function validateProgram(Request $request): array
    {
        return $request->validate([
            'nama' => 'required|string|max:150',
            'deskripsi' => 'nullable|string|max:15000',
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

        return redirect()->route('admin.kelola-program')->with('toast', [
            'type' => 'success',
            'message' => "Sub-program {$programSub->judul} berhasil ditambahkan.",
        ]);
    }

    public function updateProgramSub(Request $request, ProgramSub $programSub): RedirectResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $this->validateProgramSub($request);

        $result = LandingContentService::updateProgramSub($programSub, $validated, $request->file('gambar'));

        return redirect()->route('admin.kelola-program')->with('toast', [
            'type' => 'success',
            'message' => "Sub-program {$programSub->judul} diperbarui.",
        ]);
    }

    public function destroyProgramSub(Request $request, ProgramSub $programSub): RedirectResponse
    {
        $this->authorizePermission(request(), 'landing.manage');
        LandingContentService::destroyProgramSub($programSub);

        return redirect()->route('admin.kelola-program')->with('toast', [
            'type' => 'success',
            'message' => 'Sub-program dihapus.',
        ]);
    }

    private function validateProgramSub(Request $request): array
    {
        $rules = [
            'judul' => 'sometimes|string|max:200',
            'gambar' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'deskripsi' => 'nullable|string|max:15000',
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

        return redirect()->route('admin.kelola-testimoni')->with('toast', [
            'type' => 'success',
            'message' => "Testimoni {$testimoni->nama} berhasil ditambahkan.",
        ]);
    }

    public function updateTestimoni(Request $request, Testimoni $testimoni): RedirectResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $this->validateTestimoni($request);

        $result = LandingContentService::updateTestimoni($testimoni, $validated, $request->file('foto'));

        return redirect()->route('admin.kelola-testimoni')->with('toast', [
            'type' => 'success',
            'message' => "Testimoni {$testimoni->nama} diperbarui.",
        ]);
    }

    public function destroyTestimoni(Request $request, Testimoni $testimoni): RedirectResponse
    {
        $this->authorizePermission(request(), 'landing.manage');
        LandingContentService::destroyTestimoni($testimoni);

        return redirect()->route('admin.kelola-testimoni')->with('toast', [
            'type' => 'success',
            'message' => 'Testimoni dihapus.',
        ]);
    }

    private function validateTestimoni(Request $request): array
    {
        $rules = [
            'nama' => 'sometimes|string|max:150',
            'prodi' => 'nullable|string|max:150',
            'foto' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
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
