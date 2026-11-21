import { Link } from '@inertiajs/react';
import { Image as ImageIcon, MapPin, Wrench } from 'lucide-react';
import { Card, EmptyState, PageHeader, StatusBadge } from '../../components/ui';
import { photo } from '@/routes/andalas/tiket';
import { formatDate, mapTicketStatus } from '../../lib/format';

type TiketRow = {
    id: string;
    nomor_tiket?: string;
    photos?: Array<{ id: string; type: string }>;
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
    tanggal_lapor?: string;
};

type Props = {
    tiket?: TiketRow[];
};

export default function TiketMasuk({ tiket = [] }: Props) {
    const incoming = tiket.filter((t) =>
        ['menunggu_triage', 'didisposisikan'].includes(t.status ?? ''),
    );

    return (
        <div className="space-y-4">
            <PageHeader
                title="Permohonan Perbaikan Masuk"
                subtitle="Daftar permohonan perbaikan yang siap diambil"
                actions={
                    <Link href="/pelaporan" className="btn btn-primary btn-sm">
                        Kelola di Pekerjaan
                    </Link>
                }
            />
            {incoming.length === 0 ? (
                <Card>
                    <EmptyState
                        title="Tidak ada permohonan masuk"
                        desc="Semua permohonan perbaikan sudah ditangani."
                    />
                </Card>
            ) : (
                <div className="space-y-3">
                    {incoming.map((row) => {
                        const location = row.kamar
                            ? [
                                  row.kamar.lantai?.gedung?.nama_gedung,
                                  `Kamar ${row.kamar.nomor_kamar}`,
                              ]
                                  .filter(Boolean)
                                  .join(' · ')
                            : (row.aset?.fasilitas_umum?.nama_fasilitas ?? '-');
                        const beforePhotos =
                            row.photos?.filter(
                                (item) => item.type === 'before',
                            ) ?? [];

                        return (
                            <Card key={row.id} className="space-y-3 p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold break-all">
                                            {row.nomor_tiket}
                                        </p>
                                        <p className="text-muted mt-0.5 flex items-center gap-1 text-xs">
                                            <MapPin className="size-3.5 shrink-0" />
                                            <span>{location}</span>
                                        </p>
                                    </div>
                                    <StatusBadge
                                        status={mapTicketStatus(
                                            row.status ?? '',
                                        )}
                                    />
                                </div>

                                <p className="text-sm">{row.deskripsi}</p>

                                {row.aset?.nama_aset && (
                                    <p className="text-muted flex items-center gap-1 text-xs">
                                        <Wrench className="size-3.5 shrink-0" />
                                        <span>
                                            {row.aset.nama_aset} (
                                            {row.aset.kode_inventaris})
                                        </span>
                                    </p>
                                )}

                                {beforePhotos.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {beforePhotos.map((item, index) => (
                                            <a
                                                key={item.id}
                                                className="btn btn-xs btn-outline gap-1"
                                                target="_blank"
                                                rel="noreferrer"
                                                href={photo.url({
                                                    photo: item.id,
                                                })}
                                            >
                                                <ImageIcon className="size-3.5" />
                                                Foto {index + 1}
                                            </a>
                                        ))}
                                    </div>
                                )}

                                <div className="border-base-200 flex items-center justify-between border-t pt-2.5 text-xs">
                                    <span className="text-muted">
                                        Lapor: {formatDate(row.tanggal_lapor)}
                                    </span>
                                    <Link
                                        href="/pelaporan"
                                        className="btn btn-primary btn-xs"
                                    >
                                        Ambil / Kerjakan
                                    </Link>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
