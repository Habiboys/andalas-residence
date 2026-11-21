<?php

use App\Models\Gedung;
use Database\Seeders\ResidencePhotoSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('gedung') || app()->runningUnitTests()) {
            return;
        }

        $disk = Storage::disk('public');

        foreach (ResidencePhotoSeeder::BUILDING_PHOTO_FILES as $kodeGedung => $file) {
            $source = database_path('seeders/data/photos/buildings/'.$file);
            if (! file_exists($source)) {
                continue;
            }

            $storagePath = 'seed/residence/buildings/'.$file;
            $disk->put($storagePath, (string) file_get_contents($source));

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
    }

    public function down(): void
    {
        // Non-destructive data sync for legacy building photos.
    }
};
