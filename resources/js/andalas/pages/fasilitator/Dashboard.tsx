import { Link } from '@inertiajs/react';
import { scanBarcode, jadwalKegiatan } from '@/routes/fasilitator';
import { ChartCard, OccupancyChart } from '../../components/charts';
import { PageHeader, StatCard, Card } from '../../components/ui';
import type { DashboardStats } from '../../lib/types';

export default function FasilitatorDashboard({
    stats,
    absensi = [],
}: {
    stats?: DashboardStats;
    absensi?: unknown[];
}) {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Dashboard Fasilitator"
                subtitle="Ringkasan wilayah dan absensi hari ini"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                    label="Absensi Hari Ini"
                    value={absensi?.length ?? 0}
                    color="green"
                />
                <StatCard
                    label="Penghuni Aktif"
                    value={stats?.penghuni_aktif ?? 0}
                    color="gold"
                />
                <StatCard
                    label="Okupansi Kamar"
                    value={
                        stats
                            ? `${stats.okupansi.total_kamar - stats.okupansi.kosong}/${stats.okupansi.total_kamar}`
                            : '-'
                    }
                    color="green"
                />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard title="Keterisian hunian" subtitle="Kamar dengan penghuni dibandingkan total kamar">
                    <OccupancyChart total={stats?.okupansi.total_kamar ?? 0} empty={stats?.okupansi.kosong ?? 0} />
                </ChartCard>
                <Card className="justify-center gap-4 border border-base-200 p-6">
                    <h2 className="text-xl font-semibold">Kegiatan hari ini dimulai dari sini.</h2>
                    <p className="text-sm text-base-content/60">Kelola jadwal, buka sesi QR, lalu pantau kehadiran mahasiswa binaan.</p>
                    <div className="flex flex-wrap gap-2">
                        <Link className="btn btn-primary" href={scanBarcode.url()}>Buka sesi QR</Link>
                        <Link className="btn btn-outline" href={jadwalKegiatan.url()}>Kelola kegiatan</Link>
                    </div>
                </Card>
            </div>
            <Card className="text-muted p-5 text-sm">
                Kelola kegiatan, buka QR absensi untuk mahasiswa binaan, dan
                selesaikan checkout setelah pemeriksaan GO.
            </Card>
        </div>
    );
}
