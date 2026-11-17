import { useEffect, useRef, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Clock,
    Download,
    FileCheck2,
    FileText,
    Home,
    Lock,
    RotateCcw,
    Send,
    ShieldCheck,
    Upload,
    Wallet,
} from 'lucide-react';
import * as workflow from '@/actions/App/Http/Controllers/ResidenceWorkflowController';
import {
    PaymentAccountsBox,
    type PaymentBankAccountItem,
    type VirtualAccountItem,
} from '@/andalas/components/PaymentAccountsBox';
import { PaymentProofForm } from '@/andalas/components/PaymentProofForm';
import { ReservationCountdown } from '@/andalas/components/ReservationCountdown';
import {
    Button,
    Card,
    EmptyState,
    Modal,
    PageHeader,
} from '@/andalas/components/ui';
import { formatDate, formatDateTime, formatRupiah } from '@/andalas/lib/format';
import { bukti as pembayaranBukti } from '@/routes/andalas/pembayaran';
import { document as billingDocument } from '@/routes/andalas/tagihan';
import { detailKamar as detailKamarRoute } from '@/routes/mahasiswa';

export type TemplateItem = {
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

type TagihanPaymentSummary = {
    id: string;
    kode_transaksi: string;
    nominal: number | string;
    rekening_tujuan?: string | null;
    nama_bank?: string | null;
    nomor_rekening_pengirim?: string | null;
    atas_nama_pengirim?: string | null;
    status: string;
    catatan_verifikasi?: string | null;
    tanggal_bayar?: string | null;
    created_at?: string | null;
};

type TagihanInstallmentSummary = {
    id: string;
    termin_ke: number;
    jatuh_tempo: string;
    jumlah: number | string;
    status: string;
};

type TagihanItemSummary = {
    id: string;
    deskripsi: string;
    kuantitas: number;
    harga_satuan: number | string;
    jumlah: number | string;
};

type TagihanDocumentSummary = {
    id: string;
    jenis: string;
    nomor: string;
};

type TagihanSummary = {
    id: string;
    nomor: string;
    total: number | string;
    total_dibayar: number | string;
    sponsor_total?: number | string;
    sponsor_name?: string | null;
    status: string;
    jatuh_tempo?: string | null;
    items?: TagihanItemSummary[];
    dokumen?: TagihanDocumentSummary[];
    jadwal_cicilan?: TagihanInstallmentSummary[];
    pembayaran?: TagihanPaymentSummary[];
} | null;

export type Registration = {
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
    reservation_expires_at?: string | null;
    can_submit?: boolean;
    can_cancel?: boolean;
    payment_unlocked?: boolean;
    blockers?: string[];
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
    documents?: DocumentItem[];
    decisions?: DecisionItem[];
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
    payment_accounts?: PaymentBankAccountItem[];
    virtual_accounts?: VirtualAccountItem[];
    detailMode?: boolean;
};

export const CATEGORY_LABELS: Record<string, string> = {
    local_non_kipk: 'Mahasiswa Lokal Non-KIP-K',
    local_kipk: 'Mahasiswa Lokal KIP-K',
    international: 'Mahasiswa Internasional / S2 / S3',
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

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_UPLOAD_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png']);

function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function friendlyDocumentLabel(kind: string): string {
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

type ChipTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

const CHIP_DOT_CLASS: Record<ChipTone, string> = {
    neutral: 'bg-base-content/40',
    info: 'bg-secondary',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
};

function StatusChip({
    label,
    tone = 'neutral',
}: {
    label: string;
    tone?: ChipTone;
}) {
    return (
        <span className="border-base-300 bg-base-100 text-base-content inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">
            <span
                className={`size-1.5 shrink-0 rounded-full ${CHIP_DOT_CLASS[tone]}`}
                aria-hidden="true"
            />
            <span className="truncate">{label}</span>
        </span>
    );
}

function documentChipTone(status: string): ChipTone {
    if (status === 'valid') {
        return 'success';
    }
    if (status === 'uploaded') {
        return 'warning';
    }
    if (status === 'revision') {
        return 'error';
    }
    return 'neutral';
}

function tagihanStatusChip(status: string): { label: string; tone: ChipTone } {
    const key = status.trim().toLowerCase();
    if (key === 'lunas') {
        return { label: 'Lunas', tone: 'success' };
    }
    if (key === 'sebagian') {
        return { label: 'Dibayar sebagian', tone: 'warning' };
    }
    if (key === 'belum_lunas') {
        return { label: 'Belum lunas', tone: 'warning' };
    }
    if (key === 'batal' || key === 'dibatalkan') {
        return { label: 'Dibatalkan', tone: 'neutral' };
    }
    if (key === 'terbit') {
        return { label: 'Menunggu pembayaran', tone: 'info' };
    }
    return {
        label:
            status
                .trim()
                .replace(/[_-]+/g, ' ')
                .replace(/^./, (letter) => letter.toUpperCase()) ||
            'Belum tersedia',
        tone: 'neutral',
    };
}

function decisionStatusChip(status: string): { label: string; tone: ChipTone } {
    const key = status.trim().toLowerCase();
    if (key === 'approved' || key === 'disetujui') {
        return { label: 'Disetujui', tone: 'success' };
    }
    if (key === 'rejected' || key === 'ditolak') {
        return { label: 'Ditolak', tone: 'error' };
    }
    if (key === 'cancelled' || key === 'dibatalkan') {
        return { label: 'Dibatalkan', tone: 'neutral' };
    }
    if (key === 'pending') {
        return { label: 'Menunggu persetujuan', tone: 'warning' };
    }
    return {
        label:
            status
                .trim()
                .replace(/[_-]+/g, ' ')
                .replace(/^./, (letter) => letter.toUpperCase()) ||
            'Belum tersedia',
        tone: 'neutral',
    };
}

function documentStatusText(status: string): string {
    if (status === 'valid') {
        return 'Valid & Disetujui';
    }
    if (status === 'uploaded') {
        return 'Terunggah · Verifikasi Saat Check-in';
    }
    if (status === 'revision') {
        return 'Perlu Revisi Ulang';
    }
    return 'Belum Diunggah';
}

function isRegistrationCheckedIn(r: Registration): boolean {
    return Boolean(r.completed_at || r.checked_in_at);
}

function hasSubmittedOrSettledPayment(r: Registration): boolean {
    return (
        isRegistrationCheckedIn(r) ||
        Boolean(r.ready_at) ||
        Boolean(
            (r.tagihan?.pembayaran ?? []).some(
                (p) =>
                    p.status === 'menunggu_verifikasi' || p.status === 'lunas',
            ),
        )
    );
}

function buildStepState(r: Registration) {
    const isRejected = r.status === 'rejected' || r.status === 'cancelled';
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
    const isKipkExempt = Boolean(
        r.is_kipk && r.policy?.category === 'local_kipk',
    );
    const docsStepDone = allDocsUploaded && hasDecisionOrExempt;
    const isCheckedIn = isRegistrationCheckedIn(r);
    const hasPaymentSubmittedOrSettled = hasSubmittedOrSettledPayment(r);
    const paymentUnlocked = Boolean(r.payment_unlocked);
    const paymentDone = isKipkExempt
        ? docsStepDone
        : hasPaymentSubmittedOrSettled;

    return [
        {
            number: 1,
            title: 'Rencana hunian',
            description: hasRoom
                ? 'Rencana & data hunian tercatat'
                : 'Lengkapi rencana hunian',
            done: !isRejected && hasRoom,
            active: !isRejected && !hasRoom,
        },
        {
            number: 2,
            title: r.is_kipk ? 'Alokasi kamar' : 'Pilih kamar',
            description: hasRoom
                ? 'Kamar penempatan tercatat'
                : 'Menunggu alokasi kamar',
            done: !isRejected && hasRoom,
            active: !isRejected && !hasRoom,
        },
        {
            number: 3,
            title: 'Upload berkas',
            description: docsStepDone
                ? 'Berkas & pembiayaan terunggah'
                : 'Unggah berkas & pilih pembiayaan',
            done: !isRejected && docsStepDone,
            active: !isRejected && hasRoom && !docsStepDone,
        },
        {
            number: 4,
            title: isKipkExempt ? 'Pembiayaan KIP-K' : 'Pembayaran',
            description: paymentDone
                ? isKipkExempt
                    ? 'Skema KIP-K aktif'
                    : 'Bukti / kewajiban tercatat'
                : paymentUnlocked
                  ? 'Silakan selesaikan pembayaran'
                  : 'Terbuka setelah berkas diunggah',
            done: !isRejected && paymentDone,
            active: !isRejected && docsStepDone && !paymentDone,
        },
        {
            number: 5,
            title: r.keys_returned_at
                ? 'Selesai / Checkout'
                : 'Check-in (Verifikasi)',
            description: r.keys_returned_at
                ? 'Kunci telah dikembalikan'
                : isCheckedIn
                  ? 'Verifikasi berkas & check-in selesai'
                  : paymentDone
                    ? 'Menunggu verifikasi berkas saat check-in'
                    : 'Verifikasi berkas dilakukan saat check-in',
            done: !isRejected && isCheckedIn,
            active: !isRejected && paymentDone && !isCheckedIn,
        },
    ];
}

function heroBanner(r: Registration) {
    if (r.status === 'cancelled') {
        return {
            tone: 'border-base-300 bg-base-100',
            badge: <StatusChip label="Pendaftaran Dibatalkan" tone="neutral" />,
            title: 'Pendaftaran ini telah dibatalkan oleh Anda',
            subtitle:
                'Slot reservasi kamar dan tagihan terkait sudah dilepas. Anda dapat memilih gedung dan kamar lain melalui halaman pendaftaran.',
        };
    }
    if (r.status === 'rejected') {
        return {
            tone: 'border-base-300 border-l-4 border-l-error bg-base-100',
            badge: <StatusChip label="Pendaftaran Ditolak" tone="error" />,
            title: 'Pendaftaran Anda tidak dapat dilanjutkan',
            subtitle:
                'Silakan hubungi pengelola asrama atau ajukan pendaftaran ulang pada periode yang masih dibuka.',
        };
    }
    if (r.keys_returned_at) {
        return {
            tone: 'border-base-300 bg-base-100',
            badge: <StatusChip label="Hunian Selesai" tone="neutral" />,
            title: 'Masa hunian & pengembalian kunci telah tercatat selesai',
            subtitle: `Kunci kamar dikembalikan pada ${formatDate(r.keys_returned_at)}. Arsip dokumen pendaftaran tetap tersimpan untuk Anda.`,
        };
    }
    if (isRegistrationCheckedIn(r)) {
        return {
            tone: 'border-base-300 border-l-4 border-l-primary bg-base-100',
            badge: (
                <StatusChip
                    label="Sudah Check-in · Penghuni Aktif"
                    tone="success"
                />
            ),
            title: 'Selamat! Verifikasi berkas dan check-in Anda telah dinyatakan selesai',
            subtitle: `Diverifikasi dan dinyatakan check-in pada ${formatDate(r.completed_at ?? r.checked_in_at)}. Anda resmi menjadi penghuni aktif asrama.`,
        };
    }
    if (hasSubmittedOrSettledPayment(r) || (r.blockers ?? []).length === 0) {
        return {
            tone: 'border-base-300 border-l-4 border-l-primary bg-base-100',
            badge: <StatusChip label="Belum Check-in" tone="warning" />,
            title: 'Pembayaran tercatat — tahap selanjutnya: Check-in (Verifikasi)',
            subtitle:
                'Seluruh data dan berkas yang telah Anda unggah sudah tercatat. Bawa berkas asli ke petugas/fasilitator gedung saat kedatangan untuk verifikasi berkas dan konfirmasi check-in.',
        };
    }
    if (r.payment_unlocked) {
        return {
            tone: 'border-base-300 border-l-4 border-l-primary bg-base-100',
            badge: <StatusChip label="Siap Pembayaran" tone="info" />,
            title: 'Berkas terunggah! Silakan selesaikan pembayaran sesuai tagihan',
            subtitle:
                'Anda dapat langsung mengunggah bukti pembayaran tanpa menunggu verifikasi berkas. Verifikasi berkas akan dilakukan petugas saat check-in.',
        };
    }
    return {
        tone: 'border-base-300 bg-base-100',
        badge: (
            <StatusChip
                label="Terdaftar · Dalam Proses Administrasi"
                tone="info"
            />
        ),
        title: 'Pendaftaran asrama Anda sudah tercatat di sistem',
        subtitle:
            'Lengkapi unggahan berkas wajib pada bagian di bawah agar tahap pembayaran langsung terbuka.',
    };
}

export function StudentRegistrationCard({
    registration: r,
    templates,
    paymentAccounts = [],
    virtualAccounts = [],
    embedded = false,
    onStepPreviewChange,
}: {
    registration: Registration;
    templates: TemplateItem[];
    paymentAccounts?: PaymentBankAccountItem[];
    virtualAccounts?: VirtualAccountItem[];
    embedded?: boolean;
    onStepPreviewChange?: (step: number | null) => void;
}) {
    const [reviewingUploadStep, setReviewingUploadStep] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>(
        {},
    );
    const [decisionKind, setDecisionKind] = useState<string>('full');
    const [decisionReason, setDecisionReason] = useState<string>('');
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [slowUploadHint, setSlowUploadHint] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const cancelUploadRef = useRef<(() => void) | null>(null);
    const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (slowTimerRef.current) {
                clearTimeout(slowTimerRef.current);
            }
        };
    }, []);

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
        r.status !== 'rejected' &&
        r.status !== 'cancelled';

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
    const visibleSavedDecisions = savedDecisions.filter(
        (d) => d.kind !== 'full',
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

    const blockers = r.blockers ?? [];
    const totalTagihan = Number(r.tagihan?.total ?? 0);
    const totalDibayar = Number(r.tagihan?.total_dibayar ?? 0);
    const remaining = Math.max(0, totalTagihan - totalDibayar);
    const hasPaymentSubmittedOrSettled = hasSubmittedOrSettledPayment(r);

    const hasMonthlyOption =
        r.rate_unit === 'month' && Boolean(r.policy?.settings?.monthly_allowed);
    const hasTransferOption = r.stay_kind === 'non_student';

    const submitPackage = () => {
        if (submitting) {
            return;
        }
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

        const hasFilesToUpload = Object.keys(selectedFiles).length > 0;
        setSubmitting(true);
        setUploadProgress(hasFilesToUpload ? 0 : null);
        setSlowUploadHint(false);
        setErrors({});
        if (slowTimerRef.current) {
            clearTimeout(slowTimerRef.current);
        }
        slowTimerRef.current = setTimeout(() => {
            setSlowUploadHint(true);
        }, 15000);

        router.post(workflow.submitPackage.url(r.id), formData, {
            forceFormData: true,
            preserveScroll: true,
            onCancelToken: (token) => {
                cancelUploadRef.current = () => token.cancel();
            },
            onProgress: (progress) => {
                if (typeof progress?.percentage === 'number') {
                    setUploadProgress(progress.percentage);
                }
            },
            onError: (errs) => {
                setErrors(errs as Record<string, string>);
                setConfirmOpen(false);
            },
            onHttpException: (response) => {
                const status = response?.status;
                let message = `Terjadi kesalahan server (${status ?? 'HTTP'}) saat menyimpan berkas. Silakan coba lagi.`;
                if (status === 413) {
                    message =
                        'Ukuran total unggahan melebihi batas server. Gunakan berkas lebih kecil (maks. 5 MB per berkas) atau unggah satu per satu.';
                } else if (status === 419) {
                    message =
                        'Sesi halaman kedaluwarsa. Muat ulang halaman ini lalu coba unggah kembali.';
                } else if (status === 502 || status === 504) {
                    message =
                        'Server kehabisan waktu saat memproses unggahan. Periksa koneksi Anda atau coba unggah berkas satu per satu.';
                }
                setErrors({ package: message });
                setConfirmOpen(false);
                return false;
            },
            onNetworkError: () => {
                setErrors({
                    package:
                        'Koneksi terputus atau tidak dapat menjangkau server. Periksa jaringan Anda lalu coba lagi.',
                });
                setConfirmOpen(false);
                return false;
            },
            onCancel: () => {
                setErrors({
                    package:
                        'Pengunggahan dibatalkan. Anda dapat memeriksa ulang berkas atau mengunggah satu per satu.',
                });
                setConfirmOpen(false);
            },
            onSuccess: () => {
                setSelectedFiles({});
                setDecisionReason('');
                setConfirmOpen(false);
            },
            onFinish: () => {
                if (slowTimerRef.current) {
                    clearTimeout(slowTimerRef.current);
                    slowTimerRef.current = null;
                }
                cancelUploadRef.current = null;
                setUploadProgress(null);
                setSlowUploadHint(false);
                setSubmitting(false);
            },
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

    const submitCancel = () => {
        if (cancelling) {
            return;
        }
        setCancelling(true);
        router.post(
            workflow.cancel.url(r.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setCancelling(false);
                    setCancelModalOpen(false);
                },
            },
        );
    };

    const paymentUnlocked = Boolean(r.payment_unlocked);
    const isPaymentStage =
        !reviewingUploadStep &&
        paymentUnlocked &&
        !isKipkExempt &&
        !hasPaymentSubmittedOrSettled &&
        !r.completed_at &&
        r.status !== 'cancelled' &&
        r.status !== 'rejected';
    const displayBlockers = blockers.filter(
        (blocker) => !(paymentUnlocked && /pembayaran awal/i.test(blocker)),
    );
    const banner = heroBanner(r);
    const steps = buildStepState(r);

    return (
        <Card className="space-y-6 p-5 md:p-6">
            {/* Prominent Status Banner */}
            <div className={`rounded-xl border p-4 md:p-5 ${banner.tone}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            {banner.badge}
                            <span className="text-muted text-xs font-medium">
                                {CATEGORY_LABELS[category] ?? category}
                                {periodName ? ` · Periode ${periodName}` : ''}
                            </span>
                        </div>
                        <h2 className="text-base-content text-lg font-semibold">
                            {banner.title}
                        </h2>
                        <p className="text-muted text-sm">{banner.subtitle}</p>
                        {(r.can_cancel ||
                            isPaymentStage ||
                            (reviewingUploadStep &&
                                paymentUnlocked &&
                                !isKipkExempt &&
                                !hasPaymentSubmittedOrSettled)) && (
                            <div className="flex flex-wrap items-center gap-2 pt-2">
                                {r.can_cancel && (
                                    <button
                                        type="button"
                                        className="btn btn-outline btn-error btn-xs sm:btn-sm gap-1.5"
                                        onClick={() => setCancelModalOpen(true)}
                                    >
                                        <RotateCcw
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                        Batalkan &amp; Ganti Pilihan
                                        Kamar/Gedung
                                    </button>
                                )}
                                {isPaymentStage && (
                                    <button
                                        type="button"
                                        className="btn btn-outline btn-xs sm:btn-sm gap-1.5"
                                        onClick={() => {
                                            setReviewingUploadStep(true);
                                            onStepPreviewChange?.(2);
                                        }}
                                    >
                                        <ArrowLeft
                                            className="size-3.5"
                                            aria-hidden="true"
                                        />
                                        Kembali ke Tahap Sebelumnya
                                    </button>
                                )}
                                {reviewingUploadStep &&
                                    paymentUnlocked &&
                                    !isKipkExempt &&
                                    !hasPaymentSubmittedOrSettled && (
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-xs sm:btn-sm gap-1.5"
                                            onClick={() => {
                                                setReviewingUploadStep(false);
                                                onStepPreviewChange?.(null);
                                            }}
                                        >
                                            <span>
                                                Lanjut ke Tahap Pembayaran
                                            </span>
                                            <ArrowRight
                                                className="size-3.5"
                                                aria-hidden="true"
                                            />
                                        </button>
                                    )}
                            </div>
                        )}
                    </div>
                    <div className="bg-base-200/40 border-base-300 w-full min-w-0 rounded-lg border px-3.5 py-2.5 text-sm break-words sm:w-auto sm:max-w-xs">
                        <div className="text-muted flex items-center gap-1.5 text-xs font-medium">
                            <Home
                                className="size-3.5 shrink-0"
                                aria-hidden="true"
                            />
                            Kamar Ditempatkan
                        </div>
                        <div className="text-base-content mt-0.5 font-semibold">
                            {room
                                ? `${roomBuilding ?? 'Asrama'} · Kamar ${room.nomor_kamar}`
                                : 'Menunggu alokasi kamar'}
                        </div>
                        {profile?.user?.nim_nip && (
                            <div className="text-muted text-identifier mt-0.5 text-xs break-words">
                                {profile.user.nama} · {profile.user.nim_nip}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {!embedded && (
                /* 5-Step Visual Stepper */
                <div
                    aria-label="Tahapan pendaftaran"
                    className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
                >
                    {steps.map((step) => (
                        <div
                            key={step.number}
                            className={`flex items-start gap-2.5 rounded-lg border p-3 ${
                                step.done
                                    ? 'border-base-300 bg-base-100'
                                    : step.active
                                      ? 'border-primary/60 bg-base-100'
                                      : 'border-base-300/80 bg-base-200/40'
                            }`}
                        >
                            <div className="mt-0.5 shrink-0">
                                {step.done ? (
                                    <CheckCircle2
                                        className="text-primary size-5"
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
            )}

            {/* Actionable Blockers Box */}
            {!r.completed_at &&
                r.status !== 'cancelled' &&
                displayBlockers.length > 0 && (
                    <div className="border-base-300 border-l-warning bg-base-200/40 space-y-3 rounded-xl border border-l-4 p-4">
                        <div className="flex items-start gap-2.5">
                            <AlertTriangle
                                className="text-warning mt-0.5 size-5 shrink-0"
                                aria-hidden="true"
                            />
                            <div className="flex-1 space-y-2">
                                <p className="text-base-content text-sm font-semibold">
                                    Syarat yang perlu dilengkapi:
                                </p>
                                <ul className="text-base-content/90 list-inside list-disc space-y-1 text-sm">
                                    {displayBlockers.map((blocker, idx) => (
                                        <li key={idx}>{blocker}</li>
                                    ))}
                                </ul>
                                {editableKinds.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <a
                                            href={`#berkas-${r.id}`}
                                            className="btn btn-sm btn-primary"
                                        >
                                            <Upload
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                            Unggah Berkas Sekarang
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            {/* Main Content Grid: Documents & Financing (documents hidden during Step 4 payment) */}
            <div
                className={
                    isPaymentStage ? 'grid gap-5' : 'grid gap-5 lg:grid-cols-2'
                }
            >
                {/* Section A: Berkas Pendaftaran */}
                {!isPaymentStage && (
                    <div
                        id={`berkas-${r.id}`}
                        className="border-base-300 bg-base-100 min-w-0 space-y-4 overflow-hidden rounded-xl border p-4 md:p-5"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                                <FileText
                                    className="text-muted size-5 shrink-0"
                                    aria-hidden="true"
                                />
                                <h3 className="text-base font-semibold">
                                    Berkas Pendaftaran
                                </h3>
                            </div>
                            <StatusChip
                                label={
                                    editableKinds.length === 0
                                        ? 'Semua berkas terunggah'
                                        : `${editableKinds.length} berkas perlu diunggah`
                                }
                                tone={
                                    editableKinds.length === 0
                                        ? 'success'
                                        : 'warning'
                                }
                            />
                        </div>

                        <div className="space-y-3">
                            {requiredKinds.map((kind) => {
                                const doc = latestByKind.get(kind);
                                const template = templates.find(
                                    (t) =>
                                        t.category === category &&
                                        t.kind === kind,
                                );
                                const needsUpload =
                                    editableKinds.includes(kind);

                                return (
                                    <div
                                        key={kind}
                                        className="border-base-300 bg-base-200/30 min-w-0 space-y-2.5 overflow-hidden rounded-lg border p-3.5"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-base-content text-sm font-semibold">
                                                    {friendlyDocumentLabel(
                                                        kind,
                                                    )}
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
                                            <StatusChip
                                                label={documentStatusText(
                                                    doc?.status ?? 'missing',
                                                )}
                                                tone={documentChipTone(
                                                    doc?.status ?? 'missing',
                                                )}
                                            />
                                        </div>

                                        {doc?.status === 'revision' &&
                                            doc.notes && (
                                                <div className="border-base-300 border-l-error bg-base-100 text-base-content rounded-md border border-l-4 px-3 py-2 text-xs break-words">
                                                    <strong>
                                                        Catatan revisi:
                                                    </strong>{' '}
                                                    {doc.notes}
                                                </div>
                                            )}

                                        <div className="flex min-w-0 flex-wrap gap-2">
                                            {template && (
                                                <a
                                                    href={workflow.downloadTemplate.url(
                                                        [category, kind],
                                                    )}
                                                    title={`Unduh Template (${template.original_name})`}
                                                    className="btn btn-xs btn-outline max-w-full min-w-0 gap-1.5 overflow-hidden"
                                                >
                                                    <Download
                                                        className="size-3.5 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                    <span className="truncate">
                                                        Unduh Template (
                                                        {template.original_name}
                                                        )
                                                    </span>
                                                </a>
                                            )}
                                            {doc && (
                                                <a
                                                    href={workflow.document.url(
                                                        doc.id,
                                                    )}
                                                    className="btn btn-xs btn-ghost border-base-300 max-w-full min-w-0 gap-1.5 overflow-hidden border"
                                                >
                                                    <FileCheck2
                                                        className="size-3.5 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                    <span className="truncate">
                                                        Unduh Berkas v
                                                        {doc.version}
                                                    </span>
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
                                                        className="file-input file-input-bordered file-input-sm w-full max-w-full"
                                                        onChange={(e) => {
                                                            const file =
                                                                e.target
                                                                    .files?.[0];
                                                            const fieldKey = `files.${kind}`;
                                                            if (file) {
                                                                const ext =
                                                                    file.name
                                                                        .split(
                                                                            '.',
                                                                        )
                                                                        .pop()
                                                                        ?.toLowerCase() ??
                                                                    '';
                                                                if (
                                                                    !ALLOWED_UPLOAD_EXTENSIONS.has(
                                                                        ext,
                                                                    )
                                                                ) {
                                                                    e.target.value =
                                                                        '';
                                                                    setSelectedFiles(
                                                                        (
                                                                            prev,
                                                                        ) => {
                                                                            const next =
                                                                                {
                                                                                    ...prev,
                                                                                };
                                                                            delete next[
                                                                                kind
                                                                            ];
                                                                            return next;
                                                                        },
                                                                    );
                                                                    setErrors(
                                                                        (
                                                                            prev,
                                                                        ) => ({
                                                                            ...prev,
                                                                            [fieldKey]:
                                                                                'Format berkas harus PDF, JPG, JPEG, atau PNG.',
                                                                        }),
                                                                    );
                                                                    return;
                                                                }
                                                                if (
                                                                    file.size >
                                                                    MAX_UPLOAD_BYTES
                                                                ) {
                                                                    e.target.value =
                                                                        '';
                                                                    setSelectedFiles(
                                                                        (
                                                                            prev,
                                                                        ) => {
                                                                            const next =
                                                                                {
                                                                                    ...prev,
                                                                                };
                                                                            delete next[
                                                                                kind
                                                                            ];
                                                                            return next;
                                                                        },
                                                                    );
                                                                    setErrors(
                                                                        (
                                                                            prev,
                                                                        ) => ({
                                                                            ...prev,
                                                                            [fieldKey]: `Ukuran berkas ${formatFileSize(file.size)} melebihi batas maksimum 5 MB. Kompres berkas terlebih dahulu.`,
                                                                        }),
                                                                    );
                                                                    return;
                                                                }
                                                            }
                                                            setErrors(
                                                                (prev) => {
                                                                    if (
                                                                        !(
                                                                            fieldKey in
                                                                            prev
                                                                        )
                                                                    ) {
                                                                        return prev;
                                                                    }
                                                                    const next =
                                                                        {
                                                                            ...prev,
                                                                        };
                                                                    delete next[
                                                                        fieldKey
                                                                    ];
                                                                    return next;
                                                                },
                                                            );
                                                            setSelectedFiles(
                                                                (prev) => {
                                                                    const next =
                                                                        {
                                                                            ...prev,
                                                                        };
                                                                    if (file) {
                                                                        next[
                                                                            kind
                                                                        ] =
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
                                                    <p className="text-primary text-xs font-medium break-all">
                                                        Siap disimpan:{' '}
                                                        {
                                                            selectedFiles[kind]
                                                                .name
                                                        }{' '}
                                                        (
                                                        {formatFileSize(
                                                            selectedFiles[kind]
                                                                .size,
                                                        )}
                                                        )
                                                    </p>
                                                )}
                                                {errors[`files.${kind}`] && (
                                                    <p className="text-error text-xs">
                                                        {
                                                            errors[
                                                                `files.${kind}`
                                                            ]
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            doc && (
                                                <p className="text-muted flex items-start gap-1.5 text-xs">
                                                    <Lock
                                                        className="mt-0.5 size-3.5 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                    <span>
                                                        Berkas sudah tersimpan
                                                        permanen. Pengunggahan
                                                        ulang hanya dibuka bila
                                                        petugas meminta revisi.
                                                    </span>
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
                                    Riwayat versi dokumen (
                                    {(r.documents ?? []).length})
                                </summary>
                                <div className="mt-2 space-y-1">
                                    {(r.documents ?? []).map((d) => (
                                        <div
                                            key={d.id}
                                            className="flex flex-wrap items-center justify-between gap-2"
                                        >
                                            <a
                                                href={workflow.document.url(
                                                    d.id,
                                                )}
                                                className="link link-primary"
                                            >
                                                {friendlyDocumentLabel(d.kind)}{' '}
                                                v{d.version}
                                            </a>
                                            <span className="text-muted break-words">
                                                {documentStatusText(d.status)}
                                                {d.notes ? ` — ${d.notes}` : ''}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        )}
                    </div>
                )}

                {/* Section B: Pembiayaan & Tagihan */}
                <div className="border-base-300 bg-base-100 min-w-0 space-y-4 overflow-hidden rounded-xl border p-4 md:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                            <Wallet
                                className="text-muted size-5 shrink-0"
                                aria-hidden="true"
                            />
                            <h3 className="text-base font-semibold">
                                Pembiayaan & Tagihan
                            </h3>
                        </div>
                        {r.tagihan &&
                            (() => {
                                const chip = tagihanStatusChip(
                                    r.tagihan.status,
                                );
                                return (
                                    <StatusChip
                                        label={chip.label}
                                        tone={chip.tone}
                                    />
                                );
                            })()}
                    </div>

                    {r.tagihan ? (
                        <div className="space-y-3">
                            <div className="border-base-300 bg-base-200/40 grid grid-cols-1 gap-2 rounded-lg border p-3 text-sm sm:grid-cols-3">
                                <div className="min-w-0">
                                    <p className="text-muted text-xs">Total</p>
                                    <p className="text-base-content font-semibold break-words">
                                        {formatRupiah(totalTagihan)}
                                    </p>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-muted text-xs">
                                        Dibayar
                                    </p>
                                    <p className="text-base-content font-semibold break-words">
                                        {formatRupiah(totalDibayar)}
                                    </p>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-muted text-xs">Sisa</p>
                                    <p className="text-base-content font-semibold break-words">
                                        {formatRupiah(remaining)}
                                    </p>
                                </div>
                                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs sm:col-span-3">
                                    <span className="text-base-content text-identifier min-w-0 font-semibold break-all">
                                        ID Tagihan: {r.tagihan.nomor}
                                    </span>
                                    {(r.tagihan.dokumen?.length ?? 0) > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {r.tagihan.dokumen?.map((doc) => (
                                                <a
                                                    key={doc.id}
                                                    href={billingDocument.url({
                                                        document: doc.id,
                                                    })}
                                                    className="btn btn-ghost btn-xs gap-1"
                                                >
                                                    <Download className="size-3.5" />
                                                    Unduh {doc.jenis}
                                                </a>
                                            ))}
                                        </div>
                                    ) : !paymentUnlocked ? (
                                        <span className="text-muted shrink-0">
                                            Lengkapi berkas wajib terlebih
                                            dahulu
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            {(r.tagihan.items?.length ?? 0) > 0 && (
                                <div className="border-base-300 bg-base-100 rounded-lg border p-3 text-xs">
                                    <p className="text-base-content mb-2 font-semibold">
                                        Rincian Tagihan
                                    </p>
                                    <div className="divide-base-200 divide-y">
                                        {r.tagihan.items?.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-start justify-between gap-3 py-1.5"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-base-content font-medium">
                                                        {item.deskripsi}
                                                    </p>
                                                    <p className="text-muted">
                                                        {item.kuantitas} ×{' '}
                                                        {formatRupiah(
                                                            Number(
                                                                item.harga_satuan,
                                                            ),
                                                        )}
                                                    </p>
                                                </div>
                                                <span className="text-base-content shrink-0 font-semibold">
                                                    {formatRupiah(
                                                        Number(item.jumlah),
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    {Number(r.tagihan.sponsor_total ?? 0) >
                                        0 && (
                                        <div className="border-base-200 mt-1.5 flex justify-between border-t pt-1.5">
                                            <span className="text-muted">
                                                Tanggungan Institusi / Sponsor
                                                {r.tagihan.sponsor_name
                                                    ? ` (${r.tagihan.sponsor_name})`
                                                    : ''}
                                            </span>
                                            <span className="font-medium">
                                                {formatRupiah(
                                                    Number(
                                                        r.tagihan.sponsor_total,
                                                    ),
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {(paymentUnlocked ||
                                hasPaymentSubmittedOrSettled ||
                                r.completed_at) &&
                                r.status !== 'cancelled' &&
                                (() => {
                                    const invoicePayments =
                                        r.tagihan?.pembayaran ?? [];
                                    const pendingPayment = invoicePayments.find(
                                        (p) =>
                                            p.status === 'menunggu_verifikasi',
                                    );
                                    const latestVerified = invoicePayments.find(
                                        (p) => p.status === 'lunas',
                                    );
                                    const latestRejected = !pendingPayment
                                        ? invoicePayments.find(
                                              (p) => p.status === 'ditolak',
                                          )
                                        : undefined;
                                    const displayedProof =
                                        pendingPayment ?? latestVerified;
                                    const installments = (
                                        r.tagihan?.jadwal_cicilan ?? []
                                    )
                                        .filter((t) => t.status !== 'diganti')
                                        .sort(
                                            (a, b) => a.termin_ke - b.termin_ke,
                                        );
                                    let cumulative = 0;
                                    let nextTerm:
                                        | TagihanInstallmentSummary
                                        | undefined;
                                    let nextDue = remaining;
                                    for (const term of installments) {
                                        cumulative += Number(term.jumlah);
                                        if (cumulative > totalDibayar) {
                                            nextTerm = term;
                                            nextDue = Math.min(
                                                remaining,
                                                Math.max(
                                                    cumulative - totalDibayar,
                                                    0,
                                                ),
                                            );
                                            break;
                                        }
                                    }

                                    return (
                                        <div className="border-base-300 bg-base-100 space-y-4 rounded-xl border p-4">
                                            {!displayedProof &&
                                                !r.completed_at && (
                                                    <ReservationCountdown
                                                        targetIso={
                                                            r.reservation_expires_at ??
                                                            r.tagihan
                                                                ?.jatuh_tempo
                                                        }
                                                        label="Batas waktu penyelesaian pembayaran"
                                                    />
                                                )}

                                            {installments.length > 0 && (
                                                <div className="border-base-200 bg-base-200/30 space-y-1.5 rounded-lg border p-3 text-xs">
                                                    <p className="font-semibold">
                                                        Jadwal Pembayaran /
                                                        Termin
                                                    </p>
                                                    {installments.map(
                                                        (term) => (
                                                            <div
                                                                key={term.id}
                                                                className="flex justify-between gap-2"
                                                            >
                                                                <span>
                                                                    Termin{' '}
                                                                    {
                                                                        term.termin_ke
                                                                    }{' '}
                                                                    (Jatuh
                                                                    tempo:{' '}
                                                                    {formatDate(
                                                                        term.jatuh_tempo,
                                                                    )}
                                                                    )
                                                                </span>
                                                                <span className="font-medium">
                                                                    {formatRupiah(
                                                                        Number(
                                                                            term.jumlah,
                                                                        ),
                                                                    )}
                                                                </span>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            )}

                                            {displayedProof ? (
                                                <div
                                                    className={`border-base-300 bg-base-200/40 space-y-2 rounded-lg border border-l-4 p-3.5 text-xs ${
                                                        displayedProof.status ===
                                                        'lunas'
                                                            ? 'border-l-primary'
                                                            : 'border-l-warning'
                                                    }`}
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <span className="text-sm font-semibold">
                                                            {displayedProof.status ===
                                                            'lunas'
                                                                ? 'Pembayaran Terverifikasi (Lunas)'
                                                                : 'Menunggu Verifikasi Pengelola'}
                                                        </span>
                                                        <StatusChip
                                                            label={
                                                                displayedProof.status ===
                                                                'lunas'
                                                                    ? 'Lunas'
                                                                    : 'Menunggu Verifikasi'
                                                            }
                                                            tone={
                                                                displayedProof.status ===
                                                                'lunas'
                                                                    ? 'success'
                                                                    : 'warning'
                                                            }
                                                        />
                                                    </div>
                                                    <p className="text-muted">
                                                        Bukti transfer sebesar{' '}
                                                        <strong>
                                                            {formatRupiah(
                                                                Number(
                                                                    displayedProof.nominal,
                                                                ),
                                                            )}
                                                        </strong>{' '}
                                                        (
                                                        {
                                                            displayedProof.kode_transaksi
                                                        }
                                                        ) telah diterima sistem.
                                                    </p>
                                                    {displayedProof.rekening_tujuan && (
                                                        <p className="text-muted">
                                                            Tujuan:{' '}
                                                            {
                                                                displayedProof.rekening_tujuan
                                                            }
                                                        </p>
                                                    )}
                                                    {(displayedProof.nama_bank ||
                                                        displayedProof.atas_nama_pengirim) && (
                                                        <p className="text-muted">
                                                            Pengirim:{' '}
                                                            {displayedProof.nama_bank ||
                                                                '-'}{' '}
                                                            {displayedProof.nomor_rekening_pengirim
                                                                ? `· ${displayedProof.nomor_rekening_pengirim}`
                                                                : ''}
                                                            {displayedProof.atas_nama_pengirim
                                                                ? ` a.n. ${displayedProof.atas_nama_pengirim}`
                                                                : ''}
                                                        </p>
                                                    )}
                                                    {(displayedProof.tanggal_bayar ||
                                                        displayedProof.created_at) && (
                                                        <p className="text-muted">
                                                            Waktu transfer:{' '}
                                                            {formatDateTime(
                                                                displayedProof.tanggal_bayar ??
                                                                    displayedProof.created_at,
                                                            )}
                                                        </p>
                                                    )}
                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        <a
                                                            href={pembayaranBukti.url(
                                                                displayedProof.id,
                                                            )}
                                                            className="btn btn-outline btn-xs gap-1"
                                                        >
                                                            <Download className="size-3.5" />
                                                            Unduh Bukti Transfer
                                                        </a>
                                                    </div>
                                                </div>
                                            ) : !r.completed_at ? (
                                                <>
                                                    {latestRejected && (
                                                        <div className="alert alert-error text-xs">
                                                            <AlertTriangle className="size-4 shrink-0" />
                                                            <span>
                                                                Bukti pembayaran
                                                                sebelumnya
                                                                ditolak:{' '}
                                                                <strong>
                                                                    {latestRejected.catatan_verifikasi ||
                                                                        'Periksa kembali nominal atau lampiran bukti.'}
                                                                </strong>
                                                            </span>
                                                        </div>
                                                    )}
                                                    {remaining > 0 && (
                                                        <PaymentAccountsBox
                                                            paymentAccounts={
                                                                paymentAccounts
                                                            }
                                                            virtualAccounts={
                                                                virtualAccounts
                                                            }
                                                            compact
                                                        />
                                                    )}
                                                    {remaining > 0 && (
                                                        <div className="border-base-300 bg-base-200/30 space-y-3 rounded-xl border p-4">
                                                            <h4 className="text-sm font-semibold">
                                                                Unggah Bukti
                                                                Pembayaran
                                                            </h4>
                                                            <PaymentProofForm
                                                                key={
                                                                    r.tagihan!
                                                                        .id
                                                                }
                                                                tagihanId={
                                                                    r.tagihan!
                                                                        .id
                                                                }
                                                                totalRemaining={
                                                                    remaining
                                                                }
                                                                dueAmount={
                                                                    nextDue
                                                                }
                                                                terminKe={
                                                                    nextTerm?.termin_ke ??
                                                                    null
                                                                }
                                                                jenisPembayaran={
                                                                    nextTerm
                                                                        ? 'cicilan'
                                                                        : 'sewa_asrama'
                                                                }
                                                                paymentAccounts={
                                                                    paymentAccounts
                                                                }
                                                            />
                                                        </div>
                                                    )}
                                                </>
                                            ) : null}
                                        </div>
                                    );
                                })()}

                            {!paymentUnlocked &&
                                !isKipkExempt &&
                                !r.completed_at &&
                                r.status !== 'cancelled' && (
                                    <div className="border-base-300 bg-base-200/40 rounded-lg border p-3 text-xs">
                                        <p className="font-semibold">
                                            Tahap Pembayaran Belum Dibuka
                                        </p>
                                        <p className="text-muted mt-0.5">
                                            Lengkapi unggahan seluruh berkas
                                            wajib pada panel Berkas Pendaftaran
                                            agar akses pembayaran langsung
                                            terbuka (verifikasi berkas akan
                                            dilakukan petugas saat check-in).
                                        </p>
                                    </div>
                                )}

                            {(r.completed_at || r.ready_at) &&
                                r.status !== 'cancelled' && (
                                    <div className="flex justify-end">
                                        <Link
                                            href={detailKamarRoute.url()}
                                            className="btn btn-primary btn-sm gap-1.5"
                                        >
                                            <span>Buka Kamar Saya</span>
                                            <ArrowRight className="size-4" />
                                        </Link>
                                    </div>
                                )}
                        </div>
                    ) : (
                        <div className="bg-base-200/50 text-muted rounded-lg p-3 text-sm">
                            Tagihan belum diterbitkan. Menunggu alokasi atau
                            verifikasi pendaftaran.
                        </div>
                    )}

                    {isKipkExempt && (
                        <div className="border-base-300 bg-base-200/40 rounded-lg border p-3.5 text-sm">
                            <p className="font-semibold">Skema KIP-K Aktif</p>
                            <p className="text-muted mt-0.5 text-xs">
                                Biaya hunian ditanggung melalui skema KIP-K
                                sesuai ketentuan asrama. Tidak perlu memilih
                                cicilan atau penundaan pembayaran pribadi.
                            </p>
                        </div>
                    )}

                    {/* Saved Decision Read-Only Card (hide automatic Bayar penuh card) */}
                    {visibleSavedDecisions.map((d) => {
                        const decisionChip = decisionStatusChip(d.status);
                        return (
                            <div
                                key={d.id}
                                className="border-base-300 bg-base-200/30 space-y-2 rounded-lg border p-3.5"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-semibold">
                                        {DECISION_LABELS[d.kind] ?? d.kind}
                                    </p>
                                    <StatusChip
                                        label={decisionChip.label}
                                        tone={decisionChip.tone}
                                    />
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
                                                    {formatDate(
                                                        term.jatuh_tempo,
                                                    )}
                                                    )
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
                        );
                    })}

                    {rejectedDecisions.map((d) => {
                        const decisionChip = decisionStatusChip(d.status);
                        return (
                            <div
                                key={d.id}
                                className="border-base-300 border-l-error bg-base-100 space-y-1 rounded-lg border border-l-4 p-3 text-xs"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold">
                                        {DECISION_LABELS[d.kind] ?? d.kind}
                                    </span>
                                    <StatusChip
                                        label={decisionChip.label}
                                        tone={decisionChip.tone}
                                    />
                                </div>
                                {d.terms?.notes && (
                                    <p>Catatan: {d.terms.notes}</p>
                                )}
                            </div>
                        );
                    })}

                    {/* Decision selector ONLY when additional monthly/transfer scheme is actually available */}
                    {canChooseFinancing &&
                        (hasMonthlyOption || hasTransferOption) && (
                            <div className="border-base-300 bg-base-200/30 space-y-3 rounded-lg border p-3.5">
                                <p className="text-sm font-semibold">
                                    Jenis Pembayaran
                                </p>
                                <p className="text-muted text-xs">
                                    Pilihan ini akan dikunci permanen setelah
                                    Anda menekan tombol simpan di bawah.
                                </p>
                                <label className="block space-y-1">
                                    <span className="text-xs font-medium">
                                        Jenis Pembayaran
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
                                        {hasMonthlyOption && (
                                            <option value="monthly">
                                                Ajukan skema bulanan
                                            </option>
                                        )}
                                        {hasTransferOption && (
                                            <option value="transfer_permission">
                                                Izin tinggal berbasis bukti
                                                transfer
                                            </option>
                                        )}
                                    </select>
                                </label>
                                {decisionKind !== 'full' && (
                                    <label className="block space-y-1">
                                        <span className="text-xs font-medium">
                                            Alasan Permohonan{' '}
                                            <span className="text-error">
                                                *
                                            </span>
                                        </span>
                                        <textarea
                                            className="textarea textarea-bordered textarea-sm w-full"
                                            rows={2}
                                            value={decisionReason}
                                            onChange={(e) =>
                                                setDecisionReason(
                                                    e.target.value,
                                                )
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
                        <div className="border-base-300 bg-base-200/40 space-y-1.5 rounded-lg border p-3 text-xs">
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
                <div className="border-base-300 border-l-error bg-base-200/40 text-base-content rounded-lg border border-l-4 p-3 text-sm">
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
                            Pastikan seluruh file dan pilihan pembiayaan sudah
                            sesuai karena data yang tersimpan tidak dapat diubah
                            kembali.
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
                    <div className="border-base-300 border-l-warning bg-base-200/40 flex items-start gap-2.5 rounded-lg border border-l-4 p-3 text-sm">
                        <AlertTriangle
                            className="text-warning mt-0.5 size-4 shrink-0"
                            aria-hidden="true"
                        />
                        <span>
                            Setelah disimpan, dokumen dan pilihan pembiayaan{' '}
                            <strong>tidak dapat diubah</strong> oleh Anda.
                            Pengunggahan ulang hanya dibuka bila petugas meminta
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
                                                {file.name} (
                                                {formatFileSize(file.size)})
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

                    {submitting && (
                        <div className="border-base-300 bg-base-200/40 space-y-2 rounded-lg border p-3 text-xs">
                            <div className="flex items-center justify-between gap-2 font-medium">
                                <span>
                                    {uploadProgress !== null &&
                                    uploadProgress < 100
                                        ? `Mengunggah berkas (${uploadProgress}%)...`
                                        : 'Memproses penyimpanan di server...'}
                                </span>
                                {uploadProgress !== null && (
                                    <span>{uploadProgress}%</span>
                                )}
                            </div>
                            {uploadProgress !== null && (
                                <progress
                                    className="progress progress-primary w-full"
                                    value={uploadProgress}
                                    max={100}
                                />
                            )}
                            {slowUploadHint && (
                                <p className="text-muted">
                                    Unggahan membutuhkan waktu lebih lama dari
                                    biasanya. Anda dapat menunggu, atau batalkan
                                    lalu unggah berkas satu per satu agar lebih
                                    ringan.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        {submitting ? (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => cancelUploadRef.current?.()}
                            >
                                Batalkan Unggahan
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setConfirmOpen(false)}
                            >
                                Periksa Ulang
                            </Button>
                        )}
                        <Button
                            type="button"
                            onClick={submitPackage}
                            disabled={submitting}
                        >
                            {submitting
                                ? uploadProgress !== null &&
                                  uploadProgress < 100
                                    ? `Mengunggah (${uploadProgress}%)...`
                                    : 'Menyimpan...'
                                : 'Ya, Simpan Permanen'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal
                open={cancelModalOpen}
                onClose={() => {
                    if (!cancelling) {
                        setCancelModalOpen(false);
                    }
                }}
                title="Batalkan Pendaftaran & Ganti Pilihan Kamar"
            >
                <div className="space-y-4 text-sm">
                    <p>
                        Anda belum memiliki pembayaran yang masuk. Jika
                        dibatalkan, slot kamar yang saat ini ditahan dan tagihan
                        pendaftaran akan dilepas sehingga Anda langsung kembali
                        ke Langkah 1 untuk memilih gedung atau kamar lain.
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={cancelling}
                            onClick={() => setCancelModalOpen(false)}
                        >
                            Tutup
                        </Button>
                        <button
                            type="button"
                            className="btn btn-error btn-sm"
                            disabled={cancelling}
                            onClick={submitCancel}
                        >
                            {cancelling
                                ? 'Membatalkan...'
                                : 'Ya, Batalkan Pendaftaran'}
                        </button>
                    </div>
                </div>
            </Modal>
        </Card>
    );
}

export default function RegistrationStatus({
    registrations,
    templates = [],
    payment_accounts = [],
    virtual_accounts = [],
    detailMode = false,
}: Props) {
    const items = registrations?.data ?? [];

    return (
        <div className="space-y-6">
            <Head title="Status Pendaftaran & Berkas Asrama" />

            <PageHeader
                title="Status Pendaftaran & Berkas Asrama"
                subtitle="Pantau tahapan pengajuan kamar, kelengkapan dokumen resmi, pilihan pembiayaan, serta status verifikasi pembayaran Anda."
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
                            paymentAccounts={payment_accounts}
                            virtualAccounts={virtual_accounts}
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
