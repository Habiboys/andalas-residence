<?php

namespace App\Actions\Attendance;

use App\Models\AttendanceSession;

class CloseAttendanceSession
{
    public function handle(AttendanceSession $session): AttendanceSession
    {
        if ($session->closed_at === null) {
            $session->forceFill(['closed_at' => now()])->save();
        }

        return $session->refresh();
    }
}
