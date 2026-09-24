import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import {
    PageHeader,
    Card,
    FormField,
    inputClass,
    Button,
    StatusBadge,
} from '../../components/ui';
import { mapTicketStatus } from '../../lib/format';
import { update as tiketUpdate } from '@/routes/andalas/tiket';

type TiketRow = {
    id: string;
    nomor_tiket?: string;
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
};

type Props = {
    tiket: TiketRow[];
};

export default function UpdateTiket({ tiket = [] }: Props) {
    const [selected, setSelected] = useState('');
    const { data, setData, post, transform, processing, errors } = useForm<{
        status: string;
        catatan_penyelesaian: string;
        bukti_penyelesaian: File[];
    }>({
        status: 'sedang_dikerjakan',
        catatan_penyelesaian: '',
        bukti_penyelesaian: [],
    });

    const aktif = tiket.filter(
        (t) => !['selesai', 'dibatalkan'].includes(t.status ?? ''),
    );

    function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!selected) return;
        transform((values) => ({ ...values, _method: 'put' }));
        post(tiketUpdate.url({ laporan: selected }), {
            onSuccess: () => {
                setSelected('');
                setData('catatan_penyelesaian', '');
            },
        });
    }

    return (
        <div className="max-w-2xl space-y-4">
            <PageHeader
                title="Update Tiket"
                subtitle="Perbarui status pengerjaan tiket"
            />
            <Card className="mb-4 space-y-2 p-6">
                {aktif.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelected(t.id)}
                        className={`w-full rounded border p-3 text-left text-sm ${selected === t.id ? 'border-accent bg-accent/5' : ''}`}
                    >
                        <div className="flex justify-between">
                            <strong>{t.nomor_tiket}</strong>
                            <StatusBadge
                                status={mapTicketStatus(t.status ?? '')}
                            />
                        </div>
                        <p className="mt-1">
                            {t.aset?.nama_aset} ({t.aset?.kode_inventaris}) /{' '}
                            {t.kamar
                                ? [
                                      t.kamar.lantai?.gedung?.nama_gedung,
                                      t.kamar.nomor_kamar,
                                  ].join(' / ')
                                : t.aset?.fasilitas_umum?.nama_fasilitas}
                        </p>
                        <p className="text-muted mt-1">{t.deskripsi}</p>
                    </button>
                ))}
            </Card>
            <Card className="p-6">
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Status">
                        <select
                            className={inputClass}
                            value={data.status}
                            onChange={(e) => setData('status', e.target.value)}
                        >
                            <option value="sedang_dikerjakan">
                                Sedang Dikerjakan
                            </option>
                            <option value="selesai">Selesai</option>
                        </select>
                        {errors.status && (
                            <p className="text-error mt-1 text-sm">
                                {errors.status}
                            </p>
                        )}
                    </FormField>
                    <FormField label="Catatan">
                        <textarea
                            className={inputClass}
                            rows={3}
                            value={data.catatan_penyelesaian}
                            onChange={(e) =>
                                setData('catatan_penyelesaian', e.target.value)
                            }
                        />
                        {errors.catatan_penyelesaian && (
                            <p className="text-error mt-1 text-sm">
                                {errors.catatan_penyelesaian}
                            </p>
                        )}
                    </FormField>
                    {data.status === 'selesai' && (
                        <FormField label="Bukti penyelesaian">
                            <input
                                type="file"
                                multiple
                                accept="image/jpeg,image/png"
                                className="file-input file-input-bordered w-full"
                                onChange={(e) =>
                                    setData(
                                        'bukti_penyelesaian',
                                        Array.from(e.target.files ?? []),
                                    )
                                }
                            />
                        </FormField>
                    )}
                    {Object.entries(errors).map(([key, message]) => (
                        <p
                            key={key}
                            role="alert"
                            className="text-error text-sm"
                        >
                            {message}
                        </p>
                    ))}
                    <Button type="submit" disabled={!selected || processing}>
                        Simpan Update
                    </Button>
                </form>
            </Card>
        </div>
    );
}
