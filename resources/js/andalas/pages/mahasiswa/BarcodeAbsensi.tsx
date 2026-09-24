import AttendanceQrScanner from '../../components/AttendanceQrScanner';
import { parseAttendanceQr } from '../../lib/attendance-qr';
import { absensi as attendancePage } from '@/routes/mahasiswa';
import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { recordActivity } from '@/actions/App/Http/Controllers/AbsensiController';
import { Button, Card, PageHeader, Table } from '../../components/ui';

type Attendance = {
    attended_at: string;
    is_present: boolean;
    corrected_at?: string | null;
    correction_reason?: string | null;
    session?: { kegiatan?: { judul: string } };
};
type Attempt = {
    rejection_reason?: string | null;
    distance_meters?: number | null;
};
type Props = {
    absensi?: Attendance[];
    attendance_attempt?: Attempt | null;
    initialUser?: { attendance_eligible?: boolean };
};
const rejectionMessages: Record<string, string> = {
    session_not_open: 'Sesi belum dibuka atau sudah ditutup.',
    token_expired: 'Masa berlaku QR sudah habis.',
    token_invalid: 'QR tidak valid. Pindai QR terbaru.',
    ineligible:
        'Absensi hanya untuk mahasiswa lokal binaan dalam masa hunian tahun pertama.',
    location_inaccurate: 'Lokasi kurang akurat. Aktifkan GPS dan coba lagi.',
    outside_radius: 'Anda berada di luar radius kegiatan.',
    wrong_building:
        'Kegiatan ini khusus penghuni gedung lain. Gunakan QR kegiatan untuk gedung Anda.',
    facilitator_unavailable:
        'Fasilitator berada di luar radius atau lokasinya belum diperbarui.',
    duplicate:
        'Absensi Anda sudah memiliki catatan. Hubungi fasilitator jika perlu koreksi.',
};

export default function BarcodeAbsensi({
    absensi = [],
    attendance_attempt,
    initialUser,
}: Props) {
    const [locationError, setLocationError] = useState('');
    const [locationBusy, setLocationBusy] = useState(false);
    const form = useForm({
        token: '',
        latitude: 0,
        longitude: 0,
        accuracy_meters: 0,
    });
    const [scanned, setScanned] = useState(() =>
        typeof window === 'undefined'
            ? null
            : parseAttendanceQr(
                  window.location.href,
                  window.location.origin,
                  attendancePage.url(),
              ),
    );
    const sessionId = scanned?.sessionId;
    const token = scanned?.token;

    function submit() {
        if (!sessionId || !token || !navigator.geolocation) {
            setLocationError(
                'Pindai QR fasilitator dan izinkan akses lokasi pada perangkat Anda.',
            );
            return;
        }
        setLocationBusy(true);
        setLocationError('');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                form.transform(() => ({
                    token,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy_meters: position.coords.accuracy,
                }));
                form.post(recordActivity.url({ session: sessionId }), {
                    onFinish: () => setLocationBusy(false),
                });
            },
            () => {
                setLocationBusy(false);
                setLocationError(
                    'Lokasi tidak dapat diambil. Izinkan akses lokasi dan aktifkan GPS.',
                );
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
        );
    }

    return (
        <div className="space-y-4">
            <PageHeader
                title="Scan QR / Absensi Kegiatan"
                subtitle="Kehadiran mahasiswa binaan melalui QR kegiatan."
            />
            <Card className="space-y-4 p-6">
                {!initialUser?.attendance_eligible ? (
                    <p>
                        Absensi hanya tersedia bagi mahasiswa lokal binaan
                        selama tahun pertama hunian. Penghuni yang sudah
                        checkout dan masuk kembali tidak termasuk binaan.
                    </p>
                ) : (
                    <>
                        {!scanned && (
                            <AttendanceQrScanner onRead={setScanned} />
                        )}
                        <p>
                            {sessionId && token
                                ? 'QR berhasil dibaca. Konfirmasi kehadiran dengan lokasi perangkat Anda.'
                                : 'Pastikan GPS aktif dan Anda berada di lokasi kegiatan bersama fasilitator.'}
                        </p>
                        <Button
                            disabled={
                                !sessionId ||
                                !token ||
                                locationBusy ||
                                form.processing
                            }
                            onClick={submit}
                        >
                            {locationBusy || form.processing
                                ? 'Memeriksa lokasi...'
                                : 'Konfirmasi Kehadiran'}
                        </Button>
                        {scanned && (
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm ml-2"
                                disabled={locationBusy || form.processing}
                                onClick={() => {
                                    setScanned(null);
                                    form.clearErrors();
                                }}
                            >
                                Pindai QR lain
                            </button>
                        )}
                    </>
                )}
                {locationError && (
                    <p role="alert" className="text-error">
                        {locationError}
                    </p>
                )}
                {Object.entries(form.errors).map(([key, error]) => (
                    <p role="alert" key={key} className="text-error">
                        {error}
                    </p>
                ))}
            </Card>
            {attendance_attempt && (
                <Card className="p-5">
                    <p>
                        {attendance_attempt.rejection_reason
                            ? (rejectionMessages[
                                  attendance_attempt.rejection_reason
                              ] ?? 'Absensi tidak dapat diterima.')
                            : 'Kehadiran berhasil dicatat.'}
                    </p>
                </Card>
            )}
            <Card>
                <Table
                    columns={[
                        {
                            key: 'session.kegiatan.judul',
                            label: 'Kegiatan',
                            render: (row: Attendance) =>
                                row.session?.kegiatan?.judul ?? '-',
                        },
                        {
                            key: 'attended_at',
                            label: 'Waktu pencatatan',
                            render: (row: Attendance) =>
                                new Date(row.attended_at).toLocaleString(
                                    'id-ID',
                                ),
                        },
                        {
                            key: 'is_present',
                            label: 'Kehadiran',
                            render: (row: Attendance) =>
                                row.is_present ? 'Hadir' : 'Tidak hadir',
                        },
                        {
                            key: 'corrected_at',
                            label: 'Pencatatan',
                            render: (row: Attendance) =>
                                row.corrected_at ? 'Koreksi manual' : 'Scan QR',
                        },
                        {
                            key: 'correction_reason',
                            label: 'Alasan koreksi',
                            render: (row: Attendance) =>
                                row.correction_reason ?? '—',
                        },
                    ]}
                    data={absensi}
                    emptyMessage="Belum ada riwayat kehadiran kegiatan."
                />
            </Card>
        </div>
    );
}
