<?php

namespace App\Services;

use App\Models\Informasi;
use App\Models\LandingContent;
use App\Models\Program;
use App\Models\ProgramSub;
use App\Models\Testimoni;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;

class LandingContentService
{
    public static function settings(): array
    {
        $defaults = json_decode(file_get_contents(database_path('seeders/data/landing-site.json')), true, flags: JSON_THROW_ON_ERROR);

        $stored = LandingContent::where('key', 'site_settings')->value('settings') ?? [];
        $settings = [...$defaults, ...$stored];
        foreach (['hero', 'headings', 'site'] as $group) {
            $settings[$group] = [...$defaults[$group], ...($stored[$group] ?? [])];
        }

        return $settings;
    }

    private static function richData(array $data): array
    {
        foreach (['content', 'konten', 'deskripsi'] as $field) {
            if (array_key_exists($field, $data)) {
                $data[$field] = LandingRichText::html($data[$field]);
            }
        }

        return $data;
    }

    // ─── Profil sections (landing_contents) ───────────────────────────────

    public static function contents(): Collection
    {
        return LandingContent::where('key', '!=', 'site_settings')->orderBy('urutan')->get();
    }

    public static function updateContent(LandingContent $content, array $data): LandingContent
    {
        $content->update(self::richData($data));

        return $content;
    }

    // ─── Informasi ────────────────────────────────────────────────────────

    public static function informasi(?string $kategori = null): Collection
    {
        $query = Informasi::orderByDesc('tanggal');

        if ($kategori) {
            $query->where('kategori', $kategori);
        }

        return $query->get();
    }

    public static function storeInformasi(array $data, ?UploadedFile $file = null): Informasi
    {
        if (! is_string($data['file'] ?? null)) {
            unset($data['file']);
        }
        if ($file) {
            $data['file'] = app(LandingMedia::class)->store($file)->path;
        }

        return Informasi::create(self::richData($data));
    }

    public static function updateInformasi(Informasi $informasi, array $data, ?UploadedFile $file = null): Informasi
    {
        if (! is_string($data['file'] ?? null)) {
            unset($data['file']);
        }
        if ($file) {
            $data['file'] = app(LandingMedia::class)->store($file)->path;
        }

        $informasi->update(self::richData($data));

        return $informasi;
    }

    public static function destroyInformasi(Informasi $informasi): void
    {
        $informasi->delete();
    }

    // ─── Program + sub-program ────────────────────────────────────────────

    public static function programs(): Collection
    {
        return Program::with('sub')->orderBy('urutan')->get();
    }

    public static function storeProgram(array $data): Program
    {
        return Program::create(self::richData($data));
    }

    public static function updateProgram(Program $program, array $data): Program
    {
        $program->update(self::richData($data));

        return $program->fresh('sub');
    }

    public static function destroyProgram(Program $program): void
    {
        $program->delete();
    }

    public static function storeProgramSub(array $data, ?UploadedFile $gambar = null): ProgramSub
    {
        if (! is_string($data['gambar'] ?? null)) {
            unset($data['gambar']);
        }
        if ($gambar) {
            $data['gambar'] = app(LandingMedia::class)->store($gambar)->path;
        }

        return ProgramSub::create(self::richData($data));
    }

    public static function updateProgramSub(ProgramSub $programSub, array $data, ?UploadedFile $gambar = null): ProgramSub
    {
        if (! is_string($data['gambar'] ?? null)) {
            unset($data['gambar']);
        }
        if ($gambar) {
            $data['gambar'] = app(LandingMedia::class)->store($gambar)->path;
        }

        $programSub->update(self::richData($data));

        return $programSub;
    }

    public static function destroyProgramSub(ProgramSub $programSub): void
    {
        $programSub->delete();
    }

    // ─── Testimoni ────────────────────────────────────────────────────────

    public static function testimonials(): Collection
    {
        return Testimoni::orderBy('urutan')->get();
    }

    public static function storeTestimoni(array $data, ?UploadedFile $foto = null): Testimoni
    {
        if (! is_string($data['foto'] ?? null)) {
            unset($data['foto']);
        }
        if ($foto) {
            $data['foto'] = app(LandingMedia::class)->store($foto)->path;
        }

        return Testimoni::create($data);
    }

    public static function updateTestimoni(Testimoni $testimoni, array $data, ?UploadedFile $foto = null): Testimoni
    {
        if (! is_string($data['foto'] ?? null)) {
            unset($data['foto']);
        }
        if ($foto) {
            $data['foto'] = app(LandingMedia::class)->store($foto)->path;
        }

        $testimoni->update($data);

        return $testimoni;
    }

    public static function destroyTestimoni(Testimoni $testimoni): void
    {
        $testimoni->delete();
    }
}
