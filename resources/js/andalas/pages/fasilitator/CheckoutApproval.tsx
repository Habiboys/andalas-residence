import { useForm } from '@inertiajs/react';
import { PageHeader, Card, Button, StatusBadge } from '../../components/ui';
import { complete } from '@/routes/andalas/checkout';

type Row = {
    id: string;
    status: string;
    mahasiswa?: { user?: { nama: string } };
    inspection?: { status: string; catatan?: string };
};
function Approval({ row }: { row: Row }) {
    const form = useForm({});
    return (
        <Card className="space-y-3 p-5">
            <div className="flex justify-between">
                <strong>{row.mahasiswa?.user?.nama}</strong>
                <StatusBadge status={row.status} />
            </div>
            <p>Inspeksi GO: {row.inspection?.status ?? 'menunggu'}</p>
            <p>{row.inspection?.catatan}</p>
            {Object.entries(form.errors).map(([key, error]) => (
                <p key={key} className="text-error">
                    {String(error)}
                </p>
            ))}
            <Button
                disabled={
                    form.processing ||
                    row.status === 'selesai' ||
                    row.inspection?.status !== 'selesai'
                }
                onClick={() =>
                    form.post(complete.url({ checkoutRequest: row.id }))
                }
            >
                Selesaikan checkout
            </Button>
        </Card>
    );
}
export default function CheckoutApproval({
    checkout = [],
}: {
    checkout?: Row[];
}) {
    return (
        <div className="space-y-4">
            <PageHeader
                title="Finalisasi Check-out"
                subtitle="Selesaikan checkout setelah GO memeriksa kamar. Kapasitas kamar diperbarui otomatis."
            />
            {checkout.map((row) => (
                <Approval key={row.id} row={row} />
            ))}
        </div>
    );
}
