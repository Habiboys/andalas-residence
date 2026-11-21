import { Link } from '@inertiajs/react';
import { Bell, CheckCircle2, Clock, Wrench, XCircle } from 'lucide-react';
import { Card, PageHeader, StatCard } from '../../components/ui';

type TiketRow = { id: string; status?: string };

export default function TeknisiDashboard({
    tiket = [],
    damage_summary = {},
    blocked_count = 0,
    new_items_count = 0,
}: {
    tiket?: TiketRow[];
    damage_summary?: Record<string, number>;
    blocked_count?: number;
    new_items_count?: number;
}) {
    const belumDikerjakan =
        (damage_summary.menunggu_triage ?? 0) +
            (damage_summary.didisposisikan ?? 0) ||
        (tiket ?? []).filter((t) =>
            ['menunggu_triage', 'didisposisikan'].includes(t.status ?? ''),
        ).length;
    const sedangDikerjakan =
        damage_summary.sedang_dikerjakan ??
        (tiket ?? []).filter((t) => t.status === 'sedang_dikerjakan').length;
    const selesai =
        damage_summary.selesai ??
        (tiket ?? []).filter((t) => t.status === 'selesai').length;
    const dibatalkan =
        damage_summary.dibatalkan ??
        (tiket ?? []).filter((t) => t.status === 'dibatalkan').length;

    return (
        <div className="space-y-4">
            <PageHeader
                title="Beranda Teknisi"
                subtitle="Ringkasan seluruh permohonan perbaikan asrama"
            />

            {new_items_count > 0 && (
                <Link
                    href="/pelaporan"
                    className="alert alert-info flex items-center justify-between gap-3 rounded-xl text-sm shadow-xs"
                >
                    <div className="flex items-center gap-2.5">
                        <Bell className="size-5 shrink-0" aria-hidden="true" />
                        <span>
                            Ada <strong>{new_items_count}</strong> keluhan baru
                            pada kamar yang sedang/menunggu dikerjakan.
                        </span>
                    </div>
                    <span className="btn btn-xs btn-neutral shrink-0">
                        Buka
                    </span>
                </Link>
            )}

            <div className="grid grid-cols-2 gap-3">
                <StatCard
                    label="Belum Dikerjakan"
                    value={belumDikerjakan}
                    color="gold"
                    icon={<Clock className="size-4" aria-hidden="true" />}
                />
                <StatCard
                    label="Sedang Dikerjakan"
                    value={sedangDikerjakan}
                    color="red"
                    icon={<Wrench className="size-4" aria-hidden="true" />}
                />
                <StatCard
                    label="Selesai"
                    value={selesai}
                    color="green"
                    icon={
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                    }
                />
                <StatCard
                    label="Dibatalkan"
                    value={dibatalkan}
                    icon={<XCircle className="size-4" aria-hidden="true" />}
                />
            </div>

            {blocked_count > 0 && (
                <p className="text-warning text-xs font-medium">
                    Terhambat material/akses: {blocked_count} laporan (termasuk
                    dalam sedang dikerjakan).
                </p>
            )}

            <Card className="space-y-3 p-4">
                <p className="text-muted text-sm">
                    Ketuk tombol di bawah untuk mengambil permohonan perbaikan,
                    mengunggah foto langsung, atau mencatat logbook harian.
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Link className="btn btn-primary w-full" href="/pelaporan">
                        Permohonan Perbaikan &amp; Logbook
                    </Link>
                    <Link
                        className="btn btn-outline w-full"
                        href="/teknisi/riwayat-penilaian"
                    >
                        Riwayat &amp; Penilaian
                    </Link>
                </div>
            </Card>
        </div>
    );
}
