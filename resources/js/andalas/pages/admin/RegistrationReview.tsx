import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import ResidentIdentity, {
    type ResidentProfile,
} from '../../components/ResidentIdentity';
import {
    PageHeader,
    Card,
    Button,
    StatusBadge,
    FormField,
    inputClass,
    DataTable,
    Tabs,
    Modal,
    RowActions,
} from '../../components/ui';
import { update } from '@/routes/andalas/registrations';
import { formatRupiah } from '../../lib/format';

type Room = {
    id: string;
    nomor_kamar: string;
    lantai?: { gedung?: { nama_gedung: string } };
};
type Row = {
    id: string;
    status: string;
    is_kipk: boolean;
    completed_at?: string;
    submitted_at?: string;
    reviewed_at?: string;
    notes?: string;
    periode?: { nama_periode: string };
    student_profile?: ResidentProfile & {
        user?: {
            nama: string;
            nim_nip: string;
            client_profile_category?: string;
        };
    };
    room_preferences?: Array<{ kamar_id: string; kamar?: Room }>;
    tagihan?: { total: string; total_dibayar: string; status: string };
};

function RegistrationRow({
    row,
    rooms,
    onDone,
}: {
    row: Row;
    rooms: Room[];
    onDone: () => void;
}) {
    const form = useForm({
        status: '',
        kamar_id: row.room_preferences?.[0]?.kamar_id ?? '',
        notes: row.notes ?? '',
    });
    const choices = row.is_kipk
        ? rooms
        : rooms.filter((room) =>
              row.room_preferences?.some(
                  (preference) => preference.kamar_id === room.id,
              ),
          );
    function submit(status: string) {
        form.transform((data) => ({
            ...data,
            status,
            kamar_id: status === 'accepted' ? data.kamar_id : null,
        }));
        form.patch(update.url({ registration: row.id }), {
            onSuccess: onDone,
            preserveScroll: true,
        });
    }
    return (
        <div className="space-y-4">
            <ResidentIdentity profile={row.student_profile} />
            <p className="text-sm">
                Waktu pemeriksaan:{' '}
                {row.reviewed_at
                    ? new Date(row.reviewed_at).toLocaleString('id-ID')
                    : '-'}
            </p>
            <div className="flex justify-between gap-3">
                <div>
                    <strong>{row.student_profile?.user?.nama}</strong>
                    <p className="text-muted text-sm">
                        {row.student_profile?.user?.nim_nip}
                        {row.is_kipk ? ' / KIPK' : ''}
                    </p>
                </div>
                <StatusBadge status={row.completed_at ? 'aktif' : row.status} />
            </div>
            <p className="text-sm">
                Kategori client:{' '}
                {row.student_profile?.user?.client_profile_category?.replaceAll(
                    '_',
                    ' ',
                ) ?? 'Belum ditetapkan'}
                . Pastikan kelayakan KIPK atau fasilitas gratis sebelum menerima
                pendaftaran.
            </p>
            <p className="text-sm">
                Periode: {row.periode?.nama_periode ?? '-'} · Diajukan:{' '}
                {row.submitted_at
                    ? new Date(row.submitted_at).toLocaleString('id-ID')
                    : '-'}
            </p>
            {row.notes && (
                <p className="text-sm whitespace-pre-wrap">
                    Catatan terakhir: {row.notes}
                </p>
            )}
            {row.room_preferences?.length ? (
                <p className="text-sm">
                    Pilihan kamar:{' '}
                    {row.room_preferences
                        .map(
                            (item) =>
                                `${item.kamar?.lantai?.gedung?.nama_gedung ?? '-'} / ${item.kamar?.nomor_kamar ?? '-'}`,
                        )
                        .join(', ')}
                </p>
            ) : null}
            {row.tagihan && (
                <p className="text-sm">
                    Tagihan: {formatRupiah(Number(row.tagihan.total))} /
                    Dibayar: {formatRupiah(Number(row.tagihan.total_dibayar))}
                </p>
            )}
            {row.status === 'verified' && (
                <FormField label="Penempatan kamar">
                    <select
                        required
                        className={inputClass}
                        value={form.data.kamar_id}
                        onChange={(event) =>
                            form.setData('kamar_id', event.target.value)
                        }
                    >
                        <option value="">Pilih kamar</option>
                        {choices.map((room) => (
                            <option key={room.id} value={room.id}>
                                {room.lantai?.gedung?.nama_gedung} /{' '}
                                {room.nomor_kamar}
                            </option>
                        ))}
                    </select>
                </FormField>
            )}
            {['submitted', 'verified'].includes(row.status) && (
                <>
                    <FormField label="Catatan verifikasi">
                        <textarea
                            className={inputClass}
                            value={form.data.notes}
                            onChange={(event) =>
                                form.setData('notes', event.target.value)
                            }
                        />
                    </FormField>
                    <div className="flex gap-2">
                        {row.status === 'submitted' && (
                            <Button
                                disabled={form.processing}
                                onClick={() => submit('verified')}
                            >
                                Verifikasi data
                            </Button>
                        )}
                        {row.status === 'verified' && (
                            <Button
                                disabled={
                                    form.processing || !form.data.kamar_id
                                }
                                onClick={() => submit('accepted')}
                            >
                                Terima dan tempatkan
                            </Button>
                        )}
                        <Button
                            variant="secondary"
                            disabled={form.processing}
                            onClick={() => submit('rejected')}
                        >
                            Tolak
                        </Button>
                    </div>
                </>
            )}
            {Object.entries(form.errors).map(([key, error]) => (
                <p key={key} role="alert" className="text-error text-sm">
                    {error}
                </p>
            ))}
        </div>
    );
}
export default function RegistrationReview({
    registrations = [],
    rooms = [],
}: {
    registrations?: Row[];
    rooms?: Room[];
}) {
    const [activeTab, setActiveTab] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selected = registrations.find((row) => row.id === selectedId);
    const statuses = [
        '',
        'submitted',
        'verified',
        'accepted',
        'rejected',
        'draft',
    ];
    const labels = [
        'Semua',
        'Menunggu verifikasi',
        'Terverifikasi',
        'Diterima',
        'Ditolak',
        'Draft',
    ];
    const rows = registrations
        .filter(
            (row) => !statuses[activeTab] || row.status === statuses[activeTab],
        )
        .map((row) => ({
            ...row,
            nama: row.student_profile?.user?.nama ?? '-',
            nim: row.student_profile?.user?.nim_nip ?? '-',
            kategori:
                row.student_profile?.user?.client_profile_category?.replaceAll(
                    '_',
                    ' ',
                ) ?? '-',
            periode_nama: row.periode?.nama_periode ?? '-',
        }));
    return (
        <div className="space-y-4">
            <PageHeader
                title="Review Pendaftaran"
                subtitle="Verifikasi kategori penghuni dan penempatan. Hunian aktif otomatis setelah pembayaran memenuhi syarat."
            />
            <div className="overflow-x-auto">
                <Tabs
                    active={activeTab}
                    onChange={setActiveTab}
                    tabs={labels.map(
                        (label, index) =>
                            `${label} (${registrations.filter((row) => !statuses[index] || row.status === statuses[index]).length})`,
                    )}
                />
            </div>
            <Card>
                <DataTable
                    data={rows}
                    searchKeys={['nama', 'nim', 'periode_nama']}
                    searchPlaceholder="Cari nama, NIM, atau periode..."
                    emptyMessage="Tidak ada pendaftaran pada status ini."
                    columns={[
                        { key: 'nim', label: 'NIM / Identitas' },
                        { key: 'nama', label: 'Nama' },
                        {
                            key: 'kategori',
                            label: 'Kategori',
                            filter: {
                                type: 'select',
                                options: [
                                    ...new Set(
                                        registrations.map(
                                            (row) =>
                                                row.student_profile?.user?.client_profile_category?.replaceAll(
                                                    '_',
                                                    ' ',
                                                ) ?? '-',
                                        ),
                                    ),
                                ],
                            },
                        },
                        {
                            key: 'periode_nama',
                            label: 'Periode',
                            filter: {
                                type: 'select',
                                options: [
                                    ...new Set(
                                        registrations.map(
                                            (row) =>
                                                row.periode?.nama_periode ??
                                                '-',
                                        ),
                                    ),
                                ],
                            },
                        },
                        {
                            key: 'submitted_at',
                            label: 'Tanggal pengajuan',
                            render: (row) =>
                                row.submitted_at
                                    ? new Date(
                                          row.submitted_at,
                                      ).toLocaleDateString('id-ID')
                                    : '-',
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            render: (row) =>
                                labels[statuses.indexOf(row.status)] ??
                                row.status,
                        },
                        {
                            key: 'completed_at',
                            label: 'Hunian',
                            render: (row) =>
                                row.completed_at
                                    ? 'Sudah aktif'
                                    : 'Belum aktif',
                        },
                        {
                            key: 'aksi',
                            label: 'Aksi',
                            render: (row) => (
                                <RowActions
                                    onDetail={() => setSelectedId(row.id)}
                                />
                            ),
                        },
                    ]}
                />
            </Card>
            <Modal
                open={!!selected}
                onClose={() => setSelectedId(null)}
                title="Detail dan Review Pendaftaran"
                width="max-w-2xl"
            >
                {selected && (
                    <RegistrationRow
                        key={`${selected.id}-${selected.status}`}
                        row={selected}
                        rooms={rooms}
                        onDone={() => setSelectedId(null)}
                    />
                )}
            </Modal>
        </div>
    );
}
