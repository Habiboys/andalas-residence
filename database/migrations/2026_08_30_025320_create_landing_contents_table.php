<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landing_contents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('key', 100)->unique();
            $table->string('title', 200);
            $table->longText('content')->nullable();
            $table->string('image')->nullable();
            $table->unsignedInteger('urutan')->default(0);
            $table->boolean('published')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('landing_contents');
    }
};
