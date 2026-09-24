import { Link } from '@inertiajs/react';
import { QrCode, Receipt, BedDouble, Wrench } from 'lucide-react';
import { absensi, tagihan, detailKamar, laporKerusakan } from '@/routes/mahasiswa';
import { PageHeader, StatCard, Card } from '../../components/ui';
import { formatRupiah } from '../../lib/format';
import type { DashboardStats } from '../../lib/types';
import { useAuth } from '../../context/AppContext';

type PembayaranRow = {
    status?: string;
    nominal?: number;
    jenis_pembayaran?: string;
};

export default function MahasiswaDashboard({
    stats,
    pembayaran = [],
    billing = [],
}: {
    stats?: DashboardStats;
    pembayaran?: PembayaranRow[];
    billing?: Array<{ total: string; total_dibayar: string }>;
}) {
    const { currentUser } = useAuth();

    const pending = (pembayaran ?? []).filter(
        (p) => p.status === 'menunggu_verifikasi',
    ).length;
    const totalTagihan = billing.reduce(
        (sum, invoice) =>
            sum +
            Math.max(0, Number(invoice.total) - Number(invoice.total_dibayar)),
        0,
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title={`Halo, ${currentUser?.nama?.split(' ')[0] ?? 'Mahasiswa'}`}
                subtitle="Ringkasan hunian dan tagihan Anda"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                    label="Status Huni"
                    value={currentUser?.status_huni ?? 'calon'}
                    color="green"
                />
                <StatCard
                    label="Bukti Menunggu Verifikasi"
                    value={pending}
                    color="gold"
                />
                <StatCard
                    label="Sisa Tagihan"
                    value={formatRupiah(totalTagihan)}
                    color="green"
                />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    { title: 'Tagihan & pembayaran', description: 'Lihat invoice dan status pembayaran', href: tagihan.url(), icon: Receipt, visible: true },
                    { title: 'Kamar saya', description: 'Detail penempatan dan masa tinggal', href: detailKamar.url(), icon: BedDouble, visible: true },
                    { title: 'Scan QR / Absensi', description: currentUser?.attendance_eligible ? 'Pindai QR kegiatan dan catat kehadiran' : 'Lihat syarat binaan dan riwayat absensi', href: absensi.url(), icon: QrCode, visible: currentUser?.status_huni === 'aktif' || currentUser?.attendance_eligible },
                    { title: 'Laporkan kerusakan', description: 'Pilih barang dan lokasi fasilitas', href: laporKerusakan.url(), icon: Wrench, visible: currentUser?.status_huni === 'aktif' },
                ].filter((item) => item.visible).map((item) => <Link key={item.title} href={item.href} className="group rounded-2xl border border-base-300 bg-base-100 p-5 transition hover:border-primary hover:shadow-md">
                    <item.icon className="mb-4 size-6 text-primary" />
                    <h2 className="font-semibold group-hover:text-primary">{item.title}</h2>
                    <p className="mt-1 text-xs leading-5 text-base-content/60">{item.description}</p>
                </Link>)}
            </div>
            <Card className="p-5">
                <h3 className="mb-2 font-semibold">Info Kamar</h3>
                <p className="text-muted text-sm">
                    Prodi: {currentUser?.prodi ?? '-'} | Angkatan:{' '}
                    {currentUser?.angkatan ?? '-'}
                </p>
                <p className="text-muted mt-1 text-sm">
                    Okupansi asrama: {stats?.okupansi.total_kamar ?? 0} kamar
                    total
                </p>
            </Card>
        </div>
    );
}
