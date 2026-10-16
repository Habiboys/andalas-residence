import { PageHeader, Card } from '../../components/ui';
type Penempatan = {
    kamar?: {
        nomor_kamar?: string;
        foto?: string | null;
        status?: string;
        kapasitas?: number;
        tipe_kamar?: string;
        lantai?: { nama_lantai?: string; gedung?: { nama_gedung?: string } };
    };
    mahasiswa?: { user?: { nama?: string } };
};

export default function DetailKamar({
    penempatan = [],
}: {
    penempatan?: Penempatan[];
}) {
    const mine = penempatan?.[0];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Detail Kamar"
                subtitle="Informasi kamar hunian Anda"
            />
            {!mine ? (
                <Card className="text-muted p-6">
                    Anda belum ditempatkan ke kamar.
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    {mine.kamar?.foto && (
                        <img
                            src={`/storage/${mine.kamar.foto}`}
                            alt={`Kamar ${mine.kamar.nomor_kamar}`}
                            className="h-64 w-full object-cover"
                        />
                    )}
                    <div className="grid gap-4 p-6 sm:grid-cols-2">
                        <p>
                            <strong>Gedung:</strong>{' '}
                            {mine.kamar?.lantai?.gedung?.nama_gedung ?? '-'}
                        </p>
                        <p>
                            <strong>Lantai:</strong>{' '}
                            {mine.kamar?.lantai?.nama_lantai ?? '-'}
                        </p>
                        <p>
                            <strong>Nomor Kamar:</strong>{' '}
                            {mine.kamar?.nomor_kamar ?? '-'}
                        </p>
                        <p>
                            <strong>Tipe:</strong>{' '}
                            {mine.kamar?.tipe_kamar ?? '-'}
                        </p>
                        <p>
                            <strong>Status:</strong> {mine.kamar?.status ?? '-'}
                        </p>
                        <p>
                            <strong>Kapasitas:</strong>{' '}
                            {mine.kamar?.kapasitas ?? '-'}
                        </p>
                    </div>
                </Card>
            )}
        </div>
    );
}
