import { useState } from 'react';
import {
    ComplaintForm,
    ItemCompletion,
    LogbookForm,
    MultiItemForm,
    PhotoCaptureInput,
    type DamageItem,
    type LogbookRow,
} from './RevisionPanels';
import { Link, router, useForm } from '@inertiajs/react';
import {
    Badge,
    Button,
    Card,
    ConfirmDialog,
    EmptyState,
    Modal,
    PageHeader,
    StatusBadge,
    inputClass,
} from '../../components/ui';
import { newDamageRequestKey as key } from '../../lib/damage-reports';
import { formatDate } from '../../lib/format';
import {
    Calendar,
    ChevronRight,
    ClipboardList,
    MapPin,
    MessageCircle,
    Phone,
    Sparkles,
    Wrench,
} from 'lucide-react';

type Option = { id: string; nama: string };
type Photo = { id: string; type: string };
type Progress = {
    id: string;
    description: string;
    work_date: string;
    is_blocked: boolean;
    user?: { nama: string };
    report?: { nomor_tiket: string; location_label?: string };
};
type Report = {
    id: string;
    nomor_tiket: string;
    status: string;
    deskripsi: string;
    source: string;
    location_label?: string;
    tanggal_lapor?: string;
    kamar?: {
        nomor_kamar: string;
        lantai?: { gedung?: { nama_gedung: string } };
    };
    priority: string;
    is_blocked: boolean;
    new_items_count?: number;
    catatan_penyelesaian?: string;
    cancellation_reason?: string;
    gedung?: { nama_gedung: string };
    pelapor?: { id: string; nama: string; no_hp?: string | null } | null;
    teknisi?: Option;
    photos: Photo[];
    assignments: {
        id: string;
        technician_id: string;
        role: string;
        ended_at: string | null;
        technician?: Option;
    }[];
    status_histories: {
        id: string;
        description: string;
        created_at: string;
        actor?: { nama: string } | null;
    }[];
    progress: Progress[];
    items: DamageItem[];
    complaints: {
        id: string;
        reason: string;
        rating?: number | null;
        rework_report_id?: string | null;
        status: string;
    }[];
    abilities: Record<string, boolean>;
    linkable_assets?: { id: string; nama_aset: string }[];
};
type Pagination<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
    last_page: number;
};
type Props = {
    reports: Pagination<Report>;
    daily: Pagination<Progress>;
    summary: Record<string, number>;
    blocked_count: number;
    technicians: Option[];
    buildings: { id: string; nama_gedung: string }[];
    filters: Record<string, string>;
    today: string;
    can_order: boolean;
    can_logbook: boolean;
    can_complain: boolean;
    resident_name: string;
    room?: {
        id?: string;
        nomor_kamar: string;
        lantai?: { gedung?: { nama_gedung: string } };
    } | null;
    logbooks: Pagination<LogbookRow>;
    can_report: boolean;
    assets: {
        id: string;
        nama_aset: string;
        kamar_id?: string | null;
        fasilitas_umum_id?: string | null;
    }[];
    facilities: { id: string; nama_fasilitas: string }[];
    notifications: { id: string; data: { subject: string; message: string } }[];
};

const labels: Record<string, string> = {
    menunggu_triage: 'Belum Dikerjakan',
    didisposisikan: 'Belum Dikerjakan (Disposisi)',
    sedang_dikerjakan: 'Sedang Dikerjakan',
    selesai: 'Selesai',
    dibatalkan: 'Dibatalkan',
};

function Errors({ errors }: { errors: Record<string, string | undefined> }) {
    return (
        <>
            {Object.entries(errors).map(([field, error]) =>
                error ? (
                    <p className="text-error text-sm" role="alert" key={field}>
                        {error}
                    </p>
                ) : null,
            )}
        </>
    );
}

