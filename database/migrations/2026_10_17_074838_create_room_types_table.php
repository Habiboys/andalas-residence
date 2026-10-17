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
        Schema::create('room_types', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('name', 100);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
        $types = ['standar' => 'Standar', 'medium' => 'Medium', 'premium' => 'Premium', 'umum' => 'Umum', 'umum_vip' => 'Umum VIP'];
        foreach (['kamar', 'residence_rates'] as $table) {
            foreach (DB::table($table)->distinct()->pluck('tipe_kamar') as $code) {
                if ($code) {
                    $types[$code] ??= Str::headline($code);
                }
            }
        }
        foreach (DB::table('gedung')->whereNotNull('room_types')->pluck('room_types') as $definitions) {
            foreach (json_decode($definitions, true, flags: JSON_THROW_ON_ERROR) as $definition) {
                $types[$definition['type']] ??= Str::headline($definition['type']);
            }
        }
        foreach ($types as $code => $name) {
            DB::table('room_types')->insert(['id' => (string) Str::uuid(), 'code' => $code, 'name' => $name, 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('room_types');
    }
};
