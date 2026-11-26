import { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { CheckCircle2, ClipboardList, LogOut } from 'lucide-react';
import { complete } from '@/routes/andalas/checkout';
import {
    Badge,
    Button,
    Card,
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
    room_active_occupants?: number;
    room_pending_checkouts?: number;
    all_room_occupants_checked_out?: boolean;
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
        findings?: Array<{
            id: string;
            description?: string;
            severity?: string;
        }>;
    };
};

type ActivePlacementRow = {
    id: string;
    mahasiswa_nama: string;
    nim_nip: string;
    lokasi: string;
    tanggal_mulai: string;
};

type TableRow = Row & {
    mahasiswa_nama: string;
    lokasi: string;
    status_inspeksi: string;
};

export default function CheckoutApproval({
    checkout = [],
    active_placements = [],
}: {
    checkout?: Row[];
    active_placements?: ActivePlacementRow[];
}) {
    const [selected, setSelected] = useState<TableRow | null>(null);
    const [initiateTarget, setInitiateTarget] =
        useState<ActivePlacementRow | null>(null);
    const [initiating, setInitiating] = useState(false);
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

    const waitingGoCount = rows.filter(
        (r) => r.status !== 'selesai' && r.status_inspeksi !== 'selesai',
    ).length;

    const columns: DataColumn<TableRow>[] = [
        { key: 'mahasiswa_nama', label: 'Mahasiswa' },
        { key: 'lokasi', label: 'Gedung / Kamar' },
        {
            key: 'status_kamar',
            label: 'Kondisi Penghuni Kamar',
            render: (row) =>
                row.all_room_occupants_checked_out ? (
                    <Badge color="green">
                        Seluruh penghuni checkout · Dicek GO
                    </Badge>
                ) : (
                    <Badge color="yellow">
                        {row.room_pending_checkouts ?? 1}/
                        {row.room_active_occupants ?? 1} penghuni checkout
                    </Badge>
                ),
        },
        {
            key: 'status_inspeksi',
            label: 'Inspeksi GO',
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
            label: 'Temuan kerusakan',
            render: (row) => {
                const count = row.inspection?.findings?.length ?? 0;
                return count > 0 ? (
                    <Badge color="red">{count} temuan</Badge>
                ) : (
                    'Tidak ada'
                );
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
                    <div className="flex items-center gap-2" title={reason}>
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

    const placementColumns: DataColumn<ActivePlacementRow>[] = [
        { key: 'mahasiswa_nama', label: 'Penghuni' },
        { key: 'nim_nip', label: 'NIM / NIP' },
        { key: 'lokasi', label: 'Gedung / Kamar' },
        { key: 'tanggal_mulai', label: 'Mulai Huni' },
        {
            key: 'aksi',
            label: 'Aksi',
            action: true,
            render: (row) => (
                <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setInitiateTarget(row)}
                >
                    <LogOut className="mr-1.5 size-3.5" />
                    Proses Checkout
                </Button>
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

    function initiateCheckout() {
        if (!initiateTarget) {
            return;
        }
        setInitiating(true);
        router.post(
            `/andalas/checkout/initiate/${initiateTarget.id}`,
            { alasan: 'Checkout diproses oleh fasilitator gedung.' },
            {
                preserveScroll: true,
                onFinish: () => {
                    setInitiating(false);
                    setInitiateTarget(null);
                },
            },
        );
    }

    return (
        <div className="space-y-5">
            <PageHeader
                title="Finalisasi & Monitor Check-out"
                subtitle="Pantau kamar yang menunggu pengecekan GO, proses checkout penghuni secara langsung, dan perbarui kapasitas kamar otomatis."
            />

            {waitingGoCount > 0 && (
                <Card className="border-warning/40 bg-warning/10 flex items-center gap-3 p-4 text-sm">
                    <ClipboardList className="text-warning size-5 shrink-0" />
                    <div>
                        <strong>
                            {waitingGoCount} pengajuan checkout menunggu
                            pengecekan GO.
                        </strong>{' '}
                        Bila dalam 14 hari belum diperiksa GO, sistem akan
                        otomatis menyetujui checkout dan memperbarui kapasitas
                        kamar.
                    </div>
                </Card>
            )}

            <DataTable
                columns={columns}
                data={rows}
                searchKeys={[
                    'mahasiswa_nama',
                    'lokasi',
                    'status_inspeksi',
                    'status',
                ]}
                searchPlaceholder="Cari mahasiswa, kamar, atau status..."
                emptyMessage="Belum ada pengajuan checkout."
            />

            {active_placements.length > 0 && (
                <section className="space-y-3 pt-2">
                    <div>
                        <h2 className="text-base font-semibold">
                            Checkout Langsung Penghuni Aktif (
                            {active_placements.length})
                        </h2>
                        <p className="text-muted text-xs">
                            Fasilitator dapat langsung menginisiasi checkout
                            penghuni gedung tanpa menunggu penghuni mengajukan
                            mandiri.
                        </p>
                    </div>
                    <DataTable
                        columns={placementColumns}
                        data={active_placements}
                        searchKeys={['mahasiswa_nama', 'nim_nip', 'lokasi']}
                        searchPlaceholder="Cari penghuni aktif atau nomor kamar..."
                        emptyMessage="Semua penghuni aktif sudah memiliki pengajuan checkout."
                    />
                </section>
            )}

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
                                <strong>{selected.mahasiswa_nama}</strong> (
                                {selected.lokasi})?
                            </p>
                            <p>
                                Catatan inspeksi:{' '}
                                {selected.inspection?.catatan ?? '-'}
                            </p>
                            <p>
                                Temuan kerusakan:{' '}
                                {(selected.inspection?.findings?.length ?? 0) >
                                0
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

            {initiateTarget !== null && (
                <ConfirmDialog
                    open={initiateTarget !== null}
                    onClose={() => !initiating && setInitiateTarget(null)}
                    title="Proses Checkout Penghuni"
                    confirmLabel="Ya, Ajukan Checkout"
                    loading={initiating}
                    onConfirm={initiateCheckout}
                    message={`Ajukan checkout untuk ${initiateTarget.mahasiswa_nama} (${initiateTarget.lokasi})? GO gedung akan langsung mendapat notifikasi untuk memeriksa kondisi kamar.`}
                />
            )}
        </div>
    );
}
