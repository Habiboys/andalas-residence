import { Link } from '@inertiajs/react';
import { kelolaAset, pemetaanKamar } from '@/routes/admin_aset';
import { Card, PageHeader } from '@/andalas/components/ui';
export default function Dashboard() {
    return (
        <div className="space-y-4">
            <PageHeader
                title="Dashboard Admin Aset"
                subtitle="Kelola inventaris dan lokasi barang pada kamar atau fasilitas umum."
            />
            <Card className="flex flex-wrap gap-3 p-5">
                <Link className="btn btn-primary" href={kelolaAset.url()}>
                    Kelola inventaris
                </Link>
                <Link className="btn btn-outline" href={pemetaanKamar.url()}>
                    Pemetaan kamar
                </Link>
            </Card>
        </div>
    );
}
