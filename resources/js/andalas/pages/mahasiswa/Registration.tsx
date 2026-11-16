import { useState } from 'react';
import { BedDouble, Download, FileText, Upload } from 'lucide-react';
import * as workflow from '@/actions/App/Http/Controllers/ResidenceWorkflowController';
import RoomCatalog, { type CatalogRoom } from '../../components/RoomCatalog';
import RoomInvitations, {
    InviteRoommateButton,
    type RoomInvitation,
} from '../../components/RoomInvitations';
import type {
    PaymentBankAccountItem,
    VirtualAccountItem,
} from '../../components/PaymentAccountsBox';
import {
    ALLOWED_UPLOAD_EXTENSIONS,
    friendlyDocumentLabel,
    MAX_UPLOAD_BYTES,
    StudentRegistrationCard,
    type Registration as WorkflowRegistration,
    type TemplateItem,
} from './RegistrationStatus';
import { Link, useForm } from '@inertiajs/react';
import {
    Button,
    Card,
    Modal,
    PageHeader,
    inputClass,
    selectClass,
    StatusBadge,
} from '../../components/ui';
import { store } from '@/routes/andalas/registrations';
import { formatRupiah } from '../../lib/format';
type Room = CatalogRoom;
type Props = {
    housingProfileReady?: boolean;
    housingProfileUrl?: string;
    housingStatusUrl?: string;
    policy_open?: boolean;
    policy_category?: string;
    required_documents?: string[];
    policy_monthly_allowed?: boolean;
    policy_month_days?: number;
    policy_day_basis?: string;
    initialUser?: {
        angkatan?: number | string | null;
        is_kipk?: boolean;
        kipk_personal_payment?: boolean;
        can_use_sponsor?: boolean;
        status_huni?: string;
        student_stage?: string;
        inactive_reason?: string;
        client_profile_category?: string;
    };
    periode?: Array<{
        id: string;
        nama_periode: string;
        status: string;
        angkatan_maba?: number | string | null;
        reservation_hours?: number;
    }>;
    rooms?: Room[];
    rates?: Array<{
        gedung_id: string;
        tipe_kamar: string;
        unit: string;
        amount: string;
        student_amount?: string | null;
        room_amount?: string | null;
    }>;
    templates?: TemplateItem[];
    payment_accounts?: PaymentBankAccountItem[];
    virtual_accounts?: VirtualAccountItem[];
    room_invitations?: RoomInvitation[];
    registration?: Array<
        Partial<WorkflowRegistration> & {
            id: string;
            status: string;
            can_invite?: boolean;
            tagihan_id?: string | null;
        }
    >;
};

