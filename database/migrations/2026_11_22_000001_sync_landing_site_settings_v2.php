<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (app()->runningUnitTests()) {
            return;
        }

        $row = DB::table('landing_contents')->where('key', 'site_settings')->first();
        if (! $row || ! $row->settings) {
            return;
        }

        $defaults = json_decode(file_get_contents(database_path('seeders/data/landing-site.json')), true);
        if (! is_array($defaults)) {
            return;
        }

        $stored = json_decode($row->settings, true);
        if (! is_array($stored)) {
            $stored = [];
        }

        $merged = [...$defaults, ...$stored];
        foreach (['hero', 'headings', 'site'] as $group) {
            $merged[$group] = [...($defaults[$group] ?? []), ...($stored[$group] ?? [])];
        }
        foreach (['registration_tracks', 'facilities', 'core_rules', 'payment_steps'] as $listGroup) {
            if (! array_key_exists($listGroup, $stored) || ! is_array($stored[$listGroup])) {
                $merged[$listGroup] = $defaults[$listGroup] ?? [];
            }
        }

        if (isset($merged['registration_tracks']) && is_array($merged['registration_tracks'])) {
            foreach ($merged['registration_tracks'] as $index => $track) {
                if (isset($track['points_text']) && is_string($track['points_text'])) {
                    $lines = preg_split('/\r?\n/', $track['points_text']) ?: [];
                    $filtered = array_values(array_filter($lines, fn (string $line): bool => ! str_contains(strtolower($line), 'pembayaran fleksibel sesuai kebijakan periode')));
                    $merged['registration_tracks'][$index]['points_text'] = implode("\n", $filtered);
                }
            }
        }

        DB::table('landing_contents')
            ->where('id', $row->id)
            ->update([
                'settings' => json_encode($merged, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Backfill non-destructive; no rollback required.
    }
};
