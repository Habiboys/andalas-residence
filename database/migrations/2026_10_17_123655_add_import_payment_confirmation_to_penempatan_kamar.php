<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('penempatan_kamar', function (Blueprint $table) {
            $table->json('import_payment_confirmation')->nullable();
        });

        $confirmation = json_encode([
            'status' => 'confirmed_paid',
            'source' => 'checkin_excel_2026',
            'confirmation_basis' => 'owner_confirmed_checkin',
            'reconciliation_status' => 'pending',
            'amount' => null,
            'paid_at' => null,
        ], JSON_THROW_ON_ERROR);
        DB::table('penempatan_kamar')
            ->whereIn('periode_id', DB::table('periode')->where('nama_periode', '2026/2027')->select('id'))
            ->where('catatan', 'like', 'Impor check-in Excel 2026.%')
            ->whereNull('import_payment_confirmation')->select('id')
            ->chunkById(200, function (Collection $placements) use ($confirmation): void {
                DB::table('penempatan_kamar')->whereIn('id', $placements->pluck('id'))
                    ->whereNull('import_payment_confirmation')->update(['import_payment_confirmation' => $confirmation]);
            });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('penempatan_kamar', function (Blueprint $table) {
            $table->dropColumn('import_payment_confirmation');
        });
    }
};
