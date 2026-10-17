<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('informasis', fn (Blueprint $table) => $table->string('kategori', 50)->change());
        Schema::table('landing_contents', fn (Blueprint $table) => $table->json('settings')->nullable());
        Schema::create('media_assets', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('path')->unique();
            $table->string('name');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size')->default(0);
            $table->string('alt')->nullable();
            $table->timestamps();
        });
        Schema::create('organization_positions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('parent_id')->nullable()->constrained('organization_positions')->restrictOnDelete();
            $table->string('title', 150);
            $table->string('name', 150)->nullable();
            $table->string('photo')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('published')->default(false);
            $table->timestamps();
        });
        $defaults = json_decode(file_get_contents(database_path('seeders/data/landing-site.json')), true, flags: JSON_THROW_ON_ERROR);
        if (! DB::table('landing_contents')->where('key', 'site_settings')->exists()) {
            DB::table('landing_contents')->insert(['id' => (string) Str::uuid(), 'key' => 'site_settings', 'title' => 'Pengaturan situs', 'settings' => json_encode($defaults, JSON_THROW_ON_ERROR), 'published' => true, 'urutan' => 0, 'created_at' => now(), 'updated_at' => now()]);
        }
        foreach (['landing_contents' => ['image', 'content'], 'informasis' => ['file', 'konten'], 'program_subs' => ['gambar', 'deskripsi'], 'testimonis' => ['foto'], 'programs' => ['deskripsi']] as $table => $fields) {
            foreach (DB::table($table)->get($fields) as $row) {
                foreach ($fields as $field) {
                    $value = (string) $row->$field;
                    $paths = [];
                    if (in_array($field, ['image', 'file', 'gambar', 'foto'], true) && $value !== '' && ! str_contains($value, '://')) {
                        $paths[] = ltrim(preg_replace('#^/storage/#', '', $value), '/');
                    }
                    preg_match_all('#/storage/([^"\s<>]+)#', $value, $matches);
                    foreach (array_unique([...$paths, ...$matches[1]]) as $path) {
                        if (str_contains($path, '..') || DB::table('media_assets')->where('path', $path)->exists()) {
                            continue;
                        }
                        $mime = match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
                            'jpg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'pdf' => 'application/pdf', default => 'application/octet-stream',
                        };
                        DB::table('media_assets')->insert(['id' => (string) Str::uuid(), 'path' => $path, 'name' => basename($path), 'mime_type' => $mime, 'size' => 0, 'created_at' => now(), 'updated_at' => now()]);
                    }
                }
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_positions');
        Schema::dropIfExists('media_assets');
        Schema::table('landing_contents', fn (Blueprint $table) => $table->dropColumn('settings'));
    }
};
