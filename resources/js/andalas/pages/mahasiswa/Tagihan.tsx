import { useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    PageHeader,
    Card,
    StatCard,
    StatusBadge,
    DataTable,
    Modal,
    type DataColumn,
} from '../../components/ui';
import {
    ArrowRight,
    CreditCard,
    Download,
    Receipt,
    Wallet,
} from 'lucide-react';
import { document as billingDocument } from '@/routes/andalas/tagihan';
import { show as tagihanShow } from '@/routes/mahasiswa/tagihan';
import {
    PaymentAccountsBox,
    type PaymentBankAccountItem,
} from '../../components/PaymentAccountsBox';
import { PaymentProofForm } from '../../components/PaymentProofForm';
import { formatRupiah, mapPaymentStatus } from '../../lib/format';

type Invoice = {
    id: string;
    nomor: string;
    status: string;
    total: string;
    total_dibayar: string;
    amount_due_now?: string;
    payment_unlocked?: boolean;
    jadwal_cicilan: Array<{
        termin_ke: number;
        jumlah: string;
        jatuh_tempo: string;
    }>;
    dokumen: Array<{ id: string; jenis: string }>;
};
type Payment = {
    id: string;
    nominal?: number;
    status?: string;
    jenis_pembayaran?: string;
    catatan_verifikasi?: string | null;
    created_at?: string;
};

function amountDue(invoice: Invoice): number {
    if (invoice.amount_due_now !== null && invoice.amount_due_now !== undefined)
        return Math.min(
            Number(invoice.amount_due_now),
            Number(invoice.total) - Number(invoice.total_dibayar),
        );
    let cumulative = 0;
    for (const term of invoice.jadwal_cicilan
        .slice()
        .sort((a, b) => a.termin_ke - b.termin_ke)) {
        cumulative += Number(term.jumlah);
        if (cumulative > Number(invoice.total_dibayar))
            return cumulative - Number(invoice.total_dibayar);
    }
    return Math.max(0, Number(invoice.total) - Number(invoice.total_dibayar));
}

function nextInstallmentDue(invoice: Invoice): string | null {
    let cumulative = 0;
    for (const term of invoice.jadwal_cicilan
        .slice()
        .sort((a, b) => a.termin_ke - b.termin_ke)) {
        cumulative += Number(term.jumlah);
        if (cumulative > Number(invoice.total_dibayar)) {
            return term.jatuh_tempo;
        }
    }

    return null;
}

