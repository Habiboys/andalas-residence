import { PageHeader, Card, Table, StatusBadge } from '../../components/ui';
import { mapTicketStatus } from '../../lib/format';

type AsetRow = {
    kode_inventaris?: string;
    nama_aset?: string;
    kategori?: string;
    kondisi?: string;
};
type TiketRow = { nomor_tiket?: string; status?: string; deskripsi?: string };

type Props = {
    aset: AsetRow[];
    tiket: TiketRow[];
};

export default function LaporanAset({ aset = [], tiket = [] }: Props) {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Laporan Aset"
                subtitle="Inventaris dan tiket maintenance"
            />
            <Card>
                <div className="border-base-300 border-b px-5 py-4 font-semibold">
                    Inventaris Aset
                </div>
                <Table
                    columns={[
                        { key: 'kode_inventaris', label: 'Kode' },
                        { key: 'nama_aset', label: 'Nama' },
                        { key: 'kategori', label: 'Kategori' },
                        {
                            key: 'kondisi',
                            label: 'Kondisi',
                            render: (r: AsetRow) => (
                                <StatusBadge status={r.kondisi ?? 'baik'} />
                            ),
                        },
                    ]}
                    data={aset}
                    emptyMessage="Tidak ada aset"
                />
            </Card>
            <Card>
                <div className="border-base-300 border-b px-5 py-4 font-semibold">
                    Tiket Kerusakan
                </div>
                <Table
                    columns={[
                        { key: 'nomor_tiket', label: 'No. Tiket' },
                        { key: 'deskripsi', label: 'Deskripsi' },
                        {
                            key: 'status',
                            label: 'Status',
                            render: (r: TiketRow) => (
                                <StatusBadge
                                    status={mapTicketStatus(r.status ?? '')}
                                />
                            ),
                        },
                    ]}
                    data={tiket}
                    emptyMessage="Tidak ada tiket"
                />
            </Card>
        </div>
    );
}
