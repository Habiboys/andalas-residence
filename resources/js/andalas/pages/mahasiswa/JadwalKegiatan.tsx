import { PageHeader, Card, Table } from '../../components/ui';

type KegiatanRow = {
    judul?: string;
    tanggal_mulai?: string;
    lokasi?: string;
    gedung?: { nama_gedung: string } | null;
};

export default function JadwalKegiatan({
    kegiatan = [],
}: {
    kegiatan?: KegiatanRow[];
}) {
    return (
        <div className="space-y-4">
            <PageHeader
                title="Jadwal Kegiatan"
                subtitle="Kegiatan dan pengumuman asrama"
            />
            <Card>
                <Table
                    columns={[
                        { key: 'judul', label: 'Kegiatan' },
                        {
                            key: 'tanggal_mulai',
                            label: 'Tanggal',
                            render: (r: KegiatanRow) =>
                                String(r.tanggal_mulai ?? '').slice(0, 10),
                        },
                        { key: 'lokasi', label: 'Lokasi' },
                        {
                            key: 'cakupan',
                            label: 'Cakupan',
                            filter: {
                                type: 'select',
                                options: [
                                    ...new Set(
                                        kegiatan.map(
                                            (item) =>
                                                item.gedung?.nama_gedung ??
                                                'Umum - seluruh asrama',
                                        ),
                                    ),
                                ],
                            },
                        },
                    ]}
                    data={kegiatan.map((item) => ({
                        ...item,
                        cakupan:
                            item.gedung?.nama_gedung ?? 'Umum - seluruh asrama',
                    }))}
                    emptyMessage="Belum ada kegiatan"
                />
            </Card>
        </div>
    );
}
