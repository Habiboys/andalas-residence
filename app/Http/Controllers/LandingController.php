<?php

namespace App\Http\Controllers;

use App\Models\Gedung;
use App\Models\Informasi;
use App\Models\Kamar;
use App\Models\LandingContent;
use App\Models\PenempatanKamar;
use App\Models\Program;
use App\Models\Testimoni;
use Inertia\Inertia;
use Inertia\Response;

class LandingController extends Controller
{
    private const PROFIL_KEY_MAP = [
        'sejarah' => 'sejarah',
        'visi-misi' => 'visi_misi',
        'struktur-organisasi' => 'struktur_organisasi',
    ];

    private const INFORMASI_KATEGORI = ['regulasi', 'sop', 'panduan', 'pengumuman'];

    public function beranda(): Response
    {
        return Inertia::render('landing/beranda', [
            ...$this->shared(),
            'testimoni' => Testimoni::where('published', true)->orderBy('urutan')->get(),
            'statistik' => [
                'gedung' => Gedung::count(),
                'kamar' => Kamar::count(),
                'penghuni' => PenempatanKamar::where('status', 'aktif')->count(),
            ],
        ]);
    }

    public function profil(string $section): Response
    {
        $key = self::PROFIL_KEY_MAP[$section] ?? abort(404);

        $content = LandingContent::where('key', $key)->firstOrFail();

        $sections = LandingContent::whereIn('key', array_values(self::PROFIL_KEY_MAP))
            ->pluck('title', 'key');

        return Inertia::render('landing/profil', [
            ...$this->shared(),
            'section' => $key,
            'sections' => $sections,
            'content' => $content,
        ]);
    }

    public function unit(): Response
    {
        return Inertia::render('landing/unit', [
            ...$this->shared(),
            'gedung' => Gedung::withCount('lantai')->orderBy('kode_gedung')->get(),
        ]);
    }

    public function informasi(string $kategori): Response
    {
        if (! in_array($kategori, self::INFORMASI_KATEGORI, true)) {
            abort(404);
        }

        $items = Informasi::where('kategori', $kategori)
            ->where('published', true)
            ->orderByDesc('tanggal')
            ->get();

        return Inertia::render('landing/informasi', [
            ...$this->shared(),
            'kategori' => $kategori,
            'items' => $items,
        ]);
    }

    public function programIndex(): Response
    {
        $programs = Program::with('sub')->where('published', true)->orderBy('urutan')->get();

        return Inertia::render('landing/program', [
            ...$this->shared(),
            'programs' => $programs,
        ]);
    }

    public function programDetail(string $program): Response
    {
        $program = Program::with('sub')->where('published', true)
            ->where('id', $program)
            ->orWhere('nama', $program)
            ->firstOrFail();

        return Inertia::render('landing/program-detail', [
            ...$this->shared(),
            'programs' => Program::with('sub')->where('published', true)->orderBy('urutan')->get(),
            'program' => $program,
        ]);
    }

    public function kontak(): Response
    {
        return Inertia::render('landing/kontak', $this->shared());
    }

    private function shared(): array
    {
        return [
            'informasiMenu' => self::INFORMASI_KATEGORI,
            'profilSections' => [
                'sejarah' => LandingContent::where('key', 'sejarah')->value('title') ?? 'Sejarah',
                'visi-misi' => LandingContent::where('key', 'visi_misi')->value('title') ?? 'Visi Misi',
                'struktur-organisasi' => LandingContent::where('key', 'struktur_organisasi')->value('title') ?? 'Struktur Organisasi',
            ],
        ];
    }
}
