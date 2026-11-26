import { Head, Link, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    BedDouble,
    CheckCircle2,
    Clock,
    Upload,
} from 'lucide-react';
import LandingLayout from '@/andalas/components/LandingLayout';
import {
    PaymentAccountsBox,
    type PaymentBankAccountItem,
} from '@/andalas/components/PaymentAccountsBox';
import { FormField, inputClass, selectClass } from '@/andalas/components/ui';
import { formatRupiah } from '@/andalas/lib/format';
import '@/andalas/index.css';

type BookingData = {
    token: string;
    number: string;
    kind: string;
    institution: string;
    email: string;
    phone: string | null;
    applicant_name: string;
    identity_number: string;
    starts_at: string | null;
    ends_at: string | null;
    rate_unit: string;
    allocation_status: string;
    status: string;
    reservation_expires_at: string | null;
    expired: boolean;
    room: {
        nomor_kamar: string;
        tipe_kamar: string;
        gedung: string;
        lantai: string;
    } | null;
    invoice: {
        id: string;
        nomor: string;
        total: number;
        total_dibayar: number;
        remaining: number;
        status: string;
        items: Array<{
            deskripsi: string;
            kuantitas: number;
            harga_satuan: number;
            subtotal: number;
        }>;
        payments: Array<{
            id: string;
            kode_transaksi: string;
            nominal: number;
            status: string;
            rekening_tujuan: string | null;
            created_at: string | null;
        }>;
    } | null;
};

