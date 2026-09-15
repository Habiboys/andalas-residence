<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dokumen_tagihan', function (Blueprint $table) {
            $table->string('template_version', 30)->after('checksum_sha256');
        });

        Schema::table('free_residence_letter_document_intents', function (Blueprint $table) {
            $table->string('nomor', 100)->nullable()->unique()->after('status');
            $table->string('path')->nullable()->after('nomor');
            $table->char('checksum_sha256', 64)->nullable()->after('path');
            $table->string('template_version', 30)->nullable()->after('checksum_sha256');
            $table->text('failure_reason')->nullable()->after('generated_at');
        });
    }

    public function down(): void
    {
        Schema::table('free_residence_letter_document_intents', function (Blueprint $table) {
            $table->dropColumn(['nomor', 'path', 'checksum_sha256', 'template_version', 'failure_reason']);
        });

        Schema::table('dokumen_tagihan', function (Blueprint $table) {
            $table->dropColumn('template_version');
        });
    }
};
