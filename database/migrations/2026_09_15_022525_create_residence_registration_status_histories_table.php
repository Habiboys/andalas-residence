<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('residence_registration_status_histories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('residence_registration_id')
                ->constrained('residence_registrations', indexName: 'reg_status_hist_reg_id_foreign')
                ->cascadeOnDelete();
            $table->string('from_status', 20)->nullable();
            $table->string('to_status', 20);
            $table->foreignUuid('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['residence_registration_id', 'created_at'], 'reg_status_hist_reg_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('residence_registration_status_histories');
    }
};
