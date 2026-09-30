import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import { complete } from '@/routes/andalas/checkout';
import {
    ConfirmDialog,
    DataTable,
    IconButton,
    PageHeader,
    StatusBadge,
    type DataColumn,
} from '../../components/ui';

type Row = {
    id: string;
    status: string;
    mahasiswa?: { user?: { nama: string } };
    inspection?: { status: string; catatan?: string };
};

type TableRow = Row & {
    mahasiswa_nama: string;
    status_inspeksi: string;
};

export default function CheckoutApproval({
    checkout = [],
}: {
    checkout?: Row[];
}) {
    const [selected, setSelected] = useState<TableRow | null>(null);
    const form = useForm({});
    const rows: TableRow[] = checkout.map((row) => ({
        ...row,
        mahasiswa_nama: row.mahasiswa?.user?.nama ?? '-',
        status_inspeksi: row.inspection?.status ?? 'menunggu',
    }));

    const columns: DataColumn<TableRow>[] = [
        { key: 'mahasiswa_nama', label: 'Mahasiswa' },
        {
            key: 'status_inspeksi',
            label: 'Status inspeksi',
            render: (row) => <StatusBadge status={row.status_inspeksi} />,
            filter: {
                type: 'select',
                options: ['menunggu', 'selesai'],
            },
        },
        {
            key: 'status',
            label: 'Status checkout',
            render: (row) => <StatusBadge status={row.status} />,
        },
        {
            key: 'catatan',
            label: 'Catatan inspeksi',
            render: (row) => row.inspection?.catatan ?? '-',
        },
        {
            key: 'aksi',
            label: 'Aksi',
            action: true,
            render: (row) => (
                <IconButton
                    label="Finalisasi checkout"
                    icon={CheckCircle2}
                    tone="text-success hover:bg-success/10"
                    disabled={
                        row.status === 'selesai' ||
                        row.status_inspeksi !== 'selesai'
                    }
                    onClick={() => {
                        form.clearErrors();
                        setSelected(row);
                    }}
                />
            ),
        },
    ];

    function finalizeCheckout() {
        if (!selected) {
            return;
        }

        form.post(complete.url({ checkoutRequest: selected.id }), {
            onSuccess: () => setSelected(null),
        });
    }

    return (
        <div className="space-y-4">
            <PageHeader
                title="Finalisasi Check-out"
                subtitle="Selesaikan checkout setelah GO memeriksa kamar. Kapasitas kamar diperbarui otomatis."
            />

            <DataTable
                columns={columns}
                data={rows}
                searchKeys={['mahasiswa_nama', 'status_inspeksi', 'status']}
                searchPlaceholder="Cari mahasiswa atau status..."
                emptyMessage="Belum ada pengajuan checkout."
            />

            <ConfirmDialog
                open={selected !== null}
                onClose={() => setSelected(null)}
                title="Finalisasi checkout"
                confirmLabel="Selesaikan checkout"
                loading={form.processing}
                onConfirm={finalizeCheckout}
                message={
                    <div className="space-y-3">
                        <p>
                            Finalisasi checkout untuk{' '}
                            <strong>{selected?.mahasiswa_nama}</strong>?
                        </p>
                        <p>
                            Catatan inspeksi:{' '}
                            {selected?.inspection?.catatan ?? '-'}
                        </p>
                        {Object.entries(form.errors).map(([key, error]) => (
                            <p key={key} className="text-error">
                                {String(error)}
                            </p>
                        ))}
                    </div>
                }
            />
        </div>
    );
}
