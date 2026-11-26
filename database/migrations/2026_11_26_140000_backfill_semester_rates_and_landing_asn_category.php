<?php

use App\Models\LandingContent;
use App\Models\ResidenceRate;
use App\Services\ResidencePolicyService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('residence_rates')) {
            $yearRates = ResidenceRate::query()
                ->where('unit', 'year')
                ->where(fn ($q) => $q->where('amount', '>', 0)->orWhere('room_amount', '>', 0))
                ->get();

            foreach ($yearRates as $yearRate) {
                $category = $yearRate->category ?? ResidenceRate::DEFAULT_CATEGORY;
                if (in_array($category, ['local_kipk', 'summer_course'], true)) {
                    continue;
                }

                $exists = ResidenceRate::query()
                    ->where('gedung_id', $yearRate->gedung_id)
                    ->where('category', $category)
                    ->where('tipe_kamar', $yearRate->tipe_kamar)
                    ->where('unit', 'semester')
                    ->exists();

                if ($exists) {
                    continue;
                }

                ResidenceRate::create([
                    'gedung_id' => $yearRate->gedung_id,
                    'category' => $category,
                    'tipe_kamar' => $yearRate->tipe_kamar,
                    'unit' => 'semester',
                    'amount' => (int) round(((float) $yearRate->amount) / 2),
                    'room_amount' => $yearRate->room_amount !== null && (float) $yearRate->room_amount > 0
                        ? (int) round(((float) $yearRate->room_amount) / 2)
                        : null,
                    'student_amount' => null,
                    'facilities' => $yearRate->facilities,
                ]);
            }

            if (! app()->runningUnitTests() && Schema::hasTable('residence_policies')) {
                app(ResidencePolicyService::class)->syncPublishedPolicyRates();
            }
        }

        if (Schema::hasTable('landing_contents')) {
            $settingsRow = LandingContent::where('key', 'site_settings')->first();
            if ($settingsRow) {
                $decoded = is_array($settingsRow->settings) ? $settingsRow->settings : [];
                $categories = is_array($decoded['categories'] ?? null) ? $decoded['categories'] : [];
                $hasAsn = collect($categories)->contains(
                    fn ($item): bool => is_array($item) && str_contains(strtolower((string) ($item['title'] ?? '')), 'asn')
                );

                if (! $hasAsn && $categories !== []) {
                    $categories[] = [
                        'title' => 'ASN / Dosen (Rusun ASN)',
                        'text' => 'Hunian khusus aparatur sipil negara dan dosen Universitas Andalas pada Gedung Rusun ASN melalui SSO Dosen atau registrasi NIP.',
                    ];
                    $decoded['categories'] = $categories;
                    $settingsRow->update(['settings' => $decoded]);
                }
            }
        }
    }

    public function down(): void
    {
        // Non-destructive backfill migration.
    }
};
