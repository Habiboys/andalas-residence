import { useEffect, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    closeSession,
    openSession,
    updateLocation,
} from '@/actions/App/Http/Controllers/AbsensiController';
import {
    Button,
    Card,
    FormField,
    inputClass,
    PageHeader,
    Table,
} from '../../components/ui';

type KegiatanRow = {
    id: string;
    judul?: string;
    tanggal_mulai?: string;
    tanggal_selesai?: string;
    lokasi?: string;
    gedung?: { nama_gedung: string } | null;
};

type AttendanceSessionRow = {
    id: string;
    expires_at?: string;
    closed_at?: string | null;
    kegiatan?: KegiatanRow;
};

type GeneratedSession = {
    id: string;
    token: string;
    qr_code: string;
};

type Props = {
    kegiatan?: KegiatanRow[];
    attendance_sessions?: AttendanceSessionRow[];
    attendance_session?: GeneratedSession | null;
};

function defaultExpiry(): string {
    const value = new Date(Date.now() + 15 * 60 * 1000);
    value.setMinutes(value.getMinutes() - value.getTimezoneOffset());

    return value.toISOString().slice(0, 16);
}

export default function ScanBarcode({
    kegiatan = [],
    attendance_sessions = [],
    attendance_session = null,
}: Props) {
    const [activeQr, setActiveQr] = useState<GeneratedSession | null>(
        attendance_session,
    );
    const [locationBusy, setLocationBusy] = useState(false);
    const { data, setData, post, processing, errors } = useForm({
        expires_at: defaultExpiry(),
        accuracy_meters: 0,
        latitude: '',
        longitude: '',
        radius_meters: 100,
        maximum_accuracy_meters: 30,
    });
    const [selectedActivity, setSelectedActivity] = useState(
        kegiatan[0]?.id ?? '',
    );

    useEffect(() => {
        if (attendance_session) {
            setActiveQr(attendance_session);
            toast.success('QR absensi siap dipindai mahasiswa.');
        }
    }, [attendance_session]);

    useEffect(() => {
        if (!activeQr) return;
        const session = attendance_sessions.find(
            (item) => item.id === activeQr.id,
        );
        if (session?.closed_at) {
            setActiveQr(null);
            return;
        }
        const remaining = session?.expires_at
            ? new Date(session.expires_at).getTime() - Date.now()
            : null;
        if (remaining !== null && remaining <= 0) {
            setActiveQr(null);
            return;
        }
        function refreshLocation() {
            navigator.geolocation?.getCurrentPosition(
                (position) => {
                    router.post(
                        updateLocation.url({ session: activeQr!.id }),
                        {
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy_meters: position.coords.accuracy,
                        },
                        { preserveScroll: true, preserveState: true },
                    );
                },
                () =>
                    toast.error(
                        'Lokasi fasilitator tidak tersedia. Absensi akan ditolak sampai lokasi diperbarui.',
                    ),
                { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
            );
        }
        const timer = window.setInterval(refreshLocation, 20000);
        const expiryTimer =
            remaining === null
                ? null
                : window.setTimeout(() => setActiveQr(null), remaining);
        return () => {
            window.clearInterval(timer);
            if (expiryTimer !== null) window.clearTimeout(expiryTimer);
        };
    }, [activeQr, attendance_sessions]);

    function useCurrentLocation() {
        if (!navigator.geolocation) {
            toast.error('Perangkat ini tidak mendukung geolokasi.');
            return;
        }

        setLocationBusy(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setData('latitude', String(position.coords.latitude));
                setData('longitude', String(position.coords.longitude));
                setData('accuracy_meters', position.coords.accuracy);
                setLocationBusy(false);
                toast.success('Lokasi fasilitator berhasil diambil.');
            },
            () => {
                setLocationBusy(false);
                toast.error(
                    'Lokasi tidak dapat diambil. Izinkan akses lokasi browser.',
                );
            },
            { enableHighAccuracy: true, timeout: 15000 },
        );
    }

    function createQr(event: React.FormEvent) {
        event.preventDefault();
        if (!selectedActivity) {
            toast.error('Pilih kegiatan terlebih dahulu.');
            return;
        }

        post(openSession.url({ kegiatan: selectedActivity }));
    }

    function closeQr(sessionId: string) {
        router.post(
            closeSession.url({ session: sessionId }),
            {},
            { onSuccess: () => setActiveQr(null) },
        );
    }

    return (
        <div className="space-y-4">
            <PageHeader
                title="QR Absensi Kegiatan"
                subtitle="Buat QR sementara dengan batas waktu dan geofencing"
            />

            <Card className="p-6">
                <form
                    onSubmit={createQr}
                    className="grid grid-cols-1 gap-4 lg:grid-cols-2"
                >
                    <FormField label="Kegiatan">
                        <select
                            className={`${inputClass} w-full`}
                            value={selectedActivity}
                            onChange={(event) =>
                                setSelectedActivity(event.target.value)
                            }
                            required
                        >
                            <option value="">Pilih kegiatan</option>
                            {kegiatan.map((activity) => (
                                <option key={activity.id} value={activity.id}>
                                    {activity.judul ?? activity.id}
                                    {' — '}
                                    {activity.gedung?.nama_gedung ??
                                        'Umum - seluruh asrama'}
                                </option>
                            ))}
                        </select>
                    </FormField>
                    <FormField label="QR berlaku sampai">
                        <input
                            type="datetime-local"
                            className={inputClass}
                            value={data.expires_at}
                            onChange={(event) =>
                                setData('expires_at', event.target.value)
                            }
                            required
                        />
                        {errors.expires_at && (
                            <p className="text-error text-sm">
                                {errors.expires_at}
                            </p>
                        )}
                    </FormField>
                    <FormField label="Latitude fasilitator">
                        <input
                            className={inputClass}
                            value={data.latitude}
                            readOnly
                            required
                        />
                        {errors.latitude && (
                            <p className="text-error text-sm">
                                {errors.latitude}
                            </p>
                        )}
                    </FormField>
                    <FormField label="Longitude fasilitator">
                        <input
                            className={inputClass}
                            value={data.longitude}
                            readOnly
                            required
                        />
                        {errors.longitude && (
                            <p className="text-error text-sm">
                                {errors.longitude}
                            </p>
                        )}
                    </FormField>
                    <FormField label="Radius absensi (meter)">
                        <input
                            type="number"
                            min={1}
                            className={inputClass}
                            value={data.radius_meters}
                            onChange={(event) =>
                                setData(
                                    'radius_meters',
                                    Number(event.target.value),
                                )
                            }
                            required
                        />
                    </FormField>
                    <FormField label="Akurasi maksimum (meter)">
                        <input
                            type="number"
                            min={1}
                            className={inputClass}
                            value={data.maximum_accuracy_meters}
                            onChange={(event) =>
                                setData(
                                    'maximum_accuracy_meters',
                                    Number(event.target.value),
                                )
                            }
                            required
                        />
                    </FormField>
                    <div className="flex flex-wrap gap-2 lg:col-span-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={useCurrentLocation}
                            disabled={locationBusy}
                        >
                            {locationBusy
                                ? 'Mengambil lokasi...'
                                : 'Ambil Lokasi Saya'}
                        </Button>
                        {Object.entries(errors).map(([key, error]) => (
                            <p key={key} className="text-error">
                                {error}
                            </p>
                        ))}
                        <Button
                            type="submit"
                            disabled={
                                processing || !data.latitude || !data.longitude
                            }
                        >
                            {processing ? 'Membuat QR...' : 'Buat QR Absensi'}
                        </Button>
                    </div>
                </form>
            </Card>

            {activeQr && (
                <Card className="p-6 text-center">
                    <h2 className="text-lg font-semibold">QR Aktif</h2>
                    <p className="text-muted mt-1 text-sm">
                        Mahasiswa memindai QR ini dari menu Absensi Kegiatan.
                    </p>
                    <img
                        src={activeQr.qr_code}
                        alt="QR absensi kegiatan"
                        className="mx-auto mt-4 size-72 max-w-full rounded-xl bg-white p-3"
                    />
                    <Button
                        className="mt-4"
                        variant="secondary"
                        onClick={() => closeQr(activeQr.id)}
                    >
                        Tutup Sesi Sekarang
                    </Button>
                </Card>
            )}

            <Card>
                <div className="border-base-300 border-b px-5 py-4">
                    <h2 className="font-semibold">Riwayat Sesi QR</h2>
                </div>
                <Table
                    columns={[
                        {
                            key: 'kegiatan',
                            label: 'Kegiatan',
                            render: (row: AttendanceSessionRow) =>
                                row.kegiatan?.judul ?? '-',
                        },
                        {
                            key: 'expires_at',
                            label: 'Berlaku Sampai',
                            render: (row: AttendanceSessionRow) =>
                                String(row.expires_at ?? '')
                                    .slice(0, 16)
                                    .replace('T', ' '),
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            render: (row: AttendanceSessionRow) =>
                                row.closed_at
                                    ? 'Ditutup'
                                    : 'Aktif / kedaluwarsa otomatis',
                        },
                        {
                            key: 'aksi',
                            label: '',
                            render: (row: AttendanceSessionRow) =>
                                !row.closed_at ? (
                                    <Button
                                        variant="secondary"
                                        onClick={() => closeQr(row.id)}
                                    >
                                        Tutup
                                    </Button>
                                ) : null,
                        },
                    ]}
                    data={attendance_sessions}
                    emptyMessage="Belum ada sesi QR"
                />
            </Card>
        </div>
    );
}
