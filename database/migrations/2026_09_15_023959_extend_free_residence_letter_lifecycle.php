<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pengajuan_bebas_asrama', function (Blueprint $table) {
            $table->unsignedSmallInteger('lifecycle_year')->nullable()->after('alasan');
            $table->string('legacy_verification_path', 30)->nullable()->after('lifecycle_year');
            $table->foreignUuid('checkout_request_id')->nullable()->unique()->after('legacy_verification_path')->constrained('checkout_requests')->restrictOnDelete();
            $table->string('graduation_evidence_path')->nullable()->after('checkout_request_id');
            $table->string('payment_evidence_path')->nullable()->after('graduation_evidence_path');
            $table->timestamp('verified_at')->nullable()->after('payment_evidence_path');
            $table->timestamp('approved_at')->nullable()->after('verified_at');
            $table->index(['lifecycle_year', 'status']);
        });

        Schema::create('pengajuan_bebas_asrama_status_histories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('pengajuan_id')->constrained('pengajuan_bebas_asrama')->cascadeOnDelete();
            $table->string('status', 30);
            $table->foreignUuid('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('note')->nullable();
            $table->timestamps();
            $table->index(['pengajuan_id', 'created_at']);
        });

        Schema::create('free_residence_letter_document_intents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('pengajuan_id')->unique()->constrained('pengajuan_bebas_asrama')->cascadeOnDelete();
            $table->string('status', 20)->default('pending');
            $table->timestamp('requested_at');
            $table->timestamp('generated_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('free_residence_letter_document_intents');
        Schema::dropIfExists('pengajuan_bebas_asrama_status_histories');

        Schema::table('pengajuan_bebas_asrama', function (Blueprint $table) {
            $table->dropForeign(['checkout_request_id']);
            $table->dropIndex(['lifecycle_year', 'status']);
            $table->dropColumn([
                'lifecycle_year', 'legacy_verification_path', 'checkout_request_id',
                'graduation_evidence_path', 'payment_evidence_path', 'verified_at', 'approved_at',
            ]);
        });
    }
};
