import { useState } from 'react';
import {
    PageHeader,
    Card,
    Table,
    FormField,
    inputClass,
} from '../../components/ui';

type AbsensiRow = {
    mahasiswa?: { user?: { nim_nip?: string; nama?: string } };
    attended_at?: string;
    session?: { kegiatan?: { judul: string } };
};

type Props = {
    absensi: AbsensiRow[];
};

export default function RekapKehadiran({ absensi = [] }: Props) {
    const [tanggal, setTanggal] = useState(
        new Date().toISOString().slice(0, 10),
    );
    const filtered = absensi.filter(
        (r) => String(r.attended_at ?? '').slice(0, 10) === tanggal,
    );

    return (
        <div className="space-y-4">
            <PageHeader
                title="Rekap Kehadiran"
                subtitle="Rekap kehadiran kegiatan mahasiswa binaan"
            />
            <Card className="mb-4 p-4">
                <FormField label="Tanggal">
                    <input
                        type="date"
                        className={inputClass}
                        value={tanggal}
                        onChange={(e) => setTanggal(e.target.value)}
                    />
                </FormField>
            </Card>
            <Card>
                <Table
                    columns={[
                        {
                            key: 'nim',
                            label: 'NIM',
                            render: (r: AbsensiRow) =>
                                r.mahasiswa?.user?.nim_nip ?? '-',
                        },
                        {
                            key: 'nama',
                            label: 'Nama',
                            render: (r: AbsensiRow) =>
                                r.mahasiswa?.user?.nama ?? '-',
                        },
                        {
                            key: 'kegiatan',
                            label: 'Kegiatan',
                            render: (r: AbsensiRow) =>
                                r.session?.kegiatan?.judul ?? '-',
                        },
                        {
                            key: 'waktu_scan',
                            label: 'Jam',
                            render: (r: AbsensiRow) =>
                                String(r.attended_at ?? '').slice(11, 16),
                        },
                    ]}
                    data={filtered}
                    emptyMessage="Tidak ada data absensi"
                />
            </Card>
        </div>
    );
}
