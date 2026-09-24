import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import {
    PageHeader,
    Card,
    Table,
    Button,
    FormField,
    inputClass,
    StatCard,
    ConfirmDialog,
    RowActions,
    Modal,
} from '../../components/ui';
import {
    store as transaksiStore,
    update as transaksiUpdate,
    destroy as transaksiDestroy,
} from '@/routes/andalas/keuangan';
import { formatRupiah } from '../../lib/format';
import type { KeuanganStats } from '../../lib/types';

type TransaksiRow = {
    id: string;
    nomor_bukti?: string;
    pembayaran_mahasiswa_id?: string | null;
    tanggal_transaksi?: string;
    nominal?: number;
    tipe?: string;
    deskripsi?: string;
    kategori?: { id?: string; nama_kategori?: string };
    pencatat?: { nama?: string } | null;
};
type KategoriRow = { id: string; nama_kategori?: string; tipe?: string };

export default function Keuangan({
    transaksi = [],
    kategori = [],
    stats,
}: {
    transaksi?: TransaksiRow[];
    kategori?: KategoriRow[];
    stats?: KeuanganStats;
}) {
    const [editId, setEditId] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [detail, setDetail] = useState<TransaksiRow | null>(null);
    const [deleting, setDeleting] = useState<TransaksiRow | null>(null);
    const {
        data,
        setData,
        post,
        put,
        processing,
        errors,
        resetAndClearErrors,
    } = useForm({
        kategori_id: '',
        tanggal_transaksi: '',
        nominal: '',
        deskripsi: '',
        tipe: 'pemasukan',
    });
    const deleteForm = useForm<Record<string, string>>({});

    function closeForm() {
        setFormOpen(false);
        setEditId(null);
        resetAndClearErrors();
    }

    function startCreate() {
        resetAndClearErrors();
        setEditId(null);
        setFormOpen(true);
    }

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (editId) {
            put(transaksiUpdate.url({ id: editId }), {
                onSuccess: closeForm,
                preserveScroll: true,
            });
        } else {
            post(transaksiStore.url(), {
                onSuccess: closeForm,
                preserveScroll: true,
            });
        }
    }

    function confirmDelete() {
        if (!deleting) return;
        deleteForm.delete(transaksiDestroy.url({ id: deleting.id }), {
            onSuccess: () => setDeleting(null),
        });
    }

    function startEdit(row: TransaksiRow) {
        resetAndClearErrors();
        setEditId(row.id);
        setData({
            kategori_id: row.kategori?.id ?? '',
            tanggal_transaksi: String(row.tanggal_transaksi ?? '').slice(0, 10),
            nominal: String(row.nominal ?? ''),
            deskripsi: row.deskripsi ?? '',
            tipe: row.tipe ?? 'pemasukan',
        });
        setFormOpen(true);
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Keuangan"
                subtitle="Dashboard keuangan & buku besar kas operasional"
                actions={
                    <Button onClick={startCreate}>Tambah Transaksi</Button>
                }
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Saldo Kas"
                    value={formatRupiah(stats?.saldo ?? 0)}
                />
                <StatCard
                    label="Total Pemasukan"
                    value={formatRupiah(stats?.pemasukan ?? 0)}
                />
                <StatCard
                    label="Total Pengeluaran"
                    value={formatRupiah(stats?.pengeluaran ?? 0)}
                />
                <StatCard
                    label="Pembayaran Pending"
                    value={formatRupiah(stats?.pembayaran_pending ?? 0)}
                />
            </div>

            <Modal
                open={formOpen}
                onClose={closeForm}
                title={editId ? 'Edit Transaksi' : 'Tambah Transaksi'}
                width="max-w-2xl"
            >
                <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
                    <FormField label="Kategori">
                        <select
                            className={inputClass}
                            value={data.kategori_id}
                            onChange={(e) =>
                                setData('kategori_id', e.target.value)
                            }
                            required
                        >
                            <option value="">Pilih kategori</option>
                            {(kategori ?? []).map((k) => (
                                <option key={k.id} value={k.id}>
                                    {k.nama_kategori} ({k.tipe})
                                </option>
                            ))}
                        </select>
                        {errors.kategori_id && (
                            <p className="text-error mt-1 text-sm">
                                {errors.kategori_id}
                            </p>
                        )}
                    </FormField>
                    <FormField label="Tipe">
                        <select
                            className={inputClass}
                            value={data.tipe}
                            onChange={(e) => setData('tipe', e.target.value)}
                        >
                            <option value="pemasukan">Pemasukan</option>
                            <option value="pengeluaran">Pengeluaran</option>
                        </select>
                        {errors.tipe && (
                            <p className="text-error mt-1 text-sm">
                                {errors.tipe}
                            </p>
                        )}
                    </FormField>
                    <FormField label="Tanggal">
                        <input
                            type="date"
                            className={inputClass}
                            value={data.tanggal_transaksi}
                            onChange={(e) =>
                                setData('tanggal_transaksi', e.target.value)
                            }
                            required
                        />
                        {errors.tanggal_transaksi && (
                            <p className="text-error mt-1 text-sm">
                                {errors.tanggal_transaksi}
                            </p>
                        )}
                    </FormField>
                    <FormField label="Nominal">
                        <input
                            type="number"
                            min="1"
                            step="any"
                            className={inputClass}
                            value={data.nominal}
                            onChange={(e) => setData('nominal', e.target.value)}
                            required
                        />
                        {errors.nominal && (
                            <p className="text-error mt-1 text-sm">
                                {errors.nominal}
                            </p>
                        )}
                    </FormField>
                    <div className="md:col-span-2">
                        <FormField label="Deskripsi">
                            <textarea
                                rows={3}
                                className={inputClass}
                                value={data.deskripsi}
                                onChange={(e) =>
                                    setData('deskripsi', e.target.value)
                                }
                            />
                            {errors.deskripsi && (
                                <p className="text-error mt-1 text-sm">
                                    {errors.deskripsi}
                                </p>
                            )}
                        </FormField>
                    </div>
                    <div className="flex justify-end gap-2 md:col-span-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={closeForm}
                            disabled={processing}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing
                                ? 'Menyimpan...'
                                : editId
                                  ? 'Simpan Perubahan'
                                  : 'Simpan'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Card>
                <Table
                    columns={[
                        { key: 'nomor_bukti', label: 'No. Bukti' },
                        {
                            key: 'tanggal',
                            label: 'Tanggal',
                            render: (r: TransaksiRow) =>
                                String(r.tanggal_transaksi ?? '').slice(0, 10),
                        },
                        {
                            key: 'kategori',
                            label: 'Kategori',
                            render: (r: TransaksiRow) =>
                                r.kategori?.nama_kategori ?? '-',
                        },
                        {
                            key: 'tipe',
                            label: 'Tipe',
                            filter: {
                                type: 'select',
                                options: [
                                    { value: 'pemasukan', label: 'Pemasukan' },
                                    {
                                        value: 'pengeluaran',
                                        label: 'Pengeluaran',
                                    },
                                ],
                            },
                        },
                        {
                            key: 'nominal',
                            label: 'Nominal',
                            render: (r: TransaksiRow) =>
                                formatRupiah(Number(r.nominal ?? 0)),
                        },
                        {
                            key: 'aksi',
                            label: 'Aksi',
                            render: (r: TransaksiRow) => (
                                <RowActions
                                    onDetail={() => setDetail(r)}
                                    onEdit={r.pembayaran_mahasiswa_id ? undefined : () => startEdit(r)}
                                    onDelete={r.pembayaran_mahasiswa_id ? undefined : () => setDeleting(r)}
                                />
                            ),
                        },
                    ]}
                    data={transaksi ?? []}
                    emptyMessage="Belum ada transaksi"
                />
            </Card>

            <Modal
                open={!!detail}
                onClose={() => setDetail(null)}
                title="Detail Transaksi"
                width="max-w-2xl"
            >
                {detail && (
                    <>
                        <dl className="grid gap-5 text-sm sm:grid-cols-2">
                            {detail.pembayaran_mahasiswa_id && (
                                <p className="text-muted sm:col-span-2">
                                    Tercatat otomatis dari pembayaran mahasiswa. Transaksi ini tidak dapat diedit atau dihapus melalui buku kas.
                                </p>
                            )}
                            <div>
                                <dt className="text-muted">Nomor bukti</dt>
                                <dd className="mt-1 font-medium">
                                    {detail.nomor_bukti ?? '-'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted">
                                    Tanggal transaksi
                                </dt>
                                <dd className="mt-1">
                                    {String(
                                        detail.tanggal_transaksi ?? '',
                                    ).slice(0, 10) || '-'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted">Kategori</dt>
                                <dd className="mt-1">
                                    {detail.kategori?.nama_kategori ?? '-'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted">Tipe</dt>
                                <dd className="mt-1 capitalize">
                                    {detail.tipe ?? '-'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted">Nominal</dt>
                                <dd className="mt-1 text-lg font-semibold">
                                    {formatRupiah(Number(detail.nominal ?? 0))}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted">Dicatat oleh</dt>
                                <dd className="mt-1">
                                    {detail.pencatat?.nama ?? '-'}
                                </dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-muted">Deskripsi</dt>
                                <dd className="mt-1 break-words whitespace-pre-wrap">
                                    {detail.deskripsi || '-'}
                                </dd>
                            </div>
                        </dl>
                        <div className="mt-6 flex justify-end">
                            <Button
                                variant="secondary"
                                onClick={() => setDetail(null)}
                            >
                                Tutup
                            </Button>
                        </div>
                    </>
                )}
            </Modal>

            <ConfirmDialog
                open={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={confirmDelete}
                loading={deleteForm.processing}
                title="Hapus Transaksi"
                message={`Hapus transaksi ${deleting?.tipe ?? ''} ${deleting?.nominal ? formatRupiah(Number(deleting.nominal)) : ''} ini? Tindakan ini tidak dapat dibatalkan.`}
            />
        </div>
    );
}
