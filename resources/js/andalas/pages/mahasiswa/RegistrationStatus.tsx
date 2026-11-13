import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Download,
    FileCheck2,
    FileText,
    Home,
    Lock,
    Send,
    ShieldCheck,
    Upload,
    Wallet,
} from 'lucide-react';
import * as workflow from '@/actions/App/Http/Controllers/ResidenceWorkflowController';
import {
    Badge,
    Button,
    Card,
    EmptyState,
    Modal,
    PageHeader,
    StatusBadge,
} from '@/andalas/components/ui';
import { formatDate, formatRupiah } from '@/andalas/lib/format';

type TemplateItem = {
    id: string;
    category: string;
    kind: string;
    original_name: string;
    updated_at?: string;
};

type DocumentItem = {
    id: string;
    kind: string;
    version: number;
    status: string;
    notes?: string | null;
    created_at?: string;
    reviewer?: { id: string; nama: string } | null;
};

type DecisionScheduleTerm = {
    jatuh_tempo: string;
    jumlah: number | string;
};

type DecisionItem = {
    id: string;
    kind: string;
    status: string;
    reason?: string | null;
    decided_at?: string | null;
    terms?: {
        initial_amount?: number | string;
        notes?: string;
        agreement_kind?: string;
        requires_configuration?: boolean;
        schedule?: DecisionScheduleTerm[];
        amendment_id?: string;
    } | null;
};

type AmendmentItem = {
    id: string;
    kind: string;
    reason: string;
    created_at?: string;
};

type RoomSummary = {
    id: string;
    nomor_kamar: string;
    lantai?: {
        nama_lantai?: string;
        gedung?: { nama_gedung?: string; kode_gedung?: string } | null;
    } | null;
} | null;

type TagihanSummary = {
    id: string;
    nomor: string;
    total: number | string;
    total_dibayar: number | string;
    status: string;
    jatuh_tempo?: string | null;
} | null;