function LinearStepper({
    activeStep,
    kipk,
}: {
    activeStep: number;
    kipk: boolean;
}) {
    const labels = [
        'Rencana hunian',
        kipk ? 'Alokasi kamar' : 'Pilih kamar',
        'Upload berkas',
        kipk ? 'Pembiayaan KIP-K' : 'Pembayaran',
        'Check-in (Verifikasi)',
    ];

    return (
        <ol
            className="border-base-300 bg-base-100 grid grid-cols-1 gap-2 rounded-2xl border p-3 text-sm sm:grid-cols-2 lg:grid-cols-5"
            aria-label="Tahapan pendaftaran"
        >
            {labels.map((label, index) => (
                <li
                    key={label}
                    aria-current={activeStep === index ? 'step' : undefined}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors ${
                        activeStep === index
                            ? 'bg-primary/10 text-primary font-semibold'
                            : activeStep > index
                              ? 'bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                              : 'text-base-content/60'
                    }`}
                >
                    <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            activeStep === index
                                ? 'bg-primary text-primary-content'
                                : activeStep > index
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-base-200 text-base-content/70'
                        }`}
                    >
                        {index + 1}
                    </span>
                    <span className="min-w-0 leading-tight">{label}</span>
                </li>
            ))}
        </ol>
    );
}
export default function Registration({
    housingProfileReady = true,
    housingProfileUrl,
    policy_open = false,
    policy_category = 'local_non_kipk',
    required_documents = ['perjanjian'],
    policy_monthly_allowed = true,
    policy_month_days = 30,
    policy_day_basis = 'nights',
    initialUser,
    periode = [],
    rooms = [],
    rates = [],
    templates = [],
    payment_accounts = [],
    virtual_accounts = [],
    registration = [],
    room_invitations = [],
}: Props) {
    const [step, setStep] = useState(0);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [friendNim, setFriendNim] = useState('');
    const [friendError, setFriendError] = useState('');
    const [selectedDocFiles, setSelectedDocFiles] = useState<
        Record<string, File>
    >({});
    const [docFileErrors, setDocFileErrors] = useState<Record<string, string>>(
        {},
    );
    const [tab, setTab] = useState<'registration' | 'invitations'>(
        'registration',
    );
    const periods = periode.filter((p) => p.status === 'aktif');
    const kipk = initialUser?.is_kipk === true;
    const pending = registration.some(
        (r) =>
            !r.completed_at &&
            !['draft', 'rejected', 'cancelled'].includes(r.status),
    );
    const form = useForm({
        periode_id: periods[0]?.id ?? '',
        is_kipk: kipk,
        preferences: [{ kamar_id: '', notes: '' }],
        rate_unit: 'period',
        billing_basis: 'person',
        starts_at: '',
        ends_at: '',
        funding: 'personal',
        sponsor_name: '',
        notes: '',
        invitee_nims: [] as string[],
        decision_kind: 'full',
        decision_reason: '',
    });
    const selectedPeriod =
        periods.find((p) => p.id === form.data.periode_id) ?? periods[0];
    const isMaba =
        initialUser?.angkatan != null &&
        selectedPeriod?.angkatan_maba != null &&
        Number(initialUser.angkatan) === Number(selectedPeriod.angkatan_maba);
    const canSelectMonthly = policy_monthly_allowed && !isMaba;
    const room = rooms.find((r) => r.id === form.data.preferences[0].kamar_id);
    const rateUnit =
        form.data.rate_unit === 'period' ? 'year' : form.data.rate_unit;
    const rate =
        rates.find(
            (r) =>
                r.gedung_id === room?.lantai?.gedung_id &&
                r.tipe_kamar === room?.tipe_kamar &&
                r.unit ===
                    (form.data.rate_unit === 'period'
                        ? 'year'
                        : form.data.rate_unit),
        ) ??
        (rateUnit === 'day'
            ? rates.find(
                  (r) =>
                      r.gedung_id === room?.lantai?.gedung_id &&
                      r.tipe_kamar === 'umum' &&
                      r.unit === 'day',
              )
            : undefined);
    const price = Number(
        (form.data.billing_basis === 'room'
            ? rate?.room_amount
            : rateUnit === 'day' &&
                initialUser?.client_profile_category !== 'non_student' &&
                rate?.student_amount != null
              ? rate.student_amount
              : rate?.amount) ??
            (form.data.billing_basis === 'person' &&
            form.data.rate_unit === 'period'
                ? room?.tarif_per_periode
                : 0) ??
            0,
    );
    const days =
        form.data.starts_at && form.data.ends_at
            ? Math.max(
                  1,
                  Math.ceil(
                      (Date.parse(form.data.ends_at) -
                          Date.parse(form.data.starts_at)) /
                          86400000,
                  ),
              )
            : 1;
    const maxInvites = Math.max(
        0,
        (room?.available_places ?? room?.kapasitas ?? 1) - 1,
    );
    const addFriendNim = (raw: string): boolean => {
        const nim = raw.trim();
        if (!nim) {
            return true;
        }
        if (form.data.invitee_nims.includes(nim)) {
            setFriendError(`NIM ${nim} sudah ada dalam daftar teman.`);
            return false;
        }
        if (form.data.invitee_nims.length >= maxInvites) {
            setFriendError(
                `Maksimal ${maxInvites} teman untuk sisa tempat di kamar ini.`,
            );
            return false;
        }
        form.setData('invitee_nims', [...form.data.invitee_nims, nim]);
        setFriendNim('');
        setFriendError('');
        return true;
    };
    return (
        <div className="space-y-5">
            <PageHeader
                title="Pendaftaran Asrama"
                subtitle="Pilih kamar, unggah berkas, selesaikan pembayaran, dan lakukan verifikasi berkas saat check-in dalam satu alur."
            />
            {!policy_open && (
                <p className="alert alert-warning">
                    Pendaftaran belum dibuka untuk kategori Anda. Pengelola
                    perlu melengkapi kebijakan terlebih dahulu.
                </p>
            )}
            {policy_open && periods.length === 0 && (
                <p className="alert alert-warning">
                    Pendaftaran belum dibuka karena periode hunian aktif belum
                    tersedia. Hubungi pengelola.
                </p>
            )}
            <nav
                className="border-base-300 flex gap-5 border-b"
                aria-label="Pendaftaran dan undangan"
            >
                {(['registration', 'invitations'] as const).map((value) => (
                    <button
                        type="button"
                        key={value}
                        onClick={() => setTab(value)}
                        aria-pressed={tab === value}
                        className={`border-b-2 px-1 py-3 text-sm font-medium ${tab === value ? 'border-primary text-primary' : 'text-muted border-transparent'}`}
                    >
                        {value === 'registration'
                            ? 'Pendaftaran & pilihan kamar'
                            : `Undangan (${room_invitations.filter((item) => item.incoming && item.status === 'pending').length})`}
                    </button>
                ))}
            </nav>
            {tab === 'invitations' ? (
                <Card className="p-5">
                    <RoomInvitations invitations={room_invitations} />
                </Card>
            ) : (
                <>
                    <Card className="space-y-4 p-5">
                        {!pending && (
                            <p>
                                {initialUser?.student_stage}.{' '}
                                {kipk
                                    ? 'Terdaftar sebagai penerima KIP-K. Sistem mengalokasikan kamar sesuai prioritas dan kapasitas.'
                                    : 'Pilih kamar yang tersedia sesuai kategori Anda.'}
                            </p>
                        )}
                        {kipk && initialUser?.kipk_personal_payment && (
                            <p className="text-sm">
                                Kewajiban pribadi dibayar setelah pencairan
                                KIP-K. Check-in diperbolehkan setelah alokasi,
                                dokumen, dan perjanjian valid. Pembayaran tetap
                                tercatat terutang sampai dana diterima.
                            </p>
                        )}
                        {initialUser?.inactive_reason === 'letter_issued' && (
                            <p>
                                Arsip surat tetap tersedia. Anda dapat mendaftar
                                hunian kembali dari akun ini.
                            </p>
                        )}
                        {initialUser?.status_huni === 'aktif' ? (
                            <p>
                                Anda masih menghuni asrama. Selesaikan check-out
                                sebelum mendaftar lagi.
                            </p>
                        ) : pending ? (
                            (() => {
                                const currentReg = registration.find(
                                    (r) =>
                                        !r.completed_at &&
                                        ![
                                            'draft',
                                            'rejected',
                                            'cancelled',
                                        ].includes(r.status),
                                );
                                const waitingKipkAllocation = registration.some(
                                    (r) =>
                                        !r.completed_at &&
                                        ![
                                            'draft',
                                            'rejected',
                                            'cancelled',
                                        ].includes(r.status) &&
                                        r.is_kipk &&
                                        r.funding === 'personal' &&
                                        !r.tagihan_id,
                                );

                                const requiredDocs = currentReg?.policy
                                    ?.settings?.documents ?? ['perjanjian'];
                                const latestDocs = new Map<
                                    string,
                                    { version: number; status: string }
                                >();
                                for (const doc of currentReg?.documents ?? []) {
                                    const existing = latestDocs.get(doc.kind);
                                    if (
                                        !existing ||
                                        doc.version > existing.version
                                    ) {
                                        latestDocs.set(doc.kind, doc);
                                    }
                                }
                                const allDocsUploaded = requiredDocs.every(
                                    (kind) => {
                                        const doc = latestDocs.get(kind);
                                        return doc && doc.status !== 'revision';
                                    },
                                );
                                const hasRevisionDoc = requiredDocs.some(
                                    (kind) =>
                                        latestDocs.get(kind)?.status ===
                                        'revision',
                                );
                                const paymentSubmittedOrSettled =
                                    Boolean(currentReg?.completed_at) ||
                                    Boolean(currentReg?.ready_at) ||
                                    Boolean(
                                        (
                                            currentReg?.tagihan?.pembayaran ??
                                            []
                                        ).some(
                                            (p) =>
                                                p.status ===
                                                    'menunggu_verifikasi' ||
                                                p.status === 'lunas',
                                        ),
                                    );
                                const currentActiveStep =
                                    currentReg?.completed_at
                                        ? 5
                                        : waitingKipkAllocation
                                          ? 1
                                          : !allDocsUploaded || hasRevisionDoc
                                            ? 2
                                            : currentReg?.is_kipk ||
                                                paymentSubmittedOrSettled
                                              ? 4
                                              : 3;

                                return (
                                    <div className="space-y-5">
                                        <LinearStepper
                                            activeStep={currentActiveStep}
                                            kipk={kipk}
                                        />
                                        <div className="border-base-300 bg-base-200/40 rounded-xl border p-4 text-sm">
                                            <p className="font-semibold">
                                                Pendaftaran sedang diproses
                                            </p>
                                            <p className="text-base-content/75 mt-1">
                                                {waitingKipkAllocation
                                                    ? 'Menunggu alokasi kamar sesuai prioritas dan kapasitas. Tagihan diterbitkan setelah kamar dialokasikan.'
                                                    : hasRevisionDoc
                                                      ? 'Petugas meminta revisi berkas. Unggah ulang dokumen yang diminta pada panel di bawah.'
                                                      : !allDocsUploaded
                                                        ? 'Tahap 3: Unggah seluruh berkas wajib pada panel di bawah agar tahap pembayaran dapat langsung dilanjutkan.'
                                                        : currentReg?.completed_at
                                                          ? 'Tahap 5: Verifikasi berkas dan check-in fisik di asrama telah selesai.'
                                                          : paymentSubmittedOrSettled ||
                                                              currentReg?.ready_at
                                                            ? 'Tahap 5: Pembayaran tercatat dan status hunian aktif. Bawa berkas asli untuk verifikasi petugas saat check-in di asrama.'
                                                            : currentReg?.payment_unlocked
                                                              ? 'Tahap 4: Berkas sudah terunggah. Silakan langsung selesaikan pembayaran dan unggah bukti transfer tanpa menunggu verifikasi berkas.'
                                                              : 'Tahap pembiayaan sedang diproses sesuai ketentuan kategori Anda.'}
                                            </p>
                                        </div>
                                        {currentReg && (
                                            <StudentRegistrationCard
                                                registration={
                                                    currentReg as WorkflowRegistration
                                                }
                                                templates={templates}
                                                paymentAccounts={
                                                    payment_accounts
                                                }
                                                virtualAccounts={
                                                    virtual_accounts
                                                }
                                                embedded
                                            />
                                        )}
                                    </div>
                                );
                            })()
                        ) : !housingProfileReady && housingProfileUrl ? (
                            <div className="space-y-3">
                                <p>
                                    Lengkapi identitas, data akademik, dan
                                    alamat sebelum memilih hunian.
                                </p>
                                <Link
                                    href={housingProfileUrl}
                                    className="btn btn-primary"
                                >
                                    Lengkapi Data Hunian
                                </Link>
                            </div>
                        ) : (
                            <form
                                className="space-y-4"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (step !== 2) return;
                                    if (friendNim.trim() !== '') {
                                        if (!addFriendNim(friendNim)) {
                                            return;
                                        }
                                    }
                                    setConfirmOpen(true);
                                }}
                            >
                                <LinearStepper activeStep={step} kipk={kipk} />
                                {step === 0 && periods[0] && (
                                    <div className="bg-primary/5 border-primary/20 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm">
                                        <span className="font-medium">
                                            Periode hunian ·{' '}
                                            <strong>
                                                {periods[0].nama_periode}
                                            </strong>
                                        </span>
                                        <span className="badge badge-primary badge-outline text-xs">
                                            Aktif
                                        </span>
                                    </div>
                                )}
                                {!kipk && (
                                    <>
                                        {step === 0 && (
                                            <div className="border-base-300 bg-base-100 grid gap-4 rounded-xl border p-4 shadow-sm sm:grid-cols-2">
                                                <label className="block text-sm">
                                                    Satuan tarif
                                                    <select
                                                        className={inputClass}
                                                        value={
                                                            form.data.rate_unit
                                                        }
                                                        onChange={(e) =>
                                                            form.setData({
                                                                ...form.data,
                                                                rate_unit:
                                                                    e.target
                                                                        .value,
                                                                billing_basis:
                                                                    'person',
                                                                preferences: [
                                                                    {
                                                                        kamar_id:
                                                                            '',
                                                                        notes: '',
                                                                    },
                                                                ],
                                                            })
                                                        }
                                                    >
                                                        <option value="period">
                                                            Per tahun
                                                        </option>
                                                        {canSelectMonthly && (
                                                            <option value="month">
                                                                Per bulan
                                                            </option>
                                                        )}
                                                        <option value="day">
                                                            Per hari
                                                        </option>
                                                    </select>
                                                </label>
                                                {rateUnit === 'year' && (
                                                    <label className="block text-sm">
                                                        Dasar tarif
                                                        <select
                                                            className={
                                                                inputClass
                                                            }
                                                            value={
                                                                form.data
                                                                    .billing_basis
                                                            }
                                                            onChange={(e) =>
                                                                form.setData({
                                                                    ...form.data,
                                                                    billing_basis:
                                                                        e.target
                                                                            .value,
                                                                    preferences:
                                                                        [
                                                                            {
                                                                                kamar_id:
                                                                                    '',
                                                                                notes: '',
                                                                            },
                                                                        ],
                                                                })
                                                            }
                                                        >
                                                            <option value="person">
                                                                Per orang
                                                            </option>
                                                            <option value="room">
                                                                Per kamar
                                                                (seluruh kamar)
                                                            </option>
                                                        </select>
                                                        <span className="text-sm">
                                                            Sewa per kamar
                                                            memerlukan kamar
                                                            kosong dan tarif
                                                            tahunan per kamar.
                                                        </span>
                                                    </label>
                                                )}
                                                {['day', 'month'].includes(
                                                    form.data.rate_unit,
                                                ) && (
                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                        <label>
                                                            Masuk
                                                            <input
                                                                className={
                                                                    inputClass
                                                                }
                                                                type="date"
                                                                required
                                                                value={
                                                                    form.data
                                                                        .starts_at
                                                                }
                                                                onChange={(e) =>
                                                                    form.setData(
                                                                        'starts_at',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                        </label>
                                                        <label>
                                                            Keluar
                                                            <input
                                                                className={
                                                                    inputClass
                                                                }
                                                                type="date"
                                                                required
                                                                value={
                                                                    form.data
                                                                        .ends_at
                                                                }
                                                                onChange={(e) =>
                                                                    form.setData(
                                                                        'ends_at',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {step === 1 && (
                                            <RoomCatalog
                                                rooms={rooms}
                                                rates={rates}
                                                selected={
                                                    form.data.preferences[0]
                                                        .kamar_id
                                                }
                                                onSelect={(id) => {
                                                    const nextRoom = rooms.find(
                                                        (item) =>
                                                            item.id === id,
                                                    );
                                                    const nextMax = Math.max(
                                                        0,
                                                        (nextRoom?.available_places ??
                                                            nextRoom?.kapasitas ??
                                                            1) - 1,
                                                    );
                                                    form.setData({
                                                        ...form.data,
                                                        preferences: [
                                                            {
                                                                kamar_id: id,
                                                                notes: '',
                                                            },
                                                        ],
                                                        invitee_nims:
                                                            form.data.invitee_nims.slice(
                                                                0,
                                                                nextMax,
                                                            ),
                                                    });
                                                }}
                                                onReview={() => setStep(2)}
                                                unit={rateUnit}
                                                basis={form.data.billing_basis}
                                                isStudent={
                                                    initialUser?.client_profile_category !==
                                                    'non_student'
                                                }
                                            />
                                        )}
                                        {step === 0 &&
                                            initialUser?.can_use_sponsor && (
                                                <>
                                                    <label>
                                                        Penanggung biaya
                                                        <select
                                                            className={
                                                                inputClass
                                                            }
                                                            value={
                                                                form.data
                                                                    .funding
                                                            }
                                                            onChange={(e) =>
                                                                form.setData(
                                                                    'funding',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        >
                                                            <option value="personal">
                                                                Bayar pribadi
                                                            </option>
                                                            <option value="sponsor">
                                                                Beasiswa /
                                                                kampus
                                                            </option>
                                                        </select>
                                                    </label>
                                                    {form.data.funding ===
                                                        'sponsor' && (
                                                        <label>
                                                            Nama penanggung
                                                            biaya
                                                            <input
                                                                className={
                                                                    inputClass
                                                                }
                                                                required
                                                                value={
                                                                    form.data
                                                                        .sponsor_name
                                                                }
                                                                onChange={(e) =>
                                                                    form.setData(
                                                                        'sponsor_name',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                            />
                                                            <span className="text-sm">
                                                                Perlu pengesahan
                                                                Admin Layanan.
                                                            </span>
                                                        </label>
                                                    )}
                                                </>
                                            )}
                                        {step === 2 && (
                                            <div className="grid gap-4 lg:grid-cols-3">
                                                <div className="border-base-300 bg-base-100 space-y-4 rounded-2xl border p-5 shadow-sm lg:col-span-2">
                                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                                        <div>
                                                            <span className="badge badge-primary badge-outline mb-2 text-xs font-semibold capitalize">
                                                                {room?.tipe_kamar ??
                                                                    'Kamar'}
                                                            </span>
                                                            <h2 className="text-xl font-bold">
                                                                {
                                                                    room?.lantai
                                                                        ?.gedung
                                                                        ?.nama_gedung
                                                                }{' '}
                                                                · Kamar{' '}
                                                                {
                                                                    room?.nomor_kamar
                                                                }
                                                            </h2>
                                                            <p className="text-base-content/70 text-sm">
                                                                {room?.lantai
                                                                    ?.nama_lantai ??
                                                                    `Lantai ${room?.lantai?.nomor_lantai ?? '—'}`}{' '}
                                                                · Kapasitas{' '}
                                                                {room?.kapasitas ??
                                                                    '—'}{' '}
                                                                orang
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-base-200/50 grid gap-3 rounded-xl p-3.5 text-sm sm:grid-cols-2">
                                                        <div>
                                                            <span className="text-base-content/60 block text-xs">
                                                                Skema &amp;
                                                                dasar tarif
                                                            </span>
                                                            <strong>
                                                                {form.data
                                                                    .rate_unit ===
                                                                'day'
                                                                    ? 'Per hari'
                                                                    : form.data
                                                                            .rate_unit ===
                                                                        'month'
                                                                      ? 'Per bulan'
                                                                      : 'Per tahun'}{' '}
                                                                ·{' '}
                                                                {form.data
                                                                    .billing_basis ===
                                                                'room'
                                                                    ? 'Per kamar'
                                                                    : 'Per orang'}
                                                            </strong>
                                                        </div>
                                                        <div>
                                                            <span className="text-base-content/60 block text-xs">
                                                                Periode /
                                                                tanggal
                                                            </span>
                                                            <strong>
                                                                {form.data
                                                                    .starts_at &&
                                                                form.data
                                                                    .ends_at
                                                                    ? `${form.data.starts_at} s/d ${form.data.ends_at}`
                                                                    : (periods[0]
                                                                          ?.nama_periode ??
                                                                      'Periode aktif')}
                                                            </strong>
                                                        </div>
                                                    </div>
                                                    {room?.facilities && (
                                                        <p className="text-base-content/75 text-sm">
                                                            <strong className="font-medium">
                                                                Fasilitas:
                                                            </strong>{' '}
                                                            {room.facilities}
                                                        </p>
                                                    )}
                                                    <p className="text-base-content/70 text-xs">
                                                        Alokasi kamar
                                                        dipertahankan selama
                                                        proses administrasi
                                                        berjalan. Status hunian
                                                        aktif tercatat setelah
                                                        pembayaran diunggah, dan
                                                        verifikasi berkas asli
                                                        dilakukan saat check-in.
                                                    </p>
                                                    <div className="border-base-300 bg-base-200/30 space-y-3 rounded-xl border p-4">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <div>
                                                                <h3 className="text-sm font-semibold">
                                                                    Undang Teman
                                                                    Sekamar
                                                                    (Opsional)
                                                                </h3>
                                                                <p className="text-base-content/70 text-xs">
                                                                    {maxInvites >
                                                                    0
                                                                        ? 'Masukkan NIM calon teman kamar yang ingin diajukan, Teman kamar harus sudah membuat akun Andalas Residence terlebih dahulu'
                                                                        : 'Kamar ini hanya menyisakan 1 tempat untuk Anda.'}
                                                                </p>
                                                            </div>
                                                            {maxInvites > 0 && (
                                                                <span className="badge badge-outline text-xs">
                                                                    {
                                                                        form
                                                                            .data
                                                                            .invitee_nims
                                                                            .length
                                                                    }{' '}
                                                                    /{' '}
                                                                    {maxInvites}{' '}
                                                                    teman
                                                                </span>
                                                            )}
                                                        </div>
                                                        {maxInvites > 0 && (
                                                            <div className="flex flex-col gap-2 sm:flex-row">
                                                                <input
                                                                    type="text"
                                                                    className={
                                                                        inputClass
                                                                    }
                                                                    maxLength={
                                                                        50
                                                                    }
                                                                    value={
                                                                        friendNim
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) => {
                                                                        setFriendNim(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        );
                                                                        if (
                                                                            friendError
                                                                        ) {
                                                                            setFriendError(
                                                                                '',
                                                                            );
                                                                        }
                                                                    }}
                                                                    onKeyDown={(
                                                                        e,
                                                                    ) => {
                                                                        if (
                                                                            e.key ===
                                                                            'Enter'
                                                                        ) {
                                                                            e.preventDefault();
                                                                            addFriendNim(
                                                                                friendNim,
                                                                            );
                                                                        }
                                                                    }}
                                                                    placeholder="Masukkan NIM calon teman kamar"
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="secondary"
                                                                    onClick={() =>
                                                                        addFriendNim(
                                                                            friendNim,
                                                                        )
                                                                    }
                                                                >
                                                                    Tambah teman
                                                                </Button>
                                                            </div>
                                                        )}
                                                        {friendError && (
                                                            <p
                                                                role="alert"
                                                                className="text-error text-xs"
                                                            >
                                                                {friendError}
                                                            </p>
                                                        )}
                                                        {form.data.invitee_nims
                                                            .length > 0 && (
                                                            <div className="flex flex-wrap gap-2">
                                                                {form.data.invitee_nims.map(
                                                                    (nim) => (
                                                                        <span
                                                                            key={
                                                                                nim
                                                                            }
                                                                            className="border-base-300 bg-base-100 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
                                                                        >
                                                                            <span>
                                                                                {
                                                                                    nim
                                                                                }
                                                                            </span>
                                                                            <button
                                                                                type="button"
                                                                                aria-label={`Hapus teman ${nim}`}
                                                                                className="text-base-content/60 hover:text-error"
                                                                                onClick={() =>
                                                                                    form.setData(
                                                                                        'invitee_nims',
                                                                                        form.data.invitee_nims.filter(
                                                                                            (
                                                                                                item,
                                                                                            ) =>
                                                                                                item !==
                                                                                                nim,
                                                                                        ),
                                                                                    )
                                                                                }
                                                                            >
                                                                                ×
                                                                            </button>
                                                                        </span>
                                                                    ),
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="border-base-300 bg-base-200/40 flex flex-col justify-between space-y-4 rounded-2xl border p-5 shadow-sm">
                                                    <div className="space-y-3">
                                                        <h3 className="text-sm font-bold tracking-wide uppercase">
                                                            Rincian Biaya
                                                        </h3>
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex justify-between gap-2">
                                                                <span className="text-base-content/70">
                                                                    Tarif satuan
                                                                </span>
                                                                <span className="font-medium">
                                                                    {formatRupiah(
                                                                        price,
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between gap-2">
                                                                <span className="text-base-content/70">
                                                                    Durasi
                                                                </span>
                                                                <span className="font-medium">
                                                                    {form.data
                                                                        .rate_unit ===
                                                                    'day'
                                                                        ? `${days + (policy_day_basis === 'inclusive_days' ? 1 : 0)} hari`
                                                                        : form
                                                                                .data
                                                                                .rate_unit ===
                                                                            'month'
                                                                          ? `${Math.max(1, Math.ceil(days / policy_month_days))} bulan`
                                                                          : '1 tahun'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {(() => {
                                                            const roomPhoto =
                                                                room?.foto ??
                                                                (
                                                                    room as Room & {
                                                                        photos?:
                                                                            | string[]
                                                                            | null;
                                                                    }
                                                                )
                                                                    ?.photos?.[0] ??
                                                                room?.lantai
                                                                    ?.gedung
                                                                    ?.foto ??
                                                                null;

                                                            return (
                                                                <div className="border-base-300 bg-base-100 relative aspect-[16/10] w-full overflow-hidden rounded-xl border">
                                                                    {roomPhoto ? (
                                                                        <img
                                                                            src={`/storage/${roomPhoto}`}
                                                                            alt={`Foto Kamar ${room?.nomor_kamar ?? ''}`}
                                                                            className="h-full w-full object-cover"
                                                                            loading="lazy"
                                                                        />
                                                                    ) : (
                                                                        <div className="text-base-content/35 flex h-full flex-col items-center justify-center gap-1 text-xs">
                                                                            <BedDouble
                                                                                className="size-8"
                                                                                aria-hidden="true"
                                                                            />
                                                                            <span>
                                                                                Foto
                                                                                kamar
                                                                                belum
                                                                                tersedia
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                    <div className="border-base-300 border-t pt-3">
                                                        <span className="text-base-content/70 block text-xs">
                                                            Perkiraan biaya
                                                            hunian
                                                        </span>
                                                        <p className="text-primary mt-0.5 text-2xl font-bold">
                                                            {formatRupiah(
                                                                price *
                                                                    (form.data
                                                                        .rate_unit ===
                                                                    'day'
                                                                        ? days +
                                                                          (policy_day_basis ===
                                                                          'inclusive_days'
                                                                              ? 1
                                                                              : 0)
                                                                        : form
                                                                                .data
                                                                                .rate_unit ===
                                                                            'month'
                                                                          ? Math.max(
                                                                                1,
                                                                                Math.ceil(
                                                                                    days /
                                                                                        policy_month_days,
                                                                                ),
                                                                            )
                                                                          : 1),
                                                            )}
                                                        </p>
                                                        <span className="text-base-content/60 text-xs">
                                                            {form.data
                                                                .rate_unit ===
                                                            'day'
                                                                ? `untuk ${days} hari`
                                                                : form.data
                                                                        .rate_unit ===
                                                                    'month'
                                                                  ? `untuk ${Math.max(1, Math.ceil(days / policy_month_days))} bulan`
                                                                  : 'per tahun'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                                {kipk && (
                                    <div className="border-base-300 bg-base-100 rounded-xl border p-4">
                                        {step === 0
                                            ? 'Pendaftaran KIP-K menggunakan skema tahunan.'
                                            : step === 1
                                              ? 'Kamar dialokasikan otomatis sesuai prioritas gedung.'
                                              : 'Periksa kategori KIP-K dan unggah berkas wajib di bawah sebelum mengajukan pendaftaran.'}
                                    </div>
                                )}
                                {step === 2 && (
                                    <div className="space-y-4">
                                        <div className="border-base-300 bg-base-100 space-y-3 rounded-2xl border p-5 shadow-sm">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="text-primary size-5" />
                                                    <h3 className="text-base font-semibold">
                                                        Unggah Berkas Wajib
                                                        Pendaftaran
                                                    </h3>
                                                </div>
                                                <span className="text-base-content/65 text-xs">
                                                    PDF, JPG, JPEG, atau PNG
                                                    (maks. 5 MB)
                                                </span>
                                            </div>
                                            <div className="space-y-3">
                                                {required_documents.map(
                                                    (kind) => {
                                                        const tpl =
                                                            templates.find(
                                                                (t) =>
                                                                    t.category ===
                                                                        policy_category &&
                                                                    t.kind ===
                                                                        kind,
                                                            );
                                                        const picked =
                                                            selectedDocFiles[
                                                                kind
                                                            ];
                                                        return (
                                                            <div
                                                                key={kind}
                                                                className="border-base-300 bg-base-200/30 space-y-2 rounded-xl border p-3.5"
                                                            >
                                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                                    <span className="text-sm font-medium">
                                                                        {friendlyDocumentLabel(
                                                                            kind,
                                                                        )}
                                                                    </span>
                                                                    {tpl && (
                                                                        <a
                                                                            href={workflow.downloadTemplate.url(
                                                                                [
                                                                                    policy_category,
                                                                                    kind,
                                                                                ],
                                                                            )}
                                                                            className="btn btn-outline btn-xs gap-1"
                                                                        >
                                                                            <Download className="size-3.5" />
                                                                            Unduh
                                                                            Template
                                                                        </a>
                                                                    )}
                                                                </div>
                                                                <input
                                                                    type="file"
                                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                                    aria-label={`Unggah ${friendlyDocumentLabel(kind)}`}
                                                                    className="file-input file-input-bordered file-input-sm w-full"
                                                                    onChange={(
                                                                        e,
                                                                    ) => {
                                                                        const file =
                                                                            e
                                                                                .target
                                                                                .files?.[0];
                                                                        if (
                                                                            !file
                                                                        ) {
                                                                            setSelectedDocFiles(
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
                                                                            setDocFileErrors(
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
                                                                            return;
                                                                        }
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
                                                                            setDocFileErrors(
                                                                                (
                                                                                    prev,
                                                                                ) => ({
                                                                                    ...prev,
                                                                                    [kind]: 'Format harus PDF, JPG, JPEG, atau PNG.',
                                                                                }),
                                                                            );
                                                                            return;
                                                                        }
                                                                        if (
                                                                            file.size >
                                                                            MAX_UPLOAD_BYTES
                                                                        ) {
                                                                            setDocFileErrors(
                                                                                (
                                                                                    prev,
                                                                                ) => ({
                                                                                    ...prev,
                                                                                    [kind]: 'Ukuran file maksimal 5 MB.',
                                                                                }),
                                                                            );
                                                                            return;
                                                                        }
                                                                        setDocFileErrors(
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
                                                                        setSelectedDocFiles(
                                                                            (
                                                                                prev,
                                                                            ) => ({
                                                                                ...prev,
                                                                                [kind]: file,
                                                                            }),
                                                                        );
                                                                    }}
                                                                />
                                                                {picked &&
                                                                    !docFileErrors[
                                                                        kind
                                                                    ] && (
                                                                        <p className="text-primary flex items-center gap-1.5 text-xs">
                                                                            <Upload className="size-3.5" />
                                                                            Siap
                                                                            dikirim:{' '}
                                                                            {
                                                                                picked.name
                                                                            }
                                                                        </p>
                                                                    )}
                                                                {docFileErrors[
                                                                    kind
                                                                ] && (
                                                                    <p className="text-error text-xs">
                                                                        {
                                                                            docFileErrors[
                                                                                kind
                                                                            ]
                                                                        }
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        </div>

                                        {!kipk &&
                                            form.data.funding === 'personal' &&
                                            form.data.rate_unit === 'month' &&
                                            canSelectMonthly && (
                                                <div className="border-base-300 bg-base-100 space-y-3 rounded-2xl border p-5 shadow-sm">
                                                    <h3 className="text-base font-semibold">
                                                        Jenis Pembayaran
                                                    </h3>
                                                    <label className="block space-y-1 text-sm">
                                                        <span>
                                                            Pilihan periode
                                                            pembayaran
                                                        </span>
                                                        <select
                                                            className={
                                                                selectClass
                                                            }
                                                            value={
                                                                form.data
                                                                    .decision_kind
                                                            }
                                                            onChange={(e) =>
                                                                form.setData(
                                                                    'decision_kind',
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                        >
                                                            <option value="full">
                                                                Bayar penuh
                                                                sesuai tagihan
                                                            </option>
                                                            <option value="monthly">
                                                                Pembayaran
                                                                bulanan
                                                            </option>
                                                        </select>
                                                    </label>
                                                    {form.data.decision_kind ===
                                                        'monthly' && (
                                                        <label className="block space-y-1 text-sm">
                                                            <span>
                                                                Catatan
                                                                permohonan
                                                                bulanan
                                                            </span>
                                                            <textarea
                                                                className="textarea textarea-bordered w-full"
                                                                rows={2}
                                                                placeholder="Jelaskan keperluan pembayaran bulanan..."
                                                                value={
                                                                    form.data
                                                                        .decision_reason
                                                                }
                                                                onChange={(e) =>
                                                                    form.setData(
                                                                        'decision_reason',
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                required
                                                            />
                                                        </label>
                                                    )}
                                                </div>
                                            )}
                                    </div>
                                )}
                                {Object.values(form.errors).map((e, i) => (
                                    <p
                                        role="alert"
                                        className="text-error"
                                        key={i}
                                    >
                                        {e}
                                    </p>
                                ))}
                                <div className="border-base-300 flex flex-wrap justify-between gap-3 border-t pt-4">
                                    {step > 0 && (
                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            onClick={() => setStep(step - 1)}
                                        >
                                            Kembali
                                        </button>
                                    )}
                                    {step < 2 ? (
                                        <button
                                            key="step-next"
                                            type="button"
                                            className="btn btn-primary ml-auto"
                                            disabled={
                                                !policy_open ||
                                                !form.data.periode_id ||
                                                (form.data.funding ===
                                                    'sponsor' &&
                                                    !form.data.sponsor_name.trim()) ||
                                                (!kipk &&
                                                    (step === 1
                                                        ? !room || price <= 0
                                                        : [
                                                              'day',
                                                              'month',
                                                          ].includes(
                                                              form.data
                                                                  .rate_unit,
                                                          ) &&
                                                          (!form.data
                                                              .starts_at ||
                                                              !form.data
                                                                  .ends_at ||
                                                              form.data
                                                                  .ends_at <
                                                                  form.data
                                                                      .starts_at)))
                                            }
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setStep(step + 1);
                                            }}
                                        >
                                            {step === 0
                                                ? kipk
                                                    ? 'Lanjut ke alokasi kamar'
                                                    : 'Lanjut ke pilihan kamar'
                                                : 'Lanjut ke upload berkas'}
                                        </button>
                                    ) : (
                                        <button
                                            key="step-submit"
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={
                                                form.processing ||
                                                !policy_open ||
                                                !form.data.periode_id ||
                                                (!kipk &&
                                                    (!room || price <= 0)) ||
                                                required_documents.some(
                                                    (kind) =>
                                                        !selectedDocFiles[kind],
                                                ) ||
                                                Object.values(
                                                    docFileErrors,
                                                ).some(Boolean) ||
                                                (!kipk &&
                                                    form.data.funding ===
                                                        'personal' &&
                                                    form.data.decision_kind !==
                                                        'full' &&
                                                    form.data.decision_reason.trim() ===
                                                        '')
                                            }
                                        >
                                            Ajukan pendaftaran
                                        </button>
                                    )}
                                </div>
                            </form>
                        )}
                    </Card>
                    {confirmOpen && (
                        <Modal
                            open
                            onClose={() =>
                                !form.processing && setConfirmOpen(false)
                            }
                            title="Konfirmasi Pengajuan Pendaftaran"
                        >
                            <div className="space-y-4">
                                <p className="text-sm">
                                    Anda akan mengajukan pendaftaran asrama
                                    untuk periode{' '}
                                    <strong>
                                        {periods.find(
                                            (p) =>
                                                p.id === form.data.periode_id,
                                        )?.nama_periode ?? '-'}
                                    </strong>
                                    {!kipk && room
                                        ? ` · Kamar ${room.nomor_kamar}`
                                        : ''}
                                    {form.data.invitee_nims.length > 0
                                        ? ` · Mengundang teman (${form.data.invitee_nims.join(', ')})`
                                        : ''}{' '}
                                    beserta{' '}
                                    <strong>
                                        {Object.keys(selectedDocFiles).length}{' '}
                                        berkas pendaftaran
                                    </strong>
                                    .{' '}
                                    {kipk
                                        ? 'Setelah diajukan, alokasi kamar dan berkas Anda akan diproses. Verifikasi berkas asli dilakukan petugas saat check-in.'
                                        : 'Setelah diajukan, Anda dapat langsung melanjutkan ke tahap pembayaran tanpa menunggu verifikasi berkas. Verifikasi berkas asli dilakukan petugas saat check-in.'}
                                </p>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        disabled={form.processing}
                                        onClick={() => setConfirmOpen(false)}
                                    >
                                        Periksa Kembali
                                    </Button>
                                    <Button
                                        type="button"
                                        disabled={form.processing}
                                        onClick={() => {
                                            form.transform((d) => ({
                                                ...d,
                                                starts_at: d.starts_at || null,
                                                ends_at: d.ends_at || null,
                                                preferences: kipk
                                                    ? []
                                                    : d.preferences,
                                                files: selectedDocFiles,
                                                decision_kind:
                                                    !kipk &&
                                                    d.funding === 'personal'
                                                        ? d.decision_kind
                                                        : undefined,
                                                decision_reason:
                                                    !kipk &&
                                                    d.funding === 'personal' &&
                                                    d.decision_kind !== 'full'
                                                        ? d.decision_reason.trim()
                                                        : undefined,
                                            }));
                                            form.post(store.url(), {
                                                forceFormData: true,
                                                onSuccess: () => {
                                                    setSelectedDocFiles({});
                                                },
                                                onFinish: () =>
                                                    setConfirmOpen(false),
                                            });
                                        }}
                                    >
                                        {form.processing
                                            ? 'Mengirim...'
                                            : 'Ya, Ajukan Pendaftaran'}
                                    </Button>
                                </div>
                            </div>
                        </Modal>
                    )}
                    <Card className="space-y-3 p-5">
                        <h2 className="font-semibold">Riwayat pendaftaran</h2>
                        {registration.length === 0 ? (
                            <p className="text-base-content/70 text-sm">
                                Belum ada pendaftaran.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {registration.map((r) => (
                                    <div
                                        className="border-base-300 bg-base-100 flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4"
                                        key={r.id}
                                    >
                                        <div className="space-y-1">
                                            <p className="font-medium">
                                                {r.periode?.nama_periode}
                                            </p>
                                            {r.reserved_room && (
                                                <p className="text-base-content/70 text-sm">
                                                    {
                                                        r.reserved_room.lantai
                                                            ?.gedung
                                                            ?.nama_gedung
                                                    }{' '}
                                                    / Kamar{' '}
                                                    {
                                                        r.reserved_room
                                                            .nomor_kamar
                                                    }
                                                </p>
                                            )}
                                            {r.can_invite && (
                                                <div className="pt-1.5">
                                                    <InviteRoommateButton
                                                        registrationId={r.id}
                                                    />
                                                </div>
                                            )}
                                            {r.reservation_expires_at &&
                                                !r.completed_at && (
                                                    <p className="text-base-content/60 text-xs">
                                                        Batas reservasi:{' '}
                                                        {new Date(
                                                            r.reservation_expires_at,
                                                        ).toLocaleString(
                                                            'id-ID',
                                                        )}
                                                    </p>
                                                )}
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <StatusBadge
                                                status={
                                                    r.completed_at
                                                        ? 'aktif'
                                                        : r.status
                                                }
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </>
            )}
        </div>
    );
}
