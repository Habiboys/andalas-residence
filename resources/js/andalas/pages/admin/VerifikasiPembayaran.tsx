import { installments } from '@/routes/andalas/tagihan';
import { useState } from 'react';
import ResidentIdentity, {
    type ResidentProfile,
} from '../../components/ResidentIdentity';
import { useForm } from '@inertiajs/react';
import {
    PageHeader,
    Card,
    DataTable,
    Modal,
    RowActions,
    Button,
    Tabs,
    StatusBadge,
} from '../../components/ui';
import {
    verify as verifyPembayaran,
    bukti as buktiPembayaran,
} from '@/routes/andalas/pembayaran';
import { formatRupiah, mapPaymentStatus } from '../../lib/format';

type Invoice = {
    id: string;
    nomor: string;
    total: string;
    total_dibayar: string;
    cicilan_diminta_at?: string;
    alasan_cicilan?: string;
    status: string;
    mahasiswa?: ResidentProfile;
    jadwal_cicilan?: Array<{
        termin_ke: number;
        jumlah: string;
        jatuh_tempo: string;
        status: string;
    }>;
};

function InstallmentForm({
    invoice,
    onDone,
}: {
    invoice: Invoice;
    onDone: () => void;
}) {
    const form = useForm({
        cicilan: invoice.jadwal_cicilan?.length
            ? invoice.jadwal_cicilan.map((term) => ({
                  jumlah: String(term.jumlah),
                  jatuh_tempo: term.jatuh_tempo.slice(0, 10),
              }))
            : [
                  { jumlah: '', jatuh_tempo: '' },
                  { jumlah: '', jatuh_tempo: '' },
              ],
    });
    return (
        <Card className="space-y-3 p-4">
            <h3 className="font-semibold">
                {invoice.mahasiswa?.user?.nama} / {invoice.nomor}
            </h3>
            <p>Total: {formatRupiah(Number(invoice.total))}</p>
            {invoice.cicilan_diminta_at && (
                <p className="alert alert-info">
                    Permintaan cicilan: {invoice.alasan_cicilan}
                </p>
            )}
            <form
                className="space-y-3"
                onSubmit={(event) => {
                    event.preventDefault();
                    form.put(installments.url({ tagihan: invoice.id }), {
                        onSuccess: onDone,
                        preserveScroll: true,
                    });
                }}
            >
                {form.data.cicilan.map((term, index) => (
                    <div key={index} className="flex flex-wrap gap-3">
                        <span>Termin {index + 1}</span>
                        <input
                            aria-label={'Nominal termin ' + (index + 1)}
                            required
                            type="number"
                            min="1"
                            className="input"
                            value={term.jumlah}
                            onChange={(event) =>
                                form.setData(
                                    'cicilan',
                                    form.data.cicilan.map((item, position) =>
                                        position === index
                                            ? {
                                                  ...item,
                                                  jumlah: event.target.value,
                                              }
                                            : item,
                                    ),
                                )
                            }
                        />
                        <input
                            aria-label={'Jatuh tempo termin ' + (index + 1)}
                            required
                            type="date"
                            className="input"
                            value={term.jatuh_tempo}
                            onChange={(event) =>
                                form.setData(
                                    'cicilan',
                                    form.data.cicilan.map((item, position) =>
                                        position === index
                                            ? {
                                                  ...item,
                                                  jatuh_tempo:
                                                      event.target.value,
                                              }
                                            : item,
                                    ),
                                )
                            }
                        />
                    </div>
                ))}
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                        form.setData('cicilan', [
                            ...form.data.cicilan,
                            { jumlah: '', jatuh_tempo: '' },
                        ])
                    }
                >
                    Tambah termin
                </Button>
                {Object.entries(form.errors).map(([key, error]) => (
                    <p key={key} className="text-error">
                        {error}
                    </p>
                ))}
                <Button type="submit" disabled={form.processing}>
                    Simpan persetujuan cicilan
                </Button>
            </form>
        </Card>
    );
}

type PembayaranRow = {
    id: string;
    jenis_pembayaran?: string;
    nominal?: number;
    status?: string;
    created_at?: string;
    bukti_transfer_path?: string | null;
    kode_transaksi?: string;
    catatan_verifikasi?: string;
    verifikator?: { nama?: string };
    tanggal_bayar?: string;
    mahasiswa?: ResidentProfile;
    metode_pembayaran?: string;
    nama_bank?: string;
    nomor_rekening_pengirim?: string;
    atas_nama_pengirim?: string;
    termin_ke?: number;
    tagihan?: {
        nomor: string;
        total: string;
        total_dibayar: string;
        status: string;
    } | null;
};

