import { Link, usePage } from '@inertiajs/react';
import {
    ChartCard,
    DonutChart,
    OccupancyChart,
    TrendAreaChart,
    TrendBarChart,
    TrendLineChart,
} from '../../components/charts';
import * as admin from '@/routes/admin';
import * as layanan from '@/routes/admin_layanan';
import { PageHeader, StatCard, Table, StatusBadge } from '../../components/ui';
import type { DashboardStats } from '../../lib/types';

const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(n);

type PembayaranRow = {
    id: string;
    kode_transaksi?: string;
    jenis_pembayaran?: string;
    nominal?: number;
    status?: string;
    created_at?: string;
    mahasiswa?: { user?: { nim_nip?: string; nama?: string } };
};

export default function AdminDashboard({
    stats,
    pembayaran = [],
}: {
    stats?: DashboardStats;
    pembayaran?: PembayaranRow[];
}) {
    const pendingPembayaran = (pembayaran ?? []).filter(
        (p) => p.status === 'menunggu_verifikasi',
    );

    const role = usePage().props.role;
    const paymentUrl =
        role === 'admin_layanan'
            ? layanan.verifikasiPembayaran.url()
            : admin.verifikasiPembayaran.url();
    const monthly = Object.values(
        pembayaran
            .filter(
                (item) => item.status === 'terverifikasi' && item.created_at,
            )
            .reduce<Record<string, { bulan: string; total: number }>>(
                (result, item) => {
                    const month = item.created_at!.slice(0, 7);
                    result[month] ??= { bulan: month, total: 0 };
                    result[month].total += Number(item.nominal ?? 0);
                    return result;
                },
                {},
            ),
    ).sort((a, b) => a.bulan.localeCompare(b.bulan));
    const okupansiPct = stats
        ? Math.round(
              ((stats.okupansi.total_kamar - stats.okupansi.kosong) /
                  Math.max(stats.okupansi.total_kamar, 1)) *
                  100,
          )
        : 0;
    const paymentTypes = Object.values(
        pembayaran.reduce<Record<string, { jenis: string; jumlah: number }>>(
            (result, item) => {
                const jenis = item.jenis_pembayaran || 'Belum dikategorikan';
                result[jenis] ??= { jenis, jumlah: 0 };
                result[jenis].jumlah += 1;
                return result;
            },
            {},
        ),
    );
    const paymentActivity = Object.values(
        pembayaran.reduce<
            Record<
                string,
                {
                    bulan: string;
                    menunggu: number;
                    terverifikasi: number;
                    ditolak: number;
                }
            >
        >((result, item) => {
            if (!item.created_at) {
                return result;
            }
            const bulan = item.created_at.slice(0, 7);
            result[bulan] ??= {
                bulan,
                menunggu: 0,
                terverifikasi: 0,
                ditolak: 0,
            };
            if (item.status === 'menunggu_verifikasi') {
                result[bulan].menunggu += 1;
            }
            if (item.status === 'terverifikasi') {
                result[bulan].terverifikasi += 1;
            }
            if (item.status === 'ditolak') {
                result[bulan].ditolak += 1;
            }
            return result;
        }, {}),
    ).sort((a, b) => a.bulan.localeCompare(b.bulan));

    const tableColumns = [
        {
            key: 'nim',
            label: 'NIM',
            render: (row: Record<string, unknown>) =>
                String(
                    (row.mahasiswa as PembayaranRow['mahasiswa'])?.user
                        ?.nim_nip ?? '-',
                ),
        },
        {
            key: 'nama',
            label: 'Nama',
            render: (row: Record<string, unknown>) =>
                String(
                    (row.mahasiswa as PembayaranRow['mahasiswa'])?.user?.nama ??
                        '-',
                ),
        },
        { key: 'jenis_pembayaran', label: 'Jenis' },
        {
            key: 'nominal',
            label: 'Jumlah',
            render: (row: Record<string, unknown>) =>
                formatRupiah(Number(row.nominal ?? 0)),
        },
        {
            key: 'created_at',
            label: 'Tanggal',
            render: (row: Record<string, unknown>) =>
                typeof row.created_at === 'string'
                    ? row.created_at.slice(0, 10)
                    : '-',
        },
        {
            key: 'status',
            label: 'Status',
            render: (row: Record<string, unknown>) => (
                <StatusBadge status={String(row.status)} />
            ),
        },
        {
            key: 'aksi',
            label: 'Aksi',
            render: () => (
                <Link className="btn btn-xs btn-primary" href={paymentUrl}>
                    Verifikasi
                </Link>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Dashboard Administrasi"
                subtitle="Ringkasan aktivitas dan status terkini asrama"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                    label="Penghuni Aktif"
                    value={stats?.penghuni_aktif ?? 0}
                    color="green"
                />
                <StatCard
                    label="Pengajuan Pending"
                    value={stats?.pengajuan_pending ?? 0}
                    color="gold"
                />
                <StatCard
                    label="Tiket Aktif"
                    value={stats?.tiket_aktif ?? 0}
                    color="red"
                />
                <StatCard
                    label="Tingkat Okupansi"
                    value={`${okupansiPct}%`}
                    color="green"
                />
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
                <ChartCard
                    title="Keterisian kamar"
                    subtitle="Kamar yang memiliki penghuni"
                >
                    <OccupancyChart
                        total={stats?.okupansi.total_kamar ?? 0}
                        empty={stats?.okupansi.kosong ?? 0}
                    />
                </ChartCard>
                <ChartCard
                    title="Status pembayaran"
                    subtitle="Distribusi bukti pembayaran yang tercatat"
                >
                    <DonutChart
                        data={[
                            {
                                name: 'Terverifikasi',
                                value: pembayaran.filter(
                                    (p) => p.status === 'terverifikasi',
                                ).length,
                                color: '#27745a',
                            },
                            {
                                name: 'Menunggu',
                                value: pendingPembayaran.length,
                                color: '#dbad4a',
                            },
                            {
                                name: 'Ditolak',
                                value: pembayaran.filter(
                                    (p) => p.status === 'ditolak',
                                ).length,
                                color: '#bc6676',
                            },
                        ]}
                    />
                </ChartCard>
                <ChartCard
                    title="Pembayaran terverifikasi"
                    subtitle="Total per bulan berdasarkan tanggal pembayaran dicatat"
                >
                    <TrendAreaChart
                        data={monthly}
                        xKey="bulan"
                        series={[
                            {
                                key: 'total',
                                name: 'Pembayaran',
                                color: '#578cc8',
                            },
                        ]}
                        valueFormatter={formatRupiah}
                    />
                </ChartCard>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard
                    title="Jenis pembayaran"
                    subtitle="Jumlah transaksi yang tercatat menurut jenis pembayaran"
                >
                    <TrendBarChart
                        data={paymentTypes}
                        xKey="jenis"
                        series={[
                            {
                                key: 'jumlah',
                                name: 'Jumlah transaksi',
                                color: '#578cc8',
                            },
                        ]}
                    />
                </ChartCard>
                <ChartCard
                    title="Aktivitas pembayaran"
                    subtitle="Jumlah transaksi per status dan bulan pencatatan"
                >
                    <TrendLineChart
                        data={paymentActivity}
                        xKey="bulan"
                        series={[
                            {
                                key: 'terverifikasi',
                                name: 'Terverifikasi',
                                color: '#27745a',
                            },
                            {
                                key: 'menunggu',
                                name: 'Menunggu verifikasi',
                                color: '#dbad4a',
                            },
                            {
                                key: 'ditolak',
                                name: 'Ditolak',
                                color: '#bc6676',
                            },
                        ]}
                    />
                </ChartCard>
            </div>
            <section className="space-y-4">
                <h2 className="font-semibold">
                    Pembayaran Menunggu Verifikasi
                </h2>
                <Table
                    columns={tableColumns}
                    data={
                        pendingPembayaran as unknown as Record<
                            string,
                            unknown
                        >[]
                    }
                    emptyMessage="Tidak ada pembayaran pending"
                />
            </section>
        </div>
    );
}
