import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import {
    PageHeader,
    Card,
    StatusBadge,
    DataTable,
    Button,
    FormField,
    inputClass,
    Modal,
    type DataColumn,
} from '../../components/ui';
import { CreditCard, Download } from 'lucide-react';
import { store as pembayaranStore } from '@/routes/andalas/pembayaran';
import { document as billingDocument } from '@/routes/andalas/tagihan';
import { formatRupiah, mapPaymentStatus } from '../../lib/format';

type Invoice = {
    id: string;
    nomor: string;
    status: string;
    total: string;
    total_dibayar: string;
    amount_due_now?: string;
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
}: {
    pembayaran?: Payment[];
    billing?: Invoice[];
    virtual_accounts?: Array<{
        bank: string;
        nomor: string;
        atas_nama: string;
    }>;
}) {
    const [selected, setSelected] = useState<Invoice | null>(null);
    const form = useForm({
        tagihan_id: '',
        jenis_pembayaran: 'sewa_asrama',
        nominal: 0,
        atas_nama_pengirim: '',
        bukti_transfer: null as File | null,
    });
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
        form.clearErrors();
        form.setData({
            tagihan_id: invoice.id,
            jenis_pembayaran: invoice.jadwal_cicilan.length
                ? 'cicilan'
                : 'sewa_asrama',
            nominal: amountDue(invoice),
            atas_nama_pengirim: '',
            bukti_transfer: null,
        });
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
                options: ['belum_lunas', 'lunas', 'batal'],
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
                <div className="flex items-center justify-end gap-1">
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
                    {balance > 0 && invoice.status !== 'batal' && (
                        <button
                            type="button"
                            className="btn btn-primary btn-xs btn-square"
                            onClick={() => pay(invoice)}
                            aria-label={`Bayar ${invoice.nomor}`}
                            title="Bayar invoice"
                        >
                            <CreditCard className="size-4" aria-hidden="true" />
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
                subtitle="Invoice dan sisa kewajiban Anda, termasuk jadwal cicilan yang disetujui admin."
            />
            {virtual_accounts.map((a) => (
                <Card key={a.nomor} className="p-5">
                    Bayar ke VA {a.bank}: <strong>{a.nomor}</strong> /{' '}
                    {a.atas_nama}
                </Card>
            ))}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card className="p-5">
                    <p>Total tagihan</p>
                    <strong>{formatRupiah(total)}</strong>
                </Card>
                <Card className="p-5">
                    <p>Sudah dibayar</p>
                    <strong>{formatRupiah(paid)}</strong>
                </Card>
                <Card className="p-5">
                    <p>Sisa tagihan</p>
                    <strong>{formatRupiah(Math.max(0, total - paid))}</strong>
                </Card>
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
                            layanan. Untuk cicilan, minta admin menetapkan
                            jadwal sebelum pembayaran pertama.
                        </p>
                        <form
                            className="space-y-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                form.post(pembayaranStore.url(), {
                                    onSuccess: () => {
                                        setSelected(null);
                                        form.reset();
                                    },
                                });
                            }}
                        >
                            <p className="font-semibold">
                                {formatRupiah(form.data.nominal)}
                            </p>
                            <FormField label="Atas nama pengirim">
                                <input
                                    required
                                    className={inputClass}
                                    value={form.data.atas_nama_pengirim}
                                    onChange={(event) =>
                                        form.setData(
                                            'atas_nama_pengirim',
                                            event.target.value,
                                        )
                                    }
                                />
                            </FormField>
                            <FormField label="Bukti pembayaran">
                                <input
                                    type="file"
                                    required
                                    accept="image/jpeg,image/png,.pdf"
                                    className="file-input w-full"
                                    onChange={(event) =>
                                        form.setData(
                                            'bukti_transfer',
                                            event.target.files?.[0] ?? null,
                                        )
                                    }
                                />
                            </FormField>
                            {Object.entries(form.errors).map(([key, error]) => (
                                <p
                                    key={key}
                                    role="alert"
                                    className="text-error text-sm"
                                >
                                    {error}
                                </p>
                            ))}
                            <div className="modal-action mt-0">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setSelected(null)}
                                >
                                    Batal
                                </Button>
                                <Button
                                    disabled={form.processing}
                                    type="submit"
                                >
                                    {form.processing
                                        ? 'Mengirim...'
                                        : 'Kirim bukti pembayaran'}
                                </Button>
                            </div>
                        </form>
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
                            label: 'Status',
                            render: (payment: Payment) => (
                                <StatusBadge
                                    status={mapPaymentStatus(
                                        payment.status ?? '',
                                    )}
                                />
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
