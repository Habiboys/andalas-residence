import { Link } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    Download,
    FileCheck2,
    Receipt,
    ShieldAlert,
} from 'lucide-react';
import { Card, PageHeader, StatusBadge } from '../../components/ui';
import {
    PaymentAccountsBox,
    type PaymentBankAccountItem,
    type VirtualAccountItem,
} from '../../components/PaymentAccountsBox';
import { PaymentProofForm } from '../../components/PaymentProofForm';
import { ReservationCountdown } from '../../components/ReservationCountdown';
import {
    formatDate,
    formatDateTime,
    formatRupiah,
    mapPaymentStatus,
} from '../../lib/format';
import { bukti as pembayaranBukti } from '@/routes/andalas/pembayaran';
import { document as billingDocument } from '@/routes/andalas/tagihan';
import {
    detailKamar as detailKamarRoute,
    registration as registrationRoute,
    tagihan as tagihanListRoute,
} from '@/routes/mahasiswa';

type InvoiceItemRow = {
    id: string;
    deskripsi: string;
    kuantitas: number;
    harga_satuan: string | number;
    jumlah: string | number;
};

type InstallmentRow = {
    id: string;
    termin_ke: number;
    jatuh_tempo: string;
    jumlah: string | number;
    status: string;
};

type InvoiceDoc = {
    id: string;
    jenis: string;
};

type PaymentRow = {
    id: string;
    kode_transaksi: string;
    jenis_pembayaran?: string;
    nominal: string | number;
    termin_ke?: number | null;
    metode_pembayaran?: string | null;
    rekening_tujuan?: string | null;
    nama_bank?: string | null;
    nomor_rekening_pengirim?: string | null;
    atas_nama_pengirim?: string | null;
    status: string;
    catatan_verifikasi?: string | null;
    tanggal_bayar?: string | null;
    created_at?: string | null;
};

type RegistrationSummary = {
    id: string;
    status: string;
    funding?: string;
    billing_basis?: string;
    rate_unit?: string;
    reservation_expires_at?: string | null;
    completed_at?: string | null;
    ready_at?: string | null;
    payment_unlocked?: boolean;
    blockers?: string[];
    reserved_room?: {
        nomor_kamar?: string;
        lantai?: { gedung?: { nama_gedung?: string } };
    } | null;
    placement?: {
        kamar?: {
            nomor_kamar?: string;
            lantai?: { gedung?: { nama_gedung?: string } };
        };
    } | null;
    periode?: { nama?: string } | null;
};

type InvoiceDetail = {
    id: string;
    nomor: string;
    jenis: string;
    total: string | number;
    total_dibayar: string | number;
    sponsor_total?: string | number;
    sponsor_paid?: string | number;
    status: string;
    jatuh_tempo?: string | null;
    items?: InvoiceItemRow[];
    jadwal_cicilan?: InstallmentRow[];
    dokumen?: InvoiceDoc[];
};

function computeNextInstallment(
    installments: InstallmentRow[],
    totalPaid: number,
): { term: InstallmentRow | null; amountDue: number } {
    const active = [...installments]
        .filter((row) => row.status !== 'diganti')
        .sort((a, b) => a.termin_ke - b.termin_ke);
    let cumulative = 0;
    for (const term of active) {
        cumulative += Number(term.jumlah);
        if (cumulative > totalPaid) {
            return {
                term,
                amountDue: Math.max(cumulative - totalPaid, 0),
            };
        }
    }
    return { term: null, amountDue: 0 };
}

