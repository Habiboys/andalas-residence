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
    placement?: {
        kamar?: {
            nomor_kamar: string;
            lantai?: { gedung?: { nama_gedung: string } };
        };
    };
    inspection?: {
        status: string;
        catatan?: string;
        findings?: Array<{ id: string; description?: string; severity?: string }>;
    };
};

type TableRow = Row & {
    mahasiswa_nama: string;
    lokasi: string;
    status_inspeksi: string;
};

export default function CheckoutApproval({
    checkout = [],
}: {
    checkout?: Row[];
}) {
    const [selected, setSelected] = useState<TableRow | null>(null);
    const form = useForm({});
    const approveDisabledReason = (row: TableRow) =>
        row.status !== 'selesai' && row.status_inspeksi !== 'selesai'
            ? 'Menunggu inspeksi selesai oleh GO'
            : undefined;
    const rows: TableRow[] = checkout.map((row) => ({
        ...row,
        mahasiswa_nama: row.mahasiswa?.user?.nama ?? '-',
        lokasi:
            [
                row.placement?.kamar?.lantai?.gedung?.nama_gedung,
                row.placement?.kamar?.nomor_kamar &&
                    `Kamar ${row.placement.kamar.nomor_kamar}`,
            ]
                .filter(Boolean)
                .join(' / ') || '-',
        status_inspeksi: row.inspection?.status ?? 'menunggu',
    }));

    const columns: DataColumn<TableRow>[] = [
        { key: 'mahasiswa_nama', label: 'Mahasiswa' },
        { key: 'lokasi', label: 'Gedung / Kamar' },
        {
            key: 'status_inspeksi',
            label: 'Status inspeksi',
            render: (row) => <StatusBadge status={row.status_inspeksi} />,
            filter: {
                type: 'select',
                options: ['menunggu', 'berlangsung', 'selesai'],
            },
        },
        {
            key: 'status',
            label: 'Status checkout',
            render: (row) => <StatusBadge status={row.status} />,
        },
        {
            key: 'temuan',
            label: 'Temuan aset',
            render: (row) => {
                const count = row.inspection?.findings?.length ?? 0;
                return count > 0 ? `${count} temuan` : 'Tidak ada';
            },
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
            render: (row) => {
                const reason = approveDisabledReason(row);
                return (
                    <div
                        className="flex items-center gap-2"
                        title={reason}
                    >
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
                        {reason && (
                            <span className="text-muted text-xs">
                                Menunggu GO
                            </span>
                        )}
                    </div>
                );
            },
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
                searchKeys={['mahasiswa_nama', 'lokasi', 'status_inspeksi', 'status']}
                searchPlaceholder="Cari mahasiswa, kamar, atau status..."
                emptyMessage="Belum ada pengajuan checkout."
            />

            {selected !== null && (
                <ConfirmDialog
                    open={selected !== null}
                    onClose={() => !form.processing && setSelected(null)}
                    title="Finalisasi checkout"
                    confirmLabel="Selesaikan checkout"
                    loading={form.processing}
                    onConfirm={finalizeCheckout}
                    message={
                        <div className="space-y-3">
                            <p>
                                Finalisasi checkout untuk{' '}
                                <strong>{selected.mahasiswa_nama}</strong> ({selected.lokasi})?
                            </p>
                            <p>
                                Catatan inspeksi:{' '}
                                {selected.inspection?.catatan ?? '-'}
                            </p>
                            <p>
                                Temuan aset:{' '}
                                {(selected.inspection?.findings?.length ?? 0) > 0
                                    ? `${selected.inspection?.findings?.length} temuan dicatat GO`
                                    : 'Tidak ada temuan'}
                            </p>
                            {Object.entries(form.errors).map(([key, error]) => (
                                <p key={key} className="text-error">
                                    {String(error)}
                                </p>
                            ))}
                        </div>
                    }
                />
            )}
        </div>
    );
}
