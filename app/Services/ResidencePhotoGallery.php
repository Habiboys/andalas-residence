<?php

namespace App\Services;

use App\Models\Gedung;
use App\Models\Kamar;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ResidencePhotoGallery
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'manage_gallery' => ['sometimes', 'boolean'],
            'photos' => ['sometimes', 'array', 'max:10'],
            'photos.*' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:2048'],
            'retained_photos' => ['sometimes', 'array', 'max:10'],
            'retained_photos.*' => ['required', 'string', 'distinct'],
            'photo_order' => ['sometimes', 'array', 'max:10'],
            'photo_order.*' => ['required', 'string', 'distinct'],
        ];
    }

    /** @param array<string, mixed> $attributes */
    public function save(Gedung|Kamar $model, Request $request, array $attributes): void
    {
        $uploaded = [];
        $directory = $model instanceof Gedung ? 'gedung' : 'kamar';
        try {
            DB::transaction(function () use ($model, $request, $attributes, $directory, &$uploaded): void {
                if ($model->exists) {
                    $model->refresh();
                    $model->newQuery()->whereKey($model->id)->lockForUpdate()->firstOrFail();
                }
                $previous = $model->photos ?: ($model->foto ? [$model->foto] : []);
                $galleryChanged = $request->boolean('manage_gallery') || $request->hasFile('photos');
                $paths = $previous;
                if ($galleryChanged) {
                    $retained = $request->input('retained_photos', []);
                    if (array_diff($retained, $previous) !== []) {
                        throw ValidationException::withMessages(['photos' => 'Foto yang dipertahankan harus berasal dari galeri ini.']);
                    }
                    $files = $request->file('photos', []);
                    if (count($retained) + count($files) > 10) {
                        throw ValidationException::withMessages(['photos' => 'Maksimal 10 foto untuk satu galeri.']);
                    }
                    $keys = [...$retained, ...array_map(fn (int $index): string => 'new:'.$index, array_keys($files))];
                    $order = $request->input('photo_order', $keys);
                    if (count($order) !== count($keys) || array_diff($order, $keys) !== [] || array_diff($keys, $order) !== []) {
                        throw ValidationException::withMessages(['photos' => 'Urutan foto tidak valid. Muat ulang galeri dan coba lagi.']);
                    }
                    $map = array_combine($retained, $retained) ?: [];
                    foreach ($files as $index => $file) {
                        $uploaded[] = $path = $file->store($directory, 'public');
                        $map['new:'.$index] = $path;
                    }
                    $paths = array_map(fn (string $key): string => $map[$key], $order);
                } elseif ($request->hasFile('foto')) {
                    $uploaded[] = $path = $request->file('foto')->store($directory, 'public');
                    $paths = [$path];
                    $galleryChanged = true;
                } elseif ($request->boolean('remove_foto')) {
                    $paths = [];
                    $galleryChanged = true;
                }
                unset($attributes['photos'], $attributes['foto'], $attributes['remove_foto'], $attributes['manage_gallery'], $attributes['retained_photos'], $attributes['photo_order']);
                $model->fill($attributes);
                if ($galleryChanged) {
                    $model->photos = $paths;
                    $model->foto = $paths[0] ?? null;
                }
                $model->save();
                if ($galleryChanged) {
                    $removed = array_values(array_filter(array_diff($previous, $paths), fn (string $path): bool => str_starts_with($path, $directory.'/') && ! str_contains($path, '..')));
                    DB::afterCommit(fn () => Storage::disk('public')->delete($removed));
                }
            });
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($uploaded);
            throw $exception;
        }
    }
}
