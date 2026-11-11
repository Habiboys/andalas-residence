<?php

namespace App\Jobs;

use App\Models\LaporanKerusakan;
use App\Models\User;
use App\Services\DamageReportAccess;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;

class SendDamageReportNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public string $eventId)
    {
        $this->afterCommit();
    }

    public function handle(): void
    {
        DB::transaction(function (): void {
            $event = DB::table('damage_report_notifications')->where('id', $this->eventId)->lockForUpdate()->first();
            if (! $event || $event->status !== 'pending') {
                return;
            }
            $user = User::find($event->user_id);
            $report = LaporanKerusakan::find($event->laporan_kerusakan_id);
            if (! $user || ! $report || ! DamageReportAccess::canView($user, $report)) {
                DB::table('damage_report_notifications')->where('id', $event->id)->update(['status' => 'skipped', 'updated_at' => now()]);
                return;
            }
            DB::table('notifications')->insertOrIgnore([
                'id' => $event->id, 'type' => self::class, 'notifiable_type' => User::class, 'notifiable_id' => $user->id,
                'data' => json_encode(['subject' => 'Perbaikan selesai', 'message' => 'Laporan '.$report->nomor_tiket.' telah diselesaikan. Bukti perbaikan tersedia pada detail laporan.', 'report_id' => $report->id, 'url' => '/pelaporan']),
                'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('damage_report_notifications')->where('id', $event->id)->update(['status' => 'sent', 'sent_at' => now(), 'attempts' => $event->attempts + 1, 'last_error' => null, 'updated_at' => now()]);
        }, 3);
    }

    public function failed(\Throwable $exception): void
    {
        DB::table('damage_report_notifications')->where('id', $this->eventId)->update(['last_error' => mb_substr($exception->getMessage(), 0, 2000), 'attempts' => DB::raw('attempts + 1'), 'updated_at' => now()]);
    }
}
