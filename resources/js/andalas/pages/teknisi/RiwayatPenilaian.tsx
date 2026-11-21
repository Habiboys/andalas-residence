import { Card, EmptyState, PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AppContext';
import { formatDate } from '../../lib/format';

type TeknisiStat = {
    teknisi_id: string;
    nama: string;
    nim_nip: string;
    rata_skor: number | null;
    total_tiket: number;
    total_penilaian: number;
};

type RatingRow = {
    id: string;
    total_skor?: number | string | null;
    skor_persentase?: number | string | null;
    catatan_umum?: string | null;
    tanggal_penilaian?: string | null;
    laporan_kerusakan?: {
        id: string;
        nomor_tiket?: string;
        deskripsi?: string;
        tanggal_selesai?: string | null;
    } | null;
};

type Props = {
    performance?: TeknisiStat[];
    ratings?: RatingRow[];
};

export default function RiwayatPenilaian({
    performance = [],
    ratings = [],
}: Props) {
    const { currentUser } = useAuth();
    const mine = performance.find(
        (t) =>
            (currentUser?.id && t.teknisi_id === currentUser.id) ||
            t.nim_nip === currentUser?.nim ||
            t.nama === currentUser?.nama,
    );

    return (
        <div className="space-y-4">
            <PageHeader
                title="Riwayat & Penilaian"
                subtitle="Skor kinerja dari penilaian hasil perbaikan"
            />
            <Card className="p-5">
                {mine ? (
                    <dl className="grid grid-cols-3 gap-3 text-center">
                        <div>
                            <dt className="text-muted text-xs">Rata Skor</dt>
                            <dd className="text-accent text-2xl font-bold sm:text-3xl">
                                {mine.rata_skor !== null &&
                                mine.rata_skor !== undefined
                                    ? Number(mine.rata_skor).toFixed(1)
                                    : 'Belum dinilai'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted text-xs">Selesai</dt>
                            <dd className="text-2xl font-bold sm:text-3xl">
                                {mine.total_tiket}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted text-xs">Penilaian</dt>
                            <dd className="text-2xl font-bold sm:text-3xl">
                                {mine.total_penilaian}
                            </dd>
                        </div>
                    </dl>
                ) : (
                    <p className="text-muted text-sm">
                        Belum ada penilaian untuk akun ini. Skor muncul setelah
                        penilaian pertama dikirim.
                    </p>
                )}
            </Card>
            {ratings.length === 0 ? (
                <Card>
                    <EmptyState
                        title="Belum ada riwayat penilaian"
                        desc="Penilaian per permohonan perbaikan yang selesai akan muncul di sini."
                    />
                </Card>
            ) : (
                <div className="space-y-3">
                    {ratings.map((r) => (
                        <Card key={r.id} className="space-y-2 p-4">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold break-all">
                                        {r.laporan_kerusakan?.nomor_tiket ??
                                            '-'}
                                    </p>
                                    <p className="text-muted text-xs">
                                        {formatDate(r.tanggal_penilaian)}
                                    </p>
                                </div>
                                <span className="badge badge-primary badge-soft font-semibold">
                                    Skor:{' '}
                                    {r.total_skor != null
                                        ? Number(r.total_skor).toFixed(1)
                                        : '-'}
                                </span>
                            </div>
                            <p className="text-sm">
                                {r.laporan_kerusakan?.deskripsi ?? '-'}
                            </p>
                            {r.catatan_umum && (
                                <p className="bg-base-200/60 text-muted rounded-lg p-2.5 text-xs">
                                    Catatan: {r.catatan_umum}
                                </p>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
