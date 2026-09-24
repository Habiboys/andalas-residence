<?php

namespace App\Http\Controllers;

use App\Actions\Attendance\CloseAttendanceSession;
use App\Actions\Attendance\OpenAttendanceSession;
use App\Actions\Attendance\RecordAttendanceAttempt;
use App\Models\AttendanceSession;
use App\Models\Kegiatan;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AbsensiController extends Controller
{
    public function openSession(Request $request, Kegiatan $kegiatan, OpenAttendanceSession $open): RedirectResponse
    {
        $this->authorizePermission($request, 'attendance.session.manage');
        $validated = $request->validate([
            'expires_at' => ['required', 'date', 'after:now'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'accuracy_meters' => ['required', 'numeric', 'min:0'],
            'radius_meters' => ['required', 'integer', 'min:1'],
            'maximum_accuracy_meters' => ['required', 'integer', 'min:1'],
        ]);
        abort_if($request->user()->hasRole('fasilitator') && ! $kegiatan->allowsFacilitator($request->user()), 403);
        $result = $open->handle($kegiatan, $request->user(), Carbon::parse($validated['expires_at']), (float) $validated['latitude'], (float) $validated['longitude'], (int) $validated['radius_meters'], (int) $validated['maximum_accuracy_meters'], (float) $validated['accuracy_meters']);

        return back()->with('attendance_session', ['id' => $result['session']->id, 'token' => $result['token']])->with('toast', ['type' => 'success', 'message' => 'QR absensi berhasil dibuat.']);
    }

    public function updateLocation(Request $request, AttendanceSession $session): RedirectResponse
    {
        $this->authorizePermission($request, 'attendance.session.manage');
        abort_unless($session->facilitator_id === $request->user()->id, 403);
        $validated = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'accuracy_meters' => ['required', 'numeric', 'min:0'],
        ]);
        abort_if($session->closed_at || now()->gte($session->expires_at), 422);
        $session->update([
            'facilitator_latitude' => $validated['latitude'],
            'facilitator_longitude' => $validated['longitude'],
            'facilitator_accuracy_meters' => $validated['accuracy_meters'],
            'facilitator_located_at' => now(),
        ]);

        return back();
    }

    public function closeSession(Request $request, AttendanceSession $session, CloseAttendanceSession $close): RedirectResponse
    {
        $this->authorizePermission($request, 'attendance.session.manage');
        abort_unless($session->facilitator_id === $request->user()->id || $request->user()->hasRole('superadmin'), 403);
        $close->handle($session);

        return back()->with('toast', ['type' => 'success', 'message' => 'Sesi absensi ditutup.']);
    }

    public function recordActivity(Request $request, AttendanceSession $session, RecordAttendanceAttempt $record): RedirectResponse
    {
        $this->authorizePermission($request, 'absensi.scan');
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'accuracy_meters' => ['required', 'numeric', 'min:0'],
        ]);
        abort_unless($request->user()->mahasiswaProfil, 403);
        $attempt = $record->handle($session, $request->user()->mahasiswaProfil, $validated['token'], (float) $validated['latitude'], (float) $validated['longitude'], (float) $validated['accuracy_meters']);

        return back()->with('attendance_attempt', $attempt)->with('toast', ['type' => $attempt->rejection_reason ? 'error' : 'success', 'message' => $attempt->rejection_reason?->value ?? 'Absensi berhasil dicatat.']);
    }
}
