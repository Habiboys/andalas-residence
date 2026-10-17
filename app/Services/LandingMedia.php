<?php

namespace App\Services;

use App\Models\Informasi;
use App\Models\LandingContent;
use App\Models\MediaAsset;
use App\Models\OrganizationPosition;
use App\Models\Program;
use App\Models\ProgramSub;
use App\Models\Testimoni;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class LandingMedia
{
    public function store(UploadedFile $file, string $directory = 'landing/media'): MediaAsset
    {
        $path = $file->store($directory, 'public');
        if ($path === false) {
            throw new \RuntimeException('File gagal disimpan ke pustaka media.');
        }
        try {
            return MediaAsset::create(['path' => $path, 'name' => $file->getClientOriginalName(), 'mime_type' => $file->getMimeType(), 'size' => $file->getSize()]);
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($path);
            throw $exception;
        }
    }

    public function path(?string $id, bool $imageOnly = false): ?string
    {
        if ($id === null || $id === '') {
            return null;
        }
        $asset = MediaAsset::find($id);
        if (! $asset || ($imageOnly && ! str_starts_with($asset->mime_type, 'image/'))) {
            throw ValidationException::withMessages(['media_id' => 'Pilih media yang sesuai dari pustaka media.']);
        }

        return $asset->path;
    }

    public function referenced(MediaAsset $asset): bool
    {
        foreach (LandingContent::whereNotNull('settings')->get(['settings']) as $content) {
            if (str_contains(json_encode($content->settings, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), $asset->path)) {
                return true;
            }
        }
        foreach ([LandingContent::class => ['image', 'content', 'settings'], Informasi::class => ['file', 'konten'], ProgramSub::class => ['gambar', 'deskripsi'], Testimoni::class => ['foto'], Program::class => ['deskripsi'], OrganizationPosition::class => ['photo']] as $model => $fields) {
            if ($model::where(function ($query) use ($fields, $asset): void {
                foreach ($fields as $field) {
                    $query->orWhere($field, 'like', '%'.$asset->path.'%');
                }
            })->exists()) {
                return true;
            }
        }

        return false;
    }
}
