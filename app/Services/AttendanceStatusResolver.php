<?php

namespace App\Services;

use App\Enums\StatusIzinPulang;
use App\Models\AttendanceParticipant;
use App\Models\AttendanceSession;
use App\Models\MahasiswaProfil;
use App\Models\PengajuanIzinPulang;
use Illuminate\Support\Collection;

class AttendanceStatusResolver
{
    /** @return Collection<int, array<string, mixed>> */
    public function forSession(AttendanceSession $session, ?Collection $approvedLeaves = null): Collection
    {
        $session->loadMissing(['kegiatan', 'participants.mahasiswa.user', 'attendances']);
        $records = $session->attendances->keyBy('mahasiswa_id');
        $sessionDate = $session->opens_at->copy()->timezone(config('residence.timezone'))->toDateString();
        $approvedLeaves ??= PengajuanIzinPulang::query()
            ->whereIn('mahasiswa_id', $session->participants->pluck('mahasiswa_id'))
            ->where('gedung_id', $session->kegiatan->gedung_id)
            ->whereIn('status', [StatusIzinPulang::Disetujui, StatusIzinPulang::SedangIzin, StatusIzinPulang::SudahSampai, StatusIzinPulang::SelesaiKembali])
            ->whereDate('tanggal_mulai', '<=', $sessionDate)
            ->whereDate('tanggal_kembali', '>=', $sessionDate)
            ->orderByDesc('created_at')->get();
        $leaves = $approvedLeaves->filter(fn (PengajuanIzinPulang $leave): bool => $leave->gedung_id === $session->kegiatan->gedung_id
            && $leave->tanggal_mulai->toDateString() <= $sessionDate
            && $leave->tanggal_kembali->toDateString() >= $sessionDate)->groupBy('mahasiswa_id');

        return $session->participants->map(function ($participant) use ($session, $records, $leaves): array {
            $record = $records->get($participant->mahasiswa_id);
            $leave = ($leaves->get($participant->mahasiswa_id) ?? collect())->first(
                fn (PengajuanIzinPulang $candidate): bool => $candidate->kembali_pada === null || $candidate->kembali_pada->gt($session->opens_at)
            );
            $status = match (true) {
                $record?->corrected_at !== null => $record->is_present ? 'hadir' : 'alfa',
                (bool) $record?->is_present => 'hadir',
                $leave !== null => $leave->jenis === 'sakit' ? 'sakit' : 'izin',
                $session->closed_at !== null || now()->gte($session->expires_at) => 'alfa',
                default => 'belum_absen',
            };
            $source = match (true) {
                $record?->corrected_at !== null => 'manual',
                (bool) $record?->is_present => 'scan',
                in_array($status, ['izin', 'sakit'], true) => 'leave',
                default => 'session',
            };

            return [
                'id' => $participant->mahasiswa_id,
                'name' => $participant->mahasiswa->user->nama,
                'nim' => $participant->mahasiswa->user->nim_nip,
                'floor' => $participant->floor,
                'room' => $participant->room,
                'is_present' => $status === 'hadir',
                'attendance_status' => $status,
                'status_source' => $source,
                'leave_id' => $source === 'leave' ? $leave->id : null,
                'scanned' => $record?->attendance_attempt_id !== null,
                'attended_at' => $record?->attended_at,
                'correction_reason' => $record?->correction_reason,
                'corrected_at' => $record?->corrected_at,
            ];
        });
    }

    /** @return Collection<int, array<string, mixed>> */
    public function historyFor(MahasiswaProfil $student): Collection
    {
        $sessions = AttendanceSession::query()->where(fn ($query) => $query
            ->whereHas('participants', fn ($participants) => $participants->where('mahasiswa_id', $student->id))
            ->orWhereHas('attendances', fn ($attendances) => $attendances->where('mahasiswa_id', $student->id)))
            ->with(['kegiatan', 'participants' => fn ($query) => $query->where('mahasiswa_id', $student->id)->with('mahasiswa.user'),
                'attendances' => fn ($query) => $query->where('mahasiswa_id', $student->id)])
            ->latest('opens_at')->get();
        $leaves = PengajuanIzinPulang::where('mahasiswa_id', $student->id)
            ->whereIn('status', [StatusIzinPulang::Disetujui, StatusIzinPulang::SedangIzin, StatusIzinPulang::SudahSampai, StatusIzinPulang::SelesaiKembali])->orderByDesc('created_at')->get();

        return $sessions->flatMap(function (AttendanceSession $session) use ($student, $leaves): Collection {
            if ($session->participants->isEmpty()) {
                $participant = new AttendanceParticipant(['mahasiswa_id' => $student->id]);
                $participant->setRelation('mahasiswa', $student->loadMissing('user'));
                $session->setRelation('participants', collect([$participant]));
            }

            return $this->forSession($session, $leaves)->map(fn (array $row): array => [...$row, 'id' => $session->id.':'.$student->id,
                'session' => ['opens_at' => $session->opens_at, 'kegiatan' => ['judul' => $session->kegiatan->judul]]]);
        })->values();
    }
}
