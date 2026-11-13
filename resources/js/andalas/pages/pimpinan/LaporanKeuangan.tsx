import { useMemo, useState } from 'react';
import { PageHeader, StatCard, StatusBadge, Table } from '../../components/ui';
import { formatRupiah } from '../../lib/format';
import type { KeuanganStats } from '../../lib/types';

type TransaksiRow = {
    nomor_bukti?: string;
    tanggal_transaksi?: string;
    tipe?: string;
    nominal?: number;
    kategori?: { id?: string; nama_kategori?: string };
    pencatat?: { nama?: string };
};
type KategoriRow = { id: string; nama_kategori?: string };

type Props = {
    transaksi?: TransaksiRow[];
    kategori?: KategoriRow[];
    stats?: KeuanganStats;
};

export default function LaporanKeuangan({
    transaksi = [],
    kategori = [],
    stats,
}: Props) {
    const [search, setSearch] = useState('');
    const [tipeFilter, setTipeFilter] = useState('');
    const [kategoriFilter, setKategoriFilter] = useState('');

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return transaksi.filter((item) => {
            if (tipeFilter && item.tipe !== tipeFilter) {
                return false;
            }
            if (
                kategoriFilter &&
                item.kategori?.id !== kategoriFilter &&
                item.kategori?.nama_kategori !== kategoriFilter
            ) {
                return false;
            }
            if (!q) {
                return true;
            }
            return [item.nomor_bukti, item.kategori?.nama_kategori, item.pencatat?.nama]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(q);
        });
    }, [transaksi, search, tipeFilter, kategoriFilter]);

    const totalPemasukan =
        stats?.pemasukan ??
        transaksi
            .filter((t) => t.tipe === 'pemasukan')
            .reduce((sum, t) => sum + Number(t.nominal ?? 0), 0);
    const totalPengeluaran =
        stats?.pengeluaran ??
        transaksi
            .filter((t) => t.tipe === 'pengeluaran')
            .reduce((sum, t) => sum + Number(t.nominal ?? 0), 0);
    const saldo = stats?.saldo ?? totalPemasukan - totalPengeluaran;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Laporan Keuangan"
                subtitle="Rekap transaksi kas operasional asrama"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                    label="Total Pemasukan"
                    value={formatRupiah(totalPemasukan)}
                    color="green"
                />
                <StatCard
                    label="Total Pengeluaran"
                    value={formatRupiah(totalPengeluaran)}
                    color="red"
                />
                <StatCard
                    label="Saldo Kas"
                    value={formatRupiah(saldo)}
                    color="blue"
                />
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nomor bukti atau kategori..."
                    className="input input-bordered input-sm w-60"
                />
                <select
                    aria-label="Filter tipe transaksi"
                    value={tipeFilter}
                    onChange={(e) => setTipeFilter(e.target.value)}
                    className="select select-bordered select-sm"
                >
                    <option value="">Semua tipe</option>
                    <option value="pemasukan">Pemasukan</option>
                    <option value="pengeluaran">Pengeluaran</option>
                </select>
                <select
                    aria-label="Filter kategori transaksi"
                    value={kategoriFilter}
                    onChange={(e) => setKategoriFilter(e.target.value)}
                    className="select select-bordered select-sm"
                >
                    <option value="">Semua kategori</option>
                    {kategori.map((k) => (
                        <option key={k.id} value={k.id}>
                            {k.nama_kategori ?? '-'}
                        </option>
                    ))}
                </select>
            </div>
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
                        render: (r: TransaksiRow) => (
                            <StatusBadge status={r.tipe ?? ''} />
                        ),
                    },
                    {
                        key: 'nominal',
                        label: 'Nominal',
                        render: (r: TransaksiRow) =>
                            formatRupiah(Number(r.nominal ?? 0)),
                    },
                ]}
                data={filtered}
                emptyMessage="Belum ada transaksi"
            />
        </div>
    );
}