export default function PengajuanHunianStatus({
    booking,
    paymentAccounts = [],
}: {
    booking: BookingData;
    paymentAccounts?: PaymentBankAccountItem[];
}) {
    const activeAccounts = paymentAccounts.filter(
        (acc) => acc.is_active !== false,
    );
    const hasPendingProof = Boolean(
        booking.invoice?.payments.some(
            (p) => p.status === 'menunggu_verifikasi',
        ),
    );
    const isPaid =
        booking.invoice?.status === 'lunas' ||
        (booking.invoice !== null && booking.invoice.remaining <= 0);
    const canUploadProof =
        !booking.expired &&
        !isPaid &&
        !hasPendingProof &&
        activeAccounts.length > 0;

    const form = useForm<{
        payment_bank_account_id: string;
        nama_bank: string;
        nomor_rekening_pengirim: string;
        atas_nama_pengirim: string;
        tanggal_bayar: string;
        bukti_transfer: File | null;
    }>({
        payment_bank_account_id: activeAccounts[0]?.id ?? '',
        nama_bank: '',
        nomor_rekening_pengirim: '',
        atas_nama_pengirim: booking.applicant_name,
        tanggal_bayar: '',
        bukti_transfer: null,
    });

    const submitProof = (event: React.FormEvent) => {
        event.preventDefault();
        form.post(`/pengajuan-hunian/${booking.token}/bukti-bayar`, {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title={`Status Pengajuan ${booking.number}`} />
            <LandingLayout active="beranda">
                <section className="bg-base-200/40 pt-28 pb-16 md:pt-32 md:pb-24">
                    <div className="mx-auto max-w-4xl space-y-6 px-4 md:px-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-primary text-xs font-bold tracking-[0.16em] uppercase">
                                    {booking.kind === 'summer_course'
                                        ? 'Summer Course / Kegiatan'
                                        : 'Sewa Umum / Harian'}
                                </p>
                                <h1 className="font-display mt-1 text-2xl font-bold md:text-3xl">
                                    Ringkasan Pemesanan &amp; Tagihan
                                </h1>
                                <p className="text-muted mt-1 text-sm">
                                    Nomor Pengajuan:{' '}
                                    <strong className="font-mono">
                                        {booking.number}
                                    </strong>{' '}
                                    · Simpan tautan halaman ini untuk memantau
                                    status pembayaran Anda.
                                </p>
                            </div>
                            <span
                                className={`badge badge-lg ${
                                    isPaid
                                        ? 'badge-success'
                                        : hasPendingProof
                                          ? 'badge-info'
                                          : booking.expired
                                            ? 'badge-error'
                                            : 'badge-warning'
                                }`}
                            >
                                {isPaid
                                    ? 'Lunas · Terkonfirmasi'
                                    : hasPendingProof
                                      ? 'Bukti Diterima · Menunggu Verifikasi Bank'
                                      : booking.expired
                                        ? 'Reservasi Kedaluwarsa'
                                        : 'Kamar Ditahan · Menunggu Pembayaran'}
                            </span>
                        </div>

                        <div className="border-base-300 bg-base-100 grid gap-6 rounded-2xl border p-6 md:grid-cols-2">
                            <div className="space-y-2 text-sm">
                                <p className="text-muted text-xs font-semibold uppercase">
                                    Data Pemohon
                                </p>
                                <p className="text-base font-bold">
                                    {booking.applicant_name}
                                </p>
                                <p className="text-muted">
                                    Identitas: {booking.identity_number}
                                </p>
                                <p className="text-muted">
                                    Instansi: {booking.institution}
                                </p>
                                <p className="text-muted">
                                    Kontak: {booking.email}
                                    {booking.phone ? ` · ${booking.phone}` : ''}
                                </p>
                            </div>

                            <div className="space-y-2 text-sm">
                                <p className="text-muted text-xs font-semibold uppercase">
                                    Kamar Direservasi
                                </p>
                                {booking.room ? (
                                    <>
                                        <p className="flex items-center gap-2 text-base font-bold">
                                            <BedDouble className="text-primary size-4" />
                                            {booking.room.gedung} · Kamar{' '}
                                            {booking.room.nomor_kamar}
                                        </p>
                                        <p className="text-muted">
                                            {booking.room.lantai} · Tipe{' '}
                                            {booking.room.tipe_kamar}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-muted">
                                        Menunggu alokasi kamar.
                                    </p>
                                )}
                                <p className="text-muted">
                                    Masa tinggal: {booking.starts_at} s/d{' '}
                                    {booking.ends_at}
                                </p>
                                {booking.reservation_expires_at &&
                                    !isPaid &&
                                    !hasPendingProof && (
                                        <p className="text-warning flex items-center gap-1.5 text-xs font-medium">
                                            <Clock className="size-3.5" />
                                            Batas waktu unggah bukti:{' '}
                                            {new Date(
                                                booking.reservation_expires_at,
                                            ).toLocaleString('id-ID')}
                                        </p>
                                    )}
                            </div>
                        </div>

                        {booking.invoice && (
                            <div className="border-base-300 bg-base-100 space-y-4 rounded-2xl border p-6">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h2 className="text-lg font-bold">
                                            Rincian Tagihan
                                        </h2>
                                        <p className="text-muted font-mono text-xs">
                                            No. Invoice: {booking.invoice.nomor}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-muted text-xs">
                                            Total Tagihan
                                        </p>
                                        <p className="text-primary text-2xl font-bold">
                                            {formatRupiah(
                                                booking.invoice.total,
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="table-sm table w-full">
                                        <thead className="bg-base-200/70">
                                            <tr>
                                                <th>Uraian</th>
                                                <th className="text-right">
                                                    Qty
                                                </th>
                                                <th className="text-right">
                                                    Tarif
                                                </th>
                                                <th className="text-right">
                                                    Subtotal
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {booking.invoice.items.map(
                                                (item, idx) => (
                                                    <tr key={idx}>
                                                        <td>
                                                            {item.deskripsi}
                                                        </td>
                                                        <td className="text-right">
                                                            {item.kuantitas}
                                                        </td>
                                                        <td className="text-right whitespace-nowrap">
                                                            {formatRupiah(
                                                                item.harga_satuan,
                                                            )}
                                                        </td>
                                                        <td className="text-right font-semibold whitespace-nowrap">
                                                            {formatRupiah(
                                                                item.subtotal,
                                                            )}
                                                        </td>
                                                    </tr>
                                                ),
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <PaymentAccountsBox
                                    paymentAccounts={paymentAccounts}
                                />
                            </div>
                        )}

                        {hasPendingProof && (
                            <div className="alert alert-info text-sm">
                                <CheckCircle2 className="size-5 shrink-0" />
                                <div>
                                    <p className="font-semibold">
                                        Bukti pembayaran telah diterima!
                                    </p>
                                    <p className="text-xs opacity-90">
                                        Kamar Anda sudah diamankan secara
                                        administratif sambil menunggu verifikasi
                                        dana masuk oleh bagian keuangan / DPUB.
                                    </p>
                                </div>
                            </div>
                        )}

                        {canUploadProof && (
                            <div className="border-base-300 bg-base-100 space-y-4 rounded-2xl border p-6">
                                <h2 className="text-lg font-bold">
                                    Unggah Bukti Pembayaran
                                </h2>
                                {Object.values(
                                    form.errors as Record<
                                        string,
                                        string | undefined
                                    >,
                                ).find(Boolean) && (
                                    <div
                                        role="alert"
                                        className="alert alert-error text-sm"
                                    >
                                        <AlertCircle className="size-4 shrink-0" />
                                        <span>
                                            {Object.values(
                                                form.errors as Record<
                                                    string,
                                                    string | undefined
                                                >,
                                            ).find(Boolean)}
                                        </span>
                                    </div>
                                )}
                                <form
                                    onSubmit={submitProof}
                                    className="grid gap-4 sm:grid-cols-2"
                                >
                                    <div className="sm:col-span-2">
                                        <FormField label="Rekening Tujuan Transfer">
                                            <select
                                                className={selectClass}
                                                value={
                                                    form.data
                                                        .payment_bank_account_id
                                                }
                                                onChange={(e) =>
                                                    form.setData(
                                                        'payment_bank_account_id',
                                                        e.target.value,
                                                    )
                                                }
                                                required
                                            >
                                                {activeAccounts.map((acc) => (
                                                    <option
                                                        key={acc.id}
                                                        value={acc.id}
                                                    >
                                                        {acc.bank_name} ·{' '}
                                                        {acc.account_number}{' '}
                                                        (a.n. {acc.account_name}
                                                        )
                                                    </option>
                                                ))}
                                            </select>
                                        </FormField>
                                    </div>
                                    <FormField label="Bank Pengirim">
                                        <input
                                            required
                                            className={inputClass}
                                            placeholder="Contoh: BNI / BRI / Mandiri / Nagari"
                                            value={form.data.nama_bank}
                                            onChange={(e) =>
                                                form.setData(
                                                    'nama_bank',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </FormField>
                                    <FormField label="Nomor Rekening Pengirim">
                                        <input
                                            required
                                            className={inputClass}
                                            value={
                                                form.data
                                                    .nomor_rekening_pengirim
                                            }
                                            onChange={(e) =>
                                                form.setData(
                                                    'nomor_rekening_pengirim',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </FormField>
                                    <FormField label="Atas Nama Pengirim">
                                        <input
                                            required
                                            className={inputClass}
                                            value={form.data.atas_nama_pengirim}
                                            onChange={(e) =>
                                                form.setData(
                                                    'atas_nama_pengirim',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </FormField>
                                    <FormField label="Tanggal & Jam Transfer">
                                        <input
                                            required
                                            type="datetime-local"
                                            className={inputClass}
                                            value={form.data.tanggal_bayar}
                                            onChange={(e) =>
                                                form.setData(
                                                    'tanggal_bayar',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </FormField>
                                    <div className="sm:col-span-2">
                                        <FormField label="File Bukti Transfer (PDF/JPG/PNG, maks. 5 MB)">
                                            <input
                                                required
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                className="file-input file-input-bordered w-full"
                                                onChange={(e) =>
                                                    form.setData(
                                                        'bukti_transfer',
                                                        e.target.files?.[0] ??
                                                            null,
                                                    )
                                                }
                                            />
                                        </FormField>
                                    </div>
                                    <div className="flex justify-end sm:col-span-2">
                                        <button
                                            type="submit"
                                            disabled={form.processing}
                                            className="btn btn-primary gap-2"
                                        >
                                            <Upload className="size-4" />
                                            {form.processing
                                                ? 'Mengunggah...'
                                                : 'Kirim Bukti Pembayaran'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="pt-2">
                            <Link href="/" className="btn btn-outline btn-sm">
                                Kembali ke Beranda
                            </Link>
                        </div>
                    </div>
                </section>
            </LandingLayout>
        </>
    );
}