export default function Tagihan({
    pembayaran = [],
    billing = [],
    virtual_accounts = [],
    payment_accounts = [],
}: {
    pembayaran?: Payment[];
    billing?: Invoice[];
    virtual_accounts?: Array<{
        bank: string;
        nomor: string;
        atas_nama: string;
    }>;
    payment_accounts?: PaymentBankAccountItem[];
}) {
    const [selected, setSelected] = useState<Invoice | null>(null);
    const invoices = billing.filter((invoice) => invoice.status !== 'batal');
    const total = invoices.reduce(
        (sum, invoice) => sum + Number(invoice.total),
        0,
    );
    const paid = invoices.reduce(
        (sum, invoice) => sum + Number(invoice.total_dibayar),
        0,
    );
    function pay(invoice: Invoice) {
        setSelected(invoice);
    }
    const invoiceRows = billing.map((invoice) => ({
        id: invoice.id,
        invoice,
        nomor: invoice.nomor,
        status: invoice.status,
        total: Number(invoice.total),
        paid: Number(invoice.total_dibayar),
        remaining: Math.max(
            0,
            Number(invoice.total) - Number(invoice.total_dibayar),
        ),
        installments: invoice.jadwal_cicilan.length,
        next_due: nextInstallmentDue(invoice),
    }));
    const invoiceColumns: DataColumn<(typeof invoiceRows)[number]>[] = [
        { key: 'nomor', label: 'Nomor invoice' },
        {
            key: 'status',
            label: 'Status',
            filter: {
                type: 'select',
                options: [
                    { value: 'belum_lunas', label: 'Belum lunas' },
                    { value: 'lunas', label: 'Lunas' },
                    { value: 'batal', label: 'Batal' },
                ],
            },
            render: (row) => <StatusBadge status={row.status} />,
        },
        {
            key: 'total',
            label: 'Total',
            render: (row) => formatRupiah(row.total),
        },
        {
            key: 'paid',
            label: 'Dibayar',
            render: (row) => formatRupiah(row.paid),
        },
        {
            key: 'remaining',
            label: 'Sisa',
            render: (row) => formatRupiah(row.remaining),
        },
        {
            key: 'installments',
            label: 'Cicilan',
            render: (row) =>
                row.installments
                    ? `${row.installments} termin${row.next_due ? ` · berikutnya ${row.next_due.slice(0, 10)}` : ''}`
                    : 'Tanpa cicilan',
        },
        {
            key: 'aksi',
            label: 'Aksi',
            action: true,
            render: ({ invoice, remaining: balance }) => (
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {invoice.dokumen.map((document) => (
                        <a
                            className="btn btn-ghost btn-xs btn-square"
                            key={document.id}
                            href={billingDocument.url({
                                document: document.id,
                            })}
                            aria-label={`Unduh ${document.jenis}`}
                            title={
                                document.jenis === 'invoice'
                                    ? 'Unduh invoice'
                                    : document.jenis === 'residence_receipt'
                                      ? 'Unduh kwitansi hunian'
                                      : 'Unduh kwitansi pembayaran'
                            }
                        >
                            <Download className="size-4" aria-hidden="true" />
                        </a>
                    ))}
                    <Link
                        href={tagihanShow.url(invoice.id)}
                        className={`btn btn-xs gap-1 ${
                            balance > 0 &&
                            invoice.status !== 'batal' &&
                            invoice.payment_unlocked !== false
                                ? 'btn-primary'
                                : 'btn-ghost'
                        }`}
                    >
                        <span>
                            {balance > 0 &&
                            invoice.status !== 'batal' &&
                            invoice.payment_unlocked !== false
                                ? 'Detail & Bayar'
                                : 'Detail'}
                        </span>
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                    {balance > 0 &&
                        invoice.status !== 'batal' &&
                        invoice.payment_unlocked !== false && (
                            <button
                                type="button"
                                className="btn btn-ghost btn-xs btn-square"
                                onClick={() => pay(invoice)}
                                aria-label={`Bayar cepat ${invoice.nomor}`}
                                title="Unggah bukti cepat"
                            >
                                <CreditCard
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </button>
                        )}
                </div>
            ),
        },
    ];
    return (
        <div className="space-y-4">
            <PageHeader
                title="Tagihan & Pembayaran"
                subtitle="Invoice dan sisa kewajiban Anda, tujuan transfer resmi, serta detail verifikasi pembayaran."
            />
            {(total - paid > 0 ||
                payment_accounts.length > 0 ||
                virtual_accounts.length > 0) && (
                <Card className="space-y-3 p-4 md:p-5">
                    <h2 className="text-base font-semibold">
                        Tujuan Pembayaran Resmi
                    </h2>
                    <PaymentAccountsBox
                        paymentAccounts={payment_accounts}
                        virtualAccounts={virtual_accounts}
                    />
                </Card>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                    label="Total Tagihan"
                    value={formatRupiah(total)}
                    icon={<Receipt className="size-5" aria-hidden="true" />}
                />
                <StatCard
                    label="Sudah Dibayar"
                    value={formatRupiah(paid)}
                    color="green"
                    icon={<Wallet className="size-5" aria-hidden="true" />}
                />
                <StatCard
                    label="Sisa Tagihan"
                    value={formatRupiah(Math.max(0, total - paid))}
                    color={total - paid > 0 ? 'gold' : 'green'}
                    icon={<CreditCard className="size-5" aria-hidden="true" />}
                />
            </div>
            <section className="space-y-3" aria-labelledby="invoice-saya">
                <div>
                    <h2 id="invoice-saya" className="text-lg font-semibold">
                        Invoice saya
                    </h2>
                    <p className="text-base-content/60 text-sm">
                        Lihat sisa tagihan, unduh dokumen, atau kirim bukti
                        pembayaran.
                    </p>
                </div>
                <DataTable
                    columns={invoiceColumns}
                    data={invoiceRows}
                    searchKeys={['nomor', 'status']}
                    searchPlaceholder="Cari nomor invoice"
                    defaultPerPage={10}
                    emptyMessage="Belum ada invoice. Invoice hunian diterbitkan saat pendaftaran asrama."
                />
            </section>
            {selected && (
                <Modal
                    open
                    onClose={() => setSelected(null)}
                    title={`Konfirmasi pembayaran ${selected.nomor}`}
                    width="max-w-xl"
                >
                    <div className="space-y-4">
                        <p className="text-sm">
                            Lampirkan bukti pembayaran sesuai petunjuk admin
                            layanan. Untuk cicilan, pastikan jadwal termin telah
                            disetujui sebelum pembayaran pertama.
                        </p>
                        <PaymentAccountsBox
                            paymentAccounts={payment_accounts}
                            virtualAccounts={virtual_accounts}
                            compact
                        />
                        {selected.jadwal_cicilan.length > 0 && (
                            <div className="border-base-300 space-y-1 rounded-lg border p-3 text-xs">
                                <p className="font-semibold">
                                    Jadwal Termin Aktif:
                                </p>
                                {selected.jadwal_cicilan
                                    .slice()
                                    .sort((a, b) => a.termin_ke - b.termin_ke)
                                    .map((t) => (
                                        <div
                                            key={t.termin_ke}
                                            className="flex justify-between"
                                        >
                                            <span>
                                                Termin {t.termin_ke} (jth.{' '}
                                                {t.jatuh_tempo.slice(0, 10)})
                                            </span>
                                            <span className="font-medium">
                                                {formatRupiah(Number(t.jumlah))}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        )}
                        <PaymentProofForm
                            key={selected.id}
                            tagihanId={selected.id}
                            totalRemaining={Math.max(
                                Number(selected.total) -
                                    Number(selected.total_dibayar),
                                0,
                            )}
                            dueAmount={amountDue(selected)}
                            terminKe={
                                selected.jadwal_cicilan
                                    .slice()
                                    .sort(
                                        (a, b) => a.termin_ke - b.termin_ke,
                                    )
                                    .find((_, index, list) => {
                                        const cum = list
                                            .slice(0, index + 1)
                                            .reduce(
                                                (acc, row) =>
                                                    acc + Number(row.jumlah),
                                                0,
                                            );
                                        return (
                                            cum > Number(selected.total_dibayar)
                                        );
                                    })?.termin_ke ?? null
                            }
                            jenisPembayaran={
                                selected.jadwal_cicilan.length
                                    ? 'cicilan'
                                    : 'sewa_asrama'
                            }
                            paymentAccounts={payment_accounts}
                            onCancel={() => setSelected(null)}
                            onSuccess={() => setSelected(null)}
                        />
                    </div>
                </Modal>
            )}
            <section className="space-y-3" aria-labelledby="riwayat-pembayaran">
                <h2 id="riwayat-pembayaran" className="text-lg font-semibold">
                    Riwayat pembayaran
                </h2>
                <DataTable
                    columns={[
                        { key: 'jenis_pembayaran', label: 'Jenis' },
                        {
                            key: 'nominal',
                            label: 'Jumlah',
                            render: (payment: Payment) =>
                                formatRupiah(Number(payment.nominal ?? 0)),
                        },
                        {
                            key: 'status',
                            label: 'Status & Catatan',
                            render: (payment: Payment) => (
                                <div className="space-y-1">
                                    <StatusBadge
                                        status={mapPaymentStatus(
                                            payment.status ?? '',
                                        )}
                                    />
                                    {payment.catatan_verifikasi && (
                                        <p className="text-muted text-xs">
                                            {payment.catatan_verifikasi}
                                        </p>
                                    )}
                                </div>
                            ),
                        },
                        {
                            key: 'created_at',
                            label: 'Tanggal',
                            render: (payment: Payment) =>
                                payment.created_at?.slice(0, 10),
                        },
                    ]}
                    data={pembayaran}
                    searchKeys={['jenis_pembayaran', 'status', 'created_at']}
                    defaultPerPage={10}
                    emptyMessage="Belum ada riwayat pembayaran"
                />
            </section>
        </div>
    );
}
