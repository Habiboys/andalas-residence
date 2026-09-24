import { Link } from '@inertiajs/react';
import { jadwalKegiatan } from '@/routes/fasilitator';
import { ChartCard, OccupancyChart } from '../../components/charts';
import { PageHeader, StatCard, Card } from '../../components/ui';
import type { DashboardStats } from '../../lib/types';

export default function FasilitatorDashboard({
    stats,
    absensi = [],
    assigned_building,
}: {
    stats?: DashboardStats;
    absensi?: unknown[];
    assigned_building?: { nama_gedung: string; kode_gedung: string } | null;
}) {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Dashboard Fasilitator"
                subtitle="Ringkasan hunian dan absensi di gedung penugasan Anda"
            />
            <section
                className="border-base-300 bg-base-100 rounded-lg border px-5 py-4"
                aria-label="Gedung penugasan"
            >
                <p className="text-base-content/60 text-sm">
                    Gedung penugasan Anda
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                    {assigned_building
                        ? `${assigned_building.nama_gedung} (${assigned_building.kode_gedung})`
                        : 'Belum ada penugasan gedung'}
                </h2>
                <p className="text-base-content/70 mt-1 text-sm">
                    {assigned_building
                        ? 'Data penghuni, kamar, kegiatan, dan absensi di dashboard ini mengikuti gedung tersebut.'
                        : 'Hubungi admin untuk menetapkan satu gedung melalui Data Master → Penugasan Fasilitator. Kegiatan belum dapat dibuat sebelum penugasan tersedia.'}
                </p>
            </section>
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
                <ChartCard
                    title="Keterisian hunian"
                    subtitle="Kamar dengan penghuni dibandingkan total kamar"
                >
                    <OccupancyChart
                        total={stats?.okupansi.total_kamar ?? 0}
                        empty={stats?.okupansi.kosong ?? 0}
                    />
                </ChartCard>
                <Card className="border-base-200 justify-center gap-4 border p-6">
                    <h2 className="text-xl font-semibold">
                        Kegiatan hari ini dimulai dari sini.
                    </h2>
                    <p className="text-base-content/60 text-sm">
                        Buat kegiatan sekaligus QR, lalu pantau kehadiran
                        mahasiswa binaan per lantai.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            className="btn btn-primary"
                            href={jadwalKegiatan.url()}
                        >
                            Kegiatan & Absensi
                        </Link>
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
