<?php

namespace Database\Seeders;

use App\Models\Gedung;
use App\Models\Kamar;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class ResidencePhotoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        foreach ([Gedung::class => 'building', Kamar::class => 'room'] as $model => $image) {
            $path = 'seed/residence/'.$image.'.jpg';
            $disk = Storage::disk('public');
            if (! $disk->exists($path)) {
                $disk->put($path, file_get_contents(database_path('seeders/data/photos/'.$image.'.jpg')));
            }

            $model::query()
                ->where(function ($query): void {
                    $query->whereNull('foto')->orWhere('foto', '');
                })
                ->where(function ($query): void {
                    $query->whereNull('photos')->orWhereJsonLength('photos', 0);
                })
                ->update(['foto' => $path, 'photos' => json_encode([$path], JSON_THROW_ON_ERROR)]);
        }
    }
}
