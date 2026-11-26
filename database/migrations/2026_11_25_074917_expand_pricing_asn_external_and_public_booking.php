<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('residence_rates')) {
            Schema::table('residence_rates', function (Blueprint $table): void {
                if (! Schema::hasColumn('residence_rates', 'category')) {
                    $table->string('category', 40)->default('default')->after('gedung_id');
                }
            });

            DB::table('residence_rates')->whereNull('category')->update(['category' => 'default']);

            $rateIndexes = collect(Schema::getIndexes('residence_rates'));
            $hasNewUnique = $rateIndexes->contains(
                fn (array $index): bool => $index['name'] === 'residence_rates_building_type_unit_category_unique'
            );
            $hasOldUnique = $rateIndexes->contains(
                fn (array $index): bool => $index['name'] === 'residence_rates_gedung_id_tipe_kamar_unit_unique'
            );

            Schema::table('residence_rates', function (Blueprint $table) use ($hasNewUnique, $hasOldUnique): void {
                if (! $hasNewUnique) {
                    $table->unique(
                        ['gedung_id', 'tipe_kamar', 'unit', 'category'],
                        'residence_rates_building_type_unit_category_unique',
                    );
                }
                if ($hasOldUnique) {
                    $table->dropUnique('residence_rates_gedung_id_tipe_kamar_unit_unique');
                }
            });
        }

        if (Schema::hasTable('mahasiswa_profil')) {
            Schema::table('mahasiswa_profil', function (Blueprint $table): void {
                if (! Schema::hasColumn('mahasiswa_profil', 'is_external_campus')) {
                    $table->boolean('is_external_campus')->default(false)->after('angkatan');
                }
                if (! Schema::hasColumn('mahasiswa_profil', 'external_campus_name')) {
                    $table->string('external_campus_name', 150)->nullable()->after('is_external_campus');
                }
                if (! Schema::hasColumn('mahasiswa_profil', 'external_program_name')) {
                    $table->string('external_program_name', 150)->nullable()->after('external_campus_name');
                }
                if (! Schema::hasColumn('mahasiswa_profil', 'unit_kerja')) {
                    $table->string('unit_kerja', 150)->nullable()->after('external_program_name');
                }
            });
        }

        if (Schema::hasTable('residence_applications')) {
            Schema::table('residence_applications', function (Blueprint $table): void {
                if (! Schema::hasColumn('residence_applications', 'applicant_phone')) {
                    $table->string('applicant_phone', 30)->nullable()->after('recipient_email');
                }
                if (! Schema::hasColumn('residence_applications', 'booking_token')) {
                    $table->string('booking_token', 64)->nullable()->unique()->after('applicant_phone');
                }
            });
        }

        if (! app()->runningUnitTests() && Schema::hasTable('gedung') && Schema::hasTable('residence_policies')) {
            $asnBuilding = DB::table('gedung')->whereRaw('UPPER(kode_gedung) = ?', ['ASN'])->first();
            if ($asnBuilding) {
                $allowed = json_decode((string) ($asnBuilding->allowed_categories ?? '[]'), true);
                if (! is_array($allowed) || ! in_array('asn', $allowed, true)) {
                    DB::table('gedung')
                        ->where('id', $asnBuilding->id)
                        ->update([
                            'allowed_categories' => json_encode(['asn']),
                            'updated_at' => now(),
                        ]);
                }

                $hasAsnPolicy = DB::table('residence_policies')->where('category', 'asn')->exists();
                if (! $hasAsnPolicy) {
                    DB::table('residence_policies')->insert([
                        'id' => (string) Str::uuid(),
                        'category' => 'asn',
                        'version' => 1,
                        'settings' => json_encode([
                            'open' => false,
                            'documents' => ['perjanjian'],
                            'building_ids' => [$asnBuilding->id],
                            'rates' => [],
                            'month_days' => 30,
                            'day_basis' => 'nights',
                            'monthly_allowed' => true,
                        ]),
                        'published_at' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
        if (! app()->runningUnitTests() && Schema::hasTable('landing_contents')) {
            $siteRow = DB::table('landing_contents')->where('key', 'site_settings')->first();
            if ($siteRow && $siteRow->settings) {
                $settings = json_decode($siteRow->settings, true);
                if (is_array($settings)) {
                    $tracks = $settings['registration_tracks'] ?? [];
                    $hasAsnTrack = collect($tracks)->contains(fn (array $t): bool => str_contains(strtolower((string) ($t['title'] ?? '')), 'asn'));
                    if (! $hasAsnTrack) {
                        $defaults = json_decode(file_get_contents(database_path('seeders/data/landing-site.json')), true);
                        $asnDefault = collect($defaults['registration_tracks'] ?? [])->first(fn (array $t): bool => str_contains(strtolower((string) ($t['title'] ?? '')), 'asn'));
                        if ($asnDefault) {
                            $tracks[] = $asnDefault;
                        }
                    }
                    foreach ($tracks as $idx => $track) {
                        if (($track['cta_href'] ?? '') === '#katalog-hunian') {
                            $tracks[$idx]['cta_href'] = '#pengajuan-umum-summer';
                            $tracks[$idx]['cta_label'] = 'Ajukan Sewa Umum / Summer Course';
                        }
                    }
                    $settings['registration_tracks'] = $tracks;
                    DB::table('landing_contents')->where('id', $siteRow->id)->update([
                        'settings' => json_encode($settings, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('residence_applications')) {
            Schema::table('residence_applications', function (Blueprint $table): void {
                if (Schema::hasColumn('residence_applications', 'booking_token')) {
                    $table->dropUnique(['booking_token']);
                    $table->dropColumn('booking_token');
                }
                if (Schema::hasColumn('residence_applications', 'applicant_phone')) {
                    $table->dropColumn('applicant_phone');
                }
            });
        }

        if (Schema::hasTable('mahasiswa_profil')) {
            Schema::table('mahasiswa_profil', function (Blueprint $table): void {
                $drop = array_filter(
                    ['is_external_campus', 'external_campus_name', 'external_program_name', 'unit_kerja'],
                    fn (string $col): bool => Schema::hasColumn('mahasiswa_profil', $col),
                );
                if ($drop !== []) {
                    $table->dropColumn($drop);
                }
            });
        }

        if (Schema::hasTable('residence_rates')) {
            $rateIndexes = collect(Schema::getIndexes('residence_rates'));
            $hasNewUnique = $rateIndexes->contains(
                fn (array $index): bool => $index['name'] === 'residence_rates_building_type_unit_category_unique'
            );
            $hasOldUnique = $rateIndexes->contains(
                fn (array $index): bool => $index['name'] === 'residence_rates_gedung_id_tipe_kamar_unit_unique'
            );

            Schema::table('residence_rates', function (Blueprint $table) use ($hasNewUnique, $hasOldUnique): void {
                if (! $hasOldUnique) {
                    $table->unique(['gedung_id', 'tipe_kamar', 'unit']);
                }
                if ($hasNewUnique) {
                    $table->dropUnique('residence_rates_building_type_unit_category_unique');
                }
                if (Schema::hasColumn('residence_rates', 'category')) {
                    $table->dropColumn('category');
                }
            });
        }
    }
};
