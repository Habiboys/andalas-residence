<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('residence_document_templates', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('category', 60);
            $table->string('kind', 80);
            $table->string('original_name');
            $table->string('path');
            $table->string('mime_type', 120)->nullable();
            $table->foreignUuid('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['category', 'kind']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('residence_document_templates');
    }
};
