<?php

namespace Database\Seeders;

use App\Models\Gedung;
use App\Models\Kamar;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

class ResidencePhotoSeeder extends Seeder
{
    public const BUILDING_PHOTO_FILES = [
        'A' => 'rpx.jpg',
        'B' => 'rusunawa.jpg',
        'C' => 'pupera1.jpg',
        'D' => 'menpera.jpg',
        'E' => 'rsm.jpg',
        'F' => 'gedungorange.jpg',
        'G' => 'menperaHijau.jpg',
        'H' => 'pupera3.jpg',
        'Nakes' => 'nakes.jpg',
        'ASN' => 'asn.jpg',
    ];

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $disk = Storage::disk('public');

        foreach (self::BUILDING_PHOTO_FILES as $kodeGedung => $file) {
            $source = database_path('seeders/data/photos/buildings/'.$file);
            if (! file_exists($source)) {
                continue;
            }

            $storagePath = 'seed/residence/buildings/'.$file;
            if (! $disk->exists($storagePath)) {
                $disk->put($storagePath, (string) file_get_contents($source));
            }

            Gedung::query()
                ->where('kode_gedung', $kodeGedung)
                ->where(function ($query): void {
                    $query->whereNull('foto')
                        ->orWhere('foto', '')
                        ->orWhere('foto', 'seed/residence/building.jpg');
                })
                ->update([
                    'foto' => $storagePath,
                    'photos' => json_encode([$storagePath], JSON_THROW_ON_ERROR),
                ]);
        }

        foreach ([Gedung::class => 'building', Kamar::class => 'room'] as $model => $image) {
            $path = 'seed/residence/'.$image.'.jpg';
            $source = database_path('seeders/data/photos/'.$image.'.jpg');
            if (! $disk->exists($path) && file_exists($source)) {
                $disk->put($path, (string) file_get_contents($source));
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
