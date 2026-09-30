import { useForm, usePoll } from '@inertiajs/react';
import { useState } from 'react';
import { store } from '@/routes/andalas/temporary-stays';
import {
    Button,
    Card,
    PageHeader,
    DataTable,
    Drawer,
    inputClass,
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
    placement?: { status: string; kamar?: Room };
    tagihan?: { nomor: string; total: string; total_dibayar: string };
};

export default function TemporaryStays({
    facilitator = false,
    rooms = [],
    stays = [],
    notifications = [],
}: {
    facilitator?: boolean;
    rooms?: Room[];
    stays?: Stay[];
    notifications?: { id: string; data: { message: string } }[];
}) {
    usePoll(5000, { only: ['stays', 'notifications'] });
    const form = useForm({
        nama: '',
        nim_nip: '',
        email: '',
        gender: '',
        stay_kind: facilitator ? 'non_student' : 'summer_course',
        client_profile_category: 'non_student',
        kamar_id: '',
        starts_at: '',
        ends_at: '',
    });
    const [formOpen, setFormOpen] = useState(false);

    function closeForm() {
        setFormOpen(false);
        form.reset();
        form.clearErrors();
    }

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
                    <Button onClick={() => setFormOpen(true)}>
                        Catat penghuni
                    </Button>
                }
            />
            <Card className="space-y-4 p-5">
                <h2 className="font-semibold">Pencatatan hunian sementara</h2>
                <p className="text-sm">
                    Summer Course tidak masuk ke role aplikasi dan pesertanya
                    tidak perlu membuat akun; pendataan cukup dilakukan di sini.
                    Penghuni nonmahasiswa diperlakukan hampir sama, tetapi
                    invoice yang terbit langsung wajib dibayar.
                </p>
                <p className="text-sm">
                    Kamar dialokasikan sejak penyimpanan. Tarif harian mengikuti
                    pengaturan gedung dan tipe kamar; tanggal keluar tidak
                    dihitung sebagai hari menginap. Kapasitas dilepas otomatis
                    pada tanggal keluar, sementara sisa tagihan tetap tercatat.
                </p>
            </Card>
            <Drawer
                open={formOpen}
                onClose={closeForm}
                title="Catat penghuni dan masa tinggal"
                width="w-full max-w-3xl"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={closeForm}
                            disabled={form.processing}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            form="temporary-stay-form"
                            disabled={form.processing || !rooms.length}
                        >
                            {form.processing
                                ? 'Menyimpan...'
                                : 'Simpan hunian dan terbitkan invoice'}
                        </Button>
                    </div>
                }
            >
                <form
                    id="temporary-stay-form"
                    className="space-y-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post(store.url(), {
                            onSuccess: () => {
                                form.reset();
                                setFormOpen(false);
                            },
                        });
                    }}
                >
                    <section className="space-y-3">
                        <div>
                            <h3 className="font-semibold">
                                Informasi penghuni
                            </h3>
                            <p className="text-muted text-sm">
                                Gunakan identitas dan email yang sama jika
                                penghuni sudah memiliki akun.
                            </p>
                        </div>
                        {!facilitator && (
                            <label>
                                Jenis hunian
                                <select
                                    className={inputClass}
                                    value={form.data.stay_kind}
                                    onChange={(e) =>
                                        form.setData(
                                            'stay_kind',
                                            e.target.value,
                                        )
                                    }
                                >
                                    <option value="summer_course">
                                        Summer Course
                                    </option>
                                    <option value="non_student">
                                        Nonmahasiswa
                                    </option>
                                </select>
                            </label>
                        )}
                        {!facilitator &&
                            form.data.stay_kind === 'summer_course' && (
                                <label>
                                    Jenis peserta
                                    <select
                                        className={inputClass}
                                        value={
                                            form.data.client_profile_category
                                        }
                                        onChange={(e) =>
                                            form.setData(
                                                'client_profile_category',
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="non_student">
                                            Nonmahasiswa
                                        </option>
                                        <option value="local_non_kipk">
                                            Mahasiswa lokal
                                        </option>
                                        <option value="international_student">
                                            Mahasiswa internasional
                                        </option>
                                    </select>
                                </label>
                            )}
                        {(['nama', 'nim_nip', 'email'] as const).map((key) => (
                            <label key={key}>
                                {
                                    {
                                        nama: 'Nama lengkap',
                                        nim_nip: 'NIM / NIK / paspor',
                                        email: 'Email penghuni',
                                    }[key]
                                }
                                <input
                                    className={inputClass}
                                    type={key === 'email' ? 'email' : 'text'}
                                    required
                                    value={form.data[key]}
                                    onChange={(e) =>
                                        form.setData(key, e.target.value)
                                    }
                                />
                            </label>
                        ))}
                        <label>
                            Jenis kelamin
                            <select
                                className={inputClass}
                                required
                                value={form.data.gender}
                                onChange={(e) =>
                                    form.setData('gender', e.target.value)
                                }
                            >
                                <option value="">Pilih jenis kelamin</option>
                                <option value="laki_laki">Laki-laki</option>
                                <option value="perempuan">Perempuan</option>
                            </select>
                        </label>
                    </section>
                    <section className="space-y-3 border-t pt-4">
                        <div>
                            <h3 className="font-semibold">
                                Masa tinggal dan kamar
                            </h3>
                            <p className="text-muted text-sm">
                                Tarif dihitung berdasarkan tipe kamar dan lama
                                tinggal.
                            </p>
                        </div>
                        <label>
                            Gedung / tipe / kamar
                            <select
                                className={inputClass}
                                required
                                value={form.data.kamar_id}
                                onChange={(e) =>
                                    form.setData('kamar_id', e.target.value)
                                }
                            >
                                <option value="">Pilih kamar</option>
                                {rooms.map((room) => (
                                    <option key={room.id} value={room.id}>
                                        {room.lantai?.gedung?.nama_gedung} /{' '}
                                        {room.tipe_kamar} / {room.nomor_kamar}
                                    </option>
                                ))}
                            </select>
                        </label>
                        {(['starts_at', 'ends_at'] as const).map((key) => (
                            <label key={key}>
                                {key === 'starts_at'
                                    ? 'Tanggal masuk'
                                    : 'Tanggal keluar'}
                                <input
                                    className={inputClass}
                                    type="date"
                                    required
                                    value={form.data[key]}
                                    onChange={(e) =>
                                        form.setData(key, e.target.value)
                                    }
                                />
                            </label>
                        ))}
                        {!rooms.length && (
                            <p className="text-error text-sm">
                                Belum ada kamar tersedia dalam akses Anda.
                            </p>
                        )}
                    </section>
                    {Object.entries(form.errors).map(([key, error]) => (
                        <p
                            key={key}
                            role="alert"
                            className="text-error sm:col-span-2"
                        >
                            {error}
                        </p>
                    ))}
                </form>
            </Drawer>
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
            <Card className="p-4">
                <DataTable
                    data={stays}
                    columns={[
                        {
                            key: 'nama',
                            label: 'Penghuni',
                            value: (row) =>
                                row.student_profile?.user?.nama ?? '',
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
                                `${row.placement?.kamar?.lantai?.gedung?.nama_gedung ?? '-'} / ${row.placement?.kamar?.nomor_kamar ?? '-'}`,
                        },
                        {
                            key: 'starts_at',
                            label: 'Masuk',
                            render: (row) => row.starts_at?.slice(0, 10),
                        },
                        {
                            key: 'ends_at',
                            label: 'Keluar',
                            render: (row) => row.ends_at?.slice(0, 10),
                        },
                        {
                            key: 'status',
                            label: 'Status',
                            render: (row) =>
                                row.placement?.status === 'aktif'
                                    ? 'Dialokasikan'
                                    : 'Berakhir',
                        },
                        {
                            key: 'invoice',
                            label: 'Invoice',
                            render: (row) => row.tagihan?.nomor,
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
                    ]}
                />
            </Card>
        </div>
    );
}
