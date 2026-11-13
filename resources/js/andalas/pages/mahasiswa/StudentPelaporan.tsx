import { useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Bell,
    CheckCircle2,
    Clock,
    Image as ImageIcon,
    MapPin,
    MessageSquarePlus,
    Search,
    Wrench,
} from 'lucide-react';
import * as damageReport from '@/actions/App/Http/Controllers/DamageReportController';
import * as tiket from '@/actions/App/Http/Controllers/TiketController';
import {
    Badge,
    Button,
    Card,
    ConfirmDialog,
    EmptyState,
    PageHeader,
    StatCard,
    StatusBadge,
    inputClass,
} from '@/andalas/components/ui';
import { formatDate } from '@/andalas/lib/format';
import {
    ComplaintForm,
    MultiItemForm,
    type DamageItem,
} from '@/andalas/pages/teknisi/RevisionPanels';

type Option = { id: string; nama: string };
type Photo = { id: string; type: string };
type Progress = {
    id: string;
    work_date: string;
    description: string;
    is_blocked: boolean;
    user?: Option | null;
};
type History = {
    id: string;
    from_status?: string | null;
    to_status: string;
    description?: string | null;
    created_at?: string;
    actor?: { nama?: string } | null;
};
type Complaint = {
    id: string;
    item_id?: string | null;
    reason: string;
    status?: string;
    created_at?: string;
};

type Report = {
    id: string;
    nomor_tiket: string;
    deskripsi: string;
    catatan_penyelesaian?: string | null;
    cancellation_reason?: string | null;
    status: string;
    source?: string;
    location_label?: string | null;
    tanggal_lapor?: string | null;
    tanggal_selesai?: string | null;
    is_blocked?: boolean;
    aset?: { id: string; nama_aset: string } | null;
    kamar?: {
        nomor_kamar: string;
        lantai?: { gedung?: { nama_gedung?: string } | null } | null;
    } | null;
    fasilitas_umum?: { id: string; nama_fasilitas: string } | null;
    teknisi?: Option | null;
    photos: Photo[];
    items: (DamageItem & {
        photos?: Photo[];
        location_label?: string | null;
    })[];
    progress: Progress[];
    status_histories: History[];
    complaints?: Complaint[];
    abilities: {
        confirm?: boolean;
    };
};

type Pagination<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    last_page: number;
    total: number;
};

type Props = {
    reports: Pagination<Report>;
    summary: Record<string, number>;
    can_report: boolean;
    can_complain: boolean;
    resident_name: string;
    room?: {
        id?: string;
        nomor_kamar: string;
        lantai?: { gedung?: { nama_gedung: string } };
    } | null;
    assets: {
        id: string;
        nama_aset: string;
        kamar_id?: string | null;
        fasilitas_umum_id?: string | null;
    }[];
    facilities: { id: string; nama_fasilitas: string }[];
    notifications: {
        id: string;
        data: { subject: string; message: string };
    }[];
};

const STATUS_FILTER_OPTIONS = [
    { value: '', label: 'Semua Status' },
    { value: 'menunggu_triage', label: 'Menunggu Triage' },
    { value: 'didisposisikan', label: 'Didisposisikan' },
    { value: 'sedang_dikerjakan', label: 'Sedang Dikerjakan' },
    { value: 'selesai', label: 'Selesai' },
    { value: 'dibatalkan', label: 'Dibatalkan' },
];

