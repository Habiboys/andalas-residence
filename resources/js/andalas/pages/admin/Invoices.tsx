import { useForm, usePoll } from '@inertiajs/react';
import { useState } from 'react';
import {
    DataTable,
    PageHeader,
    inputClass,
    type DataColumn,
} from '../../components/ui';
import { Modal } from '../../components/atoms/Modal';
import { Download, FilePlus2, Settings2 } from 'lucide-react';
import { settings } from '@/routes/andalas/invoices';
import { store, download } from '@/routes/andalas/invoice-groups';
import { formatRupiah } from '../../lib/format';
export type Invoice = {
    id: string;
    nomor: string;
    status: string;
    total: string;
    total_dibayar: string;
    sponsor_total: string;
    sponsor_paid: string;
    sponsor_name?: string;
    amount_due_now?: string;
    mahasiswa_id: string;
    created_at: string;
    mahasiswa?: {
        user?: {
            nama: string;
            nim_nip: string;
            client_profile_category?: string;
        };
    };
    residence_snapshot?: { category?: string };
};
type Group = {
    id: string;
    nomor: string;
    payer_type: string;
    invoice_ids: string[];
    path?: string;
    snapshot: {
        total: number;
        institution: string;
        recipient?: string;
        date?: string;
    };
};
type Account = {
    mahasiswa_id: string;
    nomor: string;
    bank: string;
    atas_nama: string;
};
const remaining = (row: Invoice, payer: string) =>
    Math.max(
        0,
        payer === 'sponsor'
            ? Number(row.sponsor_total) - Number(row.sponsor_paid)
            : Number(row.total) - Number(row.total_dibayar),
    );
