<?php

namespace App\Http\Controllers;

use App\Actions\Attendance\CloseAttendanceSession;
use App\Actions\Attendance\RecordAttendanceAttempt;
use App\Models\ActivityAttendance;
use App\Models\AttendanceSession;
use App\Models\AuditLog;
use App\Models\MahasiswaProfil;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Writer\SvgWriter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AbsensiController extends Controller
{
    private function authorizeSession(Request $request, AttendanceSession $session): void
    {
        abort_unless($request->user()->can('kegiatan.manage') || $request->user()->can('attendance.session.manage'), 403);
        abort_if($request->user()->hasRole('fasilitator') && ! $session->kegiatan->allowsFacilitator($request->user()), 403);
    }

    public function show(Request $request, AttendanceSession $session): JsonResponse
    {
        $this->authorizeSession($request, $session);
        $session->load(['kegiatan.gedung', 'facilitator', 'participants.mahasiswa.user', 'attendances']);
        $active = ! $session->closed_at && now()->lt($session->expires_at);
        $qr = $active && $session->qr_token && $session->facilitator_id === $request->user()->id
            ? (new Builder(writer: new SvgWriter, data: route('mahasiswa.absensi', ['session_id' => $session->id, 'token' => $session->qr_token]), size: 320, margin: 12))->build()->getDataUri()
            : null;
        $attendance = $session->attendances->keyBy('mahasiswa_id');

        return response()->json([
            'id' => $session->id, 'activity' => $session->kegiatan->judul,
            'building' => $session->kegiatan->gedung?->nama_gedung ?? 'Arsip kegiatan lama',
            'facilitator' => $session->facilitator->nama,
            'is_owner' => $session->facilitator_id === $request->user()->id,
            'active' => $active, 'opens_at' => $session->opens_at, 'expires_at' => $session->expires_at,
            'latitude' => $session->anchor_latitude, 'longitude' => $session->anchor_longitude,
            'radius_meters' => $session->radius_meters, 'qr_code' => $qr,
            'participants' => $session->participants->map(function ($participant) use ($attendance) {
                $record = $attendance->get($participant->mahasiswa_id);

                return [
                    'id' => $participant->mahasiswa_id, 'name' => $participant->mahasiswa->user->nama,
                    'nim' => $participant->mahasiswa->user->nim_nip, 'floor' => $participant->floor, 'room' => $participant->room,
                    'is_present' => (bool) $record?->is_present, 'scanned' => $record?->attendance_attempt_id !== null,
                    'attended_at' => $record?->attended_at, 'correction_reason' => $record?->correction_reason,
                    'corrected_at' => $record?->corrected_at,
                ];
            }),
        ])->header('Cache-Control', 'private, no-store');
    }

    public function correct(Request $request, AttendanceSession $session, MahasiswaProfil $student): RedirectResponse
    {
        $this->authorizeSession($request, $session);
        abort_unless($session->participants()->where('mahasiswa_id', $student->id)->exists(), 404);
        $data = $request->validate(['is_present' => 'required|boolean', 'reason' => 'required|string|min:5|max:2000']);
        DB::transaction(function () use ($request, $session, $student, $data): void {
            AttendanceSession::whereKey($session->id)->lockForUpdate()->firstOrFail();
            $record = ActivityAttendance::firstOrNew(['attendance_session_id' => $session->id, 'mahasiswa_id' => $student->id]);
            $old = $record->toArray();
            $record->fill(['is_present' => $data['is_present'], 'correction_reason' => $data['reason'], 'corrected_by' => $request->user()->id, 'corrected_at' => now()]);
            $record->attended_at ??= now();
            $record->save();
            AuditLog::create(['user_id' => $request->user()->id, 'event' => 'attendance.corrected',
                'auditable_type' => ActivityAttendance::class, 'auditable_id' => $record->id,
                'old_values' => $old, 'new_values' => $record->toArray(), 'ip_address' => $request->ip()]);
        });

        return back()->with('toast', ['type' => 'success', 'message' => 'Koreksi absensi tersimpan beserta jejak audit.']);
    }

    public function updateLocation(Request $request, AttendanceSession $session): RedirectResponse|JsonResponse
    {
        $this->authorizeSession($request, $session);
        abort_unless($session->facilitator_id === $request->user()->id, 403);
        $validated = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'accuracy_meters' => ['required', 'numeric', 'min:0'],
        ]);
        abort_if($session->closed_at || now()->gte($session->expires_at), 422);
        $session->update([
            'facilitator_latitude' => $validated['latitude'], 'facilitator_longitude' => $validated['longitude'],
            'facilitator_accuracy_meters' => $validated['accuracy_meters'], 'facilitator_located_at' => now(),
        ]);

        return $request->expectsJson() ? response()->json(['updated' => true]) : back();
    }

    public function closeSession(Request $request, AttendanceSession $session, CloseAttendanceSession $close): RedirectResponse
    {
        $this->authorizeSession($request, $session);
        $close->handle($session);

        return back()->with('toast', ['type' => 'success', 'message' => 'Sesi absensi ditutup.']);
    }

    public function recordActivity(Request $request, AttendanceSession $session, RecordAttendanceAttempt $record): RedirectResponse
    {
        $this->authorizePermission($request, 'absensi.scan');
        $validated = $request->validate([
            'token' => ['required', 'string'], 'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'], 'accuracy_meters' => ['required', 'numeric', 'min:0'],
        ]);
        abort_unless($request->user()->mahasiswaProfil, 403);
        $attempt = $record->handle($session, $request->user()->mahasiswaProfil, $validated['token'], (float) $validated['latitude'], (float) $validated['longitude'], (float) $validated['accuracy_meters']);

        return back()->with('attendance_attempt', $attempt)->with('toast', ['type' => $attempt->rejection_reason ? 'error' : 'success', 'message' => $attempt->rejection_reason?->value ?? 'Absensi berhasil dicatat.']);
    }
}