export default function TagihanDetail({
    invoice,
    payments = [],
    virtual_accounts = [],
    payment_accounts = [],
    registration = null,
    registrationUrl,
    invoicesUrl,
}: {
    invoice: InvoiceDetail;
    payments?: PaymentRow[];
    virtual_accounts?: VirtualAccountItem[];
    payment_accounts?: PaymentBankAccountItem[];
    registration?: RegistrationSummary | null;
    registrationUrl?: string;
    invoicesUrl?: string;
}) {
    const total = Number(invoice.total);
    const totalPaid = Number(invoice.total_dibayar);
    const remaining = Math.max(total - totalPaid, 0);

    const installments = invoice.jadwal_cicilan ?? [];
    const { term: nextTerm, amountDue: nextTermDue } = computeNextInstallment(
        installments,
        totalPaid,
    );
    const dueNow = nextTerm ? Math.min(remaining, nextTermDue) : remaining;

    const pendingPayment = payments.find(
        (payment) => payment.status === 'menunggu_verifikasi',
    );
    const latestRejected = !pendingPayment
        ? payments.find((payment) => payment.status === 'ditolak')
        : undefined;

    const isSettled = invoice.status === 'lunas' || remaining <= 0;
    const isCancelled =
        invoice.status === 'batal' || registration?.status === 'cancelled';
    const paymentUnlocked = registration
        ? Boolean(registration.payment_unlocked)
        : true;
    const canUploadProof =
        paymentUnlocked && !pendingPayment && !isSettled && !isCancelled;

    const resolvedRegUrl = registrationUrl ?? registrationRoute.url();
    const resolvedInvoicesUrl = invoicesUrl ?? tagihanListRoute.url();

    const room =
        registration?.placement?.kamar ?? registration?.reserved_room ?? null;
    const deadlineTarget =
        registration?.reservation_expires_at ?? invoice.jatuh_tempo ?? null;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
                {registration && (
                    <Link
                        href={resolvedRegUrl}
                        className="btn btn-ghost btn-sm gap-1.5"
                    >
                        <ArrowLeft className="size-4" />
                        Kembali ke Pendaftaran
                    </Link>
                )}
                <Link
                    href={resolvedInvoicesUrl}
                    className="btn btn-ghost btn-sm gap-1.5"
                >
                    <Receipt className="size-4" />
                    Semua Tagihan
                </Link>
            </div>

            <PageHeader
                title={`Detail Pembayaran · ${invoice.nomor}`}
                subtitle="Periksa rincian tagihan, rekening tujuan transfer resmi asrama, dan status verifikasi pembayaran."
                actions={<StatusBadge status={invoice.status} />}
            />

            {isCancelled ? (
                <div className="alert border-base-300 bg-base-200/70">
                    <ShieldAlert className="size-5 shrink-0" />
                    <div>
                        <p className="font-medium">Tagihan dibatalkan</p>
                        <p className="text-base-content/75 text-xs">
                            Pendaftaran atau tagihan ini telah dibatalkan. Anda
                            dapat membuat pendaftaran baru untuk memilih kamar
                            lain.
                        </p>
                    </div>
                </div>
            ) : isSettled ? (
                <div className="alert alert-success">
                    <CheckCircle2 className="size-5 shrink-0" />
                    <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="font-semibold">
                                Pembayaran Lunas & Terverifikasi
                            </p>
                            <p className="text-xs opacity-90">
                                {registration?.completed_at
                                    ? 'Status penghuni Anda sudah aktif. Silakan lihat detail kamar dan jadwal asrama.'
                                    : 'Seluruh kewajiban tagihan ini telah dikonfirmasi lunas oleh pengelola.'}
                            </p>
                        </div>
                        {registration?.completed_at && (
                            <Link
                                href={detailKamarRoute.url()}
                                className="btn btn-sm bg-base-100 text-base-content hover:bg-base-200 border-0"
                            >
                                Lihat Kamar Saya
                            </Link>
                        )}
                    </div>
                </div>
            ) : pendingPayment ? (
                <div className="border-base-300 border-l-warning bg-base-100 rounded-2xl border border-l-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <Clock className="text-warning mt-0.5 size-6 shrink-0" />
                            <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-base font-semibold">
                                        Menunggu Verifikasi Pengelola
                                    </h2>
                                    <StatusBadge status="menunggu_verifikasi" />
                                </div>
                                <p className="text-base-content/75 text-sm">
                                    Bukti transfer sebesar{' '}
                                    <strong className="tabular-nums">
                                        {formatRupiah(
                                            Number(pendingPayment.nominal),
                                        )}
                                    </strong>{' '}
                                    ({pendingPayment.kode_transaksi}) telah
                                    diterima sistem. Pengelola asrama sedang
                                    mencocokkan mutasi rekening.
                                </p>
                                {pendingPayment.rekening_tujuan && (
                                    <p className="text-base-content/70 text-xs">
                                        Rekening tujuan:{' '}
                                        {pendingPayment.rekening_tujuan}
                                    </p>
                                )}
                                {(pendingPayment.nama_bank ||
                                    pendingPayment.nomor_rekening_pengirim ||
                                    pendingPayment.atas_nama_pengirim) && (
                                    <p className="text-base-content/70 text-xs">
                                        Pengirim:{' '}
                                        {pendingPayment.nama_bank || '-'}{' '}
                                        {pendingPayment.nomor_rekening_pengirim
                                            ? `· ${pendingPayment.nomor_rekening_pengirim}`
                                            : ''}
                                        {pendingPayment.atas_nama_pengirim
                                            ? ` a.n. ${pendingPayment.atas_nama_pengirim}`
                                            : ''}
                                    </p>
                                )}
                                {(pendingPayment.tanggal_bayar ||
                                    pendingPayment.created_at) && (
                                    <p className="text-base-content/70 text-xs">
                                        Waktu transfer:{' '}
                                        {formatDateTime(
                                            pendingPayment.tanggal_bayar ??
                                                pendingPayment.created_at,
                                        )}
                                    </p>
                                )}
                            </div>
                        </div>
                        <a
                            href={pembayaranBukti.url(pendingPayment.id)}
                            className="btn btn-outline btn-sm shrink-0 gap-1.5"
                        >
                            <Download className="size-4" />
                            Unduh Bukti Transfer
                        </a>
                    </div>
                </div>
            ) : !paymentUnlocked && registration ? (
                <div className="border-base-300 border-l-primary bg-base-100 rounded-2xl border border-l-4 p-5">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="text-info mt-0.5 size-6 shrink-0" />
                        <div className="space-y-2">
                            <h2 className="text-base font-semibold">
                                Lengkapi Berkas Pendaftaran Terlebih Dahulu
                            </h2>
                            <p className="text-base-content/80 text-sm">
                                Unggah berkas pendaftaran yang diwajibkan
                                terlebih dahulu agar pembayaran dapat diproses.
                                Verifikasi berkas akan dilakukan petugas saat
                                check-in.
                            </p>
                            {registration.blockers &&
                                registration.blockers.length > 0 && (
                                    <ul className="list-disc space-y-1 pl-5 text-xs">
                                        {registration.blockers.map(
                                            (blocker, idx) => (
                                                <li key={idx}>{blocker}</li>
                                            ),
                                        )}
                                    </ul>
                                )}
                            <Link
                                href={resolvedRegUrl}
                                className="btn btn-primary btn-sm mt-1"
                            >
                                Lengkapi Berkas Pendaftaran
                            </Link>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="border-base-300 bg-base-100 rounded-2xl border p-5 sm:p-6">
                    <div className="grid gap-5 md:grid-cols-12 md:items-center">
                        <div className="space-y-2 md:col-span-7">
                            <div className="text-primary text-xs font-semibold tracking-wide uppercase">
                                Menunggu Pembayaran
                            </div>
                            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                                Selesaikan transfer sesuai tagihan sebelum batas
                                waktu habis
                            </h2>
                            <p className="text-base-content/70 text-sm">
                                Pembayaran otomatis melalui Virtual Account
                                belum tersedia. Transfer dana ke rekening resmi
                                di bawah, lalu unggah bukti transfer Anda untuk
                                diverifikasi pengelola.
                            </p>
                            {latestRejected && (
                                <div className="alert alert-error mt-2 text-xs">
                                    <AlertCircle className="size-4 shrink-0" />
                                    <span>
                                        Bukti pembayaran sebelumnya ditolak:{' '}
                                        <strong>
                                            {latestRejected.catatan_verifikasi ||
                                                'Periksa kembali nominal atau lampiran bukti.'}
                                        </strong>
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="border-base-300 bg-base-200/50 space-y-3 rounded-xl border p-4 md:col-span-5">
                            <div>
                                <div className="text-base-content/65 text-xs">
                                    {nextTerm
                                        ? `Yang Harus Dibayar (Termin ${nextTerm.termin_ke})`
                                        : 'Nominal Harus Dibayar'}
                                </div>
                                <div className="text-primary mt-0.5 text-2xl font-bold tabular-nums">
                                    {formatRupiah(dueNow)}
                                </div>
                            </div>
                            <ReservationCountdown
                                targetIso={deadlineTarget}
                                label="Batas waktu pembayaran"
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-12">
                <div className="space-y-6 lg:col-span-7">
                    <Card className="space-y-4 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-base font-semibold">
                                Rekening Tujuan Transfer
                            </h2>
                            {virtual_accounts.length === 0 && (
                                <span className="badge badge-outline badge-sm">
                                    Transfer Manual + Verifikasi
                                </span>
                            )}
                        </div>
                        <PaymentAccountsBox
                            paymentAccounts={payment_accounts}
                            virtualAccounts={virtual_accounts}
                        />
                    </Card>

                    {canUploadProof && (
                        <Card className="space-y-4 p-5">
                            <h2 className="text-base font-semibold">
                                Unggah Bukti Pembayaran
                            </h2>
                            <PaymentProofForm
                                key={invoice.id}
                                tagihanId={invoice.id}
                                totalRemaining={remaining}
                                dueAmount={dueNow || remaining}
                                terminKe={nextTerm?.termin_ke ?? null}
                                jenisPembayaran={
                                    nextTerm ? 'cicilan' : 'sewa_asrama'
                                }
                                paymentAccounts={payment_accounts}
                            />
                        </Card>
                    )}

                    <Card className="space-y-4 p-5">
                        <h2 className="text-base font-semibold">
                            Rincian Item Tagihan
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="table-sm table">
                                <thead>
                                    <tr>
                                        <th>Deskripsi</th>
                                        <th className="text-right">Qty</th>
                                        <th className="text-right">Satuan</th>
                                        <th className="text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(invoice.items ?? []).length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="text-base-content/60 text-center text-sm"
                                            >
                                                Tagihan sewa asrama (
                                                {invoice.nomor})
                                            </td>
                                        </tr>
                                    ) : (
                                        (invoice.items ?? []).map((item) => (
                                            <tr key={item.id}>
                                                <td>{item.deskripsi}</td>
                                                <td className="text-right tabular-nums">
                                                    {item.kuantitas}
                                                </td>
                                                <td className="text-right tabular-nums">
                                                    {formatRupiah(
                                                        Number(
                                                            item.harga_satuan,
                                                        ),
                                                    )}
                                                </td>
                                                <td className="text-right font-medium tabular-nums">
                                                    {formatRupiah(
                                                        Number(item.jumlah),
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {installments.length > 0 && (
                            <div className="border-base-300 mt-4 border-t pt-4">
                                <h3 className="mb-2 text-sm font-semibold">
                                    Jadwal Cicilan
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="table-sm table">
                                        <thead>
                                            <tr>
                                                <th>Termin</th>
                                                <th>Jatuh Tempo</th>
                                                <th className="text-right">
                                                    Nominal
                                                </th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {installments.map((term) => (
                                                <tr key={term.id}>
                                                    <td>
                                                        Termin {term.termin_ke}
                                                    </td>
                                                    <td>
                                                        {formatDate(
                                                            term.jatuh_tempo,
                                                        )}
                                                    </td>
                                                    <td className="text-right tabular-nums">
                                                        {formatRupiah(
                                                            Number(term.jumlah),
                                                        )}
                                                    </td>
                                                    <td>
                                                        <StatusBadge
                                                            status={term.status}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>

                <div className="space-y-6 lg:col-span-5">
                    <Card className="space-y-4 p-5">
                        <h2 className="text-base font-semibold">
                            Ringkasan Tagihan
                        </h2>
                        <dl className="divide-base-200 divide-y text-sm">
                            <div className="flex items-center justify-between py-2.5">
                                <dt className="text-base-content/70">
                                    Nomor Invoice
                                </dt>
                                <dd className="font-mono font-medium">
                                    {invoice.nomor}
                                </dd>
                            </div>
                            {registration && (
                                <div className="flex items-center justify-between gap-3 py-2.5">
                                    <dt className="text-base-content/70">
                                        Kamar & Periode
                                    </dt>
                                    <dd className="text-right font-medium">
                                        {room?.lantai?.gedung?.nama_gedung ??
                                            '-'}{' '}
                                        · Kamar {room?.nomor_kamar ?? '-'}
                                        {registration.periode?.nama
                                            ? ` (${registration.periode.nama})`
                                            : ''}
                                    </dd>
                                </div>
                            )}
                            <div className="flex items-center justify-between py-2.5">
                                <dt className="text-base-content/70">
                                    Total Tagihan
                                </dt>
                                <dd className="font-semibold tabular-nums">
                                    {formatRupiah(total)}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between py-2.5">
                                <dt className="text-base-content/70">
                                    Terverifikasi Dibayar
                                </dt>
                                <dd className="text-success font-semibold tabular-nums">
                                    {formatRupiah(totalPaid)}
                                </dd>
                            </div>
                            <div className="flex items-center justify-between py-2.5">
                                <dt className="font-semibold">Sisa Tagihan</dt>
                                <dd className="text-primary text-base font-bold tabular-nums">
                                    {formatRupiah(remaining)}
                                </dd>
                            </div>
                            {invoice.jatuh_tempo && (
                                <div className="flex items-center justify-between py-2.5">
                                    <dt className="text-base-content/70">
                                        Jatuh Tempo
                                    </dt>
                                    <dd>{formatDate(invoice.jatuh_tempo)}</dd>
                                </div>
                            )}
                        </dl>

                        {(invoice.dokumen ?? []).length > 0 && (
                            <div className="border-base-300 mt-4 space-y-2 border-t pt-4">
                                <div className="text-base-content/65 text-xs font-semibold tracking-wide uppercase">
                                    Dokumen Resmi
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(invoice.dokumen ?? []).map((doc) => (
                                        <a
                                            key={doc.id}
                                            href={billingDocument.url(doc.id)}
                                            className="btn btn-outline btn-xs gap-1.5"
                                        >
                                            <Download className="size-3.5" />
                                            {doc.jenis === 'invoice'
                                                ? 'Unduh Invoice'
                                                : doc.jenis ===
                                                    'residence_receipt'
                                                  ? 'Kwitansi Hunian'
                                                  : 'Kwitansi Pembayaran'}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>

                    <Card className="space-y-4 p-5">
                        <h2 className="text-base font-semibold">
                            Riwayat Konfirmasi Pembayaran
                        </h2>
                        {payments.length === 0 ? (
                            <div className="text-base-content/65 flex items-center gap-2 py-3 text-sm">
                                <FileCheck2 className="size-4 shrink-0" />
                                <span>
                                    Belum ada bukti pembayaran yang diunggah
                                    untuk tagihan ini.
                                </span>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {payments.map((payment) => (
                                    <div
                                        key={payment.id}
                                        className="border-base-300 rounded-xl border p-3.5 text-sm"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <div className="text-base-content/70 font-mono text-xs">
                                                    {payment.kode_transaksi}
                                                </div>
                                                <div className="font-semibold tabular-nums">
                                                    {formatRupiah(
                                                        Number(payment.nominal),
                                                    )}
                                                </div>
                                            </div>
                                            <StatusBadge
                                                status={mapPaymentStatus(
                                                    payment.status,
                                                )}
                                            />
                                        </div>
                                        <div className="text-base-content/70 mt-1.5 space-y-0.5 text-xs">
                                            <div>
                                                Waktu transfer:{' '}
                                                {formatDateTime(
                                                    payment.tanggal_bayar ??
                                                        payment.created_at,
                                                )}
                                            </div>
                                            {payment.rekening_tujuan && (
                                                <div>
                                                    Tujuan:{' '}
                                                    {payment.rekening_tujuan}
                                                </div>
                                            )}
                                            {(payment.nama_bank ||
                                                payment.nomor_rekening_pengirim ||
                                                payment.atas_nama_pengirim) && (
                                                <div>
                                                    Pengirim:{' '}
                                                    {payment.nama_bank || '-'}{' '}
                                                    {payment.nomor_rekening_pengirim
                                                        ? `· ${payment.nomor_rekening_pengirim}`
                                                        : ''}{' '}
                                                    {payment.atas_nama_pengirim
                                                        ? `(${payment.atas_nama_pengirim})`
                                                        : ''}
                                                </div>
                                            )}
                                            {payment.catatan_verifikasi && (
                                                <div className="text-base-content bg-base-200 mt-1 rounded px-2 py-1">
                                                    Catatan:{' '}
                                                    {payment.catatan_verifikasi}
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-2.5 flex justify-end">
                                            <a
                                                href={pembayaranBukti.url(
                                                    payment.id,
                                                )}
                                                className="btn btn-ghost btn-xs gap-1"
                                            >
                                                <Download className="size-3.5" />
                                                Unduh Bukti
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
