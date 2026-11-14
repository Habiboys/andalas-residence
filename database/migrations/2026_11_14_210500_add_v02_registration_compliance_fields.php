<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('residence_registrations', function (Blueprint $table): void {
            $table->unsignedSmallInteger('guest_count')->default(1);
        });

        Schema::create('residence_cash_refunds', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('residence_registration_id')->constrained('residence_registrations')->cascadeOnDelete();
            $table->foreignUuid('tagihan_id')->constrained('tagihan')->cascadeOnDelete();
            $table->uuid('amendment_id')->nullable()->index();
            $table->decimal('amount', 15, 2);
            $table->string('status', 20)->default('due');
            $table->string('recipient_name')->nullable();
            $table->timestamp('returned_at')->nullable();
            $table->foreignUuid('returned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('residence_cash_refunds');
        Schema::table('residence_registrations', function (Blueprint $table): void {
            $table->dropColumn('guest_count');
        });
    }
};