function PaymentSettings({
    invoice,
    account,
    onClose,
}: {
    invoice: Invoice;
    account?: Account;
    onClose: () => void;
}) {
    const form = useForm({
        amount_due_now:
            invoice.amount_due_now ?? String(remaining(invoice, 'personal')),
        bank: account?.bank ?? '',
        nomor: account?.nomor ?? '',
        atas_nama: account?.atas_nama ?? '',
    });
    return (
        <Modal
            open
            onClose={onClose}
            title={`Atur pembayaran ${invoice.nomor}`}
            width="max-w-2xl"
        >
            <form
                className="space-y-5"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.put(settings.url({ tagihan: invoice.id }), {
                        preserveScroll: true,
                        onSuccess: onClose,
                    });
                }}
            >
                <p className="text-base-content/70 text-sm">
                    Kesepakatan cicilan dilakukan di luar aplikasi. Nominal ini
                    tidak mengubah total utang. VA belum terhubung otomatis ke
                    bank.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                    {(
                        [
                            ['amount_due_now', 'Nominal bayar sekarang'],
                            ['bank', 'Bank'],
                            ['nomor', 'Nomor VA'],
                            ['atas_nama', 'Atas nama'],
                        ] as const
                    ).map(([k, l]) => (
                        <label key={k} className="space-y-1 text-sm">
                            <span>{l}</span>
                            <input
                                className={inputClass}
                                type={
                                    k === 'amount_due_now' ? 'number' : 'text'
                                }
                                value={form.data[k]}
                                required
                                onChange={(e) =>
                                    form.setData(k, e.target.value)
                                }
                            />
                        </label>
                    ))}
                </div>
                <div className="space-y-1">
                    {Object.values(form.errors).map((e, i) => (
                        <p role="alert" key={i} className="text-error text-sm">
                            {e}
                        </p>
                    ))}
                </div>
                <div className="modal-action mt-0">
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={onClose}
                    >
                        Batal
                    </button>
                    <button
                        className="btn btn-primary"
                        disabled={form.processing}
                    >
                        Simpan nominal dan VA
                    </button>
                </div>
            </form>
        </Modal>
    );
}
export default function Invoices({
    billing = [],
    groups = [],
    virtual_accounts = [],
}: {
    billing?: Invoice[];
    groups?: Group[];
    virtual_accounts?: Account[];
}) {
    usePoll(5000, { only: ['billing', 'groups', 'virtual_accounts'] });
    const [payer, setPayer] = useState('personal');
    const [edit, setEdit] = useState<string | null>(null);
    const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
    const form = useForm({
        nomor: '',
        payer_type: 'personal',
        invoice_ids: [] as string[],
        recipient: '',
        institution: '',
        subject: '',
        bank: '',
        account_number: '',
        account_name: '',
        due_date: '',
        signer: '',
        administration_signer: '',
        administration_signature: null as File | null,
        signature: null as File | null,
    });
    const invoiceStatus = (i: Invoice) =>
        i.status === 'batal'
            ? 'batal'
            : remaining(i, payer) === 0
              ? 'lunas'
              : 'belum_lunas';
    const invoiceRows = billing.map((invoice) => ({
        id: invoice.id,
        invoice,
        client: invoice.mahasiswa?.user?.nama ?? '-',
        nim: invoice.mahasiswa?.user?.nim_nip ?? '-',
        nomor: invoice.nomor,
        category: invoice.residence_snapshot?.category ?? '',
        status: invoiceStatus(invoice),
        total_amount: Number(
            payer === 'sponsor' ? invoice.sponsor_total : invoice.total,
        ),
        paid_amount: Number(
            payer === 'sponsor' ? invoice.sponsor_paid : invoice.total_dibayar,
        ),
        remaining_amount: remaining(invoice, payer),
        due_now:
            payer === 'personal'
                ? Number(
                      invoice.amount_due_now ?? remaining(invoice, 'personal'),
                  )
                : null,
        created_at: invoice.created_at,
    }));
    const categoryOptions = Array.from(
        new Set(invoiceRows.map((row) => row.category).filter(Boolean)),
    ).map((value) => ({
        value,
        label: value.replaceAll('_', ' ').toUpperCase(),
    }));
    const invoiceColumns: DataColumn<(typeof invoiceRows)[number]>[] = [
        {
            key: 'selected',
            label: 'Pilih',
            sortable: false,
            render: ({ invoice }) => (
                <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    aria-label={`Pilih ${invoice.nomor}`}
                    disabled={
                        remaining(invoice, payer) === 0 ||
                        invoice.status === 'batal'
                    }
                    checked={form.data.invoice_ids.includes(invoice.id)}
                    onChange={(event) =>
                        form.setData(
                            'invoice_ids',
                            event.target.checked
                                ? [...form.data.invoice_ids, invoice.id]
                                : form.data.invoice_ids.filter(
                                      (id) => id !== invoice.id,
                                  ),
                        )
                    }
                />
            ),
        },
        {
            key: 'client',
            label: 'Klien / invoice',
            render: (row) => (
                <div>
                    <span className="font-medium">{row.client}</span>
                    <span className="text-base-content/60 block text-xs">
                        {row.nim} · {row.nomor}
                    </span>
                    {payer === 'sponsor' && row.invoice.sponsor_name && (
                        <span className="text-base-content/60 block text-xs">
                            {row.invoice.sponsor_name}
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'category',
            label: 'Kategori',
            filter: { type: 'select', options: categoryOptions },
            render: (row) =>
                row.category
                    ? row.category.replaceAll('_', ' ').toUpperCase()
                    : '-',
        },
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
            render: (row) => (
                <span
                    className={`badge badge-sm h-auto shrink-0 px-2 py-1 whitespace-nowrap ${
                        row.status === 'lunas'
                            ? 'badge-success'
                            : row.status === 'batal'
                              ? 'badge-error'
                              : 'badge-warning'
                    }`}
                >
                    {row.status.replaceAll('_', ' ')}
                </span>
            ),
        },
        {
            key: 'total_amount',
            label: 'Total',
            render: (row) => formatRupiah(row.total_amount),
        },
        {
            key: 'paid_amount',
            label: 'Terbayar',
            render: (row) => formatRupiah(row.paid_amount),
        },
        {
            key: 'remaining_amount',
            label: 'Sisa',
            render: (row) => formatRupiah(row.remaining_amount),
        },
        {
            key: 'due_now',
            label: 'Bayar sekarang',
            render: (row) =>
                row.due_now === null ? '-' : formatRupiah(row.due_now),
        },
        {
            key: 'aksi',
            label: 'Aksi',
            action: true,
            render: ({ invoice }) =>
                payer === 'personal' && remaining(invoice, payer) > 0 ? (
                    <button
                        type="button"
                        className="btn btn-ghost btn-xs btn-square"
                        aria-label={`Atur pembayaran ${invoice.nomor}`}
                        title="Atur pembayaran"
                        onClick={() => setEdit(invoice.id)}
                    >
                        <Settings2 className="size-4" aria-hidden="true" />
                    </button>
                ) : null,
        },
    ];
    const groupRows = groups.map((invoiceGroup) => ({
        id: invoiceGroup.id,
        group: invoiceGroup,
        nomor: invoiceGroup.nomor,
        institution: invoiceGroup.snapshot.institution,
        recipient: invoiceGroup.snapshot.recipient ?? '-',
        payer_type:
            invoiceGroup.payer_type === 'sponsor' ? 'Sponsor' : 'Pribadi',
        total: Number(invoiceGroup.snapshot.total),
        date: invoiceGroup.snapshot.date ?? '-',
    }));
    const groupColumns: DataColumn<(typeof groupRows)[number]>[] = [
        { key: 'nomor', label: 'Nomor invoice' },
        { key: 'institution', label: 'Mitra / instansi' },
        { key: 'recipient', label: 'Kepada' },
        {
            key: 'payer_type',
            label: 'Pembayar',
            filter: {
                type: 'select',
                options: ['Pribadi', 'Sponsor'],
            },
        },
        {
            key: 'total',
            label: 'Total',
            render: (row) => formatRupiah(row.total),
        },
        { key: 'date', label: 'Tanggal' },
        {
            key: 'aksi',
            label: 'Aksi',
            action: true,
            render: ({ group: invoiceGroup }) => (
                <div className="flex items-center justify-end gap-1">
                    <a
                        className="btn btn-ghost btn-xs btn-square"
                        href={download.url({ group: invoiceGroup.id })}
                        aria-label={`Unduh PDF ${invoiceGroup.nomor}`}
                        title="Unduh PDF"
                    >
                        <Download className="size-4" aria-hidden="true" />
                    </a>
                </div>
            ),
        },
    ];
    const selected = billing.find((i) => i.id === edit);
    const resetInvoiceForm = () => {
        form.setData({
            nomor: '',
            payer_type: payer,
            invoice_ids: [],
            recipient: '',
            institution: '',
            subject: '',
            bank: '',
            account_number: '',
            account_name: '',
            due_date: '',
            signer: '',
            administration_signer: '',
            administration_signature: null,
            signature: null,
        });
        form.clearErrors();
    };
    return (
        <div className="space-y-5">
            <PageHeader
                title="Invoice"
                subtitle="Pilih tagihan yang akan digabungkan, lalu terbitkan invoice PDF."
            />
            <section className="space-y-3" aria-label="Daftar invoice">
                <DataTable
                    columns={invoiceColumns}
                    data={invoiceRows}
                    searchKeys={['client', 'nim', 'nomor']}
                    searchPlaceholder="Cari nama, NIM, atau invoice"
                    defaultPerPage={10}
                    emptyMessage="Belum ada invoice yang sesuai."
                    filters={
                        <select
                            aria-label="Pembayar"
                            className="select select-sm w-auto max-w-full shrink-0"
                            value={payer}
                            onChange={(e) => {
                                setPayer(e.target.value);
                                form.setData({
                                    ...form.data,
                                    payer_type: e.target.value,
                                    invoice_ids: [],
                                });
                            }}
                        >
                            <option value="personal">Tagihan pribadi</option>
                            <option value="sponsor">Piutang sponsor</option>
                        </select>
                    }
                    actions={
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={form.data.invoice_ids.length === 0}
                            onClick={() => {
                                form.setData('payer_type', payer);
                                setInvoiceModalOpen(true);
                            }}
                        >
                            <FilePlus2 className="size-4" aria-hidden="true" />
                            Terbitkan gabungan ({form.data.invoice_ids.length})
                        </button>
                    }
                />
            </section>
            {selected && (
                <PaymentSettings
                    key={selected.id}
                    invoice={selected}
                    onClose={() => setEdit(null)}
                    account={virtual_accounts.find(
                        (a) => a.mahasiswa_id === selected.mahasiswa_id,
                    )}
                />
            )}
            <Modal
                open={invoiceModalOpen}
                onClose={() => {
                    setInvoiceModalOpen(false);
                    form.clearErrors();
                }}
                title={`Terbitkan invoice gabungan (${form.data.invoice_ids.length} dipilih)`}
                width="max-w-4xl"
            >
                <form
                    className="space-y-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post(store.url(), {
                            preserveScroll: true,
                            onSuccess: () => {
                                setInvoiceModalOpen(false);
                                resetInvoiceForm();
                            },
                        });
                    }}
                >
                    <section className="space-y-3">
                        <div>
                            <h3 className="font-semibold">Informasi invoice</h3>
                            <p className="text-base-content/60 text-sm">
                                Identitas dokumen dan penerima invoice.
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {(
                                [
                                    ['nomor', 'Nomor invoice'],
                                    ['recipient', 'Kepada Yth'],
                                    ['institution', 'Nama mitra / instansi'],
                                ] as const
                            ).map(([key, label]) => (
                                <label key={key} className="space-y-1 text-sm">
                                    <span>{label}</span>
                                    <input
                                        className={inputClass}
                                        required
                                        value={form.data[key]}
                                        onChange={(event) =>
                                            form.setData(
                                                key,
                                                event.target.value,
                                            )
                                        }
                                    />
                                </label>
                            ))}
                            <label className="space-y-1 text-sm sm:col-span-2">
                                <span>Perihal</span>
                                <textarea
                                    className="textarea textarea-bordered w-full"
                                    required
                                    rows={3}
                                    value={form.data.subject}
                                    onChange={(event) =>
                                        form.setData(
                                            'subject',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                        </div>
                    </section>
                    <section className="border-base-200 space-y-3 border-t pt-5">
                        <div>
                            <h3 className="font-semibold">
                                Informasi pembayaran
                            </h3>
                            <p className="text-base-content/60 text-sm">
                                Rekening tujuan dan batas pembayaran.
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {(
                                [
                                    ['bank', 'Bank'],
                                    ['account_number', 'Nomor rekening'],
                                    ['account_name', 'Atas nama'],
                                    ['due_date', 'Batas pembayaran'],
                                ] as const
                            ).map(([key, label]) => (
                                <label key={key} className="space-y-1 text-sm">
                                    <span>{label}</span>
                                    <input
                                        className={inputClass}
                                        required
                                        type={
                                            key === 'due_date' ? 'date' : 'text'
                                        }
                                        value={form.data[key]}
                                        onChange={(event) =>
                                            form.setData(
                                                key,
                                                event.target.value,
                                            )
                                        }
                                    />
                                </label>
                            ))}
                        </div>
                    </section>
                    <section className="border-base-200 space-y-3 border-t pt-5">
                        <h3 className="font-semibold">Penandatangan</h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="space-y-1 text-sm">
                                <span>Nama pimpinan penandatangan</span>
                                <input
                                    className={inputClass}
                                    required
                                    value={form.data.signer}
                                    onChange={(event) =>
                                        form.setData(
                                            'signer',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                            <label className="space-y-1 text-sm">
                                <span>Tanda tangan pimpinan (opsional)</span>
                                <input
                                    className="file-input file-input-bordered w-full"
                                    type="file"
                                    accept=".png,.jpg,.jpeg"
                                    onChange={(event) =>
                                        form.setData(
                                            'signature',
                                            event.target.files?.[0] ?? null,
                                        )
                                    }
                                />
                            </label>
                            <label className="space-y-1 text-sm">
                                <span>Nama administrasi Andalas Residence</span>
                                <input
                                    className={inputClass}
                                    value={form.data.administration_signer}
                                    onChange={(event) =>
                                        form.setData(
                                            'administration_signer',
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                            <label className="space-y-1 text-sm">
                                <span>
                                    Tanda tangan administrasi (opsional)
                                </span>
                                <input
                                    className="file-input file-input-bordered w-full"
                                    type="file"
                                    accept=".png,.jpg,.jpeg"
                                    onChange={(event) =>
                                        form.setData(
                                            'administration_signature',
                                            event.target.files?.[0] ?? null,
                                        )
                                    }
                                />
                            </label>
                        </div>
                    </section>
                    <div className="space-y-1">
                        {Object.values(form.errors).map((e, i) => (
                            <p
                                role="alert"
                                key={i}
                                className="text-error text-sm"
                            >
                                {e}
                            </p>
                        ))}
                    </div>
                    <div className="modal-action mt-0">
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setInvoiceModalOpen(false)}
                        >
                            Batal
                        </button>
                        <button
                            className="btn btn-primary"
                            disabled={
                                form.processing ||
                                form.data.invoice_ids.length === 0
                            }
                        >
                            {form.processing
                                ? 'Menerbitkan...'
                                : 'Terbitkan PDF'}
                        </button>
                    </div>
                </form>
            </Modal>
            <section className="space-y-3" aria-labelledby="arsip-invoice">
                <div>
                    <h2 id="arsip-invoice" className="text-lg font-semibold">
                        Arsip invoice gabungan
                    </h2>
                    <p className="text-base-content/60 text-sm">
                        Unduh invoice gabungan yang sudah diterbitkan.
                    </p>
                </div>
                <DataTable
                    columns={groupColumns}
                    data={groupRows}
                    searchKeys={[
                        'nomor',
                        'institution',
                        'recipient',
                        'payer_type',
                    ]}
                    searchPlaceholder="Cari arsip invoice"
                    defaultPerPage={10}
                    emptyMessage="Belum ada invoice gabungan."
                />
            </section>
        </div>
    );
}
