import { useCallback, useEffect, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import {
    PageHeader,
    Card,
    Table,
    Button,
    Modal,
    FormField,
    inputClass,
    RowActions,
    Tabs,
} from '../../components/ui';
import AttendanceMap from '../../components/AttendanceMap';
import { locateForAttendance, type GpsPosition } from '../../lib/geolocation';
import { store } from '@/routes/andalas/kegiatan';
import {
    show,
    correct,
    close,
    location as updateLocation,
} from '@/routes/andalas/absensi/sesi';

type Building = { id: string; nama_gedung: string };
type Activity = {
    id: string;
    judul: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
    gedung?: Building;
    attendance_session: {
        id: string;
        closed_at?: string;
        expires_at: string;
    } | null;
};
type Participant = {
    id: string;
    nim: string;
    name: string;
    floor: string;
    room: string;
    is_present: boolean;
    scanned: boolean;
    attended_at?: string;
    corrected_at?: string;
    correction_reason?: string;
};
type Preview = {
    id: string;
    activity: string;
    building: string;
    facilitator: string;
    is_owner: boolean;
    active: boolean;
    opens_at: string;
    expires_at: string;
    latitude: number;
    longitude: number;
    radius_meters: number;
    qr_code: string | null;
    participants: Participant[];
};

type Props = {
    kegiatan: Activity[];
    gedung: Building[];
    jenis_kegiatan: { id: string; nama: string; is_other: boolean }[];
    assigned_building?: Building | null;
    role?: string;
    activity_session_id?: string | null;
    can_manage?: boolean;
};
const date = (value?: string) =>
    value ? new Date(value).toLocaleString('id-ID') : '—';

export default function AdminJadwalKegiatan({
    kegiatan = [],
    gedung = [],
    jenis_kegiatan = [],
    assigned_building,
    role,
    activity_session_id,
    can_manage = false,
}: Props) {
    const [creating, setCreating] = useState(false);
    const [gps, setGps] = useState<GpsPosition | null>(null);
    const [gpsError, setGpsError] = useState('');
    const [locating, setLocating] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [preview, setPreview] = useState<Preview | null>(null);
    const [previewError, setPreviewError] = useState('');
    const [tab, setTab] = useState(0);
    const [editing, setEditing] = useState<Participant | null>(null);
    const form = useForm({
        jenis_kegiatan_id: '',
        judul: '',
        deskripsi: '',
        gedung_id: '',
        duration_minutes: 15,
        radius_meters: 100,
        latitude: 0,
        longitude: 0,
        accuracy_meters: 0,
    });
    const correction = useForm({ is_present: true, reason: '' });
    const isFacilitator = role === 'fasilitator';
    const type = jenis_kegiatan.find(
        (item) => item.id === form.data.jenis_kegiatan_id,
    );

    useEffect(() => {
        if (activity_session_id) setSessionId(activity_session_id);
    }, [activity_session_id]);

    const refresh = useCallback(async (id: string, signal?: AbortSignal) => {
        try {
            const response = await fetch(show.url(id), {
                headers: { Accept: 'application/json' },
                signal,
            });
            if (!response.ok)
                throw new Error(
                    'Preview tidak dapat dimuat. Periksa koneksi dan hak akses Anda.',
                );
            const data = (await response.json()) as Preview;
            if (!signal?.aborted) {
                setPreview(data);
                setPreviewError('');
            }
        } catch (error) {
            if (!signal?.aborted)
                setPreviewError(
                    error instanceof Error
                        ? error.message
                        : 'Gagal memuat preview.',
                );
        }
    }, []);
    useEffect(() => {
        if (!sessionId) {
            setPreview(null);
            return;
        }
        setPreview(null);
        const controller = new AbortController();
        void refresh(sessionId, controller.signal);
        const interval = window.setInterval(
            () => void refresh(sessionId, controller.signal),
            5000,
        );
        return () => {
            controller.abort();
            window.clearInterval(interval);
        };
    }, [sessionId, refresh]);

    const activeOwner = preview?.is_owner && preview?.active;
    const sessionRadius = preview?.radius_meters ?? 100;
    useEffect(() => {
        if (!sessionId || !activeOwner) return;
        let cancelled = false;
        const heartbeat = async () => {
            try {
                const position = await locateForAttendance(sessionRadius);
                if (cancelled) return;
                router.post(updateLocation.url(sessionId), position, {
                    preserveState: true,
                    preserveScroll: true,
                    onSuccess: () => setGpsError(''),
                    onError: () =>
                        setGpsError(
                            'Lokasi belum tersimpan; absensi ditolak jika lokasi fasilitator tidak diperbarui.',
                        ),
                });
            } catch (error) {
                if (!cancelled) setGpsError((error as Error).message);
            }
        };
        void heartbeat();
        const timer = window.setInterval(() => void heartbeat(), 20000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [sessionId, activeOwner, sessionRadius]);

    async function readGps() {
        setLocating(true);
        setGpsError('');
        try {
            const position = await locateForAttendance(form.data.radius_meters);
            setGps(position);
        } catch (error) {
            setGps(null);
            setGpsError((error as Error).message);
        } finally {
            setLocating(false);
        }
    }
    async function create(event: React.FormEvent) {
        event.preventDefault();
        setLocating(true);
        setGpsError('');
        try {
            const position = await locateForAttendance(form.data.radius_meters);
            setGps(position);
            if (position.accuracy_meters > form.data.radius_meters)
                throw new Error(
                    'Lokasi masih terlalu kasar untuk radius yang dipilih. Perbarui GPS atau sesuaikan radius absensi.',
                );
            form.transform((data) => ({ ...data, ...position }));
            form.post(store.url(), { onSuccess: () => setCreating(false) });
        } catch (error) {
            setGpsError((error as Error).message);
        } finally {
            setLocating(false);
        }
    }

    const participants = (preview?.participants ?? []).map((row) => ({
        ...row,
        status: row.is_present ? 'Hadir' : 'Belum hadir',
        source: row.corrected_at
            ? 'Koreksi manual'
            : row.scanned
              ? 'Scan QR'
              : 'Belum scan',
    }));
    const visible = participants.filter(
        (row) => tab === 0 || (tab === 1 ? row.is_present : !row.is_present),
    );
    return (
        <div className="space-y-4">
            <PageHeader
                title="Kegiatan & Absensi"
                subtitle={
                    assigned_building
                        ? 'Gedung penugasan: ' + assigned_building.nama_gedung
                        : 'Satu kegiatan, satu QR. Waktu dimulai saat kegiatan dibuat.'
                }
                actions={
                    can_manage && (
                        <Button
                            disabled={isFacilitator && !assigned_building}
                            onClick={() => {
                                form.resetAndClearErrors();
                                setGps(null);
                                setCreating(true);
                                void readGps();
                            }}
                        >
                            Buat kegiatan & QR
                        </Button>
                    )
                }
            />
            {isFacilitator && !assigned_building && (
                <p className="border-warning rounded-lg border p-4 text-sm">
                    Belum ada penugasan gedung. Hubungi admin untuk menetapkan
                    gedung Anda melalui Data Master.
                </p>
            )}
            <Card>
                <Table
                    columns={[
                        { key: 'judul', label: 'Kegiatan' },
                        {
                            key: 'building',
                            label: 'Gedung',
                            filter: {
                                type: 'select',
                                options: gedung.map((item) => item.nama_gedung),
                            },
                        },
                        {
                            key: 'tanggal_mulai',
                            label: 'Mulai',
                            render: (r: Activity) => date(r.tanggal_mulai),
                        },
                        {
                            key: 'tanggal_selesai',
                            label: 'Batas waktu',
                            render: (r: Activity) => date(r.tanggal_selesai),
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            filter: {
                                type: 'select',
                                options: [
                                    'Berlangsung',
                                    'Selesai',
                                    'Arsip tanpa QR',
                                ],
                            },
                        },
                        {
                            key: 'aksi',
                            label: 'Aksi',
                            render: (r: Activity) =>
                                can_manage && r.attendance_session ? (
                                    <RowActions
                                        onDetail={() => {
                                            setTab(0);
                                            setSessionId(
                                                r.attendance_session!.id,
                                            );
                                        }}
                                    />
                                ) : (
                                    <span className="text-base-content/60 text-xs">
                                        Arsip lama
                                    </span>
                                ),
                        },
                    ]}
                    data={kegiatan.map((row) => ({
                        ...row,
                        building: row.gedung?.nama_gedung ?? 'Arsip lama',
                        status: !row.attendance_session
                            ? 'Arsip tanpa QR'
                            : row.attendance_session.closed_at ||
                                new Date(row.tanggal_selesai).getTime() <=
                                    Date.now()
                              ? 'Selesai'
                              : 'Berlangsung',
                    }))}
                    searchKeys={['judul', 'building']}
                />
            </Card>

            <Modal
                open={creating}
                onClose={() => setCreating(false)}
                title="Buat kegiatan & QR"
                width="max-w-2xl"
            >
                <form onSubmit={create} className="space-y-4">
                    {isFacilitator ? (
                        <p className="font-medium">
                            {assigned_building?.nama_gedung}
                        </p>
                    ) : (
                        <FormField label="Gedung">
                            <select
                                required
                                className={inputClass}
                                value={form.data.gedung_id}
                                onChange={(e) =>
                                    form.setData('gedung_id', e.target.value)
                                }
                            >
                                <option value="">Pilih gedung</option>
                                {gedung.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.nama_gedung}
                                    </option>
                                ))}
                            </select>
                        </FormField>
                    )}
                    <FormField label="Jenis kegiatan">
                        <select
                            required
                            className={inputClass}
                            value={form.data.jenis_kegiatan_id}
                            onChange={(e) => {
                                form.setData(
                                    'jenis_kegiatan_id',
                                    e.target.value,
                                );
                                form.setData('judul', '');
                            }}
                        >
                            <option value="">Pilih jenis kegiatan</option>
                            {jenis_kegiatan.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.nama}
                                </option>
                            ))}
                        </select>
                    </FormField>
                    {type?.is_other && (
                        <FormField label="Nama kegiatan">
                            <input
                                required
                                maxLength={200}
                                className={inputClass}
                                value={form.data.judul}
                                onChange={(e) =>
                                    form.setData('judul', e.target.value)
                                }
                            />
                        </FormField>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormField label="Durasi QR (menit)">
                            <input
                                type="number"
                                required
                                min={1}
                                max={1440}
                                className={inputClass}
                                value={form.data.duration_minutes}
                                onChange={(e) =>
                                    form.setData(
                                        'duration_minutes',
                                        Number(e.target.value),
                                    )
                                }
                            />
                        </FormField>
                        <FormField label="Radius absensi (meter)">
                            <input
                                type="number"
                                required
                                min={10}
                                max={1000}
                                className={inputClass}
                                value={form.data.radius_meters}
                                onChange={(e) =>
                                    form.setData(
                                        'radius_meters',
                                        Number(e.target.value),
                                    )
                                }
                            />
                        </FormField>
                    </div>
                    <p className="text-base-content/70 text-sm">
                        Mulai otomatis saat disimpan. Selesai setelah durasi QR
                        berakhir. Titik GPS Anda menjadi pusat radius absensi.
                    </p>
                    {gps && (
                        <>
                            <AttendanceMap
                                {...gps}
                                radius={form.data.radius_meters}
                                accuracy={gps.accuracy_meters}
                            />
                            <p className="text-base-content/60 text-xs">
                                Akurasi GPS: {Math.round(gps.accuracy_meters)} m
                                · Radius validasi: {form.data.radius_meters} m
                            </p>
                        </>
                    )}
                    <Button
                        type="button"
                        variant="secondary"
                        disabled={locating}
                        onClick={() => void readGps()}
                    >
                        {locating ? 'Mengambil GPS…' : 'Perbarui GPS'}
                    </Button>
                    {gps && gps.accuracy_meters > form.data.radius_meters && (
                        <p role="status" className="text-warning text-sm">
                            Perkiraan akurasi ±{Math.ceil(gps.accuracy_meters)}{' '}
                            m melebihi radius {form.data.radius_meters} m.
                            Aktifkan lokasi presisi atau gunakan perangkat
                            dengan GPS. Radius dapat diperbesar jika sesuai area
                            kegiatan.
                        </p>
                    )}
                    {gpsError && (
                        <p role="alert" className="text-error text-sm">
                            {gpsError}
                        </p>
                    )}
                    <FormField label="Catatan (opsional)">
                        <textarea
                            maxLength={5000}
                            className={inputClass}
                            value={form.data.deskripsi}
                            onChange={(e) =>
                                form.setData('deskripsi', e.target.value)
                            }
                        />
                    </FormField>
                    {Object.values(form.errors).map((message, index) => (
                        <p
                            role="alert"
                            className="text-error text-sm"
                            key={index}
                        >
                            {message}
                        </p>
                    ))}
                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={
                                locating ||
                                form.processing ||
                                !gps ||
                                gps.accuracy_meters > form.data.radius_meters
                            }
                        >
                            {form.processing
                                ? 'Membuat…'
                                : 'Buat kegiatan & QR'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                open={!!sessionId}
                onClose={() => {
                    setSessionId(null);
                    setGpsError('');
                }}
                title={preview?.activity ?? 'Preview absensi'}
                width="max-w-6xl"
            >
                {previewError && (
                    <p role="alert" className="text-error">
                        {previewError}
                    </p>
                )}
                {!preview && !previewError && (
                    <p className="py-8 text-center">Memuat QR dan peserta…</p>
                )}
                {preview && (
                    <div className="space-y-5">
                        <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
                            <div>
                                <p className="font-semibold">
                                    {preview.building}
                                </p>
                                <p className="mt-1 text-sm">
                                    {preview.facilitator}
                                </p>
                                {preview.qr_code ? (
                                    <img
                                        className="my-3 w-64 max-w-full bg-white"
                                        src={preview.qr_code}
                                        alt="QR absensi kegiatan"
                                    />
                                ) : (
                                    <p className="text-base-content/70 my-5 text-sm">
                                        {preview.active
                                            ? 'QR ditampilkan oleh fasilitator pembuat kegiatan.'
                                            : 'Sesi telah berakhir. Riwayat dan koreksi tetap tersedia.'}
                                    </p>
                                )}
                                <p className="text-sm">
                                    Mulai: {date(preview.opens_at)}
                                    <br />
                                    Selesai: {date(preview.expires_at)}
                                </p>
                                {preview.active && (
                                    <Button
                                        className="mt-3"
                                        variant="secondary"
                                        onClick={() =>
                                            router.post(
                                                close.url(preview.id),
                                                {},
                                                {
                                                    preserveScroll: true,
                                                    onSuccess: () =>
                                                        void refresh(
                                                            preview.id,
                                                        ),
                                                },
                                            )
                                        }
                                    >
                                        Akhiri absensi
                                    </Button>
                                )}
                            </div>
                            <div className="space-y-3">
                                <AttendanceMap
                                    {...preview}
                                    radius={preview.radius_meters}
                                />
                                <p className="text-sm">
                                    Radius: {preview.radius_meters} meter.{' '}
                                    {preview.active &&
                                        'Fasilitator pembuat QR harus tetap membuka preview ini dan berada di dalam radius.'}
                                </p>
                                {gpsError && (
                                    <p className="text-error text-sm">
                                        {gpsError}
                                    </p>
                                )}
                            </div>
                        </div>
                        <Tabs
                            tabs={[
                                'Semua (' + participants.length + ')',
                                'Hadir (' +
                                    participants.filter((r) => r.is_present)
                                        .length +
                                    ')',
                                'Belum hadir (' +
                                    participants.filter((r) => !r.is_present)
                                        .length +
                                    ')',
                            ]}
                            active={tab}
                            onChange={setTab}
                        />
                        <Table
                            columns={[
                                { key: 'nim', label: 'NIM' },
                                { key: 'name', label: 'Nama' },
                                {
                                    key: 'floor',
                                    label: 'Lantai',
                                    filter: {
                                        type: 'select',
                                        options: [
                                            ...new Set(
                                                participants.map(
                                                    (r) => r.floor,
                                                ),
                                            ),
                                        ],
                                    },
                                },
                                { key: 'room', label: 'Kamar' },
                                { key: 'status', label: 'Kehadiran' },
                                {
                                    key: 'source',
                                    label: 'Pencatatan',
                                    filter: {
                                        type: 'select',
                                        options: [
                                            'Scan QR',
                                            'Koreksi manual',
                                            'Belum scan',
                                        ],
                                    },
                                },
                                {
                                    key: 'attended_at',
                                    label: 'Waktu',
                                    render: (r: Participant) =>
                                        date(r.attended_at),
                                },
                                {
                                    key: 'aksi',
                                    label: 'Aksi',
                                    render: (r: Participant) => (
                                        <RowActions
                                            onEdit={() => {
                                                setEditing(r);
                                                correction.setData({
                                                    is_present: r.is_present,
                                                    reason: '',
                                                });
                                                correction.clearErrors();
                                            }}
                                        />
                                    ),
                                },
                            ]}
                            data={visible.sort(
                                (a, b) =>
                                    a.floor.localeCompare(b.floor, 'id', {
                                        numeric: true,
                                    }) ||
                                    a.room.localeCompare(b.room, 'id', {
                                        numeric: true,
                                    }),
                            )}
                            searchKeys={['nim', 'name', 'room']}
                            emptyMessage="Tidak ada peserta pada pilihan ini."
                        />
                        <p className="text-base-content/60 text-xs">
                            Daftar peserta dan lantai dicatat saat QR dibuat.
                            Diperbarui setiap 5 detik. Koreksi manual tidak
                            dianggap sebagai scan QR.
                        </p>
                    </div>
                )}
            </Modal>
            <Modal
                open={!!editing}
                onClose={() => setEditing(null)}
                title="Koreksi kehadiran"
            >
                {editing && (
                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            if (!sessionId) return;
                            correction.put(
                                correct.url({
                                    session: sessionId,
                                    student: editing.id,
                                }),
                                {
                                    preserveScroll: true,
                                    onSuccess: () => {
                                        setEditing(null);
                                        void refresh(sessionId);
                                    },
                                },
                            );
                        }}
                    >
                        <p>
                            {editing.name} · {editing.nim}
                            <br />
                            {editing.floor} / kamar {editing.room}
                        </p>
                        {editing.correction_reason && (
                            <p className="text-sm">
                                Koreksi sebelumnya: {editing.correction_reason}
                            </p>
                        )}
                        <FormField label="Kehadiran">
                            <select
                                className={inputClass}
                                value={
                                    correction.data.is_present ? 'yes' : 'no'
                                }
                                onChange={(e) =>
                                    correction.setData(
                                        'is_present',
                                        e.target.value === 'yes',
                                    )
                                }
                            >
                                <option value="yes">Hadir</option>
                                <option value="no">Tidak hadir</option>
                            </select>
                        </FormField>
                        <FormField label="Alasan koreksi">
                            <textarea
                                required
                                minLength={5}
                                maxLength={2000}
                                className={inputClass}
                                value={correction.data.reason}
                                onChange={(e) =>
                                    correction.setData('reason', e.target.value)
                                }
                            />
                        </FormField>
                        {Object.values(correction.errors).map(
                            (message, index) => (
                                <p className="text-error text-sm" key={index}>
                                    {message}
                                </p>
                            ),
                        )}
                        <Button type="submit" disabled={correction.processing}>
                            Simpan koreksi
                        </Button>
                    </form>
                )}
            </Modal>
        </div>
    );
}
