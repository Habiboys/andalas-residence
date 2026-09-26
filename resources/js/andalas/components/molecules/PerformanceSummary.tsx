type TeknisiStat = {
    teknisi_id: string;
    nama: string;
    nim_nip: string;
    rata_skor: number | null;
    total_tiket: number;
    total_penilaian: number;
};

type Props = {
    stats: TeknisiStat[];
};

export function PerformanceSummary({ stats }: Props) {
    if (stats.length === 0) {
        return (
            <p className="text-muted p-4 text-sm">
                Belum ada penilaian teknisi. Skor muncul setelah kuesioner
                pertama dikirim.
            </p>
        );
    }

    return (
        <div className="grid gap-4 p-4 sm:grid-cols-2">
            {stats.map((tek) => (
                <div
                    key={tek.teknisi_id}
                    className="rounded-box border-base-300 border p-4"
                >
                    <h3 className="text-sm font-medium">{tek.nama}</h3>
                    <p className="text-identifier text-muted mt-0.5 text-xs">
                        {tek.nim_nip}
                    </p>
                    <dl className="mt-3 flex gap-6">
                        <div>
                            <dt className="text-muted text-xs">Rata Skor</dt>
                            {/* A missing score says so, rather than showing a dash
                                that reads like a value. */}
                            <dd className="text-accent text-xl">
                                {tek.rata_skor?.toFixed(1) ?? 'Belum dinilai'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted text-xs">
                                Tiket Selesai
                            </dt>
                            <dd className="text-primary text-xl">
                                {tek.total_tiket}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted text-xs">Penilaian</dt>
                            <dd className="text-xl">{tek.total_penilaian}</dd>
                        </div>
                    </dl>
                </div>
            ))}
        </div>
    );
}
