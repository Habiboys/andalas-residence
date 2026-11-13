import { Link, usePoll } from '@inertiajs/react';
import { workflow } from '@/routes/residence';
import { show as showRegistration } from '@/routes/residence/registrations';
import {
    Card,
    PageHeader,
    DataTable,
    StatusBadge,
} from '../../components/ui';
import { formatRupiah } from '../../lib/format';

type Room = {
    id: string;
    nomor_kamar: string;
    tipe_kamar: string;
    lantai?: { gedung?: { nama_gedung: string } };
};
type Stay = {
    id: string;
    stay_kind: string;
    starts_at: string;
    ends_at: string;
    ended_at?: string;
    student_profile?: { user?: { nama: string; nim_nip: string } };
    reserved_room?: Room;
    placement?: { status: string; kamar?: Room };
    tagihan?: { nomor: string; total: string; total_dibayar: string };
};

export default function TemporaryStays({
    facilitator = false,
    stays = [],
    notifications = [],
}: {
    facilitator?: boolean;
    rooms?: Room[];
    stays?: Stay[];
    notifications?: { id: string; data: { message: string } }[];
}) {
    usePoll(5000, { only: ['stays', 'notifications'] });
    return (
        <div className="space-y-5">
            <PageHeader
                title="Hunian Sementara"
                subtitle={
                    facilitator
                        ? 'Pendataan nonmahasiswa di gedung penugasan Anda.'
                        : 'Pendataan Summer Course dan penghuni nonmahasiswa.'
                }
                actions={
                    <Link className="btn btn-primary" href={workflow.url()}>
                        Buka proses pendaftaran
                    </Link>
                }
            />
            <Card className="space-y-4 p-5">
                <h2 className="font-semibold">Pencatatan hunian sementara</h2>
                <p className="text-sm">
                    Summer Course dicatat melalui permohonan kegiatan dan daftar
                    peserta. Penyewa umum didaftarkan oleh pengelola. Petugas
                    gedung mencatat check-in dan pengembalian kunci pada halaman
                    Proses Pendaftaran.
                </p>
                <p className="text-sm">
                    Alokasi dan pembayaran belum berarti penghuni hadir. Masa
                    sewa berakhir memicu pemeriksaan kamar; tempat baru tersedia
                    setelah kunci kembali, dengan mempertimbangkan kondisi
                    kamar.
                </p>
            </Card>
            {!!notifications.length && (
                <Card className="space-y-2 p-5">
                    <h2 className="font-semibold">
                        Pemberitahuan masa tinggal berakhir
                    </h2>
                    {notifications.map((item) => (
                        <p key={item.id} className="text-sm">
                            {item.data.message}
                        </p>
                    ))}
                </Card>
            )}
            <DataTable
                data={stays}
                columns={[
                    {
                        key: 'nama',
                        label: 'Penghuni',
                        value: (row) => row.student_profile?.user?.nama ?? '',
                        render: (row) => row.student_profile?.user?.nama,
                    },
                    {
                        key: 'identity',
                        label: 'NIM / identitas',
                        value: (row) =>
                            row.student_profile?.user?.nim_nip ?? '',
                        render: (row) => row.student_profile?.user?.nim_nip,
                    },
                    {
                        key: 'stay_kind',
                        label: 'Jenis',
                        render: (row) =>
                            row.stay_kind === 'summer_course'
                                ? 'Summer Course'
                                : 'Nonmahasiswa',
                    },
                    {
                        key: 'room',
                        label: 'Kamar',
                        render: (row) =>
                            `${(row.placement?.kamar ?? row.reserved_room)?.lantai?.gedung?.nama_gedung ?? '-'} / ${(row.placement?.kamar ?? row.reserved_room)?.nomor_kamar ?? '-'}`,
                    },
                    {
                        key: 'starts_at',
                        label: 'Masuk',
                        render: (row) => row.starts_at?.slice(0, 10) ?? '-',
                    },
                    {
                        key: 'ends_at',
                        label: 'Keluar',
                        render: (row) => row.ends_at?.slice(0, 10) ?? '-',
                    },
                    {
                        key: 'status',
                        label: 'Status',
                        render: (row) => (
                            <StatusBadge
                                status={
                                    row.placement?.status === 'aktif'
                                        ? 'checkin_fisik'
                                        : row.ended_at
                                          ? 'kunci_dikembalikan'
                                          : 'pending'
                                }
                                label={
                                    row.placement?.status === 'aktif'
                                        ? 'Menghuni'
                                        : row.ended_at
                                          ? 'Kunci kembali'
                                          : 'Belum check-in'
                                }
                            />
                        ),
                    },
                    {
                        key: 'invoice',
                        label: 'Invoice',
                        render: (row) => row.tagihan?.nomor ?? '-',
                    },
                    {
                        key: 'balance',
                        label: 'Sisa tagihan',
                        render: (row) =>
                            formatRupiah(
                                Number(row.tagihan?.total ?? 0) -
                                    Number(row.tagihan?.total_dibayar ?? 0),
                            ),
                    },
                    {
                        key: 'aksi',
                        label: 'Aksi',
                        action: true,
                        render: (row) => (
                            <Link
                                className="btn btn-xs btn-primary"
                                href={showRegistration.url(row.id)}
                            >
                                Kelola
                            </Link>
                        ),
                    },
                ]}
                searchKeys={['nama', 'identity', 'stay_kind']}
            />
        </div>
    );
}
