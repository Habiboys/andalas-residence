<?php

namespace App\Services;

use App\Models\Informasi;
use App\Models\LandingContent;
use App\Models\Program;
use App\Models\ProgramSub;
use App\Models\Testimoni;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class LandingContentService
{
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
        return LandingContent::orderBy('urutan')->get();
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
        unset($data['file']);
        if ($file) {
            $data['file'] = $file->store('informasi', 'public');
        }

        return Informasi::create(self::richData($data));
    }

    public static function updateInformasi(Informasi $informasi, array $data, ?UploadedFile $file = null): Informasi
    {
        unset($data['file']);
        if ($file) {
            if ($informasi->file) {
                Storage::disk('public')->delete($informasi->file);
            }
            $data['file'] = $file->store('informasi', 'public');
        }

        $informasi->update(self::richData($data));

        return $informasi;
    }

    public static function destroyInformasi(Informasi $informasi): void
    {
        if ($informasi->file) {
            Storage::disk('public')->delete($informasi->file);
        }
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
        unset($data['gambar']);
        if ($gambar) {
            $data['gambar'] = $gambar->store('program', 'public');
        }

        return ProgramSub::create(self::richData($data));
    }

    public static function updateProgramSub(ProgramSub $programSub, array $data, ?UploadedFile $gambar = null): ProgramSub
    {
        unset($data['gambar']);
        if ($gambar) {
            if ($programSub->gambar) {
                Storage::disk('public')->delete($programSub->gambar);
            }
            $data['gambar'] = $gambar->store('program', 'public');
        }

        $programSub->update(self::richData($data));

        return $programSub;
    }

    public static function destroyProgramSub(ProgramSub $programSub): void
    {
        if ($programSub->gambar) {
            Storage::disk('public')->delete($programSub->gambar);
        }
        $programSub->delete();
    }

    // ─── Testimoni ────────────────────────────────────────────────────────

    public static function testimonials(): Collection
    {
        return Testimoni::orderBy('urutan')->get();
    }

    public static function storeTestimoni(array $data, ?UploadedFile $foto = null): Testimoni
    {
        unset($data['foto']);
        if ($foto) {
            $data['foto'] = $foto->store('testimoni', 'public');
        }

        return Testimoni::create($data);
    }

    public static function updateTestimoni(Testimoni $testimoni, array $data, ?UploadedFile $foto = null): Testimoni
    {
        unset($data['foto']);
        if ($foto) {
            if ($testimoni->foto) {
                Storage::disk('public')->delete($testimoni->foto);
            }
            $data['foto'] = $foto->store('testimoni', 'public');
        }

        $testimoni->update($data);

        return $testimoni;
    }

    public static function destroyTestimoni(Testimoni $testimoni): void
    {
        if ($testimoni->foto) {
            Storage::disk('public')->delete($testimoni->foto);
        }
        $testimoni->delete();
    }
}
