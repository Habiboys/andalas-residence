<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_signers', function (Blueprint $table) {
            $table->id();
            $table->string('nama');
            $table->string('nip', 30)->nullable();
            $table->string('jabatan')->default('Pengelola Asrama');
            $table->string('unit')->default('Universitas Andalas');
            $table->boolean('aktif')->default(true);
            $table->timestamps();

            $table->index('aktif');
        });

        Schema::create('document_number_sequences', function (Blueprint $table) {
            $table->id();
            $table->string('tipe', 40);
            $table->unsignedSmallInteger('tahun');
            $table->unsignedInteger('nomor_terakhir')->default(0);
            $table->timestamps();

            $table->unique(['tipe', 'tahun']);
        });

        Schema::table('free_residence_letter_document_intents', function (Blueprint $table) {
            $table->uuid('verification_token')->nullable()->unique()->after('nomor');
            $table->string('signer_name')->nullable()->after('verification_token');
            $table->string('signer_nip', 30)->nullable()->after('signer_name');
        });
    }

    public function down(): void
    {
        Schema::table('free_residence_letter_document_intents', function (Blueprint $table) {
            $table->dropColumn(['verification_token', 'signer_name', 'signer_nip']);
        });

        Schema::dropIfExists('document_number_sequences');
        Schema::dropIfExists('document_signers');
    }
};
