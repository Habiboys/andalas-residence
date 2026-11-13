import { Link } from '@inertiajs/react';
import { tiket as tiketMasuk, updateTiket } from '@/routes/teknisi';
import { PageHeader, StatCard, Card } from '../../components/ui';
type TiketRow = { id: string; status?: string };

export default function TeknisiDashboard({
    tiket = [],
}: {
    tiket?: TiketRow[];
}) {
    const aktif = (tiket ?? []).filter(
        (t) => !['selesai', 'dibatalkan'].includes(t.status ?? ''),
    ).length;
    const selesai = (tiket ?? []).filter((t) => t.status === 'selesai').length;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Dashboard Teknisi"
                subtitle="Ringkasan tiket maintenance"
            />
            <div className="grid max-w-lg grid-cols-2 gap-4">
                <StatCard label="Tiket Aktif" value={aktif} color="red" />
                <StatCard label="Tiket Selesai" value={selesai} color="green" />
            </div>
            <Card className="space-y-3 p-5">
                <p className="text-muted text-sm">
                    Ambil tiket dari menu Tiket Masuk, catat progres harian di
                    Pelaporan, atau perbarui status pekerjaan di Update Tiket.
                </p>
                <div className="flex flex-wrap gap-2">
                    <Link className="btn btn-primary" href={tiketMasuk.url()}>
                        Tiket Masuk
                    </Link>
                    <Link
                        className="btn btn-outline"
                        href={updateTiket.url()}
                    >
                        Update Tiket
                    </Link>
                    <Link className="btn btn-ghost" href="/pelaporan">
                        Pelaporan & Logbook
                    </Link>
                </div>
            </Card>
        </div>
    );
}
