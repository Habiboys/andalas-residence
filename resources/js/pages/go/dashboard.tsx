import { Link } from '@inertiajs/react';
import { checkoutInspection } from '@/routes/go';
import { Card, PageHeader } from '@/andalas/components/ui';
export default function Dashboard({
    inspection_pending = 0,
}: {
    inspection_pending?: number;
}) {
    return (
        <div className="space-y-4">
            <PageHeader
                title="Dashboard GO"
                subtitle="Pemeriksaan kondisi kamar untuk pengajuan checkout."
            />
            <Card className="space-y-3 p-5">
                <p>{inspection_pending} pengajuan menunggu pemeriksaan.</p>
                <Link
                    className="btn btn-primary"
                    href={checkoutInspection.url()}
                >
                    Periksa kamar
                </Link>
            </Card>
        </div>
    );
}
