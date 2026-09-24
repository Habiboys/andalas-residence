import { PageHeader, Card, DataTable, StatusBadge } from '../../components/ui';
import { photo } from '@/routes/andalas/tiket';
import { mapTicketStatus } from '../../lib/format';

type TiketRow = {
    id: string;
    nomor_tiket?: string;
    photos?: Array<{ id: string; type: string }>;
    aset?: {
        nama_aset: string;
        kode_inventaris: string;
        fasilitas_umum?: { nama_fasilitas: string };
    };
    kamar?: {
        nomor_kamar: string;
        lantai?: { gedung?: { nama_gedung: string } };
    };
    deskripsi?: string;
    status?: string;
    tanggal_lapor?: string;
};

type Props = {
    tiket: TiketRow[];
};

export default function TiketMasuk({ tiket = [] }: Props) {
    const incoming = tiket.filter((t) =>
        ['menunggu_triage', 'didisposisikan'].includes(t.status ?? ''),
    );

    const columns = [
        { key: 'nomor_tiket', label: 'No. Tiket' },
        {
            key: 'aset',
            label: 'Barang',
            render: (row: TiketRow) =>
                [row.aset?.nama_aset, row.aset?.kode_inventaris]
                    .filter(Boolean)
                    .join(' / ') || '-',
        },
        {
            key: 'lokasi',
            label: 'Lokasi',
            render: (row: TiketRow) =>
                row.kamar
                    ? [
                          row.kamar.lantai?.gedung?.nama_gedung,
                          row.kamar.nomor_kamar,
                      ].join(' / ')
                    : (row.aset?.fasilitas_umum?.nama_fasilitas ?? '-'),
        },
        { key: 'deskripsi', label: 'Deskripsi' },
        {
            key: 'photos',
            label: 'Foto laporan',
            render: (row: TiketRow) => (
                <div className="flex flex-wrap gap-2">
                    {row.photos
                        ?.filter((item) => item.type === 'before')
                        .map((item, index) => (
                            <a
                                key={item.id}
                                className="link link-primary"
                                target="_blank"
                                rel="noreferrer"
                                href={photo.url({ photo: item.id })}
                            >
                                Foto {index + 1}
                            </a>
                        ))}
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: (r: TiketRow) => (
                <StatusBadge status={mapTicketStatus(r.status ?? '')} />
            ),
        },
        {
            key: 'tanggal_lapor',
            label: 'Tanggal',
            render: (r: TiketRow) => String(r.tanggal_lapor ?? '').slice(0, 10),
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Tiket Masuk"
                subtitle="Daftar tiket yang perlu ditangani"
            />
            <Card className="p-4">
                <DataTable
                    columns={columns as never}
                    data={incoming as never}
                    emptyMessage="Tidak ada tiket masuk"
                />
            </Card>
        </div>
    );
}
