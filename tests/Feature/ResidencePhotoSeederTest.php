<?php

use App\Models\Gedung;
use App\Models\Kamar;
use Database\Seeders\ResidenceMasterSeeder;
use Database\Seeders\ResidencePhotoSeeder;
use Illuminate\Support\Facades\Storage;

it('seeds a cover and gallery for every master building and room and can run repeatedly', function () {
    Storage::fake('public');
    $this->seed(ResidenceMasterSeeder::class);
    $this->seed(ResidencePhotoSeeder::class);

    foreach ([Gedung::class => 'building', Kamar::class => 'room'] as $model => $image) {
        $path = 'seed/residence/'.$image.'.jpg';
        expect($model::count())->toBeGreaterThan(0);
        expect($model::where('foto', $path)->count())->toBe($model::count());
        foreach ($model::all() as $record) {
            expect($record->photos)->toBe([$path]);
        }
        Storage::disk('public')->assertExists($path);
        expect(Storage::disk('public')->get($path))->toBe(file_get_contents(database_path('seeders/data/photos/'.$image.'.jpg')));
        expect(getimagesize(database_path('seeders/data/photos/'.$image.'.jpg'))['mime'])->toBe('image/jpeg');
    }
});

it('preserves uploaded photos and ordered galleries when reseeded', function () {
    Storage::fake('public');
    $this->seed(ResidenceMasterSeeder::class);

    foreach ([Gedung::class => 'gedung', Kamar::class => 'kamar'] as $model => $directory) {
        $records = $model::limit(3)->get();
        $records[0]->update(['foto' => $directory.'/custom.jpg', 'photos' => null]);
        $records[1]->update(['foto' => $directory.'/cover.jpg', 'photos' => [$directory.'/cover.jpg', $directory.'/second.jpg']]);
        $records[2]->update(['foto' => null, 'photos' => [$directory.'/gallery.jpg']]);
        $before = $records->map(fn ($record) => $record->only(['foto', 'photos']))->all();

        $this->seed(ResidencePhotoSeeder::class);

        expect($records->map(fn ($record) => $record->fresh()->only(['foto', 'photos']))->all())->toBe($before);
    }
});
