<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_bank_accounts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('bank_name', 100);
            $table->string('account_number', 100);
            $table->string('account_name', 255);
            $table->text('instructions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_bank_accounts');
    }
};
