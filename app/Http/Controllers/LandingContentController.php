<?php

namespace App\Http\Controllers;

use App\Models\Informasi;
use App\Models\LandingContent;
use App\Models\Program;
use App\Models\ProgramSub;
use App\Models\Testimoni;
use App\Services\LandingContentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LandingContentController extends Controller
{
    // ─── Profil sections (landing_contents) ───────────────────────────────

    public function listContents(): JsonResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        return response()->json(LandingContentService::contents());
    }

    public function updateContent(Request $request, LandingContent $content): JsonResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $request->validate([
            'title' => 'sometimes|string|max:200',
            'content' => 'nullable|string',
            'image' => 'nullable|string|max:255',
            'urutan' => 'sometimes|integer|min:0',
            'published' => 'sometimes|boolean',
        ]);

        return response()->json(LandingContentService::updateContent($content, $validated));
    }

    // ─── Informasi (regulasi / sop / panduan / pengumuman) ────────────────

    public function listInformasi(Request $request): JsonResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        return response()->json(LandingContentService::informasi($request->query('kategori')));
    }

    public function storeInformasi(Request $request): JsonResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $this->validateInformasi($request);

        return response()->json(
            LandingContentService::storeInformasi($validated, $request->file('file')),
            201,
        );
    }

    public function updateInformasi(Request $request, Informasi $informasi): JsonResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $this->validateInformasi($request, true);

        return response()->json(
            LandingContentService::updateInformasi($informasi, $validated, $request->file('file')),
        );
    }

    public function destroyInformasi(Informasi $informasi): JsonResponse
    {
        $this->authorizePermission(request(), 'landing.manage');
        LandingContentService::destroyInformasi($informasi);

        return response()->json(['ok' => true]);
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

    public function listPrograms(): JsonResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        return response()->json(LandingContentService::programs());
    }

    public function storeProgram(Request $request): JsonResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $this->validateProgram($request);

        return response()->json(LandingContentService::storeProgram($validated), 201);
    }

    public function updateProgram(Request $request, Program $program): JsonResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $this->validateProgram($request);

        return response()->json(LandingContentService::updateProgram($program, $validated));
    }

    public function destroyProgram(Program $program): JsonResponse
    {
        $this->authorizePermission(request(), 'landing.manage');
        LandingContentService::destroyProgram($program);

        return response()->json(['ok' => true]);
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

    public function storeProgramSub(Request $request): JsonResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $this->validateProgramSub($request);

        return response()->json(
            LandingContentService::storeProgramSub($validated, $request->file('gambar')),
            201,
        );
    }

    public function updateProgramSub(Request $request, ProgramSub $programSub): JsonResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $this->validateProgramSub($request);

        return response()->json(
            LandingContentService::updateProgramSub($programSub, $validated, $request->file('gambar')),
        );
    }

    public function destroyProgramSub(ProgramSub $programSub): JsonResponse
    {
        $this->authorizePermission(request(), 'landing.manage');
        LandingContentService::destroyProgramSub($programSub);

        return response()->json(['ok' => true]);
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

    public function listTestimoni(): JsonResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        return response()->json(LandingContentService::testimonials());
    }

    public function storeTestimoni(Request $request): JsonResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $this->validateTestimoni($request);

        return response()->json(
            LandingContentService::storeTestimoni($validated, $request->file('foto')),
            201,
        );
    }

    public function updateTestimoni(Request $request, Testimoni $testimoni): JsonResponse
    {
        $this->authorizePermission(request(), 'landing.manage');

        $validated = $this->validateTestimoni($request);

        return response()->json(
            LandingContentService::updateTestimoni($testimoni, $validated, $request->file('foto')),
        );
    }

    public function destroyTestimoni(Testimoni $testimoni): JsonResponse
    {
        $this->authorizePermission(request(), 'landing.manage');
        LandingContentService::destroyTestimoni($testimoni);

        return response()->json(['ok' => true]);
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
