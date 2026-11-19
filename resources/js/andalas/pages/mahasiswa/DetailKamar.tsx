import { Phone, Users } from 'lucide-react';
import { useRoomTypeCatalog, roomTypeName } from '@/andalas/lib/room-types';
import { PhotoCarousel, photoPaths } from '../../components/PhotoGallery';
import { PageHeader, Card, StatusBadge } from '../../components/ui';

type Roommate = {
    id: string;
    nama?: string;
    nim_nip?: string;
    no_hp?: string | null;
};

type Penempatan = {
    id?: string;
    status?: string;
    tanggal_mulai?: string;
    tanggal_selesai?: string | null;
    kamar?: {
        id?: string;
        nomor_kamar?: string;
        foto?: string | null;
        photos?: string[] | null;
        status?: string;
        kapasitas?: number;
        tipe_kamar?: string;
        lantai?: {
            nama_lantai?: string;
            nomor_lantai?: number | string;
            gedung?: { nama_gedung?: string; foto?: string | null };
        };
    };
    mahasiswa?: { user?: { nama?: string } };
    roommates?: Roommate[];
};

export default function DetailKamar({
    penempatan = [],
}: {
    penempatan?: Penempatan[];
}) {
    const catalog = useRoomTypeCatalog();
    const mine = penempatan?.[0];
    const roommates = mine?.roommates ?? [];
    const roomPhotos = photoPaths(mine?.kamar ?? {});
    const displayPhotos =
        roomPhotos.length > 0
            ? roomPhotos
            : mine?.kamar?.lantai?.gedung?.foto
              ? [mine.kamar.lantai.gedung.foto]
              : [];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Detail Kamar"
                subtitle="Informasi kamar hunian dan teman sekamar Anda"
            />
            {!mine ? (
                <Card className="text-muted p-6">
                    Anda belum ditempatkan ke kamar.
                </Card>
            ) : (
                <div className="space-y-4">
                    <Card className="overflow-hidden">
                        <div className="grid items-start gap-6 p-5 lg:grid-cols-2">
                            <PhotoCarousel
                                photos={displayPhotos}
                                title={`Kamar ${mine.kamar?.nomor_kamar ?? ''}`}
                            />
                            <div className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <span className="text-base-content/60 block text-xs">
                                            Gedung Asrama
                                        </span>
                                        <strong className="text-base">
                                            {mine.kamar?.lantai?.gedung
                                                ?.nama_gedung ?? '-'}
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="text-base-content/60 block text-xs">
                                            Lantai Kamar
                                        </span>
                                        <strong className="text-base">
                                            {mine.kamar?.lantai?.nama_lantai ??
                                                (mine.kamar?.lantai
                                                    ?.nomor_lantai
                                                    ? `Lantai ${mine.kamar.lantai.nomor_lantai}`
                                                    : '-')}
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="text-base-content/60 block text-xs">
                                            Nomor Kamar
                                        </span>
                                        <strong className="text-base">
                                            {mine.kamar?.nomor_kamar ?? '-'}
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="text-base-content/60 block text-xs">
                                            Tipe &amp; Kapasitas
                                        </span>
                                        <strong className="text-base">
                                            {mine.kamar?.tipe_kamar
                                                ? roomTypeName(
                                                      catalog,
                                                      mine.kamar.tipe_kamar,
                                                  )
                                                : '-'}
                                            {mine.kamar?.kapasitas
                                                ? ` (${mine.kamar.kapasitas} orang)`
                                                : ''}
                                        </strong>
                                    </div>
                                    {mine.status && (
                                        <div>
                                            <span className="text-base-content/60 mb-1 block text-xs">
                                                Status Hunian
                                            </span>
                                            <StatusBadge
                                                status={mine.status}
                                                label={
                                                    mine.status ===
                                                    'belum_checkin'
                                                        ? 'Terdaftar · Menunggu Check-in'
                                                        : undefined
                                                }
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="border-base-300 space-y-3 border-t pt-4">
                                    <div className="flex items-center gap-2">
                                        <Users className="text-primary size-4" />
                                        <h3 className="text-sm font-semibold">
                                            Teman Sekamar ({roommates.length})
                                        </h3>
                                    </div>
                                    {roommates.length === 0 ? (
                                        <p className="text-base-content/70 text-sm">
                                            Belum ada teman sekamar lain yang
                                            terdaftar di kamar ini.
                                        </p>
                                    ) : (
                                        <div className="grid gap-2.5 sm:grid-cols-2">
                                            {roommates.map((friend) => (
                                                <div
                                                    key={friend.id}
                                                    className="border-base-300 bg-base-200/40 space-y-1 rounded-xl border p-3 text-sm"
                                                >
                                                    <p className="font-semibold">
                                                        {friend.nama ?? '-'}
                                                    </p>
                                                    <p className="text-base-content/75 flex items-center gap-1.5 text-xs">
                                                        <Phone className="size-3.5 shrink-0" />
                                                        <span>
                                                            No. HP:{' '}
                                                            <strong>
                                                                {friend.no_hp ||
                                                                    'Belum diisi'}
                                                            </strong>
                                                        </span>
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