export default function StudentPelaporan({
    reports,
    summary,
    can_report,
    can_complain,
    resident_name,
    room,
    assets,
    facilities,
    notifications,
}: Props) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [confirmTarget, setConfirmTarget] = useState<Report | null>(null);
    const [openComplaintId, setOpenComplaintId] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (reports?.data ?? []).filter((r) => {
            if (statusFilter && r.status !== statusFilter) {
                return false;
            }
            if (!q) {
                return true;
            }
            return (
                r.nomor_tiket.toLowerCase().includes(q) ||
                r.deskripsi.toLowerCase().includes(q) ||
                (r.location_label ?? '').toLowerCase().includes(q) ||
                (r.items ?? []).some((i) =>
                    i.description.toLowerCase().includes(q),
                )
            );
        });
    }, [reports?.data, search, statusFilter]);

    const waitingCount =
        (summary?.menunggu_triage ?? 0) + (summary?.didisposisikan ?? 0);

    const handleMarkRead = (id: string) => {
        setBusyId(id);
        router.post(
            damageReport.readNotification.url(id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setBusyId(null),
            },
        );
    };

    const handleConfirmIncident = () => {
        if (!confirmTarget) {
            return;
        }
        setBusyId(confirmTarget.id);
        router.post(
            damageReport.confirm.url(confirmTarget.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => setConfirmTarget(null),
                onFinish: () => setBusyId(null),
            },
        );
    };

    return (
        <div className="space-y-6">
            <Head title="Pelaporan Kerusakan Asrama" />

            <PageHeader
                title="Pelaporan Kerusakan Asrama"
                subtitle="Laporkan kerusakan barang kamar atau fasilitas umum asrama dan pantau progres perbaikannya."
            />

            {/* Unread Notifications */}
            {notifications.length > 0 && (
                <div className="space-y-2">
                    {notifications.map((n) => (
                        <div
                            key={n.id}
                            className="border-info/40 bg-info/10 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                        >
                            <div className="flex items-start gap-3">
                                <Bell
                                    className="text-info mt-0.5 size-5 shrink-0"
                                    aria-hidden="true"
                                />
                                <div>
                                    <p className="text-sm font-semibold">
                                        {n.data.subject}
                                    </p>
                                    <p className="text-muted text-sm">
                                        {n.data.message}
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={busyId === n.id}
                                onClick={() => handleMarkRead(n.id)}
                            >
                                Tandai sudah dibaca
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                    label="Total Tiket"
                    value={reports?.total ?? 0}
                    icon={<Wrench className="size-5" aria-hidden="true" />}
                />
                <StatCard
                    label="Menunggu Penanganan"
                    value={waitingCount}
                    color="gold"
                    icon={<Clock className="size-5" aria-hidden="true" />}
                />
                <StatCard
                    label="Sedang Dikerjakan"
                    value={summary?.sedang_dikerjakan ?? 0}
                    color="gold"
                    icon={<Wrench className="size-5" aria-hidden="true" />}
                />
                <StatCard
                    label="Selesai"
                    value={summary?.selesai ?? 0}
                    color="green"
                    icon={
                        <CheckCircle2 className="size-5" aria-hidden="true" />
                    }
                />
            </div>

            {/* New Multi-Item Report Form */}
            {can_report ? (
                <MultiItemForm
                    name={resident_name}
                    room={room}
                    assets={assets}
                    facilities={facilities}
                />
            ) : (
                <Card className="p-4">
                    <div className="text-muted flex items-center gap-2.5 text-sm">
                        <AlertTriangle
                            className="text-warning size-5 shrink-0"
                            aria-hidden="true"
                        />
                        <span>
                            Pembuatan laporan baru hanya tersedia untuk penghuni
                            dengan penempatan kamar aktif.
                        </span>
                    </div>
                </Card>
            )}

            {/* Filter & Search Bar */}
            <Card className="p-4">
                <div className="grid gap-3 md:grid-cols-3">
                    <label className="relative block md:col-span-2">
                        <Search
                            className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                            aria-hidden="true"
                        />
                        <input
                            type="search"
                            className={`${inputClass} pl-9`}
                            placeholder="Cari nomor tiket, lokasi, atau deskripsi kerusakan..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </label>
                    <select
                        aria-label="Filter status laporan"
                        className="select select-bordered w-full"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        {STATUS_FILTER_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            </Card>

            {/* Reports List */}
            <section aria-label="Daftar laporan kerusakan" className="space-y-4">
                {rows.length === 0 ? (
                    <Card>
                        <EmptyState
                            title="Belum ada laporan kerusakan yang ditampilkan"
                            desc={
                                search || statusFilter
                                    ? 'Coba ubah kata kunci pencarian atau pilih semua status.'
                                    : 'Laporan kerusakan yang Anda buat atau terkait kamar Anda akan muncul di sini.'
                            }
                            action={
                                (search || statusFilter) && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => {
                                            setSearch('');
                                            setStatusFilter('');
                                        }}
                                    >
                                        Reset Filter
                                    </Button>
                                )
                            }
                        />
                    </Card>
                ) : (
                    rows.map((r) => {
                        const locationName =
                            r.location_label ??
                            (r.kamar
                                ? `${r.kamar.lantai?.gedung?.nama_gedung ?? 'Gedung'} · Kamar ${r.kamar.nomor_kamar}`
                                : r.fasilitas_umum?.nama_fasilitas ?? '-');

                        return (
                            <Card key={r.id} className="space-y-4 p-4 md:p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-identifier text-sm font-bold">
                                                {r.nomor_tiket}
                                            </span>
                                            <StatusBadge status={r.status} />
                                            {r.is_blocked && (
                                                <Badge color="orange">
                                                    Terhambat material/akses
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-muted flex flex-wrap items-center gap-3 text-xs">
                                            <span className="flex items-center gap-1">
                                                <MapPin
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                {locationName}
                                            </span>
                                            <span>
                                                Dilaporkan:{' '}
                                                {formatDate(r.tanggal_lapor)}
                                            </span>
                                            {r.teknisi && (
                                                <span>
                                                    Teknisi: {r.teknisi.nama}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {r.abilities?.confirm && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="secondary"
                                                onClick={() =>
                                                    setConfirmTarget(r)
                                                }
                                            >
                                                Saya mengalami kejadian ini
                                            </Button>
                                        )}
                                        {can_complain &&
                                            r.status === 'selesai' && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() =>
                                                        setOpenComplaintId(
                                                            openComplaintId ===
                                                                r.id
                                                                ? null
                                                                : r.id,
                                                        )
                                                    }
                                                >
                                                    <MessageSquarePlus
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                    Ajukan Komplain Ulang
                                                </Button>
                                            )}
                                    </div>
                                </div>

                                {/* Items checklist */}
                                {r.items?.length > 0 ? (
                                    <div className="space-y-2">
                                        {r.items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="border-base-300 bg-base-200/30 rounded-lg border p-3 text-sm"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="font-medium">
                                                        {item.description}
                                                    </p>
                                                    <Badge
                                                        color={
                                                            item.completed_at
                                                                ? 'green'
                                                                : 'yellow'
                                                        }
                                                    >
                                                        {item.completed_at
                                                            ? 'Selesai diperbaiki'
                                                            : 'Dalam proses'}
                                                    </Badge>
                                                </div>
                                                {item.completion_note && (
                                                    <p className="text-muted mt-1 text-xs">
                                                        Catatan teknisi:{' '}
                                                        {item.completion_note}
                                                    </p>
                                                )}
                                                {(item.photos?.length ?? 0) >
                                                    0 && (
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {item.photos?.map(
                                                            (ph, idx) => (
                                                                <a
                                                                    key={ph.id}
                                                                    href={tiket.photo.url(
                                                                        ph.id,
                                                                    )}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="btn btn-xs btn-ghost border-base-300 gap-1 border"
                                                                >
                                                                    <ImageIcon
                                                                        className="size-3.5"
                                                                        aria-hidden="true"
                                                                    />
                                                                    {ph.type ===
                                                                    'after'
                                                                        ? `Bukti Selesai ${idx + 1}`
                                                                        : `Foto Awal ${idx + 1}`}
                                                                </a>
                                                            ),
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm">{r.deskripsi}</p>
                                )}

                                {/* Header-level photos & resolution note */}
                                {r.photos?.length > 0 &&
                                    r.items?.length === 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {r.photos.map((ph, idx) => (
                                                <a
                                                    key={ph.id}
                                                    href={tiket.photo.url(ph.id)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="btn btn-xs btn-outline gap-1"
                                                >
                                                    <ImageIcon
                                                        className="size-3.5"
                                                        aria-hidden="true"
                                                    />
                                                    {ph.type === 'after'
                                                        ? `Bukti Hasil ${idx + 1}`
                                                        : `Foto Awal ${idx + 1}`}
                                                </a>
                                            ))}
                                        </div>
                                    )}

                                {r.catatan_penyelesaian && (
                                    <div className="border-success/40 bg-success/10 rounded-lg border p-3 text-xs">
                                        <strong>Hasil penyelesaian:</strong>{' '}
                                        {r.catatan_penyelesaian}
                                    </div>
                                )}

                                {r.cancellation_reason && (
                                    <div className="border-error/40 bg-error/10 rounded-lg border p-3 text-xs">
                                        <strong>Alasan pembatalan:</strong>{' '}
                                        {r.cancellation_reason}
                                    </div>
                                )}

                                {/* Complaints logged on completed ticket */}
                                {(r.complaints?.length ?? 0) > 0 && (
                                    <div className="border-warning/40 bg-warning/10 space-y-1 rounded-lg border p-3 text-xs">
                                        <p className="font-semibold">
                                            Riwayat Komplain Ulang:
                                        </p>
                                        {r.complaints?.map((c) => (
                                            <p key={c.id}>
                                                • {c.reason} (
                                                {formatDate(c.created_at)})
                                            </p>
                                        ))}
                                    </div>
                                )}

                                {can_complain &&
                                    r.status === 'selesai' &&
                                    openComplaintId === r.id && (
                                        <ComplaintForm
                                            reportId={r.id}
                                            items={r.items}
                                        />
                                    )}

                                {/* Progress & Status Timeline */}
                                {(r.progress?.length > 0 ||
                                    r.status_histories?.length > 0) && (
                                    <details className="border-base-300 rounded-lg border p-3 text-xs">
                                        <summary className="cursor-pointer font-medium">
                                            Riwayat progres & status (
                                            {r.progress.length +
                                                r.status_histories.length}
                                            )
                                        </summary>
                                        <div className="mt-2.5 space-y-2">
                                            {r.progress.map((prog) => (
                                                <div
                                                    key={prog.id}
                                                    className="border-base-300 border-l-2 pl-2.5"
                                                >
                                                    <p className="font-medium">
                                                        {formatDate(
                                                            prog.work_date,
                                                        )}{' '}
                                                        ·{' '}
                                                        {prog.user?.nama ??
                                                            'Teknisi'}
                                                        {prog.is_blocked
                                                            ? ' [Terhambat]'
                                                            : ''}
                                                    </p>
                                                    <p className="text-muted">
                                                        {prog.description}
                                                    </p>
                                                </div>
                                            ))}
                                            {r.status_histories.map((h) => (
                                                <div
                                                    key={h.id}
                                                    className="border-base-300 border-l-2 pl-2.5"
                                                >
                                                    <p className="font-medium">
                                                        {formatDate(
                                                            h.created_at,
                                                        )}{' '}
                                                        ·{' '}
                                                        {h.actor?.nama ??
                                                            'Sistem'}{' '}
                                                        → {h.to_status}
                                                    </p>
                                                    {h.description && (
                                                        <p className="text-muted">
                                                            {h.description}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                )}
                            </Card>
                        );
                    })
                )}
            </section>

            {/* Server Pagination */}
            {(reports?.last_page ?? 1) > 1 && (
                <div className="flex justify-center">
                    <div className="join">
                        {reports.links.map((link, idx) => (
                            <button
                                key={idx}
                                type="button"
                                disabled={!link.url}
                                onClick={() =>
                                    link.url &&
                                    router.visit(link.url, {
                                        preserveScroll: true,
                                    })
                                }
                                className={`join-item btn btn-sm ${
                                    link.active ? 'btn-active btn-primary' : ''
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={Boolean(confirmTarget)}
                title="Konfirmasi Kejadian Sama"
                message={`Konfirmasikan bahwa Anda juga mengalami kerusakan yang dilaporkan pada tiket ${confirmTarget?.nomor_tiket ?? ''}?`}
                confirmLabel="Ya, Konfirmasi"
                onConfirm={handleConfirmIncident}
                onClose={() => setConfirmTarget(null)}
            />
        </div>
    );
}
