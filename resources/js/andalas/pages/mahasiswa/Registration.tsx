import { useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import {
    PageHeader,
    Card,
    Button,
    FormField,
    inputClass,
    StatusBadge,
} from '../../components/ui';
import { store as registrationStore } from '@/routes/andalas/registrations';
import { tagihan } from '@/routes/mahasiswa';
import { formatRupiah } from '../../lib/format';

type Room = {
    id: string;
    nomor_kamar: string;
    tipe_kamar?: string;
    tarif_per_periode: string;
    lantai?: { gedung?: { nama_gedung: string } };
};
type Registration = {
    id: string;
    status: string;
    completed_at?: string;
    periode?: { nama_periode: string };
    tagihan?: { total: string; total_dibayar: string; status: string };
};
type Props = {
    periode?: Array<{ id: string; nama_periode: string; status?: string }>;
    rooms?: Room[];
    registration?: Registration[];
    initialUser?: { client_profile_category?: string };
};

export default function Registration({
    periode = [],
    rooms = [],
    registration = [],
    initialUser,
}: Props) {
    const periods = periode.filter((period) => period.status === 'aktif');
    const category = initialUser?.client_profile_category;
    const form = useForm({
        periode_id: periods[0]?.id ?? '',
        is_kipk: category === 'local_kipk',
        preferences: [] as Array<{ kamar_id: string }>,
        notes: '',
    });
    const [roomType, setRoomType] = useState('');
    const types = [
        ...new Set(rooms.map((room) => room.tipe_kamar).filter(Boolean)),
    ];
    const hasOpenRegistration = registration.some(
        (item) =>
            item.status !== 'rejected' &&
            item.status !== 'cancelled' &&
            item.periode?.nama_periode ===
                periods.find((period) => period.id === form.data.periode_id)
                    ?.nama_periode,
    );
    return (
        <div className="max-w-3xl space-y-4">
            <PageHeader
                title="Pendaftaran Asrama"
                subtitle="Pilih kamar, selesaikan tagihan, lalu terima kwitansi hunian. Check-in tercatat otomatis."
            />
            <Card className="p-6">
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.post(registrationStore.url());
                    }}
                    className="space-y-4"
                >
                    <FormField label="Periode">
                        <select
                            required
                            className={inputClass}
                            value={form.data.periode_id}
                            onChange={(event) =>
                                form.setData('periode_id', event.target.value)
                            }
                        >
                            <option value="">Pilih periode</option>
                            {periods.map((period) => (
                                <option key={period.id} value={period.id}>
                                    {period.nama_periode}
                                </option>
                            ))}
                        </select>
                    </FormField>
                    <label className="flex gap-2">
                        <input
                            type="checkbox"
                            checked={form.data.is_kipk}
                            disabled={!!category && category !== 'student'}
                            onChange={(event) => {
                                form.setData('is_kipk', event.target.checked);
                                form.setData('preferences', []);
                            }}
                        />{' '}
                        Peserta KIPK (penempatan oleh admin)
                    </label>
                    {!form.data.is_kipk && (
                        <>
                            <FormField label="Tipe kamar">
                                <select
                                    className={inputClass}
                                    value={roomType}
                                    onChange={(event) => {
                                        setRoomType(event.target.value);
                                        form.setData('preferences', []);
                                    }}
                                >
                                    <option value="">Semua tipe</option>
                                    {types.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </FormField>
                            <FormField label="Nomor kamar">
                                <select
                                    required
                                    className={inputClass}
                                    value={
                                        form.data.preferences[0]?.kamar_id ?? ''
                                    }
                                    onChange={(event) =>
                                        form.setData(
                                            'preferences',
                                            event.target.value
                                                ? [
                                                      {
                                                          kamar_id:
                                                              event.target
                                                                  .value,
                                                      },
                                                  ]
                                                : [],
                                        )
                                    }
                                >
                                    <option value="">Pilih kamar</option>
                                    {rooms
                                        .filter(
                                            (room) =>
                                                !roomType ||
                                                room.tipe_kamar === roomType,
                                        )
                                        .map((room) => (
                                            <option
                                                key={room.id}
                                                value={room.id}
                                            >
                                                {
                                                    room.lantai?.gedung
                                                        ?.nama_gedung
                                                }{' '}
                                                / {room.nomor_kamar} /{' '}
                                                {formatRupiah(
                                                    Number(
                                                        room.tarif_per_periode,
                                                    ),
                                                )}
                                            </option>
                                        ))}
                                </select>
                            </FormField>
                        </>
                    )}
                    <FormField label="Catatan">
                        <textarea
                            className={inputClass}
                            value={form.data.notes}
                            onChange={(event) =>
                                form.setData('notes', event.target.value)
                            }
                        />
                    </FormField>
                    {Object.entries(form.errors).map(([key, error]) => (
                        <p
                            role="alert"
                            className="text-error text-sm"
                            key={key}
                        >
                            {error}
                        </p>
                    ))}
                    {hasOpenRegistration ? (
                        <p className="text-sm">
                            Pendaftaran periode ini sudah tercatat. Pantau
                            status dan pembayaran di bawah.
                        </p>
                    ) : (
                        <Button
                            type="submit"
                            disabled={form.processing || !form.data.periode_id}
                        >
                            {form.processing ? 'Mengirim...' : 'Daftar Asrama'}
                        </Button>
                    )}
                </form>
            </Card>
            {registration.map((item) => (
                <Card key={item.id} className="space-y-2 p-6">
                    <div className="flex justify-between gap-3">
                        <strong>{item.periode?.nama_periode}</strong>
                        <StatusBadge
                            status={item.completed_at ? 'aktif' : item.status}
                        />
                    </div>
                    <p className="text-sm">
                        {item.completed_at
                            ? 'Pendaftaran selesai. Anda aktif sebagai penghuni; tidak perlu check-in ulang.'
                            : 'Pendaftaran menunggu verifikasi, penempatan, atau penyelesaian pembayaran.'}
                    </p>
                    {item.tagihan && (
                        <p className="text-sm">
                            Tagihan: {formatRupiah(Number(item.tagihan.total))}{' '}
                            / Dibayar:{' '}
                            {formatRupiah(Number(item.tagihan.total_dibayar))}
                        </p>
                    )}
                    <Link
                        className="text-primary underline"
                        href={tagihan.url()}
                    >
                        Lihat invoice, pembayaran, dan kwitansi
                    </Link>
                </Card>
            ))}
        </div>
    );
}
