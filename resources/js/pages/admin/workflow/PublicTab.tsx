import { store as storeGeneralStay } from '@/actions/App/Http/Controllers/TemporaryStayController';
import {
    DataTable,
    StatusBadge,
    type DataColumn,
} from '@/andalas/components/ui';
import { formatRupiah } from '@/andalas/lib/format';
import { Link } from '@inertiajs/react';
import { ActionForm, Field, WorkflowPanel, fieldInputClass } from './shared';
import type { PublicStay, Room } from './types';

export default function PublicTab({
    rooms,
    stays = [],
}: {
    rooms: Room[];
    stays?: PublicStay[];
}) {
    const columns: DataColumn<PublicStay>[] = [
        {
            key: 'nama',
            label: 'Penyewa / Tamu',
            value: (row) => row.student_profile?.user?.nama ?? '',
            render: (row) => (
                <div>
                    <p className="font-medium">
                        {row.student_profile?.user?.nama ?? '-'}
                    </p>
                    <p className="text-base-content/60 text-xs">
                        {row.student_profile?.user?.nim_nip ?? '-'}
                    </p>
                </div>
            ),
        },
        {
            key: 'room',
            label: 'Kamar',
            render: (row) => {
                const room = row.placement?.kamar ?? row.reserved_room;
                return room
                    ? `${room.lantai.gedung.nama_gedung} / ${room.nomor_kamar}`
                    : '-';
            },
        },
        {
            key: 'period',
            label: 'Masa Tinggal',
            render: (row) =>
                `${row.starts_at.slice(0, 10)} s.d. ${row.ends_at.slice(0, 10)}`,
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => (
                <StatusBadge
                    status={
                        row.keys_returned_at
                            ? 'selesai'
                            : row.checked_in_at
                              ? 'aktif'
                              : 'menunggu'
                    }
                    label={
                        row.keys_returned_at
                            ? 'Kunci kembali'
                            : row.checked_in_at
                              ? 'Menghuni'
                              : 'Belum check-in'
                    }
                />
            ),
        },
        {
            key: 'balance',
            label: 'Sisa Tagihan',
            render: (row) =>
                formatRupiah(
                    Math.max(
                        0,
                        Number(row.tagihan?.total ?? 0) -
                            Number(row.tagihan?.total_dibayar ?? 0),
                    ),
                ),
        },
        {
            key: 'aksi',
            label: 'Aksi',
            action: true,
            render: (row) => (
                <Link
                    href={`/residence-process/registrations/${row.id}`}
                    className="btn btn-primary btn-xs"
                >
                    Kelola / Check-in
                </Link>
            ),
        },
    ];

    return (
        <div className="space-y-5">
            <WorkflowPanel
                title="Permohonan penyewa umum"
                subtitle="Setelah tagihan terbit, buka detail pendaftaran untuk mengunggah bukti transfer atau mengajukan penundaan kepada pimpinan, lalu verifikasi berkas dan serah kunci."
            >
                <ActionForm
                    url={storeGeneralStay.url()}
                    label="Daftarkan penyewa umum"
                >
                    <input type="hidden" name="stay_kind" value="non_student" />

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field name="nama" label="Nama sesuai identitas" />
                        <Field name="nim_nip" label="NIK / nomor paspor" />
                        <Field
                            name="email"
                            label="Email (opsional)"
                            type="email"
                            required={false}
                        />
                        <Field name="gender" label="Jenis kelamin">
                            <select className={fieldInputClass} name="gender">
                                <option value="perempuan">Perempuan</option>
                                <option value="laki_laki">Laki-laki</option>
                            </select>
                        </Field>
                        <Field
                            name="starts_at"
                            label="Tanggal masuk"
                            type="date"
                        />
                        <Field
                            name="ends_at"
                            label="Tanggal keluar"
                            type="date"
                        />
                        <Field name="kamar_id" label="Kamar">
                            <select
                                className={fieldInputClass}
                                name="kamar_id"
                                required
                            >
                                <option value="">Pilih kamar</option>
                                {rooms.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.lantai.gedung.nama_gedung} /{' '}
                                        {r.nomor_kamar}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>
                </ActionForm>
            </WorkflowPanel>

            <WorkflowPanel title={`Daftar Penyewa Umum (${stays.length})`}>
                <DataTable
                    columns={columns}
                    data={stays}
                    searchKeys={['nama']}
                    searchPlaceholder="Cari nama penyewa umum..."
                    emptyMessage="Belum ada penyewa umum tercatat."
                />
            </WorkflowPanel>
        </div>
    );
}