export default function VerifikasiPembayaran({
    pembayaran = [],
    billing = [],
}: {
    pembayaran?: PembayaranRow[];
    billing?: Invoice[];
}) {
    const [activeTab, setActiveTab] = useState(0);
    const [section, setSection] = useState(0);
    const [installmentTab, setInstallmentTab] = useState(0);
    const [invoiceId, setInvoiceId] = useState<string | null>(null);
    const invoice = billing.find((item) => item.id === invoiceId);
    const [selected, setSelected] = useState<PembayaranRow | null>(null);
    const {
        data,
        setData,
        post,
        processing,
        errors,
        resetAndClearErrors,
        transform,
    } = useForm({ catatan_verifikasi: '' });

    const filtered = pembayaran.filter((p) => {
        if (activeTab === 1) return p.status === 'menunggu_verifikasi';
        if (activeTab === 2) return p.status === 'lunas';
        if (activeTab === 3) return p.status === 'ditolak';
        if (activeTab === 4) return p.status === 'kadaluarsa';
        return true;
    });

    function verify(status: 'lunas' | 'ditolak') {
        if (!selected) return;
        transform((d) => ({ ...d, status }));
        post(verifyPembayaran.url({ pembayaran: selected.id }), {
            onSuccess: () => {
                setSelected(null);
                resetAndClearErrors();
            },
        });
    }

    const columns = [
        {
            key: 'nim',
            label: 'NIM',
            render: (r: PembayaranRow) => r.mahasiswa?.user?.nim_nip ?? '-',
        },
        {
            key: 'nama',
            label: 'Nama',
            render: (r: PembayaranRow) => r.mahasiswa?.user?.nama ?? '-',
        },
        { key: 'jenis_pembayaran', label: 'Jenis' },
        {
            key: 'nominal',
            label: 'Jumlah',
            render: (r: PembayaranRow) => formatRupiah(Number(r.nominal ?? 0)),
        },
        {
            key: 'status',
            label: 'Status',
            render: (r: PembayaranRow) => (
                <StatusBadge status={mapPaymentStatus(r.status ?? '')} />
            ),
        },
        {
            key: 'aksi',
            label: 'Aksi',
            render: (r: PembayaranRow) => (
                <RowActions
                    onDetail={() => {
                        resetAndClearErrors();
                        setSelected(r);
                    }}
                />
            ),
        },
    ];

    const installmentRows = billing
        .filter(
            (item) => item.cicilan_diminta_at || item.jadwal_cicilan?.length,
        )
        .map((item) => ({
            ...item,
            nama: item.mahasiswa?.user?.nama ?? '-',
            nim: item.mahasiswa?.user?.nim_nip ?? '-',
            tahap:
                item.status === 'batal'
                    ? 'Dibatalkan'
                    : item.status === 'lunas'
                      ? 'Lunas'
                      : item.jadwal_cicilan?.length
                        ? 'Disetujui / berjalan'
                        : 'Menunggu persetujuan',
        }));
    const stages = [
        '',
        'Menunggu persetujuan',
        'Disetujui / berjalan',
        'Lunas',
        'Dibatalkan',
    ];
    const paymentStatuses = [
        '',
        'menunggu_verifikasi',
        'lunas',
        'ditolak',
        'kadaluarsa',
    ];
    return (
        <div className="space-y-4">
            <PageHeader
                title="Verifikasi Pembayaran"
                subtitle="Tinjau bukti transfer mahasiswa"
            />
            <Tabs
                tabs={['Pembayaran', 'Cicilan']}
                active={section}
                onChange={setSection}
            />
            {section === 0 ? (
                <Card className="p-4">
                    <div className="overflow-x-auto">
                        <Tabs
                            tabs={[
                                'Semua',
                                'Menunggu verifikasi',
                                'Terverifikasi',
                                'Ditolak',
                                'Kedaluwarsa',
                            ].map(
                                (label, index) =>
                                    `${label} (${pembayaran.filter((item) => !paymentStatuses[index] || item.status === paymentStatuses[index]).length})`,
                            )}
                            active={activeTab}
                            onChange={setActiveTab}
                        />
                    </div>
                    <DataTable
                        columns={columns}
                        data={filtered}
                        emptyMessage="Tidak ada data pembayaran"
                    />
                </Card>
            ) : (
                <Card className="p-4">
                    <div className="overflow-x-auto">
                        <Tabs
                            tabs={['Semua', ...stages.slice(1)].map(
                                (label, index) =>
                                    `${label} (${installmentRows.filter((item) => !stages[index] || item.tahap === stages[index]).length})`,
                            )}
                            active={installmentTab}
                            onChange={setInstallmentTab}
                        />
                    </div>
                    <DataTable
                        data={installmentRows.filter(
                            (item) =>
                                !stages[installmentTab] ||
                                item.tahap === stages[installmentTab],
                        )}
                        searchKeys={['nama', 'nim', 'nomor']}
                        emptyMessage="Tidak ada pengajuan atau jadwal cicilan pada status ini."
                        columns={[
                            { key: 'nim', label: 'NIM' },
                            { key: 'nama', label: 'Nama' },
                            { key: 'nomor', label: 'Tagihan' },
                            {
                                key: 'total',
                                label: 'Total',
                                render: (row) =>
                                    formatRupiah(Number(row.total)),
                            },
                            {
                                key: 'total_dibayar',
                                label: 'Dibayar',
                                render: (row) =>
                                    formatRupiah(Number(row.total_dibayar)),
                            },
                            { key: 'tahap', label: 'Status' },
                            {
                                key: 'aksi',
                                label: 'Aksi',
                                render: (row) => (
                                    <RowActions
                                        onDetail={() => setInvoiceId(row.id)}
                                    />
                                ),
                            },
                        ]}
                    />
                </Card>
            )}
            <Modal
                open={!!selected}
                onClose={() => setSelected(null)}
                title="Detail Pembayaran"
                width="max-w-2xl"
            >
                {selected && (
                    <div className="space-y-3 text-sm">
                        <p>Nomor transaksi: {selected.kode_transaksi ?? '-'}</p>
                        <ResidentIdentity profile={selected.mahasiswa} />
                        <dl className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <dt className="text-muted">Nomor tagihan</dt>
                                <dd>{selected.tagihan?.nomor ?? '-'}</dd>
                            </div>
                            <div>
                                <dt className="text-muted">
                                    Metode pembayaran
                                </dt>
                                <dd>
                                    {selected.metode_pembayaran?.replaceAll(
                                        '_',
                                        ' ',
                                    ) ?? '-'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted">Bank pengirim</dt>
                                <dd>{selected.nama_bank || '-'}</dd>
                            </div>
                            <div>
                                <dt className="text-muted">
                                    Rekening pengirim
                                </dt>
                                <dd>
                                    {selected.nomor_rekening_pengirim || '-'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted">
                                    Atas nama pengirim
                                </dt>
                                <dd>{selected.atas_nama_pengirim || '-'}</dd>
                            </div>
                            <div>
                                <dt className="text-muted">Termin</dt>
                                <dd>{selected.termin_ke ?? '-'}</dd>
                            </div>
                            <div>
                                <dt className="text-muted">Total tagihan</dt>
                                <dd>
                                    {selected.tagihan
                                        ? formatRupiah(
                                              Number(selected.tagihan.total),
                                          )
                                        : '-'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted">Sisa tagihan</dt>
                                <dd>
                                    {selected.tagihan
                                        ? formatRupiah(
                                              Math.max(
                                                  0,
                                                  Number(
                                                      selected.tagihan.total,
                                                  ) -
                                                      Number(
                                                          selected.tagihan
                                                              .total_dibayar,
                                                      ),
                                              ),
                                          )
                                        : '-'}
                                </dd>
                            </div>
                        </dl>
                        <p>NIM: {selected.mahasiswa?.user?.nim_nip ?? '-'}</p>
                        <StatusBadge
                            status={mapPaymentStatus(selected.status ?? '')}
                        />
                        <p>
                            Pencatatan:{' '}
                            {selected.created_at
                                ? new Date(selected.created_at).toLocaleString(
                                      'id-ID',
                                  )
                                : '-'}
                        </p>
                        <p>Verifikator: {selected.verifikator?.nama ?? '-'}</p>
                        {selected.catatan_verifikasi && (
                            <p className="whitespace-pre-wrap">
                                Catatan: {selected.catatan_verifikasi}
                            </p>
                        )}
                    </div>
                )}
                {selected?.status === 'menunggu_verifikasi' && (
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => setSelected(null)}
                        >
                            Batal
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => verify('ditolak')}
                            disabled={processing}
                        >
                            Tolak
                        </Button>
                        <Button
                            onClick={() => verify('lunas')}
                            disabled={processing}
                        >
                            Verifikasi
                        </Button>
                    </div>
                )}
                {selected && (
                    <div className="space-y-3 text-sm">
                        <p>
                            <strong>Mahasiswa:</strong>{' '}
                            {selected.mahasiswa?.user?.nama}
                        </p>
                        <p>
                            <strong>Nominal:</strong>{' '}
                            {formatRupiah(Number(selected.nominal ?? 0))}
                        </p>
                        {selected.bukti_transfer_path && (
                            <div>
                                <p className="mb-1 font-medium">
                                    Bukti Transfer:
                                </p>
                                <a
                                    href={buktiPembayaran.url({
                                        pembayaran: selected.id,
                                    })}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary text-sm underline"
                                >
                                    Lihat bukti pembayaran
                                </a>
                            </div>
                        )}
                        {selected.status === 'menunggu_verifikasi' && (
                            <textarea
                                className="textarea w-full"
                                rows={3}
                                placeholder="Catatan verifikasi"
                                value={data.catatan_verifikasi}
                                onChange={(e) =>
                                    setData(
                                        'catatan_verifikasi',
                                        e.target.value,
                                    )
                                }
                            />
                        )}
                        {Object.entries(errors).map(([key, error]) => (
                            <p key={key} className="text-error">
                                {error}
                            </p>
                        ))}
                    </div>
                )}
            </Modal>
            <Modal
                open={!!invoice}
                onClose={() => setInvoiceId(null)}
                title="Detail dan Persetujuan Cicilan"
                width="max-w-2xl"
            >
                {invoice && (
                    <div className="space-y-4">
                        <ResidentIdentity profile={invoice.mahasiswa} />
                        <p className="text-sm">
                            Diajukan:{' '}
                            {invoice.cicilan_diminta_at
                                ? new Date(
                                      invoice.cicilan_diminta_at,
                                  ).toLocaleString('id-ID')
                                : '-'}{' '}
                            · Status tagihan: {invoice.status}
                        </p>
                        <p className="text-sm">
                            Sisa tagihan:{' '}
                            {formatRupiah(
                                Math.max(
                                    0,
                                    Number(invoice.total) -
                                        Number(invoice.total_dibayar),
                                ),
                            )}
                        </p>
                        <p>
                            {invoice.mahasiswa?.user?.nama} · {invoice.nomor}
                        </p>
                        <p>
                            Total {formatRupiah(Number(invoice.total))} ·
                            Dibayar{' '}
                            {formatRupiah(Number(invoice.total_dibayar))}
                        </p>
                        <p className="whitespace-pre-wrap">
                            Alasan pengajuan: {invoice.alasan_cicilan || '-'}
                        </p>
                        {!!invoice.jadwal_cicilan?.length && (
                            <DataTable
                                data={invoice.jadwal_cicilan}
                                columns={[
                                    { key: 'termin_ke', label: 'Termin' },
                                    {
                                        key: 'jatuh_tempo',
                                        label: 'Jatuh tempo',
                                        render: (row) =>
                                            row.jatuh_tempo.slice(0, 10),
                                    },
                                    {
                                        key: 'jumlah',
                                        label: 'Jumlah',
                                        render: (row) =>
                                            formatRupiah(Number(row.jumlah)),
                                    },
                                    { key: 'status', label: 'Status' },
                                ]}
                            />
                        )}
                        {Number(invoice.total_dibayar) === 0 &&
                        Number(invoice.total) > 0 &&
                        !['batal', 'lunas'].includes(invoice.status) ? (
                            <InstallmentForm
                                key={invoice.id}
                                invoice={invoice}
                                onDone={() => setInvoiceId(null)}
                            />
                        ) : (
                            <p className="text-muted text-sm">
                                Jadwal tidak dapat diubah setelah pembayaran
                                pertama atau tagihan ditutup.
                            </p>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
