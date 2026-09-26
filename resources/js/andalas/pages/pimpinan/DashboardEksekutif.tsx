import {
    ChartCard,
    DonutChart,
    OccupancyChart,
    TrendBarChart,
} from '../../components/charts';
import { photo } from '@/routes/andalas/tiket';
import {
    PageHeader,
    StatCard,
    Card,
    StatusBadge,
    Table,
} from '../../components/ui';
import type { DashboardStats } from '../../lib/types';
import { formatRupiah } from '../../lib/format';

type Report = {
    id: string;
    nomor_tiket: string;
    status: string;
    deskripsi: string;
    catatan_penyelesaian?: string;
    aset?: { nama_aset: string; kode_inventaris: string };
    kamar?: { nomor_kamar: string };
    photos?: Array<{ id: string; type: string }>;
};

type TransaksiRow = { tipe?: string; nominal?: number };

type TeknisiRow = {
    teknisi_id: string;
    nama: string;
    nim_nip: string;
    rata_skor: number | null;
    total_tiket: number;
    total_penilaian: number;
};

type GedungReportRow = {
    kode_gedung: string;
    nama_gedung: string;
    penghuni_aktif: number;
    kamar_total: number;
    kamar_terisi: number;
    aset_rusak: number;
};

export default function DashboardEksekutif({
    stats,
    keuangan = [],
    tiket = [],
    performance = [],
    gedungReport = [],
}: {
    stats?: DashboardStats;
    keuangan?: TransaksiRow[];
    tiket?: Report[];
    performance?: TeknisiRow[];
    gedungReport?: GedungReportRow[];
}) {
    const pemasukan = (keuangan ?? [])
        .filter((t) => t.tipe === 'pemasukan')
        .reduce((s, t) => s + Number(t.nominal ?? 0), 0);
    const pengeluaran = (keuangan ?? [])
        .filter((t) => t.tipe === 'pengeluaran')
        .reduce((s, t) => s + Number(t.nominal ?? 0), 0);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Dashboard Eksekutif"
                subtitle="Mode analitik pimpinan asrama"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Penghuni Aktif"
                    value={stats?.penghuni_aktif ?? 0}
                    color="green"
                />
                <StatCard
                    label="Okupansi"
                    value={
                        stats
                            ? `${stats.okupansi.penuh}/${stats.okupansi.total_kamar}`
                            : '-'
                    }
                    color="gold"
                />
                <StatCard
                    label="Tiket Aktif"
                    value={stats?.tiket_aktif ?? 0}
                    color="red"
                />
                <StatCard
                    label="Pengajuan Pending"
                    value={stats?.pengajuan_pending ?? 0}
                    color="gold"
                />
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
                <ChartCard
                    title="Keterisian kamar"
                    subtitle="Proporsi kamar dengan penghuni aktif"
                >
                    <OccupancyChart
                        total={stats?.okupansi.total_kamar ?? 0}
                        empty={stats?.okupansi.kosong ?? 0}
                    />
                </ChartCard>
                <ChartCard
                    title="Penanganan kerusakan"
                    subtitle="Status laporan fasilitas"
                >
                    <DonutChart
                        data={[
                            {
                                name: 'Selesai',
                                value: tiket.filter(
                                    (item) => item.status === 'selesai',
                                ).length,
                                color: '#27745a',
                            },
                            {
                                name: 'Dikerjakan',
                                value: tiket.filter(
                                    (item) =>
                                        item.status === 'sedang_dikerjakan',
                                ).length,
                                color: '#dbad4a',
                            },
                            {
                                name: 'Laporan lain',
                                value: tiket.filter(
                                    (item) =>
                                        !['selesai', 'sedang_dikerjakan'].includes(
                                            item.status,
                                        ),
                                ).length,
                                color: '#578cc8',
                            },
                        ]}
                    />
                </ChartCard>
                <ChartCard
                    title="Arus keuangan"
                    subtitle="Total transaksi yang tercatat"
                >
                    <TrendBarChart
                        data={[
                            { jenis: 'Pemasukan', jumlah: pemasukan },
                            { jenis: 'Pengeluaran', jumlah: pengeluaran },
                        ]}
                        xKey="jenis"
                        series={[
                            {
                                key: 'jumlah',
                                name: 'Nominal',
                                color: '#27745a',
                            },
                        ]}
                        valueFormatter={formatRupiah}
                    />
                </ChartCard>
            </div>
            <Card>
                <div className="p-5">
                    <h2 className="font-semibold">
                        Pelaporan dan penyelesaian kerusakan
                    </h2>
                </div>
                <Table
                    columns={[
                        { key: 'nomor_tiket', label: 'Tiket' },
                        {
                            key: 'aset',
                            label: 'Barang / kamar',
                            render: (report: Report) =>
                                [
                                    report.aset?.nama_aset,
                                    report.aset?.kode_inventaris,
                                    report.kamar?.nomor_kamar,
                                ]
                                    .filter(Boolean)
                                    .join(' / '),
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            render: (report: Report) => (
                                <StatusBadge status={report.status} />
                            ),
                        },
                        { key: 'deskripsi', label: 'Laporan' },
                        { key: 'catatan_penyelesaian', label: 'Penyelesaian' },
                        {
                            key: 'photos',
                            label: 'Bukti',
                            render: (report: Report) => (
                                <div className="flex flex-wrap gap-2">
                                    {report.photos?.map((item, index) => (
                                        <a
                                            key={item.id}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="link"
                                            href={photo.url({ photo: item.id })}
                                        >
                                            {item.type === 'after'
                                                ? 'Selesai'
                                                : 'Kerusakan'}{' '}
                                            {index + 1}
                                        </a>
                                    ))}
                                </div>
                            ),
                        },
                    ]}
                    data={tiket}
                    emptyMessage="Belum ada laporan kerusakan."
                />
            </Card>
            <Card>
                <div className="p-5">
                    <h2 className="font-semibold">Laporan per gedung</h2>
                </div>
                <Table
                    columns={[
                        { key: 'kode_gedung', label: 'Kode' },
                        { key: 'nama_gedung', label: 'Gedung' },
                        {
                            key: 'penghuni_aktif',
                            label: 'Penghuni aktif',
                            render: (row: GedungReportRow) =>
                                String(row.penghuni_aktif),
                        },
                        {
                            key: 'kamar_terisi',
                            label: 'Kamar terisi',
                            render: (row: GedungReportRow) =>
                                `${row.kamar_terisi}/${row.kamar_total}`,
                        },
                        {
                            key: 'aset_rusak',
                            label: 'Aset rusak/hilang',
                            render: (row: GedungReportRow) =>
                                String(row.aset_rusak),
                        },
                    ]}
                    data={gedungReport}
                    emptyMessage="Belum ada data gedung."
                />
            </Card>
            <Card>
                <div className="p-5">
                    <h2 className="font-semibold">Kinerja teknisi</h2>
                </div>
                <Table
                    columns={[
                        { key: 'nama', label: 'Teknisi' },
                        { key: 'nim_nip', label: 'NIP' },
                        {
                            key: 'rata_skor',
                            label: 'Rata-rata skor',
                            render: (row: TeknisiRow) =>
                                row.rata_skor === null
                                    ? '-'
                                    : Number(row.rata_skor).toFixed(2),
                        },
                        {
                            key: 'total_tiket',
                            label: 'Tiket selesai',
                            render: (row: TeknisiRow) =>
                                String(row.total_tiket),
                        },
                        {
                            key: 'total_penilaian',
                            label: 'Penilaian final',
                            render: (row: TeknisiRow) =>
                                String(row.total_penilaian),
                        },
                    ]}
                    data={performance}
                    emptyMessage="Belum ada data teknisi."
                />
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-5">
                    <p className="text-muted text-xs uppercase">
                        Total Pemasukan
                    </p>
                    <p className="text-success text-2xl font-bold">
                        {formatRupiah(pemasukan)}
                    </p>
                </Card>
                <Card className="p-5">
                    <p className="text-muted text-xs uppercase">
                        Total Pengeluaran
                    </p>
                    <p className="text-error text-2xl font-bold">
                        {formatRupiah(pengeluaran)}
                    </p>
                </Card>
            </div>
        </div>
    );
}
