<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('residence_policies', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('category', 40);
            $table->unsignedInteger('version');
            $table->json('settings');
            $table->timestamp('published_at')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->unique(['category', 'version']);
        });
        Schema::create('residence_applications', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('number')->unique();
            $table->string('kind', 40);
            $table->string('institution');
            $table->string('recipient_email');
            $table->string('letter_path');
            $table->date('starts_at');
            $table->date('ends_at');
            $table->string('funding', 30);
            $table->timestamp('approved_at')->nullable();
            $table->foreignUuid('approved_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignUuid('created_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
        });
        Schema::create('room_contracts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('kamar_id')->constrained('kamar')->restrictOnDelete();
            $table->unsignedInteger('occupants');
            $table->decimal('total', 15, 2);
            $table->json('members');
            $table->foreignUuid('approved_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('approved_at');
            $table->timestamps();
        });
        Schema::table('residence_registrations', function (Blueprint $table): void {
            $table->unsignedTinyInteger('workflow_version')->nullable();
            $table->foreignUuid('residence_policy_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignUuid('residence_application_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignUuid('room_contract_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('allocation_status', 30)->nullable();
            $table->timestamp('ready_at')->nullable();
            $table->timestamp('checked_in_at')->nullable();
            $table->foreignUuid('checked_in_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('keys_returned_at')->nullable();
            $table->foreignUuid('keys_returned_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('return_condition', 30)->nullable();
            $table->timestamp('end_notified_at')->nullable();
            $table->timestamp('kipk_disbursed_at')->nullable();
            $table->date('kipk_due_at')->nullable();
            $table->string('historical_evidence')->nullable();
            $table->foreignUuid('historical_confirmed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('historical_confirmed_at')->nullable();
            $table->decimal('sponsor_limit', 15, 2)->nullable();
        });
        Schema::create('registration_documents', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('residence_registration_id')->constrained(indexName: 'reg_docs_registration_fk')->restrictOnDelete();
            $table->string('kind', 80);
            $table->unsignedInteger('version');
            $table->string('path');
            $table->string('checksum', 64);
            $table->string('status', 20)->default('uploaded');
            $table->foreignUuid('uploaded_by')->constrained('users')->restrictOnDelete();
            $table->foreignUuid('reviewed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['residence_registration_id', 'kind', 'version'], 'reg_docs_version_unique');
        });
        Schema::create('residence_decisions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('residence_registration_id')->constrained(indexName: 'res_dec_registration_fk')->restrictOnDelete();
            $table->string('kind', 40);
            $table->string('status', 20)->default('pending');
            $table->text('reason');
            $table->json('terms')->nullable();
            $table->foreignUuid('requested_by')->constrained('users')->restrictOnDelete();
            $table->foreignUuid('decided_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();
        });
        Schema::create('residence_payment_references', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('reference', 150)->unique();
            $table->string('source', 100);
            $table->string('evidence_path');
            $table->date('paid_at');
            $table->decimal('amount', 15, 2);
            $table->string('payer_type', 20);
            $table->string('status', 30)->default('unmatched');
            $table->json('allocations')->nullable();
            $table->foreignUuid('recorded_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('matched_at')->nullable();
            $table->timestamps();
        });
        Schema::table('invoice_groups', function (Blueprint $table): void {
            $table->foreignUuid('residence_application_id')->nullable()->constrained()->restrictOnDelete();
            $table->timestamp('sent_at')->nullable();
            $table->string('delivery_status', 20)->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('delivery_failed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('invoice_groups', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('residence_application_id');
            $table->dropColumn(['sent_at', 'delivery_status', 'delivered_at', 'delivery_failed_at']);
        });
        Schema::dropIfExists('residence_payment_references');
        Schema::dropIfExists('residence_decisions');
        Schema::dropIfExists('registration_documents');
        Schema::table('residence_registrations', function (Blueprint $table): void {
            foreach (['residence_policy_id', 'residence_application_id', 'room_contract_id', 'checked_in_by', 'keys_returned_by', 'historical_confirmed_by'] as $column) {
                $table->dropConstrainedForeignId($column);
            }
            $table->dropColumn(['workflow_version', 'allocation_status', 'ready_at', 'checked_in_at', 'keys_returned_at', 'return_condition', 'end_notified_at', 'kipk_disbursed_at', 'kipk_due_at', 'historical_evidence', 'historical_confirmed_at', 'sponsor_limit']);
        });
        Schema::dropIfExists('room_contracts');
        Schema::dropIfExists('residence_applications');
        Schema::dropIfExists('residence_policies');
    }
};
