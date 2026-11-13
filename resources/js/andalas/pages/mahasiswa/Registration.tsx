import { useState } from 'react';
import RoomCatalog, { type CatalogRoom } from '../../components/RoomCatalog';
import RoomInvitations, {
    InviteRoommateButton,
    type RoomInvitation,
} from '../../components/RoomInvitations';
import { Link, useForm } from '@inertiajs/react';
import {
    Button,
    Card,
    Modal,
    PageHeader,
    inputClass,
    StatusBadge,
} from '../../components/ui';
import { store } from '@/routes/andalas/registrations';
import { tagihan } from '@/routes/mahasiswa';
import { formatRupiah } from '../../lib/format';
type Room = CatalogRoom;
type Props = {
    housingProfileReady?: boolean;
    housingProfileUrl?: string;
    housingStatusUrl?: string;
    policy_open?: boolean;
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
    room_invitations?: RoomInvitation[];
    registration?: Array<{
        id: string;
        status: string;
        can_invite?: boolean;
        reserved_room?: {
            nomor_kamar: string;
            lantai?: { gedung?: { nama_gedung: string } };
        };
        tagihan_id?: string | null;
        is_kipk?: boolean;
        funding?: string;
        completed_at?: string;
        reservation_expires_at?: string;
        periode?: { nama_periode: string };
    }>;
};
export default function Registration({
    housingProfileReady = true,
    housingProfileUrl,
    housingStatusUrl,
    policy_open = false,
    policy_monthly_allowed = true,
    policy_month_days = 30,
    policy_day_basis = 'nights',
    initialUser,
    periode = [],
    rooms = [],
    rates = [],
    registration = [],
    room_invitations = [],
}: Props) {
    const [step, setStep] = useState(0);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [tab, setTab] = useState<'registration' | 'invitations'>(
        'registration',
    );
    const periods = periode.filter((p) => p.status === 'aktif');
    const kipk = initialUser?.is_kipk === true;
    const pending = registration.some(
        (r) => !r.completed_at && !['draft', 'rejected'].includes(r.status),
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
    return (
        <div className="space-y-5">
            <PageHeader
                title="Pendaftaran Asrama"
                subtitle="Pilih hunian, lengkapi administrasi, lalu lakukan check-in fisik dan serah kunci bersama petugas."
            />
            {!pending && registration.length > 0 && housingStatusUrl && (
                <Link
                    href={housingStatusUrl}
                    className="btn btn-outline btn-sm"
                >
                    Lihat status dan dokumen pengajuan
                </Link>
            )}
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
                                        !['draft', 'rejected'].includes(
                                            r.status,
                                        ),
                                );
                                const waitingKipkAllocation = registration.some(
                                    (r) =>
                                        !r.completed_at &&
                                        !['draft', 'rejected'].includes(
                                            r.status,
                                        ) &&
                                        r.is_kipk &&
                                        r.funding === 'personal' &&
                                        !r.tagihan_id,
                                );

                                return (
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-5">
                                        <div className="space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="badge badge-success font-medium">
                                                    Anda Sudah Terdaftar
                                                </span>
                                                <span className="text-base-content/70 text-xs font-medium">
                                                    {initialUser?.student_stage}
                                                </span>
                                            </div>
                                            <h2 className="text-lg font-semibold text-emerald-950">
                                                Pengajuan Pendaftaran Asrama
                                                Aktif
                                            </h2>
                                            {currentReg && (
                                                <p className="text-sm text-emerald-900/90">
                                                    Periode{' '}
                                                    <strong>
                                                        {
                                                            currentReg.periode
                                                                ?.nama_periode
                                                        }
                                                    </strong>
                                                    {currentReg.reserved_room && (
                                                        <>
                                                            {' '}
                                                            ·{' '}
                                                            <strong>
                                                                {
                                                                    currentReg
                                                                        .reserved_room
                                                                        .lantai
                                                                        ?.gedung
                                                                        ?.nama_gedung
                                                                }{' '}
                                                                / Kamar{' '}
                                                                {
                                                                    currentReg
                                                                        .reserved_room
                                                                        .nomor_kamar
                                                                }
                                                            </strong>
                                                        </>
                                                    )}
                                                </p>
                                            )}
                                            <p className="text-sm text-emerald-900/80">
                                                Pendaftaran sedang diproses.{' '}
                                                {waitingKipkAllocation
                                                    ? 'Menunggu alokasi kamar sesuai prioritas dan kapasitas. Tagihan diterbitkan setelah kamar dialokasikan.'
                                                    : 'Silakan lengkapi dokumen persyaratan dan pilihan pembiayaan atau selesaikan pembayaran tagihan Anda.'}
                                            </p>
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2.5">
                                            {housingStatusUrl && (
                                                <Link
                                                    href={housingStatusUrl}
                                                    className="btn btn-primary btn-sm"
                                                >
                                                    Lengkapi Dokumen &amp;
                                                    Pembiayaan
                                                </Link>
                                            )}
                                            {!waitingKipkAllocation && (
                                                <Link
                                                    className="btn btn-outline btn-sm bg-base-100"
                                                    href={tagihan.url()}
                                                >
                                                    Lihat tagihan dan bayar
                                                </Link>
                                            )}
                                        </div>
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
                                    setConfirmOpen(true);
                                }}
                            >
                                <ol
                                    className="border-base-300 bg-base-100 grid grid-cols-1 gap-2 rounded-2xl border p-3 text-sm sm:grid-cols-3"
                                    aria-label="Tahapan pendaftaran"
                                >
                                    {[
                                        'Rencana hunian',
                                        kipk ? 'Alokasi kamar' : 'Pilih kamar',
                                        'Review pengajuan',
                                    ].map((label, index) => (
                                        <li
                                            key={label}
                                            aria-current={
                                                step === index
                                                    ? 'step'
                                                    : undefined
                                            }
                                            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors ${
                                                step === index
                                                    ? 'bg-primary/10 text-primary font-semibold'
                                                    : step > index
                                                      ? 'bg-emerald-50 text-emerald-700 font-medium dark:bg-emerald-950/30 dark:text-emerald-300'
                                                      : 'text-base-content/60'
                                            }`}
                                        >
                                            <span
                                                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                                    step === index
                                                        ? 'bg-primary text-primary-content'
                                                        : step > index
                                                          ? 'bg-emerald-600 text-white'
                                                          : 'bg-base-200 text-base-content/70'
                                                }`}
                                            >
                                                {index + 1}
                                            </span>
                                            <span>{label}</span>
                                        </li>
                                    ))}
                                </ol>
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
                                                onSelect={(id) =>
                                                    form.setData(
                                                        'preferences',
                                                        [
                                                            {
                                                                kamar_id: id,
                                                                notes: '',
                                                            },
                                                        ],
                                                    )
                                                }
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
                                                                Skema &amp; dasar tarif
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
                                                                Periode / tanggal
                                                            </span>
                                                            <strong>
                                                                {form.data
                                                                    .starts_at &&
                                                                form.data
                                                                    .ends_at
                                                                    ? `${form.data.starts_at} s/d ${form.data.ends_at}`
                                                                    : periods[0]
                                                                          ?.nama_periode ??
                                                                      'Periode aktif'}
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
                                                        Alokasi dipertahankan
                                                        selama proses
                                                        administrasi berjalan.
                                                        Hunian belum aktif
                                                        sampai check-in fisik
                                                        dan serah kunci.
                                                    </p>
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
                                              : 'Periksa kategori KIP-K sebelum mengajukan pendaftaran.'}
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
                                                : 'Review pengajuan'}
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
                                                (!kipk && (!room || price <= 0))
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
                                    . Setelah dikirim, alokasi kamar akan segera
                                    diproses dan Anda dapat melengkapi dokumen
                                    resmi.
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
                                            }));
                                            form.post(store.url(), {
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
                                            {housingStatusUrl &&
                                                !r.completed_at && (
                                                    <Link
                                                        href={housingStatusUrl}
                                                        className="link text-primary text-xs font-medium"
                                                    >
                                                        Dokumen &amp; Pembiayaan
                                                        →
                                                    </Link>
                                                )}
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
