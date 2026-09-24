import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import {
    PageHeader,
    Card,
    StatusBadge,
    Table,
    Button,
    FormField,
    inputClass,
} from '../../components/ui';
import { store as pembayaranStore } from '@/routes/andalas/pembayaran';
import {
    document as billingDocument,
    requestInstallments,
} from '@/routes/andalas/tagihan';
import { formatRupiah, mapPaymentStatus } from '../../lib/format';

type Invoice = {
    id: string;
    nomor: string;
    status: string;
    total: string;
    total_dibayar: string;
    cicilan_diminta_at?: string;
    alasan_cicilan?: string;
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

export default function Tagihan({
    pembayaran = [],
    billing = [],
}: {
    pembayaran?: Payment[];
    billing?: Invoice[];
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
    return (
        <div className="space-y-4">
            <PageHeader
                title="Tagihan & Pembayaran"
                subtitle="Invoice dan sisa kewajiban Anda, termasuk jadwal cicilan yang disetujui admin."
            />
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
            {billing.length === 0 && (
                <Card className="p-6">
                    Belum ada invoice. Invoice hunian diterbitkan saat
                    pendaftaran asrama.
                </Card>
            )}
            {billing.map((invoice) => (
                <Card className="space-y-3 p-5" key={invoice.id}>
                    <div className="flex justify-between gap-3">
                        <strong>{invoice.nomor}</strong>
                        <StatusBadge status={invoice.status} />
                    </div>
                    <p>
                        Total {formatRupiah(Number(invoice.total))} / Dibayar{' '}
                        {formatRupiah(Number(invoice.total_dibayar))}
                    </p>
                    {invoice.jadwal_cicilan.map((term) => (
                        <p key={term.termin_ke} className="text-sm">
                            Termin {term.termin_ke}:{' '}
                            {formatRupiah(Number(term.jumlah))}, jatuh tempo{' '}
                            {term.jatuh_tempo.slice(0, 10)}
                        </p>
                    ))}
                    <div className="flex flex-wrap gap-3">
                        {invoice.dokumen.map((document) => (
                            <a
                                className="text-primary underline"
                                key={document.id}
                                href={billingDocument.url({
                                    document: document.id,
                                })}
                            >
                                {document.jenis === 'invoice'
                                    ? 'Unduh invoice'
                                    : document.jenis === 'residence_receipt'
                                      ? 'Kwitansi hunian'
                                      : 'Kwitansi pembayaran'}
                            </a>
                        ))}
                    </div>
                    {invoice.status !== 'batal' && amountDue(invoice) > 0 && (
                        <Button onClick={() => pay(invoice)}>
                            Bayar {formatRupiah(amountDue(invoice))}
                        </Button>
                    )}
                    {invoice.status !== 'batal' &&
                        Number(invoice.total) > 0 &&
                        Number(invoice.total_dibayar) === 0 &&
                        invoice.jadwal_cicilan.length === 0 && (
                            <InstallmentRequest invoice={invoice} />
                        )}
                </Card>
            ))}
            {selected && (
                <Card className="space-y-4 p-6">
                    <h2 className="font-semibold">
                        Konfirmasi pembayaran {selected.nomor}
                    </h2>
                    <p className="text-sm">
                        Lampirkan bukti pembayaran sesuai petunjuk admin
                        layanan. Untuk cicilan, minta admin menetapkan jadwal
                        sebelum pembayaran pertama.
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
                        <div className="flex gap-3">
                            <Button disabled={form.processing} type="submit">
                                Kirim bukti pembayaran
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setSelected(null)}
                            >
                                Batal
                            </Button>
                        </div>
                    </form>
                </Card>
            )}
            <Card>
                <Table
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
                    emptyMessage="Belum ada riwayat pembayaran"
                />
            </Card>
        </div>
    );
}

function InstallmentRequest({ invoice }: { invoice: Invoice }) {
    const form = useForm({ alasan: invoice.alasan_cicilan ?? '' });
    return (
        <form
            className="space-y-2 border-t pt-3"
            onSubmit={(event) => {
                event.preventDefault();
                form.post(requestInstallments.url({ tagihan: invoice.id }));
            }}
        >
            <p>
                {invoice.cicilan_diminta_at
                    ? 'Pengajuan cicilan menunggu keputusan admin layanan.'
                    : 'Perlu mencicil? Ajukan sebelum pembayaran pertama.'}
            </p>
            <textarea
                required
                className="textarea w-full"
                aria-label="Alasan pengajuan cicilan"
                placeholder="Alasan mengajukan cicilan"
                value={form.data.alasan}
                onChange={(event) => form.setData('alasan', event.target.value)}
            />
            {form.errors.alasan && (
                <p className="text-error">{form.errors.alasan}</p>
            )}
            <Button type="submit" disabled={form.processing}>
                {invoice.cicilan_diminta_at
                    ? 'Perbarui pengajuan cicilan'
                    : 'Ajukan cicilan'}
            </Button>
        </form>
    );
}
