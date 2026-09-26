import { useForm, usePoll } from '@inertiajs/react';
import { useState } from 'react';
import { Card, PageHeader, inputClass } from '../../components/ui';
import { settings } from '@/routes/andalas/invoices';
import { store, download, pay } from '@/routes/andalas/invoice-groups';
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
    snapshot: { total: number; institution: string };
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
}: {
    invoice: Invoice;
    account?: Account;
}) {
    const form = useForm({
        amount_due_now:
            invoice.amount_due_now ?? String(remaining(invoice, 'personal')),
        bank: account?.bank ?? '',
        nomor: account?.nomor ?? '',
        atas_nama: account?.atas_nama ?? '',
    });
    return (
        <Card className="space-y-3 p-5">
            <h2 className="font-semibold">
                Pembayaran berikutnya ? {invoice.nomor}
            </h2>
            <p className="text-sm">
                Kesepakatan cicilan dilakukan di luar aplikasi. Nominal ini
                tidak mengubah total utang. VA belum terhubung otomatis ke bank.
            </p>
            <form
                className="grid gap-3 sm:grid-cols-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.put(settings.url({ tagihan: invoice.id }));
                }}
            >
                {(
                    [
                        ['amount_due_now', 'Nominal bayar sekarang'],
                        ['bank', 'Bank'],
                        ['nomor', 'Nomor VA'],
                        ['atas_nama', 'Atas nama'],
                    ] as const
                ).map(([k, l]) => (
                    <label key={k}>
                        {l}
                        <input
                            className={inputClass}
                            type={k === 'amount_due_now' ? 'number' : 'text'}
                            value={form.data[k]}
                            required
                            onChange={(e) => form.setData(k, e.target.value)}
                        />
                    </label>
                ))}
                <div>
                    {Object.values(form.errors).map((e, i) => (
                        <p role="alert" key={i} className="text-error">
                            {e}
                        </p>
                    ))}
                    <button
                        className="btn btn-primary"
                        disabled={form.processing}
                    >
                        Simpan nominal dan VA
                    </button>
                </div>
            </form>
        </Card>
    );
}
function Allocate({ group, invoices }: { group: Group; invoices: Invoice[] }) {
    const rows = invoices.filter((i) => group.invoice_ids.includes(i.id));
    const form = useForm({
        reference: '',
        allocations: rows.map((i) => ({ tagihan_id: i.id, jumlah: '' })),
    });
    return (
        <Card className="space-y-3 p-5">
            <h2 className="font-semibold">Pembayaran invoice {group.nomor}</h2>
            <form
                className="space-y-3"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.transform((d) => ({
                        ...d,
                        allocations: d.allocations.filter(
                            (a) => Number(a.jumlah) > 0,
                        ),
                    }));
                    form.post(pay.url({ group: group.id }));
                }}
            >
                <label>
                    Referensi pembayaran bank
                    <input
                        className={inputClass}
                        required
                        value={form.data.reference}
                        onChange={(e) =>
                            form.setData('reference', e.target.value)
                        }
                    />
                </label>
                {rows.map((row, index) => (
                    <label key={row.id} className="block">
                        {row.mahasiswa?.user?.nama} ? sisa{' '}
                        {formatRupiah(remaining(row, group.payer_type))}
                        <input
                            className={inputClass}
                            aria-label={`Alokasi ${row.nomor}`}
                            type="number"
                            min="0"
                            max={remaining(row, group.payer_type)}
                            value={form.data.allocations[index].jumlah}
                            onChange={(e) =>
                                form.setData(
                                    'allocations',
                                    form.data.allocations.map((a, n) =>
                                        n === index
                                            ? { ...a, jumlah: e.target.value }
                                            : a,
                                    ),
                                )
                            }
                        />
                    </label>
                ))}
                {Object.values(form.errors).map((e, i) => (
                    <p key={i} role="alert" className="text-error">
                        {e}
                    </p>
                ))}
                <button className="btn btn-primary" disabled={form.processing}>
                    Catat pembayaran terverifikasi
                </button>
            </form>
        </Card>
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
    const [query, setQuery] = useState('');
    const [payer, setPayer] = useState('personal');
    const [category, setCategory] = useState('');
    const [status, setStatus] = useState('');
    const [sort, setSort] = useState('date');
    const [edit, setEdit] = useState<string | null>(null);
    const [allocation, setAllocation] = useState<string | null>(null);
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
        signature: null as File | null,
    });
    const invoiceStatus = (i: Invoice) =>
        i.status === 'batal'
            ? 'batal'
            : remaining(i, payer) === 0
              ? 'lunas'
              : 'belum_lunas';
    const rows = billing
        .filter(
            (i) =>
                `${i.nomor} ${i.mahasiswa?.user?.nama} ${i.mahasiswa?.user?.nim_nip}`
                    .toLowerCase()
                    .includes(query.toLowerCase()) &&
                (!category || i.residence_snapshot?.category === category) &&
                (!status || invoiceStatus(i) === status),
        )
        .sort((a, b) =>
            sort === 'amount'
                ? remaining(b, payer) - remaining(a, payer)
                : sort === 'amount_asc'
                  ? remaining(a, payer) - remaining(b, payer)
                  : b.created_at.localeCompare(a.created_at),
        );
    const selected = billing.find((i) => i.id === edit);
    const group = groups.find((g) => g.id === allocation);
    return (
        <div className="space-y-5">
            <PageHeader
                title="Invoice"
                subtitle="Tagihan pribadi dan piutang penanggung biaya diperbarui setiap lima detik."
            />
            <Card className="space-y-3 p-5">
                <div className="grid gap-3 sm:grid-cols-3">
                    <input
                        aria-label="Cari invoice"
                        className={inputClass}
                        placeholder="Cari nama, NIM, nomor invoice"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <select
                        aria-label="Pembayar"
                        className={inputClass}
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
                    <select
                        aria-label="Kategori invoice"
                        className={inputClass}
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        <option value="">Semua kategori</option>
                        <option value="kipk">KIP-K</option>
                        <option value="non_kipk">Non KIP-K</option>
                    </select>
                    <select
                        aria-label="Status invoice"
                        className={inputClass}
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                    >
                        <option value="">Semua status</option>
                        <option value="belum_lunas">Belum lunas</option>
                        <option value="lunas">Lunas</option>
                        <option value="batal">Batal</option>
                    </select>
                    <select
                        aria-label="Urutkan invoice"
                        className={inputClass}
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                    >
                        <option value="date">Tanggal terbaru</option>
                        <option value="amount">Sisa terbesar</option>
                        <option value="amount_asc">Sisa terkecil</option>
                    </select>
                </div>
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Pilih</th>
                                <th>Klien / invoice</th>
                                <th>Total</th>
                                <th>Terbayar</th>
                                <th>Sisa</th>
                                <th>Bayar sekarang</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((i) => (
                                <tr key={i.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            aria-label={`Pilih ${i.nomor}`}
                                            disabled={
                                                remaining(i, payer) === 0 ||
                                                i.status === 'batal'
                                            }
                                            checked={form.data.invoice_ids.includes(
                                                i.id,
                                            )}
                                            onChange={(e) =>
                                                form.setData(
                                                    'invoice_ids',
                                                    e.target.checked
                                                        ? [
                                                              ...form.data
                                                                  .invoice_ids,
                                                              i.id,
                                                          ]
                                                        : form.data.invoice_ids.filter(
                                                              (id) =>
                                                                  id !== i.id,
                                                          ),
                                                )
                                            }
                                        />
                                    </td>
                                    <td>
                                        {i.mahasiswa?.user?.nama}
                                        <small className="block">
                                            {i.nomor}
                                        </small>
                                        {payer === 'sponsor' && (
                                            <small>{i.sponsor_name}</small>
                                        )}
                                    </td>
                                    <td>
                                        {formatRupiah(
                                            Number(
                                                payer === 'sponsor'
                                                    ? i.sponsor_total
                                                    : i.total,
                                            ),
                                        )}
                                    </td>
                                    <td>
                                        {formatRupiah(
                                            Number(
                                                payer === 'sponsor'
                                                    ? i.sponsor_paid
                                                    : i.total_dibayar,
                                            ),
                                        )}
                                    </td>
                                    <td>{formatRupiah(remaining(i, payer))}</td>
                                    <td>
                                        {payer === 'personal'
                                            ? formatRupiah(
                                                  Number(
                                                      i.amount_due_now ??
                                                          remaining(i, payer),
                                                  ),
                                              )
                                            : '?'}
                                    </td>
                                    <td>
                                        {payer === 'personal' &&
                                            remaining(i, payer) > 0 && (
                                                <button
                                                    className="btn btn-ghost btn-xs"
                                                    onClick={() =>
                                                        setEdit(i.id)
                                                    }
                                                >
                                                    Atur pembayaran
                                                </button>
                                            )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!rows.length && <p>Belum ada invoice yang sesuai.</p>}
                </div>
            </Card>
            {selected && (
                <PaymentSettings
                    key={selected.id}
                    invoice={selected}
                    account={virtual_accounts.find(
                        (a) => a.mahasiswa_id === selected.mahasiswa_id,
                    )}
                />
            )}
            <Card className="space-y-4 p-5">
                <h2 className="font-semibold">
                    Terbitkan invoice gabungan ({form.data.invoice_ids.length}{' '}
                    dipilih)
                </h2>
                <form
                    className="grid gap-3 sm:grid-cols-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post(store.url());
                    }}
                >
                    {(
                        [
                            ['nomor', 'Nomor invoice'],
                            ['recipient', 'Kepada Yth'],
                            ['institution', 'Nama mitra / instansi'],
                            ['subject', 'Perihal'],
                            ['bank', 'Bank'],
                            ['account_number', 'Nomor rekening'],
                            ['account_name', 'Atas nama'],
                            ['due_date', 'Batas pembayaran'],
                            ['signer', 'Nama pimpinan penandatangan'],
                        ] as const
                    ).map(([k, l]) => (
                        <label key={k}>
                            {l}
                            <input
                                className={inputClass}
                                required
                                type={k === 'due_date' ? 'date' : 'text'}
                                value={form.data[k]}
                                onChange={(e) =>
                                    form.setData(k, e.target.value)
                                }
                            />
                        </label>
                    ))}
                    <label>
                        Tanda tangan pimpinan (opsional)
                        <input
                            className="file-input"
                            type="file"
                            accept=".png,.jpg,.jpeg"
                            onChange={(e) =>
                                form.setData(
                                    'signature',
                                    e.target.files?.[0] ?? null,
                                )
                            }
                        />
                    </label>
                    <div>
                        {Object.values(form.errors).map((e, i) => (
                            <p role="alert" key={i} className="text-error">
                                {e}
                            </p>
                        ))}
                        <button
                            className="btn btn-primary"
                            disabled={
                                form.processing ||
                                form.data.invoice_ids.length === 0
                            }
                        >
                            Terbitkan PDF
                        </button>
                    </div>
                </form>
            </Card>
            <Card className="space-y-3 p-5">
                <h2 className="font-semibold">Arsip invoice gabungan</h2>
                {!groups.length && <p>Belum ada invoice gabungan.</p>}
                {groups.map((g) => (
                    <div
                        key={g.id}
                        className="flex flex-wrap items-center gap-3 border-b py-3"
                    >
                        <span>
                            {g.nomor} ? {g.snapshot.institution} ?{' '}
                            {formatRupiah(g.snapshot.total)}
                        </span>
                        <a
                            className="btn btn-outline btn-sm"
                            href={download.url({ group: g.id })}
                        >
                            Unduh PDF
                        </a>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setAllocation(g.id)}
                        >
                            Catat pembayaran
                        </button>
                    </div>
                ))}
            </Card>
            {group && (
                <Allocate key={group.id} group={group} invoices={billing} />
            )}
        </div>
    );
}