type Registration = {
    id: string;
    status: string;
    stay_kind?: string;
    workflow_version: number;
    allocation_status?: string;
    rate_unit?: string;
    billing_basis?: string;
    funding?: string;
    sponsor_name?: string | null;
    is_kipk?: boolean;
    ready_at?: string | null;
    checked_in_at?: string | null;
    completed_at?: string | null;
    keys_returned_at?: string | null;
    can_submit?: boolean;
    blockers: string[];
    submitted_at?: string | null;
    periode?: { nama_periode?: string } | null;
    reserved_room?: RoomSummary;
    reservedRoom?: RoomSummary;
    placement?: { kamar?: RoomSummary } | null;
    student_profile?: {
        angkatan?: number | string | null;
        user?: { nama?: string; nim_nip?: string } | null;
    } | null;
    studentProfile?: {
        angkatan?: number | string | null;
        user?: { nama?: string; nim_nip?: string } | null;
    } | null;
    policy?: {
        category: string;
        version?: number;
        settings?: {
            documents?: string[];
            monthly_allowed?: boolean;
        };
    } | null;
    documents: DocumentItem[];
    decisions: DecisionItem[];
    amendments?: AmendmentItem[];
    tagihan?: TagihanSummary;
    room_contract?: { id: string; status?: string } | null;
    roomContract?: { id: string; status?: string } | null;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type Props = {
    registrations: {
        data: Registration[];
        last_page: number;
        links: PaginationLink[];
    };
    templates?: TemplateItem[];
    detailMode?: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
    local_non_kipk: 'Mahasiswa Lokal Non-KIP-K',
    local_kipk: 'Mahasiswa Lokal KIP-K',
    international: 'Mahasiswa Internasional',
    postgraduate: 'Pascasarjana (S2/S3)',
    summer_course: 'Summer Course',
    non_student: 'Tamu / Umum',
};

const DOCUMENT_LABELS: Record<string, string> = {
    perjanjian: 'Surat Perjanjian Penghuni Asrama',
    surat_perjanjian: 'Surat Perjanjian Penghuni Asrama',
    tata_tertib: 'Surat Pernyataan Tata Tertib',
    surat_pernyataan: 'Surat Pernyataan Penghuni',
    ktm: 'Kartu Tanda Mahasiswa (KTM)',
    identitas: 'Identitas Resmi (KTP / Paspor)',
    kipk: 'Surat Keterangan / Kartu KIP-K',
    sk_kipk: 'Surat Keputusan Penerima KIP-K',
    loa: 'Letter of Acceptance (LoA)',
    paspor: 'Halaman Identitas Paspor',
    visa: 'Dokumen Visa / Izin Tinggal',
    rekomendasi: 'Surat Rekomendasi / Pengantar',
};

const DECISION_LABELS: Record<string, string> = {
    full: 'Bayar Penuh Sesuai Tagihan',
    installment: 'Pengajuan Cicilan',
    defer: 'Pengajuan Penundaan Pembayaran',
    monthly: 'Skema Pembayaran Bulanan',
    transfer_permission: 'Izin Tinggal Berbasis Bukti Transfer',
};

function friendlyDocumentLabel(kind: string): string {
    if (kind.startsWith('pembiayaan_')) {
        return 'Surat Perjanjian Pembiayaan Disetujui';
    }
    return (
        DOCUMENT_LABELS[kind] ??
        kind
            .replace(/[_-]+/g, ' ')
            .replace(/\b\w/g, (letter) => letter.toUpperCase())
    );
}

function documentBadgeColor(
    status: string,
): 'green' | 'yellow' | 'red' | 'gray' | 'blue' {
    if (status === 'valid') {
        return 'green';
    }
    if (status === 'uploaded') {
        return 'yellow';
    }
    if (status === 'revision') {
        return 'red';
    }
    return 'gray';
}

function documentStatusText(status: string): string {
    if (status === 'valid') {
        return 'Valid & Disetujui';
    }
    if (status === 'uploaded') {
        return 'Menunggu Pemeriksaan Petugas';
    }
    if (status === 'revision') {
        return 'Perlu Revisi Ulang';
    }
    return 'Belum Diunggah';
}

function buildStepState(r: Registration) {
    const isRejected = r.status === 'rejected';
    const hasRoom = Boolean(
        r.reserved_room || r.reservedRoom || r.placement?.kamar,
    );
    const requiredDocs = r.policy?.settings?.documents ?? ['perjanjian'];
    const latestDocs = new Map<string, DocumentItem>();
    for (const d of r.documents ?? []) {
        const prev = latestDocs.get(d.kind);
        if (!prev || d.version > prev.version) {
            latestDocs.set(d.kind, d);
        }
    }
    const allDocsUploaded = requiredDocs.every((k) => {
        const doc = latestDocs.get(k);
        return doc && doc.status !== 'revision';
    });
    const hasDecisionOrExempt =
        (r.is_kipk && r.policy?.category === 'local_kipk') ||
        (r.decisions ?? []).some(
            (d) => d.status === 'pending' || d.status === 'approved',
        );
    const docsAndFinancingDone = allDocsUploaded && hasDecisionOrExempt;
    const isCheckedIn = Boolean(r.completed_at || r.checked_in_at);
    const isReady = Boolean(r.ready_at) || r.blockers.length === 0;

    return [
        {
            number: 1,
            title: 'Pengajuan & Kamar',
            description: hasRoom
                ? 'Pendaftaran & alokasi kamar tercatat'
                : 'Menunggu alokasi kamar',
            done: !isRejected && hasRoom,
            active: !isRejected && !hasRoom,
        },
        {
            number: 2,
            title: 'Berkas & Pembiayaan',
            description: docsAndFinancingDone
                ? 'Dokumen & skema tersimpan'
                : 'Lengkapi berkas & skema',
            done: !isRejected && docsAndFinancingDone,
            active: !isRejected && hasRoom && !docsAndFinancingDone,
        },
        {
            number: 3,
            title: 'Verifikasi & Tagihan',
            description: isReady
                ? 'Seluruh syarat administrasi valid'
                : `${r.blockers.length} syarat masih menunggu`,
            done: !isRejected && (isReady || isCheckedIn),
            active:
                !isRejected &&
                docsAndFinancingDone &&
                !isReady &&
                !isCheckedIn,
        },
        {
            number: 4,
            title: r.keys_returned_at ? 'Selesai / Checkout' : 'Check-in & Aktif',
            description: r.keys_returned_at
                ? 'Kunci telah dikembalikan'
                : isCheckedIn
                  ? 'Sudah check-in & menghuni aktif'
                  : isReady
                    ? 'Datang ke pengelola untuk ambil kunci'
                    : 'Menunggu langkah sebelumnya',
            done: !isRejected && isCheckedIn,
            active: !isRejected && isReady && !isCheckedIn,
        },
    ];
}

function heroBanner(r: Registration) {
    if (r.status === 'rejected') {
        return {
            tone: 'border-error/40 bg-error/10 text-error-content',
            badge: <Badge color="red">Pendaftaran Ditolak</Badge>,
            title: 'Pendaftaran Anda tidak dapat dilanjutkan',
            subtitle:
                'Silakan hubungi pengelola asrama atau ajukan pendaftaran ulang pada periode yang masih dibuka.',
        };
    }
    if (r.keys_returned_at) {
        return {
            tone: 'border-base-300 bg-base-200/70',
            badge: <Badge color="gray">Hunian Selesai</Badge>,
            title: 'Masa hunian & pengembalian kunci telah tercatat selesai',
            subtitle: `Kunci kamar dikembalikan pada ${formatDate(r.keys_returned_at)}. Arsip dokumen pendaftaran tetap tersimpan untuk Anda.`,
        };
    }
    if (r.completed_at) {
        return {
            tone: 'border-success/40 bg-success/10',
            badge: <Badge color="green">Penghuni Aktif</Badge>,
            title: 'Selamat! Anda telah terdaftar resmi & check-in asrama',
            subtitle: `Check-in dan serah kunci telah dikonfirmasi pada ${formatDate(r.checked_in_at ?? r.completed_at)}.`,
        };
    }
    if (r.ready_at || r.blockers.length === 0) {
        return {
            tone: 'border-success/50 bg-success/10',
            badge: <Badge color="green">Siap Check-in & Ambil Kunci</Badge>,
            title: 'Seluruh syarat administrasi Anda sudah lengkap dan valid!',
            subtitle:
                'Datang ke pengelola gedung dengan membawa kartu identitas & berkas asli untuk verifikasi fisik serta serah terima kunci kamar.',
        };
    }
    return {
        tone: 'border-primary/30 bg-primary/5',
        badge: <Badge color="blue">Terdaftar · Dalam Proses Administrasi</Badge>,
        title: 'Pendaftaran asrama Anda sudah tercatat di sistem',
        subtitle:
            'Selesaikan seluruh butir pada daftar perhatian di bawah agar akun Anda siap untuk proses check-in.',
    };
}

function StudentRegistrationCard({
    registration: r,
    templates,
}: {
    registration: Registration;
    templates: TemplateItem[];
}) {
    const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>(
        {},
    );
    const [decisionKind, setDecisionKind] = useState<string>('full');
    const [decisionReason, setDecisionReason] = useState<string>('');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const category = r.policy?.category ?? 'local_non_kipk';
    const room =
        r.placement?.kamar ?? r.reserved_room ?? r.reservedRoom ?? null;
    const roomBuilding = room?.lantai?.gedung?.nama_gedung;
    const periodName = r.periode?.nama_periode;
    const profile = r.student_profile ?? r.studentProfile;

    const latestByKind = new Map<string, DocumentItem>();
    for (const d of r.documents ?? []) {
        const existing = latestByKind.get(d.kind);
        if (!existing || d.version > existing.version) {
            latestByKind.set(d.kind, d);
        }
    }

    const approvedDecisionKinds = (r.decisions ?? [])
        .filter(
            (d) =>
                d.status === 'approved' &&
                !d.terms?.requires_configuration &&
                d.terms?.agreement_kind,
        )
        .map((d) => String(d.terms?.agreement_kind));

    const requiredKinds = Array.from(
        new Set([
            ...(r.policy?.settings?.documents ?? ['perjanjian']),
            ...approvedDecisionKinds,
        ]),
    );

    const isEditableReg =
        Boolean(r.can_submit) &&
        !r.keys_returned_at &&
        r.status !== 'rejected';

    const editableKinds = requiredKinds.filter((kind) => {
        if (!isEditableReg) {
            return false;
        }
        if (r.completed_at && !kind.startsWith('pembiayaan_')) {
            return false;
        }
        const doc = latestByKind.get(kind);
        return !doc || doc.status === 'revision';
    });

    const savedDecisions = (r.decisions ?? []).filter(
        (d) => d.status === 'pending' || d.status === 'approved',
    );
    const rejectedDecisions = (r.decisions ?? []).filter(
        (d) => d.status === 'rejected',
    );
    const isKipkExempt = Boolean(r.is_kipk && category === 'local_kipk');
    const canChooseFinancing =
        isEditableReg &&
        !r.completed_at &&
        Boolean(r.tagihan) &&
        savedDecisions.length === 0 &&
        !isKipkExempt;

    const totalTagihan = Number(r.tagihan?.total ?? 0);
    const totalDibayar = Number(r.tagihan?.total_dibayar ?? 0);
    const remaining = Math.max(0, totalTagihan - totalDibayar);
    const hasPaymentBlocker = r.blockers.some((b) =>
        /pembayaran|pembiayaan/i.test(b),
    );

    const hasMonthlyOption =
        r.rate_unit === 'month' && Boolean(r.policy?.settings?.monthly_allowed);
    const hasTransferOption = r.stay_kind === 'non_student';

    const hasPendingSelection =
        Object.keys(selectedFiles).length > 0 || canChooseFinancing;

    const submitPackage = () => {
        const formData = new FormData();
        for (const [kind, file] of Object.entries(selectedFiles)) {
            formData.append(`files[${kind}]`, file);
        }
        if (canChooseFinancing && decisionKind) {
            formData.append('decision_kind', decisionKind);
            if (decisionKind !== 'full' && decisionReason.trim() !== '') {
                formData.append('decision_reason', decisionReason.trim());
            }
        }

        setSubmitting(true);
        setErrors({});
        router.post(workflow.submitPackage.url(r.id), formData, {
            forceFormData: true,
            preserveScroll: true,
            onError: (errs) => {
                setErrors(errs as Record<string, string>);
                setConfirmOpen(false);
            },
            onSuccess: () => {
                setSelectedFiles({});
                setDecisionReason('');
                setConfirmOpen(false);
            },
            onFinish: () => setSubmitting(false),
        });
    };

    const handleOpenConfirm = () => {
        if (
            Object.keys(selectedFiles).length === 0 &&
            (!canChooseFinancing || !decisionKind)
        ) {
            setErrors({
                package:
                    'Pilih minimal satu berkas atau pilihan pembiayaan terlebih dahulu.',
            });
            return;
        }
        if (
            canChooseFinancing &&
            decisionKind !== 'full' &&
            decisionReason.trim() === ''
        ) {
            setErrors({
                decision_reason:
                    'Alasan permohonan wajib diisi untuk skema selain bayar penuh.',
            });
            return;
        }
        setErrors({});
        setConfirmOpen(true);
    };

    const banner = heroBanner(r);
    const steps = buildStepState(r);

    return (
        <Card className="space-y-6 p-5 md:p-6">
            {/* Prominent Status Banner */}
            <div className={`rounded-xl border p-4 md:p-5 ${banner.tone}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            {banner.badge}
                            <Badge color="gray">
                                {CATEGORY_LABELS[category] ?? category}
                            </Badge>
                            {periodName && (
                                <Badge color="gray">Periode {periodName}</Badge>
                            )}
                            <StatusBadge status={r.status} />
                        </div>
                        <h2 className="text-base-content text-lg font-semibold">
                            {banner.title}
                        </h2>
                        <p className="text-muted text-sm">{banner.subtitle}</p>
                    </div>
                    <div className="bg-base-100/90 border-base-300 shrink-0 rounded-lg border px-3.5 py-2.5 text-sm">
                        <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
                            <Home className="size-3.5" aria-hidden="true" />
                            Kamar Ditempatkan
                        </div>
                        <div className="text-base-content mt-0.5 font-semibold">
                            {room
                                ? `${roomBuilding ?? 'Asrama'} · Kamar ${room.nomor_kamar}`
                                : 'Menunggu alokasi kamar'}
                        </div>
                        {profile?.user?.nim_nip && (
                            <div className="text-muted text-identifier mt-0.5 text-xs">
                                {profile.user.nama} · {profile.user.nim_nip}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 4-Step Visual Stepper */}
            <div
                aria-label="Tahapan pendaftaran"
                className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
            >
                {steps.map((step) => (
                    <div
                        key={step.number}
                        className={`flex items-start gap-2.5 rounded-lg border p-3 ${
                            step.done
                                ? 'border-success/40 bg-success/10'
                                : step.active
                                  ? 'border-primary/40 bg-primary/5'
                                  : 'border-base-300 bg-base-200/40'
                        }`}
                    >
                        <div className="mt-0.5 shrink-0">
                            {step.done ? (
                                <CheckCircle2
                                    className="text-success size-5"
                                    aria-hidden="true"
                                />
                            ) : step.active ? (
                                <Clock
                                    className="text-primary size-5"
                                    aria-hidden="true"
                                />
                            ) : (
                                <span className="border-base-content/30 text-muted flex size-5 items-center justify-center rounded-full border text-xs font-semibold">
                                    {step.number}
                                </span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-base-content text-xs font-semibold">
                                {step.number}. {step.title}
                            </p>
                            <p className="text-muted mt-0.5 text-xs">
                                {step.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Actionable Blockers Box */}
            {!r.completed_at && r.blockers.length > 0 && (
                <div className="border-warning/40 bg-warning/10 space-y-3 rounded-xl border p-4">
                    <div className="flex items-start gap-2.5">
                        <AlertTriangle
                            className="text-warning mt-0.5 size-5 shrink-0"
                            aria-hidden="true"
                        />
                        <div className="flex-1 space-y-2">
                            <p className="text-base-content text-sm font-semibold">
                                Syarat yang perlu diselesaikan sebelum check-in:
                            </p>
                            <ul className="text-base-content/90 list-inside list-disc space-y-1 text-sm">
                                {r.blockers.map((blocker, idx) => (
                                    <li key={idx}>{blocker}</li>
                                ))}
                            </ul>
                            <div className="flex flex-wrap gap-2 pt-1">
                                {hasPaymentBlocker && r.tagihan && remaining > 0 && (
                                    <Link
                                        href="/mahasiswa/tagihan"
                                        className="btn btn-sm btn-warning"
                                    >
                                        <Wallet
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        Lihat & Bayar Tagihan
                                    </Link>
                                )}
                                {editableKinds.length > 0 && (
                                    <a
                                        href={`#berkas-${r.id}`}
                                        className="btn btn-sm btn-outline"
                                    >
                                        <Upload
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        Unggah Berkas Sekarang
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Grid: Documents & Financing */}
            <div className="grid gap-5 lg:grid-cols-2">
                {/* Section A: Berkas Pendaftaran */}
                <div
                    id={`berkas-${r.id}`}
                    className="border-base-300 bg-base-100 space-y-4 rounded-xl border p-4 md:p-5"
                >
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <FileText
                                className="text-primary size-5"
                                aria-hidden="true"
                            />
                            <h3 className="text-base font-semibold">
                                Berkas Pendaftaran
                            </h3>
                        </div>
                        <Badge
                            color={editableKinds.length === 0 ? 'green' : 'yellow'}
                        >
                            {editableKinds.length === 0
                                ? 'Semua Berkas Terunggah'
                                : `${editableKinds.length} Berkas Perlu Diunggah`}
                        </Badge>
                    </div>

                    <div className="space-y-3">
                        {requiredKinds.map((kind) => {
                            const doc = latestByKind.get(kind);
                            const template = templates.find(
                                (t) =>
                                    t.category === category && t.kind === kind,
                            );
                            const needsUpload = editableKinds.includes(kind);

                            return (
                                <div
                                    key={kind}
                                    className="border-base-300 bg-base-200/30 space-y-2.5 rounded-lg border p-3.5"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="text-base-content text-sm font-semibold">
                                                {friendlyDocumentLabel(kind)}
                                            </p>
                                            {doc && (
                                                <p className="text-muted text-xs">
                                                    Versi {doc.version}
                                                    {doc.reviewer?.nama
                                                        ? ` · Diperiksa oleh ${doc.reviewer.nama}`
                                                        : ''}
                                                </p>
                                            )}
                                        </div>
                                        <Badge
                                            color={documentBadgeColor(
                                                doc?.status ?? 'missing',
                                            )}
                                        >
                                            {documentStatusText(
                                                doc?.status ?? 'missing',
                                            )}
                                        </Badge>
                                    </div>

                                    {doc?.status === 'revision' && doc.notes && (
                                        <div className="border-error/40 bg-error/10 text-error-content rounded-md border px-3 py-2 text-xs">
                                            <strong>Catatan revisi:</strong>{' '}
                                            {doc.notes}
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-2">
                                        {template && (
                                            <a
                                                href={workflow.downloadTemplate.url(
                                                    [category, kind],
                                                )}
                                                className="btn btn-xs btn-outline gap-1.5"
                                            >
                                                <Download
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                Unduh Template (
                                                {template.original_name})
                                            </a>
                                        )}
                                        {doc && (
                                            <a
                                                href={workflow.document.url(
                                                    doc.id,
                                                )}
                                                className="btn btn-xs btn-ghost border-base-300 gap-1.5 border"
                                            >
                                                <FileCheck2
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                Unduh Berkas v{doc.version}
                                            </a>
                                        )}
                                    </div>

                                    {/* Upload input ONLY rendered when missing or revision required */}
                                    {needsUpload ? (
                                        <div className="space-y-1 pt-1">
                                            <label className="block">
                                                <span className="text-muted mb-1 block text-xs">
                                                    Unggah PDF atau gambar
                                                    (maks. 5 MB)
                                                </span>
                                                <input
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    className="file-input file-input-bordered file-input-sm w-full"
                                                    onChange={(e) => {
                                                        const file =
                                                            e.target.files?.[0];
                                                        setSelectedFiles(
                                                            (prev) => {
                                                                const next = {
                                                                    ...prev,
                                                                };
                                                                if (file) {
                                                                    next[kind] =
                                                                        file;
                                                                } else {
                                                                    delete next[
                                                                        kind
                                                                    ];
                                                                }
                                                                return next;
                                                            },
                                                        );
                                                    }}
                                                />
                                            </label>
                                            {selectedFiles[kind] && (
                                                <p className="text-primary text-xs font-medium">
                                                    Siap disimpan:{' '}
                                                    {selectedFiles[kind].name}
                                                </p>
                                            )}
                                            {errors[`files.${kind}`] && (
                                                <p className="text-error text-xs">
                                                    {errors[`files.${kind}`]}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        doc && (
                                            <p className="text-muted flex items-center gap-1.5 text-xs">
                                                <Lock
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                                Berkas sudah tersimpan
                                                permanen. Pengunggahan ulang
                                                hanya dibuka bila petugas
                                                meminta revisi.
                                            </p>
                                        )
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {(r.documents?.length ?? 0) > 1 && (
                        <details className="border-base-300 rounded-lg border p-3 text-xs">
                            <summary className="cursor-pointer font-medium">
                                Riwayat versi dokumen ({r.documents.length})
                            </summary>
                            <div className="mt-2 space-y-1">
                                {r.documents.map((d) => (
                                    <div
                                        key={d.id}
                                        className="flex flex-wrap items-center justify-between gap-2"
                                    >
                                        <a
                                            href={workflow.document.url(d.id)}
                                            className="link link-primary"
                                        >
                                            {friendlyDocumentLabel(d.kind)} v
                                            {d.version}
                                        </a>
                                        <span className="text-muted">
                                            {documentStatusText(d.status)}
                                            {d.notes ? ` — ${d.notes}` : ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </details>
                    )}
                </div>

                {/* Section B: Pembiayaan & Tagihan */}
                <div className="border-base-300 bg-base-100 space-y-4 rounded-xl border p-4 md:p-5">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Wallet
                                className="text-primary size-5"
                                aria-hidden="true"
                            />
                            <h3 className="text-base font-semibold">
                                Pembiayaan & Tagihan
                            </h3>
                        </div>
                        {r.tagihan && <StatusBadge status={r.tagihan.status} />}
                    </div>

                    {r.tagihan ? (
                        <div className="border-base-300 bg-base-200/40 grid grid-cols-3 gap-2 rounded-lg border p-3 text-sm">
                            <div>
                                <p className="text-muted text-xs">Total</p>
                                <p className="font-semibold">
                                    {formatRupiah(totalTagihan)}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted text-xs">Dibayar</p>
                                <p className="text-success font-semibold">
                                    {formatRupiah(totalDibayar)}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted text-xs">Sisa</p>
                                <p className="text-warning font-semibold">
                                    {formatRupiah(remaining)}
                                </p>
                            </div>
                            <div className="col-span-3 flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs">
                                <span className="text-muted text-identifier">
                                    Tagihan: {r.tagihan.nomor}
                                </span>
                                <Link
                                    href="/mahasiswa/tagihan"
                                    className="link link-primary font-medium"
                                >
                                    Buka Halaman Tagihan →
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-base-200/50 text-muted rounded-lg p-3 text-sm">
                            Tagihan belum diterbitkan. Menunggu alokasi atau
                            verifikasi pendaftaran.
                        </div>
                    )}

                    {isKipkExempt && (
                        <div className="border-success/40 bg-success/10 rounded-lg border p-3.5 text-sm">
                            <p className="font-semibold">
                                Skema KIP-K Aktif
                            </p>
                            <p className="text-muted mt-0.5 text-xs">
                                Biaya hunian ditanggung melalui skema KIP-K
                                sesuai ketentuan asrama. Tidak perlu memilih
                                cicilan atau penundaan pembayaran pribadi.
                            </p>
                        </div>
                    )}

                    {/* Saved Decision Read-Only Card (inputs hidden once saved) */}
                    {savedDecisions.map((d) => (
                        <div
                            key={d.id}
                            className="border-base-300 bg-base-200/30 space-y-2 rounded-lg border p-3.5"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold">
                                    {DECISION_LABELS[d.kind] ?? d.kind}
                                </p>
                                <StatusBadge status={d.status} />
                            </div>
                            <p className="text-muted flex items-center gap-1.5 text-xs">
                                <ShieldCheck
                                    className="size-3.5 shrink-0"
                                    aria-hidden="true"
                                />
                                Pilihan pembiayaan telah tersimpan permanen.
                            </p>
                            {d.reason && (
                                <p className="text-xs">
                                    <strong>Alasan:</strong> {d.reason}
                                </p>
                            )}
                            {d.terms?.notes && (
                                <p className="text-xs">
                                    <strong>Catatan pengelola:</strong>{' '}
                                    {d.terms.notes}
                                </p>
                            )}
                            {d.terms?.initial_amount !== undefined && (
                                <p className="text-xs">
                                    <strong>Pembayaran awal wajib:</strong>{' '}
                                    {formatRupiah(
                                        Number(d.terms.initial_amount),
                                    )}
                                </p>
                            )}
                            {(d.terms?.schedule?.length ?? 0) > 0 && (
                                <div className="border-base-300 mt-1 space-y-1 border-t pt-2 text-xs">
                                    <p className="font-medium">
                                        Jadwal Termin Disetujui:
                                    </p>
                                    {d.terms?.schedule?.map((term, idx) => (
                                        <div
                                            key={idx}
                                            className="flex justify-between"
                                        >
                                            <span>
                                                Termin {idx + 1} (
                                                {formatDate(term.jatuh_tempo)})
                                            </span>
                                            <span className="font-medium">
                                                {formatRupiah(
                                                    Number(term.jumlah),
                                                )}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {rejectedDecisions.map((d) => (
                        <div
                            key={d.id}
                            className="border-error/40 bg-error/10 space-y-1 rounded-lg border p-3 text-xs"
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-semibold">
                                    {DECISION_LABELS[d.kind] ?? d.kind}
                                </span>
                                <StatusBadge status={d.status} />
                            </div>
                            {d.terms?.notes && <p>Catatan: {d.terms.notes}</p>}
                        </div>
                    ))}

                    {/* Decision selector ONLY when not yet chosen */}
                    {canChooseFinancing && (
                        <div className="border-base-300 bg-base-200/30 space-y-3 rounded-lg border p-3.5">
                            <p className="text-sm font-semibold">
                                Pilih Skema Pembiayaan
                            </p>
                            <p className="text-muted text-xs">
                                Pilihan ini akan dikunci permanen setelah Anda
                                menekan tombol simpan di bawah.
                            </p>
                            <label className="block space-y-1">
                                <span className="text-xs font-medium">
                                    Jenis Pembiayaan
                                </span>
                                <select
                                    className="select select-bordered select-sm w-full"
                                    value={decisionKind}
                                    onChange={(e) =>
                                        setDecisionKind(e.target.value)
                                    }
                                >
                                    <option value="full">
                                        Bayar penuh sesuai tagihan
                                    </option>
                                    <option value="installment">
                                        Ajukan cicilan (persetujuan pimpinan)
                                    </option>
                                    <option value="defer">
                                        Ajukan penundaan pembayaran (persetujuan
                                        pimpinan)
                                    </option>
                                    {hasMonthlyOption && (
                                        <option value="monthly">
                                            Ajukan skema bulanan
                                        </option>
                                    )}
                                    {hasTransferOption && (
                                        <option value="transfer_permission">
                                            Izin tinggal berbasis bukti transfer
                                        </option>
                                    )}
                                </select>
                            </label>
                            {decisionKind !== 'full' && (
                                <label className="block space-y-1">
                                    <span className="text-xs font-medium">
                                        Alasan Permohonan{' '}
                                        <span className="text-error">*</span>
                                    </span>
                                    <textarea
                                        className="textarea textarea-bordered textarea-sm w-full"
                                        rows={2}
                                        value={decisionReason}
                                        onChange={(e) =>
                                            setDecisionReason(e.target.value)
                                        }
                                        placeholder="Jelaskan alasan pengajuan skema pembiayaan ini"
                                    />
                                    {errors.decision_reason && (
                                        <p className="text-error text-xs">
                                            {errors.decision_reason}
                                        </p>
                                    )}
                                </label>
                            )}
                            {errors.decision_kind && (
                                <p className="text-error text-xs">
                                    {errors.decision_kind}
                                </p>
                            )}
                        </div>
                    )}

                    {(r.amendments?.length ?? 0) > 0 && (
                        <div className="border-info/40 bg-info/10 space-y-1.5 rounded-lg border p-3 text-xs">
                            <p className="font-semibold">
                                Riwayat Koreksi Pembiayaan
                            </p>
                            {r.amendments?.map((am) => (
                                <p key={am.id}>
                                    <span className="font-medium">
                                        {am.kind}
                                    </span>{' '}
                                    — {am.reason} ({formatDate(am.created_at)})
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {errors.package && (
                <div className="alert alert-error text-sm">
                    <span>{errors.package}</span>
                </div>
            )}

            {/* Single Unified Submit Action */}
            {(editableKinds.length > 0 || canChooseFinancing) && (
                    <div className="border-base-300 bg-base-200/40 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
                        <div className="text-sm">
                            <p className="font-semibold">
                                Simpan Berkas & Pilihan Pembiayaan Sekaligus
                            </p>
                            <p className="text-muted text-xs">
                                Pastikan seluruh file dan pilihan pembiayaan
                                sudah sesuai karena data yang tersimpan tidak
                                dapat diubah kembali.
                            </p>
                        </div>
                        <Button
                            type="button"
                            onClick={handleOpenConfirm}
                            disabled={submitting}
                        >
                            <Send className="size-4" aria-hidden="true" />
                            {editableKinds.some(
                                (k) => latestByKind.get(k)?.status === 'revision',
                            )
                                ? 'Kirim Berkas Revisi'
                                : 'Simpan Permanen Berkas & Pembiayaan'}
                        </Button>
                    </div>
                )}

            <Modal
                open={confirmOpen}
                onClose={() => !submitting && setConfirmOpen(false)}
                title="Konfirmasi Penyimpanan Permanen"
            >
                <div className="space-y-4">
                    <div className="alert alert-warning text-sm">
                        <AlertTriangle
                            className="size-4 shrink-0"
                            aria-hidden="true"
                        />
                        <span>
                            Setelah disimpan, dokumen dan pilihan pembiayaan{' '}
                            <strong>tidak dapat diubah</strong> oleh Anda.
                            Pengunggah ulang hanya dibuka bila petugas meminta
                            revisi dokumen.
                        </span>
                    </div>

                    <div className="space-y-2 text-sm">
                        {Object.entries(selectedFiles).length > 0 && (
                            <div>
                                <p className="font-medium">
                                    Dokumen yang akan diunggah:
                                </p>
                                <ul className="text-muted mt-1 list-inside list-disc text-xs">
                                    {Object.entries(selectedFiles).map(
                                        ([kind, file]) => (
                                            <li key={kind}>
                                                {friendlyDocumentLabel(kind)}:{' '}
                                                {file.name}
                                            </li>
                                        ),
                                    )}
                                </ul>
                            </div>
                        )}
                        {canChooseFinancing && (
                            <div>
                                <p className="font-medium">
                                    Skema pembiayaan dipilih:
                                </p>
                                <p className="text-muted text-xs">
                                    {DECISION_LABELS[decisionKind] ??
                                        decisionKind}
                                    {decisionReason.trim()
                                        ? ` — "${decisionReason.trim()}"`
                                        : ''}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConfirmOpen(false)}
                            disabled={submitting}
                        >
                            Periksa Ulang
                        </Button>
                        <Button
                            type="button"
                            onClick={submitPackage}
                            disabled={submitting}
                        >
                            {submitting
                                ? 'Menyimpan...'
                                : 'Ya, Simpan Permanen'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </Card>
    );
}

export default function RegistrationStatus({
    registrations,
    templates = [],
    detailMode = false,
}: Props) {
    const items = registrations?.data ?? [];

    return (
        <div className="space-y-6">
            <Head title="Status Pendaftaran & Berkas Asrama" />

            <PageHeader
                title="Status Pendaftaran & Berkas Asrama"
                subtitle="Pantau tahapan pengajuan kamar, kelengkapan dokumen resmi, pilihan pembiayaan, serta jadwal check-in Anda."
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href="/mahasiswa/registration"
                            className="btn btn-outline btn-sm"
                        >
                            ← Halaman Pendaftaran
                        </Link>
                        <Link
                            href="/mahasiswa/tagihan"
                            className="btn btn-primary btn-sm"
                        >
                            Tagihan & Pembayaran
                        </Link>
                    </div>
                }
            />

            {items.length === 0 ? (
                <Card>
                    <EmptyState
                        title="Belum ada pengajuan pendaftaran aktif"
                        desc="Silakan pilih kamar dan kirimkan pengajuan pendaftaran asrama terlebih dahulu."
                        action={
                            <Link
                                href="/mahasiswa/registration"
                                className="btn btn-primary btn-sm"
                            >
                                Mulai Pendaftaran Asrama
                            </Link>
                        }
                    />
                </Card>
            ) : (
                <div className="space-y-6">
                    {items.map((reg) => (
                        <StudentRegistrationCard
                            key={reg.id}
                            registration={reg}
                            templates={templates}
                        />
                    ))}
                </div>
            )}

            {!detailMode && (registrations?.last_page ?? 1) > 1 && (
                <div className="flex justify-center">
                    <div className="join">
                        {(registrations.links ?? []).map((link, idx) => (
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
        </div>
    );
}