function Pages<T>({ page, label }: { page: Pagination<T>; label: string }) {
    if (page.total === 0 || page.last_page <= 1) return null;

    return (
        <nav aria-label={label} className="flex flex-wrap gap-2">
            {page.links.map((link, i) =>
                link.url ? (
                    <Link
                        key={i}
                        href={link.url}
                        preserveScroll
                        aria-current={link.active ? 'page' : undefined}
                        className={`btn btn-sm ${link.active ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        {link.label
                            .replace(/&laquo;|&raquo;/g, '')
                            .replace('Previous', 'Sebelumnya')
                            .replace('Next', 'Selanjutnya')}
                    </Link>
                ) : null,
            )}
        </nav>
    );
}

function whatsappUrl(phone?: string | null): string | null {
    if (!phone) {
        return null;
    }
    const digits = phone.replace(/[^0-9]/g, '');
    if (!digits) {
        return null;
    }
    const normalized = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;

    return `https://wa.me/${normalized}`;
}

export function ReportDetailModal({
    report: r,
    open,
    onClose,
    today,
    canComplain,
}: {
    report: Report;
    open: boolean;
    onClose: () => void;
    today: string;
    canComplain: boolean;
}) {
    const progress = useForm({
        description: '',
        work_date: today,
        is_blocked: r.is_blocked,
        request_key: key(),
    });
    const complete = useForm<{
        _method: string;
        status: string;
        catatan_penyelesaian: string;
        bukti_penyelesaian: File[];
    }>({
        _method: 'put',
        status: 'selesai',
        catatan_penyelesaian: '',
        bukti_penyelesaian: [],
    });
    const cancel = useForm({ reason: '' });
    const asset = useForm({ aset_id: '', reason: '', item_id: '' });
    const [confirmClaim, setConfirmClaim] = useState(false);
    const [assetModalOpen, setAssetModalOpen] = useState(false);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [busyClaim, setBusyClaim] = useState(false);
    const [photoError, setPhotoError] = useState('');
    const base = `/andalas/tiket/${r.id}`;
    const locationText = [
        r.gedung?.nama_gedung ?? r.kamar?.lantai?.gedung?.nama_gedung,
        r.location_label ?? (r.kamar ? `Kamar ${r.kamar.nomor_kamar}` : null),
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Detail Perbaikan ${r.nomor_tiket}`}
            width="max-w-2xl"
        >
            <div className="space-y-4">
                <div className="border-base-300 bg-base-200/40 space-y-2 rounded-xl border p-3.5 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold">{locationText || '-'}</span>
                        <div className="flex flex-wrap gap-1.5">
                            <StatusBadge
                                status={r.status}
                                label={labels[r.status] ?? r.status}
                            />
                            {r.is_blocked && (
                                <StatusBadge
                                    status="rusak_berat"
                                    label="Terhambat"
                                />
                            )}
                        </div>
                    </div>
                    <p className="text-muted text-xs">
                        Tanggal lapor: {formatDate(r.tanggal_lapor)} ·
                        Penanggung jawab: {r.teknisi?.nama ?? 'Belum diambil'}
                    </p>
                    <p>{r.deskripsi}</p>
                    {r.pelapor && (
                        <div className="border-base-300 bg-base-100 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2.5 text-xs">
                            <div className="space-y-0.5">
                                <p className="font-semibold">
                                    Pelapor: {r.pelapor.nama}
                                </p>
                                <p className="text-muted flex items-center gap-1">
                                    <Phone
                                        className="size-3.5 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        {r.pelapor.no_hp ||
                                            'Nomor HP belum tersedia'}
                                    </span>
                                </p>
                            </div>
                            {whatsappUrl(r.pelapor.no_hp) && (
                                <a
                                    href={whatsappUrl(r.pelapor.no_hp)!}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn btn-success btn-xs gap-1.5"
                                >
                                    <MessageCircle
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    Hubungi WA
                                </a>
                            )}
                        </div>
                    )}
                </div>

                {r.abilities.claim && r.status !== 'sedang_dikerjakan' && (
                    <div>
                        <Button
                            className="w-full sm:w-auto"
                            onClick={() => setConfirmClaim(true)}
                        >
                            Ambil &amp; Kerjakan Perbaikan
                        </Button>
                        {confirmClaim && (
                            <ConfirmDialog
                                open
                                onClose={() => setConfirmClaim(false)}
                                loading={busyClaim}
                                title="Ambil Permohonan Perbaikan?"
                                message={`Ambil tanggung jawab perbaikan untuk laporan ${r.nomor_tiket}?`}
                                confirmLabel="Ya, ambil pekerjaan"
                                onConfirm={() => {
                                    setBusyClaim(true);
                                    router.post(
                                        `${base}/claim`,
                                        {},
                                        {
                                            preserveScroll: true,
                                            onSuccess: () =>
                                                setConfirmClaim(false),
                                            onFinish: () => setBusyClaim(false),
                                        },
                                    );
                                }}
                            />
                        )}
                    </div>
                )}

                {r.abilities.confirm && (
                    <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => router.post(`${base}/confirm`)}
                    >
                        Saya juga mengalami kejadian ini
                    </button>
                )}

                <section className="space-y-2" aria-label="Item kerusakan">
                    <h3 className="text-sm font-semibold">
                        Daftar Keluhan &amp; Item ({r.items.length})
                    </h3>
                    {r.items.map((item) => (
                        <ItemCompletion
                            key={item.id}
                            item={item}
                            canComplete={
                                r.abilities.complete &&
                                r.status === 'sedang_dikerjakan'
                            }
                        />
                    ))}
                </section>

                {r.photos.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {r.photos.map((p, i) => (
                            <a
                                key={p.id}
                                href={`/andalas/tiket/foto/${p.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-xs btn-outline"
                            >
                                {p.type === 'after'
                                    ? 'Bukti hasil'
                                    : 'Foto awal'}{' '}
                                {i + 1}
                            </a>
                        ))}
                    </div>
                )}

                {r.complaints.length > 0 && (
                    <div className="border-warning/40 bg-warning/10 space-y-1.5 rounded-xl border p-3 text-xs">
                        <p className="font-semibold">Riwayat Komplain:</p>
                        {r.complaints.map((c) => (
                            <p key={c.id}>
                                • {c.reason}
                                {c.rating ? ` (Rating ${c.rating}/5)` : ''}
                            </p>
                        ))}
                    </div>
                )}

                {canComplain && r.status === 'selesai' && (
                    <ComplaintForm reportId={r.id} items={r.items} />
                )}

                {r.catatan_penyelesaian && (
                    <p className="bg-success/10 border-success/30 rounded-lg border p-3 text-sm">
                        <strong>Hasil penyelesaian:</strong>{' '}
                        {r.catatan_penyelesaian}
                    </p>
                )}

                {r.cancellation_reason && (
                    <p className="bg-error/10 border-error/30 rounded-lg border p-3 text-sm">
                        <strong>Alasan pembatalan:</strong>{' '}
                        {r.cancellation_reason}
                    </p>
                )}

                {r.abilities.progress && (
                    <form
                        className="border-base-300 space-y-3 border-t pt-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            progress.post(`${base}/progress`, {
                                preserveScroll: true,
                                onSuccess: () => {
                                    progress.reset('description');
                                    progress.setData('request_key', key());
                                },
                            });
                        }}
                    >
                        <h3 className="text-sm font-semibold">
                            Catat Progres Harian
                        </h3>
                        <label className="block text-xs font-medium">
                            Tanggal
                            <input
                                aria-label="Tanggal progres"
                                type="date"
                                className={`${inputClass} mt-1`}
                                value={progress.data.work_date}
                                max={today}
                                onChange={(e) =>
                                    progress.setData(
                                        'work_date',
                                        e.target.value,
                                    )
                                }
                                required
                            />
                        </label>
                        <textarea
                            aria-label="Uraian progres"
                            className={inputClass}
                            value={progress.data.description}
                            onChange={(e) =>
                                progress.setData('description', e.target.value)
                            }
                            placeholder="Apa yang sudah dikerjakan atau kendala hari ini"
                            required
                        />
                        <label className="flex items-center gap-2 text-xs">
                            <input
                                type="checkbox"
                                className="checkbox checkbox-sm"
                                checked={progress.data.is_blocked}
                                onChange={(e) =>
                                    progress.setData(
                                        'is_blocked',
                                        e.target.checked,
                                    )
                                }
                            />
                            <span>
                                Terhambat material / akses; pekerjaan tertunda
                            </span>
                        </label>
                        <Errors errors={progress.errors} />
                        <Button
                            type="submit"
                            size="sm"
                            disabled={progress.processing}
                        >
                            Simpan Progres
                        </Button>
                    </form>
                )}

                {r.abilities.complete && r.status === 'sedang_dikerjakan' && (
                    <form
                        className="border-base-300 space-y-3 border-t pt-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (complete.data.bukti_penyelesaian.length === 0) {
                                setPhotoError(
                                    'Minimal 1 foto bukti penyelesaian wajib dilampirkan.',
                                );
                                return;
                            }
                            setPhotoError('');
                            complete.post(base, {
                                forceFormData: true,
                                preserveScroll: true,
                                onSuccess: () => {
                                    complete.reset(
                                        'catatan_penyelesaian',
                                        'bukti_penyelesaian',
                                    );
                                    onClose();
                                },
                            });
                        }}
                    >
                        <h3 className="text-sm font-semibold">
                            Selesaikan Permohonan Perbaikan
                        </h3>
                        <textarea
                            aria-label="Catatan penyelesaian"
                            className={inputClass}
                            value={complete.data.catatan_penyelesaian}
                            onChange={(e) =>
                                complete.setData(
                                    'catatan_penyelesaian',
                                    e.target.value,
                                )
                            }
                            placeholder="Ringkasan hasil perbaikan akhir"
                            required
                        />
                        <PhotoCaptureInput
                            label="Foto bukti penyelesaian akhir"
                            required
                            files={complete.data.bukti_penyelesaian}
                            onChange={(files) => {
                                setPhotoError('');
                                complete.setData('bukti_penyelesaian', files);
                            }}
                        />
                        {photoError && (
                            <p className="text-error text-sm" role="alert">
                                {photoError}
                            </p>
                        )}
                        <Errors errors={complete.errors} />
                        {r.items.some((item) => !item.completed_at) && (
                            <p className="text-warning text-xs">
                                Selesaikan seluruh item kerusakan di atas
                                terlebih dahulu sebelum menutup permohonan ini.
                            </p>
                        )}
                        <Button
                            type="submit"
                            className="w-full sm:w-auto"
                            disabled={
                                complete.processing ||
                                r.items.some((item) => !item.completed_at)
                            }
                        >
                            {complete.processing
                                ? 'Menyimpan...'
                                : 'Unggah Foto & Tandai Selesai'}
                        </Button>
                    </form>
                )}

                {(r.abilities.linkAsset ||
                    (r.abilities.cancel && r.status !== 'dibatalkan')) && (
                    <div className="border-base-300 flex flex-wrap gap-2 border-t pt-3">
                        {r.abilities.linkAsset && (
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setAssetModalOpen(true)}
                            >
                                Hubungkan inventaris
                            </Button>
                        )}
                        {r.abilities.cancel && r.status !== 'dibatalkan' && (
                            <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() => setCancelModalOpen(true)}
                            >
                                Batalkan dengan alasan
                            </Button>
                        )}
                    </div>
                )}

                <details className="border-base-300 rounded-lg border p-3 text-xs">
                    <summary className="cursor-pointer font-semibold">
                        Riwayat Progres &amp; Status (
                        {r.progress.length + r.status_histories.length})
                    </summary>
                    <div className="mt-2.5 space-y-2">
                        {r.progress.map((p) => (
                            <p key={p.id}>
                                {p.work_date.slice(0, 10)} · {p.user?.nama}:{' '}
                                {p.description}
                                {p.is_blocked ? ' [Terhambat]' : ''}
                            </p>
                        ))}
                        {r.status_histories.map((h) => (
                            <p key={h.id}>
                                {h.created_at.slice(0, 16).replace('T', ' ')} ·{' '}
                                {h.actor?.nama ? `${h.actor.nama}: ` : ''}
                                {h.description}
                            </p>
                        ))}
                    </div>
                </details>
            </div>

            {r.abilities.linkAsset && (
                <Modal
                    open={assetModalOpen}
                    onClose={() => {
                        if (!asset.processing) {
                            setAssetModalOpen(false);
                            asset.clearErrors();
                        }
                    }}
                    title="Hubungkan Inventaris ke Item Laporan"
                    width="max-w-lg"
                >
                    <form
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            asset.post(`${base}/asset`, {
                                preserveScroll: true,
                                onSuccess: () => {
                                    asset.reset();
                                    setAssetModalOpen(false);
                                },
                            });
                        }}
                    >
                        <div className="space-y-1">
                            <label className="text-base-content block text-xs font-medium">
                                Item laporan
                            </label>
                            <select
                                aria-label="Item yang ditautkan ke inventaris"
                                className={inputClass}
                                value={asset.data.item_id}
                                onChange={(e) =>
                                    asset.setData('item_id', e.target.value)
                                }
                                required={r.items.length > 1}
                            >
                                <option value="">Pilih item laporan</option>
                                {r.items.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.description}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-base-content block text-xs font-medium">
                                Inventaris lokasi ini{' '}
                                <span className="text-error">*</span>
                            </label>
                            <select
                                aria-label="Inventaris yang ditautkan"
                                className={inputClass}
                                value={asset.data.aset_id}
                                onChange={(e) =>
                                    asset.setData('aset_id', e.target.value)
                                }
                                required
                            >
                                <option value="">
                                    Pilih inventaris lokasi ini
                                </option>
                                {r.linkable_assets?.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.nama_aset}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-base-content block text-xs font-medium">
                                Alasan pengaitan{' '}
                                <span className="text-error">*</span>
                            </label>
                            <input
                                aria-label="Alasan pengaitan aset"
                                className={inputClass}
                                value={asset.data.reason}
                                onChange={(e) =>
                                    asset.setData('reason', e.target.value)
                                }
                                placeholder="Alasan pengaitan"
                                required
                            />
                        </div>

                        <Errors errors={asset.errors} />

                        <div className="border-base-200 flex flex-wrap items-center justify-end gap-2 border-t pt-3">
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={asset.processing}
                                onClick={() => {
                                    setAssetModalOpen(false);
                                    asset.clearErrors();
                                }}
                            >
                                Batal
                            </Button>
                            <Button type="submit" disabled={asset.processing}>
                                {asset.processing
                                    ? 'Menyimpan...'
                                    : 'Tautkan inventaris'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            {r.abilities.cancel && r.status !== 'dibatalkan' && (
                <Modal
                    open={cancelModalOpen}
                    onClose={() => {
                        if (!cancel.processing) {
                            setCancelModalOpen(false);
                            cancel.clearErrors();
                        }
                    }}
                    title={`Batalkan Permohonan ${r.nomor_tiket}`}
                    width="max-w-md"
                >
                    <form
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            setConfirmCancel(true);
                        }}
                    >
                        <div className="space-y-1">
                            <label className="text-base-content block text-xs font-medium">
                                Alasan pembatalan{' '}
                                <span className="text-error">*</span>
                            </label>
                            <input
                                aria-label="Alasan pembatalan"
                                className={inputClass}
                                value={cancel.data.reason}
                                onChange={(e) =>
                                    cancel.setData('reason', e.target.value)
                                }
                                placeholder="Alasan pembatalan"
                                required
                            />
                        </div>

                        <Errors errors={cancel.errors} />

                        <div className="border-base-200 flex flex-wrap items-center justify-end gap-2 border-t pt-3">
                            <Button
                                type="button"
                                variant="ghost"
                                disabled={cancel.processing}
                                onClick={() => {
                                    setCancelModalOpen(false);
                                    cancel.clearErrors();
                                }}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                variant="danger"
                                disabled={cancel.processing}
                            >
                                Konfirmasi pembatalan
                            </Button>
                        </div>

                        {confirmCancel && (
                            <ConfirmDialog
                                open
                                onClose={() => setConfirmCancel(false)}
                                loading={cancel.processing}
                                title="Batalkan Permohonan?"
                                message={`Batalkan permohonan perbaikan ${r.nomor_tiket} dengan alasan tersebut?`}
                                confirmLabel="Ya, batalkan"
                                onConfirm={() =>
                                    cancel.post(`${base}/cancel`, {
                                        preserveScroll: true,
                                        onSuccess: () => {
                                            setConfirmCancel(false);
                                            setCancelModalOpen(false);
                                            cancel.reset();
                                        },
                                    })
                                }
                            />
                        )}
                    </form>
                </Modal>
            )}
        </Modal>
    );
}

