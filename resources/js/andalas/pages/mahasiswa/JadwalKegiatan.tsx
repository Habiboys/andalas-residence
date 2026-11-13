import { DataTable, PageHeader, StatusBadge } from '../../components/ui';
import { formatDate } from '../../lib/format';

type KegiatanRow = {
    judul?: string;
    tanggal_mulai?: string;
    tanggal_selesai?: string;
    gedung?: { nama_gedung: string } | null;
};

function scheduleStatus(r: KegiatanRow): { key: string; label: string } {
    const now = Date.now();
    const start = r.tanggal_mulai ? new Date(r.tanggal_mulai).getTime() : NaN;
    const end = r.tanggal_selesai
        ? new Date(r.tanggal_selesai).getTime()
        : start;

    if (!Number.isNaN(end) && now > end) {
        return { key: 'selesai', label: 'Selesai' };
    }
    if (!Number.isNaN(start) && now >= start) {
        return { key: 'berlangsung', label: 'Berlangsung' };
    }
    return { key: 'menunggu', label: 'Akan datang' };
}

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
            <DataTable
                searchKeys={['judul', 'cakupan']}
                searchPlaceholder="Cari judul kegiatan atau gedung..."
                columns={[
                    { key: 'judul', label: 'Kegiatan', sortable: true },
                    {
                        key: 'tanggal_mulai',
                        label: 'Tanggal Mulai',
                        sortable: true,
                        render: (r: KegiatanRow) => formatDate(r.tanggal_mulai),
                    },
                    {
                        key: 'tanggal_selesai',
                        label: 'Batas Waktu',
                        render: (r: KegiatanRow) =>
                            r.tanggal_selesai
                                ? new Date(r.tanggal_selesai).toLocaleString(
                                      'id-ID',
                                  )
                                : '—',
                    },
                    {
                        key: 'status_kegiatan',
                        label: 'Status',
                        filter: {
                            type: 'select',
                            options: [
                                { value: 'berlangsung', label: 'Berlangsung' },
                                { value: 'menunggu', label: 'Akan datang' },
                                { value: 'selesai', label: 'Selesai' },
                            ],
                        },
                        render: (r: KegiatanRow & { status_kegiatan?: string }) => (
                            <StatusBadge
                                status={r.status_kegiatan ?? 'menunggu'}
                            />
                        ),
                    },
                    {
                        key: 'cakupan',
                        label: 'Gedung',
                        filter: {
                            type: 'select',
                            options: [
                                ...new Set(
                                    kegiatan.map(
                                        (item) =>
                                            item.gedung?.nama_gedung ??
                                            'Arsip lama',
                                    ),
                                ),
                            ],
                        },
                    },
                ]}
                data={kegiatan.map((item) => ({
                    ...item,
                    status_kegiatan: scheduleStatus(item).key,
                    cakupan: item.gedung?.nama_gedung ?? 'Arsip lama',
                }))}
                emptyMessage="Belum ada kegiatan terjadwal"
            />
        </div>
    );
}
