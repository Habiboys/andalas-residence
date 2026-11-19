<?php

use App\Models\PaymentBankAccount;
use App\Models\Pembayaran;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (app()->runningUnitTests() || ! Schema::hasTable('payment_bank_accounts')) {
            return;
        }

        $official = PaymentBankAccount::updateOrCreate(
            ['account_number' => '7004496277'],
            [
                'bank_name' => 'Bank Syariah Indonesia (BSI)',
                'account_name' => 'PN UNAND DPUB',
                'instructions' => 'Transfer sesuai nominal tagihan ke rekening resmi BSI PN UNAND DPUB dan unggah bukti pembayaran.',
                'is_active' => true,
            ],
        );

        $otherIds = PaymentBankAccount::where('id', '!=', $official->id)->pluck('id')->all();
        if ($otherIds !== []) {
            if (Schema::hasTable('pembayaran') && Schema::hasColumn('pembayaran', 'payment_bank_account_id')) {
                Pembayaran::whereIn('payment_bank_account_id', $otherIds)->update([
                    'payment_bank_account_id' => $official->id,
                ]);
            }
            PaymentBankAccount::whereIn('id', $otherIds)->delete();
        }
    }

    public function down(): void {}
};
