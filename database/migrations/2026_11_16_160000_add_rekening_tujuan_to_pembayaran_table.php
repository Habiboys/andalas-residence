<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pembayaran', function (Blueprint $table): void {
            $table->foreignUuid('payment_bank_account_id')
                ->nullable()
                ->after('metode_pembayaran')
                ->constrained('payment_bank_accounts')
                ->nullOnDelete();
            $table->string('rekening_tujuan', 200)
                ->nullable()
                ->after('payment_bank_account_id');
        });
    }

    public function down(): void
    {
        Schema::table('pembayaran', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('payment_bank_account_id');
            $table->dropColumn('rekening_tujuan');
        });
    }
};
