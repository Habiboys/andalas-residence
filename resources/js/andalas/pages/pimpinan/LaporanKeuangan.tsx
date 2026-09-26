import { PageHeader, Card, Table } from '../../components/ui';
import { formatRupiah } from '../../lib/format';
import type { KeuanganStats } from '../../lib/types';

type TransaksiRow = {
    nomor_bukti?: string;
    tanggal_transaksi?: string;
    tipe?: string;
    nominal?: number;
    kategori?: { nama_kategori?: string };
};
type KategoriRow = { id: string; nama_kategori?: string };

type Props = {
    transaksi: TransaksiRow[];
    kategori: KategoriRow[];
    stats: KeuanganStats;
};

export default function LaporanKeuangan({ transaksi = [] }: Props) {
    return (
        <div className="space-y-4">
            <PageHeader
                title="Laporan Keuangan"
                subtitle="Rekap transaksi kas operasional"
            />
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
                        { key: 'tipe', label: 'Tipe' },
                        {
                            key: 'nominal',
                            label: 'Nominal',
                            render: (r: TransaksiRow) =>
                                formatRupiah(Number(r.nominal ?? 0)),
                        },
                    ]}
                    data={transaksi}
                    emptyMessage="Belum ada transaksi"
                />
            </Card>
        </div>
    );
}