function ReportSummaryCard({
    report: r,
    onOpenDetail,
}: {
    report: Report;
    onOpenDetail: () => void;
}) {
    const [confirmClaim, setConfirmClaim] = useState(false);
    const [busyClaim, setBusyClaim] = useState(false);

    const newItems = r.items.filter((i) => i.is_new && !i.completed_at);
    const completedItems = r.items.filter(
        (i) => i.completed_at !== null,
    ).length;
    const location = [
        r.gedung?.nama_gedung ?? r.kamar?.lantai?.gedung?.nama_gedung,
        r.location_label ?? (r.kamar ? `Kamar ${r.kamar.nomor_kamar}` : null),
    ]
        .filter(Boolean)
        .join(' · ');

    return (
        <Card className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <h2 className="text-sm font-bold break-all">
                            {r.nomor_tiket}
                        </h2>
                        {newItems.length > 0 && (
                            <Badge color="orange">
                                BARU (+{newItems.length})
                            </Badge>
                        )}
                    </div>
                    <p className="text-muted flex items-center gap-1 text-xs">
                        <MapPin className="size-3.5 shrink-0" />
                        <span>{location || '-'}</span>
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge
                        status={r.status}
                        label={labels[r.status] ?? r.status}
                    />
                    {r.is_blocked && (
                        <StatusBadge status="rusak_berat" label="Terhambat" />
                    )}
                </div>
            </div>

            {newItems.length > 0 ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-2.5 text-xs dark:border-amber-800 dark:bg-amber-950/30">
                    <p className="flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300">
                        <Sparkles className="size-3.5 shrink-0" />
                        Keluhan baru ditambahkan di kamar ini:
                    </p>
                    <p className="mt-1 font-medium">
                        {newItems.map((i) => i.description).join(' · ')}
                    </p>
                </div>
            ) : (
                <p className="line-clamp-2 text-sm">{r.deskripsi}</p>
            )}

            <div className="text-muted flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1">
                    <Calendar className="size-3.5" aria-hidden="true" />
                    {formatDate(r.tanggal_lapor)}
                </span>
                <span>
                    {r.items.length > 0
                        ? `${completedItems}/${r.items.length} item selesai`
                        : '1 keluhan'}{' '}
                    · {r.teknisi?.nama ?? 'Belum diambil'}
                </span>
            </div>

            <div className="border-base-200 flex flex-wrap gap-2 border-t pt-3">
                {r.abilities.claim && r.status !== 'sedang_dikerjakan' && (
                    <Button
                        size="sm"
                        className="flex-1 sm:flex-none"
                        onClick={() => setConfirmClaim(true)}
                    >
                        <Wrench className="size-3.5" aria-hidden="true" />
                        Ambil &amp; Kerjakan
                    </Button>
                )}
                <Button
                    type="button"
                    size="sm"
                    variant={
                        r.abilities.claim && r.status !== 'sedang_dikerjakan'
                            ? 'secondary'
                            : 'primary'
                    }
                    className="flex-1 justify-between sm:flex-none"
                    onClick={onOpenDetail}
                >
                    <span>
                        {r.status === 'sedang_dikerjakan'
                            ? 'Buka Detail & Update'
                            : 'Buka Detail'}
                    </span>
                    <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
            </div>

            {confirmClaim && (
                <ConfirmDialog
                    open
                    onClose={() => setConfirmClaim(false)}
                    loading={busyClaim}
                    title="Ambil Permohonan Perbaikan?"
                    message={`Ambil tanggung jawab perbaikan untuk ${r.nomor_tiket}?`}
                    confirmLabel="Ya, ambil pekerjaan"
                    onConfirm={() => {
                        setBusyClaim(true);
                        router.post(
                            `/andalas/tiket/${r.id}/claim`,
                            {},
                            {
                                preserveScroll: true,
                                onSuccess: () => {
                                    setConfirmClaim(false);
                                    onOpenDetail();
                                },
                                onFinish: () => setBusyClaim(false),
                            },
                        );
                    }}
                />
            )}
        </Card>
    );
}

