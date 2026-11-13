import { PageHeader, Card, DataTable } from '../../components/ui';
import { useAuth } from '../../context/AppContext';

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
                subtitle="Skor kinerja dari kuesioner teknis"
            />
            <Card className="p-6">
                {mine ? (
                    <dl className="grid grid-cols-1 gap-6 text-center sm:grid-cols-3">
                        <div>
                            <dt className="text-muted text-xs">Rata Skor</dt>
                            {/* A missing score says so instead of showing a dash, which reads
                  like a value that was measured. */}
                            <dd className="text-accent text-3xl">
                                {mine.rata_skor !== null &&
                                mine.rata_skor !== undefined
                                    ? Number(mine.rata_skor).toFixed(1)
                                    : 'Belum dinilai'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted text-xs">
                                Tiket Selesai
                            </dt>
                            <dd className="text-3xl">{mine.total_tiket}</dd>
                        </div>
                        <div>
                            <dt className="text-muted text-xs">Penilaian</dt>
                            <dd className="text-3xl">{mine.total_penilaian}</dd>
                        </div>
                    </dl>
                ) : (
                    <p className="text-muted">
                        Belum ada penilaian untuk akun ini. Skor muncul setelah
                        kuesioner teknisi pertama dikirim.
                    </p>
                )}
            </Card>
            {ratings.length > 0 && (
                <DataTable
                    columns={[
                        {
                            key: 'tanggal',
                            label: 'Tanggal Penilaian',
                            render: (r: RatingRow) =>
                                String(r.tanggal_penilaian ?? '').slice(
                                    0,
                                    10,
                                ) || '-',
                        },
                        {
                            key: 'tiket',
                            label: 'No. Tiket',
                            render: (r: RatingRow) =>
                                r.laporan_kerusakan?.nomor_tiket ?? '-',
                        },
                        {
                            key: 'deskripsi',
                            label: 'Pekerjaan',
                            render: (r: RatingRow) =>
                                r.laporan_kerusakan?.deskripsi ?? '-',
                        },
                        {
                            key: 'skor',
                            label: 'Skor',
                            render: (r: RatingRow) =>
                                r.total_skor != null
                                    ? Number(r.total_skor).toFixed(1)
                                    : '-',
                        },
                        {
                            key: 'catatan',
                            label: 'Catatan Evaluator',
                            render: (r: RatingRow) => r.catatan_umum || '-',
                        },
                    ]}
                    data={ratings}
                    emptyMessage="Belum ada riwayat penilaian per tiket."
                />
            )}
        </div>
    );
}
