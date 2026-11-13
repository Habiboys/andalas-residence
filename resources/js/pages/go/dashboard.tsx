import { Link } from '@inertiajs/react';
import { checkoutInspection, monitoringKamar } from '@/routes/go';
import { Card, PageHeader, StatCard } from '@/andalas/components/ui';

type GoSummary = {
    menunggu: number;
    berlangsung: number;
    selesai: number;
};

export default function Dashboard({
    inspection_pending = 0,
    go_summary,
}: {
    inspection_pending?: number;
    go_summary?: GoSummary;
}) {
    const menunggu = go_summary?.menunggu ?? inspection_pending;
    const berlangsung = go_summary?.berlangsung ?? 0;
    const selesai = go_summary?.selesai ?? 0;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Dashboard GO"
                subtitle="Pemeriksaan kondisi kamar dan aset untuk pengajuan checkout mahasiswa."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                    label="Menunggu Inspeksi"
                    value={menunggu}
                    color={menunggu > 0 ? 'amber' : 'gray'}
                />
                <StatCard
                    label="Sedang Diinspeksi"
                    value={berlangsung}
                    color="blue"
                />
                <StatCard
                    label="Inspeksi Selesai"
                    value={selesai}
                    color="green"
                />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card className="space-y-3 p-5">
                    <h2 className="text-base font-semibold">
                        Inspeksi Checkout
                    </h2>
                    <p className="text-muted text-sm">
                        <span className="font-semibold">
                            {inspection_pending}
                        </span>{' '}
                        pengajuan menunggu penyelesaian pemeriksaan sebelum
                        disetujui fasilitator.
                    </p>
                    <Link
                        className="btn btn-primary btn-sm"
                        href={checkoutInspection.url()}
                    >
                        Periksa kamar
                    </Link>
                </Card>
                <Card className="space-y-3 p-5">
                    <h2 className="text-base font-semibold">
                        Monitoring Kamar
                    </h2>
                    <p className="text-muted text-sm">
                        Pantau peta kamar per gedung dan lantai untuk koordinasi
                        pengecekan lapangan.
                    </p>
                    <Link
                        className="btn btn-outline btn-sm"
                        href={monitoringKamar.url()}
                    >
                        Lihat monitoring kamar
                    </Link>
                </Card>
            </div>
        </div>
    );
}