export default function Pelaporan(p: Props) {
    const [tab, setTab] = useState<'reports' | 'logbook'>('reports');
    const [selectedReportId, setSelectedReportId] = useState<string | null>(
        null,
    );
    const filter = useForm({
        status: p.filters.status ?? '',
        gedung_id: p.filters.gedung_id ?? '',
        technician_id: p.filters.technician_id ?? '',
        date: p.filters.date,
    });

    const selectedReport =
        p.reports.data.find((r) => r.id === selectedReportId) ?? null;

    return (
        <div className="space-y-4">
            <PageHeader
                title="Permohonan Perbaikan"
                subtitle="Daftar pekerjaan perbaikan kamar, fasilitas umum, dan logbook teknisi"
            />

            {p.notifications.map((n) => (
                <Card
                    key={n.id}
                    className="border-info/40 bg-info/10 space-y-2 p-4"
                >
                    <h2 className="text-sm font-semibold">{n.data.subject}</h2>
                    <p className="text-sm">{n.data.message}</p>
                    <button
                        type="button"
                        className="btn btn-xs btn-outline"
                        onClick={() =>
                            router.post(`/pelaporan/notifications/${n.id}/read`)
                        }
                    >
                        Tandai sudah dibaca
                    </button>
                </Card>
            ))}

            <div
                role="tablist"
                aria-label="Tampilan pelaporan"
                className="bg-base-200 grid grid-cols-2 gap-1 rounded-xl p-1"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'reports'}
                    onClick={() => setTab('reports')}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition sm:text-sm ${
                        tab === 'reports'
                            ? 'bg-base-100 text-primary shadow-xs'
                            : 'text-muted'
                    }`}
                >
                    <Wrench className="size-4" aria-hidden="true" />
                    Permohonan ({p.reports.total})
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 'logbook'}
                    onClick={() => setTab('logbook')}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition sm:text-sm ${
                        tab === 'logbook'
                            ? 'bg-base-100 text-primary shadow-xs'
                            : 'text-muted'
                    }`}
                >
                    <ClipboardList className="size-4" aria-hidden="true" />
                    Logbook Harian
                </button>
            </div>

            {tab === 'reports' ? (
                <>
                    {p.can_report && (
                        <MultiItemForm
                            name={p.resident_name}
                            room={p.room}
                            assets={p.assets}
                            facilities={p.facilities}
                        />
                    )}

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            filter.get('/pelaporan', { preserveState: true });
                        }}
                        className="grid gap-2 sm:grid-cols-2"
                    >
                        <select
                            aria-label="Filter status"
                            className={inputClass}
                            value={filter.data.status}
                            onChange={(e) =>
                                filter.setData('status', e.target.value)
                            }
                        >
                            <option value="">Semua status</option>
                            {Object.entries(labels).map(([s, l]) => (
                                <option key={s} value={s}>
                                    {l}
                                </option>
                            ))}
                        </select>
                        {p.buildings.length > 0 && (
                            <select
                                aria-label="Filter gedung"
                                className={inputClass}
                                value={filter.data.gedung_id}
                                onChange={(e) =>
                                    filter.setData('gedung_id', e.target.value)
                                }
                            >
                                <option value="">Semua gedung</option>
                                {p.buildings.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.nama_gedung}
                                    </option>
                                ))}
                            </select>
                        )}
                        {p.technicians.length > 0 && (
                            <select
                                aria-label="Filter teknisi"
                                className={inputClass}
                                value={filter.data.technician_id}
                                onChange={(e) =>
                                    filter.setData(
                                        'technician_id',
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="">Semua teknisi</option>
                                {p.technicians.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.nama}
                                    </option>
                                ))}
                            </select>
                        )}
                        <input
                            aria-label="Tanggal aktivitas"
                            className={inputClass}
                            type="date"
                            value={filter.data.date}
                            onChange={(e) =>
                                filter.setData('date', e.target.value)
                            }
                        />
                        <div className="flex flex-wrap gap-2 sm:col-span-2">
                            <Button
                                type="submit"
                                size="sm"
                                className="flex-1 sm:flex-none"
                            >
                                Terapkan Filter
                            </Button>
                            {(p.filters.status ||
                                p.filters.gedung_id ||
                                p.filters.technician_id) && (
                                <Link
                                    href="/pelaporan"
                                    className="btn btn-ghost btn-sm"
                                >
                                    Reset
                                </Link>
                            )}
                        </div>
                    </form>

                    <section
                        className="space-y-3"
                        aria-label="Daftar permohonan perbaikan"
                    >
                        {p.reports.data.map((r) => (
                            <ReportSummaryCard
                                key={r.id}
                                report={r}
                                onOpenDetail={() => setSelectedReportId(r.id)}
                            />
                        ))}
                        {!p.reports.data.length && (
                            <Card>
                                <EmptyState
                                    title="Belum ada permohonan perbaikan"
                                    desc="Permohonan perbaikan yang masuk akan muncul di daftar ini."
                                />
                            </Card>
                        )}
                        <Pages
                            page={p.reports}
                            label="Halaman laporan kerusakan"
                        />
                    </section>
                </>
            ) : (
                <div className="space-y-4">
                    {p.can_logbook && <LogbookForm today={p.today} />}

                    <section
                        className="bg-base-100 border-base-300 space-y-3 rounded-xl border p-4"
                        aria-label="Logbook harian"
                    >
                        <h2 className="text-sm font-semibold">
                            Logbook pekerjaan lain pada {p.filters.date}
                        </h2>
                        {p.logbooks.data.map((entry) => (
                            <Card className="space-y-2 p-3" key={entry.id}>
                                <strong className="text-sm">
                                    {entry.user?.nama} ·{' '}
                                    {entry.source === 'leader_instruction'
                                        ? 'Perintah pimpinan'
                                        : 'Pekerjaan lain'}
                                </strong>
                                <p className="text-sm">{entry.description}</p>
                                <div className="flex flex-wrap gap-2">
                                    {entry.photos.map((photo) => (
                                        <a
                                            className="btn btn-xs btn-outline"
                                            key={photo.id}
                                            href={`/pelaporan/logbook/foto/${photo.id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Foto dokumentasi
                                        </a>
                                    ))}
                                </div>
                            </Card>
                        ))}
                        {!p.logbooks.data.length && (
                            <p className="bg-base-200/50 text-muted rounded-lg p-4 text-sm">
                                Belum ada catatan logbook pada tanggal ini.
                            </p>
                        )}
                        <Pages page={p.logbooks} label="Halaman logbook" />
                    </section>

                    <section
                        className="bg-base-100 border-base-300 space-y-3 rounded-xl border p-4"
                        aria-label="Aktivitas harian"
                    >
                        <h2 className="text-sm font-semibold">
                            Aktivitas perbaikan pada {p.filters.date}
                        </h2>
                        {p.daily.data.map((d) => (
                            <Card className="space-y-1 p-3" key={d.id}>
                                <strong className="text-xs">
                                    {d.user?.nama} · {d.report?.nomor_tiket}
                                </strong>
                                <p className="text-sm">
                                    {d.description}
                                    {d.is_blocked ? ' [Terhambat]' : ''}
                                </p>
                            </Card>
                        ))}
                        {!p.daily.data.length && (
                            <p className="bg-base-200/50 text-muted rounded-lg p-4 text-sm">
                                Belum ada aktivitas perbaikan pada tanggal ini.
                            </p>
                        )}
                        <Pages
                            page={p.daily}
                            label="Halaman aktivitas teknisi"
                        />
                    </section>
                </div>
            )}

            {selectedReport && (
                <ReportDetailModal
                    report={selectedReport}
                    open
                    onClose={() => setSelectedReportId(null)}
                    today={p.today}
                    canComplain={p.can_complain}
                />
            )}
        </div>
    );
}
