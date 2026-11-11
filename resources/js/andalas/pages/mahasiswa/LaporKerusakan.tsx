import { useRef, useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import {
    PageHeader,
    Card,
    Button,
    FormField,
    inputClass,
    StatusBadge,
} from '../../components/ui';
import { store as laporanStore } from '@/routes/andalas/laporan';
import { newDamageRequestKey } from '../../lib/damage-reports';

type Room = {
    id: string;
    nomor_kamar: string;
    lantai?: { nama_lantai?: string; gedung?: { nama_gedung: string } };
};
type Asset = {
    id: string;
    nama_aset: string;
    kode_inventaris: string;
    kamar_id: string | null;
    fasilitas_umum_id: string | null;
    fasilitas_umum?: { nama_fasilitas: string };
};
type Report = {
    id: string;
    nomor_tiket: string;
    status: string;
    deskripsi: string;
    aset?: Asset;
    kamar?: Room;
};
type Props = {
    can_report?: boolean;
    room?: Room;
    assets?: Asset[];
    reports?: Report[];
};

export default function LaporKerusakan({
    can_report = false,
    room,
    assets = [],
    reports = [],
}: Props) {
    const [location, setLocation] = useState('room');
    const photos = useRef<HTMLInputElement>(null);
    const form = useForm({
        aset_id: '',
        deskripsi: '',
        foto_awal: [] as File[],
        fasilitas_umum_id: '',
        location_label: '',
        different_incident_reason: '',
        request_key: newDamageRequestKey(),
    });
    const common = Array.from(
        new Map(
            assets
                .filter((asset) => asset.fasilitas_umum_id)
                .map((asset) => [
                    asset.fasilitas_umum_id!,
                    asset.fasilitas_umum?.nama_fasilitas ?? 'Fasilitas umum',
                ]),
        ),
    );
    const available = assets.filter((asset) =>
        location === 'room'
            ? asset.kamar_id === room?.id
            : asset.fasilitas_umum_id === location,
    );

    function submit(event: React.FormEvent) {
        event.preventDefault();
        form.post(laporanStore.url(), {
            onSuccess: () => {
                form.reset();
                form.setData('request_key', newDamageRequestKey());
                if (photos.current) photos.current.value = '';
            },
        });
    }

    return (
        <div className="max-w-3xl space-y-4">
            <PageHeader
                title="Laporkan Kerusakan"
                subtitle="Pilih lokasi dan barang inventaris yang rusak, lalu lampirkan foto."
            />
            <Link href="/pelaporan" className="btn btn-outline">
                Buka detail, laporan sekamar dan hasil perbaikan
            </Link>
            {!can_report ? (
                <Card className="p-6">
                    Pelaporan tersedia setelah pendaftaran selesai dan Anda
                    aktif sebagai penghuni.
                </Card>
            ) : (
                <Card className="p-6">
                    <form onSubmit={submit} className="space-y-4">
                        <FormField label="Lokasi kerusakan">
                            <select
                                className={inputClass}
                                value={location}
                                onChange={(event) => {
                                    setLocation(event.target.value);
                                    form.setData('aset_id', '');
                                    form.setData(
                                        'fasilitas_umum_id',
                                        event.target.value === 'room'
                                            ? ''
                                            : event.target.value,
                                    );
                                }}
                            >
                                <option value="room">
                                    {room?.lantai?.gedung?.nama_gedung} /{' '}
                                    {room?.lantai?.nama_lantai} / Kamar{' '}
                                    {room?.nomor_kamar}
                                </option>
                                {common.map(([id, name]) => (
                                    <option key={id} value={id}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </FormField>
                        <FormField label="Barang / fasilitas yang rusak">
                            <select
                                className={inputClass}
                                value={form.data.aset_id}
                                onChange={(event) =>
                                    form.setData('aset_id', event.target.value)
                                }
                            >
                                <option value="">
                                    Tanpa inventaris / belum terdaftar
                                </option>
                                {available.map((asset) => (
                                    <option key={asset.id} value={asset.id}>
                                        {asset.nama_aset} (
                                        {asset.kode_inventaris})
                                    </option>
                                ))}
                            </select>
                            {available.length === 0 && (
                                <p className="text-muted mt-2 text-sm">
                                    Belum ada barang terdaftar di lokasi ini.
                                    Anda tetap dapat melapor dengan rincian
                                    lokasi.
                                </p>
                            )}
                        </FormField>
                        {!form.data.aset_id && (
                            <FormField label="Rincian lokasi kerusakan">
                                <input
                                    required
                                    className={inputClass}
                                    value={form.data.location_label}
                                    onChange={(event) =>
                                        form.setData(
                                            'location_label',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Misalnya dinding di dekat jendela"
                                />
                            </FormField>
                        )}
                        <FormField label="Jika berbeda dari kejadian yang masih aktif">
                            <input
                                className={inputClass}
                                value={form.data.different_incident_reason}
                                onChange={(event) =>
                                    form.setData(
                                        'different_incident_reason',
                                        event.target.value,
                                    )
                                }
                                placeholder="Jelaskan pembeda; kejadian sama cukup ditautkan di halaman detail"
                            />
                        </FormField>
                        <FormField label="Deskripsi kerusakan">
                            <textarea
                                required
                                className={inputClass}
                                rows={4}
                                value={form.data.deskripsi}
                                onChange={(event) =>
                                    form.setData(
                                        'deskripsi',
                                        event.target.value,
                                    )
                                }
                                placeholder="Jelaskan bagian yang rusak dan kendalanya."
                            />
                        </FormField>
                        <FormField label="Foto kerusakan">
                            <input
                                ref={photos}
                                required
                                type="file"
                                multiple
                                accept="image/jpeg,image/png"
                                className="file-input w-full"
                                onChange={(event) =>
                                    form.setData(
                                        'foto_awal',
                                        Array.from(event.target.files ?? []),
                                    )
                                }
                            />
                            <p className="text-muted mt-1 text-sm">
                                1-5 foto JPG/PNG, maksimal 5 MB per foto.
                            </p>
                        </FormField>
                        {Object.entries(form.errors).map(([key, error]) => (
                            <p
                                key={key}
                                role="alert"
                                className="text-error text-sm"
                            >
                                {error}
                            </p>
                        ))}
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Mengirim...' : 'Kirim Laporan'}
                        </Button>
                    </form>
                </Card>
            )}
            <Card className="space-y-3 p-6">
                <h2 className="font-semibold">Riwayat laporan Anda</h2>
                {reports.length === 0 && (
                    <p className="text-muted text-sm">
                        Belum ada laporan kerusakan.
                    </p>
                )}
                {reports.map((report) => (
                    <div
                        key={report.id}
                        className="border-base-300 space-y-1 border-b py-3"
                    >
                        <div className="flex justify-between gap-3">
                            <strong>{report.nomor_tiket}</strong>
                            <StatusBadge status={report.status} />
                        </div>
                        <p className="text-sm">
                            {report.aset?.nama_aset ?? 'Kerusakan kamar'}{' '}
                            {report.aset?.kode_inventaris} /{' '}
                            {report.kamar
                                ? 'Kamar ' + report.kamar.nomor_kamar
                                : report.aset?.fasilitas_umum?.nama_fasilitas}
                        </p>
                        <p className="text-muted text-sm">{report.deskripsi}</p>
                    </div>
                ))}
            </Card>
        </div>
    );
}
