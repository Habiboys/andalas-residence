<?php

namespace App\Http\Controllers;

use App\Models\Gedung;
use App\Models\Informasi;
use App\Models\Kamar;
use App\Models\LandingContent;
use App\Models\PenempatanKamar;
use App\Models\Program;
use App\Models\ProgramSub;
use App\Models\Testimoni;
use App\Services\LandingRichText;
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
            'statistik' => $this->statistik(),
            'pengumuman' => Informasi::where('published', true)->where('kategori', 'pengumuman')->orderByDesc('tanggal')->limit(3)->get(['id', 'judul', 'tanggal']),
            'galeri' => Gedung::whereNotNull('foto')->where('foto', '!=', '')->orderBy('kode_gedung')->limit(4)->get()
                ->map(fn (Gedung $gedung): array => ['id' => $gedung->id, 'judul' => $gedung->nama_gedung, 'foto' => '/storage/'.$gedung->foto, 'kategori' => 'Hunian'])
                ->concat(ProgramSub::whereHas('program', fn ($query) => $query->where('published', true))->whereNotNull('gambar')->where('gambar', '!=', '')->orderBy('urutan')->limit(4)->get()
                    ->map(fn (ProgramSub $sub): array => ['id' => $sub->id, 'judul' => $sub->judul, 'foto' => '/storage/'.$sub->gambar, 'kategori' => 'Program']))->values(),
        ]);
    }

    public function profil(string $section): Response
    {
        $key = self::PROFIL_KEY_MAP[$section] ?? abort(404);

        $content = LandingContent::where('key', $key)->where('published', true)->firstOrFail();

        $sections = LandingContent::whereIn('key', array_values(self::PROFIL_KEY_MAP))
            ->where('published', true)->pluck('title', 'key');
        $content->content = LandingRichText::html($content->content);

        return Inertia::render('landing/profil', [
            ...$this->shared(),
            'section' => $key,
            'sections' => $sections,
            'content' => $content,
            'statistik' => $this->statistik(),
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
            'items' => $items->map(function (Informasi $item): Informasi {
                $item->konten = LandingRichText::html($item->konten);

                return $item;
            }),
        ]);
    }

    public function programIndex(): Response
    {
        $programs = Program::with('sub')->where('published', true)->orderBy('urutan')->get();

        return Inertia::render('landing/program', [
            ...$this->shared(),
            'programs' => $programs->map(fn (Program $item): Program => $this->richProgram($item)),
        ]);
    }

    public function programDetail(string $program): Response
    {
        $program = Program::with('sub')->where('published', true)
            ->where(fn ($query) => $query->where('id', $program)->orWhere('nama', $program))
            ->firstOrFail();

        return Inertia::render('landing/program-detail', [
            ...$this->shared(),
            'programs' => Program::with('sub')->where('published', true)->orderBy('urutan')->get(),
            'program' => $this->richProgram($program),
        ]);
    }

    public function kontak(): Response
    {
        return Inertia::render('landing/kontak', $this->shared());
    }

    private function richProgram(Program $program): Program
    {
        $program->deskripsi = LandingRichText::html($program->deskripsi);
        foreach ($program->sub as $sub) {
            $sub->deskripsi = LandingRichText::html($sub->deskripsi);
        }

        return $program;
    }

    private function statistik(): array
    {
        return [
            'gedung' => Gedung::count(),
            'kamar' => Kamar::count(),
            'penghuni' => PenempatanKamar::where('status', 'aktif')->count(),
        ];
    }

    private function shared(): array
    {
        $profiles = LandingContent::whereIn('key', array_values(self::PROFIL_KEY_MAP))->where('published', true)->pluck('title', 'key');
        $sections = [];
        foreach (self::PROFIL_KEY_MAP as $slug => $key) {
            if (isset($profiles[$key])) {
                $sections[$slug] = $profiles[$key];
            }
        }

        return [
            'informasiMenu' => self::INFORMASI_KATEGORI,
            'profilSections' => $sections,
        ];
    }
}
